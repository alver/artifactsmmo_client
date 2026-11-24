// Consumables by need, through the bank (task 014). Pure.
//
// One price, the chain's (settled point 6): a unit of food the pool a character may plan with holds costs nothing (task
// 025: a potion costs its chain whether held or not); any other costs its bill (supply.ts billOf) by the best-placed maker with its tools — the same bill a supply
// parent opens. Healing is eating when a food is in the pool (bis.ts healSeconds: the `use` action), rest otherwise.
//
// By need (settled point 2), as gear: for a run of fights — (a) a fighter's road to its next combat gate, (b) an open
// kill objective as the fleet's work, (c) the hunt of an open parent's src: leaf, (d) an event with open demand that can
// still pay — a potion or a food is needed when making it and then fighting with it takes at most NEED_RATIO of the hours
// of fighting with what the pool holds now (∞ when that is no admitted win): G + H1 ≤ NEED_RATIO × H0. H0 is judged on the
// pool without the consumable when the pool's stock of it does not cover the horizon; G is the bill of every unit the
// work takes (stock counted, a recipe nobody meets with its level road: supply.ts gateRoad, as any gated craft).
//
// Through the bank (settled point 3): a need is a parent of supply (cons:<code>:<work>) with the score of its work; its
// demand is what the next HORIZON chunks take for the character on it, plus MARGIN (an event: one spawn per member),
// less the stock and what is in flight (supply.ts supplyNeeds). The stock is shared from the best-scoring parent down;
// an event's is a reserve no other bill or fight step takes (reservable).
//
// The fight step (settled point 4): its consumables are its `withdraw` (fightTake), its kills the chunk or what the
// reservable stock covers; nothing covered: that set is no candidate, a set that wins without them stays one.
// Bounds (the service has one thread): (a) solves the current pick and four flips at most two levels up, as gear (a);
// (b) and (c) only a monster nobody that is on is admitted now (a flip; a speed-up of an objective is not asked for),
// by the highest-level character that wins it with a potion; (d) the possible members at their level now.

import { catalog, item, itemName, monster as monsterOf } from "../../catalog";
import { atlas } from "../../catalog/atlas";
import { canEquip, healSeconds } from "../bis";
import { applyGear, baseStats } from "../../sim/stats";
import { simulate } from "../../sim/combat";
import { winRate } from "../../sim/monte";
import { restSeconds } from "../../sim/cost";
import type { Food } from "../bis";
import { gearMaterial, healingFoods } from "../consumables";
import { fightXp, potionSec } from "../xp";
import { CHUNK_SEC, HORIZON, MARGIN, NEED_RATIO } from "./config";
import { actionSec, killWalk, levelHoursEstimate, perOf } from "./cost";
import { achHours, bundleOf, bundleScore } from "./bundle";
import { eventDemand, usableSec } from "./events";
import { isOn, met } from "./gates";
import { gearPieces, pieceParent } from "./gear";
import { pickMonster } from "./pick";
import { fightRec, nearestSpot, placeOf, potionPrice, potionRec, admitted, setWisdom, admits, winSecOf } from "./reach";
import { crafterOf, fights } from "./roles";
import { available } from "./stock";
import { billOf, mayCraft, objectiveParents, supplyNeeds } from "./supply";
import type { Gated, Parent } from "./supply";
import { sourceFor, targetsOf } from "./targets";
import type { Price } from "./reach";
import type { Character } from "../../types/api";
import type { GearRecommendation } from "../types";
import type { FightForecast } from "../../sim/combat";
import type { Lane, Step, World } from "./types";

/** What a utility slot holds (src/plan/jobgear.ts UTILITY_STACK; the game answers 484 above it). */
/** A utility slot's stack (the game's 484); task 023: an event member's take caps at it too (events.ts). */
export const STACK = 100;
const cons = (world: World): boolean => !!(world.config.consumables ?? 1);
/** Row B: every consumable a fight wants is at hand and free. */
export const consFree = (world: World): boolean => cons(world) && (world.config.potionK ?? 1) === 0;
const calHOf = (world: World): number => Math.max(0, (Date.parse(world.config.deadline) - world.now) / 3.6e6);

// ── the candidates ───────────────────────────────────────────────────────────

const potMemo = new Map<number, string[]>();
/** The potions a character may drink: every utility potion with a recipe it can equip (the condition is its level). */
export function potionCands(ch: Character): string[] {
  let out = potMemo.get(ch.level);
  if (!out) potMemo.set(ch.level, (out = [...catalog().items.values()].filter((it) => it.type === "utility" && it.craft && canEquip(ch, it)).map((it) => it.code).sort()));
  return out;
}
const foodMemo = new Map<number, { code: string; hp: number }[]>();
/** The foods a character may eat (consumables.ts healingFoods: no other recipe's ingredient), with a recipe whose
 *  ingredients feed no gear (gearMaterial): what a need may ask to be made. */
export function foodCands(ch: Character): { code: string; hp: number }[] {
  let out = foodMemo.get(ch.level);
  if (!out) foodMemo.set(ch.level, (out = healingFoods(ch).filter(({ it }) => it.craft && !it.craft.items.some((g) => gearMaterial(g.code))).map(({ it, heal }) => ({ code: it.code, hp: heal }))));
  return out;
}
const foodsMemo = new WeakMap<World, Map<string, Food[]>>();
/** The foods the pool this character may plan with holds, best heal first (row B: every food with a recipe it may eat).
 *  Memoised per World and name. */
export function poolFoods(world: World, name: string): Food[] {
  let byName = foodsMemo.get(world);
  if (!byName) foodsMemo.set(world, (byName = new Map()));
  let out = byName.get(name);
  if (!out) {
    const ch = world.characters.find((c) => c.name === name);
    out = ch ? healingFoods(ch).filter(({ it }) => (consFree(world) ? !!it.craft : available(it.code, world, name) > 0)).map(({ it, heal }) => ({ code: it.code, hp: heal })) : [];
    byName.set(name, out);
  }
  return out;
}
/** Task 015, settled point 7: the food in the plan of a fight that loses `lost` HP — the best-healing food of the pool the
 *  loss covers at least once (a bigger one is not eaten: the executor eats only under a deficit of one unit's heal). */
