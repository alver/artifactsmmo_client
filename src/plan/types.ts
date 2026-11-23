// Shared plan/exec data structures. Pure types — no runtime, no imports beyond
// the combat forecast and gear-slot vocabulary.

import type { GearSlot } from "../types/api";
import type { FightForecast } from "../sim/combat";
import type { Place } from "./route";

/** A concrete gear set the BIS solver recommends for a target monster. */
export interface GearRecommendation {
  slots: Record<GearSlot, string>; // slot → item code ("" = leave empty)
  codes: string[]; // the non-empty item codes, de-duplicated
  forecast: FightForecast; // expected-value outcome
  worst: FightForecast; // pessimistic (no player crit / monster always crits) — shown, decides nothing (task 025)
  p: number; // task 025: the rolled win rate (sim/monte.ts winRate; 0 for an expected loss)
  score: number; // objective value used to rank sets
}

/** One executable acquisition action (the exec.ts runStep vocabulary).
 *  Gear is NEVER acquired — the bank swap (jobgear.ts) equips what the bank holds. */
export type AcquisitionStep =
  | { kind: "withdraw"; code: string; quantity: number; at: Place }
  | { kind: "buy"; code: string; quantity: number; npc: string; at: Place; cost: number }
  | { kind: "gather"; code: string; quantity: number; resource: string; level: number; at: Place }
  | { kind: "craft"; code: string; quantity: number; skill: string; level: number; at: Place }
  | { kind: "train"; skill: string; toLevel: number; resource: string; level: number; at: Place };

/** Between-fight healing food the runner should eat via the `use` action.
 *  Picked live from what is in hand (see plan/consumables.ts carriedFood). */
export interface FoodSpec {
  code: string;
  heal: number; // HP restored per unit
}

/** The kind of work a gear set is optimized for (see plan/jobgear.ts). */
export type GearJob =
  | { kind: "fight"; monster: string }
  | { kind: "gather"; skill: string } // mining | woodcutting | fishing | alchemy
  | { kind: "craft"; skill?: string }
  | { kind: "none" };
