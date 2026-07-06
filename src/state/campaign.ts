// The campaign runner: the self-healing phase machines behind two of the three
// goals (the third — beat-monster — runs from the queue), reload-safe.
//
//   "task"        — the current Tasks Master task, ONE-SHOT: accept one if
//                   none → full bank reset + wear the bank's best set → stock
//                   banked food → execute (fight with food-first healing /
//                   gather-and-deliver) → turn in → done.
//   "train-craft" — level a crafting skill: full bank reset, then craft →
//                   recycle batches of the best in-window recipe, re-picking
//                   the recipe every tick as the level rises.
//
// Every job STARTS with the full bank reset (deposit everything incl. worn
// gear and gold, then wear only what the job needs from the bank — see
// plan/jobgear.ts reset mode). Gear is never crafted or acquired; the resolver
// only sources consumables, materials and task deliverables. Both modes
// re-derive their steps from live inventory/bank each tick (so a reload/crash
// resumes from wherever it left off); fights are gated by a fresh forecast
// each time — it refuses to enter a fight that is no longer a win.
//
// Mutually exclusive with the queue. Same no-poll contract: every decision
// below reads only action echoes and the locally-maintained bank signal —
// zero GETs.

import { effect, signal } from "@preact/signals";
import * as actions from "../api/actions";
import { item, itemName, monster as monsterOf, resource } from "../catalog";
import { resolve } from "../plan/acquire";
import { compileTaskPlan } from "../plan/task";
import { RESET_UTILITY_STRIP, stripAllMap } from "../plan/jobgear";
import { forcedTrainPick, trainingRecipe } from "../plan/traincraft";
import { titleCase } from "../lib/util";
import { bankItems, characters, pushLog } from "./store";
import { queueActive } from "./queue";
import { bankQty, isInventoryFull, moveTo, nearest, nearestBank, sleep, step } from "./loopkit";
import { bankOff, craftableTimes, desiredForJob, fightRound, freeSpace, gearSwapStep, goToMaster, invQty, runStep } from "./exec";
import type { StepCtx } from "./exec";
import type { AcquisitionStep, FoodSpec, Plan, Target } from "../plan/types";
import type { Character, GearSlot } from "../types/api";
import type { Monster } from "../types/catalog";

export type CampaignPhase =
  | "accept" | "prep" | "execute" | "deliver" | "turn-in" // task mode
  | "train"; // train-craft mode (single phase — the note narrates)

export interface CampaignJob {
  label: string; // human summary of the goal
  mode: "task" | "train-craft";
  targets: Target[]; // frozen consumable/deliverable targets (never gear)
  monster?: string; // combat target, if the goal ends in fighting
  repeat: number; // fights to perform
  done: number; // fights performed (task mode reads task_progress instead)
  phase: CampaignPhase;
  note: string; // short human status shown on the card
  /** One-time full bank reset done for this job (deposit everything, wear the
   *  bank set). Persisted so a reload never re-strips mid-run. */
  resetDone?: boolean;
  // train-craft extras — without `recipe` the pick is re-derived every tick so
  // it upgrades as the level rises; `recipe` = user-pinned recipe code.
  skill?: string;
  skillTarget?: number;
  recipe?: string;
  // task extras
  master?: "monsters" | "items"; // which Tasks Master to accept from when idle
  food?: FoodSpec; // eat this before resting
  keep?: string[]; // never auto-deposited when banking off overflow
  planKey?: string; // the ch.task the frozen targets were compiled for
  restock?: boolean; // a consumable top-up round is in progress (see liveTargets)
  gearPlan?: Partial<Record<GearSlot, string>>; // desired job gear ("" = strip to bank)
}

const TASK_PHASES: CampaignPhase[] = ["accept", "prep", "execute", "deliver", "turn-in"];

