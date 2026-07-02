// Monte Carlo layer over the simulator: crits are the ONLY per-turn randomness
// in a solo fight (see docs/concepts/stats_and_fights), so rolling them per
// attack across a few thousand runs yields the real outcome distribution — a
// win PROBABILITY instead of the EV pass's binary verdict. A run is ~a few
// hundred float ops, so 2000 trials stay comfortably in a frame.

import { simulate } from "./combat";
import type { Monster } from "../types/catalog";
import type { Fighter } from "./types";

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
