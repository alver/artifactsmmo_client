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
import { RESET_UTILITY_STRIP, ownedFightForecast, stripAllMap } from "../plan/jobgear";
import { QUEUE_KINDS, queueItemText, withId } from "../plan/queue";
import { trainingResourceFor } from "../plan/hive/skills";
import { CRAFT_SEC, FIGHT_SEC, autoRecyclable, craftXp, fightXp, gatherSec, recycleReturn } from "../plan/xp";
import { killSeconds } from "../plan/bis";
import { titleCase } from "../lib/util";
import { CRAFT_TRAIN_SKILLS, bankItems, characters, isOwned, pendingRewards, pushLog, skillKey, skillPins } from "./store";
import { devlog } from "../lib/devlog";
import { NoRouteError, bankQty, isAt, isInventoryFull, missingText, moveTo, nearest, nearestBank, sleep, step, walkTo } from "./loopkit";
import { bankOff, craftableTimes, desiredForJob, fightRound, foodInHand, freeSpace, gearSwapStep, goToMaster, invCount, invQty, provisionPotions, runStep } from "./exec";
import { categoryLevel, loadOfferings, offeringSlots, todayOfferings } from "./offerings";
import type { StepCtx } from "./exec";
import type { QueueItem } from "../plan/queue";
import type { AcquisitionStep, GearJob } from "../plan/types";
import type { Place } from "../plan/route";
import type { BankItem, Character, CharacterOfferings, OfferingFavor, SeasonalOffering } from "../types/api";
import type { CraftRecipe, DropRate, Monster, Resource } from "../types/catalog";
import type { FightForecast } from "../sim/combat";

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

/** The tab's ops refuse a character the planner owns; the planner writes through insertItem, dropItem,
 *  runQueue, haltQueue and resetQueue, which are not exposed. */
function refused(name: string): boolean {
  if (!isOwned(name)) return false;
  pushLog({ ts: Date.now(), character: name, action: "queue", text: "the planner owns this queue — not changed", kind: "bad" });
  return true;
}

/** Append (or insert at `index`) an item; creates the character's queue lazily. */
export function addItem(name: string, item: QueueItem, index?: number): void {
  if (!IS_SERVER) return rpc("addItem", [name, item, index]);
  if (refused(name)) return;
  const cur = queues.value[name] ?? { items: [], running: false };
  const items = [...cur.items];
  const at = index == null ? items.length : Math.max(cur.running ? 1 : 0, Math.min(index, items.length));
  items.splice(at, 0, item);
  queues.value = { ...queues.value, [name]: { ...cur, items } };
}

