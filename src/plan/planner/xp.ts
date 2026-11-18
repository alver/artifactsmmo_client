// The docs' gathering and crafting XP formulas, restated as the atlas has them (scripts/atlas/econ.mts:120-132;
// scripts cannot be imported from src). Fight XP is src/plan/xp.ts `fightXp`. Pure.

import { item } from "../../catalog";

const GATHER_BASE = (lvl: number): number => (lvl < 10 ? 5 : lvl < 20 ? 10 : lvl < 30 ? 13 : lvl < 35 ? 16 : lvl < 40 ? 20 : lvl < 45 ? 28 : 36);
/** XP of one gather at a node of level `resLvl` with the skill at `S`: none 10+ levels above the node. */
export const gatherXp = (resLvl: number, S: number): number => (S - resLvl > 10 ? 0 : Math.round(GATHER_BASE(resLvl) + (resLvl / Math.max(1, S)) * 8));

const CRAFT_TIERS: [number, number, number][] = [[5, 50, 25], [10, 100, 30], [15, 200, 35], [20, 325, 40], [25, 450, 45], [30, 550, 50], [35, 650, 55], [40, 750, 60], [45, 850, 65], [Infinity, 1000, 70]];
/** XP of one run of a recipe with the skill at `S`: none 10+ levels above it; smelting and planks give a tenth. */
export function craftXpOf(code: string, S: number): number {
  const r = item(code)?.craft;
  if (!r || S - r.level > 10) return 0;
  const [, base, coef] = CRAFT_TIERS.find(([max]) => r.level < max)!;
  const n = r.items.reduce((t, g) => t + g.quantity, 0);
  const refine = r.skill === "mining" || r.skill === "woodcutting";
  const mult = refine ? 0.1 : Math.min(1.55, Math.max(0.5, 0.2832 + 0.2171 * Math.sqrt(Math.max(1, n))));
  return Math.round((base + (r.level / Math.max(1, S)) * coef) * mult);
}