export const poolFood = (world: World, name: string, lost: number): Food | undefined => poolFoods(world, name).find((f) => f.hp <= lost);
/** The HP a forecast fight loses. */
export const lostOf = (f: FightForecast): number => f.maxHp - f.hpRemaining;

// ── the price (settled point 6) ──────────────────────────────────────────────

/** Units a chain is priced over: a step's fixed seconds spread over a stack. */
const UNITS = 100;
const chainMemo = new WeakMap<World, Map<string, number>>();
/** What one more unit costs the fleet when the pool holds none: its bill for UNITS units (billOf: the stock of every
 *  ingredient first, then the field by the quickest character that is on with its tools, the crafts and a step's fixed
 *  seconds) ÷ UNITS, a level road left out (it is the need's G); ∞ when it cannot be made. */
export function chainSec(world: World, name: string, code: string): number {
  let m = chainMemo.get(world);
  if (!m) chainMemo.set(world, (m = new Map()));
  const k = `${name}|${code}`;
  const hit = m.get(k);
  if (hit != null) return hit;
  m.set(k, Infinity); // re-entered through a kill leaf's own price: ∞ for that turn
  // nobody that is on may make it (a food's cook is not on): ∞ — supply.ts mayCraft, a potion anyone's at the level
  const r = item(code)?.craft;
  if (r && !world.characters.some((c) => isOn(c.name, world) && mayCraft(r.skill as Lane, 0, c.name, world))) return Infinity;
  const b = billOf(world, name, [[code, UNITS]]);
  const road = b.gated.reduce((s, g) => s + g.hours, 0);
  const h = b.out.length || !Number.isFinite(road) ? Infinity : b.hours - road;
  const s = Number.isFinite(h) ? (h * 3600) / UNITS : Infinity;
  m.set(k, s);
  return s;
}
/** Task 025, settled points 4 and 5: a restore or boost potion's price, and a cooked food's — its chain from the field, the
 *  ingredients' field seconds and the craft (xp.ts potionSec, the catalog's numbers), ∞ when nobody that is on may make it.
 *  Not the bill of the World (chainSec): that moves with the stock and with where the characters stand, so every solve key
 *  changed at every step — two days of the 11-23 World solved 24,581 times on the bill against 4,160 with stocked potions
 *  free. Memoised per config and the makers' levels of the recipe's skill. */
const makeChainMemo = new WeakMap<World["config"], Map<string, number>>();
function makeChain(world: World, code: string): number {
  let m = makeChainMemo.get(world.config);
  if (!m) makeChainMemo.set(world.config, (m = new Map()));
  const r = item(code)?.craft;
  const k = `${code}|${r ? world.characters.filter((c) => isOn(c.name, world)).map((c) => (c as unknown as Record<string, number>)[`${r.skill}_level`]).join(",") : ""}`;
  let s = m.get(k);
  if (s == null) {
    s = r && !world.characters.some((c) => isOn(c.name, world) && mayCraft(r.skill as Lane, r.level, c.name, world)) ? Infinity : potionSec(code);
    m.set(k, s);
  }
  return s;
}
const foodCodes = new Set<string>();
/** A food a fighter may eat (consumables.ts healingFoods' codes, any level). */
function isFood(code: string): boolean {
  if (!foodCodes.size) for (const it of catalog().items.values()) if (it.type === "consumable" && (it.effects ?? []).some((e) => e.code === "heal")) foodCodes.add(it.code);
  return foodCodes.has(code);
}
/** Settled point 6: the core's price with consumables 1 (reach.ts potionPrice). */
export function consPrice(world: World, name: string): Price {
  const free = consFree(world);
  const memo = new Map<string, number>();
  const price = (code: string): number => {
    let s = memo.get(code);
    // task 025, settled point 4: a restore or boost potion costs its chain whether the pool holds it or not — the price of a
    // potion the pool lacks, its whole chain from the field (makeChain) — so a set
    // drinks one only where it lowers the expected seconds a win at that price or lifts p over the floor. Decision 32's
    // "stock is free" ends for these codes; settled point 5: a cooked food too, at its chain (makeChain)
    if (s == null) memo.set(code, (s = free ? 0 : item(code)?.type === "utility" || isFood(code) ? makeChain(world, code) : available(code, world, name) > 0 ? 0 : chainSec(world, name, code)));
    return s;
  };
  // task 025, settled point 5: a fight eats the food of the pool that heals its loss the cheapest at that price — only where
  // eating (bis.ts healSeconds: the use, the units, the rest under one unit) beats resting; else it rests (`maxHp` unknown:
  // the old rule, the best-healing food the loss covers)
  const food = (lost: number, maxHp?: number): Food | undefined => {
    if (maxHp == null || free) return poolFood(world, name, lost);
    let best: Food | undefined, bestS = restSeconds(lost, maxHp);
    for (const f of poolFoods(world, name)) {
      if (f.hp > lost) continue;
      const s = healSeconds(lost, maxHp, price, f);
      if (s < bestS) { best = f; bestS = s; }
    }
    return best;
  };
  return { key: free ? "free" : "cons", price, covered: [], tag: free ? "free" : "cons", food };
}

// ── the needs (settled points 2, 3, 7) ───────────────────────────────────────

export interface ConsNeed {
  key: string;        // the parent's key: cons:<code>:<work key>
  code: string;
  food: boolean;
  for: string[];      // the characters on the work it is judged for
  work: string;       // "Second's road to combat 30", "the_reaper (skeleton)", "Skeleton Bone for …", "event bandit_camp"
  workKey: string;
  monster: string;
  perKill: number;    // units a kill takes
  kills: number;      // the kills of the work judged
  demand: number;     // units: HORIZON chunks + MARGIN for each character on it; an event: one spawn per member
  H0: number; H1: number; G: number;
  points: number; fit: number; any: number; hours: number;
  gated: Gated[];
  reserve: boolean;   // an event's: no other bill or fight step takes it
}

