// Automation cycle #4 — the campaign runner: drive a character toward a goal
// (gather → craft → equip → fight) end-to-end, reload-safe.
//
// Two modes share the loop machinery:
//   "goal"      — FINITE: a frozen gear target + optional monster grind
//                 (phases acquiring → fighting), unchanged from before.
//   "task-loop" — the Tasks Master cycle: accept a task if none → prepare
//                 (gear, cooked food, brewed potions, gathering tool — training
//                 a small skill gap by gathering when needed) → execute (fight
//                 with food-first healing / gather-and-deliver) → turn in →
//                 accept the next one, until stopped or blocked.
//
// Both are self-healing by *re-deriving* acquisition steps from live
// inventory/bank each tick (so a reload/crash resumes from wherever it left
// off); the task loop additionally *re-plans* whenever the character's task
// changes (which is what picks up gear another character later banked). Fights
// are gated by a fresh forecast each time — it refuses to enter a fight that is
// no longer a win.
//
// Mutually exclusive with the other three loops. Same no-poll contract: every
// decision below reads only action echoes and the locally-maintained bank
// signal — zero GETs.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { item, itemName, monster as monsterOf } from "../catalog";
import { currentFighter } from "../sim/stats";
import { simulate } from "../sim/combat";
import { resolve } from "../plan/acquire";
import { NEEDS_IN_BANK_MSG, compileTaskPlan, utilityStackSize } from "../plan/task";
import { bankItems, characters, pushLog } from "./store";
import { gatherJobs } from "./gather";
import { bankQty, refineJobs } from "./refine";
import { fightJobs } from "./fight";
import { queueActive } from "./queue";
import { isInventoryFull, moveTo, nearest, nearestBank, sleep, step } from "./loopkit";
import { bankOff, craftableTimes, fightRound, freeSpace, gearSwapStep, goToMaster, invQty, runStep } from "./exec";
import { slotCode, slotQuantity } from "../types/api";
import type { StepCtx } from "./exec";
import type { AcquisitionStep, FoodSpec, Plan, Target } from "../plan/types";
import type { Character, GearSlot } from "../types/api";
import type { Monster } from "../types/catalog";

export type CampaignPhase =
  | "acquiring" | "fighting" // goal mode
  | "accept" | "prep" | "execute" | "deliver" | "turn-in"; // task-loop mode

export interface CampaignJob {
  label: string; // human summary of the goal
  mode: "goal" | "task-loop";
  targets: Target[]; // frozen gear/item targets to obtain + equip
  monster?: string; // combat target, if the goal ends in fighting
  repeat: number; // fights to perform
  done: number; // fights performed (goal mode; task mode reads task_progress)
  phase: CampaignPhase;
  note: string; // short human status shown on the card
  // task-loop extras
  loop?: boolean; // accept the next task after turn-in
  master?: "monsters" | "items"; // which Tasks Master to accept from when idle
  food?: FoodSpec; // eat this before resting
  keep?: string[]; // never auto-deposited when banking off overflow
  needsInBank?: string[]; // report: gear another character must provide
  tasksDone?: number;
  planKey?: string; // the ch.task the frozen targets were compiled for
  restock?: boolean; // a consumable top-up round is in progress (see liveTargets)
  gearPlan?: Partial<Record<GearSlot, string>>; // desired job gear ("" = strip to bank)
}

const UTILITY_SLOTS: GearSlot[] = ["utility1", "utility2"];
const GOAL_PHASES: CampaignPhase[] = ["acquiring", "fighting"];
const TASK_PHASES: CampaignPhase[] = ["accept", "prep", "execute", "deliver", "turn-in"];

const STORE_KEY = "ammo:v1:campaign";
function loadStored(): Record<string, CampaignJob> {
  try {
    const raw = (JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<string, CampaignJob>) || {};
    const out: Record<string, CampaignJob> = {};
    for (const [name, job] of Object.entries(raw)) {
      if (!job || typeof job !== "object") continue;
      const mode = job.mode ?? "goal"; // jobs saved before task-loop existed
      if (!(mode === "goal" ? GOAL_PHASES : TASK_PHASES).includes(job.phase)) continue; // unknown shape — drop, never crash resume
      out[name] = { ...job, mode };
    }
    return out;
  } catch {
    return {};
  }
}

/** Active campaigns, keyed by character name. Presence ⇒ the loop is running. */
export const campaignJobs = signal<Record<string, CampaignJob>>(loadStored());
const stopFlags = new Set<string>();

effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(campaignJobs.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

function setJob(name: string, patch: Partial<CampaignJob>): void {
  const cur = campaignJobs.value[name];
  if (!cur) return;
  campaignJobs.value = { ...campaignJobs.value, [name]: { ...cur, ...patch } };
}
function clearJob(name: string): void {
  const { [name]: _gone, ...rest } = campaignJobs.value;
  campaignJobs.value = rest;
}
function finish(name: string, text: string, kind: "ok" | "bad" | "info" = "info"): void {
  const job = campaignJobs.value[name];
  const report = kind === "bad" && job?.needsInBank?.length ? ` — ${NEEDS_IN_BANK_MSG(job.needsInBank)}` : "";
  pushLog({ ts: Date.now(), character: name, action: "campaign", text: text + report, kind });
  clearJob(name);
}

/** The StepCtx a campaign job hands to the shared exec primitives. */
function ctxOf(name: string, job?: CampaignJob): StepCtx {
  return { keep: job?.keep, food: job?.food, note: (text) => setJob(name, { note: text }) };
}

/**
 * The next step to run — usually steps[0], with two readiness overrides that
 * break re-derivation stalls:
 *  - before a farm fight, equip anything already in hand and cook/craft
 *    anything already possible (the forecast gate must see the prepared gear,
 *    and crafts are emitted after farms);
 *  - when a withdraw has no inventory room, craft from materials in hand first
 *    (crafting shrinks the load; blindly depositing would return the very
 *    materials just withdrawn to the bank, forever).
 */
function pickStep(ch: Character, steps: AcquisitionStep[]): AcquisitionStep {
  const first = steps[0];
  if (first.kind === "farm") {
    const equip = steps.find((s) => s.kind === "equip" && invQty(ch, s.code) > 0);
    if (equip) return equip;
    const craft = steps.find((s) => s.kind === "craft" && craftableTimes(ch, s.code, s.quantity) > 0);
    if (craft) return craft;
  }
  if (first.kind === "withdraw" && freeSpace(ch) === 0) {
    const craft = steps.find((s) => s.kind === "craft" && craftableTimes(ch, s.code, s.quantity) > 0);
    if (craft) return craft;
  }
  return first;
}

/**
 * One fightRound via the shared exec primitive, with the terminal outcomes
 * mapped back to campaign behavior: "no-win"/"gave-up" finish the campaign
 * ("stopped"), a single loss logs the retry line.
 */
async function campaignFightRound(
  name: string,
  ch: Character,
  job: CampaignJob,
  m: Monster,
  tile: { x: number; y: number },
  S: { losses: number },
): Promise<"stopped" | "acted" | "won" | "lost"> {
  const out = await fightRound(name, ch, m, tile, S, ctxOf(name, job));
  if (out === "no-win") { finish(name, `campaign stopped — no longer a safe win vs ${m.name}`, "bad"); return "stopped"; }
  if (out === "gave-up") { finish(name, "campaign stopped — lost 2 fights in a row", "bad"); return "stopped"; }
  if (out === "lost") pushLog({ ts: Date.now(), character: name, action: "campaign", text: "lost a fight — healing and retrying", kind: "bad" });
  return out;
}

// ── Goal mode (unchanged behavior) ──────────────────────────────────────────

async function goalTick(name: string, ch: Character, job: CampaignJob, S: { losses: number }): Promise<boolean> {
  // Combat phase: grind the target monster with the (now-equipped) gear.
  if (job.phase === "fighting") {
    if (!job.monster || job.done >= job.repeat) { finish(name, `campaign complete — ${job.done} win${job.done === 1 ? "" : "s"}`, "ok"); return true; }
    const m = monsterOf(job.monster);
    const tile = m ? nearest("monster", job.monster, ch.x, ch.y) : undefined;
    if (!m || !tile) { finish(name, `campaign stopped — no ${job.monster} on the map`, "bad"); return true; }

    setJob(name, { note: `fighting ${job.done + 1}/${job.repeat}` });
    try {
      const out = await campaignFightRound(name, ch, job, m, tile, S);
      if (out === "stopped") return true;
      if (out === "won") setJob(name, { done: (campaignJobs.value[name]?.done ?? job.done) + 1 }); // count wins toward the target
    } catch (e) {
      if (isInventoryFull(e)) { try { await bankOff(name, tile.x, tile.y, job.keep, ctxOf(name, job).note); } catch { /* handled next */ } return false; }
      finish(name, `campaign stopped — fight failed: ${(e as Error).message}`, "bad");
      return true;
    }
    return false;
  }

  // Acquisition phase: re-derive steps from live state and do the next one.
  const acq = resolve(ch, bankItems.value, job.targets);
  if (acq.blockers.length) { finish(name, `campaign stopped — blocked: ${acq.blockers[0]}`, "bad"); return true; }
  if (acq.steps.length === 0) {
    if (job.monster) { setJob(name, { phase: "fighting", note: "gear ready → fighting" }); return false; }
    finish(name, "campaign complete — items acquired & equipped", "ok"); return true;
  }
  try {
    await runStep(name, ch, pickStep(ch, acq.steps), ctxOf(name, job));
  } catch (e) {
    if (isInventoryFull(e)) { try { await bankOff(name, ch.x, ch.y, job.keep, ctxOf(name, job).note); } catch { /* next tick */ } return false; }
    finish(name, `campaign stopped — ${(e as Error).message}`, "bad"); return true;
  }
  return false;
}

// ── Task-loop mode ──────────────────────────────────────────────────────────

/**
 * Recompile the plan for the character's *current* task and freeze it into the
 * job. Synchronous (BIS passes, sub-second) — runs between actions, which is
 * where the loop idles on cooldowns anyway.
 */
function recompile(name: string, ch: Character, job: CampaignJob): boolean {
  const plan = compileTaskPlan(ch, bankItems.value, { master: job.master, loop: job.loop ?? true });
  if (plan.acquisition.blockers.length) {
    setJob(name, { needsInBank: plan.needsInBank });
    finish(name, `campaign stopped — blocked: ${plan.acquisition.blockers[0]}`, "bad");
    return true;
  }
  setJob(name, {
    targets: plan.execution.targets,
    monster: plan.execution.monster,
    repeat: plan.execution.repeat,
    done: ch.task_progress,
    food: plan.execution.food,
    keep: plan.execution.keep,
    needsInBank: plan.needsInBank,
    gearPlan: plan.execution.gearPlan,
    planKey: ch.task,
    label: plan.summary,
    phase: "prep",
    restock: true, // initial stocking round
    note: "planned",
  });
  if (plan.needsInBank?.length) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: NEEDS_IN_BANK_MSG(plan.needsInBank), kind: "info" });
  }
  return false;
}

