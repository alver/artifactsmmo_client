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

import type { Monster, MonsterEffect } from "../types/catalog";
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
  margin: number; // win ? hpRemaining/maxHp : 0 — used to rank/gate gear sets
  maxHp: number;
}

export interface SimOptions {
  /** Worst-case pass: player never crits, monster always crits. Used by BIS to
   *  reject gear whose EV win is really a coin-flip. */
  pessimistic?: boolean;
}

function effMap(entries: { code: string; value: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.code, (m.get(e.code) ?? 0) + e.value);
  return m;
}

/** One side of the fight, fully resolved into per-turn numbers. */
interface Combatant {
  hp: number;
  maxHp: number;
  barrier: number;
  turns: number;
  hitEV: number; // expected damage per attack, pre-multiplier
  dmgMult: number;
  totalAtk: number;
  crit: number; // 0..1
  init: number;
  // self regen / buffs
  restore: number;
  healing: number; // % max hp / 3 turns
  reconstitution: number; // full heal every N turns
  barrierRegen: number;
  berserker: number; // % dmg gained below 25% hp
  berserked: boolean;
  lifesteal: number; // % of total attack healed on crit
  // afflictions suffered
  poison: number;
  burnCur: number;
  burnActive: boolean;
}

/** Player damage per element vs a monster's resistances (raw→resist→sum). */
function playerHitBase(stats: EffectiveStats, boostDmg: Record<Element, number>, monster: Monster): number {
  let sum = 0;
  for (const el of ELEMENTS) {
    const atk = stats[`attack_${el}` as keyof EffectiveStats];
    if (!atk) continue;
    const dmgPct = stats.dmg + (stats[`dmg_${el}` as keyof EffectiveStats] as number) + (boostDmg[el] ?? 0);
    const raw = Math.round(atk * (1 + dmgPct / 100));
    const mres = monster[`res_${el}` as keyof Monster] as number;
    const factor = Math.max(0, 1 - mres / 100);
    sum += Math.round(raw * factor);
  }
  return sum;
}

/** Monster damage per element vs the player's resistances (monsters have no dmg%). */
function monsterHitBase(monster: Monster, res: Record<Element, number>): number {
  let sum = 0;
  for (const el of ELEMENTS) {
    const atk = monster[`attack_${el}` as keyof Monster] as number;
    if (!atk) continue;
    const factor = Math.max(0, 1 - (res[el] ?? 0) / 100);
    sum += Math.round(atk * factor);
  }
  return sum;
}

