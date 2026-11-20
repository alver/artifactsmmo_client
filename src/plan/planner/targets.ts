// Open objectives → targets: their work, gates and units left (design A.4: the map script's
// `objective()` and `place()`, over the live catalog and world.achievements), and the level gates
// behind which open achievements sit. Every objective of an open achievement becomes a target or is
// listed by unhandledOf() with a reason. Pure.

import { atlasMonster } from "../../catalog/atlas";
import { catalog, item, monster as monsterOf } from "../../catalog";
import { gatherSec } from "../xp";
import { CITY, staticTiles, travel } from "./reach";
import { GUESS_KILL } from "./config";
import type { AccountAchievement, AchievementObjectiveProgress } from "../../types/api";
import type { Gate, Input, Lane, Target, Work, World } from "./types";

/** Actions per unit of `code` from a drop table ("1 in rate" ÷ mean quantity). */
export const perUnit = (drops: { code: string; rate: number; min_quantity: number; max_quantity: number }[], code: string): number => {
  const d = drops.find((x) => x.code === code);
  return d ? d.rate / ((d.min_quantity + d.max_quantity) / 2) : Infinity;
};

/** The gates of the place a content sits on: an event, another layer, an achievement-gated tile. A string = not on the map. */
export function placeGates(type: string, code: string): Gate[] | string {
  const tiles = staticTiles(type, code).filter((t) => t.access?.type !== "blocked");
  if (!tiles.length) {
    const ev = [...catalog().events.values()].find((e) => e.content.type === type && e.content.code === code);
    if (!ev) return `no ${type} ${code} on the map`;
    // task 013: an event whose tiles no free route reaches (the island's, the lava underground's) has a layer gate too
    const free = ev.maps.some((m) => travel(CITY, { x: m.x, y: m.y, layer: m.layer }) != null);
    return free ? [{ kind: "event", code: ev.code }] : [{ kind: "event", code: ev.code }, { kind: "layer", type, code }];
  }
  const free = tiles.filter((t) => travel(CITY, { x: t.x, y: t.y, layer: t.layer }) != null);
  if (!free.length) return [{ kind: "layer", type, code }];
  const open = free.find((t) => t.access?.type !== "conditional");
  if (open) return [];
  return ((free[0].access.conditions ?? []) as { code: string; operator: string }[])
    .filter((c) => c.operator === "achievement_unlocked")
    .map((c) => ({ kind: "achievement", code: c.code }));
}

/** The atlas's level at which a fighter wins a monster safely (the map's `gate()`): only to bundle a kill behind a combat level. */
export function atlasSafeLevel(code: string): number {
  const a = atlasMonster(code);
  if (!a) return monsterOf(code)?.level ?? 50;
  return a.minLevel[1]?.safe ?? a.minLevel[2]?.safe ?? a.minLevel[2]?.win ?? 50;
}

/** Atlas seconds per kill of a just-strong-enough fighter (an estimate for monsters the bank cannot beat yet). */
export const atlasKillSec = (code: string): number => atlasMonster(code)?.kill?.sec ?? GUESS_KILL;

function killGates(code: string): Gate[] | string {
  const m = monsterOf(code);
  if (!m) return `unknown monster ${code}`;
  if (m.type === "raid_boss") return `${code} is a raid boss (raids are out of scope)`;
  const g = placeGates("monster", code);
  if (typeof g === "string") return g;
  return [...g, m.type === "boss" ? { kind: "group" } : { kind: "win", monster: code, level: atlasSafeLevel(code) }];
}

const staticOnly = (g: Gate[]): boolean => g.every((x) => x.kind === "level" || x.kind === "win");

const sourceMemo = new Map<string, { work: Work; gates: Gate[] } | string>();
/** Where more of a material comes from in the field: a gather or a kill (one level; never a craft, never gold).
 *  A string: none, with the reason. Static per catalog, so memoised for good (bounded by the item catalog). */
