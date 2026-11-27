# 033b — A fighter takes no training's kill

Read first: `docs/season-plan.md` (section 6), `tasks/033-fighters-fight.md` and its report, `CLAUDE.md` ("The roles":
the fighter's order (3), 027g's `workerHunts`), `src/plan/planner/decide.ts` (the fighter's branch), `supply.ts` and
`market.ts` ("no source of ours").

## Where this starts
On top of `51928ef` (`033: a fighter fights for XP`), the top of `origin/rework`; if it is not there, say so and stop.
The live service runs it (run `zft3`, since 16:06:30 UTC on 11-27). The working tree holds the planning chat's files
(`docs/rework.md`, `docs/season-plan.md`, `tasks/033b-…`, `tasks/034-board-viewer.md`) and, if task 034 is running in
its own session, files under `scripts/board/` and a line in `package.json`: **those are another session's work in
progress — do not touch, stage or commit them.**

**What is** (the journal of 11-27). 033's report said that on the live state no fighter takes a training's kill. In
play, nine minutes after the restart (16:15:08 UTC), First was given `src:king_slimeball@First#2`: "fighter, a
training's kill: supply: King Slimeball: 454 actions short for jewelrycrafting 26 → 27 (Skull Amulet ×24) … King
Slime: 0 combat XP a kill; 67 kills now (1.5 h)". No worker is admitted against the King Slime (the bow and the rings
ask for combat 30), so 027g's rule hands the kill to the fighter, before its XP pick. 454 kills are eight to ten
fighter-hours for one level of jewelrycrafting, and the levels after it ask the same.

**The plan** (`docs/season-plan.md`, section 6): in stages 1–2 a fighter fights for XP or for a piece of its own
stage set, nothing else.

## A. The rule
1. A fighter takes a `src:` kill in (3) only for a need of **its own road** (a piece of its gear work, its road's
   consumables), as 027g has it. A leaf that serves only a craft's training is never a fighter's — whether or not a
   worker is admitted.
2. With no worker admitted, such a leaf has no hunter of ours. What follows is what the code already does for "no
   source of ours": the market by 032's rules where the drop is on sale at a fair ask inside the purse; else the
   training takes its next recipe by today's order; else it waits. If any of that needs more than the filter in (3)
   and the existing "no source of ours" path, **build the filter only and say what is left**.
3. Rule (5) (no admitted fight that gives XP, or the cap) stays as it is.

## B. Proof
1. Checks, red first on `51928ef`:
   - a fighter admitted alone against a boss, a training's batch short of its drop, no worker admitted → the
     fighter's step is its XP pick; the drop is bought where it is on sale at a fair ask, the training's next recipe
     where it is not;
   - the same monster's drop asked by a piece of the fighter's own gear work, no worker admitted → the fighter's kill,
     as today.
2. The newest live state on a zero-call service (as 033 did): First's and Fifth's first steps and their whys, and the
   jewelry training's next step. **If a fighter's step there is not its XP pick or a kill for its own set, say which
   rule gave it** — that sentence goes first in the Summary.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory. No road, no replay,
   `npm run check -- planner` is not run.
4. `CLAUDE.md`: the fighter's order (3) follows. Commit `docs/rework.md` and `docs/season-plan.md` as `Rework notes` if
   they differ from `HEAD`, then **only** your own files and `tasks/033b-…`, `tasks/034-board-viewer.md` as
   `033b: a fighter takes no training's kill` — stage by path, never `git add -A`; push to `origin/rework`. If the push
   fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/`.
- No new dependencies, no new constants. Do not edit `docs/rework.md` or `docs/season-plan.md`.
- Everything you write is in English.

## Report
`tasks/033b-no-training-kill.report.md`, **at most 25 lines**: Summary (B.2's sentence first; what is committed; the
gate's line) · Decisions for Alex · How Alex verifies · Files.
