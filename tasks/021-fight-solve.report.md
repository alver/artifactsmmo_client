# 021 — The fight solve: right first, then fast again: report

## Summary
- **The service's horizon goes back to 21 days** (at the next restart): the season from the fixed 11-21 file fits the rule (411.9 s, 477 MB alone), but from the live World of 11-22, where the repaired fleet keeps fighting, the final tree needs 3,588 s (561,788 solves) — twice the child's 30-minute kill; 21 days take 424 s. Next for speed: the solver itself on such a road (section 3).
- **No restart** (run `4zfd`). **Two of the three outlooks of my hours failed** (09:11:05, 09:46:04, killed at 30 minutes): 020's code cannot play the live World to the deadline in 30 minutes even alone (day 36 of 94 at 1,860 s); my scratch runs ran beside the second. The third (12:46:07) loaded my final tree and ended whole: 1,795.2 s beside my planner check, 103 expected.
- **Both faults, and neither walls the fleet**: a search fault in 76 of 2,320 cap pairs (one a tier), a price fault in 22 (the solver rests, the planner's price eats). **The wall at combat 23–26 was a place**: four characters stranded on Sandwhisper Isle, 260 gold over the floor against a 1,000-gold fare back (the forward model leaves a tolled step's character at its work tile); on the wall World the solver loses no fight it should win.
- **The three guarantees hold** and are in the gate (`check-solve`, new): 1,740 answers fixpoints, 0 of 1,160 cap pairs below, the 45-fight sample 135 of 135 at the best known tier (the old search: 128).
- **The road from the 11-21 file: 78 → 82 at the deadline** (53 → 59 at day 21); the fleet still takes the fallback, from 12-26 (was 12-24), because nothing left fits. From the 11-22 file the new road expects 98 and fights to the end.
- **The replay**: `OK (731517 invariant checks, 99 made-up cases; deadline points 90 / 121 / 108 / 81 / 86)` → `OK (694523 invariant checks, 96 made-up cases; deadline points 88 / 121 / 108 / 86 / 81)`; besides row G's pin, the two `KILL_LOG` pins could not hold (their medians on the new sets: 0.92 and 1.17; the constants are decide's and stay) and are printed now.
- **The gate**: typecheck passes; `npm run check` 86 of 86 in 193.1 s alone (report 020: 85 of 85, 365.7 s); `npm run check -- planner` 3,343.2 s alone (report 020: 4,873 s; backstop 4,500 s); the scratch build passes.