/** Task 014: the World a gear verdict is judged on — the bank without its potions (consumables 1; the World itself with 0):
 *  a bundle's win gates and win levels (bundle.ts), the needs' "nobody wins it safely" (the stock comes and goes). */
export const gearWorld = (world: World): World =>
  (world.config.consumables ?? 1) && (world.config.potionK ?? 1) !== 0 ? noStock(world, world.bank.filter((b) => item(b.code)?.type === "utility").map((b) => b.code)) : world;
const stockMemo = new WeakMap<World, Map<string, World>>();
/** The World with none of `codes` in the bank: the pool "without the consumable" of H0. */
export function noStock(world: World, codes: string[]): World {
  let m = stockMemo.get(world);
  if (!m) stockMemo.set(world, (m = new Map()));
  const k = [...codes].sort().join(",");
  let w = m.get(k);
  if (!w) m.set(k, (w = { ...world, bank: world.bank.filter((b) => !codes.includes(b.code)) }));
  return w;
}

/** Seconds a kill with every consumable free (made already: G carries the making), eating `food` when given — task 025:
 *  the expected seconds a win of the set `r` (reach.ts winSecOf: a loss priced in). */
const freeSec = (r: GearRecommendation, ch: Character, world: World, monster: string, food?: Food): number =>
  winSecOf(r, world, ch.name, monster, () => 0, food ? () => food : undefined) + killWalk(ch, world, monster);

const emptyMemo = new WeakMap<World, World>();
/** The World with an empty bank: the chain's price with the stock ignored — a need's potion set is priced on it, so the
 *  stock coming and going changes none of its solves (the making of the stock is the need's G). */
function emptyOf(world: World): World {
  let w = emptyMemo.get(world);
  if (!w) emptyMemo.set(world, (w = { ...world, bank: [] }));
  return w;
}

/** Levels above a character a potion is asked to flip a fight (a bound: the solve with every potion is the dearest). */
export const POTION_REACH = 3;
/** The set of the pool's gear with every potion the character may drink a candidate at the chain's price, the stock left
 *  out (reach.ts potionRec): what wins once the potions are made — their making is the need's G. */
export function potionSet(ch: Character, world: World, monster: string, fleet = false): GearRecommendation | undefined {
  // shortcut: a potion is asked to flip a fight up to POTION_REACH levels above the character; upgrade if one ever flips
  // a monster further up (the gear's ten-level look, reach.ts winLevel, is unchanged)
  if ((monsterOf(monster)?.level ?? Infinity) > ch.level + POTION_REACH) return undefined;
  const bare = emptyOf(world);
  const price = (c: string): number => chainSec(bare, ch.name, c);
  const r = potionRec(ch, world, monster, potionCands(ch).filter((c) => Number.isFinite(price(c))), price, fleet);
  return r && admits(r, world) ? r : undefined;
}
/** The making hours of `qty` units (G): the bill, its level roads in it; undefined when it cannot be made. */
function making(world: World, name: string, code: string, qty: number): { G: number; gated: Gated[] } | undefined {
  const b = billOf(world, name, [[code, qty]]);
  return b.out.length || !Number.isFinite(b.hours) ? undefined : { G: b.hours, gated: b.gated.filter((g) => Number.isFinite(g.hours)) };
}
/** The food a need may ask for: the cheapest a HP by its chain (one unit at least eaten a fight). */
function foodFor(ch: Character, world: World, lost: number, name: string): { code: string; hp: number; n: number } | undefined {
  let best: { code: string; hp: number; n: number; s: number } | undefined;
  const mats = parentMats(world, name);
  for (const f of foodCands(ch)) {
    if (item(f.code)?.craft?.items.some((g) => mats.has(g.code))) continue; // never from an open parent's own material
    const n = Math.floor(lost / f.hp);
    const s = chainSec(world, ch.name, f.code) / f.hp;
    if (n >= 1 && Number.isFinite(s) && (!best || s < best.s)) best = { ...f, n, s };
  }
  return best;
}

/** The work a need is judged for (one character's run of fights at one monster). */
interface Work0 { ch: Character; by: string; monster: string; work: string; workKey: string; points: number; reserve?: boolean; horizon: (sec: number) => number }
/** One need when G + H1 ≤ NEED_RATIO × H0 (settled point 2): `kills` of the work take `u` units each. */
function needOf(w: Work0, world: World, code: string, food: boolean, u: number, kills: number, H0: number, H1: number, sec: number): ConsNeed | undefined {
  if (!(kills > 0) || !(u > 0)) return undefined;
  const mk = making(world, w.ch.name, code, kills * u);
  if (!mk || !(mk.G + H1 <= NEED_RATIO * H0)) return undefined;
  return { key: `cons:${code}:${w.workKey}`, code, food, for: [w.ch.name], work: w.work, workKey: w.workKey, monster: w.monster, perKill: u, kills, demand: Math.min(w.horizon(sec), kills) * u * MARGIN, H0, H1, G: mk.G, points: w.points, fit: 0, any: 0, hours: mk.G + H1, gated: mk.gated, reserve: !!w.reserve };
}
/** A fixed run of `kills` kills (works b, c, d): the potions of the set that wins with them (H0 `h0`: the pool now), and
 *  the food of the set it fights with (H0: the same run, healing as the pool heals now). */
