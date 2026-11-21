// Where things are and who reaches them, plus the two memoised solver calls the
// planner leans on. Pure: catalog, atlas and the World only.
//
// Reach = a free route (src/plan/route.ts, FREE) from where the character stands to
// a static tile or a live event's tile that carries the content.
// For 008: state/loopkit.ts `nearest()` answers the same question from signals.

import { catalog, item, monster as monsterOf } from "../../catalog";
import { applyGear, baseStats } from "../../sim/stats";
import { simulate } from "../../sim/combat";
import { FREE, route, travelSec } from "../route";
import { bestInSlot, canEquip, killSeconds } from "../bis";
import type { Food } from "../bis";
import type { FightForecast } from "../../sim/combat";
import { killLog } from "./config";
import { potionPriceOf, potionSec, wisdomOf } from "../xp";
import { PINNED_ARTIFACTS, jobGear, ownedQtyOf } from "../jobgear";
import { consPrice, potionCands } from "./consumables";
import { available, poolBank } from "./stock";
import { GEAR_SLOTS, SLOTS_FOR_TYPE, slotCode } from "../../types/api";
import type { BankItem, Character } from "../../types/api";
import type { GameMap } from "../../types/catalog";
import type { GearRecommendation } from "../types";
import type { Place, World } from "./types";

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

/** Live event tiles carrying `type:code` at world.now. */
export function eventTiles(type: string, code: string, world: World): { tile: GameMap; until: number; event: string }[] {
  const out: { tile: GameMap; until: number; event: string }[] = [];
  for (const e of world.events) {
    const c = e.map.interactions?.content;
    const until = Date.parse(e.expiration);
    if (c?.type === type && c.code === code && until > world.now) out.push({ tile: e.map, until, event: e.code });
  }
  return out;
}

const routeMemo = new Map<string, number | null>();
/** Seconds from `from` to `to` by a free route, or undefined. */
export function travel(from: Place, to: Place): number | undefined {
  const k = `${pkey(from)}>${pkey(to)}`;
  let s = routeMemo.get(k);
  if (s === undefined) {
    const legs = route(from, to, FREE);
    s = remember(routeMemo, k, legs ? travelSec(legs) : null);
  }
  return s ?? undefined;
}

export interface Spot { place: Place; sec: number; until?: number; event?: string }
/** The nearest tile carrying the content that `from` reaches by a free route: static, or a live event's. */
export function nearestSpot(from: Place, type: string, code: string, world: World): Spot | undefined {
  let best: Spot | undefined;
  const consider = (t: GameMap, until?: number, event?: string): void => {
    if (t.access?.type === "blocked") return;
    const place = { x: t.x, y: t.y, layer: t.layer };
    const sec = travel(from, place);
    if (sec != null && (!best || sec < best.sec)) best = { place, sec, until, event };
  };
  for (const t of staticTiles(type, code)) consider(t);
  for (const e of eventTiles(type, code, world)) consider(e.tile, e.until, e.event);
  return best;
}

/** The city bank: where "reachable from the city" is asked when nobody in particular stands anywhere. */
export const CITY: Place = { x: 4, y: 1, layer: "overworld" };

const bankMemo = new Map<string, number>();
/** Seconds from a place to the nearest bank it reaches (the island's conditional bank is never taken, as `nearestBank`). */
export function bankSec(p: Place): number {
  const k = pkey(p);
  let s = bankMemo.get(k);
  if (s == null) {
    s = Infinity;
    for (const t of catalog().maps) {
      if (t.interactions?.content?.type !== "bank" || t.access?.type === "conditional") continue;
      const sec = travel(p, { x: t.x, y: t.y, layer: t.layer });
      if (sec != null && sec < s) s = sec;
    }
    remember(bankMemo, k, s);
  }
  return s;
}

// ── memoised solver calls ────────────────────────────────────────────────────
//
// Task 009 section 6: a character plans its gear with its pool — the bank less what the others' current steps
// reserved (stock.ts poolBank), plus what it holds. The solves are keyed on that pool's gear as a multiset, the
// name, the level and the BASE max HP (gear stripped): a reset that only moves this character's own pieces between
// it and the bank changes none of them, so the key holds still while gear changes hands. Every table is bounded:
// at MEMO_CAP entries the oldest tenth (insertion order) is dropped.

