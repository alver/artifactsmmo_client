# 010 — The live round: what a potion costs, a brake per target, offerings that catch up, the first hours read

## Goal
Since 2026-11-19 14:57 UTC the service runs report 009's core for all five characters. Three things of real play
are wrong or unknown, and this task takes exactly those:

1. **A fight with potions is priced as if potions were free.** Seen in `logs/dev.log` under 008's core, minutes
   before the restart: Second, Third and Fifth level combat on pigs with Small Health Potions; a batch of 16 lasts
   four to six fights (Second: brewed 14:50:42, fights at 14:53:17, 14:54:45, 14:55:42, 14:56:40, 14:57:35,
   14:58:34, picking sunflowers again from 14:59:19; Third: brewed 14:50:43, four fights, sunflowers again from
   14:58:53), and the next batch is ten minutes of sunflowers. About two thirds of such a step is brewing. The
   solver knows it: `killSeconds` (`src/plan/bis.ts`) prices a potion's heal at the rest rate and its comment says
   "upgrade to the real brew cost per proc if potion burn ever decides a set". It decides sets now.
2. **The brake counts every start.** Six short supply steps inside ten minutes block everything the character
   could do for 30 minutes (report 009, "silly things" 4).
3. **Offerings are issued once a day at 00:05 UTC and never caught up** (decision 24 of `docs/rework.md`); the
   panel's buttons are refused for an owned character and the panel shows a bracket the item will not take.