/**
 * One production round of the task deliverable: enough that a full gather →
 * craft → deliver cycle fits the inventory, counting the LEAF raw materials a
 * craft chain ultimately consumes. Task totals (up to 400) routinely exceed
 * the bag — the loop runs several rounds.
 */
function leafRawCost(code: string, depth = 0): number {
  const recipe = item(code)?.craft;
  if (!recipe || depth >= 6) return 1;
  let per = 0;
  for (const ing of recipe.items) per += ing.quantity * leafRawCost(ing.code, depth + 1);
  return per / Math.max(1, recipe.quantity);
}
function deliverableBatch(ch: Character, code: string): number {
  return Math.max(1, Math.floor((ch.inventory_max_items * 0.5) / Math.max(1, leafRawCost(code))));
}

/**
 * Live copies of the frozen targets. Consumables refill only when a stack runs
 * OUT (or during the job's restock round) — topping up to full on every prep
 * entry would cost a workshop round-trip per fight. The deliverable tracks the
 * remaining task count, one inventory-sized batch at a time.
 */
function liveTargets(ch: Character, job: CampaignJob): Target[] {
  const remaining = Math.max(0, ch.task_total - ch.task_progress);
  return job.targets.flatMap((t): Target[] => {
    if (t.slot?.startsWith("utility")) {
      // A stack in EITHER utility slot counts — resolve() normalizes slots the
      // same way, and disagreeing with it spins the phase machine.
      const stocked = UTILITY_SLOTS.some((u) => slotCode(ch, u) === t.code && slotQuantity(ch, u) > 0);
      if (stocked && !job.restock) return [];
      return [{ ...t, quantity: utilityStackSize(remaining, ch.inventory_max_items) }];
    }
    const role = t.role ?? (job.food && !t.slot && t.code === job.food.code ? "food" : !t.slot && t.code === ch.task ? "deliver" : "gear");
    if (role === "food" && job.food) {
      if (!job.restock && invQty(ch, t.code) > 0) return []; // refill on empty only
      const want = job.monster ? Math.ceil(job.food.perFight * Math.max(1, remaining)) : t.quantity;
      let qty = Math.min(want, Math.max(1, Math.floor(ch.inventory_max_items / 3)));
      // Can't cook more — eat what exists, then heal by rest (never block on it).
      if (!job.food.producible) qty = Math.min(qty, invQty(ch, t.code) + bankQty(t.code));
      return qty > 0 ? [{ ...t, quantity: qty }] : [];
    }
    if (role === "deliver") {
      const qty = Math.min(remaining, deliverableBatch(ch, t.code));
      return qty > 0 ? [{ ...t, quantity: qty }] : [];
    }
    return [t];
  });
}

