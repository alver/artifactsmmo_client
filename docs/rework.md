# Rework — goal, decisions, state

The state of the rework, for a planning chat that starts fresh. Kept by the planning chat (Claude in the desktop
app, with Alex); Claude Code reads it when a task says so and does not edit it.

Last updated: 2026-11-19 (evening), after report 010 was accepted — the service runs its code since 16:22 UTC — and
task 011 was written.

## The goal (Alex, 2026-11-18)
- **The client plays the season by itself.** Alex's target is every achievement of the season: 210 achievement
  points, which unlocks the last free reward, the Season 9 Gold badge. Member-only rewards don't matter.
- **What task 004 found, and how far it is believed.** By the map, 210 does not fit this season and about 100
  points do (working deadline 2027-02-24); left as it is, the client ends near 30. The account stood at 15 / 210 on
  2026-11-18. The first half of that is solid, the ceiling is not: the game gives a badge to the first account that
  reaches 210, so accounts are expected to get there, and a map that needs 117 weeks for it is wrong somewhere
  (Alex's objection, 2026-11-18). Task 005 checks the map against the leaderboard. **The working target is the most
  points by the season's end**: the planner does not aim at a number, it works down the list by points per hour and
  goes as far as the season lets it. Alex: this is the first season he plays seriously, more will surface on the
  way, and he has nothing to decide while the aim is "as far as it goes, automatically".
- **What task 005 found (2026-11-18).** The ceiling was the atlas's crafting hours, and they are wrong by more than
  ten times: the leader (`uaprsf`, a member) has five characters at combat 40–42 and one crafter at 40 / 41 / 35
  after at most 16–26 days. For this fleet the design expects **105–135 points by 2027-02-24, most likely about
  120**: bronze (105) likely, silver (158) only if everything goes right, gold (210) not this season — 27 points
  need raids, the Corrupted Portal alone takes 89 days from combat 45, and the leader holds 59 after a fifth of the
  season. The working target does not change: the most points by the season's end.
- **What task 007 found (2026-11-18).** The rule, run for the first time: the first week 15 → 31 points (the
  design expected 27). To the deadline **54 in all three rows, not 68–87**. The cause is not the rule: no gear is
  made, and the bank's gear gives no safe XP monster above combat 25 (First 29), so from about day 20 half or more
  of all hours are the fallback gather. The design's 68 came from a scratch model that fought with the atlas's
  plus set — gear nobody makes in stage 1. **The planner without gear by need is a gathering planner.** 54 is
  still nearly twice what the client reaches as it is (about 30). The expectation of 105–135 stands on the
  abilities to come and has no replay behind it until gear is in the core (task 009).
- **What task 009 found (2026-11-19).** With gear by need and supply through the bank the replay ends at **56
  (the three crafting prices alike), 59 when a win is enough** — against 54. The first week 15 → 33, 44 by day
  14; 67 pieces are made in the first eight days; every fighter is at combat 38 by day 33 — and there the fleet
  stops again: above 38 nothing craftable flips a monster (the pieces need tasks-coin crystals, event materials
  or a boss; coins turned into crystals up front change nothing), and from day 33 on 47% of all hours are the
  fallback gather. The 154 open points wait for: another layer 67, an event 35, gear above 38 15, `use` 10,
  unhandled 10, a raid 8, filler 6, a group 3. **56 is what the code that exists earns, not a forecast**: the
  forward model has no events and no keyed or paid transitions, so it sees neither the 102 points behind them
  nor the gear that event materials give. The expectation of 105–135 still has no replay behind it. What the
  replay does say is where the next points are: layers and events, not more of the core (decision 26).
- **What task 010 found (2026-11-19).** In real play potions were the dearest thing: 32–55% of the potion
  fighters' time went into brewing. Priced at what making another costs, four of five fighters leave potion
  fights at once, and live they did. The replay then ends at **49 / 49 / 49 / 52, against 56 / 56 / 56 / 59** and
  puts combat 35 on days 86–96 instead of 23–31. **Neither number is believed yet**: the 7 points are rule 4
  letting a road that fits no deadline outrank filler that fits (decision 28), and the slow combat rests on a
  forecast that drinks twice the potions the log shows and on by-products priced as if gathered for themselves.
  Task 011 calibrates both; until its replay is read, "the fighters reach 30 around day 17" (decision 26) is
  open again.
- **One planner decides what the fleet does next and moves on by itself** — "the roadmap". Alex at most adjusts
  priorities, and doubts there is much to adjust.
- **No manual queues in the UI.** Alex hardly used them; if something has to be done by hand, the planner is wrong
  and gets fixed there.
- **Nothing of the hive is needed** once the roadmap advances on its own: no craft orders, no earn-gold, no
  achievement goals as features of their own.
- Alex's words: feel free to rework the whole solution and to remove functionality.

## How we work
- Planning happens in the desktop chat; work happens in Claude Code. One topic per chat; each report is discussed in
  a new chat.
- The planning chat writes task files straight into `tasks/` (it has file access to this project and to
  `G:\alex\hub`). Claude Code executes one task and writes `tasks/NNN-name.report.md`; the report is discussed in the
  chat; then the next task is written. Tasks, reports, docs, code and commits are in English.
- **Alex is asked only what is his to decide**: what the game is played for, what is spent, what is deleted for
  good. Technical choices and estimates are settled in the planning chat and recorded here; a report's "Decisions for
  Alex" that are not his get their default.
- Rules that go into every task file (a "workflow" section in `CLAUDE.md` is postponed until the rules for working
  next to the live service are settled):
  - only `G:\alex\projects\artifactsmmo\` is changed; `D:\Temp` and the session scratch directory are free for
    scratch files; files inside the project may be deleted when the work calls for it;
  - the real service is running and playing: no start, stop or restart; no `npm run build` into `dist/`; no request
    to the game or to the local service unless the task says so;
  - no new dependencies unless the task lists them;
  - Claude Code makes every commit (leftovers included), locally, no push; one task at a time; it never writes the
    next task;
  - the report sections: Summary · Decisions for Alex · How Alex verifies · What was done / files · Notes ·
    To delete (Alex).
- **Alex restarts the service himself (`npm start`). The planning chat tells him when** — after a task that changes
  the engine is accepted.
- The planning chat tells Alex when it is time to start a new chat.
- Nothing is handed to Alex to do by hand except what only he can do in the game's UI.

## Decisions so far
1. **No rewrite from scratch.** The foundation is kept (API client, catalog, simulator, gear solver, server/tab
   split, the item executor); what sits above it is redesigned. Evidence: `docs/audit/code-audit.md`.
2. **A harness before any change** (done, task 002).
3. **The hive is replaced, not repaired**, by a planner driven by the roadmap. It becomes the only writer of the
   queues, so "who owns the head of a queue" (audit B) and "whose stock is this" (audit D) are designed into it
   instead of being patched onto eight writers.
4. **Small defects of features that may disappear are not fixed** (🔁 spin, double "Train pins", "Fleet helps"
   ordering, `prepare` lost at restart). Defects of the executor are fixed (task 003).
5. **Report 003, decisions 1–3: A each** (the defaults; the code already does this). The gear swap still banks a
   replaced gear piece at once; "make room" covers a strip, a withdrawal and a bag change; `brewKeep` and `foodKeep`
   stay. Their fate is settled by the planner's stock reservations, not before.
6. **Facts before design.** The planner's design waits for the achievement map (task 004). Done.
7. **Report 004 accepted (2026-11-18); its decisions 1–3: A each.** The target is the most points by the season's
   end; the order is open (decision 11). The working deadline is 2027-02-24 (the API's start date
   2026-10-24 plus the docs' "approximately 4 months"). Raids are out of the planner's first scope: 27 points, all
   behind combat 45–50, none of them in reach this season; the design only must not rule them out.
8. **How far the map's verdict can be trusted** (checked in the chat against sections E–H):
   - **The ceiling is not established.** The map's 85,600 character-hours for the whole road cannot be right for
     the game as designed: a first-to-210 badge exists. 77,000 of those hours sit in the 27 steps past combat 40, and
     they are the atlas's levelling and crafting hours (H.11, H.12) under the model's dearest assumption (H.10). The
     event floors (the Corrupted Portal: 64 spawns, 89 days) rest on guessed kill times and ignore spawns bought
     with gems. Until the leaderboard has been read (task 005), neither "210 is out" nor "silver is out" is a
     fact for this account; they are the map's reading.
   - "About 100" is the solid part: the first 44 steps of the order cost 8,300 character-hours of the 10,200 the
     season holds, and they are gathering, refining, tasks, recycling and fights up to level 32, priced by the docs'
     formula and the log.
   - Beyond that the numbers are soft. +4 points (bronze, 105) sit behind 3,000 hours of levelling to combat 40 and
     +10 more behind another 4,200; those hours are the atlas's `craftTrain`, which looks too high above skill 40
     (map H.12), and the model levels all five characters and three gear crafting skills per band (H.10). If the
     atlas is two or three times too high, 105–115 fit; if it is off by more, more does.
9. **The build order follows the points — provisional, see decision 11** (map F): the planner picks an
   achievement's work itself (30 → 66 points
   by the deadline) → map transitions (→ 84) → the whole fleet on a live event (→ 98) → group boss fights without a
   click (→ 101) → `use` on purpose. Calendar time is the scarce thing: each stage in service early is worth more
   than a complete design late. The first stage runs on today's queue items, next to the hive if it has to.
10. **Spending: the planner spends by itself** — gold, tasks coins and event currency — where that earns points
    sooner than work does, above the 20,000-gold floor that exists today. It is in-game currency only. The design
    (task 005) says how gold is budgeted; map G has the amounts. Gold is scarce (about 6,000 a day from tasks,
    about 107,000 in the bank on 2026-11-17) against boat fares up to 400,000, obsidian 350,000 and backpacks
    250,000, so this is a budget, not a list of approvals. Alex can tighten it whenever he wants. (This replaces the
    report's default, "spend nothing new", in the light of Alex's "automate as far as it goes".)
11. **"Achievements first" is the goal, not the order** (Alex, 2026-11-18: level the heroes high first, collect
    achievements on the way and after?). The map's order is greedy, points per marginal hour, and blind to three
    things: 81 of the 195 open points need combat 41+ and 64 of them 46–50, so everything above about 110 points is
    a levelling plan; the high-level points hang on events, and each day below an event's gate is spawns lost; low
    work gets cheaper with level (tools cut the gather cooldown, stronger fighters kill faster). Against pure
    levelling: favors are capped per day and must run from now; the gathering chains to 50 are cheap (about 250
    hours a specialist) and are themselves the gathering achievements; and if the gear crafting hours are what the
    atlas says, an all-in on levelling pays nothing by the deadline. Not argued out in the chat: task 005 compares
    plans by points at the deadline (greedy, level first to 30 / 40 / 50, a mixed spine) with the leaderboard's pace,
    and the build order of decision 9 follows from the result. Working guess: levelling is the main line, per-day
    and event work runs whenever its gate is met, by-products fall as they may, and the work with no other use
    (tasks, recycling, obsidian, pearls) is filler or last.

12. **Report 005 accepted (2026-11-18).** Checked in the chat: both commits; `src/state/loopkit.ts:61-76`,
    `src/state/queue.ts:1449` and `:1470-1475`, `src/plan/hive/skills.ts:48-55` say what the report claims; the
    leader's levels are in the snapshot. Not checked there: `git status`, `npm run check` (Claude Code ran them).
    It replaces decision 8's ceiling (see "What task 005 found") and confirms decision 11's working guess: a
    levelling spine, per-day and event work as interrupts, filler last. How far the numbers are believed: the range
    rests on **one soft number — gear crafting at a tenth to a quarter of the atlas, shown for the leader only**;
    this fleet's own hours per crafting level at 25–35 settle it, about a week after the planner runs. The scratch
    model is deleted and its scoring rule (A.2, rule 3) was never run: the stage figures (68 → 87 → 110 → 126 → 133)
    order the work, they are not forecasts.
13. **The architecture is `docs/design/planner.md` as recommended**: one pure `decide(character, world)` recomputed
    at every step boundary; a step is bound to a character when it starts; 90-minute chunks compiled to today's
    queue items with `pl:` ids; one `interrupt()` with one class order; plan-time reservations; measured costs
    replace estimates; nobody is ever paused; all five characters behind a per-character flag, Fifth first for a
    day; the old writers switched off by the flag and deleted as soon as all five run on the planner (decision 15).
    Settled in the chat on top of it, to
    keep stage 1 thin:
    - spending in stage 1 is the static rule "Lost World Maps only"; the gold-per-hour table (D.2) waits until
      there is a second thing worth buying (tolls);
    - `scripts/check-planner.mts` prints the first week and replays rule 3 to the deadline before the runtime task
      ships; it asserts invariants (a step for everyone, nothing on an unreachable layer), not the exact order;
    - the "another character would do it 1.5 times faster" rule (B.4) is left out of stage 1 unless the check
      script shows the first-free-takes-best rule doing something silly.
14. **Layers and free transitions come first (task 006), before the planner** — the first half of the design's
    stage 2, as an executor fix. Reasons: it does not depend on the planner (every queue item works behind a
    transition once `moveTo` and `nearest` know layers); `pick` and `cost` of the planner's core stand on
    `route()`; Fourth and Fifth mine at 24, and at 30 the `train` item walks to the gold rocks' coordinates on the
    overworld and loops on 598 without pausing; mining past 30 on three characters is on the spine's critical path
    (resource events need skill 35). It closes three parked items: 598 as an outage, no `transition` in the runner,
    gathering training at 35–39. Then: 007 planner core (pure, no restart) → 008 runtime (restart; Fifth on) →
    009 Roadmap as home, all five on → clean-up (the next task, no week of waiting) → 010 gear by need → keys and
    tolls → the fleet on
    events → group boss fights → `use`.
15. **Report 005's decisions, answered by Alex on 2026-11-18** ("as proposed"): (1) tasks become
    filler — A; (2) backpacks are no longer bought — A, and task 006 drops the wish from the merchant's list, so
    the old standing order stops spending 50,000 a piece before the planner exists; (3) the hive, pins, helpers,
    🔁, the queue editor and the Roadmap's suggestions are deleted for good — A, and **at once, not after a week**
    (Alex: he does not plan to play by hand): the clean-up is the task right after all five characters run on the
    planner. The old writers were also the automatic fallback, so from then on a planner defect is answered by a
    fix or by `git revert` and a restart, not by handing a character back; the day with Fifth alone (008) is the
    trial; (4) gems are not spent by the planner, the first bag is reported — B. Note for (1): a character-hour of
    fights earns about 236 gold against 124 for tasks (design D.2), so less task work is not less gold; only the
    tasks coins slow down (526 in the bank on 2026-11-17).

16. **Report 006 accepted (2026-11-18).** Checked in the chat: both commits in `.git/logs/HEAD` (`425097b` Rework
    notes, `929017d` 006); `src/plan/route.ts` and `src/state/loopkit.ts` read in full — regions, `route()`, one leg
    per `moveTo`, `nearest` ranked by `travelSec` through `FREE` are as the report says; `isOutage` and the pause
    path of `runLoop` (`src/state/queue.ts:1437-1438`, `:1483-1511`); all 30 `nearest(` calls of `queue.ts` pass a
    character. Not checked there: `npm run check`, the typecheck, the build, `exec.ts` and the UI callers (Claude
    Code ran them). **Alex restarts the service.** The first live proof is the report's step 8 — a `transition` in
    `logs/dev.log` with no 598 after it — and it waits for the first character that goes through one.
    - **One regression, the planning chat's own** (task 006 said "the ordinary error path"): a 598 at action time
      now pauses the queue. Before 006 it was held for 60 s and the next tick picked again. It still happens
      honestly when an event tile expires between the look and the action (the local clock against the server's).
      A paused queue also misses the daily offerings: `scheduleOfferings` skips a queue that is not running. Rare,
      so no task of its own. Task 008 fixes it on both sides: the runtime never leaves a character paused (design
      C.4), and in `runLoop` a 598 is a vanished target — look again once, then skip the item, never pause.
17. **Offerings (report 006, section 7): the gap is structure, not a defect of the item.** 19 of 105 in seven days;
    75 of the 86 missed had no daily trigger (fixed on 11-16). What is left, a day:
    - **The combat offering is lost by all five** until its item can be had: the brackets ask for Ogre Eye and Demon
      Horn, and the ogre is not a safe win. Five quarter-levels of combat a day — the dearest loss on the list.
      Consequence: "makes today's offering item obtainable" counts as a gate flipped for gear by need (task 010)
      and for `pickMonster`'s bonus; until then the planner's core reckons with 10 offerings a day, not 15.
    - **A skill under 10 has no bracket**: gear-, weapon- and jewelrycrafting stand at 1–2 on the four characters
      that do not craft them, about three offerings a day on average (estimate: three of eight rotating skills).
      Each would level a skill its character never uses; only the favor is lost, and the 467 favors left fit at 10
      a day (47 days). Not planned; looked at again if favors become the constraint.

18. **Report 007 accepted (2026-11-18).** Checked in the chat: both commits in `.git/logs/HEAD` (`abccb85` Rework
    notes, `13ac755` 007); `decide.ts`, `pick.ts`, `cost.ts`, `roles.ts`, `forward.ts`, `compile.ts`, `stock.ts`,
    `types.ts`, `config.ts`, `xp.ts` read in full — rules 1–5, the four answers, the chunk, rule 3's bundle (only
    achievements whose every missing gate is a level of that lane), the +10%, at most four items with `pl:` ids
    are as the report says. Not checked there: `targets.ts`, `reach.ts`, the check runs, the typecheck, the build
    (Claude Code ran them). No engine change, no restart. What it found is under "The goal". "Spine or greedy" is
    not shown: no crafting lane ever has a bundle, so the three crafting prices give the same 54.
19. **Gear by need moves up; the order of decision 14 changes.** Was: 008 runtime → 009 Roadmap and all five →
    clean-up → 010 gear. Now: **008 the runtime, Fifth on** (Fifth's first week needs no gear: highwaymen to 25,
    coal, steel, mining 30, gold) → **009 the core's second round, pure, no restart, written and run while Fifth's
    trial day runs** (decision 20) → 010 the Roadmap as home, the outlook, all five on → 011 the clean-up → keys
    and tolls → the fleet on events → group boss fights → `use`. Reason: with all five on and the hive gone nobody
    makes gear, and combat stops on day 2.3; the season's critical path is gear → combat → events (decision 11).
    The runtime does not wait for it: a gear piece is bank stock, and a gear step compiles to today's items.
20. **What 009 holds** (from report 007's replay; settled when 009 is written):
    - `gear:` targets by need — a piece that makes the next XP monster or a gate's monster a safe win; the
      crafter's level becomes a gate the fighters' points wait behind; the forward model makes gear. This is where
      rule 3 gets its crafting bundles and "spine or greedy" shows.
    - First: what stops combat at 25 — the gear, or the word "safe"? (`ownedFightRec`, `src/plan/jobgear.ts`: the
      pessimistic pass wins too.) Second–Fourth win pigs, not safely. A loss costs a walk from (0, 0); if "safe" is
      the wall, it becomes a price. The replay prints per fighter at 25 the next monsters with win, safe and kill
      seconds, from the bank and with craftable gear. Fifth's kills and losses in the trial are evidence.
    - A level gate is priced by what the character can do, not by the atlas's plus set; no XP source up to the
      gate → it waits for gear. (First's 96 hours on pigs toward combat 32.)
    - A material made by another craft is a target of its own, with the bank as the buffer (strangold, palm
      planks, mithril bars, the potion brewer's four inputs; the diamonds' 71-hour step becomes source chunks);
      the forward model deposits what is gathered. Today 18 points on 6 achievements are "unhandled".
    - Alchemy 12–19 is levelled by crafting potions, as a craft step with gathered inputs; no engine change if
      today's items carry it (4 points behind it).
    - Roles hold still: the crafting roles pinned to today's crafters (Second weapons, Third gear, Fourth
      jewelry, First cooking), the gathering specialists as design B.3; objective work and the recycling filler do
      not move a role, and the filler trains the role's own skill (in the replay First took weaponcrafting to 31
      by recycling while Second stayed at 20).
    - The gear pool: two fighters do not plan with the same single piece.
    - Left until the replay with gear: five characters on one objective (coal on day 2.3). With nothing else to
      do it is not wrong.
21. **Task 008, settled in the chat on top of the design** (in the task file as "What is settled"): one character
    on by default; Alex's config stored as a patch over the defaults; no outlook yet (a forward run is 8–14 s on
    the service's one thread); a step that ends with no unit done is blocked like a stall; an interrupt that
    pauses is removed, the step stays; a 598 is a vanished target for every queue (look again once, then skip);
    a brake at six step starts in ten minutes; each chunk keeps its bank reset; the smallest UI — a switch per
    character and the step's `why` in the queue panel — so Alex can see what Fifth does and hand it back. Found
    while reading `runLoop`: a start issued from inside an effect on `queues` is lost (`startQueue` returns while
    the ending loop is still in `liveLoops`, and the loop's `finally` drops `running`); the task names the trap.

22. **Report 008 accepted (2026-11-19).** Checked in the chat: both commits in `.git/logs/HEAD` (`54f01ab` Rework
    notes, `f3a476f` 008); `src/state/planner.ts` read in full; in `src/state/queue.ts` the guard (`refused`),
    `insertItem` / `dropItem` / `resetQueue`, `runLoop` with the 598 path, `runQueue` / `haltQueue`,
    `scheduleOfferings`, the `withdraw`, `buy`, `craft` and `claim` handlers; `sync.ts` (the boot order, the two
    reads), `eventorders.ts`, `apply.ts` (a claimed row leaves `pendingRewards`), `compile.ts`, `hive.ts`
    (`setHiveManual`, `skipAssignment`). The seam holds as the report says: the effect only queues a microtask,
    each exit of the loop is one synchronous run, and `runQueue` either cancels a pending stop or launches a new
    loop. Not checked there: `npm run check`, the typecheck, the build, the scenarios, the harness,
    `QueuePanel.tsx` (Claude Code ran them). **Engine change: Alex was told to restart the service on 2026-11-19;
    from that restart Fifth is the planner's and the trial day runs.** Found while reading; none of it holds the
    trial back:
    - Fifth's first step (Tanner's Exchange) is the first purchase with an item currency the client makes by
      itself (report 004 had it as a by-hand gap). If the `buy` fails the pair is blocked for 6 h and Fifth goes
      on to the highwaymen; the dev log shows which.
    - `fallback()` ignores `blocked` (the report's own note): a fallback chunk that ends empty is decided again at
      once, at the pace of a bank reset, and the brake does not end it. Sign: `flapping` more than once. 009.
    - The core's memo tables (`fightMemo`, `cutMemo` in `reach.ts`) are keyed on the bank's gear as a string and
      never emptied. In real play the bank's gear changes with every reset, so nearly every decision misses the
      memo (about half a second each — fine) and the table grows by some kilobytes per decision: nothing in a day
      with one character, megabytes a day with five. 009 bounds them and keys them on something that holds still.
    - The take-over opts Fifth out of the hive through `skipAssignment`, which calls the guarded `stopQueue` and
      `removeItem`: "the planner owns this queue" lines in the activity log at the first boot, and the hive may
      count Fifth's assignment of the running wave as done (its items are gone). Cosmetic; goes with the hive.
    - An achievements read from the tab's panel replaces the list outside `readAchievements`, so a completion
      first seen that way starts no claim; the next completion or the next boot claims it. For 010.
    - A 598 now skips an item in every queue. With 🔁 on, an item that answers 598 every time is skipped, recycled
      and tried again without a pause. After 006 only event tiles vanish and `ev:` items are never recycled, so
      no case is known; it goes with 🔁.
23. **Task 009, settled in the chat** (in the task file as "What is settled"):
    - **Safe stays the rule; gear by need is the answer to "wins, but not safely".** A price for risk needs a
      loss probability the simulator does not give. 009 prints what decides it: a replay row in which a win is
      enough (an upper bound on what "safe" costs), the table of monsters each fighter wins unsafely, and whether
      the simulator could give a probability. Fifth's trial adds real losses, if any.
    - **One rule for gear, flips and speed-ups alike**: a craftable piece is needed when "make it, then do the
      work with it" takes at most 85% of the hours of doing the work without it (∞ when there is no safe win).
      The work is a fighter's road to its next combat gate or an open kill objective; a gathering tool on a lane
      is the same rule. The piece scores the points behind that work over the hours of the whole chain, the same
      number on every link, and a crafter's missing level is a level target that carries it. This is rule 3 with
      more kinds of gate — where "spine or greedy" finally shows.
    - **The bank is the buffer.** A material short in the bank is a target of its own: `src:` (a gather or a
      hunt, chunked by actions, banked at the step's end) or `mat:` (a craft from banked stock). That handles the
      materials made by another craft and the diamonds' 71-hour step with one mechanism. Supply is made for open
      demand only, never ahead.
    - **No spending yet**: no gold, no tasks coins. A piece that needs a bought material is listed with its
      price, and the question comes to Alex only if the replay says it matters.
    - Roles are pinned in the defaults (crafters as today; gatherers as design B.3, with the two event extras per
      lane written out); a combat gate is priced by the character's own XP sources; alchemy 12–19 levels by
      brewing; the fallback honours blocks; the forward model deposits, wears and makes gear.
    - The core does not import `src/plan/hive/*`: it is deleted in the clean-up. What the planner needs from it
      is restated in the core.
    - Two edits to the runtime ride along (units read past a trailing `deposit-all`; the brake covers supply).
      Nothing goes live until a restart; **from 009's commit on, any restart brings the second round's core live
      for whoever is on.** With Fifth alone on, chain work is not offered (its crafter is not the planner's).

24. **All five are the planner's since 2026-11-19 09:25 UTC** (Alex switched First–Fourth on with the button, on
    the chat's proposal: they had stood idle since the hive was stopped on 11-18 21:03 UTC). Stored as his patch
    over `DEFAULTS.on`. Each took a Highway Patrol chunk and the units in flight were subtracted as designed (401
    → 356 → 307 → 258 → 213). The "day with Fifth alone" of decisions 13 and 19 is thereby cut to ten minutes; the
    old writers stay in the code as the way back (the same button) until the clean-up. Consequences:
    - **No restart before 009's report is accepted**: a restart after its commit brings gear and supply chains
      live for all five at once.
    - 010 no longer turns anyone on; it is the Roadmap, the outlook, and the list below.
    - **Offerings, as Alex saw them on 11-19 (none done that day).** Not the brackets: the item already falls back
      to the next lower bracket it can complete (`offeringPick`, live since 11-18); the Fleet panel shows only the
      own bracket's requirement, which reads as "stuck on Owlbear Hair". The cause was the trigger: at 00:05 UTC
      every queue stood stopped, `scheduleOfferings` skipped them all and wrote the day's marker, so nothing
      catches up; and the panel's "+ Queue" is refused for an owned character. From the next 00:05 UTC on the
      planner's interrupt fires for all five whether or not a queue runs. For the task after 009:
      - a character switched on (or found at boot) with offerings of the day still open and no offering interrupt
        issued that day gets one — per character and day in the planner's state, not the old marker;
      - the panel's buttons call the interrupt for an owned character, or go;
      - the panel shows the bracket the item will take;
      - `pickMonster` / `pickNode` do not know an active favor (× 1.5 XP and drops on its target until the
        reset): count it;
      - decision 17's second gap again, now that Alex names offerings a priority: the three gear crafting skills
        to 10 on the four characters that do not craft them (about three more offerings a day). Proposed to him
        as a cheap one-off target for the round after 009. **Dropped (Alex, 2026-11-19)**: a bracket's requirement
        sits anywhere in its range (mining 10–20 asked for coal, a level-20 node; woodcutting 10–20 for spruce,
        level 10 — `scripts/check-offering.mts`), and a craft offering must be crafted by the character itself,
        banked items do not count. Skill 10 would complete it only on some days; a reliable 10–20 bracket means
        skill 20 on twelve skill lanes, far more than three offerings a day are worth.
    - Seen in the log of 11-18 evening (the hive's last wave): Third lost two skeleton fights in a row and Fifth's
      skeleton fight was refused as no win — evidence for "safe" (decision 23).

25. **Report 009 accepted (2026-11-19).** Checked in the chat: the three commits in `.git/logs/HEAD` (`a879ad3`
    Rework notes, `c57f81d` Rework notes with decision 24, `52e7f44` 009); `decide.ts`, `gear.ts`, `supply.ts`,
    `bundle.ts`, `gates.ts`, `stock.ts`, `compile.ts`, `config.ts` and `src/state/planner.ts` read in full — the
    need rule (`G + H1 ≤ 0.85 × H0`, drop the dearest piece while it holds), the three works, `billOf` with the
    shared virtual bank, `src:` / `mat:` / `gear:` candidates scored by the parent's whole chain, the pinned
    roles, the wall in `bundleOf`, the pool less the others' reservations, the three item shapes of a supply
    step, `measure` past the trailing `deposit-all` and the brake over supply are as the report says. Not
    checked there: `reach.ts`, `cost.ts`, `forward.ts`, `pick.ts`, `roles.ts`, the check script, the check runs,
    the typecheck, the build (Claude Code ran them). **Engine change: Alex was told to restart the service on
    2026-11-19 (afternoon); from that restart gear and supply chains are live for all five.** The report's own
    readings, accepted:
    - **A trade for an item currency is a chain, not spending** (hard leather for cowhide, cloth for wool,
      snakeskin for snake hide): a `mat:` step `[withdraw, buy, deposit-all]`. Tanner's Exchange proved the item
      shape live on 11-19.
    - **A far gate is walked to its wall**: the level target stops at the first level with no XP source and the
      score prices the rest at the last pace. Without it nobody levelled past 25 for `grand_master`.
    - **The budget missed** (the first week inside `npm run check`: 110 s against 40 s, the gear solver) stays
      missed for now; `scripts/check.mts` got a longer backstop for it. A forward run to the deadline is 216–225 s:
      the outlook cannot be that run (report 009, section 8, says what to cut).
    - **The open questions it answers.** *Safe*: a wall worth about 3 points (row D, an upper bound: the model
      has no losses), not the wall that stops the fleet — the gear above 38 is. Safe stays the rule; a loss
      probability is cheap when wanted (`monteCarlo` on the solved set, about 2 ms per 1,000 fights). *Spine or
      greedy*: combat is a spine (21% of all hours go to levelling it toward `grand_master`); crafting is not
      exercised — every piece asked for was within the crafters' 20–21, so the three crafting prices give the
      same 56. *What gear crafting costs* is therefore still open, and does not matter until gear above 38 is in
      reach.
    - **Known as it goes live** (none of it holds the restart back; 010 takes them):
      - the brake counts every start: six short supply steps inside ten minutes block everything for 30 minutes
        and the character gathers a fallback chunk. Sign: `flapping` with `mat:` / `gear:` keys;
      - a made piece is in every fighter's pool: whoever starts a fight step first wears it, extra copies follow;
      - a shared kill objective is counted whole for each fighter (five battlestaffs for 401 highwaymen);
      - the model treats the bank's potion stacks as inexhaustible; real fights brew when a stack drains.
26. **The order after 009 follows the replay's walls** (it replaces the tail of decisions 14 and 19). The Roadmap
    and the outlook earn no points and move back; the tasks have been taking half a day each, so the order below
    is about what the fleet meets first, not about weeks:
    - **010 — the live round** (restart). What the first hours of chains in real play show (the planner's lines
      of `logs/dev.log`, read by the task: the log is 61 MB, too large for the chat); the brake counts steps
      that ended blocked or empty, not every start; short supply steps in a row; a made piece kept for the
      fighter it was made for; a shared objective counted once; the offerings list of decision 24; an honest
      `waitingOf` for a material sold for tasks coins; and **tasks coins spent on an objective's own material**
      (crafted_with_honor: one astralyte crystal, 12 of 526 coins — decision 10 allows it; 009 only held it
      back). The `use` objectives (10 points) ride along if they compile to today's items.
    - **011 — keys, tolls and `has_item` transitions**, with the gold budget for fares (67 points wait behind a
      layer; the gathering specialists reach 40 around day 14).
    - **012 — the fleet on events, and events in the forward model** (35 points, and the materials of the gear
      above 38; the fighters reach 30 around day 17).
    - then the clean-up, the Roadmap as home with a cut-down outlook, group boss fights.
    Provisional until the first live hours are read: a defect of the chains in real play goes first.
27. **Task 010, settled in the chat** (2026-11-19, after the restart; in the task file as "What is settled").
    The restart of 14:57:11 UTC was clean: all five steps re-attached (four `lvl:combat:25` on pigs, Fourth on
    Intermediate Miner's coal), so the first decision of 009's core came only when those steps ended — the chat
    saw none. What the log's tail did show, under 008's core, decides the task:
    - **Potions are the dearest thing in real play.** Second, Third and Fifth fight pigs with Small Health
      Potions; 16 potions last four to six fights, and the next batch is ten minutes of sunflowers: about two
      thirds of the step is brewing. `killSeconds` (`src/plan/bis.ts`) prices a potion's heal at the rest rate
      and says so in its own comment. **A consumed potion costs what it takes to make another** — one function
      for the solver, the planner and the executor. Safe stays the first tier. Potions as supply through the
      bank are not built: with an honest price a fighter brewing its own is the same hours; decided again from
      010's numbers.
    - **The brake is per target** (six starts of one target in ten minutes block that target for 30 minutes;
      a ceiling of 20 starts of any kind keeps today's behaviour).
    - **Offerings**: the planner keeps the day per character and catches up (boot, switch-on, the tick); a
      removed interrupt comes back after an hour; the panel's buttons issue the interrupt and the panel shows
      the bracket the item takes; an active favor counts in `pickMonster` / `pickNode`.
    - **The first hours are read by the task** (read-only; nothing found there is fixed in it), with where the
      time goes per character, and what `src/sim/validate.ts` counts.
    - **Moved out of 010** (against decision 26): a made piece in every fighter's pool, a shared objective
      counted whole, the tiny supply steps — hours, not days; parked. Tasks coins on an objective's own
      material and an honest `waitingOf` go to 011, which becomes "keys, tolls and what is spent". The `use`
      objectives wait for their own look.

28. **Report 010 accepted (2026-11-19).** Checked in the chat: both commits in `.git/logs/HEAD` (`163b8f8` Rework
    notes, `93790c7` 010); `src/plan/planner/decide.ts`, `src/plan/xp.ts` and `src/state/planner.ts` read in full —
    `fieldSec` / `potionSec`, the brake per target with the ceiling of 20 starts, `offerDay` / `offeringsDue` /
    `catchUpOfferings` / `offeringLater`, `favorsOf` in `worldOf` are as the report says; `gear.ts` and
    `src/sim/validate.ts` read for task 011. Not checked there: `bis.ts`, `src/sim/combat.ts`, `exec.ts`,
    `queue.ts`, the panel, `pick.ts`, the check runs, the typecheck, the build (Claude Code ran them). **The engine
    change is already live: Alex restarted the service at 16:22:33 UTC**, when Claude Code had finished the work
    and was waiting for more log (the commit followed at 16:47 UTC; `src/state/planner.ts` was last written at
    15:28 UTC). No further restart. The log's tail read in the chat (18:38–18:48 UTC): no potion, no sunflower, no
    `flapping`, no lost fight; Fifth on skeletons without potions (sample `kill:skeleton` 67 s against 143 s,
    +60 XP a kill with the favor); Fourth on `src:diamond_stone` at the copper rocks; the others on supply. The
    report's readings, as the chat takes them:
    - **49 against 56 is not what the potion's price costs.** At the end of `rank()` (`decide.ts`) the real
      candidates are tried by fit and then by points per hour before any filler is looked at, so the road to
      `grand_master` (fit 0) outranks ecologist, tasks_coins_fan and pearl_fisher. 011.
    - **The slow combat is not believed yet**: the forecast drinks 6 small health potions a pig fight, the log
      about 3.2; an algae is priced at a whole fishing gather. 011 finds the cause of the count; the replay gets
      rows for potions at half price and free.
    - **The offering's lost skeleton fights are not a defect** (against the report's note and the chat's first
      reading): 3 losses in 41 fights are about ten minutes of walks; the offering paid 2,550 XP and the favor
      (× 1.5) for the day, and "only a safe win" would have skipped the combat offering for all five. Left as it
      is; looked at again if a hunt loses more than one fight in five.
    - **A shared objective counted whole per fighter is no longer "hours, not days"** (decision 27 parked it):
      at 18:39 UTC Fifth hunts 62 skeleton bones for a Steel Battleaxe for Fourth for `i_want_bacon` (chain
      ~22 h) while Second wins pigs. The cause is `gear.ts`, work (b): `H0` is the fighter's own hours for all
      that is left, ∞ when it does not win safely, so a flip qualifies for every fighter. 011.
    - Potions as supply through the bank: not built (the report: 8% of a full batch is all it saves).
    - **A restart while a task runs loads the working tree.** It went well this time. Alex restarts when the
      report exists; a task writes its report last and does not wait for more log after it.
    - Seen in the tail, for 011's read: the diamonds for `diamond_in_the_sky` (5,788 gathers, ~42 h) are mined at
      the copper rocks — no XP for a miner at 24+, and ore nobody needs. Whether a by-product should count in the
      choice of a node is the same question as the algae's price.
29. **Task 011, settled in the chat** (2026-11-19; in the task file as "What is settled"). A calibration round
    goes before keys and tolls, because the order of 012 and 013 hangs on numbers nobody believes:
    - **Filler that fits goes before a road that does not**: `first` → real that fits → filler that fits → real
      by points per hour → filler by points per hour → fallback. A road that fits nothing takes the fallback's
      hours, not the filler's.
    - **The forecast must say what a real fight drinks**: the log's pig fights against `simulate` (expected,
      pessimistic, Monte Carlo); the cause is repaired — the expected mode's proc count, the model of a proc, or
      the sets — no fitted factor. `validate.ts` records predicted against real potions from now on.
    - **`potionSec` is not changed**; the by-products are printed, and the replay's rows become A default,
      B potions at half price, C potions free, D a win is enough (the three crafting prices gave the same number
      three reports running). C is the anchor against report 009's 56.
    - **An objective is the fleet's work**: for gear by need, what is left less what is in flight; `H0` is the
      best-placed character's hours; one need per objective. A fighter's own road stays per fighter.
    - The offering's hunt stays as it is. A made piece in every fighter's pool, the tiny supply steps and the
      brew batch at a step's tail stay parked.
    - **The order after it**: 012 keys, tolls and what is spent; 013 the fleet on events; then the clean-up.
      Looked at again with 011's replay: the day the fighters reach 30 says how soon events can pay.

## Tasks
| # | What | State |
|---|---|---|
| 001 | Read-only audit → `docs/audit/code-audit.md`, `docs/audit/domain-rules.md` | done, `f252937` |
| 002 | Offline harness: fake game, virtual clock, scenarios, `npm run check` | done, `2d13f27` (the pre-audit offerings work went in as `aa63544`) |
| 003 | Runner fixes: `buy` never buys; the gear swap's bank-tile sweep (helper ping-pong); 486 after a 500 | done, `e847b11`. Accepted 2026-11-18; Alex restarted the service that day, so it runs this code. |
| 004 | The achievement map → `docs/design/achievement-map.md`, `docs/design/snapshot/`, `scripts/design/achievement-map.mts` | done, commit "004: achievement map". Accepted 2026-11-18. No engine change, no restart. |
| 005 | The planner's design → `docs/design/planner.md`; with it, the map checked against the leaderboard (four public reads) | done, `72b726f`. Accepted 2026-11-18. No engine change, no restart. |
| 006 | Movement knows layers; free transitions are walked; 598 is an answer; the `train` item's node; the backpack wish dropped; read-only: why offerings run at 8–11 of 15 | done, `929017d`. Accepted 2026-11-18. **Engine change: Alex was told to restart the service on 2026-11-18**; the next planning chat asks whether it happened. |
| 007 | The planner's core, pure: `src/plan/planner/*` and `scripts/check-planner.mts` (first steps, first week, the replay to the deadline) | done, `13ac755`. Accepted 2026-11-18. Nothing imports it: no engine change, no restart. |
| 008 | The runtime: `src/state/planner.ts`, the step loop, blocks and stalls, `interrupt()` (offering, merchant, event, claim), the `claim` item, the guards, 598 as a vanished target, the smallest UI; Fifth on by default | done, `f3a476f`. Accepted 2026-11-19. **Engine change: Alex was told to restart the service on 2026-11-19**; from that restart Fifth is the planner's. The next planning chat reads `logs/dev.log` for the trial. |
| 009 | The core's second round (decisions 20, 23): gear by need, supply through the bank, alchemy, the price of a level gate, roles, the pool, the forward model; the replay again, with a "win is enough" row | done, `52e7f44`. Accepted 2026-11-19 (decision 25). **Engine change: Alex restarted the service on 2026-11-19 at 14:57 UTC**; all five steps re-attached. |
| 010 | The live round (decision 27): what a potion costs, the brake per target, offerings that catch up, the first hours of the chains read from the log | done, `93790c7`. Accepted 2026-11-19 (decision 28). **Engine change, live: Alex restarted the service on 2026-11-19 at 16:22 UTC**, before the commit, on the final working tree. |
| 011 | The calibration round (decision 29): what a fight drinks, filler before a road that does not fit, an objective is the fleet's work, the hours since 16:43 UTC read from the log | written 2026-11-19, `tasks/011-calibration.md`; not run yet. **Engine change: restart after it is accepted.** |
| 012 | Keys, tolls and `has_item` transitions; what is spent: the gold budget for fares, tasks coins on an objective's own material | |
| 013 | The fleet on events; events in the forward model | |
| 014… | The clean-up → the Roadmap as home, a cut-down outlook → group boss fights | |

## Open questions
- **Does combat stall near 28–30 for want of cheap potions?** Report 010's replay says so (combat 35 on days
  86–96); the count behind it is twice the log's. Task 011 answers it, and with it when the fleet reaches an event.
- **Should a by-product count?** An algae priced as a whole fishing gather; diamonds mined at the copper rocks
  for no XP. 011 prints both cases; decided from its numbers.
- Answered by 010 (decision 28): how the chains run in real play ("The first hours" of its report: nothing
  blocked, braked, stalled or lost); what the simulator's record counts (a predicted win that was lost: 44 of
  159 skeleton fights on 11-18, so "safe" is doing its work).
- **What does gear crafting cost this fleet?** The leaderboard shows it for the leader only. The planner's measured
  hours per level at 25–35 answer it; above 100 hours a level the plan falls back to about 100 points. Not
  exercised by 009's replay (decision 25): it matters once gear above 38 is in reach.
- Answered by 009 (decision 25): the rule is a spine for combat, crafting is not exercised; "safe" was not the
  wall at 25 — the gear was — and costs about 3 points at the deadline.
- **How do the chains run in real play?** From the restart of 2026-11-19 14:57 UTC: the first `src:` / `mat:` /
  `gear:` steps, the samples against their estimates, `flapping`, `blocked`, pieces made and who wears them,
  lost fights. The chat read the log only to 15:01 UTC (the restart, the re-attached steps, the potion
  brewing of decision 27); the file is 61 MB, so task 010 reads the rest and reports it.
- **Was the service restarted after 006?** Moot since the restart of 2026-11-19 09:15 UTC, which brought 006–008
  live together.
- **How did Fifth's trial day go?** Read from `logs/dev.log` in the next chat: a step about every 90 minutes, the
  samples against their estimates, the offering interrupt at 00:05 UTC, any `blocked`, `flapping`,
  `queue found stopped`, `no step`, and every lost fight. **The first minutes (read in the chat, 09:15–09:23
  UTC): clean.** Take-over dropped one item (`Move to (8, 6)`); Tanner's Exchange in 45 s (three cowhide were in
  the bank: `withdraw`, then the item-currency `buy` — it works); the read saw the completion (+2); the `claim`
  interrupt took 10 vermin leather and banked it; then `ach:highway_patrol:0@Fifth#1`, 45 kills, reset and fights
  as planned. The loop ran dry during the achievements read and was started again ("queue complete", then
  "queue started") — case 2 of the seam, as designed.
- **First to Fourth stood idle from 2026-11-18 21:03 UTC to 11-19 09:25 UTC**; switched on then (decision 24).
- **The simulator's record.** The Character tab shows "sim check: 200 fights · 44 win/loss mispredicted". What
  that counts (`src/sim/validate.ts`) and whether it bears on "safe" is to be looked at with 009's report.
- Answered by 006: why offerings run under 15 a day (decision 17).
- **The end of the season.** No date is published; 2027-02-24 is the working deadline. The leader's first
  achievement (2026-11-02) fits the announced opening of 2026-10-31 better than the API's 2026-10-24; if the four
  months run from the opening, the end is a week later. An announcement would settle it.
- Answered by 005: `craftTrain` is a model artefact, not the cost (design A.5); all five characters level combat,
  gear follows need and crafting stays with one crafter per skill (A.5, H.10).
- **Raids and the Grand Exchange.** Two public reads would show the raid schedule and whether players sell raid
  goods (`GET /raids`, `GET /grandexchange/orders`). Not needed this season; Alex would have to allow them.
- **Gems.** How many a reward bag holds and whether a non-member can spawn an event with them shows at 50 points.

## Known and parked
- `initiative` is on the character in the API; the simulator starts it at 0 (audit, report 002). Possibly wrong
  "who strikes first" against 10 monsters.
- A fighter that gets one raw chicken walks off to cook it and then rests anyway (report 002).
- A failed bank read empties the local bank; the 478 handler drops the whole stack (audit D.2). Closed by 006: 598
  treated as an outage, gathering training at skill 35–39.
- The dev log is shared by smoke-test services; the verify skill's `drive.mjs` and `hive-probe.mjs` are stale
  (audit F.3).
- From report 003, not fixed: a `buy` of more units than the bag holds answers 497 and would walk bank ↔ merchant
  forever (the hive's `buy` items take their quantity from the plan; reasoned, not run); a full bag is discovered
  only at the destination, so every full bag pays a round trip; a helper's bag full of protected raw material with
  a second raw material missing pauses the queue ("inventory full of protected working stock"); junk gear is still
  decided by `keep`.
- Behaviour since 003, by design: a gear swap at the bank no longer empties the bag, so a fighter's incidental
  drops reach the bank only when the bag fills, at a reset or with a helper's delivery. Anything that counts on
  those drops being in the bank waits longer.
- Spending since 003: the Nomadic Merchant standing order now really buys — one Lost World Map (15,000 gold) per
  level-20+ character without one, then backpacks (50,000), from bank gold down to the 20,000 floor. Alex accepted
  this on 2026-11-18.
- From report 004, not fixed:
  - **Rest time.** The docs say 1 second per 1% of missing HP, minimum 3 s; the client and `domain-rules.md` use
    5 HP per second. They agree only at 500 max HP; the fleet is at 470–565 and growing.
  - **Movement** costs 5 seconds per tile crossed (docs). Since 006 `nearest` ranks by it (`travelSec`); no other
    estimate in the client uses it yet (the hive's lane pace, `trainRecipe`'s field seconds).
  - Closed by 006: no `transition` anywhere in the runner. Keys, tolls and `has_item` are still out (9 of the 30
    transitions): the lich, the dryads, the island, the cultists, the priestess, the northern lava cave.
  - **Offerings run at about 10 a day** against a cap of 15; the causes are in decision 17. The 467 favors left
    need 31 days at the cap, 47 at 10 a day; both fit, the slack is not large.
  - **The event standing order sends one character per spawn**; no monster or resource order was ever dispatched.
    The Magic and Strange Apparitions need 35 and 30 days of spawns with five characters, five times that with one.
  - **The atlas** has no kill time and no farmable set for nine normal monsters of level 45–51 and five bosses;
    `monsters[].minLevel` ignores access (the cultist alchemist behind the cloak); `gatherTrain.alchemy` is empty for
    16–19 and 31–39.
  - **Stale documents**: `CLAUDE.md` and `docs/game-actions.md` say about 2,000 actions an hour (the API: 5,000 for
    actions, 2,000 for data, 300 for account reads); `docs/game-actions.md` lists 32 actions of 35 and says the
    group fight lacks `participants`.
  - Smaller "by hand" gaps on the road: claiming pending achievement rewards, reading achievement progress, buying
    with an item currency (map F).

- From report 006, not fixed:
  - A 598 at action time pauses the queue (decision 16); fixed in 008.
  - `route()` takes the first transition found between two regions, not the nearer one (today only the lava cave's
    two keyed ones), and the fewest transitions, not the least time. Matters with keys and tolls.
  - The restricted reading is unproven: the Enchanted Forest is taken to be entered and left only through its
    transitions. Watch the first paid entry.
  - `trainingMonsterFor`'s memo is per bank and level, not per position: right while everything freely reachable
    is one connected set, which it is today.
  - The hive calls `trainingResourceFor` without the reachability filter; the UI pickers (`availableMonsters`,
    `availableResources`) still list what cannot be reached; a "Move" item from the queue editor and a manual
    move from the map carry no layer (the editor's now means the overworld). All of it goes with the clean-up.
  - `runOffering` still catches 598 and 575 itself (redundant, harmless); `src/plan/roadmap.ts:83` still lists the
    backpack as an event buy (deleted with the Roadmap's suggestions).
  - In the fake, a lost fight sends the character to (0, 0) on the overworld — a guess, not seen in the game.

- From report 007, not fixed (the core's second round, task 009, unless said otherwise):
  - Alchemy 12–19 has no way to level: sunflowers give no XP from 12, nettle needs 20, the `train` item does not
    craft alchemy (`src/state/store.ts:13-18`).
  - Pigs are a safe win only with First's own mushstaff, which is not in the bank.
  - The forward model deposits nothing that is gathered or dropped, makes no gear and simulates no event; a full
    run to the deadline is 8–14 s (the outlook of task 010 must not run it on the service's thread as it is).
  - Five pairs of functions exist twice, the planner's and the old one (`pickMonster` / `trainingMonsterFor`,
    `pickNode` / `trainingResourceFor`, `nearestSpot` and `travel` / `nearest` and `nearestBank`, `fightRec` /
    `forecastVs`, `craftsPerLevel` / `trainRecipe`); the clean-up decides which survive.
  - `events.json` is not loaded by `loadCatalog`; the core takes event codes from the atlas.
  - Every 90-minute chunk starts with a full bank reset, also when it continues the same target; kept on purpose
    in 008 (it brings a fighter's drops to the bank), looked at again with measured costs.
  - Guesses in the core's numbers, most doubtful first: combat hours to a gate from the atlas's plus set; the
    bundle level of a kill from the atlas's safe level; 1.5× actions for a rare drop; the log factors 1.3 and
    1.05; offerings at 10 a day and 20 minutes; 1.95 h a task; `craftK` 0.1 and 60 h above 40.

- From report 008, not fixed (and see decision 22):
  - `world.current` holds only the planner's characters: with Fifth alone on it sees no step and no reservation
    of the other four. Ends with 010.
  - `left` comes from the last achievements read; a short tail step of an objective can be decided twice within
    the read cap.
  - `QUEUE_KINDS` is the restore filter: `claim` and `prepare` items are dropped at a restart (a claim is
    re-issued at boot).
  - `runOffering` turns a 598 at the altar into a pause; for an owned character the planner then removes the
    offering interrupt and that day's offerings are lost for it.
  - Two string couplings: the outage hold is recognised by its note text, the "ended empty" reason by the
    `skipped: ` prefix of the activity log.
  - `reconcile()` and the planner's boot both read `/my/pending_items`.
  - Guesses in the runtime's numbers, most doubtful first: the stall time (20 min or 5 × the unit estimate; a
    craft step's batch sourcing is not measured); the 6-hour block; the brake (7 starts in 10 min) and the three
    strikes; six reads an hour; the first level of every run of level steps is never sampled.
  - The harness's fake has no XP and no levels, so no scenario exercises a level sample or the release of a long
    block by a level-up.

- From report 009, not fixed (010 unless said otherwise; and see decision 25, "Known as it goes live"):
  - Many tiny supply steps: a `mat:` craft of one to ten bars is five seconds of crafting behind a bank reset;
    a `mat:` step that gathers its own field inputs would be today's items too and remove most of them.
  - `waitingOf` lists crafted_with_honor as "no field source"; the honest reason is 12 tasks coins. `inputsOf`
    gives up on a material sold only for coins before the bill can price it.
  - Steps persisted by 008 carry no `wear`: they reserve no gear until they end (one step each after the restart).
  - `fleetSec` prices a kill by the highest-level character that wins it, not the quickest; `firstWin` and
    `winLevel` take a win to hold at every higher level; `roadRate` ignores monsters above the road's top level.
  - The subset rule of the solve cache takes a smaller pool never to find a better set.
  - The check's gear table attributes some copies to the step's `for` when the needs moved in between.
  - The UI bundle grew to 389 kB: `src/state/planner.ts` brings the core into it.
  - Guesses in the numbers, most doubtful first: the wall reading; potions as an inexhaustible stock;
    `NEED_RATIO` 0.85 and the ten-level horizon; a shared objective counted whole per fighter; the solver caps
    (3 and 6 a slot); a craft at 5 s and no bank-reset time per step; the coins-spent variant as the measure of
    what spending is worth.

- From report 010, not fixed (011 where said; and see decision 28):
  - Rule 4 and the forecast's potion count: 011. A shared objective counted whole per fighter: 011.
  - The brew batch is sized by the item's fights left, so a step's last fights brew two potions an expedition.
    Moot while no fighter drinks; back when potion fights are.
  - Favor drops are not counted (`perOf` knows no character); five characters accept the same combat offering
    at once and race for the bank's items (two 404s on 11-19, harmless).
  - `fightRound`'s refusal says "not a safe win" for an expected-mode loss; two restore potions in the two
    utility slots fire together in the simulator, the game may fire them one at a time.
  - `atlasKillSec` still comes from the atlas made with the old objective (used when the pool has no win, and to
    rank a drop's sources).
  - `CLAUDE.md`'s gear-model paragraph describes the old `killSeconds` and `BREW_BATCH`; 011 may correct it.
  - Guesses in the numbers, most doubtful first: potions a fight by the forecast; by-products in `potionSec`; a
    boost or antidote once a fight; `BREW_MAX` 45; an offering issued again after an hour, three times a day;
    the brake's numbers (6 of one target, 20 of any, 10 minutes, 30 minutes); favors until the reset.

## In the game's UI, for Alex (until the planner replaces these features)
- "Fleet helps" and "Help X train" items are safe again: the service runs the code of 003.
- Hive continuous mode (⟳) off.
- All five are the planner's since 2026-11-19 (decision 24): nothing to do by hand. "🧭 planner on" in a queue
  panel hands that character back.
- Lost World Maps: bought by the standing order; nothing to do by hand.
