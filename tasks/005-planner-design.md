# 005 — The planner's design (no engine change)

## Goal
The rework's aim (`docs/rework.md`): the client plays the season by itself. One planner decides what the fleet does
next and moves on by itself; it is the only writer of the queues; the hive and the manual queues go.

Task 004 gave the facts (`docs/design/achievement-map.md`). They changed the aim's shape:
- By the map, 210 points are out of reach this season: 117 weeks of work against 14. **That figure is not
  believed.** The game gives a badge to the first account that reaches 210, so its makers expect accounts to get
  there inside a season; a map that says no fleet can is wrong somewhere, most likely in the hours it takes from the
  atlas. This task checks it against the leaderboard (section A).
- Either way the target is **the most achievement points by the season's end** (working deadline 2027-02-24). The
  planner does not aim at a number; it goes as far as the season lets it. In which order — the map's points per
  character-hour, or levelling first — is open and is section A's question.
- The client is the limit, not the game: left as it is, it ends near 30 points; with its missing abilities, near
  100. **Calendar time is the scarce thing.** A first, thin planner in service this week is worth more than a
  complete one in a month.
- The numbers behind the list are partly soft (map H). Alex plays his first serious season and expects surprises.
  The planner has to be cheap to correct: wrong estimates, new rules and changed priorities must cost a data change
  or a small step, not a redesign.

This task designs that planner and changes no behaviour. It writes:
1. `docs/design/planner.md` — the design (sections A–I below);
2. `tasks/005-planner-design.report.md`.

The architecture is decided afterwards in the planning chat. Don't start building, and don't write the next task.

Read first: `docs/rework.md` (decisions 7–10 bind this design); `docs/design/achievement-map.md`, whole;
`scripts/design/achievement-map.mts`; `docs/audit/code-audit.md`, whole (B, C, D, I and J carry the design's
problems); `docs/audit/domain-rules.md`; `CLAUDE.md`; the reports of tasks 002 and 003 (what the harness can do,
what the executor does now); `docs/tasks/roadmap-tab.md`; then the code the planner replaces or stands on:
`src/state/queue.ts`, `src/state/exec.ts`, `src/state/hive.ts`, `src/plan/roadmap.ts`, `src/plan/events.ts`,
`src/plan/hive/*`, `src/plan/jobgear.ts`, `src/plan/xp.ts`, `src/catalog/atlas.ts`, `scripts/atlas/*.mts`,
`src/api/actions.ts`, `src/ui/GroupFight.tsx`, the Roadmap tab's components, and the harness with its scenarios.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running and stays undisturbed.** Don't start, stop or restart a service; don't call the local
  one (`/rpc`, `/events`); don't run `npm start`, `npm run dev`, `npm run build`, `npm run atlas`, `npm run assets`
  or the fetch scripts. Nothing opens `.ammo/*` or `game.db`, nothing writes to `logs/dev.log` (reading it is fine).
- **Requests to the game: only the public reads listed here, without a token.** Don't read `.env`. Send no
  `Authorization` header. One request at a time, at least one second apart, **at most 6 in total**, with a plain
  `fetch` in a scratch script (not through `src/api/client.ts`); take the parameters from `docs/api/openapi.json`:
  - `GET /leaderboard/accounts`, sorted by achievement points, the first page;
  - `GET /leaderboard/characters`, sorted by combat level, the first page;
  - for the leading account by achievement points: `GET /accounts/{account}/achievements` (`size=100`) and
    `GET /accounts/{account}/characters`.
  Save each body as it came under `docs/design/snapshot/` (`leaderboard-accounts.json`,
  `leaderboard-characters.json`, `leader-achievements.json`, `leader-characters.json`) and list every request in the
  report: URL, time, HTTP status. If a request fails, don't retry more than once; say what is missing. For
  everything else the snapshot of task 004 is the account's state. The game's public documentation pages may be read
  for rules; give the URL for everything taken from there.