async function acceptPhase(name: string, ch: Character, job: CampaignJob): Promise<boolean> {
  if (ch.task) return recompile(name, ch, job); // already have one (e.g. resumed)
  const at = await goToMaster(name, ch, job.master ?? "monsters", ctxOf(name, job).note);
  if (at === "missing") { finish(name, "campaign stopped — no tasks master on the map", "bad"); return true; }
  if (at === "moving") return false;
  setJob(name, { note: "accepting a task" });
  await step(name, () => actions.taskNew(name));
  return false; // the echo sets ch.task → planKey mismatch → recompile next tick
}

async function prepPhase(name: string, ch: Character, job: CampaignJob): Promise<boolean> {
  const remaining = Math.max(0, ch.task_total - ch.task_progress);
  const isItems = ch.task_type === "items";

  if (isItems) {
    if (remaining <= 0) { setJob(name, { phase: "turn-in", restock: false, note: "task complete → turn in" }); return false; }
    const held = invQty(ch, ch.task);
    // Deliver early: enough in hand to finish, the inventory is choking, or the
    // bank already stocks the deliverable — existing stock is traded to the
    // master (bag-sized piece by piece) BEFORE producing anything new.
    if (held >= remaining || (held > 0 && freeSpace(ch) === 0) || (bankQty(ch.task) > 0 && (held > 0 || freeSpace(ch) > 0)))
      { setJob(name, { phase: "deliver", note: "delivering" }); return false; }
  }

  // A consumed food stack starts a top-up round here too — farm-path items
  // tasks fight inside prep and have no execute phase to notice it.
  if (job.food && !job.restock && invQty(ch, job.food.code) === 0) {
    setJob(name, { restock: true });
    job = campaignJobs.value[name] ?? job;
  }

  // Swap to the job's gear set first (bank pieces worn, replaced gear stowed) —
  // resolve() below then skips the already-worn targets and only plans the
  // craft/farm remainder. Converged swaps cost nothing per tick.
  if (job.gearPlan) {
    if ((await gearSwapStep(name, ch, job.gearPlan, ctxOf(name, job))) === "acted") return false;
  }

  const acq = resolve(ch, bankItems.value, liveTargets(ch, job), { train: true, topUp: true });
  if (acq.blockers.length) { finish(name, `campaign stopped — blocked: ${acq.blockers[0]}`, "bad"); return true; }
  if (acq.steps.length === 0) {
    if (job.monster) { setJob(name, { phase: "execute", restock: false, note: "prepared → fighting" }); return false; }
    if (isItems) { setJob(name, { phase: "deliver", restock: false, note: "delivering" }); return false; }
    setJob(name, { phase: "turn-in", restock: false, note: "→ turn in" });
    return false;
  }
  await runStep(name, ch, pickStep(ch, acq.steps), ctxOf(name, job));
  return false;
}

async function executePhase(name: string, ch: Character, job: CampaignJob, S: { losses: number }): Promise<boolean> {
  const remaining = Math.max(0, ch.task_total - ch.task_progress);
  if (remaining <= 0) { setJob(name, { phase: "turn-in", note: "task complete → turn in" }); return false; }
  if (!job.monster) { setJob(name, { phase: "prep", note: "planning" }); return false; }

  const m = monsterOf(job.monster);
  const tile = m ? nearest("monster", job.monster, ch.x, ch.y) : undefined;
  if (!m || !tile) { finish(name, `campaign stopped — no ${job.monster} on the map`, "bad"); return true; }

  // Re-stock hysteresis: refill only when a consumable actually runs OUT (not
  // merely below full) — otherwise every fight would cost a workshop trip.
  if (job.food && remaining > 2 && invQty(ch, job.food.code) === 0) {
    setJob(name, { phase: "prep", restock: true, note: "restocking food" });
    return false;
  }
  // Potions: restock only when the fight no longer wins WITHOUT them — near
  // the finish line it's usually faster to fight on bare than to brew again.
  const utilityEmpty = job.targets.some(
    (t) => t.slot?.startsWith("utility") && !UTILITY_SLOTS.some((u) => slotCode(ch, u) === t.code && slotQuantity(ch, u) > 0),
  );
  if (utilityEmpty && !simulate(currentFighter(ch), m).win) {
    setJob(name, { phase: "prep", restock: true, note: "restocking potions" });
    return false;
  }

  setJob(name, { note: `fighting ${ch.task_progress + 1}/${ch.task_total}` });
  const out = await campaignFightRound(name, ch, job, m, tile, S); // errors bubble to taskTick's catch
  return out === "stopped";
}

