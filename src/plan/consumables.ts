// Consumable & tool selection for the task-plan compiler — pure catalog scans.
//
// "Self-sufficiency" is the rule: a candidate only qualifies if THIS character
// can produce or already holds it (bank stock, or cook/brew it himself, possibly
// after a small skill-training detour). Anything else is not planned — it shows
// up as a "needs in bank" report instead.
//
// The obtainability probe (resolve) walks the whole recipe tree, so each picker
// ranks candidates by the cheap criteria first and probes down the ranking only
// until one qualifies.

import { catalog } from "../catalog";
import { canEquip } from "./bis";
import { resolve, trainingResource } from "./acquire";
import type { BankItem, Character } from "../types/api";
import type { Item } from "../types/catalog";

const effectValue = (it: Item, code: string): number => it.effects?.find((e) => e.code === code)?.value ?? 0;

const stockOf = (ch: Character, bank: BankItem[], code: string): number => {
  let n = 0;
  for (const s of ch.inventory ?? []) if (s.code === code) n += s.quantity;
  for (const b of bank) if (b.code === code) n += b.quantity;
  return n;
};

/** A food pick: what to eat between fights, and how much of it exists/can be made. */
export interface FoodChoice {
  code: string;
  heal: number; // HP per unit (the `heal` effect, applied by the `use` action)
  stock: number; // units already in inventory + bank
  producible: boolean; // character can cook more himself (skill + ingredients)
}

/**
 * Best between-fight healing food: highest `heal` among foods that are either
 * already stocked or cookable by this character with self-obtainable
 * ingredients (raw from bank, else gather at his level). `exclude` bars a code
 * from consideration (never eat the task deliverable). `undefined` ⇒ rest-only.
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
      const cookable = !!it.craft && it.craft.skill === "cooking" && ch.cooking_level >= it.craft.level;
      const producible =
        cookable && resolve(ch, bank, it.craft!.items.map((i) => ({ code: i.code, quantity: i.quantity }))).blockers.length === 0;
      const stock = stockOf(ch, bank, it.code);
      if (stock > 0 || producible) return { code: it.code, heal, stock, producible };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * How many units of `food` to stock for `fightsLeft` fights: expected HP loss
 * with a 30% safety margin, capped to a third of the inventory so loot and
 * materials keep room. Not producible ⇒ capped at what already exists.
 */
export function foodQuantity(food: FoodChoice, perFightHpLoss: number, fightsLeft: number, ch: Character): number {
  const want = Math.ceil((perFightHpLoss * Math.max(1, fightsLeft) * 1.3) / food.heal);
  const cap = Math.max(1, Math.floor(ch.inventory_max_items / 3));
  const qty = Math.min(want, cap);
  return food.producible ? qty : Math.min(qty, food.stock);
}

/** Expected food units eaten per fight (for live re-stocking mid-task). */
export function foodPerFight(food: FoodChoice, perFightHpLoss: number): number {
  return (perFightHpLoss * 1.3) / food.heal;
}

/**
 * Best gathering tool for `skill` the character can equip and obtain alone.
 * Tools are weapon-slot items whose skill-named effect is a negative gather-
 * cooldown percentage — most negative wins. `undefined` ⇒ gather bare-handed.
 */
export function bestTool(ch: Character, skill: string, bank: BankItem[], owned: Set<string>): string | undefined {
  try {
    const candidates: { code: string; value: number }[] = [];
    for (const it of catalog().items.values()) {
      if (it.subtype !== "tool") continue;
      const e = it.effects?.find((x) => x.code === skill && x.value < 0);
      if (e && canEquip(ch, it)) candidates.push({ code: it.code, value: e.value });
    }
    candidates.sort((a, b) => a.value - b.value); // most negative (best) first
    for (const c of candidates) {
      if (owned.has(c.code) || resolve(ch, bank, [{ code: c.code, quantity: 1 }]).blockers.length === 0) return c.code;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * The health potion every character should be able to brew for himself: the
 * strongest utility-slot `restore` potion whose alchemy recipe is already met
 * or trainable within a small gap (gather sunflowers → alchemy 5 → brew).
 */
export function potionCandidate(ch: Character, maxTrainGap = 5): { code: string; restore: number } | undefined {
  try {
    const candidates: { it: Item; restore: number }[] = [];
    for (const it of catalog().items.values()) {
      if (it.type !== "utility" || !it.craft || it.craft.skill !== "alchemy") continue;
      const restore = effectValue(it, "restore");
      if (restore <= 0 || !canEquip(ch, it)) continue;
      const gap = it.craft.level - ch.alchemy_level;
      if (gap > 0 && (gap > maxTrainGap || !trainingResource("alchemy", ch.alchemy_level))) continue;
      candidates.push({ it, restore });
    }
    candidates.sort((a, b) => b.restore - a.restore);
    for (const { it, restore } of candidates) {
      // Ingredients must be self-obtainable too (sunflower is; rarer bases may
      // not be). Empty bank on purpose: "can brew alone", not "bank happens to
      // hold the base today".
      const probe = resolve(ch, [], it.craft!.items.map((i) => ({ code: i.code, quantity: i.quantity })), { train: true, maxTrainGap });
      if (probe.blockers.length === 0) return { code: it.code, restore };
    }
    return undefined;
  } catch {
    return undefined;
  }
}
