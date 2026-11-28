// Where things are and who reaches them, plus the two memoised solver calls the
// planner leans on. Pure: catalog, atlas and the World only.
//
// Reach = a free route (src/plan/route.ts, FREE) from where the character stands to
// a static tile or a live event's tile that carries the content.
// For 008: state/loopkit.ts `nearest()` answers the same question from signals.

import { catalog, item, monster as monsterOf } from "../../catalog";
import { applyGear, baseStats } from "../../sim/stats";
import { simulate } from "../../sim/combat";
import { winRate } from "../../sim/monte";
import { FREE, route, travelSec } from "../route";
import type { May } from "../route";
import { MIN_WIN, bestInSlot, bisPools, canEquip, fightSig, killSeconds, lossSeconds, ownedPools, winSeconds } from "../bis";
import type { BisOptions, Food } from "../bis";
import { killLog } from "./config";
import { potionPriceOf, potionSec, wisdomOf } from "../xp";
import { PINNED_ARTIFACTS, jobGear, ownedQtyOf } from "../jobgear";
import { consPrice, fedPlan, potionCands, sentSec } from "./consumables";
import { available, poolBank } from "./stock";
import { roleOfCh } from "./roles";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../../types/api";
import type { BankItem, Character, GearSlot } from "../../types/api";
import type { GameMap, Transition } from "../../types/catalog";
import type { GearRecommendation } from "../types";
import type { FightVerdict, Place, Toll, World } from "./types";

/** Task 025: where a beaten character wakes — (0, 0) on the overworld (docs/design/planner.md:704; task 025's report reads
 *  it from play). */
export const WAKE: Place = { x: 0, y: 0, layer: "overworld" };
export const placeOf = (ch: Character): Place => ({ x: ch.x, y: ch.y, layer: (ch as { layer?: string }).layer ?? "overworld" });
const pkey = (p: Place): string => `${p.layer}:${p.x},${p.y}`;

const byContent = new WeakMap<GameMap[], Map<string, GameMap[]>>();
/** Static tiles carrying `type:code`, indexed once per catalog. */
export function staticTiles(type: string, code: string): GameMap[] {
  const maps = catalog().maps;
  let idx = byContent.get(maps);
  if (!idx) {
    idx = new Map();
    for (const m of maps) {
      const c = m.interactions?.content;
      if (c) idx.set(`${c.type}:${c.code}`, [...(idx.get(`${c.type}:${c.code}`) ?? []), m]);
    }
    byContent.set(maps, idx);
  }
  return idx.get(`${type}:${code}`) ?? [];
}

type Live = { tile: GameMap; until: number; event: string };
const liveMemo = new WeakMap<World, Map<string, Live[]>>();
/** Live event tiles carrying `type:code` at world.now (task 020: indexed once per World). */
export function eventTiles(type: string, code: string, world: World): Live[] {
  let byContent = liveMemo.get(world);
  if (!byContent) {
    liveMemo.set(world, (byContent = new Map()));
    for (const e of world.events) {
      const c = e.map.interactions?.content;
      const until = Date.parse(e.expiration);
      if (!c || !(until > world.now)) continue;
      const k = `${c.type}:${c.code}`;
      byContent.set(k, [...(byContent.get(k) ?? []), { tile: e.map, until, event: e.code }]);
    }
  }
  return byContent.get(`${type}:${code}`) ?? [];
}

// ── task 017: the transitions a character's plan may open ────────────────────

/** The conditional transitions of the map (a tile with a transition that has conditions), once per catalog. */
const condMemo = new WeakMap<GameMap[], { tile: GameMap; t: Transition; id: string }[]>();
function conditional(): { tile: GameMap; t: Transition; id: string }[] {
  const maps = catalog().maps;
  let c = condMemo.get(maps);
  if (!c) condMemo.set(maps, (c = maps.filter((m) => m.interactions?.transition?.conditions?.length).map((m) => ({ tile: m, t: m.interactions.transition!, id: `${m.layer}:${m.x},${m.y}` }))));
  return c;
}
/** A transition's id: the tile it is taken on. */
const tid = (t: Transition): string | undefined => conditional().find((c) => c.t === t)?.id;
/** A gold fare's way back: nothing when a free route leads home (the city) from where it lands, else (shortcut: the way
 *  back costs what the way in did — the island's boat both ways, the only paid way back on the map) the same fare. */
const backFare = (c: { tile: GameMap; t: Transition }, gold: number): number =>
  route({ x: c.t.x, y: c.t.y, layer: c.t.layer }, CITY, FREE) ? 0 : gold;
const mays = new Map<string, May>([["", FREE]]);
const mayKeys = new WeakMap<May, string>([[FREE, ""]]);
const mayMemo = new WeakMap<World, Map<string, May>>();
const done = (world: World, code: string): boolean => world.achievements.some((a) => a.code === code && (!!a.completed_at || a.objectives.every((o) => o.progress >= o.total)));
/**
 * Task 017, settled point 2: the transitions this character's plan may open — the free ones; one whose every condition
 * the plan can meet: an achievement that is done; a key (`cost` with an item) or a carried item (`has_item`) it may take
 * (stock.ts available, plus its own bag, plus its worn set for a carried item); a fare (`cost` with gold) the gold budget
 * covers with the way back (stock.ts available("gold"): bank gold less the others' reservations less GOLD_FLOOR).
 * config.tolls 0 or no name: FREE. One May object per set of open transitions (route.ts keeps its hops per May).
 */
