# 007 — The planner's core: pure, checked offline — report

## Summary
- `src/plan/planner/` (12 files, about 1,330 lines) has the planner's pure core. `decide(name, world)` applies rules 1–5 of design A.2 and always returns a step. `itemsOf(step, ch)` compiles a step into at most four `pl:` queue items, none infinite. `forward` and `outlook` play the rule out to the deadline. Nothing that runs imports the core, and the UI bundle is unchanged (`index-BZi3vrq8.js`).
- `scripts/check-planner.mts` runs ten named invariants on every decision. In `npm run check` that is the first week: 552 decisions and 5,050 checks, 7.8 s. `npm run check -- planner` adds three replays to the deadline: 22,000 decisions and 171,067 checks, 49 s. Everything passes.
- **First week: 15 → 31 points** (the design expected 15 → 27). All five fight highwaymen first. First buys the hard leather (+2 on day 0). Combat 25 (`adept`) is reached on day 2.3. Coal, birch, steel, hardwood planks and trout follow.
- **Default replay (gear crafting × 0.1): 54 points at the deadline.** That is below the design's 68–87. The rows at × 1 and × 0.25 also end at 54. The cause is that no gear is made in stage 1:
  - Second–Fifth stop at combat 25 and First at 29. The bank's gear wins nothing safely above pigs, wolves and highwaymen, and only First's own mushstaff beats pigs safely.
  - Alchemy has no way to level at 12–19.
  - From about day 20 on, 46–68% of all hours go to the fallback gather.
- So the replay cannot show whether the rule behaves as a spine or as the greedy order. No stage-1 target depends on a gear crafting level, so the crafting price only changes how fast the recycling filler runs.

## Decisions for Alex
None.

## How Alex verifies
1. `git log --oneline -3` shows `007: planner core` on top of `Rework notes` (`abccb85`), and `git status` is clean.
2. `npm run check` reports `37 checks: 36 ok, 1 known defect reproduced, 0 failed`, with `check-planner` among the `ok`s (`OK (5050 invariant checks, 5 made-up cases)`, about 8 s). Exit code 0.
3. `npm run check -- planner` takes about 50 s. It prints the roles, the unhandled objectives, the first step of each character with its reason, score, hours and items, the first week, the three made-up worlds and three `## Replay` sections. The last line is `OK (171067 invariant checks, 5 made-up cases; deadline points 54 / 54 / 54)`.
4. `git grep -n "plan/planner" -- src scripts` matches only inside `src/plan/planner/` (a comment in `types.ts:2`) and `scripts/check-planner.mts`.
5. `git show --stat HEAD` lists only `src/plan/planner/*` (12 files), `scripts/check-planner.mts`, `CLAUDE.md`, `tasks/007-planner-core.md` and this report. No fixture was needed.
6. `npm run typecheck` prints nothing after `tsc --noEmit`. The scratch build's JavaScript file is `index-BZi3vrq8.js`, the same name as in report 006 (see "Commands run").

I checked all six myself.

