// level-skill goals — always PROMOTED from blockers of higher-value goals
// ("iron sword needs Weaponcrafting 10, Bob has 6"), never proposed on their
// own. Gathering skills compile to the legacy `train` item (self-terminates at
// the level echo); craft skills compile to bounded craft(+recycle) batches
// whose recipe re-picks itself at every barrier recompile as the level rises —
// the old traincraft loop, expressed as recompiles instead of a phase machine.

import { catalog, item, itemName } from "../../catalog";
import { titleCase } from "../../lib/util";
import { acquireWaves, planAcquire } from "./acquire";
import { GATHER_SKILLS, skillLevel } from "./ctx";
import { SCORE, estMinutes } from "./score";
import type { QueueItemInput } from "../queue";
import type { AccountGoal, HiveCtx, HivePlan, ScoredGoal } from "./types";

/** Max craft runs per batch — one barrier's worth of work. */
const BATCH_RUNS = 40;

/**
 * Best node to TRAIN a gathering skill on at the current level: the
 * highest-level node already gatherable (more level ≈ more XP); nodes 10+
 * levels below yield no XP and never qualify. (Rebuilt from the deleted
 * resolver's trainingResource.)
 */
export function trainingResourceFor(skill: string, atLevel: number): { code: string; level: number } | undefined {
  let best: { code: string; level: number } | undefined;
  for (const r of catalog().resources.values()) {
    if (r.skill !== skill || r.level > atLevel || r.level <= atLevel - 10) continue;
    if (!best || r.level > best.level) best = { code: r.code, level: r.level };
  }
  return best;
}

/**
 * Best recipe to train a CRAFT skill on right now: in-XP-window recipes
 * ([lvl−9 .. lvl], upper half preferred), tie-broken by cheapest acquirable
 * materials. Re-picked at every barrier as the level rises.
 */
export function trainingRecipeFor(ctx: HiveCtx, skill: string, atLevel: number): { code: string; matsPerRun: number } | undefined {
  let best: { code: string; matsPerRun: number; level: number; cost: number } | undefined;
  for (const it of catalog().items.values()) {
    if (!it.craft || it.craft.skill !== skill) continue;
    if (it.craft.level > atLevel || it.craft.level <= atLevel - 9) continue;
    const probe = planAcquire(
      it.craft.items.map((g) => ({ code: g.code, quantity: g.quantity })),
      ctx,
      { probe: true },
    );
    if (!probe.feasible) continue;
    const matsPerRun = it.craft.items.reduce((s, g) => s + g.quantity, 0);
    const upperHalf = it.craft.level > atLevel - 5 ? 1 : 0;
    const cost = probe.estActions + matsPerRun;
    if (
      !best ||
      upperHalf > (best.level > atLevel - 5 ? 1 : 0) ||
      (upperHalf === (best.level > atLevel - 5 ? 1 : 0) && cost < best.cost)
    ) {
      best = { code: it.code, matsPerRun, level: it.craft.level, cost };
    }
  }
  return best ? { code: best.code, matsPerRun: best.matsPerRun } : undefined;
}

/**
 * Turn the blockers of already-scored goals into standalone prerequisite
 * goals. A prerequisite inherits its parent's UNDISCOUNTED score (the parent
 * itself was blocked-discounted), so "level Weaponcrafting to 10" naturally
 * outranks the gear goal it unlocks. Deduped by target, best parent wins.
 */
export function promoteBlockers(ctx: HiveCtx, parents: ScoredGoal[]): ScoredGoal[] {
  const byKey = new Map<string, ScoredGoal>();
  for (const parent of parents) {
    for (const b of parent.blockers) {
      if (!b.suggest) continue;
      const goal = b.suggest;
      const key = goal.kind === "level-skill" ? `skill|${goal.skill}|${goal.character}` : goal.kind;
      const score = parent.score / SCORE.BLOCKED_DISCOUNT;
      const cur = byKey.get(key);
      if (cur && cur.score >= score && !(goal.kind === "level-skill" && cur.goal.kind === "level-skill" && goal.toLevel > cur.goal.toLevel)) continue;
      const toLevel = goal.kind === "level-skill" ? Math.max(goal.toLevel, cur?.goal.kind === "level-skill" ? cur.goal.toLevel : 0) : 0;
      const promoted: AccountGoal =
        goal.kind === "level-skill" ? { ...goal, toLevel, unlocks: parent.label } : goal;
      const estActions = goal.kind === "level-skill" ? trainEstActions(ctx, goal.skill, goal.character, toLevel) : 120;
      byKey.set(key, {
        goal: promoted,
        label:
          goal.kind === "level-skill"
            ? `Level ${titleCase(goal.skill)} to ${toLevel} (${goal.character})`
            : "Farm task coins",
        score: Math.max(score, cur?.score ?? 0),
        rationale: `unlocks: ${parent.label} — ${b.reason}`,
        blockers: [],
        estActions,
        estMinutes: estMinutes(estActions),
      });
    }
  }
  return [...byKey.values()];
}

