// farm-tasks goals — task-loops on the best-suited characters. Task coins buy
// the rare crafting crystals at the Tasks Trader, and every turn-in advances
// the Tasks Farmer achievement (100 tasks) that unlocks the trader's tile —
// so "remove the gate" is a scoring lens here, not a separate goal kind.
// Also home of the idle filler every other compiler uses: a character with
// nothing to do this wave runs one task — always useful, roughly wave-sized.

import { catalog } from "../../catalog";
import { fleetBis, skillLevel } from "./ctx";
import { SCORE, estMinutes, perHour } from "./score";
import type { Character } from "../../types/api";
import type { AccountGoal, HiveCtx, HivePlan, HiveWave, ScoredGoal } from "./types";

/** Rough actions to finish one task (travel + fights/gathers + turn-in). */
const ACTIONS_PER_TASK = 40;
const DEFAULT_TIMES = 3;
/** A master suits a character when they can handle this share of its pool. */
const OK_SHARE = 0.8;

export interface TaskSuitability {
  master: "monsters" | "items";
  okShare: number;
}

/**
 * Which tasks master suits this character: monsters iff they safely beat ≥80%
 * of the level-appropriate monster-task pool, items iff their gathering/craft
 * skills cover ≥80% of the item-task pool. Monsters win ties (fights also feed
 * combat XP and kill achievements). undefined = neither is a good fit.
 */
export function taskSuitability(ctx: HiveCtx, ch: Character): TaskSuitability | undefined {
  let monsterOk = 0;
  let monsterAll = 0;
  let itemOk = 0;
  let itemAll = 0;
  for (const t of catalog().tasks.values()) {
    if (t.level > ch.level) continue;
    if (t.type === "monsters") {
      monsterAll++;
      if (fleetBis(ctx, ch, t.code)?.safe) monsterOk++;
    } else if (t.type === "items") {
      itemAll++;
      if (!t.skill || skillLevel(ch, t.skill) >= t.level) itemOk++;
    }
  }
  const monsters = monsterAll ? monsterOk / monsterAll : 0;
  const items = itemAll ? itemOk / itemAll : 0;
  if (monsters >= OK_SHARE && monsters >= items) return { master: "monsters", okShare: monsters };
  if (items >= OK_SHARE) return { master: "items", okShare: items };
  return undefined;
}

/** Tasks Farmer progress (done/total) — the trader-gate lens. null = unknown. */
function gateProgress(ctx: HiveCtx): { done: number; total: number; complete: boolean } | null {
  const a = ctx.achievements?.find((x) => x.code === "tasks_farmer");
  if (!a) return null;
  const o = a.objectives[0];
  return { done: Math.min(o?.progress ?? 0, o?.total ?? 100), total: o?.total ?? 100, complete: !!a.completed_at };
}

export function proposeTaskGoals(ctx: HiveCtx): ScoredGoal[] {
  const perCharacter: { character: string; master: "monsters" | "items"; times: number }[] = [];
  for (const ch of ctx.characters) {
    const fit = taskSuitability(ctx, ch);
    if (fit) perCharacter.push({ character: ch.name, master: fit.master, times: DEFAULT_TIMES });
  }
  if (perCharacter.length === 0) return [];

  const totalTasks = perCharacter.reduce((s, p) => s + p.times, 0);
  const coins = totalTasks * (2.5 + SCORE.TASK_BONUS_COINS);
  const gate = gateProgress(ctx);
  const gateValue = gate && !gate.complete ? SCORE.GATE_PROGRESS * totalTasks : 0;
  const estActions = totalTasks * ACTIONS_PER_TASK;
  // Tasks paid per character in parallel — wall-clock is the slowest lane.
  const wallActions = Math.max(...perCharacter.map((p) => p.times * ACTIONS_PER_TASK));
  const goal: AccountGoal = { kind: "farm-tasks", perCharacter };
  return [
    {
      goal,
      label: `Farm ${totalTasks} tasks (${perCharacter.length} characters)`,
      score: perHour(coins * SCORE.TASK_COIN + gateValue, wallActions),
      rationale:
        `~${Math.round(coins)} task coins across ${perCharacter.length} characters` +
        (gate && !gate.complete ? ` — and advances Tasks Farmer ${gate.done}/${gate.total}` : ""),
      blockers: [],
      estActions,
      estMinutes: estMinutes(wallActions),
    },
  ];
}

export function compileTaskGoal(goal: Extract<AccountGoal, { kind: "farm-tasks" }>, ctx: HiveCtx): HivePlan {
  const assignments = goal.perCharacter
    .filter((p) => ctx.characters.some((c) => c.name === p.character))
    .map((p) => ({
      character: p.character,
      label: `complete ${p.times}× ${p.master} tasks`,
      items: [{ kind: "task-loop" as const, master: p.master, times: p.times, done: 0, gear: true }],
    }));
  const total = goal.perCharacter.reduce((s, p) => s + p.times, 0);
  return {
    goal,
    waves: assignments.length ? [{ label: `Farm ${total} tasks`, assignments }] : [],
    summary: `${total} task turn-ins across ${assignments.length} characters`,
    blockers: assignments.length ? [] : [{ reason: "no assigned character is participating" }],
    once: true, // bounded batch: the wave completing IS the goal completing
  };
}

/**
 * Give every participant absent from wave 0 one filler task — always useful
 * (coins + gate progress), roughly wave-sized, self-contained. Characters with
 * no suitable master stay genuinely idle. Mutates and returns `waves`.
 */
export function fillIdle(waves: HiveWave[], ctx: HiveCtx): HiveWave[] {
  const first = waves[0];
  if (!first) return waves;
  const busy = new Set(first.assignments.filter((a) => a.items.length > 0).map((a) => a.character));
  for (const ch of ctx.characters) {
    if (busy.has(ch.name)) continue;
    const fit = taskSuitability(ctx, ch);
    if (!fit) continue;
    first.assignments.push({
      character: ch.name,
      label: "filler: one task",
      items: [{ kind: "task-loop", master: fit.master, times: 1, done: 0, gear: true }],
    });
  }
  return waves;
}
