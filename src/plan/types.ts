// Shared plan/exec data structures. Pure types — no runtime, no imports beyond
// the combat forecast and gear-slot vocabulary.

import type { GearSlot } from "../types/api";
import type { FightForecast } from "../sim/combat";

/** A concrete gear set the BIS solver recommends for a target monster. */
export interface GearRecommendation {
  slots: Record<GearSlot, string>; // slot → item code ("" = leave empty)
  codes: string[]; // the non-empty item codes, de-duplicated
  forecast: FightForecast; // expected-value outcome
  worst: FightForecast; // pessimistic (no player crit / monster always crits)
  safe: boolean; // pessimistic pass still wins
  score: number; // objective value used to rank sets
}

/** One executable acquisition action (the exec.ts runStep vocabulary).
 *  Gear is NEVER acquired — the bank swap (jobgear.ts) equips what the bank holds. */
export type AcquisitionStep =
  | { kind: "withdraw"; code: string; quantity: number; x?: number; y?: number }
  | { kind: "buy"; code: string; quantity: number; npc: string; x?: number; y?: number; cost: number }
  | { kind: "gather"; code: string; quantity: number; resource: string; level: number; x?: number; y?: number }
  | { kind: "craft"; code: string; quantity: number; skill: string; level: number; x?: number; y?: number }
  | { kind: "train"; skill: string; toLevel: number; resource: string; level: number; x?: number; y?: number };

/** Between-fight healing food the runner should eat via the `use` action.
 *  Always bank-limited: eat what the bank holds, then heal by rest. */
export interface FoodSpec {
  code: string;
  heal: number; // HP restored per unit
  perFight: number; // expected units consumed per fight (for live re-stocking)
}

/** The kind of work a gear set is optimized for (see plan/jobgear.ts). */
export type GearJob =
  | { kind: "fight"; monster: string }
  | { kind: "gather"; skill: string } // mining | woodcutting | fishing | alchemy
  | { kind: "craft"; skill?: string }
  | { kind: "none" };
