# 020 — The forward run: exact first, then fast

## Goal
Task 019 put the forward run to work: a child process plays the live World forward and the Roadmap shows the
road. Two things came out of its first runs.

**It is slow and fat.** From the World of 11:43 UTC on 2026-11-21 a run to the deadline (95 days) took
2,292 s with three runs side by side, about 36 minutes alone, 9,126 steps, 2.2 GB at its peak; 21 days took
148 s and 483 MB. The time per simulated day grows: about 7 s a day in the first three weeks, 30–40 s after
that. So the service's child plays 21 days only (`HORIZON_DAYS`, `src/state/outlook.ts:56-59`) and the Season
card says nothing about the deadline — the number Alex wants most. `npm run check -- planner` takes 2,070 s
of its 2,700 s backstop.

**It is not exact.** The solve caches of `src/plan/planner/reach.ts` serve a pool from a result solved on
another pool (`cached`, `lookup`), so a run's path depends on what was solved before it: two runs in one
process differ (report 019: 32 steps against 31 on the made-up world), and a replay number carries a few
points of noise (decision 46: 016's own code ends at 86 or 89). The next task is the Lab, where Alex changes a
knob and compares two runs. A difference of two points must then be the knob's, not the cache's.

After this task:
- **a run is exact**: the same World gives the same road whatever was solved before, in any process, with the
  caches on or off;
- **a run is fast enough to play with**: the target is a whole season from the live World in under five
  minutes on one core and under 1 GB;
- the service plays to the deadline again if the run allows it (settled point 6), and the Season card shows
  the expected points at the deadline;
- the report says where the seconds and the memory went, with numbers, before and after.

**No rule, price or constant of the planner changes.** What the planner decides may move only where the cache
served an answer that a fresh solve would not have given — that is the noise, and removing it is the point.

The service was restarted at **20:59:29 UTC on 2026-11-21** (run `dxgi`, commit `b808b47`, report 019's
code). The five steps re-attached (`lvl:mining:35` for First, Fourth and Fifth, `ach:cabinet_maker:0` for
Second, `mat:minor_health_potion` for Third); 29 points; bank 92 of 110, gold 241,836. The first outlook
of the live service started at 21:01:30 UTC and ended at 21:04:31: 180.9 s beside the service, 21 days, 29
points then and 59 expected on 12-12; next by it: Expert Miner 11-22 15:54 UTC, Worker 11-23 12:36,
Intermediate Alchemist 11-23 13:03. The steps went on through it (a `level` record at 21:04:21).

**Read in the chat on 2026-11-21** (at `b808b47`; check each against the files and say where one is wrong):
- `src/plan/planner/forward.ts` `forward()`: every decision runs on a new World object (`w = { ...w, now: t,
  current, clock }`, then `wear`, then `advance` when the step ends). `advance()` builds `achievements` with
  `world.achievements.map(...)`: a new array at every step's end, also when no objective moved.
- So every memo keyed on the World object lives for one decision: in `reach.ts` `mayMemo`, `tollMemo`,
  `priceMemo`, `openMemo`; in `consumables.ts` `foodsMemo`, `chainMemo`, `emptyMemo`, `stockMemo`, `matMemo`,
  `needMemo`, `baseMemo`; in `gear.ts` `candMemo`, `needMemo`; in `events.ts` `possibleMemo`, `matMemo`,
  `demandMemo`; in `supply.ts` `secMemo`, `parentMemo`; in `cost.ts` `roadMemo`, `lvMemo`. `targets.ts`
  `built` is keyed on the achievements array and the config object, so by the line above it is rebuilt at
  every decision of a forward run.
- `reach.ts`: `poolOf` gives a character's pool as a Map (equippable gear only, one copy of a code, two of a
  ring) with a signature (`sig`). `fightMemo` and `planMemo` are `Map<string, Solved[]>`: the key holds the
  name, the level, the base max HP, the monster, the extra pieces and `solveKey`, not the pool; a key keeps up
  to 16 results with consumables on (`SOLVES_PER_KEY_014`), each with the pool Map it was solved on; a table
  holds up to 20,000 keys (`MEMO_CAP`, the oldest tenth dropped). `lookup` serves a pool from a result solved
  on a superset pool that still holds the set's pieces, and (task 014) from a safe win that lost only a potion,
  simulated again. `answerMemo` pins the first answer per pool object. `winHint`, `cutMemo`, `routeMemo`,
  `bankMemo` are module-level Maps under the same cap.
- The solver itself is `bestInSlot` of `src/plan/bis.ts` with `simulate` of `src/sim/combat.ts`; `fightRec`
  calls it with caps of 6 a slot and 6 weapons, `planRec` with 3 and 3.