## What the planner would do from today
**The first step of each character** (the snapshot of 2026-11-18 13:34 UTC; each character decides in account order and sees the others' steps):
- **First — hard leather.** One is left for Tanner's Exchange: 2 points for about 0.4 hours. That is 24 cows for 3 cowhide, then the tailor. This scores 7.4, far above everything else.
- **Second, Third, Fourth and Fifth — highwaymen.** Highway Patrol has 401 left: 2 points for about 13 hours, so about 0.16 an hour. Each takes a 47-kill chunk, and the units left shrink by the others' chunks (401 → 354 → 307 → 260).
- Next on everyone's list:
  - "combat 20 → 25": `adept` and `arachnophobia_conquered` sit behind it, 4 points; 0.066.
  - Coal for Intermediate Miner: 0.049.
  - Pigs for I want bacon: 0.047.
  - The recycling filler: 0.044, only when nothing else scores.

**The first week, as played forward:**

| character | lanes (start → day 7) | steps, in order | achievements it moves | levels on day 7 |
|---|---|---|---|---|
| First | combat, cooking, woodcutting, mining → combat, cooking, alchemy, woodcutting | hard leather; highwaymen; pigs (levelling to 25) and I want bacon (40 h); wolves (to 25); coal; pigs toward combat 32 (96 h); birch | tanners_exchange, highway_patrol, i_want_bacon, adept, intermediate_miner, intermediate_lumberjack | combat 28 |
| Second | combat, weaponcrafting, fishing, woodcutting → combat, weaponcrafting, woodcutting | highwaymen to 25 (54 h); coal; birch (24 h); steel bars; hardwood planks; birch to woodcutting 30; dead-wood planks; dead wood; dead wood toward 40 | highway_patrol, adept, intermediate_miner, intermediate_lumberjack, worker, cabinet_maker, expert_lumberjack | combat 25, woodcutting 35 |
| Third | combat, gearcrafting, alchemy → combat, gearcrafting, fishing, mining | highwaymen to 25 (75 h); coal; steel bars; shrimp to fishing 20; trout (55 h); coal toward mining 30 | highway_patrol, adept, intermediate_miner, worker, intermediate_fisherman | combat 25, fishing 29, mining 27 |
| Fourth | combat, jewelrycrafting, mining, woodcutting (no change) | highwaymen to 25 (62 h); coal; birch; steel bars; hardwood planks; birch to woodcutting 30; dead-wood planks; dead wood; coal toward mining 30 | highway_patrol, adept, intermediate_miner, intermediate_lumberjack, worker, cabinet_maker, expert_lumberjack | combat 25, woodcutting 33, mining 26 |
| Fifth | combat, mining (no change) | highwaymen to 25 (71 h); coal; steel bars; coal to mining 30; gold bars (32 h); gold ore | highway_patrol, adept, intermediate_miner, worker, expert_miner (part) | combat 25, mining 35 |

The fleet goes from 15 to 31 points. The day each achievement completes:

| day | achievements |
|---|---|
| 0 | tanners_exchange +2, highway_patrol +2 |
| 1.5 | a_helping_hand +2 (offerings) |
| 1.8 | i_want_bacon +2 |
| 2.3 | adept +2 |
| 2.5 | intermediate_miner +1 |
| 3.6 | intermediate_lumberjack +1 |
| 5.8 | cabinet_maker +1 |
| 6.2 | intermediate_fisherman +1, worker +1 |
| 6.5 | expert_lumberjack +1 |

**Where this differs from the design's "first week" (I.3)**, and why:
- **The hard leather goes to First, not Fourth.** First is simply the first to decide (the rule). All five fight highwaymen first, not "whoever is free first" (the rule: 0.16 an hour beats everything but the leather).
- **Second, Third and Fourth never fight pigs** (reach). With bank + own gear, pigs are a safe win only for First, who owns the mushstaff. The others win pigs, but not safely (150 s a kill), so they level on highwaymen and stop at 25.
- **Third does no alchemy** (a defect outside the core). The design's "sunflowers to alchemy 20" cannot happen: sunflowers (level 1) give no XP from alchemy 12 on (the docs' formula, `src/plan/planner/xp.ts:8`). No other alchemy node exists below 20. The `train` item does not craft alchemy (`src/state/store.ts:13-18`). Third fishes trout for Intermediate Fisherman instead.
- **The computed roles differ from B.3 for woodcutting and fishing** (the rule's ties). B.3 says woodcutting Second and fishing First. The mechanical rule says woodcutting First (a tie at 21 between First, Second and Fourth goes to account order) and fishing Second (19, the highest among those without a gathering role yet). The roles are recomputed at every decision from the levels, so they move: by day 7 fishing is Third's.
- **Non-specialists gather objectives** (the rule). All five take coal on day 2.3, and three take birch. Design B.3 says "parallel gathering of one objective by non-specialists happens only on events". Rule 2 has no such limit, and task 007 says to implement it as written.
- **Twelve points expected, sixteen got** (costs). The gathering chains run faster than the design assumed: woodcutting 21 → 35 in a week.

**Where it differs from "the order this gives" (A.2)**:
- Items 1–3 are as written:
  - favors every day (counted at 10 a day);
  - the cheap leftovers first: highwaymen day 0.1, the hard leather day 0, pigs 1.8, coal 2.5, birch 3.6;
  - mining and woodcutting on three characters each, because `rolesOf` adds two gatherers while the Strange and Magic Apparition targets are open.
- **Item 4, combat for all five, stops at 25** (reach: no gear). Combat 30 and above never comes.
- **Item 5: fishing goes to 50** (Third, day ~19). **Alchemy never moves** (the gap above).
- Item 7, filler last, holds: the tasks start on day ~19, after everything else that scores.

## The replay
Each row runs from the snapshot to 2027-02-24, with every invariant checked on every decision.

| row | day 7 | day 14 | day 30 | day 60 | deadline | decisions | time |
|---|---|---|---|---|---|---|---|
| the atlas as it is (× 1) | 31 | 35 | 44 | 54 | **54** | 5,656 | 9.9 s |
| gear crafting × 0.25 | 31 | 35 | 44 | 54 | **54** | 7,095 | 11.7 s |
| gear crafting × 0.1 (default) | 31 | 36 | 49 | 54 | **54** | 7,341 | 11.9 s |

**When each achievement completes** (days), the same order in every row except the two recycling achievements:

| days | achievements |
|---|---|
| 0–6.5 | tanners_exchange, highway_patrol, a_helping_hand 1.5, i_want_bacon 1.8, adept 2.3, intermediate_miner 2.5, intermediate_lumberjack 3.6, cabinet_maker 5.8, intermediate_fisherman 6.2, worker 6.2, expert_lumberjack 6.5 |
| 7.5–18.8 | expert_miner 7.5, expert_fisherman 10.4, professional_lumberjack 12.2, professional_miner 12.7, professional_fisherman 18.6, diamond_in_the_sky 18.8 |
| 25–31 | tasks_coins_fan (25.5 / 30.7 / 27.6) |
| 46–50 | a_favored_champion (47.8 / 46.5 / 46.5), pearl_fisher (47.2 / 49.7 / 46.4) |

The recycling filler, ecologist / the_planet_thanks_you: day 30.4 / 53.8 at × 1, day 15.3 / 21.0 at × 0.25, day 13.5 / 16.8 at × 0.1.

**Share of character-hours by what `decide` answered:**

| row | in-reach objective | level: combat / woodcutting / mining / fishing | filler | fallback |
|---|---|---|---|---|
| × 1 | 6% | 3 / 3 / 2 / 1% | 39% | 46% |
| × 0.25 | 6% | 3 / 3 / 2 / 1% | 20% | 65% |
| × 0.1 | 6% | 3 / 3 / 2 / 1% | 16% | 68% |

**Levels at the deadline** (× 0.1; the lanes are the roles as computed then):

| character | levels |
|---|---|
| First | combat 29, weaponcrafting 31, cooking 26, alchemy 18, woodcutting 50 |
| Second | combat 25, gearcrafting 28, woodcutting 50 |
| Third | combat 25, fishing 50, mining 35 |
| Fourth | combat 25, jewelrycrafting 29, mining 35, woodcutting 50 |
| Fifth | combat 25, mining 50 |

**Open points at the deadline** (the same in all three rows; 54 + 156 = 210):

| waits for | points | achievements |
|---|---|---|
| another layer | 59 | a_peaceful_island, adamantite_mastery, around_the_world, blood_of_the_cursed, catch_and_cook, clean_the_lab, coin_collector, elementary_book, lich_please, life_lover, master_alchemist, master_fisherman, master_lumberjack, master_miner, palm_paradise, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, shining_secrets, take_her_down |
| an event | 35 | closing_the_gate, corruption_eradicator, cult_destroyer, draconic_harvest, its_malefic, magic_harvester, magic_lumberjack, secure_the_island, strange_miner, the_new_bandit, the_worm_turns, turning_treasures_to_gold |
| a level | 21 | alchemist, expert_alchemist, intermediate_alchemist (alchemy); cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar, making_a_nether_portal, the_reaper (combat) |
| unhandled | 18 | crafted_with_honor, heartbound, magic_power, potion_brewer, ultimate_rune, welcome_to_hell |
| use | 10 | art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef |
| a raid | 8 | king_of_the_sun, queen_of_the_enchanted_forest |
| a group | 3 | slimed_to_none |
| gear (no safe win from the bank) | 2 | arachnophobia_conquered |
| filler not reached, does not fit | 0 | — |

**What it says**
- **Spine or greedy: not shown.**
  - Rule 3 bundles an achievement behind one lane's gates only when every gate it still misses is a level of that lane.
  - Every achievement behind a gear crafting level misses other gates as well: a group, a layer, an event, or a material two crafts deep (unhandled).
  - So no crafting lane ever has a bundle, `craftK` never reaches a level gate's score, and the three rows differ only in how fast the recycling filler trains crafting.
  - The question returns with gear by need (010). Gear targets are what make a crafting level a gate the fighters wait behind.
- **Where it lands, and why it is below 68:**
  - About 15 points sit behind combat 26–40, which the scratch model reached with the atlas's plus set: the_reaper, cultist_purifier, loktar_ogar, king_of_the_goblins, making_a_nether_portal, cursed_wood_blessed_victory, arachnophobia_conquered.
  - 4 points sit behind alchemy 20–40.
  - That accounts for 54 → about 73. The rest of the difference is the scratch model's event floors (35 points here wait for an event that the forward model does not simulate).
- **The silly things it did:**
  1. **The fleet idles for most of the season.** From about day 20, everyone who has reached 50 in their lanes has nothing open: combat has no safe XP monster, and everything else waits for gear, a layer or an event. They gather a node that gives no XP, which is 46–68% of all hours.
  2. **First spends 96 hours on pigs toward combat 32**, for cultist_purifier. Pigs stop giving XP at 29, so the gate is never reached. The rule cannot see the stall: "hours to the gate" is the atlas's 50 h with the plus set, not this character's pick.
  3. **Five characters on the same coal objective** on day 2.3, and three on birch (B.3's "not off events" is not part of rule 2).
  4. **Roles move with levels.**
     - Objective work by a non-specialist (Third's trout) moves the fishing role from Second to Third.
     - The recycling filler trains each character's best gear crafting skill, so by the deadline the weaponcrafting role is First's (31) and no longer Second's (20).
     - Third's alchemy role is never worked: a specialist left without its skill.
  5. **diamond_in_the_sky is one 71-hour step per diamond.**
     - The bank holds 39 diamond stones of the 48 needed.
     - The other 9 come from gold rocks at 1 in 1,250, with the 1.5 margin for rare drops (`decide.ts:78`). That is 16,875 gathers in one step, because a step is at least one unit.
  6. **A lane nobody levels: alchemy**, see above.
- **No character walks between two targets.** Consecutive steps of the same target are the common case: runs of 10–50 chunks in the tables the check prints.
- **What the result is most sensitive to:**
  - gear (combat stops at 25 and 29);
  - keys and tolls (59 points behind "another layer");
  - events (35 points, never simulated);
  - the alchemy gap (4 points).
  - The crafting price changes nothing here.

## What was done / files
All under `src/plan/planner/`, pure: no signals, no storage, no timers, no `Date.now()`. `world.now` is the clock.

**1. Types and config**
- `types.ts` holds B.1 with these changes:
  - `Gate` adds `win` (a safe win from bank + own; its `level` is the atlas's guess, used only for bundling), and `layer` carries the content (`types.ts:9-15`).
  - `Work` adds `kill.drop` (a combat_drop objective) and `train` (`:17-27`).
  - `Target` adds `objective` and `inputs` (`:29-46`).
  - `Step` adds `as` (objective / level / filler / fallback), `place`, `sources`, `withdraw` and `until` (`:55-69`).
  - `World` adds `clock` for the forward model (`:87-98`). `current[name]` for the deciding character is the step it just finished, which is where the +10% for the last target comes from.
- `PlannerConfig` (`:71-83`): `spend` is left out because D.2 is not built. It adds `offeringsPerDay` (10), `offeringMin` (20), `craftK` (0.1) and `craftAbove40` (60).
- `config.ts` holds `DEFAULTS`, `CHUNK_SEC = 5400`, `FILLER` (tasks, recycling, obsidian, pearls), the lane lists and the log factors (`config.ts:6-36`).

**2. Targets — `targets.ts`**
- `targetsOf(world)` (`:191`) and `unhandledOf(world)` (`:193`) come from one build per achievements array and config (`:158-189`).
- Static per objective (`staticOf`, `:82-143`):
  - kills get place gates (event, layer, achievement-gated tile) plus `group` for a boss or `win` (`killGates`, `:46-53`);
  - drops go to the best monster, preferring static (`:94-106`);
  - gathering goes to its node (`sourceFor`, `:58-79`);
  - crafting gets the recipe's level, the workshop and up to three inputs, each with its field source;
  - `npc_buy` gets an item currency as its input;
  - `npc_sell` gets the buyer's place (an event);
  - favors, tasks, recycling and use are their own work kinds;
  - `combat_level` objectives are level work.
- Level gate targets `lvl:<lane>:<level>` are added for every level and win gate of an open target.
- **The nine unhandled objectives** (8 achievements, 18 points):

  | objective | reason |
  |---|---|
  | crafted_with_honor | strangold_bar is made by another craft |
  | heartbound | palm_plank is made by another craft |
  | magic_power | palm_plank is made by another craft |
  | welcome_to_hell | mithril_bar is made by another craft |
  | potion_brewer (both objectives) | four materials to source, more than a step of four items holds |
  | king_of_the_sun | raid boss |
  | queen_of_the_enchanted_forest | raid boss |
  | ultimate_rune | its currency, sonnengott_coin, comes only from a raid |

  `excluded by config` would be listed here too.

**3. Costs — `cost.ts`**
- `actionSec` (`:58`), `perOf` (`:77`), `unitSec` (`:85`), `hoursToLevel` (`:142`), `hoursOf` (`:149`), `sample` (`:38`: weight 0.3, samples of at least 5 units, used once `n ≥ 3`), and `costKey` (`:22`).
- **A kill** costs `killSeconds` of the memoised `ownedFightRec` × 1.3, plus the round trip to the nearest bank by route divided by the kills per bagful. A monster the bank cannot beat uses the atlas's kill time × 1.3, or 300 s.
  - *Pigs, First at combat 20:* the set is mushstaff, iron shield, leather hat, mushmush jacket, adventurer pants, iron boots, forest + life ring, wisdom amulet and novice guide, and it is safe.
  - 24 turns: `killSeconds` = 120 s, × 1.3 = 156 s.
  - The pig tile (−3, −3) is 55 s from a bank. A kill yields 0.625 items (porkchop 1/2, pig skin 1.5/12), so 221 kills fill a 138-slot bag, which is 2 × 55 / 221 = 0.5 s a kill.
  - Total **156.5 s a kill**.
- **A gather** costs `gatherSec(level)` × (1 − the cut of the best gathering set owned: tool, doll) × 1.05, plus the round trip per bagful.
  - *Gold rocks, Fifth at mining 30:* 44 s × (1 − 0.20 for the bank's iron pickaxe) × 1.05 = 36.96 s.
  - The gold rocks are at (5, −4) underground, 35 s from the bank through the free transition. A gather yields 1.04 items with the gems, so 133 gathers fill the bag: 2 × 35 / 133 = 0.53 s.
  - Total **37.5 s a gold ore**.
- **A craft or buy** costs 5 s plus each input's quantity × its source's unit cost. At decide time the bank stock this character may plan with (`available`) is subtracted first.
- **Tasks:** 1.95 h each.
- **Recycling:** the hours of one level of the character's best recyclable gear crafting skill ÷ the units that level recycles (`recycleLane`, `:110`; `craftsPerLevel`, `:116`).
- **Hours per level** (`levelHoursEstimate`, `:126`):
  - combat: atlas `path[L].t[1]` (the plus set);
  - gathering: `gatherTrain`, else `craftTrain` (alchemy);
  - the three gear crafting skills: `craftTrain` × `craftK` below 40, `craftAbove40` from 40.

**4. Roles — `roles.ts`** (`rolesOf`, `:15`)
- Everyone fights. Each workshop skill goes to its highest level. One specialist per gathering skill goes to the highest level among those without a gathering role yet (a tie goes to fewer roles, then account order).
- Two more gatherers are added for a skill while an open target behind it needs an event. `config.roles` pins.

| character | computed | design B.3 |
|---|---|---|
| First | combat, cooking, woodcutting, mining (event) | combat, cooking, fishing |
| Second | combat, weaponcrafting, fishing, woodcutting (event) | combat, weaponcrafting, woodcutting |
| Third | combat, gearcrafting, alchemy | combat, gearcrafting, alchemy |
| Fourth | combat, jewelrycrafting, mining (event), woodcutting (event) | combat, jewelrycrafting, mining |
| Fifth | combat, mining | combat, mining |

**5. Picks and reach — `pick.ts`, `reach.ts`**
- `pickMonster` (`pick.ts:24`) picks by XP per second (the docs' fight XP ÷ the kill cost above).
  - Candidates are monsters on the map now (static or a live event's), level + 10 at most, not a boss, reachable by a free route and a **safe** win.
  - A monster with an open kill or drop objective gets × 1.25.
- `pickNode` (`pick.ts:46`) picks by XP per hour, using the docs' gather formula (`xp.ts:8`) ÷ the gather cost, among nodes that exist now and are reachable. `any` is the fallback's "highest node, even without XP".
- Reach (`reach.ts`):
  - `staticTiles` (`:22`) indexes content once per catalog; `eventTiles` (`:37`) are the live events' tiles at `world.now`.
  - `travel` (`:49`) is `route(…, FREE)` + `travelSec`, memoised per pair of places. `nearestSpot` (`:62`) and `bankSec` (`:80`) skip the island's conditional bank, as `nearestBank` does.
- **The memo** (`fightRec`, `reach.ts:115`): one `ownedFightRec` per (the bank's equippable stock as a string, name, level, max HP, worn set, monster). A bank that changed only in materials keeps its solves. The whole verbose run needs 445 solves for 22,000 decisions.
- `gatherCut` (`:128`) is memoised the same way.
- `met`'s win gate (`decide.ts:34-43`) is solved only when every other gate of the target is met (`unmetGates`, `decide.ts:28`). A monster 10+ levels above the character is not solved at all. Both are marked as shortcuts.

**6. Stock — `stock.ts`**
- `floor` (`:12`) uses `SELL_FLOORS` and `GOLD_FLOOR`, imported from `src/plan/events.ts:17,20`; they are exported, so nothing is copied.
- `reserved` (`:30`): the other characters' current steps' `withdraw` plus the gear their job wears (the fight solve's set, else the gather or craft argmax of `jobGear`), memoised per World.
- `available` (`:47`): bank − reserved − floor.

**7. `decide` — `decide.ts`**
- `rank` (`:130`) returns every candidate with a fit score and a points-per-hour score. `decide` (`:265`) is its step.
- Objectives:
  - `planObjective` (`:57`): every gate met, a chunk of about 5,400 s.
  - Units are capped by `left` minus the others' current chunks of the same target, and by an event's remaining time.
  - Crafts and buys use bank stock first, then field items for the shortfall, with a binary search for the largest chunk (`:66-90`).
- Level gates (`:183-217`):
  - Per lane of the character, the next gate is the lowest level at which an open achievement has all its missing gates in this lane.
  - The bundle is every such achievement up to that level.
  - The score is Σ points × fit ÷ (hours to the gate + their hours).
  - The work comes from `planLevel` (`:105`).
- Selection (`:222-237`): `config.first` first; the best by fit; else by points per hour (rule 5); else filler; else `fallback` (`:240`). Ties go to the key. +10% applies to the last target.
- The `why` line starts with the answer: objective / level / filler / fallback.

**8. Queue items — `compile.ts`**
- `itemsOf` (`:24`) produces:
  - kill / gather: `gear {job, reset}` and `fight` / `gather` with `gear: true`;
  - craft: [a reset] + one field item per short material + `craft`;
  - buy: [a reset] + field item + `withdraw` currency + `buy`;
  - task: `task-loop` (monsters master);
  - train: `gear {job: craft}` + `train {levels: 1}`.
- The ids are `pl:<step.key>:<i>` on `QueueItem` itself. More than four items throws.

**9. Forward — `forward.ts`**
- `advance` (`:37`) applies a finished step: kills and their drops, gathers and every drop, crafts, buys, tasks, recycled units, and the XP by the same formulas. Levels use the atlas's `xpNeeded`, with +5 max HP per combat level. `combat_level` objectives follow the fleet's top level. The bank is reduced by what the step withdraws.
- `finish` (`:22`) adds each UTC midnight's offerings to the character's clock and to the favor count: 2 a day per character at 20 minutes.
- `forward` (`:122`): the character free first decides, seeing the others' running steps as `current`, and a step is applied when it ends.
- `outlook` (`:181`) returns the next n steps per character, `expected` and its three notes: offering XP left out, events not simulated, no gear made.
- `waitingOf` (`:156`) groups the open achievements by what they wait for.
- **Costs:**
  - one `decide` cold: 250–520 ms (the first fight solves for that character);
  - one `decide` warm: 1.3 ms;
  - a full forward run to the deadline (about 7,300 decisions): 14.2 s cold, 7.6–8.1 s warm.

  To coarsen it for 008, I would stop playing a character forward once it has reached the fallback with nothing levelling. The outlook would then lose the XP that fallback gathers still give.

**10. `scripts/check-planner.mts`**
- Inputs: the snapshot's characters, achievements and status time (`world.now` = 2026-11-18 13:34:02 UTC, the status read; the leaderboard read was 14:28). The bank comes from the fixture (2026-11-17), and bank gold is 155,976 from `leaderboard-accounts.json`.
- Eight item codes are in both a snapshot bag and the fixture bank (Second's sap, Fourth's four gem stones, Fifth's shrimp, algae and shell). Both are taken as they are: the planner plans only with bank stock, so only the gear pool could count them twice, and none of them is gear.
- The ten invariants (`verify`, `:75-108`). Invariant 3 calls `ownedFightRec` itself, not the planner's memo.
- The three made-up worlds:
  - everything blocked → the fallback coal;
  - only the lich open and First at 45 → 14 steps in a day, none on it, and it "waits for another layer";
  - a miner at 35 with the Strange Apparition live at (−4, 12) → strange rocks (Strange Miner, 75 ore, the chunk ends with the event); expired → gold rocks (Expert Miner).

**`CLAUDE.md`**: a short section, "The planner's core (task 007, not wired in)".

**Commands run**
- `git add docs/rework.md; git commit` (Rework notes)
- `npx tsc --noEmit` / `npm run typecheck`
- `npm run check`
- `npm run check -- planner`
- The check script directly, with the scratch storage flags.
- Scratch probes under the session scratch directory: BIS cost per level, the pig verdict per character, a CPU profile of a forward week, rankings on day 4 and day 30, the worked cost examples. All deleted at the end.
- `node -e` reads of `public/data/*.json`, `docs/design/snapshot/*.json` and the fixture.
- `npx vite build --outDir <scratch>/ammo-007-dist --emptyOutDir`, then the folder was deleted. Last lines:
  ```
  …/ammo-007-dist/index.html                   0.40 kB │ gzip:   0.27 kB
  …/ammo-007-dist/assets/index-Dc_NjE2T.css   37.23 kB │ gzip:   7.26 kB
  …/ammo-007-dist/assets/index-BZi3vrq8.js   330.40 kB │ gzip: 110.35 kB
  ✓ built in 1.82s
  ```

## Notes
**Functions that now exist twice** (for 008: make the old one call the new):
- `pickMonster` (`src/plan/planner/pick.ts:24`) and `trainingMonsterFor` (`src/state/queue.ts:662`): safe win against win, reach from the character, the 1.25 bonus.
- `pickNode` (`pick.ts:46`) and `trainingResourceFor` (`src/plan/hive/skills.ts:50`): XP per hour against the highest node.
- `nearestSpot` and `travel` (`reach.ts:62`, `:49`) and `nearest` / `nearestBank` (`src/state/loopkit.ts`).
- `fightRec` (`reach.ts:115`) and `forecastVs` (`src/state/queue.ts:644`): keyed on the bank's gear signature against the bank reference.
- `gatherXp` and `craftXpOf` (`src/plan/planner/xp.ts`) restate `scripts/atlas/econ.mts:120-132`, which `src/` cannot import.
- `craftsPerLevel` takes the atlas's training recipe; the running `train` item picks its own with `trainRecipe` (`src/state/queue.ts:759`).

**What 008 needs that the core does not have**
- `interrupt()` and its classes, the `claim` item, the six guards, and turning a paused or stalled `pl:` item into `blocked` (the core only reads `blocked`).
- Measured samples go in through `sample()`, but nothing produces them yet.
- `PlannerState.outlook` in B.1 is a flat step list; `outlook()` returns `{ next per character, expected, completed, notes }`. 008 picks one shape.
- A step whose single unit is many hours (diamonds) needs a "source chunk" step that only gathers into the bank, plus the forward model depositing gathered materials, if the 71-hour step is not acceptable.
- The gear pool is bank + own: two fighters may plan with the same single copy of a piece. `reserved()` counts the gear sets, but `pickMonster` does not subtract them; doing so would cost a fight solve per bank state.

**Defects noticed and not touched**
1. **Alchemy 12–19 has no way to level.** Sunflowers give no XP there, nettle needs 20, and `train` does not craft alchemy (`src/state/store.ts:13-18`). The design's I.3 assumed it could. This blocks alchemist, intermediate_alchemist and expert_alchemist (4 points).
2. Pigs are a safe win only with First's own mushstaff, which is not in the bank. Every other fighter's best pig set wins but is not safe. The gear by need of task 010 starts here.
3. `docs/design/snapshot/status.json` is 13:34 UTC; the task names 14:28, the time of the leaderboard read. I used 13:34.
4. `events.json` is not loaded by `loadCatalog` (`src/catalog/index.ts:37-49`). The core takes event codes from the atlas's `events` (`src/catalog/atlas.ts:83`).

**Guesses in the numbers, most doubtful first**
1. Combat hours to a gate are the atlas's plus set (`path[].t[1]`), far below what bank gear gives. That is why First chases combat 32.
2. The bundle level of a kill is the atlas's safe level (`targets.ts:37`). The simulator decides reach.
3. The 1.5× actions for a rare drop or rare gather that a craft or buy sources (`decide.ts:78`).
4. The log factors: × 1.3 on kills, × 1.05 on gathers.
5. Offerings: 10 a day at 20 minutes.
6. 1.95 h a task; the task-loop takes the monsters master.
7. `craftK` 0.1 and 60 h above 40. These do not matter in stage 1, see the replay.

## To delete (Alex)
Nothing.
