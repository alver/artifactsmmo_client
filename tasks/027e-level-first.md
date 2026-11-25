# 027e — Level first: a fighter levels, the workers serve its road; the wall at 45

Read first: `src/plan/planner/decide.ts` (the header, the fighter's and the worker's branches, `fightPlan`'s sliver
rule), `src/plan/planner/gear.ts` (work (a) and its score), `src/plan/planner/consumables.ts` (`consumableNeeds`, where
food "pays"), `tasks/027c-tools.report.md` (The fallback), `docs/strategy/board/2026-11-24.md`.

## Where this starts
On top of `027d: tasks and coins` (the top of `origin/rework` when you start; 027d was running while this was written).
If `027d: tasks and coins` is not the last commit, or its report says it stopped, say so and stop. The working tree
holds at most two changes from the planning chat — `docs/rework.md` and this file — unless 027d's commit already took
them; anything else uncommitted: say so and stop.

**What is.** The planner ranks by achievement points an hour; a fighter takes its XP pick only when nothing ranks.
- In play on 11-24 (run `3bd9`): First and Fifth, combat 24–25, fight the level-20 Spider for `arachnophobia_conquered`
  (+2 points, about 10 h), resting between fights (133 and 100 s a win; Fifth "rests: Cooked Trout is needed for
  the_reaper"); Second and Third supply 830 Minor Health Potions and 412 Cooked Trout for `the_reaper` (+3 points, a
  chain of about 76 h); Fourth's one level of jewelrycrafting has run 18 h against 4.6 h planned.
- On the board at noon the accounts at places 6–11 stand at combat 42–45 and the neighbours (22–42) at 30–42; this
  fleet at 24–26, in the season's fourth week. Alex: the game already has characters at 50.
- 027c's road: 45 on day 28, then nine weeks for the last five levels — the two defects of its part C.

**Alex (2026-11-24):** something is fundamentally wrong. A fighter's level is a goal in itself, even if points come
slower in the coming weeks; the workers level the crafts that make weapons and armour, not combat. Small and direct:
an order of work, no new scoring term, no new constant.

## A. The fighter's order (in place of "today's ranking among fights")
1. An achievement on `config.first` (Alex's knob), as today.
2. Forging by need (027b), as today.
3. A kill that a need of its own or another fighter's combat road asks: a `src:` kill for a piece of gear work (a),
   027d's coins for such a piece. Today's scoring among them.
4. **The XP pick**: `pickMonster`'s monster, a chunk. The ×1.25 of an open objective's monster and of the held task's
   stays — that is how kill achievements come along while it levels.
5. Only with no admitted fight that gives XP, or at the game's level cap (find it in `docs/api` or the atlas; say
   which): today's rule over the whole list (027b's free pass), kill objectives included.

## B. The workers' order
1. **A need is the fighters' road.** The first tier holds the needs of work (a) — its gear, the craft level a piece
   asks, the consumables of the XP pick — and a lane holder's tool (c). The needs of a kill or drop objective (work
   (b)) and their consumables leave the first tier and rank in today's rule (tier 4).
2. An objective done within `WORKER_SHORT_H`, as today.
3. **The gear craft, ahead of the fighters**: in place of the fixed `WORKER_CRAFT` 30, the tier the fighters wear
   next — the highest fighter's combat level + 5, rounded down to a multiple of 5, at least 30.
4. Today's rule inside its lanes, as today.

## C. The wall at 45 (report 027c, part C)
1. **A sliver of a potion.** A set that names a potion the stock covers only as a sliver no longer refuses the kill
   step: the fight is planned with the set without that potion where it is still admitted; where it is admitted only
   with the potion and the fight is the XP pick's, the potion is a need of the road (first tier), so somebody brews it.
2. **No NaN.** A need whose road walls scores a finite number (the walled levels at the pace of the last level
   priced, as the horizon's `rest` does), and a candidate `rank` drops for its score says so in the journal.

## D. Read-only: where a fighter's seconds go (for the next task — fix nothing)
From the journal and the raw log since 13:31 UTC on 11-24, per fighter: the seconds a win split into the fight, the
rest, the eating, the walks and the bank; XP an hour; what it fought and why. Then, on the same fights, by the
simulator: the seconds a win and XP an hour if it ate the best food the bank or the cook can give instead of
resting, and what the food for an hour of such fights costs a worker in hours. One table, five lines of text.

## E. Proof
1. Checks, red first on the starting tree:
   - a fighter with a ranked kill objective and an admitted XP fight → the XP pick; the objective's monster within
     25% of the pick's rate → that monster; a `config.first` achievement → first; a need's kill → before the pick;
     no admitted XP fight → today's rule; at the cap → today's rule;
   - a worker: a need of an objective is not first tier, a need of a fighter's road is; the craft target follows the
     highest fighter (26 → 30, 30 → 35, 36 → 40);
   - the sliver: the kill step stands without the potion; a potion-only XP fight → the potion is a first-tier need;
   - a walled road: the need's score is finite and the drop is said.
2. Two roads from the newest daily World in `logs/world/`, roles on, side by side: the starting tree and the final
   one. One table: the five combat levels on days 3, 7, 14, 21, 28, 42 and at the deadline; the day each fighter
   reaches 30, 35, 40, 45, 50; the three gear crafts on those days; points on those days; a fighter's hours by kind
   (the pick, a need's kill, objective kills, forging, the free pass, the fallback); a worker's hours by tier. Under
   it one line from 024's base and the board: on which day of the season the accounts at places 1–10 stood at 30, 40
   and 45, as far as the kept reads show. No tuning after the table.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, `npm run check -- planner` once.
4. `CLAUDE.md`: the roles' paragraphs follow A and B. Commit `docs/rework.md` as `Rework notes` if it differs from
   `HEAD` (the planning chat's edits, as it stands), then everything else as `027e: level first`; push to
   `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game.
- No new dependencies. Do not edit `docs/rework.md`.
- Food is not changed here: D measures, the next task decides. The gold for fares is not touched either.
- If A or B needs more than an order of existing candidates (a new score, a new constant), say so and stop.
- The machine is strong: run the two roads and the gate side by side.
- Everything you write is in English.

## Report
`tasks/027e-level-first.report.md`, **at most about 120 lines**: Summary · Decisions for Alex · How Alex verifies · The
roads (the one table) · Where a fighter's seconds go · What was done / files · Notes. The combat levels first, the
points second. If the final tree's fighters are not higher than the starting tree's on days 7 and 14, say so first in
the Summary. No placeholders left in it.
