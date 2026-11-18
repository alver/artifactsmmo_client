# 007 — The planner's core: pure, checked offline

## Goal
`docs/design/planner.md` describes one pure function that picks, for a free character, the next 90-minute chunk of
work from the open achievements and the levels that gate them. This task builds that function and everything it
stands on as a library under `src/plan/planner/`, plus `scripts/check-planner.mts`, which runs it on the saved
fleet: the first step of each character, the first week, and the same function played forward to the deadline.

Nothing in the running client calls the library yet. The runtime that writes queues from it is task 008. So this
task changes no behaviour and needs no restart; what it must deliver is **evidence that the rule picks sensible
work** before anything runs on it. The scoring rule (design A.2, rule 3) has never been run — the design's scratch
model had "greedy" and a fixed spine, not the rule itself, and was deleted. The replay in this task is its first
run, and its result is discussed in the planning chat before 008 is written.

Since the design was written, task 006 made movement layer-aware: `src/plan/route.ts` gives `route(from, to, may)`,
`FREE` and `travelSec`. The design's "stage 1 refuses anything on another layer" therefore becomes "anything with
no free route": gold rocks, mithril, rats and bats are in reach; the lich, the island and what else sits behind a
key or a toll are not.

Read first: `CLAUDE.md`; `docs/rework.md` (the goal; decisions 11–17); `docs/design/planner.md` — A.2, A.3, A.4,
A.5, A.6, all of B, C.1, C.4 ("No idle character"), D.1, E, I.3 (task 1 and "The first week"), I.4; report 006
(what `route()` does; section 7 on offerings); `docs/design/achievement-map.md` sections D–H as far as the costs
need them; `scripts/design/achievement-map.mts` (the parts A.4 names); `src/plan/route.ts`; `src/plan/jobgear.ts`,
`src/plan/bis.ts`, `src/plan/xp.ts`, `src/plan/queue.ts` (the item types), `src/plan/events.ts`,
`src/plan/hive/skills.ts:50`, `src/plan/hive/ctx.ts`; `src/catalog/atlas.ts`; `src/types/api.ts`;
in `src/state/queue.ts` (read only) `forecastVs` (`:644`), `trainingMonsterFor` (`:662`), `trainRecipe` (`:759`);
`scripts/check-roadmap.mts` (how a check script loads the catalog, the atlas and a fixture) and `scripts/check.mts`
(it runs every `scripts/check-*.mts`, 110 s of real time at most); `docs/design/snapshot/*`;
`scripts/fixtures/roadmap-fleet.json`.

The design's `path:line` references are as of commit `524c83e`. Task 006 moved lines in `src/state/queue.ts`,
`src/state/exec.ts` and `src/state/loopkit.ts`; go by the function names there.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running and stays undisturbed.** Don't start, stop or restart a service; don't call the
  local one; don't run `npm start`, `npm run dev`, `npm run build`, `npm run atlas`, `npm run assets` or the fetch
  scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to `logs/dev.log` (reading it is fine).
