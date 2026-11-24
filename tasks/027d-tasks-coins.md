# 027d — Tasks and coins: a fighter holds a task, coins are earned when a need lacks them; a tool ranked by its payback

Read first: `src/plan/planner/pick.ts` (`pickMonster` and its `bonus`), `src/plan/planner/supply.ts` (the coins' wall,
"tasks coins: X of Y"), `src/plan/planner/cost.ts` (`codeSec`'s tasks coin), `src/plan/queue.ts` (`task-loop`),
`src/plan/planner/gear.ts` (work (c)), `tasks/027c-tools.report.md`.

## Where this starts
On top of `027c: tools` (`9375a24`); the live service runs it (run `3bd9`, since 16:41:53 UTC on 11-24). The working
tree holds two changes from the planning chat and nothing else: `docs/rework.md` (edited) and this file. If anything
else is uncommitted, say so and stop.

**What is.** A task is worked only as the filler `tasks_coins_fan`: a `task` step, one `task-loop` at the monsters
master, priced `TASK_SEC`, cancelled only at a dead end. Coins are spent on a needed piece down to `COIN_FLOOR`; where
the bank is short the bill ends "tasks coins: X of Y" and the need waits — nothing earns them. A monsters task is
50–400 kills of one monster for 3–5 coins (`public/data/tasks.json`); a cancel costs one coin, so a redraw is never
free and a task is not chased for its own sake.

Alex (2026-11-24): coins are no limit — they are earned by doing tasks. Small and direct: no new constant is expected
(if one is needed, one, named in the report).

## A. Tasks
1. **A fighter holds a monsters task.** A fighter's kill step (objective, level or supply) starts at the monsters
   master when the fighter holds no task or a finished one: complete, accept. One new queue item for that visit, its
   walk in the step's hours. Kills count for the held task whatever the fight is for (the game's rule). An items
   task a fighter holds today is cancelled at its first visit (one coin). A worker holds none by this rule.
2. **Of near-equal fights, the task's.** The held task's monster joins `bonus` in that fighter's `pickMonster` (the
   ×1.25 an open objective's monster has). Nothing else changes in the pick.
3. **Coins on purpose.** Where a need's bill is short of coins, the coins are a supply leaf (`src:tasks_coin`) for a
   fighter: kills of its held task's monster, a chunk at a time; the step that finishes the task turns it in and
   banks the coins before it ends. Scored as its parent, as any supply leaf (the others' running steps counted); the
   step's hours are its kills × this fighter's expected seconds a win; the chain's price stays `codeSec`'s. With no
   fighter able to work a task, the wall and its text stay.
4. **Cancel.** Only where a task is worked on purpose (rule 3, and the filler), at the master, before the work: the
   fighter is not admitted to its monster, or the hours left exceed a fresh draw's mean hours plus one coin's hours
   (`codeSec("tasks_coin")`). A fresh draw: the monsters tasks open to the character's level (the game's rule — find
   it in `docs/api`, say which), each at its mean quantity and this fighter's seconds a win; a draw it is not
   admitted to costs one more coin's hours. The fee comes from the bank, as the dead-end cancel fetches it today;
   with no coin in the bank, no cancel. A held task nobody works is never cancelled.
5. **The forward model** plays 1–4, without dice: each fighter's held task (the live one at the start), its kills
   counted in every kill step, the visit's seconds, the coins banked and `task:` counted at completion (so
   `tasks_coins_fan` moves); a draw is the pool in a fixed rotation at mean quantity — say how.
6. The why of a step names the task where it decides something ("task: 37 of 212 Spider"; "coins: 12 short for …").
7. `CLAUDE.md`: the tasks' rule in a short paragraph.

## B. Riding along (Alex agreed): a tool ranked by its payback
027c's tool need scores as its lane's bundle over `G + H1` (H1 ≈ 600 h), so the Steel Fishing Rod's Ogre Skins rank
12th of 12 (1.4e-3 against 8.3e-2) though the rod saves 93.5 h for 0.6 h. In work (c) only, the score becomes the
bundle's points × the share of the lane's hours the tool saves ÷ the hours to make it:
`points × (H0 − H1) ÷ H0 ÷ G`, fit when `G` fits the calendar. The need's rule (`G ≤ H0 − H1`), the candidate and the
one copy a lane stay as 027c left them.

## C. Proof
1. Checks, red first on the starting tree:
   - hold: a fighter with no task → its kill step starts with the visit; a finished task → completed, a new one
     held; a worker → no visit; an items task on a fighter → cancelled at the visit;
   - tie: the task's monster within 25% of the pick's rate → chosen; further → not;
   - coins: a needed piece short of coins → a fighter's `src:tasks_coin` step, the coins in the bank when the task
     completes, the piece bought and made after it; no fighter able → the wall's text;
   - cancel: not admitted → cancelled, the fee from the bank; a long draw → cancelled; a short one → kept; no coin
     → no cancel; a held task nobody works → never cancelled;
   - the rod: fishing 20, an iron rod, one Ogre Skin short → the skin's hunt is the worker's first-tier pick over
     a fighter's need of 027c's road (both scores printed).
2. One road from `logs/world/2026-11-24.json` (025's `drive.mts`, roles on), beside 027c's roles-on row: points and
   the five combat levels at days 7, 14, 28 and the deadline; the day each tool is made (the rod, the gold tools);
   tasks completed a fighter, as a by-product and on purpose; cancels; coins earned, spent and on what; the hours
   of `src:tasks_coin` steps; the gather fallback hours. No tuning after the table.
3. Read-only, two lines: what task each of the five characters holds in that World (type, monster or item, done of
   total).
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, `npm run check -- planner` once.
5. Commit `docs/rework.md` as `Rework notes` (the planning chat's edits, as it stands), then everything else as
   `027d: tasks and coins`; push to `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game.
- No new dependencies. Do not edit `docs/rework.md` (it is committed as it stands).
- The fallback's two defects of report 027c (the NaN score, the sliver rule) and the gold for fares are task 027e:
  not touched here.
- The machine is strong: run the road and the gate side by side.
- Everything you write is in English.

## Report
`tasks/027d-tasks-coins.report.md`, **at most about 120 lines**: Summary · Decisions for Alex · How Alex verifies ·
The road (the one table) · What was done / files · Notes. If the fighters stand more than two combat levels lower
than 027c's row on day 14, say so first in the Summary. No placeholders left in it.
