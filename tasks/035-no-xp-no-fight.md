# 035 — A fighter never takes a fight that gives it no XP

Read first: `docs/season-plan.md` (sections 2 and 6), `tasks/033b-no-training-kill.report.md`, `CLAUDE.md` ("The
roles"), `src/plan/planner/decide.ts` (where a fighter's step is finally chosen).

## Where this starts
On top of `3188f48` (`033b: a fighter takes no training's kill`), the top of `origin/rework`; if it is not there, say
so and stop. The live service runs it (run `wa8q`, since 16:50:27 UTC on 11-27). The working tree holds the planning
chat's files (`docs/rework.md`, `docs/season-plan.md`, this file) and **task 034's finished files**, not committed yet:
`scripts/board/derive.mjs`, `verify.mjs`, `view/*`, `run.vbs`, `README.md`, the `board:view` line of `package.json`,
`tasks/034-board-viewer.report.md`. Anything else uncommitted: say so and stop.

## What is (the journal of 11-27, `logs/journal/2026-11-27.jsonl`)
Three times today the same kill came back by another path:
- 15:05 (032c's code) `src:king_slimeball@First#1` — "fighter, a training's kill";
- 16:15:08 (033's code, `TRAIN_HUNT` off) `src:king_slimeball@First#2` — "fighter, a training's kill … Skull Amulet
  ×24";
- 17:38:32 (033b's code, the filter on `train:`) `src:king_slimeball@Fifth#2` — "fighter, **a need's kill**: supply:
  King Slimeball: 277 actions short for jewelrycrafting 26 → 27 (Dreadful Amulet ×24) … King Slime: 0 combat XP a
  kill; 80 kills now (1.5 h)". The leaf also serves a Dreadful Amulet for Fifth, so it passed as a fighter's need — and
  was sized by the training's whole shortfall.

Both reports said the fighter was free of it; play said otherwise each time. And the cost (the board's reads): on
11-25 First and Fifth made about 60k combat XP each, 18 hours at the vampire; on 11-26 26k and 25k; on 11-27 by
16:00 2.4k and 4.3k.

**So this task does not add a third filter on a path. It guards the outcome.**

## A. The guard
1. At the one place where a fighter's step is finally chosen, after every rule: **a fight step against a monster
   that gives this fighter no combat XP is not taken** — whatever asked for it (a training, a need, an objective, a
   task, a tidy, the free pass). The number is the one the why already prints ("0 combat XP a kill").
2. The fighter then takes its next candidate by today's order, down to its XP pick.
3. It holds wherever the fighter has an XP pick. Rule (5) at the road's wall (no fight that gives XP is admitted at
   all) stays as it is.
4. **No exception in this task**, not even for a fighter's own piece: the slimeballs for the two slime shields are in
   the bank. What a no-XP drop's demand does without a hunter is today's "no source of ours" path (the market by its
   rules, else it waits); nothing is built there.
5. The guard is a line of the plan (`docs/season-plan.md`, section 6), so it gets one named place in the code and one
   paragraph in `CLAUDE.md`, not a flag.

## B. Proof
1. Checks, red first on `3188f48`: the three cases above, each built from the World of that minute if `logs/world/`
   or the journal gives it, else constructed to the same shape — above all the third (a leaf shared by a training's
   batch and a fighter's piece). Each must give the fighter a fight that pays XP.
2. The newest live state on a zero-call service: **the first three steps of First and of Fifth, decided one after
   another** (the second and third after the step before is done, as 033's road does a day), with the monster and its
   XP a kill. If any of the six is a fight at 0 XP, the task is not done: say which rule gave it and stop there.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory. No road, no replay.
4. Commits, staged by path, pushed to `origin/rework`: `Rework notes` (`docs/rework.md`, `docs/season-plan.md`) if they
   differ from `HEAD`; `034: the board, seen` (034's files as they are, unchanged); `035: a fighter never takes a fight
   that gives it no XP` (yours and this file). If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/`.
- No new dependencies, no new constants. Do not edit `docs/rework.md` or `docs/season-plan.md`.
- Everything you write is in English.

## Report
`tasks/035-no-xp-no-fight.report.md`, **at most 25 lines**: Summary (B.2's six steps first; what is committed; the
gate's line) · Decisions for Alex · How Alex verifies · Files.
