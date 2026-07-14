// craft-order goals — a user-directed production run: "make me N of X".
// The fleet gathers/produces the materials in parallel (acquireWaves splits by
// skill and forecast, chains smelts into the gatherers' own queues) and the
// qualified crafter — the pinned specialist first — finishes the job behind a
// bank barrier. Never auto-proposed; created from the Hive drawer's order
// builder. Satisfied when the fleet OWNS the ordered quantities, so already-
// stocked pieces aren't re-crafted and barrier recompiles top up shortfalls.

import { itemName } from "../../catalog";
import { acquireWaves, planAcquire } from "./acquire";
import { fleetOwned } from "./ctx";
import type { AccountGoal, HiveCtx, HivePlan } from "./types";

type CraftOrder = Extract<AccountGoal, { kind: "craft-order" }>;

export function compileOrderGoal(goal: CraftOrder, ctx: HiveCtx): HivePlan {
  const { ownedQty } = fleetOwned(ctx);
  const targets = goal.targets
    .map((t) => ({ code: t.code, quantity: t.quantity - (ownedQty.get(t.code) ?? 0) }))
    .filter((t) => t.quantity > 0);
  const what = goal.targets.map((t) => `${t.quantity}× ${itemName(t.code)}`).join(", ");
  if (targets.length === 0) {
    return { goal, waves: [], summary: `${what} — already owned`, blockers: [] };
  }
  const plan = planAcquire(targets, ctx);
  const waves = acquireWaves(plan, ctx);
  return { goal, waves, summary: `produce ${what}`, blockers: plan.blockers };
}

export function orderSatisfied(goal: CraftOrder, ctx: HiveCtx): boolean {
  const { ownedQty } = fleetOwned(ctx);
  return goal.targets.every((t) => (ownedQty.get(t.code) ?? 0) >= t.quantity);
}
