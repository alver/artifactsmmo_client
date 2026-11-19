// Where things are and who reaches them, plus the two memoised solver calls the
// planner leans on. Pure: catalog, atlas and the World only.
//
// Reach = a free route (src/plan/route.ts, FREE) from where the character stands to
// a static tile or a live event's tile that carries the content.
// For 008: state/loopkit.ts `nearest()` answers the same question from signals.

import { catalog, item } from "../../catalog";
import { FREE, route, travelSec } from "../route";
import { bestInSlot, canEquip } from "../bis";
import { potionSec } from "../xp";
import { jobGear, ownedQtyOf } from "../jobgear";
import { poolBank } from "./stock";
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
const SOLVES_PER_KEY = 6;
function cached(memo: Map<string, Solved[]>, key: string, ch: Character, world: World, solve: () => GearRecommendation | undefined, extra: string[] = []): GearRecommendation | undefined {
  const pool = poolOf(ch, world).qty;
  const list = memo.get(key);
  for (const s of list ?? []) {
    let ok = true;
    for (const [c, q] of pool) if ((s.pool.get(c) ?? 0) < q) { ok = false; break; }
    // a forced extra candidate is there whatever the pool holds
    if (ok && s.rec?.forecast.win) for (const [c, n] of s.used) if ((pool.get(c) ?? 0) < n && !extra.includes(c)) { ok = false; break; }
    if (ok) return s.rec ?? undefined;
  }
  const rec = solve() ?? null;
  const used = new Map<string, number>();
  for (const c of rec?.codes ?? []) used.set(c, (used.get(c) ?? 0) + 1);
  const next = [{ pool, used, rec }, ...(list ?? [])].slice(0, SOLVES_PER_KEY);
  if (list) memo.set(key, next);
  else remember(memo, key, next);
  return rec ?? undefined;
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

const priceMemo = new Map<number, (code: string) => number>();
/** The price of a potion a fight drinks in the core (task 011): config.potionK × potionSec — undefined at 1, so every
 *  solve and every killSeconds of the core takes bis.ts's own default, as the executor does. */
export function potionPrice(world: World): ((code: string) => number) | undefined {
  const k = world.config.potionK ?? 1;
  if (k === 1) return undefined;
  let p = priceMemo.get(k);
  if (!p) priceMemo.set(k, (p = (code) => potionSec(code) * k));
  return p;
}

const fightMemo = new Map<string, Solved[]>();
/**
 * The best set of the character's pool vs a monster — `ownedFightRec`'s solve over poolBank (utility potions in), with
 * caps of 6 a slot and 6 weapons instead of its 12 and 10: the brewed potions the bank collects made the potion pair
 * search the dearest part of a decision. Cached per the name, the level and the base max HP (see `cached`).
 */
export function fightRec(ch: Character, world: World, monster: string): GearRecommendation | undefined {
  return cached(fightMemo, `${ch.name}|${ch.level}|${baseHp(ch)}|${monster}|${world.config.potionK ?? 1}`, ch, world, () => {
    const qty = ownedQtyOf(ch, poolBank(world, ch.name));
    return bestInSlot(ch, monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, perSlotCap: 6, weaponCap: 6, potionPrice: potionPrice(world) })[0];
  });
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
  return cached(planMemo, `${ch.name}|${ch.level}|${baseHp(ch)}|${monster}|${[...extra].sort().join(",")}|${world.config.potionK ?? 1}`, ch, world, () => {
    const qty = ownedQtyOf(ch, poolBank(world, ch.name));
    return bestInSlot(ch, monster, { owned: new Set(qty.keys()), ownedQty: qty, includeCraftable: false, extraCandidates: extra, perSlotCap: 3, weaponCap: 3, potionPrice: potionPrice(world) })[0];
  }, extra);
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
