# 018 — The clean-up: the planner is the only writer; the old writers and what only they reach are deleted

## Goal
Since 2026-11-19 all five characters are the planner's and nothing else has written a queue. The code of the
old ways of playing is still there: the hive, the pins and the training loops, the helpers, 🔁, the queue
editor, the old Roadmap with its suggestions and its fleet analysis, the standing orders for a character that is
not the planner's. It is about a third of `src/`, it is loaded by the service at every start, and it is what
made this client hard to change. Alex decided on 2026-11-18 that it is deleted for good and at once (decision
15 of `docs/rework.md`); the order of the rounds put that after keys and tolls (decision 46).

**This task deletes. It changes nothing in what the planner decides or in what the runner does with an item the
planner writes.** The proof is the gate: no file under `src/plan/planner/` changes, the replay ends at report
017's numbers, and every scenario that survives passes without an edit to what it asserts.

After it:
- the only writers of a queue are `src/state/planner.ts` (a step appended to an empty queue, and `interrupt()`)
  and the Group fight fold for a character whose planner is off (it stays until the group-fight round);
- a character whose planner is off gets no item from anyone: it stands still, and the direct action buttons
  are what is left for it;
- the browser shows what is left of today's views. **Nothing new is drawn in this task**: the Roadmap as home
  is the next one.

