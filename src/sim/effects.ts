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
 *
 * Added 2026-11-17. The docs give only the one-line descriptions, so each
 * reading below is an assumption — sim/validate.ts's fight-log check is the
 * arbiter (a real fight vs one of these monsters that mismatches says which):
 *  - poison / burn  : applied at the start of the BEARER's first turn (so a
 *                     faster opponent takes no tick on its own first turn)
 *  - antipoison     : start of own turn, before the poison tick: poison −= value,
 *                     permanently (small antidote 20 erases a spider's 20)
 *  - corrupted      : after each attack taken, res −= value POINTS for every
 *                     element the attacker has attack in (can go negative)
 *  - protective_bubble: +value res on one element, re-rolled every fight turn,
 *                     never the previous one; EV mode = each element ¼ of the time
 *  - sun_shield     : every hit the bearer takes −value% (solo: each is the turn's first)
 *  - greed          : +value dmg% (added to dmg, like a stat) per 10% of max HP
 *                     lost, counted over all damage taken (heals don't undo it)
 *  - frenzy         : after a crit, +value dmg% on the next attack; EV mode =
 *                     crit chance × value from the 2nd attack on
 *  - enchanted_mirror: a hit taken deals value% back to the attacker, at most
 *                     once per 3 FIGHT turns; attacks only, not DoTs
 *  - void_drain     : every 4 of the bearer's own turns, value% of the
 *                     opponent's CURRENT HP moves to the bearer
 *  - shell (task 042): below 40% HP, +value res on every element through the
 *                     hits of its next 3 own turns, once a fight, in a boss
 *                     fight only (a solo fight against a boss too)
 */
export const MODELED = new Set<string>([
  "poison", "burn", "barrier", "healing", "reconstitution", "berserker_rage", "lifesteal",
  "boost_hp",
  "boost_dmg_fire", "boost_dmg_earth", "boost_dmg_water", "boost_dmg_air",
  "boost_res_fire", "boost_res_earth", "boost_res_water", "boost_res_air",
  "restore",
  "antipoison", "corrupted", "protective_bubble", "sun_shield", "greed", "frenzy", "enchanted_mirror", "void_drain",
  "shell",
]);

/**
 * Effects that require *allies* and are therefore inert in a solo (1 character vs
 * 1 monster) fight — the only kind this client's loops run. Treated as no-ops,
 * not as "unmodeled unknowns", so they don't pollute the confidence flag.
 * Task 042: healing_aura and splash_restore are played in a party's fight (combat.ts simulateParty): every 2 of the
 * bearer's own turns the other members standing heal value% of their max HP; at the start of the bearer's turn the other
 * member that has lost the most HP, if under half its HP, gets value HP (one potion a proc).
 */
export const SOLO_NOOP = new Set<string>([
  "guard", "healing_aura", "splash_restore", "vampiric_strike",
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
