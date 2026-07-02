// Catalog-backed stat derivations for a (possibly hypothetical) gear set — pure.
//
// The Character the API returns already carries its *current* totals (base +
// equipped gear). We need two things the raw totals don't give us:
//   1. the character's BASE stats (level-derived, gear stripped) so we can score
//      a *different* gear set — derived formula-free by subtracting the currently
//      equipped items' effects from the current totals;
//   2. a clean, normalized stat block + the list of *combat* effects (runes /
//      utilities) that the turn engine in combat.ts needs.
//
// Pure combat primitives live in ./types (no catalog dependency).

import { item } from "../catalog";
import { GEAR_SLOTS, slotCode } from "../types/api";
import type { Character, GearSlot } from "../types/api";
import type { ItemEffect } from "../types/catalog";
import { STAT_CODES, STAT_KEYS, isCombatEffect, zeroStats } from "./types";
import type { EffectEntry, EffectiveStats, Fighter } from "./types";

export { ELEMENTS, elementDamagePct, isCombatEffect, isConsumableEffect, zeroStats } from "./types";
export type { Element, EffectEntry, EffectiveStats, Fighter } from "./types";

/** Fold one item's effects into a stat accumulator, collecting combat effects aside. */
function foldEffects(acc: EffectiveStats, effects: ItemEffect[] | undefined, combat: EffectEntry[], sign = 1): void {
  if (!effects) return;
  for (const e of effects) {
    if (STAT_CODES.has(e.code)) {
      acc[e.code as keyof EffectiveStats] += sign * e.value;
    } else if (isCombatEffect(e.code)) {
      combat.push({ code: e.code, value: sign * e.value });
    }
  }
}

/** The non-empty item codes currently equipped in a character's 16 slots. */
export function equippedCodes(ch: Character): string[] {
  const out: string[] = [];
  for (const slot of GEAR_SLOTS) {
    const code = slotCode(ch, slot as GearSlot);
    if (code) out.push(code);
  }
  return out;
}

/** Character's current totals as a normalized stat block (base + equipped gear). */
export function currentStats(ch: Character): EffectiveStats {
  const s = zeroStats();
  s.hp = ch.max_hp;
  s.attack_fire = ch.attack_fire; s.attack_earth = ch.attack_earth;
  s.attack_water = ch.attack_water; s.attack_air = ch.attack_air;
  s.dmg = ch.dmg; s.dmg_fire = ch.dmg_fire; s.dmg_earth = ch.dmg_earth;
  s.dmg_water = ch.dmg_water; s.dmg_air = ch.dmg_air;
  s.res_fire = ch.res_fire; s.res_earth = ch.res_earth;
  s.res_water = ch.res_water; s.res_air = ch.res_air;
  s.critical_strike = ch.critical_strike; s.haste = ch.haste;
  s.wisdom = ch.wisdom; s.prospecting = ch.prospecting;
  return s;
}

/**
 * Character's BASE stats with all gear stripped: current totals minus the effects
 * of everything currently equipped. Formula-free, so it survives game-balance
 * changes. Combat effects are dropped (they aren't part of the always-on block).
 */
export function baseStats(ch: Character): EffectiveStats {
  const s = currentStats(ch);
  const scratch: EffectiveStats = zeroStats();
  const junk: EffectEntry[] = [];
  for (const code of equippedCodes(ch)) foldEffects(scratch, item(code)?.effects, junk, 1);
  for (const k of STAT_KEYS) s[k] -= scratch[k];
  // `initiative` isn't reported on Character totals, so `currentStats` left it 0
  // and we just subtracted equipped initiative into the negatives — reset to 0.
  s.initiative = 0;
  return s;
}

/**
 * Fold a gear set onto a *precomputed* base stat block. The BIS search reuses one
 * base across thousands of candidate sets, so this avoids re-deriving the base
 * (which re-scans the equipped gear) on every simulate() call.
 */
export function applyGear(base: EffectiveStats, codes: string[]): Fighter {
  const stats = { ...base };
  const effects: EffectEntry[] = [];
  for (const code of codes) foldEffects(stats, item(code)?.effects, effects, 1);
  return { stats, effects };
}

/**
 * The Fighter (stats + combat effects) that results from equipping `codes` on top
 * of the character's base stats. `codes` is the full intended slot set (weapon,
 * armor, jewelry, artifacts, utilities, rune…). Unknown codes are ignored.
 */
export function fighterForGear(ch: Character, codes: string[]): Fighter {
  return applyGear(baseStats(ch), codes);
}

/** The Fighter for a character's *current* equipment, straight off its totals. */
export function currentFighter(ch: Character): Fighter {
  const stats = currentStats(ch);
  const effects: EffectEntry[] = [];
  for (const code of equippedCodes(ch)) {
    for (const e of item(code)?.effects ?? []) {
      if (isCombatEffect(e.code)) effects.push({ code: e.code, value: e.value });
      if (e.code === "initiative") stats.initiative += e.value; // not in Character totals
    }
  }
  return { stats, effects };
}