function judgeRun(w: Work0, world: World, kills: number, h0: number): ConsNeed[] {
  const out: ConsNeed[] = [];
  const { ch, monster } = w;
  const r1 = potionSet(ch, world, monster);
  const food0 = (f: FightForecast): Food | undefined => potionPrice(world, ch.name).food?.(lostOf(f), f.maxHp);
  if (r1) {
    const sec1 = freeSec(r1, ch, world, monster, food0(r1.forecast));
    for (const [p, u] of Object.entries(r1.forecast.used)) {
      const n = needOf(w, world, p, false, u, kills, available(p, world, ch.name) > 0 ? h0Without(w, world, p, kills, h0) : h0, (kills * sec1) / 3600, sec1);
      if (n) out.push(n);
    }
  }
  const base = r1 ?? (admitted(ch, world, monster) ? fightRec(ch, world, monster) : undefined);
  if (base) {
    const lost = base.forecast.maxHp - base.forecast.hpRemaining, pick = foodFor(ch, world, lost, w.by);
    if (pick) {
      const secF = freeSec(base, ch, world, monster, pick), sec0 = freeSec(base, ch, world, monster, food0(base.forecast));
      const n = needOf(w, world, pick.code, true, pick.n, kills, (kills * sec0) / 3600, (kills * secF) / 3600, secF);
      if (n) out.push(n);
    }
  }
  return out;
}
/** H0 of a fixed run on the pool without the potion: ∞ unless the pool still is admitted then. */
function h0Without(w: Work0, world: World, p: string, kills: number, h0: number): number {
  if (!Number.isFinite(h0)) return h0;
  const w0 = noStock(world, [p]);
  return admitted(w.ch, w0, w.monster) ? (kills * actionSec({ kind: "kill", monster: w.monster }, w.ch, w0)) / 3600 : Infinity;
}

const matMemo = new WeakMap<World, Map<string, Set<string>>>();
/** What the open parents (objectives, gear pieces) ask for: a food made of one is no candidate (settled point 2). */
function parentMats(world: World, name: string): Set<string> {
  let byName = matMemo.get(world);
  if (!byName) matMemo.set(world, (byName = new Map()));
  let out = byName.get(name);
  // the parents' demand and every open objective's own inputs (one sourced inside its own step is no parent)
  if (!out) byName.set(name, (out = new Set([...baseParents(world, name).flatMap((p) => p.demand.map(([c]) => c)), ...targetsOf(world).flatMap((t) => (t.achievement ? (t.inputs ?? []).map((i) => i.code) : []))])));
  return out;
}

const needMemo = new WeakMap<World, Map<string, ConsNeed[]>>();
/** Every consumable need of the World's works (characters that are on). `name` is the deciding character (in flight
 *  counts the others' steps, as gear.ts gearNeeds). Memoised per World and name. Nothing with consumables 0 or free. */
