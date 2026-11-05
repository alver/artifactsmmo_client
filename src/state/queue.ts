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
import { IS_SERVER, expose, rpc } from "../lib/remote";
import * as actions from "../api/actions";
import { ApiError } from "../api/client";
import { catalog, item as itemOf, itemName, monster as monsterOf, resource as resourceOf } from "../catalog";
import { npcForSell } from "../plan/acquire";
import { RESET_UTILITY_STRIP, stripAllMap } from "../plan/jobgear";
import { QUEUE_KINDS, queueItemText, withId } from "../plan/queue";
import { trainingResourceFor } from "../plan/hive/skills";
import { titleCase } from "../lib/util";
import { CRAFT_TRAIN_SKILLS, characters, pushLog, skillPins } from "./store";
import { devlog } from "../lib/devlog";
import { bankQty, isInventoryFull, moveTo, nearest, nearestBank, sleep, step } from "./loopkit";
import { bankOff, craftableTimes, desiredForJob, fightRound, foodInHand, freeSpace, gearSwapStep, goToMaster, invCount, invQty, provisionPotions, runStep } from "./exec";
import { loadOfferings, offeringSlots, todayOfferings } from "./offerings";
import type { StepCtx } from "./exec";
import type { QueueItem } from "../plan/queue";
import type { AcquisitionStep, GearJob } from "../plan/types";
import type { Character, OfferingFavor } from "../types/api";
import type { CraftRecipe, DropRate, Monster, Resource } from "../types/catalog";