export function mayOf(world: World, name?: string): May {
  if (!name || !(world.config.tolls ?? 1)) return FREE;
  let byName = mayMemo.get(world);
  if (!byName) mayMemo.set(world, (byName = new Map()));
  let may = byName.get(name);
  if (may) return may;
  const ch = world.characters.find((c) => c.name === name);
  const held = (code: string, worn: boolean): number =>
    available(code, world, name) + (ch ? (ownedQtyOf(ch, []).get(code) ?? 0) - (worn ? 0 : GEAR_SLOTS.reduce((t, g) => t + (slotCode(ch, g) === code ? 1 : 0), 0)) : 0);
  const open = conditional().filter((c) => c.t.conditions!.every((k) =>
    k.operator === "achievement_unlocked" ? done(world, k.code)
    : k.operator === "cost" && k.code === "gold" ? available("gold", world, name) >= k.value + backFare(c, k.value)
    : k.operator === "cost" ? held(k.code, false) >= k.value
    : k.operator === "has_item" ? held(k.code, true) >= k.value
    : false)).map((c) => c.id);
  const key = open.join(";");
  may = mays.get(key);
  if (!may) {
    const set = new Set(open);
    mays.set(key, (may = (t) => FREE(t) || set.has(tid(t) ?? "")));
    mayKeys.set(may, key);
  }
  byName.set(name, may);
  return may;
}

const routeMemo = new Map<string, number | null>();
/** Seconds from `from` to `to` by a route through the transitions `may` opens (default: the free ones), or undefined. */
export function travel(from: Place, to: Place, may: May = FREE): number | undefined {
  const k = `${mayKeys.get(may) ?? "?"}|${pkey(from)}>${pkey(to)}`;
  let s = routeMemo.get(k);
  if (s === undefined) {
    const legs = route(from, to, may);
    s = remember(routeMemo, k, legs ? travelSec(legs) : null);
  }
  return s ?? undefined;
}

/** Task 017: a spot behind conditional transitions carries the toll of its round trip (tollOf). */
export interface Spot { place: Place; sec: number; until?: number; event?: string; toll?: Toll }
const spotMemo = new Map<string, Spot | null>();
/** The nearest tile carrying the content that `from` reaches: static, or a live event's — by a free route, or (task 017,
 *  `name` given) through the transitions that character's plan may open (mayOf), its toll on the spot. */
export function nearestSpot(from: Place, type: string, code: string, world: World, name?: string): Spot | undefined {
  const may = mayOf(world, name);
  // task 020: what it reads — the transitions open (may), where from, the content and its live event tiles — is its key
  const live = eventTiles(type, code, world);
  const k = `${mayKeys.get(may) ?? "?"}|${pkey(from)}|${type}:${code}|${live.map((e) => `${pkey({ x: e.tile.x, y: e.tile.y, layer: e.tile.layer })}<${e.until}:${e.event}`).join(";")}`;
  const hit = caching ? spotMemo.get(k) : undefined;
  if (hit !== undefined) return hit ?? undefined;
  const r = spotOf(from, type, code, live, may);
  if (caching) remember(spotMemo, k, r ?? null);
  return r;
}
function spotOf(from: Place, type: string, code: string, live: Live[], may: May): Spot | undefined {
  let best: Spot | undefined;
  const consider = (t: GameMap, until?: number, event?: string): void => {
    if (t.access?.type === "blocked") return;
    const place = { x: t.x, y: t.y, layer: t.layer };
    const sec = travel(from, place, may);
    if (sec != null && (!best || sec < best.sec)) best = { place, sec, until, event };
  };
  for (const t of staticTiles(type, code)) consider(t);
  for (const e of live) consider(e.tile, e.until, e.event);
  if (best && may !== FREE) {
    const toll = tollThrough(best.place, may);
    if (toll?.via.length) best = { ...best, toll };
  }
  return best;
}

/** The city bank: where "reachable from the city" is asked when nobody in particular stands anywhere. */
export const CITY: Place = { x: 4, y: 1, layer: "overworld" };

const bankMemo = new Map<string, { sec: number; place?: Place }>();
/** The nearest bank a place reaches through `may` (the island's conditional bank is never taken, as `nearestBank`). */
function nearestBankOf(p: Place, may: May): { sec: number; place?: Place } {
  const k = `${mayKeys.get(may) ?? "?"}|${pkey(p)}`;
  let s = bankMemo.get(k);
  if (!s) {
    s = { sec: Infinity };
    for (const t of catalog().maps) {
      if (t.interactions?.content?.type !== "bank" || t.access?.type === "conditional") continue;
      const place = { x: t.x, y: t.y, layer: t.layer };
      const sec = travel(p, place, may);
      if (sec != null && sec < s.sec) s = { sec, place };
    }
    remember(bankMemo, k, s);
  }
  return s;
}
/** Task 023 (022's P0s): every transition open — the bank a tolled trip comes home to (the toll's round trip starts and
 *  ends at the bank nearest its place, never the island's conditional bank). */
const ALL_OPEN: May = () => true;
mayKeys.set(ALL_OPEN, "all");
export const homeBankOf = (p: Place): Place | undefined => nearestBankOf(p, ALL_OPEN).place;
/** Seconds from a place to the nearest bank it reaches by a free route (or through `may`). */
export const bankSec = (p: Place, may: May = FREE): number => nearestBankOf(p, may).sec;