And the first hours of the chains in real play are in a 61 MB log nobody has read: section 1 reads them. **Its
findings are for the report; nothing found there is fixed in this task.**

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 17, 22, 24–27; "Known and parked"); report 009 ("The
replay", "Notes"); report 008 ("Notes"); `src/plan/bis.ts` (the header, `killSeconds`, `BisOptions`, the utility
group); `src/sim/combat.ts`, `src/sim/cost.ts`, `src/sim/types.ts` (the forecast: `hpRestored`, what a utility
does in a fight); `src/plan/consumables.ts` (`brewablePotions`, `gatherPays`); `src/plan/jobgear.ts`;
`src/state/exec.ts` (`provisionPotions`, `produceOnce`, `BREW_BATCH`, `desiredForJob`); `src/state/planner.ts`
(all of it); `src/state/queue.ts` (`scheduleOfferings`, `setOwnedOfferings`, `queueOfferings`, `refused`,
`runOffering`, `offeringPick`, `canObtainOffering`); `src/state/offerings.ts`; `src/ui/OfferingsPanel.tsx`;
`src/plan/planner/pick.ts`, `cost.ts`, `reach.ts`, `types.ts`; `scripts/check-planner.mts`;
`scripts/check-offering.mts`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to
  `logs/dev.log`. **Reading `logs/dev.log` is part of the task** (section 1): read it as a stream, don't copy it
  into the project.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **What may change:** `src/plan/bis.ts` (`killSeconds` and what it needs); `src/sim/*` only to make the forecast
  say what a fight consumes; one pure place for the potion's cost (say where and why there); `src/plan/planner/*`;
  `src/state/exec.ts` (the brew batch, section 2, nothing else); `src/state/planner.ts`; `src/state/queue.ts`
  (only what section 4 names); `src/ui/OfferingsPanel.tsx`; `scripts/check-planner.mts`; new scenarios with what
  the harness needs for them; `CLAUDE.md` (the planner's section). **No new queue item kind.**
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about the log give the UTC time of a line.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-010-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`. If it changed again by the end, commit it again the same way before the task commit.
  2. At the end, `010: live round`: this task file, the report and what the task changed.

## What is settled
1. **A consumed potion costs what it takes to make another.** Not the rest seconds of the HP it restored. The
   same number in the solver's objective, in the planner's prices and in the executor's choice of set — one
   function, no second opinion.
2. **Safe stays the first tier.** A potion that makes a win safe is still taken; it is only no longer cheap. The
   expected result: a fighter with a safe potion-free monster of nearly the same XP takes that one, and potions
   are drunk where they flip a win or truly pay.
3. **Potions are not a supply target yet.** The fighter that needs them brews them itself, as today
   (`provisionPotions`); with an honest price that is the same hours as another character brewing them. Whether
   potions should come through the bank in bulk is decided from this task's numbers.
4. **The brake is per target.** Different short steps in a row are work, not flapping.
5. **Offerings: the planner owns the trigger for its characters**, per character and day, and catches up.
   Nothing about brackets or skills changes (decision 24: the skills-to-10 idea is dropped).
6. Nothing of report 009's parked list is touched here: a made piece in every fighter's pool, a shared objective
   counted whole per fighter, the tiny supply steps themselves, `waitingOf`'s reasons. They cost hours, not days.

## 1. Read-only: the first hours of the chains
From the restart line `2026-11-19T14:57:11.661Z [fhnz] server start` to the end of `logs/dev.log` (if the service
was restarted again since, say so and cover every run). For the record also 09:15–14:57 UTC of that day (008's
core, all five from 09:25), shorter. Print in the report:
- **Per character, the steps in order**: time, key, answer (`objective` / `level` / `supply` / `filler` /
  `fallback`), units planned and done, hours planned and taken. Condense runs of the same target.
- **Every sample** against its estimate (`sample <key> … s (n=…, estimate … s)`), as a table sorted by
  measured ÷ estimate; every `slower than expected`.
- **Every** `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`,
  `re-attached`, `took over`, with the lines around it that explain it. For each: a defect, or as designed.
- **The chains**: every `src:`, `mat:` and `gear:` step — what it made, for which parent, how long it really
  took against the five seconds a craft the model has; every gear piece crafted and who equipped it first, how
  long after it reached the bank; a step that ended empty because another character had taken its materials.
- **Fights**: per character and monster — fights, losses (every lost fight with its time), every
  `not a safe win` and `lost 2 fights in a row`.
- **Where the time went**, per character, as shares of the period: fighting and resting; eating and cooking
  food; gathering for and brewing potions (count the batches, the potions, the fights each batch lasted);
  walking and bank resets; crafting; gathering as the step's own work; standing (a cooldown longer than the
  action's own, a queue stopped, an outage).
- **Offerings** on 11-19 and after: which interrupts were issued, what each completed, what was skipped and why.
- **Network errors** (`network error — retry`): how many an hour, and whether a step was lost to one.
- Then, in at most ten lines: **what the log says the next task should fix first.**

Also read-only, open since report 008: the Character tab shows "sim check: 200 fights · 44 win/loss
mispredicted". Say what `src/sim/validate.ts` counts, which way the 44 go (a predicted win that was lost, or the
other way), on which monsters, and whether it bears on "safe" (decision 25).

## 2. What a potion costs
- **The forecast says what a fight consumes.** For every utility in the set: the expected units used in one
  fight, as `simulate` models them (a restore potion per proc; say what a boost potion does — once a fight, or
  not consumed). If the forecast does not carry it, add it; say what `hpRestored` was counting.
- **`potionSec(code)`**: the seconds to make one more unit. For a craftable utility: its ingredients' field
  seconds (a gathered one as `gatherPays` in `consumables.ts` prices it: quantity × the drop's rate × the
  node's gather seconds; a dropped or crafted one: say what you took, one level deep is enough) plus the craft,
  over the recipe's quantity. For a utility with no recipe: today's price (the rest seconds of what it heals),
  marked as a floor. One pure function in one place both `bis.ts` and the planner's core can import.
- **`killSeconds`** counts the fight, the rest for the HP really missing at its end, and
  Σ units used × `potionSec`. The header of `bis.ts` names two traps of earlier objectives (the fire staff over
  the iron sword against a cow; body armor stripped because a potion pins the end-of-fight HP): show both cases
  before and after, and keep them right. Rewrite the header's point 3 to say what the objective is now.
- **The brew batch** (`BREW_BATCH`, `exec.ts`): its comment says one potion fires per fight at most; for a
  restore potion that is wrong (16 lasted four to six fights). The batch becomes what the item's remaining
  fights will drink by the forecast, at most 45 units (a guess: three of today's batches), still capped by
  `produceOnce` as today. Nothing else of `exec.ts` changes.
- **The planner's prices follow by themselves** if `unitSec` / `actionSec` / `killSec` go through
  `killSeconds`; say where each does (`cost.ts`, `gear.ts`, `supply.ts`, `reach.ts`) and fix the one that does
  not. The planner's solves see the potions the bank holds; the executor's also the brewable ones
  (`brewablePotions`). Say whether the two can now disagree about the set of a planned fight, and what happens
  in the queue when they do (the `fight` item solves again each round).
- **Print**, on the 2026-11-18 snapshot and on the characters as the log's last lines show them (levels and
  worn gear from the log, no request): per fighter, the XP monsters with kill seconds before and after, the
  units of each potion a fight drinks, the pick before and after. Against the log: the measured seconds per pig
  fight including brewing (section 1) next to the new estimate.
- **The replay** runs as it is (four rows). Report the deadline points against 56 / 56 / 56 / 59, the day each
  fighter reaches combat 25 / 30 / 35 against report 009's, and the share of all fight hours that is potion
  making. The forward model still does not keep potion stock; with the price in the kill it no longer has to —
  change its note in `outlook()`.

## 3. The brake, per target
In `start()` (`src/state/planner.ts`):
- A start is recorded with its target. When the step just decided has a target this character already started
  `BRAKE_N` (6) times inside `BRAKE_WINDOW`, **that target** is blocked for this character for `BRAKE_HOLD`
  with the reason `flapping`, one dev-log line names it, and the decision is made again — at most three times in
  one `start()`; then whatever comes is taken.
- A ceiling stays for what nobody foresaw: 20 starts of any kind inside the window block every candidate, as
  today.
- `fallback()` honours a blocked `fallback:<skill>` since 009; a flapping fallback is braked by the same rule.
- Scenario `planner-brake-target`: seven short supply steps of seven different targets inside ten virtual
  minutes run without a `flapping` line; a target whose step ends at once with units done, six times running,
  is blocked on the seventh start, and the character takes something else in the same `start()`.
- The scenario of report 008 that shows the brake stays green; if it asserted "everything is blocked", say what
  it asserts now.

## 4. Offerings
- **Catch-up.** The planner's state keeps, per owned character, the offerings day (the most recent 00:05 UTC)
  for which an offering interrupt was issued. A character without one for today gets it: at the daily trigger
  (as today), at boot, when it is switched on, and on the five-minute tick. So a service that was down at 00:05,
  a queue that stood stopped, or a character switched on at noon loses nothing.
- **A removed interrupt comes back.** When `tick()` removes an offering interrupt because it paused (report
  008's note: a 598 at the altar), it is issued again an hour later, at most three times that day; the dev log
  says so each time.
- **An offering item with nothing left to do must end at once and quietly** (it does: `runOffering`,
  `!work.length`); show in the scenario that a catch-up on a finished day costs one item and no walk.
- **The panel** (`src/ui/OfferingsPanel.tsx`): for an owned character "＋ Queue" and "＋ Queue for all" issue the
  planner's interrupt instead of being refused (`queueOfferings` → the owned hook, before `refused`); the
  altar drawer's button likewise. Each open category shows **the bracket the item will take**
  (`offeringPick`): its requirement, with "lower bracket" when it is not the character's own, and "nothing
  completable today" when there is none. If `offeringPick` cannot run in the tab as it is, say why and show
  what the server computed.
- **An active favor counts.** A favor accepted today gives its target × `xp_multiplier` XP (and
  × `drop_multiplier` drops) until the reset. `World` gets the favors per character (from the offerings cache,
  in `worldOf`; with the time they end); `pickMonster` and `pickNode` multiply the XP of a favored target for
  that character while it lasts. Drops: only where it is one line (`perOf` of a favored kill or gather);
  otherwise under "Notes". The forward model ignores favors. Say, from the docs in `docs/` and the panel's own
  text, whether a favor lasts after its offering is completed; if the docs do not say, take "until the reset"
  and mark it as a guess.
- Scenario `planner-offering-catchup`: the day's marker is written, offerings are open, no interrupt was issued:
  each owned character gets exactly one; a second tick issues none; a paused one is removed and issued again
  after an hour.

## Out of scope
Everything of settled point 6; potions as supply through the bank; keys, tolls and `has_item` transitions;
spending of any kind (tasks coins on an objective's material is the next task's); the `use` objectives; events;
the Roadmap, the outlook and every UI but the offerings panel; deleting anything of the hive; `initiative` in
the simulator; food (`provisionFood`, `foodKeep`) — but its share of the time is printed in section 1;
regenerating the atlas; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `010: live round` on top of `Rework notes`; `git status` clean.
2. `npm run check` → the 50 checks of report 009 plus `planner-brake-target` and `planner-offering-catchup`, all
   ok except `repeat-spin`; exit 0.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points a / b / c / d)`
   and prints the potion table of section 2.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. **After the restart** (the planning chat says when): within an hour no fighter picks sunflowers inside a
   fight step unless the step's `why` names a monster it cannot win safely without the potion; `flapping` appears
   only with one target named; the next 00:05 UTC shows five `interrupt offering` lines.

## Report
`tasks/010-live-round.report.md`, with these sections in this order:
- **Summary** — 3–6 lines: what the log says first, then the four deadline numbers against 56 / 56 / 56 / 59.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The first hours** — section 1, in its order, ending with the ten lines on what to fix first.
- **What a potion costs** — the tables of section 2, what changed in the picks and in the replay, the two traps.
- **What was done / files** — per section 2–4: what, where (`path:line`); every command run.
- **Notes** — defects noticed and not touched; whether potions should become supply through the bank, with the
  hours it would save by the numbers above; guesses in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