export function simulate(player: Fighter, monster: Monster, opts: SimOptions = {}): FightForecast {
  const pEff = effMap(player.effects);
  const mEff = effMap(monster.effects.map((e: MonsterEffect) => ({ code: e.code, value: e.value })));

  // Fight-start player buffs from utilities.
  const boostDmg = { fire: 0, earth: 0, water: 0, air: 0 } as Record<Element, number>;
  const boostRes = { fire: 0, earth: 0, water: 0, air: 0 } as Record<Element, number>;
  for (const el of ELEMENTS) {
    boostDmg[el] = pEff.get(`boost_dmg_${el}`) ?? 0;
    boostRes[el] = pEff.get(`boost_res_${el}`) ?? 0;
  }
  const pMaxHp = player.stats.hp + (pEff.get("boost_hp") ?? 0);
  const pRes: Record<Element, number> = {
    fire: player.stats.res_fire + boostRes.fire,
    earth: player.stats.res_earth + boostRes.earth,
    water: player.stats.res_water + boostRes.water,
    air: player.stats.res_air + boostRes.air,
  };

  const pCrit = opts.pessimistic ? 0 : Math.max(0, Math.min(1, player.stats.critical_strike / 100));
  const mCrit = opts.pessimistic ? 1 : Math.max(0, Math.min(1, monster.critical_strike / 100));
  const pTotalAtk = player.stats.attack_fire + player.stats.attack_earth + player.stats.attack_water + player.stats.attack_air;
  const mTotalAtk = monster.attack_fire + monster.attack_earth + monster.attack_water + monster.attack_air;

  const P: Combatant = {
    hp: pMaxHp, maxHp: pMaxHp, barrier: pEff.get("barrier") ?? 0, turns: 0,
    hitEV: playerHitBase(player.stats, boostDmg, monster) * (1 + 0.5 * pCrit),
    dmgMult: 1, totalAtk: pTotalAtk, crit: pCrit, init: player.stats.initiative,
    restore: pEff.get("restore") ?? 0, healing: pEff.get("healing") ?? 0,
    reconstitution: pEff.get("reconstitution") ?? 0, barrierRegen: pEff.get("barrier") ?? 0,
    berserker: pEff.get("berserker_rage") ?? 0, berserked: false, lifesteal: pEff.get("lifesteal") ?? 0,
    poison: mEff.get("poison") ?? 0,
    burnCur: ((mEff.get("burn") ?? 0) / 100) * mTotalAtk, burnActive: (mEff.get("burn") ?? 0) > 0,
  };
  const M: Combatant = {
    hp: monster.hp, maxHp: monster.hp, barrier: mEff.get("barrier") ?? 0, turns: 0,
    hitEV: monsterHitBase(monster, pRes) * (1 + 0.5 * mCrit),
    dmgMult: 1, totalAtk: mTotalAtk, crit: mCrit, init: monster.initiative,
    restore: mEff.get("restore") ?? 0, healing: mEff.get("healing") ?? 0,
    reconstitution: mEff.get("reconstitution") ?? 0, barrierRegen: mEff.get("barrier") ?? 0,
    berserker: mEff.get("berserker_rage") ?? 0, berserked: false, lifesteal: mEff.get("lifesteal") ?? 0,
    poison: pEff.get("poison") ?? 0,
    burnCur: ((pEff.get("burn") ?? 0) / 100) * pTotalAtk, burnActive: (pEff.get("burn") ?? 0) > 0,
  };

  const playerFirst = P.init >= M.init;

  const checkBerserk = (c: Combatant): void => {
    if (c.berserker > 0 && !c.berserked && c.hp < 0.25 * c.maxHp) {
      c.dmgMult *= 1 + c.berserker / 100;
      c.berserked = true;
    }
  };

  // Start of a combatant's own turn: self regen, then suffered DoTs. Returns
  // false if the combatant died from a DoT (the opponent wins).
  const startOfTurn = (c: Combatant): boolean => {
    c.turns++;
    if (c.reconstitution > 0 && c.turns % c.reconstitution === 0) c.hp = c.maxHp;
    if (c.healing > 0 && c.turns % 3 === 0) c.hp = Math.min(c.maxHp, c.hp + (c.maxHp * c.healing) / 100);
    if (c.barrierRegen > 0 && c.turns > 1 && (c.turns - 1) % 5 === 0) c.barrier += c.barrierRegen;
    if (c.restore > 0 && c.hp < 0.5 * c.maxHp) c.hp = Math.min(c.maxHp, c.hp + c.restore);
    if (c.poison > 0) c.hp -= c.poison;
    if (c.burnActive) {
      c.hp -= c.burnCur;
      c.burnCur *= 0.9;
      if (c.burnCur < 1) c.burnActive = false;
    }
    checkBerserk(c);
    return c.hp > 0;
  };

  // `a` attacks `d`. Returns true if `d` died.
  const attack = (a: Combatant, d: Combatant): boolean => {
    let dmg = a.hitEV * a.dmgMult;
    if (d.barrier > 0) {
      const absorbed = Math.min(d.barrier, dmg);
      d.barrier -= absorbed;
      dmg -= absorbed;
    }
    d.hp -= dmg;
    if (a.lifesteal > 0) a.hp = Math.min(a.maxHp, a.hp + a.crit * (a.lifesteal / 100) * a.totalAtk);
    checkBerserk(d);
    return d.hp <= 0;
  };

  let win = false;
  let timedOut = false;
  let turn = 0;
  for (turn = 1; turn <= MAX_TURNS; turn++) {
    const actorIsPlayer = playerFirst ? turn % 2 === 1 : turn % 2 === 0;
    const actor = actorIsPlayer ? P : M;
    const defender = actorIsPlayer ? M : P;
    if (!startOfTurn(actor)) {
      win = !actorIsPlayer; // actor died from a DoT → the other side wins
      break;
    }
    if (attack(actor, defender)) {
      win = actorIsPlayer;
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
  return {
    win,
    turns: turn,
    hpRemaining: clampedHp,
    hpLostPct: pMaxHp > 0 ? Math.max(0, Math.min(1, lost / pMaxHp)) : 1,
    timedOut,
    playerFirst,
    restSeconds: restSeconds(lost),
    margin: win && pMaxHp > 0 ? clampedHp / pMaxHp : 0,
    maxHp: pMaxHp,
  };
}
