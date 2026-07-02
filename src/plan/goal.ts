// Goal compiler — turn a user-picked Goal into a full Plan (recommended gear +
// how to acquire it + an execution spec + a human summary). Pure and offline:
// nothing here runs an action; the campaign runner executes the returned plan.

import { catalog, itemName, monster as monsterOf } from "../catalog";
import { titleCase } from "../lib/util";
import { bestInSlot } from "./bis";
import { resolve } from "./acquire";
import { GEAR_SLOTS } from "../types/api";
import type { Character, GearSlot } from "../types/api";
import type { AcquisitionPlan, Goal, Plan, Target } from "./types";

const NO_STEPS: AcquisitionPlan = { steps: [], estActions: 0, estSeconds: 0, feasible: false, blockers: [] };

/** Item codes the character can use right now: inventory ∪ bank ∪ equipped. */
export function ownedCodes(ch: Character, bank: { code: string; quantity: number }[]): Set<string> {
  const owned = new Set<string>();
  for (const s of ch.inventory ?? []) if (s.code) owned.add(s.code);
  for (const b of bank) owned.add(b.code);
  for (const g of GEAR_SLOTS) {
    const c = (ch as unknown as Record<string, string>)[`${g}_slot`];
    if (c) owned.add(c);
  }
  return owned;
}

/** Turn a BIS recommendation's slot map into acquisition targets (with equip slots). */
function gearTargets(slots: Record<GearSlot, string>, repeat: number): Target[] {
  const out: Target[] = [];
  for (const g of GEAR_SLOTS) {
    const code = slots[g];
    if (!code) continue;
    const qty = g.startsWith("utility") ? Math.min(100, Math.max(1, repeat)) : 1;
    out.push({ code, quantity: qty, slot: g });
  }
  return out;
}

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

  if (goal.kind === "complete-task") {
    if (!ch.task) {
      return { goal, acquisition: { ...NO_STEPS, blockers: ["No active task — accept one from a Tasks Master first."] }, execution: { targets: [], repeat: 0 }, summary: "No active task." };
    }
    const remaining = Math.max(1, ch.task_total - ch.task_progress);
    if (ch.task_type === "monsters") {
      const sub = compileGoal(ch, bank, { kind: "beat-monster", monster: ch.task, repeat: remaining });
      return { ...sub, goal, summary: `Task: defeat ${remaining}× ${titleCase(ch.task)} — ${sub.summary}` };
    }
    const sub = compileGoal(ch, bank, { kind: "craft-item", code: ch.task, quantity: remaining });
    return { ...sub, goal, summary: `Task: deliver ${remaining}× ${itemName(ch.task)} — ${sub.summary}` };
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
