// Unit costs and hours (design A.3): one table keyed by what is done; `measured ?? estimate` once n ≥ 3.
// Estimates: a kill = the bank's best set's `killSeconds` × 1.3 (the log), a gather = the docs' cooldown with
// the best gathering set owned × 1.05 (the log); both plus the round trip to the nearest bank by route per
// bagful. Hours per level: the atlas (`path`, `gatherTrain`; `craftTrain` × craftK up to 40 and a flat
// craftAbove40 above for the three gear crafting skills). Pure.

import { atlas } from "../../catalog/atlas";
import { catalog, item, monster as monsterOf, resource as resourceOf } from "../../catalog";
import { killSeconds } from "../bis";
import { CRAFT_SEC, autoRecyclable, fightXp, gatherSec } from "../xp";
import { GATHER_LANES, GATHER_LOG, GEAR_CRAFT, KILL_LOG, STEP_BANK_SEC, TASK_SEC } from "./config";
import { craftXpOf } from "./xp";
import { CITY, bankSec, chAt, fightRec, firstWin, gatherCut, nearestSpot, placeOf, planRec, potionPrice, setWisdom } from "./reach";
import { pickMonster, pickNode, pickRecipe } from "./pick";
import { rolesFor } from "./roles";
import { atlasKillSec, perUnit, sourceFor } from "./targets";
import type { Character } from "../../types/api";
import type { Costs, Lane, Place, Target, Work, World } from "./types";

export const levelOf = (ch: Character, lane: Lane): number =>
  lane === "combat" ? ch.level : ((ch as unknown as Record<string, number>)[`${lane}_level`] ?? 0);

/** The `costs` key a work's samples go under (undefined = not measured: levels have their own keys). */
export function costKey(w: Work): string | undefined {
  switch (w.kind) {
    case "kill": return `kill:${w.monster}`;
    case "gather": return `gather:${w.resource}`;
    case "task": return "task";
    case "craft": return `craft:${w.code}`;
    default: return undefined;
  }
}

const measured = (costs: Costs, key: string | undefined): number | undefined => {
  const c = key ? costs[key] : undefined;
  return c && c.n >= 3 ? c.sec : undefined;
};

/** One sample into the table: an exponential mean (weight 0.3), only from a step of at least 5 units. */
export function sample(costs: Costs, key: string, sec: number, n: number, at = 0): Costs {
  if (n < 5 || !Number.isFinite(sec)) return costs;
  const prev = costs[key];
  return { ...costs, [key]: { sec: prev ? prev.sec * 0.7 + sec * 0.3 : sec, n: (prev?.n ?? 0) + 1, at } };
}

/** Items one action rolls into the bag (every drop, by its odds). */
const itemsPerAction = (drops: { rate: number; min_quantity: number; max_quantity: number }[]): number =>
  drops.reduce((t, d) => t + (d.min_quantity + d.max_quantity) / 2 / d.rate, 0);

/** Walking per action: the round trip from the work's tile to the nearest bank, once per bagful. */
function walkPerAction(ch: Character, world: World, type: string, code: string, drops: Parameters<typeof itemsPerAction>[0]): number {
  const spot = nearestSpot(placeOf(ch), type, code, world) ?? nearestSpot(CITY, type, code, world);
  if (!spot) return 0;
  const perBag = Math.max(1, ch.inventory_max_items / Math.max(0.01, itemsPerAction(drops)));
  const bank = bankSec(spot.place);
  return Number.isFinite(bank) ? (2 * bank) / perBag : 0;
}

/**
 * Task 012, settled point 4: the fixed seconds of a craft, trade or gear step, once a step, before any run — its bank
 * reset (the walk from `from` to the nearest bank), the walk to the workshop or the trader at `place` and back for the
 * deposit (2 × bankSec), and the bank actions of the reset, the withdrawal and the deposit (STEP_BANK_SEC, measured).
 * `from` undefined: a bill's price, where nobody stands anywhere yet — the walk to the reset is left out.
 */
export function stepSec(place: Place | undefined, from?: Place): number {
  const fin = (s: number): number => (Number.isFinite(s) ? s : 0);
  return (from ? fin(bankSec(from)) : 0) + (place ? 2 * fin(bankSec(place)) : 0) + STEP_BANK_SEC;
}
/** The tile a craft or a trade is done on, as a bill prices it (from the city). */
export const makePlace = (w: Work, world: World): Place | undefined =>
  w.kind === "craft" ? nearestSpot(CITY, "workshop", item(w.code)?.craft?.skill ?? "", world)?.place
  : w.kind === "buy" ? nearestSpot(CITY, "npc", w.npc, world)?.place
  : undefined;

/** The bank trips' share of one kill of this monster. */
export const killWalk = (ch: Character, world: World, monster: string): number =>
  walkPerAction(ch, world, "monster", monster, monsterOf(monster)?.drops ?? []);

