# 012 — The prices round: what a fight gives and takes, stock is free, the node of a gather, a gated craft in a chain

## Goal
Since about 20:05 UTC on 2026-11-19 the service runs report 011's code (run `[50ry]`). Report 011 left four prices
that are wrong the same way everywhere, and each of them costs hours of real play or days of the forecast:

1. **The fight-XP formula reads about two thirds of the real XP** (`src/plan/xp.ts` `fightXp`: a skeleton at combat
   23 gives 24 by the formula, 38 in the log before the favor, 57 with it). Every XP-per-hour pick, every level
   estimate and "the pig gives nothing from 29" lean on it.
2. **A kill is priced at about twice its real time** (skeleton 127–143 s against 59–67 s measured, pig 107–117 s
   against 84 s; `killSeconds` in `src/plan/bis.ts`, `KILL_LOG` in `src/plan/planner/config.ts`), and a craft or
   trade step at 5 s a run against 13–23 s (`CRAFT_SEC`). A measured monster therefore beats every unmeasured
   one by a factor that is not there.
3. **A potion is priced as if every ingredient were gathered for it** (`potionSec`, `src/plan/xp.ts`), while the
   bank holds 2,099 algae and the executor brews from the bank first (`src/plan/consumables.ts`
   `brewablePotions`). 78% of a minor health potion's price is that algae; at this price the fighters reach
   combat 30 on days 41–64, with free potions on days 13–22 (report 011, "The replay").
4. **A `src:` gather goes to one node for everyone, chosen by seconds alone** (`src/plan/planner/targets.ts`,
   `fieldSource`: the least `gatherSec × perUnit`, memoised for good), **and a chain's own gated craft is neither
   tested nor priced** (`src/plan/planner/supply.ts`, `objectiveParents` and `billOf`). Live since 17:53 UTC: up
   to four of five characters mine copper (0 mining XP, ore nobody asks for) for the diamond stones of
   `diamond_in_the_sky`, whose diamond recipe wants mining 35 while the miners stand at 22–24. Coal drops the
   stone at the same rate with about 2,060 mining XP an hour — XP toward that very gate.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 28–31; "Known and parked", the blocks of reports 010 and
