# 029 — The fleet levels the crafts: a training's materials are everybody's work

Read first: `CLAUDE.md` (the `train` item's paragraph; the roles' `decide` paragraph), `src/plan/planner/decide.ts`
(the header; `planLevel`'s train branch; `craftTo`; the fighter's order and `workerHunts`), `supply.ts` (`Parent`,
`billOf`, `supplyNeeds`), `gear.ts` (how a piece's needs become first-tier work), `cost.ts` (`craftsPerLevel`,
`levelHoursEstimate`'s gear-craft branch), `forward.ts` (the header's "left out"; the train branch of `advance`),
`tasks/027g-fighters-seconds.report.md` (the roads; decisions 1–3).

## Where this starts
On top of `028: one page` — the top of `origin/rework` when you start. If it is not the last commit, or its report says
it stopped, say so and stop. The working tree holds at most two changes from the planning chat (`docs/rework.md`, this
file); anything else uncommitted: say so and stop. **One exception: the board's reading (`tasks/026b-board-reading.md`,
a parallel session, read-only)** — its task file, its report and new files under `docs/strategy/board/` may lie
uncommitted or appear while you work: never edited, committed with your commit as they are. Its report
(`tasks/026b-board-reading.report.md`, the tables in `docs/strategy/board/whole-1.md`) was read in the planning chat and
is folded into this task (the board's lines under "What is", A.2, A.3, C.3–C.5): read its "For task 029" and part A's
lines before part A. The live service runs `c03bff4` (027g; run `ghfm`,
since 15:56:46 UTC on 11-25).

**What is.** The fighters wear a level-20 battlestaff at combat 28; the fleets that level fastest fight with level-30
to 40 weapons (`docs/strategy/board/2026-11-25.md`). The crafts stand at 23 / 25 / 23 (weapon, gear, jewelry).
- **A crafter levels alone, and mostly hunts.** Second's last level (22 → 23, `lvl:weaponcrafting:25@Second#3`, ended
  12:43 UTC on 11-25) took 6.8 h; of the 10,875 s metered: fight 4,740, rest 3,844, wait 1,210, walk 455, gather 276,
  craft 89. The level before (4.9 h): fight 8,237, rest 3,646, gather 2,232, craft 200 of 17,699 s. The train loop
  hunts its own drops (wolves, ogres) in a worker's set and rests instead of eating.
- **The jeweller does not train.** Fourth's `lvl:jewelrycrafting:30` and `:25` steps blocked at 10:11 and 10:13 UTC on
  11-25 with "inventory full of protected working stock" (the hunt's set, 100 Minor and 16 Small Health Potions and 16
  Steel Bars in the bag); six hours of block each, and Fourth mined gold for `professional_miner` (+1 pt) all day.
- **The model cannot see help.** A gear craft's level is the atlas's hours × `craftK` 0.1 (`levelHoursEstimate`), and
  the forward model's train step is one block of hours that takes nothing from the bank.
- **The board (026b, 15 reads, 50 accounts).** The 19 crafters that gained 30,000+ craft XP in a day made a median
  7,032 XP an hour while the craft moved; Second made 1,745 and Third 1,071. They craft in bursts from the bank; the
  whole account brings the materials — a gold miner in 14 of the 19 windows (every level-30 recipe asks 7–8 gold
  bars), and fighters at the drop monsters for no XP (a 46 at the vampire). Under 30 they train on a recipe 6–10
  levels under the craft (level-15 rings at jewelry 21–28: 12,000–19,000 XP an hour), from 30 on the level-30 tier,
  and they switch between recipes of a level as the stock feeds them.
- **On 027g's road the crafts trail the fighters**: the fighters reach 35 on days 5–6, 40 on day 14, 45 on days 18–19;
  the crafts reach 35 on days 9–12 and stand at 36 / 38 / 40 on day 21 and 44 / 40 / 41 on day 42. From day 13.7 the
  fighters' pick needs a potion a fight and they stand at 45–46 for three weeks.

**Alex (2026-11-25):** the fleet is plainly behind in weapons, and armour is not to be forgotten — send the whole fleet
to level the crafts. He leaves the roles' details to the planning chat.

## A. A craft level under its target is the fleet's work
1. **A parent like a gear piece.** For a gear craft (`GEAR_CRAFT`) whose holder is on and under the level `craftTo`
   aims at, the next level is a parent of supply: its demand is the training recipe's ingredients for the runs that
   level takes, less what recycling gives back. Its leaves (`src:`, `mat:`) are needs of the fighters' road — a
   worker's first tier, by the lane and craft rules that already hold.
2. **One picker, at the fleet's price.** The parent and the train loop name the recipe by one picker, and it prices a
   material at the seconds of whoever supplies it under this task (a fighter's kills, the lane holder's gathers, the
   bank's stock free) — not at the crafter's own hunt. The choice may move as the stock moves (the board's crafters
   craft what the bank feeds); what must hold: the fleet never supplies one recipe while the loop crafts another, and
   a batch's materials already banked are used before the choice leaves them. Say how.
3. **The fighters hunt for it.** A training need's `src:` kill is a fighter's work before its pick, whoever else is
   admitted and whether or not the monster gives the fighter XP — the workers are the crafters. Within 25% of the
   pick's rate it joins the pick's bonus as 027g's road kills do. One named switch, `TRAIN_HUNT`, on; off, such a kill
   follows 027g's rule (`workerHunts`).
4. **The crafter crafts.** The train step ranks in the worker's first tier while its craft is under the target, and
   comes before a need of the same tier when the bank covers a batch. What the bank lacks it still sources itself, as
   today — and a hunt inside the loop eats by 027g's food rule instead of resting.
5. **The model follows.** A train step's hours are what its batch still costs with the bank as it is (materials in the
   bank are free, as in the loop); the forward model's train step takes the batch from the bank and puts back what
   recycling returns. The far road's price (`hoursToLevel` beyond the next level) may stay the atlas's — say what you did.
