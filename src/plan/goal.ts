// Goal compiler — turn a user-picked Goal into a full Plan (recommended gear +
// how to acquire it + an execution spec + a human summary). Pure and offline:
// nothing here runs an action; the campaign runner executes the returned plan.

import { catalog, itemName, monster as monsterOf } from "../catalog";
import { titleCase } from "../lib/util";
import { bestInSlot } from "./bis";
import { resolve } from "./acquire";
import { compileTaskPlan, gearTargets, ownedCodes } from "./task";
import { compileTrainCraft } from "./traincraft";
import type { Character } from "../types/api";
import type { AcquisitionPlan, Goal, Plan, Target } from "./types";

const NO_STEPS: AcquisitionPlan = { steps: [], estActions: 0, estSeconds: 0, feasible: false, blockers: [] };

export function compileGoal(ch: Character, bank: { code: string; quantity: number }[], goal: Goal): Plan {
  const owned = ownedCodes(ch, bank);

  if (goal.kind === "beat-monster") {
    const m = monsterOf(goal.monster);
    const repeat = goal.repeat ?? 1;
    const recs = bestInSlot(ch, goal.monster, { owned });
    if (!m || recs.length === 0) {
      return {
        goal,
        acquisition: { ...NO_STEPS, blockers: [`No feasible gear set found to beat ${m?.name ?? goal.monster} at your current level/skills.`] },
        execution: { targets: [], monster: goal.monster, repeat },
        summary: `Can't yet find gear to beat ${m?.name ?? goal.monster}.`,
      };
    }
    const gear = recs[0];
    const targets = gearTargets(gear.slots, repeat);
    const acquisition = resolve(ch, bank, targets);
    const f = gear.forecast;
    const summary =
      `Beat ${m.name} (Lv ${m.level}): ${gear.safe ? "safe win" : "risky win"}, ` +
      `~${f.turns} turns, −${Math.round(f.hpLostPct * 100)}% HP${repeat > 1 ? ` · ×${repeat}` : ""}.`;
    return { goal, gear, acquisition, execution: { targets, monster: goal.monster, repeat }, summary };
  }

  if (goal.kind === "craft-item") {
    const targets: Target[] = [{ code: goal.code, quantity: goal.quantity }];
    return { goal, acquisition: resolve(ch, bank, targets), execution: { targets, repeat: 0 }, summary: `Craft ${goal.quantity}× ${itemName(goal.code)}.` };
  }

  if (goal.kind === "combat-level") {
    // Pick the highest-level monster we can currently equip a *safe* win against —
    // more level ≈ more XP per fight (XP isn't in the static catalog).
    let best: { code: string; level: number } | undefined;
    try {
      for (const m of catalog().monsters.values()) {
        if (m.type !== "normal") continue; // skip bosses/events for a grind target
        const recs = bestInSlot(ch, m.code, { owned });
        if (recs[0]?.safe && (!best || m.level > best.level)) best = { code: m.code, level: m.level };
      }
    } catch { /* catalog not ready */ }
    if (!best) {
      return { goal, acquisition: { ...NO_STEPS, blockers: ["No monster is a safe win with your reachable gear yet — level a gathering/crafting skill to unlock better gear first."] }, execution: { targets: [], repeat: 0 }, summary: `Reach combat level ${goal.target}: no safe grind target yet.` };
    }
    const sub = compileGoal(ch, bank, { kind: "beat-monster", monster: best.code, repeat: 20 });
    return { ...sub, goal, summary: `Reach combat Lv ${goal.target}: grind ${itemName(best.code) || best.code} (Lv ${best.level}) — ${sub.summary}` };
  }

  // Craft-skill training: craft → recycle batches until the target level,
  // re-picking the best in-window recipe as the level rises (traincraft.ts).
  if (goal.kind === "train-craft") {
    return compileTrainCraft(ch, bank, goal);
  }

  // Task plans (single task or the accept→run→turn-in loop) get the full
  // preparation treatment — gear + food + potion + tool — in task.ts.
  if (goal.kind === "complete-task") {
    return compileTaskPlan(ch, bank, { loop: false, goal });
  }
  if (goal.kind === "task-loop") {
    return compileTaskPlan(ch, bank, { loop: true, master: goal.master, goal });
  }

  // skill-level: the existing gather/refine loops already do this best; the plan
  // panel points the user there rather than duplicating them.
  return {
    goal,
    acquisition: { ...NO_STEPS, blockers: [`Use the Gather / Refine controls to level ${titleCase((goal as { skill: string }).skill)} — dedicated loops already handle skill grinding.`] },
    execution: { targets: [], repeat: 0 },
    summary: `Level ${titleCase((goal as { skill: string }).skill)} to ${(goal as { target: number }).target}.`,
  };
}
