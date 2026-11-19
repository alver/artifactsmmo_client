// Free, passive self-validation of the combat simulator.
//
// Every real fight already echoes its result, turn count and final HP. So on each
// fold we re-run simulate() on the *same* pre-fight fighter + monster and record
// predicted-vs-actual — zero extra API calls. This is how the forecast earns the
// right to eventually *block* fights (see fight.ts): until win/loss mispredictions
// hit zero over a decent sample, the gate stays advisory.
//
// On top of the outcome comparison, each fight's text log is parsed (loglab.ts)
// and every extracted hit is checked against the EXACT per-element damage the
// formula predicts — non-crit hits must match to the point, crits after the
// ×1.5 rounding. This is what turns the sim from "plausible" into "verified".
//
// The window IS persisted (localStorage) so the sample accumulates across
// sessions — reaching the trustworthy bar takes ~50 fights.

import { effect, signal } from "@preact/signals";
import { IS_SERVER } from "../lib/remote";
import type { Character, FightResult } from "../types/api";
import type { Monster } from "../types/catalog";
import { currentFighter } from "./stats";
import { expectedHits, simulate } from "./combat";
import { checkHits, parseFightLogs } from "./loglab";

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
  // Exact formula check from the fight's text log (absent when no log came back).
  hitsChecked?: number;
  hitsMatched?: number;
  mismatch?: string; // first mismatching hit, for diagnosis
  // Task 011: utility potions, per code — what the forecast drinks (FightForecast.used) and what the fight really took
  // (the worn stacks before minus after, from the fight's own echo). Absent on entries stored before, and on fights
  // with no potion worn.
  predPotions?: Record<string, number>;
  actualPotions?: Record<string, number>;
}

const STORE_KEY = "ammo:v1:simdev";
const WINDOW = 200;
function loadStored(): Deviation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]") as Deviation[];
    return Array.isArray(raw) ? raw.slice(0, WINDOW) : [];
  } catch {
    return [];
  }
}

/** Rolling window of the most recent fight predictions vs reality (newest first). */
export const simDeviations = signal<Deviation[]>(IS_SERVER ? loadStored() : []); // tab: mirror only

if (IS_SERVER) effect(() => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(simDeviations.value));
  } catch {
    /* quota / unavailable — non-fatal */
  }
});

/**
 * Compare the forecast for a just-resolved fight against the real outcome.
 * `prev` is the PRE-fight character (correct position + max HP for reconstructing
 * the fighter); `monster` is the tile monster it fought; `after` the character the
 * fight echoed (its utility stacks give the potions really drunk).
 */
export function recordFight(prev: Character, monster: Monster, fight: FightResult, after?: Character): void {
  const fighter = currentFighter(prev);
  const f = simulate(fighter, monster);
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
  const drunk = potionsDrunk(prev, after);
  if (drunk) { dev.predPotions = { ...f.used }; dev.actualPotions = drunk; }

  // Exact per-hit formula check against the turn-by-turn log, when present.
  if (fight.logs?.length) {
    const parsed = parseFightLogs(fight.logs);
    if (parsed.hits.length > 0) {
      const check = checkHits(parsed.hits, expectedHits(fighter, monster));
      dev.hitsChecked = check.checked;
      dev.hitsMatched = check.matched;
      dev.mismatch = check.firstMismatch;
    }
  }

  simDeviations.value = [dev, ...simDeviations.value].slice(0, WINDOW);
}

/** Units of each worn utility potion the fight took: the stack before minus the stack the echo shows (an emptied slot
 *  drank it all). Undefined when no potion was worn or the echo is missing. */
function potionsDrunk(prev: Character, after: Character | undefined): Record<string, number> | undefined {
  if (!after) return undefined;
  let out: Record<string, number> | undefined;
  for (const s of ["utility1", "utility2"] as const) {
    const code = prev[`${s}_slot`], q0 = prev[`${s}_slot_quantity`] ?? 0;
    if (!code || q0 <= 0) continue;
    const q1 = after[`${s}_slot`] === code ? (after[`${s}_slot_quantity`] ?? 0) : 0;
    (out ??= {})[code] = (out[code] ?? 0) + Math.max(0, q0 - q1);
  }
  return out;
}

export interface SimAccuracy {
  n: number;
  winMispredicts: number;
  medianTurnErr: number | null;
  medianHpErr: number | null;
  /** True once the sample is trustworthy enough to let the forecast block fights. */
  trustworthy: boolean;
  // Exact per-hit formula check aggregated over the window's fight logs.
  hitsChecked: number;
  hitsMatched: number;
  /** ≥30 hits checked and every single one matched the formula exactly. */
  formulaExact: boolean;
  lastMismatch?: string;
  /** Task 011: fights recorded with a potion worn, and the median of (units the forecast drinks − units really drunk)
   *  over them, all potions of a fight summed — signed, so a forecast that drinks too much reads positive. */
  potionFights: number;
  medianPotionErr: number | null;
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
  const hitsChecked = devs.reduce((s, d) => s + (d.hitsChecked ?? 0), 0);
  const hitsMatched = devs.reduce((s, d) => s + (d.hitsMatched ?? 0), 0);
  const sum = (r: Record<string, number> = {}): number => Object.values(r).reduce((s, x) => s + x, 0);
  const potionErrs = devs.filter((d) => d.actualPotions).map((d) => sum(d.predPotions) - sum(d.actualPotions));
  return {
    n,
    winMispredicts,
    medianTurnErr: medTurn,
    medianHpErr: median(hpErrs),
    // Bar from the plan: ≥50 samples, zero win/loss mispredictions, median turn error ≤1.
    trustworthy: n >= 50 && winMispredicts === 0 && medTurn != null && medTurn <= 1,
    hitsChecked,
    hitsMatched,
    formulaExact: hitsChecked >= 30 && hitsMatched === hitsChecked,
    lastMismatch: devs.find((d) => d.mismatch)?.mismatch,
    potionFights: potionErrs.length,
    medianPotionErr: median(potionErrs),
  };
}