export const MEMO_CAP = 20_000;
function remember<V>(m: Map<string, V>, k: string, v: V): V {
  if (m.size >= MEMO_CAP) {
    let n = MEMO_CAP / 10;
    for (const key of m.keys()) { m.delete(key); if (--n <= 0) break; }
  }
  m.set(k, v);
  return v;
}

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
export const poolSig = (ch: Character, world: World): string => poolOf(ch, world).sig;

/**
 * The solve caches. Per (grade, name, level, base max HP, monster, extra pieces) a few results, each with the pool
 * it was solved on and the pieces its set wears. A result serves a pool that is a SUBSET of its own and still holds
 * every piece the set wears: the best set is still there and nothing new could beat it (a set that does not even
 * win in expectation stays a loss with fewer pieces). Most pool changes are a piece another character now wears,
 * which the set did not use — the solve holds. At most SOLVES_PER_KEY results a key (the oldest dropped), at most
 * MEMO_CAP keys a table.
 * shortcut: a smaller pool is taken never to find a better set; bestInSlot's capped search could, rarely
 */
interface Solved { pool: Map<string, number>; used: Map<string, number>; rec: GearRecommendation | null }
// task 014: 16 with consumables 1 — a pool's potions come and go with every step, so it cycles through more variants than
// six (row A, days 20–24: 9,000 misses with all six taken)
const SOLVES_PER_KEY = 6, SOLVES_PER_KEY_014 = 16;
const bareMemo = new WeakMap<Map<string, number>, Map<string, number>>();
/** A pool without its utility potions (planRec at a level above the character's own, task 014). */
const bareOf = (q: Map<string, number>): Map<string, number> => {
  let b = bareMemo.get(q);
  if (!b) bareMemo.set(q, (b = new Map([...q].filter(([c]) => item(c)?.type !== "utility"))));
  return b;
};
function cached(memo: Map<string, Solved[]>, key: string, ch: Character, world: World, solve: () => GearRecommendation | undefined, extra: string[] = [], bare = false, monster?: string): GearRecommendation | undefined {
  const pool = bare ? bareOf(poolOf(ch, world).qty) : poolOf(ch, world).qty;
  // task 014 (consumables 1): the answer of a pool (one object per World and character) is the answer for good: entries
  // other lookups insert later can serve it by the reuse rules below, and the same World must give the same step (the
  // check's invariant 8); report 013's model (consumables 0) keeps its cache as it was
  if (!(world.config.consumables ?? 1)) return lookup(memo, key, pool, ch, world, solve, extra, monster);
  let answers = answerMemo.get(pool);
  if (!answers) answerMemo.set(pool, (answers = new Map()));
  const had = answers.get(key);
  if (had !== undefined) return had ?? undefined;
  const r = lookup(memo, key, pool, ch, world, solve, extra, monster);
  answers.set(key, r ?? null);
  return r;
}
const answerMemo = new WeakMap<Map<string, number>, Map<string, GearRecommendation | null>>();
function lookup(memo: Map<string, Solved[]>, key: string, pool: Map<string, number>, ch: Character, world: World, solve: () => GearRecommendation | undefined, extra: string[], monster?: string): GearRecommendation | undefined {
  const list = memo.get(key);
  const strict = (s: Solved): boolean => {
    for (const [c, q] of pool) if ((s.pool.get(c) ?? 0) < q) return false;
    // a forced extra candidate is there whatever the pool holds
    if (s.rec?.forecast.win) for (const [c, n] of s.used) if ((pool.get(c) ?? 0) < n && !extra.includes(c)) return false;
    return true;
  };
  for (const s of list ?? []) if (strict(s)) return s.rec ?? undefined;
  // task 014 (consumables 1), only when no result serves the pool by the rule above — so a later lookup of the same pool
  // finds the same answer: (1) a safe win solved without a potion the pool now holds serves it; (2) a safe win that lost
  // only a potion the pool no longer holds is simulated again without it and served while it stays safe.
  // shortcut: a potion could shave seconds off a safe win but never flip one, and another set could beat the one that lost
  // its potion; the stock coming and going with every step re-solved every fight of every pool; upgrade if a speed-up
  // potion is ever wanted where the set already wins safely, or a fight is planned in a worse set than a fresh solve gives
  if (world.config.consumables ?? 1) for (const s of list ?? []) {
    if (!s.rec?.safe) continue;
    let ok = true;
    for (const [c, q] of pool) if ((s.pool.get(c) ?? 0) < q && item(c)?.type !== "utility") { ok = false; break; }
    const lost: string[] = [];
    if (ok) for (const [c, n] of s.used) if ((pool.get(c) ?? 0) < n && !extra.includes(c)) { if (item(c)?.type === "utility") lost.push(c); else { ok = false; break; } }
    if (!ok) continue;
    if (!lost.length) return s.rec;
    const r = monster ? without(ch, s.rec, lost, monster) : undefined;
    if (r) return r;
  }
  const rec = solve() ?? null;
  const used = new Map<string, number>();
  for (const c of rec?.codes ?? []) used.set(c, (used.get(c) ?? 0) + 1);
  const next = [{ pool, used, rec }, ...(list ?? [])].slice(0, (world.config.consumables ?? 1) ? SOLVES_PER_KEY_014 : SOLVES_PER_KEY);
  if (list) memo.set(key, next);
  else remember(memo, key, next);
  return rec ?? undefined;
}
/** A solved set without some of its pieces (the potions a pool lost), simulated again: a safe win, else undefined. */
function without(ch: Character, r: GearRecommendation, drop: string[], monster: string): GearRecommendation | undefined {
  const m = monsterOf(monster);
  if (!m) return undefined;
  const slots = Object.fromEntries(Object.entries(r.slots).map(([g, c]) => [g, c && drop.includes(c) ? "" : c])) as GearRecommendation["slots"];
  const codes = Object.values(slots).filter((c): c is string => !!c);
  const fighter = applyGear(baseStats(ch), codes);
  const f = simulate(fighter, m), worst = simulate(fighter, m, { pessimistic: true });
  return f.win && !f.timedOut && worst.win ? { ...r, slots, codes, forecast: f, worst, safe: true } : undefined;
}
const solveCounts = (): { fights: number; plans: number } => {
  let fights = 0, plans = 0;
  for (const l of fightMemo.values()) fights += l.length;
  for (const l of planMemo.values()) plans += l.length;
  return { fights, plans };
};
const hpMemo = new WeakMap<Character, number>();
/** Max HP with the worn gear's HP taken off: what changes with a level, not with a swap. */
export function baseHp(ch: Character): number {
  let h = hpMemo.get(ch);
  if (h == null) {
    h = ch.max_hp;
    for (const g of GEAR_SLOTS) for (const e of item(slotCode(ch, g))?.effects ?? []) if (e.code === "hp") h -= e.value;
    hpMemo.set(ch, h);
  }
  return h;
}