6. The target is `craftTo`'s as it stands (the highest fighter's level + 5, down to a multiple of 5, at least 30).

## B. Riding along (the planning chat's calls on report 027g)
1. **Fourth's bag.** Read `logs/journal/` from 15:56 UTC on 11-25: does a jewelrycrafting train step still block with
   "inventory full of protected working stock" on `c03bff4`? Either way a train step's hunt never takes more than the
   bag holds beside its batch; a scenario with 11-25's bag (red on the starting tree if it still blocks there).
2. **Cooking is Fourth's** (`DEFAULTS.roles`): Third keeps gearcrafting, alchemy and fishing. 027g: Third cooked 328 h
   and the fighters waited about 500 h each for its potions.
3. **A step's food is up to half the bag** (a third today, task 015); the forward model's cap with it.
4. **Second stays a worker**: `fighterFrom` goes. It keeps woodcutting and weaponcrafting, and its craft follows A.6
   instead of forging by need only. Two fighters until the planning chat says otherwise.

## C. Read-only, into the report
1. From the final road: the level of the weapon First and Fifth wear, and how many of their armour and jewelry slots
   hold a piece of level 30+, on days 1, 2, 3, 5, 7, 14, 21; the first level-30 and level-40 weapon — which, the day
   it is made, who made it, what it waited for.
2. The fighters' hours of "no fight admitted" by week on the final road, and what each waits for.
3. **Craft XP an hour while training**, a craft a row, on the final road's first seven days — against play's 1,745
   (weapon) and 1,071 (gear) and the board's median 7,032; the recipe by craft level from 23 to 40, and who supplied it.
4. **Gold.** The gold ore and bars the bank holds on the World, what the first level-30 batches of the three crafts
   ask, and the day the road first runs short of gold — who mines it then.
5. **The board's pieces with no event or boss drop** (026b's report, C: skull_wand and dreadful_staff at weaponcrafting
   25, greater_dreadful_staff at 30; steel_armor, royal_skeleton helmet, armor and pants, flying_boots; topaz amulet,
   the level-30 rings): the day the final road makes each for First and Fifth; those it never makes, and the rule that
   stops it (First wears an adventurer_vest of level 10 today).
6. **Tasks.** The fleet finished no task in 30.7 h (the board's median account: 8.6 a day); First holds a chicken task
   at 0/248 and Fifth a flying snake task at 0/367 while both fight the vampire. Five lines: why 027d's rule neither
   works nor cancels them, and what a redraw until the task names the pick's monster would cost in coins. No change.

## D. Proof
1. Checks, red first on the starting tree:
   - a craft under its target → its training's leaves are first-tier needs; at the target → none;
   - a training's `src:` kill with a worker admitted → the fighter's, before its pick; with `TRAIN_HUNT` off → the
     worker's; a monster within 25% of the pick's rate → the pick is that monster;
   - the bank covers a batch → the crafter's train step, and its hours are the crafting's, not the atlas's;
   - the forward model: a train step takes the batch from the bank, and the level comes sooner when a fighter banked
     the drops first;
   - B.1's bag; cooking goes to Fourth; a food take of half a bag; Second at weaponcrafting 30 is a worker.
2. A scenario on the fake: the drops in the bank, the train loop withdraws, crafts and recycles and does not hunt;
   one where it hunts and eats.
3. Four roads from the newest daily World in `logs/world/`, side by side: the starting tree; the final one; the final
   one with `TRAIN_HUNT` off; the final one with Second's `fighterFrom` as it was. One table: the five combat levels
   on days 3, 7, 14, 21, 28, 42 and at the deadline; the day each fighter reaches 30, 35, 40, 45, 50; the three gear
   crafts on those days and the day each reaches 30, 35, 40; points on those days; a fighter's hours by kind (027g's
   kinds, a training's kills apart) and a worker's (027g's kinds, the train step apart from the supply for it). No
   tuning after the table.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, `npm run check -- planner` once.
5. `CLAUDE.md`: the `train` item's, the roles' and the consumables' paragraphs follow A and B. Commit `docs/rework.md`
   as `Rework notes` if it differs from `HEAD`, then everything else (this file with it) as
   `029: the fleet levels the crafts`; push to `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game; nothing you run writes under `logs/`.
- No new dependencies. Do not edit `docs/rework.md`.
- No new scoring term; one new constant (`TRAIN_HUNT`). If A needs more, say so and stop.
- 028's page shows what the planner decides: if a reason's part needs a new rule name ("a training's kill"), add it
  there and say so; nothing else of the page changes.
- It is committed with `TRAIN_HUNT` on whatever the roads say (Alex: the crafts first now); the planning chat reads
  the table.
- The machine is strong: run the four roads and the gate side by side.
- Everything you write is in English.

## Report
`tasks/029-fleet-levels-crafts.report.md`, **at most about 110 lines**: Summary · Decisions for Alex · How Alex verifies
· The roads (the one table) · Weapons and armour by day (C.1, C.5) · Where the fighters wait (C.2) · The crafts' pace,
gold and tasks (C.3, C.4, C.6) · What was done / files ·
Notes. Say first in the Summary: the day each craft reaches 30, 35 and 40 against the starting tree, and its XP an hour
while training against the board's 7,032; the day First and
Fifth wear a level-30 weapon; where they stand on days 7, 14 and 21; and what `TRAIN_HUNT` costs them. No placeholders
left in it.
