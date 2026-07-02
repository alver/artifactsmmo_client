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
  | { kind: "equip"; code: string; slot: GearSlot; quantity: number }
  | { kind: "train"; skill: string; toLevel: number; resource: string; level: number; x?: number; y?: number };

/** Options for the acquisition resolver. */
export interface ResolveOptions {
  /**
   * Instead of blocking on a craft whose skill level the character hasn't
   * reached, emit an idempotent "train" step (gather a same-skill resource until
   * the level is met) when the gap is at most `maxTrainGap` — the sunflower →
   * alchemy 5 → health-potion chain.
   */
  train?: boolean;
  maxTrainGap?: number; // default 5
  /**
   * Treat utility targets as stack TOP-UPS: re-point them to whichever slot
   * already holds the code and demand only the shortfall (task-loop plans).
   * Without it, an equipped utility satisfies its target outright — the legacy
   * goal-plan behavior, where re-demanding consumed potions every tick would
   * thrash or block mid-grind.
   */
  topUp?: boolean;
}

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
  /** What the item is FOR — set at compile time so the runner never has to
   *  guess a target's purpose from code/slot matching (codes can collide,
   *  e.g. a deliverable that is also an edible food). */
  role?: "gear" | "food" | "deliver";
}

/** Between-fight healing food the runner should eat via the `use` action. */
export interface FoodSpec {
  code: string;
  heal: number; // HP restored per unit
  perFight: number; // expected units consumed per fight (for live re-stocking)
  /** Character can cook more himself. False ⇒ eat existing stock, then rest —
   *  the runner must never demand more than exists or the plan blocks. */
  producible?: boolean;
}

/** The frozen spec the campaign runner executes (gear is fixed; steps re-derive). */
export interface ExecutionSpec {
  targets: Target[]; // gear/items to obtain + equip
  monster?: string; // combat target, if the goal ends in fighting
  repeat: number; // how many fights to do
  // Task-loop extras — absent on plain goal plans.
  mode?: "goal" | "task-loop"; // "task-loop" drives the accept→prep→execute→deliver→turn-in phases
  loop?: boolean; // after turn-in: accept the next task (true) or finish (false)
  food?: FoodSpec; // heal with this food before resting
  keep?: string[]; // item codes never auto-deposited when banking off overflow
  master?: "monsters" | "items"; // which Tasks Master to accept from when idle
}

/** A goal the user picks; compileGoal() turns it into a full Plan. */
export type Goal =
  | { kind: "beat-monster"; monster: string; repeat?: number }
  | { kind: "combat-level"; target: number }
  | { kind: "skill-level"; skill: string; target: number }
  | { kind: "craft-item"; code: string; quantity: number }
  | { kind: "complete-task" }
  | { kind: "task-loop"; master?: "monsters" | "items" };

/** The compiled result of a goal: what to equip, how to get it, what to do. */
export interface Plan {
  goal: Goal;
  gear?: GearRecommendation;
  /** The unrestricted best set (any equippable item, ignoring obtainability) —
   *  report-only, shown when it beats the executable `gear`. */
  ideal?: GearRecommendation;
  /** Ideal-set items this character cannot obtain alone — another character
   *  must put them in the bank ("This character needs these items…"). */
  needsInBank?: string[];
  acquisition: AcquisitionPlan;
  execution: ExecutionSpec; // what the campaign runner executes
  summary: string;
}