const tollMemo = new Map<string, Toll | null>();
/**
 * Task 017, settled points 2 and 3: the round trip a step behind conditional transitions makes — from the bank nearest the
 * place (its reset), to the place and back — through the transitions this character's plan may open: the fares of both
 * ways, the keys the transitions consume, the item a transition wants carried (kept), the whole trip's seconds, and the
 * transitions' tiles. `via` empty: no conditional transition on the way. Undefined: no round trip.
 */
export const tollOf = (place: Place, world: World, name: string): Toll | undefined => tollThrough(place, mayOf(world, name));
/** Task 020: the toll is a function of the transitions open and the place — kept across Worlds on those. */
function tollThrough(place: Place, may: May): Toll | undefined {
  const k = `${mayKeys.get(may) ?? "?"}|${pkey(place)}`;
  const hit = caching ? tollMemo.get(k) : undefined;
  if (hit !== undefined) return hit ?? undefined;
  const bank = nearestBankOf(place, may).place;
  const out = bank && route(place, bank, may), back = bank && route(bank, place, may);
  let toll: Toll | null = null;
  if (out && back) {
    toll = { gold: 0, keys: {}, carried: {}, sec: travelSec(out) + travelSec(back), via: [] };
    for (const l of [...back, ...out]) {
      if (l.kind !== "transition" || !l.to.conditions?.length) continue;
      toll.via.push(`${l.layer}:${l.x},${l.y}`);
      for (const c of l.to.conditions) {
        if (c.operator === "cost" && c.code === "gold") toll.gold += c.value;
        else if (c.operator === "cost") toll.keys[c.code] = (toll.keys[c.code] ?? 0) + c.value;
        else if (c.operator === "has_item") toll.carried[c.code] = Math.max(toll.carried[c.code] ?? 0, c.value);
      }
    }
  }
  if (caching) remember(tollMemo, k, toll);
  return toll ?? undefined;
}
const GOLD_OPEN: May = (t) => FREE(t) || (t.conditions ?? []).every((c) => c.operator === "cost" && c.code === "gold");
mayKeys.set(GOLD_OPEN, "gold");
/** Task 017, settled point 4: how much gold the budget lacks for the cheapest round trip (from the city bank) to a tile
 *  carrying the content through free and paid transitions only; undefined: none that fares alone open (or tolls off). */
export function fareShort(world: World, type: string, code: string): number | undefined {
  if (!(world.config.tolls ?? 1)) return undefined;
  let best: number | undefined;
  for (const t of staticTiles(type, code)) {
    const p = { x: t.x, y: t.y, layer: t.layer }, there = route(CITY, p, GOLD_OPEN), back = route(p, CITY, GOLD_OPEN);
    if (!there || !back) continue;
    let fare = 0;
    for (const l of [...there, ...back]) if (l.kind === "transition") for (const c of l.to.conditions ?? []) if (c.code === "gold") fare += c.value;
    if (best == null || fare < best) best = fare;
  }
  return best == null ? undefined : best - available("gold", world, "");
}

/** Task 017: what a toll takes out of the bank — added to a step's `withdraw` (the reservation). */
export function withToll(withdraw: Record<string, number> | undefined, toll: Toll | undefined): Record<string, number> | undefined {
  if (!toll?.via.length) return withdraw;
  const out = { ...withdraw };
  for (const [c, q] of [["gold", toll.gold] as [string, number], ...Object.entries(toll.keys), ...Object.entries(toll.carried)]) if (q > 0) out[c] = (out[c] ?? 0) + q;
  return out;
}

// ── memoised solver calls ────────────────────────────────────────────────────
//
// Task 009 section 6: a character plans its gear with its pool — the bank less what the others' current steps
// reserved (stock.ts poolBank), plus what it holds. Task 020, settled point 3: a solve is exact — the table is keyed
// on everything bestInSlot reads (solveKey) and serves only an equal key, so a run's road does not depend on what was
// solved before it (scripts/check-road.mts: two runs in one process; check-planner: the caches off against on). Every
// table is bounded: at MEMO_CAP entries the oldest tenth (insertion order) is dropped.

export const MEMO_CAP = 100_000;
function remember<V>(m: Map<string, V>, k: string, v: V): V {
  if (m.size >= MEMO_CAP) {
    let n = MEMO_CAP / 10;
    for (const key of m.keys()) { m.delete(key); if (--n <= 0) break; }
  }
  m.set(k, v);
  return v;
}

let caching = true;
/** Task 020, settled point 3: the caches off — every solve fresh, and every memo that outlives a World (the gathering cut,
 *  supply.ts gateRoad) bypassed: the checks' proof that a run is exact. On by default; a switch empties them. */
export function setCaches(on: boolean): void {
  caching = on;
  solveMemo.clear();
  backMemo.clear();
  cutMemo.clear();
  spotMemo.clear();
  tollMemo.clear();
}
export const cachesOn = (): boolean => caching;

interface Pool { sig: string; qty: Map<string, number> }
const poolMemo = new WeakMap<BankItem[], WeakMap<Character, Pool>>();
/** The gear this character may plan with (its pool: bank less the others' reservations, plus its bag and worn set):
 *  only what it can equip at its level, and no more copies than one set can wear (two rings, one of anything else)
 *  — a spare copy changing hands changes no solve. */
