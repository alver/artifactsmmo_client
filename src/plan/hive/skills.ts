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
import { estMinutes, hoursOf, wallActions } from "./score";
import type { QueueItemInput } from "../queue";
import type { Character } from "../../types/api";
import type { AccountGoal, HiveCtx, HivePlan, ScoredGoal } from "./types";

/** Max craft runs per batch — one barrier's worth of work. */
const BATCH_RUNS = 40;

/** One craft-skill training batch at the current level: the in-window recipe,
 *  half-bag-sized runs, and the material plan that feeds it. */
function trainingBatch(ctx: HiveCtx, ch: Character, skill: string, have: number) {
  const pick = trainingRecipeFor(ctx, skill, have);
  if (!pick) return undefined;
  const recipe = item(pick.code)!.craft!;
  const bag = Math.max(10, ch.inventory_max_items);
  let runs = Math.max(1, Math.min(BATCH_RUNS, Math.floor(bag / 2 / Math.max(1, pick.matsPerRun))));
  const planFor = (n: number) => planAcquire(recipe.items.map((g) => ({ code: g.code, quantity: g.quantity * n })), ctx);
  let plan = planFor(runs);
  // A bank-only ingredient (Wooden Stick: no node, no recipe) covers fewer
  // runs than the bag does — bisect to the largest feasible batch instead of
  // a craft that starves mid-batch behind materials nobody will use.
  if (!plan.feasible) {
    let lo = 0, hi = runs;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (planFor(mid).feasible) lo = mid; else hi = mid; }
    if (lo > 0) { runs = lo; plan = planFor(runs); }
  }
  return { code: pick.code, runs, produced: runs * recipe.quantity, plan };
}

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
 * goals. A prerequisite sits on the path to its parent's value, so its rate is
 * that value over the COMBINED wall-clock: a cheap gate scores almost like the
 * parent, an hours-long grind sinks below it. (Inheriting parent ÷
 * BLOCKED_DISCOUNT ranked three identical level-skill goals above the
 * 2-minute parent they claimed to unlock.) Deduped by target, best parent wins.
 */
export function promoteBlockers(ctx: HiveCtx, parents: ScoredGoal[]): ScoredGoal[] {
  const byKey = new Map<string, ScoredGoal>();
  const n = ctx.characters.length;
  for (const parent of parents) {
    for (const b of parent.blockers) {
      if (!b.suggest) continue;
      const goal = b.suggest;
      const key = goal.kind === "level-skill" ? `skill|${goal.skill}|${goal.character}` : goal.kind;
      const cur = byKey.get(key);
      const toLevel = goal.kind === "level-skill" ? Math.max(goal.toLevel, cur?.goal.kind === "level-skill" ? cur.goal.toLevel : 0) : 0;
      const estActions = goal.kind === "level-skill" ? trainEstActions(ctx, goal.skill, goal.character, toLevel) : 120;
      const parentHours = hoursOf(wallActions(n, parent.estActions));
      const score = (parent.score * parentHours) / (parentHours + hoursOf(wallActions(n, estActions)));
      if (cur && cur.score >= score && !(goal.kind === "level-skill" && cur.goal.kind === "level-skill" && goal.toLevel > cur.goal.toLevel)) continue;
      const promoted: AccountGoal =
        goal.kind === "level-skill" ? { ...goal, toLevel, unlocks: parent.label } : goal;
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
        estMinutes: estMinutes(wallActions(n, estActions)),
      });
    }
  }
  return [...byKey.values()];
}

/** Rough actions to close a skill gap (XP curves aren't in the catalog): a
 *  gathering skill levels in ~25 gathers; a craft skill takes one material +
 *  craft batch per level, and the MATERIALS dominate (a 9-helmet batch is
 *  ~540 actions, not 25), so the batch plan is priced instead of guessed. */
const GATHERS_PER_LEVEL = 25;
function trainEstActions(ctx: HiveCtx, skill: string, character: string, toLevel: number): number {
  const ch = ctx.characters.find((c) => c.name === character);
  const have = ch ? skillLevel(ch, skill) : 0;
  const gap = Math.max(1, toLevel - have);
  if (!ch || (GATHER_SKILLS as readonly string[]).includes(skill)) return gap * GATHERS_PER_LEVEL;
  const batch = trainingBatch(ctx, ch, skill, have);
  return gap * (batch ? batch.plan.estActions + batch.runs : GATHERS_PER_LEVEL);
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
  const batch = trainingBatch(ctx, ch, goal.skill, have);
  if (!batch) {
    return { goal, waves: [], summary: label, blockers: [{ reason: `no feasible ${titleCase(goal.skill)} training recipe at Lv ${have}` }] };
  }
  const { code, produced, plan } = batch;
  const crafterItems: QueueItemInput[] = [{ kind: "craft", code, quantity: produced, done: 0, wait: true }];
  if (item(code)?.recyclable) crafterItems.push({ kind: "recycle", code, quantity: produced, done: 0 });
  crafterItems.push({ kind: "deposit-all" });
  // The batch pipelines in wave 0 behind its materials (a `wait` craft holds
  // for the deposits) — appended to the crafter's own production lane.
  const wave = acquireWaves(plan, ctx)[0] ?? { label: `Craft batch (${titleCase(goal.skill)} ${have} → ${goal.toLevel})`, assignments: [] };
  const mine = wave.assignments.find((a) => a.character === ch.name);
  const craftLabel = `craft ${produced}× ${itemName(code)}`;
  if (mine) {
    mine.items.push(...crafterItems);
    mine.label += ` · ${craftLabel}`;
  } else wave.assignments.push({ character: ch.name, label: craftLabel, items: crafterItems });
  return {
    goal,
    waves: [wave],
    summary: `${label} — batches of ${produced}× ${itemName(code)}`,
    blockers: plan.blockers,
    // XP as progress: a tiny bank-fed batch (1 staff per barrier) repeats an
    // identical wave while still levelling — the stall guard must let it.
    progress: (ch as unknown as Record<string, number>)[`${goal.skill}_xp`],
  };
}
