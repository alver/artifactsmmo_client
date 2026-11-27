# 033 — A fighter fights for XP: the crafts' kills go back to the workers

Read first: `CLAUDE.md` ("The roles (task 027)": the fighter's order (1)–(5), 027g's `workerHunts`, 029's `TRAIN_HUNT`),
`src/plan/planner/config.ts` (`TRAIN_HUNT`), `decide.ts` (the fighter's branch: `need-kill`, `train-kill`, `xp-pick`),
`tasks/029-fleet-levels-crafts.report.md` (its roads with `TRAIN_HUNT` on and off), `tasks/032c-bought-pieces.report.md`
(C.1, C.2, its decision 2).

## Where this starts
On top of `032c: a piece on sale is a candidate` (`05e15c4`), the top of `origin/rework`. If it is not there, say so and
stop. The working tree holds at most two changes from the planning chat (`docs/rework.md`, this file); anything else
uncommitted: say so and stop. The live service runs `05e15c4` (run `wi4r`, since 14:40:44 UTC on 11-27).

**What is** (the journal of 11-27, 00:00–14:40 UTC).
- **The fighters do not level.** First: 9.5 h on a training's kills, 3.2 h on a need's kills, 2.3 h on the XP pick —
  850 combat XP in the day (11-26: 13,926 in 6.8 h of the pick). Fifth: 8.9 / 3.2 / 2.1 h — 1,260 XP (11-26: 14,432).
  One pick step each in 14 hours. First has stood at 31 since 21:47 UTC on 11-26, Fifth since 05:34 UTC on 11-26.
- **What they kill**: sheep, blue and green slimes, cows, highwaymen, flying snakes — "0 combat XP a kill", 9–27 s a win —
  for the training batches of gearcrafting, weaponcrafting and jewelrycrafting (`TRAIN_HUNT`, 029: a training's kill is
  a fighter's before its pick, whoever else is admitted); and a task's monsters for coins (224 skeletons, 390 spiders).
- **The model says the same for the days ahead**: 032c's C.2 — 139–141 of the fighters' 144 character-hours of three
  days on a training's kills, 31 / 31 every day, with the bows banked or without; with them banked the workers wear
  the bows to the Imp (763 kills).
- **The pick is worth it**: the Vampire today, 1,710 XP/h; with the weapons the market is buying, the Imp or the Death
  Knight, 2,158–3,142 XP/h (032c, C.1).

**Alex:** a fighter's level is a goal in itself, the workers level the crafts (11-24); what the fleet needs at 30–35,
fast (11-27). The chat: 029's "the whole fleet levels the crafts" ends for the fighters — the market sells the level-30
pieces now, and an hour of a fighter is worth more as XP than as wool.

## A. The switch and what hangs on it
1. **`TRAIN_HUNT = false`**: a training's `src:` kill follows 027g's rule — a worker that is on and admitted hunts it;
   a fighter only where none is, by (3)'s rule for a need's kill.
2. **Coins.** A fighter takes no step for coins on a task whose monster gives it no XP: `src:tasks_coin` is a
   fighter's only where the held task's monster is its pick or within the pick's 25% (it rides on the pick, 027d),
   else a worker's by today's rules for a worker's need. If that is more than the fighter's filter and the worker's
   candidate, say so and leave the coins as they are.
3. **A fighter's weapon stays a fighter's.** A worker's fight step does not take from the bank a piece that a fighter's
   solved set for its XP pick holds (the fighters' picks first; what their sets hold is out of a worker's pool, as a
   piece booked by a running step is). If this is more than a pool filter, say so, leave it, and count in C.1 the
   hours a worker's step held such a piece.
4. Nothing else in the orders changes: forging, a road need's kill no worker is admitted to, the pick, the wall's rule.

## B. Read-only, into the report (at most five lines each)
1. **Three days of road** (029's driver from the newest World), `05e15c4` against this tree. A day a line: First's and
   Fifth's combat level and XP gained, their hours on the pick / on other kills / the rest; gearcrafting,
   weaponcrafting and jewelrycrafting; the workers' hours on kills.
2. **The same with what the market is buying** in the starting bank (a Perfect Bow, two Death Knight Swords): the
   fighters' picks, XP an hour and levels by day; who wears what.
3. **What still takes a fighter off its pick** on this tree in those three days: the rule, the target, the hours.

## C. Proof
1. Checks, red first on the starting tree:
   - a fighter with an admitted pick; a training batch short of a drop whose monster gives the fighter no XP; a worker
     on and admitted → the fighter's step is the pick, the worker's the kill;
   - the same with no worker admitted → the fighter's kill by (3), as 027g had it;
   - a coins need on a task of a no-XP monster → no fighter's step; on a task of the pick's monster → it rides on the pick;
   - a worker's kill step with a fighter's pick weapon in the bank → the worker's set leaves it, the fighter's next
     pick step wears it.
2. The recorded whys: what moved, in three lines. `npm run check -- planner` is not run (decision 86).
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
4. `CLAUDE.md`: the roles' paragraph follows. Commit `docs/rework.md` as `Rework notes` if it differs from `HEAD`, then
   everything else (this file with it) as `033: a fighter fights for XP`; push to `origin/rework`. If the push fails,
   say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start, stop
  or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/` (reading is allowed).
- No new dependencies, no new constants. Do not edit `docs/rework.md`.
- The machine is strong: run B's roads side by side.
- Everything you write is in English.

## Report
`tasks/033-fighters-fight.report.md`, **at most about 50 lines**: Summary · Decisions for Alex · How Alex verifies ·
B.1–B.3 · What was done / files · Notes. Say first in the Summary: what is committed; the fighters' combat XP a day
and levels over the three days, before and after; the three crafts' levels on day 3, before and after; whether A.2 and
A.3 were built; the gate's lines. No placeholders left in it.
