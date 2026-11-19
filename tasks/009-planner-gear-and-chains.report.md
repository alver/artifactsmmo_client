# 009 — The planner's core, second round: gear by need, supply through the bank, honest gates — report

## Summary
- **Deadline points: row A (default) 56 · row B 56 · row C 56 · row D ("a win is enough") 59** — against 54 in all three rows of report 007. The first week goes 15 → 33 (007: 31).
- The core now makes gear by need (67 pieces in row A, all in the first eight days), works materials through the bank (`src:`, `mat:` incl. item-currency trades, `gear:` steps), prices a combat gate by the character's own XP monster, levels alchemy 12–19 by brewing, pins every role, keeps worn pieces out of the others' pool and wears, banks and crafts in the forward model. Every invariant (16) holds on all 28,507 decisions of the four rows; all 15 made-up cases pass; `npm run check` is 50 checks, all ok but `repeat-spin`.
- **What stops the fleet now:** every fighter reaches combat 38 by about day 33 and stops there — only the owlbear is a win at 38 (not a safe one), nothing craftable flips anything above it, and the pieces that would are behind tasks-coin crystals, event materials or a boss. From then on 47% of all hours are the fallback gather. The next walls are events (35 points), the island and other layers (67), and the gear above 38.
- The three crafting prices give the same 56: no gear piece needed a crafting level (the crafters' 20–21 covered every piece asked for), so "spine or greedy" still does not show through crafting. Combat does behave as a spine (21% of all hours). "Safe" costs about 3 points (row D: The Reaper and combat 40), as an upper bound.
- Budgets: one `decide` cold 1.4 s, after a reset 0.28 s, warm 14 ms (all met); the four rows 344 s wall (met, run in parallel); **the first week inside `npm run check` takes about 110 s, not 40 s** — the solver, because pools change at nearly every decision (see "Budget").

## Decisions for Alex
None. The rejected candidates (tasks-coin crystals, event and boss materials) do not change the result by the replay: row A with half of the 526 tasks coins turned into crystals up front (32 jasper, 21 astralyte; a scratch run) ends at the same 56, on the same days. So the spending question does not have to be asked now. Two things that are not decisions but that Alex should know:
- **Since 11-19 all five characters are the planner's (`docs/rework.md` decision 24). A restart after this commit brings gear and supply chains live for all five at once.** Nothing in this task needs a restart.
- The planning chat's new decision 24 in `docs/rework.md` was uncommitted when this task ended; it is committed on its own as `Rework notes`, right before this task's commit (see "What was done").

## How Alex verifies
1. `git log --oneline -3` → `009: planner core, second round`, then `Rework notes` (decision 24), then `Rework notes` (the file as it was when the task started); `git status` clean.
2. `npm run check` → `50 checks: 49 ok, 1 known defect reproduced, 0 failed`; `check-planner` takes about 2 minutes and ends `OK (… invariant checks, 15 made-up cases)`; `planner-supply-step` is among the ok ones.
3. `npm run check -- planner` → about 6 minutes; ends `OK (358258 invariant checks, 15 made-up cases; deadline points 56 / 56 / 56 / 59)` and prints roles, unhandled objectives, the first steps, Fifth alone, the first week, alchemy, node against recipe, the made-up worlds, the four replay sections and the two "safe" tables.
4. `npm run typecheck` prints nothing after `tsc --noEmit`; the scratch build succeeded (see "Commands run").
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git diff HEAD~1 --stat -- src/state` → `src/state/planner.ts | 8 +++++---`; `src/state/queue.ts` untouched.
7. `git show --stat HEAD` → `src/plan/planner/*` (four new files: `bundle.ts`, `gates.ts`, `gear.ts`, `supply.ts`), `src/state/planner.ts`, `scripts/check-planner.mts`, `scripts/scenarios/planner-supply-step.mts`, `scripts/check.mts` (one line, explained below), `CLAUDE.md`, this task file and this report.

I ran 2–6 myself (2 and 3 on the final code); 1 and 7 after the commits.

## What the planner would do now
**All five on** (as in real play since decision 24), on the 2026-11-18 snapshot:

| | first step | why |
|---|---|---|
| First | Tanner's Exchange: 24 cows, 3 cowhide, the tailor | 2 points for 0.4 h (score 7.4) |
| Second | `src:birch_wood`, 163 gathers | for a battlestaff (5 fighters × highwaymen): Highway Patrol's 2 points over its chain of about 10 h (0.19) beat the patrol itself (0.16) |
| Third | `src:blue_slimeball`, 197 kills | the same battlestaffs |
| Fourth | `gear:air_ring` ×2 (of 8) | the jewelrycrafter makes rings for four fighters' highwaymen sets |
| Fifth | Highway Patrol, 49 highwaymen | the objective itself |

**The first week, 15 → 33** (007: 15 → 31): Tanner's Exchange (day 0), Highway Patrol (0.3), Intermediate Miner (0.7), I want bacon! (1.2), A Helping Hand (1.5), Adept (1.7), Intermediate Lumberjack (3.2), Alchemist (5.2), Intermediate Alchemist (5.7), Worker (6.0), Expert Miner (6.7), Cabinet Maker (6.8). On day 7 every fighter is at combat 24–25; Third's alchemy is 32 (it was stuck at 17 in 007); 32 gear steps ran. What changed and why:
- **Gear on day 0.** Battlestaffs, iron boots and shields, hard-leather helmets, air and steel rings, skeleton and mushmush pieces: highwaymen, pigs and skeletons become safe wins or faster ones, so Highway Patrol ends on day 0.3 (007: day 0) with The Reaper's skeletons and I want bacon! right behind.
- **Alchemy levels** (section 5): earth boost potions at 17–19, then nettle.
- **Combat climbs past 25** because the road to `grand_master` (50) is walked to its wall (section 2).
- **No fighter chases an unreachable gate**: First's 96 hours of pigs toward 32 are gone (combat is priced by its own monsters).

**Fifth alone on** (`DEFAULTS.on`, section 7): Tanner's Exchange (0.6 h), then Highway Patrol 47, 47, 43 — the same as report 008. Nothing chain-related is offered because every piece's crafter (Second, Third, Fourth) is off; the only supply open to Fifth is the diamond stones of Diamond in the Sky, which scores far below the patrol.

## The replay
From the snapshot to 2027-02-24, all five on, every invariant on every decision; the four rows ran as four child processes (`scripts/check-planner.mts`, section 6).

| row | `craftK` | `risk` | day 7 | day 14 | day 30 | day 60 | deadline | decisions | time |
|---|---|---|---|---|---|---|---|---|---|
| A (default) | 0.1 | safe | 33 | 44 | 45 | 55 | **56** | 7,384 | 223 s |
| B | 0.25 | safe | 33 | 44 | 45 | 55 | **56** | 7,083 | 225 s |
| C | 1 | safe | 33 | 44 | 45 | 55 | **56** | 5,765 | 216 s |
| D | 0.1 | win | 34 | 45 | 48 | 58 | **59** | 7,382 | 223 s |

**The day each achievement completes** (row A; B and C differ only in Ecologist: 34.6 / 36.4 / 56.7):
tanners_exchange 0.0, highway_patrol 0.3, intermediate_miner 0.7, i_want_bacon 1.2, a_helping_hand 1.5, adept 1.7, intermediate_lumberjack 3.2, alchemist 5.2, intermediate_alchemist 5.7, worker 6.0, expert_miner 6.7, cabinet_maker 6.8, expert_lumberjack 7.5, arachnophobia_conquered 7.7, intermediate_fisherman 10.4, expert_alchemist 11.5, expert_fisherman 13.3, professional_miner 13.6, diamond_in_the_sky 13.6, professional_lumberjack 13.6, professional_fisherman 19.2, ecologist 34.6, a_favored_champion 46.5, tasks_coins_fan 46.9, pearl_fisher 65.9.
Row D adds **the_reaper on day 4.7** (vampires and death knights are wins, not safe ones) and has arachnophobia on day 4.6.

**Share of character-hours by answer:**

| row | objective | level: combat / woodcutting / mining / fishing / alchemy / gearcrafting | supply `src:` / `mat:` / `gear:` | filler | fallback |
|---|---|---|---|---|---|
| A | 7.2% | 21.2 / 2.8 / 1.4 / 0.7 / 0.6 / 0 | 1.4 / 0.0 / 0.0 | 17.3% | 47.4% |
| B | 7.2% | 21.2 / 2.8 / 1.4 / 0.7 / 0.6 / 0 | 1.4 / 0.0 / 0.0 | 21.3% | 43.5% |
| C | 7.1% | 21.0 / 2.7 / 1.4 / 0.7 / 0.5 / 0 | 1.4 / 0.0 / 0.0 | 39.3% | 25.9% |
| D | 7.3% | 30.7 / 2.0 / 2.2 / 0.7 / 0.6 / 0.1 | 1.5 / 0.0 / 0.0 | 17.3% | 37.8% |

(`mat:` and `gear:` steps are crafts and trades, five seconds a run in the model: hundreds of steps, a fraction of a percent of the hours.)

**Levels at the deadline** (row A; B and C the same):

| character | combat | mining | woodcutting | fishing | alchemy | weapon / gear / jewelry | cooking |
|---|---|---|---|---|---|---|---|
| First | 38 | 24 | 32 | 50 | 18 | 3 / 2 / 1 | 26 |
| Second | 38 | 22 | 50 | 19 | 16 | **31** / 2 / 1 | 23 |
| Third | 38 | 23 | 18 | 18 | 50 | 2 / **36** / 1 | 22 |
| Fourth | 38 | 33 | 50 | 17 | 17 | 2 / 2 / **41** | 21 |
| Fifth | 38 | 50 | 18 | 19 | 16 | 2 / 2 / 1 | 21 |

Row D: everyone at combat 40 (Fifth from day 41.5, Third from day 78.0).

**Per fighter, the day it reaches combat 25 / 30 / 35 / 40, and what it waits for at the end** (row A): First 4.4 / 22.9 / 31.0 / —; Second 1.7 / 16.8 / 24.9 / —; Third 6.5 / 14.8 / 22.8 / —; Fourth 7.6 / 17.5 / 26.0 / —; Fifth 3.6 / 17.0 / 25.2 / —. All five end waiting for **gear: no safe XP monster on the way to 50** (the wall is at 38–39). Row D: 40 on days 50.6 / 59.8 / 78.0 / 68.9 / 41.5, then the same wait.

**Every piece made** (row A, 67; the check prints each with its days; condensed here by piece):

| piece | copies | for | for which work | in the bank (day) | worn within the run | chain: supply h (crafts and crafter's levels were 0 for every piece) |
|---|---|---|---|---|---|---|
| air_ring | 3 | First, Fourth | combat to 25 | 0.0–0.7 | 3/3 | 1.1–1.2 |
| iron_boots | 3 | First, Fifth | combat to 25 | 0.1 | 3/3 | 1.2 |
| battlestaff | 5 | First, Second, Fourth, Fifth | Highway Patrol; combat to 25 | 0.1–7.5 | 5/5 | 1.0–1.2 |
| hard_leather_helmet | 4 | First, Third, Fourth | combat; Highway Patrol | 0.2–0.3 | 4/4 | 0.0–2.3 |
| skeleton_pants | 4 | First, Third | combat to 25 | 0.3–0.8 | 4/4 | 2.4–7.5 |
| iron_shield | 2 | First, Third | combat to 25 | 0.3 | 2/2 | 1.2 |
| steel_ring | 7 | First, Second | combat to 25 | 0.4–6.1 | 7/7 | 2.9–3.0 |
| mushmush_jacket | 3 | First, Third, Fourth | combat | 0.6–0.9 | 3/3 | 2.5–5.9 |
| skeleton_helmet | 3 | First, Third, Fourth | The Reaper (skeletons) | 0.6 | 2/3 | 3.8–7.2 |
| hard_leather_boots | 2 | First, Fourth | The Reaper | 0.6–0.8 | 2/2 | 3.8–5.3 |
| hard_leather_pants | 2 | First, Second | The Reaper; combat | 0.6 | 2/2 | 0.8–7.2 |
| skeleton_armor | 2 | First, Fourth | The Reaper | 0.7–1.2 | 2/2 | 4.0–7.2 |
| tromatising_mask | 1 | First | combat | 0.8 | 1/1 | 7.5 |
| skull_staff | 5 | all five | I want bacon!; combat | 0.8–1.1 | 5/5 | 2.4–7.5 |
| steel_battleaxe | 2 | First, Second | The Reaper; combat | 2.7 | 2/2 | 0.8–7.2 |
| magic_wizard_hat | 5 | all five | Arachnophobia Conquered (spiders) | 5.7 | 5/5 | 1.0–2.5 |
| steel_boots | 5 | all five | Arachnophobia Conquered | 5.7 | 5/5 | 1.1–2.5 |
| snakeskin_boots | 4 | Third, Fourth | Arachnophobia Conquered | 5.8–7.6 | 4/4 | 2.8 |
| steel_armor | 5 | all five | Arachnophobia Conquered | 6.1 | 5/5 | 1.7–2.8 |

The "day asked" is 0.0–0.3 for everything but the spider set (2.6–5.7). 23 copies were not worn by their character within a day of reaching the bank; the check prints each with its reason (invariant 16): mostly "worn after more than a day" (the fighter's next fight step came later), several "worn by Third" or another fighter first (see "silly things"), one skeleton helmet never in Fourth's best set.

**Open points at the deadline, by what they wait for** (row A, 56 + 154 = 210): another layer 67 (a_peaceful_island, adamantite_mastery, around_the_world, blood_of_the_cursed, catch_and_cook, clean_the_lab, coin_collector, elementary_book, heartbound, lich_please, life_lover, magic_power, master_alchemist, master_fisherman, master_lumberjack, master_miner, palm_paradise, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, shining_secrets, take_her_down) · an event 35 (closing_the_gate, corruption_eradicator, cult_destroyer, draconic_harvest, its_malefic, magic_harvester, magic_lumberjack, secure_the_island, strange_miner, the_new_bandit, the_worm_turns, turning_treasures_to_gold) · gear, no safe win within ten levels, 15 (cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar, the_reaper) · use 10 · unhandled 10 (crafted_with_honor, ultimate_rune, welcome_to_hell) · a raid 8 · filler not reached 6 (making_a_nether_portal, the_planet_thanks_you) · a group 3 (slimed_to_none).

**Row D: 1,138 hours fought on wins that are not safe.**

### Safe: a wall or a price
On the snapshot (from the pool each fighter has; XP per hour at the fighter's level; the full list is in the check's output):

| fighter | safe XP monsters | wins that are not safe — how the pessimistic pass ends | section 4 |
|---|---|---|---|
| First (20) | flying snake 607 XP/h, highwayman 684, wolf 749, pig 874 | skeleton (18): 191 s a kill, 697 XP/h; dies on turn 17, the skeleton at 208 HP | nothing craftable flips it on the snapshot's pool |
| Second (22) | highwayman 622, wolf 484 | skeleton: dies on turn 17 at 208; pig (19): 195 s, 663 XP/h, dies on turn 25, the pig at 132 HP | nothing |
| Third (20) | flying snake, highwayman 653, wolf 507 | skeleton as above; pig: dies on turn 23, the pig at 161 HP | nothing |
| Fourth (21), Fifth (20) | flying snake, highwayman, wolf | skeleton; pig: dies on turn 25 at 132 | nothing |

Everything from the ogre and the spider (20) up to the owlbear (30) is not even a win on the snapshot. Where row A leaves them (all at 38, 585–680 HP), every fighter's table is the same: **owlbear (30) is the only win — 540 s a kill, 347 XP/h, the pessimistic pass dies on turn 15 with the owlbear at 995 HP — and goblin, cultist acolyte, cursed tree (33–34), goblin guard (35), orc and bat (38), goblin wolfrider and hellhound (40) do not win at all; nothing craftable flips any of them.**

### What it says
- **Spine or greedy.** Combat behaves as a spine: 21% of all hours (31% in row D) go to levelling combat toward `grand_master`, from about day 8 to day 33, ahead of the filler — rule 4 puts filler after anything that scores, and the road to 50 always scores a little. Crafting does not: **no crafting level was taken as a level step in rows A–C** (row D: 3 steps, 11 h, gearcrafting toward 25) and B and C equal A to the day except for the filler. Every piece the needs asked for was within the crafters' snapshot levels (weaponcrafting 20, gearcrafting 21, jewelrycrafting 20); the crafting levels at the deadline (31 / 36 / 41) come from the recycling filler. Pieces above those levels were never asked for because nothing above 38 is flipped by craftable gear at all. So the open question "what may gear crafting cost" is still not exercised by the replay.
- **What stops combat now, per fighter:** all five, at 38–39: no safe XP monster on the way, the owlbear is a win but not safe, nothing above it wins, and no candidate piece flips one. The candidates that are not offered at 28–38 need tasks-coin crystals (jasper 8 coins, astralyte 12), event materials (Lizard Skin and Lizard Eye from the bandit camp, the Full Moon Vampire Cape, Demon Horn), or King Slimeballs (a boss). Turning coins into crystals up front does not change it (56, see "Decisions for Alex").
- **What "safe" costs:** 3 points (row D 59 against 56: The Reaper, plus combat 40 a few weeks later), bought with 1,138 hours of fights the pessimistic pass loses. It is an upper bound: the model has no losses (a lost fight costs a walk from (0, 0) and the fight's time), and the evening of 11-18 had two real skeleton losses in a row (decision 24) on exactly a "win, not safe" monster of the table. By this replay "safe" is a wall worth a few points, not the wall that stops the fleet — the gear above 38 is.
- **The first wall after gear:** events (35 points) and layers (67), then the group (3), with everything behind combat 40+ needing gear that only events, bosses or tasks coins give. From day 33 nothing in reach scores; 47% of all hours are the fallback gather.
- **The silly things it did:**
  1. **A piece made for one fighter is worn by another first.** Every made piece is in every fighter's pool; whoever starts a fight step first takes it (the spider hats made for four fighters were all worn by Third first, then copies followed). Converges, but makes extra copies and late wears (23 prints of invariant 16).
  2. **Five copies for a shared objective.** Each fighter's need for Highway Patrol counts the whole objective as if it fought it alone, so five battlestaffs are made for 401 highwaymen (a point counted five times, see section 4 below).
  3. **Combat to the wall for 3 points.** Levelling all five to 38 for `grand_master` (1,500 h to 50 at the pace before the wall) takes 21% of the season's hours; the filler (Tasks Coins Fan, +5) completes on day 47 instead of day 25–31 in 007.
  4. **Many tiny supply steps**: a `mat:` craft of one to ten bars or planks is five seconds of crafting behind a bank reset, and a chain gives several in a row (First on day 0.3: plank, birch ×6, plank, coal ×7, bar). In real play each is about a minute; seven step starts in ten minutes would trip the brake (report 008). Not seen in the model, which has no reset time.
  5. **47% fallback from day 33**, every gathering lane at 50 and nothing in reach — the same shape as 007, three weeks later.

## What was done / files
All core changes in `src/plan/planner/`, pure.

**1. Roles hold still**
- `DEFAULTS.roles` pins every role (`config.ts:27-33`): First cooking + fishing, mining, woodcutting (5 lanes); Second weaponcrafting + woodcutting (3); Third gearcrafting + alchemy (3); Fourth jewelrycrafting + mining, woodcutting (4); Fifth mining (2). The extra miner (First) and woodcutters (Fourth, First) were chosen by rolesOf's ranking — level, then fewer lanes, then account order, mining before woodcutting — and the check restates and asserts that choice ("the same").
- `rolesFor(world)` memoises `rolesOf` per World (`roles.ts:21`), `crafterOf(lane, world)` (`roles.ts:28`). The recycling filler trains the character's own gear-crafting role only (`cost.ts:128`): First and Fifth have none.
- The check asserts the roles at every decision (invariant 11).

**2. A level gate priced by what the character can do**
- `levelHoursEstimate(lane, L, world, ch)` (`cost.ts:148`): combat at the character's level = `pickMonster`; above it = `roadRate` (`cost.ts:179`): per monster the first level it wins (planning-grade solve, `firstWin`, `reach.ts:247`, a bisection over ten levels, remembered per character) and the kill seconds solved there; at L the best of those won by then. A measured `level:combat:<L>` still comes first (`hoursToLevel`, `cost.ts:209`). The atlas's `path` is no longer read.
- A kill's level is solved: `winLevel` (`reach.ts:241`); none within ten → it waits for gear (`waitingOf`, `forward.ts:206`: "gear (no safe win within ten levels)").
- A gathering lane keeps the atlas's hours and is ∞ where no reachable node gives XP and no recipe does (`cost.ts:162-165`).
- **The wall** (`bundle.ts:108-120`): a gate is walked as far as its road goes. The first level with no XP source ends the level target there; the score counts the rest of the road at the pace of the last level before it; a wall at the character's own level means no candidate. This is my reading for far gates: with the strict reading (∞ ⇒ no candidate) `grand_master` at 50 was the only combat gate left after Adept, its road had a wall at 29, and no fighter levelled past 25 or asked for gear at all (a month of the replay showed it).
- The runtime's one call changed: `src/state/planner.ts:181` passes the character.

**3. Supply through the bank** (`supply.ts`)
- `billOf` (`supply.ts:92`) opens a demand: bank stock first (`available`, the vb shared between parents), then the field source (`src:`), else the recipe (`mat:` craft, its inputs demand in turn), else **a trade for an item currency** (`tradeOf`, `supply.ts:57`: hard leather for cowhide, cloth for wool, snakeskin for snake hide — not gold, not tasks coins; a `mat:` step `[withdraw currency, buy, deposit-all]`), else out of reach with its price (`priceOf`, `supply.ts:72`: gold, tasks coins, raid). An event that is not live, a boss, another layer, an achievement-gated tile are out of reach (`gates.ts:31`). The trades are not in the task's list of out-of-reach leaves, so I took them as chains; they unlock most of the hard-leather and steel gear.
- Parents: open craft and buy objectives that cannot source one unit inside their own step (`inStep`, `supply.ts:157`: all field work, ≤ 3 sources, ≤ 2 × `CHUNK_SEC` with nothing in the bank — Tanner's Exchange stays in-step), filler excluded (`objectiveParents`, `supply.ts:167`), and the gear pieces (`decide.ts:218-249`).
- `supplyNeeds` (`supply.ts:187`) gives the short codes, the bank shared from the best parent down, less what the others' current steps of the same key make. In `rank` (`decide.ts:251-275`): `src:` in reach when the character meets the source's gates (units = actions, chunked); `mat:` when it may craft it (gathering skills: anyone with the level; gear crafting and cooking: the role's holder, `mayCraft`, `supply.ts:203`) and the bank feeds a run; a trade when the bank holds the currency. Score: the parent's points × fit ÷ its whole chain, +10% for the last target; `Step.as = "supply"`, `Step.parent`, the why names the code, the parent and its points.
- Reservations: a planned craft's withdrawal is reserved (`Step.withdraw`), a supply step's deposit is not counted before it is in the bank (`stock.ts:21`).
- Compiled (`compile.ts:33-52`): `[gear reset, field item, deposit-all]`, `[gear reset, craft, deposit-all]`, `[withdraw, buy, deposit-all]`.
- **The nine unhandled objectives of report 007, now:**

  | objective | now |
  |---|---|
  | heartbound | a chain: heart amulet ← palm planks ×12 (`mat:`), corrupted stones ×24 (cultist acolytes), goblin eyes ×16 — waits: palm wood and golden dust on another layer, grimlet bone and duskworm skin from events |
  | magic_power | a chain: magic shield ← palm planks ×10, alexandrite — waits: another layer (palm wood, scorpion carapace, fennec ear, alexandrite stone), events (grimlet bone, marauder hand) |
  | potion_brewer (enhanced health potion) | a chain: 100 potions ← glowstem leaves ×100, eggs ×420 (chickens) — waits: magic sap (an event), enchanted mushroom (another layer) |
  | potion_brewer (splash potion) | a chain — waits: torch cactus flower, coconut, lava fish (another layer), magic sap (an event) |
  | crafted_with_honor | still unhandled: its astralyte crystal has no field source (it costs 12 tasks coins at the Tasks Trader; strangold is now a chain) |
  | welcome_to_hell | still unhandled: book_from_hell has no source (mithril bars are now a chain) |
  | king_of_the_sun, queen_of_the_enchanted_forest | raid bosses |
  | ultimate_rune | its currency, the sonnengott coin, comes from a raid |

  `inputsOf` (`targets.ts:88`) makes a material made by another craft an input of kind `craft` instead of a reason to give up.

**4. Gear by need** (`gear.ts`)
- Candidates (`candidatesOf`, `gear.ts:72`): a recipe, equippable now, no rune, artifact, utility or bag, at most ten levels below the character, a crafter, nothing in its bill out of reach, every leaf sourceable by someone who is on. Rejected ones carry their reason (gold / tasks coins with the amount / an event / a boss / no crafter / "nobody that is on sources X yet"). The list does not depend on the pool (a piece the pool holds is simply not new), so the solves keep their key while pieces are made.
- Works: (a) the road to the next combat gate judged on its next ten levels (`gear.ts:183-228`); (b) open kill and drop objectives whose other gates it meets, monster at most ten levels up (`gear.ts:230-245`); (c) per gathering role, the lane's next gate or an open gathering objective — a tool, `H1 = H0 × (1 − cut₁)/(1 − cut₀)` (`gear.ts:247-275`).
- The need: `G + H1 ≤ 0.85 × H0` (`NEED_RATIO`, `config.ts:43`); H0 from the planner's own pricing, H1 from the planning-grade solve with the candidates as `extraCandidates`, never above H0 per level. G = the pieces' bill (supply hours priced by the fleet), 5 s a craft, and the crafter's levels where short (`makeHours`, `gear.ts:105`). The cheapest qualifying set: drop the dearest new piece and solve again while the need holds (`fightNeed`, `gear.ts:142`).
- `gear:<code>`: copies = Σ over characters of the copies their needs name, less the copies in flight; crafted by the role's holder when the bank feeds a run (`decide.ts:225-249`); a crafter short of the recipe's level gets `lvl:<lane>:<level>` with the piece's score (`decide.ts:239-240`). Section 7: a need whose crafter is off is computed but not offered.
- **How a bundle is formed now** (`bundle.ts:87`): per character and lane, the open achievements whose every missing gate — their targets' own and those of every material the bank cannot cover, through the whole bill — is a level of this lane or, for combat, a win solved within ten levels; filler is never in a bundle (it is scored only when nothing else scores; it was dragging the mining bundle to a score of 0.0004 through making_a_nether_portal's hours). The next gate is the lowest such level; the bundle is every achievement up to it; its hours are the road to the gate (to the wall, then the pace before it) plus their own hours; score = Σ points that fit the deadline ÷ that. Gear (a) uses the same bundle with `G + H1` (next ten levels) + the rest of the road in place of the road.
- **Where a point is counted twice:** (1) each fighter's (a) need carries the same bundle — Adept's 2 points pull gear for all five; (2) the crafter's level target and the fighter's own level target can carry the same points at once (by design, "the same number on every link"); (3) (b) counts a shared kill objective whole for every fighter (H0 = all that is left × its own kill time), so five fighters each want pieces for all 401 highwaymen. A supply target takes the best parent, never the sum, so the bank chain itself counts nothing twice.
- Bounds: (a) the current pick and the four highest-XP monsters at most two levels up it does not win now (all of them when it wins none); (b) monsters at most ten levels up and only when even the cheapest piece's G could pay; three candidates a slot by item level; at most three drops (`gear.ts:61`). It can miss a speed-up against another monster than the pick, a flip three levels up, a lower-level piece whose element suits a monster better.
- Restated from the hive (it is deleted in the clean-up, the core does not import it): the candidate filter of `accountCraftableCandidates` (`src/plan/hive/gear.ts:72-98`), the planning-grade solve of `fleetBis` (`src/plan/hive/ctx.ts:105-129`, here `planRec`, `reach.ts:229`, with smaller caps and utility potions in), the drop pass of `proposeGearGoals` (`src/plan/hive/gear.ts:154-178`). `acquire.ts`'s resolver is replaced by `billOf`.

**5. Alchemy by brewing**
- `pickRecipe` (`pick.ts:72`): the recipe of the skill with the best XP per hour the character can feed (bank stock for 100 runs counts as paid, else one-deep field sources it meets); `planLevel` uses it when no node gives XP (`decide.ts:112-136`) as a craft step with sources, today's items.
- **Third at alchemy 17 picks the earth boost potion**: 145 XP a run. With the snapshot's bank 77 s a run, 6,788 XP/h — 0.9 / 1.0 / 1.1 h a level at 17 / 18 / 19 against the atlas's 6.6 / 7.4 / 8.3 h. With an empty bank (made-up world 6) 754 XP/h, gathering 38 yellow slimeballs, 3 sunflowers and 38 algae for five potions.
- **Node against recipe** (XP per hour): First mining 22 coal 2,159 vs steel bars 541; First / Second / Fourth woodcutting 21 birch 2,253–2,281 vs hardwood planks 571–578; Fourth and Fifth mining 24 coal 2,159 vs steel bars 541. Smelting is not the better road at these levels.

**6. The pool; the memo tables**
- `Step.wear` (`types.ts`) is the set the step's job wears (fight: the solve's set; gather: the gather argmax), fixed at the decision (`decide.ts:139-150`, `:295`). `reserved` (`stock.ts:21`) reserves only the pieces of the others' sets that they do not wear or hold yet; `poolBank` (`stock.ts:52`) is the bank less the others' reservations, whole copies of gear only (the model banks fractions of drops). The pool is that plus the character's own (`poolOf`, `reach.ts:119`).
- **Memo keys:** solves are keyed on name, level, base max HP (worn gear's HP taken off, `baseHp`) and monster (and extra pieces); each key keeps up to six results with the pool they were solved on and the pieces their set wears, and a result serves any pool that is a subset of its own and still holds those pieces (`cached`, `reach.ts:148`). The pool is compared only on gear the character can equip at that level, at most two copies of a ring and one of anything else. **Caps:** every table (`fightMemo`, `planMemo`, `cutMemo`, routes, banks, win hints) holds at most `MEMO_CAP` = 20,000 keys; at the cap the oldest tenth by insertion order is dropped (`reach.ts:104-111`). The per-World memos (hours, roads, bundles, needs, bills' prices) go with their World. The targets' static memos are bounded by the catalog.
- What the subset rule can get wrong: a smaller pool is taken never to find a better set (bestInSlot's capped search could, rarely); noted as a shortcut.

**7. The fallback, and who is on**
- `fallback` (`decide.ts:301`) passes over a blocked `fallback:<skill>`; when all are blocked it takes the one whose block ends first.
- `isOn` (`gates.ts:42`): only characters that are on are planned for (needs, fleet prices); gear targets, their supply and the crafter's levels are offered only when the crafter is on (`Need.offered`). Fifth alone: see above.

**8. The forward model** (`forward.ts`)
- `wear` (`forward.ts:37`) at each step start: the step's set leaves the bank, what was worn returns (a step with no set returns everything), stats follow; utility, rune, artifact and bag slots stay. `advance` banks every drop and gather at the expected quantities, consumes a craft's materials and banks the product, a buy's currency and its item (`forward.ts:99-121`). `forward` takes an `onEnd` hook (the check's invariant 15 and gear table). `outlook`'s notes changed: offerings' XP not counted, events not simulated, gear made and worn, things banked.
- **Cost of a full run now: 216–225 s** a run to the deadline (007: 8–14 s). Task 010's outlook must not run it on the service's thread as it is. What I would cut: recompute a fighter's gear needs only when its level, its pool's gear or the set of open kill objectives changed (75% of the time is gear needs and the pricing behind them); stop a run once every character is in fallback with nothing levelling; run it in a worker thread; or the cheapest, an outlook of a few days rather than to the deadline.

**9. The runtime** (`src/state/planner.ts`, 8 lines)
- `measure` reads the units from the step's last item that counts — the compiled items without a `deposit-all` (`:153-155`). With the old line a supply step's last item was the deposit-all, units stayed 0 and the step would have been blocked as "ended empty".
- The brake blocks `r.supply` too (`:118`). `levelHoursEstimate` gets the character (`:181`).
- **`planner-supply-step`** (new): Pia, an open crafting objective (a copper dagger, whose bars are another craft), an empty bank; the first step is `src:copper_ore` (60 gathers, bank reset, deposit-all), the ore is in the bank when the next step (`mat:copper_bar`) is decided, `sample gather:copper_rocks 31 s (estimate 32 s)`, no block. The harness needed nothing new. The twelve `planner-*` scenarios are unchanged and green.

**10. The check** (`scripts/check-planner.mts`)
- Invariants 11–16 (`verify`, `ended`, `wornCheck`). Invariant 3 now re-simulates the set the planner plans with (both passes, every piece owned or banked) instead of re-solving with `ownedFightRec`: with gear moving at every step the re-solve was a full solve a decision. Invariant 13 allows one `train` level whatever its units (the recycling filler's units are the items it recycles, 3–5 h a level).
- The made-up worlds (all pass): 1 no safe XP monster, an iron sword flips the blue slimes: Second hunts the feathers, Fifth mines the ore and smelts the bars, Second crafts, and with the sword in the bank Fifth's pick wears it; 2 weaponcrafting 8 for a level-10 sword: Second's first step is `lvl:weaponcrafting:10` "for gear: Iron Sword ×1 for Fifth"; 3 one iron sword and two identical fighters: nobody asks while it is free; once Fifth wears it, Fourth's pick and sets lack it and it asks for its own (it asks for a better set, battlestaff + shield + hat + boots, not a second sword — its cheapest qualifying set); 4 three iron swords two crafts deep: `src:iron_ore`@Fifth → `mat:iron_bar`@Fifth → `src:feather`@Second → the objective @Second, done on day 0.1; 5 an iron pickaxe for Fifth (the bank holds the jasper crystal) is asked for with 5,000 coal open (H0 58 h, H1 46 h, G 1 h) and not with 100; 6 alchemy 17, empty bank: the brewing step; 7 everything blocked → the fallback; its skill blocked → the next skill; 8 Second off: the need is there, not offered, Fifth falls back. Plus 007's lich and Strange Apparition worlds.
- The replay runs the four rows as child processes (`AMMO_PLANNER_ROW`), merges their invariant counts, prints the two "safe" tables.
- `scripts/check.mts` (one line, not in the task's list): the runner's real-time backstop was 110 s and killed a check that runs longer; it is now 5 minutes for the whole suite and 30 minutes for one named check. The first week alone takes about 110 s.

**Budget**
| | budget | measured | |
|---|---|---|---|
| planner check inside `npm run check` (the first week) | 40 s | 108–116 s | **missed** |
| `npm run check -- planner` (four rows) | 10 min | 344 s wall; 216–225 s a row; about 2,650 full and 15,000–16,800 planning-grade solves cached per row at the end | met |
| one `decide`, all five on, cold | 5 s | 1.4 s | met |
| …after a reset moved gear | 1 s | 0.28 s | met |
| …warm | 20 ms | 13.6 ms | met |

What dominates the first week: the gear solver (`bestInSlot`, about 90% of the CPU): pricing the road level by level (`pickMonster`, `roadRate`, `firstWin`, about 45%), the gear needs' solves with the candidates forced in (about 20%) and the kill gates (`winLevel`, `met`, about 20%). They miss because a fighter's pool changes at almost every decision (single-copy pieces move between fighters as sets are worn — section 6 as specified), because levels change, and because 32 pieces are made in the first week. What I did against it without planning less: planning-grade solves for prices (3 a slot), a cheaper full solve (6 a slot; the brewed potions made the pair search the dearest part), the subset-aware caches, remembered first-win levels, a candidate list independent of the pool, fleet prices from the strongest winner.

**Commands run**
- `git add docs/rework.md; git commit -m "Rework notes"` (first); at the end the same for decision 24, then the task commit.
- `npm run typecheck` / `npx tsc --noEmit` (many times); `npm run check` (all, several times; final: 50 checks, 49 ok, `repeat-spin` known); `npm run check -- planner` (final: OK, 56 / 56 / 56 / 59); `npm run check -- planner-supply-step`; the check script directly with the scratch storage flags.
- Scratch probes under the session scratch directory (all deleted): snapshot facts, alchemy recipes, the first decisions and their timing, a forward day / week / month with CPU profiles (`node --cpu-prof`) and miss counts, the made-up worlds' prototypes, the wall at 29, the coins-spent variant of row A.
- `npx vite build --outDir <scratch>/ammo-009-dist --emptyOutDir`, then deleted:
  ```
  …/ammo-009-dist/index.html                   0.40 kB │ gzip:   0.27 kB
  …/ammo-009-dist/assets/index-Dc_NjE2T.css   37.23 kB │ gzip:   7.26 kB
  …/ammo-009-dist/assets/index-C0gKbEAx.js   389.30 kB │ gzip: 131.31 kB
  ✓ built in 1.59s
  ```
  The bundle grew from 330 kB (007) because `src/state/planner.ts` brings the core into the UI bundle (since 008) and the core is larger now.
- A PowerShell one-liner of mine re-encoded `scripts/check-planner.mts` once (UTF-8 read as ANSI); repaired by reversing the decoding, verified by grep; no other file was touched that way.

## Notes
**What 010 (the Roadmap, the outlook, all five already on) will meet**
- The outlook costs 3–4 minutes a run now (section 8).
- `world.current` holds only the owned characters' steps — with all five on, that is everyone; the reservations and `Step.wear` work as designed. Steps persisted by 008 have no `wear`: they reserve no gear until they end.
- The brake and tiny supply steps (silly thing 4).
- A made piece is visible to every fighter (silly thing 1); a reservation of a made piece for its fighter until its next reset would stop it, and is not in the spec.
- Potions: the fight solves use the bank's potion stacks as if they never ran out; in the model the alchemy level steps brew boost and health potions and they keep fights at 29–38 safe. In real play `provisionPotions` brews when a stack drains — a real cost the model does not charge.

**What still cannot be compiled to today's items:** nothing this task needed. A `mat:` step that also gathers its own field inputs (one step instead of `src:` + `mat:`) would be today's items too, and would remove most tiny steps; not built.

**Defects noticed and not touched**
- `waitingOf` lists crafted_with_honor as "unhandled" with "no field source"; the honest reason is tasks coins (12 for its astralyte crystal) — `inputsOf` gives up on a material sold only for coins before the bill could price it.
- The check's gear table attributes copies by the needs at the decision; a few copies show the step's `for` when the needs moved in between (e.g. "iron_boots for First" twice).
- `fleetSec` prices a kill by the highest-level character that wins it, not the quickest (a shortcut, marked).
- `firstWin` and `winLevel` take a win to hold at every higher level (marked); `roadRate` ignores monsters above the road's top level (marked).
- From earlier, still open: report 008's notes (offerings after a 598, the two string couplings).

**What is random in a fight as `simulate` models it** (`src/sim/combat.ts`): in the expected mode (what the planner uses) nothing — critical strikes are folded into an expected hit; the pessimistic pass is "the player never crits, the monster always crits". With `rng` (`src/sim/monte.ts`): each attack's critical strike, the protective bubble's element each turn, frenzy after a crit, lifesteal on a crit; turn order (initiative, 0 for the player — report 002's open item), damage and DoTs are deterministic. **A loss probability** would be `monteCarlo` on the solved set: about 2 µs a fight, so 1,000 fights are about 2 ms — affordable once per (character, monster, pool) after a solve, not inside the search (thousands of sets a solve). That is the cheapest way to turn "safe" into a price.

**Guesses in the numbers, most doubtful first**
1. The wall reading of section 2 (the level target stops at the first level with no XP source; the rest priced at the last pace) — it decides how much time goes to combat for `grand_master`.
2. Potions as an inexhaustible stock in the model (above).
3. `NEED_RATIO` 0.85 and the horizon of ten levels for (a); (b) counting a shared objective whole for each fighter.
4. The planning-grade solve (3 a slot) and the full one (6 a slot) — chosen for time; the verdicts matched the 12 / 10 solve on the probe set.
5. A craft at 5 s a run and a trade at 5 s a bagful; no bank-reset time per step.
6. Item-currency trades taken as chains (not spending).
7. The coins-spent variant (half the coins in crystals up front) as the measure of what spending is worth.
8. From 007, unchanged: the log factors 1.3 and 1.05, offerings at 10 a day, 1.95 h a task, `craftK` 0.1 and 60 h above 40 (none of it moved the result).

## To delete (Alex)
Nothing.
