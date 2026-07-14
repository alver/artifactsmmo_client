// The Hive planning domain — shared types. Pure module: no signals, no API.
//
// Contract with the runtime (state/hive.ts):
// - The runtime builds a HiveCtx snapshot from signals; domain code never
//   reads signals itself.
// - compileGoal returns waves, but only waves[0] is executable — later waves
//   are an honest preview. At each wave boundary the runtime re-calls
//   compileGoal with FRESH ctx and dispatches the new waves[0] (the
//   recompile-at-barrier loop), until goalSatisfied or an empty compile.
//   Because every queue item is skip-if-satisfied and compile reads the live
//   bank, the loop is idempotent: drop shortfalls become small top-up waves,
//   and a consumer craft is only ever compiled after its producers' deposits
//   are visible in ctx (a finite craft item never pauses on missing mats).
// - Goals carry DECISIONS (which monster, which item codes per character),
//   never quantities or coordinates — those are recomputed from live ctx at
//   every compile. AccountGoal must stay plain JSON (persisted in ammo:v1:hive).
// - Assignments: at most one per character per wave, and NO infinite items
//   (times/quantity 0) — an infinite item never completes, so its wave would
//   never advance. (Compile-side rules: the RUNTIME may append one `filler`
//   assignment per idle character — an infinite task-loop it excludes from
//   the barrier and pulls when the wave completes.)

import type { QueueItemInput } from "../queue";
import type { AccountAchievement, BankItem, Character, GearSlot } from "../../types/api";
import type { ItemStack } from "../../types/catalog";

/** Snapshot the runtime builds from signals. */
export interface HiveCtx {
  /** Hive participants only (manual opt-outs excluded), account order. */
  characters: Character[];
  bank: BankItem[];
  bankGold: number;
  /** null = not fetched — degrade (skip achievement goals), never fetch here. */
  achievements: AccountAchievement[] | null;
  /** Per-character craft-specialization pins (store.craftSkillPins). */
  craftPins: Record<string, string>;
}

/** One character's part of a gear-upgrade goal: the slots whose upgraded pick
 *  isn't owned yet. Satisfied when every code exists somewhere in the fleet. */
export interface GearUpgrade {
  character: string;
  wear: Partial<Record<GearSlot, string>>;
}

export type AccountGoal =
  | { kind: "gear-upgrade"; monster: string; upgrades: GearUpgrade[] }
  /** User-directed production run ("make me N of X") — never auto-proposed. */
  | { kind: "craft-order"; targets: ItemDemand[] }
  | { kind: "farm-tasks"; perCharacter: { character: string; master: "monsters" | "items"; times: number }[] }
  | { kind: "achievement"; code: string }
  | {
      kind: "level-skill";
      skill: string;
      character: string;
      toLevel: number;
      /** Human note: what this unlocks (e.g. "gear upgrade vs Wolf"). */
      unlocks?: string;
    };

/** Why a goal can't (fully) compile right now, with the prerequisite goal that
 *  would clear it when one exists. */
export interface Blocker {
  reason: string;
  suggest?: AccountGoal;
}

export interface ScoredGoal {
  goal: AccountGoal;
  /** Short human title — panel cards, log lines, history. */
  label: string;
  /** Account value per estimated hour — comparable across goal kinds. */
  score: number;
  /** One sentence: why this, why now. */
  rationale: string;
  /** Empty ⇒ fully compilable right now. */
  blockers: Blocker[];
  estActions: number;
  estMinutes: number;
}

export interface HiveAssignment {
  character: string;
  /** e.g. "gather 160× iron ore, smelt 16 bars" */
  label: string;
  /** [] = nothing this wave (the runtime marks it skipped). */
  items: QueueItemInput[];
}

export interface HiveWave {
  label: string;
  assignments: HiveAssignment[];
}

export interface HivePlan {
  goal: AccountGoal;
  waves: HiveWave[];
  summary: string;
  /** Non-empty ⇒ the plan is partial (or waves is empty). */
  blockers: Blocker[];
  /**
   * Bounded single-shot plan (farm-tasks): do NOT recompile at the barrier —
   * when the dispatched waves complete, the goal is done. Without this a
   * "do N of something" goal would re-emit the same wave forever.
   */
  once?: boolean;
}

// ── planAcquire vocabulary ───────────────────────────────────────────────────

export interface ItemDemand {
  code: string;
  quantity: number;
}

export type AcquireTask =
  | {
      how: "gather";
      code: string;
      qty: number;
      resource: string;
      skill: string;
      level: number;
      /** Expected gather actions (qty × drop rate). */
      estActions: number;
      /** Characters whose gathering skill reaches the node. */
      candidates: string[];
    }
  | {
      how: "fight";
      code: string;
      qty: number;
      monster: string;
      expectedFights: number;
      /** Characters with a (safe when possible) forecast win. */
      candidates: string[];
    }
  | { how: "buy"; code: string; qty: number; npc: string; currency: string; unitCost: number }
  | {
      how: "craft";
      code: string;
      runs: number;
      produced: number;
      skill: string;
      level: number;
      /** Qualified crafters, preferred first (pin wins). */
      candidates: string[];
      /** Post-order layer: 1 + max(depth of crafted ingredients); leaf crafts = 1. */
      depth: number;
    };

export interface AcquirePlan {
  /** Demand already covered by bank stock (informational — crafts self-withdraw). */
  fromBank: ItemStack[];
  /** Crafts in post-order (ingredients precede consumers). */
  tasks: AcquireTask[];
  estActions: number;
  feasible: boolean;
  blockers: Blocker[];
}