export function sourceFor(code: string): { work: Work; gates: Gate[] } | string {
  let s = sourceMemo.get(code);
  if (s === undefined) sourceMemo.set(code, (s = fieldSource(code)));
  return s;
}
function fieldSource(code: string): { work: Work; gates: Gate[] } | string {
  const opts: { work: Work; gates: Gate[]; est: number }[] = [];
  for (const r of catalog().resources.values()) {
    if (!r.drops.some((d) => d.code === code)) continue;
    const g = placeGates("resource", r.code);
    if (typeof g === "string") continue;
    opts.push({ work: { kind: "gather", resource: r.code, drop: code }, gates: [{ kind: "level", lane: r.skill as Lane, level: r.level }, ...g], est: gatherSec(r.level) * perUnit(r.drops, code) });
  }
  for (const m of catalog().monsters.values()) {
    if (!m.drops.some((d) => d.code === code)) continue;
    const g = killGates(m.code);
    if (typeof g === "string") continue;
    opts.push({ work: { kind: "kill", monster: m.code, drop: code }, gates: g, est: atlasKillSec(m.code) * perUnit(m.drops, code) });
  }
  // A source with no event, layer or group gate first (the map's EVENT_BIAS, without the factor), then the cheapest.
  opts.sort((a, b) => Number(staticOnly(b.gates)) - Number(staticOnly(a.gates)) || a.est - b.est);
  if (opts[0]) return opts[0];
  if (code === "tasks_coin") return "tasks coins come from tasks";
  return item(code)?.craft ? `${code} is made by another craft` : `no field source for ${code}`;
}

/** A recipe's inputs: each material with its field source, or — made by another craft — `source` a craft work
 *  (supply.ts opens it through the bank, task 009 section 3). A string: a material with neither, and why. */
export function inputsOf(code: string): Input[] | string {
  const r = item(code)?.craft;
  if (!r) return `${code} has no recipe`;
  const inputs: Input[] = [];
  for (const ing of r.items) {
    const s = sourceFor(ing.code);
    if (typeof s !== "string") inputs.push({ code: ing.code, per: ing.quantity / r.quantity, source: s.work, gates: s.gates });
    else if (item(ing.code)?.craft) inputs.push({ code: ing.code, per: ing.quantity / r.quantity, source: { kind: "craft", code: ing.code }, gates: [] });
    else return `material ${ing.code}: ${s}`;
  }
  return inputs;
}

interface Static { work: Work; gates: Gate[]; inputs?: Input[] }

/** What one objective is, independent of progress. A string = unhandled, with the reason. */
function staticOf(o: AchievementObjectiveProgress): Static | string {
  const t = o.target ?? "";
  switch (o.type) {
    case "favor": return { work: { kind: "favor" }, gates: [] };
    case "task": return { work: { kind: "task" }, gates: [] };
    case "recycling": return { work: { kind: "recycle" }, gates: [] };
    case "combat_level": return { work: { kind: "level", lane: "combat", to: o.total }, gates: [{ kind: "level", lane: "combat", level: o.total }] };
    case "use": return { work: { kind: "use", code: t }, gates: [] };
    case "combat_kill": {
      const g = killGates(t);
      return typeof g === "string" ? g : { work: { kind: "kill", monster: t }, gates: g };
    }
    case "combat_drop": {
      let best: { m: string; g: Gate[]; est: number } | undefined;
      let why = `no monster drops ${t}`;
      for (const m of catalog().monsters.values()) {
        if (!m.drops.some((d) => d.code === t)) continue;
        const g = killGates(m.code);
        if (typeof g === "string") { why = g; continue; }
        const est = atlasKillSec(m.code) * perUnit(m.drops, t);
        if (!best || Number(staticOnly(g)) > Number(staticOnly(best.g)) || (staticOnly(g) === staticOnly(best.g) && est < best.est)) best = { m: m.code, g, est };
      }
      return best ? { work: { kind: "kill", monster: best.m, drop: t }, gates: best.g } : why;
    }
    case "gathering": {
      const s = sourceFor(t);
      if (typeof s === "string" || s.work.kind !== "gather") return typeof s === "string" ? s : `${t} is not gathered`;
      return { work: s.work, gates: s.gates };
    }
    case "crafting": {
      const r = item(t)?.craft;
      if (!r) return `${t} has no recipe`;
      const g = placeGates("workshop", r.skill);
      if (typeof g === "string") return g;
      const inputs = inputsOf(t);
      if (typeof inputs === "string") return inputs;
      return { work: { kind: "craft", code: t }, gates: [{ kind: "level", lane: r.skill as Lane, level: r.level }, ...g], inputs };
    }
    case "npc_buy": {
      const offer = [...catalog().npcs.values()].flatMap((n) => (n.items ?? []).map((x) => ({ ...x, npc: n.code }))).find((x) => x.code === t && x.buy_price != null);
      if (!offer || offer.buy_price == null) return `no NPC sells ${t}`;
      if (offer.currency === "gold") return `${t} costs gold — no spending rule in stage 1`;
      const g = placeGates("npc", offer.npc);
      if (typeof g === "string") return g;
      const s = sourceFor(offer.currency);
      if (typeof s === "string") return `currency ${offer.currency}: ${s}`;
      return { work: { kind: "buy", code: t, npc: offer.npc, currency: offer.currency, price: offer.buy_price }, gates: g, inputs: [{ code: offer.currency, per: offer.buy_price, source: s.work, gates: s.gates }] };
    }
    case "npc_sell": {
      const buyer = [...catalog().npcs.values()].find((n) => (n.items ?? []).some((x) => x.code === t && x.sell_price != null));
      if (!buyer) return `no NPC buys ${t}`;
      const g = placeGates("npc", buyer.code);
      return typeof g === "string" ? g : { work: { kind: "sell", code: t, npc: buyer.code }, gates: g };
    }
    default: return `unknown objective type ${o.type}`;
  }
}

