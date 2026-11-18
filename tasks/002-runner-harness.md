# 002 — Offline harness for the queue runner

## Goal
The audit (`docs/audit/code-audit.md`, H.3) found that nothing tests the runner: the check scripts cover pure
planning, and both defects confirmed in the log live in the step-by-step interplay of an item handler, the executor
and the gear differ. Every later task needs a way to run a queue to the end offline and assert on what happened.

Build that: a **fake game** behind `fetch`, a **virtual clock**, a small **scenario** format, and one command that
runs everything. Then write the first scenarios: three that pass today, and two that reproduce the confirmed defects
and are recorded as known-failing.

**No behaviour changes.** The defects are reproduced, not fixed; fixing them is task 003.

Read first: `CLAUDE.md`; `docs/audit/code-audit.md` sections B.1, B.4, H.3 and `docs/audit/domain-rules.md`;
`src/api/client.ts`, `src/api/actions.ts`, `src/state/apply.ts`, `src/state/sync.ts`, `src/state/loopkit.ts`,
`src/state/exec.ts`, `src/state/queue.ts`, `src/types/api.ts`; `scripts/check-events.mts` and `check-assist.mts` (how
the engine is driven without the service today); `.claude/skills/verify/mock-api.mjs`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to the system temp dir (`D:\Temp`) or your
  session scratch directory; use them freely. Nothing else outside the project is touched.
- **The real service is running** (port 5173, `.ammo/storage.db`, `logs/dev.log`) and stays undisturbed:
  - don't start a service, not even on a spare port; don't call the local service;
  - don't run `npm start`, `npm run dev`, `npm run build`, `npm run atlas`, `npm run assets` or the fetch scripts;
  - nothing this task writes may open `.ammo/*` or append to `logs/dev.log`.
- **No request to the game, with one exception:** a single unauthenticated GET of the public OpenAPI document (linked
  from `https://docs.artifactsmmo.com`), to get the exact response shapes. Save it as `docs/api/openapi.json`. Never
  send the token anywhere; don't read `.env`.
- **`src/` should not change.** If the harness cannot work without a seam in `src/` (an export, an injectable
  function), keep it minimal and free of behaviour change, and list every such line in the report. Never touch the
  logic of the runner, the handlers, `exec.ts` or the differ in this task.
- **Dependencies:** none new. Node built-ins and what `package.json` already has.
- Files inside the project may be deleted when that is part of the work (git keeps tracked ones). This task has
  little reason to.
- One task only. Anything extra, unclear or tempting goes to "Decisions for Alex". Don't write the next task.
- Everything you write is in **English**.
- Gate: `npm run typecheck` and the new `npm run check`. Not `npm run build`.
- Commit at the end, `002: runner harness`: this task file, the report and what the task changed. No push.

## Before you start: commit what is already there
The working tree holds finished work from before the audit that was never committed: the offerings lower-bracket
fallback (`CLAUDE.md`, `scripts/check-offering.mts`, `src/state/queue.ts`, `src/ui/OfferingsPanel.tsx`) and the
untracked `docs/tasks/roadmap-tab.md`. The running service already runs this code.
1. Run `git status` and read the diff. Run `npm run typecheck` and the offering check script (scratch storage in the
   temp dir, as its header says).
2. If both pass, commit these files as their own commit, before any work of this task, with a message that says what
   the change is (for example `Offerings: fall back to a lower bracket`). `docs/tasks/roadmap-tab.md` goes into the
   same commit.
3. If something fails, or the tree holds changes other than these, don't commit them: leave them unstaged, say what
   you found under "Decisions for Alex", and carry on with the task.

From here on the tree should be clean apart from this task's own files.

