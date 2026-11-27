# 037 — A listed piece is made when it pays for itself; a craft's seconds as they are

Read first: `docs/season-plan.md` (section 4, stage 1), `tasks/036-stage.report.md` (decision 2), `src/plan/planner/gear.ts`
(the head comment: works (a), (b), (c)), `CLAUDE.md` ("The stage").

## Where this starts
On top of `fd7499e` (`036: the engine follows the stage`), the top of `origin/rework`; if it is not there, say so and
stop. The working tree holds the planning chat's files: `docs/rework.md`, `stage.json`, this file. Anything else
uncommitted: say so and stop.

## What is
- **The slime shield is on stage 1's list and is not made** (036's report): it saves First 6% a win at the Owlbear
  and Fifth 3% at the Death Knight, its chain is 0.1 h and 3 wool, and gear by need asks `G + H1 ≤ NEED_RATIO × H0`
  (0.85, task 009's number): a piece that saves less than 15% can never be needed, however cheap. The gathering
  tools met the same wall on 11-24 and got their own rule (027c, work (c)): needed when the tool pays for itself,
  `G ≤ H0 − H1`. **Alex (11-27): six minutes of work is nothing — such things are to be made.**
- **A craft's seconds are estimated at 5 and measured at 13–21** (the journal's `slow` records of 11-27:
  `craft:hardwood_plank` mean 16–21 against `est` 5, `craft:steel_bar` 13–19 against 5; `kill:cow` 23 against 10). The
  steps that make planks ran 1.6–2 times their plan that day (`mat:hardwood_plank`: plan 532 s, ran 1,022 s).

## A. A listed piece pays for itself
1. With a stage, for a piece on its `pieces` list, works (a) and (b) take (c)'s rule: the piece is needed when making
   it costs no more than it saves over the work, `G ≤ H0 − H1`. The 0.85 stays for everything else and for a World
   with no stage.
2. Nothing else of gear by need changes: one need a slot by today's order, the bill, who crafts, the market's side
   (032c).

## B. A craft's seconds
1. Read-only first: where the 5 comes from and what the game's rule for a craft's cooldown is (the echo's cooldown
   against the quantity crafted, from `logs/raw/2026-11-27/`: planks, steel bars, one gear piece).
2. If it is one formula or one constant in one place, put the game's rule there; if the estimate is right and the
   seconds are lost elsewhere in the step (walks, the bank, batches cut small), say where and build nothing.
3. `kill:cow` (23 against 10): one line on why, nothing built.

## Proof
1. Checks, red first: a listed piece that saves 6% with a chain of minutes is a need under a stage and is not one
   without it; a listed piece whose chain costs more than it saves is not a need; B.2's seconds against the three
   measured means, if built.
2. The newest live state on a zero-call service with `stage.json`: who asks for the slime shield, the chain's steps
   and who takes them; the first two steps of each fighter (no fight at 0 XP).
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory. No road.
4. `CLAUDE.md` follows. Commits, staged by path, pushed to `origin/rework`: `Rework notes` (`docs/rework.md`) if it
   differs from `HEAD`, then `037: a listed piece pays for itself` (yours, `stage.json`, this file).

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/`.
- No new dependencies, no new constants. Do not edit `docs/rework.md`, `docs/season-plan.md` or `stage.json`.
- Everything you write is in English.

## Report
`tasks/037-listed-piece.report.md`, **at most 25 lines**: Summary (Proof 2 first; B.1's answer; what is committed; the
gate's line) · Decisions for Alex · How Alex verifies · Files.
