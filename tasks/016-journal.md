# 016 — The journal: what the planner decided and what each step did, in files the planning chat can read

## Goal
Everything the fleet does is in one file, `logs/dev.log`: 65 MB after eight days, about 0.9 MB an hour, one line
an API call. The planning chat cannot copy it and reads only its tail; every task since 010 has spent its first
section on scratch readers that rebuild from those lines what the engine knew when it wrote them: which step ran,
how many units it did, where its seconds went, what it drank. An `api` line's body is cut at 160 characters
(`src/api/client.ts:15-19`), so what a reset withdrew cannot be read at all (report 015).

This task makes the engine write that down itself (decision 37 of `docs/rework.md`; Alex's idea of 2026-11-20:
logs split into pieces, with detail for analysis, that the chat can read too):
- **a journal** — one JSON record a line, a file a day: every decision, every step's result, every interrupt,
  block, event verdict, bank line, restart;
- **the raw log in hourly files** — the lines of today's `logs/dev.log`, unchanged, a file an hour;
- **a status file** rewritten every minute — what each character is on now;
- **a daily snapshot of the World** — the start of any later replay, and what a forecast is held against;
- **a reader** (`npm run journal`) that prints from the journal the tables every task's "read the log" section
  has printed so far.

Riding along (decision 42): a craft step that comes up one ingredient short, the bank's slot count after a 462,
and one question about the tidy's verdicts.

