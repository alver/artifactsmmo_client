// Action cooldown formulas, in one place.
//
// The game returns the authoritative cooldown on every action, so these are used
// only for *offline estimation* — pricing a plan before we run it (acquire.ts),
// the combat forecast's rest-time, and the campaign runner's ETA. Treat every
// number here as an estimate/floor: real cost also includes bank round-trips and
// pathing the estimate can't know about. Sources: docs.artifactsmmo.com/concepts/actions.

/** Minimum cooldown any action can have. */
export const MIN_COOLDOWN = 3;

/** Movement: 5s per tile (Manhattan distance from a→b). */
export function moveSeconds(fromX: number, fromY: number, toX: number, toY: number): number {
  const tiles = Math.abs(toX - fromX) + Math.abs(toY - fromY);
  return tiles === 0 ? 0 : tiles * 5;
}

/** Gathering: 30s + resource_level/2, reduced by a matching gathering-skill bonus %. */
export function gatherSeconds(resourceLevel: number, skillBonusPct = 0): number {
  const base = 30 + resourceLevel / 2;
  return Math.max(MIN_COOLDOWN, base * (1 - skillBonusPct / 100));
}

/** Crafting: 5s per item produced. */
export function craftSeconds(quantity = 1): number {
  return Math.max(MIN_COOLDOWN, quantity * 5);
}

/** Recycling: 3s per item. */
export function recycleSeconds(quantity = 1): number {
  return Math.max(MIN_COOLDOWN, quantity * 3);
}

/** Bank deposit/withdraw & NPC trade: 3s per item stack moved. */
export function bankSeconds(stacks = 1): number {
  return Math.max(MIN_COOLDOWN, stacks * 3);
}

/** Rest: 1s per 5 HP healed (min 3s), 0 if nothing to heal. */
export function restSeconds(hpToHeal: number): number {
  if (hpToHeal <= 0) return 0;
  return Math.max(MIN_COOLDOWN, Math.ceil(hpToHeal / 5));
}

/** Fight: 2s per turn fought, reduced by haste (~1% per point). */
export function fightSeconds(turns: number, haste = 0): number {
  return Math.max(MIN_COOLDOWN, turns * 2 * (1 - Math.min(haste, 90) / 100));
}
