// Free, passive self-validation of the combat simulator.
//
// Every real fight already echoes its result, turn count and final HP. So on each
// fold we re-run simulate() on the *same* pre-fight fighter + monster and record
// predicted-vs-actual — zero extra API calls. This is how the forecast earns the
// right to eventually *block* fights (see fight.ts): until win/loss mispredictions
// hit zero over a decent sample, the gate stays advisory.
//
// Nothing here is persisted — it's a diagnostic that rebuilds as you play.

import { signal } from "@preact/signals";
import type { Character, FightResult } from "../types/api";
import type { Monster } from "../types/catalog";
import { currentFighter } from "./stats";
import { simulate } from "./combat";

export interface Deviation {
  ts: number;
  character: string;
  monster: string;
  predWin: boolean;
  actualWin: boolean;
  winMatch: boolean;
  predTurns: number;
  actualTurns: number | null;
  turnErr: number | null;
  predHp: number;
  actualHp: number | null;
  hpErr: number | null;
}

/** Rolling window of the most recent fight predictions vs reality (newest first). */
export const simDeviations = signal<Deviation[]>([]);

/**
 * Compare the forecast for a just-resolved fight against the real outcome.
 * `prev` is the PRE-fight character (correct position + max HP for reconstructing
 * the fighter); `monster` is the tile monster it fought.
 */
export function recordFight(prev: Character, monster: Monster, fight: FightResult): void {
  const f = simulate(currentFighter(prev), monster);
  const mine = fight.characters?.find((c) => c.character_name === prev.name) ?? fight.characters?.[0];
  const actualWin = fight.result === "win";
  const actualTurns = fight.turns ?? null;
  const actualHp = mine?.final_hp ?? null;

  const dev: Deviation = {
    ts: Date.now(),
    character: prev.name,
    monster: monster.code,
    predWin: f.win,
    actualWin,
    winMatch: f.win === actualWin,
    predTurns: f.turns,
    actualTurns,
    turnErr: actualTurns == null ? null : f.turns - actualTurns,
    predHp: f.hpRemaining,
    actualHp,
    hpErr: actualHp == null ? null : f.hpRemaining - actualHp,
  };
  simDeviations.value = [dev, ...simDeviations.value].slice(0, 100);
}

export interface SimAccuracy {
  n: number;
  winMispredicts: number;
  medianTurnErr: number | null;
  medianHpErr: number | null;
  /** True once the sample is trustworthy enough to let the forecast block fights. */
  trustworthy: boolean;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Aggregate accuracy over the current window — drives the dev readout + the gate. */
export function simAccuracy(devs: Deviation[] = simDeviations.value): SimAccuracy {
  const n = devs.length;
  const winMispredicts = devs.filter((d) => !d.winMatch).length;
  const turnErrs = devs.map((d) => d.turnErr).filter((x): x is number => x != null).map(Math.abs);
  const hpErrs = devs.map((d) => d.hpErr).filter((x): x is number => x != null).map(Math.abs);
  const medTurn = median(turnErrs);
  return {
    n,
    winMispredicts,
    medianTurnErr: medTurn,
    medianHpErr: median(hpErrs),
    // Bar from the plan: ≥50 samples, zero win/loss mispredictions, median turn error ≤1.
    trustworthy: n >= 50 && winMispredicts === 0 && medTurn != null && medTurn <= 1,
  };
}
