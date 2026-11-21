# 016 — The journal: what the planner decided and what each step did, in files the planning chat can read — report

## Summary
- **The hours since 00:57 UTC on 11-21.** The fleet gathered: 82–97% of every character's time to 08:49:13 went to gathering under report 014's code (mining 35 for three miners, the lumberjack objective, the potion's nettle and the food's trout). One restart: `[lxra]` at 08:49:13.136 loaded report 015's code (`e66621e`); there was none during this work, so the service still runs 015's code and none of this task's.
- **Report 015 holds in play.** The tidy ran from the first crafter's step end: six tidy steps, Fourth from 09:13:29 and Second from 09:26:39, 14 codes and 99 copies recycled in 1,002 s, the free slots 4 → 15 by 09:36:01. No 462, no expansion, no sale since the restart. The 355 sap sold at 08:12–08:17 was 014's merchant order, 36 minutes before 015's rule went live.
- **What is written from the restart on.**
  - The raw log goes into hourly files, `logs/raw/<day>/<HH>.log`: about 0.9 MB an hour, 21 MB a day.
  - The journal goes into `logs/journal/<day>.jsonl`. A made-up day at this pace is about 385 records and **134 kB**.
  - `logs/status.json` (5–6 kB) is rewritten every minute and at every step and end.
  - `logs/world/<day>.json` (about 50 kB) is written once a day.
  - `npm run journal` prints the tables.
- **Deadline points**: A **86** / B **94** / C **73** / E **68**, against 86 / 90 / 78 / 68. B and C moved because of settled point 10: `planMake`'s whole runs are this task's only change in the core that a replay runs.
- **Settled point 10.** `planMake` sourced an ingredient per product, not per run, and bit a third time at 02:33:24, `ach:alchemist:2@Third` (95 units, 94 nettle gathered for 48 runs). It now plans in whole runs: 121 of a two-a-run recipe withdraw 122.
- **Settled point 11.** After a 462 the bank is read once (at most one read in ten minutes).
- **Settled point 12: yes, the two can disagree**, in more than a 6-hour block. The verdicts without a name use other bills, gear pieces and solves than a character's own. A tidy step also needs every copy unreserved and its character's own right to recycle. So `bankCheck` now asks `tidyLeft`: whether somebody that is on has a tidy step. On the bank of 11-20 the verdicts by name and without a name agree for all 22 outdated codes.

## Decisions for Alex
None.

## How Alex verifies
1. **The branch and the commits.**
   - `git branch --show-current` → `rework`.
   - `git log --oneline -3` → `016: journal`, then `Rework notes` (`f3ce840`), then `015: bank` (`e66621e`).
   - `git status` clean.
   - `git log origin/rework --oneline -1` → the same commit as `016: journal`.
   - `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → `80 checks: 79 ok, 1 known defect reproduced, 0 failed`, about 2 minutes.
   - That is report 015's 74 plus the 6 new scenarios: `bank-462-read`, `journal-block`, `journal-files`, `journal-interrupt`, `journal-restart`, `journal-step`.
   - `logs/` holds only `dev.log` afterwards (checked: the harness's files are a Map).
3. `npm run check -- planner` → `OK (545737 invariant checks, 88 made-up cases; deadline points 86 / 94 / 73 / 68)` for rows A / B / C / E, in **1,637.7 s** of the 2,700 s backstop (row A, the long pole, about 1,630 s). It prints the three new sections: `## Task 016: the day's snapshot`, `## Task 016: a craft step in whole runs (settled point 10)`, `## Task 016: "something is left to tidy" (settled point 12)`. Rows B and C moved: B 90 → 94, C 78 → 73.
   - **Which change did it.** `git diff e66621e -- src/plan/planner` holds two changes: `planMake`'s whole runs (`decide.ts`) and `tidyLeft` (`bank.ts`). `tidyLeft` is called only by the runtime's `bankCheck`, and the forward model has no bank slots. The row children run nothing else: they exit at `scripts/check-planner.mts:494-500`, before section 5g. So settled point 10 moved them. The greedy's path was not decomposed further.
   - **Task 015's case** that pinned row C at 78 now pins 73 (`check-planner.mts:1636-1638`). It is the one line of the case list changed.
