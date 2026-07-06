// Best-in-slot gear solver — pure, offline, driven by the combat simulator.
//
// Given a character and a target monster, search the gear the character owns or
// can craft for the set that beats the monster with the most margin. The search
// is bounded (pruned pools + weapon-outer greedy with light re-passes), so it
// runs in a few thousand simulate() calls — sub-second, synchronous.
//
// Objective (lexicographic, encoded as one scalar):
//   1. feasible: EV win AND not a 100-turn timeout            (else -Infinity)
//   2. safe: the pessimistic pass also wins                   (+1e9)
//   3. maximize expected HP remaining (rest time dominates grind speed)
//   4. tie-break: fewer turns
// So any safe win beats any risky win; within a tier, survivability then speed.

import { catalog, item, monster as monsterOf } from "../catalog";
import { applyGear, baseStats } from "../sim/stats";
import type { EffectiveStats } from "../sim/types";
import { simulate } from "../sim/combat";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../types/api";
import type { Character, GearSlot } from "../types/api";
import type { Item, Monster } from "../types/catalog";
import type { GearRecommendation } from "./types";

export interface BisOptions {
  /** Item codes available right now (inventory ∪ bank ∪ equipped). */
  owned?: Set<string>;
  /** Also consider items craftable at the character's current skill (default true). */
  includeCraftable?: boolean;
  /**
   * "reachable" (default): owned + self-craftable. "all": every catalog item the
   * character can *equip* regardless of how it would be obtained — the "ideal
   * set" used to report gear another character must provide.
   */
  pool?: "reachable" | "all";
  /** Codes force-included in their slot pools, exempt from the heuristic cap. */
  extraCandidates?: string[];
  /**
   * Leave the utility slots out of the search. The bank-only gear swap never
   * manages potion stacks, so a set meant for it must not let the forecast
   * count potions that will never be equipped.
   */
  noUtilities?: boolean;
  perSlotCap?: number; // default 12
  weaponCap?: number; // default 10
}

const SINGLE_SLOTS: GearSlot[] = ["shield", "helmet", "body_armor", "leg_armor", "boots", "amulet", "rune", "bag"];
const RING_SLOTS: GearSlot[] = ["ring1", "ring2"];
const ARTIFACT_SLOTS: GearSlot[] = ["artifact1", "artifact2", "artifact3"];
const UTILITY_SLOTS: GearSlot[] = ["utility1", "utility2"];

const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

/** Whether the character satisfies all of an item's equip conditions. */
export function canEquip(ch: Character, it: Item): boolean {
  for (const c of it.conditions ?? []) {
    const stat = c.code === "level" ? ch.level : skillLevel(ch, c.code);
    const ok =
      c.operator === "gt" ? stat > c.value
      : c.operator === "ge" || c.operator === "gte" ? stat >= c.value
      : c.operator === "lt" ? stat < c.value
      : c.operator === "le" || c.operator === "lte" ? stat <= c.value
      : c.operator === "eq" ? stat === c.value
      : c.operator === "ne" ? stat !== c.value
      : true; // unknown operator → don't block
    if (!ok) return false;
  }
  return true;
}

/** Rough per-item combat value vs a monster — used only to cap oversized pools. */
function heuristic(it: Item, m: { res_fire: number; res_earth: number; res_water: number; res_air: number }): number {
  let v = 0;
  for (const e of it.effects ?? []) {
    switch (e.code) {
      case "attack_fire": v += e.value * 2 * Math.max(0, 1 - m.res_fire / 100); break;
      case "attack_earth": v += e.value * 2 * Math.max(0, 1 - m.res_earth / 100); break;
      case "attack_water": v += e.value * 2 * Math.max(0, 1 - m.res_water / 100); break;
      case "attack_air": v += e.value * 2 * Math.max(0, 1 - m.res_air / 100); break;
      case "dmg": case "dmg_fire": case "dmg_earth": case "dmg_water": case "dmg_air": v += e.value; break;
      case "critical_strike": v += e.value * 0.5; break;
      case "hp": case "boost_hp": v += e.value * 0.3; break;
      case "res_fire": case "res_earth": case "res_water": case "res_air": v += e.value * 0.5; break;
      case "boost_dmg_fire": case "boost_dmg_water": case "boost_dmg_earth": case "boost_dmg_air": v += e.value; break;
      case "restore": v += e.value * 0.3; break; // in-combat potion healing
      default: break;
    }
  }
  return v;
}