The service was restarted at **08:49:13.136 UTC on 2026-11-21** (run `[lxra]`, report 015's code `e66621e`); the
five steps re-attached (`lvl:mining:35` for First, Fourth and Fifth, `ach:intermediate_lumberjack:0` for Second,
`src:nettle_leaf` for Third). `[tdhi]` (014's code) wrote its last line at 08:48:52.584. The boot's bank line
(08:49:17.778): "106 of 110 slots used (4 free) … outdated:" and 24 codes. No decision of 015's code was seen by
the chat (the log's tail ended at 08:51:42): section 1 reads the first hours.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 37, 40–43; "Known and parked", the blocks of reports
013–015); report 015 (Summary, "The hours, and 014 in play", Notes); `src/lib/devlog.ts`, `src/server/main.ts`,
`src/api/client.ts`, `src/api/actions.ts` (`act`), `src/state/apply.ts`, `src/state/planner.ts` (all of it),
`src/state/eventorders.ts`, `src/state/queue.ts` (`runLoop`, the `offering`, `claim`, `expand` and `fight` cases),
`src/state/loopkit.ts` (`deposit`), `src/state/exec.ts` (`fightRound`, `healOnce`), `src/state/store.ts`,
`src/state/sync.ts` (the boot order), `src/sim/validate.ts`; `src/plan/planner/types.ts`, `decide.ts`
(`planMake`), `bank.ts`, `cost.ts`; the game's docs on an action's `cooldown` (`docs/api/openapi.json`: its
`reason` and `total_seconds`); `scripts/check.mts`, `scripts/check-planner.mts`, `scripts/harness/*`, the
scenarios `planner-*` and `bank-*`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`. **Nothing you
  run writes under `logs/`**: the checks and the scenarios read the journal through a sink in memory, and the
  new reader is tried on a fixture, not on a file it made there. **Reading `logs/dev.log` is part of the task**
  (section 1): read it as a stream, don't copy it into the project.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Alex restarts only when the
  report exists. Write the report last, after the gate is green and the task commit is made; don't wait for more
  log after that. If the log shows a restart during your work, say in the Summary what code it loaded.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new. `package.json` gets one script line (`journal`) and nothing else.
- **What may change:** `src/lib/devlog.ts`; a new `src/lib/journal.ts`; `src/server/main.ts` (the sinks, the
  commit read at boot); `src/api/client.ts` (the cut, settled point 9); `src/api/actions.ts` or
  `src/state/apply.ts` (the meter, settled point 4); `src/state/planner.ts`, `src/state/eventorders.ts`, and
  `src/state/queue.ts` and `src/state/exec.ts` only to hand the journal what it records (no change to what an
  item does); `src/state/loopkit.ts` and `src/state/store.ts` for the read after a 462 (settled point 11);
  `src/plan/planner/decide.ts` (`planMake`, settled point 10); `src/plan/planner/bank.ts` only under settled
  point 12; a new `scripts/journal.mts`; `scripts/check.mts`, `scripts/check-planner.mts`, `scripts/harness/*`,
  new scenarios and fixtures; `CLAUDE.md`, a new `docs/journal.md`, `docs/game-actions.md` if it names the log.
  **Not** `src/sim/*`, not the UI, not the hive, nothing else of `src/plan/planner/*`.
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`; it does
  not write the journal either. The journal is the runtime's.
- **A write that fails never breaks the runner**: every write is caught, as `devlog`'s is.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about the log give the UTC time of a line.
- Nothing is sold and nothing is bought in this task.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-016-dist --emptyOutDir` (never the project's `dist/`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again
  by the end, commit it again the same way before the task commit. At the end, `016: journal`: this task file,
  the report and what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't retry in
  a loop: say so under "How Alex verifies".

## What is settled
1. **Four kinds of files, all under `logs/` (ignored by git), all in UTC:**
   - `logs/raw/<YYYY-MM-DD>/<HH>.log` — the raw log: the very lines `devlog` writes today, the file chosen by
     the line's own time. **The service writes no more lines to `logs/dev.log`**; that file stays where it is,
     as the archive of 11-13 to the restart.
   - `logs/journal/<YYYY-MM-DD>.jsonl` — the journal.
   - `logs/status.json` — the status.
   - `logs/world/<YYYY-MM-DD>.json` — the day's snapshot.
   Why hourly after all (decision 37 said a file a day): the planning chat can copy a file of a megabyte to its
   own machine and search it there (found on 11-21, when it read the service's state); a day of raw log is
   about 21 MB and may not copy. Nothing is deleted or rotated away in this task.
2. **The journal is one JSON object a line**, each with the time (ISO, UTC), the run id (`devlog`'s tag) and a
   kind. It is written by the runtime at the moment the thing happens, from what the engine knows then; it is
   never derived from the raw log. The records:
   - `boot` — the run id, dev or prod, the commit the checkout stood on (read from `.git/HEAD` and its ref by
     `src/server/main.ts`; no child process), and per character what re-attached or was taken over.
   - `step` — a decision: who, the step's key, target and answer, the work (kind and code), units and hours
     planned, the score, the why, `parent` / `for`, what it takes from the bank (`withdraw`) and the set it
     wears (`wear`).
   - `end` — a step is over: who, the key, units done of units planned, the wall seconds and the running
     seconds against the planned seconds, how it ended (done · blocked, with the reason · ended empty · the bank
     had no slot · dropped by a take-over or a hand-back), and the meter of settled point 4 for the step.
   - `sample` and `slow` — what `addSample` writes today (`src/state/planner.ts:251-261`).
   - `block`, `flap`, `nostep`, `defect`, `stopped` — the lines of `blockStep`, the brake, "no step", "defect:"
     and "queue found stopped" (`planner.ts:151-182`, `:282-295`, `:404`), with their fields apart (target, who,
     until, why, the strikes).
   - `int` and `int-end` — an interrupt issued (class, who, the items) and over (done, or removed with the
     reason; its seconds and its meter). An offering interrupt's end says which of the day's offerings were
     completed and which were not, with the item's own reason.
   - `event` — every verdict the planner reaches on a spawn (`eventorders.ts`: "nobody needs it", "does not
     fit", the members sent), with the event's code, its tile and when it ends: one record a spawn, more only
     when the verdict changes.
   - `bank` — every `plan: bank` line (`planner.ts:419-468`) with its numbers apart: the boot line, a refused
     code, an expansion bought or not bought, stuck.
   - `ach` — an achievement completed (code, points, the account's points after), and a claim.
   - `level` — a character passed a level (who, the skill, the new level).
   - `pause` — a queue paused on an error (who, the item, the error and its code), and
     `server` — an unhandled rejection or exception (`src/server/main.ts:33-38`).
   - `config` — `setPlannerConfig`'s patch, a character switched on or handed back.
   A day at today's pace should be a few hundred records; say in the report what one made-up day weighs, and
   keep a record's keys short enough that a day stays under about 300 kB.
3. **`docs/journal.md` is the schema**: every kind, every field, one real-looking example line each. The reader
   and the planning chat work from it.
4. **One meter, in the one place every action's echo passes** (`act`, `src/api/actions.ts:13-23`, or
   `applyActionResult`): per character, between two cuts,
   - the seconds by the cooldown's reason as the game gives them (`cooldown.total_seconds` and `reason`; check
     the docs for the list), grouped as fight · rest · eat (`use`) · bank (item and gold moves, an expansion) ·
     walk (movement, transition) · gear (equip, unequip) · gather · craft (crafting, recycling) · trade (an
     NPC's buy and sell) · task · other, and `wait`: the wall seconds less their sum (retries, an outage hold);
   - actions by kind; fights won and lost;
   - XP by skill, items gained from fights and gathers, items used, potions drunk (the worn utility quantities
     before and after a fight), what was deposited and what was withdrawn by code, gold in and out.
   The planner cuts it at every boundary: a step's `end` carries what its own items did and **not** what an
   interrupt inside it did; the interrupt's `int-end` carries that. The meter lives in memory: a step that
   re-attached after a restart says so in its `end` (`partial`), with what was metered since the boot. It
   counts for every character; only the planner's reads it.
5. **The status file** is rewritten whole every minute by the planner's heartbeat and at every `step` and `end`,
   through a temporary file and a rename: the time, the run id and its commit, since when the run is up; the
   account's points; the bank (codes, slots, free, gold, the next price); per character the level, the place,
   the step (key, answer, why, since when, units done of planned), the queue's head and note, whether it runs,
   its error; what is blocked and until when; the live events; the last `pause` or `server` record. A status
   older than two minutes means the service is down: say so in `docs/journal.md`.
6. **The day's snapshot** is written once a day, at the first heartbeat after 00:00 UTC, and at boot when the
   day has none: everything `worldOf` reads (the characters, the bank's items and details, the achievements
   with their progress, the live events, the offerings' favors) and the planner's own state (`current`, `costs`,
   `blocked`, `strikes`, the config patch). Never the token. A made-up case in `scripts/check-planner.mts`
   proves it is whole: a World built from a snapshot fixture alone gives every character a decision.
7. **The plain lines stay.** Every `plan …` line of today is still written to the raw log, so the old readers
   and Alex's eyes lose nothing; the journal is beside it, not instead of it.
8. **The reader** — `npm run journal -- [--from <ISO>] [--to <ISO>]` (`scripts/journal.mts`), read-only over
   `logs/journal/*.jsonl`, the last 24 hours by default. It prints what section 1 of reports 010–015 printed:
   the restarts; per character the steps in order (time, key, answer, units planned and done, hours planned and
   taken, a supply step's parent); every `block`, `flap`, `nostep`, `defect`, `stopped`, `pause` and removed
   interrupt; lost fights by step; the samples against their estimates; where the time goes per character (the
   meter's groups, in percent); what each kill step planned to drink and eat against what it did; the events
   and the spawn ratio (seen against the docs' rate, beside `SPAWN_LOG`); the achievements; the bank's lines.
   From this task on, a task's "read the log" section is this reader's output and what it does not explain.
9. **An `api` line's body is cut at 600 characters, not 160** (`src/api/client.ts:15-19`).
10. **A craft step is planned in whole runs.** `planMake` (`src/plan/planner/decide.ts:63-92`) sources and
    withdraws `units × per` of an ingredient; a recipe that makes two a run needs the ingredients of
    `ceil(units ÷ 2)` runs. 121 minor health potions took 121 nettle where 61 runs need 122: the craft paused
    and `ach:alchemist:1@Third` was blocked for 6 hours (13:53:13 UTC on 11-20); the same happened to
    `ach:alchemist:2@Third` under 014's code ("no Nettle Leaf (need 2) for Health Splash Potion", blocked until
    08:33 UTC on 11-21). The step's sources and its `withdraw` are those of whole runs; a made-up case shows
    121 of a two-a-run recipe sourcing 122.
11. **After a 462 the bank is read, not guessed.** `deposit()` (`src/state/loopkit.ts:166-182`) answers a 462
    by setting the local `slots` to the number of codes the engine knows, and nothing reads the bank again
    until an expansion or a restart: the slot count can stay under the real one and the bank's lines print it.
    Now: the local correction stays as the answer of the moment, and one read of the bank's details and items
    follows (at most one in ten minutes), so the slots and the codes are the game's again.
12. **"Something is left to tidy" means somebody has a tidy step.** `bankCheck` buys no expansion while
    `tidyVerdicts(world)` (called with no name) holds an outdated code (`src/state/planner.ts:454-455`);
    `tidyStep` asks `tidyVerdicts(world, name)` and takes only codes its character may recycle whole
    (`src/plan/planner/bank.ts:180-208`). Section 1 says whether the two can disagree. If they can (other than
    by a 6-hour block of a `tidy:` target), `bankCheck` asks what `tidyStep` asks, for the characters that are
    on, and a made-up case shows it; if they cannot, say why and change nothing.
13. **Not in this task:** deleting or compressing old log files; any UI for the journal or the status; an alert
    when the service stops; the forward model started from a snapshot, the outlook, the Lab (decision 36); what
    a tidy's why says about the codes that come back; the replay's moves of report 015 (row B, First's road);
    keys, tolls and what is spent (017); everything parked in `docs/rework.md`.

## 1. Read-only: the hours since 00:57:55 UTC on 11-21, and report 015 in play
From `2026-11-21T00:57:55Z` (where report 015 stopped) to the end of `logs/dev.log`; name every restart inside
(`[lxra]` at 08:49:13.136 UTC is report 015's code). The same reader and caps as report 015, for the last time;
**nothing found here is fixed in this task** except what the settled points name.
- Per character, the steps in order (time, key, answer, units planned and done, hours planned and taken; a
  `supply` step's parent), every sample against its estimate, achievements completed with the time.
- Every `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`, every lost fight:
  a defect, or as designed. Among them `ach:alchemist:2@Third` (settled point 10) and the offerings of 00:05 UTC.
- **014's code to 08:48:52 UTC**: kill steps with what they planned to drink and eat and what the resets
  withdrew, as far as the cut lines show; any "ran dry"; any "inventory full of protected working stock".
- **Report 015's acceptance step 7, from 08:49:13 UTC**:
  - the boot's bank line, and why it names **Wooden Shield ×5 and Iron Armor ×8** as outdated when report 015's
    table kept both for a solve (the_reaper, for First and for Second): what changed — the solve, the
    objective, the bank, or the call without a name (settled point 12);
  - every tidy step: who, the codes, the slots before and after, the seconds, what came back and where it went;
    whether a tidy step started with a full bag and what the `recycle` item did then
    (`src/state/queue.ts:361-368`); the free slots over time until 15;
  - any `bank/buy_expansion`, any 462 and what followed, any `plan: bank` line;
  - any `npc/sell`; a kill step's food against a third of its bag.
- **Sap**: the bank held 575 at 23:32:55 UTC on 11-20 and 303 at 08:36 on 11-21. The lines that took it (a
  merchant's `npc/sell`, or a craft), with their times.
- **The full moon vampire cape** in the bank since that night: where it came from.
- Every 462 since 00:57:55. Every `plan: event` line and the spawn ratio now, beside 1.64.
- Where the time goes, per character, as report 015 had it.
- In at most six lines: what the log says that the journal's records must not miss.

## 2. The journal, the meter and the files
- **The writers**: `src/lib/journal.ts` and what `src/lib/devlog.ts` became; the sinks `src/server/main.ts`
  installs (which file a line goes to, what happens at an hour's and a day's turn, what a failed write does);
  that the tab, the checks and the harness write no file.
- **Each record kind**: where it is emitted (`path:line`) and from what; the schema is `docs/journal.md`.
- **The meter**: where it sits, what it reads of an echo for each action kind (say which echo carries a
  potion's use and which a drop), the cuts, what a restart loses. Check it against the log: for two real steps
  of section 1 (a gather step and a fight step), the seconds by group as the reader of section 1 measured them
  from the lines against what the meter's rule would have counted from the same echoes; say where they differ.
- **The status and the snapshot**: what holds each, when they are written, their size.
- **What a day weighs**: the journal's records and bytes for a day at section 1's pace; the raw log's files.
- Made-up cases in `scripts/check-planner.mts`: the snapshot is whole (settled point 6); whole runs (settled
  point 10); settled point 12's, if it applies.
- **Scenarios** (each reads the journal from the harness's sink):
  - `journal-step` — a gather step and a kill step from the decision to the end: `step` and `end` with the
    units, the seconds by group summing to the wall seconds within a second, what was withdrawn, drunk, eaten
    and banked;
  - `journal-interrupt` — an interrupt inside a step: `int` and `int-end` with their own meter, and the step's
    `end` without those seconds;
  - `journal-block` — a step that ends empty and one that pauses: `end` with how it ended, `block`, `pause`;
  - `journal-restart` — a boot with a step re-attached: `boot`, then that step's `end` marked partial;
  - `journal-files` — the virtual clock over an hour's and a day's turn: the raw lines and the records land in
    the right files, the snapshot is written once, the status is rewritten and is whole after each write;
  - `bank-462-read` — a 462 with a stale slot count: the held codes go in, then the bank is read once and the
    slots are the fake's again; a second 462 inside ten minutes reads nothing.
  Say what the fake and the harness had to learn (an echo's `cooldown.reason`, the sinks, a bank read).

## 3. The reader
`scripts/journal.mts` on a fixture (`scripts/fixtures/journal-*.jsonl`, made by a scenario's run or by hand):
its output in the report, table by table as settled point 8 lists them; what it cannot say that section 1's
scratch readers could, and what it says that they could not.

## Out of scope
Everything of settled point 13; any sale or purchase; `src/sim/*`; every UI; the hive; regenerating the atlas;
moving, deleting or rewriting `logs/dev.log`; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `016: journal` on top of `Rework notes`;
   `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why the push
   failed); `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → the 74 checks of report 015 plus the new scenarios, all ok except `repeat-spin`; exit 0;
   nothing new under `logs/` from it.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points 86 / 90 / 78
   / 68)` for the rows A / B / C / E, inside the 2,700 s backstop. Settled point 10 may move a row: if one
   moves, the report says which change did it.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. **After the restart** (the planning chat says when): `logs/journal/<today>.jsonl` starts with a `boot`
   record naming the commit; `logs/status.json` is under a minute old and names all five steps;
   `logs/raw/<today>/<hour>.log` grows and `logs/dev.log` does not; `logs/world/<today>.json` exists;
   `npm run journal` prints the tables for the hours since the boot.

## Report
`tasks/016-journal.report.md`, with these sections in this order:
- **Summary** — 4–8 lines: where the fleet's time went since 00:57 UTC on 11-21 and whether report 015 holds in
  play (the tidy, the slots now); what is written from the restart on and what a day weighs; the deadline
  numbers against 86 / 90 / 78 / 68; then the answers to settled points 10–12.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The hours, and 015 in play** — section 1.
- **The journal, the meter and the files** — section 2.
- **The reader** — section 3.
- **What was done / files** — per section and per settled point 9–12: what, where (`path:line`); every command
  run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