4. `npm run typecheck` prints nothing after `tsc --noEmit`. The scratch build succeeded: `npx vite build --outDir <scratch>/ammo-016-dist --emptyOutDir` gave `index-CFo47sR1.js 457.05 kB │ gzip: 155.11 kB` (446.15 kB in 015; `src/lib/journal.ts` rides into the bundle with `actions.ts`). The scratch folder is deleted.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only the files of "What was done / files", all on the list of the rules. Untouched although allowed: `src/state/exec.ts`, `src/state/store.ts`, `scripts/check.mts`, `scripts/harness/fake.mts`, `docs/game-actions.md`.
7. `npm run journal -- --file scripts/fixtures/journal-2026-01-15.jsonl --from 2026-01-15T00:00Z` prints the tables of section 3 below.
8. **After the restart (not checked by me; the restart is Alex's):**
   - `logs/journal/<today>.jsonl` starts with a `boot` record whose `commit` is the `016: journal` hash. Its `chars` names the five steps re-attached.
   - `logs/status.json` is under a minute old and names all five steps (`chars.<name>.step.key`).
   - `logs/raw/<today>/<hour>.log` grows; `logs/dev.log` keeps its size (66.98 MB at 09:42 UTC).
   - `logs/world/<today>.json` exists, written after the first achievements read.
   - `npm run journal` prints the hours since the boot.
   - No tidy step is due right after it: 15 slots are free since 09:36:01 (section 1). A tidy comes back only below 15 free.

## The hours, and 015 in play
**How it was read.** `logs/dev.log` was streamed from a byte offset by scratch readers: a background agent wrote them, and I re-ran them to the log's end before this report and re-read the lines quoted here. They use report 015's reading and caps, for the last time.
- **Window**: 2026-11-21 00:57:55 to **09:46:33.703 UTC** (the log's last line at the final read).
- **The code**: to 08:48:52 it is report 014's (`edaaf23`, `[tdhi]`); from 08:49:13 report 015's (`e66621e`, `[lxra]`).
- **The 160-character cut** of an `api` line still hides a long reset's last codes.

**One restart.**
- `[tdhi]` wrote its last line at 08:48:52.584; `[lxra] server start (prod)` came at 08:49:13.136.
- At 08:49:14 it re-attached `lvl:mining:35@First#5`, `ach:intermediate_lumberjack:0@Second#4`, `src:nettle_leaf@Third#5`, `lvl:mining:35@Fourth#5` and `lvl:mining:35@Fifth#4`.
- The first two gathers met the old cooldown (499 ×2, 08:49:14).
- There was no restart since, and none during this work: the service runs 015's code and none of this task's.

### Steps per character
Units planned / done; hours planned / taken. Brackets: the step started before the window. *Running* at 09:46.

| who | steps |
|---|---|
| First | [00:47:11 `ach:the_reaper:1@First#1` 11/11, 0.2/0.25] · 01:02:24 `ach:the_reaper:1@First#2` 1/1, 0.0/0.09 · 01:07:58 `mat:hardwood_plank@First#1` (supply, for Magic Wizard Hat for Fourth) 29/29, 0.1/1.51 — the 00:05 offering's second issue ran 1.27 h inside it · 02:38:45 – 07:05:21 `lvl:mining:35@First#1–#4` 177, 179, 181, 182, all done, 1.48–1.51 each · 08:35:45 `#5` 182 planned, 141 by 09:46 (re-attached at the restart) |
| Second | [23:25:45 `ach:intermediate_lumberjack:0@Second#12` 164/165, 1.5/2.38: the offering and the full moon trip, 0.84 h, inside] · 01:48:45 `src:trout@Second#1` (for Cooked Trout ×196 for the_reaper) 164/164, 1.5/1.51 · 03:19:28 – 07:50:25 `ach:intermediate_lumberjack:0@Second#1–#4` 162–163 each, 1.50–1.60 (#4 holds the merchant interrupt, 0.08 h) · **015's code**: 09:26:39 `tidy:copper_axe` 19, 0.05 h · 09:29:48 `tidy:fishing_net` 14, 0.04 · 09:32:17 `tidy:water_bow` 23, 0.05 · 09:35:15 `tidy:iron_sword` 5, 0.02 · 09:36:09 `ach:intermediate_lumberjack:0@Second#1` 162 planned, 19 by 09:46 |
| Third | [23:55:16 `src:blue_slimeball@Third#1` (for Battlestaff for Fourth) 83/83, 0.5/1.15: the offering inside, 0.73 h] · 01:04:16 `ach:alchemist:2@Third#1` 95 planned, 94 crafted, 1.5/1.49, **paused and blocked 02:33:24** · 02:33:24 – 08:30:24 `src:nettle_leaf@Third#1–#5` (for Minor Health Potion ×883, then ×1174, for the_reaper) 144–145 each, 1.48–1.49; #5 124 by 09:46 (re-attached) |
| Fourth | [23:23:28 `lvl:mining:35@Fourth#7` 179/180, 1.5/1.78: the offering inside, 0.28 h] · 01:10:01 `src:ash_wood@Fourth#1` (for Magic Wizard Hat for Fourth) 104/104, 0.8/0.68 · 01:50:40 – 07:42:23 `lvl:mining:35@Fourth#1–#5` 174–183, 1.41–1.52 · **015's code**: 09:13:29 `tidy:copper_ring@Fourth#1` 30, 0.09 h · 09:19:07 `tidy:iron_ring@Fourth#1` 8, 0.03 · 09:20:41 `lvl:mining:35@Fourth#1` 181 planned, 53 by 09:46 |
| Fifth | [00:36:02 `lvl:mining:35@Fifth#1` 177/177, 1.44] · 02:02:43 `src:trout@Fifth#1` (for Cooked Trout ×196 for the_reaper) 164/164, 1.5/1.33 · 03:22:48 – 07:50:33 `lvl:mining:35@Fifth#1–#4` 179–183, 1.47–1.52 · **015's code**: 09:21:41 `lvl:mining:35@Fifth#5` 181 planned, 49 by 09:46 |

- **Mining.** Three miners stand on `lvl:mining:35`, "for Diamond in the chain of diamond_in_the_sky (+3 pts)", as in reports 014 and 015.
- **The the_reaper chain.** Its potion and food (minor health potion ×1174, cooked trout ×196) now hold Third, Second and Fifth on nettle and trout supply.
- **Samples against their estimates:**
  - `gather:coal_rocks` ×15: 29–30 s against 33 s (0.88–0.91);
  - `gather:birch_tree` ×5: 33–34 s against 33 s;
  - `gather:nettle` ×4: 37 s against 41 s;
  - `gather:trout_spot` ×2: 33 and 29 s against 33 s;
  - `gather:ash_tree`: 23 s against 25 s;
  - `kill:vampire`: 83 s against 87 s; `kill:blue_slime`: 18 s against 19 s;
  - `craft:hardwood_plank`: 29 s against 5 s, with "slower than expected" at 02:38:45. This is the known one: a sample's estimate is craft-only (report 014's note).
- **Achievements**: no `plan: completed`, no claim in the window.

### Every notable line
**Nothing of this kind** in the window: `flapping`, `no step`, `defect`, `queue found stopped`, `took over`, a 462, "inventory full of protected working stock".

| time (UTC) | line(s) | verdict |
|---|---|---|
| 00:05:40 – 02:34:49 | **The offerings of 11-21.** Every character completed combat and cooking (First's cooking at the 21–30 bracket, +5,300 XP), except Second's weaponcrafting: "skipped today's weaponcrafting offering — can't get 1× Iron Axe or any lower bracket's item" (00:06:08) | as designed |
| 00:13:43, 00:16:51 | First's offering hunt: 2 fights lost, `interrupt removed — Today's seasonal offerings: lost 2 fights in a row`, "comes back at 01:16Z (1 of 3 today)"; issued again 01:17:55, one more loss at 01:48:14, completed 02:34:49 | as designed (report 015 saw the first half); the hunt plans no potions, not looked into |
| 01:32:00, 01:36:01 | Second's full moon trip: one fight lost, then "ran dry after 12 fights vs Full Moon Vampire" | as designed for the end (014's run-dry). Its take is a defect (Notes 2) |
| 02:33:24 | Third `queue paused — Craft 95× Health Splash Potion: no Nettle Leaf (need 2)`, `blocked ach:alchemist:2 6 h` | **defect, settled point 10**, the third time: 94 nettle and 48 sunflowers gathered, 47 runs crafted (94), and the 48th run needs 96 |
| 01:08:43, 02:38:45 | First `unequip -> 483` (not enough HP) | as designed: the swap heals and retries |
| 08:49:14 | 499 ×2 | the restart's old cooldown |

Fights: 62 in the window, 2 lost.

### 014's code to 08:48:52: kill steps, what they drank and ate
| step | planned (why) | the reset (what the cut lines show) | fights | ate |
|---|---|---|---|---|
| Third `src:blue_slimeball@Third#1` (23:55:16) | "83 kills now (0.5 h) with 100 Air Boost Potion from the bank; rests (no food heals so little)" | weapon, helmet, body, legs stripped (23:55:16); the withdrawal and equip of the set (23:55:42, 23:56:01) are cut before the potions | 83 won | 0, 83 rests |
| First `ach:the_reaper:1@First#1` (00:47:11) | "11 now (0.2 h) with 14 Air Boost Potion and 93 Minor Health Potion and 12 Cooked Trout" | exactly 12 cooked trout withdrawn (00:49:30); the potions past the cut | 11 won | 7 trout |
| First `ach:the_reaper:1@First#2` (01:02:24) | "1 now with 2 Air Boost Potion and 9 Minor Health Potion; rests" | **unequipped utility1 ×1 and utility2 ×9 and deposited them** (01:03:27–01:03:39), none withdrawn back; a mid-step swap of helmet and body armour and a walk back to the bank (01:05:20, 01:06:09) | 1 won, no potion worn | 0 |
| Second's full moon trip (01:12:12) | "≈60 kills in 56 min with 100 Minor Health Potion and 100 Small Health Potion and 72 Cooked Trout" | minor ×54 equipped (01:13:41–01:13:45), trout ×9 (01:14:33), no small potion; a walk back for iron boots (01:18:45–01:19:41) | 12 won, 1 lost, **ran dry** 01:36:01 | 9 |

- **"Ran dry"**: once (the trip above).
- **"Inventory full of protected working stock"**: none.
- **Food against a third of the bag**: the largest food withdrawal is 12 trout.

### Report 015's acceptance step 7, from 08:49:13
**The boot's bank line** (08:49:17.778): "106 of 110 slots used (4 free), the next expansion 28,000 gold, bank gold 232,916; tidy below 15 free, buy below 10 (cap 60,000); outdated:" and 24 codes, Wooden Shield ×5 and Iron Armor ×8 among them.

**Why those two, when report 015's table kept both for a solve.**
- **Not the call without a name.** The table (`scripts/check-planner.mts:1807`, `tidyVerdicts(w)`) and the boot line (`bankCheck`, `tidyVerdicts(world)`) make the same nameless call.
- **The inputs differ.** The table was played on a reconstruction:
  - the 11-18 snapshot's achievements and skills;
  - the sets the chat named, assigned to characters by report 015's author;
  - combat 23 / 25 / 22 / 23 / 23;
  - the bank of 23:32:55 UTC on 11-20.

  The boot judged the live World of 08:49: its own achievements, worn sets, levels and a bank that had gained potions (286 minor health potions brewed at 23:35:49 on 11-20, 94 health splash potions, the cape).
- **The two solves.** Wooden Shield was kept only by First's solve against the skeleton (the_reaper's objective 0), Iron Armor only by Second's against the vampire (objective 1). At 08:49 neither picked them.
- **What moved.** The vampire objective was open in both (164 kills left at 01:02:24), so for Iron Armor it is the solve: the pool or the fighter. For Wooden Shield either the solve, or the skeleton objective: its last step ran on 11-19 (Fifth, 16:02:55 – 17:11, "135 Skeleton kills left" before it), and the planner has worked vampires only since.
- **Which, this log cannot tell.** Neither the World of 08:49 nor its solves are written anywhere. From this task's restart on, the day's snapshot holds that World and a step's `wear` holds its set.

**The tidy steps.** Every one ran on 015's code, with no reset and with the last step's bag (Fourth's 43 coal, Second's 28 birch and a sap). They went out with the tidy's own deposit. No `recycle` item met a full bag: there was no bank-off inside any of them.

| who, time | codes (copies) | free before → after (the why) | seconds | what came back (the echoes) | where it went |
|---|---|---|---|---|---|
| Fourth 09:13:29 | copper ring 15, life amulet 10, air & water amulet 5 | 4 → 7; really 6 (red slimeball came back new) | 336 | 30 copper bar; 14 feather, 6 red slimeball; 6 iron bar, 2 blue, 2 green slimeball | the step's deposit-all, 09:18:45, with 43 coal |
| Fourth 09:19:07 | iron ring 8 | 6 → 7 | 96 | 13 iron bar, 3 wool | 09:20:33 |
| Second 09:26:39 | copper axe 9, copper dagger 5, copper pickaxe 5 | 7 → 10 | 186 | 18 + 10 + 10 copper bar | 09:29:37, with 28 birch and 1 sap |
| Second 09:29:48 | fishing net 5, fire staff 1, sticky dagger 8 | 10 → 13; really 12 (ash plank new) | 150 | 10 ash plank; 1 ash plank, 1 red slimeball; 12 copper bar, 4 green slimeball | 09:32:03 |
| Second 09:32:17 | water bow 2, greater wooden staff 5, iron dagger 16 | 12 → 15; really 14 (spruce plank new) | 180 | 4 ash plank; 2 blue slimeball, 8 spruce plank; 27 iron bar, 5 feather | 09:34:59 |
| Second 09:35:15 | iron sword 5 | 14 → 15 | 54 | 9 iron bar, 1 feather | 09:36:01 |

- **In all**: 6 steps, 14 codes, 99 copies, 1,002 s.
- **The free slots**: 4 (08:49) → 6 (09:18:45) → 7 (09:20:33) → 10 (09:29:37) → 12 (09:32:03) → 14 (09:34:59) → **15** (09:36:01).
- **What is left.** At 15 free the tidy stops. Ten codes the boot line called outdated wait for the next time fewer than 15 are free: wooden shield, copper boots, helmet, armor and legs, feather coat, iron armor and legs, leather hat and legs. They are all gearcrafting, Third's, who is on a nettle step.
- **What came back.** Three codes came back new, as report 015's table expected for these (red slimeball, ash plank, spruce plank). The tidy's why counts the codes that go, not those that come back (report 015's note).
- **No `bank/buy_expansion`, no 462 and no other `plan: bank` line since 08:49.** The expansion is asked for only below 10 free with nothing to tidy, and the bank went from 4 to 15 free first.
- **No `npc/sell` since 08:49.** The only sales of the window were 014's, below.
- **No kill step since 08:49**, so no food was planned against a bag.

### Sap
The bank held 575 at 23:32:55 UTC on 11-20 and 303 at 08:36.
- **The Timber Merchant spawn of 08:12:25 took it.** `plan Second: interrupt merchant — Sell 355× Sap`, 014's code. Five sales: 08:12:59 (3), 08:14:03 (109), 08:15:06 (109), 08:16:09 (109), 08:17:13 (25).
- **No craft used sap.**
- **In:** Second's birch woodcutting gathered 100. The deposits visible past the cut show 80; 16 deposits are cut before their end.
- 575 + 80 − 355 = 300, against 303. The 3 not counted are in the cut deposits or in a bag.

From 08:49:13 report 015's rule holds: no sap is on the merchant's list.

### The full moon vampire cape
It came from Second's full moon trip:
- `plan: event full_moon at (10, 8) until 02:10Z — demand: 4 Full Moon Vampire Cape for Vampire Bow for Second … → 48 kills` (01:12:12);
- 12 won fights;
- one cape, deposited at 01:36:43 with a lich tomb key (`bank/deposit/item [{"code":"full_moon_vampire_cape","quantity":1},{"code":"lich_tomb_key","quantity":1}]`).

### 462s, events, the spawn ratio
- **462**: none since 00:57:55. The only 462 of the whole log is still the one of 11-13 12:15:28.
- **`plan: event`**:
  - 01:12:12 `full_moon`: Second sent;
  - 02:02:21 `attacking_the_island`: "does not fit", ∞ spawns needed for coin_collector and secure_the_island;
  - 03:14:34 `silent_night`: "nobody needs it".
- **The Timber Merchant** of 08:12:25 got the merchant interrupt (the sap above).
- **The ratio**: 48 `⚡` lines, **45 distinct spawns**, from 11-17 10:51:33 to 11-21 09:46:33 = **94.92 h**. The docs expect 74.2 ± 8.6, so **expected ÷ seen = 1.65**, beside `SPAWN_LOG` 1.64 (report 015: 41 over 86.11 h, 1.64).

### Where the time goes
An action's seconds run from its line to the character's next action line (report 015's reading).

| 00:57:55 → 08:49:13 (014's code, 7.86 h) | fight | rest | eat | bank | walk | gear | gather | craft |
|---|---|---|---|---|---|---|---|---|
| First | 4.5% | 2.4% | 0.3% | 0.9% | 7.5% | 0.6% | 82.2% | 1.6% |
| Second | 2.2% | 1.3% | 0.1% | 0.8% | 3.9% | 0.4% | 91.2% | 0.0% |
| Third | 0.7% | 0.4% | 0.0% | 0.5% | 1.7% | 0.2% | 95.7% | 0.8% |
| Fourth | 0.0% | 0.0% | 0.0% | 0.4% | 2.8% | 0.1% | 96.7% | 0.0% |
| Fifth | 0.0% | 0.0% | 0.0% | 0.3% | 3.0% | 0.1% | 96.5% | 0.0% |

| 08:49:13 → 09:46:33 (015's code, 0.96 h) | fight | rest | eat | bank | walk | gear | gather | craft |
|---|---|---|---|---|---|---|---|---|
| First | 0 | 0 | 0 | 0.5% | 2.4% | 0 | 97.1% | 0 |
| Second | 0 | 0 | 0 | 3.3% | 10.1% | 0 | 80.7% | 5.9% |
| Third | 0 | 0 | 0 | 0 | 0 | 0 | 100% | 0 |
| Fourth | 0 | 0 | 0 | 1.8% | 11.2% | 0 | 83.5% | 3.6% |
| Fifth | 0 | 0 | 0 | 0.5% | 4.9% | 0 | 94.6% | 0 |

"Own consumables" (a consumable made inside a fight item) is 0 throughout. Second's and Fourth's walk and craft after 08:49 are the tidy.

### What the log says the journal's records must not miss
1. **A step's planned potions and food against what its reset really took, kept and wore** (First#2 at 01:03; the trip at 01:13): the `step`'s `wd` against the `end`'s `wd`, `drunk` and `used`.
2. **Interrupt time apart from the step it sits in** (a 1.27 h offering inside a 0.1 h step; a 0.84 h trip inside Second's #12): the buckets.
3. **A mid-step walk back to the bank** (01:05:20, 01:18:45): the meter shows it as `walk` and `bank` inside a kill step's `end`, not where.
4. **An event trip's result** (kills, losses, run dry, the cape banked): the `int-end` meter.
5. **What a merchant interrupt sold and the gold** (355 sap): the `int-end`'s `n.sell_npc` and `gin`, not the codes.
6. **A pause's reason and a craft's run arithmetic** (no Nettle Leaf, need 2, at 02:33:24): the `pause` and the `end`.

## The journal, the meter and the files
### The writers
**`src/lib/devlog.ts`** is unchanged in how it works: it buffers lines for 500 ms and has one sink. It now exports the run id `RUN`, its four-letter tag (`:12-13`).

**`src/lib/journal.ts`** (new) holds every writer:
- `journal(k, fields)` (`:41`) writes `{t, run, k, …fields}`. Anything written before the run's `boot` waits for it, 100 records at most, and is written right after it. Without this, the offering catch-up of `resumeQueue` (`int`) came before `boot` in `journal-step`.
- `writeStatus` (`:58`) writes the status.
- `writeWorld` (`:67`) writes the day's snapshot. It does nothing when the day already has one.
- `fileSinks(disk, root)` (`:94`) decides which file a line goes to.
- The meter (`:113-236`).

**What `src/server/main.ts` installs** (`:42-74`):
- **The disk.**
  - `append` makes the directory once, then `appendFileSync`.
  - `replace` does `writeFileSync` to `<file>.tmp`, then `renameSync`, so the status is never seen half written.
  - `exists` is `existsSync`.
- **The root** is `logs/` on port 5173. Any other port writes under `logs/port-<N>/`: a smoke test (CLAUDE.md, the verify skill) would otherwise overwrite the live `status.json`.
- **The commit** is read once at boot by `commitOf()` (`:59-72`): `.git/HEAD`, then its ref file, then `packed-refs`. No child process. `setRunInfo` (`:74`) keeps it with dev / prod.
- **A `server` record**: `report()` writes one beside its raw line (`:39`).

**Which file a line goes to.**
- A raw line goes to `raw/<YYYY-MM-DD>/<HH>.log` by its own stamp. The flushed batch is grouped by the stamp's `YYYY-MM-DDTHH`; a line without a stamp (a stack's next line) stays with the one before it.
- A record goes to `journal/<day>.jsonl` by its `t`.
- The status goes to `status.json`; the snapshot to `world/<day>.json`.

There is no timer: the first line of a new hour opens the new file, and the first record after midnight opens the new day's. `journal-files` crosses 23:00 and 00:00 and checks that every line and record lands in the file of its own hour and day.

**A failed write is dropped, and the runner goes on.**
- `journal`, `writeStatus` and `writeWorld` catch everything.
- The raw sink's errors are caught by devlog's flush (`src/lib/devlog.ts:27-35`); that batch of lines is lost.

**Who writes no file.**
- The tab: no sink is installed, and `act` returns the rpc before the meter.
- The checks: with no sink, `journal()` returns at once.
- The harness: it installs `fileSinks` over a Map (`scripts/harness/index.mts:64-87`), shown as `t.journal()` and `t.files()`. Its verbose report prints the journal.

### Each record kind
The schema, with an example line each, is `docs/journal.md`.

| kind | emitted at | from |
|---|---|---|
| `boot` | `src/state/planner.ts:860` (`resumePlanner`) | `runInfo()` (main.ts), and per owned character: the step re-attached, the items dropped by a take-over, the interrupts still queued |
| `step` | `planner.ts:208` (`start`) | the `Step` decided: key, target, answer, work, units, hours, score, why, parent / for, `withdraw` as `wd`, `wear`, `until` |
| `end` | `planner.ts:225-233` (`endRecord`), called from `next` (`:439`), `handBack` (`:759`), `resumePlanner` (`:856`) | the `Running`: units of planned, wall = now − `startedAt`, `ran` = its running seconds, plan = hours × 3600, how and why, `partial`, and `meterCut(pl:<key>)` |
| `sample`, `slow` | `planner.ts:373`, `:377` (`addSample`) | the sample and the costs' mean against the estimate |
| `block` | `planner.ts:410`, `:414` (`blockStep`) | target, key, until, why, strikes; the third strike's `all` and `lanes` |
| `flap` | `planner.ts:173` (the ceiling), `:183` (a target) | the brake's count and hold |
| `nostep`, `defect`, `stopped` | `planner.ts:189`, `:153`, `:531` | the exception; the defect's text; the stopped queue's head |
| `int` | `planner.ts:677` (`interrupt`) | class, what, the items' texts; it is registered in `ints` (`:236-239`) |
| `int-end` | `planner.ts:255-267` (`intsOver`, from `tick` at `:475`) | its items all gone; `removed` with the item's error when the pause path removed one (`:483`); an offering's outcome from today's offerings cache and the item's skip reasons (`offeringOutcome`, `:241`, with `src/state/queue.ts:196`, `:1493-1494`); `meterCut(pl:int:<cls>:<what>)` |
| `event` | `src/state/eventorders.ts:163-169` (`reactToEvents`) | each live spawn whose verdict (`eventPlans`) is new or changed (the same members in another order is no change, `:137`); the core's line and members from `ownedEvents` (`:131`) |
| `bank` | `planner.ts:552` (`bankLine`: refused, no-buy, stuck), `:584` (boot), `:595` (buy); `src/state/queue.ts:627` (bought); `src/state/loopkit.ts:205` (read after a 462) | the World's slots, codes, gold, the next price, the cap; the outdated codes at boot |
| `ach` | `planner.ts:637` (completed, in `readAchievements`); `queue.ts:585` (a claim) | the achievements read before and after; the pending reward claimed |
| `level` | `src/lib/journal.ts:219` (`meterEcho`) | the character before the request against the echo's, any character |
| `pause` | `queue.ts:1658` (`runLoop`) | the item, its error, the API's code |
| `server` | `src/server/main.ts:39` | the rejection's or exception's stack, first lines |
| `config` | `planner.ts:790` (the patch), `:770` (switched on, with the items dropped), `:797` (handed back) | `setPlannerConfig` |

The plain `plan …` lines are all still written to the raw log (settled point 7). The new raw lines are `bank read after a 462: …` and its failure.

### The meter
**Where it sits.** In `act` (`src/api/actions.ts:14-31`), the one place every action's echo passes:
- `meterStart(name)` runs before the request. It closes the character's last slice and opens a new one, in the bucket the runtime names (`setMeterKey`, `planner.ts:222`):
  - the head item's id `pl:<key>:<i>` → `pl:<key>`;
  - `pl:int:<cls>:<what>:<i>` → `pl:int:<cls>:<what>`;
  - any other id → "" (characters the planner does not own; their bucket is never cut).
- `meterEcho(…)` runs after `applyActionResult`, with the character as it was before the request (`src/lib/journal.ts:181-221`).

**What it reads of an echo.**
- **Every echo:**
  - `cooldown.total_seconds` goes to the group of `cooldown.reason`. The groups are the API's `ActionType` (docs/api/openapi.json, `CooldownSchema.reason`): fight, raid_fight, multi_fight · rest · use = eat · deposit/withdraw item and gold, buy_bank_expansion = bank · movement, transition = walk · equip, unequip = gear · gathering · crafting, recycling = craft · buy/sell_npc and the Grand Exchange = trade · task · the rest (offering, claim_item, delete_item, give_*) = other;
  - one action in `n[reason]`;
  - the character after the action (`character`, or a fight's `characters[]`) against the one before: XP by skill (across a level: `max_xp − xp` before, plus `xp` after), a `level` record per level passed, and the pocket gold in or out (not for bank gold moves).
- **A fight.**
  - `fight.result` → `won` / `lost`.
  - `fight.characters[me].drops` → `got`. **A drop is in the fight echo's `fight.characters[].drops`**; a gather's is in `details.items`.
  - The worn `utility1/2` stacks before the request, less the echo's `characters[]` stacks → `drunk`. **A potion's use is in the fight echo only**: the game drinks inside the fight, and there is no action of its own.
- **A gather**: `details.items` → `got`.
- **A craft or a recycle**: `details.items` → `made`. What a tidy got back is visible here.
- **`use`**: the request body → `used`.
- **Bank item moves**: the body's stacks → `dep` / `wd`. **Gold moves**: `dep.gold` / `wd.gold`.

**The cuts.**
- `end` cuts the step's bucket (`planner.ts:227`); `int-end` cuts the interrupt's (`:265`). The slice open at the cut is closed then.
- An action belongs to the bucket of the head at its request. So **a step's `end` carries what its own items did, and none of an interrupt's actions.** The interrupt's actions are in its `int-end`. `journal-interrupt` shows it:
  - the step's 40 fights, and no offering action, in its meter;
  - the offering's walk, its feather withdrawal and its two altar actions in the interrupt's meter;
  - `m.s` of the step plus `m.s` of the interrupt equal the step's wall within 2 s.
- `wait` is the slices less the cooldowns. A cut inside a cooldown (a removed interrupt, a take-over) counts the cooldown whole, so `wait` never goes below zero.
- **A refused action has no echo.** It counts nothing, and its time is `wait`. That is the 598s of `journal-block`.

**What a restart loses.** The meter lives in memory, so all of it. A step re-attached at boot ends `partial`, with only what was metered since the boot. `journal-restart`: 32 of the 40 fights, the 8 before the restart lost.

**Against the log: two real steps of section 1, the reader's seconds against the meter's rule.** The reader gives an action the seconds from its line to the character's next action line. The meter gives it its echo's `total_seconds`, an integer in the API, and the rest is `wait`. The log has no echo, so the meter's side is taken from the smallest gap of each kind: a gap is the cooldown plus the request's round trip and the runner's tick.

- **A gather step**: Fourth's `src:ash_wood@Fourth#1`, 01:10:01 → 01:50:40 UTC, wall 2,439 s, no interrupt inside.

  | group | reader | meter (rule) | where they differ |
  |---|---|---|---|
  | gather | 104 × gaps of 21.87–23.66 s = 2,302 s (94.4%) | 104 × 21 s = 2,184 s (89.5%) | 1.1 s a gather is the round trip and the tick: `wait` |
  | walk | 5 moves, 85 s (3.5%) | about 80 s | about 1 s a move to `wait` |
  | bank | 6 moves, 33 s (1.3%) | about 27 s | likewise |
  | gear | 4, 19 s (0.8%) | about 15 s | likewise |
  | wait | — | about 133 s (5.5%) | |

- **A fight step**: Third's `src:blue_slimeball@Third#1`, 23:55:16 → 01:04:16, wall 4,140 s. The 00:05 offering interrupt inside it took 2,636 s; the step's own actions took 1,504 s.
  - **The reader**: 83 fights, 797 s (gaps 6.76–10.45 s); 83 rests, 512 s (3.84–38.04 s); 3 moves, 108 s; bank and gear, 87 s.
  - **The meter** would put only the 1,504 s in the step's bucket, as the reader's head-id split does, and the interrupt's 2,636 s in the offering's `int-end`. Of the 1,504 s, about 0.8 s an action is round trip: the smallest fight gap 6.76 s sits on a 6 s cooldown, the smallest rest 3.84 s on the 3 s minimum. That is about 140 s of the step's 172 actions as `wait` (9%).
  - **One refused withdrawal** (00:06:46, 478) has no echo: the meter counts its slice as `wait`, and the reader as bank.
  - **The fight seconds** themselves cannot be checked here: a fight's cooldown depends on its turns, which the log does not carry.
- **The boundaries.** The reader's step runs from its decision line, the meter's from its first request: 0.3 s apart in both steps (the decision to the first action), and −0.2 to −0.4 s at the end.

### The status and the snapshot
- **The status** (`planner.ts statusNow`, `:274-298`) is written:
  - every minute by a timer the planner starts with its heartbeat (`:614`; `minute`, `:312`);
  - at every `step` (`:212`) and `end` (`:232`);
  - after the first achievements read at boot (`:814`).

  What it holds is in `docs/journal.md`. It is about 1 kB a character: 991 bytes for one character in `journal-files`, so 5–6 kB for the fleet. `journal-files` rewrites it 80+ times in 80 virtual minutes and checks that every write parses whole.
- **The snapshot** (`snapshotOf`, `:300-304`; `snapshotDue`, `:306-311`) is written once a day: at the first minute after 00:00 UTC, and at boot when the day has none. Both wait for the first achievements read: the World is not whole without them. It holds `worldOf(now)` whole, `bankDetails`, the offerings cache and the planner's `current`, `costs`, `blocked`, `strikes`, config patch and `offered`. It never holds the token.
  - `journal-files` checks it: a snapshot for each day, each written once, the second at 00:01. A World taken from it alone gives Pia a decision.
  - The fixture `scripts/fixtures/world-2026-11-20.json` is 51 kB. It was composed in the service's format from the 11-18 snapshot's characters and achievements and the bank of 23:32:55 UTC on 11-20, with all five on. In `check-planner` it gives all five a decision (settled point 6; printed below).

### What a day weighs
- **The journal.** A made-up day at section 1's pace, built from the 38 step lines of 00:57 → 09:37 UTC with their real whys:
  - each step with an `end` carrying a meter the size of the scenarios' meters (a gather's or a kill's) and a sample;
  - the window's 7 interrupts and their ends, 3 events, a block, a bank line and 6 levels;
  - scaled to 24 h.

  | kind | records a day | bytes each |
  |---|---|---|
  | step | 105 | 450 |
  | end | 105 | 443 |
  | sample | 105 | 144 |
  | int, int-end | 19 + 19 | 146, 693 |
  | event | 8 | 937 |
  | block, bank, level | 3, 3, 17 | 258, 585, 98 |
  | **a day** | **≈385** | **≈134 kB** |

  That is under the 300 kB of settled point 2. A day of tidy steps or short supply steps (report 015: four `mat:` steps in a minute) adds about 1 kB a step.
- **The raw log** is the same lines as `dev.log`'s today, a file an hour: about 0.9 MB an hour and 21 MB a day (65 MB in eight days). Nothing rotates it (settled point 13).
- **The status** is 5–6 kB, rewritten; **the snapshot** is about 50 kB a day.

### The made-up cases (`scripts/check-planner.mts`, section 5g)
All pass. The printed lines (`npm run check -- planner`):

| case | the result printed |
|---|---|
| **settled point 6**: a World built from a day's snapshot alone gives every character a decision (the fixture: 2026-11-20T23:32:55Z, 5 characters, 102 bank codes of 110 slots, 91 achievements) | First `ach:tanners_exchange:0@First#1` (objective); Second `tidy:copper_axe@Second#1`; Third `tidy:copper_boots@Third#1`; Fourth `tidy:copper_ring@Fourth#1` (each tidy "8 → 11 free of 110"); Fifth `ach:tanners_exchange:0@Fifth#1` |
| **settled point 10**: 121 of a two-a-run recipe withdraw 122 nettle and 61 algae (61 runs), not 121 | `ach:made_up_brew:0@Third#1 121 units, withdraw {"nettle_leaf":122,"algae":61}` (minor health potion: 2 nettle + 1 algae → 2 potions; Third at alchemy 25, 300 nettle and 200 algae in the bank) |
| …with no nettle in the bank, the step gathers the nettle of whole runs | 120 units (the chunk), sources `nettle_leaf` ×120, withdraw `algae` 60: 60 runs. Before, a step of 121 sourced 121. |
| **settled point 12**: on the bank of 11-20 a tidy step exists while codes are outdated (`tidyLeft`) | 22 codes outdated without a name; tidy steps for Second (copper axe, dagger, pickaxe), Third (copper boots, helmet, armor) and Fourth (copper ring, life amulet, air & water amulet), none for First and Fifth. Every outdated code is outdated for every name, and none is outdated only by a name. |
| …a copy of each outdated code reserved by another step: outdated without a name, no tidy step, so `tidyLeft` says nothing is left and the expansion may go | outdated without a name `true`; a tidy step for anyone `false`; `tidyLeft` `false`. Before, the answer was "something is left to tidy", and no expansion. |

**Settled point 12, the reasoning.** `bankCheck` asked `tidyVerdicts(world)`, with no name (`e66621e:src/state/planner.ts:454`). A tidy step asks more (`src/plan/planner/bank.ts:180-208`):
- **Its own verdicts.** The bills (`baseParents(world, name)`), the gear pieces (`gearPieces(world, name)`) and the solves' `src:` kills (`supplyNeeds(world, name, …)`) are each that character's. The others' running steps count as "the others'" for a name and all of them for no name.
- **That it may recycle the code** (`mayCraft`). This is the same holder as the verdict's `by` only when both use the same verdict.
- **That every copy is unreserved** (`available(code, world, name) >= copies`): another step's withdrawal or `wear` reserves some.
- **That `tidy:<code>@name` is not blocked.**

So the two can disagree in other ways than the 6-hour block. While they do, the old test would buy no expansion while nobody can tidy. On today's bank they agree (the third row). The repair is `tidyLeft`, as settled.

### The scenarios (all pass)
- **`journal-step`** (73 actions, 22 virtual min).
  - Setup: Pia (owned) has a gathering objective and gathers its 30 copper ore. Then the fake's achievements move on: the ore objective completes and a slime objective opens.
  - The kill step plans the bank's 40 small health potions and 14 cooked gudgeon. The fights (forced) drink 4 each and lose 100 HP, so Pia eats, and the step ends when the potions run dry after 10 kills.
  - The gather step's `end`: done, 30 of 30, `m.by` = gather 900 + walk 15 + wait 3.1 = `m.s` 918.1 of `wall` 918.
  - The kill step's `end`: done, 10 of 11, `m.s` 336.7 of `wall` 337; withdrew 40 potions and 14 gudgeon, drank 40, ate 10, and its reset banked the gather step's 30 ore. The ore objective's completion is an `ach` record.
  - The run's first record is its `boot`.
- **`journal-interrupt`** (94 actions, 33 virtual min). An offering interrupt mid-step (as `planner-interrupt-offering`).
  - Its `int` and `int-end` are there: done, `off: {done: [combat], open: {}}`; its meter has the two altar actions, the feathers withdrawn and no fight.
  - The step's `end` has its own 40 fights and none of the interrupt's actions, and the two meters make the step's wall within 2 s.
  - The interrupt's `s` (issue to end) is up to one fight longer than its meter: it waited out the step's fight in flight, which is the step's.
- **`journal-block`** (13 actions, 2 virtual min).
  - A chicken step ends empty (598 twice). Its `end` says `how: "empty"` with the skip's reason, and a refused action counts no fight.
  - An ore step pauses on a forced 452: `end` `how: "blocked"` with the error.
  - Two `block` records (6 h, strike 1) and one `pause` record (who, the item's id, the error, code 452), in the order step, end, block; step, pause, end, block.
- **`journal-restart`** (90 actions, 31 virtual min). A restart after 8 fights of a 40-kill step (harness `restart()`).
  - The second run's journal starts with its `boot`, a new run id on every record, naming the step re-attached.
  - Its `end` is `partial`, with 32 fights metered: only those of the second run.
- **`journal-files`** (162 actions; the clock starts at 22:50 UTC through the harness's `AMMO_CHECK_NOW`, 80 virtual minutes).
  - The raw lines go to `raw/2026-01-15/22.log`, `23.log` and `raw/2026-01-16/00.log`, every line in the file of its own hour, every raw line in exactly one file.
  - The records go to `journal/2026-01-15.jsonl` and `2026-01-16.jsonl`; the 00:05 offering interrupt is in the second.
  - A snapshot for each day, each written once, the second at the first minute after midnight. Its World alone gives a decision, and it has no `token`.
  - The status is rewritten 80+ times, never half written, and the last one is under a minute old and names the step.
- **`bank-462-read`** (4 actions, 12 virtual min). Bo (not owned); the engine read one free slot at boot, then the game's bank took a third code.
  - The deposit answers 462 and the ore goes in alone.
  - One read of `/my/bank` and `/my/bank/items` then sets the slots to the game's 3, not the 2 codes the engine knew, and the bank's codes to the game's: a raw line and a `bank` `read` record.
  - A second 462 inside ten minutes reads nothing; one after ten minutes reads again.

**What the fake and the harness learned.**
- The fake needed nothing: every action already answered `cooldown.reason` (the API's `ActionType`), and `/my/bank` and `/my/bank/items` were readable.
- The harness:
  - installs the file sinks over a Map and offers `t.journal(kind?)` and `t.files()`;
  - prints the journal in its verbose report (`npm run check -- <name>`);
  - `journal-files` starts the virtual clock late through `AMMO_CHECK_NOW`, set before the harness loads (the hook `restart()` uses).

## The reader
**The fixture.** `scripts/fixtures/journal-2026-01-15.jsonl`, 103 records, 25.7 kB.
- It is made from nine scenarios' runs: `journal-block`, `journal-step`, `journal-interrupt`, `planner-flapping`, `event-fleet-monster`, `bank-tidy`, `bank-expand`, `journal-restart`, `bank-462-read`.
- Each run's journal is taken from the harness's verbose report (`npm run check -- <name>`). Each is shifted in time to follow the one before, with 10 minutes between them. So the fixture holds nine runs (nine `boot` records) with the harness's names (Pia, Ann, Ben, Cat, Bo).
- The commit reads `?`: the harness sets no run info.
- The step keys repeat across runs, as they do in play (report 015 saw `lvl:mining:35@Fifth#1` twice). The reader gives an `end` to the latest step of its key before it that has no end, of its own run, or of an earlier run when the end is `partial`.

**Its output** (`npm run journal -- --file scripts/fixtures/journal-2026-01-15.jsonl --from 2026-01-15T00:00Z --to 2026-01-16T00:00Z`), the tables in the order of settled point 8:

#### The journal 2026-01-15T00:00Z → 2026-01-16T00:00Z
103 records in 1 file(s) of scripts/fixtures, 01-15 00:10:00 → 01-15 04:22:22

#### Restarts
| time | run | commit | mode | per character |
|---|---|---|---|---|
| 01-15 00:10:00 | qz2m | ? | prod | Pia: free |
| 01-15 00:21:08 | lecb | ? | prod | Pia: free |
| 01-15 00:52:02 | fet2 | ? | prod | Pia: free |
| 01-15 01:34:31 | 244c | ? | prod | Pia: free |
| 01-15 01:52:28 | n8g0 | ? | prod | Ann: free; Ben: free; Cat: free |
| 01-15 03:09:18 | 0vwu | ? | prod | Pia: free |
| 01-15 03:22:00 | jm5n | ? | prod | Pia: free |
| 01-15 03:37:00 | nsab | ? | prod | Pia: re-attached ach:chicken_hunt:0@Pia#1 |
| 01-15 04:10:19 | vaxg | ? | prod |  |

#### Steps per character
Units planned / done; hours planned / taken (wall) / running; a supply step's parent. `partial`: re-attached after a restart.

##### Ann
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 01-15 01:52:28 | ach:made_up_chickens:0@Ann#1 | objective | 100 / … | 0.14 / … / … | running |  |

##### Ben
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 01-15 01:52:28 | ach:made_up_ore:0@Ben#1 | objective | 150 / … | 1.32 / … / … | running |  |

##### Bo
none

##### Cat
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 01-15 01:52:28 | ach:made_up_bars:0@Cat#1 | objective | 200 / … | 0.31 / … / … | running |  |

##### Pia
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 01-15 00:10:00 | ach:chicken_hunt:0@Pia#1 | objective | 40 / 0 | 0.65 / 0.01 / 0.01 | empty: ended empty: Fight 40× Chicken — Monster not found on this map. — twice in a row (code 598) |  |
| 01-15 00:10:26 | ach:made_up_ore:0@Pia#1 | objective | 50 / 0 | 0.44 / 0.01 / 0.01 | blocked: Injected: this gather is refused. (code 452) |  |
| 01-15 00:11:08 | fallback:mining@Pia#1 | fallback | 170 / … | 1.50 / … / … | running |  |
| 01-15 00:21:08 | ach:made_up_ore:0@Pia#1 | objective | 30 / 30 | 0.27 / 0.26 / 0.26 | done |  |
| 01-15 00:36:26 | ach:made_up_slimes:0@Pia#1 | objective | 11 / 10 | 0.19 / 0.09 / 0.09 | done |  |
| 01-15 00:42:02 | src:sunflower@Pia#1 | supply | 170 / … | 1.50 / … / … | running | cons:small_health_potion:ach:made_up_slimes:0 |
| 01-15 00:52:02 | ach:chicken_hunt:0@Pia#1 | objective | 40 / 40 | 0.65 / 0.54 / 0.49 | done |  |
| 01-15 01:24:31 | ach:chicken_hunt:0@Pia#2 | objective | 40 / … | 0.65 / … / … | running |  |
| 01-15 01:34:31 | ach:chicken_hunt:0@Pia#1 | objective | 1 / 1 | 0.02 / 0.02 / 0.02 | done |  |
| 01-15 01:35:33 | ach:chicken_hunt:0@Pia#2 | objective | 1 / 1 | 0.02 / 0.02 / 0.02 | done |  |
| 01-15 01:36:58 | ach:chicken_hunt:0@Pia#3 | objective | 1 / 1 | 0.02 / 0.02 / 0.02 | done |  |
| 01-15 01:38:21 | ach:chicken_hunt:0@Pia#4 | objective | 1 / 1 | 0.02 / 0.02 / 0.02 | done |  |
| 01-15 01:39:45 | ach:chicken_hunt:0@Pia#5 | objective | 1 / 1 | 0.02 / 0.02 / 0.02 | done |  |
| 01-15 01:41:08 | ach:chicken_hunt:0@Pia#6 | objective | 1 / 1 | 0.02 / 0.02 / 0.02 | done |  |
| 01-15 01:42:28 | fallback:mining@Pia#1 | fallback | 170 / … | 1.50 / … / … | running |  |
| 01-15 03:09:18 | tidy:copper_boots@Pia#1 | tidy | 16 / 11 | 0.04 / 0.03 / 0.03 | done |  |
| 01-15 03:11:08 | tidy:copper_dagger@Pia#1 | tidy | 5 / 5 | 0.02 / 0.01 / 0.01 | done |  |
| 01-15 03:12:00 | fallback:mining@Pia#1 | fallback | 170 / … | 1.50 / … / … | running |  |
| 01-15 03:22:00 | fallback:mining@Pia#1 | fallback | 170 / … | 1.50 / … / … | running |  |
| 01-15 04:00:19 | ach:chicken_hunt:0@Pia#2 | objective | 40 / … | 0.65 / … / … | running |  |
| (01-15 04:00:19) | ach:chicken_hunt:0@Pia#1 |  | 40 / 40 | 0.65 / 0.49 / 0.49 | done (partial) | decided before the window |

#### Blocks, flaps, no step, defects, stopped queues, pauses, removed interrupts
| time | who | kind | what |
|---|---|---|---|
| 01-15 00:10:26 | Pia | block | ach:chicken_hunt:0 until 01-15 06:10:26 — ended empty: Fight 40× Chicken — Monster not found on this map. — twice in a row (code 598) (strike 1) |
| 01-15 00:11:08 | Pia | pause | Gather 50× Copper Ore [pl:ach:made_up_ore:0@Pia#1:1]: Injected: this gather is refused. (code 452) |
| 01-15 00:11:08 | Pia | block | ach:made_up_ore:0 until 01-15 06:11:08 — Injected: this gather is refused. (code 452) (strike 1) |
| 01-15 01:42:28 | Pia | flap | ach:chicken_hunt:0: 6 starts in 10 min, until 01-15 02:12:28 |

#### Interrupts
| time | who | class | what | ended | s | actions | offerings |
|---|---|---|---|---|---|---|---|
| 01-15 00:10:00 | Pia | offering | 2026-01-15 | done | 0 | — | done: —; not: combat (not accepted) |
| 01-15 00:21:08 | Pia | offering | 2026-01-15 | done | 0 | — | done: —; not: combat (not accepted) |
| 01-15 00:58:07 | Pia | offering | 2026-01-15 | done | 167 | movement 3, offering 2, withdraw_item 1 | done: combat |
| 01-15 01:34:31 | Pia | offering | 2026-01-15 | done | 0 | — | done: —; not: combat (not accepted) |
| 01-15 01:52:28 | Ann | offering | 2026-01-15 | done | 0 | — | done: —; not: combat (not accepted) |
| 01-15 01:52:28 | Ben | offering | 2026-01-15 | done | 0 | — | done: —; not: combat (not accepted) |
| 01-15 01:52:28 | Cat | offering | 2026-01-15 | done | 0 | — | done: —; not: combat (not accepted) |
| 01-15 02:58:02 | Ann | event | bandit_camp@2026-01-15T12:05:00.000Z | done | 3635 | movement 2, fight 114, rest 113, deposit_item 1 |  |
| 01-15 02:58:48 | Ben | event | bandit_camp@2026-01-15T12:05:00.000Z | done | 3680 | movement 3, deposit_item 3, withdraw_item 1, equip 1, rest 106, fight 105, unequip 1 |  |
| 01-15 02:59:18 | Cat | event | bandit_camp@2026-01-15T12:05:00.000Z | done | 3711 | deposit_item 3, withdraw_item 1, equip 1, rest 114, movement 2, fight 114, unequip 1 |  |
| 01-15 03:09:19 | Pia | offering | 2026-01-15 | done | 0 | — | done: —; not: combat (not accepted) |
| 01-15 03:22:06 | Pia | bank | expand0 | done | 6 | withdraw_gold 1, buy_bank_expansion 1 |  |
| 01-15 03:22:06 | Pia | offering | 2026-01-15 | done | 6 | — | done: —; not: combat (not accepted) |

#### Fights lost, by step and interrupt
none

#### Samples against their estimates
| time | who | key | this step | estimate | ÷ | mean (n) |
|---|---|---|---|---|---|---|
| 01-15 00:36:26 | Pia | gather:copper_rocks | 31 s × 30 | 32 s | 0.97 | 31 s (1) |
| 01-15 00:42:02 | Pia | kill:green_slime | 34 s × 10 | 26 s | 1.31 | 34 s (1) |
| 01-15 01:24:31 | Pia | kill:chicken | 45 s × 40 | 58 s | 0.78 | 45 s (1) |
| 01-15 04:00:19 | Pia | kill:chicken | 44 s × 40 | 58 s | 0.76 | 44 s (1) |

#### Where the time goes (the meter: steps' and interrupts' ends in the window)
| who | hours | fight | rest | eat | bank | walk | gear | gather | craft | trade | task | other | wait | in interrupts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ann | 0.99 | 39.1% | 59.0% | 0 | 0.2% | 1.1% | 0 | 0 | 0 | 0 | 0 | 0 | 0.6% | 100.0% |
| Ben | 1.02 | 35.1% | 60.0% | 0 | 1.6% | 1.5% | 1.3% | 0 | 0 | 0 | 0 | 0 | 0.6% | 100.0% |
| Cat | 1.03 | 36.3% | 57.7% | 0 | 2.2% | 1.1% | 2.1% | 0 | 0 | 0 | 0 | 0 | 0.6% | 100.0% |
| Pia | 1.48 | 55.3% | 12.0% | 0.6% | 1.0% | 10.8% | 0.3% | 16.9% | 2.0% | 0 | 0 | 0.1% | 0.9% | 2.6% |

#### Kill steps: what they planned to drink and eat, against what they did
| time | who | key | kills | planned (withdraw) | withdrawn | drunk | eaten | left | rest s |
|---|---|---|---|---|---|---|---|---|---|
| 01-15 00:10:00 | Pia | ach:chicken_hunt:0@Pia#1 | 0 of 40 | — | — | — | — | — | — |
| 01-15 00:36:26 | Pia | ach:made_up_slimes:0@Pia#1 | 10 of 11 | small_health_potion 40, cooked_gudgeon 14 | small_health_potion 40, cooked_gudgeon 14 | small_health_potion 40 | cooked_gudgeon 10 | cooked_gudgeon 4 | 50 |
| 01-15 00:52:02 | Pia | ach:chicken_hunt:0@Pia#1 | 40 of 40 | — | — | — | — | — | 302 |
| 01-15 01:24:31 | Pia | ach:chicken_hunt:0@Pia#2 | 40 planned | — | … | … | … | … | — |
| 01-15 01:34:31 | Pia | ach:chicken_hunt:0@Pia#1 | 1 of 1 | — | — | — | — | — | — |
| 01-15 01:35:33 | Pia | ach:chicken_hunt:0@Pia#2 | 1 of 1 | — | — | — | — | — | 8 |
| 01-15 01:36:58 | Pia | ach:chicken_hunt:0@Pia#3 | 1 of 1 | — | — | — | — | — | 8 |
| 01-15 01:38:21 | Pia | ach:chicken_hunt:0@Pia#4 | 1 of 1 | — | — | — | — | — | 7 |
| 01-15 01:39:45 | Pia | ach:chicken_hunt:0@Pia#5 | 1 of 1 | — | — | — | — | — | 8 |
| 01-15 01:41:08 | Pia | ach:chicken_hunt:0@Pia#6 | 1 of 1 | — | — | — | — | — | 7 |
| 01-15 01:52:28 | Ann | ach:made_up_chickens:0@Ann#1 | 100 planned | — | … | … | … | … | — |
| 01-15 04:00:19 | Pia | ach:chicken_hunt:0@Pia#2 | 40 planned | — | … | … | … | … | — |

#### Events
| time | spawn | tile | until | verdict |
|---|---|---|---|---|
| 01-15 01:57:28 | bandit_camp | 4, 5, overworld | 01-15 02:57:28 | Ann, Cat, Ben: fight until the event ends |

The spawn ratio: 1 distinct spawn(s) seen in 4.2 h of journal; the docs expect 3.3 ± 1.8 (a 1/rate chance a minute while not up): expected ÷ seen = 3.29, beside SPAWN_LOG 1.64. (A spawn is seen only while the service is up.)

#### Levels
none

#### Achievements
| time | what |
|---|---|
| 01-15 00:36:26 | completed made_up_ore (+5; the account 5) |

#### The bank
| time | what | used / slots (free) | next | gold | the rest |
|---|---|---|---|---|---|
| 01-15 00:10:00 | boot | 1 / 500 (499) | 4500 | 0 |  |
| 01-15 00:21:08 | boot | 3 / 500 (497) | 4500 | 0 |  |
| 01-15 00:52:02 | boot | 2 / 500 (498) | 4500 | 0 |  |
| 01-15 01:34:31 | boot | 1 / 500 (499) | 4500 | 0 |  |
| 01-15 01:52:28 | boot | 13 / 500 (487) | 4500 | 0 |  |
| 01-15 03:09:18 | boot | 6 / 18 (12) | 4500 | 0 | outdated: copper_boots 5, copper_dagger 5, copper_helmet 11, copper_ring 15 |
| 01-15 03:22:00 | boot | 10 / 18 (8) | 28000 | 100000 | outdated: — |
| 01-15 03:22:00 | buy | 10 / 18 (8) | 28000 | 100000 | Pia; price 28000 |
| 01-15 03:22:06 | bought | slots 18 → 38 | 70000 | 72000 | Pia; price 28000 |
| 01-15 03:27:00 | no-buy | 31 / 38 (7) | 70000 | 72000 | price 70000; above the cap of 60,000 |
| 01-15 03:37:00 | boot | 0 / 500 (500) | 4500 | 0 |  |
| 01-15 04:10:22 | read | 3 / 3 (0) | 4500 | 0 |  |
| 01-15 04:10:22 | refused | 3 / 3 (0) |  |  | Bo; feather |
| 01-15 04:22:22 | read | 3 / 3 (0) | 4500 | 0 |  |

#### Config
| time | what |
|---|---|
| 01-15 00:10:00 | patch {"on":{"Pia":true},"first":["chicken_hunt"]} |
| 01-15 00:21:08 | patch {"on":{"Pia":true}} |
| 01-15 00:52:02 | patch {"on":{"Pia":true}} |
| 01-15 01:34:31 | patch {"on":{"Pia":true}} |
| 01-15 01:52:28 | patch {"on":{"Ann":true,"Ben":true,"Cat":true}} |
| 01-15 03:09:18 | patch {"on":{"Pia":true}} |
| 01-15 03:22:00 | patch {"on":{"Pia":true}} |

**What it cannot say that section 1's scratch readers could.**
- **The order of actions inside a step.** It cannot show which codes a reset withdrew and equipped, in which order, or a mid-step walk back to the bank. The journal has a step's totals (`wd`, `dep`, `drunk`, `used`) and not the sequence. Section 1's two executor defects were read from that sequence: First's planned potions banked by its own reset (01:03:27–01:03:39), and the trip's walk back for iron boots (01:18:45). The raw log keeps it, now uncut to 600 characters.
- **Anything before this task's restart.** The journal starts there.
- **What the runtime does not record**: head transitions, notes, 483 and 499 retries, network retries, a merchant interrupt's sales line by line (its `int-end` meter has `n.sell_npc` and `gin`, not the codes).
- **The characters the planner does not own.** They have no `step`, so the meter's "" bucket is never written. Today all five are owned.
- **Per-code returns of a recycle.** `made` sums what came back over a tidy step's codes.
- **A fight's turns, the HP lost, and the fight's own cooldown.** The meter sums the cooldowns.

**What it says that they could not.**
- **A step's planned potions and food in full** (`wd`). The 160-character cut hid them past a reset's first codes.
- **The game's own seconds by reason.** `wait` is apart from work; the line-to-line reading put the round trip (about 0.9 s an action, 4–9%) into every group.
- **Interrupt time apart from the step**, by construction: the bucket at the request, not head lines matched to a span.
- **An offering interrupt's outcome per category**, with the item's own reason.
- **A step's end and how it ended** (`empty`, `noslot`, `dropped`, `gone`), and a block's `until` and strikes.
- **XP by skill and every level passed**, for every character.
- **The commit a run loaded.**
- **Spawns judged for the planner's characters while nobody was free.** These get a record when a verdict is first set.

## What was done / files
**Section 1 (read-only).**
- Scratch readers in the session's scratchpad: `run.mjs`, `lines.mjs`, `seek.mjs`, `kinds.mjs`. They were written by a background agent, then re-run by me to the log's end before this report.
- `madeup-day.mjs` is the day's weight; `mkworld.mts` and `mkfixture.mjs` made the two fixtures.
- All of them read `logs/dev.log` as a stream from a byte offset and wrote nothing in the project. Deleted at the end.

**Section 2: the journal, the meter, the files.**
- **`src/lib/journal.ts` (new):**
  - `journal()` and the hold until `boot`, `:37-55`;
  - `writeStatus`, `:58`; `writeWorld`, `:67`;
  - `fileSinks`, `:94-117`;
  - the meter (`:113-236`): `GROUP` `:116`, `Meter` `:129`, `setMeterKey` `:148`, `meterStart` `:169`, `meterEcho` `:181`, `meterCut` `:225`.
- **`src/lib/devlog.ts`**: `RUN` (`:10-11`); the header comment.
- **`src/server/main.ts`**: the sinks, the root by port, the commit read, the `server` record (`:36-74`); `logs/dev.log` gets no more lines.
- **`src/api/actions.ts`**: the meter in `act` (`:16-26` of `act`, `:14-31`).
- **`src/state/planner.ts`** (the records; nothing that an item does changed):
  - the step and its end, `:153-233`;
  - interrupts, `:236-268`;
  - status and snapshot, `:270-317`;
  - sample and slow, `:373`, `:377`; block, `:410`, `:414`;
  - `tick`, `:475`, `:482-483`; stopped, `:531`;
  - the bank's records, `:547-605`; the minute timer, `:609-615`; `ach`, `:636-637`;
  - `int`, `:676-677`; take-over and hand-back, `:740-765`; config, `:770`, `:790-797`;
  - boot, `:823-866`.
- **`src/state/queue.ts`**: `offeringSkips` (`:194-196`, set at `:1493-1494`); the `ach` claim (`:585`), the `bank` bought (`:627`), the `pause` (`:1658`).
- **`src/state/eventorders.ts`**: the `event` record (`:131`, `:137`, `:160-169`).

**Settled point 9.** `src/api/client.ts:14-20`: an `api` line's body is cut at 600 characters.

**Settled point 10.** `src/plan/planner/decide.ts:63-95` (`planMake`; `need` at `:72`): `q` (the recipe's quantity a run) and `need(per, n)` = ceil(n ÷ q) × q × per.
- The bank's limit is in whole runs (`max`).
- A source gathers `need − stock − bags`.
- The withdrawal is `need`.

The `mat:` and `gear:` steps already planned whole runs (`decide.ts:315-317`, `recipeDemand`).

**Settled point 11.**
- `src/state/loopkit.ts:168-209` (`deposit`, `readBankAfter462`): the 462 path keeps its local correction, then awaits `readBankAfter462()`. That is one `/my/bank` and one `/my/bank/items` read, at most one in ten minutes.
- It sets `bankDetails` and `bankItems` to the game's and writes a raw line and a `bank` record. A failed read leaves the correction.
- `src/state/store.ts` is untouched.

**Settled point 12.**
- `src/plan/planner/bank.ts:210-213`: `tidyLeft(world)`, "some character that is on has a tidy step".
- `src/state/planner.ts:588-590`: `bankCheck` asks it instead of `tidyVerdicts(world).some(outdated)`.
- `bankStuck` (`bank.ts:225`) keeps its own question, and the boot line still lists the verdicts without a name.

**Section 3.** `scripts/journal.mts` (new); `package.json`: the `journal` script line.

**The checks.**
- `scripts/check-planner.mts`: section 5g (`:1417-1461`) and `tidyLeft` in its import.
- `scripts/harness/index.mts`: the memory sinks, `t.journal()`, `t.files()`, the journal in the verbose report.
- Six scenarios: `scripts/scenarios/journal-step.mts`, `journal-interrupt.mts`, `journal-block.mts`, `journal-restart.mts`, `journal-files.mts`, `bank-462-read.mts`.
- Two fixtures: `scripts/fixtures/world-2026-11-20.json`, `scripts/fixtures/journal-2026-01-15.jsonl`.

**Docs.** `docs/journal.md` (new, the schema); `CLAUDE.md` (the commands, "Dev forensics", the planner's dev-log line). `docs/game-actions.md` does not name the log: untouched.

**Commands run.**
- `git status`, `git diff --stat`, `git add docs/rework.md`, `git commit -m "Rework notes"`, and at the end `git add …`, `git commit -m "016: journal"`, `git push`.
- `npm run typecheck` (three times, the last clean).
- `npm run check -- journal-step` / `journal-interrupt` / `journal-block` / `journal-restart` / `journal-files` / `bank-462-read` (each until it passed).
- `npm run check`, three times, the last on the final tree: `80 checks: 79 ok, 1 known defect reproduced, 0 failed`, 131.2 s, 136.8 s and 136.4 s.
- `npm run check -- check-planner` (the replay rows): **failed** in 1,662.3 s, on one case only: task 015's pin of row C at 78 (it ended at 73). After the pin moved to 73 (Summary, "How Alex verifies" 3), `npm run check -- planner` passed in 1,637.7 s.
- `npx vite build --outDir <scratchpad>/ammo-016-dist --emptyOutDir` (then the folder was deleted).
- `npm run journal -- --file scripts/fixtures/journal-2026-01-15.jsonl --from 2026-01-15T00:00Z --to 2026-01-16T00:00Z`.
- `node --import tsx scripts/mkworld-tmp.mts` (a copy of the scratch `mkworld.mts`, deleted at once) for the snapshot fixture; `node mkfixture.mjs` (scratch) for the journal fixture.
- The section 1 readers (`node run.mjs`, `node lines.mjs …`) and `node madeup-day.mjs`.
- A PowerShell tail of `logs/dev.log` and `Get-ChildItem logs`.

## Notes
**Defects noticed and not touched** (section 1's executor findings first):
1. **First's `ach:the_reaper:1@First#2` (01:02:24 UTC) banked its own planned potions.**
   - The step planned "2 Air Boost Potion and 9 Minor Health Potion from the bank". First already wore 1 and 9 of them, left by step #1.
   - The reset unequipped both stacks and deposited them (01:03:27–01:03:39), and withdrew none back.
   - At the monster it swapped helmet and body armour (01:05:20), then walked back to the bank for a copper helmet and skeleton armour (01:06:09).
   - It won its one fight with no potion worn (01:07:11).
   - Two readings, neither traced: the reset's stash does not count worn stacks toward `take` when the step's take equals what is worn, or the fight item's round set (`desiredForJob(…, take)`) differs from the reset's. For 017's read.
2. **Second's full moon trip (01:12:12) took far less than it planned.**
   - Planned: "100 Minor Health Potion and 100 Small Health Potion and 72 Cooked Trout".
   - Withdrawn: minor ×54 and trout ×9 (01:13:41, 01:14:33), no small potions.
   - It walked back mid-trip for iron boots (01:18:45–01:19:41), lost a fight (01:32:00) and "ran dry after 12 fights" (01:36:01). One cape came of the 4 demanded.
   - Guess: the member's `take` (`eventMembers`) is planned from a pool that counts stock the bank no longer held, or that others had reserved.
3. **A tidy step's `units` is its last recycle's count.** `measure` reads the step's last counting item (`planner.ts:203-219`), so a step of three codes reports the third code's copies (the fixture's `tidy:copper_boots@Pia#1`: 16 planned, "11" done). Tidy steps are not sampled, so only the `end` record and the status show it.
4. **The verify skill (`.claude/skills/verify/SKILL.md:61`) still names `logs/dev.log`** for post-mortems. It is not on this task's list. The service on a spare port now writes under `logs/port-<N>/`.
5. **`ach:alchemist:2@Third` was blocked at 02:33:24 under 014's code**: "no Nettle Leaf (need 2) for Health Splash Potion", 95 planned, 94 crafted. Settled point 10 ends this from the restart.
6. **A spawn whose verdict is never set gets no `event` record.** That happens when nobody is free for its whole hour; the same holds for `eventPlans`.
7. **A level passed while the service is down has no `level` record.** The boot sync does not go through `act`. The status shows the levels.
8. **The meter's `""` bucket** (characters the planner does not own) grows with what they do and is never cut. It is small, bounded by the codes the catalog has; nothing reads it today.

**Guesses, most doubtful first:**
1. **The meter's side of section 2's comparison.** A gather's cooldown was taken as 21 s from the smallest gap of 21.87 s, and the round trip as 0.8–1.1 s an action. The log carries no echo.
2. **Why the boot line called Wooden Shield and Iron Armor outdated** (section 1): the solves' inputs, as reasoned there. The World of 08:49 is not in the log, so this was not recomputed.
3. **A made-up day of 134 kB.** It assumes meters the size of the scenarios' (a vampire step's of the kill's) and 8 events a day.
4. **The fixture of the snapshot** is composed, not written by the service. Its format is the one `journal-files` reads back from the real writer, and it decides on it.
5. **`end.wall` of a re-attached step counts the downtime** (`startedAt` is persisted). The meter's `s` does not.
6. **Records written before `boot` wait for it**, 100 at most. Only the offering catch-up does so today.

## To delete (Alex)
Nothing. `logs/dev.log` stays as the archive (settled point 1).
