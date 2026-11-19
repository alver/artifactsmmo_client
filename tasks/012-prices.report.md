# 012 — The prices round: what a fight gives and takes, stock is free, the node of a gather, a gated craft in a chain — report

## Summary
- **Fight XP (section 2): the gap rule was read one level off at both ends, and the set's wisdom was left out.** The 1,232 won fights of 11-19 give a highwayman at a gap of 5 its full XP (33; the old rule paid 21) and a flying snake at a gap of 10 XP × 0.7 (19; the old rule paid 0), and every fight sits 4–17% above the formula without wisdom. The repaired rule: × 0.7 only **more** than 5 levels above, nothing more than 10 above, + 0.1% a point of the planned set's wisdom. The base formula stands. The pig gives XP through combat 29 and none from 30.
- **A kill's price (section 3): the factor of two was `KILL_LOG` 1.3 and healing priced as rest.** The fight's cooldown (2 s a turn) holds within the sets' noise. Rest now follows the docs' 1 s per 1% of max HP; the log confirms it: the seconds per HP track each character's max HP, and 58 of Second's rests ended sooner than 5 HP/s allows. `KILL_LOG` re-measured over all 23 kill steps of the planner's era is **0.88**: most steps eat, and food heals faster than rest. A craft, trade or gear step now costs its walks and bank moves, about 1–3 minutes.
- **Deadline points 63 / 70 / 56 / 65** (A default, B potions free, C the field price always, D a win is enough) against report 011's 56 / 56 / 56 / 59. Row C, report 011's row A with sections 2, 3 and 5, still lands on 56.
- **The event (the fighters at 30)** comes on days 10.6–13.2 in row A (C: 30.7–51.1; report 011's A: 41–64). **The layer (a gathering specialist at 40)** comes on day 14.4 (Third's alchemy; Fifth's mining on day 20.8). **The next wall is combat 33–35**: the 2,099 algae are drunk by about day 7, potions are back at the field price (rat at 30: 1,438 s a kill, 94% of it potions), and the goblins (33) have no craftable flip.
- No restart during the work: the service ran report 011's code (`[50ry]`, from 20:06:01 UTC); the log was read to 21:49:12 UTC.

## Decisions for Alex
None. Food (settled point 3) and potions as supply through the bank are the planning chat's; this report prints what hangs on them.

## How Alex verifies
1. `git log --oneline -3` → `012: prices round` on top of `Rework notes` (`a3b9558`); `git status` clean.
2. `npm run check` → `52 checks: 51 ok, 1 known defect reproduced, 0 failed` (`repeat-spin` known; about 80 s); `check-planner` `OK (10664 invariant checks, 40 made-up cases)`.
3. `npm run check -- planner` → about 9 minutes; ends `OK (343240 invariant checks, 41 made-up cases; deadline points 63 / 70 / 56 / 65)`. Besides report 011's tables it prints: `## What a fight gives (task 012 section 2)` and `… per fighter` twice; `## What a kill takes`, `## A kill step's parts`, `## Healing as it is`, `## A step's fixed cost`; `## Stock is free, per fighter`; the by-product table with `covered now`; `## The node and the gate`; the traps with the old rest rule beside the new; in every replay row `supply hours by target and parent`; in row A `the bank's potions and potion ingredients` and `each fighter at combat 25, 28, 30, 35` with XP a kill and `covered` / `field price`.
4. `npm run typecheck` prints nothing after `tsc --noEmit`; the scratch build succeeded (see "Commands run").
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → `tasks/012-prices.md`, `tasks/012-prices.report.md`, `CLAUDE.md`, `scripts/check-planner.mts`, `src/plan/bis.ts`, `src/plan/jobgear.ts`, `src/plan/xp.ts`, `src/sim/cost.ts`, `src/plan/planner/{bundle,config,cost,decide,forward,gear,pick,reach,supply,types}.ts` — all allowed by the task. (`src/plan/consumables.ts` is not in it: see section 3.)
7. **After the restart — not checked by me** (the restart is Alex's):
   - a `src:diamond_stone` step of First, Fourth or Fifth (the mining role) names the coal rocks: "Coal Rocks: 20 mining XP a gather, the lane's best (over Copper Rocks: the XP share decided)". Second and Third keep the copper rocks (no mining role).
   - when a miner's level step carries the chain, its why reads `mining 24 → 35 for Diamond in the chain of diamond_in_the_sky …`. The diamond objective's chain is about 173 h, 77 h of it the road to mining 35 (section 5).
   - Second's `lvl:combat:25` why should read about 0.85–0.95 XP/s while the skeleton favor lasts (to 00:00 UTC; 57–60 XP a kill; the log shows 2,900–3,650 XP/h). One caveat: the why divides by the costs table's measured `kill:skeleton`, an exponential mean (70 s at 20:17), which still carries Fifth's 93 s sample. Until that mean settles near the log's 59–64 s, the stated rate can read 10–20% low.
   - no `mat:`, `gear:` or trade step is planned at 0.0 h (their hours now include `stepSec`, at least 42 s).

I ran 2–5 on the final code; 1 and 6 after the commit.

## The hours since 19:34
Read as a stream from `logs/dev.log` (never copied), with the scratch readers of report 011's kind (a background agent wrote them; I re-ran them on the new tail). Window: **from 19:34:46.231 to 21:49:12.974 UTC**, the log's last line when read: 2.24 hours. Code references in this section are to `f4d4118` (011), the code that ran.

**One restart.** `[ca7c]` (010's code) wrote its last line at 20:05:40.419. `[50ry] server start (prod) on :5173` followed at 20:06:01.783; `[50ry]` runs `f4d4118` (HEAD `a3b9558` changes only `docs/rework.md`). At 20:06:02.569 came `re-attached` ×5 (`src:diamond_stone@First#1`, `lvl:combat:25@Second#1`, `src:diamond_stone@Third#2`, `src:diamond_stone@Fourth#1`, `src:diamond_stone@Fifth#1`) and `queue resumed after reload` ×5: every running step, nothing taken over or dropped (`src/state/planner.ts:575-589`).

### Steps per character
Units planned/done; hours planned/taken (taken = the step's own items at the head). Steps in brackets started before 19:34:46. No interrupt was at any head in the window.

| who | steps |
|---|---|
| First | (19:07:17 `src:diamond_stone#1`, supply, 212/**213**, 1.5/1.47 h) · 20:35:55 `#2`, 210 planned, 175 by 21:49 — parent diamond_in_the_sky |
| Second | (19:03:43 `lvl:combat:25#1`, level, 69/**70** skeletons, 1.5/1.23 h) · 20:17:42 `#2`, 77/77, 1.5/1.36 h · 21:39:23 `#3` (combat 24 → 25), 79 planned, 11 by 21:49 |
| Third | (19:26:44 `src:diamond_stone#2`, 212/**213**, 1.5/1.48 h) · 20:55:38 `#3`, 211 planned, 130 by 21:49 |
| Fourth | (18:44:37 `src:diamond_stone#1`, 212/**213**, 1.5/1.47 h) · 20:13:00 `#2`, 212/212, 1.5/1.49 h · 21:42:09 `#3`, 212 planned, 17 by 21:49 |
| Fifth | (19:17:07 `src:diamond_stone#1`, 212/**213**, 1.5/1.53 h) · 20:49:14 `#2`, 210 planned, 143 by 21:49 |

The diamond steps' "actions short" stay at 3,864–3,869: 3 stones × 1,500 less the others' 212s in flight (`src/plan/planner/supply.ts:198`). A chunk that finds no stone does not lower it — as designed.

### Samples against their estimates
| time | who | key | measured | estimate | × |
|---|---|---|---|---|---|
| 20:12:58, 20:35:55, 20:55:38, 21:42:09 | Fourth, First, Third, Fourth | `gather:copper_rocks` | 25 s | 25 s | 1.00 |
| 20:49:14 | Fifth | `gather:copper_rocks` | 26 s | 25 s | 1.04 |
| 20:17:42, 21:39:23 | Second | `kill:skeleton` | 64 s | 128 s | **0.50** |

### Every notable line
**None** of `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`, `offering interrupt issued again`, `comes back at`, `took over`, `not a safe win`, a lost fight or a paused queue in the window.

| time | line(s) | verdict |
|---|---|---|
| 20:06:02.569 | `re-attached …` ×5 | as designed |
| 20:06:02.912 | `api POST /my/First/action/gathering -> 499 … 1.48 seconds remaining` | as designed: the new process's first gather fell inside the cooldown of First's 20:05:40 gather; `src/api/client.ts:127` waits and retries |
| 20:05:24 / 20:06:06; 20:35:55, 20:49:14, 20:55:38, 20:13:00 | `note Second: fighting 60/69` before the restart **and again** after it. Every step running across the restart ended one unit over: Second 70/69, First, Third, Fourth and Fifth 213/212 | **small defect**: an item's counter is written only after the action's cooldown wait (fight: `src/state/exec.ts:508`, then `src/state/queue.ts:470`; gather: `queue.ts:363-365`), so a restart inside that wait repeats one action per running fight or gather item |
| 21:25:07–21:45:53 | 9 × `network error — retry 1/6` (one `2/6`, 21:27:06) | as designed: all recovered, no pause |
| every supply step | why reads `supply: supply: …` | cosmetic: `decide.ts:282` and `:299` both prefix the answer |

### Task 011's acceptance step 7
From the first decision after the restart (20:13:00) to 21:49 the planner made **seven** decisions: four `src:diamond_stone` steps (parent: the craft objective) and three of Second's `lvl:combat:25`. **No `gear:` step, no supply step for a gear piece, no why beginning `filler (`. Step 7 is not exercised yet.**

### The diamond chain (17:53:25 → 21:49:12)
All chunks mine `copper_rocks` at (2, 0) and bank at (4, 1): every rock that drops the stone, ranked by `gatherSec × perUnit` alone (`src/plan/planner/targets.ts:65-81`).

| who | chunks | gathers | stones |
|---|---|---|---|
| Third | `#1` 17:53:25 (212), `#2` 19:26:44 (213), `#3` 20:55:38 (130, running) | 555 | **1** (18:35:45, banked 18:55:22) |
| Fourth | `#1` 18:44:37 (213), `#2` 20:13:00 (212), `#3` 21:42:09 (17) | 442 | 0 |
| First | `#1` 19:07:17 (213), `#2` 20:35:55 (175) | 388 | 0 |
| Fifth | `#1` 19:17:07 (213), `#2` 20:49:14 (143) | 356 | 0 |
| **total** | | **1,741** (≈ 12 character-hours at 25 s) | **1** (1.16 expected at 1 in 1,500) |

Four of five characters have been on it since 19:17:07, with 0 mining XP. The bank got copper ore and some gems besides. **Once the stones are there**, the chain stops at the objective's own craft: the objective is "craft 2 diamonds", the recipe wants mining 35 (`targets.ts:140` puts the gate on the target), and `planObjective` passes over a target whose gates the character does not meet (`decide.ts:90`). The miners stand at 22–24 and copper brings them no nearer. (The agent's draft placed this gate on a `mat:diamond` leaf; there is none: the bill is the objective's inputs, the stones only.)

### Offerings
No offering line in the window; **00:05 UTC of 11-20 is not in the log** (it ends at 21:49 on 11-19). The 11-19 skeleton favor still pays 57 XP a skeleton.

### Fights
| who | monster (step) | fights | lost | XP an hour, real | the why | s/kill planned → real |
|---|---|---|---|---|---|---|
| Second | skeleton (`lvl:combat:25#1`, 39 in the window) | 70 (whole step) | 0 | 3,094 | 0.46 XP/s = 1,656 | 78 → 63 |
| Second | skeleton (`#2`) | 77 | 0 | 2,902 | 0.51 XP/s = 1,836 | 70 → 64 |
| Second | skeleton (`#3`, running) | 11 | 0 | 3,022 | 0.53 XP/s = 1,908 | – |

Nobody else fought. Second ate cooked beef after nearly every fight and went cooking three times in the first hour.

### What the log says the next task should fix first
1. The diamond chain: 1,741 gathers (≈ 12 character-hours) at the copper rocks since 17:53 for 1 stone, no mining XP, for a craft gated at mining 35 — this task's section 5.
2. The kill price: 64 s measured against 128 s estimated; the plans come close only through the measured mean — section 3.
3. Fight XP: the why reads 0.46–0.53 XP/s, the log shows about 0.85 — section 2.
4. Food: one fighter eats after nearly every fight and cooks three times an hour — not modelled (settled point 3).
5. Small: a restart repeats one action of every running fight or gather item; `supply: supply:` in the why.

## What a fight gives
### The evidence
`logs/dev.log`, 2026-11-19 09:15–20:19 UTC: 1,242 fights, 1,232 won. Each fight's monster comes from the tile the character stood on. The combat level is the snapshot's XP plus every combat XP logged since (fights and the combat offerings' `+N xp`), levelled by the atlas's `xpNeeded`. The reconstruction matches all seven combat levels the plan lines state (10:33 Second 22, 13:43 Third 20, 13:51 Fifth 21, 13:57 Second 22, 14:10 First 21, 19:03 Second 23, 20:17 Second 23). The favor comes from the `offering/accept` lines: skeletons × 1.5 from 16:23–16:24 until the reset.

**The wisdom worn cannot be read from the log.** Every reset's `equip` and `withdraw` bodies are cut at 200 characters, and the cut tail is where the amulet, the second ring and the artifacts sit. A tracker over the visible equips gives 25–135, a floor. So the table states the wisdom each XP value **implies** under each rule: fightXp inverted, base × penalty × favor × (1 + w/1000), rounded. That has to be a wisdom a set can wear: from 0 up to the novice guide's 25 plus the pool's wisdom pieces, 250 at most. The one set the log shows nearly whole, Second's after 17:50 (steel battleaxe, hard leather helmet, mushmush jacket +10, … cut; novice guide +25), fits the implied 81–100 with a wisdom amulet (+60) in the cut.

| monster (level, HP) | gap | favor | fights | who, combat | XP seen (fights) | fightXp as called → repaired, wisdom 0 | wisdom implied: old rule · repaired |
|---|---|---|---|---|---|---|---|
| blue slime (6, 120) | 17 | 1 | 150 | Second 23 | 0 (150) | 0 → 0 | any · any |
| flying snake (12, 360) | **10** | 1 | 40 | Fourth 22 | **19** (40) | **0 → 18** | **impossible** · 44…101 |
| highwayman (15, 380) | **5** | 1 | 85 | Fifth 20, Third 20 | **33** (85) | **21 → 30** | **537…585** · 76…109 |
| highwayman | 6 | 1 | 230 | First, Fourth, Fifth 21 | 22 (142), 23 (88) | 21 → 21 | 42…139 · the same |
| highwayman | 7 | 1 | 144 | Second 22 | 23 (105), 21 (39) | 20 → 20 | 16…164 · the same |
| pig (19, 480) | 1 | 1 | 24 | Third 20 | 43 (24) | 38 → 38 | 113…139 · the same |
| pig | 2 | 1 | 88 | Fifth, First, Third 21 | 42 (50), 43 (37), 41 (1) | 37 → 37 | 86…166 · the same |
| pig | 3 | 1 | 59 | Second 22 | 41 (42), 40 (17) | 36 → 36 | 83…138 · the same |
| pig | 4 | 1 | 25 | Second 23 | 39 (25) | 36 → 36 | 78…106 · the same |
| skeleton (18, 480) | 3 | 1 | 2 | Fifth 21 | 40 (2) | 36 → 36 | 87…114 · the same |
| skeleton | 3 | 1.5 | 160 | Fifth, First, Third, Fourth 21 | 62 (94), 60 (35), 63 (31) | 54 → 54 | 91…165 · the same |
| skeleton | 4 | 1.5 | 110 | Second, Fourth, Fifth 22 | 60 (84), 62 (21), 59 (5) | 54 → 54 | 97…172 · the same |
| skeleton | **5** | 1.5 | 115 | Second 23 | **57** (115) | **36 → 53** | **544…571** · 81…100 |

### The docs
- `docs/audit/domain-rules.md:56`, restating the game's docs of 2026-10-26: "round((monsterLevel / playerLevel × 20 + monsterHp × 0.04) × penalty × mult × (1 + wisdom × 0.001))"; `:57`: "player 5–9 levels above the monster: ×0.7; 10 or more above: 0"; `:66`: "Wisdom | +0.1% XP per point".
- `docs/api/openapi.json:1` (the file is one line), `CharacterSchema.wisdom`: "Wisdom increases the amount of XP gained from fights and skills (1% extra per 10 wisdom)."

### The verdict: the gap rule (both ends) and wisdom; the base stands
- **The gap rule is one level off at both ends.** At a gap of 5 the log pays the full XP: under the old × 0.7 the highwayman and skeleton rows would need a wisdom of 537–585, which no set has. At a gap of 10 it pays × 0.7, where the old rule gives 0. The repaired reading, × 0.7 when the gap is **more than** 5 and nothing when it is **more than** 10, makes every row imply a wearable wisdom. Before it, three rows were impossible or out of range.
- **Wisdom counts.** Every row sits 4–17% above the formula at wisdom 0, which is 40–170 points of wisdom, the range the fleet's sets carry (novice guide 25, wisdom amulet 60, wolf ears 50, …).
- **The base stands**: with both repairs no row needs a wisdom outside 0–250.
- **Gaps the log does not contain**: 8 and 9 (taken as × 0.7, between the 6, 7 and 10 seen) and 11–16. The first zero lies somewhere in 11–17 (the blue slimes at 17 give 0); "more than 10" is the docs' own threshold read with the same "more than" as the 5. So **"the pig stops at 30" (gap 11) rests on that reading, not on a logged fight.**

### The repair
- `src/plan/xp.ts:67-71` `fightXp`: `gap > 10 ? 0 : gap > 5 ? 0.7 : 1`; `:74-78` `wisdomOf(codes)`.
- **Where the planner takes the wisdom from: the set it plans the fight with.** `src/plan/planner/reach.ts:247-251` `setWisdom(ch, rec)` = the solved set's pieces plus any pinned artifact the character wears that the set left out (the executor never removes one).
  - `pickMonster` (`src/plan/planner/pick.ts:42`): with the full solve's set (`fightRec`).
  - `roadRate` (`src/plan/planner/cost.ts:211`, `:219`): each road entry keeps the wisdom of the set solved at its first winning level.
  - `gear.ts`'s `h1` (`src/plan/planner/gear.ts:229-232`): the new set's wisdom.
  - `forward.ts`'s `field` (`src/plan/planner/forward.ts:136`): the worn set's `wisdom` stat, which `wear` already keeps up to date.
  - **A level-up** changes the wisdom only through the gear the new level allows: `roadRate` solves at that level (`chAt`), the forward model wears the step's set. The solver's objective stays seconds per kill.
- Not in the planner, not allowed here: `src/state/queue.ts:708` (`trainingMonsterFor`, the old `train` item) still calls `fightXp` without wisdom; it now gets the repaired gap rule (Notes).

### Per fighter, before and after (`npm run check -- planner`, "What a fight gives, per fighter")
XP an hour with both sections before → with section 2 → with sections 2 and 3 (the kill's seconds: rest at 5 HP/s × 1.3 → the docs' rest × 0.88; the same set under both).

| fighter | the 2026-11-18 snapshot: the pick | the fleet at 19:21 UTC (the log's levels and sets): the pick |
|---|---|---|
| First (20 / 22) | pig 874 → wolf 1,226 → wolf 1,830 XP/h (wolf 22 → 36 XP: gap 5, wisdom 150) | pig 1,210 → 1,378 → 2,220 (pig 36 → 41 XP) |
| Second (22 / 23) | highwayman 622 → 715 → 1,068 (20 → 23 XP) | pig 1,210 → 1,378 → 2,250; skeleton 24 → 40 XP (gap 5) |
| Third (20 / 21) | highwayman 653 → 1,057 → 1,561 (21 → 34 XP) | pig 1,244 → 1,412 → 2,274 |
| Fourth (21 / 22) | highwayman 653 → 715 → 1,056 | pig 1,154 → 1,347 → 2,215 |
| Fifth (20 / 22) | highwayman 653 → 1,057 → 1,561 | pig 1,244 → 1,412 → 2,274 |

**The pig (19) gives XP through combat 29 and nothing from 30.** Before, nothing from 29.

## What a fight and a step take
### The evidence
The planner's kill steps since 16:22 UTC, from `logs/dev.log` (an action's seconds run from its line to the character's next action: the cooldown plus the client's ~0.3–3 s). Per kill:

| step (start) | kills | fight | rest (HP a rest) | eat (HP eaten) | the food's making | walks + bank | total | estimate's parts (sets of the log, pieces made by then) |
|---|---|---|---|---|---|---|---|---|
| Second `ach:i_want_bacon:0` pig (15:51:13) | 46 | 30.3 | 39.8 (199) | 0.4 (15) | 0.1 | 13.3 | **84.0** | fight 32 (16 turns), rest 48 (248 HP), walk 0.5 → **80** × 0.88 = 71; before 107 |
| Fifth `ach:the_reaper:0` skeleton (16:02:55) | 42 | 34.0 | 16.8 (76) | 6.2 (250) | 28.2 (fishing inside) | 7.1 | **93.3** | fight 36 (18), rest 65 (369 HP) → 101 × 0.88 = 89; before 143 |
| Second `src:blue_slimeball` (17:30:47) | 150 | 10.1 | 6.9 (19) | 0 | 0.9 | 2.0 | **20.0** | fight 8 (4), rest 5 → 13 × 0.88 = 11; before 18 |
| Fourth `src:flying_wing` (17:45:44) | 40 | 31.0 | 41.2 (202) | 0.1 (8) | 0 | 10.6 | **82.9** | fight 28 (14), rest 37 (222 HP) → 65 × 0.88 = 57; before 95 |
| Fifth `src:skeleton_bone#1` (17:57:12) | 38 | 33.7 | 10.6 (45) | 5.2 (272) | 7.3 | 10.1 | **66.9** | fight 36, rest 64 → 100 × 0.88 = 88; before 143 |
| Second `src:skeleton_bone` (18:20:40) | 42 | 30.4 | 11.8 (75) | 4.0 (232) | 8.5 | 6.8 | **61.5** | fight 36, rest 64 (387 HP) → 100 × 0.88 = 88; before 148 |
| Fifth `src:skeleton_bone#2` (18:39:34) | 38 | 31.3 | 9.5 (58) | 3.1 (272) | 9.0 | 6.3 | **59.3** | as above → 88; before 143 |
| Second `lvl:combat:25#1` (19:03:43) | 70 | 30.8 | 11.8 (64) | 3.4 (251) | 11.9 | 5.5 | **63.4** | as above → 88; before 148 |

The log carries no turns. These steps had no bank trip or brew beyond the cooking and fishing for food listed. By report 011's section 1 they drank no potion: the 16 small health potions Second and Fourth wore on slimes and snakes came back whole, as far as the cut lines show.

### The verdict
- **The fight's cooldown is not where the factor sits.** Measured fight to next action: 30–34 s (skeleton), 30 s (pig), 31 s (flying snake), 10 s (blue slime), and 37–44 s for the morning's highwaymen. The forecasts, on the sets the log shows: 36, 32, 28, 8 and 28–32 s. That is ±25% either way, the sets' noise (the cut equip lines hide part of each set), not a bias. 2 s a turn is the docs' (`docs/audit/domain-rules.md:40`); the cooldown is not repaired.
- **Rest: the docs' 1 s per 1% of max HP, and the log agrees.** The docs in `docs/` disagree with each other: `docs/api/openapi.json:1` ("1 second per 5 HP, minimum 3 seconds") and `docs/game-actions.md:46` say 5 HP/s, while report 004 read the online docs as 1 s per 1% of missing HP (`docs/rework.md:611-612`). The log decides. 1,205 rests: 100 × HP restored ÷ seconds gives a median max HP of 460–498 per character, and it moves with the gear (Fifth: 432–448 in the morning, 531 from 18:34). 58 of Second's rests ended sooner than `ceil(hp / 5)` allows. Repaired: `src/sim/cost.ts:15-18` `restSeconds(hp, maxHp)`, called with the fight's max HP in `killSeconds` (`src/plan/bis.ts:80`).
- **Where the factor of two was:**
  1. `KILL_LOG` 1.3 multiplied everything. For the rest-only steps, fight + rest + walk already lands within 5% of the log: Second's pigs 80 against 84 s, Fourth's flying snakes 65 against 83 s.
  2. Healing was priced as rest while the fighters eat. The skeleton steps heal about 250 HP a kill with food: 3–6 s of eating plus 7–12 s of cooking and walking to the workshop, then 10–17 s of rest. The price assumed 64–78 s of rest (74–78 s at 5 HP/s, × 1.3).
- **What the repair changes elsewhere.**
  - In the solver's objective, a lost HP now costs 100/maxHP seconds: a set with more HP loses less rest per HP (trap 2's direction).
  - In `consumables.ts` `gatherPays`: **nothing — it keeps `restSeconds`' 500-HP default**, the old reading. At the fleet's 470–610 max HP the docs' rule would move its threshold by −18% to +6%. But the harness's level-10 characters (~165 HP) then rest at 1.65 HP/s, find fishing for gudgeon worth it after one fight, and three existing scenarios (`planner-picks-kill`, `planner-claims`, …) fail. The task allows that file only if the repair changes `gatherPays`' meaning; leaving it on the default keeps the meaning and the scenarios. Whether low-HP characters should fish for food is for the planning chat (Notes).
  - `src/sim/combat.ts:451` (the forecast's display field) and the harness's fake (`scripts/harness/fake.mts:354`) call `restSeconds` with one argument and keep 5 HP/s.

### `KILL_LOG` afterwards
Every kill sample of the planner's era (09:15–20:17 UTC, 23 `sample` lines) against the repaired estimate: `killSeconds` (docs' rest, potions at the field price) plus the bank trips, no factor. Each is solved in the sets the log shows, with the pieces crafted before the step started (none before 15:50; two steel battleaxes from 15:50; with the helmets and pants from 16:00; everything from 17:51). Sorted by the ratio (`npm run check -- planner`, "What a kill takes"):

0.43 · 0.44 · 0.47 · 0.49 (skeletons 19:17, 19:03, 20:17, 18:39) · 0.67 (skeleton 17:57) · 0.68 · 0.73 · 0.75 · 0.77 (highwaymen) · 0.78 (pig 17:11) · 0.79 · 0.81 (highwaymen) · **0.86** (flying snake) · 0.88 (pig 15:09) · 0.88 · 0.94 · 0.95 (highwaymen) · 1.00 (blue slime) · 1.00 · 1.11 (highwaymen) · 1.67 · 1.95 · 1.97 (the pig steps of 13:43–16:02 that brewed potions under the old objective)

**The median is 0.877 → `KILL_LOG` 0.88** (`src/plan/planner/config.ts:63`), outside 0.9–1.1, so it stays. One number for every kill; a made-up case asserts it equals the printed median.
- Without the three brewing steps: 0.841.
- Cross-check on the planner's own estimates of the time (rest at 5 HP/s, × 1.3): measured ÷ (estimate ÷ 1.3) has a median of 0.845; the rest rule moves that by at most ±9% at these max HPs.
- The number depends on the reconstructed sets: with every fighter given all of 11-19's pieces it comes out at 1.13, with none at 0.81. That is the most doubtful guess of this report (Notes).

### Healing as it is (read-only)
Per fighter, over the steps above:

| fighter | kills | healing a fight (eat + rest) | the food's own making a fight | together | the rest the price assumes |
|---|---|---|---|---|---|
| Second | 308 | 15 s | 4.3 s | 19 s | 33 s (−41%) |
| Fifth | 118 | 17 s | 15 s (fishing and cooking inside the steps) | 33 s | 64 s (−49%) |
| Fourth | 40 | 41 s | 0 | 41 s | 37 s (+12%) |

1. **"Healing is rest" is within 15% only for a fighter who rests**: Fourth on flying snakes (+12%), Second on pigs (40 s against 48 s).
2. For the food eaters, healing plus the food's whole making costs 41–49% less than the rest the price assumes: 19–33 s a fight against 33–64 s.
3. So the repaired price is right for resting fighters and 1.4–1.8× too high for eating ones. `KILL_LOG` 0.88 is the mix of the two on 11-19.

### A step's fixed cost (settled point 4)
`src/plan/planner/cost.ts:59-72` `stepSec(place, from)`: the walk from `from` to the nearest bank (the reset), plus 2 × `bankSec(place)` (to the workshop or the trader and back for the deposit), plus `STEP_BANK_SEC`, the bank moves (`config.ts:52`). That last is **42 s, the median of the 13 steps' bank moves** (11–164 s), a printed case. Against the log (`npm run check -- planner`, "A step's fixed cost"): measured fixed seconds (total less the runs) against the new price.

| step | fixed (log) | price |
|---|---|---|
| First `mat:hard_leather` ×3 (15:09, 15:11, 15:15) | 118, 46, 46 s | 127, 72, 72 s |
| First `mat:steel_bar` (15:12) | 156 | 112 |
| Second `gear:steel_battleaxe` (15:47), Third `gear:hard_leather_helmet` (15:55) | 209, 199 | 117, 107 |
| Third `gear:hard_leather_pants`, `…boots`, `…helmet` (15:59, 17:49, 17:50) | 45, 58, 45 | 52, 52, 52 |
| Second `mat:hardwood_plank` (17:11, 30 planks: three bagfuls) | 538 | 197 |
| Second `mat:steel_bar` (17:23, 34 bars) | 273 | 112 |
| Third `mat:iron_bar` (17:51), Fourth `mat:hardwood_plank` (18:41) | 87, 200 | 112, 142 |

The price was 0.0 h before. It now holds within about 2× for single-bagful steps; it is low for the steps that walk once per bagful (Second's 30 planks) or unequip a whole fight set first (the 15:47 and 15:55 resets). Where it enters:
- `planMake` (`decide.ts:75-76`, so in the chunking and in the step's hours);
- `rank()`'s gear step (`decide.ts:262`), trade (`:283`) and `mat:` craft (`:290`);
- `billOf`, once per `mat:` leaf, craft or trade (`supply.ts:141`, `:161`, `:176-177`);
- an objective parent's own step (`supply.ts:241`);
- `makeHours`, once per gear piece code (`gear.ts:118`).

`CRAFT_SEC` stays 5 s a run: the log's crafting actions take 5 s a unit (2 → 12.8 s, 14 → 72.9 s, 48 → 240.3 s, the rest client overhead). A new invariant (17) checks that no craft or trade step is planned below its fixed seconds.

### The two traps of `bis.ts`'s header (First stripped to level 10, 165 HP, against a cow)
- **fire staff, iron sword, small health potions** → iron sword + potion, safe, 18 turns, 4 potions. Before the docs' rest: 74 s (a potion at its rest) / 240 s (`potionSec`). After: 102 s / 268 s. At 165 max HP rest is now 1.65 HP/s.
- **iron sword, copper armor, small health potions** → sword + **armor** + potion, safe, 4 potions: 74 / 240 s before, 97 / 263 s after.

Both shut, before and after.

### Made-up cases (formulas)
- `restSeconds(130, 520) = 25`, `(130) = 26`, `(5, 600) = 3`, `(0, 520) = 0`.
- `killSeconds` rests by the fight's max HP (10 turns, 200 of 1,000 HP: 40 s).
- `stepSec` = bank + 2 × workshop + 42.
- `STEP_BANK_SEC` = the median.
- `KILL_LOG` = the printed median.
- `fightXp`: 30 at a gap of 5, 18 at 10, 0 at 11, 38 with 100 wisdom.
- The pig stops at 30 (it was 29).
- Every logged row implies a wearable wisdom under the repaired rule; some cannot under the old.

## Stock is free
### The function
`src/plan/xp.ts:126-160` `potionPriceOf(have)`, beside `potionSec` (which stays the field price):
- Per recipe and ingredient, all or nothing: an ingredient the stock holds for `COVER_RUNS` = 100 runs of that recipe costs nothing; any other costs its field seconds as in `potionSec`. Add the craft and divide by the recipe's quantity.
- It returns the price, the covered pairs and a key; one price function per key.
- Values: a minor health potion (2 nettle + 1 algae, makes 2) costs 192 s at the field price, 42 s with the algae covered, 153 s with only the nettle covered, 2.5 s with both. With 99 runs of algae it is 192 s again.

**The core's seam**: `reach.ts:208-224` `potionPrice(world, name)`.
- It calls `potionPriceOf` over `available(code, world, name)`: the bank less the others' reservations and the floors.
- × `config.potionK` (row B: 0).
- `config.potionStock` 0 means the field price always (row C). That is one more config number with the potionK rules: default 1, not in the UI, never a patch (`config.ts:44-46`, `types.ts:89`).
- Every core caller passes it: `cost.ts:87`, `:210`; `gear.ts:72`; `supply.ts:86`; the two solves `reach.ts:242`, `:273`.

**The executor's solves** (`src/plan/jobgear.ts`), all of which took the default (field) price before:
- `ownedFightRec`, `:143`;
- `jobGear`'s owned solve and its brewable-potion solve, `:169-171`, `:182`;
- the "kills faster" comparison, `:188`.

They now pass `potionPriceOf` over the bank they are given (`:145-148`).
- **The forecast gate**: the executor's `forecastVs` (`src/state/queue.ts:685`, `canBeat`) only asks "does it win", and the solver ranks the win and safe tiers before any price. A stock-aware price only reorders sets inside a tier, so the gate answers the same.

### The caches
`fightRec` and `planRec` were keyed on `potionK`. They are now keyed on what the price is, but only the part a solve can see (`reach.ts:227-230` `solveKey`): the covered ingredients of the potions the pool holds (`bestInSlot` sees owned potions only). Keying on the whole covered set changed the key whenever any ingredient anywhere crossed its line, and nearly doubled the first week.

The first week inside `npm run check`: 70–78 s for 591 decisions (report 011's code, run here before the change: 54 s, 595 decisions). The plain check's solve tables end at 1,645 full and 10,932 planning-grade solves, against 1,114 and 9,425 before (+48% and +16%). Keying on the whole covered set had taken the week to 96 s. Keying on the pool's potions, memoising the gate's roads (`supply.ts:46-71`) and leaving them out of the bills that only want leaves (`supply.ts:184`) brought it back.

### The forward model drinks (settled point 6)
`src/plan/planner/forward.ts:84-114` `drinksOf(world, step)`, debited in `advance` (`:160`):
- Per kill work of the step and its sources: the potions the forecast of its set drinks (`fightRec`, `used`) × the kills.
- The brewed stack first, then the recipe's ingredients for the rest.
- Never below zero or a floor, nor into what a running step reserved — the others' and the step's own withdrawal (`:100`).
- `forward()` hands `advance` every running step as `current` (`:222`).

**Two corrections the replay forced:**
1. **The brewed stack is drunk down to one unit, not to none** (`:104-107`, a `shortcut:`). The planner plans a potion only while the pool holds one. Draining the stack took every potion out of every pool: on the first replay every fighter stalled at combat 30, the fallback took 67% of the hours, and rows A, B and C were all 54, because a potion that is in no pool has no price. In play the executor brews more from the bank (`exec.ts provisionPotions`). The model now keeps the potion plannable and lets the ingredients, then the field price, carry the cost, as settled point 6 says. Who would brew for a fighter whose alchemy is below the recipe stays parked (potions as supply through the bank).
2. **The drinks leave reserved stock alone.** Otherwise an alchemy step's slimeballs or sunflowers went below zero (invariant 15).

The outlook's notes say so (`forward.ts:289`).

### Made-up cases
- A minor health potion with algae for 100 runs costs 42 s; with 99 runs, the field price.
- First at combat 30, with 30 brewed minor health potions, 120 algae and 300 nettle leaves in the bank: the pick is the rat at 142 s a kill drinking 15 potions. At the field price it is the same rat at 2,472 s.
- Another character's step reserving 50 of the 120 algae: for First the algae is not covered (the nettle-only price); for the reserver it is.
- One step forward: the step drinks 29 potions, then 120 algae and 300 nettle. The stack is at one unit, the algae no longer covered, nothing below zero.

### Report 011's by-product table, with what is covered now (`npm run check -- planner`, "By-products in a potion's price")
| potion | the ingredient | its share of the price | the snapshot bank (2026-11-17) | covered | the log's bank | covered |
|---|---|---|---|---|---|---|
| minor health (192 s) | algae | 150 s | 2,099 | **yes** (100 runs = 100) | ≈ 2,287 (net +188 in the visible moves) | yes |
| health splash (207 s) | algae | 150 s | 2,099 | yes | ≈ 2,287 | yes |
| air / earth / fire / water boost (368 s) | green / yellow / red / blue slimeball | 200 s | 15 / 0 / 0 / 0 | no | unknown / 0 / 0 / 18 | no |
| the four res potions (672 s) | the slimeballs | 400 s | 15 / 0 / 0 / 0 | no | the same | no |
| small antidote (412 s), health boost (432 s) | milk bucket | 240 s | 5 | no | ≈ 291 | yes |
| health potion / greater health (432 / 442 s) | egg | 240 s | 15 | no | unknown | – |
| enhanced health splash (827 s) | coconut | 540 s | 0 | no | 0 | no |

"The log's bank" is the fixture plus the net deposit and withdraw moves since 2026-11-17 00:00. 180 of those bodies are cut, and the fixture's own time is a date only (eggs, green slimeballs and sunflowers come out negative, so they are unknown). The nettle (the minor health potion's other ingredient) stands at 0 in both.

### Per fighter at combat 25, 28, 30 and 35: covered against the field price
On the snapshot bank plus 100 minor and 100 small health potions — what the alchemist's training brews into the bank. The snapshot bank alone holds no potion, so no pick could drink. Covered: sunflower 381 (small health), algae 2,099 (minor health).

| fighter | 25 | 28 | 30 | 35 |
|---|---|---|---|---|
| First | wolf 69 s, no potion (both) | pig 87 s, 3 small health · field: pig 93 s, no potion | rat 497 s, 10 minor + 10 small · field 2,213 s | rat 495 s · field 2,211 s |
| Second–Fifth | highwayman 74 s, 1 small health · field 77 s, none | pig 109 s, 6 small · field 346 s | rat 582 s, 12 minor + 12 small · field 2,641 s | rat 580 s · field 2,640 s |

Covered, the potion fight is 4–5 times cheaper. At 28 the covered price puts potions on a fight the field price fights bare.

## The node and the gate
### The node (settled point 7)
**Before**: `rank()`'s `src` branch took the leaf's work as `sourceFor` gave it, one node for everyone (`targets.ts:65-81`, the least `gatherSec × perUnit`).

**After**: `src/plan/planner/pick.ts:104-160` `pickSource(code, ch, world)`, called from `decide.ts:272`.
- Among the nodes and monsters that drop the code, exist now, are reached by a free route, whose place's gates are met (`:129`) and whose own gates the character meets (the skill level; a safe win; no boss), take the least **net** seconds an item.
- Net = seconds an action × actions an item × (1 − the XP share).
- The XP share = the source's XP per second ÷ that of the character's best XP source of the lane (`pickNode`; `pickMonster` without the objective bonus), at most 1. It counts only when the character holds the lane's role; combat is everyone's.
- A source whose one action takes more than two chunks is none (`:144`, `:154`): the XP share once picked a 3.1-hour kill.

**The why** names the node and says when the XP share decided (`decide.ts:277`): "Coal Rocks: 20 mining XP a gather, the lane's best (over Copper Rocks: the XP share decided)".

**In flight**: the others' `src:` steps count in items at their own node's rate, converted to the static source's actions (`decide.ts:171-178`).

**Kills as a source**: the same lines (`pick.ts:148-157`), with combat XP against `pickMonster`. For the 150 blue slimes of 17:30 it would have changed nothing: the blue slime is the only monster that drops a blue slimeball (`public/data/monsters.json`), and at combat 23 it gives 0 XP.

**`fleetSec` and the bill keep the static source.** The bill prices `src:diamond_stone` at the copper rocks, 25 s a gather. The miners now gather at the coal rocks at about 33 s, so in wall-clock the chain runs about 30% longer than the bill says. That is less than the XP share explains: those miners' coal hours are their levelling road (net 0). Repricing the bill would make the same chain look dearer for the very characters for whom it is free.

### What the ore of the chosen node is worth (read-only)
On the fleet at the log's latest levels, the open bills (objectives and every gear need) are short of **0 coal**; 42 h at the coal rocks bring about 4,500 coal (33 s a gather, Fourth). So a credit for the ore would buy nothing today. No credit in this task.

### The gate (settled point 8)
- `src/plan/planner/supply.ts:28-71` `gateRoad(lane, level, world)`: a craft whose level nobody who may craft it meets (anyone for a gathering skill's recipe, the role holder for gear crafting and cooking; on or not) gets the road for the character that gets there first, among those that are on (`hoursToLevel`). ∞ means nobody has an XP source on the way. Memoised on the levels, the measured level hours and the layer (`shortcut:` on the pool).
- `billOf` keeps per lane the highest craft level of the chain and puts its road into the bill's hours (`:184-191`; `bill.gated`).
- `objectiveParents` adds the objective's own craft: diamond_in_the_sky is "craft 2 diamonds" and the recipe is the gate (`:228-244`). A parent with ∞ waits.
- `rank()` makes the level a candidate of the lane's role holders with the parent's score (`decide.ts:297-302`, as the gear crafter's level).
- `waitingOf` (`forward.ts:255-269`) now sees the gates of a craft input's bill and calls a level nobody reaches **"a level with no XP source on the way"**.

### Made-up cases
- A miner with the role (Fifth, mining 24) takes the stone at the coal rocks (20 XP a gather, share 1.00, net 0) over copper.
- Second, without the role, takes it at the copper rocks (net 38,123 s a stone).
- With Fifth's 1,250 gold-rock gathers and Fourth's 1,500 copper-rock gathers in flight, Third's shortfall goes 13,500 → 10,500 actions: one stone each.
- diamond_in_the_sky on the snapshot: the parent's 173 h include the 77-hour road to mining 35 (Fourth's). Fourth has the `lvl:mining:35` candidate with the parent's score.
- With every character where no route leads, the parent waits and `waitingOf` says "a level with no XP source on the way".

### On the fleet at the log's latest levels (`npm run check -- planner`, "The node and the gate")
- **diamond_in_the_sky, before**: everybody at the copper rocks, the chain 42 h (report 011) to 95 h by the bill, with no gate.
- **After**: First, Fourth and Fifth (the mining role) at the coal rocks, net 0; Second and Third at the copper rocks.
- The chain is now **173 h**: the bill's 95 h, the 77-hour road to mining 35 by Fourth, and the craft step.
- First, Fourth and Fifth carry the level candidate `lvl:mining:35`, score 0.0174 ("mining 24 → 35 for Diamond in the chain of diamond_in_the_sky … Coal at 2159 XP/h").
- **Every other open parent whose chain has a gated craft** waits for something else first:
  - another layer: adamantite_mastery, catch_and_cook:2, heartbound, magic_power, palm_paradise, potion_brewer:1, shining_secrets;
  - an event: potion_brewer:0 (magic sap);
  - a leaf nobody that is on sources yet: alchemist:1 and :2, cabinet_maker:2, catch_and_cook:0 and :1, cursed_wood_blessed_victory, worker:2.
  - making_a_nether_portal is filler and no parent of supply. For it and worker:2, the miners' rule-3 candidate `lvl:mining:30` already carries the points.

## The replay
`npm run check -- planner`, from the 2026-11-18 snapshot to 2027-02-24, all five on, every invariant on every decision; four rows in four child processes.

| row | day 7 | day 14 | day 30 | day 60 | deadline | report 011 | fight hours that are potion making |
|---|---|---|---|---|---|---|---|
| A default (stock is free, the fights drink) | 33 | 38 | 52 | 62 | **63** | 56 | 7,412 of 8,181 h, 90.6% |
| B potions free | 39 | 50 | 60 | 70 | **70** | 56 (C there) | 0 of 971 h |
| C the field price always | 34 | 43 | 49 | 56 | **56** | 56 (A there) | 7,280 of 8,193 h, 88.9% |
| D a win is enough | 32 | 41 | 52 | 61 | **65** | 59 | 7,746 of 8,366 h, 92.6% |

**The day each fighter reaches combat 25 / 30 / 35 / 40** (— = not by the deadline):

| row | First | Second | Third | Fourth | Fifth | at the end |
|---|---|---|---|---|---|---|
| A | 10.6 / 13.2 / 68.1 / — | 0.9 / 10.6 / 42.8 / — | 9.5 / 11.8 / — | 9.7 / 12.2 / — | 9.6 / 12.0 / — | 33–36, waiting for combat 50 (grand_master) |
| B | 6.1 / 15.0 / 16.6 / — | 0.9 / 5.8 / 9.8 / 12.1 | 5.7 / 7.1 / 13.6 / 16.1 | 5.8 / 7.2 / 10.6 / 15.4 | 5.9 / 12.3 / 13.6 / 14.9 | 40+: nothing behind the next combat gate |
| C | 48.3 / 51.1 / 94.3 / — | 0.9 / 30.7 / 63.3 / — | 28.4 / 30.7 / 74.0 / — | 30.9 / 33.9 / 76.1 / — | 22.6 / 31.6 / 71.9 / — | 35–37 |
| D | 6.1 / 9.4 / — | 1.0 / 8.4 / 65.5 / — | 1.1 / 8.5 / — | 1.1 / 9.4 / 65.5 / — | 5.1 / 9.0 / — | 33–35 |

**A gathering role at 40**:
- A: Third alchemy day 14.4, Fifth mining 20.8, First fishing 22.3 and woodcutting 47.2; Second's woodcutting and Fourth's mining never.
- B: 8.1, 9.3, 20.7, 21.2 (Second woodcutting), 21.5 (Fourth woodcutting).
- C: 8.5, 7.8, 15.3, Second woodcutting 9.7.
- D: 9.2, 12.2, 20.2.

**Hours by answer**:
- A: objective 22.0%, level 16.6% (of it combat 10.2%), **supply 44.7%**, filler 16.6%, fallback 0.
- B: 5.9 / 14.8 / 0.6 / 16.6 / **fallback 62.1%** (nothing scores once the fighters are past 40).
- C: 11.0 / 71.0 / 0.7 / 17.3 / 0.
- D: 37.9 / 11.5 / 33.4 / 17.2 / 0.

**Row A's supply hours** (the new print "supply hours by target and parent"): **`src:cursed_wood` for `ach:cursed_wood_blessed_victory:0` 4,121 h**, then `src:cursed_wood` for gear:jester_hat 451 h, owlbear claws for a royal skeleton ring 151 h, and so on.
- Cursed wood drops only from the cursed tree (level 34, 1 in 10), and 50 cursed planks take about 5,000 kills. Once potion fights are plannable at the covered or field price, that chain is a real candidate.
- It fits no deadline, so it takes the "real by points per hour" tier, ahead of the combat road to grand_master, which fits none either. It does not complete: it waits under "does not fit" at the deadline.
- That is rule 4 as decided (decision 29), not a defect of this task. It is what B's fallback hours do with free potions: there the chain completes.
- Row D spends 3,333 h the same way; rows B and C under 40 h on any one supply target.

**Gear made** (eight days / the deadline):
- A 16 / 49, B 26 / 49, C 12 / 30, D 36 / 58 (report 011: A 23 / 51).
- Supply: 5,091 / 64 / 80 / 3,796 character-hours.

**Open points at the deadline**:
- A: another layer 67 · an event 35 · use 10 · unhandled 10 · a raid 8 · gear (no safe win within ten levels) 7 (grand_master, king_of_the_goblins, loktar_ogar) · filler not reached 6 · a group 3 · does not fit 1 (cursed_wood_blessed_victory).
- B: the same but gear 1 (loktar_ogar).
- C: gear 15 (cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar, the_reaper).
- D: a level 5, gear 1.

**Row A, the bank's potions and ingredients** (stock / drunk so far / made on the way so far):

| code | day 0 | day 7 | day 14 | day 30 | day 60 | day 97 (the deadline) |
|---|---|---|---|---|---|---|
| algae | 2,099 / 0 / 0 | **0** / 1,862 / 7 | 66 / 2,612 / 823 | 0 / 4,336 / 2,603 | 0 / 7,256 / 5,523 | 0 / 8,126 / 6,393 |
| sunflower | 381 / 0 / 0 | 144 / 0 / 0 | 144 / 0 / 0 | 13 / 0 / 0 | 13 / 0 / 0 | 13 / 0 / 0 |
| nettle leaf | 0 | 1,628 / 3,972 / 5,800 | 0 / 5,600 / 5,800 | the same | the same | the same |
| sap | 0 | 0 | 4,415 / 824 / 2,454 | 300 / 4,774 / 2,454 | 300 / 5,762 / 3,442 | the same |
| egg | 0 | 0 | 11 / 15 / 14 | 0 / 26 / 14 | the same | the same |
| minor health potion | 0 | 1 / 199 | 1 / 199 | 1 / 199 | 1 / 199 | 1 / 199 |
| health potion | 0 | 0 | 195 / 148 | 1 / 672 | 1 / 672 | 1 / 672 |

**The algae runs out on about day 7**, and every pair covered at the start (small health / sunflower, the boosts, minor health / algae, …) is uncovered by then. The nettles an alchemy objective's supply gathered (5,800 by day 7) are drunk by day 14. From then on the fishing objectives' algae (6,393 made) is drunk as it comes: the stock never reaches 100 runs again.

**Row A, per fighter at combat 25, 28, 30, 35** (the pick, kill seconds, XP a kill, potions and whether covered):

| fighter | 25 | 28 | 30 | 35 / the end |
|---|---|---|---|---|
| First | highwayman 44 s, 23 XP, no potion | skeleton 76 s, 27 XP | rat 1,438 s, 57 XP, 8 minor health (field price, 94%) | 35: rat 108 s, 35 XP, no potion |
| Second | wolf 69 s, 23 XP | pig 68 s, 26 XP | imp 738 s, 96 XP, 16 minor health (**covered**, 79%) | 35: rat 107 s, 36 XP, no potion |
| Third | wolf 47 s, 21 XP | pig 65 s, 26 XP | imp 2,851 s, 100 XP, 16 minor health (field, 95%) | 33: vampire 91 s, 33 XP, no potion |
| Fourth | wolf 52 s, 23 XP | pig 67 s, 25 XP | rat 1,265 s, 55 XP, 7 minor health (field, 93%) | 33: vampire 751 s, 4 minor health (field, 90%) |
| Fifth | highwayman 48 s, 22 XP | pig 69 s, 28 XP | rat 1,448 s, 55 XP, 8 minor health (field, 93%) | 33: rat 921 s, 5 minor health (field, 91%) |

### Which section moved what
1. On the snapshot, the pick's XP an hour gains **+9–62% from section 2**: the gap of 5 (highwaymen and wolves at 20) and wisdom. It gains **+48–49% from section 3**: the kill price, rest by the docs and × 0.88 instead of × 1.3.
2. **Section 4 moves nothing on the snapshot**: its bank holds no potion, so no pick drinks. The stock acts in the replay once alchemy brews potions into the bank and the fighters pass 28.
3. Sections 2 and 3 together: row C, report 011's row A with sections 2, 3 and 5, puts the fighters at 30 on days 30.7–51.1 instead of 41–64. That is about 10–13 days, which the two sections share roughly in proportion to their XP-an-hour gains.
4. Row A against row C is the stock: 30 on days 10.6–13.2 instead of 30.7–51.1, and 63 points instead of 56. The stock is free only to about day 7, but that is when the potion-priced kill objectives become plannable: the_reaper, arachnophobia_conquered and cultist_purifier (+9 points) open and carry the combat road, where in C they wait for "gear".
5. That attribution is between rows, not isolated: A and C also differ in the chains the potions open (row A's 5,091 supply hours).

### When does the fleet reach an event and a layer now, and what is the next wall?
1. **Events (the fighters at 30)**: days 10.6–13.2 in row A (B: 5.8–15.0; C: 30.7–51.1; report 011: 41–64).
2. **A layer (a gathering specialist at 40)**: day 14.4 in row A (Third's alchemy; Fifth's mining 20.8). B and C reach it on days 7.8–9.3.
3. **The next wall is combat 33–35 in rows A, C and D.**
   - Past the pig, the safe XP monsters (rat 25, imp 28, vampire 24) are potion fights at the field price: 7–16 minor health potions, 90–95% of the kill.
   - The goblins (33) have no craftable flip.
   - Row B shows the ceiling of that wall: with free potions all but First reach 40 by day 16, and the deadline gives 70.
4. **A does not land on C, but its stock is short.** The 2,099 algae bought about a week of covered potions. That week opened the potion-priced objectives (+7 points over C) and brought the fighters to 30 about three weeks earlier. From day 7 every algae is drunk as soon as the fishing objectives land it (8,126 drunk against 6,393 made).
5. **For potions to stay cheap**, someone would fish for algae and gather nettles for the fighters: about 1 algae and 2 nettles per 2 minor health potions, 7–16 potions a fight, about 4–8 algae and 7–16 nettles a fight. The alchemist would have to brew them; that is potions as supply through the bank (parked). With both covered a minor health potion costs 2.5 s instead of 192 s.

## What was done / files
**Section 1** — read-only; scratch readers only (see "Commands run").

**Section 2 — fight XP**
- `src/plan/xp.ts:58-71` `fightXp` (the gap rule, the comment with the evidence), `:73-78` `wisdomOf`.
- `src/plan/planner/reach.ts:245-251` `setWisdom`.
- `pick.ts:38-42` (`pickMonster`); `cost.ts:186`, `:207-211`, `:219` (`roadRate`); `gear.ts:229-232` (`h1`); `forward.ts:136` (`advance`).
- `scripts/check-planner.mts`: `XP_LOG`, `RULES`, `impliedW`, `oldFightXp`, `pigStop`; `xpEvidenceTable`, `xpTable`; three made-up cases.

**Section 3 — a fight and a step**
- `src/sim/cost.ts:11-18` `restSeconds(hp, maxHp = 500)`.
- `src/plan/bis.ts:11-24` (the header), `:69-71` (the seam's comment), `:76-81` `killSeconds`.
- `src/plan/planner/config.ts:52` `STEP_BANK_SEC`, `:57-63` `KILL_LOG` 0.88.
- `cost.ts:59-72` `stepSec`, `makePlace`; `decide.ts:75-76`, `:262`, `:283`, `:290`; `supply.ts:141`, `:161`, `:176-177`, `:241`; `gear.ts:118`.
- `scripts/check-planner.mts`: `KILL_SAMPLES`, `STEPS_LOG`, `MAKE_LOG`, `killParts`, `killTable` (with the healing table), `makeTable`, `oldKillSec`, the traps' second figure; invariant 17; five made-up cases.
- `src/plan/consumables.ts` is **unchanged** (see the verdict).

**Section 4 — stock is free**
- `src/plan/xp.ts:126-160` `COVER_RUNS`, `potionPriceOf`.
- `reach.ts:197-230` `Price`, `potionPrice(world, name)`, `solveKey`; the two solves `:238-243`, `:269-274`.
- `types.ts:88-89`, `config.ts:40-46` `potionStock`.
- `jobgear.ts:22`, `:143-148`, `:169-171`, `:188`.
- `forward.ts:84-114` `drinksOf`, `:160`, `:219-223`, `:8-12` and `:289` (the notes).
- `scripts/check-planner.mts`: `POTION_INGS`, `coveredIn`, `totals`, the run's `drunk` / `gained` / `checkpoints` / `uncovered`; `coverTable`; `byproductTable`'s covered columns, `LOG_BANK`; four made-up cases.

**Section 5 — the node and the gate**
- `pick.ts:104-160` `pickSource`; `decide.ts:171-178` (`srcInFlight`), `:270-278` (the node in the step and its why), `:297-302` (the level candidate), `:250` (a gear parent's gates).
- `supply.ts:28-71` (`Gated`, `mayHold`, `gateRoad`), `:131-192` (`billOf`: fixed seconds, the roads; `price = false` skips them), `:222-245` (`objectiveParents`), `:258` (leaves only); `bundle.ts:75` (leaves only).
- `forward.ts:255-269` (`waitingOf`); `gear.ts:96-98` (the rejection says which road).
- `scripts/check-planner.mts`: `nodeTable`; five made-up cases.

**Section 6 — the replay**
- `scripts/check-planner.mts`: `ROWS` A–D with `potionStock`; the row's price in the potion share and in `levelLine` (XP a kill, covered or field); row A's ingredient ledger; the supply hours by target in every row.
- Invariant 13 also exempts a single item of a drop objective (Notes).

**`CLAUDE.md`**: the gear-model paragraph (`killSeconds`' rest and price, `gatherPays` on the 500-HP default) and the planner's section (a "Prices (task 012)" bullet, the rows, the check's prints).

**Commands run**
- `git add docs/rework.md; git commit -m "Rework notes"` first (`a3b9558`); `docs/rework.md` did not change again. At the end, the task commit.
- `npm run typecheck` (several times; final clean).
- `npm run check -- planner`: six runs.
  - The first failed on invariant 15 (sunflower −27), the `KILL_LOG` case and the stall at 30.
  - The second on invariants 3, 13 and 15.
  - The third on 13 (a 3.1-hour source) and 15 (an alchemy step's own slimeballs).
  - Then green twice on the final source (`OK (343240 invariant checks, 41 made-up cases; deadline points 63 / 70 / 56 / 65)`, about 530 s), and once more after the supply print was added.
- `npm run check` (green: `52 checks: 51 ok, 1 known defect reproduced, 0 failed`). The run before it failed on three scenarios through `gatherPays` and `gateRoad`'s "on" test; both are fixed as described.
- Single runs of `scripts/check-planner.mts` and of row A (`AMMO_PLANNER_ROW=0`) with scratch storage.
- `npx vite build --outDir <scratch>/ammo-012-dist --emptyOutDir`: `index.html 0.40 kB`, `assets/index-Dc_NjE2T.css 37.23 kB`, `assets/index-Duq97lsH.js 400.85 kB │ gzip: 135.31 kB`, `✓ built in 1.54s`; deleted.
- Scratch, all deleted at the end:
  - the log readers (`node` + `readline` over `logs/dev.log`: fights with XP and levels, rests, steps decomposed, the mat/gear steps, the ingredients' bank moves);
  - a background agent's readers for section 1;
  - the kill-sample probes;
  - a CPU profile of the first week.
- No request to the game, no `.env`, no `.ammo/*`; no service started, stopped or called.

## Notes
**Defects noticed and not touched**
- **A restart repeats one action of every running fight or gather item**: the counter is written only after the cooldown wait (`src/state/exec.ts:508`, `src/state/queue.ts:470`, `:363-365`). All five steps running at 20:05 ended one unit over.
- **A drop objective's step is at least one item**: one goblin guard foot is 18–25 h of kills (row B, from day 38). Invariant 13 now exempts it as it did a single task. The fix is to chunk drop objectives in actions, as `src:` steps are.
- **Who brews a fighter's potions is not modelled.** The forward model keeps a brewed stack at one unit (`forward.ts:104-107`), as the executor brews more in play. But a fighter whose alchemy is below the recipe (minor health: 20; the fighters stand at 16–19) cannot brew it in play. Without the alchemist brewing for them — potions as supply through the bank, parked — the stack would really run dry.
- **The drinks take stock that supply gathered for an open parent** (5,800 nettles by day 7 in row A; the parent's shortfall reopens). Only a running step's withdrawal is protected, not stock already banked for a parent.
- **`gatherPays` stays on 5 HP/s.** Under the docs' rule, characters with low max HP would fish for food far more often. A decision for the planning chat, together with food (settled point 3).
- `src/state/queue.ts:708` `trainingMonsterFor` (the old `train` item) gets the new gap rule through `fightXp` but no wisdom; `src/plan/events.ts:97` prices an event fight at the field price (`killSeconds` default). Both are outside the allowed files.
- `src/sim/combat.ts:451` `FightForecast.restSeconds` (shown in the UI) is still 5 HP/s: it calls `restSeconds` without max HP.
- A step's fixed cost is once a step: a craft of several bagfuls walks once per bagful (Second's 30 planks: 538 s against the price's 197 s), and a reset that strips a whole fight set costs 120+ s of bank moves (the 42 s is the median).
- `supply: supply:` in every supply step's why (`decide.ts:295` and `:318`); kept as it was.
- `CLAUDE.md`'s combat-training paragraph still describes the old gap rule ("×0.7 at 5+ levels above, zero at 10+"); the task allows only the planner's section and the gear-model paragraph.

**Guesses in the numbers, most doubtful first**
1. **`KILL_LOG` 0.88 rests on the reconstructed sets.** The 200-character cut hides part of every reset, the pieces are given by when they were crafted, and the morning highwaymen are solved with the afternoon's pig sets. With every fighter given all of 11-19's pieces the median is 1.13; with none, 0.81. The planner's own estimates of the time give 0.85.
2. "Zero XP more than 10 levels above": the log has gaps up to 10 and then 17; 11–16 are unseen, so the pig's end at 30 is the docs' reading.
3. The one-unit stack in the forward model (above): row A's 63 and its combat days depend on it. Without it every row stalled at 54.
4. `STEP_BANK_SEC` 42 s, the median of 13 steps (11–164 s).
5. The log's bank of the by-product ingredients: the fixture's capture time is a date only and 180 deposit and withdraw bodies are cut.
6. The fleet "at the log's latest levels": combat levels from the log (unchanged from 19:21 to 21:39, when Second reached 24), gathering levels from the snapshot (the log carries no gathering XP).

## To delete (Alex)
Nothing. The scratch scripts, probes, profiles and the scratch build are deleted.
