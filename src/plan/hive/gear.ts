// gear-upgrade goals — "craft better equipment", the account's progression
// lever. The frontier is the task-ladder monster nobody safely beats yet;
// candidates are items a fleet crafter could make whose materials planAcquire
// can source; value is honest simulator deltas (win-flip / safe-flip / margin)
// between the owned-pool BIS and the candidates-added BIS. The plan ends at
// the bank deposit: adoption is free, because every fight/task item with
// gear:true re-derives the bank BIS live.

import { catalog, itemName, monster as monsterOf } from "../../catalog";
import { canEquip } from "../bis";
import { SLOTS_FOR_TYPE } from "../../types/api";
import { acquireWaves, planAcquire, TRAIN_GAP } from "./acquire";
import { crafterFor, fleetBis, fleetOwned } from "./ctx";
import { SCORE, estMinutes, perHour } from "./score";
import { titleCase } from "../../lib/util";
import type { BankItem, Character, GearSlot } from "../../types/api";
import type { Monster } from "../../types/catalog";
import type { AccountGoal, Blocker, GearUpgrade, HiveCtx, HivePlan, ItemDemand, ScoredGoal } from "./types";

/** Only bother re-scoring a drop for codes costing at least this much. */
const DROP_COST_FLOOR = 30;
const MAX_DROP_EVALS = 3;

/**
 * The progression frontier: task-ladder monsters (every "monsters" task code
 * is a monster on the ladder) near the fleet's level band that at least one
 * participant does NOT safely beat with the current fleet-owned BIS.
 */
export function gearFrontier(ctx: HiveCtx, size = 4): string[] {
  if (ctx.characters.length === 0) return [];
  const levels = ctx.characters.map((c) => c.level);
  const lo = Math.min(...levels) - 2;
  const hi = Math.max(...levels) + 4;
  const seen = new Set<string>();
  const ladder: Monster[] = [];
  for (const t of catalog().tasks.values()) {
    if (t.type !== "monsters" || seen.has(t.code)) continue;
    seen.add(t.code);
    const m = monsterOf(t.code);
    if (m && m.level >= lo && m.level <= hi) ladder.push(m);
  }
  ladder.sort((a, b) => a.level - b.level);
  const out: string[] = [];
  for (const m of ladder) {
    if (ctx.characters.some((ch) => !fleetBis(ctx, ch, m.code)?.safe)) out.push(m.code);
    if (out.length >= size) break;
  }
  return out;
}

// Probe results memoized per bank generation (same trick as fleetBis).
// Also used by the Hive drawer's order builder to hide unsourceable items.
const _probeCache = new WeakMap<BankItem[], Map<string, boolean>>();
export function probeFeasible(ctx: HiveCtx, code: string): boolean {
  let byCode = _probeCache.get(ctx.bank);
  if (!byCode) {
    byCode = new Map();
    _probeCache.set(ctx.bank, byCode);
  }
  const hit = byCode.get(code);
  if (hit !== undefined) return hit;
  const ok = planAcquire([{ code, quantity: 1 }], ctx, { probe: true }).feasible;
  byCode.set(code, ok);
  return ok;
}

/**
 * Unowned gear this character could be GIVEN: equippable, level-appropriate
 * for the target monster, craftable by a fleet crafter (a near-miss skill gap
 * becomes a level-skill blocker), materials sourceable.
 */
export function accountCraftableCandidates(
  ctx: HiveCtx,
  ch: Character,
  m: Monster,
): { codes: string[]; blockers: Blocker[] } {
  const { owned } = fleetOwned(ctx);
  const codes: string[] = [];
  const blockers: Blocker[] = [];
  for (const it of catalog().items.values()) {
    if (!SLOTS_FOR_TYPE[it.type] || it.type === "utility" || it.type === "bag") continue;
    if (owned.has(it.code)) continue; // already in the base pool
    if (!it.craft) continue; // gear is only ever crafted or already owned
    if (it.level < m.level - 10 || it.level > ch.level) continue;
    if (!canEquip(ch, it)) continue;
    const crafter = crafterFor(ctx, it.craft.skill);
    const level = crafter?.level ?? 0;
    if (level >= it.craft.level) {
      if (probeFeasible(ctx, it.code)) codes.push(it.code);
    } else if (crafter && it.craft.level - level <= TRAIN_GAP) {
      blockers.push({
        reason: `${it.name} needs ${titleCase(it.craft.skill)} Lv ${it.craft.level} (${crafter.ch.name} has ${level})`,
        suggest: { kind: "level-skill", skill: it.craft.skill, character: crafter.ch.name, toLevel: it.craft.level },
      });
    }
  }
  return { codes, blockers };
}

interface CharDelta {
  ch: Character;
  candidates: string[];
  value: number;
  kind: "win" | "safe" | "margin";
  wear: Partial<Record<GearSlot, string>>;
}

/** Score one character's upgrade vs a monster with a given candidate list. */
function deltaFor(ctx: HiveCtx, ch: Character, m: Monster, candidates: string[]): CharDelta | undefined {
  if (candidates.length === 0) return undefined;
  const base = fleetBis(ctx, ch, m.code);
  const upg = fleetBis(ctx, ch, m.code, candidates);
  if (!base || !upg) return undefined;
  const winFlip = upg.forecast.win && !base.forecast.win;
  const safeFlip = !winFlip && upg.safe && !base.safe;
  const marginGain =
    upg.forecast.win && base.forecast.win ? Math.max(0, upg.forecast.margin - base.forecast.margin) : 0;
  const value = winFlip ? SCORE.WIN_FLIP : safeFlip ? SCORE.SAFE_FLIP : SCORE.MARGIN * marginGain;
  if (value < 1) return undefined;
  const extra = new Set(candidates);
  const wear: Partial<Record<GearSlot, string>> = {};
  for (const [slot, code] of Object.entries(upg.slots) as [GearSlot, string][]) {
    if (code && extra.has(code)) wear[slot] = code;
  }
  if (Object.keys(wear).length === 0) return undefined; // gain didn't come from new gear
  return { ch, candidates, value, kind: winFlip ? "win" : safeFlip ? "safe" : "margin", wear };
}

