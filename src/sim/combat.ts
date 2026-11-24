// Deterministic single-fight simulator — the keystone the whole planner rests on.
//
// Turns "can this character beat that monster?" from a guess into a computed
// answer. Pure and fast (a few hundred float ops per fight) so the BIS search can
// call it thousands of times synchronously in the browser.
//
// Damage per element (from game docs, VALIDATE against real fight logs before the
// forecast is allowed to *block* anything — see validate.ts):
//   raw   = round(attack_e × (1 + (dmg + dmg_e)/100))
//   dealt = round(raw × (1 − res_e/100))          // resist factor floored at 0
// Critical strikes deal ×1.5; modeled as expected value: ×(1 + 0.5·p). Fights are
// turn-based, initiative decides who strikes first, and a fight not resolved
// within 100 turns is a LOSS for the player (the timeout case — common vs
// high-HP / self-healing monsters, and distinct from being killed).

import type { Monster } from "../types/catalog";
import { ELEMENTS } from "./types";
import type { Element, EffectiveStats, Fighter } from "./types";
import { restSeconds } from "./cost";

const MAX_TURNS = 100;

export interface FightForecast {
  win: boolean;
  turns: number; // actions taken until resolution (100 if timed out)
  hpRemaining: number; // player HP at end (expected)
  hpLostPct: number; // 0..1
  timedOut: boolean; // hit the 100-turn cap ⇒ player loses
  playerFirst: boolean;
  restSeconds: number; // cost to heal back to full before the next fight
  hpRestored: number; // HP restored by restore potions mid-fight: the `restore` value × procs (each proc burns one)
  margin: number; // win ? hpRemaining/maxHp : 0 — used to rank/gate gear sets
  maxHp: number;
  /** Units of each worn utility potion one fight consumes (task 010): a `restore` potion one per proc (the start of
   *  each own turn under half HP; task 027: two restore potions fire in slot order, the second only while HP is still under
   *  half after the first, and a worn stack stops when its quantity is spent — EffectEntry.qty), every other potion
   *  one a fight — a boost is applied once at the fight's start (`opening`). An empty object when none is worn. */
  used: Record<string, number>;
}

/** One attack (or DoT death) in a traced fight — for the playground's turn table. */
export interface TurnEvent {
  turn: number;
  actor: "player" | "monster";
  dmg: number;
  playerHp: number;
  monsterHp: number;
  note?: string; // "crit", "died to DoT", …
}

export interface SimOptions {
  /** Worst-case pass: player never crits, monster always crits. Used by BIS to
   *  reject gear whose EV win is really a coin-flip. */
  pessimistic?: boolean;
  /**
   * Roll critical strikes per attack with this RNG instead of folding them into
   * an expected value — the Monte Carlo mode. Crit damage uses the exact
   * per-element ×1.5 rounding the game applies; lifesteal heals only on a
   * rolled crit. Pass `() => 0` for the exact no-crit deterministic run.
   */
  rng?: () => number;
  /** Caller-provided sink: filled with one row per attack while simulating. */
  trace?: TurnEvent[];
}

/** One side of the fight, fully resolved into per-turn numbers. */
interface Combatant {
  hp: number;
  maxHp: number;
  barrier: number;
  turns: number;
  atk: Record<Element, number>;
  dmgPct: Record<Element, number>; // dmg + dmg_e (+ boost) — monsters have none
  res: Record<Element, number>; // own resistances — mutable (corrupted)
  // the cached attack vs the opponent, recomputed when `dirty`
  hitEV: number; // expected damage per attack, pre-multiplier
  hitNormal: number; // exact non-crit hit (sum of per-element rounded damage)
  hitCrit: number; // exact crit hit (per-element ×1.5, rounded, summed)
  dirty: boolean;
  bonus: number; // extra dmg% from greed stacks + frenzy
  dmgMult: number;
  totalAtk: number;
  crit: number; // 0..1
  init: number;
  // self regen / buffs
  restores: { v: number; left: number; n: number }[] | null; // task 027: one restore potion an entry, in slot order (its value, units left, procs)
  restored: number; // HP restored by potion procs so far
  healing: number; // % max hp / 3 turns
  reconstitution: number; // full heal every N turns
  barrierRegen: number;
  berserker: number; // % dmg gained below 25% hp
  berserked: boolean;
  lifesteal: number; // % of total attack healed on crit
  // DoTs this side applies to its opponent at the start of its first turn
  poisonApply: number;
  burnApply: number;
  // afflictions suffered
  poison: number;
  burnCur: number;
  burnActive: boolean;
  antipoison: number; // poison removed at the start of own turn
  corrupted: number; // own res drops this much per attack taken, per attacking element
  bubble: number; // protective bubble: +res% on one element
  bubbleEl: Element | null; // roll mode: the current bubble element
  sunShield: number; // % cut on every hit taken (solo: each is the turn's first)
  greed: number;
  greedStacks: number;
  damageTaken: number;
  frenzy: number;
  frenzyOn: boolean; // roll mode: last attack critted
  mirror: number; // enchanted mirror: % of a hit taken dealt back
  mirrorLast: number; // fight turn of the last reflection
  voidDrain: number; // % of the opponent's current HP drained every 4 own turns
}

