// Best-in-slot gear solver — pure, offline, driven by the combat simulator.
//
// Given a character and a target monster, search the gear the character owns or
// can craft for the set that beats the monster with the most margin. The search
// is bounded (pruned pools + weapon-outer climbs), so it runs in a few thousand
// simulate() calls — sub-second, synchronous.
//
// Task 021, what the answer guarantees (scripts/check-solve.mts proves all three):
//   - a fixpoint: no change of one slot (the weapon too) or of one group (the ring
//     pair, the artifacts, the utility pair) among the candidates improves it — a
//     climb runs passes until one changes nothing, the last one with the weapon free;
//   - nested: on the caps' ladder (3/3 ⊂ 6/6 ⊂ 12/10) a search starts from the
//     answer of the step below on its own candidates (the narrower candidates are
//     the wider ones' top by the same heuristic order), and a climb never ends
//     below its start — so a wider search never answers below a narrower one;
//   - the tier (safe, win, lost) of the best set known on the check's sample.
//
// Objective (lexicographic, encoded as one scalar):
//   1. feasible: EV win AND not a 100-turn timeout            (else the -1e12 tier)
//   2. safe: the pessimistic pass also wins                   (+1e9)
//   3. minimize seconds per kill (killSeconds): the fight's cooldown (2 s/turn)
//      + resting back the HP really missing at its end (1 s per 1% of max HP,
//      the docs — task 012; it was 5 HP/s) + every potion the fight drinks at
//      what making another costs (xp.ts potionSec: a small health potion
//      47.5 s, not the 6 s of rest its 30 HP buy — task 010; task 012: an
//      ingredient the stock covers is free, xp.ts potionPriceOf, passed in as
//      potionPrice; a restore potion fires every own turn under half HP, a
//      boost once a fight, FightForecast.used). Two traps of earlier objectives stay shut:
//      NOT "HP remaining" (a potion heals every turn under half health, so
//      that rewarded a slow weapon that dragged the fight out — fire staff
//      over iron sword vs a cow, 2026-11-07: here a longer fight drinks more
//      potions), and NOT rest-to-full alone (the potion pins end-of-fight HP
//      at half of max, so every +HP armor read as MORE rest and the solver
//      stripped body armor, 2026-11-08: here the armor saves procs).
//      scripts/check-planner.mts keeps both cases.
// So any safe win beats any risky win; within a tier, the fastest grind.
// Sets that can't win at all still rank (on a tier no win loses to, by turns
// survived) — when NOTHING owned beats the monster, the solver still returns
// the best-effort set, so "equip for a fight" always dresses the character.
// Whether to actually fight is the runner's live forecast gate's call.

import { catalog, item, monster as monsterOf } from "../catalog";
import { applyGear, baseStats } from "../sim/stats";
import type { EffectiveStats } from "../sim/types";
import { simulate } from "../sim/combat";
import type { FightForecast } from "../sim/combat";
import { fightSec, potionSec } from "./xp";
import { restSeconds } from "../sim/cost";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../types/api";
import type { Character, GearSlot } from "../types/api";
import type { Item, Monster } from "../types/catalog";
import type { GearRecommendation } from "./types";

export interface BisOptions {
  /** Item codes available right now (inventory ∪ bank ∪ equipped). */
  owned?: Set<string>;
  /**
   * Available count per code (inventory ∪ bank ∪ equipped). Lets the ring pair
   * use TWO copies of the same ring. Codes absent from the map (craftable /
   * "all"-pool candidates) are treated as producible in any quantity.
   */
  ownedQty?: Map<string, number>;
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
   * Leave the utility slots out of the search — for callers that want a
   * potion-free forecast (the gear swap equips + refills stacks, so job sets
   * normally include them).
   */
  noUtilities?: boolean;
  /** The price of a potion a fight drinks, for killSeconds. Default potionSec (the field price); the planner's core and
   *  the executor's solves pass xp.ts potionPriceOf's (task 012: stock is free), the check script others. */
  potionPrice?: (code: string) => number;
  perSlotCap?: number; // default 12
  weaponCap?: number; // default 10
  /** Task 021: false — the set worn is not read (no `keep` tiebreak, the worn weapon no extra option): the planner's
   *  solves (reach.ts), so one pool gives one answer whatever is worn. Default true: the executor keeps what it wears
   *  rather than swap it for an equal piece at the bank. */
  worn?: boolean;
}