export interface QueueState {
  items: QueueItem[];
  running: boolean;
  note?: string; // live status of the head item while running
  repeat?: boolean; // 🔁 a finished item goes to the back (progress wiped) instead of away
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
// The tab never hydrates or persists: its copy is a mirror fed by state/synced.ts.
export const queues = signal<Record<string, QueueState>>(IS_SERVER ? loadStored() : {});
const stopFlags = new Set<string>();
// Names with a runLoop alive RIGHT NOW (in-memory twin of `running`). The two
// differ while a stopped loop drains its final action: `running` is already
// false (persisted, so a reload can't resurrect the queue) but the loop still
// lives until the action's cooldown ends.
const liveLoops = new Set<string>();

// Mirror to localStorage on every change (edits AND per-action progress).
if (IS_SERVER) effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(queues.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

function setQueue(name: string, patch: Partial<QueueState>): void {
  const cur = queues.value[name];
  if (!cur) return;
  // Dev forensics: the note stream is the runner's narration — one line per change.
  if ("note" in patch && patch.note !== cur.note && patch.note) devlog(`note ${name}: ${patch.note}`);
  queues.value = { ...queues.value, [name]: { ...cur, ...patch } };
}

/** The runner's own item patch — no head lock (the runner must update progress).
 *  Exported for the hive, which carves its OWN running items when it
 *  rebalances a wave (a shrunken `times` completes at the next step). */
export function patchItem(name: string, id: string, patch: Partial<QueueItem>): void {
  const cur = queues.value[name];
  if (!cur) return;
  setQueue(name, { items: cur.items.map((it) => (it.id === id ? ({ ...it, ...patch } as QueueItem) : it)) });
}

// ── User editing ops (all refuse to touch the currently-executing head) ─────

const headLocked = (q: QueueState | undefined, id: string): boolean => !!q?.running && q.items[0]?.id === id;

/** Append (or insert at `index`) an item; creates the character's queue lazily. */
export function addItem(name: string, item: QueueItem, index?: number): void {
  if (!IS_SERVER) return rpc("addItem", [name, item, index]);
  const cur = queues.value[name] ?? { items: [], running: false };
  const items = [...cur.items];
  const at = index == null ? items.length : Math.max(cur.running ? 1 : 0, Math.min(index, items.length));
  items.splice(at, 0, item);
  queues.value = { ...queues.value, [name]: { ...cur, items } };
}

export function removeItem(name: string, id: string): void {
  if (!IS_SERVER) return rpc("removeItem", [name, id]);
  const cur = queues.value[name];
  if (!cur || headLocked(cur, id)) return;
  setQueue(name, { items: cur.items.filter((it) => it.id !== id) });
}

/** Hive-only: drop one of ITS items even while it is the running head — the
 *  loop re-reads the head every step, and a finished step's slice is id-guarded. */
export function dropItem(name: string, id: string): void {
  const cur = queues.value[name];
  if (cur) setQueue(name, { items: cur.items.filter((it) => it.id !== id) });
}

/** User edit — clears the item's error (an edited item gets a fresh chance). */
export function updateItem(name: string, id: string, patch: Partial<QueueItem>): void {
  if (!IS_SERVER) return rpc("updateItem", [name, id, patch]);
  if (headLocked(queues.value[name], id)) return;
  patchItem(name, id, { ...patch, error: undefined });
}

export function moveItem(name: string, id: string, dir: -1 | 1): void {
  if (!IS_SERVER) return rpc("moveItem", [name, id, dir]);
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
  if (!IS_SERVER) return rpc("clearQueue", [name]);
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
    : it.kind === "train" ? trainKeep(ch, it)
    : it.kind === "offering" ? offeringKeep(ch, it)
    : undefined;
  // Carried between-fight food is working stock too — a loot bank-off or the
  // job-start gear reset must not stash the fighter's rations.
  if (it.kind === "fight" || it.kind === "work-task" || it.kind === "task-loop" || it.kind === "offering" || (it.kind === "gear" && it.job?.kind === "fight")) {
    const food = foodInHand(ch)?.code;
    if (food) return [...(base ?? []), food];
  }
  return base;
}

function ctxOf(name: string, ch: Character, it: QueueItem): StepCtx {
  // Persisted queues from before food became a boolean may carry an old
  // FoodSpec object here — any non-false value means "keep fed".
  const fed = it.kind === "fight" ? it.food !== false : it.kind === "work-task" || it.kind === "task-loop" || it.kind === "offering" ? true : undefined;
  return {
    keep: keepOf(it, ch),
    food: fed,
    fightsLeft:
      it.kind === "fight" ? (it.times > 0 ? Math.max(1, it.times - it.done) : 50)
      : it.kind === "work-task" || it.kind === "task-loop" ? Math.max(1, ch.task_total - ch.task_progress)
      : it.kind === "offering" ? 20 // a handful of drops — sizes one food restock
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
      // Clamp to live bank stock — runStep corrects the local signal after a
      // raced withdrawal, so an empty read here is authoritative, not stale.
      const banked = bankQty(it.code);
      if (banked <= 0) throw new Error(`bank has no ${itemName(it.code)} left`);
      const bank = it.x != null ? { x: it.x, y: it.y! } : nearestBank(ch.x, ch.y);
      if (!bank) return skipItem(name, it, "no bank on the map");
      await runStep(name, ch, { kind: "withdraw", code: it.code, quantity: Math.min(missing, banked), x: bank.x, y: bank.y }, ctx);
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
          if (it.wait) {
            // Pipelined hive craft: the producers are still filling the bank —
            // hold and look again (the hive drops the item once nobody is left
            // to feed it). ⏹ stays responsive through the 1 s slices.
            ctx.note(`waiting for ${short.join(", ")}`);
            for (let i = 0; i < 15 && !stopFlags.has(name); i++) await sleep(1000);
            return false;
          }
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
      const lv = skillLevel(ch, it.skill);
      if (it.levels && it.from == null) { patchItem(name, it.id, { from: lv }); return false; }
      const target = it.levels ? (it.from ?? lv) + it.levels : it.toLevel;
      if (target > 0 && lv >= target) return true;
      if (isCraftSkill(it.skill)) return runTrainCraft(name, ch, it, ctx);
      const node = it.resource ?? trainingResourceFor(it.skill, lv)?.code;
      const tile = it.x != null ? { x: it.x, y: it.y } : node ? nearest("resource", node, ch.x, ch.y) : undefined;
      if (!node || !tile || tile.x == null) return skipItem(name, it, `no ${titleCase(it.skill)} node to train on (event over?)`);
      if (await gatherGear(name, ch, it, it.skill, ctx)) return false;
      await runStep(name, ch, { kind: "train", skill: it.skill, toLevel: target, resource: node, level: 0, x: tile.x, y: tile.y }, ctx);
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
    case "offering":
      return runOffering(name, ch, it, ctx);
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

// ── Skill training (the `train` item) ────────────────────────────────────────

const isCraftSkill = (skill: string): boolean => CRAFT_TRAIN_SKILLS.some(([k]) => k === skill);

/** Per-round gather-set self-heal for a `gear` train item (as the gather item does). True ⇒ tick spent. */
async function gatherGear(name: string, ch: Character, it: Extract<QueueItem, { kind: "train" }>, skill: string, ctx: StepCtx): Promise<boolean> {
  if (!it.gear) return false;
  const desired = desiredForJob(name, ch, { kind: "gather", skill });
  return !!desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted";
}

/** Before a train craft: wear the best `<skill>_crafting` tool owned — weapon slot only, so it
 *  ping-pongs with the gathering tool as a bag-only equip (trainKeep holds both). True ⇒ tick spent. */
async function craftGear(name: string, ch: Character, it: Extract<QueueItem, { kind: "train" }>, skill: string, ctx: StepCtx): Promise<boolean> {
  if (!it.gear) return false;
  const tool = desiredForJob(name, ch, { kind: "craft", skill })?.weapon;
  return !!tool && itemOf(tool)?.subtype === "tool" && (await gearSwapStep(name, ch, { weapon: tool }, ctx)) === "acted";
}

/** Whether this character can keep producing `code` by itself: a gatherable
 *  drop, or a one-deep craft (ore → bar) of gatherable drops. */
function renewable(ch: Character, code: string): boolean {
  const src = fieldSource(ch, code);
  if (src?.how === "gather") return true;
  return src?.how === "craft" && src.recipe.items.every((g) => fieldSource(ch, g.code)?.how === "gather");
}

/**
 * The recipe to train a workshop skill on right now: in the XP window
 * ([lv−9 .. lv]), highest level first, then fewest materials, among recipes
 * this character can feed ALONE — every ingredient renewable or already in
 * bag + bank for one run. Re-picked every tick, so a bank-only ingredient
 * running out (Wooden Stick) simply moves the loop on to the next recipe.
 */
export function trainRecipe(ch: Character, skill: string): { code: string; recipe: CraftRecipe } | undefined { // exported for the verify probe
  const lv = skillLevel(ch, skill);
  let best: { code: string; recipe: CraftRecipe; mats: number } | undefined;
  for (const it of catalog().items.values()) {
    const r = it.craft;
    if (!r || r.skill !== skill || r.level > lv || r.level <= lv - 10) continue;
    if (!r.items.every((g) => renewable(ch, g.code) || invQty(ch, g.code) + bankQty(g.code) >= g.quantity)) continue;
    const mats = r.items.reduce((s, g) => s + g.quantity, 0);
    if (!best || r.level > best.recipe.level || (r.level === best.recipe.level && mats < best.mats)) best = { code: it.code, recipe: r, mats };
  }
  return best;
}

/** Working stock of a workshop-skill train: the recipe's materials and their
 *  one-deep sub-materials — never the product, which gets recycled or banked. */
function trainKeep(ch: Character, it: Extract<QueueItem, { kind: "train" }>): string[] | undefined {
  if (!isCraftSkill(it.skill)) return undefined;
  const pick = trainRecipe(ch, it.skill);
  // Spare tools ride in the bag (never the product itself — it must recycle/bank)
  // so the gather ↔ craft tool swap never costs a bank trip.
  const tools = it.gear ? (ch.inventory ?? []).filter((s) => s.code && s.code !== pick?.code && itemOf(s.code)?.subtype === "tool").map((s) => s.code) : [];
  return [
    ...(pick?.recipe.items.flatMap((g) => {
      const src = fieldSource(ch, g.code);
      return [g.code, ...(src?.how === "craft" ? src.recipe.items.map((s) => s.code) : [])];
    }) ?? []),
    ...tools,
  ];
}

/**
 * One tick of workshop-skill training, a self-contained loop: source a
 * half-bag batch of materials (bank → one-deep sub-craft → gather) → craft →
 * recycle the product (materials come back) or bank it → repeat. Every tick
 * re-derives its state from bag + bank, so a reload resumes anywhere.
 */
async function runTrainCraft(name: string, ch: Character, it: Extract<QueueItem, { kind: "train" }>, ctx: StepCtx): Promise<boolean> {
  const pick = trainRecipe(ch, it.skill);
  if (!pick) throw new Error(`no ${titleCase(it.skill)} recipe this character can feed at Lv ${skillLevel(ch, it.skill)}`);
  const { code, recipe } = pick;
  // 1. Product in hand → recycle it (materials come back), else bank it.
  const made = invQty(ch, code);
  if (made > 0) {
    if (!itemOf(code)?.recyclable) { await bankOff(name, ch.x, ch.y, ctx.keep, ctx.note); return false; }
    const t = nearest("workshop", recipe.skill, ch.x, ch.y);
    if (!t) throw new Error(`no ${recipe.skill} workshop on the map`);
    if (ch.x !== t.x || ch.y !== t.y) { ctx.note("→ workshop"); await moveTo(name, t.x, t.y); return false; }
    ctx.note(`train ${titleCase(it.skill)}: recycle ${itemName(code)}`);
    await step(name, () => actions.recycle(name, code, made));
    return false;
  }
  // 2. Batch: half a bag of the recipe's DIRECT materials (6 bars per axe, not
  //    60 ore — sourceOne stages a sub-craft through the other half); a
  //    non-renewable (bank-only) ingredient caps it at what bag + bank hold.
  const per = Math.max(1, recipe.quantity);
  const matsPerRun = Math.max(1, recipe.items.reduce((s, g) => s + g.quantity, 0));
  let runs = Math.max(1, Math.floor(ch.inventory_max_items / 2 / matsPerRun));
  for (const g of recipe.items) if (!renewable(ch, g.code)) runs = Math.min(runs, Math.floor((invQty(ch, g.code) + bankQty(g.code)) / g.quantity));
  runs = Math.max(1, runs);
  // 3. The batch's materials in hand (or a full bag with at least one run) → craft.
  const can = craftableTimes(ch, code, runs * per);
  if (can >= runs || (can > 0 && freeSpace(ch) === 0)) {
    const t = nearest("workshop", recipe.skill, ch.x, ch.y);
    if (!t) throw new Error(`no ${recipe.skill} workshop on the map`);
    if (await craftGear(name, ch, it, recipe.skill, ctx)) return false;
    ctx.note(`train ${titleCase(it.skill)}: craft ${itemName(code)}`);
    await runStep(name, ch, { kind: "craft", code, quantity: can * per, skill: recipe.skill, level: 0, x: t.x, y: t.y }, ctx);
    return false;
  }
  // 4. Source the first short ingredient (a full bag of other stuff banks off
  //    first; a bag full of our own staged materials goes on to the sub-craft).
  const keep = new Set(ctx.keep ?? []);
  if (freeSpace(ch) === 0 && (ch.inventory ?? []).some((s) => s.code && s.quantity > 0 && !keep.has(s.code))) {
    await bankOff(name, ch.x, ch.y, ctx.keep, ctx.note);
    return false;
  }
  const short = recipe.items.find((g) => invQty(ch, g.code) < g.quantity * runs)!;
  return sourceOne(name, ch, it, short.code, short.quantity * runs - invQty(ch, short.code), ctx, true);
}

/** Get `need` more of `code` into the bag, one action: withdraw bank stock,
 *  else gather it, else (one level deep) craft it from gathered/banked materials. */
async function sourceOne(
  name: string,
  ch: Character,
  it: Extract<QueueItem, { kind: "train" }>,
  code: string,
  need: number,
  ctx: StepCtx,
  deep: boolean,
): Promise<boolean> {
  const banked = bankQty(code);
  if (banked > 0 && freeSpace(ch) > 0) {
    const bank = nearestBank(ch.x, ch.y);
    if (!bank) return skipItem(name, it, "no bank on the map");
    await runStep(name, ch, { kind: "withdraw", code, quantity: Math.min(need, banked, freeSpace(ch)), x: bank.x, y: bank.y }, ctx);
    return false;
  }
  const src = fieldSource(ch, code);
  if (src?.how === "gather") {
    const tile = nearest("resource", src.res.code, ch.x, ch.y);
    if (!tile) return skipItem(name, it, `no ${src.res.name} on the map (event over?)`);
    if (await gatherGear(name, ch, it, src.res.skill, ctx)) return false;
    ctx.note(`train ${titleCase(it.skill)}: gather ${itemName(code)} ${invQty(ch, code)}/${invQty(ch, code) + need}`);
    await runStep(name, ch, { kind: "gather", code, quantity: 1, resource: src.res.code, level: 0, x: tile.x, y: tile.y }, ctx);
    return false;
  }
  if (src?.how === "craft" && deep) {
    const sub = src.recipe;
    // Stage through the bag: only as many sub-runs as their missing raw
    // materials fit in free space (48 bars = 480 ore arrive a bagful at a time).
    let runs = Math.ceil(need / Math.max(1, sub.quantity));
    const missing = (r: number): number => sub.items.reduce((t, g) => t + Math.max(0, g.quantity * r - invQty(ch, g.code)), 0);
    while (runs > 1 && missing(runs) > freeSpace(ch)) runs--;
    const can = craftableTimes(ch, code, need);
    if (can >= runs || (can > 0 && freeSpace(ch) === 0)) {
      const t = nearest("workshop", sub.skill, ch.x, ch.y);
      if (!t) throw new Error(`no ${sub.skill} workshop on the map`);
      if (await craftGear(name, ch, it, sub.skill, ctx)) return false;
      ctx.note(`train ${titleCase(it.skill)}: craft ${itemName(code)}`);
      await runStep(name, ch, { kind: "craft", code, quantity: need, skill: sub.skill, level: 0, x: t.x, y: t.y }, ctx);
      return false;
    }
    const short = sub.items.find((g) => invQty(ch, g.code) < g.quantity * runs)!;
    return sourceOne(name, ch, it, short.code, short.quantity * runs - invQty(ch, short.code), ctx, false);
  }
  throw new Error(`no way to get ${itemName(code)} (skill too low?)`);
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

/** Hand the deliverable in hand to the items master (bagfuls, never via the bank). */
async function handOver(name: string, ch: Character, it: QueueItem, ctx: StepCtx): Promise<boolean> {
  const at = await goToMaster(name, ch, "items", ctx.note);
  if (at === "missing") return skipItem(name, it, "no items tasks master on the map");
  if (at === "there") {
    ctx.note(`deliver ${itemName(ch.task)}`);
    const remaining = Math.max(0, ch.task_total - ch.task_progress);
    await step(name, () => actions.taskTrade(name, ch.task, Math.min(invQty(ch, ch.task), remaining)));
  }
  return false;
}

/**
 * Dead-end fallback for the current task — the field can't produce it (skill
 * too low, no winnable set). An items task hands over BANK stock first (the
 * one case task stock may come from the bank: it's that or a paused queue),
 * then the task is cancelled for a tasks coin, fetched from the bank when not
 * in hand. Only with no coin anywhere does the queue pause with `why`.
 */
async function giveUpTask(
  name: string,
  ch: Character,
  it: Extract<QueueItem, { kind: "work-task" | "task-loop" }>,
  ctx: StepCtx,
  why: string,
): Promise<boolean> {
  const remaining = Math.max(0, ch.task_total - ch.task_progress);
  if (ch.task_type === "items") {
    const held = invQty(ch, ch.task);
    const banked = bankQty(ch.task);
    if (held > 0 && (banked === 0 || freeSpace(ch) === 0)) return handOver(name, ch, it, ctx);
    if (banked > 0) {
      if (freeSpace(ch) === 0) { await bankOff(name, ch.x, ch.y, keepOf(it, ch), ctx.note); return false; }
      const bank = nearestBank(ch.x, ch.y);
      if (!bank) return skipItem(name, it, "no bank on the map");
      ctx.note(`${itemName(ch.task)}: not producible in the field — using bank stock`);
      const s: AcquisitionStep = { kind: "withdraw", code: ch.task, quantity: Math.min(banked, remaining - held, freeSpace(ch)), x: bank.x, y: bank.y };
      await runStep(name, ch, s, ctx);
      return false;
    }
  }
  // Coin fetch, walk and cancel in ONE call: a "no-win" verdict only exists on
  // the monster tile, so returning between steps walked straight back there
  // (and the bank sweep stowed the coin) — a livelock that never cancelled.
  const master = nearest("tasks_master", ch.task_type === "items" ? "items" : "monsters", ch.x, ch.y);
  if (!master) return skipItem(name, it, "no tasks master on the map");
  if (invQty(ch, "tasks_coin") <= 0) {
    if (bankQty("tasks_coin") <= 0) throw new Error(`${why} — and no tasks coin to cancel the task`);
    const bank = nearestBank(ch.x, ch.y);
    if (!bank) throw new Error(`${why} — and no bank to fetch a tasks coin from`);
    ctx.note("fetching a tasks coin to cancel the task");
    await runStep(name, ch, { kind: "withdraw", code: "tasks_coin", quantity: 1, x: bank.x, y: bank.y }, ctx);
  }
  ctx.note("→ tasks master");
  await moveTo(name, master.x, master.y);
  ctx.note("cancelling the task");
  await step(name, () => actions.taskCancel(name));
  log(name, `task cancelled for a tasks coin — ${why}`, "bad");
  return false; // the echo clears ch.task → a loop accepts the next one
}

/**
 * One action of a work-task item. Monsters task ⇒ fight the task monster
 * (fight-item rules). Items task ⇒ acquire ch.task in the field and hand
 * bagfuls straight to the items master — stock never moves through the bank;
 * the bank only hosts the gear reset/self-heal and the junk-overflow valve
 * (and the giveUpTask dead-end fallback).
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
    if (out === "no-win") return giveUpTask(name, ch, it, ctx, `not a safe win vs ${m.name}`);
    if (out === "gave-up") throw new Error("lost 2 fights in a row");
    if (out === "lost") log(name, "lost a fight — healing and retrying", "bad");
    return false;
  }
  if (ch.task_type !== "items") return true; // unknown task type — leave it be

  const held = invQty(ch, ch.task);
  if (held >= remaining) return handOver(name, ch, it, ctx); // enough in hand — hand it over

  const src = fieldSource(ch, ch.task);
  if (!src) return giveUpTask(name, ch, it, ctx, `no way to acquire ${itemName(ch.task)} in the field (skill too low?)`);

  if (src.how === "gather" || src.how === "fight") {
    // A full bag first hands over what it holds, then (all junk) banks off.
    if (freeSpace(ch) === 0) {
      if (held > 0) return handOver(name, ch, it, ctx);
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
    if (out === "no-win") return giveUpTask(name, ch, it, ctx, `not a safe win vs ${src.mon.name}`);
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
    if (mat?.how !== "gather") return giveUpTask(name, ch, it, ctx, `no way to gather ${itemName(missing.code)} (skill too low?)`);
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
  if (held > 0) return handOver(name, ch, it, ctx);
  await bankOff(name, ch.x, ch.y, keepOf(it, ch), ctx.note);
  return false;
}

// ── offering: today's seasonal offerings at the Seasonal Altar ───────────────

type OfferingItem = Extract<QueueItem, { kind: "offering" }>;

/** After the offerings read answered 575 (no rotation — season over?): no re-read per tick. */
const offeringsUnavailable = new Map<string, number>();

/** Categories this item still works today (accepted or open, not skipped). */
function offeringWork(ch: Character, it: OfferingItem) {
  const st = todayOfferings(ch.name);
  if (!st) return { st, work: [] };
  const skip = it.day === st.date ? (it.skip ?? []) : [];
  return { st, skip, work: offeringSlots(ch, st).filter((s) => (s.status === "accepted" || s.status === "open") && !skip.includes(s.category)) };
}

/** Working stock: every owed requirement and its recipe tree (two levels, as obtainOffering goes). */
function offeringKeep(ch: Character, it: OfferingItem): string[] {
  const out: string[] = [];
  const add = (code: string, depth: number): void => {
    out.push(code);
    if (depth > 0) for (const g of itemOf(code)?.craft?.items ?? []) add(g.code, depth - 1);
  };
  for (const s of offeringWork(ch, it).work) if (s.requirement) add(s.requirement.code, 2);
  return out;
}

/** The favored target, when it yields `code` and the character can work it (×1.5 drops/xp there). */
function favorSource(ch: Character, code: string, f?: OfferingFavor): FieldSource | undefined {
  if (f?.target_type === "monster") {
    const mon = monsterOf(f.target_code);
    return mon?.drops.some((d) => d.code === code) ? { how: "fight", mon } : undefined;
  }
  if (f?.target_type === "resource") {
    const res = resourceOf(f.target_code);
    return res?.drops.some((d) => d.code === code) && skillLevel(ch, res.skill) >= res.level ? { how: "gather", res } : undefined;
  }
  const recipe = f?.target_code === code ? itemOf(code)?.craft : undefined;
  return recipe && skillLevel(ch, recipe.skill) >= recipe.level ? { how: "craft", recipe } : undefined;
}

/**
 * One action toward `need` more `code` in the bag: bank stock (unless
 * `useBank` is off — a craft offering crafts its own product; banked gear is
 * the fleet's), else the favored target, else the usual field source —
 * gather, fight, or a craft whose short ingredient is sourced the same way
 * up to `depth` levels down. "dead" ⇒ no way to get it right now.
 */
async function obtainOffering(
  name: string,
  ch: Character,
  code: string,
  need: number,
  ctx: StepCtx,
  favor: OfferingFavor | undefined,
  depth: number,
  useBank: boolean,
): Promise<"acted" | "dead"> {
  const banked = useBank ? bankQty(code) : 0;
  if (banked > 0) {
    if (freeSpace(ch) === 0) { await bankOff(name, ch.x, ch.y, ctx.keep, ctx.note); return "acted"; }
    const bank = nearestBank(ch.x, ch.y);
    if (!bank) return "dead";
    await runStep(name, ch, { kind: "withdraw", code, quantity: Math.min(need, banked, freeSpace(ch)), x: bank.x, y: bank.y }, ctx);
    return "acted";
  }
  const src = favorSource(ch, code, favor) ?? fieldSource(ch, code);
  if (!src) return "dead";
  if (src.how === "craft") {
    const r = src.recipe;
    const runs = Math.ceil(need / Math.max(1, r.quantity));
    const can = craftableTimes(ch, code, need);
    // Everything in hand — or a full bag holding at least one run (stage it through).
    if (can >= runs || (can > 0 && freeSpace(ch) === 0)) {
      const t = nearest("workshop", r.skill, ch.x, ch.y);
      if (!t) return "dead";
      ctx.note(`offering: craft ${itemName(code)}`);
      await runStep(name, ch, { kind: "craft", code, quantity: need, skill: r.skill, level: 0, x: t.x, y: t.y }, ctx);
      return "acted";
    }
    if (depth <= 0) return "dead";
    const short = r.items.find((g) => invQty(ch, g.code) < g.quantity * runs)!;
    return obtainOffering(name, ch, short.code, short.quantity * runs - invQty(ch, short.code), ctx, undefined, depth - 1, true);
  }
  const have = invQty(ch, code);
  if (src.how === "gather") {
    const tile = nearest("resource", src.res.code, ch.x, ch.y);
    if (!tile) return "dead";
    const desired = desiredForJob(name, ch, { kind: "gather", skill: src.res.skill });
    if (desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted") return "acted";
    ctx.note(`offering: gather ${itemName(code)} ${have}/${have + need}`);
    await runStep(name, ch, { kind: "gather", code, quantity: need, resource: src.res.code, level: 0, x: tile.x, y: tile.y }, ctx);
    return "acted";
  }
  const tile = nearest("monster", src.mon.code, ch.x, ch.y);
  if (!tile) return "dead";
  const desired = desiredForJob(name, ch, { kind: "fight", monster: src.mon.code });
  if (desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted") return "acted";
  if (desired && (await provisionPotions(name, ch, desired, ctx)) === "acted") return "acted";
  ctx.note(`offering: hunt ${src.mon.name} for ${itemName(code)} ${have}/${have + need}`);
  const out = await fightRound(name, ch, src.mon, tile, S(name), ctx);
  if (out === "no-win") return "dead";
  if (out === "gave-up") throw new Error("lost 2 fights in a row");
  if (out === "lost") log(name, "lost a fight — healing and retrying", "bad");
  return "acted";
}

/**
 * One action of the offering item. Order: read today's state (once a day) →
 * at the altar, complete what the bag covers, accept every open category →
 * get the first owed requirement → back to the altar. Dead ends skip the
 * category for the day instead of pausing, so a daily 🔁 item never wedges.
 */
async function runOffering(name: string, ch: Character, it: OfferingItem, ctx: StepCtx): Promise<boolean> {
  const { st, skip, work } = offeringWork(ch, it);
  if (!st) {
    if ((offeringsUnavailable.get(name) ?? 0) > Date.now()) return skipItem(name, it, "no seasonal offerings right now");
    ctx.note("reading today's offerings");
    try {
      await loadOfferings(name);
    } catch (e) {
      // runLoop treats every code ≥ 500 as an outage and retries forever — 575 is the game saying "none today".
      if (e instanceof ApiError && e.code === 575) {
        offeringsUnavailable.set(name, Date.now() + 3_600_000);
        return skipItem(name, it, "no seasonal offerings right now");
      }
      throw e;
    }
    return false;
  }
  const skipCategory = (category: string, why: string): false => {
    patchItem(name, it.id, { day: st.date, skip: [...(skip ?? []), category] });
    log(name, `skipped today's ${category} offering — ${why}`, "bad");
    return false;
  };

  if (!work.length) {
    // Done for today. Alone on a 🔁 queue, hold for the next rotation instead of spinning the loop.
    const q = queues.value[name];
    if (q?.repeat && q.items.length === 1) {
      ctx.note(`today's offerings done — next rotation at ${new Date(st.expires_at).toLocaleTimeString()}`);
      for (let i = 0; i < 60 && !stopFlags.has(name); i++) await sleep(1000);
      return false;
    }
    return true;
  }

  const ready = work.find((s) => s.status === "accepted" && invQty(ch, s.requirement!.code) >= s.requirement!.quantity);
  const next = ready ?? work.find((s) => s.status === "open");
  if (next) {
    const altar = nearest("seasonal_altar", null, ch.x, ch.y);
    if (!altar) return skipItem(name, it, "no seasonal altar on the map");
    if (ch.x !== altar.x || ch.y !== altar.y) { ctx.note("→ seasonal altar"); await moveTo(name, altar.x, altar.y); return false; }
    ctx.note(`${ready ? "complete" : "accept"} the ${next.category} offering`);
    try {
      await step(name, () => (ready ? actions.completeOffering(name, next.id!) : actions.acceptOffering(name, next.id!)));
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      if (e.code === 575) return skipCategory(next.category, "not available for this character");
      // 574 already completed / 576 already chosen / 577 not accepted yet: the cached day is stale — re-read it.
      if (e.code === 574 || e.code === 576 || e.code === 577) { await loadOfferings(name); return false; }
      if (e.code === 598) throw new Error(e.message); // a game code, not an outage — pause, don't retry forever
      throw e;
    }
    if (ready) log(name, `${next.category} offering completed`, "ok");
    return false;
  }

  // Everything left is accepted and owes its requirement — work the first one.
  const s = work[0];
  const req = s.requirement!;
  const need = req.quantity - invQty(ch, req.code);
  const r = await obtainOffering(name, ch, req.code, need, ctx, s.favor, 2, s.favor?.target_type !== "craft");
  return r === "dead" ? skipCategory(s.category, `no way to get ${need}× ${itemName(req.code)}`) : false;
}

// Dev forensics: last head-item id per character, to log head transitions once.
const lastHead = new Map<string, string>();

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
      if (lastHead.get(name) !== item.id) {
        lastHead.set(name, item.id);
        devlog(`head ${name}: [${item.id}] ${queueItemText(item)}`);
      }
      try {
        const done = await runItem(name, ch, item);
        if (done) {
          const cur = queues.value[name];
          if (cur?.items[0]?.id === item.id) {
            const rest = cur.items.slice(1);
            // 🔁 wipes progress; done/from/geared don't exist on every kind, hence the double cast.
            const again = { ...item, done: 0, from: undefined, geared: undefined, error: undefined } as unknown as QueueItem;
            setQueue(name, { items: cur.repeat ? [...rest, again] : rest, note: undefined });
          }
          S(name).losses = 0;
        }
      } catch (e) {
        if (isInventoryFull(e)) {
          try { await bankOff(name, ch.x, ch.y, keepOf(item, ch), (t) => setQueue(name, { note: t })); continue; } catch { /* fall through to pause */ }
        }
        // Transient transport trouble (code 0: fetch kept failing / 429 storm
        // exhausted its retries) or a server-side 5xx outage (e.g. 500 "Fatal
        // error (Get User)"): never pause — hold a minute and try again, so a
        // blip doesn't strand the character. ⏹ stays responsive.
        if (e instanceof ApiError && (e.code === 0 || e.code >= 500)) {
          log(name, `network trouble — retrying in 60s (${(e as Error).message})`, "bad");
          setQueue(name, { note: "network trouble — waiting" });
          for (let i = 0; i < 60 && !stopFlags.has(name); i++) await sleep(1000);
          continue;
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

/** 🔁: a finished item goes to the back of the queue (progress wiped) instead of away. */
export function setRepeat(name: string, on: boolean): void {
  if (!IS_SERVER) return rpc("setRepeat", [name, on]);
  if (!queues.value[name]) queues.value = { ...queues.value, [name]: { items: [], running: false } };
  setQueue(name, { repeat: on || undefined });
}

/**
 * The "main task" of a character: a repeating loop that levels the pinned
 * skills (📌) in turn — per pin, a bank reset into the job set then +1 level,
 * with 🔁 on so the rotation never ends. Appends behind whatever is queued.
 */
export function queuePinTraining(name: string): void {
  if (!IS_SERVER) return rpc("queuePinTraining", [name]);
  for (const skill of skillPins.value[name] ?? []) {
    addItem(name, withId({ kind: "gear", job: isCraftSkill(skill) ? { kind: "craft", skill } : { kind: "gather", skill }, reset: true }));
    addItem(name, withId({ kind: "train", skill, toLevel: 0, levels: 1, gear: true }));
  }
  setRepeat(name, true);
}

/** Start executing the queue from its head. */
export function startQueue(name: string): void {
  if (!IS_SERVER) return rpc("startQueue", [name]);
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
  if (!IS_SERVER) return rpc("stopQueue", [name]);
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

expose({ addItem, removeItem, updateItem, moveItem, clearQueue, setRepeat, queuePinTraining, startQueue, stopQueue });
