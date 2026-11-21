# 019 — The Roadmap as home, and the outlook run off the service's thread

## Goal
Since task 018 the page has no Roadmap: Fleet is the home and the plan shows only as one grey line per
character in its queue panel. The planner knows much more than that line: why each character does what it
does, what is blocked, what every open achievement waits for, and — played forward by `forward()` — what comes
next and where the season ends. None of it is on the page, and the forward run has never run in the service:
it takes minutes, and the service has one thread.

After this task:
- **the outlook**: the service starts a child process that plays the live World forward to the deadline and
  streams back what each character does next, what every open achievement waits for, when each achievement is
  expected to complete, and the points expected at the deadline. The service's thread does nothing but hand
  over a World and take lines back;
- **the Roadmap tab** is the first tab and the default route. It is drawn only from synced signals: the season
  (points, tiers, days left, expected), what each character does now and why and what it does next, the road
  (expected completions with dates), every open achievement with what it waits for, what is blocked;
- **three knobs** on an open achievement — first, exclude, weight — through the existing `setPlannerConfig`;
- the same run from a file: `npm run outlook -- --world logs/world/<day>.json`, for the report and for the
  planning chat. The Lab (the next task) is this run with other knobs.

**Nothing in what the planner decides or in what the runner does changes.** No constant, price or rule moves.

The service was restarted at **18:47:56 UTC on 2026-11-21** (run `k66s`, commit `e68045a`, report 018's code).
The boot dropped `ammo:v1:hive`, `ammo:v1:offeringsDaily` and the state's pins with a raw line each, no queue
item; the five steps re-attached (`ach:intermediate_lumberjack:0` for First, Second and Fourth,
`src:nettle_leaf` for Third, `lvl:mining:35` for Fifth); 28 points; bank 93 of 110, gold 240,836.

**Read in the chat on 2026-11-21** (at `e68045a`; check each against the files and say where one is wrong):
- `src/plan/planner/forward.ts`: `forward(world, until, onDecide?, onEnd?)` returns `{ world, played,
  completed }`; it starts every character at `world.clock[name] ?? world.now` with nothing pending, and takes
  `world.current` only as "the step it just finished" (`last`). `waitingOf(world)` gives every open
  achievement with what it waits for. `outlook(world, n)` runs `forward` to the deadline and is called by no
  runtime code. `PlannerState.outlook` (`types.ts`) is written by nobody.
- `src/state/planner.ts`: `worldOf(now)` builds the World; `snapshotOf` writes it once a day to
  `logs/world/<day>.json` with the planner's state (`current` holds each `Running`: the step, `units` done,
  `run` seconds); `setPlannerConfig(patch)` merges top-level keys (a list is replaced whole) and writes a
  `config` journal record; `readAchievements(force)` is not exposed.
- `src/server/main.ts` is the one process (started by `scripts/serve.mjs` under `--import tsx` with
  `--experimental-webstorage`); it streams every signal of `SYNCED` (`src/state/synced.ts`) to the tab and
  injects the file sinks into `lib/journal.ts` — the harness injects its own, so `npm run check` writes nothing.
- `src/app.tsx`: `TABS` starts with Fleet; `route` (`src/state/store.ts`) falls back to `"fleet"`.
- `src/ui/QueuePanel.tsx` `PlannerLine` is the only place the tab shows `planner.current[name].step.why` and
  `planner.blocked`.
- A forward run to the deadline took 216–225 s at task 009; `npm run check -- planner` (five rows and the rest)
  takes about 2,080 s now. Nobody has timed one row since.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 36, 37, 46–49; "Known and parked"); `docs/design/planner.md`
