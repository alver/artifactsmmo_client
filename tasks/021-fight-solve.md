# 021 — The fight solve: right first, then fast again

## Goal
Task 020 made the forward run exact, and the exact run showed what the old cache had been hiding: the road
from `logs/world/2026-11-21.json` expects **78 points at the deadline, not 98**, and from 12-24 on the whole
fleet takes the fallback gather — the fighters at combat 23–26, the combat road walled ("no XP source" at 26),
every late kill waiting for "gear (no safe win within ten levels)". Report 020's experiment says why: the old
cache handed `fightRec` (a search of 6 a slot and 6 weapons) the answer of `planRec` (3 and 3); with
`fightRec` set to 3 and 3 the exact tree gives 98 and the late fights again.

At a character's own level with no extra piece the two solves differ only in their caps, and the caps keep the
top N of one heuristic order, so the 6-and-6 candidates are a superset of the 3-and-3 ones. **A search over
more candidates ends on a worse set than a search over fewer.** The same solver dresses the real fleet
(`src/plan/jobgear.ts`, caps 12 and 10), and the journal of 11-22 has two pauses that look like it: a plan that
judged a safe win and an executor whose own set did not win.

After this task:
- **a fight solve is right**: its answer cannot be improved by changing one slot or one group, a wider
  search never answers below a narrower one, and on a fixed sample it reaches the tier (safe, win, lost) of the
  best set known — all three in the gate;
