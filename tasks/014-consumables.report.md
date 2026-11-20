# 014 — The consumables round: potions and food by need, made through the bank — report

## Summary
- **Built**: potions and food are needs by gear by need's rule (`src/plan/planner/consumables.ts`): parents of supply for two chunks of their work plus a fifth, made through the bank by whoever is placed best (`mat:` by anyone at the level or the cook, `src:` by whoever reaches the ingredient), reserved and taken by the fight step that planned them (`withdraw` → the fight item's new optional `take`), priced at one price (held: free; else its chain) with healing priced as eating (`USE_SEC` 4.5 s, the log's median `use`) or rest; an event's spawn is stocked as a reserve; bag stock counts in the bills; the forward model brews, cooks, drinks and eats through the bank; `config.consumables` 0 is report 013's model whole. The executor, for an owned character only: the reset takes exactly the planned potions and food, nothing is brewed, cooked or gathered inside a fight item, and a fight item whose stock is gone ends ("ran dry …", sampled, never blocked). Six new scenarios; rows A–F; invariants 19 and 20; section 2's tables.
- **Gate**: `npm run typecheck` clean; `npm run check` 66 checks, 65 ok, `repeat-spin` the known defect; `npm run check -- planner` → `OK (846004 invariant checks, 67 made-up cases; deadline points 87 / 94 / 77 / 89 / 68 / 86)` — **C at 77** — in **1,716 s of the 1,800 s backstop** (row D is the long pole at 1,689 s; my other green run took 1,726 s): run it with nothing heavy beside it; the scratch build succeeded. No import of `hive/`, `roadmap.ts` or `state/` in the core.
- **The replay**: row A 87 against C's 77 (B, the ceiling, 94; D 89; E, no events, 68; F 86). The fighters reach combat 40 on days 36–40 (C: 56–82); consumable making is 79% of fight and making hours (C: 87% inside the fights). **A is below C on day 30** (51 against 56): the_reaper, cult_destroyer and cultist_purifier came 2–8 days later, their kill steps waiting for potions made through the bank; A is level by day 30.8 and ahead from there.
- **What the potion wall is** (section 2): from combat 30 every XP pick drinks about ten health potions a kill, 92–97% of the kill at the field or chain price; the largest lever is the stock of by-products (algae, sunflower: 474 → 68 h a level), then the potion tier (no road past 36 without the greater health potion, alchemy 40); food and tools move it by under 5%.
- **Found by the replay and fixed before the gate** (section "Commands run"): a combat level vanished whenever its pick's potions were held for better works (the fighters stood at 22–25 all season); gear by need judged on the gear alone made 10 pieces against 78 (back to the pool's potions, settled point 6); the solve cache's per-pool memo leaked into report 013's model (C at 82); and the rows ran past the backstop until the estimate-only solves (a level above the character's own, the road's pace, a possible event member) moved onto the fleet's gear.
- **The log** (section 1): one restart in the window, `[wj59]` at 09:51:56 UTC, before this work, loading report 013's code (`c8266ac`); none since (the log's last line read: 17:15:50 UTC, `[wj59]`). The service restarted by Alex will load this round's code; its re-attached steps are report 013's items, without `take`, and provision as before until they end.

## Decisions for Alex
None. What the season is played for, what is spent and what is deleted are untouched; buying potions or ingredients is 015's, and section 2 prints what it would cost.

