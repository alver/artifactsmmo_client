# 033b — A fighter takes no training's kill: report

## Summary
- **On the live state of 16:35 UTC (a zero-call service on this tree), First's first step is neither its XP pick nor a kill for its own set.** Rule (3), "a need's kill", gave it: Cyclops Eye, 72 actions short for **Fifth's** Greater Dreadful Amulet (Fifth's gear work (a)), at 41 XP a kill (87% of its best rate). Fifth takes the same kill for its own amulet (39 XP, 35%). Neither fighter takes the King Slime. The jewelry training (26 → 27, Skull Amulet ×24, 272 actions of King Slimeball short) gets no step. No worker is admitted, and the mock has no market. With the live market (ask 272, reference 319), rule 2 refuses it: 3,808 gold is 13 h against 2.4 h of the fighters' kills. Fourth crafts the Dreadful Amulet for Fifth.
- **Only the filter is built (A.2's own rule).** In (3), a leaf that serves only a craft's training never goes to a fighter: `decide.ts` keeps `train:` out of `Candidate.road`, and "a training's kill" applies only with `trainHunt` on. The market buys the drop where all its rules pass. **Two things are left:**
  1. `train.ts supplierSec` still prices a training's kill at the quickest admitted fighter. So the pick stays on Skull Amulet and waits, and never moves to the next recipe.
  2. Rule 2 still compares the gold with the fighters' kill hours (`ownHours` → `fleetSec`). So a fair ask is refused as "more than half", even though no one of ours hunts the drop.
  Both change the training's prices, not the filter, so I left them (a `shortcut:` note marks 1).
- **Committed and pushed** to `origin/rework`: `Rework notes` (`docs/rework.md`, `docs/season-plan.md`), then `033b: a fighter takes no training's kill` (the files below, `tasks/033b-…`, `tasks/034-board-viewer.md`). Task 034's `package.json` line and `scripts/board/` are not in it.
- **The gate:** `npm run typecheck` passes. `npm run check` gives **126 checks: 126 ok, 0 known defects reproduced, 0 failed — 251.1 s**. The build into `D:\Temp\ammo-033b\dist` passes (400.80 kB).

## Decisions for Alex
1. **Build what is left?** With 1 and 2 done, a drop that only a fighter can win counts as "no source of ours". The training would buy it at a fair ask (rule 2 void) or take its next recipe. Today it waits.
2. **"Its own road" is read as 027g's: either fighter's piece.** First hunts Cyclops Eyes for Fifth's amulet. With the Cyclops blocked, it hunts Owlbear Hair for Fifth's Obsidian Helmet (99% of its rate). To limit a fighter to its own set, I would add one more filter on the parents' `for`.
3. **Rule (5) is unchanged.** At the road's wall (39 here: "no XP source there"), the free pass can still take a training's kill.

## How Alex verifies
- `npm run check -- fighters` runs 7 cases. On 51928ef, cases 2 and 5 fail: the fighters go to the Blue Slimeball and King Slime training kills. Case 6 holds there too, labelled "a training's kill".
- After the restart, the journal has no "fighter, a training's kill". A fighter's kill reads "fighter, a need's kill: supply: … for <piece> for First/Fifth …".

## Files
`src/plan/planner/decide.ts` (the filter), `src/plan/planner/train.ts` (a comment only), `scripts/check-fighters.mts` (case 2 reversed, new cases 5 and 6), `scripts/fixtures/world-2026-11-27-1635.json` (the zero-call service's World), `CLAUDE.md`, this report. Scratch: `D:\Temp\ammo-033b` (`live.mts` decides a snapshot on a tree).
