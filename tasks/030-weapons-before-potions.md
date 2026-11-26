# 030 — Weapons before potions: the worker's first tier in two halves; the outlook's limit

Read first: `CLAUDE.md` (the roles' order — a worker's tiers (0)–(4); "The crafts' training"; the outlook's paragraph),
`src/plan/planner/decide.ts` (`ORDER`, the worker's tier (1) in `rank`), `train.ts`, `consumables.ts` (consumables work
(a) and the XP pick's), `src/state/outlook.ts`, `tasks/029-fleet-levels-crafts.report.md` (decisions 1 and 2, the roads).

## Where this starts
On top of `029: the fleet levels the crafts` (`2d3f66e`), the top of `origin/rework`. If it is not the last commit, say so
and stop. The working tree holds at most two changes from the planning chat (`docs/rework.md`, this file); anything else
uncommitted: say so and stop. The live service runs `2d3f66e` (run `udbv`, since 07:25:53 UTC on 11-26).

**What is** (the journal, 11-25 18:52 UTC to the restart):
- **The fighters stand on the Rat.** First is 30, Fifth 31, in level-20 and 25 weapons. The Vampire gave 80 XP a kill at
  28–29 (4,700–5,200 XP an hour) and 53 at 30; the pick moved to the Rat: 58–62 XP a kill, 73–78 s a win with trout
  (2,900 XP an hour), 103–115 s a win since the bank ran out of trout (1,850 XP an hour; `lvl:combat:39@First#6`: fight
  3,475 s, rest 4,550 s). Nothing stronger is admitted in their sets: the weapon is the gate.
- **The crafts stand at 24 / 26 / 23.** In the 22 h before the restart Second spent 16.4 h in train steps for two levels,
  Third 8.4 h and a step open since 20:14 UTC for one. Fourth trained jewelry for 0.2 h: 8.9 h went to `lvl:mining:40`
  (+1 pt) and 5.5 h to sap and algae for Health Potion ×2,000 (`king_of_the_goblins`, the Goblin) and Minor Health Potion
  ×1,613 (`the_reaper`, the Death Knight).
- **029's first decision in play** (07:29 UTC, jewelrycrafting 23 of 30): `src:sap@Fourth#2`, "worker, a need: supply: Sap:
  25290 actions short for Health Potion ×1668 for king_of_the_goblins (Goblin, 2 chunks) (+3 pts, chain ~144 h)".
- **Report 029, decision 1:** on days 14–42 the workers rank the fighters' potions above the training; weaponcrafting sits
  at 32–34, reaches 35 on day 46 and 40 on day 87; the road makes no weapon above level 30.
- **The outlook** takes 3,326 s on this tree and is killed at 30 minutes: the page shows the road of 01:54 UTC, played by
  028's tree.

**Alex:** a fighter's level is a goal in itself; weapons are made as they are needed, armour is not to be forgotten; the
whole fleet levels the crafts. The planning chat's call on decision 1: weapons and armour come before potions.

## A. The worker's first tier in two halves
One named switch, `GEAR_FIRST` (`config.gearFirst` overrides it for the roads and the checks only), with three values:
1. **`off`**: tier (1) as `2d3f66e` ranks it.
2. **`all`**: tier (1) is two halves, the second only when the first has no candidate.
   - (1a) weapons and armour: gear work (a), the craft level such a piece asks, a craft's training's leaves — today's
     scoring among them; then, last of the half, its own craft's train step the bank does not cover (029's chunk).
   - (1b) the road's consumables and a lane holder's tool — today's scoring among them.
3. **`pick`**: as `all`, but the consumables of a fighter's XP pick of today (the monster `pickMonster` names for it now)
   rank in (1a) with the gear work; the consumables of the rest of the road stay in (1b).

Tier (0) and tiers (2)–(4) are unchanged. The fighter's order is unchanged. No new scoring term. If a why needs a new rule
name for (1b), add it to `ORDER` (028's page reads it) and say so.

## B. The outlook's limit
`KILL_MS` 30 → 90 minutes (`src/state/outlook.ts`); the texts that say "30 minutes" follow (`CLAUDE.md`, `docs/journal.md`,
the header comment, a scenario that asserts it). `HORIZON_DAYS` and `EVERY_MS` stay. Nothing else: the speed is the next
task (031), do not start on it.

## C. Read-only, into the report (at most six lines each)
1. **Materials ahead.** On 029's road the Elderwood Staff waited for three Cyclops Eyes hunted on day 6, two days after
   weaponcrafting reached 30. Which rule held the hunt back until the craft level was there — or was nobody admitted to
   the Cyclops before day 6? The same line for the first level-30 and the first level-35 weapon on the committed road. If a
   rule holds a piece's materials back until its craft level: name it and say what lifting it would touch. No change.
2. **Play against the road** (`logs/journal/`, read-only, from 07:25:53 UTC on 11-26 to when you read): craft XP an hour of
   each gear craft over its train steps' hours and over all the crafter's hours; how many train steps the bank covered and
   how many sourced their own shortfall; the fighters' hours by rule (`train-kill` apart); each against the first day of
   029's final road.

## D. Proof
1. Checks, red first on the starting tree (`npm run check -- train` or a file beside it):
   - a worker with a training's leaf and a road consumables need both open → `all`: the leaf; `off`: `2d3f66e`'s choice;
   - its own craft under the target, the bank not covering a batch, a road consumables need open → `all`: the train step;
   - (1a) empty → `all`: the consumables need;
   - a consumables need of today's pick and one of a later road monster → `pick`: the first ranks with the gear work, the
     second after it.
2. **Three roads to day 42** from the newest daily World in `logs/world/`, side by side: `off`, `all`, `pick` (029's
   driver, `--cfg`). One table: First's and Fifth's combat level on days 3, 7, 14, 21, 28, 42 and the day each reaches 35
   and 40; the three gear crafts on those days and the day each reaches 30, 35, 40; the level of the weapon First and Fifth
   wear on those days and the day of the first level-30 and level-35 weapon; points on those days; the fighters' hours of
   "no fight admitted"; a worker's hours by kind (029's kinds, the consumables' supply apart). No tuning after the table.
3. **What is committed:** the value under which First's and Fifth's combat levels on day 42 sum highest; a tie → the
   earlier first level-35 weapon; still a tie → `all`. If that is `off`, commit the switch `off` and say so first in the
   Summary.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory; `npm run check -- planner` once on the
   committed value, the way 029 ran it (without the 4,500 s backstop, `AMMO_CHECK_VERBOSE=1`) — its line into the report.
5. `CLAUDE.md`: the worker's tier (1) and the outlook's paragraph follow. Commit `docs/rework.md` as `Rework notes` if it
   differs from `HEAD`, then everything else (this file with it) as `030: weapons before potions`; push to
   `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start, stop
  or restart, no build into `dist/`, no request to the game; nothing you run writes under `logs/` (reading it is allowed).
- No new dependencies. Do not edit `docs/rework.md`. One new constant (`GEAR_FIRST`); if A needs more, say so and stop.
- The machine is strong: run the three roads and the gate side by side.
- Everything you write is in English.

## Report
`tasks/030-weapons-before-potions.report.md`, **at most about 80 lines**: Summary · Decisions for Alex · How Alex verifies ·
The roads (the one table) · C.1 and C.2 · What was done / files · Notes. Say first in the Summary: which value is
committed and why; the day of the first level-30 and level-35 weapon under each value; where First and Fifth stand on
days 14, 28 and 42 under each; what the committed value costs in points on day 42. No placeholders left in it.