/** Player NON-CRIT damage per element vs a monster's resistances (raw→resist). */
function playerHitElements(stats: EffectiveStats, boostDmg: Record<Element, number>, monster: Monster): Record<Element, number> {
  const out = { fire: 0, earth: 0, water: 0, air: 0 } as Record<Element, number>;
  for (const el of ELEMENTS) {
    const atk = stats[`attack_${el}` as keyof EffectiveStats];
    if (!atk) continue;
    const dmgPct = stats.dmg + (stats[`dmg_${el}` as keyof EffectiveStats] as number) + (boostDmg[el] ?? 0);
    const raw = Math.round(atk * (1 + dmgPct / 100));
    const mres = monster[`res_${el}` as keyof Monster] as number;
    const factor = Math.max(0, 1 - mres / 100);
    out[el] = Math.round(raw * factor);
  }
  return out;
}

/** Monster NON-CRIT damage per element vs the player's resistances (monsters have no dmg%). */
function monsterHitElements(monster: Monster, res: Record<Element, number>): Record<Element, number> {
  const out = { fire: 0, earth: 0, water: 0, air: 0 } as Record<Element, number>;
  for (const el of ELEMENTS) {
    const atk = monster[`attack_${el}` as keyof Monster] as number;
    if (!atk) continue;
    const factor = Math.max(0, 1 - (res[el] ?? 0) / 100);
    out[el] = Math.round(atk * factor);
  }
  return out;
}

/** Task 020: the boosts a fight starts with, summed in the effects' order (as a map of sums would): the dearest part of a
 *  fight was building that map and the boosts' names for every one. */
const BOOST_DMG: Record<string, Element | undefined> = Object.assign(Object.create(null), { boost_dmg_fire: "fire", boost_dmg_earth: "earth", boost_dmg_water: "water", boost_dmg_air: "air" });
const BOOST_RES: Record<string, Element | undefined> = Object.assign(Object.create(null), { boost_res_fire: "fire", boost_res_earth: "earth", boost_res_water: "water", boost_res_air: "air" });
/** The fight-start boosts / totals derived from a fighter's utility+rune effects. */
function opening(player: Fighter): { boostDmg: Record<Element, number>; pMaxHp: number; pRes: Record<Element, number> } {
  const boostDmg = { fire: 0, earth: 0, water: 0, air: 0 } as Record<Element, number>;
  const boostRes = { fire: 0, earth: 0, water: 0, air: 0 } as Record<Element, number>;
  let boostHp = 0;
  for (const e of player.effects) {
    const d = BOOST_DMG[e.code], r = BOOST_RES[e.code];
    if (d) boostDmg[d] += e.value;
    else if (r) boostRes[r] += e.value;
    else if (e.code === "boost_hp") boostHp += e.value;
  }
  const pMaxHp = player.stats.hp + boostHp;
  const pRes: Record<Element, number> = {
    fire: player.stats.res_fire + boostRes.fire,
    earth: player.stats.res_earth + boostRes.earth,
    water: player.stats.res_water + boostRes.water,
    air: player.stats.res_air + boostRes.air,
  };
  return { boostDmg, pMaxHp, pRes };
}

/** Exact NON-CRIT per-element damage both sides deal per attack, boosts included.
 *  This is what real fight-log lines are checked against (see sim/loglab.ts):
 *  a logged hit must equal one of these values, or its ×1.5-rounded crit. */
export interface ExpectedHits {
  player: Record<Element, number>;
  monster: Record<Element, number>;
}
export function expectedHits(player: Fighter, monster: Monster): ExpectedHits {
  const { boostDmg, pRes } = opening(player);
  return {
    player: playerHitElements(player.stats, boostDmg, monster),
    monster: monsterHitElements(monster, pRes),
  };
}

// ── the turn mechanics: module-level, so a simulate() call allocates no closures ──