export function consumableNeeds(world: World, name = ""): ConsNeed[] {
  if (!cons(world) || consFree(world)) return [];
  let byName = needMemo.get(world);
  if (!byName) needMemo.set(world, (byName = new Map()));
  const hit = byName.get(name);
  if (hit) return hit;
  byName.set(name, []); // re-entered: none for that turn
  const out: ConsNeed[] = [];
  const calH = calHOf(world);
  const xpNeeded = atlas()?.xpNeeded ?? [];
  const chunks = (sec: number): number => (HORIZON * CHUNK_SEC) / sec;
  const byLevel = [...world.characters].filter((c) => isOn(c.name, world)).sort((a, b) => b.level - a.level || (a.name < b.name ? -1 : 1));
  // "nobody wins it safely" is asked of the pool without its potions: a need holds while its stock is drunk (the stock is
  // shared from the best work down, reservable), not only until the first potions are made
  const bare = gearWorld(world);

  // (a) each fighter's road to its next combat gate, judged on its next ten levels (gear.ts (a)): H0 on the pool without
  // the potions it holds, level by level; H1 per level the better of that and the potion monster's run
  for (const ch of byLevel) {
    const b = fights(ch.name, world) ? bundleOf("combat", ch.name, world) : null; // task 027: a worker has no combat road
    if (!b) continue;
    const L = ch.level, end = Math.min(b.next, L + 10);
    const w0 = bare; // the pool without its potions (one World a decision: its solves hold still while the stock moves)
    const own0 = (l: number): number => levelHoursEstimate("combat", l, w0, ch);
    let H0 = 0, rest = 0, pace = Infinity, unpaced = 0;
    for (let l = L; l < b.next; l++) {
      const h = own0(l);
      if (Number.isFinite(h)) pace = h;
      if (l < end) H0 += h;
      else if (Number.isFinite(pace)) rest += Number.isFinite(h) ? h : pace;
      else unpaced++;
    }
    /** The road at a monster, a kill of `sec` in a set of wisdom `wis`: per level (`min`) the better of it and the pool's. */
    const road = (mc: string, sec: number, wis: number, min: boolean): { h: number; kills: number } => {
      const m = monsterOf(mc)!;
      let h = 0, kills = 0;
      for (let l = L; l < end; l++) {
        const xp = fightXp(m.level, m.hp, m.type, l, wis), hl = xp > 0 ? (xpNeeded[l] ?? Infinity) / ((xp / sec) * 3600) : Infinity;
        if (!min || hl < own0(l)) { h += hl; kills += xp > 0 ? (xpNeeded[l] ?? 0) / xp : 0; } else h += own0(l);
      }
      return { h, kills };
    };
    const w: Work0 = { ch, by: name, monster: "", work: `${ch.name}'s road to combat ${b.next}`, workKey: `lvl:combat:${b.next}@${ch.name}`, points: b.behind.reduce((s, x) => s + x.points, 0), horizon: chunks };
    const score = (n: ConsNeed): ConsNeed => {
      const s = bundleScore(b, n.G + n.H1 + rest + (unpaced * n.H1) / Math.max(1, end - L), calH);
      return { ...n, fit: s.fit, any: s.any, hours: s.hours };
    };
    const ok = (code: string): boolean => { const m = monsterOf(code); return !!m && m.type !== "boss" && m.type !== "raid_boss" && fightXp(m.level, m.hp, m.type, L) > 0 && !!nearestSpot(placeOf(ch), "monster", code, world); };
    const cur = pickMonster(ch, w0, new Set());
    const flips = [...catalog().monsters.values()].filter((m) => m.level <= L + 2 && ok(m.code) && !admitted(ch, w0, m.code))
      .sort((x, y) => fightXp(y.level, y.hp, y.type, L) - fightXp(x.level, x.hp, x.type, L) || (x.code < y.code ? -1 : 1)).slice(0, 2).map((m) => m.code); // the pick and two flips (gear.ts (a) looks at four: a potion solve is dearer)
    let best: ConsNeed[] = [], bestH = Infinity;
    for (const mc of [...new Set([cur?.monster ?? "", ...flips])].filter(Boolean)) {
      const r1 = potionSet(ch, world, mc);
      if (!r1) continue;
      const sec1 = freeSec(r1, ch, world, mc, potionPrice(world, ch.name).food?.(lostOf(r1.forecast), r1.forecast.maxHp));
      const r = road(mc, sec1, setWisdom(ch, r1), true);
      const ns = Object.entries(r1.forecast.used).flatMap(([p, u]) => { const n = needOf({ ...w, monster: mc }, world, p, false, u, r.kills, H0, r.h, sec1); return n ? [score(n)] : []; });
      const h = ns.reduce((s, n) => Math.min(s, n.G + n.H1), Infinity);
      if (ns.length && h < bestH) { best = ns; bestH = h; }
    }
    out.push(...best);
    // the food of the road at its pick (the pool's set now): eating it against the pool's healing now
    const pick = pickMonster(ch, world, new Set());
    const base = pick && fightRec(ch, world, pick.monster);
    if (pick && base) {
      const lost = base.forecast.maxHp - base.forecast.hpRemaining, f = foodFor(ch, world, lost, name);
      if (f) {
        const wis = setWisdom(ch, base);
        const r0 = road(pick.monster, freeSec(base, ch, world, pick.monster, potionPrice(world, ch.name).food?.(lost, base.forecast.maxHp)), wis, false);
        const secF = freeSec(base, ch, world, pick.monster, f), r1 = road(pick.monster, secF, wis, false);
        const n = needOf({ ...w, monster: pick.monster }, world, f.code, true, f.n, r1.kills, r0.h, r1.h, secF);
        if (n) out.push(score(n));
      }
    }
  }

  // (b) open kill objectives nobody that is on is admitted now: the fleet's work (gear.ts (b)), by the highest-level
  // character that wins it with a potion
  const others = Object.entries(world.current).filter(([n, s]) => n !== name && s).map(([, s]) => s!);
  const inFlight = (key: string): number => others.reduce((t, s) => t + (s.target === key && s.as !== "level" && s.as !== "fallback" ? s.units : 0), 0);
  for (const t of targetsOf(world)) {
    if (t.work.kind !== "kill" || !t.achievement || t.filler || t.gates.some((g) => g.kind === "event")) continue;
    const m = monsterOf(t.work.monster), left = t.left - inFlight(t.key);
    if (!m || left <= 0 || m.type === "boss" || m.type === "raid_boss") continue;
    const able = byLevel.filter((ch) => fights(ch.name, world) && m.level <= ch.level + 10 && t.gates.every((g) => g.kind === "win" || met(g, ch, world)));
    if (!able.length || able.some((ch) => admitted(ch, bare, m.code))) continue;
    const ch = able.find((c) => potionSet(c, world, m.code));
    if (!ch) continue;
    const kills = left * perOf(t.work);
    const pts = t.points * (world.config.weight[t.achievement] ?? 1);
    const rest = achHours(t.achievement, ch.name, world) - (kills * actionSec({ kind: "kill", monster: m.code }, ch, world)) / 3600;
    for (const n of judgeRun({ ch, by: name, monster: m.code, work: t.achievement, workKey: t.key, points: pts, horizon: chunks }, world, kills, Infinity)) {
      const hours = n.hours + (Number.isFinite(rest) ? Math.max(0, rest) : 0);
      out.push({ ...n, hours, fit: hours <= calH ? pts / hours : 0, any: pts / hours });
    }
  }

  // (c) the hunt of an open parent's src: leaf whose source is a monster nobody that is on is admitted now
  for (const s of supplyNeeds(world, name, baseParents(world, name), () => 0)) {
    const src = sourceFor(s.code);
    if (s.kind !== "src" || typeof src === "string" || src.work.kind !== "kill" || src.gates.some((g) => g.kind === "event")) continue;
    const m = monsterOf(src.work.monster);
    if (!m || m.type === "boss" || m.type === "raid_boss" || byLevel.some((ch) => admitted(ch, bare, m.code))) continue;
    const ch = byLevel.find((c) => m.level <= c.level + 10 && potionSet(c, world, m.code));
    if (!ch) continue;
    for (const n of judgeRun({ ch, by: name, monster: m.code, work: `${itemName(s.code)} for ${s.parent.label}`, workKey: s.key, points: s.parent.points, horizon: chunks }, world, s.short, Infinity)) {
      out.push({ ...n, fit: s.parent.fit, any: s.parent.any, hours: s.parent.hours });
    }
  }

  // (d) settled point 7: an event with open demand that can still pay — one spawn's fights for each member today; a reserve
  if (world.config.events ?? 1) for (const ev of catalog().events.values()) {
    if (ev.content.type !== "monster") continue;
    const m = monsterOf(ev.content.code);
    if (!m || m.type === "boss" || m.type === "raid_boss") continue;
    const d = eventDemand(ev, world, name);
    if (!(d.actions > 0)) continue;
    const use = usableSec(ev), pts = Math.max(0, ...d.items.filter((i) => i.fits).map((i) => i.points));
    const byCode = new Map<string, ConsNeed>();
    for (const ch of byLevel) {
      if (m.level > ch.level + 10) continue;
      const h0 = admitted(ch, bare, m.code) ? (d.actions * actionSec({ kind: "kill", monster: m.code }, ch, bare)) / 3600 : Infinity;
      for (const n of judgeRun({ ch, by: name, monster: m.code, work: `event ${ev.code}`, workKey: `event:${ev.code}`, points: pts, reserve: true, horizon: (sec) => use / sec }, world, d.actions, h0)) {
        const one = Math.min(n.demand, n.food ? Infinity : STACK); // a trip carries a slot's stack of a potion at most
        const e = byCode.get(n.code);
        if (e) { e.demand += one; e.for.push(ch.name); } else byCode.set(n.code, { ...n, demand: one, fit: d.score, any: d.score, hours: n.G + n.H1 });
      }
    }
    out.push(...byCode.values());
  }
  byName.set(name, out);
  return out;
}

