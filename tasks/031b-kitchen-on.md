# 031b — The kitchen is on

Read first: `tasks/031-no-potions-a-kitchen.report.md` (decision 1, the roads' table), `CLAUDE.md` (the roles' and the
food's paragraphs), `src/plan/planner/config.ts` (`KITCHEN`).

## Where this starts
On top of `031: no potions, a kitchen` (`fd8b44c`), the top of `origin/rework`. If it is not the last commit, say so and
stop. The working tree holds at most two changes from the planning chat (`docs/rework.md`, this file); anything else
uncommitted: say so and stop. The live service runs `fd8b44c` (run `tmek`, since 07:55:08 UTC on 11-27).

**What is.**
- **031 committed `KITCHEN` off by its rule D.3, on one day**: with the kitchen First reaches 50 on road day 34 against
  33, Fifth on 32 against 33. The same road ends 3 points higher (74 / 71), the fighters rest 209 h against 307 h, and the
  first level-30 weapon comes on day 4 against day 9.
- **Play says the fighters starve.** Run `szzd` (`d2fd93c`, 11-26 11:23 → 11-27 07:55 UTC), the fighters' ended steps:
  First 18.0 h — fight 9.8 h, rest 5.1 h; Fifth 16.3 h — fight 7.2 h, rest 6.7 h (its last coins step: 3,725 s of rest in
  5,741 s). `logs/world/2026-11-27.json` (00:00 UTC): the bank holds no cooked food and, raw, trout 4,140, chicken 2,916,
  gudgeon 2,193, shrimp 1,720, wolf meat 929, rat meat 424, beef 391. Both fighters' steps at 07:55 UTC read "rests (no
  food in the bank; raw for Cooked Rat Meat waits for the cook)". Cooking: First 32, Second 26, Third 32, Fourth 26,
  Fifth 27 — the lane is Fourth's, who cannot cook rat meat.
- **The chat's call**: D.3's rule was too narrow (one day on one fighter, the other a day the other way). The kitchen is on.

## A. The switch
1. `KITCHEN = true` in `config.ts`. Nothing else in `src/` changes. If `src/` needs more than this one word, say so and stop.
2. A check or a recorded fixture that holds a kitchen-off expectation follows (say which, and why, in the report).
   `CLAUDE.md`'s paragraphs follow.

## B. Read-only, into the report (at most five lines each)
1. **The kitchen's first day**, so the chat can hold play against it: the forward model on `logs/world/2026-11-27.json`
   for 24 h with the kitchen on — Third's first ten steps (key, the why's first clause, hours), the cooked food made in
   those 24 h by code, the fighters' hours of rest and of eating; the same two figures with the kitchen off.
2. **The replay's rows** (after C.3's run): which achievements rows B, E and G completed on 030's line (112 / 87 / 86)
   and do not on this one. If 030's verbose output is no longer in `D:\Temp\ammo-030`, say so and give this run's lists only.

## C. Proof
1. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
2. Commit `docs/rework.md` as `Rework notes` if it differs from `HEAD`, then everything else (this file with it) as
   `031b: the kitchen is on`; push to `origin/rework`. If the push fails, say so. Write the report's Summary now, so
   the chat can read it while C.3 runs.
3. **After the push**: `npm run check -- planner` once on the committed values, the way 031 ran it; its line and B.2 go
   into the report (a second commit, `031b: report`, pushed). It does not hold C.2. If it fails: the failing invariant
   and its first case first in the Summary; nothing is reverted.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start, stop
  or restart, no build into `dist/`, no request to the game; nothing you run writes under `logs/` (reading it is allowed).
- No new dependencies, no new constants. Do not edit `docs/rework.md`.
- Everything you write is in English.

## Report
`tasks/031b-kitchen-on.report.md`, **at most about 40 lines**: Summary · How Alex verifies · B.1 · B.2 · What was done /
files · Notes. Say first in the Summary: the commit and whether it is pushed; the gate's lines; what besides the one word
changed. No placeholders left in it.