function poolOf(ch: Character, world: World): Pool {
  const bank = poolBank(world, ch.name);
  let byCh = poolMemo.get(bank);
  if (!byCh) poolMemo.set(bank, (byCh = new WeakMap()));
  let p = byCh.get(ch);
  if (!p) {
    const qty = new Map<string, number>();
    for (const [c, q] of ownedQtyOf(ch, bank)) {
      const it = item(c);
      if (it && SLOTS_FOR_TYPE[it.type] && canEquip(ch, it)) qty.set(c, Math.min(q, it.type === "ring" ? 2 : 1));
    }
    p = { sig: [...qty].map(([c, q]) => `${c}:${q}`).sort().join(","), qty };
    byCh.set(ch, p);
  }
  return p;
}

const bareMemo = new WeakMap<Map<string, number>, Map<string, number>>();
/** A pool without its utility potions (planRec at a level above the character's own, task 014). */
const bareOf = (q: Map<string, number>): Map<string, number> => {
  let b = bareMemo.get(q);
  if (!b) bareMemo.set(q, (b = new Map([...q].filter(([c]) => item(c)?.type !== "utility"))));
  return b;
};

const statsMemo = new WeakMap<Character, string>();
const wornMemo = new WeakMap<Character, string>();
/** The base stats a solve starts from (sim/stats.ts baseStats) and the worn codes, per character object. */
const statsOf = (ch: Character): string => {
  let s = statsMemo.get(ch);
  if (s == null) statsMemo.set(ch, (s = Object.values(baseStats(ch)).join(",")));
  return s;
};
const wornOf = (ch: Character): string => {
  let s = wornMemo.get(ch);
  if (s == null) wornMemo.set(ch, (s = GEAR_SLOTS.map((g) => slotCode(ch, g)).join(",")));
  return s;
};

/** The slots bestInSlot searches: the weapon, the single slots, one pool for each group of like slots (bis.ts). */
const SEARCHED: GearSlot[] = ["weapon", "shield", "helmet", "body_armor", "leg_armor", "boots", "amulet", "rune", "bag", "ring1", "artifact1", "utility1"];
/**
 * Task 020, settled point 3: everything bestInSlot reads once its candidates per slot after the caps are known (bis.ts
 * bisPools: the pool, the extras, the caps, the heuristic against the monster): the monster, the base stats, those
 * candidates, the worn code of a slot the search can keep (its tiebreak; the worn weapon is always a weapon option) —
 * task 021: none for the planner's solves, which do not read what is worn (`worn: false`) —, the copies of each ring
 * candidate (the pair takes two at most), with the utility slots searched the price of each potion candidate
 * (killSeconds), and (task 021) the extras: the ladder's narrower candidates (bis.ts capPools) keep them past the caps.
 * Two asks with an equal key get the same set from bestInSlot.
 */
function solveKey(ch: Character, monster: string, pools: Record<GearSlot, string[]>, opts: BisOptions): string {
  const util = !opts.noUtilities;
  const price = opts.potionPrice ?? potionSec;
  const worn = opts.worn === false ? "-" : GEAR_SLOTS.map((g) => { const c = slotCode(ch, g); return c && (g === "weapon" || ((util || !g.startsWith("utility")) && pools[g].includes(c))) ? c : ""; }).join(",");
  const cands = SEARCHED.map((g) => (util || g !== "utility1" ? pools[g].join(",") : "-")).join("/");
  const rings = pools.ring1.map((c) => Math.min(2, opts.ownedQty?.get(c) ?? 3)).join(",");
  const prices = util ? pools.utility1.map((c) => price(c)).join(",") : "-";
  const pins = [...(opts.extraCandidates ?? [])].sort().join(",");
  return `${monster}|${statsOf(ch)}|${worn}|${cands}|${rings}|${prices}|${pins}|${opts.minWin ?? MIN_WIN}|${opts.wayBack ?? 0}|${(opts.fixed ?? []).join(",")}`;
}
const solveMemo = new Map<string, GearRecommendation | null>();
/** Counts for the measuring (task 020): asks, asks served within their World, keys looked up, keys served, solves. */
export const solveCounts = { asks: 0, askHits: 0, keys: 0, keyHits: 0, solves: 0 };
/** bestInSlot's best set, from the table only for an equal key (solveKey). */
const uncappedMemo = new WeakMap<Map<string, number>, WeakMap<Character, Map<string, Record<GearSlot, string[]>>>>();
/** Task 021 (speed): bis.ts ownedPools of an ask — the three solve calls own exactly their pool's codes — once per pool,
 *  character object and extras, not once a monster. */
function uncappedOf(ch: Character, opts: BisOptions): Record<GearSlot, string[]> | undefined {
  const q = opts.ownedQty;
  if (!caching || !q) return undefined;
  let byCh = uncappedMemo.get(q);
  if (!byCh) uncappedMemo.set(q, (byCh = new WeakMap()));
  let m = byCh.get(ch);
  if (!m) byCh.set(ch, (m = new Map()));
  const k = (opts.extraCandidates ?? []).join(",");
  let u = m.get(k);
  if (!u) m.set(k, (u = ownedPools(ch, opts)));
  return u;
}
function solve(ch: Character, monster: string, opts: BisOptions): GearRecommendation | undefined {
  const m = monsterOf(monster);
  if (!m) return undefined;
  const pools = bisPools(ch, m, opts, uncappedOf(ch, opts));
  if (!caching) return solveCounts.solves++, bestInSlot(ch, monster, opts, pools)[0];
  const k = solveKey(ch, monster, pools, opts);
  let r = solveMemo.get(k);
  solveCounts.keys++;
  if (r === undefined) solveCounts.solves++, (r = remember(solveMemo, k, bestInSlot(ch, monster, opts, pools)[0] ?? null));
  else solveCounts.keyHits++;
  return r ?? undefined;
}
const askMemo = new WeakMap<World, WeakMap<Character, Map<string, GearRecommendation | null>>>();
/** One ask (the table, the monster, the extras) of one character object in one World: everything it solves with is the
 *  World's and that object's, so its answer is kept per both — the thousands of asks of a decision solve once each. */
