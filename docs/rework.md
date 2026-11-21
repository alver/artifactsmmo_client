# Rework — goal, decisions, state

The state of the rework, for a planning chat that starts fresh. Kept by the planning chat (Claude in the desktop
app, with Alex); Claude Code reads it when a task says so and does not edit it.

Last updated: 2026-11-21 (late night), after Alex restarted the service on report 019's code (run `dxgi`,
20:59:29 UTC, commit `b808b47`) and task 020 was written (decision 51). Before that, the same hour: report
019 was accepted (decision 50) and Alex was told to
restart the service; `logs/status.json` at 20:50 UTC still carried run `k66s`, commit `e68045a` (018's code).
Before that, at night: Alex restarted the service on report 018's code (run `k66s`,
18:47:56 UTC, commit `e68045a`) and task 019 was written (decision 49). Before that, in the late evening:
report 018 was accepted (decision 48) and Alex was told to
restart the service; `logs/status.json` at 18:37 UTC still carried run `qf93`, commit `b322195` (017's code).
Before that, in the evening: Alex restarted the service on report 017's code (run `qf93`,
17:01:00 UTC, commit `b322195`) and task 018 was written (decision 47). Before that, in the late afternoon:
report 017 was accepted (decision 46) and Alex was told to
restart the service; `logs/status.json` at 16:39 UTC still carried run `0gpn` (016's code, `c8cbd78`). Before
that, in the early afternoon: Alex restarted the service on report 016's code (run `[0gpn]`,
11:43:34 UTC, commit `c8cbd78`) and task 017 was written (decision 45). Before that, at midday: report 016 was
accepted (decision 44) and Alex was told to restart
the service; the log's tail at 11:37 UTC still carried run `[lxra]` (015's code), and `logs/` held only
`dev.log`. Before that, the same morning: Alex restarted the service on report 015's code (run `[lxra]`,
08:49:13 UTC) and task 016 was written (decision 43). Before that, the same morning: report 015 was accepted
(decision 42) and Alex was told to restart the
service; the log's tail at 08:36 UTC still carried run `[tdhi]` (014's code). In the night before: Alex restarted
the service on report 014's code (run `[tdhi]`, 23:32:54 UTC on 11-20) and task 015 was written (decision 41). On the evening of 11-20 report 014 was accepted (decision 40);
the log's tail at 18:13 UTC still carried run `[wj59]` (013's code). At midday: report 013 was accepted,
Alex restarted the service (run `[wj59]`, seen at 09:54 UTC) and task 014 was written. Earlier that day Alex was told to restart the service (the
log's tail at 09:44 UTC still carried run `[yewz]`, 012's code). Before that, in the morning: report 012 was
accepted, Alex restarted the service (run `[yewz]`,
07:31:51 UTC) and task 013 was written.

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
- **What task 011 found (2026-11-19).** The forecast's 6 potions a pig fight was the snapshot's set, not the
  simulator: on the sets really worn the model, Monte Carlo and the log agree (3.5–5), and at today's price those
  sets win the pig with no potion. The replay is back at **56 / 56 / 56 / 59** (default, potions at half price,
  potions free, a win is enough): the filler returns, and with one need per objective 31–51 pieces are made
  instead of 67. 56 is the ceiling of the code that exists: the other 154 points wait for a layer, an event,
  gear above 38, `use`, a raid or a group, as in report 009. **Combat does stall at 29–30, for the potion's
  price**: the pig gives no XP from 29, the safe XP monsters above it drink 5–14 minor health potions a fight
  (89–93% of the kill's price), and 78% of that potion's price is an algae priced as a fishing gather while the
  bank holds 2,099. Fighters at 30: days 41–64 at today's price, 13–22 with free potions. The gathering
  specialists reach 40 on days 5.8–15.7 either way.
- **What task 012 found (2026-11-20).** Two prices were off by a factor and one stock was priced as if it had
  to be gathered again. Fight XP: the gap rule was read one level off at both ends (full XP up to 5 levels
  above the monster, × 0.7 up to 10) and the set's wisdom was left out. A kill: `KILL_LOG` 1.3 on healing priced
  as rest at 5 HP/s; now the docs' rest (1 s per 1% of max HP) × 0.88. Stock is free while the bank holds 100
  runs of it, and the forward model drinks it. The replay: **63 / 70 / 56 / 65** (default, potions free, the
  field price always, a win is enough). The fighters reach 30 on days 10.6–13.2 (it was 41–64); the first
  gathering specialist reaches 40 on day 14.4 (Third's alchemy). **The next wall is combat 33–35, and it is
  potions**: the bank's 2,099 algae last about a week of potion fights, after that 90% of a fight above the pig
  is potion making, and nobody brews for a fighter whose alchemy is below the recipe. Free potions (row B) put
  four fighters at 40 by day 16 and still end at 70, with 62% of the hours in the fallback: past that wall the
  points are behind layers and events, as before. **63 leans on a shortcut** (the forward model keeps one
  potion of a brewed stack so that potion fights stay plannable): until potions are supply through the bank,
  play lies between rows C and A.
- **What task 013 found (2026-11-20).** Events are a calendar, not a wall: the spawns an objective needs × the
  mean time between spawns (the log's: 64% longer than the docs', 33 spawns in 69 hours). The replay: **77 / 85 /
  63 / 86 / 63** (default with events attended, potions free, the field price always, a win is enough, no
  events); the last row is report 012's 63 to the day. Events pay 15 points directly on 1.3% of the fleet's
  time: 7 by gathers at the two apparitions (mining and woodcutting 35; three role holders each, days 5-10),
  8 by event fights from about day 15; and they open the gold set at 30 (demon horns, capes, lizard parts),
  which brings 4 more. The price comes first: the gathering lanes outrank the combat road in the first
  fortnight and row A is 1-2 points below "no events" on days 7 and 14. **Today nobody is a member of any
  spawn**: mining 22-25, combat 22-25, and no fighter wins an event monster within ten levels. **77 leans on
  potions as 63 did**: at the field price (row C) only the apparitions are attended and the row ends at 63,
  7 above report 012's C. Play lies between C and A until the consumables round. Open at the deadline in every
  row: 73 points behind another layer; the fighters reach 40 on days 56-81 by default, 12-16 with free
  potions.
- **What task 014 found (2026-11-20).** Consumables are planned now: needed as gear is needed, made through
  the bank by whoever is placed best, taken by the fight step that planned them. The replay: **87 / 94 / 77 / 89
  / 68 / 86** (default, consumables free, report 013's model, a win is enough, no events, all five as
  alchemists). The fighters reach combat 40 on days 36-40 (it was 56-82) and stand at 44-46 at the deadline;
  Third's alchemy is at 40 on day 2.7 (18.6). **The wall is planned, not cheaper**: 79% of the fight and making
  hours are making (87% inside the fights before), supply is 55% of all hours, about half of the fleet's whole
  season goes into potion and food ingredients, and algae (ten fishing gathers each) is the largest target. A
  potion heals 0.2-0.7 HP a second of making against rest's 5-7: it is never a cheaper heal, it is a win. From
  combat 30 every XP pick drinks about ten health potions a kill; past 36 there is no road without the greater
  health potion (alchemy 40). A is 5 points below C on day 30 (the kill objectives wait for their stock) and
  ahead from day 31. Free consumables are worth 7 more points, a second alchemist nothing. **The 73 points
  behind a layer are open in every row**: they wait for keys and tolls, and combat 40 now comes with 57 days
  left. **87 leans on event fights** (decision 40): A is 19 above "no events", and a trip carries one stack of
  a potion while the model credits the member's whole hour.
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
  - Claude Code makes every commit (leftovers included); from task 015 on the work lives on the branch `rework`
    and is pushed to `origin/rework` after each task's commits, never to `main` (decision 38); one task at a
    time; it never writes the
    next task;
  - the report sections: Summary · Decisions for Alex · How Alex verifies · What was done / files · Notes ·
    To delete (Alex).
- **Alex restarts the service himself (`npm start`). The planning chat tells him when** — after a task that changes
  the engine is accepted.
- The planning chat tells Alex when it is time to start a new chat.
- **The chat can read the service's state** (found 2026-11-21): copy `.ammo/storage.db` and `.ammo/storage.db-wal`
  to the chat's own machine and open the copy with sqlite (never the files in place). The same copy works for
  any file of about a megabyte (source files, a report, an hourly log file from task 016 on): copied, it can be
  searched there. The table
  `nodejs_webstorage` holds UTF-16 keys and values: `ammo:v1:state` (the characters, `bankItems`, `bankDetails`,
  the account's points, the last sync), `ammo:v1:planner` (the running steps with their why, `blocked`, the
  config patch, the costs), `ammo:v1:simdev` (the record of `validate.ts`). `ammo:v1:token` is the game's token:
  never printed, never copied into a file. The raw log (65 MB) cannot be copied; its tail can be read.
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
30. **Report 011 accepted (2026-11-19).** Checked in the chat: both commits in `.git/logs/HEAD` (`5a60dae` Rework
    notes, `f4d4118` 011); `decide.ts`, `gear.ts` and `src/sim/validate.ts` read in full — the order at the end of
    `rank()` (first → real that fits → filler that fits → real by points per hour → filler by points per hour →
    fallback), work (b) (what is left less the others' steps; `H0` the least hours among the characters that win
    safely; one need per objective, the least `G + H1`, ties to the name) and the two potion fields of a
    `Deviation` are as the report says. Not checked there: `reach.ts`, `cost.ts`, `supply.ts`, `apply.ts`, the
    check script, the check runs, the typecheck, the build (Claude Code ran them). **Engine change: Alex was told
    to restart the service on 2026-11-19 at about 20:05 UTC**; the next look at the log confirms it and checks
    acceptance step 7 (a kill objective named beside one character only). The log's tail at 20:03 UTC, still on
    010's code: First, Third, Fourth and Fifth mine copper for `src:diamond_stone`, Second fights skeletons for
    `lvl:combat:25`. The readings, as the chat takes them:
    - **Verdict (c) stands**: the simulator and the expected mode are not repaired; the new record in
      `validate.ts` decides the rest (initiative) from the next potion fights.
    - **A by-product counts** (the open question of decision 28). An ingredient the bank holds beyond what open
      demand reserves is free while the stock lasts, and the field price returns when it is gone. The forward
      model must then debit what a fight drinks, so the replay lands between rows A and C honestly instead of
      at either end.
    - **The live bill of a shared objective was 25% of the fleet's hours** (3.56 of 14.1 character-hours,
      16:43–19:34 UTC, 150 blue slimes at 0 XP among them). Fixed by 011; step 7 checks it.
    - **The diamond chain is the next live loss**: four of five characters at the copper rocks (0 mining XP, ore
      nobody asks for) for a craft gated at mining 35 that the chain neither tests nor prices; coal drops the
      stone at the same rate with 2,060 mining XP an hour — XP toward that very gate. About 8 more hours of four
      characters until the stones are there. Not stopped by hand; the rule is repaired in 012.
    - **Two prices are off by a factor, the same way everywhere**: the fight-XP formula reads about two thirds
      of the real XP (skeleton at combat 23: 24 against 38), and kill seconds are about twice the log's
      (skeleton 127–143 s against 59–67 s; a craft step 5 s against 13–23 s). The day the fighters reach 30 and
      whether the pig really ends at 29 hang on them.
    - **The order after it** (it replaces the tail of decision 29): **012 — the prices round**: a by-product's
      price with the stock debited in the forward model; the fight-XP formula against the log's fights and the
      docs; why a kill is priced at twice its real time; the node of a `src:` gather (what else the gather
      gives: XP toward an unmet gate of its own chain, ore the open chains are short of) and a chain whose
      parent craft is gated; the replay again. **013 — keys, tolls and what is spent. 014 — the fleet on events.**
      Then the clean-up. Reason: the tasks take an hour or two, the specialists reach 40 around day 6–16, and
      what the fleet loses today is in the core's prices. Alex: ok (2026-11-19).
    - Not taken up: row B is below row A on day 14 (37 against 42) and row D too (36) — the greedy's path, not
      looked into; work (c) has section 4's fault in structure and never fired in the replay.
31. **Task 012, settled in the chat** (2026-11-19; in the task file as "What is settled"). The restart is
    confirmed: the log's tail at 20:10 UTC carries run `[50ry]`, the copper gathers and Second's skeleton step
    (66/69) re-attached.
    - **Fight XP is repaired at its cause** (wisdom of the set worn, the gap rule, or the base), from the docs
      and every won fight of the log; if wisdom, the planner's XP uses the wisdom of the set it plans with.
    - **A kill's seconds are decomposed** (the fight's cooldown, the turns, healing, walks, `KILL_LOG`) and
      repaired part by part; rest becomes the docs' 1 s per 1% of max HP; `KILL_LOG` is re-measured as one
      number afterwards. No factor per monster. **Food is not modelled**: the task prints what healing really
      costs, the planning chat decides from that.
    - **A step has a fixed cost** (the reset, the walk, the deposit), from the routes, once a step.
    - **Stock is free; what the stock does not cover costs the field price**: an ingredient is free while the
      bank holds 100 runs of it (the shortcut of `pickRecipe`), all or nothing, by-product or not; one function
      for the solver, the planner and the executor's solves. **The forward model drinks**: a fight step's
      potions leave the bank, so the stock runs out in the replay as in play.
    - **The node of a `src:` gather is per character**: the least net seconds per item, net of the XP share
      when the character holds the lane's role (a specialist's level is wanted anyway). No credit for a node's
      other drops yet; printed.
    - **A gated craft in a chain is priced and carried**: the parent's hours include the road to the level, and
      the level is a candidate for the lane's role holders with the parent's score.
    - The replay's rows: A the default, B potions free (the upper bound), C the field price always (the lower
      bound), D a win is enough.
    - Parked as before: a made piece in every fighter's pool (next in line), the tiny supply steps, the
      offering's hunt, `initiative`, work (c).