/** Task 014: a food a fighter eats between fights — its code and the HP one unit heals. */
export interface Food { code: string; hp: number }
/** Task 014: the seconds of one `use` action. The docs give none (docs/api/openapi.json: "Use an item as a consumable.");
 *  logs/dev.log 2026-11-19 09:15 → 11-20 08:06 UTC: 1,705 `use` lines, the median from one to the character's next action
 *  4.49 s (p25 4.10, p75 5.14; tasks/014-consumables.report.md). healOnce (src/state/exec.ts) eats every unit the deficit
 *  takes in one action, then rests what is left under one unit. */
export const USE_SEC = 4.5;
/** Task 014: the healing term — eating when a food is in the plan: one `use` of the units the HP missing takes (whole
 *  units, as healOnce eats them), each at `price`, then rest for what is left under one unit; rest by the docs otherwise. */
export function healSeconds(lost: number, maxHp: number, price: (code: string) => number, food?: Food): number {
  const n = food && food.hp > 0 ? Math.floor(lost / food.hp) : 0;
  return n > 0 ? USE_SEC + n * price(food!.code) + restSeconds(lost - n * food!.hp, maxHp) : restSeconds(lost, maxHp);
}

/** Wall-clock per kill: the fight's cooldown, the healing back from the HP missing at its end (rest: 1 s per 1% of max
 *  HP, task 012; task 014: eating when `food` is given), and each potion it drinks (FightForecast.used) at `price` —
 *  default what making another takes in the field (xp.ts potionSec); the stock counted where the caller says so. */
export function killSeconds(f: Pick<FightForecast, "turns" | "maxHp" | "hpRemaining" | "used">, price: (code: string) => number = potionSec, food?: Food): number {
  let s = fightSec(f.turns) + healSeconds(f.maxHp - f.hpRemaining, f.maxHp, price, food);
  for (const code in f.used) if (f.used[code] > 0) s += f.used[code] * price(code);
  return s;
}

// task 021: exported for scripts/check-solve.mts, which judges a fixpoint on the same moves
export const SINGLE_SLOTS: GearSlot[] = ["shield", "helmet", "body_armor", "leg_armor", "boots", "amulet", "rune", "bag"];
export const RING_SLOTS: GearSlot[] = ["ring1", "ring2"];
export const ARTIFACT_SLOTS: GearSlot[] = ["artifact1", "artifact2", "artifact3"];
export const UTILITY_SLOTS: GearSlot[] = ["utility1", "utility2"];

const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