function asked(world: World, ch: Character, ask: string, f: () => GearRecommendation | undefined): GearRecommendation | undefined {
  if (!caching) return f();
  let byCh = askMemo.get(world);
  if (!byCh) askMemo.set(world, (byCh = new WeakMap()));
  let m = byCh.get(ch);
  if (!m) byCh.set(ch, (m = new Map()));
  let r = m.get(ask);
  solveCounts.asks++;
  if (r === undefined) m.set(ask, (r = f() ?? null));
  else solveCounts.askHits++;
  return r ?? undefined;
}
const atMemo = new WeakMap<Character, Map<number, Character>>();
/** The same character at another combat level: +5 max HP a level (the atlas's 115 + 5·L), gear the level allows.
 *  One object per (character, level), so the per-object memos (the pool, the base stats, the asks) hold. */
export function chAt(ch: Character, level: number): Character {
  if (level === ch.level) return ch;
  let m = atMemo.get(ch);
  if (!m) atMemo.set(ch, (m = new Map()));
  let c = m.get(level);
  if (!c) m.set(level, (c = { ...ch, level, max_hp: ch.max_hp + 5 * (level - ch.level) }));
  return c;
}

/** Task 015, settled point 7: `food` — the food eaten in a fight that loses `lost` HP (consumables.ts poolFood: the best of
 *  the pool the loss covers at least once); undefined: the fighter rests. */
export interface Price { key: string; price: (code: string) => number; covered: string[]; tag: string; food?: (lost: number, maxHp?: number) => Food | undefined }
const FIELD: Price = { key: "field", price: potionSec, covered: [], tag: "field" };
const scaledMemo = new Map<string, (code: string) => number>();
const priceMemo = new WeakMap<World, Map<string, Price>>();
/**
 * The price of a potion a fight drinks in the core, and (task 014) the food it eats. Task 014, settled point 6, with
 * config.consumables 1: one price, the chain's (consumables.ts consPrice) — a potion or a food the pool this character
 * may plan with holds costs nothing, any other its bill by the best-placed maker; a food in the pool is eaten (bis.ts
 * healSeconds), else the fighter rests. config.potionK 0 (row B): every consumable free and at hand.
 * With consumables 0, report 013's: xp.ts potionPriceOf over what this character may plan with (an ingredient covered
 * for 100 runs is free, the rest at the field price; task 012), × config.potionK; config.potionStock 0 = the field price
 * always. `key` names what is covered: the solve caches below are keyed on it. Memoised per World and name.
 */
export function potionPrice(world: World, name: string): Price {
  let byName = priceMemo.get(world);
  if (!byName) priceMemo.set(world, (byName = new Map()));
  let p = byName.get(name);
  if (p) return p;
  if (world.config.consumables ?? 1) {
    p = consPrice(world, name);
    byName.set(name, p);
    return p;
  }
  const base: Price = (world.config.potionStock ?? 1) ? { ...potionPriceOf((c) => available(c, world, name)), tag: "stock" } : FIELD;
  const k = world.config.potionK ?? 1;
  if (k === 1) p = base;
  else {
    const key = `${base.key}×${k}`;
    let f = scaledMemo.get(key);
    if (!f) scaledMemo.set(key, (f = (code) => base.price(code) * k));
    p = { key, price: f, covered: base.covered, tag: `${base.tag}×${k}` };
  }
  byName.set(name, p);
  return p;
}
/** Task 025, settled point 2: the floor of the World's config (config.risk.minWin; a stored "safe"/"win" of the old
 *  config reads as the default). */
export const minWinOf = (world: World): number => (typeof world.config.risk === "object" && world.config.risk?.minWin != null ? world.config.risk.minWin : MIN_WIN);
const backMemo = new Map<string, { sec: number; gold: number; keys: Record<string, number> } | null>();
/** Task 025, settled point 2: a lost attempt's way back — from WAKE to the monster's nearest tile through the transitions
 *  this character's plan may open (mayOf): its seconds, the fares (gold) and the keys its transitions take on the way in.
 *  Undefined: no way back (a loss would strand it). */
