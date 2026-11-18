// The planner's data (docs/design/planner.md B.1). Pure: no signals, no API.
// Nothing in the running client imports src/plan/planner/ yet (task 008 will).

import type { AccountAchievement, ActiveEvent, BankItem, Character } from "../../types/api";

export type Lane = "combat" | "mining" | "woodcutting" | "fishing" | "alchemy"
                 | "weaponcrafting" | "gearcrafting" | "jewelrycrafting" | "cooking";

export type Gate =
  | { kind: "level"; lane: Lane; level: number }
  | { kind: "win"; monster: string; level: number }    // a SAFE win from bank + own gear; `level` = the atlas's guess, used only to bundle it behind a combat gate
  | { kind: "achievement"; code: string }              // a tile opened by another achievement
  | { kind: "event"; code: string }                    // the work exists only while this event is live
  | { kind: "layer"; type: string; code: string }      // no free route to any static tile carrying it
  | { kind: "group" };                                 // a boss: three characters (stage 4)

export type Work =
  | { kind: "kill"; monster: string; drop?: string }   // units are kills, or items of `drop` (a combat_drop objective)
  | { kind: "gather"; resource: string; drop: string } // units are items of `drop`
  | { kind: "craft"; code: string }
  | { kind: "buy"; code: string; npc: string; currency: string; price: number }
  | { kind: "sell"; code: string; npc: string }
  | { kind: "task" } | { kind: "recycle" } | { kind: "favor" }
  | { kind: "use"; code: string }
  | { kind: "level"; lane: Lane; to: number }
  | { kind: "train"; lane: Lane };                     // one level of a workshop skill through the `train` item

/** A material of a craft or the currency of a buy: `per` units for one unit of the target, and where more comes from. */
export interface Input {
  code: string;
  per: number;
  source: Work; // a gather or a kill; anything else counts as "stock only"
  gates: Gate[];
}

export interface Target {
  key: string;            // "ach:<code>:<objective index>" | "lvl:<lane>:<to>"
  achievement?: string;
  objective?: number;
  points: number;         // 0 for a level target
  work: Work;
  left: number;           // units still to do (from the achievements read; 1 for a level)
  gates: Gate[];
  inputs?: Input[];
  filler: boolean;
}

export type Answer = "objective" | "level" | "filler" | "fallback";

export interface Place { x: number; y: number; layer: string }

/** One field item a craft or buy step runs before it crafts or buys. */
export interface Source { code: string; work: Work; times: number }

export interface Step {
  key: string;            // "<target.key>@<character>#<n>" — n counts the consecutive chunks of this target
  target: string;
  character: string;
  as: Answer;
  work: Work;             // for a level target: the kill or gather that levels the lane, or `train`
  units: number;          // chunk size, about CHUNK_SEC at the current unit cost
  hours: number;
  score: number;
  why: string;
  place?: Place;          // the tile the work is on (none for task, train)
  sources?: Source[];     // field work before a craft or a buy
  withdraw?: Record<string, number>; // bank stock the step's items will take (reservations, stock.ts)
  until?: number;         // the work is on an event tile that expires then
}

export interface PlannerConfig {
  deadline: string;                       // "2027-02-24T00:00:00Z"
  exclude: string[];                      // achievement codes the planner never works on
  first: string[];                        // achievement codes taken first whenever they are in reach
  weight: Record<string, number>;         // multiplies an achievement's points in the score (default 1)
  filler: string[];                       // scored only when nothing else scores (rule 4)
  roles: Record<string, { gather?: string[]; craft?: string[] }>; // pins a specialist; default: computed (B.3)
  on: Record<string, boolean>;            // which characters the planner owns (I.2; used by 008)
  offeringsPerDay: number;                // fleet-wide offerings a day the forward model counts (report 006: 10 of 15)
  offeringMin: number;                    // minutes one offering takes (design A.3, a guess)
  craftK: number;                         // × the atlas's craftTrain hours for the three gear crafting skills, up to 40
  craftAbove40: number;                   // hours a level of those skills above 40 (guess, design A.5)
}

export type Costs = Record<string, { sec: number; n: number; at: number }>;

export interface World {  // everything decide() reads — a snapshot, so it runs in a check script
  now: number;
  characters: Character[]; bank: BankItem[]; bankGold: number;
  achievements: AccountAchievement[]; events: ActiveEvent[];
  /** What the others are on. For the deciding character: the step it just finished (its +10%). */
  current: Record<string, Step | undefined>;
  costs: Costs;
  blocked: Record<string, { until: number; why: string }>; // key "<target key>@<character>"
  config: PlannerConfig;
  /** Forward model only: when each character is free (ms). Missing = `now`. */
  clock?: Record<string, number>;
}

export interface PlannerState {  // the synced, persisted signal of task 008 — key ammo:v1:planner
  current: Record<string, { step: Step; startedAt: number; progress: number; progressAt: number } | undefined>;
  costs: Costs;
  blocked: World["blocked"];
  config: PlannerConfig;
  achievementsAt: number;
  outlook?: { at: number; next: Step[]; blocked: { target: string; why: string }[]; expected: number };
}
