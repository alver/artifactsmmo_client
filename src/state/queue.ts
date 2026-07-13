// The plan queue: a per-character, user-editable list of actions (move / rest /
// fight ×N / gather ×N / craft ×N / withdraw / …) executed one item after
// another, top to bottom. Fight and gather items with times 0 run FOREVER —
// this is how "beat a monster" grinds until stopped.
//
// PRESENCE in the signal does NOT mean running — the queue is a persistent
// document the user edits; a `running` flag inside the entry marks execution.
// Every item's completion condition is checked BEFORE
// acting, so items are skip-if-satisfied and a reload resumes mid-item (fight
// 7/20 stays 7/20 — progress lives on the item and every increment goes
// through the signal).
//
// Failure semantics: the queue PAUSES — the failed item stays at the head with
// an error note and `running` drops to false; the user edits/removes it and
// presses ▶ again.
//
// Same no-poll contract as every runner: paced purely by action-echo cooldowns.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { catalog, item as itemOf, itemName, monster as monsterOf, resource as resourceOf } from "../catalog";
import { npcForSell } from "../plan/acquire";
import { RESET_UTILITY_STRIP, stripAllMap } from "../plan/jobgear";
import { QUEUE_KINDS, queueItemText } from "../plan/queue";
import { characters, pushLog } from "./store";
import { bankQty, isInventoryFull, moveTo, nearest, nearestBank, sleep, step } from "./loopkit";
import { bankOff, craftableTimes, desiredForJob, fightRound, foodInHand, freeSpace, gearSwapStep, goToMaster, invCount, invQty, provisionPotions, runStep } from "./exec";
import type { StepCtx } from "./exec";
import type { QueueItem } from "../plan/queue";
import type { AcquisitionStep, GearJob } from "../plan/types";
import type { Character } from "../types/api";
import type { CraftRecipe, DropRate, Monster, Resource } from "../types/catalog";

export interface QueueState {
  items: QueueItem[];
  running: boolean;
  note?: string; // live status of the head item while running
}