/** Seconds one kill or one gather takes (measured, else the estimate). Infinity = not a work of actions. */
export function actionSec(w: Work, ch: Character, world: World): number {
  const m = measured(world.costs, costKey(w));
  if (m != null) return m;
  if (w.kind === "kill") {
    const mon = monsterOf(w.monster);
    if (!mon) return Infinity;
    const f = planRec(ch, world, w.monster)?.forecast.win ? fightRec(ch, world, w.monster)?.forecast : undefined; // reach.ts safeWin's first look
    const fight = f?.win ? killSeconds(f, potionPrice(world, ch.name).price) : atlasKillSec(w.monster);
    return fight * KILL_LOG + walkPerAction(ch, world, "monster", w.monster, mon.drops);
  }
  if (w.kind === "gather") {
    const r = resourceOf(w.resource);
    if (!r) return Infinity;
    return gatherSec(r.level) * (1 - gatherCut(ch, world, r.skill)) * GATHER_LOG + walkPerAction(ch, world, "resource", r.code, r.drops);
  }
  return Infinity;
}

/** Actions (kills, gathers) per unit of a work: 1 per kill, the drop odds for an item. */
export function perOf(w: Work): number {
  if (w.kind === "kill") return w.drop ? perUnit(monsterOf(w.monster)?.drops ?? [], w.drop) : 1;
  if (w.kind === "gather") return perUnit(resourceOf(w.resource)?.drops ?? [], w.drop);
  return 1;
}

/** Seconds for one unit of `code` from scratch by this character: its field source, else its recipe opened
 *  (5 s a run plus the inputs), as deep as the recipes go. Infinity: no field source and no recipe (gold, coins). */
export function codeSec(code: string, ch: Character, world: World, depth = 0): number {
  const s = sourceFor(code);
  if (typeof s !== "string") return actionSec(s.work, ch, world) * perOf(s.work);
  const r = item(code)?.craft;
  if (!r || depth > 4) return Infinity;
  return (CRAFT_SEC + r.items.reduce((t, g) => t + g.quantity * codeSec(g.code, ch, world, depth + 1), 0)) / Math.max(1, r.quantity);
}

/** Seconds per unit of a target's work by this character, with no stock counted: a craft or a buy sources
 *  every material in the field through its input's source (a material made by a craft: its recipe opened). */
export function unitSec(t: Pick<Target, "work" | "inputs">, ch: Character, world: World): number {
  const w = t.work;
  switch (w.kind) {
    case "kill": case "gather": return actionSec(w, ch, world) * perOf(w);
    case "craft": case "buy": {
      const m = measured(world.costs, costKey(w));
      if (m != null) return m;
      let s = w.kind === "craft" ? CRAFT_SEC / Math.max(1, item(w.code)?.craft?.quantity ?? 1) : 5;
      for (const i of t.inputs ?? []) s += i.per * (i.source.kind === "craft" ? codeSec(i.code, ch, world) : actionSec(i.source, ch, world) * perOf(i.source));
      return s;
    }
    case "task": return measured(world.costs, "task") ?? TASK_SEC;
    case "recycle": {
      const lane = recycleLane(ch, world);
      if (!lane) return Infinity;
      const L = levelOf(ch, lane);
      const { recycled } = craftsPerLevel(lane, L);
      return recycled ? (hoursToLevel(lane, L, L + 1, world, ch) * 3600) / recycled : Infinity;
    }
    case "favor": return world.config.offeringMin * 60;
    case "sell": return 60;
    default: return Infinity; // use (stage 5); recycle, level and train are priced in hours by their steps
  }
}

/** Task 009: the recycling filler trains the character's own gear crafting role, and only when its training
 *  recipe is one automation recycles; a character without one of the three roles has no recycling filler. */
export const recycleLane = (ch: Character, world: World): Lane | undefined =>
  (rolesFor(world)[ch.name] ?? []).find((l) => GEAR_CRAFT.includes(l) && craftsPerLevel(l, levelOf(ch, l)).recycled > 0);

/** Recipe runs one level of craft training takes (the atlas's training recipe), and how many automation recycles. */
export function craftsPerLevel(lane: Lane, L: number): { crafts: number; recycled: number; code?: string } {
  const row = atlas()?.craftTrain[lane]?.[L - 1];
  const need = atlas()?.xpNeeded[L];
  const xp = row ? craftXpOf(row.code, L) : 0;
  if (!row || !need || !xp) return { crafts: 0, recycled: 0 };
  const crafts = Math.ceil(need / xp);
  return { crafts, recycled: autoRecyclable(row.code) ? crafts : 0, code: row.code };
}

/**
 * Estimated hours for one level of a lane at level L, for this character (task 009 section 2):
 * - combat: the XP that level needs over the XP per hour of the monster pickMonster gives the character at that
 *   level (+5 max HP a level, the gear the level allows) with the pool it has now; no safe XP monster → ∞;
 * - a gathering lane: the atlas; ∞ where no reachable node gives XP and no recipe of the skill does (section 5);
 * - the three gear crafting skills: craftTrain × craftK up to 40, craftAbove40 above; cooking: the atlas.
 */