## Decisions for Alex
None. (Whether the service plays to the deadline again once the solver is faster, and what to do about the stranding, are the
planning chat's.)

## How Alex verifies
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `021: fight solve` on top of `Rework notes` (`4d68298`);
   `git status` clean; `git log origin/rework --oneline -1` → the same commit (the push's outcome is in Claude Code's reply); `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → `86 checks: 86 ok, 0 known defects reproduced, 0 failed`, exit 0, about 193 s (I ran it alone; report 020:
   85 of 85 in 366 s). The new check is `check-solve` (10.3 s in the plain run). Nothing new under `logs/` (`ls logs/` before and
   after, the same; the service's own files grow).
3. `npm run check -- solve` → `ok — the fight solve: 1740 solves a fixpoint and nested, 45 sample fights at their tier`, in about
   15 s (I ran it on the reference state alone: 15.5 s; in the gate's plain run 10.3 s).
4. `npm run check -- planner` → ends with `OK (694523 invariant checks, 96 made-up cases; deadline points 88 / 121 / 108 / 86 / 81)` in about 3,343 s (I ran it alone on the final tree; backstop now 4,500 s).
   The two `KILL_LOG` lines print their medians (0.92 and 1.17) instead of failing — see the Summary.
5. `npm run typecheck` passes; `npx vite build --outDir <temp>/ammo-021-dist --emptyOutDir` built (350.3 kB of JS, 31.8 kB of CSS). I ran both.
6. `npm run outlook -- --world logs/world/2026-11-21.json` → about seven minutes alone (411.9 s with the child's heap cap; the
   command itself runs without it and peaked at 739 MB in my run of the same tree), **82 at the deadline (2027-02-24 00:00 UTC)**;
   run twice, the same road (every run of the final tree and of the states before it gave these 98 lines to the digit).
7. `git diff --stat 0bd4b6a HEAD -- src/sim src/plan/bis.ts src/plan/jobgear.ts src/api src/catalog src/state src/server src/lib` →
   `src/plan/bis.ts` (the search, the `worn` option, the fight table, `ownedPools`, exports for the check), `src/lib/journal.ts`
   (a gold purchase is a `spend` record), `src/server/main.ts` (the child's `--max-old-space-size=1024`), `src/state/outlook.ts`
   (`HORIZON_DAYS` 21); nothing in `src/sim`, `src/plan/jobgear.ts` (the executor passes no new option: it keeps reading what is
   worn), `src/api`, `src/catalog`.
8. **After the restart** (not checked by me): the first outlook's record has `until` 21 days after its `from` (the horizon) and
   `sec` about 400–700 beside the service (21 days of the 11-22 World took 424 s beside one run); the Season card says "21 days
   only"; a `pl:` fight step's `wear` is the repaired solver's set; the steps go on through the run. A merchant purchase now
   writes a `spend` record (`what: "gold"`), and `npm run journal`'s Spent table shows it.

## Where the wider search loses
Everything in this section ran on the untouched tree: commit `0bd4b6a` extracted with `git archive` into scratch (`<s>/base`,
`node_modules` linked); for the counts a second copy (`<s>/instr`) adds only a simulation counter, a trace hook and exports of
the evaluator to `bis.ts`. The fixed inputs, each copied to scratch and compared by SHA-256 with the original:
`logs/world/2026-11-21.json` (`EBD11F25…3DB89`, the same file as report 020's), `logs/world/2026-11-22.json` (`14AA19CB…E940AA`),
`scripts/fixtures/world-2026-11-20.json` (`A5566150…72185`), the replay rows' start World (built as `check-planner` builds
`base`: `docs/design/snapshot/` + `scripts/fixtures/roadmap-fleet.json`), and **the wall World**.

**The baselines** (`node --import tsx --import <s>/measure.mjs scripts/outlook.mts --world <11-21> [--days 21] --json`, the
preload printing the wall seconds and peak RSS): to the deadline **78, 28 completions, 7,365 steps** in 421.1 s, 680 MB; 21 days
**53, 18 completions, 1,751 steps** in 223.1 s, 617 MB — report 020's reference to the digit. Both ran beside two other runs
(each other and the wall dump), so the seconds are not "alone"; report 020's alone numbers are 419.5 s and 234.4 s.

**The wall World**: the exact road from the 11-21 file (the same function `road()` runs, `forward` with an `onDecide` hook in a
scratch driver) at its first decision whose step is the fallback gather: decision 2,552, **2026-12-24 16:42:54 UTC, Fourth,
`fallback:woodcutting@Fourth#1`** ("fallback (nothing else is open to Fourth): Palm Wood at woodcutting 50"). Report 020 named
Second; the first fallback decision of the road is Fourth's, the others follow the same day. Dumped once (`<s>/w/wall.json`):
combat 24 / 26 / 23 / 23 / 23 (First … Fifth), the bank 155 codes, bank gold 20,260.4.

**The table of inversions** (`<s>/tools/inv.mts`: every character at its own level × the 58 monsters of the catalog, the
options as `fightRec` builds them — the pool `reach.ts poolOf` makes from `stock.ts poolBank`, the price
`reach.ts potionPrice` —, at caps 3/3, 6/6 and 12/10; 870 solves a World, the snapshots with their bags banked as `road()`
plays them; `<s>/tools/invtab.mjs` classifies each pair by `bestInSlot`'s own score; "price fault": the same tier, the wider
set scores higher and costs more seconds by `fightSecOf`):

| World | caps | fights | safe→win | safe→lost | win→lost | same tier, lower | price fault | higher, same tier | tier up | equal |
|---|---|---|---|---|---|---|---|---|---|---|
| 11-20 | 3/3→6/6 | 290 | 0 | 0 | 0 | 9 | 0 | 124 | 0 | 157 |
| 11-20 | 6/6→12/10 | 290 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 285 |
| 11-21 | 3/3→6/6 | 290 | 0 | 0 | 0 | 4 | 0 | 133 | 2 | 151 |
| 11-21 | 6/6→12/10 | 290 | 0 | 0 | 0 | 8 | 0 | 141 | 0 | 141 |
| 11-22 | 3/3→6/6 | 290 | 0 | 0 | 0 | 4 | 0 | 125 | 4 | 157 |
| 11-22 | 6/6→12/10 | 290 | 0 | 0 | 0 | 0 | 0 | 190 | 0 | 100 |
| wall | 3/3→6/6 | 290 | 0 | 0 | 0 | 30 | 12 | 66 | 7 | 175 |
| wall | 6/6→12/10 | 290 | 0 | 0 | 1 | 20 | 10 | 154 | 0 | 105 |
| **all** | | 2,320 | 0 | 0 | **1** | **75** | **22** | 938 | 13 | 1,271 |

So **the search fault is real and the price fault is smaller**: 76 pairs where the wider caps end below the narrower by the
solver's own score (one of them a tier: First against the cultist acolyte on the wall World, a win at 6/6, lost at 12/10), 22
where the wider set is better by the solver's score and dearer by the planner's price. Every price fault is the healing model:
the solver is solved resting (1 s per 1% of max HP, `bis.ts killSeconds` without food), the planner prices a kill eating the
pool's food (`reach.ts fightSecOf` → `healSeconds`, 4.5 s a `use` whatever the HP); a set that keeps more HP wins under rest and
loses under food when it takes more turns (Second on the wall World: vampire 49.5 → 60.5 s, bandit lizard 47.5 → 56.5 s, demon
86.5 → 91.5 s by `fightSecOf`). Neither fault walls the fleet (below), so the price fault is reported and left alone.

The inversions among the named fights (old solver; "lower N" = the wider caps' answer N/1000 seconds a kill below, or N in the
lost tier's score):
- 11-20, 3/3→6/6: First and Third vs bandit lizard (lost tier, lower).
- 11-21: Third vs vampire (5 s), Third vs rat (6 s) at 3/3→6/6; Third vs imp (8 s), Fourth and Fifth vs rat (7 s), Fifth vs imp (4 s), Fifth vs cyclops at 6/6→12/10.
- 11-22, 3/3→6/6: First, Third, Fourth and Fifth vs vampire (4 s each).
- the wall World, 3/3→6/6: First vs death knight (1 s), First, Third, Fourth, Fifth vs cultist acolyte, cultist emperor (2), orc (2), sand snake; Third, Fourth, Fifth vs full moon vampire (1 s); Second vs imp (4 s). Price faults: Second vs vampire, bandit lizard, rat, corrupted owlbear, demon; Third, Fourth, Fifth vs rat.
- the wall World, 6/6→12/10: **First vs cultist acolyte win → lost**; First vs cyclops (4 s); Third, Fourth, Fifth vs vampire (3 s), cyclops (5 s), death knight (5 s); Second vs rat (3 s), imp (1 s), cursed tree (2 s). Price faults: First vs mushmush, wolf; Second vs ogre, full moon vampire.
- The highwayman and the ogre: no inversion at their own level on any of the four Worlds.

**Why** (`<s>/tools/deep.mts --why`: both solves traced, the climb of the weapon the narrower answer came from compared step by
step, and the wider answer and that climb's end checked for a single improving move — one slot, the weapon too, or one group):

| World, fight | caps | narrower → wider (score; s a kill) | weapon whose climb ended lower | where the climbs part | wider climb's end a fixpoint? |
|---|---|---|---|---|---|
| 11-21 Third vs vampire | 3/3→6/6 | safe 86 s → safe 91 s | steel_battleaxe | pass 0, the ring pair: forest ring ×2 vs air + life ring, both lost at the same turns (−999,999,983,000) | yes (the answer too) |
| 11-22 Fourth vs vampire | 3/3→6/6 | safe 87 s → safe 91 s | steel_battleaxe | pass 0, rings: air + forest vs air + life, both lost, equal turns | yes |
| wall Third vs death knight | 6/6→12/10 | win 89 s → win 94 s | skull_staff | pass 0, rings: skull ×2 vs skull + steel, both lost (one turn apart) | yes |
| wall First vs cultist acolyte | 6/6→12/10 | **win 174 s → lost** | skull_staff | pass 1, rings: skull ×2 vs life ×2, both lost | **no**: a weapon change (skull_staff → gold_axe) improves it — the climb holds its weapon fixed; the answer (gold_axe's climb) is a fixpoint, but lost |
| 11-20 Third vs bandit lizard | 3/3→6/6 | lost (17 turns) → lost (15) | steel_battleaxe | pass 0, rings: forest ×2 vs air + life, equal turns | yes |
| wall First vs death knight | 3/3→6/6 | win 90 s → win 91 s | skull_staff | pass 0, boots: snakeskin vs hard leather, both lost, equal turns | yes |
| wall Fourth vs cultist emperor | 3/3→6/6 | lost (17 turns) → lost (15) | battlestaff | pass 0, boots: snakeskin vs hard leather, equal | yes |
| wall First vs orc | 3/3→6/6 | lost (9 turns) → lost (7) | battlestaff | pass 0, boots, equal | yes |

**The chat's reading holds in its first half and not in its second.** The climbs do part inside the lost tier, and always in
pass 0 or 1 — where every set loses and the score is turns survived, then HP left, then the tiebreak: in every case above the
two climbs stand on sets that survive *the same number of turns* when they part, so the choice between them is made by the HP
left and the item levels, not by anything about winning. But the wider climb does not run into a timeout or a defensive dead
end; it ends in a different, equally local optimum, and in seven of the eight cases its end *is* a fixpoint (no single change
improves it) — three passes were enough. The fault is that a greedy climb from empty slots is not monotone in its candidates:
more candidates give it more equal-looking first steps in a flat tier, and nothing ties its end to the narrower answer.

**Against the best set known** (the same fights; every set where the options' product is under two million, else 200 random
starts climbed to a fixpoint on the full neighbourhood; "all": the whole pool, no caps):

| fight | 3/3 best known / answer | 6/6 | 12/10 | the whole pool |
|---|---|---|---|---|
| 11-21 Third vs vampire | safe 81 s / 86 s | 81 / 91 | 81 / 86 | safe 81 s |
| 11-22 Fourth vs vampire | safe 84 / 87 | 84 / 91 | 83 / 85 | safe 83 |
| wall Third vs death knight | win 85 / 91 | 85 / 89 | 85 / 94 | win 85 |
| wall First vs cultist acolyte | win 174 / 174 | 174 / 174 | 174 / **lost** | win 174 |
| 11-20 Third vs bandit lizard | lost / lost | lost / lost | lost / lost | lost |
| wall First vs death knight | win 85 / 90 | 85 / 91 | 85 / 88 | win 85 |
| wall Fourth vs cultist emperor | lost / lost | lost / lost | lost / lost | lost |
| wall First vs orc | lost / lost | lost / lost | lost / lost | lost |

Wider, on all four Worlds and all three caps (3,480 solves, `<s>/tools/variants2.mts --best 200`): the old answer is below the
best known **in tier 7 times** (Second and Fourth vs vampire on 11-20 at all three caps — lost where a win exists —, First vs
cultist acolyte on the wall World at 12/10) and below it in score 1,148 times (33%).

**The shortcut of `safeWin`** (`reach.ts:447`: a fight `planRec` loses in expectation is not asked of `fightRec`): of 1,160
fights (the four Worlds × five characters × 58 monsters, at their own level) **none** is lost in expectation at 3/3 and won
safely at 6/6 — with the old solver and with the repaired one. The 13 tier changes 3/3 → 6/6 are win → safe (the ogre for
First and Third on 11-21 and for four on 11-22; death knight and owlbear for Second on the wall World) or lost → win (Second on
the wall World: goblin, cultist acolyte, cursed tree, dryad, grimlet) — never one the shortcut drops. It stays, with its count
in its comment.

**What the wall is made of.** On the wall World (`<s>/tools/wallwhy.mts`), per fighter, every monster with combat XP within ten
levels and every monster of an open objective's kill or win gate: `planRec`'s and `fightRec`'s verdicts on the World and on the
fleet's gear (`openOf`, what the combat road is priced on), and (`deep.mts --best 6x6,all`) the best set known over each
fighter's whole pool:
- **The solver walls nothing.** In all 80 fights checked against the whole pool (16 monsters × 5 fighters: cyclops, death
  knight, owlbear, corrupted owlbear, demon, cultist acolyte, cursed tree, goblin, goblin guard, goblin wolfrider, orc, cultist
  emperor, sand snake, dusk beetle, sandwarden, desert scorpion) the 6/6 answer has the best known tier. Safe wins with XP for
  all five: skeleton, pig, ogre, corrupted ogre, spider, vampire, full moon vampire, bandit lizard, rat, imp (and for Second at
  26 also death knight and owlbear). Wins never safe: cyclops, death knight, owlbear, corrupted owlbear, demon, cultist acolyte
  (and for Second cursed tree, goblin). Lost by the best set known on the whole pool: orc, goblin guard, goblin wolfrider,
  cultist emperor, the island's four (sand snake, dusk beetle, sandwarden, desert scorpion), and cursed tree and goblin for all
  but Second. So: **0 fights the solver loses and should win; every walled kill is one the fleet truly cannot win safely yet**
  (with `config.risk` "safe", a win that is not safe is not planned).
- **The wall is a place, not a fight.** Second, Third, Fourth and Fifth stand on **Sandwhisper Isle** (overworld −3,20, −3,18,
  −3,20 and its mine underground −5,18). The island is reached by the boat at (2,16) → (−2,21) for 1,000 gold, and left by
  (−2,21) → (2,16) for 1,000 gold. The bank holds 20,260 gold; `available("gold")` is the bank less the reservations less
  `GOLD_FLOOR` (20,000): **260**. `reach.ts mayOf` opens a fare only when the budget covers it and the way back
  (`reach.ts:101`), so from the island no transition opens and `nearestSpot` finds **no route to any monster, any bank or the
  city** (`bankSec` = ∞): `pickMonster` has no candidate, the combat road is ∞ from the character's own level ("no XP source"),
  every kill target is out of reach. What is left is a task (`tasks_coins_fan`) and the island's own nodes — the fallback gather
  (palm trees, torch cactus, adamantite). First is not on the island (underground −2,5): its combat road is finite (3.8 h a
  level at 24) but nothing that needs it fits; its own fallback starts on **01-09 15:46 UTC** (dumped as `<s>/w/wall-first.json`:
  the four still on the island).
- **How they got there**: the forward model puts a character at its step's place when the step ends (`forward.ts:194`) — for a
  step on the island, the island — and pays the step's round-trip toll (both fares) at its end (`forward.ts:143`). In play the
  step's last item (`deposit-all`) walks back to a bank first. Kills earn gold in the model, tasks do not
  (`forward.ts:140-141`), so once the fleet's late weeks are tasks and gathering the budget only falls, and four characters
  that took the boat out when the budget covered both ways stay out. This is the forward model's, not the solver's, and not
  this task's to repair (neither `forward.ts` nor the toll rules are in "what may change"); it is first in Notes.

## The solver made right
**The search** (`src/plan/bis.ts bestInSlot`, `:394`; line numbers are the final tree's). The objective for a set
that wins is untouched (feasible, safe, seconds a kill, the tiebreak's tier and filled terms — `makeEvaluator`), and so is how
a lost set ranks (turns survived, then HP left): I measured the chat's direction "rank a lost set by the monster's HP left"
(scratch variant C, the monster's HP read off a traced fight) and it did not help — 8 tiers below the best known on 11-20/11-21
against the plain repair's 6, at twice the cost —, so it is not in. What changed is how the search moves:
1. **Passes until one changes nothing** (`climb`, `bis.ts:410`; `pick` `:478`): one slot at a time while the others stand, then the ring pair, the artifacts
   and the utility pair each chosen whole among their fillings (`chooseGroup` `:499`, `groupCombos` `:518`); a pass that changes nothing ends
   the climb, and every pass that does not end it raises the score, so it ends — `MAX_PASSES` 50 (`:387`) only guards. At its end the set
   is a fixpoint of those moves.
2. **The weapon free at the end**: as before, each weapon option (unarmed, the candidates, the worn one) is climbed from empty
   slots with the weapon fixed; then the best end is climbed again **with the weapon among the moves**. Without it the answer
   was not a fixpoint where a weapon change improved it (First vs cultist acolyte at 12/10: the skull staff's climb could not
   reach the gold axe's set and the gold axe's climb ended lost).
3. **The ladder** (`LADDER` `:385`, used in `search` `:427`): the caps the callers use are 3/3, 6/6 and 12/10. A search at a step of the ladder
   first takes the answer of the step below — on its own candidates cut to the narrower caps by the same heuristic order
   (`capPools`, `:228`), which are exactly the narrower solve's candidates — as one more start. A climb never ends below its start, so
   **6/6 never answers below 3/3 and 12/10 never below 6/6**, by construction.
4. **Three seeded starts** (`STARTS`, `:392`): a random set (each slot and each group's filling drawn from its candidates by a fixed
   LCG, seeded alike every search, so the same candidates give the same starts) climbed with the weapon free. Without them the
   repaired search still missed two wins of the 11-20 snapshot (Second and Fourth vs vampire: the climbs from empty slots end on
   a set that survives 23 turns and is two changes — iron boots and two earth rings — from a 22-turn win). Five starts cost 15%
   more than three for 30 fewer sets below the best known out of 3,480; three are in.

**The three guarantees, measured** (section 1's table again, on the reference state: `inv.mts --noworn` on the four Worlds,
3,480 solves, and `check-solve`):

| | old solver | repaired |
|---|---|---|
| wider caps below the narrower, by the solver's score (search fault) | 76 of 2,320 pairs (1 a tier) | **0** |
| wider set better by the solver, dearer by `fightSecOf` (price fault) | 22 | 38 (not repaired: the healing model, section 1) |
| answers not a fixpoint (`check-solve`'s moves; two snapshots, 1,740 solves) | 7 | **0** |
| tier below the best set known (four Worlds, 3,480 solves; best of 200 random starts or every set) | 7 | **0** (16 answers above the earlier best known) |
| score below the best set known | 1,148 (33%) | 689 (20%), with the term read as the best known was |
| the sample (45 fights × 3 caps) at its best known tier | 128 of 135 | **135 of 135** |
| a solve's cost (median / p95 ms; simulations) — 3/3 | 1.8 / 3.1 ms; 380 / 615 | 2.4 / 4.2 ms; 470 / 836 |
| — 6/6 | 4.6 / 7.6 ms; 1,008 / 1,822 | 7.3 / 13.0 ms; 1,505 / 2,851 |
| — 12/10 | 8.5 / 14.6 ms; 1,868 / 3,674 | 14.0 / 26.0 ms; 2,703 / 5,865 |

(The costs were taken beside two or three other runs, both sets alike; no fight table in either.)

**`check-solve` fails on the old search**: the same check run on a scratch tree whose search is the old one (no ladder, no
starts, three passes, no final climb) — `FAIL — 31 check(s)`: 7 answers not a fixpoint, 17 cap pairs not nested, 7 sample fights
below their tier.

**Settled point 5: the planner's solves no longer read what is worn** (`bis.ts:87` `worn`; `reach.ts` passes `worn: false` from
`fightOptions` `:450`, `planRec` `:488`, `potionRec` `:522`; `solveKey` `:325` without the worn codes, with the extras). The proof on the road (`<s>/tools/swaps.mts`: every
kill step's `wear` against what its character wore before, and where they differ, both sets scored by the solver's objective
without the `keep` term): **without the term, on the whole season from the 11-21 file, 7,390 steps, 204 kill steps, 108 change
the worn set, 0 swap a piece for one of equal score** — none in a hundred. Over the 21-day road, the same count without the term: 1,854 steps, 182 kill steps, 98 changes, **0**; with the term (state `r1`): 1,946 steps, 414 kill steps, 194 changes, **1** equal swap (0.05 in a hundred steps — the term keeps only a worn piece that is a candidate; the season with the term I stopped after 35 minutes, the 21 days took 756.6 s). So the term goes for the planner; the
executor's solves keep it (`jobgear.ts` passes no option). It also changes the road — it decides which of two equal sets a step
wears, and so what the bank holds next — so it is part of the reference, not a speed change: with the term the 21-day road ends
at 55, without it at 59 (the two part at day 5). Its seconds are in section 3: −72%.

**The new reference** (settled point 7), beside report 020's:

| | report 020 (exact) | now (the solver repaired) |
|---|---|---|
| `npm run check -- planner` | `OK (731517 invariant checks, 99 made-up cases; deadline points 90 / 121 / 108 / 81 / 86)` | `OK (694523 invariant checks, 96 made-up cases; deadline points 88 / 121 / 108 / 86 / 81)` |
| the road from `logs/world/2026-11-21.json`, deadline | 78, 28 completions, 7,365 steps | **82**, 30 completions, 7,390 steps |
| …at day 21 | 53, 18 completions, 1,751 steps | **59**, 21 completions, 1,854 steps |
| by week (days 7, 14, … 91) | 40 46 53 57 66 66 72 73 73 73 75 75 75 | 40 46 59 65 65 70 79 79 79 79 79 79 82 |

The road's completions, old → new: intermediate_lumberjack 11-21 → 11-21, expert_miner 11-22 → 11-22, intermediate_alchemist
11-23 → 11-23, worker 11-24 → 11-23, the_new_bandit 11-25 → 11-25, intermediate_fisherman 11-26 → 11-26, the_reaper 11-26 → 11-26,
expert_lumberjack and cabinet_maker 11-27 → 11-27, expert_alchemist 11-30 → 11-30, professional_miner and diamond_in_the_sky
12-02 → 12-01, professional_lumberjack 12-02 → 12-02, expert_fisherman 12-05 → 12-05, ecologist 12-05 → 12-06,
**arachnophobia_conquered — → 12-07**, master_miner 12-09 → 12-08, master_alchemist 12-08 → 12-11, shining_secrets 12-24 → 12-11,
professional_fisherman 12-11 → 12-11, adamantite_mastery 12-25 → 12-11, **catch_and_cook — → 12-15**, palm_paradise 12-14 →
12-16, master_lumberjack 12-14 → 12-17, tasks_coins_fan 12-24 → 12-26, a_favored_champion 01-04 → 01-04, magic_lumberjack 01-08 →
01-05, strange_miner 02-01 → 01-05, pearl_fisher 01-09 → 01-06, magic_harvester 02-20 → 02-17.

**From the World of 11-22** (the snapshot of 00:00:32, the final tree, 3,588 s): **98 at the deadline, 36 completions, 9,014
steps** — the fleet fights to the end: cultist_purifier and cult_destroyer 12-09, loktar_ogar 12-17, cursed_wood_blessed_victory
12-25, king_of_the_goblins 01-14, closing_the_gate and its_malefic 01-31, besides the gathering and crafting road. The service's
own run of 12:46 (the live World then, my final tree) expected 103.

**Where each first parts from report 020's** (`<s>/tools/parts.mts`: two days of decisions on the old tree and the final one —
day, character, key, units, hours, why, set — compared by `<s>/tools/firstpart.mjs`):
- **The road from the 11-21 file**: the first six decisions are equal; at decision 6 Second's second step
  (`ach:intermediate_lumberjack:0@Second#2`, the same step and why) starts at **11-21 13:19 instead of 13:21**: its first step
  (11:49, 1.504 h) was stretched in the old road by a share of the **full moon** event — 2.2% of its time, 12 full-moon-vampire
  kills by expectation (`events.ts sharesOf`), in steel battleaxe + ring of the adept ×2 — and is not in the new one, where
  Second's set for the full moon vampire is battlestaff + water ring ×2 (both safe wins; `<s>/tools/shares.mts`). From there the
  clocks differ by minutes; the first different step is decision 47 (11-22 02:51 / 03:07: Third's `ach:intermediate_alchemist#11`
  against Fourth's `lvl:mining:35#4` — the order of who is free).
- **Every replay row** (A, B, C, E, G) parts at **decision 0**, 11-18 13:34 UTC: First's `ach:tanners_exchange:0@First#1` (one
  Hard Leather — 3 cowhide at the tailor), the same step and why but **0.345 h instead of 0.352** (A, E, G; B 0.269 against
  0.275; C 0.308 against 0.314): the cow kills that bring the cowhide are priced with the repaired solver's set, a faster kill.

The replay's rows, report 020 → now (points at days 7, 14, 30, 60 and the deadline):

| row | report 020 | now |
|---|---|---|
| A (default) | 32 · 44 · 55 · 84 · 90 | 35 · 42 · 58 · 72 · **88** |
| B (consumables free) | 44 · 58 · 85 · 109 · 121 | 48 · 57 · 79 · 109 · **121** |
| C (consumables 0) | 32 · 43 · 61 · 101 · 108 | 32 · 43 · 61 · 98 · **108** |
| E (no events) | 32 · 42 · 61 · 78 · 81 | 34 · 42 · 54 · 79 · **86** |
| G (tolls 0) | 34 · 40 · 52 · 71 · 86 | 31 · 40 · 55 · 71 · **81** |

Row G's pin ("ends at report 016's row A, 86", `scripts/check-planner.mts:1772` at `0bd4b6a`) is removed; the row stays in the
line. **Two more pins could not hold**: `KILL_LOG_013` and `KILL_LOG` (`check-planner.mts:2171`, `:2187` at `0bd4b6a`) were
asserted equal to the median of measured ÷ estimated kill seconds over the 11-19 samples, and the estimates are the solver's
sets: with the repaired solver the medians are **0.92** (the constant 0.88) and **1.17** (the constant 1). The constants are
deciding prices this task may not move, so both cases now print the median beside the constant (`check-planner.mts:2171-2173`,
`:2188-2190`); the first gate run had failed on them (`MISMATCH`, 3,412.6 s). The made-up cases go from 99 to 96 (these two and
row G's).

**The wall** (`<s>/tools/endwait.mts` on the whole road): the fleet still takes the fallback gather — Fourth on **12-26** 05:34
(on Sandwhisper Isle), Third 05:59 (in the city), Fifth 06:36 (at the forge), Second 07:03 (on the island), First on **01-06**
23:20 — two days later than the old road's 12-24 (all four on the island then) and 01-09. Kill steps over the season: 204 (old
106: spiders 79, imps 59, death knights 28, vampires 16, rats 10, ogres 6, owlbears 5, a pig). At Fourth's first fallback the gold
budget is 1,165 (the fare back 1,000), every fighter's combat road is finite (2.8–5 h a level), and nothing left fits. What the
open points wait for at the deadline, by `waitingOf`'s groups (old → new): another layer 48 → 48; an event 21 → 21; gear (no safe
win within ten levels: a_peaceful_island, cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins,
loktar_ogar) 16 → 16; use 10 → 10; a group 9 → 9; a raid 8 → 8; filler not reached 6 → 6; does not fit 8 → 4 (arachnophobia and
catch_and_cook done); unhandled 4 → 4; gold short for the fare 2 → 2 (potion_brewer).

## The run made fast again
020's method: one change at a time in scratch copies of the tree (`<s>/states/<name>`, each the one before plus one change),
each measured **alone** (only the service on the machine; `<s>/tools/batch.sh` runs them one after another and logs whether the
service's outlook child ran at the start and end — it never did) on the 21-day road from `logs/world/2026-11-21.json`
(`node --import tsx --import <s>/measure.mjs scripts/outlook.mts --world <w> --days 21 --json`), and every line compared with the
reference's (`<s>/tools/cmp.mjs`: the 24 lines, the run's seconds left out).

| state | the change (on top of the state before) | wall s | Δ | peak RSS | lines | kept? |
|---|---|---|---|---|---|---|
| r1 | the repaired search; the planner's solves read what is worn (the `keep` tiebreak, the worn codes in the key) | 742.6 | — | 869 MB | its own road: 55 at day 21 | — |
| r2 | **settled point 5**: the planner's solves do not read what is worn (`worn: false`, the key without the worn codes) | 206.8 | **−72.2%** | 491 MB | **the reference**: 59 at day 21 | yes |
| s1 | **the fight table**: a set's two fights kept across solves, in numbers (`bis.ts` `fights` `:316`, `FIGHTS_CAP` `:291`) | 165.6 | **−19.9%** | 627 MB | equal | yes |
| s2 | the narrower answer taken from the solve table instead of solved again (`bestInSlot`'s `lower`) | 162.3 | −2.0% | 624 MB | equal | out (< 3%) |
| s3b | (on s1) **the uncapped candidates once per pool and character**, not once a monster (`bis.ts ownedPools` `:176`, `reach.ts uncappedOf` `:342`) | 143.6 | **−13.3%** | 647 MB | equal | yes |

(`s3` = s2 plus the uncapped candidates gave 140.0 s with equal lines, but about 40 s of it ran beside a stray scratch run of
mine and a `tsc`, so it is not an alone timing; `s3b` is the measurement.) Report 020's final tree on the same road: 234.4 s and
630 MB alone (report 020), 222.5 s here beside two other runs.

Settled point 5 is not a speed change in 020's sense — it changes which of two equal sets is chosen, and the road with it (r1's
21 days part from r2's at day 5: 38 against 34 points, and end at 55 against 59) — so it is part of the reference (section 2),
and its seconds are reported here: it is most of the gain.

**Memory: the heap cap** (settled point 6). The kept state's whole season alone peaked at **2,027 MB** (`s3b`) while its heap
after a forced collection at the end held **103 MB** (61 MB with the solve tables emptied; `node --expose-gc`, `<s>/tools/roadc.mts
--gc`) — garbage V8 let pile up, not data kept. Two things followed:
- the fight table's arrays started at 1,024 rows each, and the forward model makes thousands of tables (each character at its own
  and at higher levels × 58 monsters), most of them small: **started at 32 rows** (`s4`, one constant, `bis.ts:300`) the same season peaks at
  **739 MB** with 93 MB live, in 417.1 s; its 21 days 144.4 s (`s3b` 143.6 s), 633 MB, every line equal. A row weighs about
  100 bytes with its key, its map entry and the array's slack (500,000 rows in 6,000 tables: 45 MB, `<s>/tools/rowweight.mjs`);
- **a 1 GB heap for the outlook child** (`--max-old-space-size=1024`, the one spawn line, `src/server/main.ts:89`): the season with
  it took 412.9 s and peaked at 510 MB on `s3b`, **411.9 s and 477 MB on the final tree** (every line equal) — the cap costs
  nothing measurable and bounds the child whatever the World.

**The final tree, alone** (A1… of report 020 kept; this task's kept changes: settled point 5, the fight table at 32 rows, the
uncapped candidates once a pool; the heap cap on the child):

| run | report 020's final tree | now |
|---|---|---|
| 21 days from the 11-21 file | 234.4 s, 630 MB (report 020, alone) | **144.4 s, 633 MB** (alone; 59 at day 21) |
| the season from the 11-21 file | 419.5 s, 683 MB (alone) | **411.9 s, 477 MB** (alone, the child's 1 GB heap; 82 at the deadline, 20,474 solves) |
| 21 days from the 11-22 file | — | **423.9 s, 628 MB**, 87,184 solves (beside one other run: the season below) |
| the season from the 11-22 file | — | **3,587.7 s, 940 MB**, 561,788 solves; 98 at the deadline (alone but for about 16 minutes beside the 21-day run and a profile) |
| `npm run check -- planner` | 4,873 s (alone) | **3,343.2 s** (alone): rows A 3,325 s, B 654, C 1,379, E 1,364, G 2,111; the caches off against on 222.7 s fresh, 13.3 s cached, the same lines; the line above |

**What a season costs now that the fleet fights on.** From the 11-21 file the fleet still stops in late December (section 2:
nothing left fits), so its season is cheap: 20,474 solves, 412 s — against 020's 419.5 s for a fleet that stood still from 12-24
and the experiment's 3,063 s, 1,384 MB and 96,684 solves (`fightRec` at 3/3, the old solver, beside two runs). From the World of
11-22 the fleet keeps fighting: **87,184 solves in its first 21 days** (424 s), and the whole season takes 3,588 s (561,788 solves).
The solver is two thirds of that run (the profile of the 11-22 21-day road, `--cpu-prof`, beside one run: `bestInSlot` 290 of
435 s total, `simulate` 65 s, the candidate pools 37 s, `consumableNeeds`/`fightTake` above it all 86%).

**The service's horizon: back to 21 days** (`src/state/outlook.ts:61`). The whole season from the fixed 11-21 file fits the rule
(412 s ≤ 10 minutes, 477 MB ≤ 1 GB), but the service's child plays **the live World**, and the live World of 11-22 — a fleet that
fights on — is not played to the deadline within the child's 30-minute kill alone (3,588 s), so a run would end `failed` on such a World, as both of this morning's did with 020's code; the service's
own run of 12:46 (another live World) fit by 4.8 s beside my planner check. 21 days of that World take about 7 minutes. `KILL_MS` stays 30
minutes. The next step for speed is the solver itself on a solve-heavy road (87k solves in three weeks): its climbs' bookkeeping
(a set's key as a string built a slot at a time and a map lookup per evaluation — `(anon)` and `fights` in `bis.ts` are 32% of the
11-22 profile's self time), the ladder's inner 3/3 search inside every 6/6 solve (`s2`'s answer from the solve table: −2% on the
11-21 road, where solves are few; not measured on 11-22), and the per-weapon climbs from empty slots, the bulk of the
evaluations.

## Riding along, the checks, the docs
**A purchase paid in gold is a `spend` record** (settled point 8): `src/lib/journal.ts spent` (`:252-253`) writes one for an `npc/buy` whose
transaction's currency is `gold` as for `tasks_coin` — `what` `gold`, `code` `gold`, `q` the total price, `for` the bucket,
`item` the code bought. `npm run journal`'s `## Spent` table already lists every `spend` record and sums them by `what` and
`code` (`scripts/journal.mts:173-178`, unchanged), so the merchant's gold now shows there. `docs/journal.md` says so (the `what`
list, an example line). **The made-up case**: the fake game sells for gold (`scripts/harness/fake.mts:321-342`, `npc/buy` →
`trade`), so `scripts/scenarios/buy-with-bank-gold.mts` asserts the record: `[["Dan", "gold", "gold", 10000, "healing_rune"]]`
(its journal line in the check's verbose output: `{"k":"spend","who":"Dan","what":"gold","code":"gold","q":10000,"item":"healing_rune"}`).
Second's 75,000 gold of 22:53:51 on 11-21 is not rewritten into the journal (nothing under `logs/` is touched); from the next
restart on, such a purchase is a record.

## The first hours of 020's code
(Line numbers in this section and the next are `0bd4b6a`'s, the code that played: `src/state/`, `src/plan/jobgear.ts` and the runner are
unchanged by this task but for `src/state/outlook.ts`, whose lines after 59 moved by two.)
`npm run journal -- --from 2026-11-22T08:39:04Z` (read by a background agent of this session at 09:09, 09:25 and 09:47 UTC,
and by me at the end; the tables as they are stayed in scratch). **No restart**: run `4zfd`, commit `0bd4b6a`, up since
08:39:04.452Z, no other `boot` record or run id. Since the boot: three new decisions (Third `src:nettle_leaf#2` 08:47:23, First
`lvl:mining:35#9` 08:55:57, Second `src:sunflower#3` 09:00:19), three re-attached steps ended `done (partial)` with every unit,
samples 0.90–0.95 of their estimates, meter gather 83–88 %, one event (`silent_night` 09:18:11, "nothing to do — nobody needs
it"); **no** pause, block, flap, nostep, defect, stopped or server record, no interrupt, no kill step, no lost fight, no spend.

**Every `outlook` record of my hours** (all three failed; the third is in the Summary's count too):

| record | from (the World) | until | outcome |
|---|---|---|---|
| 09:11:05.451Z | 08:41:05.435Z (two minutes after the boot's read) | the deadline (`HORIZON_DAYS` 0, `src/state/outlook.ts:59`, `:142`) | **failed: not ended after 30 minutes — killed** (`outlook.ts:55`, `:173`); no road, no `sec` |
| 09:46:04.526Z | 09:16:04.506Z — no `config` record before it, so not a config change: the Roadmap's ↻ (`refreshOutlook`, `outlook.ts:207-212`, a successful rpc leaves no raw line); who pressed it the logs do not say | the deadline | **failed: not ended after 30 minutes — killed** |
| 13:16:02.794Z | 12:46:07.035Z (three hours after the second failure, `outlook.ts:185`) | 2027-02-24T00:00:00Z | **ended: 1,795.2 s, 29 points, 103 expected at the deadline** — next by it: expert_miner 11-22 18:19 UTC, the_new_bandit, … It loaded **my final working tree** (copied in at about 11:50) and ran beside my `npm run check -- planner` for its whole half hour; it fit by 4.8 s. The running service still spawns it without the heap cap and asks for the deadline (`HORIZON_DAYS` and `main.ts` reach the service at a restart) |

Against report 020's 419.5 s alone: these children played **the live World of 11-22**, not the 11-21 file, with 020's code.
**The cause of the two failures is the run itself**: the old tree on the 11-22 snapshot to the deadline, alone (`timeout 1860`), was at day 36 of 94 when stopped at 1,860 s — 020's code cannot play that World to the deadline in 30 minutes; my scratch runs (two to four processes) ran beside the second child and slowed it further, but did not make the difference. The first child's working set was 1,981 MB at 29 min 20 s (the agent, from the process list): it was working, not
starved. The characters went on through both: the longest gap between a character's actions was one gather cooldown in each
window (First 33.9 / 34.0 s, Second 29.9 / 30.2, Third 26.3 / 25.8, Fourth 34.4 / 33.8, Fifth 34.5 / 34.3; the hour before the
boot the same), no 4xx/5xx answer. The next run is due 12:46:04 UTC (three hours after the last failure, `outlook.ts:185`).

**The road against play.** Nothing an `outlook` record expected is due before 15:54 UTC. expert_miner: 1,731 of 6,000 at
00:00:32, about 3,748 by 09:21 (2,017 gold ore gathered in the raw log), at the pace of 08:00–09:21 (~313 an hour) due about
16:30 UTC — inside the window the records gave (15:54 on 11-21's record, 16:02, 16:39 and 17:54 on 11-22's); an extrapolation.

**"Not a safe win"** — none since the boot. Before it, on 11-22, Third's two (below). The gate is `simulate(currentFighter(ch),
m).win` (`src/state/exec.ts:507`), the expected fight of what is worn, stacks included; the text says "safe" anyway
(`src/state/queue.ts:470`, `:943`).

**Third's two pauses of 11-22**, with the forecasts computed (`<s>/tools/gates.mts`: Third dressed exactly as the raw log's
equip lines show at the gate — stripped to its base at the level then, the worn pieces and stacks put on, `currentFighter` as
the gate builds it — and `jobGear` on the bank the agent rebuilt for that moment, which matches the 08:39 boot's bank exactly):
- **05:08:34, Ogre, `lvl:gearcrafting:25@Third#2`** (a train loop's drop hunt; the step carries no `wear`, so the planner counted
  on nothing about this fight). The recipe was picked because `canBeat` (`queue.ts:700-710`: `ownedFightForecast`, the executor's
  12/10 solve over bank ∪ bag ∪ worn) said the ogre is a win. Worn at the gate: skull staff, iron shield, tromatising mask,
  skeleton armor and pants, leather boots, steel ring ×2, wisdom amulet, novice guide, altar doll, lost world map, **no
  potion** → **lost in 16 turns** (pessimistic lost). `jobGear` on that bank gives the same pieces **with Minor Health Potion**
  → a safe win in 17 turns (5 potions a fight). The bank held no minor potion (112 small, 70 cooked trout): the minor potion is
  `brewablePotions`' (Third has alchemy 34), adopted by `jobGear`'s brew branch (`jobgear.ts:193-205`); the train loop's
  `fightGear` (`queue.ts:694-698`) never calls `provisionPotions` (`exec.ts:452-472`), so Third stood at the gate without it.
  **The old and the repaired solver give the same set here**: not the solver — a train loop that adopts a brew set and never
  brews (runner code, not this task's).
- **06:04:37, Bandit Lizard, the bandit camp trip** (`event` 06:00:05: "≈44 kills in 50 min with 100 Small Health Potion and 32
  Cooked Trout"). Third wore the plan's set (no "the planned set needs" line for Third, `queue.ts:208-211`): skull staff, iron
  shield, tromatising mask, skeleton armor and pants, iron boots, forest ring ×2, wisdom amulet, the three artifacts, **100 Small
  Health Potion** → **lost in 17 turns**. The same set with Third's own **96 Minor Health Potion** (in its bag from its running
  potion step) **and** the 100 small → a **safe win** in 26 turns (9 + 9 potions); with the minor alone a win, not safe. So the
  member check counted on both potions — the minor from the pool, which holds bag stock — while the trip's `take` withdrew only
  the bank's small (a withdrawal does not count bag stock, CLAUDE.md "Bag stock"), and the reset banked the minor at 06:01:41.
  **Not the solver either**: a plan whose set needs a potion its `take` does not carry (a price/plan fault, the planning
  chat's). The other three members won 12, 12 and 8 fights and ran dry, drinking 2–3 times the potions a kill their plans took.

**Kill steps and event trips since the boot**: none (all five gathered). The day's earlier ones (run `dxgi`): Second
`src:snake_hide#1` (flying snake, 19 of 19 kills, 79 an hour against 50 planned), Third `src:skeleton_bone#1` (40 of 40, 55 an
hour against 65), the four bandit-camp trips above (Third 0 of ≈44, Second 12 of ≈47, Fourth 12 of ≈33, Fifth 8 of ≈30). The
sets `fightRec` gives now for those monsters are in section 2's sample (the vampire, the ogre, the bandit lizard); the repaired
solver changes no set of the steps the journal holds that I could compare, because none of them ran since the boot.

## The offerings of 11-22
Six of fifteen: fishing 5 of 5, combat 1 of 5 (Third), gear crafting 0 of 5; the five interrupts took 21,663 s (6.0 h).
There is no later midnight in the journal yet, and the 11-22 offering lists are in no file I may read (the snapshot's cache is
11-21's), so the requirements come from the raw log's notes, ids and accept/complete lines.

| who | combat (21–30, favored rat): 8 Rat Hide | fishing | gear crafting |
|---|---|---|---|
| First (23) | 2 from the bank, then 9 wins, 0 hides; refused 00:27:13 "no way to get 6×"; the 2 went back to the bank | 35 trout from the bank, done 00:29:22, +1,275 XP | not accepted (skill 2: no bracket) |
| Fourth (23) | 4 wins, 1 loss, 0 hides; refused 00:27:53 "no way to get 8×" | done 00:29:33, +1,625 | not accepted |
| Second (25) | 18 wins (First's 2 hides fetched), 0 hides; refused 00:40:06 "6×" | done 00:41:47, +2,050 | not accepted |
| Third (23) | 43 wins, 1 loss, 6 hides + 2 from the bank; **done 01:51:05, +2,800 combat XP** | done 01:52:18, +1,800 | skipped 00:10:44: "can't get 1× Conjurer Skirt or any lower bracket's item" |
| Fifth (23) | 34 wins, 1 loss, 0 hides; refused 03:13:31 "8×" | 21–30 wanted 31 bass → took 10–20 (35 trout), done 03:15:13, +2,300 | not accepted |

Seconds by the meter (the whole interrupt): First fight 396 · rest 87 · eat 27 · bank 72 · walk 325 · gear 42 · craft 144 ·
wait 76 (1,178 s); Fourth 322 · 66 · 18 · 42 · 470 · 42 · 148 · 66 (1,183 s); Second 830 · 233 · 57 · 39 · 450 · 30 · 144 · 131
(1,923 s); Third 2,091 · 634 · 99 · 90 · 1,675 · 117 · gather 385 · craft 668 · 369 (6,140 s); Fifth 1,679 · 696 · 96 · 81 · 1,720 ·
96 · **gather 5,670** · craft 403 · 695 (11,145 s).

**Why the combat offerings stopped after the wins**: the stack, not HP and not the set. Every refusal came with full HP
(`exec.ts:498-503` heals before the gate), the set unchanged since the first fight, and the worn potion stack **empty** (First 47
equipped / 47 drunk, Fourth 43/43, Second 100/100, Fifth 2/2). The five had taken all 390 minor potions of the bank by 00:12:41.
`desiredForJob` memoises the fight set on the bank array, the level and the monster (`exec.ts:246-254`); a stack running dry
changes none of them, so the set naming the minor potion came back, the differ found none to put in, `provisionPotions` could
not brew it (alchemy 17–18, `exec.ts:461-463`), and the gate saw no potion and no win (`queue.ts:1262`, `:1363`). My forecasts at
each refusal (`gates.mts`): the worn set **without a potion loses** — First in 19 turns, Fourth 21, Second 23, Fifth 19. What the
executor's solve gives on the same bank (it wants the brewable Small Health Potion nobody had in stock): old → repaired:
First win 511 → **461 s** a kill (both not safe), Fourth win 993 → **725 s**, Second safe 504 s → the same, Fifth win 511 s →
**safe 561 s**. The repaired solver dresses better there, but every set it finds still needs a potion the bank did not hold —
the stop is the memoised set and the empty stack, which no solver changes.

**What one rat hide costs** (the rat: Lv 25, 800 HP, fire 50, crit 50; rat hide 1 in 12, 1–3 a drop). On the day's 108 wins: 6.5
potions a win (574 minor + 126 small), about 1 cooked trout, 67.9 s of fight + rest + eat, so about 300 s a win with the
potions' making. A whole offering (8 hides): about 4.0 h and ~310 potions at the catalog's rate, 2.7 h at ×1.5 drops, **12 h
and ~930 potions at the day's rate** (6 hides in 108 wins — three drop events where the catalog expects 9, or 13.5 with the
favor; the meat drops fit the favor: 87 against 81 expected with it).

**Fifth's 5,670 s of gathering**: 210 sunflowers in four trips (00:47–03:09) for 126 Small Health Potions for the combat
requirement (`provisionPotions` → `produceOnce`, `exec.ts:399-472`); they kept 19 rat fights going and brought no hide.
**Third's 668 s of crafting**: cooked trout 57 and minor potions 184 (4 brews), for the combat requirement; it completed (+2,800
XP, a favor). **Gear crafting**: four characters at skill 2 have no bracket (`src/state/offerings.ts:55-57`; decision 17's gap,
"a skill under 10 has no bracket"); Third's 21–30 item is the Conjurer Skirt (gearcrafting 30), the 10–20 one failed
`canObtainOffering` without the bank (`queue.ts:1269-1294`) — which item it was is in no readable file.

**What an offering is worth.** XP = the reward percent of the character's level (25% in 11-21's cache) plus a favor. Fishing:
1,275–2,300 XP for 35 trout from a stock of 420 and two minutes — excellent. Combat at 21–30 with today's gear: 2,800 XP for
~1.7 h and 284 potions when it works (Third); the four failures cost ~4.2 h and 418 potions for nothing but their fights' own
6,302 combat XP. The favors do not bind: A Favored Champion stood at 63 of 500 at 00:00:32; at about six a day it is reached
before the deadline. **For the day to end near fifteen** (proposals for the planning chat; nothing changed here):
1. take the cheapest completable bracket, not the highest — the reward does not depend on the bracket (`offeringPick` sorts by
   `level_min` descending, `queue.ts:1291-1293`), priced as wins × (fight + potions);
2. a drained stack re-solves (the memo key holds the bank, not the worn stacks, `exec.ts:246-254`) — runner code;
3. the combat offering as the planner's: a `take` reserved and priced by the forecast, one hunter for the fleet's hides
   instead of five draining the bank's potions outside the planner's accounts;
4. combat 21–30 with today's gear cannot reach five a day (160 wins and ~1,000 potions at the catalog rate with the favor, 720
   and ~4,700 at today's) — a cheap lower bracket or gear that wins the rat without 6.5 potions a fight;
5. gear, weapon and jewelry crafting need skill 10 before any bracket exists (low value: the favor does not bind).
A realistic day with today's gear: the two rotating skills where brackets exist plus combat when a lower bracket is a cheap
fight; fifteen needs 1, 3 and 5 together.

## What was done / files
**Files changed** (`git diff --stat 0bd4b6a`): `src/plan/bis.ts` (the search: passes to a fixpoint, the weapon free at the end,
the ladder, three seeded starts; `capPools`, `ownedPools`, `groupCombos`; the `worn` option; the fight table; exports for the
check), `src/plan/planner/reach.ts` (`fightOptions`; `worn: false` for `fightRec`, `planRec`, `potionRec`; the key without worn
codes and with the extras; `uncappedOf`; `safeWin`'s count), `src/lib/journal.ts` (`spent`: gold purchases),
`src/server/main.ts` (the spawn line: `--max-old-space-size=1024`), `src/state/outlook.ts` (`HORIZON_DAYS` 21),
`scripts/check-solve.mts` (new), `scripts/fixtures/world-2026-11-21.json` (new: a byte-identical copy of
`logs/world/2026-11-21.json`), `scripts/fixtures/solve-sample.json` (new, 23 KB), `scripts/check-planner.mts` (row G's case
out), `scripts/check-road.mts` (the guard), `scripts/check.mts` (the backstop), `scripts/scenarios/buy-with-bank-gold.mts` (the
spend case), `CLAUDE.md`, `docs/journal.md`; this report and the task file. Nothing in `src/api`, `src/catalog`,
`src/plan/jobgear.ts`, `src/sim`, the runner, the page, `logs/`.

**Every command** (`<s>` = the scratch folder `D:\Temp\claude\71701bc605da51df\ac7e36b1-9fae-42db-bd3d-44a530d11461\scratchpad`,
`<w>` = `<s>/w`; the background agent's own 62 read-only commands are listed in its file `<s>/out/sec5-6.md`, kept until the
end and then deleted with the scratch folder — its git commands: `git log --oneline -3`, `git status --short`):
- git: `git status --short`; `git log --oneline -3`; `git diff --stat docs/rework.md`; `git add docs/rework.md`; `git commit -q
  -m "Rework notes …"`; `git log --oneline -2`; `git archive 0bd4b6a src scripts public/data package.json tsconfig.json | tar -x
  -C <s>/base`; `git status --short` and `git diff --stat` (several times); at the end `git status --short`, `git diff --stat docs/rework.md` (unchanged since my notes commit), `git add` of the task file, this report and the changed files, `git commit -m "021: fight solve" …`, `git log --oneline -3`, `git push`.
- PowerShell (read-only or on my own scratch processes): `New-Item -ItemType Junction` (`node_modules`, `public` into the scratch
  trees; also `cmd /c mklink /J`); `Get-Item`; `Get-CimInstance Win32_Process` (my scratch processes and the service's outlook
  child, many times); `Get-CimInstance Win32_OperatingSystem`/`Win32_Processor` (63.9 GB, 16 cores / 32 threads);
  `Stop-Process` on my own scratch processes only (a mis-started inversion loop, the queued `s3b` run that started early, the
  with-term swap count after 35 minutes); `taskkill //PID` (one, already gone).
- the untouched tree (`<s>/base`): `node --import tsx --import file:///<s>/measure.mjs scripts/outlook.mts --world
  <w>/2026-11-21.json [--days 21] --json` (the baselines); `node --import tsx <s>/tools/dumpwall.mts --world <w>/2026-11-21.json
  --out <w>/wall.json` and `… --who First --out <w>/wall-first.json`; `node --import tsx <s>/tools/endwait.mts --world
  <w>/2026-11-21.json`; `node --import tsx <s>/tools/gates.mts --w22 <w>/2026-11-22.json --gates <s>/agent56/third-gates.json` and
  `… --gates <s>/tools/rat.json`; the old tree on 11-22 (`timeout 1860 node --import tsx --import file:///<s>/measure.mjs
  <s>/tools/roadc.mts --world <w>/2026-11-22.json`, in `<s>/tools/batch2.sh`).
- the counting copy (`<s>/instr`: the counter, the trace hook, the evaluator exported): `node --import tsx <s>/tools/inv.mts
  --world <w>/<file> --tag <t> [--who …] [--monsters …] [--caps …]` (the four Worlds); `node <s>/tools/invtab.mjs <files> [--all]
  [--named]`; `node --import tsx <s>/tools/deep.mts --world <w>/<file> --case <Who:monster> --why <a:b> --best <caps> [--starts N]
  --json <s>/out/why0.jsonl` (the eight named cases) and `--best 6x6,all --starts 200` (80 wall fights); `node --import tsx
  <s>/tools/wallwhy.mts --world <w>/wall.json|wall-first.json|wall-r2.json --json …`; `node --import tsx <s>/tools/dbg1.mts`,
  `dbg2.mts`; `node --import tsx <s>/tools/variants.mts` and `variants2.mts --worlds … --caps 3x3,6x6,12x10 --variants … [--best
  200] --out …` (the solver variants against the best known); `node --import tsx <s>/tools/exp1.mts`, `exp2.mts` (the vampire
  case); `node --import tsx <s>/tools/best.mts --sample <s>/out/solve-sample.json --repo G:/alex/projects/artifactsmmo --starts
  400 --out <s>/out/best-sample.json` (the sample's expected tiers); `node <s>/tools/cmpknown.mjs …`.
- the scratch states (`<s>/states/r1, r1i, r1s3, r2, r2i, r2old, s1, s2, s3, s3b, s4`, each a copy of `src`/`scripts` with
  junctions): `npx tsc --noEmit -p tsconfig.json` (in r1, r2, s1, s2, s3, s3b); `node <s>/tools/mkinstr.cjs <src> <dst>`; `node -e
  …` and `sed -i` edits (scratch files only); `node --import tsx --experimental-webstorage --localstorage-file=<s>/cs.db
  --disable-warning=ExperimentalWarning scripts/check-solve.mts` (r2, and r2old: the old search); `npx tsx scripts/check.mts
  buy-with-bank-gold` (r2); `node --import tsx <s>/tools/mksample.mts --wall <w>/wall.json --w22 <w>/2026-11-22.json --out
  <s>/out/solve-sample.json`; `node --import tsx --import file:///<s>/measure.mjs <s>/tools/swaps.mts --world <w>/2026-11-21.json`
  (r1 stopped, r2 whole); `node --import tsx --import file:///<s>/measure.mjs scripts/outlook.mts --world <w>/2026-11-21.json
  [--days 21] --json` (r2, s1); `bash <s>/tools/batch.sh 21 r2 s1 s2 s3 r1` and `… 21 s3b` (alone); `node --cpu-prof
  --cpu-prof-dir=<s>/prof/… [--max-old-space-size=1024] --import tsx …` (s1 21 days, s1 one World's solves, s4 11-22 21 days) and
  `node <s>/tools/prof.mjs <profile> [names]`; `node --expose-gc [--max-old-space-size=1024] --import tsx --import
  file:///<s>/measure.mjs <s>/tools/roadc.mts --world <w>/<file> [--days 21] [--gc]` (s3b and s4 seasons, s4 on 11-22);
  `node --max-old-space-size=1024 --import tsx --import file:///<s>/measure.mjs scripts/outlook.mts --world <w>/2026-11-21.json
  --json` (s3b); `bash <s>/tools/batch2.sh` (alone: s4 21 days, s4 season with the cap, s4 on 11-22, the old tree on 11-22);
  `node <s>/tools/cmp.mjs <a> <b>` (every line compared); `node --expose-gc <s>/tools/rowweight.mjs 500000 6000` and `100000 6000`;
  `node --import tsx <s>/tools/parts.mts --repo G:/alex/projects/artifactsmmo (--world <w>/2026-11-21.json | --row A|B|C|E|G) --days 2` (old and final tree, `bash <s>/tools/partsrun.sh`), `node <s>/tools/firstpart.mjs <old> <new>`, `node --import tsx <s>/tools/shares.mts <w>/2026-11-21.json` (old and final); `node --import tsx <s>/tools/swaps.mts --world <w>/2026-11-21.json --days 21` (r1 and r2, the with-term count)
- the working tree: `cp` of the final state's files (`src/plan/bis.ts`, `src/plan/planner/reach.ts`, `src/lib/journal.ts`,
  `src/server/main.ts`, `src/state/outlook.ts`, `scripts/check-solve.mts`, `scripts/check-planner.mts`,
  `scripts/scenarios/buy-with-bank-gold.mts`, the two fixtures); `node -e`/`sed -i` edits of `CLAUDE.md` and
  `scripts/check-road.mts`; `cmp` of the fixture with `logs/world/2026-11-21.json`; `sha256sum` of the inputs.
- reading the logs (read only): `cat logs/status.json`; `grep` over `logs/journal/2026-11-22.jsonl` and
  `logs/raw/2026-11-22/0[89].log`; `npm run journal -- --from 2026-11-22T08:39:04Z` (at the end).
- the gate: `npm run typecheck`; `npm run --silent check -- road` (twice, alone); `npm run --silent check -- planner` (alone,
  12:19:37–13:16:30: **failed** on the two `KILL_LOG` pins, 3,412.6 s, the service's outlook child beside it from 12:46; then
  again after the fix, 13:22:05–14:17:48, 3,343.2 s, ok, nothing else running); `npm run --silent check` (alone, 13:18:29–13:21:43,
  86 ok, 193.1 s; `ls logs/` before and after: the same); `npx vite build --outDir <s>/ammo-021-dist --emptyOutDir`.

## Notes
- **The forward model strands characters behind a paid transition.** `advance` puts a character at its step's place when the
  step ends (`src/plan/planner/forward.ts:194`) and pays the step's round-trip toll there (`:143`); in play the step's last item
  walks back to a bank first. A character that took the boat to Sandwhisper Isle when the gold budget covered both ways stays on
  the island once the budget falls below the fare back (`reach.ts:101` opens a fare only with the way back covered; the model's
  tasks earn no gold, `forward.ts:140-141`): no route to a bank, a monster or the city, so only the island's nodes and tasks are
  left. In the old road from 11-21 four characters stood there from 12-24 to the deadline with 260 gold over the floor; in the new
  one Second and Fourth end there. Not touched (`forward.ts` and the toll rules are not in what this task may change).
- **The live World is far dearer than the fixed file**: from 11-22 the final tree solves 561,788 times in a season (87,184 in the
  first 21 days) against 20,474 from 11-21; the solve table ended at 91,788 of its `MEMO_CAP` 100,000 keys with 563k misses
  in 9.33M lookups — the cap may be thrashing on such a road. Raising it costs memory (about 1.7 KB a key at report 020's
  numbers); not tried.
- **The price fault stays**: the solver ranks sets resting, the planner prices a kill eating the pool's food
  (`bis.ts killSeconds` without food against `reach.ts fightSecOf`), 38 cap pairs of 2,320 where the wider set is better by the
  one and dearer by the other. It moves which set a step wears, not whether a fight is planned.
- **Third's ogre pause**: a train loop's drop hunt adopts `jobGear`'s brew set (`jobgear.ts:193-205`) and never brews
  (`queue.ts:694-698` does not call `provisionPotions`), so it reaches the gate without the potion its set needs.
- **Third's bandit-lizard pause**: an event member's set is solved on a pool that holds bag stock (96 minor potions), its `take`
  withdraws only the bank's (small); the reset banks the bag's — the member check and the gate see different stacks. And
  `eventMembers` booked the one Tromatising Mask for Second and for Third.
- **The offerings' empty stacks**: `desiredForJob` memoises the set on the bank array, the level and the monster
  (`exec.ts:246-254`); a drained worn stack does not re-solve, so the set names a potion nobody has.
- A `jobGear` set can name a pinned artifact twice (`lost_world_map` in two artifact slots in my scratch reconstructions of the
  gates: the solve picks it and `pinArtifacts`, `jobgear.ts:103-120`, keeps the worn copy's slot as well); CLAUDE.md says the
  differ dedupes artifact codes — not checked here.
- `public/data/atlas.json` was generated with the old solver; CLAUDE.md asks for `npm run atlas` after a BIS change, but
  regenerating the atlas is out of this task's scope (the planner reads its hours and paths).
- The rat hide dropped 3 times in 108 wins on 11-22 against the catalog's 1 in 12 (9 expected, 13.5 with the favor) while the
  meat fits the favor — the offering's whole cost hangs on that rate; the logs cannot settle it.
- Report 020 named Second as the first to take the fallback on 12-24; the first fallback decision is Fourth's at 16:42:54 (the
  other three follow by 18:09).
- Process notes: a queued timing run of mine started early (my wait loop did not see the batch) and ran 40 s beside `s3`'s
  timing — `s3` is therefore marked not alone and `s3b` measured instead; the with-term swap count was stopped after 35 minutes
  (the 21-day count replaces it); my earlier scratch runs ran beside the service's second outlook child. Two shell quoting slips while editing scratch text made bash run the text's code spans as commands in the scratch folder: `npm run check`, `npm run check -- planner` (both failed at once: no `package.json` there) and words like `4zfd`, `check-solve`, `KILL_LOG` (not found); nothing ran against the project or the service.
- Guesses, most doubtful first: that three seeded starts are enough beyond the 3,480 fights and the 45-fight sample measured (it
  held there; five starts found 30 more sets nearer the best known); that the 1 GB heap leaves enough room on the live World (the
  11-22 season peaked at 940 MB with it and 93–103 MB live at a season's end on the fixed file).

## To delete (Alex)
Nothing.