async function deliverPhase(name: string, ch: Character): Promise<boolean> {
  const remaining = Math.max(0, ch.task_total - ch.task_progress);
  if (remaining <= 0) { setJob(name, { phase: "turn-in", note: "→ turn in" }); return false; }

  const held = invQty(ch, ch.task);
  if (held > 0) {
    const at = await goToMaster(name, ch, "items", (t) => setJob(name, { note: t }));
    if (at === "missing") { finish(name, "campaign stopped — no items tasks master on the map", "bad"); return true; }
    if (at === "moving") return false;
    setJob(name, { note: `deliver ${itemName(ch.task)}` });
    await step(name, () => actions.taskTrade(name, ch.task, Math.min(held, remaining)));
    return false;
  }

  // Nothing in hand — pull banked stock in inventory-sized chunks, else produce more.
  const banked = bankQty(ch.task);
  if (banked > 0 && freeSpace(ch) > 0) {
    const bank = nearestBank(ch.x, ch.y);
    if (bank) {
      if (ch.x !== bank.x || ch.y !== bank.y) { setJob(name, { note: "→ bank" }); await moveTo(name, bank.x, bank.y); return false; }
      setJob(name, { note: `withdraw ${itemName(ch.task)}` });
      await step(name, () => actions.withdrawItems(name, [{ code: ch.task, quantity: Math.min(banked, remaining, freeSpace(ch)) }]));
      return false;
    }
  }
  setJob(name, { phase: "prep", note: "producing more" });
  return false;
}

async function turnInPhase(name: string, ch: Character, job: CampaignJob): Promise<boolean> {
  const type = ch.task_type === "items" ? "items" : "monsters";
  const at = await goToMaster(name, ch, type, (t) => setJob(name, { note: t }));
  if (at === "missing") { finish(name, "campaign stopped — no tasks master on the map", "bad"); return true; }
  if (at === "moving") return false;
  setJob(name, { note: "turning in the task" });
  await step(name, () => actions.taskComplete(name)); // inventory-full bubbles up → bankOff (unprotected) → retried next tick
  const tasksDone = (campaignJobs.value[name]?.tasksDone ?? 0) + 1;
  if (!(job.loop ?? true)) {
    setJob(name, { tasksDone });
    finish(name, "task complete — rewards collected", "ok");
    return true;
  }
  setJob(name, { tasksDone, phase: "accept", done: 0, planKey: undefined, needsInBank: undefined, note: "next task…" });
  pushLog({ ts: Date.now(), character: name, action: "campaign", text: `task ${tasksDone} complete — accepting the next one`, kind: "ok" });
  return false;
}

async function taskTick(name: string, ch: Character, job: CampaignJob, S: { losses: number }): Promise<boolean> {
  try {
    // Self-heal against any drift (reload, manual task actions, turn-in): a live
    // task the frozen plan wasn't compiled for → recompile; no task mid-flow →
    // back to accept.
    if (ch.task && job.planKey !== ch.task && job.phase !== "accept") return recompile(name, ch, job);
    if (!ch.task && job.phase !== "accept") {
      if (job.loop ?? true) { setJob(name, { phase: "accept", planKey: undefined, note: "no task — accepting" }); return false; }
      finish(name, "campaign stopped — no active task", "bad");
      return true;
    }

    switch (job.phase) {
      case "accept": return await acceptPhase(name, ch, job);
      case "prep": return await prepPhase(name, ch, job);
      case "execute": return await executePhase(name, ch, job, S);
      case "deliver": return await deliverPhase(name, ch);
      case "turn-in": return await turnInPhase(name, ch, job);
      default: return false;
    }
  } catch (e) {
    if (isInventoryFull(e)) {
      // Turn-in rewards just need ANY room — protected stock is spent by then.
      try { await bankOff(name, ch.x, ch.y, job.phase === "turn-in" ? undefined : job.keep, ctxOf(name, job).note); } catch { /* next tick */ }
      return false;
    }
    finish(name, `campaign stopped — ${(e as Error).message}`, "bad");
    return true;
  }
}