export function levelHoursEstimate(lane: Lane, L: number, world: World, ch: Character): number {
  const a = atlas();
  if (!a || L >= 50) return Infinity;
  if (lane === "combat") {
    const own = (c: Character): number => ((p) => (p ? p.xp / p.sec : 0))(pickMonster(c, world, NO_BONUS));
    const rate = L === ch.level ? own(ch) : L < ch.level ? own(chAt(ch, L)) : roadRate(ch, world, L);
    return rate > 0 ? (a.xpNeeded[L] ?? Infinity) / (rate * 3600) : Infinity;
  }
  if (GEAR_CRAFT.includes(lane)) {
    if (L >= 40) return world.config.craftAbove40;
    const c = a.craftTrain[lane]?.[L - 1];
    return c ? c.hours * world.config.craftK : Infinity;
  }
  if (GATHER_LANES.includes(lane)) {
    const at = { ...ch, [`${lane}_level`]: L } as Character;
    if (!pickNode(lane, L, at, world) && !pickRecipe(lane, at, world)) return Infinity;
  }
  return a.gatherTrain[lane]?.[L - 1]?.hours ?? a.craftTrain[lane]?.[L - 1]?.hours ?? Infinity;
}
const NO_BONUS = new Set<string>();

const ROAD = 10; // the levels above its own a character's road is priced for: as far as winLevel looks
const roadMemo = new WeakMap<World, Map<string, { code: string; at: number; sec: number; wis: number }[]>>();
/**
 * pickMonster's XP per second at a level L above the character's own, with the pool it has now: the same candidates
 * and price, the planning-grade solve (reach.ts planRec) — the level is priced, nothing is worn for it. Per monster
 * the level at which it becomes a win (winLevel's bisection over the next ROAD levels) and the kill seconds solved
 * there; at L the best of the monsters won by then.
 * shortcut: the kill seconds of the first winning level hold for the levels above it (+5 HP a level); upgrade when a
 * measured level sample says the road is priced far off
 */
function roadRate(ch: Character, world: World, L: number): number {
  let byName = roadMemo.get(world);
  if (!byName) roadMemo.set(world, (byName = new Map()));
  const k = `${ch.name}|${ch.level}`;
  let road = byName.get(k);
  if (!road) {
    road = [];
    const top = Math.min(50, ch.level + ROAD);
    for (const m of catalog().monsters.values()) {
      // shortcut: a monster above the road's top level is not looked at; upgrade if a fighter ever farms one 10 levels up
      if (m.type === "boss" || m.type === "raid_boss" || m.level > top || fightXp(m.level, m.hp, m.type, ch.level + 1) <= 0) continue;
      if (!nearestSpot(placeOf(ch), "monster", m.code, world)) continue;
      const at = firstWin(ch, world, m.code);
      if (at == null) continue;
      const r = planRec(chAt(ch, at), world, m.code)!;
      const sec = measured(world.costs, `kill:${m.code}`) ?? killSeconds(r.forecast, potionPrice(world, ch.name).price) * KILL_LOG + killWalk(ch, world, m.code);
      road.push({ code: m.code, at, sec, wis: setWisdom(chAt(ch, at), r) }); // task 012: the XP with the wisdom of that set
    }
    byName.set(k, road);
  }
  let best = 0;
  for (const r of road) {
    const m = monsterOf(r.code)!;
    if (r.at > L || m.level > L + 10) continue;
    best = Math.max(best, fightXp(m.level, m.hp, m.type, L, r.wis) / r.sec);
  }
  return best;
}

const lvMemo = new WeakMap<World, Map<string, number>>();
/** Hours to bring a lane from `from` to `to`: measured `level:<lane>:<L>` where there are 3 samples, else the estimate. */
export function hoursToLevel(lane: Lane, from: number, to: number, world: World, ch: Character): number {
  let byKey = lvMemo.get(world);
  if (!byKey) lvMemo.set(world, (byKey = new Map()));
  const k = `${lane}|${ch.name}|${from}|${to}`;
  let h = byKey.get(k);
  if (h == null) {
    h = 0;
    for (let L = from; L < to && Number.isFinite(h); L++) h += measured(world.costs, `level:${lane}:${L}`) ?? levelHoursEstimate(lane, L, world, ch);
    byKey.set(k, h);
  }
  return h;
}

/** Character-hours a target still needs from this character at today's unit costs (no stock counted). */
export function hoursOf(t: Target, ch: Character, world: World): number {
  if (t.work.kind === "level") return hoursToLevel(t.work.lane, levelOf(ch, t.work.lane), t.work.to, world, ch);
  return (t.left * unitSec(t, ch, world)) / 3600;
}
