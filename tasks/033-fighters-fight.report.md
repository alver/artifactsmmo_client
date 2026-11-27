# 033 — A fighter fights for XP: the crafts' kills go back to the workers: report

## Summary
- **Committed and pushed** to `origin/rework`: `Rework notes` (`docs/rework.md` differed from `HEAD`), then `033: a fighter fights
  for XP` (code, checks, fixtures, `CLAUDE.md`, the task file, this report), on top of `05e15c4`.
- **The fighters' combat XP a day, First / Fifth** (three days from the World of 00:00 UTC on 11-27, 029's driver). `05e15c4`:
  113 / 240, 228 / 93, 190 / 237, still 31 / 31 on day 3. This tree: 65,934 / 39,112, 43,761 / 37,548, 35,088 / 31,946, levels
  33 / 33, 35 / 34, 36 / 35. With the market's weapons banked: `05e15c4` 900 / 492, 2,440 / 9,901, 213 / 4,144, 31 / 31 every day;
  this tree 97,671 / 95,087, 86,178 / 74,885, 79,002 / 71,082, levels 35 / 35, 38 / 37, 40 / 39.
- **The crafts on day 3** (gear / weapon / jewelry): 31 / 31 / 29 → 31 / 30 / 26; weapons banked 31 / 31 / 29 → 31 / 29 / 26.
  Points on day 3: 43 → 43; weapons banked 43 → 49.
- **A.1–A.3 are built.** A.2 is the fighter's filter and the worker's candidate, plus one line: `tasks.ts startVisit` no longer asks
  the role, so a worker with no task takes one for the coins. A.3 is a pool filter (`stock.ts poolBank`).
- **The gate**: `npm run typecheck` passes. `npm run check` **126 checks: 126 ok, 0 known defects reproduced, 0 failed — 234.9 s**.
  The build into `D:\Temp\ammo-033\dist` passes (400.76 kB). `npm run check -- planner` was not run (decision 86).

## Decisions for Alex
1. **The crafts slow down.** The workers' hours on kills go from 17.7 / 7.0 / 0.5 a day to 47.9 / 56.9 / 35.4. Jewelrycrafting is
   three levels behind on day 3.
2. **The coins are the workers' work now.** With the weapons banked, the workers spend 55 h of three days on tasks (Second 20.1,
   Fourth 20.6, Third 14.5), for a Steel Axe, a Dreadful Shield and more, on whatever a draw gives. No fighter's task was its pick.
3. **A.3 moved no road hour.** The workers are at combat 25–28 and the bow and sword ask for 30. The filter covers the planner's
   steps. The executor's own solves (a train loop's hunt, an offering, a task: `exec.ts freeQty`) can still take such a piece:
   covering them means solving the fighters' picks on the service thread. Left as is.
4. **Three fixtures re-based on this tree** (C.2), beside the old ones: `boss-none-033`, `bought-none-033`, `whys-033`.
   `check-onepage`'s road now starts from the World of 11-27: from 11-25 the first piece now comes at 151 h, past its backstop.

## How Alex verifies
- `npm run check -- fighters`, 5 cases. On `05e15c4` cases 1, 3 and 4 fail; case 2 holds there too (027g's rule is unchanged).
- After the restart, First's and Fifth's whys start "fighter: the XP pick"; the training's kills read "worker, a need: supply: …";
  a worker's coins "worker, a need: supply: coins: … task: …"; no "fighter, a need's kill: supply: coins" on a no-XP task.

## B.1 Three days of road (First / Fifth: combat, XP; hours by the day a step starts — pick / other kills; the rest ≤ 1 h)
- `05e15c4`: d1 31 +113 / 31 +240, 0 / 24.3 and 0 / 22.8 h, crafts 30/27/26, workers on kills 17.7 h; d2 +228 / +93, 0 / 23.8 and
  0 / 23.7, 31/29/28, 7.0 h; d3 +190 / +237, 0 / 22.9 and 0 / 23.0, 31/31/29, 0.5 h. All of it is the training's kills.
- This tree: d1 33 +65,934 / 33 +39,112, 23.5 / 0 and 23.6 / 0 h, 30/27/25, 47.9 h; d2 35 +43,761 / 34 +37,548, 23.2 / 0 and
  22.9 / 0, 31/28/26, 56.9 h; d3 36 +35,088 / 35 +31,946, 19.9 / 3.3 and 19.7 / 2.9, 31/30/26, 35.4 h.

## B.2 With a Perfect Bow and two Death Knight Swords banked (this tree)
- Picks and XP an hour of pick, First / Fifth: d1 Imp, Death Knight, Owlbear (4,037 / 4,032); d2 Owlbear and Death Knight / Cyclops
  and Imp (3,790 / 3,375); d3 Death Knight and Owlbear / Imp and Owlbear (3,459 / 3,133). Levels 35 / 35, 38 / 37, 40 / 39.
- Who wears what: d1 First the bow 14.1 h and a sword 10.1 h, Fifth a sword 16.9 h and the bow 6.7 h; d2 First a sword, Fifth the
  bow; d3 First a sword, Fifth the bow and a second sword (the Death Knight drops them). No worker wears one. `05e15c4`: the same
  pieces worn for the training's kills, no pick step.

## B.3 What still takes a fighter off its pick (this tree, three days)
- Rule (3), a need's kill no worker is admitted to: Owlbear Claw 5.3 h (Conjurer Skirt for Fifth; the Owlbear only with potions,
  59–86 XP a kill) and Cyclops Eye 0.9 h, on day 3, without the weapons. Rule (5): 0.4 h of King Slime for First at its wall
  (combat 40, no XP source at 41), with them. The spider coins in flight at 00:00 (0.28 h, 0.65 h) play out on both trees.

## What was done / files
- `plan/planner/config.ts` (`TRAIN_HUNT = false`); `decide.ts` (the coins rule; the `setPoolOut` hook of the fighters' pick sets);
  `stock.ts` (`setPoolOut` in `poolBank`); `tasks.ts` (`startVisit`). `scripts/check-fighters.mts` (new); `check-train` A.3 and
  `check-market` case 2 run with `trainHunt: true`; `check-seconds`' coins case; the fixtures above; `whys.mts`; `CLAUDE.md`.

## Notes
- **C.2, the recorded whys.** On the 11-25 road, 76 whys against 80, one the same: the fighters take the pick where they took
  cowhide, and the workers take cowhide and slimeballs over iron ore. On the 11-21 World with the fighters unarmed: the free pass
  (golden egg) instead of yellow slimeballs. 11-24 and no-achievement: 5 / 5 the same. `boss-none` / `bought-none`: the fighters'
  6 decisions are the pick instead of the Blue Slimeball kill.
- A.3's hold leaves a road need's kill monster out of the fighters' pick bonus (a `shortcut:` comment). Over 12 hours of road,
  1,536 worker pools used it, and none was asked while the sets were being solved. No request to the game, nothing under
  `logs/`. Scratch is in `D:\Temp\ammo-033` (`drive.mts` with XP at midnight, `tab.mjs`); the roads took 164–318 s each.
- A zero-call service (verify's mock, a scratch copy on port 5199, the live state of 15:57 UTC) gave these first steps. Fifth:
  the XP pick, the Imp at 1.36 XP/s. First: a need's kill on the Cyclops (no worker admitted; 88% of its best XP rate). The
  workers: needs. No fighter took a training's kill.