export function removeItem(name: string, id: string): void {
  if (!IS_SERVER) return rpc("removeItem", [name, id]);
  if (refused(name)) return;
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

/** The automatic writers' insert, even AHEAD of the running head (a starved `wait` craft takes on a slice of
 *  work; an event trip; the planner's steps and interrupts) — same safety as dropItem. Creates the queue lazily. */
export function insertItem(name: string, item: QueueItem, index: number): void {
  const cur = queues.value[name] ?? { items: [], running: false };
  queues.value = { ...queues.value, [name]: { ...cur, items: [...cur.items.slice(0, index), item, ...cur.items.slice(index)] } };
}

/** User edit — clears the item's error (an edited item gets a fresh chance). */
export function updateItem(name: string, id: string, patch: Partial<QueueItem>): void {
  if (!IS_SERVER) return rpc("updateItem", [name, id, patch]);
  if (refused(name)) return;
  if (headLocked(queues.value[name], id)) return;
  patchItem(name, id, { ...patch, error: undefined });
}

export function moveItem(name: string, id: string, dir: -1 | 1): void {
  if (!IS_SERVER) return rpc("moveItem", [name, id, dir]);
  if (refused(name)) return;
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
  if (refused(name)) return;
  const cur = queues.value[name];
  if (!cur || cur.running) return;
  setQueue(name, { items: [], note: undefined });
}

/** The planner's take-over and hand-back (state/planner.ts): keep only the items `keep` accepts, 🔁 off. Not exposed. */
export function resetQueue(name: string, keep: (it: QueueItem) => boolean): void {
  const cur = queues.value[name];
  if (cur) setQueue(name, { items: cur.items.filter(keep), repeat: undefined, note: undefined });
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
  (ch as unknown as Record<string, number>)[skillKey(skill, "level")] ?? 0;

/** The place an item pins (x, y): a pair saved before layers were stored is on the overworld. */
const pinnedAt = (it: { x?: number; y?: number; layer?: string }): Place | undefined =>
  it.x != null && it.y != null ? { x: it.x, y: it.y, layer: it.layer ?? "overworld" } : undefined;

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
  if (it.kind === "fight" || it.kind === "work-task" || it.kind === "task-loop" || it.kind === "offering" || (it.kind === "gear" && it.job?.kind === "fight") || (it.kind === "train" && it.skill === "combat")) {
    const food = foodInHand(ch)?.code;
    if (food) return [...(base ?? []), food];
  }
  return base;
}

function ctxOf(name: string, ch: Character, it: QueueItem): StepCtx {
  // Persisted queues from before food became a boolean may carry an old
  // FoodSpec object here — any non-false value means "keep fed".
  const fed = it.kind === "fight" ? it.food !== false : it.kind === "work-task" || it.kind === "task-loop" || it.kind === "offering" || (it.kind === "train" && it.skill === "combat") ? true : undefined;
  return {
    keep: keepOf(it, ch),
    food: fed,
    fightsLeft:
      it.kind === "fight" ? (it.times > 0 ? Math.max(1, it.times - it.done) : 50)
      : it.kind === "work-task" || it.kind === "task-loop" ? Math.max(1, ch.task_total - ch.task_progress)
      : it.kind === "offering" ? 20 // a handful of drops — sizes one food restock
      : it.kind === "train" && it.skill === "combat" ? 50
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
      const to = pinnedAt(it)!;
      if (isAt(ch, to)) return true;
      ctx.note(`→ (${it.x}, ${it.y})${to.layer === "overworld" ? "" : ` ${to.layer}`}`);
      await moveTo(name, to);
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
      const bank = pinnedAt(it) ?? nearestBank(ch);
      if (!bank) return skipItem(name, it, "no bank on the map");
      await runStep(name, ch, { kind: "withdraw", code: it.code, quantity: Math.min(missing, banked), at: bank }, ctx);
      return false;
    }
    case "buy": {
      // Done only once the purchase is recorded on the item (by id, the moment
      // npc/buy succeeds — see runStep). Checked first: a step result thrown
      // away because the head changed under it, or a restart before the item
      // is removed, must not buy twice. One buy call covers the whole quantity.
      if (it.bought) return true;
      const tile = pinnedAt(it) ?? (it.npc ? nearest("npc", it.npc, ch) : undefined);
      if (!tile) return skipItem(name, it, it.npc ? missingText("npc", it.npc, ch) : "no shop on the map (event over?)");
      const s: AcquisitionStep = { kind: "buy", code: it.code, quantity: it.quantity, npc: it.npc ?? "", cost: 0, at: tile };
      await runStep(name, ch, s, { ...ctx, bought: () => patchItem(name, it.id, { bought: true }) });
      return false; // this tick may have been the gold withdrawal; the next one sees `bought`
    }
    case "sell": {
      const left = it.quantity - it.done;
      if (left <= 0) return true;
      const held = invQty(ch, it.code);
      if (held > 0) {
        const seller = it.npc ?? npcForSell(it.code)?.code;
        const tile = pinnedAt(it) ?? (seller ? nearest("npc", seller, ch) : undefined);
        if (!tile) return skipItem(name, it, seller ? missingText("npc", seller, ch) : `no merchant buys ${itemName(it.code)}`);
        if (!isAt(ch, tile)) { ctx.note("→ merchant"); await moveTo(name, tile); return false; }
        const qty = Math.min(held, left);
        ctx.note(`sell ${itemName(it.code)}`);
        await step(name, () => actions.npcSell(name, it.code, qty));
        patchItem(name, it.id, { done: it.done + qty });
        return false;
      }
      // Hand empty — pull more stock from the bank, one bag-sized piece at a time.
      const banked = bankQty(it.code);
      if (banked > 0) {
        if (freeSpace(ch) === 0) { await bankOff(name, [it.code], ctx.note); return false; } // bag full of other stuff
        const bank = nearestBank(ch);
        if (!bank) return skipItem(name, it, "no bank on the map");
        await runStep(name, ch, { kind: "withdraw", code: it.code, quantity: Math.min(banked, left, freeSpace(ch)), at: bank }, ctx);
        return false;
      }
      if (it.partial) return true;
      throw new Error(`nothing left to sell — no ${itemName(it.code)} in hand or bank`);
    }
    case "recycle": {
      const left = it.quantity - it.done;
      if (left <= 0) return true;
      const held = invQty(ch, it.code);
      if (held > 0) {
        const skill = it.skill ?? itemOf(it.code)?.craft?.skill;
        const tile = pinnedAt(it) ?? (skill ? nearest("workshop", skill, ch) : undefined);
        if (!tile) return skipItem(name, it, `no workshop recycles ${itemName(it.code)}`);
        if (!isAt(ch, tile)) { ctx.note("→ workshop"); await moveTo(name, tile); return false; }
        const qty = Math.min(held, left);
        ctx.note(`recycle ${itemName(it.code)}`);
        await step(name, () => actions.recycle(name, it.code, qty));
        patchItem(name, it.id, { done: it.done + qty });
        return false;
      }
      // Hand empty — pull more stock from the bank, one bag-sized piece at a time.
      const banked = bankQty(it.code);
      if (banked > 0) {
        if (freeSpace(ch) === 0) { await bankOff(name, [it.code], ctx.note); return false; } // bag full of other stuff
        const bank = nearestBank(ch);
        if (!bank) return skipItem(name, it, "no bank on the map");
        await runStep(name, ch, { kind: "withdraw", code: it.code, quantity: Math.min(banked, left, freeSpace(ch)), at: bank }, ctx);
        return false;
      }
      throw new Error(`nothing left to recycle — no ${itemName(it.code)} in hand or bank`);
    }
    case "gather": {
      if (it.times > 0 && it.done >= it.times) return true; // times 0 = forever
      const tile = pinnedAt(it) ?? nearest("resource", it.resource, ch);
      if (!tile) return skipItem(name, it, missingText("resource", it.resource, ch));
      // Bank-gear self-heal: keep the best gathering set the bank holds on
      // (memoized per bank reference — free when nothing changed).
      if (it.gear) {
        const skill = resourceOf(it.resource)?.skill;
        const desired = skill ? desiredForJob(name, ch, { kind: "gather", skill }) : undefined;
        if (desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted") return false;
      }
      const s: AcquisitionStep = { kind: "gather", code: it.code, quantity: Math.max(1, it.times - it.done), resource: it.resource, level: 0, at: tile };
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
          if (invCount(ch) > 0) { await bankOff(name, undefined, ctx.note); return false; }
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
            await bankOff(name, undefined, ctx.note);
            return false;
          }
          const bank = nearestBank(ch);
          if (!bank) return skipItem(name, it, "no bank on the map");
          const qty = Math.min(ing.quantity * batch - invQty(ch, ing.code), bankQty(ing.code));
          await runStep(name, ch, { kind: "withdraw", code: ing.code, quantity: qty, at: bank }, ctx);
          return false;
        }
      }
      const skill = it.skill ?? recipe?.skill;
      const tile = pinnedAt(it) ?? (skill ? nearest("workshop", skill, ch) : undefined);
      if (!tile) return skipItem(name, it, `no workshop for ${itemName(it.code)}`);
      const s: AcquisitionStep = { kind: "craft", code: it.code, quantity: left, skill: skill ?? "", level: 0, at: tile };
      const r = await runStep(name, ch, s, ctx);
      if (r.did === "crafted") patchItem(name, it.id, { done: it.done + r.produced });
      return false;
    }
    case "train": {
      const who = it.for ? characters.value[it.for] : ch; // a helper's target is the crafter's level
      if (!who) return skipItem(name, it, `no character ${it.for}`);
      const lv = skillLevel(who, it.skill);
      if (it.levels && it.from == null) { patchItem(name, it.id, { from: lv }); return false; }
      const target = it.levels ? (it.from ?? lv) + it.levels : it.toLevel;
      if (target > 0 && lv >= target) return true;
      if (it.for) return runTrainAssist(name, ch, it, who, ctx);
      if (it.skill === "combat") return runTrainCombat(name, ch, it, ctx);
      if (isCraftSkill(it.skill)) return runTrainCraft(name, ch, it, ctx);
      // The highest node that still gives XP AND that this character reaches now (event nodes while they are up).
      const node = it.resource ?? trainingResourceFor(it.skill, lv, (code) => !!nearest("resource", code, ch))?.code;
      if (!node) return skipItem(name, it, `no ${titleCase(it.skill)} node this character can reach gives XP at Lv ${lv}`);
      const tile = pinnedAt(it) ?? nearest("resource", node, ch);
      if (!tile) return skipItem(name, it, missingText("resource", node, ch));
      if (await gatherGear(name, ch, it, it.skill, ctx)) return false;
      await runStep(name, ch, { kind: "train", skill: it.skill, toLevel: target, resource: node, level: 0, at: tile }, ctx);
      return false;
    }
    case "fight": {
      if (it.times > 0 && it.done >= it.times) return true; // times 0 = forever
      const m = monsterOf(it.monster);
      const tile = m ? nearest("monster", it.monster, ch) : undefined;
      if (!m || !tile) return skipItem(name, it, missingText("monster", it.monster, ch));
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
      await bankOff(name, undefined, ctx.note);
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
    case "prepare": {
      const m = monsterOf(it.monster);
      const tile = m ? nearest("monster", it.monster, ch) : undefined;
      if (!m || !tile) return skipItem(name, it, missingText("monster", it.monster, ch));
      const desired = desiredForJob(name, ch, { kind: "fight", monster: it.monster });
      if (!desired) throw new Error(`can't plan gear vs ${m.name}`);
      if (!it.geared) {
        // One full reset (the differ then only tops up — a second reset would walk back to bank).
        if ((await gearSwapStep(name, ch, { ...RESET_UTILITY_STRIP, ...desired }, ctx, { reset: true })) === "acted") return false;
        patchItem(name, it.id, { geared: true });
        return false;
      }
      if ((await provisionPotions(name, ch, desired, ctx)) === "acted") return false;
      if ((await gearSwapStep(name, ch, desired, ctx)) === "acted") return false; // equips what was just brewed
      if (!isAt(ch, tile)) {
        ctx.note(`→ ${m.name}`);
        await moveTo(name, tile);
        return false;
      }
      if (ch.hp < ch.max_hp) {
        ctx.note("resting");
        await step(name, () => actions.rest(name));
        return false;
      }
      return true;
    }
    case "claim": {
      // A reward that does not fit the bag answers 497: runLoop's full-bag path banks the bag, then this goes on.
      const row = pendingRewards.value[0];
      const got = (it.got ?? []).filter((c) => (c === "gold" ? ch.gold : invQty(ch, c)) > 0);
      if (!row && !got.length) return true;
      const bank = nearestBank(ch);
      if (!bank) return skipItem(name, it, "no bank on the map");
      if (!isAt(ch, bank)) { ctx.note("→ bank to claim rewards"); await moveTo(name, bank); return false; }
      if (row) {
        ctx.note(`claim: ${row.description}`);
        await step(name, () => actions.claimItem(name, row.id));
        patchItem(name, it.id, { got: [...new Set([...(it.got ?? []), ...row.items.map((x) => x.code), ...(row.gold ? ["gold"] : [])])] });
        const what = row.items.map((x) => `${x.quantity}× ${x.code}${itemOf(x.code)?.subtype === "bag" ? ` (${(itemOf(x.code)?.effects ?? []).map((e) => `${e.code} ${e.value} each`).join(", ")})` : ""}`);
        devlog(`claim ${name}: ${row.description} — ${[...what, ...(row.gold ? [`${row.gold} gold`] : [])].join(", ") || "nothing"}`);
        log(name, `claimed ${row.description}`, "ok");
        return false;
      }
      const items = got.filter((c) => c !== "gold").map((code) => ({ code, quantity: invQty(ch, code) }));
      ctx.note("deposit what was claimed");
      await step(name, () => (items.length ? actions.depositItems(name, items) : actions.depositGold(name, ch.gold)));
      return false;
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
        if (freeSpace(ch) === 0) { await bankOff(name, it.keep, ctx.note); return false; } // bag full of other stuff
        const bank = nearestBank(ch);
        if (!bank) return skipItem(name, it, "no bank on the map");
        const s: AcquisitionStep = { kind: "withdraw", code: ch.task, quantity: Math.min(banked, remaining, freeSpace(ch)), at: bank };
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

/** Before a drop fight: wear the bank's best set vs the monster (the fight item's self-heal). True ⇒ tick spent. */
async function fightGear(name: string, ch: Character, it: Extract<QueueItem, { kind: "train" }>, monster: string, ctx: StepCtx): Promise<boolean> {
  if (!it.gear) return false;
  const desired = desiredForJob(name, ch, { kind: "fight", monster });
  return !!desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted";
}

/** The forecast of the bank's best set vs the monster — a BIS solve, memoized per bank reference. */
const forecastMemo = new Map<string, { bank: BankItem[]; level: number; forecast?: FightForecast }>();
function forecastVs(ch: Character, monster: string): FightForecast | undefined {
  const key = `${ch.name}|${monster}`;
  const m = forecastMemo.get(key);
  if (m && m.bank === bankItems.value && m.level === ch.level) return m.forecast;
  const forecast = ownedFightForecast(ch, bankItems.value, monster);
  forecastMemo.set(key, { bank: bankItems.value, level: ch.level, forecast });
  return forecast;
}
const canBeat = (ch: Character, monster: string): boolean => !!forecastVs(ch, monster)?.win;

/**
 * The monster to level combat on right now: best XP per second (fight cooldown
 * + rest to full) among monsters on the map that give XP and that the bank's
 * best set beats. Memoized per bank reference + level like the forecasts.
 * shortcut: candidates stop at level + 10 (a BIS solve each), raise if a
 * character ever beats something further up.
 */
const monsterMemo = new Map<string, { bank: BankItem[]; level: number; pick?: Monster }>();
function trainingMonsterFor(ch: Character): Monster | undefined {
  const m = monsterMemo.get(ch.name);
  if (m && m.bank === bankItems.value && m.level === ch.level) return m.pick;
  let best: { mon: Monster; rate: number } | undefined;
  for (const mon of catalog().monsters.values()) {
    const xp = fightXp(mon.level, mon.hp, mon.type, ch.level);
    if (xp <= 0 || mon.level > ch.level + 10 || !nearest("monster", mon.code, ch)) continue;
    const f = forecastVs(ch, mon.code);
    if (!f?.win) continue;
    const rate = xp / killSeconds(f);
    if (!best || rate > best.rate) best = { mon, rate };
  }
  monsterMemo.set(ch.name, { bank: bankItems.value, level: ch.level, pick: best?.mon });
  return best?.mon;
}

/** Combat training: fight the best-XP-per-second monster, re-picked as the level and bank change. */
async function runTrainCombat(name: string, ch: Character, it: Extract<QueueItem, { kind: "train" }>, ctx: StepCtx): Promise<boolean> {
  const mon = trainingMonsterFor(ch);
  if (!mon) return skipItem(name, it, "no monster worth XP that the bank's gear can beat");
  const tile = nearest("monster", mon.code, ch);
  if (!tile) { monsterMemo.delete(ch.name); return false; } // its event ended (or out of reach from here) — re-pick next tick
  if (await fightGear(name, ch, it, mon.code, ctx)) return false;
  ctx.note(`training combat vs ${mon.name}`);
  const out = await fightRound(name, ch, mon, tile, S(name), ctx);
  if (out === "no-win") throw new Error(`not a safe win vs ${mon.name}`);
  if (out === "gave-up") throw new Error("lost 2 fights in a row");
  if (out === "lost") log(name, "lost a fight — healing and retrying", "bad");
  return false;
}

/** Actions (gathers or fights) per unit dropped: "1 in N" rate ÷ mean quantity. */
const dropRate = (src: { drops: DropRate[] }, code: string): number => {
  const d = src.drops.find((d) => d.code === code)!;
  return d.rate / ((d.min_quantity + d.max_quantity) / 2);
};

/**
 * Seconds of someone's time per unit of `code` produced in the field by the
 * best of `by`: a gather, a one-deep smelt of gathers, or a winnable drop fight.
 * Infinity = nobody in `by` can (the sourceOne vocabulary, exactly).
 */
function unitSec(by: Character[], code: string): number {
  let best = Infinity;
  for (const ch of by) {
    const src = fieldSource(ch, code);
    if (!src) continue;
    let s = Infinity;
    if (src.how === "gather") s = gatherSec(src.res.level) * dropRate(src.res, code);
    else if (src.how === "craft") {
      const subs = src.recipe.items.map((g) => ({ g, src: fieldSource(ch, g.code) }));
      if (subs.every((x) => x.src?.how === "gather")) {
        const raw = subs.reduce((t, x) => { const r = (x.src as { res: Resource }).res; return t + x.g.quantity * gatherSec(r.level) * dropRate(r, x.g.code); }, 0);
        s = (raw + CRAFT_SEC) / Math.max(1, src.recipe.quantity);
      }
    } else if (canBeat(ch, src.mon.code)) s = FIGHT_SEC * dropRate(src.mon, code);
    best = Math.min(best, s);
  }
  return best;
}

/**
 * Units of `code` the team can draw on without field work: bank + every team
 * bag, plus one-deep raw stock (banked ore → bars) at the recipe's yield when
 * someone on the team can refine it — the same one level sourceOne crafts.
 * shortcut: raw shared by two ingredients counts for both; fine for ranking.
 */
function stockOf(code: string, team: Character[]): number {
  const held = (c: string): number => bankQty(c) + team.reduce((t, m) => t + invQty(m, c), 0);
  const r = itemOf(code)?.craft;
  const refinable = !!r?.items.length && team.some((m) => skillLevel(m, r.skill) >= r.level);
  const raw = refinable ? Math.min(...r!.items.map((g) => Math.floor(held(g.code) / g.quantity))) * Math.max(1, r!.quantity) : 0;
  return held(code) + raw;
}

/** Whether producing `code` in the field earns `ch` XP in one of its pinned skills.
 *  shortcut: gathering XP assumed gone 10+ levels above the node, as crafting's is. */
function levelsPin(ch: Character, code: string): boolean {
  const pins = skillPins.value[ch.name] ?? [];
  const src = fieldSource(ch, code);
  if (src?.how === "gather") return pins.includes(src.res.skill) && skillLevel(ch, src.res.skill) - src.res.level < 10;
  if (src?.how === "craft") return pins.includes(src.recipe.skill) && skillLevel(ch, src.recipe.skill) - src.recipe.level < 10;
  if (src?.how === "fight") return pins.includes("combat") && fightXp(src.mon.level, src.mon.hp, src.mon.type, ch.level) > 0;
  return false;
}

/**
 * The recipe to train a workshop skill on right now: the best XP per
 * fleet-second (plan/xp.ts — tier base by ITEM level, √ingredients, zero once
 * outleveled by 10+) among recipes `by` (crafter + helpers) can feed in the
 * field; a drop-only or bank-only ingredient counts as free while bag + bank
 * cover a run (batchRuns caps the batch at that stock). Recycling hands back
 * floor((n−1)/5)+1 random units — only for products of common stuff
 * (autoRecyclable); a rare-ingredient product is banked at full material cost.
 * Re-picked every tick, so stock running out simply moves the loop on to the
 * next recipe.
 */
export function trainRecipe(ch: Character, skill: string, by: Character[] = [ch]): { code: string; recipe: CraftRecipe; xp: number } | undefined { // exported for the verify probe
  const lv = skillLevel(ch, skill);
  let best: { code: string; recipe: CraftRecipe; xp: number; rate: number; n: number } | undefined;
  for (const it of catalog().items.values()) {
    const r = it.craft;
    if (!r || r.skill !== skill || r.level > lv) continue;
    const n = r.items.reduce((s, g) => s + g.quantity, 0);
    const xp = craftXp(r.level, lv, n);
    if (!xp) continue;
    // Stock on hand is already paid for: over one batch, only the runs it can't
    // cover cost field time (1,595 banked spruce wood sat idle while the loop
    // gathered fresh ash for the recipe that was cheapest from scratch).
    const horizon = Math.max(1, Math.floor(ch.inventory_max_items / 2 / Math.max(1, n)));
    let mats = 0;
    for (const g of r.items) {
      const u = unitSec(by, g.code);
      if (u < Infinity) mats += (u * g.quantity * Math.max(0, horizon - Math.floor(stockOf(g.code, by) / g.quantity))) / horizon;
      else if (invQty(ch, g.code) + bankQty(g.code) < g.quantity) { mats = Infinity; break; }
    }
    if (mats === Infinity) continue;
    const sec = CRAFT_SEC + mats * (autoRecyclable(it.code) ? 1 - recycleReturn(n) / n : 1);
    const rate = xp / sec;
    if (!best || rate > best.rate || (rate === best.rate && n < best.n)) best = { code: it.code, recipe: r, xp, rate, n };
  }
  return best;
}

/** Characters whose RUNNING queue head is "help `crafter` train `skill`". */
const helpersOf = (crafter: string, skill: string): Character[] =>
  Object.entries(queues.value).flatMap(([n, q]) => {
    const h = q.items[0];
    return q.running && h?.kind === "train" && h.for === crafter && h.skill === skill && characters.value[n] ? [characters.value[n]] : [];
  });

/** The crafter's current pick, fed by itself plus its helpers. */
const trainPick = (crafter: Character, skill: string) => trainRecipe(crafter, skill, [crafter, ...helpersOf(crafter.name, skill)]);

/** Recipe runs per batch: half a bag of DIRECT materials (6 bars per axe, not
 *  60 ore — sourceOne stages a sub-craft through the other half); an ingredient
 *  nobody can produce caps it at what bag + bank hold. */
function batchRuns(ch: Character, recipe: CraftRecipe, by: Character[]): number {
  const matsPerRun = Math.max(1, recipe.items.reduce((s, g) => s + g.quantity, 0));
  let runs = Math.max(1, Math.floor(ch.inventory_max_items / 2 / matsPerRun));
  for (const g of recipe.items) if (unitSec(by, g.code) === Infinity) runs = Math.min(runs, Math.floor((invQty(ch, g.code) + bankQty(g.code)) / g.quantity));
  return Math.max(1, runs);
}

/** Working stock of a workshop-skill train: the recipe's materials and their
 *  one-deep sub-materials — never the product, which gets recycled or banked.
 *  A helper keeps its tools and the raw material it is refining; everything it
 *  makes is FOR the bank. */
function trainKeep(ch: Character, it: Extract<QueueItem, { kind: "train" }>): string[] | undefined {
  if (!isCraftSkill(it.skill)) return undefined;
  const by = [ch, ...helpersOf(ch.name, it.skill)];
  const pick = it.for ? undefined : trainRecipe(ch, it.skill, by);
  const runs = pick ? batchRuns(ch, pick.recipe, by) : 0;
  // Spare tools ride in the bag (never the product itself — it must recycle/bank)
  // so the gather ↔ craft tool swap never costs a bank trip.
  const tools = it.gear ? (ch.inventory ?? []).filter((s) => s.code && s.code !== pick?.code && itemOf(s.code)?.subtype === "tool").map((s) => s.code) : [];
  // A helper delivers what it makes, but the raw material it refines on the way
  // (ore → bars) is working stock: a full-bag bank-off must not deposit it only
  // for the next tick to withdraw it again. Never a code the recipe takes
  // directly — that one IS the delivery.
  const crafter = it.for ? characters.value[it.for] : undefined;
  const direct = (crafter && trainPick(crafter, it.skill)?.recipe.items) || [];
  const refining = direct.flatMap((g) => {
    const src = fieldSource(ch, g.code);
    return src?.how === "craft" ? src.recipe.items.map((s) => s.code).filter((c) => !direct.some((d) => d.code === c)) : [];
  });
  return [
    ...refining,
    ...(pick?.recipe.items.flatMap((g) => {
      const src = fieldSource(ch, g.code);
      // Sub-materials (ore) are working stock only while the batch's bars aren't
      // covered by bag + bank — otherwise they're dead weight on a hunt.
      const covered = invQty(ch, g.code) + bankQty(g.code) >= g.quantity * runs;
      return [g.code, ...(src?.how === "craft" && !covered ? src.recipe.items.map((s) => s.code) : [])];
    }) ?? []),
    ...tools,
  ];
}

/**
 * One tick of workshop-skill training, a self-contained loop: source a
 * half-bag batch of materials (bank → one-deep sub-craft → gather / fight) →
 * craft → recycle the product (materials come back) or bank it → repeat.
 * Every tick re-derives its state from bag + bank, so a reload resumes
 * anywhere. Helpers (`train … for me` on other queues) stock the bank; an
 * ingredient only THEY can produce is waited for, not paused on.
 */
async function runTrainCraft(name: string, ch: Character, it: Extract<QueueItem, { kind: "train" }>, ctx: StepCtx): Promise<boolean> {
  const by = [ch, ...helpersOf(name, it.skill)];
  const pick = trainRecipe(ch, it.skill, by);
  if (!pick) throw new Error(`no ${titleCase(it.skill)} recipe this character can feed at Lv ${skillLevel(ch, it.skill)}`);
  const { code, recipe, xp } = pick;
  // 1. Product in hand → recycle it (materials come back), else bank it (not
  //    recyclable, or made of something rare — recycling would mostly lose it).
  const made = invQty(ch, code);
  if (made > 0) {
    if (!autoRecyclable(code)) { await bankOff(name, ctx.keep, ctx.note); return false; }
    const t = nearest("workshop", recipe.skill, ch);
    if (!t) throw new Error(`no ${recipe.skill} workshop on the map`);
    if (!isAt(ch, t)) { ctx.note("→ workshop"); await moveTo(name, t); return false; }
    ctx.note(`train ${titleCase(it.skill)}: recycle ${itemName(code)}`);
    await step(name, () => actions.recycle(name, code, made));
    return false;
  }
  // 2. The batch's materials in hand (or a full bag with at least one run) → craft.
  const per = Math.max(1, recipe.quantity);
  const runs = batchRuns(ch, recipe, by);
  const can = craftableTimes(ch, code, runs * per);
  if (can >= runs || (can > 0 && freeSpace(ch) === 0)) {
    const t = nearest("workshop", recipe.skill, ch);
    if (!t) throw new Error(`no ${recipe.skill} workshop on the map`);
    if (await craftGear(name, ch, it, recipe.skill, ctx)) return false;
    ctx.note(`train ${titleCase(it.skill)}: craft ${itemName(code)} ×${can} (+${xp} xp each)`);
    await runStep(name, ch, { kind: "craft", code, quantity: can * per, skill: recipe.skill, level: 0, at: t }, ctx);
    return false;
  }
  // 3. Source a short ingredient — one this character can get itself first (a
  //    full bag of other stuff banks off first; a bag full of our own staged
  //    materials goes on to the sub-craft); helper-only ones are waited for.
  const keep = new Set(ctx.keep ?? []);
  if (freeSpace(ch) === 0 && (ch.inventory ?? []).some((s) => s.code && s.quantity > 0 && !keep.has(s.code))) {
    await bankOff(name, ctx.keep, ctx.note);
    return false;
  }
  const shorts = recipe.items.filter((g) => invQty(ch, g.code) < g.quantity * runs);
  const own = shorts.find((g) => bankQty(g.code) > 0 || unitSec([ch], g.code) < Infinity);
  if (!own && by.length > 1) {
    ctx.note(`train ${titleCase(it.skill)}: waiting for ${itemName(shorts[0].code)} from helpers`);
    for (let i = 0; i < 15 && !stopFlags.has(name); i++) await sleep(1000);
    return false;
  }
  const short = own ?? shorts[0];
  return sourceOne(name, ch, it, short.code, short.quantity * runs - invQty(ch, short.code), ctx, true);
}

/**
 * What helper `ch` produces next for `crafter`'s recipe: whatever is already in
 * its bag (a half-staged smelt or hunt finishes), else the least-covered
 * ingredient it can make — counting bank + banked raw + every team bag, plus a
 * full trip for each OTHER helper already working on it (four helpers used to
 * pick the same one). Near-ties go to one that levels a pinned skill.
 * Exported for scripts/check-assist.mts.
 */
export function assistPick(ch: Character, crafter: Character, skill: string, recipe: CraftRecipe): { code: string; load: number } | undefined {
  const by = [crafter, ...helpersOf(crafter.name, skill)];
  const team = by.some((m) => m.name === ch.name) ? by : [...by, ch];
  const runs = batchRuns(crafter, recipe, by);
  const holds = (m: Character, code: string): boolean => {
    const src = fieldSource(m, code);
    return invQty(m, code) > 0 || (src?.how === "craft" && src.recipe.items.some((s) => invQty(m, s.code) > 0));
  };
  const rows = recipe.items
    .map((g) => {
      // One trip's load: a bagful of raw materials smelted (10 bars), never more
      // than a batch (14 slimeballs) — a delivery costs ~35 s, an idle crafter hours.
      const src = fieldSource(ch, g.code);
      const raw = src?.how === "craft" ? src.recipe.items.reduce((t, s) => t + s.quantity, 0) / Math.max(1, src.recipe.quantity) : 1;
      return { code: g.code, need: g.quantity * runs * 2, load: Math.max(1, Math.min(g.quantity * runs, Math.floor(ch.inventory_max_items / raw))) };
    })
    .filter((g) => unitSec([ch], g.code) < Infinity);
  const mine = rows.find((g) => holds(ch, g.code));
  if (mine || !rows.length) return mine;
  const others = by.filter((m) => m.name !== ch.name && m.name !== crafter.name);
  const ranked = rows
    .map((g) => ({ g, cover: (stockOf(g.code, team) + others.filter((m) => holds(m, g.code)).length * g.load) / g.need }))
    .sort((a, b) => a.cover - b.cover);
  const near = ranked.filter((r) => r.cover <= ranked[0].cover + 0.1);
  return (near.find((r) => levelsPin(ch, r.g.code)) ?? ranked[0]).g;
}

/**
 * One tick of helping `crafter` train: keep the bank a couple of batches ahead
 * on its current recipe's materials — produce a load of the ingredient
 * assistPick names, deliver it, repeat. Never withdraws the ingredient itself
 * (bank stock is the goal), only banked raw to refine.
 */
async function runTrainAssist(name: string, ch: Character, it: Extract<QueueItem, { kind: "train" }>, crafter: Character, ctx: StepCtx): Promise<boolean> {
  const pick = trainPick(crafter, it.skill);
  if (!pick) throw new Error(`no ${titleCase(it.skill)} recipe ${crafter.name} can be fed at Lv ${skillLevel(crafter, it.skill)}`);
  const g = assistPick(ch, crafter, it.skill, pick.recipe);
  if (!g) throw new Error(`nothing in ${itemName(pick.code)} this character can produce`);
  if (invQty(ch, g.code) >= g.load) { ctx.note(`help ${crafter.name}: deliver ${itemName(g.code)}`); await bankOff(name, ctx.keep, ctx.note); return false; }
  return sourceOne(name, ch, it, g.code, g.load - invQty(ch, g.code), ctx, true, false);
}

/** Get `need` more of `code` into the bag, one action: withdraw bank stock
 *  (unless `fromBank` is off — a helper produces for the bank), else gather it,
 *  else hunt the monster that drops it, else (one level deep) craft it from
 *  gathered/banked materials — raw stock is always fair game, so a helper
 *  refines banked ore instead of mining more. */
async function sourceOne(
  name: string,
  ch: Character,
  it: Extract<QueueItem, { kind: "train" }>,
  code: string,
  need: number,
  ctx: StepCtx,
  deep: boolean,
  fromBank = true,
): Promise<boolean> {
  const label = it.for ? `help ${it.for}` : `train ${titleCase(it.skill)}`;
  const banked = fromBank ? bankQty(code) : 0;
  if (banked > 0 && freeSpace(ch) > 0) {
    const bank = nearestBank(ch);
    if (!bank) return skipItem(name, it, "no bank on the map");
    await runStep(name, ch, { kind: "withdraw", code, quantity: Math.min(need, banked, freeSpace(ch)), at: bank }, ctx);
    return false;
  }
  const src = fieldSource(ch, code);
  if (src?.how === "gather") {
    const tile = nearest("resource", src.res.code, ch);
    if (!tile) return skipItem(name, it, missingText("resource", src.res.code, ch));
    if (await gatherGear(name, ch, it, src.res.skill, ctx)) return false;
    ctx.note(`${label}: gather ${itemName(code)} ${invQty(ch, code)}/${invQty(ch, code) + need}`);
    await runStep(name, ch, { kind: "gather", code, quantity: 1, resource: src.res.code, level: 0, at: tile }, ctx);
    return false;
  }
  if (src?.how === "fight") {
    const tile = nearest("monster", src.mon.code, ch);
    if (!tile) return skipItem(name, it, missingText("monster", src.mon.code, ch));
    if (await fightGear(name, ch, it, src.mon.code, ctx)) return false;
    ctx.note(`${label}: hunt ${src.mon.name} for ${itemName(code)} ${invQty(ch, code)}/${invQty(ch, code) + need}`);
    const out = await fightRound(name, ch, src.mon, tile, S(name), ctx);
    if (out === "no-win") throw new Error(`not a safe win vs ${src.mon.name}`);
    if (out === "gave-up") throw new Error("lost 2 fights in a row");
    if (out === "lost") log(name, "lost a fight — healing and retrying", "bad");
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
      const t = nearest("workshop", sub.skill, ch);
      if (!t) throw new Error(`no ${sub.skill} workshop on the map`);
      if (await craftGear(name, ch, it, sub.skill, ctx)) return false;
      ctx.note(`${label}: craft ${itemName(code)}`);
      await runStep(name, ch, { kind: "craft", code, quantity: need, skill: sub.skill, level: 0, at: t }, ctx);
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
      if (freeSpace(ch) === 0) { await bankOff(name, keepOf(it, ch), ctx.note); return false; }
      const bank = nearestBank(ch);
      if (!bank) return skipItem(name, it, "no bank on the map");
      ctx.note(`${itemName(ch.task)}: not producible in the field — using bank stock`);
      const s: AcquisitionStep = { kind: "withdraw", code: ch.task, quantity: Math.min(banked, remaining - held, freeSpace(ch)), at: bank };
      await runStep(name, ch, s, ctx);
      return false;
    }
  }
  // Coin fetch, walk and cancel in ONE call — every leg of both walks too: a
  // "no-win" verdict only exists on the monster tile, so returning between steps
  // walked straight back there (and the swap's bag sweep, since removed, stowed
  // the coin) — a livelock that never cancelled.
  const master = nearest("tasks_master", ch.task_type === "items" ? "items" : "monsters", ch);
  if (!master) return skipItem(name, it, "no tasks master on the map");
  if (invQty(ch, "tasks_coin") <= 0) {
    if (bankQty("tasks_coin") <= 0) throw new Error(`${why} — and no tasks coin to cancel the task`);
    const bank = nearestBank(ch);
    if (!bank) throw new Error(`${why} — and no bank to fetch a tasks coin from`);
    ctx.note("fetching a tasks coin to cancel the task");
    await walkTo(name, bank);
    await runStep(name, ch, { kind: "withdraw", code: "tasks_coin", quantity: 1, at: bank }, ctx);
  }
  ctx.note("→ tasks master");
  await walkTo(name, master);
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
    const tile = m ? nearest("monster", ch.task, ch) : undefined;
    if (!m || !tile) throw new Error(missingText("monster", ch.task, ch));
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
      await bankOff(name, keepOf(it, ch), ctx.note);
      return false;
    }
    if (src.how === "gather") {
      const tile = nearest("resource", src.res.code, ch);
      if (!tile) throw new Error(missingText("resource", src.res.code, ch));
      if (await taskGear(name, ch, it, { kind: "gather", skill: src.res.skill }, ctx)) return false;
      ctx.note(`task ${held + ch.task_progress}/${ch.task_total}: gather ${itemName(ch.task)}`);
      await runStep(name, ch, { kind: "gather", code: ch.task, quantity: remaining - held, resource: src.res.code, level: 0, at: tile }, ctx);
      return false;
    }
    const tile = nearest("monster", src.mon.code, ch);
    if (!tile) throw new Error(missingText("monster", src.mon.code, ch));
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
    const tile = nearest("resource", mat.res.code, ch);
    if (!tile) throw new Error(missingText("resource", mat.res.code, ch));
    if (await taskGear(name, ch, it, { kind: "gather", skill: mat.res.skill }, ctx)) return false;
    ctx.note(`task: gather ${itemName(missing.code)} ${invQty(ch, missing.code)}/${missing.quantity * batch}`);
    await runStep(name, ch, { kind: "gather", code: missing.code, quantity: 1, resource: mat.res.code, level: 0, at: tile }, ctx);
    return false;
  }
  if (craftableTimes(ch, ch.task, remaining - held) > 0) {
    const tile = nearest("workshop", recipe.skill, ch);
    if (!tile) throw new Error(`no ${recipe.skill} workshop on the map`);
    ctx.note(`task: craft ${itemName(ch.task)}`);
    await runStep(name, ch, { kind: "craft", code: ch.task, quantity: remaining - held, skill: recipe.skill, level: 0, at: tile }, ctx);
    return false;
  }
  // Bag jammed with nothing craftable — deliver what's done, or dump the junk.
  if (held > 0) return handOver(name, ch, it, ctx);
  await bankOff(name, keepOf(it, ch), ctx.note);
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
    // Off the map (an event monster that isn't up) ⇒ fall back to another monster with the drop.
    return mon?.drops.some((d) => d.code === code) && nearest("monster", mon.code, ch) ? { how: "fight", mon } : undefined;
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
    if (freeSpace(ch) === 0) { await bankOff(name, ctx.keep, ctx.note); return "acted"; }
    const bank = nearestBank(ch);
    if (!bank) return "dead";
    await runStep(name, ch, { kind: "withdraw", code, quantity: Math.min(need, banked, freeSpace(ch)), at: bank }, ctx);
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
      const t = nearest("workshop", r.skill, ch);
      if (!t) return "dead";
      ctx.note(`offering: craft ${itemName(code)}`);
      await runStep(name, ch, { kind: "craft", code, quantity: need, skill: r.skill, level: 0, at: t }, ctx);
      return "acted";
    }
    if (depth <= 0) return "dead";
    const short = r.items.find((g) => invQty(ch, g.code) < g.quantity * runs)!;
    return obtainOffering(name, ch, short.code, short.quantity * runs - invQty(ch, short.code), ctx, undefined, depth - 1, true);
  }
  const have = invQty(ch, code);
  if (src.how === "gather") {
    const tile = nearest("resource", src.res.code, ch);
    if (!tile) return "dead";
    const desired = desiredForJob(name, ch, { kind: "gather", skill: src.res.skill });
    if (desired && (await gearSwapStep(name, ch, desired, ctx)) === "acted") return "acted";
    ctx.note(`offering: gather ${itemName(code)} ${have}/${have + need}`);
    await runStep(name, ch, { kind: "gather", code, quantity: need, resource: src.res.code, level: 0, at: tile }, ctx);
    return "acted";
  }
  const tile = nearest("monster", src.mon.code, ch);
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

