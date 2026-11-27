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

/** Task 031, A (Alex: the other players get next to nothing from potions — do not make them): false — no potion is a need
 *  (consumables.ts consumableNeeds names none, so none is a parent of supply, and no potion set is solved for a need); a fight
 *  is admitted on the gear, the rune and food, and the potions the bank holds are drunk at today's price until they are gone.
 *  true — 030's. `config.potions` overrides it for the roads and the checks only. */
export const POTIONS = false;
/** Task 031, B (Alex: Third is the kitchen instead of the alchemist): true — the roles of DEFAULTS.roles' kitchen (Third cooks
 *  and fishes, alchemy is nobody's lane); a food need of the fighters' road is a worker's (1a); while a fighter's fight step rests
 *  or its food take is short, the bank's raw food is the cook's step before the rest of (1a) (decide.ts rule `cook`); the
 *  kitchen's fishing and cooking rise to the next food tier in its tier (3). false — 030's. `config.kitchen` overrides it for
 *  the roads and the checks only (the roles stay DEFAULTS.roles': a road with the other value passes its roles in its patch).
 *  False by task 031's rule (D.3): from the World of 11-26 the later fighter reaches combat 50 on road day 34 with it, 33
 *  without (report 031). */
export const KITCHEN = true;

export const DEFAULTS: PlannerConfig = {
  deadline: "2027-02-24T00:00:00Z",
  exclude: [],
  first: [],
  weight: {},
  filler: FILLER,
  // Task 009: every role pinned, so roles never follow levels. Task 027 (Alex, decisions 63, 64): two fighters, three
  // workers — one owner a gathering skill, no craft changes hands. Task 029 (B.2, B.4): Second stays a worker (its
  // `fighterFrom` went: two fighters until the planning chat says otherwise); cooking is Fourth's (027g: Third cooked 328 h
  // and the fighters waited for its potions).
  // Task 031 (B.1, KITCHEN): Third is the kitchen — gearcrafting and cooking, fishing; Fourth keeps jewelrycrafting, mining and
  // woodcutting; alchemy is nobody's lane (roles.ts rolesOf). Without the kitchen, 030's.
  roles: {
    First: { role: "fighter" },
    Second: { role: "worker", craft: ["weaponcrafting"], gather: ["woodcutting"] },
    Third: KITCHEN ? { role: "worker", craft: ["gearcrafting", "cooking"], gather: ["fishing"] } : { role: "worker", craft: ["gearcrafting"], gather: ["alchemy", "fishing"] },
    Fourth: KITCHEN ? { role: "worker", craft: ["jewelrycrafting"], gather: ["mining", "woodcutting"] } : { role: "worker", craft: ["jewelrycrafting", "cooking"], gather: ["mining", "woodcutting"] },
    Fifth: { role: "fighter" },
  },
  on: { Fifth: true }, // task 008: one character for a day of real play; 010 turns the other four on
  offeringsPerDay: 10, // measured 2026-11-17 and 11-18 (report 006); the cap is 15
  offeringMin: 20,
  craftK: 0.1,
  craftAbove40: 60,
  // Task 025, settled point 2: the floor of a fight's rolled win rate (Alex, decision 61: 0.75). It guards against the
  // model's error; the price (the expected seconds a win, a loss priced in) chooses. "safe" and "win" ended with it.
  risk: { minWin: 0.75 },
  // Task 011: the price factor of a potion a fight drinks, in every solve and price of the core (reach.ts potionPrice).
  // For the replay's row B (0: potions free) only: the UI does not show it, the executor's own solves (jobgear.ts)
  // keep 1, and a patch over it is never written.
  potionK: 1,
  // Task 012: 1 = an ingredient the stock covers for 100 runs is free (xp.ts potionPriceOf, reach.ts potionPrice); 0 =
  // the field price always — the replay's row C only, with the same rules as potionK.
  potionStock: 1,
  // Task 013: 1 = an event is priced by its calendar (events.ts) and the forward model attends it by expectation; 0 = an
  // event is a wall and the forward model has none — the replay's row E only, with the same rules as potionK.
  events: 1,
  // Task 014: 1 = potions and food are needed, made through the bank and taken by the step that planned them, priced as
  // the chain (consumables.ts); 0 = report 013's model whole — its prices, its KILL_LOG, its drinksOf — the replay's
  // row C only, with the same rules as potionK.
  consumables: 1,
  // Task 015, settled point 5: the most one bank expansion may cost (Alex, 2026-11-20: 60,000; his to move with a patch).
  // The price doubles with each (7,000 → 14,000 → 28,000 in the log), so 60,000 buys the next two.
  expansionCap: 60_000,
  // Task 017, settled point 10: 1 = the conditional transitions open to the planner and the runner, tasks coins are spent
  // on an objective's own material, a kill step the stock caps to a sliver is no candidate, the forward model's gold
  // moves; 0 = report 016's model whole — the replay's row only, with the same rules as potionK (not in the UI).
  tolls: 1,
  // Task 017, settled point 5 (design D.2: a character-hour of fights earns about 236 gold, of tasks 124): a fare's gold
  // counts as hours at this rate in the score of the step and of the chain it serves.
  goldPerHour: 300,
};

