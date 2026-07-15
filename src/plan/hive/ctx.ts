// HiveCtx helpers — pure functions over the snapshot the runtime builds.
// Fleet-level analogues of the per-character helpers scattered around plan/:
// who has a skill, who crafts what, what the whole account owns, and the
// memoized fleet-pool BIS the goal scorers lean on.

import { bestInSlot } from "../bis";
import { GEAR_SLOTS, slotCode, slotQuantity } from "../../types/api";
import type { BankItem, Character } from "../../types/api";
import type { GearRecommendation } from "../types";
import type { HiveCtx } from "./types";

/** The four workshop specializations (mirrors store.CRAFT_TRAIN_SKILLS keys —
 *  duplicated so the pure domain never imports from state/). */
export const CRAFT_SKILLS = ["weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking"] as const;
export const GATHER_SKILLS = ["mining", "woodcutting", "fishing", "alchemy"] as const;

export const skillLevel = (ch: Character, skill: string): number =>
  (ch as unknown as Record<string, number>)[`${skill}_level`] ?? 0;

/** Bank contents as a mutable count map (the resolver's virtual stock). */
export function bankStock(ctx: HiveCtx): Map<string, number> {
  const q = new Map<string, number>();
  for (const b of ctx.bank) if (b.code && b.quantity > 0) q.set(b.code, (q.get(b.code) ?? 0) + b.quantity);
  return q;
}

/** The participant with the highest level in a skill. */
export function fleetSkill(ctx: HiveCtx, skill: string): { level: number; character: string } | undefined {
  let best: { level: number; character: string } | undefined;
  for (const ch of ctx.characters) {
    const level = skillLevel(ch, skill);
    if (!best || level > best.level) best = { level, character: ch.name };
  }
  return best;
}

/** Pure clone of store.craftFocus, reading pins from ctx instead of the signal. */
export function hiveCraftFocus(ch: Character, ctx: HiveCtx): string {
  const keys: string[] = [...CRAFT_SKILLS];
  const pin = ctx.craftPins[ch.name];
  if (pin && keys.includes(pin)) return pin;
  return keys.reduce((best, k) => (skillLevel(ch, k) > skillLevel(ch, best) ? k : best), keys[0]);
}

/**
 * Who should run a craft of this skill: the pinned specialist when one exists
 * (their whole point), else the highest-skilled participant. undefined only
 * when there are no participants.
 */
export function crafterFor(ctx: HiveCtx, skill: string): { ch: Character; level: number } | undefined {
  const pinned = ctx.characters.find((c) => ctx.craftPins[c.name] === skill);
  if (pinned) return { ch: pinned, level: skillLevel(pinned, skill) };
  let best: { ch: Character; level: number } | undefined;
  for (const ch of ctx.characters) {
    const level = skillLevel(ch, skill);
    if (!best || level > best.level) best = { ch, level };
  }
  return best;
}

/** Everything the account owns: bank + every participant's inventory + worn gear.
 *  Param is deliberately narrow — plan/coverage.ts calls this outside a HiveCtx
 *  (with ALL characters, not just hive participants). */
export function fleetOwned(ctx: Pick<HiveCtx, "characters" | "bank">): { owned: Set<string>; ownedQty: Map<string, number> } {
  const q = new Map<string, number>();
  const add = (code: string, n: number): void => {
    if (code && n > 0) q.set(code, (q.get(code) ?? 0) + n);
  };
  for (const b of ctx.bank) add(b.code, b.quantity);
  for (const ch of ctx.characters) {
    for (const s of ch.inventory ?? []) add(s.code, s.quantity);
    for (const g of GEAR_SLOTS) {
      const worn = slotCode(ch, g);
      if (worn) add(worn, g.startsWith("utility") ? slotQuantity(ch, g) || 1 : 1);
    }
  }
  return { owned: new Set(q.keys()), ownedQty: q };
}

// Memoized per bank ARRAY REFERENCE (bank echoes replace the array, so identity
// is a valid generation key — the same trick desiredForJob uses). The inner key
// carries the character's level so a level-up invalidates naturally; worn-gear
// churn between bank echoes is planning noise the recompile-at-barrier loop
// absorbs.
const _bisCache = new WeakMap<BankItem[], Map<string, GearRecommendation | null>>();

/**
 * The best set this character could wear vs a monster, drawn from everything
 * the ACCOUNT owns (`extra` adds not-yet-owned candidates, e.g. craftable
 * upgrades). Utilities are excluded — potion picks are the live gear swap's
 * business, and leaving them out keeps the search cheap and stable. undefined
 * when the monster is unknown.
 */
export function fleetBis(ctx: HiveCtx, ch: Character, monsterCode: string, extra?: string[]): GearRecommendation | undefined {
  let byKey = _bisCache.get(ctx.bank);
  if (!byKey) {
    byKey = new Map();
    _bisCache.set(ctx.bank, byKey);
  }
  const key = `${ch.name}|${ch.level}|${monsterCode}|${(extra ?? []).join(",")}`;
  const hit = byKey.get(key);
  if (hit !== undefined) return hit ?? undefined;
  const { owned, ownedQty } = fleetOwned(ctx);
  // Planning-grade pool caps: half the runtime search's width, ~4× cheaper —
  // the live gear swap (desiredForJob) re-solves at full width anyway.
  const rec =
    bestInSlot(ch, monsterCode, {
      owned,
      ownedQty,
      includeCraftable: false,
      noUtilities: true,
      extraCandidates: extra,
      perSlotCap: 6,
      weaponCap: 6,
    })[0] ?? null;
  byKey.set(key, rec);
  return rec ?? undefined;
}