/** Dry run of obtainOffering — same sources, no actions — so an offering is only accepted when it can be completed. */
export function canObtainOffering(ch: Character, code: string, need: number, favor: OfferingFavor | undefined, depth: number, useBank: boolean): boolean {
  if (need <= 0 || (useBank && bankQty(code) >= need)) return true;
  const src = favorSource(ch, code, favor) ?? fieldSource(ch, code);
  if (!src) return false;
  if (src.how === "gather") return !!nearest("resource", src.res.code, ch);
  if (src.how === "fight") return !!nearest("monster", src.mon.code, ch) && canBeat(ch, src.mon.code);
  const r = src.recipe;
  const runs = Math.ceil(need / Math.max(1, r.quantity));
  return !!nearest("workshop", r.skill, ch) && r.items.every((g) => {
    const short = g.quantity * runs - invQty(ch, g.code);
    return short <= 0 || (depth > 0 && canObtainOffering(ch, g.code, short, undefined, depth - 1, true));
  });
}

/**
 * The bracket to accept in a category: the character's own, else the next
 * lower one, first that canObtainOffering clears (the reward is a % of the
 * character's current level either way). Undefined ⇒ nothing completable.
 */
export function offeringPick(ch: Character, st: CharacterOfferings, category: string): SeasonalOffering | undefined {
  const lv = categoryLevel(ch, category);
  return st.offerings
    .filter((o) => o.category === category && o.level_min <= lv)
    .sort((a, b) => b.level_min - a.level_min)
    .find((o) => canObtainOffering(ch, o.requirement.code, o.requirement.quantity - invQty(ch, o.requirement.code), o.favor, 2, o.favor?.target_type !== "craft"));
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
    let id = next.id!;
    if (!ready) {
      const req = next.requirement!;
      const pick = offeringPick(ch, st, next.category);
      if (!pick) return skipCategory(next.category, `can't get ${req.quantity}× ${itemName(req.code)} or any lower bracket's item — not accepting it`);
      if (pick.id !== id) ctx.note(`${next.category}: can't get ${req.quantity}× ${itemName(req.code)} — taking the ${pick.level_min}–${pick.level_max} bracket (${pick.requirement.quantity}× ${itemName(pick.requirement.code)})`);
      id = pick.id;
    }
    const altar = nearest("seasonal_altar", null, ch);
    if (!altar) return skipItem(name, it, "no seasonal altar on the map");
    if (!isAt(ch, altar)) { ctx.note("→ seasonal altar"); await moveTo(name, altar); return false; }
    ctx.note(`${ready ? "complete" : "accept"} the ${next.category} offering`);
    try {
      await step(name, () => (ready ? actions.completeOffering(name, id) : actions.acceptOffering(name, id)));
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

// 486 "an action is already in progress": the server is still working on this
// character's previous call (seen on the retry after a 500). It means "wait,
// then look again", not "this item is broken" — but only so many times in a
// row, so a state that is really stuck still pauses.
const BUSY_RETRIES = 6;
const BUSY_WAIT_S = 5;

// The codes ≥ 500 that docs/api/openapi.json defines are the game's answers
// (598 "… not found on this map", 595 no path, 596 blocked, 574–577 offerings,
// 550–573 skins/gems/events/subscriptions): the ordinary error path. Anything
// else ≥ 500 (500 "Fatal error", 502, 503 …) and code 0 (transport) is an outage.
const GAME_CODES = new Set([550, 551, 552, 560, 561, 562, 563, 564, 565, 566, 567, 570, 571, 572, 573, 574, 575, 576, 577, 595, 596, 598]);
const isOutage = (e: unknown): boolean => e instanceof ApiError && (e.code === 0 || (e.code >= 500 && !GAME_CODES.has(e.code)));

/** The note of an outage hold — the planner does not count its time as the step's running seconds. */
export const OUTAGE_NOTE = "network trouble — waiting";

async function runLoop(name: string): Promise<void> {
  if (liveLoops.has(name)) return; // never two loops per character
  liveLoops.add(name);
  let busy = 0; // 486 answers in a row
  let lost: string | undefined; // the item whose last action answered 598
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
        // No route to the item's place (a pinned x, y on a layer this character cannot reach): skipped like a vanished target.
        // 598 "… not found on this map" at action time is a vanished target too (an event tile gone between the look
        // and the action): the item runs once more and picks its tile again; a second 598 in a row skips it.
        let vanished = false;
        const done = await runItem(name, ch, item).catch((e) => {
          if (e instanceof NoRouteError) return skipItem(name, item, e.message);
          if (!(e instanceof ApiError) || e.code !== 598) return Promise.reject(e);
          vanished = true;
          if (lost === item.id) return skipItem(name, item, `${e.message} — twice in a row (code 598)`);
          lost = item.id;
          log(name, `${queueItemText(item)}: ${e.message} (code 598) — looking again`, "info");
          return false;
        });
        if (!vanished) lost = undefined;
        busy = 0;
        if (done) {
          const cur = queues.value[name];
          if (cur?.items[0]?.id === item.id) {
            const rest = cur.items.slice(1);
            // 🔁 wipes progress; done/from/geared/bought don't exist on every kind, hence the double cast.
            const again = { ...item, done: 0, from: undefined, geared: undefined, bought: undefined, error: undefined } as unknown as QueueItem;
            // A finished `prepare` stops the queue: the character holds on the boss tile for the group fight.
            const ready = item.kind === "prepare";
            // An event trip (ev:* ids, state/eventorders.ts) is one-off — 🔁 never brings it back.
            const recycle = cur.repeat && !ready && !item.id.startsWith("ev:");
            setQueue(name, { items: recycle ? [...rest, again] : rest, note: undefined, ...(ready ? { running: false } : {}) });
            if (ready) log(name, `ready to fight ${monsterOf(item.monster)?.name ?? item.monster} — queue stopped`, "ok");
          }
          S(name).losses = 0;
        }
      } catch (e) {
        if (isInventoryFull(e)) {
          try { await bankOff(name, keepOf(item, ch), (t) => setQueue(name, { note: t })); continue; } catch { /* fall through to pause */ }
        }
        // Transient transport trouble (code 0: fetch kept failing / 429 storm
        // exhausted its retries) or a server-side outage (e.g. 500 "Fatal
        // error (Get User)"): never pause — hold a minute and try again, so a
        // blip doesn't strand the character. ⏹ stays responsive.
        if (isOutage(e)) {
          log(name, `network trouble — retrying in 60s (${(e as Error).message})`, "bad");
          setQueue(name, { note: OUTAGE_NOTE });
          for (let i = 0; i < 60 && !stopFlags.has(name); i++) await sleep(1000);
          continue;
        }
        const stillBusy = e instanceof ApiError && e.code === 486;
        if (stillBusy && ++busy <= BUSY_RETRIES) {
          setQueue(name, { note: "action in progress — waiting" });
          for (let i = 0; i < BUSY_WAIT_S && !stopFlags.has(name); i++) await sleep(1000);
          continue;
        }
        const msg = stillBusy ? `${(e as Error).message} (code 486, ${BUSY_RETRIES} retries)` : e instanceof ApiError ? `${e.message} (code ${e.code})` : (e as Error).message;
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
  if (refused(name)) return;
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
  if (refused(name)) return;
  const ch = characters.value[name];
  for (const skill of skillPins.value[name] ?? []) {
    // Combat resets into the set vs today's pick; the train item re-swaps if the pick moves.
    const mon = skill === "combat" && ch ? trainingMonsterFor(ch)?.code : undefined;
    const job: GearJob = skill === "combat" ? (mon ? { kind: "fight", monster: mon } : { kind: "none" }) : isCraftSkill(skill) ? { kind: "craft", skill } : { kind: "gather", skill };
    addItem(name, withId({ kind: "gear", job, reset: true }));
    addItem(name, withId({ kind: "train", skill, toLevel: 0, levels: 1, gear: true }));
  }
  setRepeat(name, true);
}

/** Every OTHER character helps `crafter` train its workshop `skill` forever,
 *  starting now: a "help" train item at the FRONT of each queue (stop → insert
 *  → start, so a running loop switches heads after its in-flight action; the
 *  old items wait behind the infinite helper until the user removes it). */
export function queueAssist(crafter: string, skill: string): void {
  if (!IS_SERVER) return rpc("queueAssist", [crafter, skill]);
  if (refused(crafter)) return;
  // Helpers end where the crafter's own train item ends (a "to Lv N" target), else never.
  const own = queues.value[crafter]?.items.find((i) => i.kind === "train" && i.skill === skill && !i.for);
  // A "+N levels" item that hasn't started yet has no `from`: count from the crafter's level now, not 0.
  const lv = characters.value[crafter] ? skillLevel(characters.value[crafter], skill) : 0;
  const toLevel = own?.kind === "train" ? (own.levels ? (own.from ?? lv) + own.levels : own.toLevel) : 0;
  for (const name of Object.keys(characters.value)) {
    if (name === crafter || isOwned(name)) continue; // a character the planner owns is nobody's helper
    stopQueue(name);
    addItem(name, withId({ kind: "train", skill, toLevel, gear: true, for: crafter }), 0);
    startQueue(name);
  }
}

/** Start executing the queue from its head. */
export function startQueue(name: string): void {
  if (!IS_SERVER) return rpc("startQueue", [name]);
  if (!refused(name)) runQueue(name);
}

/** startQueue without the owned-queue guard: the planner's own start (state/planner.ts). Not exposed. */
export function runQueue(name: string): void {
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
  if (!refused(name)) haltQueue(name);
}

/** stopQueue without the owned-queue guard: the planner's take-over and hand-back. Not exposed. */
export function haltQueue(name: string): void {
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
  scheduleOfferings();
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

// Daily offerings: at 00:05 UTC (just after the midnight-UTC rotation — expires_at) every running
// queue does today's seasonal offerings first, then its old head resumes. A boot
// after 00:05 catches up once (the marker persists the last 00:05 handled).
// A character the planner owns gets the planner's `offering` interrupt instead (set by state/planner.ts, which
// queue.ts must not import); since task 010 the planner keeps its own day per character and catches up by itself
// (boot, switch-on, its five-minute tick), so this marker only decides the call at 00:05 and at boot.
const OFFERINGS_DAILY_KEY = "ammo:v1:offeringsDaily";
let offeringsTimer: ReturnType<typeof setTimeout> | undefined;
let ownedOfferings: ((name: string) => void) | undefined;
export const setOwnedOfferings = (fn: (name: string) => void): void => void (ownedOfferings = fn);
function scheduleOfferings(): void {
  clearTimeout(offeringsTimer);
  const now = Date.now();
  const d = new Date(now);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 5);
  const last = today <= now ? today : today - 86_400_000; // the most recent 00:05 UTC
  if (localStorage.getItem(OFFERINGS_DAILY_KEY) !== String(last)) {
    localStorage.setItem(OFFERINGS_DAILY_KEY, String(last));
    for (const name of Object.keys(characters.value)) if (isOwned(name)) ownedOfferings?.(name);
    for (const [name, q] of Object.entries(queues.value)) {
      if (isOwned(name) || !q.running || q.items[0]?.kind === "offering") continue;
      queueOfferings(name);
      log(name, "daily seasonal offerings — then back to the queue", "info");
    }
  }
  offeringsTimer = setTimeout(scheduleOfferings, last + 86_400_000 - now);
}

/** Today's offerings AHEAD of the head, even a running ∞ one (the loop re-reads it every step); a 🔁-recycled copy further back goes.
 *  A character the planner owns gets the planner's offering interrupt instead (task 010: the panel's buttons). */
export function queueOfferings(name: string): void {
  if (!IS_SERVER) return rpc("queueOfferings", [name]);
  if (isOwned(name)) return void ownedOfferings?.(name);
  if (refused(name)) return;
  const q = queues.value[name];
  if (!q) return addItem(name, withId({ kind: "offering" }));
  if (q.items[0]?.kind === "offering") return;
  setQueue(name, { items: [withId({ kind: "offering" }), ...q.items.filter((it) => it.kind !== "offering")] });
}

// Dev-only: this module owns long-lived async runners. A hot swap would
// re-create the module state (queues signal, stopFlags, liveLoops) while the
// OLD runLoop kept executing against the old objects — a zombie runner the ⏹
// button can no longer reach. Force a full page reload instead.
if (import.meta.hot) import.meta.hot.accept(() => location.reload());

expose({ addItem, removeItem, updateItem, moveItem, clearQueue, setRepeat, queuePinTraining, queueAssist, queueOfferings, startQueue, stopQueue });