const demandOf = (deltas: CharDelta[]): Map<string, number> => {
  const demand = new Map<string, number>();
  for (const d of deltas) for (const c of Object.values(d.wear)) if (c) demand.set(c, (demand.get(c) ?? 0) + 1);
  return demand;
};

const acquireCost = (ctx: HiveCtx, demand: Map<string, number>): number =>
  planAcquire([...demand].map(([code, quantity]) => ({ code, quantity })), ctx).estActions;

export function proposeGearGoals(ctx: HiveCtx): ScoredGoal[] {
  const out: ScoredGoal[] = [];
  for (const code of gearFrontier(ctx)) {
    const m = monsterOf(code);
    if (!m) continue;
    const goalBlockers: Blocker[] = [];
    let deltas: CharDelta[] = [];
    for (const ch of ctx.characters) {
      const { codes, blockers } = accountCraftableCandidates(ctx, ch, m);
      for (const b of blockers) if (!goalBlockers.some((x) => x.reason === b.reason)) goalBlockers.push(b);
      const d = deltaFor(ctx, ch, m, codes);
      if (d) deltas.push(d);
    }
    if (deltas.length === 0) continue;

    // One greedy drop pass: an expensive piece that only buys margin gets
    // re-scored without itself; the drop sticks when value-per-hour rises.
    let demand = demandOf(deltas);
    let cost = acquireCost(ctx, demand);
    let score = perHour(deltas.reduce((s, d) => s + d.value, 0), cost);
    const pricey = [...demand]
      .map(([c, qty]) => ({ c, unit: acquireCost(ctx, new Map([[c, qty]])) / qty }))
      .filter((x) => x.unit >= DROP_COST_FLOOR)
      .sort((a, b) => b.unit - a.unit)
      .slice(0, MAX_DROP_EVALS);
    for (const { c } of pricey) {
      const trimmed = deltas
        .map((d) => (Object.values(d.wear).includes(c) ? deltaFor(ctx, d.ch, m, d.candidates.filter((x) => x !== c)) : d))
        .filter((d): d is CharDelta => !!d);
      if (trimmed.length === 0) continue;
      const dDemand = demandOf(trimmed);
      const dCost = acquireCost(ctx, dDemand);
      const dScore = perHour(trimmed.reduce((s, d) => s + d.value, 0), dCost);
      if (dScore > score) {
        deltas = trimmed;
        demand = dDemand;
        cost = dCost;
        score = dScore;
      }
    }

    const upgrades: GearUpgrade[] = deltas.map((d) => ({ character: d.ch.name, wear: d.wear }));
    const pieces = [...demand.keys()].map((c) => itemName(c));
    const who = deltas.map((d) => `${d.ch.name}${d.kind === "win" ? " ⚔" : d.kind === "safe" ? " 🛡" : ""}`);
    const goal: AccountGoal = { kind: "gear-upgrade", monster: m.code, upgrades };
    const blocked = goalBlockers.length > 0;
    out.push({
      goal,
      label: `Gear up vs ${m.name} (Lv ${m.level})`,
      score: score * (blocked ? SCORE.BLOCKED_DISCOUNT : 1),
      rationale: `${pieces.join(" + ")} ${deltas.some((d) => d.kind === "win") ? "win-flips" : deltas.some((d) => d.kind === "safe") ? "safe-flips" : "improves"} ${m.name} for ${who.join(", ")}`,
      blockers: goalBlockers,
      estActions: cost,
      estMinutes: estMinutes(cost),
    });
  }
  return out;
}

export function compileGearGoal(
  goal: Extract<AccountGoal, { kind: "gear-upgrade" }>,
  ctx: HiveCtx,
): HivePlan {
  const { ownedQty } = fleetOwned(ctx);
  const want = new Map<string, number>();
  for (const u of goal.upgrades) {
    if (!ctx.characters.some((c) => c.name === u.character)) continue;
    for (const c of Object.values(u.wear)) if (c) want.set(c, (want.get(c) ?? 0) + 1);
  }
  const targets: ItemDemand[] = [];
  for (const [code, qty] of want) {
    const missing = qty - (ownedQty.get(code) ?? 0);
    if (missing > 0) targets.push({ code, quantity: missing });
  }
  const mName = monsterOf(goal.monster)?.name ?? goal.monster;
  if (targets.length === 0) {
    return { goal, waves: [], summary: `every upgrade piece for ${mName} is owned`, blockers: [] };
  }
  const plan = planAcquire(targets, ctx);
  const waves = acquireWaves(plan, ctx);
  return {
    goal,
    waves,
    summary: `craft ${targets.map((t) => `${t.quantity}× ${itemName(t.code)}`).join(", ")} — gear vs ${mName}`,
    blockers: plan.blockers,
  };
}

/** Satisfied when every wanted upgrade piece exists somewhere in the fleet. */
export function gearGoalSatisfied(goal: Extract<AccountGoal, { kind: "gear-upgrade" }>, ctx: HiveCtx): boolean {
  const { ownedQty } = fleetOwned(ctx);
  const want = new Map<string, number>();
  for (const u of goal.upgrades) for (const c of Object.values(u.wear)) if (c) want.set(c, (want.get(c) ?? 0) + 1);
  for (const [code, qty] of want) if ((ownedQty.get(code) ?? 0) < qty) return false;
  return true;
}