function newSide(hp: number, atk: Record<Element, number>, dmgPct: Record<Element, number>, res: Record<Element, number>, crit: number, init: number): Combatant {
  return {
    hp, maxHp: hp, barrier: 0, turns: 0,
    atk, dmgPct, res, hitEV: 0, hitNormal: 0, hitCrit: 0, dirty: true, bonus: 0,
    dmgMult: 1, totalAtk: atk.fire + atk.earth + atk.water + atk.air, crit, init,
    restores: null, restored: 0, healing: 0, reconstitution: 0, barrierRegen: 0,
    berserker: 0, berserked: false, lifesteal: 0,
    poisonApply: 0, burnApply: 0, poison: 0, burnCur: 0, burnActive: false,
    antipoison: 0, corrupted: 0, bubble: 0, bubbleEl: null, sunShield: 0,
    greed: 0, greedStacks: 0, damageTaken: 0, frenzy: 0, frenzyOn: false,
    mirror: 0, mirrorLast: -Infinity, voidDrain: 0,
  };
}

/** One pass over a side's effects (usually 0–3 of them); same codes add up. */
function applyEffects(c: Combatant, effects: { code: string; value: number; qty?: number }[]): void {
  for (const e of effects) {
    const v = e.value;
    switch (e.code) {
      case "barrier": c.barrier += v; c.barrierRegen += v; break;
      case "restore": (c.restores ??= []).push({ v, left: e.qty ?? Infinity, n: 0 }); break;
      case "healing": c.healing += v; break;
      case "reconstitution": c.reconstitution += v; break;
      case "berserker_rage": c.berserker += v; break;
      case "lifesteal": c.lifesteal += v; break;
      case "poison": c.poisonApply += v; break;
      case "burn": c.burnApply += v; break;
      case "antipoison": c.antipoison += v; break;
      case "corrupted": c.corrupted += v; break;
      case "protective_bubble": c.bubble += v; break;
      case "sun_shield": c.sunShield += v; break;
      case "greed": c.greed += v; break;
      case "frenzy": c.frenzy += v; break;
      case "enchanted_mirror": c.mirror += v; break;
      case "void_drain": c.voidDrain += v; break;
    }
  }
}

