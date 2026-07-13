// Between-fight food selection & sourcing — pure catalog scans.
//
// Fighters keep themselves fed through a three-tier chain, best healing first
// within each tier: eat what is already stocked (inventory ∪ bank), else cook
// the best food recipe the current stock can feed, else gather the raw
// materials in the field (skill permitting) and cook them. When no tier is
// feasible the runner simply heals by rest — food is opportunistic and never
// blocks a queue.

import { catalog } from "../catalog";
import { canEquip } from "./bis";
import type { BankItem, Character } from "../types/api";
import type { FoodSpec } from "./types";
import type { CraftRecipe, Item, Resource } from "../types/catalog";

const effectValue = (it: Item, code: string): number => it.effects?.find((e) => e.code === code)?.value ?? 0;

const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

const invQty = (ch: Character, code: string): number => {
  let n = 0;
  for (const s of ch.inventory ?? []) if (s.code === code) n += s.quantity;
  return n;
};

const stockOf = (ch: Character, bank: BankItem[], code: string): number => {
  let n = invQty(ch, code);
  for (const b of bank) if (b.code === code) n += b.quantity;
  return n;
};

/** Healing foods the character may use, best heal first (pure catalog scan). */
function healingFoods(ch: Character, exclude?: string): { it: Item; heal: number }[] {
  const out: { it: Item; heal: number }[] = [];
  for (const it of catalog().items.values()) {
    if (it.type !== "consumable" || it.subtype !== "food" || it.code === exclude) continue;
    const heal = effectValue(it, "heal");
    if (heal > 0 && canEquip(ch, it)) out.push({ it, heal });
  }
  return out.sort((a, b) => b.heal - a.heal);
}

/** A food pick: what to eat between fights, and how much of it exists. */
export interface FoodChoice {
  code: string;
  heal: number; // HP per unit (the `heal` effect, applied by the `use` action)
  stock: number; // units already in inventory + bank
}

/**
 * Best between-fight healing food: highest `heal` among foods already stocked
 * in inventory ∪ bank. `exclude` bars a code from consideration (never eat the
 * task deliverable). `undefined` ⇒ rest-only.
 */
export function bestFood(ch: Character, bank: BankItem[], exclude?: string): FoodChoice | undefined {
  try {
    for (const { it, heal } of healingFoods(ch, exclude)) {
      const stock = stockOf(ch, bank, it.code);
      if (stock > 0) return { code: it.code, heal, stock };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** Best healing food already IN HAND — what healOnce should eat right now. */
export function carriedFood(ch: Character, exclude?: string): FoodSpec | undefined {
  try {
    for (const { it, heal } of healingFoods(ch, exclude)) {
      if (invQty(ch, it.code) > 0) return { code: it.code, heal };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * The surest resource tile that drops `code` at the character's current skill
 * (lowest drop `rate` = most frequent, then lowest resource level).
 */
export function gatherSourceFor(ch: Character, code: string): Resource | undefined {
  const rateOf = (r: Resource): number => r.drops.find((d) => d.code === code)?.rate ?? Infinity;
  return [...catalog().resources.values()]
    .filter((r) => r.drops.some((d) => d.code === code) && skillLevel(ch, r.skill) >= r.level)
    .sort((a, b) => rateOf(a) - rateOf(b) || a.level - b.level)[0];
}

/**
 * Where the next batch of food comes from: "bank" = stocked, withdraw it;
 * "cook" = every ingredient is in stock, cook at the recipe's workshop;
 * "gather" = at least one ingredient must be gathered in the field first
 * (each is stocked or gatherable at the current skill). The executor
 * (exec.ts provisionFood) turns this into one action per tick.
 */
export type FoodPlan =
  | { source: "bank"; code: string; heal: number; stock: number }
  | { source: "cook" | "gather"; code: string; heal: number; recipe: CraftRecipe };

export function foodPlan(ch: Character, bank: BankItem[], exclude?: string): FoodPlan | undefined {
  try {
    const stocked = bestFood(ch, bank, exclude);
    if (stocked) return { source: "bank", ...stocked };

    // Cook/gather tiers share one scan: recipes the character can run NOW.
    let cook: FoodPlan | undefined;
    let gather: FoodPlan | undefined;
    for (const { it, heal } of healingFoods(ch, exclude)) {
      const recipe = it.craft;
      if (!recipe || skillLevel(ch, recipe.skill) < recipe.level) continue;
      const short = recipe.items.filter((g) => stockOf(ch, bank, g.code) < g.quantity);
      if (short.length === 0) {
        cook ??= { source: "cook", code: it.code, heal, recipe };
        break; // foods come best-heal first — nothing below beats this
      }
      if (!gather && short.every((g) => gatherSourceFor(ch, g.code))) {
        gather = { source: "gather", code: it.code, heal, recipe };
      }
    }
    return cook ?? gather;
  } catch {
    return undefined;
  }
}

/**
 * Utility potions the character could put on RIGHT NOW or brew: an alchemy
 * recipe at the current skill, equippable, and every ingredient either stocked
 * (inventory ∪ bank) or gatherable at the current skill. Fed to the fight BIS
 * solver as extra candidates — adopted only when they beat the owned-only set
 * (see jobGear), and produced by exec.ts provisionPotions when the differ
 * can't find them.
 */
export function brewablePotions(ch: Character, bank: BankItem[]): string[] {
  try {
    const out: string[] = [];
    for (const it of catalog().items.values()) {
      if (it.type !== "utility" || !it.craft) continue;
      if (skillLevel(ch, it.craft.skill) < it.craft.level) continue;
      if (!canEquip(ch, it)) continue;
      const short = it.craft.items.filter((g) => stockOf(ch, bank, g.code) < g.quantity);
      if (short.every((g) => gatherSourceFor(ch, g.code))) out.push(it.code);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * How many units of `food` to stock for `fightsLeft` fights: expected HP loss
 * with a 30% safety margin, capped to a third of the inventory so loot and
 * materials keep room, and always capped at what actually exists.
 */
export function foodQuantity(food: FoodChoice, perFightHpLoss: number, fightsLeft: number, ch: Character): number {
  const want = Math.ceil((perFightHpLoss * Math.max(1, fightsLeft) * 1.3) / food.heal);
  const cap = Math.max(1, Math.floor(ch.inventory_max_items / 3));
  return Math.min(want, cap, food.stock);
}
