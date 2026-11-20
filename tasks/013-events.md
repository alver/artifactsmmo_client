# 013 — The fleet on events: who goes to a spawn, an event in the score, events in the forward model

## Goal
Since 07:31:51 UTC on 2026-11-20 the service runs report 012's code (run `[yewz]`; all five steps re-attached).
Report 012 moved the clock: the fighters reach combat 30 on days 10.6–13.2 instead of 41–64, and three event
monsters are at the fleet's level today (corrupted ogre 20, full moon vampire 24, bandit lizard 25; the fleet
stands at combat 22–25). Events are the one kind of work that cannot be made up later: a spawn is up for 60
minutes about once in 17–33 hours, the Strange and the Magic Apparition need 22 and 25 spawns with five
characters on each (`docs/design/achievement-map.md`, "What waits for a spawn"), and the season has about 96 days
left. Today the client loses every one of them, in three ways:

1. **One character per spawn, and often none.** `reactToEvents` gives a spawn to one character
   (`src/state/eventorders.ts`, `orderFor`; `src/plan/events.ts`, `fieldOrder`: the single fastest safe fighter or
   the highest skill). No monster or resource order was ever dispatched (audit G.5), and two monster events of
   2026-11-19 (18:12 and 18:52 UTC) got no `interrupt event` and no line that says why (`eventorders.ts` writes
   "nothing to do" to `eventPlans` only).