const staticMemo = new Map<string, Static | string>();
const staticFor = (o: AchievementObjectiveProgress): Static | string => {
  const k = `${o.type}:${o.target}:${o.total}`;
  let s = staticMemo.get(k);
  if (s === undefined) staticMemo.set(k, (s = staticOf(o)));
  return s;
};

export const isDone = (a: AccountAchievement): boolean => !!a.completed_at || a.objectives.every((o) => o.progress >= o.total);

export interface Unhandled { key: string; achievement: string; points: number; why: string }

const built = new WeakMap<AccountAchievement[], WeakMap<object, { targets: Target[]; unhandled: Unhandled[] }>>();
function build(world: World): { targets: Target[]; unhandled: Unhandled[] } {
  let byCfg = built.get(world.achievements);
  if (!byCfg) built.set(world.achievements, (byCfg = new WeakMap()));
  const hit = byCfg.get(world.config);
  if (hit) return hit;
  const targets: Target[] = [];
  const unhandled: Unhandled[] = [];
  const levels = new Map<string, { lane: Lane; level: number }>();
  for (const a of world.achievements) {
    if (isDone(a)) continue;
    a.objectives.forEach((o, i) => {
      if (o.progress >= o.total) return;
      const key = `ach:${a.code}:${i}`;
      if (world.config.exclude.includes(a.code)) return void unhandled.push({ key, achievement: a.code, points: a.points, why: "excluded by config" });
      const s = staticFor(o);
      if (typeof s === "string") return void unhandled.push({ key, achievement: a.code, points: a.points, why: s });
      const left = s.work.kind === "level" ? 1 : Math.ceil(o.total - o.progress); // the forward model's progress is fractional (expected drops)
      targets.push({ key, achievement: a.code, objective: i, points: a.points, work: s.work, left, gates: s.gates, inputs: s.inputs, filler: world.config.filler.includes(a.code) });
      for (const g of [...s.gates, ...(s.inputs ?? []).flatMap((x) => x.gates)]) {
        if (g.kind === "level") levels.set(`${g.lane}:${g.level}`, g);
        if (g.kind === "win") levels.set(`combat:${g.level}`, { lane: "combat", level: g.level });
      }
    });
  }
  for (const { lane, level } of [...levels.values()].sort((a, b) => a.lane.localeCompare(b.lane) || a.level - b.level)) {
    targets.push({ key: `lvl:${lane}:${level}`, points: 0, work: { kind: "level", lane, to: level }, left: 1, gates: [], filler: false });
  }
  const out = { targets, unhandled };
  byCfg.set(world.config, out);
  return out;
}

/** Every open objective as a target, and the level gates behind which open achievements sit. */
export const targetsOf = (world: World): Target[] => build(world).targets;
/** The objectives of open achievements that are not targets, with the reason. */
export const unhandledOf = (world: World): Unhandled[] => build(world).unhandled;
