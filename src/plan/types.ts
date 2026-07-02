// Shared planner data structures. Pure types — no runtime, no imports beyond
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

/** One step in an acquisition plan (obtain + equip a target gear set). */
export type AcquisitionStep =
  | { kind: "withdraw"; code: string; quantity: number; x?: number; y?: number }
  | { kind: "buy"; code: string; quantity: number; npc: string; x?: number; y?: number; cost: number }
  | { kind: "gather"; code: string; quantity: number; resource: string; level: number; x?: number; y?: number }
  | { kind: "farm"; code: string; quantity: number; monster: string; expectedFights: number; x?: number; y?: number }
  | { kind: "craft"; code: string; quantity: number; skill: string; level: number; x?: number; y?: number }
  | { kind: "equip"; code: string; slot: GearSlot; quantity: number };

export interface AcquisitionPlan {
  steps: AcquisitionStep[];
  estActions: number;
  estSeconds: number;
  feasible: boolean;
  blockers: string[]; // human-readable reasons the plan can't fully run
}

/** An item to obtain (and equip, if a slot is given) — the resolver's input. */
export interface Target {
  code: string;
  quantity: number;
  slot?: GearSlot;
}

/** The frozen spec the campaign runner executes (gear is fixed; steps re-derive). */
export interface ExecutionSpec {
  targets: Target[]; // gear/items to obtain + equip
  monster?: string; // combat target, if the goal ends in fighting
  repeat: number; // how many fights to do
}

/** A goal the user picks; compileGoal() turns it into a full Plan. */
export type Goal =
  | { kind: "beat-monster"; monster: string; repeat?: number }
  | { kind: "combat-level"; target: number }
  | { kind: "skill-level"; skill: string; target: number }
  | { kind: "craft-item"; code: string; quantity: number }
  | { kind: "complete-task" };

/** The compiled result of a goal: what to equip, how to get it, what to do. */
export interface Plan {
  goal: Goal;
  gear?: GearRecommendation;
  acquisition: AcquisitionPlan;
  execution: ExecutionSpec; // what the campaign runner executes
  summary: string;
}