## How Alex verifies
1. `git log --oneline -4` → `014: consumables` on top of three `Rework notes` (`6fd2f0f`, decisions 37 and 38; `4f2f589`, decision 36; `938d11f`); `git status` clean.
2. `npm run check` → `66 checks: 65 ok, 1 known defect reproduced, 0 failed` (`repeat-spin`; about 2.5 minutes): report 013's 60 plus `consumables-event-trip`, `consumables-fight-takes`, `consumables-no-field-brew`, `consumables-not-owned`, `consumables-run-dry`, `consumables-supply-chain`.
3. `npm run check -- planner` → `OK (846004 invariant checks, 67 made-up cases; deadline points 87 / 94 / 77 / 89 / 68 / 86)` — rows A / B / C / D / E / F, **C at 77** — and prints the tables of sections 2, 3 and 5. It took **1,716 s of the named check's 1,800 s backstop** (`scripts/check.mts`; row D, the long pole, 1,689 s; my first green run 1,726 s): run it with nothing else heavy on the machine.
4. `npm run typecheck` prints nothing after `tsc --noEmit`; the scratch build succeeded (see "Commands run").
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → `CLAUDE.md`, `tasks/014-consumables.md`, `tasks/014-consumables.report.md`, `scripts/check-planner.mts`, `scripts/harness/fake.mts`, six `scripts/scenarios/consumables-*.mts`, `src/plan/bis.ts`, `src/plan/consumables.ts`, `src/plan/jobgear.ts`, `src/plan/queue.ts`, `src/plan/planner/{bundle,compile,config,consumables,cost,decide,events,forward,gear,reach,stock,supply,types}.ts`, `src/state/{eventorders,exec,planner,queue}.ts`. All are allowed; on the edges: `src/plan/bis.ts` carries the healing term (`Food`, `USE_SEC`, `healSeconds`, `killSeconds`' third argument) and nothing else; `src/state/planner.ts` the `bags` of `worldOf`; `src/state/eventorders.ts` the trip's `take`; `scripts/harness/fake.mts` the potions a fight drinks (the harness a scenario needed); `src/plan/consumables.ts` two exports.
7. **After the restart — not checked by me** (the restart is Alex's). The steps that re-attach at the restart are report 013's items, without `take`: they provision as before until they end. From each character's first decision after the restart:
   - a kill step's `plan` line ends "… N now (h) with X Small Health Potion [and Y Cooked Beef] from the bank", or "…; rests (<why>)"; its reset's `bank/withdraw/item` carries exactly X (a potion is not withdrawn as a stack of 100) and Y;
   - no `note <name>: restock …`, `craft <potion or food>`, `gather <ingredient>` or `withdraw <ingredient>` while an owned character's head is a `pl:…` fight item;
   - `mat:<potion|food>@…` and `src:<ingredient>@…` lines read "… short for <Potion> ×N for <the work> (<monster>, 2 chunks) …" (an event's: "one spawn");
   - a fight item that runs dry writes "ran dry after N fights vs <monster>: …", the step's `sample` line follows, and no `blocked` line;
   - what to expect first (as the log stood at 13:00 UTC): Third is on `ach:alchemist:1` (200 minor health potions, the first of the season); the fighters' roads to combat 25–30 ask for small and minor health potions and food from the bank's raw meat (cooked by First, the cook).

## The hours and the events
Read as a stream from `logs/dev.log` (never copied) by scratch readers: a background agent wrote them, I re-ran them to the log's end and re-read the lines quoted. **Window: 2026-11-20 08:06:13 to 13:00:14.862 UTC (4.9 h).** Code references are to `c8266ac` (report 013's code, which ran).

**One restart.** `[yewz]` (report 012's code) wrote its last line at 09:51:34.882; `[wj59] server start (prod) on :5173` came at 09:51:56.722 (not 09:44 and 09:54 as the task has it: those were the chat's last and first looks). `[wj59]` runs report 013's code. At 09:51:57.508: `queue resumed after reload` ×5 and `re-attached` ×5 — `lvl:mining:35@First#2`, `ach:intermediate_lumberjack:0@Second#2`, `lvl:alchemy:20@Third#2`, `lvl:mining:35@Fourth#1`, `lvl:mining:35@Fifth#2`. No take-over, no 499, no other restart to 13:00:14.

### Steps per character
Units planned/done; hours planned/taken. Brackets: started before 08:06:13. `*`: one action repeated across the restart. No `supply` step ran in the window; every `lvl:mining:35` why reads "for Diamond in the chain of diamond_in_the_sky (+3 pts, chain ~73 h → ~67 h, of it the road … by Fourth)".

| who | steps |
|---|---|
| First | (07:44:59 `lvl:mining:35#1` 153/153, 1.5/1.45) · 09:11:51 `#2` 155/156\*, 1.5/1.48 · 10:40:55 `#3` 156/156, 1.5/1.49 · 12:10:17 `#4` 157 planned, 88 by 13:00 |
| Second | (06:59:24 `ach:intermediate_lumberjack:0#1` 163/164\*, 1.5/1.54) · 08:32:22 `#2` 163/164\*, 1.5/1.54 · 10:04:37 `#3` 159/159, 1.5/1.50 · 11:34:24 `#4` 159 planned, 152 by 13:00 |
| Third | (06:35:31 `lvl:alchemy:20#1` 50/50 air boost potions, 1.5/1.63) · 08:13:29 `#2` 67/68 (504 green slimes for 503\*), 1.5/**2.20** · 10:25:29 `#3` 122/122 (375 slimes, 61 sunflowers), 1.5/**2.05** · 12:28:39 `ach:alchemist:1#1` (objective, 121 minor health potions: nettle first), 48 nettle by 13:00 |
| Fourth | (07:18:02 `ach:intermediate_lumberjack:0#1` 161/162\*, 1.5/1.55) · 08:50:51 `lvl:mining:35#1` 153/154\*, 1.5/1.47 · 10:18:54 `#2` 156/156, 1.5/1.49 · 11:48:03 `#3` 157 planned, 128 by 13:00 |
| Fifth | (07:57:57 `lvl:mining:35#1` 153/153, 1.5/1.45) · 09:25:04 `#2` 156/157\*, 1.5/1.49 · 10:54:43 `#3` 157/157, 1.5/1.50 · 12:24:41 `#4` 157 planned, 62 by 13:00 |

Three miners stand on `lvl:mining:35` (Fourth since 08:50:51) for one 3-point road: the rule as written (every role holder is a candidate, `decide.ts:288-291` at `c8266ac`).

### Samples against their estimates
| time | who | key | measured | estimate | × |
|---|---|---|---|---|---|
| 08:32:20, 10:04:34, 11:34:23 | Second | `gather:birch_tree` | 34 s | 33 s | 1.03 |
| 08:50:51 | Fourth | `gather:birch_tree` | 35 s | 33 s | 1.06 |
| 09:11:51 – 12:24:41 (7) | First, Fourth, Fifth | `gather:coal_rocks` | 34 s | 33 s | 1.03 |
| 08:13:27, 10:25:29, 12:28:39 | Third | `craft:air_boost_potion` | 117, 116, 61 s | 3 s | 39, 39, 20 — **defect** (below) |
| 12:23:01 | Third | `level:alchemy:19` | 15,057 s | 29,750 s | 0.51 |
| 12:27:50 | Third | `level:alchemy:20` | 288 s | 10,660 s | 0.03 — two level-ups inside one batch of crafts (12:23:00 and 12:27:34) |

**Report 012's kill and craft prices still have no real sample**: no kill step ran (Third's 1,254 slime kills ran inside `lvl:` steps, which sample their craft), and the three `craft:` samples are whole level steps (hunting, gathering, crafting) ÷ the potions made, set against a craft-only estimate. **Completed**: no `plan: completed` and no `claim` line in the window; intermediate_alchemist (alchemy 20) completed by the level at 12:23 but a level step triggers no achievements read, so it is not read yet.

### Every notable line
None of `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`, `took over`, a paused queue, a non-ok answer or a network error. 1,254 fights, all `fight win` (Third against green slimes).

| time | line(s) | verdict |
|---|---|---|
| 08:13:27, 10:25:29 | `plan: slower than expected — craft:air_boost_potion 117 s against 3 s` (twice: the `slow` set is per process) | **defect**, not this task's: `stepSample` (`src/state/planner.ts:260-265`) finds no `craft` target `lvl:alchemy:20` and estimates `{ work }` with no inputs — `CRAFT_SEC` ÷ 2 (`cost.ts:122-126`) |
| 08:13:29 | Third `#2` plans 503 slimes = ⌈33.5 slimeballs × 10 × 1.5⌉ (`decide.ts:76`) with 18 slimeballs in its bag, banked 22 s later by its own reset (08:13:51) | **defect**: settled point 9 (bag stock is stock), repaired here (`decide.ts:77-78`); the 18 would have saved about 270 fights (≈ 1 h at 13 s); the step took 2.20 h against 1.5 |
| 09:52:03; Second `#2` 164/163; Fourth `lvl:mining#1` 154/153 | a restart repeats one action of a running item | known (reports 012, 013); parked by settled point 10 |
| 10:26:41 | Third withdraws 3 cooked porkchops inside `Fight 375× Green Slime` and never eats them: the 10-HP deficit is below the 225 heal (`exec.ts:71`) | as designed for report 013's code (`provisionFood` on any deficit, `exec.ts:487-489`); an owned character's fight item no longer provisions (section 4) |

### Report 013's acceptance step 7
- **The poll's spacing cannot be read from the log**: a successful `GET /events/active` is never written (`getAllPages`, `src/api/client.ts:141-165`); only transport retries are (8 lines in the whole log, all before the window).
- **`plan: event` lines** (all three spawns of the window, word for word; the fleet then: combat 23 / 25 / 22 / 23 / 23, mining First 24, Fourth 26, Fifth 26, Third's alchemy 19 → 21):
  - `2026-11-20T12:01:18.406Z [wj59] plan: event small_becomes_great at (7, 5) until 13:00Z — does not fit: 250 Dragon Bone for draconic_harvest (2500 kills) does not fit (∞ spawns needed, 53.8 expected by the deadline); 100 Red Dragon Scale for draconic_harvest (1000 kills) does not fit (∞ spawns needed, 53.8 expected by the deadline)`
  - `2026-11-20T12:17:20.861Z [wj59] plan: event portal_efreet_sultan at (-3, 11) until 13:16Z — does not fit: 500 Efreet Sultan kills for closing_the_gate (500 kills) does not fit (∞ spawns needed, 40.7 expected by the deadline)`
  - `2026-11-20T12:49:28.387Z [wj59] plan: event out_of_the_ground at (-1, 19) until 13:48Z — does not fit: 1 Duskworm kills for around_the_world (1 kills) does not fit (∞ spawns needed, 40.7 expected by the deadline); 1 Duskworm kills for the_worm_turns (1 kills) does not fit (∞ spawns needed, 40.7 expected by the deadline)`
  As report 013 expected: "does not fit" for every monster event, no interrupt. **No `interrupt event` in the whole log.** No `ach:strange_miner…`, `ach:magic_…`, `ach:the_new_bandit…` or event-material `src:` step. The `strange_miner` clause in the miners' why is not exercised (mining 23–26, below 30).

**Spawns since 08:06**: the three above (12:01:18 Small Becomes Great (7, 5) underground; 12:17:20 Portal (Efreet) (-3, 11); 12:49:26 Out Of The Ground (-1, 19) underground) — nobody sent, nothing lost by the rule's own measure. **The whole log**: 38 `⚡` lines, **36 distinct** (two re-logged at expiry: 11-18 05:57:13 Herbal, 19:27:43 Timber) over 11-17 10:51:33 → 11-20 13:00:14, **74.14 h**; the docs expect **58.0 ± 7.6**; **expected ÷ seen = 1.61**, beside `SPAWN_LOG` 1.64 — inside 1.3–2.0, the constant stays (settled point 10).

### Where the time goes, 08:06:13 → 13:00:14 (4.9 h a character)
An action's seconds run from its line to the character's next action line.

| | fight | rest | eat | bank | walk | gear | gather (step) | craft (step) | a fight item's own consumables |
|---|---|---|---|---|---|---|---|---|---|
| First | 0 | 0 | 0 | 313 s 1.8% | 252 s 1.4% | 0 | 17,075 s 96.8% | 0 | 0 |
| Second | 0 | 0 | 0 | 245 s 1.4% | 188 s 1.1% | 0 | 17,207 s 97.5% | 0 | 0 |
| Third | 7,031 s 39.9% | 4,489 s 25.4% | 0 | 396 s 2.2% | 249 s 1.4% | 93 s 0.5% | 4,828 s 27.4% | 550 s 3.1% | 5 s: the 10:26:41 withdrawal of 3 cooked porkchops in `pl:lvl:alchemy:20@Third#3:1` |
| Fourth | 0 | 0 | 0 | 283 s 1.6% | 237 s 1.3% | 10 s 0.1% | 17,111 s 97.0% | 0 | 0 |
| Fifth | 0 | 0 | 0 | 320 s 1.8% | 252 s 1.4% | 0 | 17,069 s 96.7% | 0 | 0 |

- **Fights that ate against fights that rested: 0 against 878** (Third, green slimes: each costs 10 HP and one rest, median 5.09 s, n = 879). Over 11-19 09:15 → 11-20 08:06 (for the price, section 3): 1,652 fights ate and 936 rested; the `use` action took **4.49 s median** line to line (n = 1,705; p25 4.10, p75 5.14); the food eaten: cooked beef 798, porkchop 459, wolf meat 281, trout 146, apple pie 21.
- **Potions drunk a fight**: none could fire (a restore potion fires under 50% HP; the slimes take 10 HP); Third wore 8 small health potions from 07:20:24. The log carries no potion count a fight.
- **`validate.ts`** records into storage only (`ammo:v1:simdev`, `src/sim/validate.ts:49`, `:63-69`) and has no "who struck first" field: nothing in the log.

### Third's `lvl:alchemy:20`
The hunt was for **green slimeballs** (an air boost potion = 1 slimeball + 1 sunflower + 1 algae, two a craft; a green slime drops one in 10): three steps, 06:35:31 → 12:23:00, **1,254 green slimes at +0 XP**, 120 sunflowers gathered, **240 air boost potions crafted** (50 + 68 + 122). Alchemy 18 → 19 by 08:13 (1.63 h); **19 → 20 in 15,057 running seconds (4.2 h) against an estimate of 29,750 s (8.3 h)**; 20 → 21 inside the last batch (12:27:34). In all 5.6 h for two levels. A kill cost 12.9 s (7.9 s of fight, 5.0 s of rest): 38% of a 0-XP hunt is rest. From 12:28:39 Third works `ach:alchemist:1` (200 minor health potions — the first minor health potions of the season; nettle at alchemy 20).

### What the log says the model must not get wrong
1. A fight that barely hurts still costs a rest every fight (5 s of 13 s against green slimes); no food is eaten under one unit's heal (`exec.ts:71`).
2. Where the fighters fed themselves, most fights ate (1,652 of 2,588 on 11-19/20): a `use` is 4.5 s; rest about 1 s per 1% of max HP plus 1–2 s.
3. Food came from the bank's raw meat, cooked by the fighter inside its fight item; nobody fished for food.
4. A restore potion fires only under half HP; potions worn on a fight that cannot drop there are carried for nothing.
5. A potion with a drop ingredient is a hunt: 240 air boost potions took 1,254 kills (≈ 4.5 h); the craft is under 2% of a potion's time.
6. Stock in a bag is invisible to the plan (Third's 18 slimeballs, ≈ 270 extra fights).

## What consumables cost
Printed by `npm run check -- planner` (`## What consumables cost`, `## Every fighter on its road`, `## The levers`, `## What gold would buy`) on the fleet at the log's end (2026-11-20 08:06 UTC: combat First 23, Second 25, Third 22, Fourth 23, Fifth 23 — no fighter fought after it; the bank of 11-17 with the pieces made since) and a week on (every fighter at combat 28, the mining and woodcutting role holders at 30). No engine code was needed for it beyond what section 3 built (`chainSec`, `healSeconds`).

### Every potion and food with a recipe (the main ones; the check prints all 20 potions and 21 foods)
Per unit, seconds: (a) today's price — `potionSec`, the field by the fighter itself (a food: what `gatherPays` reads, ∞ where its ingredient is a monster drop); (b) the chain by the best-placed maker with its tools, the stock ignored; (c) the chain with the bank now. HP a second: a potion's restore ÷ its making; a food's heal ÷ (its making + a `use`) — rest heals 5 HP a second at 500 max HP, 7 at 700.

| item | level · ingredients (source, actions an item) | makers today | (a) | (b) | (c) | HP/s (a) / (b) / (c) |
|---|---|---|---|---|---|---|
| small health potion (30) | alchemy 5 · 3 sunflower (alchemy 1, 1) → 2 | all five | 48 | 51 | 3.3 | 0.6 / 0.6 / 9.0 |
| minor health potion (70) | alchemy 20 · 2 nettle (alchemy 20, 1) + 1 algae (gudgeon, fishing 1, 10) → 2 | nobody (Third 19) | 192 | 202 | 44 | 0.4 / 0.3 / 1.6 |
| health splash potion (150 splash) | alchemy 30 · 2 nettle + 1 sunflower + 1 algae → 2 | nobody | 207 | 218 | 44 | 0.7 / 0.7 / 3.4 |
| health potion (100) | alchemy 30 · 2 nettle + 1 egg (chicken, 12) + 1 sap (ash, 10) → 2 | nobody | 432 | 270 | 66 | 0.2 / 0.4 / 1.5 |
| greater health potion (200) | alchemy 40 · 2 glowstem (alchemy 40) + 1 egg + 1 algae → 2 | nobody | 442 | 281 | 77 | 0.5 / 0.7 / 2.6 |
| the four boosts (+12% an element) | alchemy 10 · 1 slimeball (a slime, 10) + 1 sunflower + 1 algae → 2 | all five | 368 | 237–332 | 35–74 | — |
| small antidote | alchemy 20 · milk (cow, 8) + sap + nettle → 2 | nobody | 412 | 399 | 129 | — |
| cooked chicken (80) | cooking 1 · raw chicken (chicken, 2) | First | ∞ | 28 | 5.7 | — / 2.5 / 7.8 |
| cooked beef (150) | cooking 5 · raw beef (cow, 2) | First | ∞ | 114 | 45 | — / 1.3 / 3.0 |
| cooked shrimp (150) | cooking 10 · shrimp (fishing 10, 1) | First | 34 | 42 | 5.7 | 3.9 / 3.3 / 15 |
| cooked wolf meat (200) | cooking 15 · raw wolf meat (wolf, 2) | First | ∞ | 172 | 52 | — / 1.1 / 3.5 |
| apple pie (320, 2 a run) | cooking 20 · 2 apple (green slime, 12) + egg | First | ∞ | 227 | 9.6 | — / 1.4 / 23 |
| cooked porkchop (225) | cooking 20 · raw porkchop (pig, 2) | First | ∞ | 243 | 155 | — / 0.9 / 1.4 |
| cooked trout (225) | cooking 20 · trout (fishing 20, 1) | First | 39 | 47 | 39 | 5.2 / 4.4 / 5.2 |
| cooked bass (300) | cooking 30 · bass (fishing 30, 1) | nobody (First's cooking below 30) | 44 | 52 | 43 | 6.2 / 5.3 / 6.3 |
| cooked salmon (400) | cooking 40 · salmon (fishing 40) | nobody | 49 | 58 | 48 | 7.5 / 6.4 / 7.6 |

A week on the rows barely move (the role holders' mining and woodcutting do not touch these chains; the boosts' (c) rises as the slimeballs are counted against two pools). Who gathers each ingredient today: all five reach sunflower, algae (gudgeon), the slimes, cows, chickens, pigs, wolves, ash sap; **nobody reaches nettle (alchemy 20) or glowstem (alchemy 40), trout (fishing 20), bass, salmon**. Minor health potions and nettle were ∞ in the chain until this task's gathering road (section 3): the potion wall at 30 starts at alchemy 20 (Third reached it at 12:23 UTC on 11-20).

**Reading**: a potion heals 0.2–0.7 HP for a second of making it at the chain's price, against 5–7 HP a second of rest: **a potion is never a cheaper heal, it is a win** (a flip); with the bank's by-products counted (algae 2,099, sunflowers) the minor health potion falls from 202 s to 44 s. A food beats rest only from the stock (shrimp 15, apple pie 23 HP a second with the bank's apples) or at fishing 20+ (trout 4.4–5.2, bass 5.3–6.3, salmon 6.4–7.6 HP a second): about rest's own rate at the fleet's 550–650 max HP.

### Every fighter on its road
Per level, the XP monster (every potion a candidate at the chain's price with the stock, (c)), the potions a kill drinks, the HP missing, and a kill's seconds = fight + healing + potions under (a) / (b) / (c):

| fighter, level | monster · potions a kill · HP missing | (a) field, rest | (b) chain, no stock, eating | (c) chain with stock, eating |
|---|---|---|---|---|
| Second 25 | wolf · none · 184 of 595 | 28 + 31 + 0 = 59 | 28 + 52 + 0 = 80 | 28 + 16 + 0 = 44 |
| First, Third, Fourth 28 | pig · none · 248–267 | 32 + 41–43 + 0 = 73–75 | 32 + 55–58 + 0 = 87–90 | 32 + 27–29 + 0 = 59–61 |
| Second, Fifth 28 | skeleton · 2 small health · 327 | 36 + 52 + 95 = 183 | 36 + 68 + 102 = 206 | 36 + 7.5 + 6.6 = 50 |
| First, Second, Third, Fifth 30–33 | rat · 5 minor + 5 small health · 220–280 | 48–52 + 37–44 + **1,195** ≈ 1,280–1,290 | 48–52 + 58–60 + **1,266** ≈ 1,372–1,378 | 48–52 + 22–31 + **238** ≈ 309–322 |
| Fourth 30–33 | rat · 6 minor + 6 small · 222 | 56 + 36 + 1,434 = 1,526 | 1,633 | 364 |
| Second 35 | rat · 2 greater + 2 small · 260 | 48 + 42 + 978 = 1,068 | 768 | 237 |
| Second 40 | owlbear · 8 greater health + 1 earth boost · 270 | 76 + 42 + 3,900 = 4,018 | 2,616 | 772 |

At the log's end the fighters at 22–25 need no potion (the pick is the pig, the wolf for Second at 25). At 28 Second's and Fifth's skeleton wants 2 small health potions (the others stay on the pig); **from 30 every pick wants about ten potions a kill and the potions are 92–97% of the kill at the field or chain price, 74% with the bank's stock**. The event monsters of report 013 at the level each is first won by the fleet's best fighter (every potion a candidate): full moon vampire at 25 (6 minor + 6 small, 1,521 / 1,621 / 358 s), corrupted ogre, bandit lizard at 30 (11 health + 11 small health, about 5,380 / 3,660 / 865 s), demon and corrupted owlbear at 30 (13 health + 13 minor, about 8,230 / 6,280 / 1,553 s); cultist emperor not won by 50.

### The levers: hours a combat level from 28 to 40, for Second
| lever | hours a level (12 levels) | the levels 28 / 32 / 36 |
|---|---|---|
| today's price (the field by the fighter, rest) | 309 (3,709) | pig 13 h · rat 212 h · death knight 544 h |
| the chain by the best-placed maker, the stock ignored, rest | 474 (5,688) | pig 59 · owlbear 538 · cultist acolyte 592 |
| **the chain with the bank's stock (by-products: algae, sunflower), rest — the base** | **68 (814)** | pig 13 · rat 55 · death knight 106 |
| …a potion of a higher tier refused (small and minor only) | ∞ from 36 | — |
| …food in place of rest (the cheapest food by its chain) | 65 (784) | skeleton 9.1 · rat 53 · death knight 103 |
| consumables free (row B's ceiling) | 8.4 (101) | rat 5.5 · owlbear 7.4 · goblin wolfrider 10 |

One line each:
- **A potion of a higher tier**: needed, not optional — from 36 the road has no XP monster without the greater health potion (alchemy 40, glowstem at alchemy 40): it needs Third at alchemy 40 first.
- **The alchemist's tools and level on the ingredients**: the gloves (apprentice −10% … mithril −50% a gather) cut the alchemy gathers (sunflower, nettle, glowstem), not the algae (fishing): about a third of a minor potion's ingredient seconds; they need gearcrafting (the gloves' recipes).
- **An ingredient that is another work's by-product**: the largest lever — 474 → 68 h a level is the algae of the bank (10 fishing gathers an algae; 2,099 in the bank) and the sunflowers; the fishing objectives' algae and the slimes' slimeballs keep it there. It needs the fishing work to keep running.
- **Food in place of rest**: 4% — the healing is a small part of a potion kill.
- **A gear piece in place of the potion**: gear by need at 28 with the potions at the chain's price asks for a skeleton armor whose road (H1) is still ∞: no piece flips the rats without a potion.
- **A second and a third alchemist**: the making hours are the same; made side by side — row F.

### What gold would buy (nothing is bought)
| merchant (an event; the Nomadic, Herbal, Fish and Timber merchants spawn about 2.8 times in 74 h) | sells | price |
|---|---|---|
| Nomadic Merchant | minor health potion · small antidote | 600 · 800 gold |
| Herbal Merchant | sunflower · nettle leaf · glowstem leaf | 10 · 35 · 75 gold |
| Fish Merchant | algae · gudgeon · shrimp · trout · bass · salmon · swordfish | 50 · 10 · 30 · 50 · 75 · 100 · 150 gold |
| Timber Merchant | sap · maple sap · magic sap | 300 · 500 · 1,500 gold |
| Cultist Wizard | corrupted fruit | 1 corrupted gem |

A day of the fleet's fights at combat 30 (five fighters fighting the whole day, about 268–280 rat kills each): **13,797 potions** (half minor, half small health). Bought as potions (600 gold a minor): about 4.1 million gold; as ingredients (2 nettle + 1 algae = 120 gold for two minor, 3 sunflowers = 30 gold for two small): about 0.52 million gold a day — the bank holds 156,000. And the merchants are events, not shops: a few spawns a week.

### What is the potion wall made of, and which lever moves it most?
1. From combat 30 every XP pick drinks about ten health potions a kill (5 minor + 5 small at the rat; 8 greater at 40), and a potion heals 0.2–0.7 HP a second of making against rest's 5–7: the potions are 92–97% of a kill at the field or chain price.
2. The making is ingredient gathers, and the algae is most of it: 10 fishing gathers an algae, 150 of a minor potion's 192–202 seconds. Who makes it moves nothing: the chain by the best-placed maker (b) costs what the fighter's own field price (a) did.
3. The levers by size: the by-product stock (474 → 68 h a level: the bank's algae and sunflowers), then the tier (no road past 36 without the greater potion: alchemy 40), then everything else under 5% (food, tools on alchemy gathers); gold buys a tenth of a day's ingredients and only at an event.
4. The wall moves when the algae is made by work that pays anyway (the fishing objectives) and when alchemy reaches 20 (nettle, minor) and 40 (glowstem, greater): the round lets the planner plan both, and the replay says what that buys.

## By need, through the bank
### The need (settled point 2)
A module of its own beside `gear.ts`: `src/plan/planner/consumables.ts`. One function, `consumableNeeds(world, name)` (`:251`), memoised per World and deciding character like `gearNeeds`; one function for both gear and consumables would have been the larger change (gear needs copies of a piece, a consumable needs a quantity a kill).
- **The candidates** (`:61`, `:69`): every utility potion with a recipe the character can equip; every healing food with a recipe by `consumables.ts healingFoods` (not another recipe's ingredient) whose ingredients feed no gear (`gearMaterial`), and never one of an open parent's own materials (`parentMats`, `:239`: the objective and gear parents' demand and every open objective's own inputs).
- **The works**, as gear by need's: **(a)** each fighter's road to its next combat gate, judged on its next ten levels — the pick and two flips at most two levels up (gear looks at four; a solve with every potion is dearer); **(b)** an open kill objective nobody that is on wins safely on the gear alone — the fleet's work, judged for the highest-level character that wins it with a potion; **(c)** an open parent's `src:` leaf whose source is such a monster; **(d)** an event (settled point 7, below).
- **H0, H1, G** for a consumable of a work: H0 the work's hours with what the pool holds now, on the pool without its potions (`gearWorld`, `:148`; one World a decision) — ∞ when that is no safe win; H1 the hours with it made (free: `freeSec`, `:162`); G the bill of every unit the work takes (`making`, `:179`: `billOf` with its level roads — a recipe nobody meets, and with this task a gathering source nobody meets (`supply.ts:168-180`: the nettle of a minor health potion wants alchemy 20), is a road of the lane's role holders, settled point 8's `gateRoad`). Needed when G + H1 ≤ `NEED_RATIO` × H0 (`needOf`, `:199`). What a kill drinks is the `used` of `potionSet` (`:169`: the pool's gear with every potion a candidate at the chain's price with the stock left out, `reach.ts potionRec`, up to `POTION_REACH` 3 levels above the character); what it eats is the HP missing at its end ÷ a unit's heal, whole units (`foodFor`, `:184`: the cheapest food a HP by its chain).
- **The parent** (`consParents`, `:406`; settled point 3): key `cons:<code>:<work key>`, the work's score on every link — (a) the bundle's (`bundleScore` with G + H1 + the levels past the horizon), (b) points ÷ (G + H1 + the achievement's other hours), (c) the leaf's parent's, (d) the event demand's — and `gated` (its level roads, so `rank()` makes the level a candidate of the lane's role holders, as any gated craft). **Demand**: what the next `HORIZON` (2) chunks of the work drink or eat for the character on it, + `MARGIN` (a fifth), at most the work's own kills (`needOf`); `supplyNeeds` takes the stock and what is in flight off it. The label names the work and the character: "Small Health Potion ×72 for made_up_slimes (Green Slime, 2 chunks)", "Cooked Beef ×232 for Second's road to combat 25 (Highwayman, 2 chunks)"; the supply step's why carries it: "Sunflower: 270 actions short for Small Health Potion ×180 for made_up_slimes (Green Slime, 2 chunks) (+5 pts, chain ~3.4 h); …".
- **Who makes it**: `mat:<potion>` by anyone at the level, `mat:<food>` by the cook (`supply.ts mayCraft`), `src:<ingredient>` by whoever reaches it (`pick.ts pickSource`) — each a supply candidate in `rank()` (`decide.ts:277`) with the parent's score.

### The fight step (settled point 4)
`fightTake` (`consumables.ts:437`), called from `rank()` for every kill plan — an objective's kills (`decide.ts:220`), a combat level (`:233`), a `src:` kill (`:291`) — through `fightPlan` (`decide.ts:193-206`):
- the set is `fightRec`'s on the pool; per potion it drinks, the kills are capped at what **the stock a work of this score may reserve** covers (`reservable`, `:415`: what the character may plan with, less the demand of an event's reserve and of every need that scores better) and at a utility stack (100) — `floor(min(stock, 100) ÷ (a kill's units × 1.2))`;
- `withdraw` holds the potions (the kills' units + a fifth) and the food (the units the HP missing takes, + a fifth, out of what is reservable); it is the step's reservation (`stock.ts reserved`) and compiles into the fight item's `take` (`compile.ts:17-21`);
- nothing covered: the set of the gear alone (`gearWorld`: the pool without its potions) at its own price — the step's `wear` follows it — or, when that does not win, no candidate;
- **a combat level whose pick's potions are all held for better works** goes on at the pick of the gear alone (`decide.ts levelCand`: `planLevel` again on `gearWorld`). Without it the replay's fighters stood at combat 22–25 all season (row D, first run: 64% fallback, 63 points): the pick with the pool's potions (the vampire, 9 minor + 9 small a kill) found nothing reservable, its set without them lost, and the level was no candidate at all;
- the why: "objective: made_up_slimes: 20 Green Slime kills left, +5 pts in ~0.5 h; 20 now (0.5 h) with 72 Small Health Potion from the bank; rests (no food pays: …)" — a step that eats says "with 40 Minor Health Potion and 12 Cooked Beef from the bank", one that rests says why (`restWhy`, `:472`: a food needed and not in the bank yet, no cook that is on, no cook at the level, or no food pays).
- **The others while it runs**: its `withdraw` is out of their `available` (bills, `reservable`); a potion another step reserved stays in their solve pools (`stock.ts:65-69`) — `reservable` keeps them from planning with it (a shortcut: the reservation took the potion out of four pools and back with every step and re-solved their fights).

### The price (settled point 6)
**One function**: `consPrice` (`consumables.ts:108`), behind `reach.ts potionPrice` (`:266`) when `config.consumables` is 1 — a potion or a food the pool holds costs nothing; any other its chain (`chainSec`, `:90`: `billOf` for 100 units ÷ 100 — the stock of every ingredient first, the field by the quickest character that is on with its tools (`fleetSec`), the crafts and a step's fixed seconds, a level road left out (it is the need's G); ∞ when nobody that is on may make it). The food in the plan is the best food the pool holds (`poolFood`, `:75`). Callers:
- the solver's objective: `reach.ts fightRec` / `planRec` / `potionRec` pass `potionPrice: p.price` (`:319`, `:358`, `:394`); **the set is solved resting** — a shortcut: with the food in the solve key the first week's solves tripled as food stock came and went (the food is priced wherever a kill is priced, below);
- every kill price of the core goes through `reach.ts fightSecOf` (`:290`: `killSeconds(f, price, food) × killLog`): `cost.ts actionSec` (`:86`) and `roadRate` (`:212`), `supply.ts fleetSec` (`:93`), `gear.ts killSec` (`:73`), and `events.ts contentSec` (`:84`: potions free inside the hour, the food eaten);
- **the executor's solves** for an owned character: `jobgear.ts jobGear(…, planned)` (`:163`) counts as potions only its step's planned ones, at 0 — they are its stock. For the others it keeps `potionPriceOf(bank)`.

**Healing as it is**: `bis.ts healSeconds` (`:85`) — eating when a food is in the plan: one `use` of the whole units the HP missing takes, each at its price, then rest for what is left under a unit (as `healOnce` does); rest by the docs otherwise. **`USE_SEC` 4.5 s** (`bis.ts:82`): the docs give no number ("Use an item as a consumable.", `docs/api/openapi.json`); the log, 11-19 09:15 → 11-20 08:06 UTC: 1,705 `use` lines, the median to the character's next action 4.49 s (p25 4.10, p75 5.14). `killSeconds(f, price, food)` (`:93`).

**`KILL_LOG`**: on report 012's eight decomposed kill steps of 11-19, the food a fight item made inside itself taken out of the measured (the new executor never makes it there), against the estimate with healing as it is (cooked beef where the fighter's fights on that monster mostly ate, rest where they rested — Third on highwaymen 0 of 45, flying snakes 0 of 40, blue slimes 0 of 150 rested): **0.93, 0.95, 0.96, 1.04, 1.13, 1.24, 1.27, 1.46 — median 1.087, inside 0.9–1.1: no factor, `KILL_LOG` 1** (task 012's rule; `config.ts:70-78`, `killLog(world)`: 0.88 = `KILL_LOG_013` with consumables 0). Over all 23 kill samples with the in-item food making left in, the median is 1.27 (printed beside it). No kill step ran after 08:06 on 11-20, so there is no new sample.

**What became of the old ones**: `potionSec` (field price) — kept for report 013's model (`consumables: 0`), the check's tables and the default of `killSeconds`; `potionPriceOf` and `COVER_RUNS` — kept for `consumables: 0` and the executor's solves of a character the planner does not own; `gatherPays` and its 5 HP/s — kept on the path of the characters the planner does not own: an owned fight item never provisions (section 4).

### The event reserve (settled point 7)
- **The need** (`consumableNeeds` (d), `consumables.ts:362-381`): an event with open demand that can still pay (`eventDemand(...).actions > 0`) — for each character that is on and within ten levels of its monster, `judgeRun` over the demand's kills, H0 = the demand's hours on the gear alone (∞ without a safe win); demand = one spawn's kills (usable seconds ÷ the kill's seconds) × a kill's units + a fifth, **at most a utility stack (100) a member** (a trip carries no more), summed over the members; `reserve: true`, the demand's score.
- **Held out of the others**: `supplyNeeds` serves a reserve parent first, as a floor comes off before any parent (`supply.ts:238`, `:297`); `reservable` takes it off what any other fight step may take, whatever that step's score (`:415-422`).
- **"Can ever be a member"** counts a character that wins with the reserve made (`events.ts possibleMembers`, `:112-117`: the potion set at its level, with consumables 1) — otherwise an event that needs potions could never plan them.
- **`eventMembers`** solves on the pool, its stock in it (the live check at a spawn: a safe win from the pool — an empty reserve, no member); each member's verdict carries `perKill` and `take` (`useOf` / `takeOf`, `consumables.ts:496-509`, `events.ts:397-399`): what the hour drinks and eats, at most 100 a potion; the next member is solved on the pool less it (`withSet`). **`tripOf(c, back, take)`** (`events.ts:427-432`) puts it on the trip's fight item; `eventorders.ts:124` passes it. Nothing is brewed on a trip (its fight item has `take`).

### Bag stock (settled point 9)
- **The runtime's World** (`src/state/planner.ts:93`, `bagsOf` `:100-111`): `bags` = what lies in the owned characters' bags less each one's running step's inputs (its withdrawal, its sources' codes, its recipe's materials, a buy's currency) — every step starts with a bank reset, so it is in the bank within one step.
- **What reads it**: `supply.ts billOf` (`:153-154`: `available + bags`) — the bills, `supplyNeeds`, so what is short is not gathered a second time; `decide.ts planMake` (`:77-78`): a craft step's own field sourcing (Third's 18 slimeballs of 08:13:29). `feedable` and a step's `withdraw` stay the bank's (`stock.ts available`). The forward model leaves `bags` empty: it banks at a step's end.
- **The diamond replayed** (made-up case 9): diamond_in_the_sky on the snapshot plans gathers for the stones short; with the same stones in a bag, no gather is planned, and what the bank feeds for the craft is unchanged (it waits for the bank).

### Made-up cases (`scripts/check-planner.mts`, section 5e)
Section 5e of `scripts/check-planner.mts`, printed by the plain check (all nine pass; the run of "How Alex verifies"):
1. **First stripped to combat 10** (alchemy 5, a copper dagger) and 20 green slimes it wins only with small health potions: the need `cons:small_health_potion:ach:made_up_slimes:0`, 3.0 a kill, demand 72, H0 ∞, H1 0.6 h, G 0.1 h; `mat:small_health_potion@First#1` carries the work's fit (7.78): "Small Health Potion: 72 short for Small Health Potion ×72 for made_up_slimes (Green Slime, 2 chunks)"; with no sunflower, `src:sunflower@First#1` (108 gathers, fit 3.48); with 30 potions in the bank, the kill step "8 now (0.2 h) with 29 Small Health Potion from the bank; rests (no food pays: making it and eating saves less than 0.85 asks)".
2. **Alchemy 1 everywhere**: the need is gated at alchemy 5 (1.1 h by First); Third's level candidate "alchemy 1 → 5 for Small Health Potion in the chain of Small Health Potion ×72 for made_up_slimes".
3. **50 potions, two works**: the work that fits may take 50, the one that fits no deadline 0; the `mat:` leaf's parent is the fitting work.
4. **The snapshot's combat roads**: no potion need (at 20–25 every pick is won without one).
5. **2,000 raw beef, First at cooking 10**: cooked beef is needed by every road and both reaper works (1.0 a kill, e.g. Second's road H0 11 h, H1 7.8 h, G 0.6 h); the cook's candidate: "Cooked Beef: 1401 short for Cooked Beef ×204 for the_reaper (Skeleton, 2 chunks) … 1080 made now (1.5 h)"; with an objective that cooks 400 beef open, no beef need (a parent's own material).
6. **The cook off**: the level step "rests (no cook is on to make Cooked Porkchop or any other food)", and no food need.
7. **5,000 slimes**: demand 374 potions — two chunks of 104 s kills at 3.0 a kill, + a fifth — of the 15,000 the work drinks.
8. **The event reserve**: 50 of each health potion and the full moon's reserve (100 minor health potions, First, one spawn): a work scoring 1e9 may take 0 of the 50 minor; the `mat:` leaf's parent is the event's.
9. **Bag stock**: diamond_in_the_sky, 9 stones short → 13,500 gathers planned; the same stones in Third's bag → none; what the bank feeds the craft is 1 either way.

## The executor
For a character the planner owns only. **How the path is told apart: by the item.** A planner's fight item carries `take` (`src/plan/queue.ts:22-25`; `{}` when nothing was planned — `compile.ts fieldItem`), and a planner's gear item (`pl:` id) reads the `take` of the fight item right behind it (`queue.ts takeOf`, `:213-219`: a step's reset, a trip's reset, a trip's way back into its step). A character the planner does not own never carries one: every line below falls back to today's behaviour when `take` is absent.
- **The quantity a utility slot takes** (`jobgear.ts nextGearAction`, opts `utility` `:312`): with a planned quantity, the reset withdraws and equips exactly it (`:563`, the withdraw and the equip legs), tops a worn stack of the same potion up from the bag or the bank, or takes the excess off for the stash to bank (`:599-608`); the stash keeps a planned top-up in the bag for its slot (`:512-514`) — without that the reset banked the 24 potions it had just withdrawn, a livelock the scenario caught (400 actions). `exec.ts gearSwapStep` passes it (`:148`, `:155`).
- **What the owned solve counts** (`jobgear.ts:163-174`): only the planned potions, free; never a brewable one; the utility slots forced to them.
- **The reset** (`queue.ts` gear case, `:507-528`): the set and the planned potions; then the planned food into the bag (a withdrawal of what is short). **What `keep` protects** (`:238-240`): a planner's reset keeps exactly its planned food (not whatever is in hand), so the next reset banks what is left; the fight item itself keeps its food in hand during bank-offs, as before.
- **What an owned fight item no longer does** (`:482-496`): no `provisionPotions` (it is called only without `take`); no `provisionFood` — `ctxOf` sets `food` false for it (`:254`), so `fightRound` eats what is in hand and rests when that is gone; a round's gear swap leaves the utility slots alone (no refill from the bank: `round` drops them, `:485`); the solve counts no brewable potion.
- **Running dry** (`:492-495`): a `no-win` forecast while a planned potion or the planned food is all gone (`ranDry`, `:221-224`) completes the item with an activity line "ran dry after N fights vs M: … the step ends"; the planner sees the step's items gone, samples it with the units done, blocks nothing, and decides again. With the food gone and the forecast still a win, it rests and fights on.

### Scenarios (all pass)
- `consumables-fight-takes`: two fight steps planned with 40 small health potions and 10 cooked chicken out of 100 and 60 (items with `pl:` ids, the executor alone); the first reset withdraws 40 and 10, the forced fights drink 3 and lose 100 HP each, the second reset tops up by 24 potions and the chicken short, the next step's reset (a gather job) banks the rest (52 potions, every chicken not eaten); no bounce, no brew, no cook, no gather.
- `consumables-no-field-brew`: Pia (combat 10, alchemy 5, a copper dagger) and 20 green slimes she wins only with small health potions, 300 sunflowers and no potion in the bank: `mat:small_health_potion` (supply, 72 for made_up_slimes), then the kill step "20 now (0.5 h) with 72 Small Health Potion from the bank"; no gather and no craft while a fight item is the head; the fights won.
- `consumables-run-dry`: 40 potions in the bank, the step plans 11 kills and takes the 40; the forced fights drink 4 each, so they are gone after the 10th: "ran dry after 10 fights", the step sampled (`kill:green_slime`, n=1), nothing blocked or paused, the next decision is `src:sunflower` for the potions' need.
- `consumables-supply-chain`: Pia (alchemy 1) and Quinn (alchemy 5): sunflowers gathered and brewed by Quinn (`mat:small_health_potion@Quinn`), every step of the chain naming made_up_slimes; Pia works copper ore meanwhile, then kills the slimes with the stock; Pia brews nothing.
- `consumables-not-owned`: Bo (not owned), a hand-added fight item with no `take`: it brews small health potions and cooks the bank's raw chicken itself, as today.
- `consumables-event-trip`: Ann (combat 30, a steel battleaxe, alchemy 30) wins the full moon vampire only with health potions; 100 in the bank. At the spawn: the trip `[gear, fight ×∞ take {health_potion: 100}, the step's reset]`, the reset withdraws 100, the fights drink them, "ran dry after 9 fights", Ann resumes her copper ore in her own set; at the next spawn the reserve is empty: "members: none; not: Ann — gate: no safe win".
- **What the fake and the harness had to learn** (`scripts/harness/fake.mts`): a fight drinks the worn utility potions — a simulated fight what `simulate()` says it uses, a forced one its `used` (a new optional field of `ForcedFight`) — at most the stack, and an emptied slot is cleared. The harness itself needed nothing; the scenarios insert `pl:` items through `insertItem` and track the head per action with an `effect`.

## The replay
`npm run check -- planner`, the run of "How Alex verifies" (2026-11-20 17:44–18:13 local), the snapshot to the deadline. Every row passed every invariant (846,004 checks; 19 and 20 are new).

### The points
| row | day 7 | day 14 | day 30 | day 60 | deadline | seconds · decisions |
|---|---|---|---|---|---|---|
| **A** default: consumables by need, through the bank | 35 | 41 | 51 | 74 | **87** | 1,539 · 8,437 |
| **B** consumables free | 38 | 58 | 65 | 90 | **94** | 365 · 7,198 |
| **C** `consumables: 0` (report 013's row A) | 32 | 36 | 56 | 72 | **77** | 1,020 · 7,009 |
| **D** a win is enough | 37 | 43 | 53 | 75 | **89** | 1,689 · 10,263 |
| **E** no events | 33 | 42 | 49 | 63 | **68** | 704 · 9,310 |
| **F** all five hold the alchemy role | 32 | 41 | 59 | 76 | **86** | 1,523 · 9,444 |

**C is 77**, report 013's row A to the decision (7,009 decisions, the same 10,700 / 47,848 solves cached). It moved once during the work (82): the solve cache's per-pool answer memo, added for invariant 8 under consumables 1, had reached report 013's model too; it is consumables 1 only now (`reach.ts cached`).

### Combat 25 / 30 / 35 / 40 (day)
| | First | Second | Third | Fourth | Fifth |
|---|---|---|---|---|---|
| A | 21.8 / 33.4 / 37.7 / **40.0** | 8.6 / 22.0 / 35.3 / **37.6** | 0.9 / 18.4 / 37.2 / **39.4** | 17.7 / 21.4 / 36.7 / **38.8** | 16.0 / 21.8 / 30.3 / **35.9** |
| B | 74.0 / — / — / — | 0.7 / 11.9 / 14.0 / 15.9 | 6.4 / 7.9 / 9.8 / 12.2 | 1.4 / 13.1 / 15.4 / — | 1.5 / 12.4 / 14.6 / 16.3 |
| C | 13.4 / 16.5 / 42.4 / 81.6 | 0.9 / 14.9 / 38.2 / 57.6 | 12.5 / 15.5 / 33.1 / 61.1 | 13.5 / 16.5 / 41.0 / 80.7 | 11.9 / 14.8 / 34.6 / 56.1 |
| D | 10.1 / 65.3 / 67.4 / 70.1 | 0.7 / 13.5 / 30.6 / 35.6 | 6.9 / 14.8 / 28.2 / 37.3 | 2.3 / 13.6 / 27.4 / 34.6 | 5.2 / 13.5 / 23.5 / 29.5 |
| E | 18.2 / 30.4 / 71.1 / — | 9.9 / 30.5 / 65.5 / — | 0.9 / 13.5 / 70.0 / — | 9.9 / 46.0 / 71.7 / — | 7.7 / 11.1 / 72.0 / — |
| F | 26.2 / 27.8 / 32.1 / 39.3 | 1.1 / 27.4 / 30.2 / 37.6 | 3.0 / 8.9 / 20.9 / 39.3 | 1.0 / 26.7 / 34.4 / 38.6 | 23.9 / 25.8 / 27.2 / 36.8 |

At the deadline A's fighters are at combat 44–46 and wait for combat 50 (grand_master) 36–47 h away; C's waited 2,945–4,093 h. In B and D grand_master completes (B day 16.2, D day 87.6; B's First never needs to fight past 25).

### A gathering role at 35 / 40 (day)
| | A | B | C | D | E | F |
|---|---|---|---|---|---|---|
| Third alchemy | 2.6 / 2.7 | 3.6 / 3.7 | 18.0 / 18.6 | 21.3 / 21.3 | 2.1 / 2.2 | **62.1 / —** |
| First cooking | 8.1 / 8.3 | 7.3 / 13.4 | — / — | 0.9 / 8.3 | 5.0 / 7.0 | 9.0 / 20.3 |
| First fishing | 10.7 / 13.7 | 15.4 / 18.6 | 20.0 / 31.3 | 11.1 / 14.2 | 9.0 / 12.4 | 18.2 / 21.7 |
| First mining | 24.1 / 86.1 | 13.2 / — | 24.8 / — | 36.7 / 62.8 | — / — | 24.5 / 95.9 |
| First woodcutting | 17.8 / — | 11.6 / — | 9.1 / — | 19.0 / 28.9 | 29.5 / 36.5 | 16.1 / 66.4 |
| Second woodcutting | 10.9 / 13.9 | 7.2 / 16.8 | 7.2 / 10.0 | 10.5 / 28.5 | 8.8 / 26.3 | 8.1 / 24.1 |
| Fourth mining | 11.6 / — | 12.1 / — | 9.7 / — | 34.8 / 62.8 | 6.4 / 43.7 | 22.9 / 33.5 |
| Fourth woodcutting | 10.9 / 16.6 | 9.1 / 18.5 | 9.5 / 12.8 | 11.2 / 28.6 | 23.9 / 36.3 | 12.4 / 25.7 |
| Fifth mining | 6.3 / 12.2 | 5.4 / 8.2 | 5.3 / 20.3 | 6.8 / 43.3 | 14.7 / 35.8 | 6.9 / 30.8 |

Alchemy 40 (glowstem, the greater health potion) comes on day 2.7 in A, against 18.6 in C. In F, with the role held by all five, Third reaches alchemy 35 only on day 62.1.

### The hours by answer, the consumables, the events
| row | objective | level | supply | filler | fallback | events | consumable making: ingredients · brewing · cooking (share of fight + making hours) |
|---|---|---|---|---|---|---|---|
| A | 5.4% | 23.4% | 55.0% | 14.5% | 0.1% | 1.6% (181 h) | 5,536 h · 131 h · 29 h (**79.0%** of 7,213 h; fights 1,517 h) |
| B | 7.2% | 11.2% | 1.8% | 16.4% | 61.1% | 2.3% (258 h) | — (fights 804 h) |
| C | 23.3% | 47.2% | 21.8% | 6.4% | 0.0% | 1.3% (149 h) | report 013's: 7,720 of 8,870 fight hours brewing inside the fight items (87.0%) |
| D | 4.5% | 21.5% | 68.5% | 3.4% | 0.0% | 2.1% (235 h) | 7,289 h · 176 h · 39 h (77.8% of 9,651 h; 336 h fought on unsafe wins) |
| E | 6.6% | 10.6% | 68.7% | 14.0% | 0.0% | — | 7,609 h · 127 h · 1.6 h (82.7% of 9,357 h) |
| F | 4.4% | 19.4% | 71.6% | 2.4% | 0.0% | 2.2% (254 h) | 7,595 h · 170 h · 22 h (81.0% of 9,616 h) |

Row A's events: full_moon 4.7 h, bandit_camp 6.3, strange_apparition 33, magic_apparition 57, portal_demon 8.6, cult_of_darkness 30, corrupted_portal 23, portal_efreet_sultan 18, silent_night 1.2. Its ten largest supply targets are all potion ingredients but one: algae for the greater health potions of portal_efreet_sultan's reserve (533 h), diamond stones for gear:hell_ring (480 h), algae for corrupted_portal (318 h), loktar_ogar (248 h), closing_the_gate (210 h), glowstem for portal_efreet_sultan (176 h), …

**Gear made** (first eight days / to the deadline): A 37 / 106 · B 41 / 65 · C 11 / 78 · D 51 / 116 · E 9 / 89 · F 37 / 96.

**Open at the deadline** (every row: another layer 73, use 10, unhandled 10, a raid 8, a group 3): A — an event 8 (corruption_eradicator, draconic_harvest), filler not reached 6, gear 3 (grand_master), does not fit 2 · B — an event 4, filler 6, does not fit 2 · C — an event 12 (closing_the_gate, corruption_eradicator, draconic_harvest), filler 11, a level 3 (grand_master), does not fit 3 (loktar_ogar, turning_treasures_to_gold) · D — filler 11, an event 4, does not fit 2 · E — an event 29 (ten achievements), filler 6, gear 3 · F — filler 11, an event 4, gear 3, does not fit 2.

### Row A: every potion and food
| code | made | by | for (the first works) | drunk / eaten | stock at the deadline |
|---|---|---|---|---|---|
| small health potion | 60,494 | all five (Fifth 15,414 … First 10,148) | the_reaper 0–1, src:ogre_skin, src:spider_leg, arachnophobia, closing_the_gate and 22 more | 52,118 | 8,376 |
| greater health potion | 41,220 | Third 16,780, Fourth 13,042, Fifth 11,398 | cult_of_darkness, king_of_the_goblins, portal_demon, src:owlbear_claw, portal_efreet_sultan and 8 more | 40,697 | 523 |
| minor health potion | 30,280 | Third 19,480, Fourth 3,590, Fifth 3,468, First 2,262, Second 1,480 | src:spider_leg, bandit_camp, arachnophobia, closing_the_gate, the_reaper:2, portal_demon and 6 more | 27,325 | 3,155 |
| health potion | 11,914 | Third 9,302, Fifth 1,572, Fourth 754, Second 164, First 122 | the_reaper:2, src:owlbear_hair, cultist_purifier, portal_demon, cult_of_darkness, portal_efreet_sultan, … | 11,910 | 4 |
| health boost potion | 4,938 | Fourth 2,878, Fifth 1,100, Third 960 | portal_demon, loktar_ogar, the five roads to 50, … | 4,937 | 1 |
| earth / fire / water / air boost | 3,524 / 3,196 / 786 / 682 | all five | the roads to 50, king_of_the_goblins, the event reserves | 3,324 / 2,644 / 786 / 682 | 492 / 552 / 0 / 0 |
| fire / air / earth res potion | 534 / 446 / 150 | Fourth, Fifth, Third | loktar_ogar, portal_efreet_sultan; the roads to 50 (earth) | 531 / 446 / 0 | 3 / 0 / 150 |
| small antidote | 216 | Third | src:spider_leg, arachnophobia | 216 | 0 |
| cooked bass | 10,707 | First | cultist_purifier, king_of_the_goblins, portal_demon, loktar_ogar, cult_of_darkness, portal_efreet_sultan, … | 10,894 | 313 |
| cooked porkchop | 3,651 | First | cultist_purifier, src:cyclops_eye, portal_demon, loktar_ogar | 3,651 | 0 |
| fish soup | 2,976 | First | loktar_ogar, corrupted_portal, portal_efreet_sultan | 2,976 | 0 |
| cooked shrimp | 1,874 | First | the_reaper 0 and 2, First's road | 1,874 | 0 |
| cooked rat meat | 1,489 | First | loktar_ogar, portal_efreet_sultan, src:orc_bone, src:hellhound_hair, corrupted_portal | 1,489 | 0 |
| cooked salmon | 879 | First | corrupted_portal, the roads of Third and Second | 1,137 | 242 |
| cheese / maple syrup | 258 / 230 | First | bandit_camp, full_moon / loktar_ogar | 258 / 230 | 0 / 0 |
| apple pie / health splash potion | 0 / 0 | — | — (the snapshot's stock) | 46 / 199 | 0 / 1 |

**The share of consumable making**: 5,695 h of 7,213 fight and making hours, **79.0%** (report 013's row A: 87% of fight hours, brewed inside the fights).

**A fighter's road waited for its stock** (hours, by the work done meanwhile): Third 776 h (src:nettle_leaf 206, src:algae 165, src:glowstem_leaf 104, expert_alchemist 87) · Second 798 h (src:algae 350, src:sunflower 105, lvl:weaponcrafting:45 69, src:egg 52) · Fourth 803 h (src:algae 249, lvl:jewelrycrafting:45 120, src:sunflower 85, src:glowstem_leaf 78) · First 672 h (src:algae 247, src:sunflower 69, src:egg 59, lvl:fishing:30 54) · Fifth 720 h (src:algae 273, src:sunflower 97, src:glowstem_leaf 95, lvl:mining:35 45). The waiting is mostly making the potions it waits for.

**Works refused stock for a better one**: 307 (the first time each; the check prints 25). The pattern from day 0.1: the_reaper:1 and i_want_bacon get 0 of 232 small health potions while the_reaper:0 takes them; the five roads to combat 50 get 0 of 38 small and 0 of 121 minor health potions on days 0.9–1.3 while closing_the_gate:1, the_reaper:1 and src:ogre_skin (an open parent's hunt) score better; the levels to 22–25 get 0–153 of 519–1,096 cooked shrimp while Third's road to 25 and the reapers take it.

### What the round paid: row A against row C
| | day 7 | day 14 | day 30 | day 60 | deadline |
|---|---|---|---|---|---|
| A | 35 | 41 | **51** | 74 | 87 |
| C | 32 | 36 | **56** | 72 | 77 |

**A is below C on day 30** (51 against 56). What took the hours: three kill objectives that drink potions came later — the_reaper +3 on day 25.9 (C 17.7), cult_destroyer +2 on 30.6 (C 24.5), cultist_purifier +4 on 30.8 (C 28.5); by day 30.8 A has 57. In A their kill steps take their potions from the bank, two chunks at a time, and wait while the stock is made — the `src:` steps are 53.5% of all of A's hours, and 5,536 of the 6,275 supply hours are ingredients for potions and food (algae, sunflower, nettle, glowstem, egg first); in C the fight item brewed inside itself at report 013's price (a potion's ingredients covered for 100 runs free) and the steps simply took longer. A's road waits are listed above. From day 30 on, A pulls ahead: combat 40 by days 35.9–40.0 (C 56.1–81.6), closing_the_gate, loktar_ogar and its_malefic done, 87 against 77.

### What the events cost: row A against row E
| | day 7 | day 14 | day 30 | day 60 | deadline |
|---|---|---|---|---|---|
| A | 35 | 41 | 51 | 74 | 87 |
| E | 33 | 42 | 49 | 63 | 68 |

A is one point below E on day 14. Without events the potion wall holds: E's fighters reach combat 35 on days 65–72 and end at 37–38; its open "an event" points are 29.

### Who brews and cooks for whom, what a combat level from 28 to 40 costs, the next wall
1. **Who**: Third brews most minor and plain health potions (19,480 and 9,302), the greater health potions are Third's, Fourth's and Fifth's (alchemy 40 by day 2.7 for Third), small health potions and the boosts come from all five; First cooks every food (bass, porkchop, fish soup, shrimp, rat meat) — for the kill objectives (the reapers, cultist_purifier, king_of_the_goblins, loktar_ogar), the event reserves (portal_efreet_sultan, corrupted_portal, cult_of_darkness, portal_demon) and the roads to combat 50.
2. **A combat level from 28 to 40** costs about 68 h a level on the levers table (the chain with the bank's stock) against 309 h at today's price; in row A the fighters went from 30 to 40 in 14–22 days (Second 22.0 → 37.6, Fifth 21.8 → 35.9), with 79% of fight and making hours in the making.
3. **The next wall**: algae (10 fishing gathers an algae, the largest supply target from day 30) and grand_master's combat 50 (36–47 h away for each fighter at the deadline); and the 73 points "another layer": the planner opens no toll or key yet.
4. **B and F**: B leaves 7 points on the table (94 against 87), all of them in reach of combat: free potions put the fighters at 40 by days 12–16. F gains nothing (86 against 87): the alchemy road split over five holders slowed Third (alchemy 35 on day 62), and self-supply by the fighters is not worth more than one alchemist with the others gathering.
5. **Combat 40 early enough?** Yes for the fighting: by days 36–40 in A (report 013: 56–82), with 57 days left. The 73 points behind tolls and keys stay "another layer" in every row, B included: they wait for the planner to open layers (016), not for combat.

## What was done / files
**Section 3 — by need, through the bank**
- `src/plan/planner/consumables.ts` (new): the candidates (`potionCands`, `foodCands`, `poolFood`), the price (`chainSec`, `consPrice`), `gearWorld` / `noStock` / `emptyOf`, `potionSet` and `POTION_REACH`, the needs (`foodFor`, `needOf`, `judgeRun`, `h0Without`, `parentMats`, `consumableNeeds`), `baseParents`, `consParents`, `reservable`, `fightTake` and `restWhy`, the forward model's `consumed`, the trip's `useOf` / `takeOf`.
- `src/plan/planner/config.ts`: `consumables` (default 1), `KILL_LOG` 1 and `KILL_LOG_013` 0.88, `killLog(world)`, `HORIZON`, `MARGIN`; `types.ts`: `PlannerConfig.consumables`, `World.bags`.
- `src/plan/planner/reach.ts`: `potionPrice` → `consPrice` with consumables 1, `Price.food`, `fightSecOf`, `potionRec`, the solve cache (`cached` / `lookup`, with consumables 1 only: the answer memoised per pool object, a safe win serves a pool that only gained a potion, `without` repairs one that only lost one, 16 answers a key; `planRec`'s `bare` for a level above the character's own; `openOf`, the fleet's gear, for a level above the character's own and a member's potion set; `potionRec` keyed without its prices).
- `src/plan/planner/decide.ts`: `fightPlan` (`:193-206`) on the objective, level and `src:` kill plans; `levelCand`'s fallback to the pick of the gear alone; `consParents` among the parents (`:277`); a step's own `wear` (`:342`); `planMake` counts bag stock in its field sourcing (`:77-78`).
- `src/plan/planner/supply.ts`: `Parent.reserve` served first in `supplyNeeds`; `billOf` counts `World.bags` and, with consumables 1, prices a gathering source nobody meets as a level road.
- `src/plan/planner/{cost,gear,events}.ts`: every kill price through `fightSecOf`; `cost.ts levelHoursEstimate`: the pace at the character's own level on the fleet's gear (consumables 1); `events.ts`: the reserve member in `possibleMembers`, the `Verdict`'s `perKill` / `take`, `tripOf(…, take)`, `Share.perKill`, `eventStep`'s withdrawal, `eventDemand` memoised per World; `bundle.ts`: win gates on `gearWorld`.
- `src/plan/bis.ts`: `Food`, `USE_SEC`, `healSeconds`, `killSeconds(f, price, food)` — the healing term only.
- `src/plan/consumables.ts`: `healingFoods` and `gearMaterial` exported.
- `src/state/planner.ts`: `bagsOf` in `worldOf` (`:93-111`).

**Section 4 — the executor**
- `src/plan/queue.ts:22-25`: the fight item's optional `take`; `src/plan/planner/compile.ts:17-21`, `:36`: `itemsOf` puts the step's `withdraw` into it (`{}` when none).
- `src/plan/jobgear.ts`: `jobGear(…, planned)` (`:163-174`); `GearActionOpts.utility` (`:312`), the reset stash (`:512-514`), the top-up and trim (`:598-608`), the withdraw and equip legs.
- `src/state/exec.ts`: `gearSwapStep` passes `utility` (`:148`, `:155`); `desiredForJob(…, take)` (`:236-245`).
- `src/state/queue.ts`: `takeOf`, `ranDry` (`:213-223`), `keepOf` (`:238-240`), `ctxOf`'s `fed` (`:254`), the fight case (`:482-496`), the gear case (`:507-528`).
- `src/state/eventorders.ts:124`: the member's `take` to the trip.
- `scripts/harness/fake.mts`: a fight drinks the worn utility potions (`ForcedFight.used`).
- Six scenarios: `scripts/scenarios/consumables-{fight-takes,no-field-brew,run-dry,supply-chain,not-owned,event-trip}.mts`.

**Section 5 — the forward model and the replay**: `forward.ts drinksOf` → `consumed` with consumables 1 (the one-unit stack and the ingredients-as-if-brewed kept for 0), `Attended.perKill` to `eventStep`, the outlook's note; `scripts/check-planner.mts`: rows A–F (`ALCHEMY_ALL`), started first; invariants 19 and 20; `Run.cons` and its prints (every row's consumable lines, row A's made / drunk / waited / refused); the made-up cases of section 5e (nine); section 2's tables (`consCostTable`, `roadTable`, `leversTable`, `goldTable`); the kill samples on the new healing (`ATE`, the decomposed steps); `## What the round paid`; task 012's stock cases and rule 4's case on consumables 0.

**`CLAUDE.md`**: the gear-model and food paragraphs (an owned character's fight item), a "Consumables (task 014)" bullet in the planner's section, the checks.

**Commands run**
- `git add docs/rework.md; git commit -m "Rework notes"` first (`938d11f`); the planning chat changed it again during the work (decision 36, the Lab), committed again the same way (`4f2f589`); and once more (decisions 37 and 38: 015 is the journal, the branch `rework` from 015 on) as `6fd2f0f`, before the task commit.
- `npm run typecheck` (`tsc --noEmit -p .`) after every change; final clean.
- `npm run check -- <name>` for each new scenario: `consumables-fight-takes` failed first on a livelock (400 actions: the reset banked the top-up it had just withdrawn → the stash keeps a planned top-up), then on its own assertion (the chicken eaten after a step's last fight belongs to the next step); `consumables-supply-chain` once on its assertion (a gear chain's ash wood); `consumables-event-trip` twice (the second spawn said "does not fit": nobody could ever be a member → `possibleMembers` counts a member with its reserve made; then the world gave Ann alchemy 30 so the reserve can be made).
- `npm run check`: four times. The first failed invariants 12 (a withdrawal rounded past fractional stock) and 14 (`cons:` parents), five made-up cases; the second only invariant 20 (the invariant read one parent of a shared leaf); the third green; the last after the final edits — see "How Alex verifies".
- `scripts/check-planner.mts` plain and with `-v`, several times, with temporary flags (a short week, no rows, a counter of cache misses, details of invariants 3 and 8) — all removed.
- Scratch profiles (`--cpu-prof`) of four and six days forward: the new model first ran at 0.5–0.6 s a decision against report 013's 0.15 (a row would have taken an hour against the 30-minute backstop); the misses fell from 39,000 to 16,000 in four days, 0.20 s a decision, by the shortcuts listed in Notes.
- The rows one by one (`AMMO_PLANNER_ROW=<i>`, a temporary progress line), five rounds:
  1. row D 272 s, but its fighters stood at combat 22–25 all season (64% fallback, 63 points) → the combat level's fallback to the pick of the gear alone (`decide.ts levelCand`); invariant 20 failed once (`mat:small_antidote` 176 of 173: each parent's bill makes whole runs) → the invariant rounds each need up to the recipe's quantity; row B ran 45 s a game day (every potion a candidate at every level) → row B's levels above the character's own on the gear alone;
  2. row B failed invariant 3 on every kill (its free potions are in no bank) → the check counts a potion as at hand in row B; row C ended at 82, not 77 → the per-pool answer memo (added for invariant 8 with consumables 1) is consumables 1 only, and row C is 77 again (7,009 decisions, the same cache counts as before);
  3. gear made fell to 10 pieces (78 in row C): gear by need judged on the gear alone → back to the pool's potions (settled point 6), 18 gear steps in eight days against 9;
  4. rows A, D, F (events on) ran past 1,800 s while E (no events) took 773 s: a profile of row A's days 30–34 (0.53 s a decision: gear by need 46%, the needs' potion sets 35%) and counters of the solve cache over days 20–24 (13,200 own-level planning solves, 7,500 above the character's own level, 3,200 potion sets in 466 decisions; the misses: a pool that gained back a piece — sets move between the bank and the characters at every step — with all six answers of its key taken, and 1,700 new potion-set keys from the chain's prices drifting) → the solves above the character's own level and the potion sets on the fleet's gear (`reach.ts openOf`), the potion set keyed without its prices, 16 answers a key with consumables 1: 156 s → 100 s for the same window; rows A 1,573 s, D 1,372 s, F 1,905 s;
  5. the road's pace at the character's own level on the fleet's gear too (`cost.ts levelHoursEstimate`): row A to day 32 in 434 s against 576 s. The plain check then failed made-up cases 1, 3 and 7: a need's potion set on the fleet's gear counted pieces the others wear (First, stripped to combat 10, won the slimes without a potion there) → a need's potion set back on the character's own pool; the fleet's gear only where it is an estimate (a level above, the road's pace, whether a character can ever be an event's member).
- `npm run check -- planner`: four full runs: the first killed at the 1,800 s backstop (the rows past day 30 at 0.5 s a decision); one I stopped when the plain check failed made-up cases 1, 3 and 7 (round 5 above); then green twice — 1,726 s (`deadline points 87 / 94 / 77 / 85 / 68 / 87`) and, after a possible event member's win level moved onto the fleet's gear too, **1,716 s** (`OK (846004 invariant checks, 67 made-up cases; deadline points 87 / 94 / 77 / 89 / 68 / 86)`, the run this report quotes).
- `npx vite build --outDir <scratch>/ammo-014-dist --emptyOutDir`: `index.html 0.40 kB`, `assets/index-Dc_NjE2T.css 37.23 kB`, `assets/index-H30V_8O8.js 433.34 kB │ gzip: 146.52 kB`, `✓ built in 2.05s`; deleted.
- Scratch, all deleted at the end: the agent's log readers and my re-runs of them, the potion probes (a fight won only with a potion: green slime at 10, the full moon vampire at 30), the week timer and profiler.
- No request to the game, no `.env`, no `.ammo/*`; no service started, stopped or called; nothing written to `logs/dev.log`.

## Notes
**Defects noticed and not touched**
- **A level step's craft sample is set against a craft-only estimate** (`craft:air_boost_potion` 117 s against 3 s, "slower than expected" twice): `stepSample` (`src/state/planner.ts:260-265`) finds no `craft` target for a `lvl:` key and prices `{ work }` without its inputs.
- **A level step triggers no achievements read**: intermediate_alchemist completed by Third's alchemy 20 at 12:23 UTC and is not read yet (`planner.ts next()` reads after an objective's or filler's step only).
- **An owned character's `task-loop` (filler) still provisions** food and potions (settled point 1 names its fight items; `work-task` / `task-loop` are not fight items and kept today's path).
- **A kill source inside a craft step** (`planMake`'s sources) fights with `take: {}` — no potions taken — while `actionSec` prices it with the pool's stock free; one that needs a potion would run dry at once. None arises today.
- **The forward model's event work** assumes the member works its whole share, while a trip carries at most 100 of a potion (`takeOf`): an event that drinks more than that an hour is credited too many kills.
- **A need's potion set searches at most twelve potions, by code** (`bis.ts chooseGroup` takes the first 12 of a group's pool; the forced candidates are sorted by code): with alchemy 40, 17 potions can be made, so a fighter's potion set never weighs minor or small health potions, the small antidote or the water potions. Not touched (`bis.ts` is open to the healing term only); it shows from alchemy 40.
- **The solve cache keys a set on the gear and the potions' presence, not their quantity**: a pool holding 3 potions plans a fight that drinks 10 a kill as freely as one holding 300; the step's kills are capped by the stock (`fightTake`), not the price.
- Still as before: a restart repeats one action of a running item (four times in this window); three role holders take one gated level for one parent's points (`decide.ts:288-291` at `c8266ac`).

**Guesses in the numbers, most doubtful first**
1. **`KILL_LOG` 1** rests on eight decomposed kill steps of 11-19 (median 1.087), the food made inside the fight items taken out; with it left in, over 23 samples, 1.27. No kill step has run on 012's or 014's prices yet: the first live kill steps will say which.
2. **The cache shortcuts that keep a row inside the 30-minute backstop** (each a `shortcut:` comment in `reach.ts` / `consumables.ts` / `cost.ts`): a level above a character's own and a bundle's win gates are judged on the gear alone (row B too: every potion free at the character's own level only); a level above the character's own, the road's pace at its own level and whether a character can ever be an event's member are solved on the fleet's gear (`reach.ts openOf`: a piece another character wears counts as the bank's); a need's potion set keeps the prices it was first solved with while the gear and the level hold; a safe win serves a pool that only gained a potion; one that only lost a potion is simulated again without it; a need's potion set is priced on an empty bank and looked for at most three levels up; the set is solved resting (the food priced where the kill is). Each can make a plan differ from what a full solve would give; none shows in the invariants. One shortcut was taken back: gear by need judged on the gear alone made 9 gear steps in the first eight days against 18 with the pool's potions (settled point 6 prices gear by need with them), at no saving (140 s against 113 s for eight days).
3. **`HORIZON` 2 chunks, `MARGIN` a fifth, `NEED_RATIO` 0.85 reused**, the event reserve of one spawn capped at a utility stack a member: the chat's guesses, kept.
4. **`USE_SEC` 4.5 s** is the log's line-to-line median, client overhead included (rest is the docs', without it); `UNITS` 100 (a step's fixed seconds spread over a stack in the chain's price).
5. **`ATE`** (which kill samples ate) is read per fighter and monster from 11-19/20, not per step.

## To delete (Alex)
Nothing. The scratch scripts, probes, the agent's readers and the scratch build are deleted.