const STORE_KEY = "ammo:v1:queue";
function loadStored(): Record<string, QueueState> {
  try {
    const raw = (JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<string, QueueState>) || {};
    const out: Record<string, QueueState> = {};
    for (const [name, q] of Object.entries(raw)) {
      if (!q || !Array.isArray(q.items)) continue; // unknown shape — drop, never crash resume
      out[name] = { ...q, items: q.items.filter((it) => it && QUEUE_KINDS.includes(it.kind)), running: !!q.running };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Per-character queues, keyed by name. Hydrated from localStorage at load so
 * queues (and mid-item progress) survive a reload; running ones are re-launched
 * by resumeQueue() after the boot sync.
 */
export const queues = signal<Record<string, QueueState>>(loadStored());
const stopFlags = new Set<string>();
// Names with a runLoop alive RIGHT NOW (in-memory twin of `running`). The two
// differ while a stopped loop drains its final action: `running` is already
// false (persisted, so a reload can't resurrect the queue) but the loop still
// lives until the action's cooldown ends.
const liveLoops = new Set<string>();

// Mirror to localStorage on every change (edits AND per-action progress).
effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(queues.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

function setQueue(name: string, patch: Partial<QueueState>): void {
  const cur = queues.value[name];
  if (!cur) return;
  queues.value = { ...queues.value, [name]: { ...cur, ...patch } };
}

/** The runner's own item patch — no head lock (the runner must update progress). */
function patchItem(name: string, id: string, patch: Partial<QueueItem>): void {
  const cur = queues.value[name];
  if (!cur) return;
  setQueue(name, { items: cur.items.map((it) => (it.id === id ? ({ ...it, ...patch } as QueueItem) : it)) });
}

// ── User editing ops (all refuse to touch the currently-executing head) ─────

const headLocked = (q: QueueState | undefined, id: string): boolean => !!q?.running && q.items[0]?.id === id;

/** Append (or insert at `index`) an item; creates the character's queue lazily. */
export function addItem(name: string, item: QueueItem, index?: number): void {
  const cur = queues.value[name] ?? { items: [], running: false };
  const items = [...cur.items];
  const at = index == null ? items.length : Math.max(cur.running ? 1 : 0, Math.min(index, items.length));
  items.splice(at, 0, item);
  queues.value = { ...queues.value, [name]: { ...cur, items } };
}

export function removeItem(name: string, id: string): void {
  const cur = queues.value[name];
  if (!cur || headLocked(cur, id)) return;
  setQueue(name, { items: cur.items.filter((it) => it.id !== id) });
}

/** User edit — clears the item's error (an edited item gets a fresh chance). */
export function updateItem(name: string, id: string, patch: Partial<QueueItem>): void {
  if (headLocked(queues.value[name], id)) return;
  patchItem(name, id, { ...patch, error: undefined });
}

export function moveItem(name: string, id: string, dir: -1 | 1): void {
  const cur = queues.value[name];
  if (!cur || headLocked(cur, id)) return;
  const i = cur.items.findIndex((it) => it.id === id);
  const j = i + dir;
  const floor = cur.running ? 1 : 0; // nothing may move above the executing head
  if (i < floor || j < floor || j >= cur.items.length) return;
  const items = [...cur.items];
  [items[i], items[j]] = [items[j], items[i]];
  setQueue(name, { items });
}

export function clearQueue(name: string): void {
  const cur = queues.value[name];
  if (!cur || cur.running) return;
  setQueue(name, { items: [], note: undefined });
}

// ── The runner ───────────────────────────────────────────────────────────────

const log = (name: string, text: string, kind: "ok" | "bad" | "info" = "info"): void =>
  pushLog({ ts: Date.now(), character: name, action: "queue", text, kind });

/**
 * Complete an item WITHOUT acting because its map target doesn't exist right
 * now — time-limited event tiles come and go, so a vanished target skips the
 * item (visible in the log) instead of pausing the whole queue.
 */
function skipItem(name: string, it: QueueItem, why: string): true {
  log(name, `skipped: ${queueItemText(it)} — ${why}`, "info");
  return true;
}

const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

function keepOf(it: QueueItem, ch: Character): string[] | undefined {
  const base =
    it.kind === "fight" || it.kind === "deliver" || it.kind === "gear" ? it.keep
    // The task deliverable and its recipe materials are working stock — neither
    // an overflow bank-off nor the job-start gear reset may stash them.
    : it.kind === "work-task" || it.kind === "task-loop" ? (ch.task ? [ch.task, ...(itemOf(ch.task)?.craft?.items.map((g) => g.code) ?? [])] : undefined)
    // A withdrawal/sale/recycle protects its own item — otherwise an overflow
    // bank-off would deposit exactly what was just withdrawn and the item would
    // spin forever.
    : it.kind === "withdraw" || it.kind === "sell" || it.kind === "recycle" ? [it.code]
    : undefined;
  // Carried between-fight food is working stock too — a loot bank-off or the
  // job-start gear reset must not stash the fighter's rations.
  if (it.kind === "fight" || it.kind === "work-task" || it.kind === "task-loop" || (it.kind === "gear" && it.job?.kind === "fight")) {
    const food = foodInHand(ch)?.code;
    if (food) return [...(base ?? []), food];
  }
  return base;
}

function ctxOf(name: string, ch: Character, it: QueueItem): StepCtx {
  // Persisted queues from before food became a boolean may carry an old
  // FoodSpec object here — any non-false value means "keep fed".
  const fed = it.kind === "fight" ? it.food !== false : it.kind === "work-task" || it.kind === "task-loop" ? true : undefined;
  return {
    keep: keepOf(it, ch),
    food: fed,
    fightsLeft:
      it.kind === "fight" ? (it.times > 0 ? Math.max(1, it.times - it.done) : 50)
      : it.kind === "work-task" || it.kind === "task-loop" ? Math.max(1, ch.task_total - ch.task_progress)
      : undefined,
    note: (text) => setQueue(name, { note: text }),
  };
}

/**
 * Run ONE action of the head item. Returns true when the item is complete
 * (the completion condition is always checked first, so a satisfied item is
 * skipped and a reload never repeats finished work). Throws on failure — the
 * loop pauses the queue with the message.
 */
async function runItem(name: string, ch: Character, it: QueueItem): Promise<boolean> {
  const ctx = ctxOf(name, ch, it);
  switch (it.kind) {
    case "move": {
      if (ch.x === it.x && ch.y === it.y) return true;
      ctx.note(`→ (${it.x}, ${it.y})`);
      await moveTo(name, it.x, it.y);
      return false;
    }
    case "rest": {
      if (ch.hp >= ch.max_hp) return true;
      ctx.note("resting");
      await step(name, () => actions.rest(name));
      return false;
    }
    case "withdraw": {
      const missing = it.quantity - invQty(ch, it.code);
      if (missing <= 0) return true;
      // The bag is a hard limit: a full inventory holding nothing BUT this item
      // can't take more — that is as done as the withdrawal can get. (A bag full
      // of other stuff instead falls through to runStep, whose bank-off clears
      // it while `keep` protects what was already withdrawn.)
      if (freeSpace(ch) === 0 && !(ch.inventory ?? []).some((sl) => sl.code && sl.quantity > 0 && sl.code !== it.code)) return true;
      const bank = it.x != null ? { x: it.x, y: it.y! } : nearestBank(ch.x, ch.y);
      if (!bank) return skipItem(name, it, "no bank on the map");
      await runStep(name, ch, { kind: "withdraw", code: it.code, quantity: missing, x: bank.x, y: bank.y }, ctx);
      return false;
    }
    case "buy": {
      const tile = it.x != null ? { x: it.x, y: it.y } : it.npc ? nearest("npc", it.npc, ch.x, ch.y) : undefined;
      if (!tile || tile.x == null) return skipItem(name, it, "no shop on the map (event over?)");
      const s: AcquisitionStep = { kind: "buy", code: it.code, quantity: it.quantity, npc: it.npc ?? "", cost: 0, x: tile.x, y: tile.y };
      await runStep(name, ch, s, ctx);
      return true; // one buy call covers the whole quantity
    }
    case "sell": {
      const left = it.quantity - it.done;
      if (left <= 0) return true;
      const held = invQty(ch, it.code);
      if (held > 0) {
        const seller = it.npc ?? npcForSell(it.code)?.code;
        const tile = it.x != null ? { x: it.x, y: it.y! } : seller ? nearest("npc", seller, ch.x, ch.y) : undefined;
        if (!tile || tile.x == null) return skipItem(name, it, `no merchant buys ${itemName(it.code)} (event over?)`);
        if (ch.x !== tile.x || ch.y !== tile.y) { ctx.note("→ merchant"); await moveTo(name, tile.x, tile.y); return false; }
        const qty = Math.min(held, left);
        ctx.note(`sell ${itemName(it.code)}`);
        await step(name, () => actions.npcSell(name, it.code, qty));
        patchItem(name, it.id, { done: it.done + qty });
        return false;
      }
      // Hand empty — pull more stock from the bank, one bag-sized piece at a time.
      const banked = bankQty(it.code);
      if (banked > 0) {
        if (freeSpace(ch) === 0) { await bankOff(name, ch.x, ch.y, [it.code], ctx.note); return false; } // bag full of other stuff
        const bank = nearestBank(ch.x, ch.y);
        if (!bank) return skipItem(name, it, "no bank on the map");
        await runStep(name, ch, { kind: "withdraw", code: it.code, quantity: Math.min(banked, left, freeSpace(ch)), x: bank.x, y: bank.y }, ctx);
        return false;
      }
      throw new Error(`nothing left to sell — no ${itemName(it.code)} in hand or bank`);
    }
    case "recycle": {
      const left = it.quantity - it.done;
      if (left <= 0) return true;
      const held = invQty(ch, it.code);
      if (held > 0) {
        const skill = it.skill ?? itemOf(it.code)?.craft?.skill;
        const tile = it.x != null ? { x: it.x, y: it.y! } : skill ? nearest("workshop", skill, ch.x, ch.y) : undefined;
        if (!tile || tile.x == null) return skipItem(name, it, `no workshop recycles ${itemName(it.code)}`);
        if (ch.x !== tile.x || ch.y !== tile.y) { ctx.note("→ workshop"); await moveTo(name, tile.x, tile.y); return false; }
        const qty = Math.min(held, left);
        ctx.note(`recycle ${itemName(it.code)}`);
        await step(name, () => actions.recycle(name, it.code, qty));
        patchItem(name, it.id, { done: it.done + qty });
        return false;
      }
      // Hand empty — pull more stock from the bank, one bag-sized piece at a time.
      const banked = bankQty(it.code);
      if (banked > 0) {
        if (freeSpace(ch) === 0) { await bankOff(name, ch.x, ch.y, [it.code], ctx.note); return false; } // bag full of other stuff
        const bank = nearestBank(ch.x, ch.y);
        if (!bank) return skipItem(name, it, "no bank on the map");
        await runStep(name, ch, { kind: "withdraw", code: it.code, quantity: Math.min(banked, left, freeSpace(ch)), x: bank.x, y: bank.y }, ctx);
        return false;
      }
      throw new Error(`nothing left to recycle — no ${itemName(it.code)} in hand or bank`);
    }
    case "gather": {
      if (it.times > 0 && it.done >= it.times) return true; // times 0 = forever
      const tile = it.x != null ? { x: it.x, y: it.y } : nearest("resource", it.resource, ch.x, ch.y);
      if (!tile || tile.x == null) return skipItem(name, it, `no ${it.resource} on the map (event over?)`);
      // Bank-gear self-heal: keep the best gathering set the bank holds on
      // (memoized per bank reference — free when nothing changed).
      if (it.gear) {
        const skill = resourceOf(it.resource)?.skill;
        const desired = skill ? desiredForJob(name, ch, { kind: "gather", skill }) : undefined;
        if (desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted") return false;
      }
      const s: AcquisitionStep = { kind: "gather", code: it.code, quantity: Math.max(1, it.times - it.done), resource: it.resource, level: 0, x: tile.x, y: tile.y };
      const r = await runStep(name, ch, s, ctx);
      if (r.did === "acted") patchItem(name, it.id, { done: it.done + 1 });
      return false;
    }
    case "craft": {
      const infinite = it.quantity === 0; // 0 = ∞: craft while the bank can feed the recipe
      if (!infinite && it.done >= it.quantity) return true;
      if (!infinite && it.done === 0 && invQty(ch, it.code) >= it.quantity) return true; // already have them
      const recipe = itemOf(it.code)?.craft;
      if (infinite && !recipe) throw new Error(`${itemName(it.code)} has no recipe`);
      const per = Math.max(1, recipe?.quantity ?? 1);
      // The working batch, in recipe runs: finite = whatever is left; ∞ = a
      // bagful of materials (the withdraw → craft → deposit cycle per bagful).
      const matsPerRun = Math.max(1, (recipe?.items ?? []).reduce((sum, g) => sum + g.quantity, 0));
      const bagTimes = Math.max(1, Math.floor(ch.inventory_max_items / matsPerRun));
      const wantTimes = infinite ? bagTimes : Math.ceil((it.quantity - it.done) / per);
      const left = wantTimes * per;
      // Materials ran out mid-chain: pull the next batch from the bank, clamped
      // to what hand + bank can still supply. In ∞ mode an empty bank is the
      // finish line — deposit the produce, then the item completes.
      if (recipe && craftableTimes(ch, it.code, left) <= 0) {
        const supplyTimes = Math.min(wantTimes, ...recipe.items.map((g) => Math.floor((invQty(ch, g.code) + bankQty(g.code)) / g.quantity)));
        if (infinite && supplyTimes <= 0) {
          if (it.done <= 0) throw new Error(`no materials for ${itemName(it.code)} in the bank`);
          if (invCount(ch) > 0) { await bankOff(name, ch.x, ch.y, undefined, ctx.note); return false; }
          return true;
        }
        // A finite order with zero feasible runs: fail NOW, naming the missing
        // ingredient — don't withdraw the ingredients that do exist only to be
        // rejected at the workshop.
        if (!infinite && supplyTimes <= 0) {
          const short = recipe.items
            .filter((g) => Math.floor((invQty(ch, g.code) + bankQty(g.code)) / g.quantity) <= 0)
            .map((g) => `${itemName(g.code)} (need ${g.quantity})`);
          throw new Error(`no ${short.join(", ")} for ${itemName(it.code)} in bag + bank`);
        }
        const batch = Math.max(1, Math.min(supplyTimes, bagTimes));
        const ing = recipe.items.find((g) => g.quantity * batch > invQty(ch, g.code) && bankQty(g.code) > 0);
        if (ing) {
          // The whole batch (every ingredient) must fit in the bag — deposit
          // the produce and leftovers first, then withdraw fresh.
          const needTotal = recipe.items.reduce((sum, g) => sum + Math.max(0, g.quantity * batch - invQty(ch, g.code)), 0);
          if (needTotal > freeSpace(ch)) {
            if (invCount(ch) === 0) throw new Error(`one ${itemName(it.code)} batch doesn't fit the bag`);
            await bankOff(name, ch.x, ch.y, undefined, ctx.note);
            return false;
          }
          const bank = nearestBank(ch.x, ch.y);
          if (!bank) return skipItem(name, it, "no bank on the map");
          const qty = Math.min(ing.quantity * batch - invQty(ch, ing.code), bankQty(ing.code));
          await runStep(name, ch, { kind: "withdraw", code: ing.code, quantity: qty, x: bank.x, y: bank.y }, ctx);
          return false;
        }
      }
      const skill = it.skill ?? recipe?.skill;
      const tile = it.x != null ? { x: it.x, y: it.y } : skill ? nearest("workshop", skill, ch.x, ch.y) : undefined;
      if (!tile || tile.x == null) return skipItem(name, it, `no workshop for ${itemName(it.code)}`);
      const s: AcquisitionStep = { kind: "craft", code: it.code, quantity: left, skill: skill ?? "", level: 0, x: tile.x, y: tile.y };
      const r = await runStep(name, ch, s, ctx);
      if (r.did === "crafted") patchItem(name, it.id, { done: it.done + r.produced });
      return false;
    }
    case "train": {
      if (skillLevel(ch, it.skill) >= it.toLevel) return true;
      const tile = it.x != null ? { x: it.x, y: it.y } : nearest("resource", it.resource, ch.x, ch.y);
      if (!tile || tile.x == null) return skipItem(name, it, `no ${it.resource} on the map (event over?)`);
      const s: AcquisitionStep = { kind: "train", skill: it.skill, toLevel: it.toLevel, resource: it.resource, level: 0, x: tile.x, y: tile.y };
      await runStep(name, ch, s, ctx);
      return false;
    }
    case "fight": {
      if (it.times > 0 && it.done >= it.times) return true; // times 0 = forever
      const m = monsterOf(it.monster);
      const tile = m ? nearest("monster", it.monster, ch.x, ch.y) : undefined;
      if (!m || !tile) return skipItem(name, it, `no ${it.monster} on the map (event over?)`);
      // Bank-gear self-heal: when something better landed in the bank, detour
      // and swap (memoized per bank reference — free when nothing changed).
      // Planned-but-unowned utility potions get brewed (provisionPotions).
      if (it.gear) {
        const desired = desiredForJob(name, ch, { kind: "fight", monster: it.monster });
        if (desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted") return false;
        if (desired && (await provisionPotions(name, ch, desired, ctx)) === "acted") return false;
      }
      ctx.note(`fighting ${it.done + 1}${it.times > 0 ? `/${it.times}` : ""}`);
      const out = await fightRound(name, ch, m, tile, S(name), ctx);
      if (out === "no-win") throw new Error(`not a safe win vs ${m.name}`);
      if (out === "gave-up") throw new Error("lost 2 fights in a row");
      if (out === "won") patchItem(name, it.id, { done: it.done + 1 });
      if (out === "lost") log(name, "lost a fight — healing and retrying", "bad");
      return false;
    }
    case "deposit-all": {
      if (invCount(ch) === 0 && ch.gold === 0) return true; // bag empty AND pockets empty
      await bankOff(name, ch.x, ch.y, undefined, ctx.note);
      return false;
    }
    case "gear": {
      const desired = it.desired ?? (it.job ? desiredForJob(name, ch, it.job) : undefined);
      if (it.reset) {
        // Full bank reset. Fight jobs always get a set (best-effort when no
        // winnable one exists) — desired is only missing for an UNKNOWN
        // monster, and stripping naked for that would be pointless.
        if (!desired && it.job?.kind === "fight") {
          throw new Error(`can't plan gear vs ${monsterOf(it.job.monster)?.name ?? it.job.monster} — unknown monster`);
        }
        // Utility strip as an UNDERLAY: a fight set's potion picks override it.
        const total = { ...RESET_UTILITY_STRIP, ...(desired ?? stripAllMap()) };
        return (await gearSwapStep(name, ch, total, ctx, { reset: true })) === "done";
      }
      if (!desired) return true; // no set for this job (unknown monster / job "none") — keep current
      return (await gearSwapStep(name, ch, desired, ctx)) === "done";
    }
    case "work-task":
      return runWorkTask(name, ch, it, ctx);
    case "task-loop": {
      // accept → work → turn in, repeated. One completed task = one `done`.
      if (it.times > 0 && it.done >= it.times) return true; // times 0 = forever
      if (!ch.task) {
        const at = await goToMaster(name, ch, it.master, ctx.note);
        if (at === "missing") return skipItem(name, it, `no ${it.master} tasks master on the map`);
        if (at === "there") {
          ctx.note(`task ${it.done + 1}${it.times > 0 ? `/${it.times}` : ""}: accepting`);
          await step(name, () => actions.taskNew(name));
        }
        return false; // the echo sets ch.task → next tick starts working it
      }
      // Turn-in is checked BEFORE the work engine (which treats a finished
      // task as "item complete") — completing here is what advances the loop.
      if (ch.task_total - ch.task_progress <= 0) {
        const at = await goToMaster(name, ch, ch.task_type === "items" ? "items" : "monsters", ctx.note);
        if (at === "missing") return skipItem(name, it, "no tasks master on the map");
        if (at === "there") {
          ctx.note("turning in the task");
          await step(name, () => actions.taskComplete(name));
          patchItem(name, it.id, { done: it.done + 1 });
          log(name, `task ${it.done + 1}${it.times > 0 ? `/${it.times}` : ""} turned in — rewards collected`, "ok");
        }
        return false;
      }
      return runWorkTask(name, ch, it, ctx);
    }
    case "accept-task": {
      if (ch.task) return true; // already carrying a task (either type)
      const at = await goToMaster(name, ch, it.master, ctx.note);
      if (at === "missing") return skipItem(name, it, `no ${it.master} tasks master on the map`);
      if (at === "there") {
        ctx.note("accepting a task");
        await step(name, () => actions.taskNew(name));
      }
      return false; // the echo sets ch.task → the next tick completes the item
    }
    case "deliver": {
      const remaining = Math.max(0, ch.task_total - ch.task_progress);
      if (ch.task_type !== "items" || remaining <= 0) return true;
      const held = invQty(ch, ch.task);
      if (held > 0) {
        const at = await goToMaster(name, ch, "items", ctx.note);
        if (at === "missing") return skipItem(name, it, "no items tasks master on the map");
        if (at === "there") {
          ctx.note(`deliver ${itemName(ch.task)}`);
          await step(name, () => actions.taskTrade(name, ch.task, Math.min(held, remaining)));
        }
        return false;
      }
      // Nothing in hand — pull banked stock one bag-sized piece at a time (each
      // piece is traded before the next withdrawal, so the bag is the pace).
      const banked = bankQty(ch.task);
      if (banked > 0) {
        if (freeSpace(ch) === 0) { await bankOff(name, ch.x, ch.y, it.keep, ctx.note); return false; } // bag full of other stuff
        const bank = nearestBank(ch.x, ch.y);
        if (!bank) return skipItem(name, it, "no bank on the map");
        const s: AcquisitionStep = { kind: "withdraw", code: ch.task, quantity: Math.min(banked, remaining, freeSpace(ch)), x: bank.x, y: bank.y };
        await runStep(name, ch, s, ctx);
        return false;
      }
      if (it.partial) return true; // stock exhausted — the production items that follow cover the rest
      throw new Error(`nothing left to deliver — produce more ${itemName(ch.task)} first`);
    }
    case "turn-in": {
      if (!ch.task) return true;
      const remaining = Math.max(0, ch.task_total - ch.task_progress);
      if (remaining > 0) throw new Error(`task not complete — ${ch.task_progress}/${ch.task_total}`);
      const at = await goToMaster(name, ch, ch.task_type === "items" ? "items" : "monsters", ctx.note);
      if (at === "missing") return skipItem(name, it, "no tasks master on the map");
      if (at === "there") {
        ctx.note("turning in the task");
        await step(name, () => actions.taskComplete(name));
        log(name, "task turned in — rewards collected", "ok");
      }
      return false;
    }
  }
}

// ── work-task: work the current task in the field, no bank stock ─────────────

/**
 * How to obtain an item IN THE FIELD (no bank, no shops) with the character's
 * current skills: gather it directly, craft it from gatherable materials, or
 * fight the monster that drops it. Deterministic sources win — gather first
 * (surest drop, then lowest resource level), then craft, then the easiest
 * monster. All current item tasks resolve to gather or a one-level craft whose
 * ingredients are gathered; fight is the forward-compatible fallback.
 */
type FieldSource =
  | { how: "gather"; res: Resource }
  | { how: "craft"; recipe: CraftRecipe }
  | { how: "fight"; mon: Monster };

function fieldSource(ch: Character, code: string): FieldSource | undefined {
  const rateOf = (drops: DropRate[]): number => drops.find((d) => d.code === code)?.rate ?? Infinity;
  const res = [...catalog().resources.values()]
    .filter((r) => r.drops.some((d) => d.code === code) && skillLevel(ch, r.skill) >= r.level)
    .sort((a, b) => rateOf(a.drops) - rateOf(b.drops) || a.level - b.level)[0];
  if (res) return { how: "gather", res };
  const recipe = itemOf(code)?.craft;
  if (recipe && skillLevel(ch, recipe.skill) >= recipe.level) return { how: "craft", recipe };
  const mon = [...catalog().monsters.values()]
    .filter((m) => m.drops.some((d) => d.code === code))
    .sort((a, b) => rateOf(a.drops) - rateOf(b.drops) || a.level - b.level)[0];
  if (mon) return { how: "fight", mon };
  return undefined;
}

/**
 * Gear leg of a work-task tick. The FIRST time a given task is worked, wear
 * the phase's job set via a full bank reset (the standard job start — deposit
 * everything incl. gold, strip utilities; ctx.keep protects the deliverable
 * and its materials, and `geared` remembers the task so a reload doesn't
 * repeat it). Afterwards the usual per-round self-heal swap keeps the set
 * current. True ⇒ the tick was spent on gear.
 */
async function taskGear(
  name: string,
  ch: Character,
  it: Extract<QueueItem, { kind: "work-task" | "task-loop" }>,
  job: GearJob,
  ctx: StepCtx,
): Promise<boolean> {
  if (!it.gear) return false;
  const desired = desiredForJob(name, ch, job);
  if (it.geared !== ch.task) {
    // Utility strip as an UNDERLAY: a fight set's potion picks override it.
    const total = { ...RESET_UTILITY_STRIP, ...(desired ?? stripAllMap()) };
    if ((await gearSwapStep(name, ch, total, ctx, { reset: true })) === "acted") return true;
    patchItem(name, it.id, { geared: ch.task });
    return true; // converged — acquiring starts next tick
  }
  if (!desired) return false;
  if ((await gearSwapStep(name, ch, desired, ctx)) === "acted") return true;
  // Fight-job sets may plan brewable potions in; non-fight sets have no
  // utility wants, so this is a cheap no-op for them.
  return job.kind === "fight" && (await provisionPotions(name, ch, desired, ctx)) === "acted";
}

/**
 * One action of a work-task item. Monsters task ⇒ fight the task monster
 * (fight-item rules). Items task ⇒ acquire ch.task in the field and hand
 * bagfuls straight to the items master — stock never moves through the bank;
 * the bank only hosts the gear reset/self-heal and the junk-overflow valve.
 */
async function runWorkTask(
  name: string,
  ch: Character,
  it: Extract<QueueItem, { kind: "work-task" | "task-loop" }>,
  ctx: StepCtx,
): Promise<boolean> {
  if (!ch.task) return true; // nothing to work — accept-task comes first
  const remaining = Math.max(0, ch.task_total - ch.task_progress);
  if (remaining <= 0) return true; // done — a turn-in item collects the reward

  if (ch.task_type === "monsters") {
    const m = monsterOf(ch.task);
    const tile = m ? nearest("monster", ch.task, ch.x, ch.y) : undefined;
    if (!m || !tile) throw new Error(`no ${m?.name ?? ch.task} on the map (event over?)`);
    if (await taskGear(name, ch, it, { kind: "fight", monster: ch.task }, ctx)) return false;
    ctx.note(`task ${ch.task_progress + 1}/${ch.task_total}: fight ${m.name}`);
    const out = await fightRound(name, ch, m, tile, S(name), ctx);
    if (out === "no-win") throw new Error(`not a safe win vs ${m.name}`);
    if (out === "gave-up") throw new Error("lost 2 fights in a row");
    if (out === "lost") log(name, "lost a fight — healing and retrying", "bad");
    return false;
  }
  if (ch.task_type !== "items") return true; // unknown task type — leave it be

  const held = invQty(ch, ch.task);
  const deliver = async (): Promise<boolean> => {
    const at = await goToMaster(name, ch, "items", ctx.note);
    if (at === "missing") return skipItem(name, it, "no items tasks master on the map");
    if (at === "there") {
      ctx.note(`deliver ${itemName(ch.task)}`);
      await step(name, () => actions.taskTrade(name, ch.task, Math.min(held, remaining)));
    }
    return false;
  };
  if (held >= remaining) return deliver(); // enough in hand — hand it over

  const src = fieldSource(ch, ch.task);
  if (!src) throw new Error(`no way to acquire ${itemName(ch.task)} in the field (skill too low?)`);

  if (src.how === "gather" || src.how === "fight") {
    // A full bag first hands over what it holds, then (all junk) banks off.
    if (freeSpace(ch) === 0) {
      if (held > 0) return deliver();
      await bankOff(name, ch.x, ch.y, keepOf(it, ch), ctx.note);
      return false;
    }
    if (src.how === "gather") {
      const tile = nearest("resource", src.res.code, ch.x, ch.y);
      if (!tile) throw new Error(`no ${src.res.name} on the map (event over?)`);
      if (await taskGear(name, ch, it, { kind: "gather", skill: src.res.skill }, ctx)) return false;
      ctx.note(`task ${held + ch.task_progress}/${ch.task_total}: gather ${itemName(ch.task)}`);
      await runStep(name, ch, { kind: "gather", code: ch.task, quantity: remaining - held, resource: src.res.code, level: 0, x: tile.x, y: tile.y }, ctx);
      return false;
    }
    const tile = nearest("monster", src.mon.code, ch.x, ch.y);
    if (!tile) throw new Error(`no ${src.mon.name} on the map (event over?)`);
    if (await taskGear(name, ch, it, { kind: "fight", monster: src.mon.code }, ctx)) return false;
    ctx.note(`task ${held + ch.task_progress}/${ch.task_total}: hunt ${src.mon.name}`);
    const out = await fightRound(name, ch, src.mon, tile, S(name), ctx);
    if (out === "no-win") throw new Error(`not a safe win vs ${src.mon.name}`);
    if (out === "gave-up") throw new Error("lost 2 fights in a row");
    if (out === "lost") log(name, "lost a fight — healing and retrying", "bad");
    return false;
  }

  // Craft: gather a bag-sized batch of materials, craft it, repeat; the
  // produce goes to the master, never the bank. Gear stays on the gathering
  // set — the craft call itself doesn't warrant two swap trips per batch.
  const { recipe } = src;
  const per = Math.max(1, recipe.quantity);
  const matsPerRun = Math.max(1, recipe.items.reduce((s, g) => s + g.quantity, 0));
  const runsNeeded = Math.ceil((remaining - held) / per);
  // Materials already in hand that count toward the goal (capped at the goal).
  const matsHeld = recipe.items.reduce((s, g) => s + Math.min(invQty(ch, g.code), g.quantity * runsNeeded), 0);
  const batch = Math.max(1, Math.min(runsNeeded, Math.floor((freeSpace(ch) + matsHeld) / matsPerRun)));
  const missing = recipe.items.find((g) => invQty(ch, g.code) < g.quantity * batch);
  if (missing && freeSpace(ch) > 0) {
    const mat = fieldSource(ch, missing.code);
    if (mat?.how !== "gather") throw new Error(`no way to gather ${itemName(missing.code)} (skill too low?)`);
    const tile = nearest("resource", mat.res.code, ch.x, ch.y);
    if (!tile) throw new Error(`no ${mat.res.name} on the map (event over?)`);
    if (await taskGear(name, ch, it, { kind: "gather", skill: mat.res.skill }, ctx)) return false;
    ctx.note(`task: gather ${itemName(missing.code)} ${invQty(ch, missing.code)}/${missing.quantity * batch}`);
    await runStep(name, ch, { kind: "gather", code: missing.code, quantity: 1, resource: mat.res.code, level: 0, x: tile.x, y: tile.y }, ctx);
    return false;
  }
  if (craftableTimes(ch, ch.task, remaining - held) > 0) {
    const tile = nearest("workshop", recipe.skill, ch.x, ch.y);
    if (!tile) throw new Error(`no ${recipe.skill} workshop on the map`);
    ctx.note(`task: craft ${itemName(ch.task)}`);
    await runStep(name, ch, { kind: "craft", code: ch.task, quantity: remaining - held, skill: recipe.skill, level: 0, x: tile.x, y: tile.y }, ctx);
    return false;
  }
  // Bag jammed with nothing craftable — deliver what's done, or dump the junk.
  if (held > 0) return deliver();
  await bankOff(name, ch.x, ch.y, keepOf(it, ch), ctx.note);
  return false;
}

// Loss streaks are per-run, in-memory.
const lossState = new Map<string, { losses: number }>();
const S = (name: string): { losses: number } => {
  let s = lossState.get(name);
  if (!s) { s = { losses: 0 }; lossState.set(name, s); }
  return s;
};

async function runLoop(name: string): Promise<void> {
  if (liveLoops.has(name)) return; // never two loops per character
  liveLoops.add(name);
  try {
    while (!stopFlags.has(name)) {
      // Yield to the event loop every tick: no buggy path may spin the tab.
      await sleep(50);
      const q = queues.value[name];
      const ch = characters.value[name];
      if (!q?.running || !ch) return;
      const item = q.items[0];
      if (!item) {
        setQueue(name, { running: false, note: undefined });
        log(name, "queue complete", "ok");
        return;
      }
      try {
        const done = await runItem(name, ch, item);
        if (done) {
          const cur = queues.value[name];
          if (cur?.items[0]?.id === item.id) setQueue(name, { items: cur.items.slice(1), note: undefined });
          S(name).losses = 0;
        }
      } catch (e) {
        if (isInventoryFull(e)) {
          try { await bankOff(name, ch.x, ch.y, keepOf(item, ch), (t) => setQueue(name, { note: t })); continue; } catch { /* fall through to pause */ }
        }
        const msg = (e as Error).message;
        patchItem(name, item.id, { error: msg });
        setQueue(name, { running: false, note: undefined });
        log(name, `queue paused — ${queueItemText(item)}: ${msg}`, "bad");
        return;
      }
    }
  } finally {
    liveLoops.delete(name);
    stopFlags.delete(name);
    // Drop the running state (and any stale "stopping…" note) cleanly.
    const q = queues.value[name];
    if (q?.running || q?.note) setQueue(name, { running: false, note: undefined });
  }
}

/** Start executing the queue from its head. */
export function startQueue(name: string): void {
  const q = queues.value[name];
  if (!q) return;
  // ▶ pressed while the stopped loop is still draining its final action:
  // cancel the stop instead of launching a second loop — the live one carries on.
  if (liveLoops.has(name)) {
    if (stopFlags.has(name)) {
      stopFlags.delete(name);
      setQueue(name, { running: true, note: "running" });
      log(name, "stop cancelled — queue continues", "info");
    }
    return;
  }
  if (q.running) return;
  if (!q.items.length) { log(name, "queue is empty", "bad"); return; }
  if (!characters.value[name]) return;
  stopFlags.delete(name);
  S(name).losses = 0;
  const head = q.items[0];
  const items = head?.error ? q.items.map((it) => (it.id === head.id ? { ...it, error: undefined } : it)) : q.items;
  queues.value = { ...queues.value, [name]: { ...q, items, running: true, note: "starting…" } };
  log(name, `queue started — ${q.items.length} item${q.items.length === 1 ? "" : "s"}`, "info");
  void runLoop(name);
}

/**
 * Stop the queue. `running: false` is set (and persisted) IMMEDIATELY so a
 * reload can never resurrect a stopped queue; the live loop still finishes its
 * in-flight action, then exits via the flag (liveLoops covers the drain gap).
 */
export function stopQueue(name: string): void {
  if (!queues.value[name]?.running) return;
  stopFlags.add(name);
  setQueue(name, { running: false, note: undefined });
  log(name, "queue stopped — finishing the current action", "info");
}

/**
 * Re-launch queues that were running when the page unloaded. Call once after
 * the boot sync. A queue whose character is gone is demoted to stopped — the
 * ITEMS are always kept (the queue is a document, not just a job).
 */
export function resumeQueue(): void {
  for (const [name, q] of Object.entries(queues.value)) {
    if (!q.running || liveLoops.has(name)) continue;
    if (characters.value[name]) {
      stopFlags.delete(name);
      log(name, "queue resumed after reload", "info");
      void runLoop(name);
    } else {
      setQueue(name, { running: false, note: undefined });
    }
  }
}

// Dev-only: this module owns long-lived async runners. A hot swap would
// re-create the module state (queues signal, stopFlags, liveLoops) while the
// OLD runLoop kept executing against the old objects — a zombie runner the ⏹
// button can no longer reach. Force a full page reload instead.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());