/** Whether the character satisfies all of an item's equip conditions. */
export function canEquip(ch: Character, it: Item): boolean {
  for (const c of it.conditions ?? []) {
    // Condition codes come in two spellings: "level" (character level) and
    // "<skill>_level" (e.g. iron_pickaxe wants mining_level > 9) — the latter
    // is ALREADY the Character field name, so read it directly; appending
    // another "_level" (the old bug) made every skill-gated tool unequippable
    // and dressed the whole fleet in copper forever.
    const stat =
      c.code === "level" ? ch.level
      : c.code.endsWith("_level") ? ((ch as unknown as Record<string, number>)[c.code] ?? 0)
      : skillLevel(ch, c.code);
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

const heuristics = new WeakMap<Monster, Map<string, number>>();
/** Build per-slot candidate pools from owned + craftable items, equip-filtered. Task 020: exported — the planner's solve
 *  cache keys a solve on them (src/plan/planner/reach.ts solveKey) and hands them back to bestInSlot. */
export function bisPools(ch: Character, m: Monster, opts: BisOptions, uncapped?: Record<GearSlot, string[]>): Record<GearSlot, string[]> {
  return capPools(uncapped ?? ownedPools(ch, opts), m, new Set(opts.extraCandidates ?? []), opts.perSlotCap ?? 12, opts.weaponCap ?? 10);
}
/** Task 021: the candidates per slot before the caps — what the character may equip of the owned, the craftable (or every
 *  item) and the extras; no monster in it, so reach.ts keeps it per pool and character for every monster it asks. */
export function ownedPools(ch: Character, opts: BisOptions): Record<GearSlot, string[]> {
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
  return pools as Record<GearSlot, string[]>;
}

/** Cap pools so the combinatorial multi-slot search stays cheap: the pinned extras (they survive the cut — the heuristic
 *  scores e.g. potions near zero), then the best by `heuristic` against the monster. Task 021: also how a search derives
 *  the candidates of the ladder's step below from its own (the top of the same order). */
function capPools(pools: Record<GearSlot, string[]>, m: Monster, pinned: Set<string>, perSlotCap: number, weaponCap: number): Record<GearSlot, string[]> {
  // task 020: an item's heuristic against this monster, once (a sort asked it at every comparison)
  let hm = heuristics.get(m);
  if (!hm) heuristics.set(m, (hm = new Map()));
  const h = (code: string): number => {
    let v = hm!.get(code);
    if (v === undefined) hm!.set(code, (v = heuristic(item(code)!, m)));
    return v;
  };
  const rank = (codes: string[], cap: number) => {
    if (codes.length <= cap) return codes;
    const keep = codes.filter((c) => pinned.has(c));
    const rest = codes
      .filter((c) => !pinned.has(c))
      .sort((a, b) => h(b) - h(a) || a.localeCompare(b))
      .slice(0, Math.max(0, cap - keep.length));
    return [...keep, ...rest];
  };
  // Final pools are sorted by code: the search's "first candidate wins a tie"
  // rule must NOT depend on insertion order (inventory → bank → worn), or the
  // recommendation flips as a swap moves items around and the differ livelocks
  // chasing it. Sorted pools make bestInSlot a pure function of the owned
  // MULTISET — which a swap ceremony never changes.
  const out = {} as Record<GearSlot, string[]>;
  for (const s of GEAR_SLOTS) out[s] = [...rank(pools[s], s === "weapon" ? weaponCap : perSlotCap)].sort();
  return out;
}

/** What a set's score reads of its expected fight (task 021: kept across solves in numbers, makeEvaluator). */
type Fight = Pick<FightForecast, "win" | "timedOut" | "turns" | "hpRemaining" | "maxHp" | "used">;
interface Eval { score: number; f: Fight; safe: boolean }

/** Task 020: a small number per item code, in the order codes are met (a set's key is a character a slot). */
const codeIds = new Map<string, number>();
const levels: number[] = [0]; // an id's item level (the tiebreak's tier)
const idOf = (code: string): number => {
  let i = codeIds.get(code);
  if (i === undefined) {
    codeIds.set(code, (i = codeIds.size + 1));
    levels[i] = item(code)?.level ?? 0;
  }
  return i;
};
const ids: number[] = new Array(GEAR_SLOTS.length).fill(0);
/** A set slot by slot as a short string: one character a slot (0 = empty). */
function setKey(slots: Record<GearSlot, string>): string {
  for (let i = 0; i < GEAR_SLOTS.length; i++) {
    const c = slots[GEAR_SLOTS[i]];
    ids[i] = c ? idOf(c) : 0;
  }
  return String.fromCharCode(...ids);
}

/**
 * Task 021 (speed): a set's two fights against a monster (the expected one, the pessimistic one) are a function of the base
 * stats, the set and the monster — they read neither the price nor what is worn — so they are kept across solves, as
 * numbers: per monster and base stats a map from the set's key to a row of FIGHT_ROW values in a Float64Array (win, timed
 * out, safe, turns, HP left, max HP, the units the utility1 and utility2 potions drank, −1: not in `used`), a table's array
 * starting at 32 rows and doubling (the forward model makes thousands of tables, most of them small: at 1,024 rows to start
 * the season peaked at 2 GB). A row with its key, its map entry and the array's slack weighs about 100 bytes (500,000 rows in
 * 6,000 tables: 45 MB, measured); at FIGHTS_CAP rows in all every table is dropped at once (one clear, no stream of
 * evictions for the collector).
 */
const FIGHTS_CAP = 500_000;
const FIGHT_ROW = 8;
interface FightTable { idx: Map<string, number>; rows: Float64Array; n: number }
const fightTables = new Map<string, FightTable>();
let fightRows = 0, fightGen = 0;
const NO_POTION: Record<string, number> = Object.freeze({}) as Record<string, number>;
const U1 = GEAR_SLOTS.indexOf("utility1"), U2 = GEAR_SLOTS.indexOf("utility2");
function fightTable(k: string): FightTable {
  let t = fightTables.get(k);
  if (!t) fightTables.set(k, (t = { idx: new Map(), rows: new Float64Array(32 * FIGHT_ROW), n: 0 }));
  return t;
}

export function makeEvaluator(base: EffectiveStats, monster: NonNullable<ReturnType<typeof monsterOf>>, worn: Partial<Record<GearSlot, string>>, price: (code: string) => number = potionSec) {
  const memo = new Map<string, Eval>(); // task 020: a set (slot by slot) scores the same every time a solve asks again
  const wornIds = GEAR_SLOTS.map((s) => (worn[s] ? idOf(worn[s]!) : 0));
  const tk = `${monster.code}|${Object.values(base).join(",")}`;
  let table = fightTable(tk), gen = fightGen;
  return (slots: Record<GearSlot, string>): Eval => {
    const key = setKey(slots);
    let e = memo.get(key);
    if (!e) memo.set(key, (e = score(slots, key)));
    return e;
  };
  /** The set's expected fight and whether the pessimistic one wins too: from the table, else simulated and kept. */
  function fights(slots: Record<GearSlot, string>, key: string): { f: Fight; safe: boolean } {
    if (gen !== fightGen) { table = fightTable(tk); gen = fightGen; }
    const i = table.idx.get(key);
    const r = table.rows;
    if (i !== undefined) {
      const o = i * FIGHT_ROW, u1 = r[o + 6], u2 = r[o + 7];
      let used = NO_POTION;
      if (u1 >= 0 || u2 >= 0) { used = {}; if (u1 >= 0) used[slots.utility1] = u1; if (u2 >= 0) used[slots.utility2] = u2; }
      return { f: { win: r[o] === 1, timedOut: r[o + 1] === 1, turns: r[o + 3], hpRemaining: r[o + 4], maxHp: r[o + 5], used }, safe: r[o + 2] === 1 };
    }
    const codes: string[] = [];
    for (const s of GEAR_SLOTS) if (slots[s]) codes.push(slots[s]);
    const fighter = applyGear(base, codes);
    const f = simulate(fighter, monster);
    const safe = f.win && !f.timedOut && simulate(fighter, monster, { pessimistic: true }).win;
    if (fightRows >= FIGHTS_CAP) { fightTables.clear(); fightRows = 0; fightGen++; table = fightTable(tk); gen = fightGen; }
    if ((table.n + 1) * FIGHT_ROW > table.rows.length) { const g = new Float64Array(table.rows.length * 2); g.set(table.rows); table.rows = g; }
    const o = table.n * FIGHT_ROW, w = table.rows, c1 = slots[GEAR_SLOTS[U1]], c2 = slots[GEAR_SLOTS[U2]];
    w[o] = f.win ? 1 : 0; w[o + 1] = f.timedOut ? 1 : 0; w[o + 2] = safe ? 1 : 0; w[o + 3] = f.turns; w[o + 4] = f.hpRemaining; w[o + 5] = f.maxHp;
    w[o + 6] = c1 && f.used[c1] !== undefined ? f.used[c1] : -1;
    w[o + 7] = c2 && f.used[c2] !== undefined ? f.used[c2] : -1;
    table.idx.set(key, table.n++);
    fightRows++;
    return { f, safe };
  }
  function score(slots: Record<GearSlot, string>, key: string): Eval {
    const { f, safe } = fights(slots, key);
    // Combat-equal sets are broken deterministically, in order: prefer the
    // HIGHER-TIER items (Σ item level — "best in class": an iron ring whose
    // +2% dmg rounds away vs this monster still beats the worn copper one),
    // then MORE gear (a stat-neutral spare beats an empty slot), then what is
    // ALREADY worn — so an equal-forecast, equal-level alternative in the
    // bank never triggers a swap (that churn is exactly the bank livelock),
    // while a higher-level one triggers exactly ONE stable swap. All three
    // terms are pure functions of the set (+ worn state for `keep`), keeping
    // bestInSlot order-free. Windows: a 1-level gap (5e-4) outranks a filled
    // slot (1e-4) outranks a kept slot (1e-5); totals stay far below any real
    // forecast difference (1 s = 1000) and far above double-precision noise
    // at the 1e9 safe-tier magnitude (ulp ≈ 2.4e-7).
    let tier = 0;
    let filled = 0;
    let keep = 0;
    // task 020: read off the set's key (a slot's character is its code's id, 0 empty) — the same sums in the same order
    for (let i = 0; i < GEAR_SLOTS.length; i++) {
      const id = key.charCodeAt(i);
      if (!id) continue;
      tier += levels[id];
      filled++;
      if (id === wornIds[i]) keep++;
    }
    const tiebreak = tier * 5e-4 + filled * 1e-4 + keep * 1e-5;
    if (!f.win || f.timedOut) {
      // Can't win with this set. Still rank it — survive the longest — on a
      // tier every winning set beats, so the solver can recommend the best
      // AVAILABLE set even when nothing owned can beat the monster.
      return { score: -1e12 + f.turns * 1000 + f.hpRemaining + tiebreak, f, safe: false };
    }
    return { score: (safe ? 1e9 : 0) - killSeconds(f, price) * 1000 + tiebreak, f, safe };
  }
}

function emptySlots(): Record<GearSlot, string> {
  const s = {} as Record<GearSlot, string>;
  for (const g of GEAR_SLOTS) s[g] = "";
  return s;
}

/** Task 021: the caps' ladder — the planner's 3 and 3 (planRec, potionRec) and 6 and 6 (fightRec), the executor's 12 and
 *  10. A search starts from the answer of the step below its caps (the largest one under both). */
const LADDER: [number, number][] = [[3, 3], [6, 6], [12, 10]];
/** A climb's passes: each pass that does not end it raises the score, so it ends; the bound only guards. */
const MAX_PASSES = 50;
/** Task 021: seeded starts beside the weapons' — a climb from empty slots and one weapon follows the lost tier, which ranks
 *  by turns survived (offence counts there only once a set wins), into a set that survives longest and is one piece short
 *  of a win from two changes (report 021: Second and Fourth against the vampire on 11-20). The same candidates give the
 *  same starts, so the answer stays a function of what the solve key holds. */
const STARTS = 3;

export function bestInSlot(ch: Character, monsterCode: string, opts: BisOptions = {}, given?: Record<GearSlot, string[]>): GearRecommendation[] {
  const m = monsterOf(monsterCode);
  if (!m) return [];
  const pools = given ?? bisPools(ch, m, opts); // `given`: bisPools of the same arguments
  const worn: Partial<Record<GearSlot, string>> = {};
  if (opts.worn !== false) for (const s of GEAR_SLOTS) worn[s] = slotCode(ch, s);
  const base = baseStats(ch);
  const evaluate = makeEvaluator(base, m, worn, opts.potionPrice);
  // How many copies of a code the group search may place: owned counts when
  // known, else "as many as the group has slots" (craftable candidates).
  const countOf = (code: string): number => opts.ownedQty?.get(code) ?? 3;
  const pinned = new Set(opts.extraCandidates ?? []);
  const score = (s: Record<GearSlot, string>): number => evaluate(s).score;

  /** Passes of one slot at a time (the weapon too when `weapons` is given), then the ring pair, the artifacts and the
   *  utility pair each chosen exhaustively among their pool, until a pass changes nothing (a fixpoint of those moves). */
  const climb = (slots: Record<GearSlot, string>, p: Record<GearSlot, string[]>, weapons?: string[]): void => {
    const singles = SINGLE_SLOTS.map((s) => ["", ...p[s]]);
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const before = score(slots);
      if (weapons) pick(slots, "weapon", weapons, score);
      for (let i = 0; i < SINGLE_SLOTS.length; i++) pick(slots, SINGLE_SLOTS[i], singles[i], score);
      // Rings may repeat a code (two copper rings) up to the owned count; artifacts must stay distinct.
      chooseGroup(slots, RING_SLOTS, p.ring1, evaluate, countOf);
      chooseGroup(slots, ARTIFACT_SLOTS, p.artifact1, evaluate);
      if (!opts.noUtilities) chooseGroup(slots, UTILITY_SLOTS, p.utility1, evaluate);
      if (score(slots) === before) return;
    }
  };
  /** The answer on candidates `p` (caps s and w) first, then the ends it was chosen from. Weapon fixes which element you
   *  scale — the one coupling that matters — so each candidate weapon (plus unarmed and the worn one) is climbed from
   *  empty slots with the weapon fixed; the best of those ends and of the step below's answer is climbed again with the
   *  weapon free. */
  const search = (p: Record<GearSlot, string[]>, s: number, w: number): Record<GearSlot, string>[] => {
    const ends: Record<GearSlot, string>[] = [];
    const lower = LADDER.filter(([a, b]) => a <= s && b <= w && (a < s || b < w)).pop();
    if (lower) ends.push(search(capPools(p, m, pinned, lower[0], lower[1]), lower[0], lower[1])[0]);
    const weapons = [...new Set(["", ...p.weapon, ...(worn.weapon ? [worn.weapon] : [])])];
    for (const wp of weapons) {
      const slots = emptySlots();
      slots.weapon = wp;
      climb(slots, p);
      ends.push(slots);
    }
    let seed = 1;
    const any = <T,>(o: T[]): T => o[((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * o.length | 0];
    const groups: [GearSlot[], string[][]][] = [[RING_SLOTS, groupCombos(p.ring1, 2, countOf)], [ARTIFACT_SLOTS, groupCombos(p.artifact1, 3)], [UTILITY_SLOTS, opts.noUtilities ? [[]] : groupCombos(p.utility1, 2)]];
    for (let k = 0; k < STARTS; k++) {
      const slots = emptySlots();
      slots.weapon = any(weapons);
      for (const g of SINGLE_SLOTS) slots[g] = any(["", ...p[g]]);
      for (const [g, combos] of groups) { const c = any(combos); for (let i = 0; i < g.length; i++) slots[g[i]] = c[i] ?? ""; }
      climb(slots, p, weapons);
      ends.push(slots);
    }
    let best = ends[0];
    for (const e of ends) if (score(e) > score(best)) best = e; // the first wins a tie
    const answer = { ...best };
    climb(answer, p, weapons);
    return [answer, ...ends];
  };

  // The answer, then the best other ends (runner-ups), each set once.
  const [answer, ...ends] = search(pools, opts.perSlotCap ?? 12, opts.weaponCap ?? 10);
  const uniq: GearRecommendation[] = [];
  const seen = new Set<string>();
  for (const slots of [answer, ...ends.sort((a, b) => score(b) - score(a))]) {
    const e = evaluate(slots);
    if (e.score === -Infinity) continue;
    const codes: string[] = [];
    for (const s of GEAR_SLOTS) if (slots[s]) codes.push(slots[s]);
    const key = codes.slice().sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    // the forecasts whole (the table keeps only what a score reads)
    const fighter = applyGear(base, codes);
    const forecast = simulate(fighter, m);
    uniq.push({ slots: { ...slots }, codes, forecast, worst: forecast.win && !forecast.timedOut ? simulate(fighter, m, { pessimistic: true }) : forecast, safe: e.safe, score: e.score });
    if (uniq.length >= 3) break;
  }
  return uniq;
}

/** One slot to its best option while the others stand (the first wins a tie: the current one, then the list's order). */
function pick(slots: Record<GearSlot, string>, s: GearSlot, options: string[], score: (s: Record<GearSlot, string>) => number): void {
  let best = slots[s];
  let bestScore = score(slots);
  for (const opt of options) {
    if (opt === slots[s]) continue;
    slots[s] = opt;
    const sc = score(slots);
    if (sc > bestScore) { bestScore = sc; best = opt; }
  }
  slots[s] = best;
}

/**
 * Fill a group of like slots (rings / artifacts / utilities) with the
 * combination of candidates that maximizes the objective. The slots are
 * interchangeable, so we enumerate multiset combinations (size 0..n) of the
 * capped pool — no wasted permutations. When `countOf` is given, a code may
 * repeat up to its owned count (two copper rings); without it every code is
 * used at most once (artifacts must be distinct). Small pools ⇒ exhaustive is
 * cheap.
 */
function chooseGroup(
  slots: Record<GearSlot, string>,
  group: GearSlot[],
  pool: string[],
  evaluate: (s: Record<GearSlot, string>) => Eval,
  countOf?: (code: string) => number,
): void {
  const n = group.length;
  let best = group.map((g) => slots[g]);
  let bestScore = evaluate(slots).score;
  for (const combo of groupCombos(pool, n, countOf)) {
    for (let i = 0; i < n; i++) slots[group[i]] = combo[i] ?? "";
    const sc = evaluate(slots).score;
    if (sc > bestScore) { bestScore = sc; best = group.map((g) => slots[g]); }
  }
  for (let i = 0; i < n; i++) slots[group[i]] = best[i];
}

/** A group's fillings: the multisets of size 0..n of the capped pool, each once (a code repeats up to `countOf`). */
export function groupCombos(pool: string[], n: number, countOf?: (code: string) => number): string[][] {
  const cap = pool.slice(0, 12);
  const combos: string[][] = [];
  const gen = (start: number, chosen: string[]) => {
    combos.push(chosen.slice()); // record multisets of every size 0..n exactly once
    if (chosen.length === n) return;
    for (let i = start; i < cap.length; i++) {
      const max = countOf ? Math.min(countOf(cap[i]), n) : 1;
      const used = chosen.reduce((s, c) => s + (c === cap[i] ? 1 : 0), 0);
      if (used >= max) continue;
      chosen.push(cap[i]);
      gen(used + 1 >= max ? i + 1 : i, chosen);
      chosen.pop();
    }
  };
  gen(0, []);
  return combos;
}
