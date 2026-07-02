// Pure combat-stat primitives — no catalog / no import.meta, so combat.ts stays
// unit-testable in isolation (see stats.ts for the catalog-backed derivations).

export const ELEMENTS = ["fire", "earth", "water", "air"] as const;
export type Element = (typeof ELEMENTS)[number];

/** Normalized always-on combat stat block. */
export interface EffectiveStats {
  hp: number;
  attack_fire: number; attack_earth: number; attack_water: number; attack_air: number;
  dmg: number;
  dmg_fire: number; dmg_earth: number; dmg_water: number; dmg_air: number;
  res_fire: number; res_earth: number; res_water: number; res_air: number;
  critical_strike: number;
  haste: number;
  initiative: number;
  wisdom: number;
  prospecting: number;
  // gathering cooldown reductions (%), for the non-combat BIS objective
  mining: number; woodcutting: number; fishing: number; alchemy: number;
}

/** A combat effect (rune / utility / consumable) carried into a fight. */
export interface EffectEntry {
  code: string;
  value: number;
}

/** One "fighter" the simulator consumes: always-on stats + its combat effects. */
export interface Fighter {
  stats: EffectiveStats;
  effects: EffectEntry[];
}

export const STAT_KEYS: (keyof EffectiveStats)[] = [
  "hp",
  "attack_fire", "attack_earth", "attack_water", "attack_air",
  "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air",
  "res_fire", "res_earth", "res_water", "res_air",
  "critical_strike", "haste", "initiative", "wisdom", "prospecting",
  "mining", "woodcutting", "fishing", "alchemy",
];

/** Effect codes that map 1:1 onto a stat-block field (always-on equipment stats). */
export const STAT_CODES = new Set<string>(STAT_KEYS as string[]);

export function zeroStats(): EffectiveStats {
  const s = {} as EffectiveStats;
  for (const k of STAT_KEYS) s[k] = 0;
  return s;
}

/** Consumable/non-combat effect codes that never affect a fight simulation. */
export function isConsumableEffect(code: string): boolean {
  return (
    code === "heal" || code === "gold" || code === "teleport" || code === "gems" ||
    code === "inventory_space" || code === "threat"
  );
}

/** True for a combat-type effect resolved by the turn engine (not an always-on stat). */
export function isCombatEffect(code: string): boolean {
  return !STAT_CODES.has(code) && !isConsumableEffect(code);
}

/** Sum of an element damage bonus (global + element-specific), as a %. */
export function elementDamagePct(stats: EffectiveStats, el: Element): number {
  return stats.dmg + (stats[`dmg_${el}` as keyof EffectiveStats] as number);
}
