# 013 — The fleet on events: who goes to a spawn, an event in the score, events in the forward model — report

## Summary
- **The log's spawns under the new rule would have paid nothing.** 23 monster and resource spawns (11-17 to 11-20): the two Strange Apparitions had demand (3,000 strange ore for strange_miner) but nobody stood at mining 35 (22–24); 15 monster spawns carry demand that cannot pay — nobody wins a demon, corrupted ogre or owlbear, efreet, grimlet or cultist emperor safely within ten levels with the bank of those days, the duskworm is a boss, the red dragon is behind a key; 6 nobody needed (the island's scorpions, the two Full Moons, the bat). Not one unit was lost by the rule's own measure: the fleet could not have taken them.
- **Deadline points 77 / 85 / 63 / 86 / 63** (A default, events attended; B potions free; C the field price always; D a win is enough; E no events) against report 012's 63 / 70 / 56 / 65. **Row E ends at 63 with report 012's row A's very days (33 / 38 / 52 / 62)**: nothing else of this task moved it.
- **What events pay this season**: 15 points by event work in row A — the_new_bandit +2 (day 16.2), cult_destroyer +2 (24.5), magic_lumberjack +2 (38.2), strange_miner +2 (38.8), magic_harvester +3 (59.0), its_malefic +4 (90.7) — on 149 character-hours (1.3% of the fleet's time), and more through what they open: the gold set at 30 from demon horns, capes and lizard parts (25 pieces, days 20–31), and king_of_the_goblins (+3, day 39.1) and cursed_wood_blessed_victory (+1, 55.8) follow, which E leaves waiting for gear; row A ends 14 above E.
- **The price comes early**: A is below E on day 7 (32 against 33) and day 14 (36 against 38). The calendar puts strange_miner and the two magic achievements behind mining and woodcutting 35, so the role holders level those lanes in the first fortnight (Second woodcutting 35 on day 7.2, Fourth's mining and woodcutting on 9.7 and 9.5; never in E) and the fighters reach 25 two to four days later; the_reaper (+3) comes on day 17.7 instead of 13.8. It pays from day 30 (56 against 52) and +14 at the deadline.
- **The next wall**: another layer (73 open points in every row), then the potion's price (87% of row A's fight hours are potion making). Events want mining and woodcutting 35 (days 5–10 in A) and fighters at combat 28–30 with the gold set (from about day 15); the gear above 38 comes through event materials only on day 86 (mithril legs and shields with lizard parts). Row B (potions free) is 8 above A: what the consumables round can be worth on top of events.
- No restart during the work: the service ran report 012's code (`[yewz]`, from 07:31:51 UTC) to the last line read (08:50:02 UTC).

## Decisions for Alex
1. **The spawn rate is the log's, not the docs'.** The docs give a 1/rate chance a minute; the log's 69.2 hours hold 33 spawns where that reading expects 54.2 (± 7.4, three standard deviations short). The task said the docs decide unless the log is clear; I took it as clear and set `SPAWN_LOG` 1.64 (`src/plan/planner/config.ts:79`): every calendar is 64% longer than the docs' (29 / 43 / 56 h between spawns at rate 1000 / 1500 / 2000). With 1 the calendars shorten and row A would gain; say if the docs should decide.
2. **The trip ends with the step's own bank reset, not with deposit-all.** Settled point 5 lists `[reset and set, fight or gather ×∞, deposit-all]`; the scenario showed a craft step resuming in the trip's whole fight set (a craft item has no gear self-heal). The smallest repair I found is in the trip, not in the runner: its last item is the step underneath's own first item (its reset), which banks the drops as deposit-all did and puts the step's set back on; deposit-all stays when the step has no reset first (`src/state/eventorders.ts:103-107`, `src/plan/planner/events.ts:406-412`). `queue.ts` and `exec.ts` are untouched. If you want the settled trip exactly, the alternative is a gear self-heal on the planner's craft items in `queue.ts` (it would also swap sets inside today's sourced craft steps).