32. **Report 012 accepted (2026-11-20).** Checked in the chat: the commit in `.git/logs/HEAD` (`1d76174` 012, on
    top of `a3b9558` Rework notes); `src/plan/xp.ts`, `src/sim/cost.ts`, `src/plan/planner/config.ts` and
    `src/plan/planner/pick.ts` read in full — `fightXp`'s gap rule and wisdom, `wisdomOf`, `potionPriceOf`
    (`COVER_RUNS` 100, all or nothing), `restSeconds(hp, maxHp = 500)`, `KILL_LOG` 0.88, `STEP_BANK_SEC` 42,
    `potionStock`, `pickMonster` with the set's wisdom and `pickSource` (net of the XP share, the two-chunk
    guard) are as the report says. Not checked there: `reach.ts`, `cost.ts`, `supply.ts`, `forward.ts`,
    `decide.ts`, `gear.ts`, `jobgear.ts`, the check script, the check runs, the typecheck, the build (Claude
    Code ran them). **Engine change: Alex was told to restart the service on 2026-11-20 (morning)**; the log's
    tail at 07:19 UTC still carried run `[50ry]` (011's code). The next look at the log confirms the restart and
    reads the report's acceptance step 7 (coal for a miner's `src:diamond_stone`, the `lvl:mining:35` why, no
    `mat:` / `gear:` / trade step at 0.0 h). The readings, as the chat takes them:
    - **The three repairs stand** (fight XP, a kill's seconds, a step's fixed cost). `KILL_LOG` 0.88 rests on
      reconstructed sets (0.81–1.13 at the extremes); the measured means carry the live plans, as before. "The
      pig ends at 30" is the docs' reading (gaps 11–16 are not in the log); the first fight at a gap of 11
      settles it.
    - **Food stays unmodelled for now.** For a fighter that eats, healing and the food's whole making cost
      19–33 s a fight against the 33–64 s of rest the price assumes; 0.88 is the mix of 11-19. It goes into
      the consumables round with the potions, and `gatherPays` (still on 5 HP/s) with it.
    - **Row A (63) leans on the one-unit stack.** In play nobody brews for a fighter whose alchemy is below the
      recipe (minor health: 20; the fighters stand at 16–19), so until potions are supply through the bank play
      lies between rows C (56) and A. Row B (70; four fighters at 40 by day 16) is that round's ceiling in
      today's replay; what combat 40 is worth behind layers and events no replay sees yet.
    - **The cursed wood** (row A: 4,121 h of `src:cursed_wood` for an objective that does not fit — 35% of all
      hours, nine tenths of them potion making) is rule 4 as decided: a road that fits nothing takes the
      fallback's hours. Not changed. Noted for the consumables round: those fights drink the stock the combat
      road wants, and the drinks take stock that supply banked for an open parent.
    - **The timing turned over.** The fighters now reach 30 (events, potion fights) on days 10.6–13.2, before
      the first specialist reaches 40 (day 14.4). All three walls are a week or more away and a task takes
      hours. The chat's first reading kept the order for the size of what stands behind each wall (a layer 67
      points, an event 35); decision 33 corrects it.
    - Seen in the log's tail (05:16–07:19 UTC, 011's code), for 013's read. `i_want_bacon` completed at 07:18
      (+2). **A running kill step is subtracted whole from what is left while the achievements read already
      counts its kills** (read from the plan lines, not from the code): at 06:09 First planned 3 pigs with
      about 56 open (Fourth's 55-pig step stood at 47/55) and went woodcutting; Fourth took the last 45 at
      06:21. No kill wasted; the points came about half an hour late. Pig kills sampled at 57–82 s against
      estimates of 104–133 s (012 repairs that). Three characters share `intermediate_lumberjack` (+1 in
      ~44 h); Third levels alchemy 18 → 20 on Air Boost Potions (375 green slimes at 0 XP inside the step).
    - **The order after it**: decision 33. New in the line: **the consumables round** — potions and food as
      supply through the bank (who brews and cooks for whom, the stock kept for the road that earns points,
      healing priced as what it is), in service before the fighters pass 28. Parked: a restart repeats one
      action per running item; a drop objective chunked in actions; a made piece in every fighter's pool; the
      tiny supply steps; `initiative`; work (c).
33. **Task 013, settled in the chat** (2026-11-20; in the task file as "What is settled"). The restart is
    confirmed: `[yewz] server start` at 07:31:51 UTC, all five steps re-attached (First, Second and Fourth on
    `ach:intermediate_lumberjack:0`, Third on `lvl:alchemy:20`, Fifth on `ach:intermediate_fisherman:0`).
    - **The order changed: 013 is the fleet on events, 014 the consumables round, 015 keys, tolls and what is
      spent**; then the clean-up. Decision 29 tied the order to the day the fighters reach 30, and 012 moved
      that day from 41–64 to 10.6–13.2. Read in the chat from `maps.json`, `resources.json`, `monsters.json`
      and `events.json`: **everything behind a paid or keyed transition wants gathering 50, combat 44–55, a
      boss group or a raid** (the island: palm, swordfish, torch cactus and adamantite at 50, monsters 44–50,
      the empress a boss; the lava underground: monsters 52, fishing 50; the lich and the priestess are bosses;
      the Rosenblood House wants the cloak, so a raid). The one exception is the Enchanted Forest (5,000 gold):
      its mushroom is alchemy 40 and feeds a `use` objective. So keys and tolls pay from about the fifth week;
      before that they only decide whether a specialist's road from 40 to 50 scores. **Events are in reach
      now** (corrupted ogre 20, full moon vampire 24, bandit lizard 25; demon and corrupted owlbear 30; cultist
      emperor 35; the two apparitions at mining and woodcutting 35) **and a spawn cannot be made up later**:
      22–25 spawns with five characters for each apparition, one about every 33 hours. The potion wall
      follows at combat 28–35. Alex asked for the task in the same chat and was told of the change with it.
    - **Event work has one writer, the event interrupt**; a target with an `event` gate is never a step.
    - **A spawn counts when its content serves open demand**: an open objective's kills, drops or gathers, or
      an event-only material an open parent's bill is short of. XP alone is none.
    - **Everybody capable goes**, chosen one by one on the pool less the earlier members' sets, with 15
      minutes left after the walk and the reset, while the demand left exceeds what the members so far bring.
    - **An event whose demand can still complete by the deadline goes before any step**; one that cannot fit
      even with everybody on it calls nobody. No comparison with the interrupted step's score yet: the
      replay's row E (no events) against row A says whether events took time from better work.
    - **An event in the score is a calendar, not a wall**: the spawns needed × the mean time between spawns,
      one function for `rank()`, the bundle, the bills, the forward model and the runtime. An event
      achievement sits behind its level gate like any other, so the roads to mining and woodcutting 35 and to
      the event monsters' levels carry its points.
    - **The forward model attends events by expectation** (a share of each member's time, no dice); row E
      with `events: 0` must still end at 63.
    - Riding along: in flight for an `ach:` target is what a running step still has to do (the runtime's World
      only; the pigs of 06:09 UTC); `supply: supply:`; `CLAUDE.md`'s gap rule.
    - Out: merchants, gems, boss events, events behind a toll, potions as supply, food, spending.
34. **Report 013 accepted (2026-11-20).** Checked in the chat: both commits in `.git/logs/HEAD` (`a7a1fe5` Rework
    notes, `c8266ac` 013); `src/plan/planner/events.ts`, `src/state/eventorders.ts`, `src/plan/planner/config.ts`
    and `src/state/planner.ts` read in full: `gapSec`, `usableSec`, `possibleMembers`, `calendar`, `eventDemand`
    with "can still pay", `eventMembers` (one at a time on the pool less the earlier members' sets, 15 minutes
    left after the walk and the reset), `tripOf` ending in the step's own reset, `ownedEvents` / `busyOf` / `sent`
    / `eventPollMs`, and `worldOf`'s in-flight rule for `ach:` steps are as the report says. Not checked there:
    `decide.ts`, `bundle.ts`, `supply.ts`, `gear.ts`, `gates.ts`, `targets.ts`, `forward.ts`, the check script,
    the scenarios, the check runs, the typecheck, the build (Claude Code ran them). **Engine change: Alex was
    told to restart the service on 2026-11-20 (midday)**; the log's tail at 09:44 UTC still carried `[yewz]`
    (First, Fourth and Fifth on coal for `lvl:mining:35`, Second on birch, Third on green slimes for
    `lvl:alchemy:20`, fight 416 of 503 at +0 XP). The next look at the log confirms the restart and reads the
    report's acceptance step 7. The report's two decisions are not Alex's; answered in the chat:
    - **The spawn rate is the log's**: `SPAWN_LOG` 1.64 stays and is measured again at every log read (each
      spawn now writes a `plan: event` line). It is a factor without a mechanism: three spawns overlapped on
      11-17 23:21-23:41 UTC, so "one event at a time" is out; a cap on concurrent events or a slower roll are
      not. It flips no fit today: strange_miner needs 12 spawns of 42 expected, magic_harvester 19 of 42.
      The one place it could: corruption_eradicator. A month in it needs 185 spawns at the ogre or 122 at the
      owlbear against 56 expected of each, and each event's calendar is taken alone (`eventDemand`); across
      both events it is about 74 of each, which the docs' rate (92 expected) would cover and the log's does
      not. Looked at again when the rate has more spawns behind it; an objective that two events serve is
      then priced across both.
    - **The trip ends with the step's own bank reset**, as built; `queue.ts` and `exec.ts` stay untouched.
    The readings, as the chat takes them:
    - **77 against 63 is half firm.** The 7 points of the apparitions are gathers and need a third to a half
      of the spawns expected. The 8 points of event fights, and the gold set they feed, are priced with
      potions free inside the hour; row C (the field price always) attends the apparitions only and ends at
      63. Play lies between C and A, as before.
    - **What goes live with the restart is small**: the poll every 2 minutes, one `plan: event` line a spawn,
      the apparitions' points behind mining and woodcutting 35 in the bundles. No spawn has a member yet.
    - **The early price is accepted**: A is below E on days 7 and 14 (32 / 36 against 33 / 38) and 14 above at
      the deadline.
    - **An event fight's potions** (read in the chat, `events.ts contentSec`): the membership gate prices them
      at nothing, and the executor brews in the field when the bank holds none, so a member could spend its
      hour on sunflowers. The first fight members come about day 15: the consumables round has to be in
      service before.
    - **The Nomadic Merchant trip of 11-17 23:31** (72,000 gold withdrawn, nothing bought) is task 003's `buy`
      defect, repaired on 11-18; not a new one.
    - **Two miners on `lvl:mining:35` for one craft's points**: with strange_miner behind that level asking
      for three members it is what the fleet wants; left.
    - **The order stays: 014 the consumables round, 015 keys, tolls and what is spent.** Row B over row A is 8
      points in today's replay, but what it moves is the day the fighters reach 40 (12-16 against 56-81), and
      that day decides whether the 73 points behind a layer come into reach this season. Bag stock (below)
      rides along in 014.
35. **Task 014, settled in the chat** (2026-11-20; in the task file as "What is settled"). The restart is
    confirmed: the log's tail at 09:54:09 UTC carries run `[wj59]` (First, Fourth and Fifth on coal, Second on
    birch, Third at fight 460 of 503 against green slimes at +0 XP); `[yewz]` wrote its last line seen at
    09:44:09. Read in the chat for the task: `stock.ts`, `reach.ts`, `forward.ts`, `supply.ts`, `decide.ts`,
    `cost.ts`, `types.ts`, `compile.ts` of the core; `src/plan/xp.ts`, `bis.ts`, `consumables.ts`;
    `src/state/exec.ts`.
    - **What is wrong is one thing: nobody plans consumables.** The core prices a potion at the fighter's own
      field seconds (`xp.ts fieldSec`: no tool, the surest node) and plans one only while the pool holds it; in
      play a fight item brews only when the potion has no supply anywhere and the fighter's own alchemy meets
      the recipe (`exec.ts provisionPotions`), so for the fighters at alchemy 16-19 nobody brews a level-20
      potion at all; the forward model bridges that with `drinksOf`'s shortcuts. Food is the fight item's own
      business (`provisionFood`: bank, cook, gather and cook), priced as rest × 0.88.
    - **One writer**: an owned character's fight item never brews, cooks or gathers an ingredient. Characters
      the planner does not own keep today's behaviour.
    - **By need, as gear**: a potion or a food is needed for a run of fights when making it and fighting with
      it takes at most `NEED_RATIO` of the hours without; a recipe nobody meets is a need all the same and its
      level a candidate of the lane's role holders.
    - **Through the bank, for a horizon**: the need is a parent of supply (`mat:` by whoever may craft, `src:`
      by whoever reaches the ingredient) with the score of the work the fights are for; the demand is what the
      next two chunks drink and eat for each character on the work, plus a fifth. Stock is shared from the
      best-scoring parent down: that answers "who drinks first".
    - **A fight step takes what it planned** (its `withdraw`, the quantity, not the stack) and is as long as
      that covers; **running dry ends the step**, it blocks nothing.
    - **One price, the chain's**, by the best-placed maker with its tools; healing priced as eating or rest;
      `KILL_LOG` measured again for that reading.
    - **An event's fights are stocked for one spawn**, as a reserve no other bill takes; nothing is brewed on
      a trip.
    - **The forward model brews, cooks, drinks and eats through the bank**; `consumables: 0` is report 013's
      model whole and must still end at 77. Rows: A default, B consumables free, C report 013's model, D a win
      is enough, E no events, F all five hold the alchemy role.
    - Riding along: what lies in a bag is stock on its way (the bills count it; a withdrawal still waits for
      the bank).
    - **The question behind the task is its section 2**: what the potion wall is made of. If it is the
      ingredient gathers whoever does them, the round moves who makes potions and when, not how much they
      cost, and the lever is elsewhere (a higher tier, a tool, gear, gold). The section prints each lever as
      hours a combat level and what gold would buy; nothing is bought before 015.
    - Guesses of the chat, to be looked at with the replay: the horizon of two chunks, the margin of a fifth,
      `NEED_RATIO` reused for consumables, the event reserve of one spawn.
    - Out: any purchase, keys and tolls, the merchants, a `mat:` step that gathers its own inputs, `SPAWN_LOG`
      (the new ratio is printed, the constant stays unless it left 1.3-2.0).