const STORE_KEY = "ammo:v1:campaign";
function loadStored(): Record<string, CampaignJob> {
  try {
    const raw = (JSON.parse(localStorage.getItem(STORE_KEY) || "{}") as Record<string, CampaignJob>) || {};
    const out: Record<string, CampaignJob> = {};
    for (const [name, job] of Object.entries(raw)) {
      if (!job || typeof job !== "object") continue;
      // Unknown shape — drop, never crash resume. Jobs from before the
      // bank-reset rework (modes "goal"/"task-loop") drop here too.
      if (job.mode === "task" && TASK_PHASES.includes(job.phase)) out[name] = job;
      else if (job.mode === "train-craft" && job.phase === "train") out[name] = job;
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
  pushLog({ ts: Date.now(), character: name, action: "campaign", text, kind });
  clearJob(name);
}

/** The StepCtx a campaign job hands to the shared exec primitives. */
function ctxOf(name: string, job?: CampaignJob): StepCtx {
  return { keep: job?.keep, food: job?.food, note: (text) => setJob(name, { note: text }) };
}

/**
 * The next step to run — usually steps[0], with two readiness overrides that
 * break re-derivation stalls:
 *  - before a farm fight, cook/craft anything already possible (crafts are
 *    emitted after farms);
 *  - when a withdraw has no inventory room, craft from materials in hand first
 *    (crafting shrinks the load; blindly depositing would return the very
 *    materials just withdrawn to the bank, forever).
 */
function pickStep(ch: Character, steps: AcquisitionStep[]): AcquisitionStep {
  const first = steps[0];
  if (first.kind === "farm" || (first.kind === "withdraw" && freeSpace(ch) === 0)) {
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

/**
 * The one-time full bank reset every job starts with: deposit everything
 * (inventory + gold + worn gear incl. utilities), then wear `desired` from the
 * bank. Returns true while still converging (one action ran); flips the
 * persisted flag once done so restock rounds and reloads never re-strip.
 */
async function resetOnce(name: string, ch: Character, job: CampaignJob, desired?: Partial<Record<GearSlot, string>>): Promise<boolean> {
  if (job.resetDone) return false;
  const total = { ...(desired ?? stripAllMap()), ...RESET_UTILITY_STRIP };
  if ((await gearSwapStep(name, ch, total, ctxOf(name, job), { reset: true })) === "acted") return true;
  setJob(name, { resetDone: true });
  return false;
}

// ── Train-craft mode ────────────────────────────────────────────────────────

const skillLevelOf = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

/**
 * One tick of the craft-skill trainer: produce a batch of the best in-window
 * recipe (gather → withdraw → craft via the shared resolver), recycle the
 * output back into materials at the workshop, repeat until the target level.
 * Everything is re-derived from live state — the recipe upgrades itself as the
 * level rises, and a reload resumes mid-batch. Non-recyclable output (cooked
 * food) is banked as fleet stock instead of recycled.
 */
async function trainTick(name: string, ch: Character, job: CampaignJob, _S: { losses: number }): Promise<boolean> {
  const skill = job.skill!;
  const target = job.skillTarget ?? 0;
  const lvl = skillLevelOf(ch, skill);
  if (lvl >= target) { finish(name, `campaign complete — ${titleCase(skill)} Lv ${lvl}`, "ok"); return true; }

  try {
    // Job start: full bank reset (total strip — the first gather leg re-equips
    // the gathering set from the bank right after).
    if (await resetOnce(name, ch, job)) return false;

    const choice = job.recipe
      ? forcedTrainPick(ch, bankItems.value, skill, job.recipe)
      : { pick: trainingRecipe(ch, bankItems.value, skill) };
    const pick = choice.pick;
    if (!pick) {
      finish(name, `campaign stopped — ${choice.blocker ?? `no craftable ${titleCase(skill)} recipe within the XP window (stock materials or level the gathering skill)`}`, "bad");
      return true;
    }
    const code = pick.recipe.code;
    const ingredients = pick.recipe.craft!.items.map((i) => i.code);
    // Materials and output survive overflow bank-offs; junk (loot) gets stowed.
    const keep = [...ingredients, code];
    if ((job.keep ?? []).join() !== keep.join()) setJob(name, { keep });

    // 1. Recycle held training output back into materials. Any same-skill
    //    recyclable craft in the bag counts (leftovers from a lower tier too) —
    //    EXCEPT codes the current recipe consumes as ingredients (e.g. the
    //    skeleton_armor inside royal_skeleton_armor).
    const recycleCode = (ch.inventory ?? []).find((s) => {
      if (!s.code || s.quantity <= 0 || ingredients.includes(s.code)) return false;
      const it = item(s.code);
      return it?.craft?.skill === skill && it.recyclable !== false;
    })?.code;
    if (recycleCode) {
      const tile = nearest("workshop", skill, ch.x, ch.y);
      if (!tile) { finish(name, `campaign stopped — no ${skill} workshop on the map`, "bad"); return true; }
      if (ch.x !== tile.x || ch.y !== tile.y) { setJob(name, { note: "→ workshop to recycle" }); await moveTo(name, tile.x, tile.y); return false; }
      const qty = invQty(ch, recycleCode);
      setJob(name, { note: `Lv ${lvl}/${target} · recycle ${qty}× ${itemName(recycleCode)}` });
      await step(name, () => actions.recycle(name, recycleCode, qty));
      return false;
    }

    // 2. Non-recyclable output (cooking): bank the finished batch as fleet stock.
    if (pick.recipe.recyclable === false && invQty(ch, code) >= pick.batch) {
      await bankOff(name, ch.x, ch.y, ingredients, (t) => setJob(name, { note: t }));
      return false;
    }

    // 3. Produce the next batch — one resolver step per tick.
    if (pick.acq.steps.length === 0) return false; // transient (echo lag) — re-derive next tick
    setJob(name, { note: `Lv ${lvl}/${target} · ${itemName(code)} ×${pick.batch}` });
    const next = pickStep(ch, pick.acq.steps);

    // Wear the gathering set (tool cooldown + prospecting) before a gather leg.
    // Converged swaps cost nothing per tick and the gear persists across
    // batches, so this is ~one swap per material type for the whole run. Craft
    // and bank legs keep whatever is on — a wisdom swap around the single craft
    // action per batch would cost more requests than it earns.
    if (next.kind === "gather" || next.kind === "train") {
      const gatherSkill = next.kind === "train" ? next.skill : resource(next.resource)?.skill;
      const desired = gatherSkill ? desiredForJob(name, ch, { kind: "gather", skill: gatherSkill }) : undefined;
      if (desired && (await gearSwapStep(name, ch, desired, ctxOf(name, job))) === "acted") return false;
    }

    await runStep(name, ch, next, ctxOf(name, job));
    return false;
  } catch (e) {
    if (isInventoryFull(e)) {
      try { await bankOff(name, ch.x, ch.y, job.keep, ctxOf(name, job).note); } catch { /* next tick */ }
      return false;
    }
    finish(name, `campaign stopped — ${(e as Error).message}`, "bad");
    return true;
  }
}

// ── Task mode (one task, one-shot) ──────────────────────────────────────────

/**
 * Recompile the plan for the character's *current* task and freeze it into the
 * job. Synchronous (BIS passes, sub-second) — runs between actions, which is
 * where the loop idles on cooldowns anyway.
 */
function recompile(name: string, ch: Character, job: CampaignJob): boolean {
  const plan = compileTaskPlan(ch, bankItems.value, { master: job.master });
  if (plan.acquisition.blockers.length) {
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
    gearPlan: plan.execution.gearPlan,
    planKey: ch.task,
    label: plan.summary,
    phase: "prep",
    restock: true, // initial stocking round
    note: "planned",
  });
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
 * Live copies of the frozen targets. Food refills only when the stack runs
 * OUT (or during the job's restock round) — topping up to full on every prep
 * entry would cost a bank round-trip per fight. The deliverable tracks the
 * remaining task count, one inventory-sized batch at a time.
 */
function liveTargets(ch: Character, job: CampaignJob): Target[] {
  const remaining = Math.max(0, ch.task_total - ch.task_progress);
  return job.targets.flatMap((t): Target[] => {
    const role = t.role ?? (job.food && t.code === job.food.code ? "food" : t.code === ch.task ? "deliver" : undefined);
    if (role === "food" && job.food) {
      if (!job.restock && invQty(ch, t.code) > 0) return []; // refill on empty only
      const want = job.monster ? Math.ceil(job.food.perFight * Math.max(1, remaining)) : t.quantity;
      // Bank-only: eat what exists, then heal by rest (never block on food).
      const qty = Math.min(want, Math.max(1, Math.floor(ch.inventory_max_items / 3)), invQty(ch, t.code) + bankQty(t.code));
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
  // Job start: the full bank reset — deposit EVERYTHING (inventory, gold, worn
  // gear incl. utilities), then wear the job's bank set. Runs exactly once per
  // job (persisted flag), so restock rounds never re-strip.
  if (await resetOnce(name, ch, job, job.gearPlan)) return false;
  job = campaignJobs.value[name] ?? job;

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

  // Keep the job's gear set on (bank pieces worn, replaced gear stowed) — a
  // converged swap costs nothing per tick, and this is what picks up better
  // gear another character banked mid-run.
  if (job.gearPlan) {
    if ((await gearSwapStep(name, ch, job.gearPlan, ctxOf(name, job))) === "acted") return false;
  }

  const acq = resolve(ch, bankItems.value, liveTargets(ch, job), { train: true });
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

  // Re-stock hysteresis: refill only when the food actually runs OUT (not
  // merely below full) — otherwise every fight would cost a bank trip.
  if (job.food && remaining > 2 && invQty(ch, job.food.code) === 0) {
    setJob(name, { phase: "prep", restock: true, note: "restocking food" });
    return false;
  }
  // Bank-gear self-heal: when something better landed in the bank, detour and
  // swap (memoized per bank reference — free when nothing changed).
  const desired = desiredForJob(name, ch, { kind: "fight", monster: job.monster });
  if (desired && (await gearSwapStep(name, ch, desired, ctxOf(name, job))) === "acted") return false;

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

async function turnInPhase(name: string, ch: Character): Promise<boolean> {
  const type = ch.task_type === "items" ? "items" : "monsters";
  const at = await goToMaster(name, ch, type, (t) => setJob(name, { note: t }));
  if (at === "missing") { finish(name, "campaign stopped — no tasks master on the map", "bad"); return true; }
  if (at === "moving") return false;
  setJob(name, { note: "turning in the task" });
  await step(name, () => actions.taskComplete(name)); // inventory-full bubbles up → bankOff (unprotected) → retried next tick
  finish(name, "task complete — rewards collected", "ok"); // one-shot: one task per campaign
  return true;
}

async function taskTick(name: string, ch: Character, job: CampaignJob, S: { losses: number }): Promise<boolean> {
  try {
    // Self-heal against any drift (reload, manual task actions): a live task
    // the frozen plan wasn't compiled for → recompile; no task mid-flow →
    // done (one-shot — the turn-in path normally finishes before this).
    if (ch.task && job.planKey !== ch.task && job.phase !== "accept") return recompile(name, ch, job);
    if (!ch.task && job.phase !== "accept") {
      finish(name, "campaign stopped — no active task", "bad");
      return true;
    }

    switch (job.phase) {
      case "accept": return await acceptPhase(name, ch, job);
      case "prep": return await prepPhase(name, ch, job);
      case "execute": return await executePhase(name, ch, job, S);
      case "deliver": return await deliverPhase(name, ch);
      case "turn-in": return await turnInPhase(name, ch);
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
      const stopped = job.mode === "task" ? await taskTick(name, ch, job, S) : await trainTick(name, ch, job, S);
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
  if (queueActive(name)) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "stop the queue first", kind: "bad" });
    return;
  }
  const ch = characters.value[name];
  if (!ch) return;
  if (plan.acquisition.blockers.length) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: `can't start — ${plan.acquisition.blockers[0]}`, kind: "bad" });
    return;
  }
  const isTask = plan.execution.mode === "task";
  const isTrain = plan.execution.mode === "train-craft";
  if (!isTask && !isTrain) {
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "this goal runs from the queue, not the campaign", kind: "bad" });
    return;
  }

  stopFlags.delete(name);
  campaignJobs.value = {
    ...campaignJobs.value,
    [name]: {
      label: plan.summary,
      mode: isTask ? "task" : "train-craft",
      targets: plan.execution.targets,
      monster: plan.execution.monster,
      repeat: plan.execution.repeat,
      done: isTask ? ch.task_progress : 0,
      phase: isTask ? (ch.task ? "prep" : "accept") : "train",
      note: "starting…",
      resetDone: false, // every job starts with the full bank reset
      ...(isTrain && { skill: plan.execution.skill, skillTarget: plan.execution.skillTarget, recipe: plan.execution.recipe }),
      ...(isTask && {
        master: plan.execution.master,
        food: plan.execution.food,
        keep: plan.execution.keep,
        gearPlan: plan.execution.gearPlan,
        planKey: ch.task || undefined,
        restock: true, // initial stocking round
      }),
    },
  };
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
    if (characters.value[name] && !queueActive(name)) {
      kept[name] = job;
      stopFlags.delete(name);
    } else {
      dropped = true;
    }
  }
  if (dropped) campaignJobs.value = kept;
  for (const name of Object.keys(kept)) {
    // Task drift (task changed/finished while the tab was closed) is
    // handled by taskTick's planKey / no-task checks on the first tick.
    pushLog({ ts: Date.now(), character: name, action: "campaign", text: "resumed after reload", kind: "info" });
    void runLoop(name);
  }
}
