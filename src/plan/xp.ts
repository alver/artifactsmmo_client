// Skill-XP economics, pure. Formulas from docs.artifactsmmo.com/concepts/skills
// + /concepts/actions (2026-10-26); the fight figure is measured (dev.log:
// fight ≈ 26 s + rest ≈ 15 s, rest not after every fight).
import { catalog, item } from "../catalog";

/** Crafting XP of one recipe execution: tier base by ITEM level, a √(ingredient
 *  count) multiplier, zero once the skill is more than 10 levels above the item.
 *  Output quantity does not multiply it. */
export function craftXp(itemLevel: number, skillLevel: number, ingredientCount: number, wisdom = 0): number {
  if (skillLevel - itemLevel > 10) return 0;
  const [, base, coef] = TIERS.find(([max]) => itemLevel < max)!;
  const mult = Math.min(1.55, Math.max(0.5, 0.2832 + 0.2171 * Math.sqrt(Math.max(1, ingredientCount))));
  return Math.round((base + (itemLevel / Math.max(1, skillLevel)) * coef) * mult * (1 + wisdom * 0.001));
}
const TIERS: [number, number, number][] = [[5, 50, 25], [10, 100, 30], [15, 200, 35], [20, 325, 40], [25, 450, 45], [30, 550, 50], [35, 650, 55], [40, 750, 60], [45, 850, 65], [Infinity, 1000, 70]];

/** Units handed back by recycling one item of an n-ingredient recipe (random picks). */
export const recycleReturn = (ingredientCount: number): number => Math.floor((ingredientCount - 1) / 5) + 1;

/** An ingredient costing more than this many actions per unit is rare: common
 *  drops top out at 1 in 24, gems are 24 stones at 1 in 100, task rewards have
 *  no field source at all. */
export const RARE_ACTIONS = 50;
const unitMemo = new Map<string, number>();
/** Actions per unit of `code` from its cheapest field source — the best drop
 *  rate, a craft's ingredients summed (bars, gems), or an NPC trade priced in
 *  drops (hard leather for cowhide; gold prices don't count — the gold-only
 *  gems must stay rare). Infinity = none (tasks coins, event coins). Static
 *  catalog ⇒ memoized for good. */
function unitActions(code: string, depth = 0): number {
  const m = unitMemo.get(code);
  if (m != null) return m;
  let best = Infinity;
  for (const s of [...catalog().resources.values(), ...catalog().monsters.values()])
    for (const d of s.drops) if (d.code === code) best = Math.min(best, d.rate / ((d.min_quantity + d.max_quantity) / 2));
  if (depth < 3) {
    const r = item(code)?.craft;
    if (r) best = Math.min(best, r.items.reduce((t, g) => t + g.quantity * unitActions(g.code, depth + 1), 0) / Math.max(1, r.quantity));
    for (const n of catalog().npcs.values())
      for (const o of n.items ?? []) if (o.code === code && o.buy_price != null && o.currency !== "gold") best = Math.min(best, o.buy_price * unitActions(o.currency, depth + 1));
  }
  if (depth === 0) unitMemo.set(code, best);
  return best;
}
/** Whether automation may recycle `code`: recyclable AND made of common stuff
 *  only. Recycling hands back random units, so a rare ingredient (a gem, a
 *  task-reward crystal) is mostly lost — such products are banked for a manual
 *  decision instead. */
export const autoRecyclable = (code: string): boolean => {
  const it = item(code);
  return !!it?.recyclable && !!it.craft && it.craft.items.every((g) => unitActions(g.code) <= RARE_ACTIONS);
};

/** Gather cooldown, seconds, before tool bonuses. */
export const gatherSec = (resourceLevel: number): number => 29 + Math.max(1, Math.floor(resourceLevel / 2));
/** One recipe execution (and the smelt behind it). */
export const CRAFT_SEC = 5;
/** Combat XP of one won fight (docs: Combat & Stats): a level ratio plus an HP
 *  term, ×0.7 once the character is 5+ levels above the monster, zero at 10+,
 *  ×1.4 elite / ×2 boss. */
export function fightXp(monsterLevel: number, monsterHp: number, type: string, playerLevel: number, wisdom = 0): number {
  const gap = playerLevel - monsterLevel;
  const penalty = gap >= 10 ? 0 : gap >= 5 ? 0.7 : 1;
  const mult = type === "elite" ? 1.4 : type === "boss" || type === "raid_boss" ? 2 : 1;
  return Math.round(((monsterLevel / Math.max(1, playerLevel)) * 20 + monsterHp * 0.04) * penalty * mult * (1 + wisdom * 0.001));
}
/** Fight cooldown: 2 s per turn, floor 5 s (haste ignored — same set, same discount everywhere). */
export const fightSec = (turns: number): number => Math.max(5, 2 * turns);

/** One fight round including the healing it costs, measured. */
export const FIGHT_SEC = 40;

/** Seconds of field work for one unit of an ingredient: the surest node that drops it (lowest drop rate, then lowest
 *  level — consumables.ts gatherSourceFor without the skill filter) at rate × its gather seconds, as gatherPays prices
 *  it; else the surest monster drop at rate × FIGHT_SEC; else, when `open`, its recipe one level deep (5 s plus its own
 *  inputs' field seconds, not opened further) over the recipe's quantity. Infinity: none of these. */
function fieldSec(code: string, open: boolean): number {
  const surest = <T extends { level: number; drops: { code: string; rate: number }[] }>(xs: Iterable<T>): { rate: number; level: number } | undefined => {
    let best: { rate: number; level: number } | undefined;
    for (const x of xs) for (const d of x.drops) if (d.code === code && (!best || d.rate < best.rate || (d.rate === best.rate && x.level < best.level))) best = { rate: d.rate, level: x.level };
    return best;
  };
  const node = surest(catalog().resources.values());
  if (node) return node.rate * gatherSec(node.level);
  const mon = surest(catalog().monsters.values());
  if (mon) return mon.rate * FIGHT_SEC;
  const r = open ? item(code)?.craft : undefined;
  return r ? (CRAFT_SEC + r.items.reduce((t, g) => t + g.quantity * fieldSec(g.code, false), 0)) / Math.max(1, r.quantity) : Infinity;
}

const potionMemo = new Map<string, number>();
/**
 * What one more unit of a utility potion costs, in seconds (task 010): a consumed potion costs what it takes to make
 * another. A recipe: its ingredients' field seconds (fieldSec) plus the craft, over the recipe's quantity — a small
 * health potion is 3 sunflowers at 30 s and a 5 s brew for two, 47.5 s a potion against the 6 s of rest its 30 HP
 * buy. No recipe: the rest seconds of what it heals (5 HP/s; 0 for a boost) — a floor. The one price of a potion in
 * the solver's objective (bis.ts killSeconds), and so in the planner's prices and the executor's choice of set. Here
 * because every per-action price lives here and bis.ts and the planner's core both import this module. Static
 * catalog ⇒ memoised for good.
 */
export function potionSec(code: string): number {
  let s = potionMemo.get(code);
  if (s == null) {
    const it = item(code);
    const r = it?.craft;
    s = r
      ? (CRAFT_SEC + r.items.reduce((t, g) => t + g.quantity * fieldSec(g.code, true), 0)) / Math.max(1, r.quantity)
      : (it?.effects ?? []).reduce((t, e) => t + (e.code === "restore" ? e.value / 5 : 0), 0);
    potionMemo.set(code, s);
  }
  return s;
}