## How Alex verifies
1. `git log --oneline -2` → `013: events` on top of `Rework notes` (`a7a1fe5`); `git status` clean.
2. `npm run check` → `60 checks: 59 ok, 1 known defect reproduced, 0 failed` (`repeat-spin`; about 90 s): report 012's 52 plus `event-enough`, `event-fleet-monster`, `event-late-offering`, `event-not-needed`, `event-resource-skill`, `event-skips-unable`, `event-too-far`, `planner-inflight-left`.
3. `npm run check -- planner` → about 18 minutes (the 30-minute backstop holds); ends `OK (… invariant checks, 54 made-up cases; deadline points 77 / 85 / 63 / 86 / 63)` (A / B / C / D / E). It prints `## The mean time between spawns`, `## Every logged spawn under the new rule`, `## Events in the score`, `## What events add to the score` (twice), every row's `events` share in `hours by answer`, row A's `events (task 013; per code …)` block, and `## What the events cost`.
4. `npm run typecheck` prints nothing after `tsc --noEmit`; the scratch build succeeded (see "Commands run").
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → `CLAUDE.md`, `tasks/013-events.md`, `tasks/013-events.report.md`, `src/catalog/index.ts`, `src/plan/planner/{bundle,config,decide,events,forward,gates,gear,supply,targets,types}.ts`, `src/state/{eventorders,planner,sync}.ts`, `scripts/check-planner.mts`, `scripts/harness/{index,late}.mts`, `scripts/scenarios/{event-enough,event-fleet-monster,event-late-offering,event-not-needed,event-resource-skill,event-skips-unable,event-too-far,planner-inflight-left}.mts` — all allowed (`targets.ts` is in `src/plan/planner/*`; `late.mts` is harness).
7. **After the restart — not checked by me** (the restart is Alex's):
   - the poll runs every 2 minutes (an open event-gated objective exists all season): `api GET /events/active` lines about 2 minutes apart;
   - the first monster or resource spawn gets one `plan: event <code> at (x, y) until HH:MMZ — …` line, after the first achievements read. With today's fleet expect **"does not fit"** for every monster event (nobody wins one within ten levels yet) and for the apparitions **"demand: 3000 Strange Ore for strange_miner …; members: none; not: First — gate: mining 23 < 35, …"** (Fifth 25) — no interrupt;
   - a Full Moon, Silent Night or the island's events: "nobody needs it", no interrupt;
   - no `plan <name>: ach:strange_miner…`, `ach:magic_…`, `ach:the_new_bandit…` or `src:<event material>` step;
   - once a miner reaches 30, its `lvl:mining:35` why gains "; strange_miner behind it, by 12 spawns of Strange Apparition, about 28 days with 3 members".

I ran 2–5 on the final code; 1 and 6 after the commit.

## The night and the spawns
Read as a stream from `logs/dev.log` (never copied) by scratch readers — a background agent wrote and ran most of them; I re-read the parts I quote. **Window: 2026-11-19 21:49:12 to 11-20 08:06:13 UTC** (10.3 h; the service kept writing; the tail to 08:50:02 holds no restart and no spawn). Code references are to HEAD before this task (`1d76174`) unless they say otherwise.

**One restart.** `[50ry]` (011's code, `f4d4118`) wrote its last line at 07:31:40.686; `[yewz] server start (prod) on :5173` at 07:31:51.495 runs report 012's code. 07:31:52.190: `queue resumed after reload` ×5 and `re-attached` ×5 (`ach:intermediate_lumberjack:0@First#1`, `…@Second#1`, `lvl:alchemy:20@Third#1`, `ach:intermediate_lumberjack:0@Fourth#1`, `ach:intermediate_fisherman:0@Fifth#1`). No take-over. Fourth and Fifth answered 499 once (07:31:52.524, .740): the old process's cooldown, waited out (`src/api/client.ts:127`).

### Steps per character
Units planned/done; hours planned/taken (taken = from the step's line to the next, less interrupts at the head). Brackets: started before 21:49:12. Every `src:` step is for diamond_in_the_sky.

| who | steps |
|---|---|
| First | (20:35:55 `src:diamond_stone#2`, 210/210, 1.5/1.48 h) · 22:04:30 `#3` 213/213, 1.5/1.50 · 23:34:15 `#4` 213/213, 1.5/1.54 · 01:11:13 `#5` 211/211, 1.5/1.50 · 02:41:06 `ach:i_want_bacon:0#1` 38/38, 1.5/0.71 · 03:23:43 `#2` 45/45, 1.5/0.77 · 04:09:51 `#3` 68/68, 1.5/1.19 · 05:21:26 `#4` 50/50, 1.0/0.79 · 06:09:07 `#5` **3/3**, 0.1/0.07 · 06:13:31 `ach:intermediate_lumberjack:0#1` 161/161, 1.5/1.52 · `[yewz]` 07:44:59 `lvl:mining:35#1` 153 planned, 37 by 08:06 |
| Second | (21:39:23 `lvl:combat:25#3` 79/79, 1.5/1.41) · 23:03:44 `#4` 81/81, 1.5/1.50 · 00:39:34 `#5` (highwayman) 69/69, 1.5/0.96 — combat 25 · 01:36:56 `src:diamond_stone#1` 209/209, 1.5/1.57 · 03:11:05 `ach:i_want_bacon:0#1` 38/38, 1.5/0.75 · 03:56:10 `#2` 62/62, 1.5/1.24 · 05:10:42 `#3` **5/5**, 0.1/0.11 · 05:17:33 `ach:worker:1#1` 58/58 steel bars, 1.5/1.70 · 06:59:24 `ach:intermediate_lumberjack:0#1` 163 planned, 119 by 08:06 |
| Third | (20:55:38 `src:diamond_stone#3` 211/211, 1.5/1.48) · 22:24:24 `#4` 213/213, 1.5/1.50 · 23:54:07 `#5` 213/213, 1.5/1.54 · 01:31:24 `#6` 209/209, 1.5/1.49 · 03:00:55 `gear:skeleton_armor#1` (parent First's need), 1/1, **0.0**/0.02 · 03:02:04 `ach:i_want_bacon:0#1` 38/38, 1.5/0.78 · 03:48:57 `#2` 57/57, 1.5/1.24 · 05:03:06 `ach:worker:1#1` 58/58, 1.5/1.54 · 06:35:31 `lvl:alchemy:20#1` (air boost potions) 50 planned, 0 made by 08:06: 375 green slimes at `+0 xp`, 06:37:13–07:57:26 |
| Fourth | (21:42:09 `src:diamond_stone#3` 212/212, 1.5/1.49) · 23:11:50 `#4` 213/213, 1.5/1.52 · 00:47:58 `#5` 213/213, 1.5/1.52 · 02:19:24 `#6` 210/210, 1.5/1.52 · 03:50:39 `ach:i_want_bacon:0#1` 57/57, 1.5/1.34 · 05:11:15 `#2` 55/55, 1.2/1.17 · 06:21:27 `#3` 45/45, 0.9/0.94 · 07:18:02 `ach:intermediate_lumberjack:0#1` 161 planned, 83 by 08:06 |
| Fifth | (20:49:14 `src:diamond_stone#2` 210/210, 1.5/1.47) · 22:17:26 `#3` 213/213, 1.5/1.50 · 23:47:27 `#4` 213/213, 1.5/1.55 · 01:24:56 `#5` 210/210, 1.5/1.50 · 02:54:50 `ach:i_want_bacon:0#1` 38/38, 1.5/0.68 · 03:35:23 `#2` 52/52, 1.5/0.83 · 04:25:27 `#3` 74/74, 1.5/1.36 · 05:47:13 `ach:worker:1#1` 21/21, 0.5/0.64 · 06:25:36 `ach:intermediate_fisherman:0#1` 164/**165** (a gather repeated across the restart), 1.5/1.54 · `[yewz]` 07:57:57 `lvl:mining:35#1` 153 planned, 13 by 08:06 |

The 15 pig steps ran 0.68–1.36 h against 1.5: 011's kill price was about 1.75 × the measured.

### Samples against their estimates
| time | who | key | measured | estimate | × |
|---|---|---|---|---|---|
| 22:04:30 – 23:54:07 (7) | the miners | `gather:copper_rocks` | 25 s | 25 s | 1.00 |
| 00:47:58 – 03:50:39 (9) | the miners | `gather:copper_rocks` | 26 s | 25 s | 1.04 |
| 23:03:44, 00:39:32 | Second | `kill:skeleton` | 64, 67 s | 128, 127 s | 0.50, 0.53 |
| 01:36:38 | Second | `level:combat:24` | 15,583 s | 33,420 s | 0.47 |
| 01:36:56 | Second | `kill:highwayman` | 50 s | 82 s | 0.61 |
| 03:23:42 – 07:18:02 (15) | all | `kill:pig` | 57–85 s | 104–147 s | 0.50–0.74, median 0.57 |
| 06:25:35, 06:35:30, 06:59:23 | Fifth, Third, Second | `craft:steel_bar` | 110, 96, 105 s | 326 s | 0.29–0.34 |
| 07:44:57, 07:57:56 `[yewz]` | First, Fifth | `gather:birch_tree`, `gather:trout_spot` | 34 s | 33 s | 1.03 |

All on 011's prices but the last two; 012's kill and craft prices have no sample yet.

**Completed**: a_helping_hand +2 at 00:36:03 (the fifteen offerings of 00:05; claim Second 00:36:57), adept +2 at 02:06:03 (Second at 25; claim Fourth 02:06:29), i_want_bacon +2 at 07:18:02 (claim Second 07:18:40).

### Every notable line
None of `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`, `offering interrupt issued again`, `comes back at`, `took over`, `not a safe win`, `slower than expected`, a paused queue, `interrupt event`, `interrupt merchant`. 1,317 fights, all `fight win`.

| time | line(s) | verdict |
|---|---|---|
| 21:50:06 → 01:52:20 | 30 `network error — retry n/6` (worst 3/6, Fifth 00:31:01–27) | as designed: all recovered (`src/api/client.ts:63-80`) |
| 04:01:59, 05:22:00 | Third `bank/withdraw/item -> 404`, then `bank changed — replanning` | as designed: a sibling took the stock (`src/state/exec.ts:205`, `:272`) |
| 05:05:13, 05:19:09 | Fourth `unequip -> 483 … not enough HP`, then ok 5 s later after eating | as designed (`exec.ts:176-184`) |
| 07:31:52 → 07:57:56 | Fifth's trout item ended at 165 of 164 | small defect, report 012's: the counter is written after the cooldown wait (`src/state/queue.ts:363-365`) |
| 05:10:42 Second `ach:i_want_bacon:0#3` "5 now"; 06:09:07 First `#5` "3 now" | 5- and 3-pig steps with a full reset each; Fourth stood at 46/55 | **defect** — settled point 9, repaired (section 5) |
| 03:00:55 | `gear:skeleton_armor … 0.0 h` | 011's code (no `stepSec`); 012 prices it (`decide.ts:262` at `1d76174`) |
| every `src:` line | `supply: supply: …` | cosmetic; repaired (section 5) |
| 23:26:15 Cult of Darkness, 01:11:23 Corrupted Owlbear | no dispatch, no line | the old client: "nothing to do" went to `eventPlans` only (`eventorders.ts:83-85` at `1d76174`); the new rule writes the line |

### Report 012's acceptance step 7 (decisions after 07:31:51 — two by 08:06)
- **(a) a miner's `src:diamond_stone` node**: not exercised. The chain's last stone was banked at 02:29:36; no `src:` step since.
- **(b) the `lvl:mining:35` why**: twice. 07:44:59.614 First: `lvl:mining:35@First#1 (level, 153 units, 1.5 h) — level: mining 23 → 35 for Diamond in the chain of diamond_in_the_sky (+3 pts, chain ~73 h, of it the road 73 h by Fourth); Coal at 2042 XP/h`; 07:57:57.162 Fifth the same from 25, coal at 1,940 XP/h. Two miners on one road for the same 3 points, priced "by Fourth", who is woodcutting: the rule as written (every role holder is a candidate, `decide.ts:297-302` at `1d76174`) — noted. Mining XP is not in the log (gather lines carry none); coal gathers run about 32 s.
- **(c) combat level steps**: none after 07:31:51. Under 011's code: Second's skeleton steps read 0.53 and 0.54 XP/s and ran 0.61 and 0.51 (the favor ended at 00:00); the highwayman step read 0.37 and ran 0.64 (favor × 1.5 from 00:06).
- **(d) a `mat:`, `gear:` or trade step at 0.0 h**: none after 07:31:51.

### Report 011's acceptance step 7
Exercised once, under 011's code: 03:00:55.507 Third `gear:skeleton_armor … for First (i_want_bacon (pig)) — the best: First, i_want_bacon (pig): H0 26 h, with it 17 h + 0.0 h to make`. The kill objective stands beside one character (First) ✓; First's and Fifth's pig steps did not cover the 725 left ✓. The armour was then worn by Third and Second, never by First — the parked "a made piece in every fighter's pool".

### The diamond chain (21:49 → 02:29:36)
Every chunk at the copper rocks (2, 0): First 672 gathers, Third 716, Fourth 832, Fifth 703, Second 209 — **3,132 gathers (about 22 character-hours) for 3 stones** (First 23:55:45, Third 00:51:24 and 01:45:01), plus emerald ×24, ruby ×17, sapphire ×16, topaz ×7. Short stones went 3 → 2 → 1 (00:39:20, 00:58:47 banked). **A defect, noted**: Fourth's `#6` (02:19:24, 210 gathers) was planned 34 minutes after the last stone lay in Third's bag; the bill counts the bank only (`src/plan/planner/stock.ts:43-46`). From 02:29:36 the chain waits for the craft (mining 35); 012's code made it the miners' level candidate (above).

### The offerings of 00:05 UTC on 11-20
Five `interrupt offering` at 00:05:00.020. Every character: combat `…_10_20` ("can't get 4× Full Moon Vampire Cape — taking the 10–20 bracket": the 21–30 bracket asks for an event drop), fishing `…_10_20`, woodcutting `…_21_30` (First, Second, Fourth) or `…_10_20` (Third, Fifth). Everything from the bank; no `skipped:`.

| who | hunt fights / lost | completed | inside the interrupt |
|---|---|---|---|
| Second | 0 / 0 | 00:07:19 +3,050 · 00:08:29 +1,800 · 00:09:40 +2,550 | 00:05:00 → 00:09:44, 4.7 min |
| Third | 0 / 0 | 00:07:33 +2,300 · 00:08:43 +1,625 · 00:09:53 +1,625 | 00:05:14 → 00:09:57, 4.7 min |
| Fifth | 0 / 0 | 00:07:33 +2,550 · 00:08:44 +2,050 · 00:09:54 +1,625 | 00:05:14 → 00:09:57, 4.7 min |
| First | 0 / 0 | 00:07:40 +2,550 · 00:08:50 +1,275 · 00:09:59 +2,300 | 00:05:22 → 00:10:03, 4.7 min |
| Fourth | 0 / 0 | 00:07:42 +2,550 · 00:09:05 +1,450 · 00:10:15 +2,300 | 00:05:22 → 00:10:19, 5.0 min |

15 completions, 31,600 XP, 0.40 character-hours; the 15 favors completed a_helping_hand at 00:36:03.

### Every spawn the log holds
35 `⚡` lines from 11-17 10:51:33 (`[d6ua]`, a :5199 run's read of the live list) to 11-20 01:11:23: **33 distinct spawns** (two lines re-logged at their own expiry after the 4 Hz clock pruned them: 11-18 05:57:13 Herbal, 19:27:43 Timber — `src/state/sync.ts:80-88`). The :5173 service was down 38.9 minutes in all over 69.2 h, never as long as a spawn (the longest gap 29.7 min, 11-19 08:46–09:15); boot reads the list, so none was missed whole. **The client never sent anyone to a monster or resource spawn**: no `interrupt event` line in the whole log; merchants were served four times (11-17 23:31 Fifth Nomadic — sold 3 eggs, withdrew 72,000 gold, no `npc/buy` line followed; 11-18 02:36 First Fish; 10:32 Fourth Fish; 18:02 First Timber, 3,095 sap in 58 sells).

Every monster and resource spawn under settled points 2–4, on the fleet as it stood then (`npm run check -- planner`, `## Every logged spawn under the new rule`: the 11-18 snapshot before 11-19 09:15, report 012's levels of 11-19 19:21 on 11-19, the log's end on 11-20; the bank of 11-17 with the pieces crafted since):

| time (UTC) | code | tile | the client did | the new rule: demand → who |
|---|---|---|---|---|
| 11-17 11:03, 11-18 19:47 | strange_apparition | (-4, 12), (9, 11) | nothing | 3,000 strange ore for strange_miner → nobody: mining 21–24 < 35 |
| 11-17 20:06, 11-18 00:31, 11-20 01:11 | corrupted_owlbear | (10, 2) | nothing | 800 corrupted gems for corruption_eradicator (26,667 kills) → does not fit: ∞ spawns (nobody can ever be a member) |
| 11-17 23:21, 11-18 11:47, 14:20, 16:42, 11-19 12:31, 18:52 | portal_demon | (-3, 7), (-3, 9), (-1, 5) | nothing | 500 demons for closing_the_gate → does not fit (∞; and its efreets and grimlets never fit) |
| 11-17 23:41 | corrupted_ogre | (8, -4) | nothing | 800 corrupted gems (40,000 kills) → does not fit (∞) |
| 11-18 01:46 | portal_efreet_sultan | (-4, 6) | nothing | 500 efreets for closing_the_gate → does not fit (∞) |
| 11-18 04:22 | small_becomes_great | (8, 4) underground | nothing | dragon bones and scales for draconic_harvest → does not fit (keyed layer) |
| 11-18 06:12 | corrupted_portal | (4, 10) | nothing | 500 grimlets, 800 gems → does not fit (∞) |
| 11-18 12:52, 11-19 03:05, 18:12 | sunsting_awakening | (-1, 19), (0, 18) | nothing | nobody needs it (the island) |
| 11-18 18:22 | silent_night | (-3, 5) underground | nothing | nobody needs it |
| 11-18 20:09, 11-19 11:31 | full_moon | (10, 8) | nothing | nobody needs it (no open need asks for a cape yet) |
| 11-18 22:59 | out_of_the_ground | (-1, 19) underground | nothing | the duskworm (a boss) → does not fit |
| 11-19 23:26 | cult_of_darkness | (-1, 12) | nothing | 1 cultist emperor (cult_destroyer), 24 malefic shards (its_malefic) → does not fit (∞) |

Per event code (settled point 7's check, `## The mean time between spawns`):

| code | seen | the docs expect (69.2 h ÷ (rate + duration)) | the client: sent / units | the new rule: members / units | lost |
|---|---|---|---|---|---|
| portal_demon (1000) | 6 | 3.9 | 0 / 0 | 0 / 0 | 0 |
| corrupted_owlbear (1000) | 3 | 3.9 | 0 | 0 | 0 |
| corrupted_ogre (1000) | 1 | 3.9 | 0 | 0 | 0 |
| bandit_camp (1000) | 0 | 3.9 | — | — | — |
| sunsting_awakening (1500) | 3 | 2.7 | 0 | 0 (nobody needs it) | 0 |
| full_moon (1500) | 2 | 2.7 | 0 | 0 (nobody needs it) | 0 |
| silent_night, small_becomes_great (1500) | 1, 1 | 2.7 each | 0 | 0 | 0 |
| attacking_the_island (1500) | 0 | 2.7 | — | — | — |
| herbal / fish / timber / nomadic / gemstone merchant (1500, 90 min) | 4 / 2 / 2 / 2 / 0 | 2.6 each | merchants: 4 served | (not this task) | — |
| strange_apparition (2000) | 2 | 2.0 | 0 | 0 (gate: mining) | 0 |
| corrupted_portal, cult_of_darkness, out_of_the_ground, portal_efreet_sultan (2000) | 1 each | 2.0 each | 0 | 0 | 0 |
| magic_apparition (2000) | 0 | 2.0 | — | — | — |
| **all** | **33** | **54.2 ± 7.4** | | | |

Character-hours and units lost under the new rule: none — no owned character could have been a member of any of them.

### What the log says the next task should fix first
1. Nobody can be a member of any monster event yet: at the log's end no fighter wins one safely within ten levels (`## Events in the score`), so the next event points come through levels and gear (combat 28–30, the gold set), not through dispatch.
2. Bag stock is not stock: a 210-gather diamond chunk was planned 34 minutes after the last stone lay in a bag (`stock.ts:43-46`).
3. Two miners take `lvl:mining:35` for one craft's 3 points, the road priced "by Fourth".
4. 011's kill price was 1.75 × the measured (pig 0.57 median), craft 3 ×; 012's prices still await their first samples.
5. A made piece goes to whoever resets first (the skeleton armour of 03:00:55).
6. A restart repeats one action of a running item (Fifth's 165th trout).

## Who goes to a spawn
### The function
`eventMembers(event, world, busy = {}, demand?)` in `src/plan/planner/events.ts:312-386`, pure; it returns an `EventPlan` (`:249-258`): the demand (`Demand`, `:155-165`), the members (`Verdict`: actions, the seconds of the spawn it works, its set), every other owned character with its reason, and the line.
- **The demand** (`eventDemand`, `:197-242`, settled point 2): open `ach:` targets whose work kills the event's monster, or a drop of it, or gathers a drop of its node (`config.exclude` is already out of `targetsOf`), and the event-only materials short in the open parents' bills — the objective parents and the gear pieces, as `rank()` builds them (`materialNeeds`, `:172-188`, through `supplyNeeds`; the gear parents come from `gear.ts gearPieces`/`pieceParent`, `:311-329`, which `rank()` now uses too). Units go to actions at this content (one action serves every demand: the spawn's demand is the largest). **Can still pay** (settled point 4): an objective's achievement completes by the deadline at this event's calendar with `possibleMembers` (`:89-113`: a node's skill or the lane's role; a safe win now or within ten levels by `winLevel`; a free route; no boss), every other event objective of it at its own event, no unhandled objective and no layer or group gate; a material's parent fits the deadline with its calendar in its hours. Items that do not fit are named in the line with the spawns needed and expected.
- **Who** (settled point 3, `:335-382`): every owned character that is on; `busy` from the runtime — `group`, `offering` (after 22:00 UTC), another spawn's key (its trip), `done:<key>` (its trip to this spawn was removed); a boss is nobody's; the node's level; a free route — the walk is to the nearest bank (the reset) and from it to the live tile (`walkTo`, `:279-283`); at least `EVENT_MIN_SEC` (15 min, `config.ts:72`) of the spawn left after the walk and `STEP_BANK_SEC`. Then one at a time: the candidate with the most actions in its time first (`contentSec`, `:77-83`: a kill's own seconds — fight and rest × `KILL_LOG` + its walks, potions free inside the hour, settled point 3; a gather's `actionSec`), each on the pool less the earlier members' sets (`withSet`, `:293-297`, puts a member's set into `world.current` so `stock.ts reserved` takes it out of the next pool), while the demand left exceeds what the members so far bring. A candidate left over is "not needed", or "gate: no safe win (on the pool the members before it left)".
- **Two spawns** (`eventPlans`, `:388-400`): ordered by the demand's score (points ÷ calendar hours, the best item), the members of the first are busy for the next.

### The runtime
`src/state/eventorders.ts`: `reactToEvents` (`:134-157`) runs the old orders first, with a monster or resource order offered only to characters the planner does not own (`orderFor`, `:66-81`); then `ownedEvents` (`:110-131`) asks the core for every live monster or resource spawn, **at every poll while it is up**, once the first achievements read is in (`:113`). Each member gets `interrupt(name, "event", tripOf(content, backTo(name)), eventKey)` (`:124`); one `plan: event …` line when the spawn is first seen, `plan: event <code> — joins: …` when someone joins later (`:127-128`). `eventPlans` (the synced signal) holds per spawn key "Ann, Ben: fight until the event ends" or "nothing to do — <the reason>" (`:129`).
- **Seen again**: `interrupt()` is idempotent per (class, spawn key) (`src/state/planner.ts:437-449`); a member on the trip is `busy` with the key and counts with what is left of the hour (`events.ts:340-345`); a character that became capable, or free of its group or its offering, joins at the next poll. A spawn found "nobody needs it" or "does not fit" is not evaluated again in its hour (`eventorders.ts:118`; the evaluation reads gear needs). A member whose trip was removed (a pause) is not sent to the same spawn again (`sent`, `:100`, passed as `done:<key>`).
- `src/plan/events.ts` is unchanged: `fieldOrder` stays for characters the planner does not own; merchants are untouched.

### The trip (settled point 5)
`tripOf` (`events.ts:406-412`): `[{gear, job: fight <monster> | gather <skill>, reset: true}, {fight ×0 | gather ×0, gear: true}, <the step's own reset | deposit-all>]`.
- **The set**: the membership gate solves with the core's `fightRec` on the member's pool (bank less the others' reservations, plus its own; `reach.ts potionPrice`, the stock-covered price); the trip's reset wears the executor's choice (`desiredForJob` → `jobgear.ts jobGear` over the live bank, `potionPriceOf(bank)`), as every step's reset does. The two can differ by a piece.
- **What it reserves**: nothing of its own — it is not a `Step`. The member's step stays in `world.current` with its `withdraw` and `wear` reservations (the reset puts the step's set into the bank, still reserved for it); the trip's set leaves the bank when withdrawn, so no pool holds it. Between a poll and the member's reset another character could plan with a piece the trip will take; the executor's 404/478 handling covers that race (`exec.ts:205`, `:272`).
- **The resume** (read in `src/state/queue.ts`, `exec.ts`): the item underneath keeps its id and its `done`; a fight item re-derives its set each round (`queue.ts:461-465`: `desiredForJob` fight → `gearSwapStep`) and provisions potions; a gather item likewise for its gathering set (`:358-362`); **a craft item has no gear step** (`:368-433`): it re-withdraws what its bag lacks (`:384-424`) but would craft in whatever is worn. The `event-fleet-monster` scenario showed exactly that — Cat's copper bars resumed in the whole mithril set. Repaired in the trip (Decision 2): its last item is the step's own first item, its reset (`eventorders.ts:103-107`), which deposits everything — the drops too — and wears the step's set; a step whose first item is not a reset (a task loop, a trade) keeps deposit-all. `queue.ts` and `exec.ts` are not changed.

### The poll
`eventPollMs` (`eventorders.ts:161-164`), called by `watchEvents` (`src/state/sync.ts:67`): 2 minutes while an owned character's world has an open target with an event gate or an event-gated input (`events.ts eventDemandOpen`, `:474-477`, no bill opened), else 5 minutes. **30 or 12 requests an hour of the data bucket's 2,000**; this season it is 2 minutes from the first read on (strange_miner, the magic achievements, the_new_bandit … are open).

### `rank()`
`src/plan/planner/decide.ts:193`: an objective target with an `event` gate is skipped, live or not; `:254`: a supply need whose source carries an event gate (an event-only material) is skipped; `supply.ts:234` (`inStep`): an event input never makes an objective's own step source it in the field. `floorH` is gone (`:199` is now `h <= calH`). Levelling and `src:` gathers that happen to pick a live event's tile (`pickMonster`, `pickNode`, `pickSource`) are as they were. **A persisted step of report 012's code on an event-gated target** (none runs today: the five re-attached steps are lumberjack, alchemy, fisherman and two `lvl:mining:35`) would be re-attached at the restart (`src/state/planner.ts:588-591`), run until its tile disappears and its item is skipped (`queue.ts:355`, `:457`), and the next decision never plans one again.

### Scenarios (all pass)
- `event-fleet-monster`: Ann (chickens), Ben (copper ore), Cat (copper bars from the bank), level 40, three lizard sets in the bank, 3,000 lizard kills open; the bandit camp spawns at 5 min. All three trips at the head within one 2-minute poll; the trip `[gear, fight, gear]`; each fights 10+ lizards (all wins) until the tile goes; the drops in the bank, none in a bag; each resumes the same item with its counter and works it in its own set; one `plan: event` line naming the demand and the three; no bounce.
- `event-skips-unable`: Ben at combat 20 cannot wear the level-40 set — "Ben — gate: no safe win", no trip; Ann goes.
- `event-too-far`: 16 minutes left at the start — "Ann — too far: N min would be left" (N under 15), no trip, one line.
- `event-resource-skill`: Strange Apparition, 3,000 strange ore; Ann and Ben (mining 35) gather, Cat "gate: mining 20 < 35"; the ore reaches the bank.
- `event-not-needed`: no demand — one line "nobody needs it" over six polls, no trip; the poll stays at 5 minutes.
- `event-enough`: 5 lizard kills open, three capable — one member, the other two "not needed: the members bring the demand".
- `event-late-offering`: the clock starts at 21:50 UTC; at 22:05 Ann's offering interrupt (60 feathers) is open — "Ann — its offering first (after 22:00 UTC)", Ben goes.
- **What the harness had to learn** (`scripts/harness/index.mts`): `fieldEvent(code, content, x, y, from, minutes)` (a spawn to push into `t.world.events` mid-scenario), `lizardSet(k)` (a set that wins the lizard safely at 40, found by `bestInSlot` over every item; without potions — the executor takes a 100-stack whole and banks the rest, a bounce at the steps' own first reset), `eventLines(t)`; `scripts/harness/late.mts` (imported first, it starts the clock at 21:50 through `AMMO_CHECK_NOW`, which the clock already reads for a second boot). The fake needed nothing: it already overlays live event tiles and drops expired ones (`fake.mts:220-223`, `:594`).

### Made-up cases (`scripts/check-planner.mts`, section 5d)
- **The gear of the first member is not counted for the second**: two fighters at 40, one lizard set — "members: Second (≈306 kills in 59 min); not: First — gate: no safe win on the pool the members before it left"; with two sets both go.
- **Two spawns at once**: the bandit camp (score 0.069) takes both fighters; the Strange Apparition's line says "First — on the trip to bandit_camp, Second — on the trip to bandit_camp".
- **A material of a gear need**: a miner at 40 (the role) on 20,000 gold ore; the gold pickaxe (−40% a gather, two demon horns) is its tool by need (H0 260 h, H1 156 h, G 29 h) → the Portal (Demon)'s demand: "2 Demon Horn for Gold Pickaxe for First" (the log's fleet has no such need: none wins a demon). And an objective parent's: 30 strange ore for five strangold bars.
- **A demand that does not fit**: ten days left, one miner — "does not fit: 3000 Strange Ore for strange_miner (3000 gathers) does not fit (35 spawns needed, 4.3 expected by the deadline)".
- The miner at 35 with the Strange Apparition live: no step on strange_miner; it is the event's member (this replaces report 007's case "→ the event node", which settled point 1 overturns).

## An event in the score
### The calendar function
`calendar(ev, actions, members)` in `src/plan/planner/events.ts:127-136`: whole spawns needed = ⌈actions ÷ Σ(usable seconds ÷ a member's seconds an action)⌉ × `gapSec(ev)` (`:61`); also the character-hours (the exact spawns × members × usable seconds). `usableSec` (`:70-73`): the duration less half a poll (`EVENT_SEEN_SEC` 60 s), `STEP_BANK_SEC`, and twice the tile's walk to its bank (≈ 55–58 min). Callers:
- the runtime's "can still pay": `eventDemand` (`events.ts:226`, `:234`, and `othersFit` `:211`), with `possibleMembers`;
- `bundleOf`: `bundle.ts:150-163` (`eventPart`), with `membersAt` (`events.ts:117-121`);
- the bills: `supply.ts:198-201` (`billOf` → `materialCal`, `events.ts:145-151`), which `objectiveParents` (`supply.ts:243-274`), `supplyNeeds`, `gear.ts candidatesOf`/`makeHours` read through `bill.hours`;
- `waitingOf`: `forward.ts:272-280` (`evStuck`);
- the forward model: `sharesOf` (`events.ts:433-449`) through `eventMembers` and `eventDemand`.
It replaces `floorH` (deleted from `decide.ts rank()`).

### The mean time between spawns
- The docs: "an event has a 1/rate chance per minute to appear and stays for its duration (60 min, merchants 90)" (`docs/design/planner.md:669-671`, quoting the game's events page); `docs/api/openapi.json:1` `EventSchema`: `rate` "Rate spawn of the event. (1/rate every minute)", `duration` "Duration in minutes", `cooldown` "Cooldown in minutes before the event can be spawned with gems"; `docs/audit/domain-rules.md:184`. So `cooldown` (120 for every event) bears on gems only; I read the natural chance as running while the event is not up: (rate + duration) minutes between spawns.
- `public/data/events.json`: `duration`, `rate`, `cooldown`, `price` (50 gems), the tiles. `src/catalog/index.ts:21-30`, `:41`, `:60`, `:82` now load it as `catalog().events` (the atlas's events lack the tiles and the cooldown).
- The log (the table above): 33 spawns where the docs expect 54.2 ± 7.4 — monster and resource events 23 against 41, merchants 10 against 13. **The planner uses (rate + duration) minutes × `SPAWN_LOG` 1.64** (54.2 ÷ 33; `config.ts:73-79`, a made-up case asserts it equals the printed ratio): 29, 43 and 56 hours at rate 1000, 1500 and 2000 (Decision 1).

### `bundleOf`, `unmetGates`, `outOfReach`
- `bundle.ts:108-122`: an achievement whose missing gates, the event left aside, are levels or wins of this lane enters the bundle at that level; a gathering lane's only for its role holders (`:111`); `eventPart` (`:150-163`) gives its own hours (the event work's character-hours plus its other objectives') and its fit hours (its calendar, or the longest of several) with the members at that level; nobody → it stays out, as before. `bundleScore` fits by `b.cal` (`:167`). `decide.ts:224-226` adds to the why "; strange_miner behind it, by 12 spawns of Strange Apparition, about 28 days with 3 members".
- `gates.ts:23-30` `unmetGates`: a win gate is solved also when the other missing gates are levels and events (else an event achievement never reached its win level).
- `outOfReach` (`gates.ts:33-41`) is unchanged and still says "an event" for a gate that is not live — but `billOf` no longer asks it about an event-only source when `config.events` is 1 (`supply.ts:161-166`): the leaf is made, priced by its calendar, and only its other gates (a layer, a boss, an achievement tile) can still put it out of reach. `inStep` and trades still use it (an event merchant's trade stays out).
- `targets.ts:21-34` `placeGates`: an event whose tiles no free route reaches (the island's sea marauders and scorpions, the lava underground's dragons, the duskworm's) also carries a `layer` gate — settled point 10's "no member".
- `gear.ts:285-287`: an event monster's kill objective is a need like any other (its event gate counts as met for who may work it); `gear.ts:96-100`: a piece whose event material has nobody who can ever be a member is rejected and says so.

### Made-up cases
- An event achievement behind a gathering level: strange_miner in Fifth's mining bundle at 30 → 35 (12 spawns, 28.2 days, 3 members), in Second's none (no mining role). Fifth's candidate: "mining 30 → 35: +2 pts behind it (strange_miner), 41 h to the gate; strange_miner behind it, by 12 spawns of Strange Apparition, about 28 days with 3 members; Gold Ore at 2305 XP/h".
- One member against three: with only Fifth on, 34 spawns; with three, 12; the deadline between them → fit 0 against fit > 0.
- An event monster's achievement behind a combat level: First at 31 with a level-40 set in the bank wins the lizard at 40 → its combat bundle is "→ 40: the_new_bandit" (1 spawn, 1.2 days, 1 member).
- A parent with an event material: five strangold bars ~57 h, of it the strange ore's calendar 56 h; with nobody that can mine strange rocks on, the parent is gone and `waitingOf` says "an event".

### On the fleet at the log's latest levels (`## Events in the score`, `## What events add to the score`)
The fleet at 08:06 UTC on 11-20: combat First 23, Second 25, Third 22, Fourth 23, Fifth 23 (the snapshot's XP plus every combat XP logged since, levelled by `xpNeeded` — the same reconstruction as report 012); mining First 23, Fifth 25, alchemy Third 19 (the plan lines); the rest the snapshot's; the bank of 11-17 with the pieces crafted to 11-19 19:21.

| event (content, gate) | demand | members now / ever | a member a spawn | spawns needed / by the deadline | days | fits |
|---|---|---|---|---|---|---|
| strange_apparition (strange rocks, mining 35) | 3,000 strange ore — strange_miner | none / First, Fourth, Fifth | 89 gathers | 12 / 42 | 28 | yes |
| magic_apparition (magic tree, woodcutting 35) | 500 magic sap — magic_harvester; 3,000 magic wood — magic_lumberjack | none / First, Second, Fourth | 90 gathers | 19 and 12 / 42 | 45 and 28 | yes |
| bandit_camp (lizard 25) | 100 kills — the_new_bandit | none / nobody | — | ∞ / 81 | ∞ | no |
| portal_demon (30) | 500 kills — closing_the_gate | none / nobody | — | ∞ / 81 | ∞ | no |
| corrupted_ogre (20), corrupted_owlbear (30) | 800 corrupted gems — corruption_eradicator (40,000 / 26,667 kills) | nobody | — | ∞ / 81 | ∞ | no |
| corrupted_portal (grimlet 45 elite), portal_efreet_sultan (42 elite) | 500 kills each — closing_the_gate; 800 gems | nobody | — | ∞ / 42 | ∞ | no |
| cult_of_darkness (emperor 35 elite) | 1 kill — cult_destroyer; 24 malefic shards — its_malefic | nobody | — | ∞ / 42 | ∞ | no |
| small_becomes_great, out_of_the_ground, attacking_the_island | dragon parts, the duskworm, the island | nobody (a layer; a boss) | — | ∞ | ∞ | no |
| full_moon, silent_night, sunsting_awakening | none | — | — | — | — | — |

**Nobody wins any event monster safely within ten levels today** (a probe: none of the five wins the corrupted ogre, the vampire, the lizard, the demon or the owlbear with the snapshot's bank even ten levels up) — so at these levels no bundle gains an event achievement (the miners' next gate is 30, and no win level exists for a monster event), no objective parent stops waiting, and no gear piece opens. A week on (`## What events add to the score — … at combat 28 and the mining and woodcutting role holders at 30`):

| character, lane | before (`events: 0`) | after |
|---|---|---|
| First, Fourth, Fifth — mining | → 35: diamond_in_the_sky, 3 pts, 550 h, score 0.00546 | → 35: + strange_miner (12 spawns of Strange Apparition, 28 days with 3), 5 pts, 582 h, score 0.00859 |
| First, Second, Fourth — woodcutting | → 40: professional_lumberjack, 1 pt, 156 h, score 0.00642 | → 35: magic_harvester (19 spawns, 45 days with 3) and magic_lumberjack (12 spawns, 28 days with 3), 5 pts, 121 h, score 0.0413 |

The woodcutting gate moves from 40 to 35 and its score rises six-fold: this is what pulls the role holders to 35 in row A's first fortnight. Still no objective parent changes and no gear piece opens at combat 28 — the demons, vampires and lizards are not won within ten levels by the pool of 11-17 even then; in row A they open on day 14–20, when the fighters stand at 28–30 with the gear made by then.

## The replay
`npm run check -- planner`, from the 2026-11-18 snapshot to 2027-02-24, all five on, every invariant on every decision, five rows in five child processes (about 18 minutes).

### The model
- **Where the share is taken**: `forward.ts:249` — after `decide`, `sharesOf(name, w)` (`events.ts:433-449`): per event with open demand that can still pay, a spawn assumed live at the deciding moment (`spawnOf`, `:420-426`: the first tile the city reaches, seen half a poll late) and `eventMembers` on that World; a member's share = its usable seconds ÷ `gapSec`.
- **How the step stretches**: `stretch` (`events.ts:453-462`): the step's work hours W, the shares s and S = Σs; per event the uncapped event time W·s ÷ (1 − S), capped at the demand's actions × seconds an action; the step's wall time is W + the event hours (`forward.ts:249-254`, `finish` with it).
- **What is credited and debited**: when the step ends, `advance` with the stretched hours (offerings counted on the longer span), then per event an event step (`eventStep`, `events.ts:465-470`: a supply-kind kill or gather of the content, its actions, no hours) through the same `advance` (`forward.ts:236-242`): kills, every drop at its expected rate into the bank, combat or gathering XP, the potions the forecast drinks (`drinksOf`), the achievements' progress.
- **How it ends**: the demand is re-read at every decision; met (or no longer fitting), no share.
- **Invariant 18** — no character's event shares sum to its whole time: `ok`, 34,798 checks over the five rows.
- `config.events` (`types.ts:90`, `config.ts:46-49`, default 1, not in the UI, never a patch): 0 makes `possibleMembers` empty (every calendar ∞ — `bundleOf` and the bills as before), `billOf` treats an event source as out of reach again, `unmetGates` and gear (b) as before, `waitingOf` "an event" as before, and no share. The outlook's note "events are not simulated" is replaced (`forward.ts:320`).

### The rows
| row | day 7 | day 14 | day 30 | day 60 | deadline | report 012 |
|---|---|---|---|---|---|---|
| A default (events attended) | 32 | 36 | 56 | 72 | **77** | 63 |
| B potions free | 39 | 55 | 64 | 82 | **85** | 70 |
| C the field price always | 34 | 39 | 46 | 63 | **63** | 56 |
| D a win is enough | 34 | 43 | 57 | 77 | **86** | 65 |
| E no events (`events: 0`) | 33 | 38 | 52 | 62 | **63** | 63 (its row A) |

**Combat 25 / 30 / 35 / 40** (day; — = not by the deadline):

| row | First | Second | Third | Fourth | Fifth | at the end |
|---|---|---|---|---|---|---|
| A | 13.4 / 16.5 / 42.4 / 81.6 | 0.9 / 14.9 / 38.2 / 57.6 | 12.5 / 15.5 / 33.1 / 61.1 | 13.5 / 16.5 / 41.0 / 80.7 | 11.9 / 14.8 / 34.6 / 56.1 | 42–45, waiting for combat 50 |
| B | 6.1 / 7.8 / 13.4 / 15.9 | 0.9 / 5.8 / 12.1 / 13.7 | 5.7 / 7.1 / 10.5 / 12.7 | 5.8 / 7.2 / 14.5 / 15.6 | 5.9 / 7.4 / 9.4 / 12.1 | 44–50 |
| C | 51.7 / 53.6 / 85.3 / — | 0.9 / 32.9 / 67.2 / — | 14.5 / 34.0 / 68.6 / — | 34.6 / 36.7 / 72.2 / — | 32.0 / 34.4 / 70.7 / — | 36–37 |
| D | 2.9 / 10.9 / 36.0 / 57.1 | 1.0 / 10.1 / 34.7 / 60.0 | 1.1 / 10.2 / 35.2 / 48.9 | 1.1 / 11.3 / 37.5 / 52.6 | 4.0 / 10.4 / 33.4 / 44.1 | 41–46 |
| E | 10.6 / 13.2 / 68.1 / — | 0.9 / 10.6 / 42.8 / — | 9.5 / 11.8 / — | 9.7 / 12.2 / — | 9.6 / 12.0 / — | 33–38 |

**A gathering role at 35 / 40** (day):
- A: Fifth mining 5.3 / 20.3 · Second woodcutting 7.2 / 10.0 · First woodcutting 9.1 / — · Fourth woodcutting 9.5 / 12.8 · Fourth mining 9.7 / — · Third alchemy 18.0 / 18.6 · First fishing 20.0 / 31.3 · First mining 24.8 / —.
- B: Fifth mining 4.6 / 17.1 · Second woodcutting 9.5 / 19.9 · First woodcutting 12.6 / — · Fourth woodcutting 12.8 / 21.2 · Fourth mining 14.0 / — · First mining 14.2 / — · Third alchemy 17.2 / 18.3 · First fishing 21.8 / 25.0.
- C: Fifth mining 4.6 / 8.9 · Third alchemy 4.8 / 4.9 · Second woodcutting 6.7 / 18.2 · Fourth woodcutting 8.4 / 18.9 · Fourth mining 9.4 / — · First woodcutting 10.9 / — · First fishing 16.3 / 20.9 · First mining 17.7 / —.
- D: Fifth mining 5.2 / 13.0 · Fourth woodcutting 9.6 / 14.7 · Third alchemy 10.3 / 10.8 · Fourth mining 11.9 / — · First fishing 16.3 / 23.1 · First mining 18.0 / — · First woodcutting 28.7 / — · Second woodcutting 32.7 / —.
- E: Fifth mining 4.7 / 20.8 · Third alchemy 13.9 / 14.4 · First fishing 16.2 / 22.3 · First mining 26.6 / — · First woodcutting 44.9 / 47.2 · Second's woodcutting and Fourth's mining and woodcutting never.

**Hours by answer** (the event hours their own line):
- A: objective 23.3% · level 47.2% (of it combat 37.5%) · supply 21.8% · filler 6.4% · fallback 0 · **events 1.3% (149 h)**.
- B: 6.2 / 16.0 / 2.0 / 15.6 / **fallback 59.1%** · events 1.2% (137 h).
- C: 10.0 / 70.8 / 1.1 / 17.2 / 0 · events 0.8% (90 h: the two apparitions only).
- D: 34.0 / 37.8 / 20.1 / 5.5 / 0 · events 2.6% (293 h).
- E: 22.0 / 16.6 / 44.7 / 16.6 / 0 · events 0 — report 012's row A to the decimal.

**Gear made** (eight days / the deadline): A 11 / 78, B 27 / 65, C 32 / 42, D 34 / 88, E 16 / 49.

**Open points at the deadline**:
- A: another layer 73 · an event 12 (closing_the_gate, corruption_eradicator, draconic_harvest) · filler not reached 11 · use 10 · unhandled 10 · a raid 8 · a level 3 (grand_master) · does not fit 3 (loktar_ogar, turning_treasures_to_gold) · a group 3.
- B: the same but filler 6, gear 1 (loktar_ogar), no level.
- C: an event 20 (+ cult_destroyer, its_malefic, the_new_bandit) · gear 15 (cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar, the_reaper).
- D: an event 4 (draconic_harvest only).
- E: an event 29 (+ magic_harvester, magic_lumberjack, strange_miner, the_new_bandit, cult_destroyer, its_malefic) · gear 7.

### Row A per event code
| code | spawns expected to the deadline | spawns attended, per member | character-hours | units | completed (day) |
|---|---|---|---|---|---|
| magic_apparition | 42 | Second 20, First 19, Fourth 20 | 57 | 5,001 gathers | magic_lumberjack (38.2), magic_harvester (59.0) |
| strange_apparition | 42 | Fifth 12, Fourth 12, First 4.5 | 27 | 3,002 gathers | strange_miner (38.8) |
| cult_of_darkness | 42 | Fifth 18, Second 7.8, Fourth 5.4, First 0.7, Third 0.4 | 30 | 1,201 kills | cult_destroyer (24.5), its_malefic (90.7) |
| portal_demon | 81 | Second 4.3, Fifth 2.8, Third 2.6, First 2.0, Fourth 1.4 | 12 | 427 kills | — (horns for gold gear) |
| corrupted_portal | 42 | Fifth 5.0, Second 2.6, Fourth 1.9, First 1.7, Third 1.3 | 12 | 319 kills | — (closing_the_gate never fits whole) |
| bandit_camp | 81 | Fifth 2.0, Second 1.9, Third 1.3, First 0.9, Fourth 0.8 | 6.6 | 312 kills | the_new_bandit (16.2) |
| full_moon | 55 | about 0.6–0.9 each | 3.7 | 169 kills | — (capes for gold gear) |

"Spawns attended" is a member's event hours ÷ a spawn's usable seconds — an expectation, not a count.

**Gear made from event materials** (row A, 34 pieces): gold pickaxes ×3 and gold swords ×5 (day 20.3, demon horn), gold shields ×2 (23.1), gold platebodies ×3 (23.1–27.7, capes and horns), gold masks ×3, gold helms ×2, gold platelegs ×3 (23.8–57.1, lizard eye), elderwood staffs ×4 (24.5–24.9, lizard skin), a conjurer skirt (25.8, cape), an obsidian helmet (31.6) and battleaxe (56.8, lizard skin) — and above 38 only **mithril platelegs ×4 and mithril shields ×2 on day 86.4–86.5** (lizard eye and skin).

**Event demands that did not fit** — at the start (nobody can be a member of any monster event): the_new_bandit, closing_the_gate's three monsters, corruption_eradicator, cult_destroyer, its_malefic, draconic_harvest, secure_the_island, coin_collector, the duskworm's two, all "∞ spawns needed" against 42–81 expected. A month in: corruption_eradicator 763 gems — 185 spawns needed at the ogre, 122 at the owlbear, against 56 expected; closing_the_gate's grimlets 6 spawns of 29 (it fits alone, but the efreets do not), the island's and the duskworm's ∞.

### What the events cost
| day | A | E |
|---|---|---|
| 7 | 32 | 33 ← A below |
| 14 | 36 | 38 ← A below |
| 30 | 56 | 52 |
| 60 | 72 | 62 |
| deadline | 77 | 63 |

A is below E on days 7 and 14. **The demand that took the hours is the apparitions' through the bundles**: strange_miner (mining 35) and magic_lumberjack and magic_harvester (woodcutting 35) now sit behind those levels for the role holders, so the gathering lanes outrank the combat road in the first fortnight — Second woodcutting 35 on day 7.2, Fourth woodcutting 9.5 and mining 9.7, First woodcutting 9.1 (E: never, never, never, 44.9) — and the fighters reach 25 on days 11.9–13.5 instead of 9.5–10.6; the_reaper (+3) comes on day 17.7 instead of 13.8, expert_alchemist and expert_fisherman later. What it paid by the deadline: strange_miner +2, magic_lumberjack +2, magic_harvester +3 (days 38.8, 38.2, 59.0), diamond_in_the_sky 2.8 days earlier, and the level road that later carries the event fights. Over the season A − E = 19 points gained (the_new_bandit, cult_destroyer, magic_lumberjack, strange_miner, king_of_the_goblins, cursed_wood_blessed_victory, magic_harvester, its_malefic) less tasks_coins_fan (+5 in E, filler not reached in A).

### What do events pay this season, which of them, from which day — and what is the next wall?
1. In row A events pay **15 points directly**: the_new_bandit (day 16), cult_destroyer (24), magic_lumberjack and strange_miner (38–39), magic_harvester (59), its_malefic (91) — for 149 character-hours, 1.3% of the fleet's time.
2. They open **gear**: demon horns, capes and lizard parts make the gold set at 30 from day 20 (25 pieces by day 31); king_of_the_goblins (+3, day 39) and the cursed wood (+1, day 56) follow, which E leaves waiting for gear. Row A ends 14 above E.
3. The paying events want **mining and woodcutting 35** (three role holders each, days 5–10 in A) and **fighters at combat 28–30 in gold** for the lizard, demon, vampire and the cultist emperor (members from about day 15). Today nobody wins any event monster within ten levels.
4. **The gear above 38 comes into reach through event materials only at the end**: mithril legs and shields with lizard parts on day 86; nothing at 40+ before. Cultist gear (malefic cloth, from the emperor) is never made.
5. Row B (potions free, events attended) is **85, 8 above A**: the consumables round's ceiling on top of events (it was 7 above A in report 012).
6. Row C rises to 63 (+7): events pay most where potions are dear.
7. **The next wall is another layer**: 73 open points in every row (keys, tolls, the island) — 015's work; then the potion's price (87% of row A's fight hours are potion making).
8. What stays "an event" at the deadline in A: closing_the_gate (efreets and grimlets, elite 42–45), corruption_eradicator (800 gems; 122–185 spawns at the ogre and owlbear), draconic_harvest (behind a key).

## The small repairs
- **In flight for an `ach:` target is what the running step still has to do**: `src/state/planner.ts:85-88` (`worldOf`): a running step with an `ach:` target is handed to the core with `units − units done ÷ perOf(work)` (its counter is in actions: a drop objective's fights, a gather's gathers). The forward model keeps the whole step (it applies a step's progress at its end); `src:`, `mat:`, `gear:` keep the whole step. Proved twice: the scenario `planner-inflight-left` (Pia's 55-chicken step at 47; the read says 47 of 75; `worldOf` hands Pia's step as 8 and Quinn's candidate is the 20 really left — it would be none with the whole step), and a made-up case on the core (30 pigs open by the read, First's step at 47 of 55: Second plans 22, none with the whole step in flight). Shortcut, noted: progress between the last read and now is counted neither in the read nor in flight, so the candidate can plan a few units too many.
- **`supply: supply:`**: `src/plan/planner/decide.ts:284` (the supply candidate's why no longer carries the prefix; `:307`'s `${as}: ` adds it once).
- **`CLAUDE.md`'s combat-training paragraph**: the gap rule — "× 0.7 more than 5 levels above the monster, nothing more than 10 above (the gap rule the log shows, task 012: the pig gives XP to 29, none from 30)".

## What was done / files
**Section 2 — who goes to a spawn**
- `src/plan/planner/events.ts` (new): `eventOf`, `contentOf`, `eventGateOf`, `gapSec`, `usableSec`, `contentSec`, `possibleMembers`, `membersAt`, `calendar`, `eventWork`, `materialCal`, `eventDemand` (`materialNeeds`), `eventMembers` (`nearestBank`, `walkTo`, `setOf`, `withSet`), `eventPlans`, `tripOf`, `spawnOf`, `sharesOf`, `stretch`, `eventStep`, `eventDemandOpen`.
- `src/plan/planner/decide.ts:146` `WEAR_SLOTS` exported; `:193` no step on an event-gated target; `:232-238` the gear parents through `gear.ts gearPieces`/`pieceParent` (`gear.ts:309-329`); `:254` no `src:` step on an event-only material.
- `src/plan/planner/supply.ts:234` (`inStep`), `:240-274` (`objectiveParents` memoised per World and name).
- `src/state/eventorders.ts`: `orderFor` (`:66-81`, field orders for characters the planner does not own), `busyOf` (`:86-97`), `sent` (`:100`), `backTo` (`:103-107`), `ownedEvents` (`:110-131`), `reactToEvents` (`:134-157`), `eventPollMs` (`:161-164`).
- `src/state/sync.ts:54-67` (the poll's interval from `eventPollMs`).
- `scripts/harness/index.mts` (`fieldEvent`, `lizardSet`, `eventLines`), `scripts/harness/late.mts`, seven `scripts/scenarios/event-*.mts`.

**Section 3 — an event in the score**
- `src/catalog/index.ts:21-30`, `:41`, `:60`, `:82` (`GameEvent`, `catalog().events` from `events.json`).
- `src/plan/planner/config.ts:46-49` (`events`), `:66-79` (`EVENT_SEEN_SEC`, `EVENT_MIN_SEC`, `SPAWN_LOG`); `types.ts:90` (`PlannerConfig.events`).
- `bundle.ts:9-13`, `:22-33` (`cal`, `events`), `:103-122`, `:139-163` (`eventPart`), `:167`; `gates.ts:23-30`; `supply.ts:15-19`, `:38-44`, `:142-143`, `:161-166`, `:197-202`; `gear.ts:96-100`, `:285-287`; `targets.ts:21-34`; `forward.ts:268-280`, `:298` (`waitingOf`); `decide.ts:224-226` (the why).

**Section 4 — the forward model**: `forward.ts:9-16` (the header), `:204-256` (`Attended`, `Played.events`, `forward`), `:320` (the outlook's note).

**Section 5**: `src/state/planner.ts:85-88`; `decide.ts:282`; `CLAUDE.md`.

**`scripts/check-planner.mts`**: invariant 18; `Run.evBy`, `evDone`, `world30`; `playOut`'s event tally; row E and `ROWS.events`; the rows' event line, gathering roles at 35, `eventRowTable`, `eventMat`, `## What the events cost` and the E-at-63 case; section 5d (`SPAWNS`, `SPAWN_SPAN_H`, the `SPAWN_LOG` case, `END_LEVELS`, `endWorld`, `liveAt`, `LIZARD_SET`, eleven made-up cases), `spawnTable`, `spawnsTable`, `eventTable`, `gainTable`; the strange-apparition case of report 007 replaced.

**`CLAUDE.md`**: the events paragraphs (the poll, the planner's characters), the combat-training gap rule, the planner section (the interrupt line, gear's rejected pieces, an "Events (task 013)" bullet, the checks).

**Commands run**
- `git add docs/rework.md; git commit -m "Rework notes"` first (`a7a1fe5`); `docs/rework.md` did not change again. At the end, the task commit.
- `npm run typecheck` (several times; final clean).
- `npm run check`: twice. The first failed on one planner case (report 007's "a miner at 35, Strange Apparition live → the event node", which settled point 1 overturns — replaced); the second green, `60 checks: 59 ok, 1 known defect reproduced, 0 failed`.
- `node --import tsx … scripts/check-planner.mts` (the plain check, scratch storage): five runs while the made-up cases settled (the lizard-skin armour wants jasper crystals — tasks coins — so the material cases moved to strangold bars and the gold pickaxe); final `OK (11156 invariant checks, 52 made-up cases)`.
- `npm run check -- planner`: three times. The first green in 1,069.6 s: `OK (509768 invariant checks, 54 made-up cases; deadline points 77 / 85 / 63 / 86 / 63)`. Twice more after adding the week-ahead table and correcting its gate column: both `OK (509768 invariant checks, 54 made-up cases; deadline points 77 / 85 / 63 / 86 / 63)`, the last in 1,125.0 s.
- `npm run check -- <name>` for each new scenario; `event-fleet-monster` failed twice on the way (the craft resumed in the trip's set → the trip's last item; a bounce from 100-potion stacks at the steps' first reset → the set without potions), then green.
- `npx vite build --outDir <scratch>/ammo-013-dist --emptyOutDir`: `index.html 0.40 kB`, `assets/index-Dc_NjE2T.css 37.23 kB`, `assets/index-Bs6pZQ6l.js 414.67 kB │ gzip: 140.00 kB`, `✓ built in 1.66s`; deleted.
- Scratch, all deleted at the end: the background agent's log readers (steps, samples, notable lines, the chain, the offerings, the spawns, the service's gaps), my combat-XP tally over the log, probes of the event demand and members, the win levels of the event monsters on the snapshot, a `bestInSlot` search for a lizard set, and a search for a gear need with an event material.
- No request to the game, no `.env`, no `.ammo/*`; no service started, stopped or called; nothing written to `logs/dev.log`.

## Notes
**Defects noticed and not touched**
- **Bag stock is not stock**: the diamond chain planned 210 more gathers 34 minutes after the last stone lay in a bag (`src/plan/planner/stock.ts:43-46`).
- **Two role holders take one gated craft's level for the same points** (`lvl:mining:35` for First and Fifth, priced "by Fourth"; `decide.ts:297-302`).
- **The Nomadic Merchant trip of 11-17 23:31** withdrew 72,000 gold and bought nothing (no `npc/buy` line; the gold went back at 01:43:34). Not looked into.
- **The executor takes a utility potion stack whole and banks most of it at a reset** when the bank holds 100-stacks (a bounce in the harness; `exec.ts`/`jobgear.ts`); the lizard set of the scenarios carries no potions because of it.
- **Event trips are not `Step`s**: the forward model's events have no gear of their own (the step's set is worn), and in play a trip's set is not reserved between the poll and the member's reset.
- **A mixed fleet** (some characters owned, some not): once the core has evaluated a monster or resource spawn, the old `fieldOrder` no longer sends a non-owned character to it (`eventPlans` holds the key). Not the case today.
- **Closing the gate** is in no calendar while one of its three monsters has no member, so its 500 demons are never fought though they alone would fit (the rule as settled: the achievement must complete).
- Still as before (report 012): a restart repeats one action of a running item; a made piece goes to whoever resets first; tiny supply steps.

**Guesses in the numbers, most doubtful first**
1. **`SPAWN_LOG` 1.64** on 33 spawns over 69 hours (Decision 1); per kind it ranges from 0.50 (rate 2000) to 0.77 (merchants) of the docs' expectation. A cap on active events would make the factor depend on how many events run at once.
2. **The members' kill seconds at an event** are the planner's (`KILL_LOG` 0.88 on reconstructed sets) with potions free inside the hour; no event fight has ever been logged.
3. **Usable seconds**: both walks taken as the tile's walk to its bank, half a poll late; a member far from the tile works less.
4. **The forward model's shares** assume no two spawns overlap and cap each member's event work at the whole demand (several members can overshoot it within one step).
5. **"Can ever be a member"** looks ten levels up with today's pool; a fighter twenty levels below an event monster counts as never.
6. The fleet "at the log's latest levels": combat by the XP tally, mining by two plan lines, every other skill the snapshot's.

## To delete (Alex)
Nothing. The scratch scripts, probes, the agent's readers and the scratch build are deleted.