2. **An event is a wall in the score.** `bundleOf` (`src/plan/planner/bundle.ts`) counts an achievement behind a
   level gate only when every missing gate is a level or a win; one with an `event` gate is in no bundle. So
   nobody levels mining or woodcutting to 35 for the apparitions, or combat for an event monster, because of what
   is behind them — and a parent whose bill has an event material waits "for an event" (`gates.ts`,
   `outOfReach`). An event-gated objective is a candidate only if a decision happens to fall inside the hour its
   event is live (`decide.ts`, `rank()`; `floorH` prices one character's spawns).
3. **The forward model has no events** (`src/plan/planner/forward.ts`, the header: "events (none spawn)"), so the
   replay sees neither the 35 points that wait for an event nor the gear above 38 that event materials make.

This task puts every capable character on a spawn that pays, makes an event a priced part of the plan instead of
a wall, and lets the replay attend events by expectation.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 28–33; "Known and parked", the blocks of reports 004, 011
and 012); report 012 (all of it); `docs/design/planner.md` A.2, B.3, C.3, D.1, F.2; `docs/design/achievement-map.md`
("What waits for a spawn", the gates graph, H on events); the game's docs on events in `docs/`;
`public/data/events.json`; `src/plan/events.ts`, `src/state/eventorders.ts`, `src/state/events.ts`,
`src/state/sync.ts`, `src/state/planner.ts` (all of it; `worldOf`, `interrupt`, the tick); `src/plan/planner/*`
(all of it; `decide.ts`, `bundle.ts`, `gates.ts`, `targets.ts`, `supply.ts`, `gear.ts`, `forward.ts`, `reach.ts`,
`pick.ts` closely); `scripts/check-planner.mts`, `scripts/check-events.mts`, `scripts/harness/*`, the scenarios
`planner-merchant`, `planner-interrupt-offering`, `merchant-order`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to
  `logs/dev.log`. **Reading `logs/dev.log` is part of the task** (section 1): read it as a stream, don't copy it
  into the project.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Alex restarts only when the
  report exists. Write the report last, after the gate is green and the task commit is made; don't wait for more
  log after that. If the log shows a restart during your work, say in the Summary what code it loaded.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **What may change:** `src/plan/planner/*` (a new `events.ts` there); `src/state/eventorders.ts`; in
  `src/state/sync.ts` only the event poll; in `src/state/planner.ts` only what calls the new function, the log
  lines, and `worldOf` for settled point 9; `src/plan/events.ts` only as far as the owned characters stop using
  `fieldOrder`; `src/catalog/*` only to load from `events.json` what the atlas's `events` lack (duration,
  cooldown, tiles); `scripts/check-planner.mts`; new scenarios with what the harness needs for them; `CLAUDE.md`
  (the planner's section, the events paragraph, and the combat-training paragraph's gap rule).
  `src/state/queue.ts` and `src/state/exec.ts` **only** if the scenario of settled point 5 shows a step resuming
  in the trip's set or with the trip's drops in the bag, and then the smallest change, named in the report.
  **Not** `src/sim/*`, not `src/plan/bis.ts`, not the UI. No new queue item kind.
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about the log give the UTC time of a line.
- **No random numbers in the replay** and no fitted factor per event: a spawn is its expectation (settled point
  8), and a number that is measured is one number for its whole kind, with the samples printed.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-013-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`. If it changed again by the end, commit it again the same way before the task commit.
  2. At the end, `013: events`: this task file, the report and what the task changed.

## What is settled
1. **Event work has one writer: the event interrupt.** For every live spawn of a monster or resource event the
   core decides the members with one pure function (`src/plan/planner/events.ts`, `eventMembers(event, world)`);
   the runtime issues `interrupt(name, "event", items, eventKey)` for each member. The owned characters no longer
   go through `fieldOrder`. Merchants are untouched (settled point 10). **A target with an `event` gate is never
   a step**: `rank()` plans no objective step on it, live or not — its work is the interrupt's. Levelling or a
   `src:` gather that happens to pick a live event's tile (`pickMonster`, `pickNode`, `pickSource`, with `until`)
   stays as it is.
2. **A spawn counts when its content serves open demand**, in units:
   - an open `ach:` target whose work is to kill the event's monster (kills, or a drop of it) or to gather a drop
     of the event's node, not excluded by config;
   - what an open parent's bill is short of (the objective parents and the gear needs, as `rank()` builds them)
     for an item whose source is this content — an event-only material.
   XP alone is no demand. A spawn nobody needs is ignored, with a line in the log that says so.
3. **Who goes: every character that is on and**
   - meets the content's gate — a safe win from its pool by `safeWin` (the price of report 012), or the node's
     skill level. A boss is group work: nobody. The members are chosen one at a time, the one that brings the
     most units first, each on the pool less the sets of the members already chosen, so nobody is sent into a
     fight another member took the gear for;
   - reaches the live tile by a free route, with at least 15 minutes of the event left after the walk and the
     bank reset;
   - is not in a `group` interrupt and not on another live spawn's trip (two spawns at once: the demand with the
     better score takes its members first), and — after 22:00 UTC — has no open offering interrupt
     (`eventorders.ts`, `offeringFirst`, as today);
   - is still needed: members are added while the demand left is more than the members so far are expected to
     bring in the time left. A member's units: its usable seconds ÷ the seconds a unit, where a kill's seconds are
     the fight's own (fight, healing, walks — the potions are brewed before the trip as for any fight, and their
     price is paid outside the event's hour).
4. **An event with demand that can still pay goes before any step.** Work can be made up later, a spawn cannot.
   "Can still pay": the demand's achievement — for a material, the parent it is for — completes by the deadline
   at the event's calendar (settled point 7) with everybody on it who can ever be a member. A demand that cannot
   fit even so does not call anybody; the spawn's log line says "does not fit" with the spawns needed and the
   spawns expected by the deadline. No comparison with the score of the step underneath in this task; the replay
   (section 4) says whether events took time from better work.
5. **The trip.** `[bank reset and the set for the work, fight or gather with times 0, deposit-all]`. The work
   item ends by itself when the tile disappears, as today; the drops are in the bank before the step resumes;
   the step underneath resumes with its own set and its own bag. A scenario proves the resume; if the resumed
   item works in the trip's set, that is repaired by the smallest change.
6. **The poll and the log.** `GET /events/active` every 2 minutes while any event-gated demand is open (30 of
   the 2,000 data requests an hour), every 5 minutes otherwise. Every spawn of a monster or resource event gets
   one `plan: event …` line: the code, the tile, the demand (what, how many, for which achievement or parent),
   the members, and for every other owned character why not (gate, too far, offering, group, not needed, does
   not fit, nobody needs it).
7. **An event in the score is a calendar, not a wall.** One function gives the calendar of event work: the
   spawns needed (units ÷ (units a member brings a spawn × members)) × the mean time between spawns. It replaces
   `floorH` and is the one the runtime (settled point 4), the bundle, the bills and the forward model use.
   - `bundleOf`: an achievement whose missing gates are levels or wins of the lane and an `event` sits behind
     its level like any other; its own hours are the event work's character-hours; it fits when the road plus
     its calendar is inside the time left. The members of that calendar: the characters that are on and meet the
     gate at that level — the role holders of a gathering lane, the fighters whose pool wins safely at the
     bundle's level (`winLevel`).
   - A parent whose bill has an event material no longer waits "for an event": its hours include that
     material's calendar. `waitingOf` says "an event" only when nobody can ever be a member or it does not fit.
   - Gear by need for an event monster's kill is a need like any other; print what it asks for.
   - The mean time between spawns comes from the docs and `events.json` (the chance per minute, the duration,
     what `cooldown` means), checked against the spawns the log holds (section 1). The docs decide unless the
     log is clear.
8. **The forward model attends events by expectation.** No dice: every event code with open demand takes from
   each member (the rule of settled point 3 on the World of that moment, the spawn assumed live) the share of
   its time `usable seconds a spawn ÷ mean seconds between spawns`; the step under it takes that much longer;
   what the event work yields (kills, drops at their expected rates, XP, the potions drunk) is applied as a kill
   or gather step's is. Demand met, the share ends. The outlook's note "events are not simulated" goes. A config
   number `events` (1; 0 = no events, for the replay's anchor row only — default 1, not in the UI, never written
   as a patch) with the rules of `potionK`.
9. **Riding along, small:**
   - **What is in flight for an `ach:` target is what a running step still has to do**, not its whole size: the
     achievements read already counts what the step did. In the runtime's World only (`worldOf`); the forward
     model applies a step's progress at its end, so there the whole step stays in flight; `src:`, `mat:` and
     `gear:` keep the whole step (their stock arrives when it ends). Evidence: at 06:09:07 UTC on 11-20 First
     planned `ach:i_want_bacon:0@First#5` with 3 pigs while about 56 were open (Fourth's 55-pig step stood at
     47/55), and Fourth took the last 45 at 06:21:27.
   - `supply: supply:` in a supply step's why (`decide.ts`, both prefixes) becomes one.
   - `CLAUDE.md`'s combat-training paragraph states the gap rule of report 012.
