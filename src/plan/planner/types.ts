// The planner's data (docs/design/planner.md B.1). Pure: no signals, no API.
// The runtime that uses it is src/state/planner.ts (task 008).

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
  source: Work; // a gather or a kill; a craft = made by another recipe (supply.ts opens it)
  gates: Gate[];
}

export interface Target {
  key: string;            // "ach:<code>:<objective index>" | "lvl:<lane>:<to>" | "src:<code>" | "mat:<code>" | "gear:<code>"
  achievement?: string;
  objective?: number;
  points: number;         // 0 for a level target
  work: Work;
  left: number;           // units still to do (from the achievements read; 1 for a level)
  gates: Gate[];
  inputs?: Input[];
  filler: boolean;
}

/** "supply": a `src:` / `mat:` / `gear:` step — material or a gear piece for an open parent (task 009). */
export type Answer = "objective" | "level" | "filler" | "fallback" | "supply";

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
  wear?: Record<string, string>; // slot → code: the set its job wears, out of the others' pool while it is not on yet (stock.ts)
  parent?: string;        // a supply step: the key of the parent it is for (the best-scoring one)
  for?: string;           // a gear step: the character the piece is made for
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
  risk: "safe" | "win";                   // a planned fight: a safe win (default), or any win (task 009's replay row D only)
}

export type Costs = Record<string, { sec: number; n: number; at: number }>;

export interface World {  // everything decide() reads — a snapshot, so it runs in a check script
  now: number;
  characters: Character[]; bank: BankItem[]; bankGold: number;
  achievements: AccountAchievement[]; events: ActiveEvent[];
  /** What the others are on. For the deciding character: the step it just finished (its +10%). */
  current: Record<string, Step | undefined>;
  costs: Costs;
  /** Key "<target key>@<character>". `levels`: a long block (three strikes) also ends when one of these lanes passes its level. */
  blocked: Record<string, { until: number; why: string; levels?: Record<string, number> }>;
  config: PlannerConfig;
  /** Forward model only: when each character is free (ms). Missing = `now`. */
  clock?: Record<string, number>;
  /** Task 010: each character's active offering favors (today's offerings cache); pickMonster / pickNode count their
   *  XP while they last. The forward model drops them. */
  favors?: Record<string, Favor[]>;
}

/** An accepted offering's favor: × `xp` XP (and × `drop` drops) on its target for that character until `until` (ms). */
export interface Favor { type: "monster" | "resource" | "craft"; code: string; xp: number; drop: number; until: number }

/** A character's step as the runtime (src/state/planner.ts) tracks it. Kept after the step ends until the next
 *  decision, so `world.current[name]` of the deciding character is the step it just finished (the +10% of B.4). */
export interface Running {
  step: Step;
  startedAt: number;      // ms
  n: number;              // queue items the step compiled to (ids pl:<key>:0 … n−1)
  run: number;            // running seconds: one of the step's own items the head and the queue running (no interrupt, pause, outage hold, stopped service)
  progress: number;       // the step's counter (stall check)
  movedAt: number;        // `run` when the counter last moved
  units: number;          // units done (the last item's `done`; a buy's quantity once bought; a train step's level-up), the highest seen
  from?: number;          // a train step: the lane's level when it started
  lv?: { lane: Lane; level: number; run: number; full: boolean }; // a level step: running seconds into `level`; `full` = it began at an observed level-up
  over?: boolean;         // the step ended and was sampled or blocked; the next decision is due
}

export interface PlannerState {  // the synced, persisted signal of task 008 — key ammo:v1:planner
  current: Record<string, Running | undefined>;
  costs: Costs;                 // `level:<lane>:<L>` holds hours (cost.ts hoursToLevel), every other key seconds
  blocked: World["blocked"];
  strikes: Record<string, number>; // consecutive blocks of a target, any character; reset by a step of it that did units
  config: Partial<PlannerConfig>;  // Alex's patch over DEFAULTS (a later change of the defaults reaches a running installation)
  optedOut: string[];           // characters the planner put on the hive's opt-out list
  achievementsAt: number;       // the last successful achievements read
  /** Task 010: per owned character, the offerings day (the date of the most recent 00:05 UTC) whose offering interrupt
   *  was issued; `n` re-issues that day after a removed one (at most 3), the next one due at `again` (ms). */
  offered?: Record<string, { day: string; n: number; again?: number }>;
  outlook?: { at: number; next: Step[]; blocked: { target: string; why: string }[]; expected: number };
}
