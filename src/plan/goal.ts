// Goal compiler — turn a user-picked Goal into a Plan (recommended bank gear +
// an execution spec + a human summary). Pure and offline: nothing here runs an
// action. Gear is ONLY ever the best set available in the bank right now —
// nothing is crafted or acquired for it.
//
// Three goals, two runners:
//   beat-monster  → the QUEUE: [bank reset + fight gear, fight ∞]
//   train-craft   → the campaign's train tick (re-picks the recipe as it levels)
//   complete-task → the campaign's task phase machine, one task then done

import { monster as monsterOf } from "../catalog";
import { bestInSlot } from "./bis";
import { compileTaskPlan, ownedCodes } from "./task";
import { compileTrainCraft } from "./traincraft";
import type { Character } from "../types/api";
import type { AcquisitionPlan, Goal, Plan } from "./types";

const NO_STEPS: AcquisitionPlan = { steps: [], estActions: 0, estSeconds: 0, feasible: false, blockers: [] };

export function compileGoal(ch: Character, bank: { code: string; quantity: number }[], goal: Goal): Plan {
  if (goal.kind === "beat-monster") {
    const m = monsterOf(goal.monster);
    // Bank-only, no utilities: exactly what the reset + swap will actually wear.
    const gear = m ? bestInSlot(ch, goal.monster, { owned: ownedCodes(ch, bank), includeCraftable: false, noUtilities: true })[0] : undefined;
    if (!m || !gear) {
      return {
        goal,
        acquisition: { ...NO_STEPS, blockers: [`No winnable gear set vs ${m?.name ?? goal.monster} in the bank.`] },
        execution: { targets: [], monster: goal.monster, repeat: 0 },
        summary: `Can't beat ${m?.name ?? goal.monster} with what the bank holds.`,
      };
    }
    const f = gear.forecast;
    return {
      goal,
      gear,
      acquisition: { ...NO_STEPS, feasible: true },
      execution: { targets: [], monster: goal.monster, repeat: 0 }, // repeat 0 = ∞, queue-run
      summary:
        `Beat ${m.name} (Lv ${m.level}) until stopped: ${gear.safe ? "safe win" : "risky win"}, ` +
        `~${f.turns} turns, −${Math.round(f.hpLostPct * 100)}% HP/fight — bank gear only.`,
    };
  }

  // Craft-skill training: craft → recycle batches until the target level,
  // re-picking the best in-window recipe as the level rises (traincraft.ts).
  if (goal.kind === "train-craft") {
    return compileTrainCraft(ch, bank, goal);
  }

  // The current task, one-shot (accepts one at the master when none is active).
  return compileTaskPlan(ch, bank, { master: goal.master, goal });
}