- **Write only** `docs/design/planner.md`, the four snapshot files and the report. No change under `src/`,
  `scripts/`, to `CLAUDE.md`, to the
  harness or the scenarios; no new dependencies. Offline scratch scripts that read `public/data/*.json`, the
  snapshot or `logs/dev.log` are fine and are deleted at the end.
- One task only. Don't fix what you notice; list it under "Notes".
- Everything you write is in **English**.
- For every claim about the code give `path:line`. `CLAUDE.md` is a claim about the code, not evidence.
- Gate: `npm run typecheck` and `npm run check` pass as before (30 checks, 29 ok, `repeat-spin` known).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`.
  2. At the end, `005: planner design`: this task file, the report, `docs/design/planner.md` and the four snapshot
     files. Check before committing that they hold nothing secret.

## What the design must be
- **Decided, with the alternatives shown.** Where there is a real choice (sections B, C, D and I at least), give two
  or three options, what each costs and risks, and one recommendation. Where the code leaves one sensible way, say
  so in a line and move on.
- **Concrete.** Types as TypeScript sketches, module names and where they sit, which existing functions are kept,
  wrapped or deleted (`path:line`). A reader must be able to write the first build task from section I without
  opening the code.
- **Small.** The design is judged by how little it needs for stage 1 and by how much it deletes. Anything that can
  wait for a later stage is said in a paragraph, not designed.
- **Honest about what it does not know.** A guess is marked as one, with what would settle it.

## `docs/design/planner.md`
Open with a summary of at most 20 lines: the planner in five sentences; the recommended option for each real choice;
the stages and what each adds in points by the deadline; what is deleted and when; the largest risk.

### A. What the planner optimises, and on which numbers
- **First, the map against the leaderboard.** The season is about 26 days old. What do the leading accounts have:
  points, combat levels, skill levels, gear? Which achievements has the leader finished, and which of them does the
  map price at thousands of hours or place behind a gate it calls unreachable? From that: by how much the map's
  hours are off, and where (levelling, crafting training, kill times, the event floors, the assumption that five
  characters and three crafting skills level together). Then say what a fleet that started on 2026-11-03, is not a
  member and plays without pause can expect by the deadline: a range, with what it rests on. If this changes
  `docs/rework.md` decision 8, it is the first line of the report.
- **The objective, and the order it gives.** The map orders greedily: the next achievement is the one with the most
  points per marginal character-hour. Alex doubts that "achievements first" is the right order at all and proposes
  levelling first (2026-11-18). The greedy order is blind to three things, and the design has to weigh them:
  - where the points are: of the 195 open points 72 need no combat level, 81 need combat 41 or more, 64 of them
    46–50 (map D) — any plan that wants more than about 110 points is a levelling plan;
  - the calendar: most of the high-level points hang on events, whose spawns cannot be hurried; each day the fleet
    is below an event's gate is spawns lost, and the map counts those floors from today (its own note);
  - cost that falls with level: better tools cut the gather cooldown, a stronger fighter kills faster and rests
    less. Quantify it from the game's formulas, the item data and the simulator: what do 1,000 pigs or 6,000 coal
    cost at the level they open, and ten and twenty levels later?
  Against it stand: the work that is capped per day (favors) and loses a day for each day not played; the work that
  levelling does anyway (map D, "Paid by levelling" — the gathering chains to 50 cost about 250 hours a specialist
  and are the gathering achievements); and the risk that the levelling hours are as high as the atlas says.
  **Compare plans by points at the deadline, not steps by points per hour**: at least the map's greedy order,
  "level first" to 30, 40 and 50 and then harvest, and a mixed spine (levelling as the main line, the per-day and
  event work whenever its gate is met, the by-products as they fall, the work with no other use last or as filler).
  Use the leaderboard's pace next to the atlas's. Recommend the objective the planner optimises and the order it
  gives for this fleet, and say how the build stages of section I change with it.
- What it does when nothing in reach fits the deadline any more: it keeps going down the list.
- Where each cost comes from (the docs' formulas, the atlas, the simulator, the log), and **how a measured number
  replaces an estimate while the fleet plays**: seconds per kill, per gather, per task, hours per level. What is
  stored, where, and what recomputes the order.
- What of `scripts/design/achievement-map.mts` becomes engine code, what stays a script, and whether the map is
  regenerated by the planner or read by it.
- **A read-only look at the two soft spots of the map**, with the leader's data next to them; they decide how far
  past combat 35 this season's plan goes (the bronze badge at 105, silver at 158):
  - H.12: why is `craftTrain` above skill 40 that high (`scripts/atlas/econ.mts`)? A defect, a missing rule
    (recycling returns, bank stock, the price of a tasks coin), or the true cost? Show the calculation for one level,
    for example jewelrycrafting 44. Don't change the atlas.
  - H.10: must all five characters level, each band with three gear crafting skills at its start? What the cheaper
    shapes are (fewer fighters, one crafter per skill as today, gear bought or dropped), and what each does to the
    order in map E, roughly.
  If either changes the picture of `docs/rework.md` decision 8, say so first in the report.
- Priorities Alex can adjust: what the knob is (an order override, a weight, an exclusion) and where it lives.

### B. The plan as data
- The shape: goal → milestones → steps, with dependencies and gates (map D), the owner of each step, and its state.
- What is persisted and what is recomputed: at boot, when a step ends, on a level-up, when an event spawns, when a
  read of the achievements comes back, on a timer. What a restart of the service loses.
- How the plan divides work across five characters: specialists, parallel gathering, who levels what.
- Options to weigh at least: a plan computed once and repaired, against an order recomputed from the state each
  time; steps bound to a character when planned, against bound when started.

### C. One writer of the queues
- How a step becomes queue items, and which of today's item kinds are enough (audit B lists every writer; say what
  each becomes).
- Who may interrupt whom, as one ordered list: a live event, the daily offerings, a full bag, food and rest, a gear
  swap, a higher-priority step. What the interrupted step keeps and how it resumes.
- A step that fails, stalls or can never finish: how the planner notices (no progress over what span), what it does,
  and what it never does (pause a character and wait for Alex).
- **No idle character.** Whatever is blocked, each character always has the next best work. Say what that is when
  the list has nothing a character can do.
- What the matrix of audit B shrinks to once the planner is the only automatic writer.

### D. Shared stock and money
- Reservations instead of per-call-site filters (audit D): who reserves, what a reservation covers (bank and bags),
  how the executor's protective rules (`keep`, `trainKeep`, `brewKeep`, `foodKeep`, the gold floor, the coin reserve)
  map onto them or disappear.
- **The spending rule** (`docs/rework.md` decision 10): the planner spends gold, tasks coins and event currency by
  itself where that earns points sooner than work, above the 20,000-gold floor. Design the budget: what it compares
  (map G gives gold against character-hours replaced), how it ranks purchases that compete for the same gold (boat
  fares, obsidian, backpacks, Lost World Maps, event merchants that are up for 60–90 minutes), and what the
  Nomadic Merchant standing order becomes. Give the purchases the rule would make in the first four weeks, from the
  map's figures.

### E. One answer per question
For each family of audit C — best monster, best gear set, best recipe or node to train on, how to get an item, time
and value estimates, who the specialist is — the one implementation the planner uses, and what happens to the
others (kept behind it, merged, deleted). Solo fights only today: what a group fight needs from the simulator.

### F. The abilities the client lacks
From map F, each as a design the size of its stage. For each: what the game requires (docs URL), what exists in the
code (`path:line`), what is added, and the scenarios that would prove it in the harness.
1. Map transitions: layers in path-finding, keys, tolls, `has_item`; what the catalog knows about transition tiles.
2. The whole fleet on a live event: who leaves what, the preconditions (level, gear, bag space, travel time against
   the minutes left), resource events against monster events, and the event poll's cost in requests.
3. Group boss fights without a click: gathering three characters, `participants`, keys, a lost fight, and how the
   kill time of a group is estimated before the simulator knows groups.
4. `use` on purpose.
5. The small gaps: claiming pending rewards, reading achievement progress inside the 300-an-hour budget, buying
   with an item currency.
Raids are out of scope (`docs/rework.md` decision 7): say only what in this design would have to change to let them
in later.

### G. What becomes of what exists
One table: pins, the training loops, helpers and "Fleet helps", "Train pins", event standing orders, the offerings
trigger, the task loop, group-fight `prepare`, 🔁 repeat, the hive (goals, craft orders, earn-gold, continuous
mode) and its panel, the manual queue editor, the Roadmap tab's next steps and fleet analysis, the atlas. For each:
a planner step, a planner-owned interrupt, kept as it is underneath, or deleted — and in which stage.

### H. The UI
Briefly, no mock-ups: the Roadmap as the home screen — what the fleet is doing and why, what comes next, what is
blocked and on what, points so far and expected by the deadline — and from which data each of those is drawn.
Queues read-only. What is removed from the UI and when.

### I. The build path
The part the next tasks are written from.
- **Stages.** `docs/rework.md` decision 9 gives a provisional order, derived from the map's greedy list: (1) the
  planner picks an achievement's work itself, with today's queue items; (2) transitions; (3) the whole fleet on a
  live event; (4) group boss fights; (5) `use`. Section A may change the objective, and with it what the first
  stage has to be (if levelling is the main line: what stops the fleet's levelling first — transitions, gear,
  group fights?). Give the order you recommend with the reason.
  If the code forces a different order, or a cheap piece of a later stage belongs earlier (mining needs a transition
  at skill 30 and the fleet mines at 21–24; an event missed is a day lost), say so.
- For each stage: what is built and what is deleted; the points by the deadline it adds (map F); the scenarios that
  cover it; whether Alex has to restart the service; what Alex has to do in the game's UI, if anything; how many
  tasks it is. Each task is small enough to be run and accepted in one sitting.
- **Living next to the old code.** Until the hive, the pins, the helpers and the manual editor are gone, who owns a
  character's queue? Options at least: the planner takes characters over one at a time; the planner runs all five
  from stage 1 and the old writers are switched off with a flag; the old writers are deleted in stage 1. Recommend
  one; say what happens to work that is in the queues at the moment of the switch.
- **Stage 1 in full**: the modules and their exports, the data it reads, the queue items it writes, the state it
  persists, what it shows in the UI, the scenarios, and what it deliberately leaves to the hive or to nobody. Name
  the achievements stage 1 would work on in its first week from the snapshot, per character.
- The risks of the path, and for each the scenario or the observation in `logs/dev.log` that would show it early.

## Out of scope
Any change of behaviour or code; build tasks; raids; UI mock-ups; regenerating or correcting the atlas; new
scenarios; a `CLAUDE.md` workflow section.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `005: planner design` on top of `Rework notes`. `git show --stat HEAD` → only
   `tasks/005-planner-design.md`, its report, `docs/design/planner.md` and the four leaderboard files under
   `docs/design/snapshot/`. `git status` clean. The report lists every request: 6 at most, none with a token.
2. `docs/design/planner.md` opens with the summary and has sections A–I, each answered or marked "not determinable"
   with the reason.
3. Every real choice shows its options and one recommendation.
4. Section I names stage 1's modules, data, queue items and scenarios, and the first week's work per character.
5. Three `path:line` references picked at random point at code that says what the design claims.
6. `npm run typecheck` passes; `npm run check` → 30 checks, 29 ok, 1 known, exit 0.

## Report
`tasks/005-planner-design.report.md`, with these sections in this order:
- **Summary** — 3–6 lines: first what the leaderboard says about the map and what this fleet can expect; then the
  planner, the recommended options and stage 1.
- **Decisions for Alex** — numbered, and only what is his: what the game is played for, what is spent, what is
  deleted for good from what he uses. Each: the question in one line, the options (A / B), your recommendation, and
  the default if Alex doesn't answer. Technical choices are not decisions for Alex; they are recommendations in the
  design, settled in the planning chat. "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What was done / files** — the documents written; what you read in full and what you only sampled; every command
  run; every web page read.
- **Notes** — anything else: where the design contradicts `docs/rework.md` or the map and why; defects noticed.
- **To delete (Alex)** — or "Nothing".