- `forward()` keeps every played step (`played`); `road()` (`road.ts`) reads only its length.
- `road()` is given the forward model's World: no `bankSlots`, the bags banked. A character that is off
  (`config.on`) is still played.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 46, 47, 49, 50; "Known and parked"); report 019 ("The
run", "The first outlook", Notes); `docs/design/planner.md` B.4; then `src/plan/planner/reach.ts` whole,
`forward.ts`, `road.ts`, `decide.ts`, `targets.ts`, `gear.ts`, `consumables.ts`, `supply.ts`, `events.ts`,
`cost.ts`, `stock.ts`; `src/plan/bis.ts`, `src/plan/jobgear.ts`, `src/sim/combat.ts`, `src/sim/stats.ts`;
`scripts/check-planner.mts`, `scripts/check-road.mts`, `scripts/check-outlook-child.mts`,
`scripts/outlook.mts`; `src/state/outlook.ts`, `src/server/outlook-run.ts`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`. **Nothing you
  run writes under `logs/`.** Reading under `logs/` is allowed.
- **The service runs the engine from `src/`, so a restart loads the working tree**, and its outlook child
  loads it every three hours without a restart (`src/server/outlook-run.ts` is started fresh each run). Keep
  the tree loadable: no long stretch with a red typecheck. A child that fails on a half-edited tree costs one
  `failed` record and nothing else; if the journal shows one during your work, name it in the Summary. If the
  journal or `logs/status.json` shows a restart or a new run id, say so first in the Summary.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new. Node's own profiler (`node --cpu-prof`, `--heap-prof`, `v8.getHeapStatistics`,
  `process.memoryUsage`) is what the measuring needs; profile files go to scratch.
- **Leave at least four cores to the machine**: no more than three long runs side by side, and say in the
  report which timings were taken alone.
- **What may change:** under `src/plan/planner/` the caches, the memos and the forward model's bookkeeping;
  `src/plan/bis.ts`, `src/plan/jobgear.ts`, `src/sim/combat.ts`, `src/sim/stats.ts` **for speed only, with
  identical results**; `src/state/outlook.ts` (the horizon, settled point 6); the scripts and the checks;
  `CLAUDE.md`, `docs/journal.md` where they say what changed. **What may not change:** any rule, price, cap
  or constant that decides something (`perSlotCap`, `weaponCap`, `SLIVER`, the prices, the scores; the
  caches' own sizes are free); `src/api/*`; `src/catalog/*`; the atlas; the runner (`src/state/queue.ts`,
  `loopkit.ts`, `exec.ts`); the page; anything under `logs/`, `public/`, `docs/audit/`, `docs/design/`;
  `docs/rework.md` (the planning chat's).
- One task only. Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`. For every claim about speed give the two numbers, the
  command and whether the run was alone.
- **Every command you run is in the report's list**, git commands too.
- Gate: `npm run typecheck`; `npm run check`; `npm run check -- planner` (the core changes: it runs, on the
  final tree, alone); a production build into a scratch folder: `npx vite build --outDir <temp
  dir>/ammo-020-dist --emptyOutDir` (never the project's `dist/`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again
  by the end, commit it again the same way before the task commit. The report is written after the gate is
  green and before the task commit, and is part of it: `020: run speed` holds this task file, the report and
  what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't retry in a loop: say
  so under "How Alex verifies".

## What is settled
1. **Measure before anything changes** (section 1). The baseline is the untouched tree at `b808b47` and one
   fixed input: `logs/world/2026-11-21.json` (name the file, never "the newest": a new day's snapshot appears
   at 00:01 UTC). Keep the baseline's `--json` lines in scratch for the whole task: the 21-day run and the
   whole-season run.
2. **Exact comes before fast**, because while the cache's answers depend on the order of solves, a change
   that only saves time can still move a replay number, and "the same line to the digit" proves nothing
   either way. The order of work is: measure → make the run exact → fix the new reference numbers → make it
   fast against that reference, every later change keeping every line equal.
3. **What exact means**: for the same World, character and monster a solve's answer does not depend on what
   was solved before. The proof is three things, all in the gate from now on:
   - a run with every solve fresh (the caches off, through one exported switch for the checks — no
     environment variable read in the core) gives the same lines as the run with the caches on, on a horizon
     the fresh run finishes in at most fifteen minutes (say which horizon and why);
   - two runs of `road()` in one process give the same lines (today they do not: report 019, "Why two runs
     give the same lines is the child's check");
   - `check-planner`'s rows give the same deadline points whatever order they are played in (play the five
     in two orders once, for the report; the check keeps one order).
   **How** is yours to find. The direction read in the chat: key a solve on what the solver really reads —
   the pool's signature, or narrower, the candidates left after the caps, the character's stats at that
   level, the monster, the potion price's key — and serve only an equal key. The reuse rules of `lookup`
   (a subset pool; a safe win that lost a potion) go, unless one of them can be shown exact (then say why in a
   comment at it). If the hit rate falls, win the time back in section 3, not by a looser key.
4. **The new reference.** The exact run changes the numbers once. Report, side by side with report 019's:
   the replay's line (`OK (… invariant checks, 98 made-up cases; deadline points A / B / C / E / G)`), and the
   road from `logs/world/2026-11-21.json` (the points at the deadline and at day 21, the completions with
   their days). For each replay row and for the road: where the exact run first parts from the old one (the
   day, the character, the two steps and whys), and whether the old step came from a served result that a
   fresh solve does not give. From then on the new line is the gate's, to the digit.
5. **Fast, against the reference** (section 3). Every change is speed only: after it, the 21-day road from
   the fixed file is line for line the reference's (but the seconds), and at the end the whole-season road
   and the replay's line are too. One change at a time, each with its measured gain; a change that gains
   under 3% of the run and adds code is taken out again. Candidates read in the chat, the profile decides:
   - memos keyed on the whole World that could be keyed on the part they read (the bank array, one
     character, the achievements, the config), so they outlive a decision that did not touch that part;
     `advance()` handing on the same `achievements` array when no objective moved;
   - the solve tables: what a key holds (16 results, each with a pool Map and a whole recommendation with
     its forecasts) against what is read back from it;
   - `bestInSlot` and `simulate` themselves (identical results: the checks that cover them stay green and
     the lines stay equal);
   - work repeated per decision that only changes per step's end or per level-up.
   The memory is part of it: say what holds the 2.2 GB (a heap profile or the tables' sizes by simulated
   day) and bound it. `played` may stop holding whole steps if nothing reads them — `check-planner` does, so
   make it an option of `forward()`, off for `road()`.
6. **The service's horizon** follows the result, measured alone on the final tree from the fixed file:
   a whole-season run of at most ten minutes and at most 1 GB → `HORIZON_DAYS = 0` (to the deadline; the
   Season card then shows "expected at the deadline" by itself, `src/ui/RoadmapTab.tsx:81-85`); otherwise it
   stays 21 and the Summary says so first, with the numbers. `KILL_MS` stays 30 minutes. `check-planner`'s
   backstop is lowered to about 1.3 × the time the check takes on the final tree.
7. **If the run cannot be made exact** at a price the season can pay — an exact whole-season run, after the
   speed work, slower than today's 36 minutes — stop there: keep the reuse rules, keep every speed change
   that leaves report 019's replay line and the baseline's lines equal, measure the band instead (the replay's
   row A and the road from the fixed file, each played after three different warm-ups: nothing, the other
   rows, the made-up world's run) and say first in the Summary that the run is not exact, how wide the band
   is, and what an exact run would cost.
8. **Riding along**, each only if it is a few lines, each proven by the lines staying equal where it must
   not show:
   - **a character that is off is not played**: `forward()` leaves a character whose `config.on` is false
     where it stands (no decision, no step; its gear stays on it). All five are on in every row and in the
     fixed file, so no reference line moves; one made-up case in `check-road` shows it.
   - **`waitingOf` and a fight the fleet prepares**: an achievement whose kill is won with the consumables
     the planner makes for it (the_reaper today: the vampire, with minor health potions) is filed under
     "gear (no safe win within ten levels)" because the test is the gear alone (`forward.ts`, `combatGear`).
     It should say what it waits for (the potions' stock). If the honest test is more than a few lines, leave
     it and say so in Notes.
   - `outlook()` and `Outlook` of `forward.ts` go if nothing imports them.
9. **The checks.** Today's 85 stay untouched but for `check-road` and `check-planner` where settled points
   3, 6 and 8 name them. New: the proof of point 3 (fresh against cached; two runs in one process), and a
   speed guard — the made-up world's six-hour run must not take more than three times what it takes on the
   final tree (a wide margin: it is there to catch a memo that stopped working, not a slow day).
10. **The docs.** `CLAUDE.md`: the outlook's section (the horizon, the run's time and memory), the caches
    (what a solve is keyed on, that a run is exact and how the gate proves it), the checks list, the replay's
    new line.
11. **Not in this task:** the Lab; any change to what `decide` prefers; a new constant or price; workers or
    more than one core for one run; a faster language or a native module; the group fights; the service's own
    checkout; the market analysis.

## 1. Read-only: where the time and the memory go
Before any edit, on the untouched tree, from `logs/world/2026-11-21.json`:
- start the whole-season baseline in the background (`npm run --silent outlook -- --world
  logs/world/2026-11-21.json --json > <scratch>/base-season.jsonl`) and the 21-day one
  (`… --days 21 --json > <scratch>/base-21.jsonl`);
- a CPU profile of the 21-day run and of a run long enough to reach the slow part (60 days, or as far as 25
  minutes go): the top functions by self time and by total time, as a table — which share is the solver
  (`bestInSlot`, `simulate`), which the supply and consumables planning, which the targets, which the
  garbage collector;
- per simulated week: seconds, decisions, solver calls, the solve caches' hits by rule (an equal pool, a
  superset pool, the potion rule) and misses, the tables' sizes (`memoSizes`), the heap in use. This is the
  table that says why a day costs 7 s at first and 40 s later;
- what holds the memory at the end of the 21-day run and at the end of the longer one;
- why one run from this file takes five times a replay row (2,150 s against about 414 s a row of
  `check-planner`): the start's levels, the caches shared between the rows, or something else.
Counters the measuring needs may stay in the code only if they cost nothing when nobody reads them.

## 2. The run made exact
Settled points 2–4.

## 3. The run made fast
Settled point 5, then point 6. The report's table: each change, the 21-day run's seconds and peak memory
before and after it (alone), and at the end the whole-season run's and the replay check's.

## 4. Riding along, the checks, the docs
Settled points 8–10.

## 5. Read-only: the first hours of 019's code
`npm run journal -- --from 2026-11-21T20:59:29Z` (its tables as they are, and under them only what they do not
explain):
- every `outlook` record: when it started and ended, its seconds beside the service against report 019's 148 s
  alone, expected at 21 days, any `failed` and why; whether the characters' steps went on through each run
  (no `pause`, no gap in the raw log's action lines while a child ran);
- **the road against play**: for every completion an `outlook` record expected by now, the day it was
  expected and the `ach` record's time (the first: Intermediate Lumberjack, expected about 21:20 UTC on
  11-21 by the run from the 11:43 World, done 20:27:33 UTC);
- every `pause`, `block`, `flap`, `nostep`, `defect`, `stopped`, `server` record;
- the offering interrupts after 00:05 UTC on 11-22 (and of every later midnight the journal holds): when
  each of the five was issued — 018 moved the trigger to the five-minute tick, so by 00:10 UTC — and how each
  ended;
- what report 017's acceptance step 8 still waits for: the Spent table; every kill step of fewer than five
  units and what capped it; whether every `pl:` fight step's `end` withdrew only pieces of its `wear` (the
  vampire fights of the_reaper should be the first);
- the journal's sample `craft:hardwood_plank` at 20:52:11 UTC on 11-21 reads 72 s against an estimate of 309
  (mean 38, n 4): what each of the three numbers counts, and whether the estimate is wrong or the sample;
- the bank's gold went from 240,836 (20:50 UTC) to 241,836 (the boot at 20:59 UTC) with no `spend` record
  between: where the 1,000 came from;
- the market file: lines a day, any gap of more than fifteen minutes.
Nothing found here is fixed in this task.

## Out of scope
Everything of settled point 11; regenerating the atlas; moving or deleting anything under `logs/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `020: run speed` on top of `Rework
   notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why
   the push failed); `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → every check ok, exit 0; the report has the count against report 019's 85 and names the
   new ones; nothing new under `logs/` from it.
3. `npm run check -- planner` → ends with the report's new line, in the report's time.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `npm run outlook -- --world logs/world/2026-11-21.json` prints the road in the report's time, with the
   report's points at the deadline; run twice, the same road.
6. `git diff --stat b808b47 HEAD -- src/sim src/plan/bis.ts src/plan/jobgear.ts src/api src/catalog
   src/state` → only what the report names, each with its reason.
7. **After the restart** (the planning chat says when): about five minutes after the boot's achievements read
   — or as long as the report says a whole run takes — the Road card shows the road and, if the horizon went
   to the deadline, the Season card shows "expected at the deadline: N by the model"; the journal's `outlook`
   record carries the new `until` and seconds; the characters' steps go on undisturbed through the run.

## Report
`tasks/020-run-speed.report.md`, with these sections in this order:
- **Summary** — 5–8 lines: whether the service was touched by a restart during the work; whether the run is
  exact now (or the band, settled point 7); the whole-season run's time and memory before and after; the
  horizon the service plays; the replay's old and new line; the gate's numbers against report 019's.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **Where the time and the memory went** — section 1.
- **The run made exact** — section 2.
- **The run made fast** — section 3.
- **Riding along, the checks, the docs** — section 4.
- **The first hours of 019's code** — section 5.
- **What was done / files** — every command run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