export function wayBack(world: World, name: string, monster: string): { sec: number; gold: number; keys: Record<string, number> } | undefined {
  const may = mayOf(world, name);
  const k = `${mayKeys.get(may) ?? "?"}|${monster}|${eventTiles("monster", monster, world).map((e) => pkey({ x: e.tile.x, y: e.tile.y, layer: e.tile.layer })).join(";")}`;
  let b = caching ? backMemo.get(k) : undefined;
  if (b === undefined) {
    b = null;
    const spot = nearestSpot(WAKE, "monster", monster, world, name);
    const legs = spot && route(WAKE, spot.place, may);
    if (spot && legs) {
      b = { sec: spot.sec, gold: 0, keys: {} };
      for (const l of legs) if (l.kind === "transition") for (const c of l.to.conditions ?? []) {
        if (c.operator === "cost" && c.code === "gold") b.gold += c.value;
        else if (c.operator === "cost") b.keys[c.code] = (b.keys[c.code] ?? 0) + c.value;
      }
    }
    if (caching) remember(backMemo, k, b);
  }
  return b ?? undefined;
}
/** Task 025: the way back in seconds as a price — the walk and its fares at config.goldPerHour (a key is a fare in kind:
 *  its price is the stock's, task 017, so only its seconds here). */
export const wayBackSec = (world: World, name: string, monster: string): number => {
  const b = wayBack(world, name, monster);
  return b ? b.sec + (b.gold * 3600) / (world.config.goldPerHour || 300) : 0;
};
/** Task 025, settled point 2: the price of a kill — its expected seconds a win, (p × a won attempt + (1 − p) × a lost one)
 *  ÷ p, at the character's price of a potion (and its food, task 014), × the log factor of the World's config (config.ts
 *  killLog); a lost attempt walks back from WAKE (wayBackSec) and rests from 1 HP. The walks to the bank are left out. */
export function winSecOf(r: GearRecommendation, world: World, name: string, monster: string, price = potionPrice(world, name).price, food: ((lost: number, maxHp?: number) => Food | undefined) | undefined = potionPrice(world, name).food): number {
  const f = r.forecast, fd = food?.(f.maxHp - f.hpRemaining, f.maxHp);
  return winSeconds(killSeconds(f, price, fd), lossSeconds(f, price, wayBackSec(world, name, monster), food?.(f.maxHp - 1, f.maxHp)), r.p) * killLog(world);
}
/** Task 025: the verdict on a kill step's set — the codes it wears (its `wear` and the potions of its take): p and the
 *  expected seconds a win of exactly that set, and the fares its losses' way back takes. */
export function verdictOf(ch: Character, world: World, monster: string, codes: string[], sent?: { withdraw?: Record<string, number>; kills: number }): FightVerdict | undefined {
  const m = monsterOf(monster);
  if (!m) return undefined;
  const fighter = applyGear(baseStats(ch), codes);
  const forecast = simulate(fighter, m);
  const p = forecast.win && !forecast.timedOut ? winRate(fighter, m) : 0;
  const b = wayBack(world, ch.name, monster);
  const back = b && (b.gold || Object.keys(b.keys).length) ? { gold: b.gold, keys: b.keys } : undefined;
  const r = { slots: {} as GearRecommendation["slots"], codes, forecast, worst: forecast, p, score: 0 };
  // task 038 (B): a step's verdict counts the rest it will take with the food it is sent with (`sent`: its take, its kills)
  const sec = sent ? sentSec(world, ch, monster, r, sent.withdraw, sent.kills) : winSecOf(r, world, ch.name, monster);
  return { p, sec, ...(back ? { back } : {}) };
}
/** A kill's seconds as the planner prices it (task 025: the expected seconds a win, winSecOf), the walks left out — task 038
 *  (B): over a chunk, fed as far as the character's share of the bank's food goes and resting past it (consumables.ts fedPlan). */
export const fightSecOf = (r: GearRecommendation, world: World, name: string, monster: string): number => {
  const ch = world.characters.find((c) => c.name === name);
  return ch ? fedPlan(world, ch, monster, r).sec : winSecOf(r, world, name, monster);
};
/** Task 014: row B (consumables free) — every potion the character may drink is at hand, as an extra candidate. */
const freeExtra = (ch: Character, world: World, extra: string[]): string[] =>
  (world.config.consumables ?? 1) && (world.config.potionK ?? 1) === 0 ? [...new Set([...extra, ...potionCands(ch)])] : extra;

/**
 * The best set of the character's pool vs a monster — `ownedFightRec`'s solve over poolBank (utility potions in), with
 * caps of 6 a slot and 6 weapons instead of its 12 and 10: the brewed potions the bank collects made the potion pair
 * search the dearest part of a decision.
 */
export function fightRec(ch: Character, world: World, monster: string): GearRecommendation | undefined {
  return asked(world, ch, `fight|${monster}`, () => solve(ch, monster, fightOptions(ch, world, monster)));
}
/** fightRec's options (task 021: scripts/check-solve.mts solves with them at the three caps). Task 021, settled point 5:
 *  the planner's solves do not read what is worn (bis.ts `worn`), so a solve serves every worn set. */
export function fightOptions(ch: Character, world: World, monster?: string): BisOptions {
  const qty = poolOf(ch, world).qty;
  return { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: freeExtra(ch, world, []), perSlotCap: 6, weaponCap: 6, potionPrice: potionPrice(world, ch.name).price, worn: false, fixed: wornPinned(ch), ...riskOf(ch, world, monster) };
}
/** Task 027g (C): the pinned artifacts the character wears — play never takes one off, so the step's set is solved with them. */
const wornPinned = (ch: Character): string[] => ["artifact1", "artifact2", "artifact3"].map((g) => slotCode(ch, g as GearSlot)).filter((c): c is string => !!c && PINNED_ARTIFACTS.has(c));
/** Task 025: what a solve needs of the verdict — the floor and the way back a lost attempt walks. */
const riskOf = (ch: Character, world: World, monster?: string): Pick<BisOptions, "minWin" | "wayBack"> =>
  ({ minWin: minWinOf(world), wayBack: monster ? wayBackSec(world, ch.name, monster) : 0 });
