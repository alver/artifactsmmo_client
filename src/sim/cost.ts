// Action cooldown formulas, in one place.
//
// The game returns the authoritative cooldown on every action, so these are
// used only for *offline estimation* — currently just the combat forecast's
// rest-time. Treat every number as an estimate/floor.
// Source: docs.artifactsmmo.com/concepts/actions.

/** Minimum cooldown any action can have. */
export const MIN_COOLDOWN = 3;

/** Rest: 1s per 5 HP healed (min 3s), 0 if nothing to heal. */
export function restSeconds(hpToHeal: number): number {
  if (hpToHeal <= 0) return 0;
  return Math.max(MIN_COOLDOWN, Math.ceil(hpToHeal / 5));
}
