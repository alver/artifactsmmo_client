// Train-craft planner — level a crafting skill by crafting the best recipe in
// the XP window, batch after batch, recycling the output back into materials
// between batches (recycling gives no XP but reclaims a share of the bars, so
// the ore bill per level drops massively). Pure module: recipe choice +
// one-batch compilation only; the loop itself lives in state/campaign.ts
// (mode "train-craft"), which re-picks the recipe every tick so it upgrades
// automatically as the level rises.

import { catalog, item, itemName } from "../catalog";
import { titleCase } from "../lib/util";
import { resolve } from "./acquire";
import type { AcquisitionPlan, Plan } from "./types";
import type { Character } from "../types/api";
import type { Item } from "../types/catalog";

/** The workshop skills this goal can train (gathering skills have their own loops). */
export const CRAFT_TRAIN_SKILLS: [string, string][] = [
  ["weaponcrafting", "Weaponcrafting"],
  ["gearcrafting", "Gearcrafting"],
  ["jewelrycrafting", "Jewelrycrafting"],
  ["cooking", "Cooking"],
];

const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

/**
 * Availability-aware inventory footprint of obtaining `qty`× `code`: stock
 * (bank ∪ inventory) covers what it can at 1 slot per unit withdrawn; only the
 * shortfall recurses into the recipe down to gathered leaves (a copper bar in
 * the bank is 1 slot, a bar that must be smelted is 10 ore slots). MUTATES
 * `avail` so successive calls price against what earlier items already claimed.
 */
function footprint(code: string, qty: number, avail: Map<string, number>, depth = 0): number {
  const have = Math.min(qty, avail.get(code) ?? 0);
  if (have > 0) avail.set(code, (avail.get(code) ?? 0) - have);
  const left = qty - have;
  if (left <= 0) return have;
  const recipe = item(code)?.craft;
  if (!recipe || depth >= 6) return have + left; // gathered/farmed raw: 1 slot per unit
  const times = Math.ceil(left / Math.max(1, recipe.quantity));
  let cost = have;
  for (const ing of recipe.items) cost += footprint(ing.code, ing.quantity * times, avail, depth + 1);
  return cost;
}

/**
 * Crafts per batch: add items greedily until the acquisition round no longer
 * fits half the inventory, pricing each item against the REMAINING stock — so
 * a bank full of bars yields proper multi-craft batches (withdraw once, craft
 * once, recycle once) while a cold start correctly falls back to leaf-raw
 * costs and small batches. Stock of the output itself is excluded, mirroring
 * evalRecipe (it is never withdrawn — training output must be crafted fresh).
 */
export function trainBatch(ch: Character, bank: { code: string; quantity: number }[], code: string): number {
  const budget = ch.inventory_max_items * 0.5;
  const avail = new Map<string, number>();
  const add = (c: string, n: number) => {
    if (c && c !== code && n > 0) avail.set(c, (avail.get(c) ?? 0) + n);
  };
  for (const s of ch.inventory ?? []) add(s.code, s.quantity);
  for (const b of bank) add(b.code, b.quantity);

  let batch = 0;
  let used = 0;
  while (batch < 100) {
    const cost = footprint(code, 1, avail);
    if (batch > 0 && used + cost > budget) break; // the first item always fits (matches the old max(1, …))
    used += cost;
    batch++;
    if (used >= budget) break;
  }
  return Math.max(1, batch);
}

export interface TrainPick {
  recipe: Item;
  batch: number;
  acq: AcquisitionPlan; // one batch, resolved against live inventory/bank
}

/**
 * Evaluate one candidate recipe: one batch resolved against live state, or
 * undefined when its materials are out of reach.
 *
 * Two deliberate twists: banked stock of the output itself is HIDDEN
 * (withdrawing existing pieces would satisfy the batch with zero crafts — no
 * XP — and the recycler would then eat the fleet's spare gear), and the target
 * carries role "deliver" for the same reason on the WORN copy (resolve treats
 * an equipped code as a satisfied gear target: zero steps → fake-cheapest
 * candidate → the trainer idles). Training output must be produced fresh.
 */
function evalRecipe(ch: Character, bank: { code: string; quantity: number }[], it: Item): TrainPick | undefined {
  const batch = trainBatch(ch, bank, it.code);
  const bankSansOutput = bank.filter((b) => b.code !== it.code);
  const acq = resolve(ch, bankSansOutput, [{ code: it.code, quantity: batch, role: "deliver" }], { train: true });
  return acq.feasible ? { recipe: it, batch, acq } : undefined;
}