const atMemo = new WeakMap<Character, Map<number, Character>>();
/** The same character at another combat level: +5 max HP a level (the atlas's 115 + 5·L), gear the level allows.
 *  One object per (character, level), so the per-object memos (poolSig, baseHp) hold. */
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
export interface Price { key: string; price: (code: string) => number; covered: string[]; tag: string; food?: (lost: number) => Food | undefined }
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
/** A won fight's seconds as the planner prices a kill, the walks left out: killSeconds at the character's price (task 014:
 *  and its food) × the log factor of the World's config (config.ts killLog). */
export const fightSecOf = (f: FightForecast, world: World, name: string): number => {
  const p = potionPrice(world, name);
  return killSeconds(f, p.price, p.food?.(f.maxHp - f.hpRemaining)) * killLog(world);
};
/** The part of a price a solve of this character's pool depends on: the covered ingredients of the potions the pool
 *  holds (bestInSlot sees owned potions only) — a stock crossing its line for a potion nobody holds changes no solve. */
function solveKey(p: Price, ch: Character, world: World, extra: string[] = []): string {
  const pool = poolOf(ch, world).qty;
  // task 014: a held consumable costs nothing; an extra one (a need's solve) its bill, in steps of about a fifth.
  // shortcut: the set is solved resting (the food is priced in killSeconds where a kill is priced, not in the solve):
  // food in the key tripled the solves of the first week as stocks come and go; upgrade if a set ever turns on it
  const ex = p.tag === "cons" ? extra.filter((c) => item(c)?.type === "utility").map((c) => `${c}=${Math.round(4 * Math.log2(1 + p.price(c)))}`).join(",") : "";
  return `${p.tag}:${p.covered.filter((e) => pool.has(e.slice(0, e.indexOf(".")))).join(",")}:${ex}`;
}
/** Task 014: row B (consumables free) — every potion the character may drink is at hand, as an extra candidate. */
const freeExtra = (ch: Character, world: World, extra: string[]): string[] =>
  (world.config.consumables ?? 1) && (world.config.potionK ?? 1) === 0 ? [...new Set([...extra, ...potionCands(ch)])] : extra;

