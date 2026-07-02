// Which combat effects the simulator actually models — and honest reporting of
// the ones it doesn't. The mechanics live in combat.ts (a single turn loop is
// clearer than scattering them across hooks); this module is the *audit surface*
// so the forecast UI can flag "this prediction ignores effect X".
//
// Semantics quoted from public/data/effects.json.

import { isCombatEffect } from "./types";

/**
 * Combat effects with turn-by-turn semantics implemented in combat.ts.
 *  - poison        : flat HP/turn on the opponent from its first turn
 *  - burn          : value% of attacker's total attack, decaying 10%/turn
 *  - barrier       : value HP shield at start + every 5 turns (absorbs hits)
 *  - healing       : +value% max HP every 3 turns
 *  - reconstitution: full HP heal every value turns
 *  - berserker_rage: +value% damage permanently below 25% HP (once)
 *  - lifesteal     : heal value% of total attack on a crit (EV)
 *  - boost_hp / boost_dmg_* / boost_res_* : fight-start buffs
 *  - restore       : +value HP at start of turn while below 50% HP
 */
export const MODELED = new Set<string>([
  "poison", "burn", "barrier", "healing", "reconstitution", "berserker_rage", "lifesteal",
  "boost_hp",
  "boost_dmg_fire", "boost_dmg_earth", "boost_dmg_water", "boost_dmg_air",
  "boost_res_fire", "boost_res_earth", "boost_res_water", "boost_res_air",
  "restore",
]);

/**
 * Effects that require *allies* and are therefore inert in a solo (1 character vs
 * 1 monster) fight — the only kind this client's loops run. Treated as no-ops,
 * not as "unmodeled unknowns", so they don't pollute the confidence flag.
 */
export const SOLO_NOOP = new Set<string>([
  "guard", "healing_aura", "splash_restore", "vampiric_strike", "shell",
]);

/**
 * Combat effect codes on a set of items/monster that the simulator does NOT
 * model (and that aren't harmless in a solo fight) — surfaced as a confidence
 * warning next to the forecast. De-duplicated, order-stable.
 */
export function unmodeledEffects(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of codes) {
    if (!isCombatEffect(code)) continue;
    if (MODELED.has(code) || SOLO_NOOP.has(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}
