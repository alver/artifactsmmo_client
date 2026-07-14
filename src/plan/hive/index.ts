// The Hive planning domain — public API. Pure functions over a HiveCtx
// snapshot; the runtime (state/hive.ts) owns all signals, persistence and
// dispatch. See types.ts for the full contract (recompile-at-barrier, no
// infinite items, JSON-only goals).

import { compileAchievementGoal, proposeAchievementGoals } from "./achievements";
import { skillLevel } from "./ctx";
import { compileGearGoal, gearGoalSatisfied, proposeGearGoals } from "./gear";
import { compileOrderGoal, orderSatisfied } from "./order";
import { compileSkillGoal, promoteBlockers } from "./skills";
import { compileTaskGoal, proposeTaskGoals } from "./tasks";
import type { AccountGoal, HiveCtx, HivePlan, ScoredGoal } from "./types";

export type { AccountGoal, Blocker, HiveAssignment, HiveCtx, HivePlan, HiveWave, ScoredGoal } from "./types";
export { fillerItems } from "./tasks";

/** Enumerate + score candidate account goals, best first. Blocked goals are
 *  discounted and their prerequisites promoted to standalone goals that carry
 *  the parent's undiscounted score — so "level Weaponcrafting to 10" outranks
 *  the gear goal it unlocks. */
export function proposeGoals(ctx: HiveCtx): ScoredGoal[] {
  const goals = [...proposeGearGoals(ctx), ...proposeTaskGoals(ctx), ...proposeAchievementGoals(ctx)];
  const promoted = promoteBlockers(ctx, goals);
  return [...goals, ...promoted].sort((a, b) => b.score - a.score);
}

/** Compile a goal against the CURRENT ctx. Always returns a plan — possibly
 *  with empty waves and blockers explaining why. */
export function compileGoal(goal: AccountGoal, ctx: HiveCtx): HivePlan {
  switch (goal.kind) {
    case "gear-upgrade":
      return compileGearGoal(goal, ctx);
    case "craft-order":
      return compileOrderGoal(goal, ctx);
    case "farm-tasks":
      return compileTaskGoal(goal, ctx);
    case "achievement":
      return compileAchievementGoal(goal, ctx);
    case "level-skill":
      return compileSkillGoal(goal, ctx);
  }
}

/** Pure verification. "unknown" = needs achievements and they aren't loaded.
 *  farm-tasks is a bounded batch — its plan carries `once`, and the runtime
 *  finishes it when the dispatched waves complete (this returns false). */
export function goalSatisfied(goal: AccountGoal, ctx: HiveCtx): boolean | "unknown" {
  switch (goal.kind) {
    case "gear-upgrade":
      return gearGoalSatisfied(goal, ctx);
    case "craft-order":
      return orderSatisfied(goal, ctx);
    case "farm-tasks":
      return false;
    case "achievement": {
      if (!ctx.achievements) return "unknown";
      return !!ctx.achievements.find((a) => a.code === goal.code)?.completed_at;
    }
    case "level-skill": {
      const ch = ctx.characters.find((c) => c.name === goal.character);
      return ch ? skillLevel(ch, goal.skill) >= goal.toLevel : false;
    }
  }
}

/** Should the runtime spend a read refreshing achievements at this goal's
 *  wave boundaries? */
export const needsAchievements = (goal: AccountGoal): boolean => goal.kind === "achievement";
