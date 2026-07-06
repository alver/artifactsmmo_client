// Between-fight food selection — pure catalog scans, bank-only.
//
// The simple rule of the bank-reset model: consumables come from existing bank
// (or inventory) stock only. Nothing is cooked or brewed for a plan — when the
// stock runs out the runner heals by rest.

import { catalog } from "../catalog";
import { canEquip } from "./bis";
import type { BankItem, Character } from "../types/api";
import type { Item } from "../types/catalog";

const effectValue = (it: Item, code: string): number => it.effects?.find((e) => e.code === code)?.value ?? 0;

const stockOf = (ch: Character, bank: BankItem[], code: string): number => {
  let n = 0;
  for (const s of ch.inventory ?? []) if (s.code === code) n += s.quantity;
  for (const b of bank) if (b.code === code) n += b.quantity;
  return n;
};

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
    const candidates: { it: Item; heal: number }[] = [];
    for (const it of catalog().items.values()) {
      if (it.type !== "consumable" || it.subtype !== "food" || it.code === exclude) continue;
      const heal = effectValue(it, "heal");
      if (heal > 0 && canEquip(ch, it)) candidates.push({ it, heal });
    }
    candidates.sort((a, b) => b.heal - a.heal);
    for (const { it, heal } of candidates) {
      const stock = stockOf(ch, bank, it.code);
      if (stock > 0) return { code: it.code, heal, stock };
    }
    return undefined;
  } catch {
    return undefined;
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

/** Expected food units eaten per fight (for live re-stocking mid-task). */
export function foodPerFight(food: FoodChoice, perFightHpLoss: number): number {
  return (perFightHpLoss * 1.3) / food.heal;
}