- the run stays **exact** (020's three proofs stay green);
- the report says what the wall at combat 23–26 was made of, and what the road expects once the solver is
  right;
- the run is **fast again** with a fleet that fights on to the deadline (it will solve far more than the
  fleet that stands still), and the service's horizon follows the measured time as in 020.

The service was restarted at **08:39:04 UTC on 2026-11-22** (run `4zfd`, commit `0bd4b6a`, report 020's
code). The five steps re-attached (`lvl:mining:35` for First, Fourth and Fifth, `src:sunflower` for Second,
`src:nettle_leaf` for Third); 29 points; bank 96 of 110, gold 169,488; blocked: `lvl:gearcrafting:25@Third`
until 11:08 UTC ("not a safe win vs Ogre"). Its first outlook to the deadline started at about 08:41 UTC and
was running when this file was written; section 5 reads it.

**Read in the chat on 2026-11-22** (at `0bd4b6a`; check each against the files and say where one is wrong):
- `src/plan/bis.ts` `bestInSlot` (`:313`): per weapon option (unarmed, the weapon pool, the worn weapon,
  `:327-329`) it starts from **empty slots** and makes **three passes** (`:337`): each single slot in turn takes
  the option with the best score while the others stand (`:339-349`), then the ring pair, the artifacts and the
  utility pair are chosen exhaustively among their pool (`chooseGroup`, `:388`). The best of the weapons'
  results is the answer. Nothing checks that a fourth pass would change nothing.
- The score (`makeEvaluator`, `:257`): a set that wins is `(safe ? 1e9 : 0) − killSeconds × 1000 + tiebreak`
  (`:303`); a set that loses **or times out** is `−1e12 + turns × 1000 + hpRemaining + tiebreak` (`:295-299`). So
  among lost sets the climb goes to the one that survives longest, and a 100-turn timeout is the top of that
  tier. From empty slots the first choices are made in the lost tier; whether that leads away from a win (a
  defensive set that times out, from which no single change wins) is the first thing to measure.
- `bisPools` (`:156`): a slot's candidates are the pool's, pinned extras first, then the best by `heuristic`
  against the monster up to the cap (`rank`, `:216-223`), sorted by code (`:230`). So for one pool the candidates
  at caps 6 and 6 hold those at 3 and 3, and those at 12 and 10 hold both.
- `src/plan/planner/reach.ts`: `fightRec` (`:427`, caps 6 and 6), `planRec` (`:456`, 3 and 3; at a level above
  the character's own without potions, on the fleet's gear), `potionRec` (`:496`, 3 and 3); `safeWin` (`:447`)
  is "`planRec` wins in expectation, and `fightRec`'s set is a safe win", with the recorded shortcut that a
  fight the capped search loses is taken to be lost by the wider one. `solveKey` (`:323`) holds the worn codes
  (`:326`) because the tiebreak's `keep` term and the worn weapon option read them.
- `src/plan/jobgear.ts`: the executor's solves call `bestInSlot` with its default caps, 12 and 10
  (`ownedFightRec` `:141`; `jobGear`'s fight branches `:167`, `:184`, `:195`). A `pl:` fight step wears the
  plan's `wear` (task 017); an interrupt, an offering and a train loop's drop hunt wear `jobGear`'s set.
- `src/state/exec.ts:507`: the executor's gate is `simulate(currentFighter(ch), m).win` — the expected fight
  of what is worn, stacks included — and its refusal is the message "not a safe win vs …"
  (`src/state/queue.ts:470`, `:943`, `:1088`, `:1121`); in an offering it is "no way to get N× …"
  (`queue.ts:1262`, `:1363`).
- The journal of 11-22: `lvl:gearcrafting:25@Third#2` paused at 05:08:34 UTC ("not a safe win vs Ogre") after
  254 s of bank, walk and gear and no fight; Third's event trip to the bandit camp paused at 06:04:37 ("not a
  safe win vs Bandit Lizard") after 370 s of the same and no fight, while the event record of 06:00:05 had
  named Third a member ("≈44 kills in 50 min with 100 Small Health Potion and 32 Cooked Trout").
- `src/lib/journal.ts` `spent`: a purchase is a `spend` record only when its currency is `tasks_coin`. Second's
  merchant interrupt of 22:52:51 UTC on 11-21 bought five Lost World Maps for 75,000 gold; its `int-end`
  record carries `gout` 75000 and there is no `spend` record.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 46, 51, 52, 53; "Open questions", the first four); report 020
("The run made exact", "The run made fast", Notes); then `src/plan/bis.ts` whole, `src/sim/combat.ts`,
`src/sim/stats.ts`, `src/plan/jobgear.ts` (to `nextGearAction`), `src/plan/planner/reach.ts` whole,
`gear.ts`, `consumables.ts`, `bundle.ts`, `cost.ts`, `forward.ts`, `road.ts`; `scripts/check-planner.mts`
(the two traps of `bis.ts`'s header, the rows, the fresh run), `scripts/check-road.mts`, `scripts/check.mts`,
`scripts/outlook.mts`; `src/state/outlook.ts`, `src/server/main.ts` (where the child is spawned).

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`. **Nothing you
  run writes under `logs/`.** Reading under `logs/` is allowed.
- **The service's outlook child loads the working tree every three hours and plays to the deadline** (the
  running service gives it `until`; `HORIZON_DAYS` in the tree does not reach it before a restart), and a run
  not ended after 30 minutes is killed and counts as failed. A tree whose fleet fights on may take longer
  than that (report 020's experiment: 3,063 s beside two runs). So **do the solver work in scratch copies of
  the tree, as 020 did with its states, and bring a state into the working tree only when its season fits
  twenty minutes beside the service — or at the end.** Keep the tree loadable: no long stretch with a red
  typecheck. Name every `failed` outlook record of your hours in the Summary, with its cause. If the journal
  or `logs/status.json` shows a restart or a new run id, say so first in the Summary.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new. Node's own profiler is what the measuring needs; profile files go to scratch.
- **Leave at least four cores to the machine**: no more than three long runs side by side, and say in the
  report which timings were taken alone.
- **What may change:** `src/plan/bis.ts` (the search, and how a lost set ranks — settled point 3);
  under `src/plan/planner/` the solve calls, their key and the caches; `src/plan/jobgear.ts` only where a
  call of `bestInSlot` needs a new option passed; `src/sim/combat.ts`, `src/sim/stats.ts` **for speed only,
  with identical results**; `src/lib/journal.ts` (`spent`, settled point 8); `src/state/outlook.ts` (the
  horizon); in `src/server/main.ts` the one line that spawns the outlook child (a heap cap, settled point 6);
  the scripts and the checks; `CLAUDE.md`, `docs/journal.md`. **What may not change:** the objective for a
  set that wins (feasible, then safe, then kill seconds, then the tiebreak's tier and filled terms); the caps
  of the callers (3 and 3, 6 and 6, 12 and 10); any price, score or constant of `decide`; `src/api/*`;
  `src/catalog/*`; the atlas; the runner (`src/state/queue.ts`, `loopkit.ts`, `exec.ts`); the offerings'
  code; the page; anything under `logs/`, `public/`, `docs/audit/`, `docs/design/`; `docs/rework.md` (the
  planning chat's).
- One task only. Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`. For every claim about speed give the two numbers, the
  command and whether the run was alone.
- **Every command you run is in the report's list**, git commands too.
- Gate: `npm run typecheck`; `npm run check`; `npm run check -- planner` (it runs, on the final tree,
  alone); a production build into a scratch folder: `npx vite build --outDir <temp dir>/ammo-021-dist
  --emptyOutDir` (never the project's `dist/`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again
  by the end, commit it again the same way before the task commit. The report is written after the gate is
  green and before the task commit, and is part of it: `021: fight solve` holds this task file, the report and
  what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't retry in a loop: say
  so under "How Alex verifies".

## What is settled
1. **Measure before anything changes** (section 1), on the untouched tree at `0bd4b6a`. The fixed inputs,
   each named, never "the newest": `logs/world/2026-11-21.json` (the road's reference: 78 at the deadline, 53
   at day 21; 419.5 s and 683 MB to the deadline alone, 234.4 s and 630 MB for 21 days);
   `scripts/fixtures/world-2026-11-20.json`; the World `check-planner` starts its rows from;
   `logs/world/2026-11-22.json` (written 00:00:32 UTC, nine minutes before the offering interrupts);
   and **the wall World**: the World of the exact road from the 11-21 file at the first decision whose step is
   the fallback gather ("nothing else is open"; report 020: Second, 12-24), dumped once and kept in scratch
   for the whole task. Keep the baseline's `--json` lines in scratch too.
2. **Two faults are told apart**, because only one is this task's to repair:
   - a **search fault**: for the same character, monster, pool and price, the wider caps' set scores lower
     *by `bestInSlot`'s own score* than the narrower caps' set — which the wider search could have chosen;
   - a **price fault**: the wider caps' set scores higher by the solver's score and plays worse by what the
     planner then does with it (`fightSecOf`'s food and log factor, potions whose stock a step waits for, the
     sliver rule).
   Section 1 counts both. The search fault is repaired here. A price fault is reported with its numbers and
   left alone, unless it is the larger part of the wall — then stop after section 1's table, say so first in
   the Summary, repair the search fault only, and leave the rest to the planning chat.
3. **What right means** — in the gate from now on:
   - **a fixpoint**: the set returned cannot be improved by changing one single slot, or one group (the ring
     pair, the artifacts, the utility pair), among the candidates it was given;
   - **nested**: for the same character, monster, pool and price, caps 6 and 6 never score below caps 3 and
     3, and caps 12 and 10 never below 6 and 6;
   - **the tier of the best known**: on a fixed sample of at least forty fights (settled point 9) the answer
     is safe where the best known set is safe and wins where it wins. The best known set of a case is
     found once, for the report, by a search far dearer than the solver may be: the full enumeration where
     the options' product is under two million sets, otherwise the best of at least two hundred starts each
     climbed to a fixpoint. The gate keeps the sample's expected tiers, not that search.
   The objective for a set that wins does not change (the header of `bis.ts`), and `check-planner`'s two
   traps of that header stay green. **How lost sets rank may change** — it is only what the climb follows;
   when nothing wins the solver still returns a best-effort set to dress in, and the executor's gate refuses
   the fight as today. The solve stays a pure function of what `solveKey` holds, so 020's three proofs (the
   caches off against on, two runs in one process, the rows in two orders) stay green.
   **How** is yours to find and to justify with section 1's numbers. Directions read in the chat: the
   narrower tier's answer as one start of the wider search (a climb never ends below its start, which gives
   "nested" by construction); passes until one changes nothing, bounded; a start that is not empty (an
   offence-first set); a lost set ranked by how near it came to winning (the monster's HP left) instead of
   by the turns it survived. A full enumeration at caps 12 and 10 is not on the table.
4. **The callers keep their caps.** `safeWin`'s shortcut is measured, not assumed: section 1 counts the fights
   `planRec` loses in expectation and `fightRec` wins safely. If one of them is a fight that matters in the
   wall World (an XP source on a combat road, an objective's or a chain's kill), the shortcut goes and
   `safeWin` asks `fightRec`; otherwise it stays, with its count in its comment.
5. **The planner's solves may stop reading what is worn** (the tiebreak's `keep` term, the worn weapon as
   an extra option): an option of `bestInSlot`, off for the three callers of `reach.ts`, and `solveKey`
   without the worn codes. Report 020: 58% of the solves of 21 days differ from an earlier key only there.
   The executor's solves (`jobgear.ts`) keep reading it — a swap for an equal piece at the bank is what that
   term is there to prevent. With sorted pools and "the first candidate wins a tie" the answer without the
   term is still one stable set for one pool, so the planner should not flip between equal sets; prove it on
   the road: count the steps whose `wear` differs from the set the character wore before only by pieces of
   equal score, with the term and without. If it is more than one step in a hundred without it, the term
   stays and the report says what the swaps would have cost.
6. **Fast again, against the new reference** (section 3), by 020's method: one change at a time, measured
   alone on the 21-day road from the 11-21 file, every line equal but the seconds; a change that gains under
   3% of the run and adds code is taken out again. The targets are 020's: a whole season from the fixed file
   in under five minutes on one core and under 1 GB. Candidates read in the chat, the profile decides:
   - settled point 5;
   - 020's table of fights across solves (−27% on 21 days), which came out for memory: a set's two fights
     are a function of the base stats, the set and the monster, and read neither the price nor the worn set.
     A compact entry (numbers in typed arrays, not forecast objects), bounded in megabytes by a cap named in
     the code, may bring it back; say what an entry weighs;
   - a heap cap for the outlook child where `src/server/main.ts` spawns it, if a heap profile shows the peak
     is garbage V8 lets pile up and not data kept.
   **The service's horizon**: a whole-season run alone on the final tree of at most ten minutes and at most
   1 GB → `HORIZON_DAYS` stays 0; otherwise it goes back to 21, and the Summary says so first, with the
   numbers and what the next step for speed would be. `KILL_MS` stays 30 minutes. `check-planner`'s named
   backstop is about 1.3 × what the check takes on the final tree; if that is over two hours alone, say so
   in the Summary's first lines.
7. **The new reference.** The solver's change moves the numbers once more. Report, side by side with report
   020's: the replay's line, and the road from `logs/world/2026-11-21.json` (the points at the deadline and
   at day 21, the completions with their days, the steps). For each replay row and for the road: where it
   first parts from 020's (the day, the character, the two steps and whys) and which fight's set changed.
   **And the wall**: does the fleet still take the fallback gather, from which day, and what the open points
   wait for at the deadline (by `waitingOf`'s groups, points a group). From then on the new line is the
   gate's, to the digit. Row G's pin (`scripts/check-planner.mts:1772`, "ends at report 016's row A, 86")
   cannot hold under a changed solver: the case is removed, the row stays in the line.
8. **Riding along**: a purchase paid in gold is a `spend` record too (`src/lib/journal.ts` `spent`: `what`
   "gold", the code bought, the gold paid, the bucket), `npm run journal`'s `## Spent` table shows it, and
   `docs/journal.md` says so. One made-up case in the harness if its fake game can sell for gold; if it
   cannot, say so and leave the case out.
9. **The checks.** A new check in the plain gate, `scripts/check-solve.mts` (it must take under a minute):
   for every character of the two snapshots (11-20 fixture, and a copy of `logs/world/2026-11-21.json` added
   to `scripts/fixtures/`) against every monster of the catalog, at caps 3 and 3, 6 and 6, 12 and 10 — the
   fixpoint and the nesting of settled point 3; and the sample: its fights with their expected tiers, among
   them the walled fights of the wall World (its characters and bank added to the fixtures as one small
   file), the highwayman of the rows' first decisions, the Ogre and the Bandit Lizard for Third on the World
   of 11-22. `check-planner`: row G's case out, the new line. `check-road`'s speed guard follows the final
   tree's time. Everything else stays as it is.
10. **The docs.** `CLAUDE.md`: the solver (how it searches now, what it guarantees and how the gate proves
    it), the solve cache's key, the checks list, the replay's new line, the outlook's time and horizon.
11. **Not in this task:** the Lab; any change to what `decide` prefers; a cap, a price or a constant that
    decides; the objective for a set that wins; the runner and its gate; the offerings' code (section 6 only
    reads); potions that run out inside an offering; workers or more than one core for one run; a native
    module; the group fights; the service's own checkout; the market analysis.

## 1. Read-only: where the wider search loses
Before any edit, on the untouched tree:
- start the baselines in the background (the season and the 21 days from the 11-21 file, `--json`), and dump
  the wall World (settled point 1);
- **the table of inversions**: for each of the four Worlds (11-20, 11-21, 11-22, the wall World), every
  character at its own level against every monster of the catalog, solved as `fightRec` builds its options
  (the pool, the price) at caps 3 and 3, 6 and 6, 12 and 10: the tier, the seconds a kill, the turns, the
  potions drunk. Count per pair of caps: the wider tier below the narrower (safe → win, safe → lost, win →
  lost); the same tier and a lower score; the same tier, a higher score and more seconds by `fightSecOf` (a
  price fault); the wider above the narrower. Name every inversion among: the wall World's XP sources and
  walled kills (a_peaceful_island, cultist_purifier, cursed_wood_blessed_victory, grand_master,
  king_of_the_goblins, loktar_ogar and the events of the old road's late completions), the highwayman, the
  ogre, the bandit lizard, the vampire, the death knight;
- **why**, for at least five named inversions: the weapon whose climb ended lower, the pass and the slot at
  which the two climbs part, the set each stood on then and its score, and whether the wider climb's end is a
  fixpoint (no single change improves it) or three passes were not enough. Say plainly whether the chat's
  reading holds (the climb through the lost tier to a set that survives or times out) or what it is instead;
- **against the best known** (settled point 3) for the same named fights: how far each cap's answer is from
  it;
- **the shortcut of `safeWin`** (settled point 4): the count, and the fights that matter;
- **what the wall is made of**: on the wall World, per fighter, the monsters of its combat road and of the
  objectives in reach: `planRec`'s verdict, `fightRec`'s, the best known — so the report can say "the wall
  at 23–26 is N fights the solver loses and should win, and M the fleet truly cannot win yet";
- what a solve costs today by caps (simulations and milliseconds, the median and the 95th percentile), so
  the repair's price can be said against it.

## 2. The solver made right
Settled points 2–5, then 7. The order: repair the search in a scratch state → section 1's table again (no
inversion of the first two kinds left; the sample at the best known tier) → the new reference lines → only
then speed.

## 3. The run made fast again
Settled point 6. The report's table: each change, the 21-day run's seconds and peak memory before and after
it (alone), the solves; at the end the whole-season run's and the replay check's. Say what a season costs
now that the fleet fights on, against 020's 419.5 s of a fleet that stood still, and against report 020's
experiment (3,063 s, 1,384 MB, 96,684 solves).

## 4. Riding along, the checks, the docs
Settled points 8–10.

## 5. Read-only: the first hours of 020's code
`npm run journal -- --from 2026-11-22T08:39:04Z` (its tables as they are, and under them only what they do
not explain):
- every `outlook` record: its seconds beside the service against 419.5 s alone, `until`, the points expected
  at the deadline, any `failed` and why (your own trees among the causes: settled in the rules); whether the
  characters' steps went on through each run;
- **the road against play**: every completion an `outlook` record expected by now, the day it was expected
  and the `ach` record's time (expert_miner first, expected between 15:54 and 17:54 UTC on 11-22);
- every `pause`, `block`, `flap`, `nostep`, `defect`, `stopped`, `server` record; for every "not a safe win":
  the plan's set (the `step` or `event` record) against what the character wore at the gate (the raw log's
  equip lines) and that set's forecast;
- **Third's two pauses of 11-22** (05:08:34 UTC, the ogre in a train loop's drop hunt; 06:04:37, the bandit
  lizard on an event trip), from `logs/world/2026-11-22.json` and the raw log: what the plan counted on,
  what `jobGear` dressed Third in, its forecast, and what the repaired solver gives for the same character
  and bank;
- the kill steps and event trips since the boot: the sets `fightRec` now gives against the ones the old
  code's steps wore for the same monster (the journal's `wear`), kills an hour planned and done.
Nothing found here is fixed in this task.

## 6. Read-only: the offerings of 11-22
Six of fifteen were completed (the journal's `int-end` records of the day): combat was left open by First,
Second, Fourth and Fifth ("no way to get 6×/8× Rat Hide"), gear crafting by all five, and Fifth's interrupt
took 11,147 s (5,670 s of it gathering), Third's 6,172 s. Read in the chat from `logs/raw/2026-11-22/00.log`:
First was dressed for the rat, won nine fights of about 45 s cooldown each with no hide dropped (2 of 8
throughout), and at 00:27:13 UTC the gate refused the tenth. For each of the five and each category, from
the journal and the raw log (and every later midnight the journal holds by then):
- what was required, where it came from, the seconds by the meter's groups, how it ended;
- for the combat offerings: the set `jobGear` chose against the rat and its forecast; why the gate refused
  after the wins (the potions of the worn stack gone? HP? the set?); what one rat hide costs at the drop's
  rate (kills, seconds, potions) and so what the offering would have cost whole; what the repaired solver
  gives for the same character and bank;
- Fifth's 5,670 s of gathering and Third's 668 s of crafting: for which requirement, and what the favor paid;
- gear crafting: what each was asked for and why none could be accepted (decision 17's gap; Third: "can't
  get 1× Conjurer Skirt or any lower bracket's item").
End with what an offering is worth (its XP and favor against the hours it took) and what would have to
change for the day to end near fifteen — proposals for the planning chat. Nothing is changed here.

## Out of scope
Everything of settled point 11; regenerating the atlas; moving or deleting anything under `logs/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `021: fight solve` on top of `Rework
   notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why
   the push failed); `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → every check ok, exit 0; the report has the count against report 020's 85 and names the
   new one; nothing new under `logs/` from it.
3. `npm run check -- solve` → ok in under a minute: no inversion, every answer a fixpoint, the sample at its
   tiers.
4. `npm run check -- planner` → ends with the report's new line, in the report's time.
5. `npm run typecheck` passes; the scratch build succeeded.
6. `npm run outlook -- --world logs/world/2026-11-21.json` prints the road in the report's time, with the
   report's points at the deadline; run twice, the same road.
7. `git diff --stat 0bd4b6a HEAD -- src/sim src/plan/bis.ts src/plan/jobgear.ts src/api src/catalog
   src/state src/server src/lib` → only what the report names, each with its reason.
8. **After the restart** (the planning chat says when): the first outlook's record carries the report's
   horizon and about the report's seconds; the Season card shows the expected points (at the deadline, or
   "21 days only" if the horizon went back); a `pl:` fight step's `wear` is the repaired solver's set; the
   characters' steps go on undisturbed through the run.

## Report
`tasks/021-fight-solve.report.md`, with these sections in this order:
- **Summary** — 5–8 lines: whether the service was touched by a restart during the work and every `failed`
  outlook of your hours; what the fault was (search, price, or both, with the counts); whether the three
  guarantees hold now; the road's old and new points at the deadline and whether the fleet still stands
  still; the whole-season run's time and memory and the horizon the service plays; the replay's old and new
  line; the gate's numbers against report 020's.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **Where the wider search loses** — section 1.
- **The solver made right** — section 2, with the new reference and the wall.
- **The run made fast again** — section 3.
- **Riding along, the checks, the docs** — section 4.
- **The first hours of 020's code** — section 5.
- **The offerings of 11-22** — section 6.
- **What was done / files** — every command run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
