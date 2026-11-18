// Unit costs and hours (design A.3): one table keyed by what is done; `measured ?? estimate` once n ≥ 3.
// Estimates: a kill = the bank's best set's `killSeconds` × 1.3 (the log), a gather = the docs' cooldown with
// the best gathering set owned × 1.05 (the log); both plus the round trip to the nearest bank by route per
// bagful. Hours per level: the atlas (`path`, `gatherTrain`; `craftTrain` × craftK up to 40 and a flat
// craftAbove40 above for the three gear crafting skills). Pure.

import { atlas } from "../../catalog/atlas";
import { item, monster as monsterOf, resource as resourceOf } from "../../catalog";
import { killSeconds } from "../bis";
import { CRAFT_SEC, autoRecyclable, gatherSec } from "../xp";
import { GATHER_LOG, GEAR_CRAFT, KILL_LOG, TASK_SEC } from "./config";
import { craftXpOf } from "./xp";
import { CITY, bankSec, fightRec, gatherCut, nearestSpot, placeOf } from "./reach";
import { atlasKillSec, perUnit } from "./targets";
import type { Character } from "../../types/api";
import type { Costs, Lane, Target, Work, World } from "./types";

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

/** Seconds one kill or one gather takes (measured, else the estimate). Infinity = not a work of actions. */
export function actionSec(w: Work, ch: Character, world: World): number {
  const m = measured(world.costs, costKey(w));
  if (m != null) return m;
  if (w.kind === "kill") {
    const mon = monsterOf(w.monster);
    if (!mon) return Infinity;
    const f = fightRec(ch, world, w.monster)?.forecast;
    const fight = f?.win ? killSeconds(f) : atlasKillSec(w.monster);
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

/** Seconds per unit of a target's work by this character, with no stock counted: a craft or a buy sources
 *  every material in the field through its input's source. */
export function unitSec(t: Pick<Target, "work" | "inputs">, ch: Character, world: World): number {
  const w = t.work;
  switch (w.kind) {
    case "kill": case "gather": return actionSec(w, ch, world) * perOf(w);
    case "craft": case "buy": {
      const m = measured(world.costs, costKey(w));
      if (m != null) return m;
      let s = w.kind === "craft" ? CRAFT_SEC / Math.max(1, item(w.code)?.craft?.quantity ?? 1) : 5;
      for (const i of t.inputs ?? []) s += i.per * actionSec(i.source, ch, world) * perOf(i.source);
      return s;
    }
    case "task": return measured(world.costs, "task") ?? TASK_SEC;
    case "recycle": {
      const lane = recycleLane(ch), L = levelOf(ch, lane);
      const { recycled } = craftsPerLevel(lane, L);
      return recycled ? (hoursToLevel(lane, L, L + 1, world) * 3600) / recycled : Infinity;
    }
    case "favor": return world.config.offeringMin * 60;
    case "sell": return 60;
    default: return Infinity; // use (stage 5); recycle, level and train are priced in hours by their steps
  }
}

/** The gear crafting skill whose training recycles for this character: its highest one whose training recipe
 *  automation recycles (cooking's food is not recyclable); GEAR_CRAFT order on a tie. */
export const recycleLane = (ch: Character): Lane => {
  const by = [...GEAR_CRAFT].sort((a, b) => levelOf(ch, b) - levelOf(ch, a));
  return by.find((l) => craftsPerLevel(l, levelOf(ch, l)).recycled > 0) ?? by[0];
};

/** Recipe runs one level of craft training takes (the atlas's training recipe), and how many automation recycles. */
export function craftsPerLevel(lane: Lane, L: number): { crafts: number; recycled: number; code?: string } {
  const row = atlas()?.craftTrain[lane]?.[L - 1];
  const need = atlas()?.xpNeeded[L];
  const xp = row ? craftXpOf(row.code, L) : 0;
  if (!row || !need || !xp) return { crafts: 0, recycled: 0 };
  const crafts = Math.ceil(need / xp);
  return { crafts, recycled: autoRecyclable(row.code) ? crafts : 0, code: row.code };
}

/** Estimated hours for one level of a lane at level L (the atlas). */
export function levelHoursEstimate(lane: Lane, L: number, world: World): number {
  const a = atlas();
  if (!a || L >= 50) return Infinity;
  if (lane === "combat") {
    const t = a.path[L - 1]?.t;
    return t?.[1]?.hours ?? t?.[2]?.hours ?? t?.[0]?.hours ?? Infinity;
  }
  if (GEAR_CRAFT.includes(lane)) {
    if (L >= 40) return world.config.craftAbove40;
    const c = a.craftTrain[lane]?.[L - 1];
    return c ? c.hours * world.config.craftK : Infinity;
  }
  return a.gatherTrain[lane]?.[L - 1]?.hours ?? a.craftTrain[lane]?.[L - 1]?.hours ?? Infinity;
}

/** Hours to bring a lane from `from` to `to`: measured `level:<lane>:<L>` where there are 3 samples, else the atlas. */
export function hoursToLevel(lane: Lane, from: number, to: number, world: World): number {
  let h = 0;
  for (let L = from; L < to; L++) h += measured(world.costs, `level:${lane}:${L}`) ?? levelHoursEstimate(lane, L, world);
  return h;
}

/** Character-hours a target still needs from this character at today's unit costs (no stock counted). */
export function hoursOf(t: Target, ch: Character, world: World): number {
  if (t.work.kind === "level") return hoursToLevel(t.work.lane, levelOf(ch, t.work.lane), t.work.to, world);
  return (t.left * unitSec(t, ch, world)) / 3600;
}
