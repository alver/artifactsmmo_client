# 027f — Fourth's loop: a train item that deposits and withdraws its gear for ever; a stall that survives a restart

Read first: `src/state/queue.ts` and `src/state/exec.ts` (the `train` item, its hunt, the bag-full trip, "withdraw
gear"), `src/state/planner.ts` (the stall rule), `CLAUDE.md` ("The loop": a stall is a counter still for
`max(20 min, 5 × unit)` of running time).

## Where this starts
On top of `027e: level first` (`44bb5f1`); the live service runs it (run `42oo`, since 09:11:08 UTC on 11-25). The
working tree holds two changes from the planning chat and nothing else: `docs/rework.md` (edited) and this file. If
anything else is uncommitted, say so and stop.

**What is.** A worker has made nothing for a day and a half, and nothing noticed.
- Fourth's step `lvl:jewelrycrafting:25@Fourth#3` ("Train Jewelrycrafting +1 level", planned 4.6 h) runs since
  2026-11-23T22:23:39Z. At 09:11 UTC on 11-25 it had run 120,125 s, 0 of 1 units, jewelrycrafting still 23.
- `logs/raw/2026-11-25/08.log`: every 22 seconds the note "→ bank (full)", a deposit of `skull_staff` 1,
  `skeleton_armor` 1, `skull_ring` 2, the note "withdraw gear", a withdrawal of the same four — 163 rounds in the
  hour. Besides them: one "equip gear" (`small_health_potion` ×59 to `utility2`, 08:08) and one "withdraw Wolf Bone"
  (08:55). `logs/status.json` showed the same note at 16:34 UTC on 11-24.
- Four restarts re-attached the step (11-24 07:39, 13:31, 16:41; 11-25 09:11) and the stall rule never fired. For a
  level step the unit is the level's hours, so the bound is 5 × 4.6 h = 23 h; the chat's guess is that the running
  clock also starts again at a restart.

Small and direct: an executor repair and a stall that sees it. The planner's core is not touched.

## A. The loop
1. Read-only first, from `logs/raw` since 2026-11-23T22:00Z: when the rounds began, what the bag held then, and
   which two code paths take turns. Five lines in the report.
2. A scenario on the fake that plays it (red on the starting tree).
3. The repair, the smallest that makes it green: gear an item has just withdrawn to wear is not cargo for the
   bag-full trip, and an item with no room for its gear makes the room first (it deposits what it does not need)
   or ends as blocked — it never takes the same pieces out again. One line in the report on the rule chosen.
4. The same pattern elsewhere (a fight, task-loop or gather item that gears up with a full bag): say where it can
   and cannot happen; repair it where it can.

## B. The stall
1. The stall's clock is the step's running time summed over restarts (kept with the step), not since the last boot.
2. For a level step the counter is the character's own work — any XP, kill, gather or craft in its meters — and the
   bound is 60 minutes of running time without any (one new constant, named). The other steps' rule stays.
3. A stalled step is blocked as today; the journal's `block` line says what stood still and for how long.

## C. Proof
1. Scenarios, red first: the loop (A.2); a level step that only moves gear for 60 minutes → blocked, with a restart
   in the middle; a train step that hunts its materials for two hours with kills → not blocked.
2. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory. `npm run check -- planner` only
   if a file under `src/plan/planner/` changed (none should).
3. Commit `docs/rework.md` as `Rework notes` if it differs from `HEAD`, then everything else as
   `027f: the train item's loop`; push to `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game.
- No new dependencies. Do not edit `docs/rework.md`.
- Everything you write is in English.

## Report
`tasks/027f-train-loop.report.md`, **at most about 60 lines**: Summary · Decisions for Alex · How Alex verifies · What
the log shows · What was done / files · Notes. Say in the Summary whether Fourth's running step ends by itself after
the restart or must be dropped by hand (the 🧭 button).