/** Task 017, settled point 11: the tasks coins the bank keeps (a task's cancel fee needs one; a guess). */
export const COIN_FLOOR = 50;
/** Task 017: the tasks coins a task pays — the mean of public/data/tasks.json's 85 tasks (2 to 5 each). */
export const COINS_PER_TASK = 3.69;

/** Task 012, settled point 4: the bank actions of a craft, trade or gear step (the reset's deposit and swap, the
 *  withdrawal, the closing deposit) — the median of the 13 `mat:` / `gear:` steps of logs/dev.log on 11-19 (12–165 s;
 *  scripts/check-planner.mts prints them). The walks come from the routes (cost.ts stepSec). */
export const STEP_BANK_SEC = 42;

/** Gear by need (task 009 section 4): make it, then do the work, in at most this share of the work's hours without it. */
export const NEED_RATIO = 0.85;

/** Log factors on the simulator's and the docs' unit times (design A.3, map E). */
// Task 012: measured ÷ estimate (killSeconds with the docs' rest + the bank trips, in the sets the log shows with the
// pieces made by then) over every kill step of the planner's era (logs/dev.log 11-19, 23 samples; scripts/check-planner.mts
// prints them): the median, kept outside 0.9–1.1. Below 1 because most steps eat: food heals faster than rest (food is
// not modelled, task 012 settled point 3). It was 1.3 (map E: 51.9 s a fight against the 40 s the client assumed), on
// rest at 5 HP a second.
export const KILL_LOG_013 = 0.88;
/** Task 014, settled point 6: measured ÷ the estimate with healing priced as it is — eating where the step ate (one `use`,
 *  bis.ts USE_SEC, and the rest under one unit), rest by the docs where it rested — over report 012's eight decomposed kill
 *  steps of 11-19, the food a fight item made inside itself taken out of the measured (the new executor never makes it
 *  there: settled point 1). Median 1.087, inside 0.9–1.1: no factor (task 012's rule). With that food left in, over all
 *  23 kill samples, the median is 1.27; scripts/check-planner.mts prints both. No kill step ran after 11-20 08:06 UTC. */
export const KILL_LOG = 1;
/** The log factor of a kill as the World's config reads it: report 013's with consumables 0 (row C). */
export const killLog = (world: { config: { consumables?: number } }): number => ((world.config.consumables ?? 1) ? KILL_LOG : KILL_LOG_013);
export const GATHER_LOG = 1.05; // 30.6 s against the formula's 30–39 s

/** Task 014, settled point 3: consumables are made for the next HORIZON chunks of a work, plus MARGIN (a fifth). */
export const HORIZON = 2;
export const MARGIN = 1.2;
/** Task 027g, B.4 (Alex: nothing is fished or hunted for food alone): false — a food need opens no gather or kill step;
 *  the cook cooks what the bank holds raw (the by-products: the trout of the algae step, the hunts' meat). true — today's
 *  chain (a need's ingredients from the field). `config.foodFishing` overrides it for the roads and the checks only. */
export const FOOD_FISHING = false;
/** Task 029, A.3 (Alex: the crafts first now): true — a training's src: kill is a fighter's work before its XP pick, whoever
 *  else is admitted and whether or not it gives the fighter XP (the workers are the crafters); false — such a kill follows
 *  task 027g's rule (a worker that is on and admitted hunts it). `config.trainHunt` overrides it for the roads and checks only. */
export const TRAIN_HUNT = true;
/** Task 030, A (Alex: weapons and armour before potions): a worker's tier (1) — "off": one tier, as 2d3f66e ranks it; "all":
 *  two halves, (1a) weapons and armour (gear work (a), the craft level such a piece asks, a craft's training's leaves; last its
 *  own craft's train step the bank does not cover), (1b) the road's consumables and a lane holder's tool, only when (1a) has
 *  no candidate; "pick": as "all", the consumables of a fighter's XP pick of today in (1a). `config.gearFirst` overrides it
 *  for the roads and the checks only. */
export const GEAR_FIRST: "off" | "all" | "pick" = "all";

/** Task 013: a spawn is seen half a poll late on average (the 2-minute poll while event demand is open, sync.ts). */
export const EVENT_SEEN_SEC = 60;
/** Task 013, settled point 3: a member goes only with at least this much of the spawn left after the walk and the reset. */
export const EVENT_MIN_SEC = 15 * 60;
/** Task 013, settled point 7: the docs' mean time between two spawns of an event — a 1/rate chance a minute while it is
 *  not up (docs/api/openapi.json EventSchema; `cooldown` is the wait before one can be spawned with gems, not a natural
 *  spawn's) — is (rate + duration) minutes. × this: the spawns the docs expect over the log's span ÷ the spawns it holds
 *  — logs/dev.log 2026-11-17 10:51 to 11-20 08:06 UTC (69.2 h, the event poll's whole span): 54.2 expected, 33 seen,
 *  about three standard deviations short, so the log decides. One number for every event; scripts/check-planner.mts
 *  prints the samples per code. */
export const SPAWN_LOG = 1.64;
export const TASK_SEC = 1.95 * 3600; // log: hours per task
export const GUESS_KILL = 300; // seconds a kill with no forecast and no atlas time (the map's guess)