Also delete the audit's leftover scratch folders in the temp dir, if they still exist:
`D:\Temp\claude\71701bc605da51df\8fff10e1-8cee-412d-9e55-dce635c32c27\scratchpad\audit\` and `...\scratchpad\logwork\`.

## What to build

### 1. The fake game — `scripts/harness/`
A `fetch` replacement for the game's host that holds a **world** (characters, bank items, bank gold, active events;
the map, items, monsters, resources and NPCs come from `public/data`) and executes actions against it.

- **Reads** the boot sync needs: characters, bank, bank items, active events, pending items, account. Other reads
  the engine may make in a scenario (offerings, achievements): answer with an empty, well-formed result.
- **Actions**, at least: move, gathering, crafting, bank deposit and withdraw (items and gold), equip, unequip, NPC
  buy, NPC sell, fight, rest. Each one validates like the game (right tile, skill level, materials, gold, inventory
  space, cooldown), changes the world, and answers with the response shape the game uses, cooldown included — the
  shape `applyActionResult` folds. Take shapes from the OpenAPI document and error codes and formulas from
  `domain-rules.md`.
- **Fights:** by default the outcome comes from the engine's own `simulate` with a fixed random source (say in the
  code that this is circular: it tests the runner, not the simulator); a scenario can force a result (win or loss,
  HP lost, drops). Gathering and drops are deterministic: a scenario sets what each gather or kill yields, with a
  sensible default from the catalog.
- **Anything not implemented fails the scenario at once** with a clear message ("fake game: action X is not
  implemented"). Never answer an unknown call with a code the runner would retry.
- **Fault injection:** a scenario can say "the next N calls matching (character, action) answer with code C", or
  fail at transport level. Needed for 499, 461, 404/478, 486, 497, a 500 and a network error.
- **No real network.** Any request to another host, and any request once the scenario has ended, throws.
- Every rule the fake implements is listed in the report with its source: the OpenAPI document, `domain-rules.md`
  (entry), or a guess. Guesses are marked as such in the code too.

### 2. The virtual clock
Cooldowns, the runner's fixed waits and the 60-second outage holds must cost no real time: an hour of game time
runs in a few seconds, and the same scenario always produces the same trace. `Date.now()`, `setTimeout` and
`setInterval` follow the virtual clock; the fake game stamps cooldowns with it. Start every scenario at the same
fixed instant, away from 00:05 UTC. How you implement it (your own scheduler, `node:test` mock timers) is your
choice; say which and why.

### 3. Isolation
- One Node process per scenario: the engine keeps module-level state with no reset (audit A.6).
- A fresh scratch storage file in the temp dir for each process. Scenarios are started only by the runner, which
  generates that path itself; a scenario file started any other way refuses to run. At start the harness checks that
  the storage holds no token and no queues, and aborts otherwise.
- The catalog is read from `public/data` by a path relative to the script file, not the working directory. A missing
  file is an error, never a fall back to the live API.
- The dev log goes to memory, not to `logs/dev.log`: install your own sink, keep the lines for assertions, and print
  the last ones when a scenario fails.
- Start the engine through `boot()` if that works without changing `src/` (the world then lives in one place, and
  sync and apply are exercised too). If it doesn't, seed the signals the way the check scripts do and say why.

### 4. Scenarios — `scripts/scenarios/*.mts`
A scenario is plain data plus a few calls, readable in about 30 lines: the world, the queues, what to run, what to
expect. It must be able to
- hold several characters and one shared bank, with several queues running at once;
- run until a queue is idle, paused or stopped, or until a condition holds;
- assert on the **world** (the fake's truth: inventories, bank, gold, position, levels), on the **action trace**
  (which calls, in which order, how many), and on the **queue** (items left, paused, error, note);
- set limits: a maximum number of actions and of virtual time. Exceeding either fails the scenario — a livelock must
  end as a failure with a trace, never as a hang.

Two things every scenario gets without asking:
- **Mirror check** at the end: the engine's local characters and bank equal the fake's world. A difference is
  reported with the field that differs.
- **Known-failing marker:** a scenario may carry `known: "<audit reference>"`. A known scenario that fails is
  reported as "known defect reproduced" and does not fail the run; one that **passes** fails the run ("fixed? remove
  the marker"), so task 003 has to flip it.

### 5. The first scenarios
Passing today (if one of them fails, that is a finding: keep it, mark it known, explain it in the report):
- **gather-and-bank** — one character gathers ×N with a bag that fills on the way: it banks and comes back, the item
  finishes, the bank holds the yield.
- **craft-from-bank** — a craft ×N whose materials are in the bank: withdraw, walk to the workshop, craft, done.
- **fight-and-rest** — fight ×N against a monster the worn set beats, resting between fights; then the same with one
  forced loss.

Reproducing confirmed defects (known-failing):
- **buy-with-bank-gold** (`known: "B.4-1"`) — pocket gold 0, enough gold in the bank, a `buy` item for an NPC that
  sells for gold. Expect: the item is in the bag or bank and the gold is spent. Today: the gold is withdrawn, no
  `npc/buy` call is made, the item reports done.
- **helper-ping-pong** (`known: "B.4-7"`) — a crafter training a workshop skill and a helper with a "help X train"
  item, the bank holding less of the raw material than one helper trip needs (audit B.4-7; the log shows the real
  case at lines 776663–776672 of `logs/dev.log`). Expect: no withdraw of a code is followed by a deposit of the same
  quantity of it more than once. Today: withdraw and deposit repeat until the action limit.

If they turn out cheap once the above works, add either of these as known-failing too; if not, leave them and say
so: **486-after-500** (B.4-8: a 500 on an action, then a 486 on the retry — the queue pauses), **repeat-spin**
(B.3 X-11: 🔁 on and one already-satisfied item — count the laps in one virtual minute).

### 6. One command
`npm run check` runs the eleven existing `scripts/check-*.mts` and every scenario, each with its own fresh scratch
storage, prints one line per check plus a summary, and exits non-zero if anything fails. `npm run check -- <name>`
runs one. A full run should stay well under two minutes.

Type-checking: the new harness and scenario files must be covered by `npm run typecheck`. Whether the old scripts
are included as well depends on what that turns up: if they pass, include them; if not, leave them out, count the
errors and put it under "Decisions for Alex". Don't fix old scripts in this task.

## Out of scope
Fixing any defect; changing runner, handler, executor or differ logic; the hive, event orders and offerings as
scenario subjects; restart and resume scenarios (a second process on the same storage); task, recycle, use and
offering actions in the fake; the HTTP service, `/rpc` and the UI; a test framework dependency.

## Acceptance (Alex checks)
1. `npm run check` → the eleven old checks pass, the three passing scenarios pass, the known ones print "known
   defect reproduced" with their audit reference, exit code 0, under two minutes.
2. `npm run check -- buy-with-bank-gold` prints the trace: a gold withdrawal, no `npc/buy`, the item done.
3. The harness can fail: the report shows a run where a known marker was removed from one scenario (exit code
   non-zero) and where a passing scenario's expectation was broken on purpose. Both changes reverted afterwards.
4. `git log --oneline -3`: the offerings commit, then `002: runner harness`. `git show --stat HEAD`: nothing under
   `src/` unless the report lists the lines and why; no file under `.ammo/` or `logs/`. `git status` is clean.
5. `logs/dev.log` holds no line from the run (no new process tag besides the live service's).
6. `npm run typecheck` passes.
7. The same scenario run twice gives an identical action trace.

## Report
`tasks/002-runner-harness.report.md`, with these sections in this order:
- **Summary** — 3–6 lines.
- **Decisions for Alex** — numbered. Each: the question in one line, the options (A / B), your recommendation, and
  the default if Alex doesn't answer. Only real decisions; "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What was done / files** — the files, the design of the clock and the fake in a few lines, every `src/` line
  changed, every command run, the one network request.
- **Fidelity** — the table of the fake's rules and their sources; what the fake does not model.
- **Notes** — anything else, including what surprised you while writing the scenarios.
- **To delete (Alex)** — or "Nothing".