/**
 * The best recipe to train `skill` on right now: within the XP window (recipes
 * more than 10 levels below the skill give no XP), producible by this character
 * (small gathering-skill gaps close via train steps). Recipes in the upper half
 * of the window are preferred (more XP per craft); ties go to the cheapest
 * batch per craft. Re-run this as the level rises — the pick upgrades itself.
 */
export function trainingRecipe(ch: Character, bank: { code: string; quantity: number }[], skill: string): TrainPick | undefined {
  const lvl = skillLevel(ch, skill);
  let best: (TrainPick & { tier: number; perCraft: number }) | undefined;
  try {
    for (const it of catalog().items.values()) {
      if (it.craft?.skill !== skill || it.craft.level > lvl || it.craft.level <= lvl - 10) continue;
      const pick = evalRecipe(ch, bank, it);
      if (!pick) continue;
      const tier = it.craft.level > lvl - 5 ? 1 : 0;
      const perCraft = pick.acq.estSeconds / pick.batch;
      if (!best || tier > best.tier || (tier === best.tier && perCraft < best.perCraft)) {
        best = { ...pick, tier, perCraft };
      }
    }
  } catch {
    /* catalog not ready */
  }
  return best;
}

/** A user-pinned recipe, validated with a specific reason when unusable. */
export function forcedTrainPick(
  ch: Character,
  bank: { code: string; quantity: number }[],
  skill: string,
  code: string,
): { pick?: TrainPick; blocker?: string } {
  const it = item(code);
  const lvl = skillLevel(ch, skill);
  const label = titleCase(skill);
  if (!it?.craft || it.craft.skill !== skill) return { blocker: `${itemName(code)} is not a ${label} recipe.` };
  if (it.craft.level > lvl) return { blocker: `${it.name} needs ${label} Lv ${it.craft.level} (have ${lvl}).` };
  if (it.craft.level <= lvl - 10) return { blocker: `${it.name} (recipe Lv ${it.craft.level}) gives no XP at ${label} Lv ${lvl} — pick a higher recipe.` };
  const pick = evalRecipe(ch, bank, it);
  if (!pick) return { blocker: `${it.name}: materials are out of reach (stock the bank or level the gathering skill).` };
  return { pick };
}

const NO_STEPS: AcquisitionPlan = { steps: [], estActions: 0, estSeconds: 0, feasible: false, blockers: [] };

/** Compile the train-craft goal: the CURRENT best batch as a step preview, plus
 *  the execution spec the campaign loop runs until the target level. */
export function compileTrainCraft(ch: Character, bank: { code: string; quantity: number }[], goal: { kind: "train-craft"; skill: string; target: number; recipe?: string }): Plan {
  const label = titleCase(goal.skill);
  const lvl = skillLevel(ch, goal.skill);
  const execution = { targets: [], repeat: 0, mode: "train-craft" as const, skill: goal.skill, skillTarget: goal.target, recipe: goal.recipe };

  if (lvl >= goal.target) {
    return { goal, acquisition: { ...NO_STEPS, blockers: [`${label} is already Lv ${lvl}.`] }, execution, summary: `${label} is already Lv ${lvl}.` };
  }
  const choice = goal.recipe
    ? forcedTrainPick(ch, bank, goal.skill, goal.recipe)
    : { pick: trainingRecipe(ch, bank, goal.skill) };
  if (!choice.pick) {
    return {
      goal,
      acquisition: { ...NO_STEPS, blockers: [choice.blocker ?? `No craftable ${label} recipe within the XP window (Lv ${Math.max(1, lvl - 9)}–${lvl}) — its materials are out of reach (stock the bank or level the gathering skill first).`] },
      execution,
      summary: `Train ${label} to Lv ${goal.target}: no workable recipe yet.`,
    };
  }
  const pick = choice.pick;
  const recyclable = pick.recipe.recyclable !== false;
  return {
    goal,
    acquisition: pick.acq,
    execution,
    summary:
      `Train ${label} ${lvl}→${goal.target}: craft ${itemName(pick.recipe.code)} ×${pick.batch} per batch` +
      `${recyclable ? ", recycle, repeat" : ", bank the output, repeat"}` +
      `${goal.recipe ? " (pinned recipe)" : " — the recipe upgrades as you level"}.`,
  };
}