async function runLoop(name: string): Promise<void> {
  const S = { losses: 0 };
  try {
    while (!stopFlags.has(name)) {
      // Yield to the event loop every tick: no phase-machine cycle, however
      // buggy, may ever spin the tab synchronously.
      await sleep(50);
      const job = campaignJobs.value[name];
      const ch = characters.value[name];
      if (!job || !ch) break;
      const stopped = job.mode === "task-loop" ? await taskTick(name, ch, job, S) : await goalTick(name, ch, job, S);
      if (stopped) break;
    }
  } finally {
    stopFlags.delete(name);
    // A tick that reaches a natural end calls finish() → clearJob() itself; if
    // the job is still here the loop exited via the stop flag (manual ⏹) — clear
    // it so the UI drops the "stopping…" spinner instead of hanging on it.
    if (campaignJobs.value[name]) {
      pushLog({ ts: Date.now(), character: name, action: "campaign", text: "campaign stopped", kind: "info" });
      clearJob(name);
    }
  }
}

/** Start a campaign for `name` from a compiled plan. */
export function startCampaign(name: string, plan: Plan): void {
  if (campaignJobs.value[name]) return;
  if (gatherJobs.value[name] || refineJobs.value[name] || fightJobs.value[name] || queueActive(name)) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "stop the other loop first", kind: "bad" });
    return;
  }
  const ch = characters.value[name];
  if (!ch) return;
  if (plan.acquisition.blockers.length) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: `can't start — ${plan.acquisition.blockers[0]}`, kind: "bad" });
    return;
  }
  const isTask = plan.execution.mode === "task-loop";
  if (!isTask && plan.execution.targets.length === 0 && !plan.execution.monster) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "nothing to do for this goal", kind: "bad" });
    return;
  }

  stopFlags.delete(name);
  campaignJobs.value = {
    ...campaignJobs.value,
    [name]: {
      label: plan.summary,
      mode: isTask ? "task-loop" : "goal",
      targets: plan.execution.targets,
      monster: plan.execution.monster,
      repeat: plan.execution.repeat,
      done: isTask ? ch.task_progress : 0,
      phase: isTask ? (ch.task ? "prep" : "accept") : "acquiring",
      note: "starting…",
      ...(isTask && {
        loop: plan.execution.loop ?? true,
        master: plan.execution.master,
        food: plan.execution.food,
        keep: plan.execution.keep,
        needsInBank: plan.needsInBank,
        gearPlan: plan.execution.gearPlan,
        tasksDone: 0,
        planKey: ch.task || undefined,
        restock: true, // initial stocking round
      }),
    },
  };
  if (isTask && plan.needsInBank?.length) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: NEEDS_IN_BANK_MSG(plan.needsInBank), kind: "info" });
  }
  pushLog({ ts: Date.now(), character: name, action: "campaign", text: `campaign started: ${plan.summary}`, kind: "info" });
  void runLoop(name);
}

/** Ask the campaign to stop after the current action completes. */
export function stopCampaign(name: string): void {
  if (!campaignJobs.value[name]) return;
  stopFlags.add(name);
  setJob(name, { note: "stopping…" });
}

/** Re-launch campaigns restored from localStorage after the boot sync. */
export function resumeCampaign(): void {
  const kept: Record<string, CampaignJob> = {};
  let dropped = false;
  for (const [name, job] of Object.entries(campaignJobs.value)) {
    if (characters.value[name] && !gatherJobs.value[name] && !refineJobs.value[name] && !fightJobs.value[name] && !queueActive(name)) {
      kept[name] = job;
      stopFlags.delete(name);
    } else {
      dropped = true;
    }
  }
  if (dropped) campaignJobs.value = kept;
  for (const name of Object.keys(kept)) {
    // Task-loop drift (task changed/finished while the tab was closed) is
    // handled by taskTick's planKey / no-task checks on the first tick.
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "resumed after reload", kind: "info" });
    void runLoop(name);
  }
}