const baseMemo = new WeakMap<World, Map<string, Parent[]>>();
/** The parents rank() opens before the consumables: the objective parents and the gear pieces (events.ts materialNeeds). */
export function baseParents(world: World, name: string): Parent[] {
  let byName = baseMemo.get(world);
  if (!byName) baseMemo.set(world, (byName = new Map()));
  let out = byName.get(name);
  if (!out) {
    out = objectiveParents(world, name, calHOf(world));
    const others = Object.entries(world.current).filter(([n, s]) => n !== name && s).map(([, s]) => s!);
    for (const [code, p] of gearPieces(world, name)) {
      const qty = [...p.copies.values()].reduce((s, x) => s + x, 0) - others.reduce((t, s) => t + (s.target === `gear:${code}` ? s.units : 0), 0);
      if (qty > 0) out.push(pieceParent(code, p, qty, world, name));
    }
    byName.set(name, out);
  }
  return out;
}

/** Settled point 3: each need as a parent of supply — its demand (the horizon), its work's score on every link; an
 *  event's is a reserve (supply.ts supplyNeeds serves it first, as a floor comes off before any parent). */
export function consParents(world: World, name: string): Parent[] {
  return consumableNeeds(world, name).map((n) => ({
    key: n.key, label: `${itemName(n.code)} ×${Math.ceil(n.demand)} for ${n.work} (${monsterOf(n.monster)?.name ?? n.monster}, ${n.reserve ? "one spawn" : `${HORIZON} chunks`})`,
    points: n.points, fit: n.fit, any: n.any, hours: n.hours, demand: [[n.code, n.demand]], gated: n.gated, reserve: n.reserve,
  }));
}

/** Settled point 3: the stock of `code` a fight step of a work scoring (fit, any) may take — what the character may plan
 *  with, less the demand of an event's reserve and of every work that scores better. */
export function reservable(world: World, name: string, code: string, fit: number, any: number, monster?: string): number {
  let left = available(code, world, name);
  for (const n of consumableNeeds(world, name)) {
    if (n.code !== code || !(n.reserve || n.fit > fit || (n.fit === fit && n.any > any))) continue;
    // task 025: a need of this very fight (its monster, this character) holds no stock back from it — the two price its
    // chain apart by a hair once a potion costs its chain, and the stock went to nobody (scenario consumables-run-dry)
    if (monster && !n.reserve && n.monster === monster && n.for.includes(name)) continue;
    left -= Math.min(left, n.demand);
  }
  return left;
}

/** A fight step's consumables (settled point 4). */
export interface Take {
  kills: number;                     // what the reservable stock covers (the kills asked when no potion is in the set)
  stock?: number;                    // task 017: the kills the bank's potions cover, the others' running steps off (none: no potion in the set)
  sec?: number;                    // a kill's seconds when the set changed (its potions could not be stocked)
  rec?: GearRecommendation;          // that set
  withdraw?: Record<string, number>; // the potions and food the step takes from the bank (its expected units + MARGIN)
  note: string;                      // for the why
}
/**
 * The consumables a kill step of `kills` kills plans (settled point 4): the potions its set drinks and the food it eats,
 * for its kills + MARGIN, out of what a work scoring (fit, any) may reserve; the kills capped at what the potions
 * cover. Nothing covered: the set of the gear alone (gearWorld), when it wins, at its own price; undefined: no set.
 */
export function fightTake(world: World, ch: Character, monster: string, kills: number, fit: number, any: number): Take | undefined {
  if (!cons(world) || consFree(world)) return { kills, note: "" };
  let w = world;
  let r = fightRec(ch, w, monster);
  if (!r) return { kills, note: "" };
  let used = perWin(r);
  let K = kills, changed = false;
  const res = new Map(used.map(([p]) => [p, reservable(world, ch.name, p, fit, any, monster)]));
  // a utility slot holds STACK of a potion (the game's 484): a step carries no more
  for (const [p, u] of used) K = Math.min(K, Math.floor(Math.min(res.get(p)!, STACK) / (u * MARGIN) + 1e-9));
  // task 017, settled point 13: what the bank holds of its potions less the others' running steps (stock.ts available) —
  // the sliver test (decide.ts fightPlan); not what better works' demand leaves, which starves a fighter's road
  let stock: number | undefined;
  if (used.length) stock = used.reduce((k, [p, u]) => Math.min(k, Math.floor(Math.min(available(p, world, ch.name), STACK) / (u * MARGIN) + 1e-9)), kills);
  if (used.length && K < 1) {
    stock = undefined;
    w = gearWorld(world); // the set of the gear alone (one World a decision, shared with the bundles' gates)
    const r2 = fightRec(ch, w, monster);
    if (!r2 || !admits(r2, w)) return undefined;
    r = r2;
    used = perWin(r);
    if (used.length) return undefined; // shortcut: a set of other potions is not stocked here; upgrade if one ever wins only with it
    K = kills;
    changed = true;
  }
  // Task 015, settled point 7: the food is the best-healing one of the stock a work of this score may reserve that the
  // fight's loss covers at least once; at most a third of the bag, and the kills are capped by it as by a potion stack
  const lost = lostOf(r.forecast);
  // task 025, settled point 5: the food the price chooses (eating beats resting at its chain), when this work may reserve it
  const pick0 = potionPrice(world, ch.name).food?.(lost, r.forecast.maxHp);
  const food = pick0 && reservable(world, ch.name, pick0.code, fit, any, monster) >= 1 ? pick0 : undefined;
  const n = food ? foodPerWin(r, food) : 0;
  const bag = Math.floor(ch.inventory_max_items / 3);
  let capped = false;
  if (food && n > 0 && Math.min(Math.ceil(n * K * MARGIN - 1e-9), Math.floor(reservable(world, ch.name, food.code, fit, any, monster))) > bag) {
    const Kf = Math.floor(bag / (n * MARGIN) + 1e-9);
    if (Kf >= 1 && Kf < K) { K = Kf; capped = true; }
  }
  const withdraw: Record<string, number> = {};
  for (const [p, u] of used) withdraw[p] = Math.min(Math.ceil(u * K * MARGIN - 1e-9), Math.floor((res.get(p) ?? Infinity) + 1e-9)); // whole units the stock holds
  if (food && n > 0) {
    const q = Math.min(Math.ceil(n * K * MARGIN - 1e-9), Math.floor(reservable(world, ch.name, food.code, fit, any, monster)), bag);
    if (q > 0) withdraw[food.code] = q;
  }
  const took = Object.entries(withdraw).map(([c, q]) => `${q} ${itemName(c)}`);
  const bagNote = capped && food ? `; the bag caps it at ${K} kills (${n} ${itemName(food.code)} a kill, ${bag} is a third of ${ch.inventory_max_items})` : "";
  const note = took.length ? ` with ${took.join(" and ")} from the bank` + (withdraw[food?.code ?? ""] ? bagNote : lost > 0 ? `; rests (${restWhy(world, ch, lost)})` : "")
    : lost > 0 ? `; rests (${restWhy(world, ch, lost)})` : "";
  return { kills: K, stock, ...(changed ? { sec: freeSec(r, ch, w, monster, food), rec: r } : {}), withdraw: took.length ? withdraw : undefined, note };
}
/** Task 025: a set's potions per WIN — every attempt drinks its forecast's units and a win takes 1 ÷ p attempts. */
function perWin(r: GearRecommendation): [string, number][] {
  const p = r.p > 0 ? r.p : 1;
  return Object.entries(r.forecast.used).filter(([, u]) => u > 0).map(([c, u]) => [c, u / p]);
}
/** Task 025: units of `food` per WIN — a won attempt eats what its loss takes (whole units), a lost one what waking at 1 HP
 *  takes; (1 − p) ÷ p lost attempts a win. */