36. **A lab tab for the replay (Alex, 2026-11-20, while 014 ran).** Asked when the interface changes, Alex kept
    the order (014 consumables, 015 keys and tolls, the clean-up, then the Roadmap as home). He then asked
    for the "emulator" as a tab of its own: change the parameters, the priorities and the steps, run it, look
    at the result, and tell the planning chat what to correct in the real roadmap. What exists for it: the
    forward model (`src/plan/planner/forward.ts`) and the replay of `scripts/check-planner.mts`, by
    expectation, no dice; the knobs of `PlannerConfig` (`first`, `weight`, `exclude`, `filler`, `roles`,
    `risk`, the deadline); `setPlannerConfig` to apply a patch to the real planner. What it needs: a run
    outside the service's one thread (a child process; a season is minutes, the whole check about 18), a
    start from the live World and not only the 11-18 snapshot, a forced opening per character ("this one
    does X first") since a step is otherwise the rule's to choose, two runs side by side, and a button that
    applies a run's knobs. Placed after the Roadmap task, which builds the same off-thread run for its
    outlook; the lab is that run with other knobs. To be told to Alex with every result: the model's
    differences between two runs are worth more than its absolute points (54 to 77 in five reports as prices
    were repaired).
    - **Its name is the Lab** ("Лаборатория"; Alex liked the word). **A thin first version, then shaped by
      use** (Alex, the same day: he does not know yet what he wants from it and has to touch something first).
      So the first version is the least that can be played with: start from the live World, the knobs that
      exist, one run off the service's thread, its result beside the default run's. The forced opening, the
      "apply" button and anything else wait for what he asks for after using it; no design ahead of that.
37. **The journal goes first: 015 is the journal, 016 keys, tolls and what is spent** (Alex, 2026-11-20: "yes").
    His idea was to improve the logs so that the chat can read them too: a new file every hour, more detail
    for analysis. Settled in the chat: hourly files of the raw log do not help (an hour is about 0.9 MB of
    action lines; the chat reads a file whole or its tail and cannot search; on 11-20 it saw the restart and
    could not find its time). What does:
    - **A journal beside the raw log**, one record a line, machine-readable: a step started (who, key, answer,
      why, units and hours planned), a step ended (units done, seconds taken against the estimate, where the
      seconds went: fight, rest, eat, bank, walk, gather, craft; potions drunk, food eaten, XP, what was
      banked), blocked / flapping / defect / no step, every interrupt, every `plan: event` decision, a restart
      with the commit it loaded, an achievement completed, the day's offerings. A couple of hundred lines a
      day: the chat reads a day whole.
    - **The raw log a file a day.**
    - **A status file rewritten every minute**: per character the step, its why and since when; the points;
      the last error; the run id and its commit. The chat's first read; a stale one says the service is down.
    - **A daily snapshot of the World** (the characters, the bank, the achievements' progress). Nothing
      reconstructs it later: it is the Lab's and the outlook's starting point and what the replay's forecast
      is held against, day by day.
    - The log factors (`KILL_LOG`, `SPAWN_LOG`, the step samples against their estimates) are read from the
      journal from then on; a task's "read the log" section becomes a read of the journal.
    After 014, because 014 changes the log's lines. An engine change: a restart follows.
    - Raised with Alex the same day as "not to be postponed" (his answers are recorded when given): the
      repository has no remote, every commit is local and on one disk (`.env`, `.ammo/` and `logs/` are
      ignored, so a push is safe); the service runs the working tree, so a crash or a reboot while a task
      runs loads half-done work (decision 28's near miss), and a second checkout at the accepted commit for
      the service would end the rule "restart only when the report exists"; nobody is told when the service
      stops; the season's end date (open question) is his to look up.
38. **Alex's answers to decision 37's list, and the bank (2026-11-20).**
    - **Push to a new branch, not `main`** (Alex: the repository exists; `main` gets the work when the rework
      is finished). The chat was wrong to say there was no remote: `.git/config` has `origin`
      (`git@github.com-personal:alver/artifactsmmo_client.git`), the local branch is `main` and the rework's
      commits were never pushed. So task 015 starts by creating `rework` at HEAD and pushing it with its
      upstream; every task from then on pushes its commits there. Nothing is pushed to `main`.
    - **The service's own checkout goes with the clean-up**, no hurry (Alex: "if the service goes down, it
      goes down, I bring it up when I can"). Until then the rule "restart only when the report exists"
      stays, and no alert is built.
    - **Bank space** (Alex asked whether he can buy more, or free some by recycling or selling outdated gear).
      Read in the chat: the game has `bank/buy_expansion` (+20 slots, the price rises with each;
      `BankDetails.next_expansion_cost`), the client wraps it (`docs/game-actions.md`: `buyExpansion`) and
      nothing calls it: no button in `TableTabs.tsx`, `FleetView.tsx`, `CharacterPanel.tsx` or `ActionBar.tsx`,
      no caller in `src/state/queue.ts`, `exec.ts` or `store.ts`. Selling is the event merchant's whitelist
      only (`src/plan/events.ts SELL_FLOORS`: sap, shell, golden shrimp, golden egg). Recycling exists as a
      queue item and as the planner's filler; outdated gear is never recycled on purpose. **No handling of a
      full bank (462) was found** in `queue.ts`, `exec.ts` or `store.ts` (searched for the code and the
      words; the generic error path was not traced): every step starts with a bank reset, so a full bank may
      stop all five. The Bank tab's header shows used / slots. Alex was asked for that number: with few slots
      free it is a small task of its own before the journal, otherwise it goes into 016 ("what is spent"):
      the planner buys an expansion when the free slots run low (spending: his yes), a 462 is answered
      instead of met, and gear no solve will pick again is recycled (what is destroyed for good: his yes).
    - **Sap is sold and it is a potion ingredient** (Alex, the same day: "why sell sap? it is needed for the
      potions"). He is right. The whitelist is a rule of the hive's time: the merchant order sells every sap
      above 300 and every shell above 50 (`merchantOrder`, `SELL_FLOORS`), 300 being somebody's guess of what
      the recipes need. And the same number is read the other way round by the planner: `stock.ts available`
      subtracts `floor(code)`, so the last 300 sap and 50 shells are what a step may **not** plan with (read
      in the chat in `stock.ts:42-46`; whether the bills go through `available` or the raw bank was not
      traced). For 016: nothing an open bill can use is sold, the sell floor stops being a planning floor, and
      what is sold at all is decided there with the rest of what is spent. Not touched while 014 runs.
39. **The bank is nearly full: 103 of 110 slots (Alex, 2026-11-20). The bank goes first: 015 the bank, 016 the
    journal, 017 keys, tolls and what is spent, then the clean-up** (the task numbers named in decisions 36-38
    shift by one; the bank and sap items that decision 38 sent to "016" are this task).
    - Alex's answers: the planner may buy bank expansions by itself ("probably yes"; he does not know how the
      price grows and wants to know at which point to stop); outdated gear is recycled, "definitely": if a
      piece is ever wanted again it is made again.
    - **A full bank is met by nobody** (traced in the chat): `src/api/client.ts` retries 499 and 461 only;
      `exec.ts bankOff`, `loopkit.ts`'s deposit and the gear swap's deposit pass a 462 on as an error; the
      item pauses, the planner blocks the step's target for 6 hours and decides again, and the next step's
      reset meets the same bank. So the targets are blocked one after another. Not seen in play yet. A
      deposit into a stack the bank already holds needs no slot, so it is new codes that fail.
    - **What 015 holds** (the task file is written in the chat that accepts report 014: 014 is changing
      `exec.ts` and `queue.ts` at this moment):
      - a 462 is "the bank is full": the character keeps what does not fit and goes on, the planner answers
        it (tidy, then buy); it never blocks a target for it;
      - **the tidy-up first**: gear that no fighter's solve picks at its level or any level ahead, that no
        open objective and no recipe asks for, is recycled as a planned step (reserved like any withdrawal);
        the materials that come back are stock;
      - **then an expansion**, when fewer than 10 slots are free and the tidy-up has nothing left: at most
        60,000 gold each and never below the gold floor (Alex, 2026-11-20: the next expansion costs 28,000
        today, so the chat's first 30,000 was too low and "the limit must be higher"; 60,000 is the start, his
        to move when
        he has seen the prices). Above the cap it is not bought and says so, with the price, where Alex sees
        it. Every purchase is logged with its price and the next one's;
      - printed for the stop rule: the price ladder (the docs' formula, or the live `next_expansion_cost`),
        the slots by kind (gear, materials, consumables, currencies, the rest) and what the tidy-up frees;
      - sap: nothing an open recipe can use is on the merchant's sell list, and `stock.ts available` stops
        subtracting a sell floor;
      - the branch `rework` and the first push (decision 38).
    - Until then seven slots are free. Alex was told that, if the number climbs before 015 is in service, one
      expansion bought by hand in the game's own client (a character on a bank tile) gives twenty slots and
      shows him the price.
40. **Report 014 accepted (2026-11-20, evening).** Checked in the chat: the commits in `.git/logs/HEAD`
    (`938d11f`, `4f2f589`, `6fd2f0f` Rework notes, `edaaf23` 014; `docs/rework.md` was last written at 15:01 UTC,
    so `6fd2f0f` carries decision 39 too); `src/plan/planner/consumables.ts`, `compile.ts` and `stock.ts` read
    in full; `decide.ts` (`fightPlan`, `levelCand`); in `src/state/queue.ts` `takeOf`, `ranDry`, `keepOf`,
    `ctxOf` and the fight and gear cases; `exec.ts` (`bankOff`, `healOnce`, `fightRound`); `jobgear.ts`
    (`jobGear` with `planned`, the reset's stash, the top-up and trim); `src/state/planner.ts` (`worldOf`,
    `bagsOf`, `next`); `src/plan/consumables.ts` (`healingFoods`, `foodQuantity`); `used` in
    `src/sim/combat.ts`. They are as the report says. Not checked there: `reach.ts`, `supply.ts`, `forward.ts`,
    `events.ts`, `eventorders.ts`, `bis.ts`, `config.ts`, `gear.ts`, `cost.ts`, the check script, the scenarios,
    the check runs, the typecheck, the build (Claude Code ran them). **Engine change: Alex was told to restart
    the service on 2026-11-20 (evening)**; the log's tail at 18:13 UTC still carried `[wj59]` (First, Fourth and
    Fifth on coal, Second on birch, Third on nettle). The next look at the log confirms the restart and reads
    acceptance step 7. The report has no decision for Alex; agreed. The readings, as the chat takes them:
    - **Two defects found in the chat's read, neither covered by a scenario; both go to the head of 015.**
      - *Planned food has no bag cap.* `fightTake` plans `ceil(units a kill x kills x 1.2)` of the food and the
        reset withdraws `min(short, banked, freeSpace)` until the bag is full (`src/state/queue.ts:519-528`).
        The old path capped a restock at a third of the bag (`src/plan/consumables.ts foodQuantity`). A bag is
        100 + 2 a level (Fifth banked 144 items at combat 23). 147 units for 122 wolf kills leave three slots:
        the drops send the fighter to the bank every few kills. A plan above the bag (two or three units a
        kill: cooked chicken, 80 HP, against 184 lost) fills it whole; `fightRound` then calls `bankOff` with
        the food protected, it throws "inventory full of protected working stock" (`exec.ts:61-63`), the step
        does nothing and its target is blocked for 6 h. Nothing is lost by it. Repair: a step's kills are
        capped by the food its bag carries (a third of the bag), as they are by a potion stack.
      - *The food in the plan is the best-healing one in stock, whether or not it fits the fight.* `poolFood`
        returns the first of `healingFoods` (highest heal first) with any stock, and `fightTake` takes
        `floor(lost / heal)` units a kill: with one apple pie (320) or cooked porkchop (225) in the bank a
        fight that loses 184 plans no food and rests, whatever lesser food the cook banked for it. `foodFor`
        (the need) judges each food on its own, so the cook makes food that is not eaten until the bigger one
        is gone. Repair: the food in the plan is the best in stock that the fight's loss covers at least once.
    - **87 leans on event fights.** A is 19 points above row E; the two apparitions (gathers) were 7 of report
      013's 15. A trip takes at most one stack of a potion (`takeOf`): 16 kills of the full moon vampire (6 + 6
      a kill), 9 of an ogre or a lizard (11 + 11), 7 of a demon (13 + 13) a spawn, and the forward model
      credits the member's whole share of the hour (the report's own note). The event fights' points and the
      gold set behind them are optimistic by that factor until a trip carries more.
    - **A fight step is a stack long**: `fightTake` caps the kills at `floor(100 / (units a kill x 1.2))`, 16
      at the rat's 5 + 5, a quarter of an hour, then a bank reset; the forward model has the same cap, so the
      replay pays it. Potions beyond a stack could ride in the bag and be equipped when the slot drains, with
      no bank trip; the same lifts the trip's cap. For the round before the first event fight members (about
      day 15), with the first potion steps' samples in hand.
    - **Run dry is "none left"**: `ranDry` is true at zero of a planned code, and the live gate takes a worn
      potion as inexhaustible (`combat.ts:438-442`: `used` knows no stock), so a step whose fights drink more
      than planned + a fifth fights its last kill short of potions: a possible loss and the walk from spawn,
      then the step ends. Left as it is.
    - **The replay check stands at its backstop**: 1,716 s of 1,800 (the rows run side by side; row D alone
      1,689 s, row A 1,539 s). 015 gives it room (a higher backstop; rows D and F on request).
    - **What the round bought**: 10 points at the deadline and combat 40 three to six weeks earlier, which is
      what the layers behind keys and tolls need. What it did not: the hours. Half the season still goes into
      ingredients; the levers left are the stock of by-products (the fishing objectives' algae), a trip and a
      step that carry more than a stack, and gold (open question: the Grand Exchange).
    - **The order stays**: 015 the bank, with the two food repairs and the check's backstop riding along; 016
      the journal; 017 keys, tolls and what is spent.
    - **The bank stood at 102 of 110 on the night of 11-20 to 11-21** (Alex; 103 at midday): eight slots free
      with nettle already coming in, so nothing is bought by hand. The log's tail at 23:30 UTC on 11-20 still
      carried `[wj59]`: not restarted yet. 015 is written once the restart shows in the log, so that the first
      hours of 014 in play are in the task.
41. **Task 015, settled in the chat** (2026-11-21, night; in the task file as "What is settled"). The restart is
    confirmed: `[tdhi] server start` at 23:32:54.550 UTC on 11-20, all five steps re-attached (`lvl:mining:35`
    for First, Fourth and Fifth, `ach:intermediate_lumberjack:0` for Second, `lvl:alchemy:30` for Third);
    `[wj59]` wrote its last line at 23:32:31.965. No decision of 014's code was seen yet (the re-attached steps
    are 175-181 gathers each); 015 reads the first hours. Read in the chat for the task: the state of 23:32:55
    UTC (above, "How we work"), `src/api/client.ts` (the retries), `loopkit.ts depositAll`, `runLoop`'s error
    path, the `recycle` item, `src/plan/events.ts` (the sell floors), `scripts/check.mts`.
    - **The bank at 23:32:55 UTC**: 102 codes of 110 slots, three expansions bought, the next 28,000 gold,
      231,984 gold. About 45 codes are gear; copper, wooden, leather and iron pieces of level 1-10 lie there in
      5-24 copies each while the fleet wears adventurer and steel sets at combat 22-25. Cooked food: 4 cooked
      trout and nothing else, so by `poolFood` no fight that loses under 225 HP eats (decision 40's second
      defect, live from the first kill step). 240 air boost potions (the alchemy levels' by-product) hold a
      slot; 575 sap, of which the merchant's order would sell 275. Points: 26.
    - **A slot is a code**, so a tidy takes a code whole: every copy is recycled, by a character that may
      recycle it, as a planned step. Outdated = recyclable, ten levels below the lowest combat level, worn by
      nobody, picked by no solve the planner makes today, used by no recipe and asked for by no bill.
    - **Tidy below 15 free slots, buy below 10 when nothing is left to tidy**; an expansion at most 60,000 gold
      and never below the gold floor; above the cap one line a day says so. With no slot, no tidy and no gold,
      a step that would bank a new code is no candidate and nobody is paused.
    - **A 462 keeps what does not fit in the bag and goes on**, for every character; the planner hears of it
      and never blocks a target for it.
    - **The standing order sells nothing a recipe uses**, and `stock.ts floor` is the gold floor alone.
    - **Food**: a step's planned food is at most a third of the bag and its kills are capped by it; the food
      in the plan is the best in stock that the fight's loss covers once.
    - **The replay check**: a 2,700 s backstop; rows D and F only on request.
    - **The branch `rework`** is created by 015 from `main` at `edaaf23` and pushed; `main` is not moved.
    - Seen in the state, for 015's read: `src:ogre_skin@Fifth` blocked at about 22:41 UTC on 11-20 for "lost 2
      fights in a row" (013's code); the record of `validate.ts` holds ogre and vampire fights lost with 1-5
      potions drunk against 7-9 predicted, the slot's stack running out inside the fight. Under 014 a step ends
      by its kills with a fifth of its potions left; 015 counts such losses since the restart.
    - Guesses of the chat: the thresholds 15 and 10; the level margin of ten; "no solve today picks it" as the
      test of use (a piece's element may fit a monster the fleet meets later; Alex's "it is made again" covers
      it).
42. **Report 015 accepted (2026-11-21, morning).** Checked in the chat: the commits in `.git/logs/HEAD` (`1b80879`
    Rework notes, `e66621e` 015: bank), `HEAD` on `rework`, `refs/remotes/origin/rework` at `e66621e`, `main` still
    at `edaaf23`; `src/plan/planner/bank.ts` and `stock.ts` read in full; `loopkit.ts` (`freeSlots`, `noSlotFor`,
    `deposit`, `depositAll`); `exec.ts` (`bankOff`, the guard in `gearSwapStep`, the swap's deposit); in
    `src/state/queue.ts` the `deposit-all`, `recycle` and `expand` items, the reset's food cap, the claim's deposit
    and `runLoop`'s `bankFull`; `src/state/planner.ts` (the no-block after a refusal, the hook, `bankCheck`, the
    `bank` class, the boot call); `decide.ts` (the tidy first, the stuck filter); `compile.ts` (the tidy's items);
    `src/plan/events.ts` (`merchantOrder`); `consumables.ts` (`poolFoods`, `poolFood`, `fightTake`, `useOf`). They
    are as the report says. Not checked there: `reach.ts`, the core's `events.ts`, `config.ts`, `types.ts`, the
    check script, the scenarios, the fake, the check runs, the typecheck, the build (Claude Code ran them).
    **Engine change: Alex was told to restart the service on 2026-11-21 (morning)**; the log's tail at 08:36 UTC
    still carried `[tdhi]`. The next look at the log confirms the restart and reads the report's acceptance step 7.
    - **The bank stood at 106 of 110 at 08:36 UTC** (the state's copy; gold 232,916): four free slots under 014's
      code, which meets a 462 with a pause and a 6-hour block. New codes since the night: health splash potions
      (94), a full moon vampire cape, rat hide, a golden egg, a sunflower. After the restart the running steps
      re-attach, so the first tidy step comes at the first crafter's step end (Fourth at about 09:10 UTC, Second
      09:25, Third 10:00, by their paces at 08:36). From four free the tidy needs eleven slots net: about 13-15 of
      the 22 outdated codes.
    - **Sap: 575 at 23:32 UTC on 11-20, 303 at 08:36.** Not traced in the log; it fits the old order selling down
      to its floor of 300 once more, plus three from the birch. 015 ends that.
    - **The report's decision 1 (gear with a rare ingredient is not recycled) is Alex's** (what is destroyed for
      good): asked on 11-21 with the default "keep the rule". Today it holds one slot (the wooden staff ×2). The
      default stands until he answers.
    - **Its decision 2 (the cap) needs nothing today**, and it is the answer to Alex's "at which point to stop":
      the ladder doubles (3,500 · 7,000 · 14,000 · 28,000 · 56,000 · 112,000 · 224,000); 60,000 buys two more
      (150 slots, 84,000 gold); the third costs 112,000 and the model wants it about mid-December. Before that 017
      decides what non-gear stock goes (58 of the 102 codes of 11-20 were not gear).
    - **The replay moved and the moves are not attributed**: A 87 → 86, B 94 → 90, C 77 → 78 (the sell floor,
      shown), F 86 → 91, D and E as they were; in row A First (the cook) reaches combat 40 on day 71.8 instead of
      40.0, in row B it never reaches 30. Not held against the report: a few points between runs is the greedy's
      path (decision 30 has the same), and the rows' differences are what is read. For the next replay round
      (017): why B fell with consumables free, and First's road.
    - **Found in the chat's read** (none of it holds the restart back):
      - After a 462, `deposit()` sets the local `slots` to the codes the engine knows, and nothing reads
        `/my/bank` again until an expansion or a restart: the count can stay a slot or two under the real one
        (the safe side), and "of N slots" in the bank's lines is then that number. One read after a 462 ends it.
      - `planMake`'s odd ingredient (the report's note) bit again under 014's code: `ach:alchemist:2@Third` was
        blocked for 6 h, "no Nettle Leaf (need 2) for Health Splash Potion", until 08:33 UTC on 11-21. Twice in
        a day: the repair rides along in 016.
      - A tidy's why counts the codes that go, not the new codes that come back ("frees 3" can be 2 net).
      - A tidy step has no reset, so it starts with the last step's bag (a level step leaves its ore there); the
        `recycle` item banks off when the bag is full (`src/state/queue.ts:361-368`). No scenario runs that.
    - **The order stays**: 016 the journal, written once the restart shows in the log, with the boot line and
      the first tidy steps read; 017 keys, tolls and what is spent.
43. **Task 016, settled in the chat** (2026-11-21, morning; in the task file as "What is settled"). The restart
    is confirmed: `[lxra] server start` at 08:49:13.136 UTC, all five steps re-attached (`lvl:mining:35` for
    First, Fourth and Fifth, `ach:intermediate_lumberjack:0` for Second, `src:nettle_leaf` for Third); `[tdhi]`
    wrote its last line at 08:48:52.584. The boot's bank line (08:49:17.778): 106 of 110 slots, 4 free, the next
    expansion 28,000, gold 232,916, 24 outdated codes. No decision of 015's code was seen (the tail ended at
    08:51:42; the first crafter's step ends at about 09:10): 016 reads the first tidy steps.
    - **Alex on report 015's decision 1 (2026-11-21): gear with a rare ingredient is kept "for a while"; decided
      later.** The rule stays (`autoRecyclable`); the question comes back with 017, when more than the wooden
      staff falls under it.
    - **The raw log goes into hourly files after all** (decision 37 said a file a day, and that hourly files do
      not help): the chat can copy a file of about a megabyte to its own machine and search it there, as it did
      with the state on 11-21; a day of raw log is about 21 MB and may not copy. `logs/dev.log` gets no more
      lines and stays as the archive.
    - **The journal is written by the runtime from what the engine knows**, one JSON record a line, a file a
      day; the plain `plan` lines stay in the raw log. Where a step's seconds went comes from one meter on every
      action's echo (the cooldown's seconds by its reason), cut at step and interrupt boundaries.
    - **A status file every minute, a World snapshot a day**, and a reader (`npm run journal`) that prints what
      each task's "read the log" section printed; from 017 on that section is the reader's output.
    - Riding along: a craft step planned in whole runs (`planMake`); one read of the bank after a 462; an `api`
      line's body cut at 600 characters; and one question with a conditional repair: whether `bankCheck`'s
      "something is left to tidy" (`tidyVerdicts` with no name) can hold while no character's `tidyStep` takes
      the code, in which case no expansion would ever be bought.
    - **Seen in the boot line, for 016's read**: Wooden Shield ×5 and Iron Armor ×8 are named outdated; report
      015's table (the bank of 23:32 UTC) kept both for a solve (the_reaper, First and Second). The verdicts move
      with the solves. If a piece goes today that a solve picks tomorrow, gear by need makes it again (Alex's
      rule); how often that happens is what the journal's `step` records will show.
    - Out of 016: deleting old logs, any UI for the journal, an alert when the service stops, a replay started
      from a snapshot (the Lab and the outlook take that), the replay's unexplained moves of report 015 (017).