/** Protective bubble, roll mode: a random element, never the previous one. */
function rollBubble(c: Combatant, rng: () => number): void {
  if (!c.bubble) return;
  const pool = ELEMENTS.filter((el) => el !== c.bubbleEl);
  c.bubbleEl = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** `a`'s cached hit vs `d` — recomputed only after something changed it. */
function refreshHit(a: Combatant, d: Combatant, roll: boolean): void {
  if (!a.dirty && !(d.bubble && roll)) return;
  a.dirty = false;
  let normal = 0, crit = 0;
  for (const el of ELEMENTS) {
    const atk = a.atk[el];
    if (!atk) continue;
    const raw = Math.round(atk * (1 + (a.dmgPct[el] + a.bonus) / 100));
    if (d.bubble && !roll) {
      // EV over the bubble: each element is the shielded one a quarter of the time.
      const lo = Math.round(raw * Math.max(0, 1 - (d.res[el] + d.bubble) / 100));
      const hi = Math.round(raw * Math.max(0, 1 - d.res[el] / 100));
      normal += 0.25 * lo + 0.75 * hi;
      crit += 0.25 * Math.round(lo * 1.5) + 0.75 * Math.round(hi * 1.5);
    } else {
      const v = Math.round(raw * Math.max(0, 1 - (d.res[el] + (d.bubbleEl === el ? d.bubble : 0)) / 100));
      normal += v;
      crit += Math.round(v * 1.5);
    }
  }
  a.hitNormal = normal;
  a.hitCrit = crit;
  a.hitEV = normal * (1 + 0.5 * a.crit);
}

/** Every HP loss goes through here: greed counts each 10% of max HP lost. */
function hurt(c: Combatant, dmg: number): void {
  c.hp -= dmg;
  if (!c.greed || dmg <= 0) return;
  c.damageTaken += dmg;
  const stacks = Math.floor(c.damageTaken / (0.1 * c.maxHp));
  if (stacks !== c.greedStacks) {
    c.greedStacks = stacks;
    c.dirty = true;
  }
}

/** Greed stacks + frenzy (EV: crit chance × value from the 2nd attack on; roll: after a crit). */
function setBonus(c: Combatant, roll: boolean): void {
  const b = c.greedStacks * c.greed + (c.frenzy ? (roll ? (c.frenzyOn ? c.frenzy : 0) : c.turns > 1 ? c.crit * c.frenzy : 0) : 0);
  if (b !== c.bonus) {
    c.bonus = b;
    c.dirty = true;
  }
}

function checkBerserk(c: Combatant): void {
  if (c.berserker > 0 && !c.berserked && c.hp < 0.25 * c.maxHp) {
    c.dmgMult *= 1 + c.berserker / 100;
    c.berserked = true;
  }
}

// Start of a combatant's own turn: DoTs it applies (first turn), self regen,
// antipoison, then suffered DoTs. Returns false if it died from a DoT.
function startOfTurn(c: Combatant, opp: Combatant): boolean {
  c.turns++;
  if (c.turns === 1) {
    if (c.poisonApply > 0) opp.poison += c.poisonApply;
    if (c.burnApply > 0) {
      opp.burnCur = (c.burnApply / 100) * c.totalAtk;
      opp.burnActive = true;
    }
  }
  if (c.reconstitution > 0 && c.turns % c.reconstitution === 0) c.hp = c.maxHp;
  if (c.healing > 0 && c.turns % 3 === 0) c.hp = Math.min(c.maxHp, c.hp + (c.maxHp * c.healing) / 100);
  if (c.barrierRegen > 0 && c.turns > 1 && (c.turns - 1) % 5 === 0) c.barrier += c.barrierRegen;
  if (c.restores) for (const r of c.restores) if (r.left > 0 && c.hp < 0.5 * c.maxHp) { c.hp = Math.min(c.maxHp, c.hp + r.v); c.restored += r.v; r.left--; r.n++; }
  if (c.voidDrain > 0 && c.turns % 4 === 0) {
    const drain = (opp.hp * c.voidDrain) / 100;
    hurt(opp, drain);
    c.hp = Math.min(c.maxHp, c.hp + drain);
  }
  if (c.antipoison > 0 && c.poison > 0) c.poison = Math.max(0, c.poison - c.antipoison);
  if (c.poison > 0) hurt(c, c.poison);
  if (c.burnActive) {
    hurt(c, c.burnCur);
    c.burnCur *= 0.9;
    if (c.burnCur < 1) c.burnActive = false;
  }
  checkBerserk(c);
  return c.hp > 0;
}

// `a` attacks `d` on fight turn `turn`. Returns the damage dealt (after
// barrier); `d.hp` may go ≤0, and so may `a.hp` (a reflected hit).
// EV mode (no rng) folds crits into an expected value; rng mode rolls them per
// attack with the game's exact per-element ×1.5 rounding.
function attack(a: Combatant, d: Combatant, turn: number, rng: (() => number) | undefined, dynamic: boolean): { dmg: number; crit: boolean } {
  if (dynamic) {
    setBonus(a, !!rng);
    refreshHit(a, d, !!rng);
  }
  let crit = false;
  let dmg: number;
  if (rng) {
    crit = rng() < a.crit;
    dmg = (crit ? a.hitCrit : a.hitNormal) * a.dmgMult;
  } else {
    dmg = a.hitEV * a.dmgMult;
  }
  if (d.sunShield > 0) dmg = rng ? Math.round(dmg * (1 - d.sunShield / 100)) : dmg * (1 - d.sunShield / 100);
  if (d.barrier > 0) {
    const absorbed = Math.min(d.barrier, dmg);
    d.barrier -= absorbed;
    dmg -= absorbed;
  }
  hurt(d, dmg);
  if (a.lifesteal > 0) {
    // Lifesteal procs on crit: EV mode weighs it by crit chance, rng mode by the roll.
    const share = rng ? (crit ? 1 : 0) : a.crit;
    a.hp = Math.min(a.maxHp, a.hp + share * (a.lifesteal / 100) * a.totalAtk);
  }
  if (a.frenzy && rng) a.frenzyOn = crit;
  if (d.corrupted > 0) {
    for (const el of ELEMENTS) if (a.atk[el]) d.res[el] -= d.corrupted;
    a.dirty = true;
  }
  if (d.mirror > 0 && dmg > 0 && d.hp > 0 && turn - d.mirrorLast >= 3) {
    d.mirrorLast = turn;
    hurt(a, (dmg * d.mirror) / 100);
  }
  checkBerserk(d);
  if (a.hp < a.maxHp) checkBerserk(a);
  return { dmg, crit };
}

/** The `used` of a fight with no potion worn: one shared object, so the solver's hot loop allocates nothing for it. */
const NO_USE: Record<string, number> = Object.freeze({}) as Record<string, number>;

export function simulate(player: Fighter, monster: Monster, opts: SimOptions = {}): FightForecast {
  const { boostDmg, pMaxHp, pRes } = opening(player);
  const st = player.stats;
  const rng = opts.rng;

  const pCrit = opts.pessimistic ? 0 : Math.max(0, Math.min(1, st.critical_strike / 100));
  const mCrit = opts.pessimistic ? 1 : Math.max(0, Math.min(1, monster.critical_strike / 100));
  const P = newSide(
    pMaxHp,
    { fire: st.attack_fire, earth: st.attack_earth, water: st.attack_water, air: st.attack_air },
    { fire: st.dmg + st.dmg_fire + boostDmg.fire, earth: st.dmg + st.dmg_earth + boostDmg.earth, water: st.dmg + st.dmg_water + boostDmg.water, air: st.dmg + st.dmg_air + boostDmg.air },
    pRes, pCrit, st.initiative,
  );
  const M = newSide(
    monster.hp,
    { fire: monster.attack_fire, earth: monster.attack_earth, water: monster.attack_water, air: monster.attack_air },
    { fire: 0, earth: 0, water: 0, air: 0 },
    { fire: monster.res_fire, earth: monster.res_earth, water: monster.res_water, air: monster.res_air },
    mCrit, monster.initiative,
  );
  applyEffects(P, player.effects);
  applyEffects(M, monster.effects);
  // Anything that changes a hit mid-fight; without it the opening hits hold all fight.
  const bubbles = !!rng && !!(P.bubble || M.bubble);
  const dynamic = bubbles || !!(P.greed || P.frenzy || M.greed || M.frenzy || P.corrupted || M.corrupted);
  if (bubbles) {
    rollBubble(P, rng);
    rollBubble(M, rng);
  }
  refreshHit(P, M, !!rng);
  refreshHit(M, P, !!rng);

  // Task 025: the higher initiative strikes first; a tie goes to the higher HP, then to chance (the game's documents as
  // docs/audit/domain-rules.md 1.1 records them — "ties go by HP, then random"). The expected pass gives a full tie to the
  // player, as before; the rolled pass tosses a coin.
  const playerFirst = P.init !== M.init ? P.init > M.init : P.hp !== M.hp ? P.hp > M.hp : rng ? rng() < 0.5 : true;

  let win = false;
  let timedOut = false;
  let turn = 0;
  for (turn = 1; turn <= MAX_TURNS; turn++) {
    const actorIsPlayer = playerFirst ? turn % 2 === 1 : turn % 2 === 0;
    const actor = actorIsPlayer ? P : M;
    const defender = actorIsPlayer ? M : P;
    if (bubbles && turn > 1) {
      rollBubble(P, rng!);
      rollBubble(M, rng!);
    }
    if (!startOfTurn(actor, defender)) {
      win = !actorIsPlayer; // actor died from a DoT → the other side wins
      opts.trace?.push({ turn, actor: actorIsPlayer ? "player" : "monster", dmg: 0, playerHp: Math.round(P.hp), monsterHp: Math.round(M.hp), note: "died to DoT" });
      break;
    }
    const hit = attack(actor, defender, turn, rng, dynamic);
    opts.trace?.push({
      turn,
      actor: actorIsPlayer ? "player" : "monster",
      dmg: Math.round(hit.dmg),
      playerHp: Math.max(0, Math.round(P.hp)),
      monsterHp: Math.max(0, Math.round(M.hp)),
      note: hit.crit ? "crit" : undefined,
    });
    if (defender.hp <= 0) {
      win = actorIsPlayer;
      break;
    }
    if (actor.hp <= 0) {
      win = !actorIsPlayer; // killed by its own reflected hit
      break;
    }
  }
  if (turn > MAX_TURNS) {
    win = false;
    timedOut = true;
    turn = MAX_TURNS;
  }

  const clampedHp = Math.max(0, Math.round(P.hp));
  const lost = pMaxHp - clampedHp;
  let used = NO_USE;
  let ri = 0; // the restore entries are in the order of the player's restore effects (applyEffects)
  for (const e of player.effects) {
    const n = e.code === "restore" ? P.restores![ri++].n : 1;
    if (!e.potion) continue;
    if (used === NO_USE) used = {};
    used[e.potion] = Math.max(used[e.potion] ?? 0, n);
  }
  return {
    win,
    turns: turn,
    hpRemaining: clampedHp,
    hpLostPct: pMaxHp > 0 ? Math.max(0, Math.min(1, lost / pMaxHp)) : 1,
    timedOut,
    playerFirst,
    restSeconds: restSeconds(lost),
    hpRestored: Math.round(P.restored),
    margin: win && pMaxHp > 0 ? clampedHp / pMaxHp : 0,
    maxHp: pMaxHp,
    used,
  };
}