- **No request to the game.** Don't read `.env`. The inputs are the files named in section 10.
- **No engine change.** Nothing under `src/state/`, `src/ui/`, `src/server/`, `src/api/`, `src/sim/` or
  `src/catalog/` is edited, no existing file under `src/plan/` is edited, and **no existing file imports the new
  modules**. If the core needs something that exists only inside `src/state/` (it reads signals there), write the
  pure version in the planner, taking its inputs as arguments, and list the pair under Notes ("for 008: make the
  old one call the new"). If you find that an existing file must change for the core to be right, stop that part
  and put it under "Decisions for Alex" with what and why.
- **Scope:** `src/plan/planner/*` (new), `scripts/check-planner.mts` (new), new files under `scripts/fixtures/`
  if the check needs them, `CLAUDE.md` (a short section: what the planner's core is, that nothing calls it yet, how
  to run its check). Nothing else.
- **Pure.** In `src/plan/planner/`: no signals, no `localStorage`, no network, no timers, no `Date.now()` — the
  time is `world.now`. Reading the loaded catalog and atlas (`catalog()`, `atlas()`) and memoising on an argument's
  identity (the bank array, as `forecastVs` does) are fine. The same `World` gives the same `Step`.
- **Dependencies:** none new.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`.
- Gate: `npm run typecheck`, `npm run check`, and a production build into a scratch folder:
  `npx vite build --outDir <temp dir>/ammo-007-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`.
  2. At the end, `007: planner core`: this task file, the report and what the task changed.

## What is settled on top of the design
The design is the specification; these points change or narrow it (decisions 13, 16 and 17 of `docs/rework.md`).
1. **Reach is a free route.** The `layer` gate of a target is met for a character when `route()` with `FREE`
   reaches at least one tile that carries the work (a static tile, or a tile of an event in `world.events` that
   has not expired at `world.now`). No keys, no tolls, no `has_item`.
2. **No spending rule.** Design D.2 is not built. The planner creates no purchase with gold; "Lost World Maps
   only" stays where it is today (`src/plan/events.ts`). `stock.ts` is `floor`, `reserved` and `available`, nothing
   more. A `buy` with an item currency (the cowhide for hard leather) is a step like any other.
3. **No `gear:` targets** (task 010). The fighters level on what the bank holds.
4. **The "another character would do it 1.5 times faster" rule (B.4) is left out.** If the replay shows the
   first-free-takes-best rule doing something silly, show the case in the report; don't add the rule.
5. **Rules 1–5 of A.2 are implemented as written.** "The order this gives for this fleet" (A.2) and "The first
   week" (I.3) are what the design expected to come out, not further rules. Where the replay differs from them,
   report the difference and its cause; don't bend the rule or add a special case to match. Two things the design
   does build in, and they stay: E's 1.25 bonus in `pickMonster` for a monster with an open kill or drop
   objective, and B.4's +10% for the target a character was on last.
6. **Offerings and claims are interrupts (008), not steps.** `decide` never returns a favor step. The forward
   model (section 9) counts them: `config.offeringsPerDay` = 10 for the fleet (measured on 2026-11-17 and 11-18,
   report 006; the cap is 15) and `config.offeringMin` = 20 minutes each (design A.3, a guess).
7. **Events, group fights, `use`, raids**: targets behind them exist as data with their gate (`event`, `group`,
   …) so that the outlook can say what the open points wait for; `decide` never returns a step for them in this
   task, except a target whose work is on a live, freely reachable event tile and needs nothing else (the Strange
   Apparition for a miner at 35). The fleet-wide event interrupt is stage 3.

## 1. Types and config — `types.ts`, `config.ts`
Design B.1 and A.6, with `DEFAULTS`, `CHUNK_SEC = 5400` and `FILLER`. Add to `PlannerConfig` what point 6 above
needs. `World` is a snapshot: everything `decide` reads is in it, in the catalog or in the atlas.

## 2. Targets — `targets.ts`
`targetsOf(world): Target[]`: every open objective of every open achievement as work, gates and `left`, and the
level gates behind which open achievements sit (design A.4: `objective()`, `place()` of the map script, over the
live catalog and `world.achievements`).

**No objective is dropped silently.** Each objective of the season's achievements either becomes a target or is
listed by `targetsOf` as unhandled with a reason; the check prints that list and the report carries it.

## 3. Costs — `cost.ts`
Design A.3: the `costs` table keyed by what is done; `measured ?? estimate` once `n ≥ 3`; `sample()` with the
exponential mean; `unitSec`, `hoursToLevel`, `hoursOf`. Estimates from the fleet's own forecasts (`killSeconds` of
`ownedFightForecast`, `gatherSec` with the best tool the bank or the character holds), the atlas for hours per
level (`path`, `gatherTrain`; `craftTrain × 0.1` up to 40 and 60 hours a level above for the three gear crafting
skills, as a knob the check can turn).

Walking is part of a unit's cost where it differs between candidates: the round trip to the nearest bank by route
(`travelSec`) per bagful, on top of the log factors of A.3. Say in the report what the estimate is made of for a
kill and for a gather, with one worked example each (pigs; gold rocks).

## 4. Roles — `roles.ts`
`rolesOf(characters, config, targets)`, design B.3: everyone fights; one specialist per gathering skill; a second
and third gatherer for a skill while an event target behind it is open; crafting stays where it is;
`config.roles` pins. The report shows the roles it computes for the fixture next to the design's (B.3).

## 5. Picks and reach — `pick.ts`
- `pickMonster(ch, world, bonus)`: design E — XP per second among monsters that are on the map now, that the
  character reaches by a free route, and that are a **safe** win with the pool "bank + own" (`ownedFightRec`);
  × 1.25 for a monster with an open kill or drop objective. Candidates stop at level + 10 as today. Memoised so
  that a replay of thousands of decisions is affordable; say per what.
- `pickNode(skill, level, ch, world)`: design E — XP per hour by the docs' formula among nodes that exist now
  (static, or a live event's) and are reachable.
- The reach test both use: the tiles of a content code, static and live-event, and `route()` with `FREE` from where
  the character stands. `nearest()` in `src/state/loopkit.ts` answers the same question from signals; don't import
  it. List the pair for 008.

## 6. Stock — `stock.ts`
Design D.1, plan-time reservations only: `floor(code)` (the sell floors and the gold floor of
`src/plan/events.ts`, imported from there; if they are not exported, copy the values with a comment and list the
pair under Notes), `reserved(world)` — what the current steps of the other
characters will withdraw: materials, a `buy`'s currency, the gear set their job wears — and
`available(code, world, forName)`.

## 7. `decide` — `decide.ts`
`decide(name, world): Step` — rules 1–5 of A.2, for one free character, given what the others are on
(`world.current`) and what is blocked (`world.blocked`).
- **It always returns a step** (C.4, "No idle character"): the best in-reach target; else the best level gate of
  the character's lanes; else filler; else a 90-minute gather chunk on the best node of its highest gathering
  skill. The step's `why` says which of the four it was.
- **Never**: a step whose place has no free route; a kill that is not a safe win; a craft or gather whose skill
  gate is not met; a target blocked for this character before its time; more units than the objective has left
  after the other characters' current chunks.
- **A step is one chunk**: `units` is about `CHUNK_SEC` at the current unit cost, at least 1.
- **A level step's work** is the kill or the gather that levels the lane now (`pickMonster`, `pickNode`), and for
  a crafting skill one level of `train`. When an open objective's own work also levels the lane (6,000 coal for a
  miner), the rule should arrive there by itself; if it does not, report it.
- **`why`** is one line a person can read on the Roadmap: what, how much is left, what it earns and when.
- Ties are broken by the target's key, so the result is stable.

## 8. Queue items — `compile.ts`
`itemsOf(step, ch)`: design C.1, today's item kinds only, at most four items a step, none infinite, with the ids
the runtime will give them (`pl:<step.key>:<i>`). `src/plan/queue.ts` is not edited: if its input type cannot
carry an id, return the ids beside the items. The check compiles every step it prints and the typecheck holds the
shapes.

## 9. Forward — `advance` and `outlook`
- `advance(world, step): World`: the world after the step, by the estimates — the objective's `left`, the XP and
  levels the work gives (the same XP formulas the picks use; the atlas's `xpNeeded`), the clock of that character
  moved by `step.hours`. Per character and UTC day it also takes the offerings' minutes and counts their favors
  (point 6). The XP of offerings is left out (conservative); events are not simulated. Say so in the outlook.
- `outlook(world, n)`: the next `n` steps of each character and `expected` — the points at `config.deadline` from
  `decide` and `advance` run forward. This is what the Roadmap will show and what the runtime will recompute every
  half hour. Report what one `decide` and one full forward run cost (cold and warm). If the full run is more than
  a few seconds, don't make it coarser silently: say what you would coarsen and what that loses.

## 10. `scripts/check-planner.mts`
Inputs, all on disk: `public/data/*` (catalog, atlas) loaded as `scripts/check-roadmap.mts` does; the characters
and achievements of `docs/design/snapshot/` (2026-11-18 14:28 UTC), the bank of
`scripts/fixtures/roadmap-fleet.json` (2026-11-17); bank gold as a constant with its source in a comment. If the
two files disagree in a way that matters (an item both in a snapshot bag and in the fixture bank), say which you
took. `world.now` is the snapshot's time.

**In every run** (`npm run check`; well under a minute of real time):
- the roles; the unhandled objectives; the first step of each character with its `why`, score, hours and compiled
  items;
- the first week played forward: per character the steps in order (target, units, hours), and the achievements
  completed with their day;
- invariants, each a named check, over **every** decision of that week:
  1. `decide` returned a step for every free character;
  2. no step's place lacks a free route from where the character stood;
  3. every kill step is a safe win by `ownedFightRec` at the level the character had then;
  4. every skill and level gate of the step's work was met;
  5. no objective was given more units than it had left;
  6. filler was chosen only when nothing else scored above zero, the fallback only when nothing else existed;
  7. a step is at most four items, none infinite, every id starts with `pl:`;
  8. the same world twice gives the same step;
  9. a blocked pair is not returned before its `until`;
  10. the account's points never fall, and no character's clock stands still.
- three small made-up worlds for what the fixture cannot show: everything blocked → the fallback gather; a target
  that exists only behind a key (the lich) → never a step, listed as waiting for "another layer"; a miner at 35
  with the Strange Apparition live on a reachable tile, and the same world with the event expired → the event
  node, then the gold rocks.

**With `npm run check -- planner`** (verbose; may take longer, say how long): the replay to the deadline for three
prices of gear crafting — the atlas as it is, × 0.25, × 0.1 (the default) — with the same invariants on every
decision, and for each row:
- points on day 7, 14, 30, 60 and at the deadline, and the achievements completed in order with their day;
- the share of character-hours by what `decide` answered: an in-reach objective, a level gate (per lane), filler,
  the fallback;
- per character the levels reached at the deadline (combat and its lanes);
- the open points at the deadline grouped by what they wait for: a level, an event, another layer, a group, `use`,
  filler not reached, "does not fit".

For orientation, not a pass mark: the design's scratch model had 68 points for stage 1 and 87 with every
transition; with free transitions only, the default row should land between them. Report where it lands, and if
it is outside, why.

## Out of scope
The runtime, the `planner` signal, `interrupt()`, the `claim` item, the six guards, anything that writes a queue
(task 008); the UI (009); gear by need (010); keys, tolls, `has_item`; the spending rule; the fleet on events;
group fights; `use`; raids; the harness and the scenarios (no new scenario: nothing runs yet); making the old
functions call the new ones (`trainingMonsterFor`, `trainingResourceFor`, `nearest`); regenerating the atlas or
the achievement map; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `007: planner core` on top of `Rework notes`; `git status` clean.
2. `npm run check` → one check more than before (`check-planner`), all ok except `repeat-spin`, the only known
   one; exit 0.
3. `npm run check -- planner` → the roles, the first steps with their reasons, the first week, the three replay
   rows; `OK` with the count of invariant checks.
4. `git grep -n "plan/planner" -- src scripts` → matches only inside `src/plan/planner/` and
   `scripts/check-planner.mts`: nothing that runs imports the core.
5. `git show --stat HEAD` → only `src/plan/planner/*`, `scripts/check-planner.mts`, fixtures, `CLAUDE.md`, this
   task file and the report.
6. `npm run typecheck` passes; the scratch build succeeded and its JavaScript file has the same name as in report
   006 (`index-BZi3vrq8.js`) — the bundle did not change. If the name differs, the report says why.

## Report
`tasks/007-planner-core.report.md`, with these sections in this order:
- **Summary** — 3–6 lines; the default row's points at the deadline among them.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is deleted
  for good). Each: the question in one line, the options (A / B), your recommendation, the default. "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What the planner would do from today** — in plain words, no code: per character the first step and why, then
  the first week as one table (character, lanes, steps, achievements moved, points). Next to it, where it differs
  from the design's "first week" (I.3) and from "the order this gives" (A.2), and the cause of each difference: the
  rule, a cost, reach, or a defect you found.
- **The replay** — the three rows of section 10 as tables, and what they say: does the rule behave as a spine when
  crafting is cheap and as the greedy order when it is dear; anything silly it did (a character walking between
  two targets, filler ahead of real work, a lane nobody levels, a specialist left without its skill); what the
  result is most sensitive to.
- **What was done / files** — per section 1–10: the module, its exports, the lines; what each estimate is made of;
  the unhandled objectives with their reasons; the roles; the costs of `decide` and of a forward run; every command
  run.
- **Notes** — the functions that now exist twice (planner / `src/state`) for 008; what 008 will need from the
  core that is not there; defects noticed and not touched; guesses still in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