/** Build per-slot candidate pools from owned + craftable items, equip-filtered. */
function buildPools(ch: Character, m: Monster, opts: BisOptions): Record<GearSlot, string[]> {
  const pools: Record<string, string[]> = {};
  for (const s of GEAR_SLOTS) pools[s] = [];
  const seen: Record<string, Set<string>> = {};
  for (const s of GEAR_SLOTS) seen[s] = new Set();

  const consider = (code: string) => {
    const it = item(code);
    if (!it) return;
    const slots = SLOTS_FOR_TYPE[it.type];
    if (!slots) return; // not equippable
    if (!canEquip(ch, it)) return;
    for (const s of slots) {
      if (!seen[s].has(code)) {
        seen[s].add(code);
        pools[s].push(code);
      }
    }
  };

  for (const code of opts.owned ?? []) consider(code);

  if (opts.pool === "all") {
    // Everything the character can wear, however it would be obtained.
    try {
      for (const it of catalog().items.values()) {
        if (!SLOTS_FOR_TYPE[it.type]) continue;
        consider(it.code);
      }
    } catch {
      /* catalog not loaded — owned-only pool */
    }
  } else if (opts.includeCraftable !== false) {
    try {
      for (const it of catalog().items.values()) {
        if (!it.craft) continue;
        if (!SLOTS_FOR_TYPE[it.type]) continue;
        if (skillLevel(ch, it.craft.skill) < it.craft.level) continue;
        consider(it.code);
      }
    } catch {
      /* catalog not loaded — owned-only pool */
    }
  }

  for (const code of opts.extraCandidates ?? []) consider(code);

  // Cap pools so the combinatorial multi-slot search stays cheap. Forced extras
  // survive the cut (the heuristic scores e.g. potions near zero).
  const pinned = new Set(opts.extraCandidates ?? []);
  const perSlotCap = opts.perSlotCap ?? 12;
  const weaponCap = opts.weaponCap ?? 10;
  const rank = (codes: string[], cap: number) => {
    if (codes.length <= cap) return codes;
    const keep = codes.filter((c) => pinned.has(c));
    const rest = codes
      .filter((c) => !pinned.has(c))
      .sort((a, b) => heuristic(item(b)!, m) - heuristic(item(a)!, m))
      .slice(0, Math.max(0, cap - keep.length));
    return [...keep, ...rest];
  };
  for (const s of GEAR_SLOTS) pools[s] = rank(pools[s], s === "weapon" ? weaponCap : perSlotCap);
  return pools as Record<GearSlot, string[]>;
}

interface Eval { score: number; f: ReturnType<typeof simulate>; worst: ReturnType<typeof simulate>; safe: boolean }

function makeEvaluator(base: EffectiveStats, monster: NonNullable<ReturnType<typeof monsterOf>>) {
  return (slots: Record<GearSlot, string>): Eval => {
    const codes: string[] = [];
    for (const s of GEAR_SLOTS) if (slots[s]) codes.push(slots[s]);
    const fighter = applyGear(base, codes);
    const f = simulate(fighter, monster);
    if (!f.win || f.timedOut) return { score: -Infinity, f, worst: f, safe: false };
    const worst = simulate(fighter, monster, { pessimistic: true });
    const safe = worst.win;
    return { score: (safe ? 1e9 : 0) + f.hpRemaining * 1000 - f.turns, f, worst, safe };
  };
}