const fightMemo = new Map<string, Solved[]>();
/**
 * The best set of the character's pool vs a monster — `ownedFightRec`'s solve over poolBank (utility potions in), with
 * caps of 6 a slot and 6 weapons instead of its 12 and 10: the brewed potions the bank collects made the potion pair
 * search the dearest part of a decision. Cached per the name, the level and the base max HP (see `cached`).
 */
export function fightRec(ch: Character, world: World, monster: string): GearRecommendation | undefined {
  const p = potionPrice(world, ch.name);
  const extra = freeExtra(ch, world, []);
  return cached(fightMemo, `${ch.name}|${ch.level}|${baseHp(ch)}|${monster}|${extra.join(",")}|${solveKey(p, ch, world)}`, ch, world, () => {
    const qty = ownedQtyOf(ch, poolBank(world, ch.name));
    return bestInSlot(ch, monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: extra, perSlotCap: 6, weaponCap: 6, potionPrice: p.price })[0];
  }, extra, false, monster);
}
/** Task 012: the wisdom of the set a fight is planned with (xp.ts fightXp's last argument): the solved set's pieces,
 *  plus a pinned artifact the character wears that the set left out (the executor never takes one off). */
export function setWisdom(ch: Character, r: GearRecommendation | undefined): number {
  const codes = [...(r?.codes ?? [])];
  for (const g of GEAR_SLOTS) { const c = slotCode(ch, g); if (c && PINNED_ARTIFACTS.has(c) && !codes.includes(c)) codes.push(c); }
  return wisdomOf(codes);
}
/** A solved set the planner may plan a fight with: a safe win (the pessimistic pass wins too), or any win when
 *  config.risk is "win". */
export const wins = (r: GearRecommendation | undefined, world: World): boolean =>
  !!r && (world.config.risk === "win" ? r.forecast.win && !r.forecast.timedOut : r.safe);
/** Whether the character may fight the monster now: the full solve (`fightRec`), asked only when the planning-grade
 *  solve (its utility potions included) wins in expectation.
 *  shortcut: a set the capped search finds losing is taken not to win with the wider one; upgrade if that ever flips */
export const safeWin = (ch: Character, world: World, monster: string): boolean => !!planRec(ch, world, monster)?.forecast.win && wins(fightRec(ch, world, monster), world);

const planMemo = new Map<string, Solved[]>();
/**
 * The planning-grade solve (fleetBis's solve with smaller caps: 3 a slot, 3 weapons; utility potions of the pool in,
 * unlike fleetBis — brewed potions flip fights here) of the character's pool vs a monster, `extra` craftable pieces
 * added (gear by need, forced in past the caps). Used where the planner
 * prices what it does not wear now: a level above the character's own (section 2), a set with pieces nobody has
 * made (section 4), and the first look at a monster before a full solve.
 */
export function planRec(ch: Character, world: World, monster: string, extra: string[] = []): GearRecommendation | undefined {
  const p = potionPrice(world, ch.name);
  // task 014: a level above the character's own is solved without potions — the stock comes and goes with every fight step
  // and supply step (shortcut: the road above is priced on the gear alone, to its wall at the pace before it, bundle.ts;
  // the pool's potions changed every pool and tripled the solves; upgrade if a road above is ever wanted with them).
  // Row B too (every potion free at the character's own level only: with every potion a candidate above it the row ran
  // an hour)
  const bare = !!(world.config.consumables ?? 1) && ch.level !== world.characters.find((c) => c.name === ch.name)?.level;
  const ex = bare ? extra : freeExtra(ch, world, extra);
  const w = bare ? openOf(world) : world;
  return cached(planMemo, `${ch.name}|${ch.level}|${baseHp(ch)}|${monster}|${[...ex].sort().join(",")}|${solveKey(p, ch, w, ex)}${bare ? "|bare" : ""}`, ch, w, () => {
    const qty = ownedQtyOf(ch, poolBank(w, ch.name));
    return bestInSlot(ch, monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: ex, perSlotCap: 3, weaponCap: 3, potionPrice: p.price, noUtilities: bare })[0];
  }, ex, bare, monster);
}
const openMemo = new WeakMap<World, World>();
/** Task 014: the fleet's gear — the World with no step running and every worn set in the bank. What is an estimate is
 *  solved on it — a level above the character's own, the pace of the road at its own level (cost.ts levelHoursEstimate),
 *  whether a character can ever be an event's member (events.ts possibleMembers): sets move between the bank and the
 *  characters at every step (and the running steps reserve them), so on the pool of the moment those solves — every
 *  character × every event monster, every level of a road — missed the cache at nearly every decision (row A, days
 *  20–24: 7,500 of them). A need's potion set and every step's set stay on the character's own pool.
 *  shortcut: a piece another character wears counts as the bank's here; upgrade if a road is ever judged on a piece
 *  only one character can hold at a time */
