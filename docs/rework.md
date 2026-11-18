# Rework — goal, decisions, state

The state of the rework, for a planning chat that starts fresh. Kept by the planning chat (Claude in the desktop
app, with Alex); Claude Code reads it when a task says so and does not edit it.

Last updated: 2026-11-18, after report 005 was discussed, Alex answered its decisions and task 006 was written.

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

## Tasks
| # | What | State |
|---|---|---|
| 001 | Read-only audit → `docs/audit/code-audit.md`, `docs/audit/domain-rules.md` | done, `f252937` |
| 002 | Offline harness: fake game, virtual clock, scenarios, `npm run check` | done, `2d13f27` (the pre-audit offerings work went in as `aa63544`) |
| 003 | Runner fixes: `buy` never buys; the gear swap's bank-tile sweep (helper ping-pong); 486 after a 500 | done, `e847b11`. Accepted 2026-11-18; Alex restarted the service that day, so it runs this code. |
| 004 | The achievement map → `docs/design/achievement-map.md`, `docs/design/snapshot/`, `scripts/design/achievement-map.mts` | done, commit "004: achievement map". Accepted 2026-11-18. No engine change, no restart. |
| 005 | The planner's design → `docs/design/planner.md`; with it, the map checked against the leaderboard (four public reads) | done, `72b726f`. Accepted 2026-11-18. No engine change, no restart. |
| 006 | Movement knows layers; free transitions are walked; 598 is an answer; the `train` item's node; the backpack wish dropped; read-only: why offerings run at 8–11 of 15 | written 2026-11-18, `tasks/006-layers-and-transitions.md`; not run yet. **Engine change: Alex restarts the service after it is accepted.** |
| 007… | The planner, stage 1: core (pure) → runtime → Roadmap as home → gear by need (design I.3), then the order of decision 14 | after 006's report |

## Open questions
- **What does gear crafting cost this fleet?** The leaderboard shows it for the leader only. The planner's measured
  hours per level at 25–35 answer it; above 100 hours a level the plan falls back to about 100 points.
- **Why do offerings run at 8–11 of 15 a day?** Each one missed is a quarter of a level and a favor, and the
  design keeps the `offering` item underneath its interrupt. Task 006 looks, read-only.
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
- 598 treated as an outage; a failed bank read empties the local bank; the 478 handler drops the whole stack;
  mining and woodcutting training break at skill 35–39 (audit B.4, D.2, C.3).
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
  - **Movement** costs 5 seconds per tile crossed (docs); no estimate in the client uses it.
  - **No `transition` anywhere in the runner.** Mining training loses its node at 30 (gold rocks are underground);
    the fleet mines at 21–24 today. Rats are behind a transition too. This is stage 2 of decision 9.
  - **Offerings run at 8–11 a day** against a cap of 15. The 467 favors left need 31 days at the cap, 47 at 10 a
    day; both fit, the slack is not large.
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

## In the game's UI, for Alex (until the planner replaces these features)
- "Fleet helps" and "Help X train" items are safe again: the service runs the code of 003.
- Hive continuous mode (⟳) off.
- Fifth: remove the leftover `hive:` item, then "Train pins".
- Lost World Maps: bought by the standing order; nothing to do by hand.
