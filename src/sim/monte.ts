// Monte Carlo layer over the simulator: crits are the ONLY per-turn randomness
// in a solo fight (see docs/concepts/stats_and_fights), so rolling them per
// attack across a few thousand runs yields the real outcome distribution — a
// win PROBABILITY instead of the EV pass's binary verdict. A run is ~a few
// hundred float ops, so 2000 trials stay comfortably in a frame.

import { simulate, simulateParty } from "./combat";
import type { PartyMember } from "./combat";
import type { Monster } from "../types/catalog";
import type { EffectiveStats, Fighter } from "./types";

export interface MonteCarloResult {
  trials: number;
  winRate: number; // 0..1
  medianTurns: number;
  /** Final player HP percentiles across ALL runs (losses count as 0). */
  hpP10: number;
  hpP50: number;
  hpP90: number;
  worstHp: number;
}

const pct = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

export function monteCarlo(player: Fighter, monster: Monster, trials = 2000): MonteCarloResult {
  let wins = 0;
  const turns: number[] = [];
  const hps: number[] = [];
  for (let i = 0; i < trials; i++) {
    const f = simulate(player, monster, { rng: Math.random });
    if (f.win) wins++;
    turns.push(f.turns);
    hps.push(f.win ? f.hpRemaining : 0);
  }
  turns.sort((a, b) => a - b);
  hps.sort((a, b) => a - b);
  return {
    trials,
    winRate: wins / trials,
    medianTurns: pct(turns, 0.5),
    hpP10: pct(hps, 0.1),
    hpP50: pct(hps, 0.5),
    hpP90: pct(hps, 0.9),
    worstHp: hps[0],
  };
}

// ── task 025: the verdict's win rate ─────────────────────────────────────────

/** Fights a win rate rolls. Its standard error at p = 0.75 is √(0.75 · 0.25 / N) = 2.2 points (task 025's report: what it
 *  costs the planner). */
export const WIN_N = 400;
/** Task 025 (speed): the rolls a set gets inside a solve's search (bis.ts winP) — a coarse p that only ranks the sets the
 *  search climbs through; the answer's p is rolled WIN_N times (bis.ts bestInSlot), and that is the verdict. */
export const SEARCH_N = 64;
/** The batch a search's rolls come in (winRate with a floor). */
const SEARCH_STEP = 16;
/** The stats a fight reads (wisdom, prospecting and haste do not), in one order. */
const FIGHT_STATS: (keyof EffectiveStats)[] = ["hp", "attack_fire", "attack_earth", "attack_water", "attack_air", "dmg", "dmg_fire", "dmg_earth", "dmg_water", "dmg_air", "res_fire", "res_earth", "res_water", "res_air", "critical_strike", "initiative"];
/** What a fight is: the monster, the fighter's combat stats and its combat effects (sorted: the slot a potion sits in does
 *  not change the fight). Two fighters with the same key fight the same fight. */
export function fightKey(player: Fighter, monster: Monster): string {
  const st = player.stats;
  let k = monster.code;
  for (const s of FIGHT_STATS) k += "," + st[s];
  const eff = player.effects.map((e) => `${e.code}:${e.value}:${e.potion ?? ""}${e.qty != null ? `#${e.qty}` : ""}`); // task 027: a short stack is another fight
  if (eff.length) k += "|" + eff.sort().join(";");
  return k;
}
/** FNV-1a of a string: the seed of a fight's rolls. */
function hash(k: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
/** mulberry32: a small seeded generator, the same numbers in every process. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rates = new Map<string, number>();
const RATES_CAP = 200_000;
/**
 * Task 025, settled point 2: p — the share of wins over WIN_N fights with the crits rolled (this module's method), seeded
 * by what the fight is (fightKey), so the same question gives the same answer in every process, whoever asks: the planner's
 * solve (a set folded on the base stats) and the executor's gate (the character as the API gives it) read one number for
 * one fight. Kept per fight (dropped whole at RATES_CAP).
 */
export function winRate(player: Fighter, monster: Monster, key = fightKey(player, monster), n = WIN_N, floor?: number): number {
  const mk = n === WIN_N && floor == null ? key : `${n}@${floor ?? ""}#${key}`;
  let p = rates.get(mk);
  if (p !== undefined) return p;
  const rng = seeded(hash(key));
  let wins = 0, k = 0;
  // `floor` given (a solve's search): rolled in batches of SEARCH_STEP, stopped once the floor lies clearly on one side —
  // 2.5 standard errors (the error of p̂ plus 1/k, so 16 wins of 16 stop and 15 of 16 do not)
  while (k < n) {
    const end = floor == null ? n : Math.min(n, k + SEARCH_STEP);
    for (; k < end; k++) if (simulate(player, monster, { rng }).win) wins++;
    if (floor == null) break;
    const q = wins / k, se = Math.sqrt((q * (1 - q) + 1 / k) / k);
    if (Math.abs(q - floor) > 2.5 * se) break;
  }
  p = wins / k;
  if (rates.size >= RATES_CAP) rates.clear();
  rates.set(mk, p);
  return p;
}

// ── task 039: a party's verdict ──

/** A party's rolled verdict: p the share of wins over WIN_N fights, and over the wins (all fights when none is won) the mean
 *  turns — each member's cooldown is turns × 2 s —, each member's mean HP lost, the share of wins in which it fell and (task
 *  039c) the potions it drinks; over all fights the share of the boss's HP left (what ranks parties that never win). */
export interface PartyRate { p: number; turns: number; lost: number[]; fell: number[]; left: number; used: Record<string, number>[] }
const partyRates = new Map<string, PartyRate>();
/** Task 039: the party's verdict as a solo fight's (winRate): rolled WIN_N times, seeded by what the fight is — the boss and
 *  each member's fight key and threat, in the party's order — so one party gives one answer in every process. */
export function partyRate(members: PartyMember[], monster: Monster, n = WIN_N): PartyRate {
  const key = `${n}|${members.map((m) => `${m.threat}@${fightKey(m.fighter, monster)}`).join("&")}`;
  const hit = partyRates.get(key);
  if (hit) return hit;
  const rng = seeded(hash(key));
  let wins = 0, turns = 0, allTurns = 0, left = 0;
  const lost = members.map(() => 0), lostAll = members.map(() => 0), fell = members.map(() => 0);
  const used = members.map((): Record<string, number> => ({})); // task 039c: the potions a won fight drinks, a member's

  for (let k = 0; k < n; k++) {
    const f = simulateParty(members, monster, { rng });
    allTurns += f.turns;
    left += f.bossHp / monster.hp;
    for (let i = 0; i < members.length; i++) lostAll[i] += f.maxHp[i] - f.hp[i];
    if (!f.win) continue;
    wins++;
    turns += f.turns;
    for (let i = 0; i < members.length; i++) {
      lost[i] += f.maxHp[i] - f.hp[i];
      if (f.hp[i] <= 0) fell[i]++;
      for (const [c, q] of Object.entries(f.used[i])) used[i][c] = (used[i][c] ?? 0) + q;
    }
  }
  const w = wins || n;
  const r: PartyRate = { p: wins / n, turns: (wins ? turns : allTurns) / w, lost: (wins ? lost : lostAll).map((x) => x / w), fell: fell.map((x) => (wins ? x / wins : 0)), left: left / n, used: used.map((u) => Object.fromEntries(Object.entries(u).map(([c, q]) => [c, q / w]))) };
  if (partyRates.size >= RATES_CAP) partyRates.clear();
  partyRates.set(key, r);
  return r;
}