/** Task 012: the wisdom of the set a fight is planned with (xp.ts fightXp's last argument): the solved set's pieces,
 *  plus a pinned artifact the character wears that the set left out (the executor never takes one off). */
export function setWisdom(ch: Character, r: GearRecommendation | undefined): number {
  const codes = [...(r?.codes ?? [])];
  for (const g of GEAR_SLOTS) { const c = slotCode(ch, g); if (c && PINNED_ARTIFACTS.has(c) && !codes.includes(c)) codes.push(c); }
  return wisdomOf(codes);
}
/** Task 025, settled point 2: a solved set the planner may plan a fight with — its rolled win rate p (bis.ts, the answer's
 *  winRate) is at least the floor (config.risk.minWin) and its expected fight is no timeout. The pessimistic pass decides
 *  nothing. */
export const admits = (r: GearRecommendation | undefined, world: World): boolean =>
  !!r && r.forecast.win && !r.forecast.timedOut && r.p >= minWinOf(world);
/** Task 025, settled point 2: the brake's block of a monster for a character (state/planner.ts, key
 *  `kill:<monster>@<name>`) holds while it lasts and neither the set nor the level changed. */
export function braked(ch: Character, world: World, monster: string, r: GearRecommendation | undefined): boolean {
  const b = world.blocked[`kill:${monster}@${ch.name}`];
  return !!b && b.until > world.now && (b.level == null || b.level === ch.level) && (b.set == null || b.set === fightSig(r?.codes ?? []));
}
/** Task 025, settled point 2: a fare-paid way back the gold budget cannot pay for the losses a bag of kills is expected to
 *  ask (stock.ts available: bank gold less the others' reservations and GOLD_FLOOR), or a key it lacks for them. */
export function strands(ch: Character, world: World, monster: string, r: GearRecommendation): boolean {
  const b = wayBack(world, ch.name, monster);
  if (!b) return true;
  if (!b.gold && !Object.keys(b.keys).length) return false;
  const losses = Math.ceil(((1 - r.p) / Math.max(r.p, 1e-9)) * bagActions(ch, monster));
  if (losses <= 0) return false;
  return available("gold", world, ch.name) < losses * b.gold || Object.entries(b.keys).some(([c, q]) => available(c, world, ch.name) < losses * q);
}
/** Kills one bag carries of this monster (its drops by their odds): the run a loss's fares are budgeted over. */
function bagActions(ch: Character, monster: string): number {
  const drops = monsterOf(monster)?.drops ?? [];
  const per = drops.reduce((t, d) => t + (d.min_quantity + d.max_quantity) / 2 / d.rate, 0);
  return Math.max(1, Math.floor(ch.inventory_max_items / Math.max(0.01, per)));
}
/** Whether the character may fight the monster now (task 025: the one verdict every fight this fleet decides reads): the
 *  full solve (`fightRec`) admitted at the floor, its losses' way back paid, not braked — asked only when the
 *  planning-grade solve (its utility potions included) wins in expectation.
 *  shortcut: a set the capped search finds losing is taken not to win with the wider one; upgrade if that ever flips —
 *  task 021 counted it: of 1,160 fights (the Worlds of 11-20, 11-21, 11-22 and the wall World of report 021, every character
 *  at its own level × every monster) none the 3/3 solve loses in expectation and the 6/6 one is admitted */
export function admitted(ch: Character, world: World, monster: string): boolean {
  if (!planRec(ch, world, monster)?.forecast.win) return false;
  const r = fightRec(ch, world, monster);
  return admits(r, world) && !strands(ch, world, monster, r!) && !braked(ch, world, monster, r);
}

/**
 * The planning-grade solve (fleetBis's solve with smaller caps: 3 a slot, 3 weapons; utility potions of the pool in,
 * unlike fleetBis — brewed potions flip fights here) of the character's pool vs a monster, `extra` craftable pieces
 * added (gear by need, forced in past the caps). Used where the planner
 * prices what it does not wear now: a level above the character's own (section 2), a set with pieces nobody has
 * made (section 4), and the first look at a monster before a full solve.
 */
export function planRec(ch: Character, world: World, monster: string, extra: string[] = []): GearRecommendation | undefined {
  return asked(world, ch, `plan|${monster}|${[...extra].sort().join(",")}`, () => {
    // task 014: a level above the character's own is solved without potions — the stock comes and goes with every fight
    // step and supply step (shortcut: the road above is priced on the gear alone, to its wall at the pace before it,
    // bundle.ts; upgrade if a road above is ever wanted with them). Row B too (every potion free at the character's own
    // level only: with every potion a candidate above it the row ran an hour)
    const bare = !!(world.config.consumables ?? 1) && ch.level !== world.characters.find((c) => c.name === ch.name)?.level;
    const w = bare ? openOf(world) : world;
    const qty = bare ? bareOf(poolOf(ch, w).qty) : poolOf(ch, w).qty;
    return solve(ch, monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: bare ? extra : freeExtra(ch, world, extra), perSlotCap: 3, weaponCap: 3, potionPrice: potionPrice(world, ch.name).price, noUtilities: bare, worn: false, ...riskOf(ch, world, monster) });
  });
}
const openMemo = new WeakMap<World, World>();
/** Task 014: the fleet's gear — the World with no step running and every worn set in the bank. What is an estimate is
 *  solved on it — a level above the character's own, the pace of the road at its own level (cost.ts levelHoursEstimate),
 *  whether a character can ever be an event's member (events.ts possibleMembers): sets move between the bank and the
 *  characters at every step (and the running steps reserve them), so on the pool of the moment those solves — every
 *  character × every event monster, every level of a road — missed the cache at nearly every decision (row A, days
 *  20–24: 7,500 of them). A need's potion set and every step's set stay on the character's own pool.
 *  shortcut: a piece another character wears counts as the bank's here; upgrade if a road is ever judged on a piece
 *  only one character can hold at a time
 *  Task 027: not a fighter's — each fighter gets its own set (a piece First wears is not Fifth's; report 025's twin
 *  fighter): a fighter's worn set stays its own (the pool adds it), never the bank's for another. */
