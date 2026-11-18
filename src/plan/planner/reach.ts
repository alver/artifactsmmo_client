// Where things are and who reaches them, plus the two memoised solver calls the
// planner leans on. Pure: catalog, atlas and the World only.
//
// Reach = a free route (src/plan/route.ts, FREE) from where the character stands to
// a static tile or a live event's tile that carries the content.
// For 008: state/loopkit.ts `nearest()` answers the same question from signals.

import { catalog, item } from "../../catalog";
import { FREE, route, travelSec } from "../route";
import { jobGear, ownedFightRec } from "../jobgear";
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
    s = legs ? travelSec(legs) : null;
    routeMemo.set(k, s);
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
    bankMemo.set(k, s);
  }
  return s;
}

// ── memoised solver calls ────────────────────────────────────────────────────

const sigMemo = new WeakMap<BankItem[], string>();
/** The bank's equippable stock as a string: a bank that changed only in materials keeps its fight solves. */
export function gearSig(bank: BankItem[]): string {
  let s = sigMemo.get(bank);
  if (s == null) {
    s = bank.filter((b) => b.quantity > 0 && SLOTS_FOR_TYPE[item(b.code)?.type ?? ""]).map((b) => `${b.code}:${b.quantity}`).sort().join(",");
    sigMemo.set(bank, s);
  }
  return s;
}
const wornSig = (ch: Character): string => GEAR_SLOTS.map((g) => slotCode(ch, g)).join(",");

const fightMemo = new Map<string, GearRecommendation | null>();
/**
 * The best set owned now (bank + the character's own) vs a monster: `ownedFightRec`, memoised per the bank's
 * gear, the character's name, level, max HP and worn set — the forecast of the same character in the same
 * gear does not change until one of those does. A replay re-uses every solve across thousands of decisions.
 */
export function fightRec(ch: Character, world: World, monster: string): GearRecommendation | undefined {
  const k = `${gearSig(world.bank)}|${ch.name}|${ch.level}|${ch.max_hp}|${wornSig(ch)}|${monster}`;
  let r = fightMemo.get(k);
  if (r === undefined) {
    r = ownedFightRec(ch, world.bank, monster) ?? null;
    fightMemo.set(k, r);
  }
  return r ?? undefined;
}
export const safeWin = (ch: Character, world: World, monster: string): boolean => !!fightRec(ch, world, monster)?.safe;

const cutMemo = new Map<string, number>();
/** The share of a gather's cooldown the best gathering set owned now (tool + e.g. an altar doll) takes off. */
export function gatherCut(ch: Character, world: World, skill: string): number {
  const lv = (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;
  const k = `${gearSig(world.bank)}|${ch.name}|${ch.level}|${skill}|${lv}`;
  let c = cutMemo.get(k);
  if (c == null) {
    const set = jobGear(ch, world.bank, { kind: "gather", skill }) ?? {};
    c = 0;
    for (const code of Object.values(set)) for (const e of (code && item(code)?.effects) || []) if (e.code === `${skill}_gathering`) c -= e.value / 100;
    c = Math.min(0.9, Math.max(0, c));
    cutMemo.set(k, c);
  }
  return c;
}

/** Sizes of the memo tables (the check prints them). */
export const memoSizes = (): { fights: number; routes: number } => ({ fights: fightMemo.size, routes: routeMemo.size });