function foodPerWin(r: GearRecommendation, food: Food): number {
  const won = Math.floor(lostOf(r.forecast) / food.hp), p = r.p > 0 ? r.p : 1;
  return won + ((1 - p) / p) * Math.floor((r.forecast.maxHp - 1) / food.hp);
}

/** Why a fight rests (settled point 6's "rest otherwise", made-up case "no cook at the level"). */
function restWhy(world: World, ch: Character, lost: number): string {
  const need = consumableNeeds(world, ch.name).find((n) => n.food && n.for.includes(ch.name));
  if (need) return `${itemName(need.code)} is needed for ${need.work}, not in the bank yet`;
  const cands = foodCands(ch).filter((f) => f.hp <= lost);
  if (!cands.length) return "no food heals so little";
  // task 025: the chain's static price (makeChain), not the World's bill — this is a note's text, and the bill of every
  // food a World was 28 s of 121 in three days of the road
  if (!cands.some((f) => Number.isFinite(makeChain(world, f.code)))) {
    const cook = crafterOf("cooking", world), r = item(cands[0].code)?.craft;
    return !cook || !isOn(cook, world) ? `no cook is on to make ${itemName(cands[0].code)} or any other food` : `no cook at ${r?.skill} ${r?.level} for ${itemName(cands[0].code)}, nor any other food made`;
  }
  return `no food pays: at its chain, eating costs more than resting`;
}

/** Settled point 8: what a step's fights drink and eat in the forward model — its consumables (a kill step's `withdraw`,
 *  an event step's) less MARGIN, never more than the bank holds less the others' reservations. */
export function consumed(world: World, step: Step): Map<string, number> {
  const out = new Map<string, number>();
  if (step.work.kind !== "kill") return out;
  for (const [code, q] of Object.entries(step.withdraw ?? {})) {
    // task 017: a toll's gold, keys and carried item ride in the withdraw too; advance pays the toll itself
    if (code === "gold" || (step.toll && (code in step.toll.keys || code in step.toll.carried))) continue;
    const n = Math.min(q / MARGIN, Math.max(0, available(code, world, step.character)));
    if (n > 1e-9) out.set(code, n);
  }
  return out;
}
/** Settled point 7: what one kill of a member takes — the potions its set drinks and the food it eats (its pool's). */
export function useOf(world: World, ch: Character, monster: string): Record<string, number> | undefined {
  if (!cons(world) || consFree(world)) return undefined;
  const r = fightRec(ch, world, monster);
  if (!r) return undefined;
  const out: Record<string, number> = {};
  for (const [p, u] of perWin(r)) out[p] = u;
  const lost = lostOf(r.forecast), food = potionPrice(world, ch.name).food?.(lost, r.forecast.maxHp), n = food ? foodPerWin(r, food) : 0;
  if (food && n > 0) out[food.code] = n;
  return Object.keys(out).length ? out : undefined;
}
/** Task 025: what one kill takes with exactly this set (`codes`, its potions in) — a member on its trip wears its trip's set,
 *  not a fresh solve's (the potions a WIN: ÷ p, so a solve that drifts to another set drifts its count; check-event-stock). */
export function useOfSet(world: World, ch: Character, monster: string, codes: string[], foodCode?: string): Record<string, number> | undefined {
  if (!cons(world) || consFree(world)) return undefined;
  const m = monsterOf(monster);
  if (!m) return undefined;
  const fighter = applyGear(baseStats(ch), codes), forecast = simulate(fighter, m);
  const r = { codes, forecast, p: forecast.win && !forecast.timedOut ? winRate(fighter, m) : 0 } as GearRecommendation;
  const out: Record<string, number> = {};
  for (const [p, u] of perWin(r)) out[p] = u;
  const food = foodCode ? healingFoods(ch).find((f) => f.it.code === foodCode) : undefined;
  const n = food && food.heal <= lostOf(forecast) ? foodPerWin(r, { code: food.it.code, hp: food.heal }) : 0;
  if (food && n > 0) out[food.it.code] = n;
  return Object.keys(out).length ? out : undefined;
}
/** A member's consumables for `actions` kills (its per-kill use + MARGIN): what the trip's reset takes. */
export const takeOf = (use: Record<string, number> | undefined, actions: number): Record<string, number> | undefined =>
  use && Object.keys(use).length ? Object.fromEntries(Object.entries(use).map(([c, u]) => [c, Math.min(Math.ceil(u * actions * MARGIN - 1e-9), item(c)?.type === "utility" ? STACK : Infinity)])) : undefined;