A.6, B.4, H; `docs/journal.md`; report 018 ("What is left"); then `src/plan/planner/forward.ts`, `decide.ts`,
`types.ts`, `config.ts`, `targets.ts`; `src/state/planner.ts` whole; `src/state/synced.ts`, `sync.ts`,
`store.ts`; `src/lib/journal.ts`, `remote.ts`; `src/server/main.ts`; `scripts/serve.mjs`,
`scripts/check-planner.mts` (how it loads the catalog and plays a row), `scripts/journal.mts`,
`scripts/harness/*`; `src/app.tsx`, `src/ui/FleetView.tsx`, `QueuePanel.tsx`, `AchievementsPanel.tsx`,
`DataTable.tsx`, `src/plan/objectives.ts`, `src/styles.css`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`. **Nothing you
  run writes under `logs/`.** Reading under `logs/` is allowed.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Keep it loadable: no long
  stretch with a red typecheck. If the journal or `logs/status.json` shows a restart or a new run id during
  your work, say so first in the Summary, with what the service loaded and whether it runs.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new. Node's own `child_process` and `os` are what the child needs.
- **What may not change:** `src/sim/*`; `src/api/*`; `src/catalog/*`; the atlas; anything under `logs/`,
  `public/`, `docs/audit/`, `docs/design/`; `docs/rework.md` (the planning chat's). Under `src/plan/planner/`
  only what settled points 2 and 12 name. No behaviour of `decide`, `rank`, `advance`, `wear`, `itemsOf` or the
  runner changes.
- **A failing outlook never touches play**: a child that dies, hangs, prints garbage or cannot be started
  costs one raw line and a `failed` state on the page. Nothing pauses, nothing blocks, no decision waits for it.
- One task only. Don't write the next task.
- Everything you write is in **English**, the page's texts too.
- For every claim about the code give `path:line`.
- **Every command you run is in the report's list**, git commands too (a `git reset` or a `git stash` as
  well).
- Gate: `npm run typecheck`; `npm run check`; a production build into a scratch folder: `npx vite build
  --outDir <temp dir>/ammo-019-dist --emptyOutDir` (never the project's `dist/`); and `npm run check --
  planner` **if any file under `src/plan/planner/` changed** — it must end with report 018's line, `OK (693681
  invariant checks, 98 made-up cases; deadline points 88 / 121 / 108 / 62 / 86)`. If no such file changed, say
  so and skip it.
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again
  by the end, commit it again the same way before the task commit. **The report is written after the gate is
  green and before the task commit, and is part of it**: `019: roadmap home` holds this task file, the report
  and what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't retry in a loop:
  say so under "How Alex verifies".

## What is settled
1. **One pure function plays the road**, in a new file under `src/plan/planner/` (`road.ts`): from a World and
   the running steps to the deadline, calling back as it goes. It is what the child, the script and the checks
   call. In order it gives:
   - `waiting`: `waitingOf` of the start World;
   - `next`: per character its next three steps (each with its key, its answer, a one-line text — the text
     its field item or craft would carry in a queue — its why, its hours and when it is expected to start),
     given as soon as every character has three;
   - `day`: once a simulated day, the day and the points so far;
   - `done`: every completion (`code`, `points`, `at`), the points at the deadline, the points at each day's
     end, the seconds the run took, how many steps it played.
   The existing `outlook()` of `forward.ts` stays as it is if `check-planner` uses it; if nothing does after
   this task, say so in Notes and leave it.
2. **The running steps are part of the start.** A character with a step in flight does not decide at `now`: its
   step ends first, at its expected end, with what is left of it. The clean way is one optional parameter of
   `forward()` that seeds what is pending and when each character is free; without it `forward()` does exactly
   what it does today, and `npm run check -- planner` proves that. What is left of a step is its units less
   the units done (`Running.units`, in the step's own unit — mind `perOf` for a drop objective) and its hours
   pro rata. If this cannot be made sound in a few dozen lines, fall back to every character deciding at `now`
   as the replay does, touch nothing in `forward.ts`, and say so first in the Summary.
3. **The child** is one small entry file (`src/server/outlook-run.ts`): it reads one JSON document from stdin
   (`{ world, running, until }`), loads the catalog and the atlas from `public/data` the way the service does,
   calls the function of point 1 and writes one JSON line per callback to stdout, then exits 0. It imports
   nothing of `src/state/*`, opens no storage, writes no file, makes no request. It exits when stdin closes
   before the document is whole or when its parent is gone.
4. **The service's side** is a new `src/state/outlook.ts`: the `outlook` signal, in `SYNCED`, persisted under
   `ammo:v1:outlook` (so a restart shows the last result with its time until a new one lands), and the
   schedule. It never spawns anything itself: `src/server/main.ts` injects the runner (start a child with this
   input, call back per line, give a `kill`), as it injects the file sinks; the harness injects a fake or
   none, so no check starts a process except the one of point 11 that says so. With no runner there is no
   outlook and no line about it.
5. **When a run starts** (only while at least one character is owned and the achievements are read):
   - two minutes after the first achievements read of a boot;
   - every three hours after the last run ended;
   - 30 seconds after a change of the planner's config (any key);
   - on the Roadmap's ↻ of the outlook, at most once a minute.
   **One child at a time.** The config's change and ↻ kill a running child and start anew; the three-hour
   timer skips while one runs. The child runs below normal priority (`os.setPriority`, in a try). A run
   that has not ended after 30 minutes is killed and counts as failed.
6. **What the signal holds**: the state (`idle`, `running`, `failed` with its text); while running, when it
   started and the last `day` line; `waiting` and `next` with the time of the World they came from — replaced
   as soon as a newer run gives them; the road (the completions, the points at the deadline and by day, the
   run's seconds, the commit, the World's time) — replaced only when a run ends, so a running or failed run
   leaves the last whole road on the page with its age.
7. **One journal record a finished run**, kind `outlook`: the World's time, the seconds, the points now and
   expected at the deadline, the next ten completions (`code`, `at`). One for a failed run with its reason.
   `logs/status.json` gets `outlook: { at, expected, sec, state }`. `docs/journal.md` gets the kind; the reader
   (`scripts/journal.mts`) prints an "Outlook" table (time, expected, seconds, the next three completions).
   This is what a later chat holds the forecast against.
8. **If a whole run from the live World takes more than 20 minutes** on this machine (measure it, section 6):
   the service's horizon becomes 21 days (one constant), "expected at the deadline" is not shown, and the
   Summary says so first. The script keeps the deadline as its default.
9. **The Roadmap tab** (`src/ui/RoadmapTab.tsx`, route `roadmap`, first in `TABS`; an empty or unknown hash
   opens it). Fleet stays as it is, second. **Nothing computes in the tab**: it reads `planner`, `outlook`,
   `achievements`, `characters`, `queues`, and imports from the core only types and what the tab imports
   today. Its cards, in this order:
   - **Season**: points now of 210 with the three tiers marked (bronze 105, silver 158, gold 210 — find where
     the data has them; if only the docs do, three constants with a comment), the next tier and how far; days
     left to `config.deadline`; expected at the deadline from the last whole road with its age and the words
     "by the model"; when the achievements were last read (`planner.achievementsAt`) and a ↻ for it — one
     forced read through the planner (expose one function for it, at most once a minute), so a completion is
     claimed as after any read.
   - **Now**: one row per character — who (as Fleet shows it); the step's answer as a pill (objective, level,
     supply, filler, fallback, tidy), "interrupt: <class>" when the head is a `pl:int:` item, "off" when the
     planner does not own it, the head's error if it stands paused; the step's why in full; progress (units
     done of planned from `Running`, hours run of planned); next — the outlook's next two steps as their
     one-line texts with the expected start, the why in the title.
   - **The road**: the expected completions in order — the day (date, and "in N d"), the achievement's name,
     its points, the running total — with a line where a tier is crossed; the first twelve, the rest behind a
     fold. Above it: the time of the World it was played from, its age, the run's seconds, "by the model: the
     differences between two runs say more than the number", and while a run is on, "playing day N of M".
     Empty until the first run ends: say so in one line.
   - **Open achievements**: every achievement not done, grouped — in work now (the target of a running
     step); on the road (with its expected date); then by what `waiting` says (a level, an event, another
     layer, a group, a raid, gear, use, offerings, gold or coins short, unhandled, does not fit), each group
     with the sum of its points. A row: name, points, what it waits for (and the why where `waitingOf` gives
     one), the knobs of point 10. Groups after the first two start folded.
   - **Blocked** (only when something is): `planner.blocked` with until and why.
   - **Priorities** (only when the patch holds any): what is first, excluded and weighted, each with a ✕ that
     takes it out again.
   It uses what the page has (`ws-card`, `DataTable`, `Bar`, `pill`, the fold of `FleetView.tsx` — export it
   again or move it to its own file, unchanged); CSS is added only where no class fits. No chart. The queue
   panel's `PlannerLine` and the 🧭 switch stay where they are.
10. **The knobs**, on an open achievement's row: ⭐ first (in or out of `config.first`), ⛔ exclude (in or out
    of `config.exclude`, with a confirm), weight ×0.5 / ×1 / ×2 / ×4 (`config.weight`; ×1 removes the key).
    Each is one `setPlannerConfig` with the whole new list. Nothing else of `PlannerConfig` gets a control. What
    a change does to a step that is running is not changed in this task: read what happens today (does a
    running step of an excluded achievement run to its chunk's end?) and say it in the report.
11. **The checks.** New, and every one of today's 82 untouched:
    - the function of point 1 on a made-up world: two runs give the same lines; `next` comes before the first
      `day`; a character with a step in flight starts its first new step at that step's expected end, and
      what the step was to bring is in the bank by then (point 2);
    - the service's side with a fake runner in the harness: a request after the first read; a config change
      kills the running one and starts another; a runner that fails or prints garbage leaves the last road on
      the signal, sets `failed`, writes one raw line and pauses nothing; a restart shows the stored road with
      its time;
    - the child for real, once: started on a made-up world with a horizon of six hours, it prints `waiting`,
      `next` and `done` and exits 0; killed halfway, it leaves nothing behind.
12. **Riding along** (decision 48's small leftovers, nothing else of that list): `PlannerState.optedOut` and
    the unused `PlannerState.outlook` leave `types.ts` and `EMPTY`; a stored `optedOut` is dropped at load
    without a line. `package.json`: the description without the hive, and the script `outlook`.
13. **The docs.** `CLAUDE.md`: the UI layout (the Roadmap first), a short section "The outlook" (the child,
    who starts it and when, that it can fail freely, `npm run outlook`), the checks list. `docs/journal.md`:
    the `outlook` kind.
14. **Not in this task:** the Lab and anything that changes a knob only for a run; a forced opening; any
    control for `roles`, `filler`, `risk`, the deadline or the prices; "slower than expected" (the journal's
    samples table has it); the replay's dependence on the order of solves; group boss fights; the service's own
    checkout; cutting the old-shape branches; a redesign of Fleet or of any other tab.

## 1. The run
Settled points 1–3 and the script: `npm run outlook -- [--world <file>] [--days N] [--json]` reads a day's
snapshot (`logs/world/<day>.json`: its `world` and the `current` of its `planner`), plays it with the same
function and prints the season line, the next steps per character, the waiting groups with their points and
the road. It starts no child and needs no service. Default: the newest file under `logs/world/`.

## 2. The service's side
Settled points 4–8.

## 3. The Roadmap tab and the knobs
Settled points 9 and 10. The report describes each card as it is drawn (there is no browser in this task: say
what was checked by the build and the types, and what only Alex's eyes can check).

## 4. The checks and the docs
Settled points 11–13.

## 5. Read-only: the first outlook
From `logs/world/2026-11-21.json` and, if a newer day's file exists by then, from that one too, with
`npm run outlook`:
- the seconds to `next`, a simulated week, the whole run; the steps played; the memory the process peaked at;
- two runs of the same file: the same road? (A fresh process each; if they differ, where first.);
- the season line: points now, expected at the deadline, the day each tier is crossed if it is;
- the next three steps per character, against what `logs/status.json` shows them doing now;
- the waiting groups with their points (they must add up, with the road's and the done points, to 210 — or
  say what is missing);
- the first twenty completions of the road;
- what looks wrong to you in it, most doubtful first. Nothing found here is fixed in this task.

## 6. Read-only: the first hours of 018's code
`npm run journal -- --from 2026-11-21T18:47:56Z` (its tables as they are, and under them only what they do not
explain):
- every `pause`, `block`, `flap`, `nostep`, `defect`, `stopped`, `server` record;
- the offering interrupts after 00:05 UTC on 11-22: when each of the five was issued (018 moved their trigger
  to the five-minute tick) and how they ended;
- what report 017's acceptance step 8 still waits for: the Spent table; every kill step of fewer than five
  units and what capped it; whether every `pl:` fight step's `end` withdrew only pieces of its `wear`;
- the market file: lines a day, any gap of more than fifteen minutes.

## Out of scope
Everything of settled point 14; a change to any price, rule or constant of the planner; regenerating the atlas;
moving or deleting anything under `logs/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `019: roadmap home` on top of `Rework
   notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why
   the push failed); `git log main --oneline -1` → `edaaf23`.
2. `git diff --stat e68045a HEAD -- src/plan/planner src/sim src/api src/catalog` → `road.ts` new, and exactly
   the lines of `forward.ts` and `types.ts` the report shows.
3. `npm run check` → every check ok, exit 0; the report has the count against report 018's 82 and names the
   new ones; nothing new under `logs/` from it.
4. `npm run check -- planner` → report 018's line (or the report says no file of the core changed).
5. `npm run typecheck` passes; the scratch build succeeded.
6. `npm run outlook` prints the season line, the next steps, the waiting groups and the road from the newest
   snapshot, without a service and without writing a file.
7. **After the restart** (the planning chat says when): the page at `http://localhost:5173/` opens on the
   Roadmap; Season and Now are filled at once; about two minutes after the boot's achievements read the
   outlook shows as running, the next steps appear, then the road and the expected points; the journal has
   an `outlook` record and `logs/status.json` an `outlook` field; the characters' steps went on undisturbed
   through the run (no `pause`, no gap in the raw log's action lines while the child ran); ⭐ on an open
   achievement shows under Priorities, starts a new run, and ✕ takes it back.

## Report
`tasks/019-roadmap-home.report.md`, with these sections in this order:
- **Summary** — 5–8 lines: whether the service was touched by a restart during the work; whether point 2 went
  the clean way; how long a whole run takes and whether the horizon was cut (point 8); what the first outlook
  says in one line; the gate's numbers against report 018's.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The run** — section 1.
- **The service's side** — section 2.
- **The Roadmap tab and the knobs** — section 3.
- **The checks and the docs** — section 4.
- **The first outlook** — section 5.
- **The first hours of 018's code** — section 6.
- **What was done / files** — every command run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
