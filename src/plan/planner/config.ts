// The planner's knobs (docs/design/planner.md A.6) and constants. Pure.

import type { Lane, PlannerConfig } from "./types";

/** A step is one chunk of about 90 minutes (design C.3: a better step waits for the chunk to end). */
export const CHUNK_SEC = 5400;

/** Work with no other use: tasks, recycling, obsidian, pearls (design A.2 item 7; report 005 decision 1). */
export const FILLER = ["tasks_coins_fan", "ecologist", "the_planet_thanks_you", "making_a_nether_portal", "pearl_fisher"];

export const GATHER_LANES: Lane[] = ["mining", "woodcutting", "fishing", "alchemy"];
export const CRAFT_LANES: Lane[] = ["weaponcrafting", "gearcrafting", "jewelrycrafting", "cooking"];
/** The workshop skills the `train` item levels (state/store.ts CRAFT_TRAIN_SKILLS — alchemy is not one). */
export const TRAIN_LANES: Lane[] = CRAFT_LANES;
/** The three skills whose atlas hours are a model artefact (design A.5). */
export const GEAR_CRAFT: Lane[] = ["weaponcrafting", "gearcrafting", "jewelrycrafting"];

export const DEFAULTS: PlannerConfig = {
  deadline: "2027-02-24T00:00:00Z",
  exclude: [],
  first: [],
  weight: {},
  filler: FILLER,
  roles: {},
  on: {},
  offeringsPerDay: 10, // measured 2026-11-17 and 11-18 (report 006); the cap is 15
  offeringMin: 20,
  craftK: 0.1,
  craftAbove40: 60,
};

/** Log factors on the simulator's and the docs' unit times (design A.3, map E). */
export const KILL_LOG = 1.3; // 51.9 s a fight with rest, food and bank trips against the 40 s the client assumes
export const GATHER_LOG = 1.05; // 30.6 s against the formula's 30–39 s
export const TASK_SEC = 1.95 * 3600; // log: hours per task
export const GUESS_KILL = 300; // seconds a kill with no forecast and no atlas time (the map's guess)