011); report 011 (all of it); `src/plan/xp.ts`, `src/sim/cost.ts`, `src/plan/bis.ts` (the header, `killSeconds`,
`BisOptions`), `src/plan/consumables.ts`, `src/plan/jobgear.ts` (every call of `bestInSlot` and `killSeconds`);
`src/plan/planner/*` (all of it; `decide.ts`, `supply.ts`, `targets.ts`, `cost.ts`, `pick.ts`, `reach.ts`,
`forward.ts`, `stock.ts` closely); `src/sim/combat.ts` (`simulate`, `used`), `src/sim/validate.ts`;
`scripts/check-planner.mts`; the game's docs in `docs/` on combat XP, cooldowns and rest.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to
  `logs/dev.log`. **Reading `logs/dev.log` is part of the task** (sections 1–3): read it as a stream, don't copy
  it into the project.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Alex restarts only when the
  report exists. Write the report last, after the gate is green and the task commit is made; don't wait for more
  log after that. If the log shows a restart during your work, say in the Summary what code it loaded.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **What may change:** `src/plan/planner/*`; `src/plan/xp.ts`; `src/sim/cost.ts`; in `src/plan/bis.ts` only
  `killSeconds`, its price seam and the header's text; in `src/plan/jobgear.ts` only what passes the potion's
  price to the solves it already makes; `src/plan/consumables.ts` only if section 3's verdict changes
  `restSeconds`' meaning for `gatherPays`; `scripts/check-planner.mts`; new scenarios with what the harness
  needs for them; `CLAUDE.md` (the planner's section and the gear-model paragraph). **Not** `src/state/*`, not
  `src/sim/combat.ts`, not the UI. No new queue item kind.
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about the log give the UTC time of a line.
- **No fitted factor per monster, per item or per character.** A price is repaired at its cause; a factor that
  stays is one number for its whole kind, measured over every sample of that kind, with the samples printed.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-012-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`. If it changed again by the end, commit it again the same way before the task commit.
  2. At the end, `012: prices round`: this task file, the report and what the task changed.

## What is settled
1. **Fight XP is repaired at its cause.** The candidates: the wisdom of the set worn is not counted (`fightXp`
   has the parameter; the planner never passes it); the level-gap rule is read wrongly (where × 0.7 starts,
   where zero starts); the base formula. The docs and the log decide. If wisdom is part of it, the planner's XP
   uses the wisdom of the set it plans the fight with; the solver's objective stays seconds per kill.
2. **A kill's seconds are repaired at their cause, then measured once.** Decompose the factor of two on real
   fights: the fight's cooldown against `fightSec(turns)`, the turns forecast against the turns fought, the
   healing after a fight (food eaten, then rest) against `restSeconds`, the walks, `KILL_LOG`. Repair what is
   wrong against the docs and the log (the fight's cooldown; rest is 1 second per 1% of max HP missing, minimum
   3 s, by the docs — `src/sim/cost.ts` says 5 HP a second). Only then `KILL_LOG`: one number, the median of
   measured ÷ estimate over every kill step of the planner's era, kept only if it is outside 0.9–1.1.
3. **Food is not modelled in this task.** The fighters heal with food first and food takes 9–21% of their time
   (report 011). This task prints what healing really cost a fight, the food's own making included, against
   what the price assumes; the planning chat decides from that.
4. **A step has a fixed cost.** A craft, trade or gear step is a bank reset, a walk to the workshop or the trader
   and a deposit before any run: priced from the routes the core already knows (`bankSec`, `travel`), once a
   step, in the step's hours and in a bill's hours (once per `mat:` leaf and per gear piece code). `CRAFT_SEC`
   stays the cooldown of a run.
5. **Stock is free; what the stock does not cover costs the field price.** An ingredient of a potion costs
   nothing while the bank (less the others' reservations and the floors, `stock.ts`) holds at least 100 runs of
   it — the shortcut `pickRecipe` already uses — and its field seconds otherwise; all or nothing per ingredient.
   This holds for every ingredient, by-product or not: nobody gathers an ingredient for stock, so what is in the
   bank is spent already. **One function** gives the price to the solver's objective, the planner's prices and
   the executor's solves (the executor passes the bank it is given). The solve caches are keyed on the price.
6. **The forward model drinks.** A fight step's potions (the forecast's `used` × its kills) leave the bank when
   the step ends: the brewed potion first if the bank holds it, then its ingredients; never below zero. So the
   stock runs out in the replay as it will in play, and the price returns to the field's.
7. **The node of a `src:` gather is chosen per character.** Among the nodes that drop the code, exist now and
   whose gates the character meets: the least **net** seconds per item — the gather's seconds per item × (1 −
   the XP share), where the XP share is the node's XP per second over that of the character's best XP node of
   the lane (`pickNode`), at most 1, and counts only when the character holds that lane's role
   (`rolesFor`). A specialist's level is wanted anyway, so a gather that is also its levelling work costs nothing
   extra. `sourceFor` stays the static answer for gates, inputs and bills. In-flight accounting stays right when
   two characters gather one code at nodes of different rates.
8. **A gated craft in a chain is priced and carried.** A `mat:` leaf whose level no character that may craft it
   meets: the parent's hours include the hours to that level for the character that gets there first
   (`hoursToLevel`; ∞ → the parent waits and `waitingOf` says for what), and the level is a level candidate for
   the holders of that lane's role, carrying the parent's score — as a crafter's missing level does for a gear
   piece today (`decide.ts`, the `levelCand` call under "Gear by need").
9. Still parked, not touched: a made piece in every fighter's pool; the tiny supply steps (settled point 4
   prices them, nothing merges them); the offering's hunt; `initiative`; work (c); banked potions worn on fights
   that drink none; the deposit→restock bounce; an objective's own craft step in flight; the brew batch.

## 1. Read-only: the hours since 19:34 UTC
From `2026-11-19T19:34:46Z` (where report 011 stopped) to the end of `logs/dev.log`; name every restart inside
(run id, time, what re-attached). Short — the same reader and caps as report 011, **nothing found here is fixed
in this task**:
- Per character, the steps in order (time, key, answer, units planned and done, hours planned and taken; a
  `supply` step's parent), and every sample against its estimate.
- Every `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`,
  `offering interrupt issued again`, `comes back at`: a defect, or as designed.
- **Task 011's acceptance step 7, from the first decision after the restart**: every `gear:` step's `why` — does
  a kill objective stand beside one character only? Every `supply` step whose parent is a gear piece for a kill
  objective: was another character's step on that objective running and covering what was left? Every step
  whose `why` begins `filler (`.
- The diamond chain to its end: who mined where, gathers and hours per character, stones found, what each did
  next, and what the chain does once the stones are there.
- The offerings of 00:05 UTC on 11-20, if the log has them: as report 011's table.
- In at most six lines: what the log says the next task should fix first.

## 2. What a fight gives
- **The evidence.** Every won fight of `logs/dev.log` since 2026-11-19 09:15 UTC with its `+N xp`: per character
  and monster, the character's combat level at the time (the snapshot's XP plus the logged XP, as report 011
  did), the level gap, whether a favor was active on the monster, the wisdom of the set worn as far as the equip
  lines show it (say what the 200-character cut hides), and the XP — against `fightXp` as the planner calls it.
  One table, a row per (monster, gap, favor), with the count of fights.
- **The docs**: what `docs/` says about combat XP, the gap penalty and wisdom, quoted with the file and line.
- **The verdict**, with the numbers: which of settled point 1's candidates, or which combination. A level gap
  the log does not contain (10 and more above a monster: the blue slimes at 0 XP are one) is said to be covered
  or not.
- **The repair**, at the cause. If wisdom: where the planner now takes it from (`pickMonster`, `roadRate`,
  `gear.ts`'s `h1`, `forward.ts`'s `field`), and what the level-up of a character means for it.
- Print, as report 011's "Per fighter, before and after", on the 2026-11-18 snapshot and on the fleet at the
  log's latest levels: the XP monsters with XP a kill and XP an hour before and after this section, and the pick.
  Say at which level the pig stops giving XP, by the repaired formula.

## 3. What a fight and a step take
- **The evidence**, on the planner's kill steps since 2026-11-19 16:22 UTC (skeletons, pigs, flying snakes, blue
  slimes; name the steps): per step — the mean seconds between a fight and the next action (its cooldown), the
  turns if the log carries them, the food eaten and the rest taken after a fight (count, HP, seconds), the bank
  trips and cooking inside the step, the step's seconds a kill; and beside it what the estimate assumed for each
  part: `fightSec(turns)` of the forecast, `restSeconds` of the HP lost, `killWalk`, `KILL_LOG`.
- **The verdict**: where the factor of two sits, part by part, and what the docs say about a fight's cooldown
  and about rest. Repair the parts that are wrong (settled point 2). `restSeconds` is also read by
  `consumables.ts` `gatherPays` and by the solver's objective: say what the repair changes there.
- **`KILL_LOG` afterwards**: every kill sample of the planner's era against the repaired estimate, sorted by the
  ratio; the median; the number that stays, or none.
- **Healing as it is** (settled point 3, read-only): per fighter, the seconds a fight's healing really took
  (eating and resting) and the food's own cost a fight (the fishing, hunting for it and cooking inside the
  steps ÷ fights), against the rest the price assumes. One table and three lines: is "healing is rest" within
  15% of what healing costs?
- **A step's fixed cost** (settled point 4): the `mat:` and `gear:` steps of the log (planned 0.0 h, taken 1–11
  minutes) against the new price; where it enters (`planMake`, the gear and supply plans of `rank()`, `billOf`,
  `makeHours`), with `path:line`.
- **The two traps of `bis.ts`'s header** stay shut: print both before and after, as reports 010 and 011 did.
- Made-up cases in `scripts/check-planner.mts` for whatever formula changed.

## 4. Stock is free
- **The function** (settled point 5), in `src/plan/xp.ts` beside `potionSec`: a potion's price given what the
  bank covers. `potionSec` stays the field price. The core's seam is `reach.ts` `potionPrice(world)`; the
  executor's solves are in `src/plan/jobgear.ts` — list every call that today takes the default price and what
  it passes now (`path:line`). Say what the executor's forecast gate does with it, if anything.
- **`config.potionK`** stays a factor for the replay's rows only; if the "field price always" row needs a second
  knob, it is one more config number with the same rules (default off, not in the UI, never written as a patch).
- **The caches**: `fightRec` and `planRec` are keyed on `potionK` today; they must be keyed on what the price is
  (which ingredients are covered). Say what that does to the solve count of the first week inside
  `npm run check`.
- **The forward model** (settled point 6), in `forward.ts` `advance`: what a kill step debits; the outlook's
  notes follow.
- Made-up cases: a potion whose ingredient the bank covers → free ingredient, the pick takes the potion fight;
  the same with 99 runs in the bank → the field price; a stock that the others' steps reserved does not count;
  a forward run that starts covered and ends at the field price once the stock is drunk.
- Print: report 011's by-product table again with a column "covered now" for the snapshot and for the log's
  latest bank as far as the log shows it; per fighter at combat 25, 28, 30 and 35 the pick, kill seconds and
  potions a fight with the price covered and at the field's.

## 5. The node of a gather, and a gated craft in a chain
- **The node** (settled point 7): where it is chosen now (`rank()`'s `src` branch takes the leaf's work as
  `sourceFor` gave it) and where after. The step's `why` names the node and, when the XP share decided, says so
  ("coal rocks: 21 mining XP a gather, the lane's best"). `fleetSec` and the bill keep pricing the leaf by the
  static source unless that is wrong by more than the XP share explains — say which.
- **Kills as a source** (a drop hunted by `src:`): the same rule with combat XP if it is the same few lines
  (the fighter's XP share against `pickMonster`); otherwise under "Notes" with what it would have changed for
  the 150 blue slimes of 17:30 UTC.
- **Read-only**: what the ore of the chosen node is worth — for the diamond chain, the coal the steel chains of
  the open bills are short of against the coal 42 hours at the coal rocks bring. No credit for it in this task.
- **The gate** (settled point 8): in `billOf` / `objectiveParents` and in `rank()`; `waitingOf`'s word for a
  parent that waits for such a level.
- Made-up cases: a miner with the role and a code dropped at an XP node and at a no-XP node of the same rate →
  the XP node; a character without the role → the cheaper node; two characters at nodes of different rates and
  what is short for the third; a chain whose `mat:` craft wants a level nobody has → the parent's hours include
  the road, the role holder gets the level candidate, and with no XP source to that level the parent waits.
- Print, on the fleet at the log's latest levels: for `diamond_in_the_sky` the chain before and after (hours,
  the node per character, the level candidate and its score), and every other open parent whose chain has a
  gated craft.

## 6. The replay
- Rows: **A** the default (stock is free, the forward model drinks); **B** potions free (report 011's row C:
  the upper bound); **C** the field price always (report 011's row A with sections 2, 3 and 5: the lower
  bound); **D** a win is enough, on A's price.
- Per row, as report 011: the points on days 7, 14, 30, 60 and at the deadline; the day each fighter reaches
  combat 25 / 30 / 35 / 40; a gathering role at 40; the share of all fight hours that is potion making; the
  hours by answer; gear made in eight days and to the deadline; the open points by what they wait for.
- For row A: the bank's algae, sunflowers and every other potion ingredient the fights drank, day by day at
  days 0, 7, 14, 30, 60 and the deadline (stock, drunk so far, made on the way so far) — and the day each runs
  out, if it does.
- For row A, per fighter at combat 25, 28, 30 and 35 (or the highest it reaches): the pick, kill seconds, XP a
  kill, potions a fight and whether they were covered.
- **Which section moved what**: from the per-fighter tables of sections 2–4 (the pick's XP an hour on the
  snapshot before and after each section), say in at most eight lines how much of the change in "the day the
  fighters reach 30" is the XP formula, the kill seconds, and the stock.
- In at most ten lines: **when does the fleet reach an event (the fighters at 30) and a layer (a gathering
  specialist at 40) now, and what is the next wall?** If A lands on C, say what the 2,099 algae bought and what
  would have to be true for potions to be cheap (who would fish for algae, at what price a potion).

## Out of scope
Everything of settled point 9; a model of food (settled point 3); a credit for a node's other drops; potions as
supply through the bank; `src/sim/combat.ts`; `src/state/*`; keys, tolls and `has_item` transitions; spending of
any kind; the `use` objectives; events; the Roadmap, the outlook and every UI; deleting anything of the hive;
regenerating the atlas; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `012: prices round` on top of `Rework notes`; `git status` clean.
2. `npm run check` → the 52 checks of report 011 plus any new scenario, all ok except `repeat-spin`; exit 0.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points a / b / c / d)`
   for the rows A default / B potions free / C the field price / D a win is enough, and prints the tables of
   sections 2–6.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. **After the restart** (the planning chat says when): a `src:` gather step of a character with the lane's role
   names a node that gives it XP when one drops the code; a level step's `why` states an XP rate within 15% of
   what the log then shows; no `mat:` or `gear:` step is planned at 0.0 h.

## Report
`tasks/012-prices.report.md`, with these sections in this order:
- **Summary** — 4–8 lines: the verdicts of sections 2 and 3 first, then the four deadline numbers against report
  011's 56 / 56 / 56 / 59, then the answer of section 6's last point.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The hours since 19:34** — section 1.
- **What a fight gives** — section 2.
- **What a fight and a step take** — section 3.
- **Stock is free** — section 4.
- **The node and the gate** — section 5.
- **The replay** — section 6.
- **What was done / files** — per section 2–6: what, where (`path:line`); every command run.
- **Notes** — defects noticed and not touched; guesses in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
