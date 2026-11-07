// Skill-XP economics, pure. Formulas from docs.artifactsmmo.com/concepts/skills
// + /concepts/actions (2026-10-26); the fight figure is measured (dev.log:
// fight ≈ 26 s + rest ≈ 15 s, rest not after every fight).

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

/** Gather cooldown, seconds, before tool bonuses. */
export const gatherSec = (resourceLevel: number): number => 29 + Math.max(1, Math.floor(resourceLevel / 2));
/** One recipe execution (and the smelt behind it). */
export const CRAFT_SEC = 5;
/** Fight cooldown: 2 s per turn, floor 5 s (haste ignored — same set, same discount everywhere). */
export const fightSec = (turns: number): number => Math.max(5, 2 * turns);
/** One fight round including the healing it costs, measured. */
export const FIGHT_SEC = 40;