export function openOf(world: World): World {
  let w = openMemo.get(world);
  if (!w) {
    const worn = new Map<string, number>();
    for (const c of world.characters) for (const g of GEAR_SLOTS) {
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
 *  `potions` as candidates at `price` — a need's "the set that wins with them made" (consumables.ts potionSet). Keyed on
 *  the candidates, not their prices: so the stock coming and going changes no key.
 *  shortcut: a set keeps the prices it was first solved with while the gear and the level hold (the chain's prices drift
 *  as the gatherers level: 1,700 new keys in four days); upgrade if a price ever moves the choice between two potions */
export function potionRec(ch: Character, world: World, monster: string, potions: string[], price: (code: string) => number, fleet = false): GearRecommendation | undefined {
  const w = fleet ? openOf(world) : world;
  return cached(planMemo, `${ch.name}|${ch.level}|${baseHp(ch)}|${monster}|potions:${potions.join(",")}${fleet ? "|fleet" : ""}`, ch, w, () => {
    const qty = new Map([...ownedQtyOf(ch, poolBank(w, ch.name))].filter(([c]) => item(c)?.type !== "utility"));
    return bestInSlot(ch, monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: potions, perSlotCap: 3, weaponCap: 3, potionPrice: price })[0];
  }, potions, true, monster);
}

/** Section 2: the first level, up to ten above, at which this character wins the monster safely with the pool it has
 *  now (+5 max HP a level, the gear the level allows) — undefined: it waits for gear, not for a level. Its own level
 *  with the full solve, the levels above with the planning-grade one.
 *  shortcut: a win is taken to hold at every higher level (+HP, more gear), so the search is a bisection; upgrade if a
 *  level-up ever loses a monster */
export function winLevel(ch: Character, world: World, monster: string): number | undefined {
  return safeWin(ch, world, monster) ? ch.level : firstWin(ch, world, monster);
}
const winHint = new Map<string, number | null>();
/** The first level above the character's own, up to ten above, at which the planning-grade solve wins: a bisection,
 *  started from the answer the last pool gave (two solves when it did not move). */
export function firstWin(ch: Character, world: World, monster: string): number | undefined {
  const top = Math.min(50, ch.level + 10);
  if (top <= ch.level) return undefined;
  const at = (L: number): boolean => wins(planRec(chAt(ch, L), world, monster), world);
  const k = `${ch.name}|${ch.level}|${baseHp(ch)}|${monster}`;
  const h = winHint.get(k);
  let lo = ch.level + 1, hi = top;
  if (h != null && h <= top) {
    if (at(h)) { if (h === lo || !at(h - 1)) return h; hi = h - 1; }
    else { if (!at(top)) return void remember(winHint, k, null); lo = h + 1; }
  } else if (!at(top)) return void remember(winHint, k, null);
  while (lo < hi) { const mid = (lo + hi) >> 1; if (at(mid)) hi = mid; else lo = mid + 1; }
  remember(winHint, k, lo);
  return lo;
}

const cutMemo = new Map<string, number>();
/** The share of a gather's cooldown the best gathering set of the pool (tool + e.g. an altar doll) takes off. */
export function gatherCut(ch: Character, world: World, skill: string): number {
  const lv = (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;
  const k = `${poolSig(ch, world)}|${ch.name}|${ch.level}|${skill}|${lv}`;
  const c = cutMemo.get(k);
  if (c != null) return c;
  const set = jobGear(ch, poolBank(world, ch.name), { kind: "gather", skill }) ?? {};
  let cut = 0;
  for (const code of Object.values(set)) cut += toolCut(code, skill);
  return remember(cutMemo, k, Math.min(0.9, Math.max(0, cut)));
}
/** The cooldown share one item takes off a gather of `skill` (its negative `<skill>_gathering` effect). */
export const toolCut = (code: string | undefined, skill: string): number => {
  let c = 0;
  for (const e of (code && item(code)?.effects) || []) if (e.code === `${skill}_gathering`) c -= e.value / 100;
  return c;
};

/** Sizes of the memo tables (the check prints them). */
export const memoSizes = (): { fights: number; plans: number; cuts: number; routes: number } => ({ ...solveCounts(), cuts: cutMemo.size, routes: routeMemo.size });
