// Action cooldown formulas, in one place.
//
// The game returns the authoritative cooldown on every action, so these are
// used only for *offline estimation* — currently just the combat forecast's
// rest-time. Treat every number as an estimate/floor.
// Source: docs.artifactsmmo.com/concepts/actions.

/** Minimum cooldown any action can have. */
export const MIN_COOLDOWN = 3;

/** Rest: 1 s per 1% of max HP healed (min 3 s), 0 if nothing to heal — the docs (rework.md, report 004), and the log
 *  (task 012: 1,205 rests of 11-19; the seconds per HP follow each character's max HP, 58 of Second's rests ended
 *  sooner than "1 s per 5 HP" allows). `maxHp` omitted: 500, where both readings agree (src/sim/combat.ts's forecast
 *  field and the harness's fake still call it so). */
export function restSeconds(hpToHeal: number, maxHp = 500): number {
  if (hpToHeal <= 0) return 0;
  return Math.max(MIN_COOLDOWN, Math.ceil((100 * hpToHeal) / Math.max(1, maxHp) - 1e-9));
}