44. **Report 016 accepted (2026-11-21, midday).** Checked in the chat: the commits in `.git/logs/HEAD` (`f3ce840`
    Rework notes, `c8cbd78` 016: journal, 10:22 UTC), `HEAD` on `rework`, `refs/remotes/origin/rework` at
    `c8cbd78`, `main` still at `edaaf23`; read in full: `src/lib/journal.ts`, `src/lib/devlog.ts`,
    `src/api/actions.ts`, `src/server/main.ts`, `src/state/planner.ts`, `docs/journal.md`; in
    `src/state/loopkit.ts` `deposit` and `readBankAfter462`; in `decide.ts` `planMake`; in `bank.ts` `tidyStep`
    and `tidyLeft`; in `src/state/queue.ts` the five places that hand the journal a record; the cut in
    `src/api/client.ts`. They are as the report says. Not checked there: `eventorders.ts`, `scripts/journal.mts`,
    the harness, the scenarios, the fixtures, the check runs, the typecheck, the build (Claude Code ran them).
    **Engine change: Alex was told to restart the service on 2026-11-21 (midday)**; the log's tail at 11:37 UTC
    still carried `[lxra]`. The next look confirms the restart from `logs/status.json` and the day's journal
    (the report's acceptance step 8).
    - **What the live path gained, and why it is safe to load**: `act()` calls the meter around every action;
      `meterStart` reads the queue's head with optional chaining and `meterEcho` is caught, so the meter cannot
      fail an action. Every writer is caught (`journal`, `writeStatus`, `writeWorld`, devlog's flush). `npm start`
      runs on port 5173, so the files go under `logs/`; another port writes under `logs/port-<N>/`.
    - **015 holds in play** (the report's section 1): six tidy steps by Fourth and Second from 09:13 to 09:36 UTC,
      14 codes and 99 copies recycled, 4 → 15 free slots; no 462, no expansion, no sale since the restart. Ten
      outdated codes are left, all gearcrafting (Third's), for the next time fewer than 15 are free. The 355 sap
      went to the Timber Merchant at 08:12–08:17 under 014's code; 015's rule has held since.
    - **The replay**: A 86, B 90 → 94, C 78 → 73, E 68. The only change that reaches a replay is `planMake`'s
      whole runs; why C lost five points was not decomposed. It joins the replay questions of decision 42 (row
      B, First's road) for 017.
    - **Found in the chat's read** (none of it holds the restart back):
      - **`tidyLeft` can say "nothing left" while the others still have tidy steps.** `tidyStep` gives nobody a
        step while another character's tidy step runs (`bank.ts`, its second line), so during a character's
        last tidy step, once its copies have left the bank, `tidyLeft` is false whatever the others could
        recycle. With fewer than 10 free, a heartbeat inside those minutes buys an expansion early (28,000 now,
        56,000 next, both under the cap). Before 016 the test without a name stayed true there. Today it cannot
        bite: only Third has codes left. Repair in 017: a tidy step in flight counts as "something is left".
      - `statusNow()` builds the status outside any catch (`planner.ts`, the argument of `writeStatus`). It is
        the last line of `start` and of `endRecord`; a throw there would reject `next()` after the step's `end`
        record and before its block or sample, and the next tick would decide again. Nothing in it is known to
        throw (the scenarios run it at every step and end, events included). A try around it costs nothing: 017.
      - `status.json` is replaced by a rename. On Windows the rename fails while another process holds the file
        open; the write is dropped and the next minute's goes through. A reader that sees a status two or three
        minutes old should look twice before calling the service down.
      - The raw sink remembers the directories it made. A `logs/raw/<day>` deleted while the service runs loses
        that day's later lines until the restart. Nothing deletes there today.
    - **For 017, from the report's notes** (the executor's two defects were read from the order of actions,
      which the journal does not keep and the raw log does):
      - First's `ach:the_reaper:1@First#2` (01:02 UTC) banked the potions it had planned and already wore, and
        fought without them;
      - Second's full moon trip (01:12 UTC) planned 100 + 100 potions and 72 trout, took 54 and 9, ran dry after
        12 fights and brought one cape of the four it went for;
      - a tidy step's `units` is its last code's count; the verify skill still names `logs/dev.log`.
    - **How the chat reads from now on**: `logs/status.json` (what each character is on, the bank, the blocks),
      `logs/journal/<day>.jsonl` (about 134 kB a day), `logs/world/<day>.json`, and an hourly raw file
      (`logs/raw/<day>/<HH>.log`, about 0.9 MB) when the order of actions matters. The schema is
      `docs/journal.md`. A task's "read the log" section is the output of `npm run journal`.
    - **The order stays**: 017 keys, tolls and what is spent, written once the restart shows in the journal.
45. **Task 017, settled in the chat** (2026-11-21, early afternoon; in the task file as "What is settled"). The
    restart is confirmed from the new files, read in the chat: `logs/journal/2026-11-21.jsonl` starts with
    `boot` at 11:43:34.391 UTC, run `0gpn`, commit `c8cbd78…`, branch `rework`, all five steps re-attached
    (`lvl:mining:35` for First, Fourth and Fifth, `ach:the_reaper:1` for Second, `ach:intermediate_alchemist:0`
    for Third); the bank's boot record: 95 of 110 slots, 15 free, gold 240,489; `logs/status.json` a minute old
    at 11:59 UTC with all five steps; `logs/raw/2026-11-21/11.log` and `logs/world/2026-11-21.json` (88 kB)
    exist. The first `end` records are `partial`, as designed.
    - **Alex on the Grand Exchange (2026-11-21): yes to reading it, and to reading it regularly** ("about every
      ten minutes, to collect prices in the logs for an analysis in a few days"). 017 adds a standing poll of
      `GET /grandexchange/orders` into `logs/market/<day>.jsonl` and a reader; one read of the orders and of
      the seven-day history of the consumables and their ingredients goes into the report. Nothing is bought or
      sold there; buying is Alex's decision after the analysis.
    - **What 017 opens**: the nine conditional transitions (five keyed, three paid, one that wants a carried
      item) and the tiles with conditional access, for the core, the forward model and the runner; bosses and
      raids keep their gates. The bank held 24 lich tomb keys and 584 tasks coins at 11:43 UTC; `tasks_farmer`
      is done, so the Tasks Trader is open; `clean_the_lab` and `secure_the_island` stand at 0.
    - **What is spent**: fares from `available("gold")` (the 20,000 floor), priced in the score at
      `config.goldPerHour` 300 (design D.2); tasks coins on an objective's own material and, if it falls out of
      the same change, on a needed gear piece's material, down to a floor of 50 coins; every unit spent is a
      `spend` record. `config.tolls` 0 is report 016's model, for a replay row that must end at 86. Buying a
      material for gold from an NPC stays out; the report lists what would pass.
    - **Seen in the journal's first hour, and riding along**: First ran two kill steps of one vampire each
      (11:45 and 11:49 UTC; 263 s and 231 s for a fight of about 40 s) because Second's step held 84 of the
      minor health potions: a kill step the stock caps below a third of its chunk is no candidate. The same
      step's `wear` named steel battleaxe, iron armor and earth rings and its `end` withdrew battlestaff,
      mushmush jacket, a life ring and a water ring: the set a `pl:` fight step wears becomes the step's
      `wear`. With them: `tidyLeft` while a tidy step is in flight, a try around the status, the event trip
      that took less than it planned, a tidy step's `units`, the verify skill's log name (decision 44).
    - Read-only in 017, for Alex's later decisions: the bank's non-gear codes that nothing uses, and the gear
      kept only by the rare-ingredient rule (decisions 42, 43); First's hours in row A (decision 42).
    - Out of 017: any Grand Exchange purchase or sale, gold purchases from NPCs, group boss fights, raids,
      `use` objectives, selling bank stock.
46. **Report 017 accepted (2026-11-21, late afternoon).** Checked in the chat: the commits in `.git/logs/HEAD`
    (`1223803` Rework notes, 12:16 UTC; `b322195` 017: keys and tolls, 16:04 UTC), `HEAD` on `rework`,
    `refs/remotes/origin/rework` at `b322195`, `main` still at `edaaf23`; read in full: `src/state/market.ts`;
    in `src/api/client.ts` `getAllPages`; in `src/state/loopkit.ts` `freeBack`, `mayFor`, `moveTo`, `nearest`,
    `depositAll`; in `src/state/queue.ts` `plannedSet`, `keepOf`, the `fight` case and the reset's take loop
    (the fares). They are as the report says. Not checked there: the core (`reach.ts`, `decide.ts`, `supply.ts`,
    `forward.ts`, `events.ts`), `exec.ts`, `jobgear.ts`, the harness, the scenarios, the check runs, the
    typecheck, the build (Claude Code ran them). **Engine change: Alex was told to restart the service on
    2026-11-21 (late afternoon)**; `logs/status.json` at 16:39 UTC still carried run `0gpn`, commit `c8cbd78`
    (all five running: three on birch wood for intermediate_lumberjack, Third on nettle, Fifth on gold ore;
    bank 93 of 110, gold 240,836; nothing blocked). The next look confirms the restart from `logs/status.json`
    and the day's journal (the report's acceptance step 8).
    - **016 holds in play** (the report's section 1, 11:43–15:10 UTC): no pause, block, flap, defect or server
      error; the two-a-run craft steps did not pause (142 of 142, 4 of 4).
    - **What changes in play after the restart**:
      - tasks coins are spent on crystals for needed gear, down to 50 coins (584 banked): today's needs are a
        skull ring for First, Third, Fourth and Fifth (16 coins a piece) and six pieces for Second (8–16
        each), about 150 coins;
      - the boat (2,000 gold a round trip) and the Enchanted Forest (5,000) are open to the plan from bank gold
        above the 20,000 floor; nothing behind them is a target today (combat 40–55 or a gathering skill of
        50), so no fare is expected for weeks;
      - a `pl:` fight step wears its planned set; no kill step for fewer than five kills and a third of its
        chunk; an event trip plans what the bank holds;
      - the market poll: 10 requests every ten minutes into `logs/market/<day>.jsonl`.
    - **The replay**: A 88, B 121, C 108, E 62, G (`config.tolls` 0) 86. **A replay number carries a few
      points of noise**: the solve caches make a row's path depend on what else is solved while it plays
      (016's own code ends at 86 or 89). Differences of two or three points between reports are not read as
      results any more; the repair (a replay that does not depend on the order of solves) goes into the
      clean-up, before the Lab stands on it.
    - **What the replay says**: the opened ways are worth 28 points on paper and 2 in row A, because the
      fighters reach combat 40 too late to use them (the boat is first taken on day 64). With consumables
      free (row B) the same ways give 121. **The potions' ingredients are the wall now, about 33 points
      of it**; First, who fishes the algae and cooks, spends 60–98% of its hours on supply from day 20 and
      never reaches combat 40.
    - **The first market read points at the same place**: algae is on sale at 2 gold (3,205 traded in a week
      on the first page alone) against 253 s of the fleet's time a unit — 28 gold for a fleet-hour of it, a
      tenth of `goldPerHour`. Nettle at 7 (680 gold a fleet-hour) does not pass; sap at 4 does (55). Only 86
      algae stood at that ask, so a real supply would be buy orders, which lock gold in a character's
      pocket. Nothing is bought: the poll collects a few days, then the analysis, then Alex decides
      (decision 45).
    - **The sliver rule stays as shipped** (`SLIVER` 5). In the model it costs row E 21 points at most and
      gains row A 11, inside numbers that differ by 9 with the cache order; live, every sliver seen was an
      objective's kill step of 1–4 kills that paid about 110 s of reset and walk for a 40 s fight. Read
      again from the journal after a day: whether a fighter's combat road starves while potions trickle in.
      If it does: the rule for objective and supply kills only.
    - **From the report's notes, for the clean-up or later**: a key is not made by supply (a way whose key is
      not banked stays shut); `mayFor` opens a paid way to any character with the fare in its pocket (nothing
      plans such a trip); `plannedSet` leaves the bag and the artifacts as worn; a kill step has no fixed
      cost in the plan (about 110 s measured); `codeSec` prices a source without asking whether the fleet
      meets its level.
    - **Seen in the chat's read** (none of it holds the restart back): the reset withdraws the fares when the
      bank's whole gold covers them, without the floor — the floor is the plan's (`available("gold")`), so a
      step that passed the plan is paid; `plannedSet` counts a banked piece another step may have reserved —
      the pool is the plan's too, and a piece that is gone falls back to the executor's solve with one line.
    - **For Alex's later decisions, unchanged**: the gear kept by the rare-ingredient rule is three codes
      (wooden staff ×2, iron axe ×5, spruce fishing rod ×5); the bank's unused codes are the 24 lich tomb
      keys, two small bags of gold and seven materials for recipes at crafting 25–35.
    - **The order stays**: 018 the clean-up (with it the service's own checkout, decision 38, and the
      replay's noise), written once the restart shows in the journal.
47. **Task 018, settled in the chat** (2026-11-21, evening; in the task file as "What is settled"). The restart
    is confirmed: the journal's `boot` at 17:01:00.805 UTC, run `qf93`, commit `b322195`, branch `rework`, all
    five steps re-attached (`ach:intermediate_lumberjack:0` for First, Second and Fourth, `src:nettle_leaf`
    for Third, `lvl:mining:35` for Fifth); the bank's boot record 93 of 110, gold 240,836;
    `logs/market/2026-11-21.jsonl` exists (5.2 kB, a whole line by its size); `logs/status.json` rewritten at
    17:08 UTC. Nothing else was in the journal by then: 017's acceptance step 8 is read by 018, section 4.
    - **018 only deletes.** No file under `src/plan/planner/`, `src/sim/`, `src/api/`, `src/lib/` or
      `src/catalog/` changes; the replay must end at 88 / 121 / 108 / 62 / 86 with the same count of invariant
      checks; a surviving scenario's assertions are not edited. Nothing new is drawn.
    - **What goes** (decision 15, and what only it reaches; read in the chat from the import graph of `src/`
      at `b322195`): the hive (`src/state/hive.ts`, `src/plan/hive/*`, its panel); the pins and the training
      loops; the helpers; 🔁; the queue editor and every "+ Queue" button; the old Roadmap
      (`src/plan/roadmap.ts`, `src/state/roadmap.ts`, `src/plan/fleetcheck.ts`, `RoadmapTab.tsx`, its route);
      the gear coverage view (`src/plan/coverage.ts`, its panel); the standing orders and the daily offerings
      trigger of a character that is not the planner's; the item kinds no surviving writer writes (`move`,
      `rest`, `accept-task`, `deliver`, `turn-in`, a `work-task` of its own, `train` of combat, gathering
      or with `for`); their checks and scenarios; the storage keys nothing reads, dropped at boot with a line
      each.
    - **What stays**: the switch per character (off: the queue is emptied and stopped, and nobody writes to
      it); the direct action buttons; the Group fight fold with `prepare`, until the group-fight round; the
      queue table, read-only, with the planner's line; the atlas; the Sim tab.
    - **Between 018 and the Roadmap as home the page has no Roadmap tab.** Fleet is the home; each character's
      step and its why stay in its queue panel. Alex was told.
    - **Inside a function that survives nothing is cut**: the executor's branches that only an old item shape
      reaches (a `fight` without `take`, a `gear` without `wear`, a craft that waits for a hive producer) are
      listed by 018 and decided in the chat after it. The five pairs that exist twice are not merged; each old
      one stays only while a surviving caller calls it.
    - **Changed against decisions 38 and 46**:
      - **the service's own checkout is not in 018** but its own small task later (Alex, decision 38: no
        hurry). Reason: one restart should not bring both the largest deletion and a new way to start the
        service. The sketch for it: a git worktree `live/` inside the project at the commit the planning chat
        names in a file at acceptance; state (`.ammo/`, `logs/`, `.env`) stays at the root; Alex's restart is
        one command that updates `live/`, builds and starts;
      - **the replay's noise is not repaired in 018.** Read in the chat (`reach.ts cached`, `lookup`): the
        solve caches serve a pool from a result solved on a larger pool, by design, for speed (the solve is
        the dearest part of a decision and the replay already takes 2,058 s of its 2,700 s). An exact cache is
        a question of hours of replay, not a line. It goes with the Lab: there the band is measured (the same
        row played under several cache orders) and shown beside every number, or the cache is made exact if
        the time allows. Until then a difference of a few points between two replays is not a result.
    - **The order after 018**: 019 the Roadmap as home with a cut-down outlook → the Lab (decision 36) → group
      boss fights. The service's own checkout when it fits; the market analysis after a few days of
      `logs/market/`, then Alex's decision about buying.
48. **Report 018 accepted (2026-11-21, late evening).** Checked in the chat: the commits in `.git/logs/HEAD`
    (`d9739a2` Rework notes, 17:12 UTC; `e68045a` 018: clean-up, 18:21 UTC), `HEAD` on `rework`,
    `refs/remotes/origin/rework` at `e68045a`, `main` still at `edaaf23`; the tree of `src/` (89 files: no
    `plan/hive/`, no `state/hive.ts`, no roadmap, fleetcheck or coverage module, none of their panels;
    `plan/objectives.ts` is the moved file); read in full: `src/state/sync.ts` `dropOld` and `boot`,
    `src/state/queue.ts` `loadStored` (`GONE_KINDS`, `goneTrain`), `src/state/store.ts`,
    `src/plan/planner/compile.ts`, `config.ts`, `types.ts`. They are as the report says. The one place a
    deletion could have reached the planner's own items: `goneTrain` drops a stored `train` whose skill is
    not in `CRAFT_TRAIN_SKILLS`; the planner writes `train` only for `TRAIN_LANES`, the same four skills
    (weaponcrafting, gearcrafting, jewelrycrafting, cooking), so no `pl:` item goes at boot. Not checked
    there: the rest of the diff, the checks, the typecheck, the build, the greps (Claude Code ran them).
    `package.json`: `npm start` is `vite build && node scripts/serve.mjs`, so the restart builds the page too.
    **Engine change: Alex was told to restart the service on 2026-11-21 (late evening)** and to reload the
    page after it (a tab of the old build calls functions that are gone); `logs/status.json` at 18:37 UTC
    still carried run `qf93`, commit `b322195` (all five running: First, Second and Fourth on birch wood for
    intermediate_lumberjack, Third on nettle, Fifth on gold ore, mining 30; 28 points; bank 93 of 110, gold
    240,836; nothing blocked). The next look confirms the restart from `logs/status.json`, the day's journal
    and the boot hour's raw log (the report's acceptance step 8).
    - **The gate**: 82 checks, 82 ok (90 less nine deleted, plus `cleanup-boot`; `repeat-spin`, the last
      known defect, went with 🔁); the replay to the digit — 693,681 invariant checks, 88 / 121 / 108 / 62 /
      86; nothing under `src/plan/planner/`, `src/sim/`, `src/api/`, `src/lib/`, `src/catalog/` changed.
    - **What went**: 20 modules whole (4,929 lines), 1,485 lines net out of 21 surviving files, four checks
      and five scenarios. `src/` is 89 files and 20,700 lines against 109 and 27,114 (−24%).
    - **What the restart does**: three raw lines at boot (`boot: dropped ammo:v1:hive`, `…offeringsDaily`,
      `…ammo:v1:state's pins`); no queue item is expected to go (all five queues hold `pl:` items of
      surviving kinds); the five steps re-attach.
    - **What the page is until 019**: Fleet · Character · Bank · Items · Monsters · Achievements · Map · Sim.
      No Roadmap tab, no hive, no pins, no queue forms. The tab asks the service for the direct actions, the
      reads, the 🧭 switch, an owned character's offering interrupt and the Group fight's `queuePrepare`;
      nothing in it writes a queue.
    - **What moves in play**: an owned character's offering interrupt comes from the planner's five-minute
      tick, so up to five minutes after 00:05 UTC (the old 00:05 trigger is gone). Nothing else.
    - **Where the task file was wrong**: `scripts/fixtures/roadmap-fleet.json` is `check-planner`'s too
      (its bank of 2026-11-17); it stays.
    - **Seen in the chat's read** (none of it holds the restart back): the reflog has a `reset: moving to
      HEAD` at 17:46 UTC between the two commits that the report's command list does not name (a plain
      `git reset` or a stash; the committed tree is what counts, and the gate's last runs are on it by the
      report); the report itself is inside the task commit, against "the report last, after the commit"
      — the task file asked for both, the next one asks for one; `package.json`'s description still names the
      hive.
    - **017 in play so far** (the report's section 4, 17:01–18:19 UTC): only gathers; no pause, block, flap,
      defect or server error; the market file has a whole line and one every ten minutes (10 pages, about
      960 orders a read). Nothing spent, no kill step yet: the Spent table, the sliver rule and a fight
      step's `wear` are still unread (open question).
    - **The branches only an old item shape reaches** (the report's table: a `fight` without `take`, a `gear`
      without `wear` or `reset` or with a frozen `desired`, a craft with `wait` or quantity 0, a `sell`
      without `partial`, an item pinned to a tile, a `train` with `for` or with helpers running, a `train`
      of combat, an items `task-loop`): **not cut now, and not as a task of their own.** The harness writes
      several of these shapes by hand to test the runner, and `desiredForJob` without `wear` is the
      planner's own fallback. Each is cut when its function is next opened; the first occasion is the
      group-fight round, which opens the runner anyway. The same for `PlannerState.optedOut` (the core's
      type), the unused exports of the report's notes and ⏹ for a running `prepare` of a character that is
      off.
    - **The order stays**: 019 the Roadmap as home with a cut-down outlook, written once the restart shows
      in the journal → the Lab → group boss fights. The service's own checkout when it fits; the market
      analysis after a few days of `logs/market/`.
49. **Task 019, settled in the chat** (2026-11-21, night; in the task file as "What is settled"). The restart
    is confirmed: `logs/status.json` and the journal's `boot` at 18:47:57 UTC, run `k66s`, commit `e68045a`,
    branch `rework`; the raw log's boot (`logs/raw/2026-11-21/18.log`) has the three `boot: dropped` lines
    (`ammo:v1:hive`, `ammo:v1:offeringsDaily`, the state's pins) and none for a queue item; all five queues
    resumed and all five steps re-attached (`ach:intermediate_lumberjack:0` for First, Second and Fourth,
    `src:nettle_leaf` for Third, `lvl:mining:35@Fifth#6`); the first actions went through within two seconds;
    bank 93 of 110, gold 240,836; 28 points. Still to read (019, section 6): the offering interrupts after
    00:05 UTC, and what 017's step 8 waits for.
    - **The outlook is a child process of the service**, not a cut-down run on its thread: the service hands
      over the World as JSON and takes lines back. That makes the horizon a parameter, so the run goes to the
      deadline (minutes on one core of twelve, below normal priority). "Cut-down" is what it shows, not how
      far it plays: the next three steps per character, what every open achievement waits for, the expected
      completions with dates, the points at the deadline. Cut to 21 days only if a whole run takes more than
      20 minutes (019 measures; nobody has timed a row since 009's 216–225 s).
    - **One pure function** (`src/plan/planner/road.ts`, new) is what the child, the script `npm run outlook`
      and the checks call; the Lab is the same function with other knobs. The running steps are part of the
      start: one optional parameter of `forward()` seeds what is pending, proven harmless by the replay's
      line; if that is not sound in a few dozen lines, every character decides at `now` as the replay does.
    - **A failing outlook never touches play.** One child at a time; started two minutes after a boot's first
      achievements read, every three hours, 30 s after a config change, and on ↻; killed after 30 minutes.
      `src/server/main.ts` injects the runner, as it does the file sinks, so the harness starts no process.
    - **The forecast is kept**: one journal record a run (`outlook`: expected at the deadline, the next ten
      completions) and a field in `logs/status.json`. A later chat holds it against what happened.
    - **The Roadmap is the first tab and the default route**; Fleet stays as it is, second. Cards: Season
      (points, tiers, days left, expected "by the model"), Now (per character: the step, its why in full,
      progress, the next two steps), The road (expected completions), Open achievements (grouped by what they
      wait for), Blocked, Priorities. Nothing computes in the tab. No chart.
    - **Three knobs and no more**: first, exclude, weight on an open achievement, through `setPlannerConfig`
      (design A.6, H). They act on the live planner at its next decisions; trying a knob without applying it
      is the Lab's. Alex was told.
    - **Not in 019**: "slower than expected" (the journal's samples table has it); a control for roles,
      filler, risk, prices or the deadline; any change to a rule or a constant.
    - **Riding along**: `PlannerState.optedOut` and the unused `PlannerState.outlook` leave the type;
      `package.json`'s description. The rest of decision 48's parked list waits for the group-fight round.
    - **The task file's rules changed against 018's**: the report is written before the task commit and is
      part of it; every command run is listed, git's too; `npm run check -- planner` only if the core changed.
    - **The order after 019**: the Lab (decision 36) → group boss fights. The service's own checkout when it
      fits; the market analysis after a few days of `logs/market/`.
50. **Report 019 accepted (2026-11-21, late night).** Checked in the chat: the commits in `.git/logs/HEAD`
    (`ce2c123`, amended to `ca189c8` Rework notes, 18:56 UTC; `b808b47` 019: roadmap home, 20:29 UTC), `HEAD`
    on `rework`, `refs/remotes/origin/rework` at `b808b47`, `main` still at `edaaf23`; read in full:
    `src/plan/planner/road.ts`, `src/server/outlook-run.ts`, `src/state/outlook.ts`, the runner in
    `src/server/main.ts`, `src/ui/RoadmapTab.tsx`, `scripts/serve.mjs`. They are as the report says. Not
    checked there: the seed line of `forward.ts`, the three new checks, the gate's runs, the typecheck, the
    build, the outlook runs (Claude Code ran them). **Engine change: Alex was told to restart the service on
    2026-11-21 (late night)** and to reload the page after it; `logs/status.json` at 20:50 UTC still carried
    run `k66s`, commit `e68045a` (all five running: First, Fourth and Fifth on the mining road to 35 for
    diamond_in_the_sky, Second on hardwood planks for cabinet_maker, Third crafting 736 minor health potions
    for the_reaper; 29 points; bank 93 of 110, gold 240,836; nothing blocked). The next look confirms the
    restart from `logs/status.json` (its new `outlook` field), the day's journal (an `outlook` record about
    five minutes after the boot) and Alex's eyes on the page (the report's acceptance step 7).
    - **The gate**: 85 checks, 85 ok (82 plus `check-road`, `check-outlook-child`, `outlook-service`); the
      replay to the digit — 693,681 invariant checks, 88 / 121 / 108 / 62 / 86 — so `forward()`'s seed is
      harmless when it is not given; nothing under `src/sim/`, `src/api/`, `src/catalog/` changed.
    - **A whole run from the live World does not fit the service**: 36–38 minutes to the deadline (9,126
      steps) and 2.2 GB at its peak; 21 days take 148 s and 483 MB. So the service's child plays 21 days
      (`HORIZON_DAYS`, `src/state/outlook.ts`), the Season card says "the road is played 21 days only: nothing
      is said about the deadline", and `npm run outlook` keeps the deadline (`--days 21` for the quick look).
      The time per simulated day grows through the run: about 7 s a day in the first three weeks, 30–40 s
      after that; the memory grows with it. For scale: a replay row took 216–225 s at report 009, and
      `check-planner`'s five rows take 2,070 s now (about 7 minutes a row, from the 11-18 snapshot).
    - **The first outlook** (the World of 11:43 UTC on 11-21, to the deadline): 28 points then, **98 at the
      deadline by the model**, bronze (105) 7 short; 59 by 12-12. Two runs in fresh processes give the same
      road line for line. It is the same order of number as the replay's row A (88 from the 11-18 snapshot;
      decision 46's noise applies). Open at the deadline, 112 points: another layer 50, an event 11, use 10,
      a group 9, filler not reached 9, a raid 8, gear 7, unhandled 4 (ultimate_rune), a level 2, does not
      fit 2. Two plateaus without a completion: 01-14 to 01-25 and 01-28 to 02-08.
    - **The first line held against play**: Intermediate Lumberjack was expected on 11-21 at 0.4 d (about
      21:20 UTC) and was completed at 20:27:33 UTC (29 points). Next by the road: Expert Miner 11-22 (1.3 d),
      Intermediate Alchemist 11-23 (1.9 d), Worker 11-23 (2.4 d). The level roads matched to a few minutes;
      the forecast does not see an objective's short tails (1–10 kills) nor the gear and supply steps taken
      around them.
    - **What the runtime's World is not** (the report's finding): it carries `bankSlots` and `bags`, which
      the forward model does not play — played as it is, a tidy step repeats forever. `road()` drops the
      slots and banks the bags' stock. So the outlook never shows a tidy step or an expansion; a character
      that is off is still played (all five are on).
    - **018 in play so far** (18:47–20:52 UTC, the report's section and the chat's read of the journal's
      tail): only gathers and two crafts; no pause, block, flap, defect or server error; the market file has
      a line about every ten minutes. Still unread: the offering interrupts after 00:05 UTC on 11-22 (the
      report was written before then) and what 017's step 8 waits for (nothing spent, no kill step yet;
      Third's potions for the vampire fights of the_reaper are being made).
    - **Seen in the chat's read** (none of it holds the restart back): `waitingOf` files the_reaper under
      "gear (no safe win within ten levels)" while the fleet brews for it (its gear test is the gear alone;
      the Roadmap shows it "in work", so only the group's name is off); the journal's sample
      `craft:hardwood_plank` reads 72 s against an estimate of 309 (mean 38, n 4) — what that estimate
      counts is read with the next journal look; Closing The Gate is on the road for 01-28 while today's
      event verdict says "∞ spawns needed" — today's fighters against the levelled ones of the model, not a
      contradiction, but the first thing to hold against play when a fighter passes the event monsters.
    - **The order changes: the run's speed goes before the Lab.** A Lab whose run takes 36 minutes is not
      something to play with, and the page cannot say what Alex wants to know most (the points at the
      deadline). So: **020 the run's speed and its noise** (where the seconds and the memory go, why a run
      from the live World is five times a replay row, an exact cache or a measured band for decision 46's
      noise; if a whole run then fits a few minutes, `HORIZON_DAYS` goes to 0 and the Season card shows the
      deadline; riding along: `waitingOf`'s group for a target that waits for consumables) → **021 the Lab**
      (decision 36, thin first version) → group boss fights. The service's own checkout when it fits; the
      market analysis after a few days of `logs/market/` (the poll runs since 17:01 UTC on 11-21). Alex was
      told.
51. **Task 020, settled in the chat** (2026-11-21, late night; in the task file as "What is settled"). The
    restart is confirmed: `logs/status.json` and the journal's `boot` at 20:59:30 UTC, run `dxgi`, commit
    `b808b47`, branch `rework`; all five steps re-attached (`lvl:mining:35` for First, Fourth and Fifth,
    `ach:cabinet_maker:0` for Second, `mat:minor_health_potion` for Third); bank 92 of 110, gold 241,836; 29
    points. **The first live outlook**: started 21:01:30 UTC (two minutes after the boot's read), ended
    21:04:31, 180.9 s beside the service (148 s alone), 21 days, 59 expected on 12-12; next by it: Expert
    Miner 11-22 15:54 UTC, Worker 11-23 12:36, Intermediate Alchemist 11-23 13:03, Arachnophobia Conquered
    11-25, The New Bandit 11-26, Intermediate Fisherman 11-26, The Reaper 11-26 20:54, Expert Lumberjack and
    Cabinet Maker 11-27, Expert Alchemist 12-01. The steps went on through the run. Not seen in the chat: the
    page (Alex's eyes).
    - **Exact comes before fast.** While a solve's answer depends on what was solved before it (`reach.ts`
      `lookup`: a pool served from a superset pool's result, 014's potion rules), a change that only saves
      time can still move a replay number, and "the line to the digit" proves nothing. So 020: measure →
      make the run exact → fix the new reference numbers → make it fast against them, every later change
      keeping every line equal.
    - **What exact means**, and the gate proves it from now on: caches off gives the same lines as caches
      on; two runs in one process give the same lines; the replay's rows give the same points in any order.
      The direction: key a solve on what the solver reads and serve only an equal key.
    - **The replay's line changes once**, by design: the new line and the new road from the 11-21 snapshot
      are reported beside the old ones, with where each first parts. The new line is the gate's after that.
    - **The targets**: a whole season from the live World in under five minutes on one core, under 1 GB. At
      most ten minutes and 1 GB → `HORIZON_DAYS` 0, the Season card shows the deadline; otherwise 21 days
      stay.
    - **If exact costs more than today's 36 minutes a season** even after the speed work: the reuse rules
      stay, the speed changes that keep 019's lines stay, and the band is measured instead (said first in
      the Summary).
    - **Read in the chat** (the task file's list, to be checked there): every memo keyed on the World object
      lives for one decision of a forward run; `advance()` makes a new achievements array at every step's
      end, so `targetsOf` is rebuilt at every decision; the solve tables hold up to 16 results a key and
      20,000 keys, each result with its pool and a whole recommendation.
    - **Riding along**: a character that is off is not played; `waitingOf`'s group for a fight won with
      planned consumables (the_reaper); `outlook()` of `forward.ts` goes if unused.
    - **Read-only in 020** (its section 5): every `outlook` record and the road against the `ach` records;
      the offering interrupts after 00:05 UTC on 11-22; 017's step 8 leftovers (the Spent table, slivers, a
      fight step's `wear`); the `craft:hardwood_plank` sample (72 s against an estimate of 309); the bank's
      gold 240,836 → 241,836 between 20:50 and 20:59 UTC with no `spend` record; the market file's gaps.
    - **Allowed for speed only, with identical results**: `src/plan/bis.ts`, `src/plan/jobgear.ts`,
      `src/sim/combat.ts`, `src/sim/stats.ts`. No rule, price, cap or deciding constant moves.
    - **The order after 020**: 021 the Lab (decision 36) → group boss fights. The service's own checkout
      when it fits; the market analysis after a few days of `logs/market/`.

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
| 011 | The calibration round (decision 29): what a fight drinks, filler before a road that does not fit, an objective is the fleet's work, the hours since 16:43 UTC read from the log | done, `f4d4118`. Accepted 2026-11-19 (decision 30). **Engine change, live: Alex restarted the service on 2026-11-19 at about 20:05 UTC** (run `[50ry]`). |
| 012 | The prices round (decisions 30, 31): fight XP and kill seconds against the log, a step's fixed cost, stock is free and the forward model drinks, the node of a `src:` gather, a gated craft in a chain | done, `1d76174`. Accepted 2026-11-20 (decision 32). **Engine change: Alex restarted the service on 2026-11-20 at 07:31:51 UTC** (run `[yewz]`); all five steps re-attached. |
| 013 | The fleet on events (decision 33): who goes to a spawn, an event in the score, events in the forward model; in flight for an `ach:` target | done, `c8266ac`. Accepted 2026-11-20 (decision 34). **Engine change: Alex restarted the service on 2026-11-20 between 09:44 and 09:54 UTC** (run `[wj59]`). |
| 014 | The consumables round (decision 35): potions and food by need, made through the bank and taken by the step that planned them; one price; an event's fights stocked for one spawn; bag stock; what the potion wall is made of | done, `edaaf23`. Accepted 2026-11-20 (decision 40). **Engine change: Alex restarted the service on 2026-11-20 at 23:32:54 UTC** (run `[tdhi]`); all five steps re-attached. |
| 015 | The bank (decision 39): a full bank is answered, not met; outdated gear is recycled; the planner buys an expansion under a price cap; sap is no longer sold from under the recipes; the branch `rework` and the first push; riding along (decision 40): a bag cap on planned food, the food that fits the fight, room for the replay check | done, `e66621e` on `rework`, pushed to `origin/rework`. Accepted 2026-11-21 (decision 42). **Engine change: Alex restarted the service on 2026-11-21 at 08:49:13 UTC** (run `[lxra]`); all five steps re-attached. |
| 016 | The journal (decisions 37, 43): a journal of decisions and step results, the raw log in hourly files, a status file, a daily snapshot of the World, a reader; riding along (decision 42): `planMake` in whole runs, one read of the bank after a 462, `bankCheck` and `tidyStep` on the same verdicts | done, `c8cbd78` on `rework`, pushed to `origin/rework`. Accepted 2026-11-21 (decision 44). **Engine change: Alex restarted the service on 2026-11-21 at 11:43:34 UTC** (run `[0gpn]`); all five steps re-attached. |
| 017 | Keys, tolls and what is spent (decision 45): the nine conditional transitions for the core, the forward model and the runner; a gold budget for fares with a price in the score; tasks coins on an objective's own material; a `spend` record; a standing read of the Grand Exchange into `logs/market/`; riding along (decisions 44, 45): `tidyLeft` with a tidy step in flight, a try around the status, a `pl:` fight step wears its `wear`, an event trip takes what it planned, no kill step for a sliver | done, `b322195` on `rework`, pushed to `origin/rework`. Accepted 2026-11-21 (decision 46). **Engine change: Alex restarted the service on 2026-11-21 at 17:01:00 UTC** (run `qf93`); all five steps re-attached. |
| 018 | The clean-up (decisions 15, 47): the planner is the only writer; the hive, the pins and training loops, the helpers, 🔁, the queue editor, the old Roadmap, the gear coverage view, the standing orders of a character that is off, the item kinds nobody writes, their checks and their stored state are deleted; nothing in the planner's path changes and nothing new is drawn | done, `e68045a` on `rework`, pushed to `origin/rework`. Accepted 2026-11-21 (decision 48). **Engine change: Alex restarted the service on 2026-11-21 at 18:47:56 UTC** (run `k66s`); all five steps re-attached. |
| 019 | The Roadmap as home and the outlook (decision 49): a child process plays the live World to the deadline; the Roadmap tab first (Season, Now, The road, Open achievements, Blocked, Priorities); the knobs first, exclude, weight; `npm run outlook`; a journal record a run | done, `b808b47` on `rework`, pushed to `origin/rework`. Accepted 2026-11-21 (decision 50). **Engine change: Alex restarted the service on 2026-11-21 at 20:59:29 UTC** (run `dxgi`); all five steps re-attached; the first outlook ended at 21:04:31 UTC (180.9 s, 59 on 12-12). The service's child plays 21 days, not the season (a whole run takes 36–38 minutes). |
| 020 | The forward run, exact first, then fast (decisions 50, 51): where a run's seconds and memory go; a solve keyed on what it reads; the new reference line; speed against it; `HORIZON_DAYS` 0 if a season fits ten minutes and 1 GB; riding along: an off character is not played, `waitingOf`'s group for planned consumables | written 2026-11-21, `tasks/020-run-speed.md`; not run yet. **Engine change: restart after it is accepted.** |
| 021… | The Lab (decision 36) → group boss fights (with it decision 48's parked cuts). When it fits: the service's own checkout (decision 47); the market analysis | |

## Open questions
- **Does 019 hold in play?** Half answered (decision 51): the restart, the status's `outlook` field and the
  first `outlook` record (21:04:31 UTC on 11-21, 180.9 s) are there and the steps went on through the run.
  Still open: a record every three hours, a run after a knob change, and Alex's eyes on the page (the layout,
  the folds, the texts on live data). Read by 020, section 5. The question was: after the restart (report
  019, acceptance step 7): the page opens on the
  Roadmap; `logs/status.json` carries an `outlook` field and the journal an `outlook` record about five
  minutes after the boot (two minutes' wait, 2½ of play), then one every three hours; the steps go on
  through a run (no `pause`, no gap in the action lines); ⭐ on an open achievement starts a new run 30 s
  later. And Alex's eyes: the layout, the folds, the texts on live data.
- **Why is a run from the live World so slow and so fat?** 36–38 minutes and 2.2 GB to the deadline, about
  7 s a simulated day at first and 30–40 s after day 21 (decision 50). Task 020.
- **Does the outlook's road hold?** Each `outlook` record carries the next ten completions with dates; the
  journal's `ach` records say when they came. First line: Intermediate Lumberjack, expected about 21:20
  UTC on 11-21, done 20:27. Held against play at every later look.
- Answered by 019 (decision 50): a whole run takes 36–38 minutes; the first outlook says 98 at the deadline.
  The question was: **How long does a forward run take, and what does the first outlook say?** Nobody has
  timed one row since 009 (216–225 s); 019, section 5, measures it from the day's snapshot and prints the
  first road.
- **Does 018 hold in play?** The boot is confirmed (decision 49: run `k66s`, the three `boot: dropped` lines,
  five steps re-attached, no pause). Still to read, by 019, section 6: the offering interrupts of the next
  00:05 UTC (within five minutes of it), and the page (Alex's eyes). The question was: after the restart
  (report 018, acceptance step 8): the journal's `boot` carries
  `e68045a` and the five steps re-attach; the boot hour's raw log has `boot: dropped` lines for
  `ammo:v1:hive`, `ammo:v1:offeringsDaily` and the state's pins, and none for a queue item; no `pause`;
  `logs/status.json` rewritten every minute; the offering interrupts of the next 00:05 UTC come within five
  minutes of it; the page opens on Fleet without a Roadmap tab.
- **Does 017 hold in play?** Half answered by 018 (decision 48): 17:01–18:19 UTC was clean and the market
  file is written as designed; nothing was spent and no kill step ran, so the rest below is still unread.
  Restarted at 17:01:00 UTC on 11-21 (decision 47); read by 018, section 4.
  After the restart (report 017, acceptance step 8): a whole line in
  `logs/market/<day>.jsonl` at boot and one about every ten minutes; a `## Spent` table from `npm run journal`
  (the first entries expected: tasks coins for jasper crystals); no kill step of one unit while another step
  holds its potions; a `pl:` fight step's `end` withdraws the pieces of its `wear` and no other gear. And
  the sliver rule's price in play: does a fighter's combat road starve (decision 46)?
- **Is the replay's noise repaired?** A few points turn on the order of solves (decision 46). Not in the
  clean-up (decision 47): with the Lab, measured as a band or removed by an exact cache.
- Answered by 017 (decision 46): 016 holds in play. The question was:
  **Does 016 hold in play?** The files are there since 11:43:34 UTC on 11-21 (decision 45). Read by 017,
  section 1: the first hours through `npm run journal`, and the craft steps of a two-a-run recipe (no pause for
  one missing ingredient).
- Answered by 016 (decision 44): 015 holds in play. Not yet exercised: a 462 (none since 11-13), an expansion,
  a kill step's food against a third of the bag (no kill step ran between the restart and 09:46 UTC). The
  question was: **does 015 hold in play?** (the boot's `plan: bank` line; tidy steps until 15 slots are free;
  no `bank/buy_expansion` while something is outdated; no `npc/sell` of sap or shell).
- **Is gear with a rare ingredient recycled when it falls ten levels behind?** Alex, 2026-11-21: kept for a
  while, decided later (decision 43). Back with 017.
- **Does 014 hold in play?** After the restart (report 014, acceptance step 7): a kill step's `plan` line names
  the potions and food it takes and its reset withdraws those quantities; no `restock`, `craft` or `gather` of a
  consumable inside an owned fight item; `mat:` and `src:` lines name the work they are for; "ran dry" without a
  `blocked` line. And the two defects of decision 40: "inventory full of protected working stock", and fights
  that rest while cooked food lies in the bank.
- **Would the Grand Exchange sell potions, food or algae for less than the fleet's hours?** Half the season goes
  into ingredients (decision 40) and report 014 priced the NPC merchants only (events, a tenth of a day's
  need). Alex allowed the read on 2026-11-21, and a regular one (decision 45): 017 starts the poll into
  `logs/market/`. The analysis follows after a few days of prices; buying is his decision then. The first
  read (report 017, decision 46): algae yes by a factor of ten (2 gold a unit, thin at the ask), sap yes,
  nettle no, potions not on sale; the poll starts with the restart after 017.
- Answered by 014 (decision 40): Third brews most, First cooks, the stock goes to the best-scoring work first.
  The question was: **who brews and cooks for the fighters, and who drinks first?** The wall at combat 33–35 is the potion's
  price (decision 32). The consumables round (014).
- **Does the event rule hold in play?** After the restart: `api GET /events/active` about every 2 minutes, one
  `plan: event` line a spawn (expected for now: "nobody needs it", "does not fit" or "members: none"), and the
  first member at an apparition once a role holder stands at mining or woodcutting 35. Read by 014, section 1.
- **How often do events really spawn?** `SPAWN_LOG` 1.64 rests on 33 spawns in 69 hours (decision 34);
  measured again at every log read.
- Answered by 013 (decision 34): what events pay this season and what they cost early. It was: row A against
  row E (no events), per event code.
- **Does 012's acceptance step 7 hold in play?** The restart is confirmed (07:31:51 UTC on 11-20, `[yewz]`).
  Read by 013, section 1, with the night of 11-19 to 11-20 (the offerings at 00:05 UTC, how the diamond chain
  went on) and every event spawn the log holds.
- Answered by 012 (decision 32): the bank's algae carries the potion fights for about a week (drunk by day 7;
  after that the fishing objectives' algae is drunk as it lands); the pig gives XP through combat 29 (the
  docs' reading of the gap rule); fight XP was read a third low and a kill priced at twice its time, both
  repaired.
- **Who strikes first?** The API's characters carry `initiative` 100, the simulator starts the player at 0. The
  record of `validate.ts` (turn and potion errors) decides it at the next potion fights.
- **Does 011's fix hold in play?** Acceptance step 7 (a kill objective beside one character only): not
  exercised by 21:49 UTC on 11-19 (report 012, section 1: seven decisions, no `gear:` step among them). Read
  again by 013, section 1.
- Answered by 011 (decision 30): combat stalls at 29–30 for the potion's price, not for the count; a by-product
  counts.
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

- From report 011, not fixed (012 where said; and see decision 30):
  - The node of a `src:` gather is the least `gatherSec × rate` for everyone (`targets.ts:71`, `:80`), and a
    parent craft's own gate is neither tested nor priced (`supply.ts:167-180`): 012. The fight-XP formula and
    the kill and craft seconds against the log: 012.
  - Work (c): a tool for an open gathering objective is judged per role holder (`gear.ts`, the loop over
    `targetsOf` inside work (c)); 0 cases in the replay.
  - An objective's own craft step in flight is not subtracted from its demand (`supply.ts:171`): the shortfall
    is over-counted by one step's materials while it runs.
  - A made piece goes to whoever resets first — now the larger part of the duplicate gear (row A's 19 pieces
    for arachnophobia are one need whose holder moves). Still parked; next in line after the prices.
  - Banked potions ride on fights that do not need them (a utility slot filled with a stack that is used 0
    times); harmless while none is drunk.
  - Cooked beef deposited by a step's tail and withdrawn by the next fight step 13–48 s later; food is 9–21% of
    a fighter's time (Fifth ate 133 times in 136 fights).
  - Two monster events spawned on 11-19 (18:12, 18:52 UTC) with no `interrupt event` and nothing in the log to
    say why (`eventorders.ts:84` writes "nothing to do" to `eventPlans` only). For 013.
  - The offering hunt lost 10 of 164 fights on 11-19 (Fourth 5 of 41): under one in five, left as it is.

- From report 012, not fixed (and see decision 32):
  - A restart repeats one action of every running fight or gather item: the counter is written only after the
    cooldown wait (`src/state/exec.ts:508`, `src/state/queue.ts:470`, `:363-365`).
  - A drop objective's step is at least one item: one goblin guard foot is 18–25 h of kills (row B, from day
    38). The fix is to chunk drop objectives in actions, as `src:` steps are.
  - Who brews a fighter's potions is not modelled (the one-unit stack, `forward.ts:104-107`); the drinks take
    stock that supply banked for an open parent; `gatherPays` and food stay on the old reading. All three: the
    consumables round.
  - The bill and `fleetSec` keep the static source: a miner's `src:diamond_stone` runs at the coal rocks about
    30% longer in wall-clock than the bill says. No credit for a node's other drops (0 coal is short today).
  - A step's fixed cost is once a step: several bagfuls walk once each (30 planks: 538 s against 197 s), a
    reset that strips a whole fight set costs 120+ s of bank moves (`STEP_BANK_SEC` is the median, 42 s).
  - Outside the planner, still on the old readings: `src/state/queue.ts:708` `trainingMonsterFor` (no wisdom),
    `src/plan/events.ts:97` (an event fight at the field price; the owned characters leave `fieldOrder` with 013), `src/sim/combat.ts:451` (the UI's
    rest at 5 HP/s), `CLAUDE.md`'s combat-training paragraph (the old gap rule).
  - `supply: supply:` in every supply step's why (`decide.ts:295`, `:318`).
  - Guesses in the numbers, most doubtful first: `KILL_LOG` 0.88 on reconstructed sets; zero XP more than 10
    levels above (gaps 11–16 unseen); the one-unit stack; `STEP_BANK_SEC` 42 s; the log's bank of the
    by-product ingredients.

- From report 013, not fixed (and see decision 34):
  - Bag stock is not stock: the bill counts the bank only (`src/plan/planner/stock.ts:43-46`); a 210-gather
    diamond chunk was planned 34 minutes after the last stone lay in a bag. For 014.
  - An event fight's potions are free in the membership gate and brewed in the field by the executor; the
    executor takes a utility potion stack whole and banks most of it at a reset. Both: 014.
  - A trip fights or gathers until the tile goes, also when the demand was a handful of drops (two demon
    horns); read in the chat (`tripOf`: `times: 0`). The forward model caps the event work at the demand.
  - An event trip is not a `Step`: its set is not reserved between the poll and the member's reset (the
    executor's 404 / 478 handling covers the race), and the forward model's events wear the step's set.
    `sent` lives in the process: after a restart a member whose trip was removed can be sent to the same
    spawn once more.
  - Closing the gate is in no calendar while one of its three monsters has no member, so its 500 demons are
    never fought for it (the rule as settled: the achievement must complete).
  - A mixed fleet: once the core has evaluated a spawn, the old `fieldOrder` sends no non-owned character to
    it. Not the case today; goes with the clean-up.
  - Guesses in the numbers, most doubtful first: `SPAWN_LOG` 1.64; the kill seconds at an event (no event
    fight was ever logged); usable seconds (both walks taken as the tile's walk to its bank); the shares
    assume no two spawns overlap; "can ever be a member" looks ten levels up with today's pool.

- From report 014, not fixed (and see decision 40):
  - Planned food without a bag cap; the food in the plan picked by heal alone. Both: 015.
  - A trip and a fight step carry one stack of a potion; the forward model's event work is not capped by it.
  - A level step's craft sample is set against a craft-only estimate (`src/state/planner.ts:260-265`):
    "slower than expected", 117 s against 3 s. A level step triggers no achievements read
    (intermediate_alchemist, complete since 12:23 UTC on 11-20, is read at the next objective's end).
  - An owned character's `task-loop` (filler) still provisions food and potions by itself.
  - A kill source inside a craft step fights with `take: {}` while its price counts the pool's potions.
  - A need's potion set searches at most twelve potions, by code (`bis.ts chooseGroup`): from alchemy 40
    (17 potions) the minor and small health potions and the antidote are never weighed.
  - The solve cache keys a set on a potion's presence, not its quantity; the step's kills are capped by the
    stock, the price is not.
  - Three role holders take one gated level for one parent's points (`lvl:mining:35`, three miners, +3).
  - Not traced: whether what a running `src:` step has gathered counts twice, as bag stock (`bagsOf` leaves
    out a step's inputs, not its product) and as that step's units in flight.
  - Guesses in the numbers, most doubtful first: `KILL_LOG` 1 (eight decomposed steps, median 1.087; 1.27 over
    23 samples with the in-item food making left in); the cache shortcuts that keep a row inside the backstop;
    `HORIZON` 2, `MARGIN` a fifth, `NEED_RATIO` 0.85 for consumables; `USE_SEC` 4.5 s.

- From report 015, not fixed (and see decision 42):
  - Worn-only codes move through the bank: every reset strips the worn set into it, so the free count moves by a
    few slots a reset (`TIDY_BELOW` 15 absorbs it); with no slot the stripped piece stays in the bag.
  - `planMake` sources an ingredient per product, not per run (61 runs need 122 nettle, 121 gathered): 016.
  - Fifth's second ogre fight of 11-20 22:41 UTC was lost with 8 of 9 worn potions drunk: a forecast miss, not a
    stack run out; only the record of `validate.ts` says how far off.
  - A supply line's "N short" sums every parent's shortfall and names the best parent.
  - The forward model raises max HP with a level but not the bag: its food cap stays a third of the first bag.
  - An `api` line's body is cut at 160 characters, so a reset's potions cannot be read from the log. The journal
    (016) records what a step took.
  - The three changes that reach the replay (the bag cap, the food that fits, the sell floor) were not run apart.
  - Guesses in the numbers, most doubtful first: the ladder doubles (two purchases and today's price); the
    season's codes (the forward model: 179 with the tidy); `TIDY_BELOW` 15, `EXPAND_BELOW` 10, `TIDY_MARGIN` 10;
    "no solve today picks it" (not gear by need's own solves, not a level's next pick); a recycle's returns.

- From report 016, not fixed (and see decision 44):
  - The journal keeps a step's totals, not the order of its actions: which codes a reset withdrew and wore, in
    which order, and a walk back to the bank mid-step are in the raw log only (an `api` line's body is now cut
    at 600 characters).
  - The meter is in memory: a step re-attached at boot ends `partial`. `end.wall` of such a step counts the
    downtime; the meter's `s` does not.
  - No record for: a spawn whose verdict is never set (nobody free for its whole hour); a level passed while
    the service is down; a merchant interrupt's sales by code (its `int-end` has the count and the gold).
  - `made` sums what a tidy step's recycles gave back over its codes; a fight's turns and HP are not metered.
  - The meter's bucket for characters the planner does not own is never cut (small; all five are owned).
  - Nothing rotates the raw log: about 21 MB a day.
  - Why the boot line of 08:49 UTC called Wooden Shield and Iron Armor outdated was reasoned (the solves moved
    with the worn sets and the bank), not recomputed: that World is not in the log. From 016's restart on the
    day's snapshot and a step's `wear` hold it.
  - Guesses in the numbers, most doubtful first: the meter's side of the report's comparison (no echo in the
    old log; a round trip of 0.8–1.1 s an action taken from the smallest gaps); a made-up day of 134 kB; the
    snapshot fixture is composed, not written by the service.
- From report 018 (decision 48), parked until the runner is next opened (the group-fight round):
  - the branches only an old item shape reaches (the report's table under "What is left", with `path:line`);
  - a `train` of a gathering skill or of combat now ends in `runTrainCraft` and pauses ("no Mining recipe
    …"): nobody writes one, boot drops a stored one, only a hand-written harness queue reaches it;
  - `PlannerState.optedOut` stays in the type and in `ammo:v1:planner`; nobody reads or writes it;
  - `availableResources` (`src/state/events.ts`) and the exports the report's notes list are unused;
  - a character that is off still runs a stored queue of surviving kinds after a restart, and a running
    `prepare` of such a character has no ⏹ in the page;
  - `package.json`'s description still names the hive; the Monsters table's last column and the skills
    card's fifth grid track are wider than what is left in them (019 draws there anyway).

## In the game's UI, for Alex
- All five are the planner's since 2026-11-19 (decision 24): nothing to do by hand. "🧭 planner on" in a queue
  panel hands that character back; handed back, it stands still (decision 48: nobody else writes a queue).
- From the restart on 018's code: no Roadmap tab (it comes back with 019, drawn from the planner), no hive,
  no pins, no queue forms. Each character's step and its why are in its queue panel on the Character tab.
- Lost World Maps: bought by the planner's merchant interrupt; nothing to do by hand.