function emptySlots(): Record<GearSlot, string> {
  const s = {} as Record<GearSlot, string>;
  for (const g of GEAR_SLOTS) s[g] = "";
  return s;
}

export function bestInSlot(ch: Character, monsterCode: string, opts: BisOptions = {}): GearRecommendation[] {
  const m = monsterOf(monsterCode);
  if (!m) return [];
  const base = baseStats(ch);
  const pools = buildPools(ch, m, opts);
  const evaluate = makeEvaluator(base, m);

  // Weapon fixes which element you scale — the one coupling that matters — so we
  // try each candidate weapon (plus the current one and unarmed) as an outer loop.
  const weaponOpts = new Set<string>(["", ...pools.weapon]);
  const curWeapon = slotCode(ch, "weapon");
  if (curWeapon) weaponOpts.add(curWeapon);

  const results: GearRecommendation[] = [];

  for (const w of weaponOpts) {
    const slots = emptySlots();
    slots.weapon = w;

    for (let pass = 0; pass < 3; pass++) {
      // Independent single slots.
      for (const s of SINGLE_SLOTS) {
        let best = slots[s];
        let bestScore = evaluate(slots).score;
        for (const opt of ["", ...pools[s]]) {
          if (opt === slots[s]) continue;
          slots[s] = opt;
          const sc = evaluate(slots).score;
          if (sc > bestScore) { bestScore = sc; best = opt; }
        }
        slots[s] = best;
      }
      // Ring pair / artifact triple / utility pair (identical items across the
      // like slots, so one pool each; picked as distinct combinations).
      chooseGroup(slots, RING_SLOTS, pools.ring1, evaluate);
      chooseGroup(slots, ARTIFACT_SLOTS, pools.artifact1, evaluate);
      if (!opts.noUtilities) chooseGroup(slots, UTILITY_SLOTS, pools.utility1, evaluate);
    }

    const e = evaluate(slots);
    if (e.score === -Infinity) continue;
    const codes: string[] = [];
    for (const s of GEAR_SLOTS) if (slots[s]) codes.push(slots[s]);
    results.push({ slots: { ...slots }, codes, forecast: e.f, worst: e.worst, safe: e.safe, score: e.score });
  }

  // Dedupe identical sets, best first, return the top few (BIS + runner-ups).
  results.sort((a, b) => b.score - a.score);
  const uniq: GearRecommendation[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const key = r.codes.slice().sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(r);
    if (uniq.length >= 3) break;
  }
  return uniq;
}

/**
 * Fill a group of like slots (rings / artifacts / utilities) with the distinct
 * combination of candidates that maximizes the objective. The slots are
 * interchangeable, so we enumerate *combinations* (subsets of size 0..n) of the
 * capped pool and place each into the group, leaving the rest empty — no wasted
 * permutations. Small pools ⇒ exhaustive is cheap.
 */
function chooseGroup(
  slots: Record<GearSlot, string>,
  group: GearSlot[],
  pool: string[],
  evaluate: (s: Record<GearSlot, string>) => Eval,
): void {
  const n = group.length;
  const cap = pool.slice(0, 12);
  let best = group.map((g) => slots[g]);
  let bestScore = evaluate(slots).score;

  const combos: string[][] = [];
  const gen = (start: number, chosen: string[]) => {
    combos.push(chosen.slice()); // record subsets of every size 0..n exactly once
    if (chosen.length === n) return;
    for (let i = start; i < cap.length; i++) {
      chosen.push(cap[i]);
      gen(i + 1, chosen);
      chosen.pop();
    }
  };
  gen(0, []);

  for (const combo of combos) {
    for (let i = 0; i < n; i++) slots[group[i]] = combo[i] ?? "";
    const sc = evaluate(slots).score;
    if (sc > bestScore) { bestScore = sc; best = group.map((g) => slots[g]); }
  }
  for (let i = 0; i < n; i++) slots[group[i]] = best[i];
}