The service was restarted at **17:01:00 UTC on 2026-11-21** (run `qf93`, commit `b322195`, report 017's code);
the five steps re-attached (`ach:intermediate_lumberjack:0` for First, Second and Fourth, `src:nettle_leaf` for
Third, `lvl:mining:35` for Fifth); `logs/market/2026-11-21.jsonl` has its first whole line.

**Read in the chat on 2026-11-21** (the import graph of `src/` at `b322195`; check each against the files and
say where one is wrong):
- `src/plan/hive/*` is imported from outside itself by: `src/state/hive.ts`, `src/ui/HivePanel.tsx`,
  `src/ui/RoadmapTab.tsx`, `src/plan/roadmap.ts`, `src/plan/fleetcheck.ts`, `src/plan/coverage.ts` (`ctx.ts`),
  `src/ui/AchievementsPanel.tsx` (`objectives.ts`), `src/state/queue.ts` (`trainingResourceFor` of `skills.ts`).
  Nothing under `src/plan/planner/` imports it.
- `src/state/hive.ts` is imported by `src/state/planner.ts` (`hive`, `setHiveManual`: the opt-out list at a
  take-over), `src/state/sync.ts` (`resumeHive`, twice), `src/state/synced.ts` (the `hive` signal),
  `HivePanel.tsx`, `RoadmapTab.tsx`.
- `src/plan/roadmap.ts` ← `fleetcheck.ts`, `hive/tasks.ts`, `RoadmapTab.tsx`; `src/state/roadmap.ts` ←
  `synced.ts` (`roadmapAnalysis`), `RoadmapTab.tsx`; `src/plan/fleetcheck.ts` ← `state/roadmap.ts`,
  `RoadmapTab.tsx`; `src/plan/coverage.ts` ← `GearCoveragePanel.tsx` only.
- `src/state/queue.ts` exposes to the tab: `addItem`, `removeItem`, `updateItem`, `moveItem`, `clearQueue`,
  `setRepeat`, `queuePinTraining`, `queueAssist`, `queueOfferings`, `startQueue`, `stopQueue` (its last line).
  `addItem` is called from `RoadmapTab`, `GroupFight`, `TableTabs`, `CatalogPanel`, `QueuePanel`.
- `skillPins` / `craftPins` live in `src/state/store.ts` and are read by `FleetView`, `CharacterPanel`,
  `TableTabs`, `QueuePanel`, `RoadmapTab`, the hive, `state/queue.ts`, `synced.ts`, `persist.ts`.
- The item kinds of `src/plan/queue.ts` and who writes them today: `planner/compile.ts` — `gear`, `fight`,
  `gather`, `craft`, `withdraw`, `buy`, `recycle`, `train` (a crafting level), `task-loop`, `deposit-all`;
  `planner/events.ts` — `gear`, `fight`, `gather`, `deposit-all`; `state/planner.ts` — `claim`, `expand`,
  `offering`; `plan/events.ts merchantOrder` — `buy`, `sell`; `GroupFight.tsx` — `prepare`. No surviving
  writer was found for `move`, `rest`, `accept-task`, `deliver`, `turn-in`, a `work-task` of its own, or a
  `train` of combat, of a gathering skill or with `for`.
- Storage keys in the code: `ammo:v1:state`, `:queue`, `:planner`, `:hive`, `:eventOrders`,
  `:offeringsDaily`, `:simdev`, `:migrated`, `:ui`, `:gearsets`, `:token`.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 15, 21, 24, 46, 47; "Known and parked"; "In the game's UI,
for Alex"); `docs/design/planner.md` C.2, C.5, G, H, I.2; `docs/audit/code-audit.md` B (the writers); report
017 (Notes); then the code named above, `src/state/queue.ts` whole, `src/state/eventorders.ts`,
`src/plan/events.ts`, `src/state/planner.ts`, `src/state/sync.ts`, `src/state/synced.ts`, `src/state/store.ts`,
`src/state/persist.ts`, `src/app.tsx`, every file under `src/ui/`, `scripts/check.mts`, `scripts/harness/*`,
the scenarios.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`. **Nothing you
  run writes under `logs/`.** Reading under `logs/` is allowed.
- **The service runs the engine from `src/`, so a restart loads the working tree — and for most of this task
  the working tree does not load.** Keep that window short: plan the whole deletion first (section 1, on
  paper), then delete, then go straight to a green typecheck. Alex restarts only when the report exists. Write
  the report last, after the gate is green and the task commit is made. If the journal or
  `logs/status.json` shows a restart or a new run id during your work, say so first in the Summary, with what
  the service loaded and whether it runs.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new, none removed unless nothing imports it any more (say which). A tool run once
  through `npx` from a scratch directory (an unused-export finder, for instance) is fine; nothing of it is
  added to `package.json`.
- **What may not change:** anything under `src/plan/planner/`; `src/sim/*`; `src/api/*`; `src/lib/*`;
  `src/catalog/*`; `scripts/check-planner.mts`; `scripts/journal.mts`; `scripts/market.mts`; the atlas
  (`public/data/atlas.json`, `scripts/atlas*`); anything under `logs/`, `public/`, `docs/audit/`,
  `docs/design/`; `docs/rework.md` (the planning chat's). If one of these must change for the build to hold
  (an import of a moved name, nothing else), the report shows the line.
- **Delete, don't rewrite.** No function that survives gets a new body, a new signature or a new name, except
  where settled point 6 allows a move. No behaviour is repaired on the way: what you notice goes under "Notes".
- **A write that fails never breaks the runner; nothing new pauses a queue to wait for Alex.**
- One task only. Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line` (of the tree after the task, or `b322195:path:line` for
  what is gone).
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-018-dist --emptyOutDir` (never the project's `dist/`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again
  by the end, commit it again the same way before the task commit. At the end, `018: clean-up`: this task
  file, the report and what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't
  retry in a loop: say so under "How Alex verifies".

## What is settled
1. **What is deleted for good** (Alex, decision 15), with everything only it reaches:
   - **the hive**: `src/state/hive.ts`, `src/plan/hive/*`, `src/ui/HivePanel.tsx`, the 🐝 drawer and the status
     strip, `hiveOpen`, `hiveProposals`, the `hive` signal in `SYNCED`, `resumeHive`, the opt-out list and its
     two calls in `state/planner.ts`;
   - **the pins and the training loops**: `skillPins`, `craftPins`, the pin clicks in the skills cards and the
     Fleet grid, `queuePinTraining` ("Train pins"), the `train` item for combat and for a gathering skill;
   - **the helpers**: `queueAssist` ("Fleet helps", "Help X train"), `runTrainAssist`, `assistPick`, `train`
     with `for`;
   - **🔁**: `setRepeat`, the `repeat` flag of a queue and every branch that reads it;
   - **the queue editor**: the add form and the per-item edit, move, remove and clear controls of
     `QueuePanel.tsx`, every "+ Queue" button of `CatalogPanel`, `TableTabs` and the map ("Pick on map" for a
     queue form), and `addItem`, `removeItem`, `updateItem`, `moveItem`, `clearQueue` as calls the tab can
     make. The queue table stays, read-only, with the planner's line;
   - **the old Roadmap**: `src/plan/roadmap.ts`, `src/state/roadmap.ts`, `src/plan/fleetcheck.ts`,
     `src/ui/RoadmapTab.tsx`, `src/ui/roadmapText.ts`, the `roadmap` route and tab, `roadmapAnalysis` in
     `SYNCED`. The tab comes back in the next task, drawn from the planner;
   - **the gear coverage view**: `src/plan/coverage.ts` and `src/ui/GearCoveragePanel.tsx` (the planner's gear
     by need is the one answer to "what does the fleet lack");
   - **the standing orders of a character that is not the planner's**: `free()` and the field order's pick in
     `src/state/eventorders.ts` and `src/plan/events.ts` (`fieldOrder`), the old daily offerings trigger
     (`scheduleOfferings` and its `ammo:v1:offeringsDaily` marker) — the planner's `offering`, `event` and
     `merchant` interrupts stay exactly as they are.
2. **A character whose planner is off gets no item from anyone**: no offering, no event trip, no merchant
   order, no training. The switch per character stays (`setPlannerConfig({ on })`); switched off, the queue is
   emptied and stopped as today. The direct action buttons (the action bar, gear slots, the bank and catalog
   actions that act at once, claiming a reward, walking by a map click) are not touched: they do what they do
   today.
3. **The Group fight fold and the `prepare` kind stay as they are** until the group-fight round. If the fold
   needs a queue call the tab may no longer make (`addItem`, `startQueue`), give it one exposed function of
   its own that writes only what the fold writes today and refuses a character whose planner is on, as today.
4. **Item kinds.** A kind of `src/plan/queue.ts` no surviving writer writes is deleted with its handler in
   `src/state/queue.ts`, its label, its progress text and its fake support if only it used it. A handler a
   surviving kind calls from inside (the task loop's accept, work and turn-in, for one) stays as a function.
   The report has the table: kind → who writes it after this task → kept or deleted.
5. **Reachability decides the rest.** The roots are `src/server/main.ts`, `src/main.tsx`, `scripts/check.mts`
   with every check and scenario that survives, `scripts/journal.mts`, `scripts/market.mts`,
   `scripts/atlas.mts`, `scripts/serve.mjs`, the fetch scripts. After the deletions of point 1:
   - a module nothing reaches is deleted;
   - an export nothing imports is deleted, in the files the old writers lived in: `src/state/queue.ts`,
     `src/plan/queue.ts`, `src/plan/events.ts`, `src/state/eventorders.ts`, `src/state/store.ts`,
     `src/state/persist.ts`, `src/state/synced.ts`, `src/state/sync.ts`, `src/state/offerings.ts`,
     `src/plan/acquire.ts`, `src/plan/xp.ts`, `src/plan/consumables.ts`, `src/plan/bis.ts`,
     `src/plan/jobgear.ts`, `src/state/exec.ts`, `src/state/loopkit.ts`, and the UI files;
   - **inside a function that survives nothing is cut.** A branch that only an old item shape could reach (a
     `fight` item without `take`, a `gear` item without `wear`, a craft that waits for a hive producer) stays,
     and is listed in the report with `path:line` and the shape that reached it: the planning chat decides
     about those.
6. **A survivor that needs something from a deleted module** gets it by a move, unchanged: the function or
   the type goes to the file of its one caller, or the file moves (`src/plan/hive/objectives.ts` for the
   Achievements tab, `trainingResourceFor` for `state/queue.ts` if a surviving handler calls it). More than
   about 60 lines moved for one view: the view goes instead, and the report says which.
7. **The five pairs that exist twice** (`pickMonster` / `trainingMonsterFor`, `pickNode` /
   `trainingResourceFor`, `nearestSpot` and `travel` / `nearest` and `nearestBank`, `fightRec` / `forecastVs`,
   `craftsPerLevel` / `trainRecipe`): nothing is merged. The planner's stays; the old one stays only while a
   surviving caller calls it. The report says for each pair what is left and who calls it.
8. **The UI**: an element goes when what it does or shows is deleted; a row or a card that only informs and
   whose data survives stays. Fleet's "Needs you": the rows that offer a deleted action or report a paused or
   stopped queue of an old writer go; the event and offering rows stay if their data does. Dead CSS goes with
   its element. No element is added, moved or restyled. The report lists every tab with what is on it after
   the task.
9. **Stored state.** At boot the service removes the keys nothing reads any more (`ammo:v1:hive`,
   `ammo:v1:offeringsDaily`, and any other this task orphans), drops from `ammo:v1:state` the fields nothing
   reads (the pins), and drops from a stored queue every item of a deleted kind and the `repeat` flag — one
   raw line for each thing dropped, never a pause, never a throw. A `pl:` step and a `pl:int:` interrupt of
   surviving kinds re-attach as today.
10. **The checks.** A check or scenario of a deleted feature is deleted (`check-assist`, `check-roadmap`
    with `fixtures/roadmap-fleet.json`, `helper-*`, `repeat-spin`, `train-mining-30` and whatever else only
    exercises deleted code); the report lists each with the feature it tested. A scenario that tests the runner
    through a hand-written queue keeps doing so through the harness (the harness may write a queue; the tab may
    not). **A surviving scenario's assertions are not edited.** Where one fails because it relied on a deleted
    writer for a character that is off (`*-not-owned`, `planner-off`), it is rewritten to assert settled point
    2 and the report shows the diff. One new scenario, `cleanup-boot`: storage holds a hive state with a goal
    running, pins, a queue with `repeat` on, a non-`pl:` item of a deleted kind and a `pl:` step — the service
    boots, drops the old things with a line each, the step re-attaches, nothing pauses.
11. **The docs.** `CLAUDE.md` is rewritten where it describes what is gone (the hive, the skill loops, the
    queue as "user-editable", the Roadmap tab, `npm run atlas` as "the Roadmap tab's data") and says in a
    short section who writes a queue now. `.claude/skills/*` that drive a deleted feature (`hive-probe.mjs`,
    a stale `drive.mjs`) are deleted or cut. `docs/journal.md` only if a record kind went.
12. **Not in this task:** the Roadmap as home and the outlook; the Lab; group boss fights; the service's own
    checkout (decision 47: later, its own small task); the replay's dependence on the order of solves
    (decision 47: with the Lab); merging the pairs of point 7; cutting inside surviving functions (point 5);
    any change to a price, a rule or a constant; everything parked in `docs/rework.md`.

## 1. The plan of the deletion (before the first file goes)
Written into the report as it was made, then corrected to what was done:
- the modules deleted whole, with their line counts at `b322195`;
- per file of settled point 5, the exports that go;
- the kinds table of settled point 4;
- the UI elements that go, per tab;
- the storage keys and fields that go;
- the checks and scenarios that go, and the ones rewritten.

## 2. The deletion
Settled points 1–9. For each group of point 1: what went (files, exports, UI elements), and one line on how you
know nothing that survives used it (the grep, the typecheck, the unused-export run).

## 3. The checks and the docs
Settled points 10 and 11. `cleanup-boot`'s trace in the report.

## 4. Read-only: what is left
- `src/` by directory: files and lines at `b322195` and after.
- The branches of settled point 5 that only an old item shape reaches: `path:line`, the shape, about how many
  lines.
- The pairs of settled point 7.
- What the tab can still ask the service to do: every exposed function after the task, with the UI element
  that calls it.
- The first hours of report 017's code, from `npm run journal -- --from 2026-11-21T17:01:00Z` (its tables as
  they are, and under them only what they do not explain): report 017's acceptance step 8 — the market file's
  lines, the Spent table, any kill step of fewer than five units and what capped it, whether every `pl:` fight
  step's `end` withdrew only pieces of its `wear`; every `pause`, `block`, `flap`, `nostep`, `defect`,
  `stopped`, `server` record. Nothing found here is fixed in this task.

## Out of scope
Everything of settled point 12; a new UI element of any kind; regenerating the atlas; moving or deleting
anything under `logs/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `018: clean-up` on top of `Rework notes`;
   `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why the push
   failed); `git log main --oneline -1` → `edaaf23`.
2. `git diff --stat b322195 HEAD -- src/plan/planner src/sim src/api src/lib src/catalog scripts/check-planner.mts`
   → empty (or exactly the lines the report shows).
3. `npm run check` → every check ok, no known defect left (`repeat-spin` is gone), exit 0; the report has the
   count against report 017's 90 and the list of what went; nothing new under `logs/` from it.
4. `npm run check -- planner` → ends with `OK (693681 invariant checks, 98 made-up cases; deadline points 88 /
   121 / 108 / 62 / 86)`, as report 017's did.
5. `npm run typecheck` passes; the scratch build succeeded.
6. `git grep -nE "[^c]hive|Hive|skillPins|craftPins|queueAssist|queuePinTraining|setRepeat|roadmapAnalysis" -- src scripts`
   → nothing but comments that tell history (the report lists what is left and why).
7. `git show --stat HEAD` → deletions, and changes only in files the rules allow.
8. **After the restart** (the planning chat says when): the journal's `boot` record carries the new commit and
   all five steps re-attach; the raw log has one line for each stored thing dropped; no `pause`; `status.json`
   is rewritten every minute; the page at `http://localhost:5173/` opens on Fleet, without a Roadmap tab, a
   Hive drawer or queue forms, and shows each character's step and its why.

## Report
`tasks/018-clean-up.report.md`, with these sections in this order:
- **Summary** — 5–8 lines: whether the service was touched by a restart during the work; what went, in
  modules and lines; what the tab can still do; the gate's numbers against report 017's; what a restart will
  drop from storage.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The plan of the deletion** — section 1.
- **The deletion** — section 2.
- **The checks and the docs** — section 3.
- **What is left** — section 4.
- **What was done / files** — every command run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