/** Rough actions to close a skill gap (XP curves aren't in the catalog). */
const GATHERS_PER_LEVEL = 25;
function trainEstActions(ctx: HiveCtx, skill: string, character: string, toLevel: number): number {
  const ch = ctx.characters.find((c) => c.name === character);
  const gap = Math.max(1, toLevel - (ch ? skillLevel(ch, skill) : 0));
  return gap * GATHERS_PER_LEVEL;
}

export function compileSkillGoal(
  goal: Extract<AccountGoal, { kind: "level-skill" }>,
  ctx: HiveCtx,
): HivePlan {
  const ch = ctx.characters.find((c) => c.name === goal.character);
  const label = `Level ${titleCase(goal.skill)} to ${goal.toLevel}`;
  if (!ch) {
    return { goal, waves: [], summary: label, blockers: [{ reason: `${goal.character} is not participating` }] };
  }
  const have = skillLevel(ch, goal.skill);
  if (have >= goal.toLevel) return { goal, waves: [], summary: `${label} — already there`, blockers: [] };

  // Gathering skills: one character, one wave — gear up, then the train item
  // works the best node and self-terminates at the level echo.
  if ((GATHER_SKILLS as readonly string[]).includes(goal.skill)) {
    const node = trainingResourceFor(goal.skill, have);
    if (!node) {
      return { goal, waves: [], summary: label, blockers: [{ reason: `no gatherable ${titleCase(goal.skill)} node at Lv ${have}` }] };
    }
    const items: QueueItemInput[] = [
      { kind: "gear", job: { kind: "gather", skill: goal.skill }, reset: true },
      { kind: "train", skill: goal.skill, toLevel: goal.toLevel, resource: node.code },
      { kind: "deposit-all" },
    ];
    return {
      goal,
      waves: [{ label, assignments: [{ character: ch.name, label: `train ${titleCase(goal.skill)} → ${goal.toLevel}`, items }] }],
      summary: `${label} on ${itemName(node.code)}`,
      blockers: [],
    };
  }

  // Craft skills: bounded craft(+recycle) batches — material waves feed the
  // bank, the crafter consumes them, and the barrier recompile re-picks the
  // recipe as the level rises until goalSatisfied.
  const pick = trainingRecipeFor(ctx, goal.skill, have);
  if (!pick) {
    return { goal, waves: [], summary: label, blockers: [{ reason: `no feasible ${titleCase(goal.skill)} training recipe at Lv ${have}` }] };
  }
  const recipe = item(pick.code)!.craft!;
  const bag = Math.max(10, ch.inventory_max_items);
  const runs = Math.max(1, Math.min(BATCH_RUNS, Math.floor(bag / 2 / Math.max(1, pick.matsPerRun))));
  const plan = planAcquire(
    recipe.items.map((g) => ({ code: g.code, quantity: g.quantity * runs })),
    ctx,
  );
  const waves = acquireWaves(plan, ctx);
  const produced = runs * recipe.quantity;
  const crafterItems: QueueItemInput[] = [{ kind: "craft", code: pick.code, quantity: produced, done: 0 }];
  if (item(pick.code)?.recyclable) crafterItems.push({ kind: "recycle", code: pick.code, quantity: produced, done: 0 });
  crafterItems.push({ kind: "deposit-all" });
  waves.push({
    label: `Craft batch (${titleCase(goal.skill)} ${have} → ${goal.toLevel})`,
    assignments: [{ character: ch.name, label: `craft ${produced}× ${itemName(pick.code)}`, items: crafterItems }],
  });
  return {
    goal,
    waves,
    summary: `${label} — batches of ${produced}× ${itemName(pick.code)}`,
    blockers: plan.blockers,
  };
}
