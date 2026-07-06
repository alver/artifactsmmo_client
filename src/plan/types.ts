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

/** One step in an acquisition plan (produce the task deliverable / batch materials).
 *  Gear is NEVER acquired — the bank swap (jobgear.ts) equips what the bank holds. */
export type AcquisitionStep =
  | { kind: "withdraw"; code: string; quantity: number; x?: number; y?: number }
  | { kind: "buy"; code: string; quantity: number; npc: string; x?: number; y?: number; cost: number }
  | { kind: "gather"; code: string; quantity: number; resource: string; level: number; x?: number; y?: number }
  | { kind: "farm"; code: string; quantity: number; monster: string; expectedFights: number; x?: number; y?: number }
  | { kind: "craft"; code: string; quantity: number; skill: string; level: number; x?: number; y?: number }
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
}

export interface AcquisitionPlan {
  steps: AcquisitionStep[];
  estActions: number;
  estSeconds: number;
  feasible: boolean;
  blockers: string[]; // human-readable reasons the plan can't fully run
}

/** An item to obtain — the resolver's input. Gear never appears here. */
export interface Target {
  code: string;
  quantity: number;
  /** What the item is FOR — set at compile time so the runner never has to
   *  guess a target's purpose from code matching (codes can collide,
   *  e.g. a deliverable that is also an edible food). */
  role?: "food" | "deliver";
}

/** Between-fight healing food the runner should eat via the `use` action.
 *  Always bank-limited: eat what the bank holds, then heal by rest. */
export interface FoodSpec {
  code: string;
  heal: number; // HP restored per unit
  perFight: number; // expected units consumed per fight (for live re-stocking)
}

/** The frozen spec the campaign runner executes (steps re-derive live). */
export interface ExecutionSpec {
  targets: Target[]; // consumables/deliverables to obtain (never gear)
  monster?: string; // combat target, if the goal ends in fighting
  repeat: number; // fights to do (0 = infinite, queue-run beat-monster)
  /** Which runner executes the plan: absent ⇒ the queue (beat-monster);
   *  "task" / "train-craft" drive the campaign's phase machines. */
  mode?: "task" | "train-craft";
  /** train-craft: the skill to level and the level to stop at. The recipe is
   *  NOT frozen — the runner re-picks the best one as the level rises —
   *  unless the user pinned one via `recipe`. */
  skill?: string;
  skillTarget?: number;
  recipe?: string;
  food?: FoodSpec; // heal with this food before resting
  keep?: string[]; // item codes never auto-deposited when banking off overflow
  master?: "monsters" | "items"; // which Tasks Master to accept from when idle
  /** Items task with deliverable stock already in inventory/bank — trade that
   *  to the Tasks Master BEFORE producing (production covers only the shortfall). */
  stockFirst?: boolean;
  /** Desired job gear per slot, frozen at compile ("" = strip the slot to the
   *  bank; absent slot = unmanaged). Executed by exec.ts gearSwapStep. */
  gearPlan?: Partial<Record<GearSlot, string>>;
}

/** The kind of work a gear set is optimized for (see plan/jobgear.ts). */
export type GearJob =
  | { kind: "fight"; monster: string }
  | { kind: "gather"; skill: string } // mining | woodcutting | fishing | alchemy
  | { kind: "craft"; skill?: string }
  | { kind: "none" };

/** A goal the user picks; compileGoal() turns it into a full Plan. */
export type Goal =
  | { kind: "beat-monster"; monster: string } // fight until stopped (queue-run, ∞)
  | { kind: "train-craft"; skill: string; target: number; recipe?: string } // level a crafting skill by craft→recycle batches (recipe: user-pinned, else auto)
  | { kind: "complete-task"; master?: "monsters" | "items" }; // one task, one-shot; master used only when none is active

/** The compiled result of a goal: what to wear (bank-only), what to do. */
export interface Plan {
  goal: Goal;
  gear?: GearRecommendation;
  acquisition: AcquisitionPlan;
  execution: ExecutionSpec;
  summary: string;
}
