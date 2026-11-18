# 001 — Code audit (read-only)

## Goal
The client grew in layers, none of them planned as a whole: queue items → per-character skill loops and pins →
the hive → event standing orders and the daily offerings trigger → the atlas and the Roadmap tab with next steps
and the fleet analysis. Alex now sees strange errors, suspects that the layers contradict each other and that one
feature breaks another, and is considering a rewrite from scratch.

This task changes no code. It establishes the facts that decision needs, and writes:
1. `docs/audit/code-audit.md` — the findings (sections A–J below);
2. `docs/audit/domain-rules.md` — the game knowledge the code holds, so it survives whatever happens to the code;
3. `tasks/001-code-audit.report.md`.

The decision between cleanup and rewrite is Alex's, made after he reads the audit. Don't start fixing, refactoring
or designing the replacement, and don't write the next task.

Read first: `CLAUDE.md`, `README.md`, `docs/game-actions.md`, `docs/tasks/roadmap-tab.md`, the memory notes that file
names (`progression-atlas`, `map-events`, `skill-loops`, `hive-coordinator`) if they exist, `.claude/skills/verify/`,
then all of `src/` and `scripts/`, and `git log`.

## Rules for this task
`CLAUDE.md` has no task workflow yet, so the rules for this task are all here.
- **Nothing outside `G:\alex\projects\artifactsmmo\` is written, changed or deleted.** The one exception is a scratch
  storage file in the system temp dir for a check script (below).
- **The real service is running** (port 5173, `.ammo/storage.db`, the account token) and playing the
  game. Nothing in this task may disturb it:
  - don't run `npm start`, `npm run dev`, `npm run build` (it rewrites `dist/`, which the running service serves),
    `npm run atlas`, `npm run assets`, `scripts/fetch-data.mjs` or `scripts/fetch-map-assets.mjs`;
  - don't start a second service, not even on a spare port: a boot sync spends the 300/h account read budget;
  - no request to `api.artifactsmmo.com`, and none to the local service (`/rpc`, `/events`);
  - don't stop or restart any process you didn't start.
- **Allowed to run:** `npm run typecheck`; read-only git (`log`, `status`, `diff`, `show`, `blame`, `shortlog`);
  line counting and search tools; a `scripts/check-*.mts` script only after reading it and confirming it is offline
  and doesn't open `.ammo/storage.db` (give it a scratch storage file in the system temp dir). If you can't
  confirm that, don't run it and say so.
- **Write only** `docs/audit/**` and `tasks/001-code-audit.report.md`. No edits to code, `CLAUDE.md`, memory notes,
  settings or anything else. This task is read-only, so it also deletes, moves and renames nothing (later tasks may
  delete files inside the project; this one has no reason to).
- **Data:** don't read or print `.env`. Don't open `.ammo/*.db` or `game.db` with anything that could write next to
  them (SQLite only as `file:<path>?mode=ro&immutable=1`); describing them from the code is enough.
  `logs/dev.log` may be read freely; no token ever goes into a document.
- Everything you write is in **English**.
- Commit at the end, message `001: code audit`: this task file, the report and `docs/audit/**`. No push. Don't stage
  anything else, whatever state the working tree is in.

## What to establish
For every specific claim give `path:line`. Mark each finding **verified** (you read the code path end to end) or
**inferred**. `CLAUDE.md` is a claim about the code, not evidence: where it and the code disagree, the code wins and
the disagreement is a finding.

### A. Map
- Every module in `src/` and `scripts/`: lines, role in one line, which layer/generation it belongs to (use `git log`
  for when each layer appeared), status (live / partly superseded / dead).
- The import graph between modules, with cycles and the places where a dynamic `import()` is used to avoid one.
- Entry points; every persistence key (`ammo:v1:*`, `ammo:server:*`) with the module that owns it and who else reads
  or writes it; the `SYNCED` list; every rpc-exposed function.
- Module-level mutable state (sets, maps, flags, memo caches, timers) per module, and what resets it.

### B. Who puts work on a character's queue
The central question. Enumerate **every** code path that inserts, appends, patches, reorders, clears, starts or stops
a queue, or changes its `repeat` flag — among them: user edits over rpc, `queuePinTraining`, `queueAssist`, 🔁 repeat
recycling, hive takeover and dispatch, `insertItem` / `patchItem`, `rebalanceWave` / `planSteal`, fillers and
`pullFillers`, `moveOn`, continuous mode, `handOffToTasks`, event standing orders (ahead of the head), the daily
offerings trigger (ahead of the head), group-fight `prepare`, the Roadmap actions (`train` at the front,
`queueGoal`), `skipItem`, `giveUpTask`, and resume at boot. Find the ones not in this list.

For each: what triggers it, what it assumes about the queue at that moment (running? head item kind? owned by whom?),
which id namespace it uses, and how it finds "its" items later.

Then a pairwise matrix of the **automatic** writers (hive, event orders, offerings, repeat, assist, pin training,
roadmap-launched items, resume). Each cell: *safe by construction*, *safe by a guard* (cite it), or *conflict
possible* with the concrete scenario: the state, the order of events, what the character ends up doing.
Include: is the hive actually "frozen", as `CLAUDE.md` says — which paths still reach it today?

### C. Who decides what is best
Several layers answer the same question on their own. For each family, list the implementations, the inputs and rules
in which they differ, and one concrete state where two of them give different answers:
- best monster to fight (`trainingMonsterFor`, hive scoring, the atlas `path`, `fleetcheck`, event orders);
- best gear set (`jobGear`, `bis`, `fleetBis`, `coverage`, the atlas pools, the roadmap band set);
- best recipe or node to train on (`trainRecipe`, `plan/hive/skills.ts`, the atlas `craftTrain` / `gatherTrain`);
- how to get an item (`sourceOne`, `produceOnce`, `planAcquire` / `acquireWaves`, `work-task` acquisition,
  `canObtainOffering`, `provisionFood`, `provisionPotions`);
- time, XP and value estimates (`plan/xp.ts`, `SEC_PER_ACTION`, `lanePace`, `score.ts`, `scripts/atlas/econ.mts`);
- who the specialist for a skill is (pins, `craftPins`, hive candidates, roadmap milestones).
Also: what `scripts/atlas/*.mts` imports from `src/` and what it re-implements.

### D. Shared stock and the rules that protect it
Five characters share one bank. List every protective rule (a `keep` list, `trainKeep`, pinned artifacts,
`RESET_UTILITY_STRIP`, the task deliverable, "gear is never sold", `autoRecyclable`, `healingFoods`, `gearMaterial`,
`GOLD_FLOOR`, the coin reserve / `coinDemand`, the hive's virtual-bank accounting, one-character claims on stock, …):
where it is enforced, and every path that can consume, deposit, sell, eat, recycle or withdraw the same thing
**without** going through that check. Past incidents named in `CLAUDE.md` (fighters ate a hive order's mushrooms, the
potion-brew bank livelock, four helpers gathering the same wood) show the pattern; look for the ones not yet hit.

### E. The stated invariants
`CLAUDE.md` states the design as invariants. Check each against the code — table: invariant, *holds* / *holds with
exceptions* / *broken*, evidence. At least: `api/client.ts` is the only `fetch` to the game; `act()` is the only
action chokepoint; `applyActionResult` is the only place responses fold into state; nothing polls the account except
`refreshEvents`; `plan/` is pure (no signals, no `state/` imports, no API); the tab never runs the engine (every
UI-called mutator has the `IS_SERVER` guard and `expose`; every server-owned signal the UI reads is in `SYNCED`; the
UI never writes one); runner persistence doesn't go through `persist.ts`; the hive performs no API calls except
`loadAchievements`; queue items are the only execution vocabulary; hive waves hold no infinite items and at most one
assignment per character; "the bank is the single source of truth for gear".

### F. `CLAUDE.md` against the code, and dead code
- `CLAUDE.md` is 44 KB and the only specification. List what in it is stale or wrong, and what the code does that it
  doesn't mention.
- Dead or orphaned: exports nobody imports, queue item kinds or fields nothing creates or reads, flags never set,
  leftovers of removed layers (the planner/campaign layer removed 2026-07-06, the browser-era `importLocal`
  migration, GitHub Pages), scripts that no longer work, files at the repo root nothing uses.

### G. Errors seen in practice
From `logs/dev.log` (say how large it is, what period it covers, and how you sampled it if it is too big to read
whole): recurring errors, queue pauses, skips, hive goals ending `incomplete`, stalls, the same action repeated with
no progress, unexpected API status codes, service restarts. Group by cause with counts and dates, and link each group
to the responsible code where you can. Separate "the game said no" from "our logic was wrong".

### H. Complexity
- The largest files and functions (`state/queue.ts` is ~85 KB, `state/hive.ts` ~38 KB, `plan/jobgear.ts` ~27 KB,
  `plan/roadmap.ts` ~24 KB, `state/exec.ts` ~24 KB): functions over ~80 lines, the deepest branching, functions that
  take more than one kind of responsibility.
- Special cases: every dated note in `CLAUDE.md` and in code comments marks a patch made after something went wrong
  in play. Count them per module — it shows where the design keeps being patched instead of holding.
- What makes the engine hard to test today (signals created at module load, `IS_SERVER`, storage hydration at import,
  timers, the wall clock), what the `check-*.mts` scripts cover and what nothing covers, and what the mock API in
  `.claude/skills/verify/` can already do.

### I. Verdict per module
One table: module, lines, layer, status, quality (good / acceptable / poor), recommendation (keep / refactor /
rewrite / delete), one sentence why. Then: where the clean seams are — the parts that could be lifted out as they are
(candidates: `api/`, `catalog/`, `sim/`, `plan/bis.ts`), and the parts everything else is tangled around.

### J. Options, not a decision
Three ways forward, each with what it costs, what it risks, and what it does to the running fleet meanwhile:
- A. Clean up in place.
- B. A new core next to the old code; features move over one at a time while the service keeps playing.
- C. A rewrite from scratch.
Say which one the evidence supports, and what would have to be true for each of the other two to be the better
choice. For the one you recommend, name the first three steps, each small enough for one task.

## `docs/audit/domain-rules.md`
The knowledge about the game that exists only in this code, written so that it doesn't depend on the current
structure:
- formulas (fight XP, craft XP, recycling returns, rest and cooldown times, base HP, …);
- API facts: error codes and the right reaction to each, what each action echoes, rate budgets, which endpoints are
  reads;
- game rules learned in play (distinct artifacts, the utility stack cap, offering brackets, gated tiles, event spawn
  odds and durations, …);
- every tunable with its value and meaning (`SCORE.*`, `SELL_FLOORS`, `WISHLIST`, `GOLD_FLOOR`, `RARE_ACTIONS`,
  `BREW_BATCH`, `SPLIT_ACTIONS`, `FILLER_MIN_WAIT`, …);
- the readings taken for ambiguous combat effects (`sim/effects.ts`).
For each entry: the source in the code, and whether it comes from the game's docs, was observed in play (with the
date if the code or `CLAUDE.md` gives one), or is a guess.

## Out of scope
Any change to code, configuration, `CLAUDE.md` or memory notes; any fix, however small; running the service or
anything that talks to the game; UI and visual review (`ui/` is audited only for the rules in E and for logic that
leaked into components); performance tuning; the design of a replacement.

## Acceptance (Alex checks)
1. `git show --stat HEAD`: the commit holds only `tasks/001-code-audit.md`, its report and `docs/audit/**`. The
   report quotes `git status` from before the first step and after the last: nothing else changed in between.
2. The service was not touched: `logs/dev.log` shows no service start caused by this task.
3. `docs/audit/code-audit.md` opens with a summary of at most 20 lines (the overall condition, the three worst
   problems, the recommended option), and answers A–J, each either with evidence or marked "not determinable" with
   the reason.
4. Three `path:line` references picked at random point at code that says what the audit claims.
5. The matrix in B has no empty cell.

## Report
`tasks/001-code-audit.report.md`, with these sections in this order:
- **Summary** — 3–6 lines.
- **Decisions for Alex** — numbered. Each: the question in one line, the options (A / B), your recommendation, and
  the default if Alex doesn't answer. Only real decisions; "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What was done / files** — the documents written, what you read in full and what you only sampled, every command
  you ran.
- **Notes** — anything else worth knowing, including what you did not look at.
- **To delete (Alex)** — files that look like leftovers, or "Nothing".