10. **Not in this task:** merchants (the `merchant` interrupt and its wishlist stay); gems are never spent and no
    event is ever bought; a boss event (the duskworm) is group work; an event behind a toll or a key (the
    island's sea marauders and solar scorpions) has a `layer` gate and no member; potions as supply through the
    bank and food (the consumables round, next); keys, tolls and what is spent (the task after that). Still
    parked: a made piece in every fighter's pool; the tiny supply steps; a drop objective chunked in actions; a
    restart repeating one action; `initiative`; work (c).

## 1. Read-only: the night, and every spawn the log holds
From `2026-11-19T21:49:12Z` (where report 012 stopped) to the end of `logs/dev.log`; name every restart inside
(run id, time, what re-attached; 07:31:51 UTC on 11-20 is `[yewz]`, report 012's code). The same reader and caps
as report 012; **nothing found here is fixed in this task** except what settled point 9 names.
- Per character, the steps in order (time, key, answer, units planned and done, hours planned and taken; a
  `supply` step's parent), and every sample against its estimate. Achievements completed, with the time.
- Every `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`,
  `offering interrupt issued again`, `comes back at`, every lost fight: a defect, or as designed.
- **Report 012's acceptance step 7, from the first decisions after 07:31:51**: a miner's `src:diamond_stone`
  step and the node it names; a `lvl:mining:35` why; a combat level step's stated XP rate against what the log
  then shows; any `mat:`, `gear:` or trade step planned at 0.0 h.
- **Report 011's acceptance step 7**, if the log now exercises it: every `gear:` step's why, and whether a kill
  objective stands beside one character only.
- The diamond chain from 21:49 UTC to its end: stones found, what each miner did next, why the chain stopped or
  went on.
- The offerings of 00:05 UTC on 11-20: as report 011's table.
- **Every event spawn in the whole log** (the `⚡ <name> at (x, y) until HH:MM UTC` lines and the planner's
  `interrupt event` / `interrupt merchant` lines): per spawn — the code, the time, the tile, what the client did
  (who went, for how long, units done), and by settled points 2–4 on the fleet as it stood then: the demand, who
  would have gone, the units that would have brought. Then one table per event code: spawns seen over the log's
  span against the docs' expectation (settled point 7's check), and the character-hours and units lost.
- In at most six lines: what the log says the next task should fix first.

## 2. Who goes to a spawn
- **The function** (settled points 1–4): `eventMembers(event, world)` in `src/plan/planner/events.ts`, pure, with
  the demand and each character's verdict as data (the log line of settled point 6 is that data, printed).
  Where the runtime calls it (`src/state/eventorders.ts`, in place of `orderFor`'s monster and resource branch
  for owned characters) and what `eventPlans` holds afterwards. What happens to a spawn seen again at the next
  poll (idempotent per character and spawn, as `interrupt` is), and to a character that becomes capable or free
  of its offering while the spawn is still up.
- **The trip** (settled point 5): the items, the set (which solve, which price), what the trip reserves while it
  runs, and the resume — read `src/state/queue.ts` and `src/state/exec.ts` for what a resumed gather, fight or
  craft item finds (the set worn, the bag) and say it with `path:line`.
- **The poll** (settled point 6): where the interval is chosen; the request budget an hour in both states.
- **`rank()`** no longer plans a step on an event-gated target (settled point 1): where, and what an
  already-running step of that kind does after the restart (a persisted step from report 012's code).
- **Scenarios**: `event-fleet-monster` (three capable characters leave three different steps, fight until the
  tile disappears, bank the drops, resume their steps in their own sets; no bounce); `event-skips-unable` (one
  cannot win safely and stays, with its reason in the line); `event-too-far` (less than 15 minutes would be
  left: nobody goes); `event-resource-skill` (only the characters at the node's level go); `event-not-needed`
  (no open demand: nobody goes, one line); `event-enough` (demand of a few units: one member, not five);
  `event-late-offering` (after 22:00 UTC the offering goes first). Say what the fake had to learn.
- Made-up cases in `scripts/check-planner.mts` for `eventMembers`: the gear of the first member is not counted
  for the second; two spawns at once; a demand that is a material of a gear need; a demand that does not fit.

## 3. An event in the score
- **The calendar function** (settled point 7): where it lives, what it takes (the units, the content, the
  members, the World), and every caller with `path:line` — `rank()` (in place of `floorH`), `bundleOf`, the
  bills (`supply.ts`: `billOf`, `objectiveParents`; `gear.ts`), `waitingOf`, the runtime's "can still pay".
- **The mean time between spawns**: the docs' words with file and line, `events.json`'s fields, and section 1's
  table. One sentence: what the planner uses.
- **`bundleOf`**: the change, and what `unmetGates` / `outOfReach` do with an `event` gate now. A level candidate
  that carries an event achievement says so in its why ("… strange_miner behind it, by 22 spawns of Strange
  Apparition, about 30 days with three miners").
- Made-up cases: an event achievement behind a gathering level enters that lane's bundle for a role holder and
  for nobody else; with one member it does not fit and with three it does; an event monster's achievement
  behind a combat level by `winLevel`; a parent with an event material: its hours include the calendar, and it
  waits only when nobody can ever be a member.
- Print, on the fleet at the log's latest levels: per event code — the content and its gate, the open demand
  (objectives and materials, units), the members now and the members at the gate, the units a member brings a
  spawn, the spawns needed, the spawns expected by the deadline, the calendar days, fits or not. Then every
  level candidate whose bundle gained an event achievement, before and after (points, hours, score), and every
  parent that no longer waits for an event.

## 4. The forward model, and the replay
- **The model** (settled point 8), in `forward.ts`: where the share is taken, how the step under it stretches,
  what is credited and debited, and how it ends. Invariants stay green on every decision; add one: no
  character's event shares sum to more than its time.
- Rows: **A** the default (events attended); **B** potions free; **C** the field price always; **D** a win is
  enough; **E** no events (`events: 0`) — report 012's row A, and it must still end at 63: if it does not, say
  which other change of this task moved it.
- Per row, as report 012: the points on days 7, 14, 30, 60 and at the deadline; the day each fighter reaches
  combat 25 / 30 / 35 / 40; a gathering role at 35 and at 40; the hours by answer, with the event hours as their
  own line; gear made in eight days and to the deadline; the open points by what they wait for.
- For row A, per event code: the spawns expected to the deadline, the spawns attended and by how many members,
  the character-hours, the units gained, each achievement it completed with its day, each gear piece made from
  its materials — and the event demands that did not fit, with their numbers.
- **What the events cost**: A against E on days 7, 14, 30 and 60. If A is below E on any of them, name the
  event demand that took the hours and what it paid by the deadline.
- In at most ten lines: **what do events pay this season, which of them, from which day — and what is the next
  wall?** Say what combat level and which skills the paying events want and when the fleet has them; whether
  the gear above 38 comes into reach through event materials; and what row B says the consumables round is
  worth on top of events.

## 5. The small repairs
Settled point 9: for each, the change with `path:line`. For the in-flight units a scenario or a made-up case: two
characters on one kill objective, the second decides while the first is at 47 of 55 — it plans what is really
left.

## Out of scope
Everything of settled point 10; a comparison of an event with the step it interrupts; buying a spawn with gems;
the merchant's wishlist and every purchase; `src/sim/*`; the Roadmap, the outlook's layout and every UI; deleting
anything of the hive or the old event path for characters that are not owned; regenerating the atlas; everything
parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `013: events` on top of `Rework notes`; `git status` clean.
2. `npm run check` → the 52 checks of report 012 plus the new scenarios, all ok except `repeat-spin`; exit 0.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points a / b / c / d / e)`
   for the rows A default / B potions free / C the field price / D a win is enough / E no events, with E at 63,
   and prints the tables of sections 3 and 4.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. **After the restart** (the planning chat says when): the first spawn of a monster or resource event gets one
   `plan: event …` line with the demand, the members and every other character's reason; each member gets an
   `interrupt event`, works until the tile disappears, banks, and its step resumes; a spawn nobody needs gets
   its line and no interrupt. No step is planned on an event-gated target.

## Report
`tasks/013-events.report.md`, with these sections in this order:
- **Summary** — 4–8 lines: what the log's spawns would have paid under the new rule; the five deadline numbers
  against report 012's 63 / 70 / 56 / 65; then the answer of section 4's last point.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The night and the spawns** — section 1.
- **Who goes to a spawn** — section 2.
- **An event in the score** — section 3.
- **The replay** — section 4.
- **The small repairs** — section 5.
- **What was done / files** — per section 2–5: what, where (`path:line`); every command run.
- **Notes** — defects noticed and not touched; guesses in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