export function openOf(world: World): World {
  let w = openMemo.get(world);
  if (!w) {
    const worn = new Map<string, number>();
    for (const c of world.characters) if (roleOfCh(c, world.config) !== "fighter") for (const g of GEAR_SLOTS) {
      const code = g.startsWith("utility") ? "" : slotCode(c, g);
      if (code) worn.set(code, (worn.get(code) ?? 0) + 1);
    }
    const bank = world.bank.map((b) => (worn.has(b.code) ? { ...b, quantity: b.quantity + worn.get(b.code)! } : b));
    for (const [code, quantity] of worn) if (!world.bank.some((b) => b.code === code)) bank.push({ code, quantity });
    openMemo.set(world, (w = { ...world, current: {}, bank }));
  }
  return w;
}

/** Task 014: the planning-grade set of the pool's gear (its potions left out; `fleet`: the fleet's gear, openOf) with
 *  `potions` as candidates at `price` — a need's "the set that wins with them made" (consumables.ts potionSet). `price` is
 *  a function of the World and the character's name (its one caller's: the chain's price on the empty bank), so the ask
 *  names it by the table alone. */
export function potionRec(ch: Character, world: World, monster: string, potions: string[], price: (code: string) => number, fleet = false): GearRecommendation | undefined {
  return asked(world, ch, `potions|${monster}|${potions.join(",")}|${fleet ? "fleet" : ""}`, () => {
    const qty = bareOf(poolOf(ch, fleet ? openOf(world) : world).qty);
    return solve(ch, monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: potions, perSlotCap: 3, weaponCap: 3, potionPrice: price, worn: false, ...riskOf(ch, world, monster) });
  });
}

/** Section 2: the first level, up to ten above, at which this character's fight is admitted (task 025) with the pool it has
 *  now (+5 max HP a level, the gear the level allows) — undefined: it waits for gear, not for a level. Its own level
 *  with the full solve, the levels above with the planning-grade one.
 *  shortcut: a win is taken to hold at every higher level (+HP, more gear), so the search is a bisection; upgrade if a
 *  level-up ever loses a monster */
export function winLevel(ch: Character, world: World, monster: string): number | undefined {
  return admitted(ch, world, monster) ? ch.level : firstWin(ch, world, monster);
}
/** The first level above the character's own, up to ten above, at which the planning-grade solve wins: a bisection.
 *  Task 020: started from the top every time (it started from the answer the last pool gave, which made the answer
 *  depend on what was asked before wherever the wins are not monotone). */
export function firstWin(ch: Character, world: World, monster: string): number | undefined {
  const top = Math.min(50, ch.level + 10);
  if (top <= ch.level) return undefined;
  const at = (L: number): boolean => admits(planRec(chAt(ch, L), world, monster), world);
  if (!at(top)) return undefined;
  let lo = ch.level + 1, hi = top;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (at(mid)) hi = mid; else lo = mid + 1; }
  return lo;
}

const cutMemo = new Map<string, number>();
/** The share of a gather's cooldown the best gathering set of the pool (tool + e.g. an altar doll) takes off. Task 020:
 *  keyed on what jobgear.ts jobGear's gathering argmax reads — the pool (what may be worn, two rings), the worn codes
 *  (its tiebreak) and the skill. */
export function gatherCut(ch: Character, world: World, skill: string): number {
  const k = `${poolOf(ch, world).sig}|${wornOf(ch)}|${skill}`;
  const c = caching ? cutMemo.get(k) : undefined;
  if (c != null) return c;
  const set = jobGear(ch, poolBank(world, ch.name), { kind: "gather", skill }) ?? {};
  let cut = 0;
  for (const code of Object.values(set)) cut += toolCut(code, skill);
  cut = Math.min(0.9, Math.max(0, cut));
  return caching ? remember(cutMemo, k, cut) : cut;
}
/** The cooldown share one item takes off a gather of `skill` (its negative `<skill>_gathering` effect). */
export const toolCut = (code: string | undefined, skill: string): number => {
  let c = 0;
  for (const e of (code && item(code)?.effects) || []) if (e.code === `${skill}_gathering`) c -= e.value / 100;
  return c;
};

/** Sizes of the memo tables (the check prints them). */
export const memoSizes = (): { solves: number; cuts: number; routes: number } => ({ solves: solveMemo.size, cuts: cutMemo.size, routes: routeMemo.size });