// ── task 025, settled point 5: the healing rune ──────────────────────────────

/** The rune the plan wears and buys (only this one: the burn rune is read in the report only). */
export const RUNE = "healing_rune";
/** Alex (decision 61): healing runes may be bought for up to 50,000 gold in all. */
export const RUNE_GOLD = 50_000;
/** Settled point 5: a rune pays for a character when its fight work costs at least this share fewer expected seconds a win
 *  with it (or crosses the floor with it). */
export const RUNE_GAIN = 0.05;
/** The rune's seller and price, from the catalog (public/data/npcs.json: the Rune Vendor at (8, 13), always there; 10,000
 *  gold on 2026-11-04's snapshot). */
export function runeOffer(): { npc: string; price: number } | undefined {
  for (const n of catalog().npcs.values()) for (const o of n.items ?? []) if (o.code === RUNE && o.currency === "gold" && o.buy_price != null) return { npc: n.code, price: o.buy_price };
  return undefined;
}
/** The healing runes the fleet holds: worn, in the bags, in the bank. */
export function runesHeld(world: World): number {
  let n = world.bank.reduce((t, b) => t + (b.code === RUNE ? b.quantity : 0), 0) + (world.bags?.[RUNE] ?? 0);
  for (const ch of world.characters) n += (ch.rune_slot === RUNE ? 1 : 0) + (ch.inventory ?? []).reduce((t, s) => t + (s.code === RUNE ? s.quantity : 0), 0);
  return n;
}
const hasRune = (ch: Character): boolean => ch.rune_slot === RUNE || (ch.inventory ?? []).some((s) => s.code === RUNE && s.quantity > 0);
/** The character with a healing rune worn (its stats unchanged: healing is a combat effect, no stat). */
const withRune = (ch: Character): Character => ({ ...ch, rune_slot: RUNE });
export interface RuneVerdict { pays: boolean; why: string; monster?: string }
const runeMemo = new WeakMap<World, Map<string, RuneVerdict>>();
/**
 * Task 025, settled point 5: whether the planner buys this character a healing rune now — it holds none; the fleet's runes
 * stay inside RUNE_GOLD at the price; the bank's gold after it still covers GOLD_FLOOR, the others' reservations (fares) and
 * the next expansion when one is due under its cap; and its fight work — its XP pick and the kill step it is on — costs at
 * least RUNE_GAIN fewer expected seconds a win with it, or crosses the floor with it (with no XP pick at all: an XP monster
 * the rune admits). Memoised per World and name.
 */
export function runePays(world: World, name: string): RuneVerdict {
  let m = runeMemo.get(world);
  if (!m) runeMemo.set(world, (m = new Map()));
  let v = m.get(name);
  if (v) return v;
  v = judgeRune(world, name);
  m.set(name, v);
  return v;
}
function judgeRune(world: World, name: string): RuneVerdict {
  const ch = world.characters.find((c) => c.name === name);
  const offer = runeOffer();
  if (!ch || !offer || !isOn(name, world) || ch.level < 20) return { pays: false, why: "—" };
  if (hasRune(ch)) return { pays: false, why: "holds one" };
  if ((runesHeld(world) + 1) * offer.price > RUNE_GOLD) return { pays: false, why: `the fleet holds ${runesHeld(world)}: another would pass ${RUNE_GOLD.toLocaleString("en-US")} gold` };
  const due = (world.nextExpansion ?? Infinity) <= (world.config.expansionCap ?? 60_000) ? world.nextExpansion! : 0;
  if (available("gold", world, name) - offer.price < due) return { pays: false, why: `the gold after it would not cover the floor, the fares and the next expansion` };
  const r1 = withRune(ch);
  const monsters = new Set<string>();
  const pick = pickMonster(ch, world, new Set());
  if (pick) monsters.add(pick.monster);
  const cur = world.current[name];
  if (cur?.work.kind === "kill") monsters.add(cur.work.monster);
  for (const mc of monsters) {
    const a0 = fightRec(ch, world, mc), a1 = fightRec(r1, world, mc);
    if (!a1 || !admits(a1, world)) continue;
    if (!admits(a0, world)) return { pays: true, monster: mc, why: `${monsterOf(mc)?.name ?? mc}: crosses the floor with it (p ${Math.round(100 * (a0?.p ?? 0))}% → ${Math.round(100 * a1.p)}%)` };
    const e0 = winSecOf(a0!, world, name, mc), e1 = winSecOf(a1, world, name, mc);
    if (e1 <= (1 - RUNE_GAIN) * e0) return { pays: true, monster: mc, why: `${monsterOf(mc)?.name ?? mc}: ${Math.round(e0)} → ${Math.round(e1)} s a win with it (−${Math.round((100 * (e0 - e1)) / e0)}%)` };
  }
  if (!pick) {
    const p1 = pickMonster(r1, world, new Set());
    if (p1) return { pays: true, monster: p1.monster, why: `no XP monster is admitted without it; with it ${monsterOf(p1.monster)?.name ?? p1.monster}` };
  }
  return { pays: false, why: monsters.size ? "its fight work gains less than 5%" : "no fight work" };
}
/** The forward model's purchase: the bank pays the price, the character wears the rune (the merchant interrupt's buy and
 *  equip in play). */
export function runeBought(world: World, name: string): World {
  const offer = runeOffer();
  if (!offer) return world;
  return { ...world, bankGold: world.bankGold - offer.price, characters: world.characters.map((c) => (c.name === name ? withRune(c) : c)) };
}
