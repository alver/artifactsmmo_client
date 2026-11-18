# 008 — The planner's runtime: Fifth plays on the planner

## Goal
Task 007 built the planner's pure core (`src/plan/planner/`): `decide(name, world)` returns the next 90-minute
step for a free character, `itemsOf(step, ch)` compiles it into today's queue items. Nothing calls it yet. This
task builds the runtime that does: `src/state/planner.ts` reads the world from the signals, asks `decide`, writes
the step's items onto the character's queue, watches the queue, and asks again when the step ends, pauses or
stalls. It is the only automatic writer of an owned character's queue.

It ships with **one character on, Fifth**, and the other four left to the old writers (the hive, pins, helpers) —
design I.2. Fifth holds no crafting role and its first week needs no gear (report 007: highwaymen to combat 25,
coal, steel bars, mining to 30, gold). After Alex restarts the service, Fifth plays on the planner for a day of
real play; that day is the trial of the loop, not of the rule. What this task must deliver is a loop that **never
leaves Fifth idle and never needs Alex**: a step that fails is blocked and replaced, a restart re-attaches, an
offering goes ahead and the step resumes.

Read first: `CLAUDE.md`; `docs/rework.md` (the goal; decisions 13–21); `docs/design/planner.md` — B.1, B.2, C
(all of it), D.1, F.5, I.2, I.3 (task 2), I.4; report 007 (Notes: "What 008 needs that the core does not have",
"Functions that now exist twice"); report 006 (the 598 path); `src/plan/planner/*` (all of it);
`src/plan/queue.ts`; in `src/state/`: `queue.ts` (the edit ops, `runLoop`, `skipItem`, `startQueue`, `stopQueue`,
`resumeQueue`, `scheduleOfferings`, `queueOfferings`, `queuePinTraining`, `queueAssist`), `sync.ts` (`boot`,
`login`, `watchEvents`, `loadAchievements`, `loadPendingRewards`), `synced.ts`, `eventorders.ts`, `events.ts`,
`hive.ts` (how it persists its own key and hydrates; `assignmentStatus`; `toggleHiveManual`; `resumeHive`),
`store.ts`, `apply.ts`; `src/api/actions.ts` (`claimItem`); `scripts/harness/*` and three scenarios
(`merchant-order`, `598-is-an-answer`, `old-queue-item`); `scripts/check-planner.mts`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running and stays undisturbed.** Don't start, stop or restart a service; don't call the
  local one; don't run `npm start`, `npm run dev`, `npm run build`, `npm run atlas`, `npm run assets` or the fetch
  scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to `logs/dev.log` (reading it is fine). The
  running service keeps the code it was started with; what you write goes live when Alex restarts it, after the
  report is accepted.
- **No request to the game.** Don't read `.env`. Everything is proven in the harness.
- **Dependencies:** none new.
- **`CLAUDE.md`**: the section on the planner's core becomes a short section on the planner as it now runs: who
  is on, the one writer and `interrupt()`, the `plan …` lines of the dev log, how the check runs.
- **The core's rule is not this task.** In `src/plan/planner/` you may change types the runtime stores
  (`PlannerState`), export what the runtime needs, and fix a defect that a scenario of this task shows (say which,
  with the scenario). The rule, the costs, the roles and the targets stay as they are: their second round is task
  009. `npm run check -- planner` must print the same deadline points as report 007 (54 / 54 / 54); if it does
  not, say why.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`.
- Gate: `npm run typecheck`, `npm run check`, and a production build into a scratch folder:
  `npx vite build --outDir <temp dir>/ammo-008-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`.
  2. At the end, `008: planner runtime`: this task file, the report and what the task changed.

## What is settled on top of the design
The design is the specification (B.2, C, F.5, I.2, I.3 task 2). These points change or narrow it.
1. **One character on.** `DEFAULTS.on = { Fifth: true }`. A character that is not on is not the planner's: no
   step, no interrupt, no guard, nothing written. The world still holds all five characters (the roles need
   them); `world.current` of a character that is not on is `undefined`.
2. **With nobody on, the runtime does nothing**: no read, no timer, no write, no log line. Every existing
   scenario must pass unchanged; if one of them has a character named Fifth, say so and how you kept it apart.
3. **Alex's changes are stored as a patch over `DEFAULTS`**, not as the merged config, so a later change of the
   defaults reaches a running installation (task 010 turns the other four on that way).
4. **No outlook in this task.** `PlannerState.outlook` stays unset. A forward run to the deadline costs 8–14 s
   (report 007) on the service's one thread, and it says nothing true while four characters are not the
   planner's. It comes with the Roadmap (task 010).
5. **No spending rule.** The Nomadic Merchant order stays what `merchantOrder` gives today; only its way into an
   owned queue changes (section 5).
6. **A step that ends with none of its units done is a failed step** (the item was skipped: a vanished target, no
   route, nothing to craft from). It is blocked like a stall. Without this the same step is decided, skipped and
   decided again in a tight loop.
7. **An interrupt that pauses is removed, not the step under it.** The error goes to the log; the step resumes.
   An offering that cannot be done today is the `offering` item's own business (`skip`).
8. **A 598 at action time is a vanished target, for every queue, owned or not** (decision 16 of
   `docs/rework.md`): look again once (the item runs again and picks its tile again); a second 598 in a row on the
   same item skips the item (`skipItem`). It never pauses a queue and is never held as an outage.
9. **The planner's own functions stay next to the old ones** (`pickMonster` / `trainingMonsterFor`, `pickNode` /
   `trainingResourceFor`, `nearestSpot` / `nearest`, `fightRec` / `forecastVs`). Don't make one call the other:
   the clean-up decides which survive.
10. **Each chunk keeps its bank reset** (`gear { reset: true }` as `itemsOf` compiles it), also when the next
    step continues the same target. It costs a bank trip every 90 minutes and it is what brings a fighter's drops
    to the bank. The measured costs will say whether to drop it; not in this task.

## 1. State — the `planner` signal
`src/state/planner.ts`, server-only like `src/state/hive.ts`. The signal `planner: Signal<PlannerState>` is added
to `SYNCED` (`src/state/synced.ts`), persisted under its own key `ammo:v1:planner` and hydrated before its
persisting effect, the way the hive does it. It holds `current`, `costs`, `blocked`, the config patch and
`achievementsAt` (design B.1). Keep in `current[name]` what sections 3 and 4 need: the step, when it started, the
running seconds counted so far, the progress counter and when it last moved, and the step the character was on
before (the +10% of rule B.4 reads `world.current[name]` of the deciding character).

`worldOf(now): World` builds the snapshot `decide` reads: the characters in account order, `bankItems`,
`bankDetails.gold`, the `achievements` signal, the live events (`liveEvents()`), `current`, `costs`, `blocked`,
`DEFAULTS` merged with the patch. `now` is the only clock the core sees.

`setPlannerConfig(patch)` — guard and `expose`, as the other rpcs are.

## 2. Boot
`resumePlanner()` is called after `resumeQueue()` in `boot()` and `login()` (`src/state/sync.ts`), before
`resumeHive()`.
- One achievements read (`loadAchievements`), then one `loadPendingRewards`.
- For each character that is on: a `pl:` item still in its queue → re-attach to `current[name]` (nothing is
  written; the queue is started if it holds items and is not running); no `pl:` item → section 7's take-over if
  the queue holds anything else, then decide.
- A failed achievements read: keep what is there, try again in a minute. A re-attached step runs on. A free
  character waits for the first successful read at most five minutes, then takes a step from the world as it is
  (with no achievements that is the fallback chunk).

## 3. The step loop
For a character that is on and has no step:
1. `decide(name, worldOf(now))`; `itemsOf(step, ch)`; write the items onto the queue; start the queue; set
   `current[name]`; one dev-log line `plan <name>: <step.key> (<as>, <units> units, <hours> h) — <why>`.
2. The step has ended when no item with the id prefix `pl:<step.key>:` is left in the queue.
3. At the end: take the cost sample (section 9); if the step was an objective's or a filler's, one achievements
   read first (design F.5), and go on without it if it fails; then decide again for this character only.

**The seam with `runLoop`.** When the last item finishes, `runLoop` sets `running: false`, returns, and its
`finally` drops the running state once more (`src/state/queue.ts`, `runLoop`). `startQueue` returns without
starting while that loop is still in `liveLoops`. So a start issued from inside an effect on `queues` is lost,
and the character stands with a full queue that is not running. Find a seam that cannot lose a start — the next
step appended before the queue runs dry, or the start issued after the loop has gone — and say in the report
which, with the lines. A small export from `queue.ts` is fine. Whatever the seam: the 5-minute tick also starts
any owned queue that holds items, is not running and has no error, and writes a dev-log line when it had to
(`plan <name>: queue found stopped — started`); that line appearing in real play is a defect to report.

**The planner writes through functions the tab cannot call.** The exposed edit ops (`addItem` … `stopQueue`) are
the same functions on the server, and section 7 makes them refuse an owned character. The planner needs its own
way in (`insertItem` and `dropItem` exist for the hive; add what is missing next to them, not exposed).

**Never two steps.** One step per character at a time; a decision for a character that has a `pl:` step item in
its queue is a defect.

## 4. A step that fails, stalls or ends empty (design C.4)
| case | how it is noticed | what happens |
|---|---|---|
| the queue paused on a step's item (`running: false`, the head carries `error`) | the effect on `queues` | `blocked["<target>@<name>"] = { until: now + 6 h, why: error }`; the step's items are removed; decide again; the queue runs. Dev log: `plan <name>: blocked <target> 6 h — <why>` |
| no progress | the 5-minute tick: the step's counter (`done` of its field item, `bought`, turn-ins; for a `train` step the lane's XP) has not moved for `max(20 min, 5 × the unit estimate)` of time in which one of the step's items was the head and the queue was running | the same, `why: "stalled"` |
| the step ended with no unit done (settled point 6) | at the step's end | the same, `why: "ended empty: <the skip's reason if the log has it>"` |
| an interrupt's item paused (settled point 7) | the effect | that item is removed, the queue runs; no block on the step |
| a target blocked for every character that could do it, three times running | at the third block | blocked until the next UTC day or the next level-up of a lane in its gates, whichever is first |

Never: a character that is on, with an empty or a stopped queue, for longer than one tick. Never an item removed
whose id does not start with `pl:`. Never a blocked pair returned before its time (the core honours
`world.blocked`; the runtime only has to pass it).

**A brake, as the last line.** More than six step starts for one character within ten minutes: the character
gets the fallback gather chunk (decide with everything else blocked for it for 30 minutes) and the dev log says
`plan <name>: flapping — <the six keys>`. It must never trigger in the scenarios except the one that provokes it.

## 5. `interrupt()` and what goes through it
`interrupt(name, cls, items)` in `src/state/planner.ts` is the only way anything gets ahead of an owned queue's
head (design C.3). It inserts the items ahead of the head, behind any item of the same or a higher class, with
the ids `pl:int:<cls>:<what>:<i>`. The class order, highest first: `group` (not built; the place is reserved),
`event`, `merchant`, `offering`, `claim`. A step is never inserted ahead of anything.

What the interrupted step keeps: its items, their progress and its place in the queue. The running seconds of
section 9 do not count while an interrupt is the head.

- **Offerings.** For a character that is on, the daily trigger (`scheduleOfferings`, 00:05 UTC, and the boot
  catch-up) calls `interrupt(name, "offering", [{ kind: "offering" }])` instead of `queueOfferings`. One offering
  interrupt per character and UTC day; the `offering` item is unchanged.
- **Event orders.** `reactToEvents` (`src/state/eventorders.ts`) stays the one-character order it is. When the
  character it picks is on, its items go through `interrupt(name, "merchant" | "event", …)` instead of
  `insertItem`; `free()` counts an owned character as free when its queue runs and its head is not an interrupt
  of the class `event` or higher. After 22:00 UTC an owned character whose offerings of the day are still open is
  not free for an event (design C.3). The fleet on an event is stage 3, not this task.
- **Claims.** Section 6.

## 6. The `claim` item (design F.5)
`| { kind: "claim" }` in `src/plan/queue.ts` (the type, the text, the icon; not in `QUEUE_KINDS`, so the queue
editor does not offer it — as `prepare` is handled) and one handler in `src/state/queue.ts`: walk to the bank,
`actions.claimItem` for every row of `pendingRewards`, then deposit what was claimed. Skip-if-satisfied: no pending row → done. A
reward that does not fit the bag: bank first, then go on.

When an achievements read shows an achievement completed that was open in the read before, the runtime reads the
pending rewards once and, if there is a row, calls `interrupt(name, "claim", [{ kind: "claim" }])` for the owned
character with the emptiest bag. The same at boot when pending rewards exist. One claim interrupt at a time.
The dev log names what was claimed; gems and what a reward bag holds are written out in full (Alex wants the
first bag reported; the planner spends no gems).

## 7. Taking a character over, handing it back, and the guards (design I.2)
**Switched on** (at boot for a character that is on and whose queue holds anything that is not `pl:`; or through
`setPlannerConfig`): `stopQueue` and wait for the loop to drain its action; write every queued item to the dev
log, one line each (`plan <name>: took over — dropped [<id>] <queueItemText>`); empty the queue; clear 🔁; put the
character on the hive's opt-out list (`hive.manual`) if it is not there, and remember that the planner did it —
a running hive assignment is abandoned by `toggleHiveManual`'s own rule; then section 3.

**Switched off** (`on: false`): the step's and the interrupts' `pl:` items are removed once the running action
has drained; the queue is left empty and stopped; `current[name]` is cleared; the character leaves the opt-out
list if the planner put it there; blocks and costs are kept. From then on the character is Alex's and the old
writers' again.

**The guards**, each for a character that is on:
| writer | guard |
|---|---|
| the queue edit ops the tab calls: `addItem`, `removeItem`, `updateItem`, `moveItem`, `clearQueue`, `setRepeat`, `startQueue`, `stopQueue`, `queueOfferings` | refused, with one activity-log line saying the planner owns this queue |
| `queuePinTraining` | refused the same way |
| `queueAssist` | skips an owned character as a helper; refused when the crafter is owned |
| the daily offerings trigger | section 5 |
| `free()` in `eventorders.ts` | section 5 |
| the hive | never dispatches to, steals from or rebalances onto an owned character: the opt-out list; `toggleHiveManual` is refused for an owned character; `launchHive`'s take-over leaves it out |

`src/state/queue.ts` must not import `src/state/planner.ts` if that makes a cycle: keep "who is on" where both
can read it, and say where.

## 8. 598 in `runLoop`
Settled point 8, in `runLoop`'s error path (`src/state/queue.ts`). The scenario `598-is-an-answer` says today
what a 598 does; change it to the new behaviour and say in the report what it asserted before and asserts now.
`runOffering`'s own catch of 598 and 575 stays.

## 9. Achievements reads and cost samples
- **Reads**: at boot; every 30 minutes on the tick; when an objective's or a filler's step ends. At most six an
  hour with one character on; say what five characters will cost against the 300 an hour of the account bucket.
  `planner.achievementsAt` is the time of the last successful one.
- **Samples** (design A.3; `sample()` and `costKey()` of `src/plan/planner/cost.ts`): at a step's end, for a
  kill, gather, task or craft step with at least five units done, `running seconds ÷ units done` goes into
  `costs` under the work's key. Running seconds are the time in which one of the step's own items was the head
  and the queue was running: an interrupt, a pause, an outage hold and a stopped service do not count.
  `level:<lane>:<L>`: the wall time between two level-ups of a lane while a level step for that lane was the
  current step, counted the same way. One dev-log line per sample:
  `plan <name>: sample <key> <sec> s (n=<n>, estimate <sec> s)`.
- A measured key at more than twice its estimate gets one line when it first crosses:
  `plan: slower than expected — <key> <measured> s against <estimate> s`.

## 10. The smallest UI
No new tab, no Roadmap work (task 010). In the queue panel of the Character tab (`src/ui/QueuePanel.tsx`):
- a "planner" switch per character, calling `setPlannerConfig({ on: { [name]: … } })`;
- for a character that is on: one line above the queue with the current step's `why` and, if there are any,
  what is blocked for it and until when; the add, edit, move, remove, clear, 🔁, start and stop controls hidden.
  The queue table and the live note stay.

Everything is drawn from the `planner` and `queues` signals; nothing computes in the tab. Keep it under about 80
lines; no styling work beyond what makes it readable.

## 11. Scenarios and the fake
New scenarios under `scripts/scenarios/`, each with a made-up world small enough to read (one or two owned
characters with their planner on through the scenario's config, an achievements list of one to three
achievements, bank gear that makes the fight a safe win):

| scenario | it shows |
|---|---|
| `planner-picks-kill` | an open kill objective: the reset, the fight for the chunk's units; the step ends; the next step is queued and running; at no check is the owned character without a running queue |
| `planner-takes-over` | the character starts with a 🔁 pin rotation, an infinite item and a `hive:` item: each is logged and dropped, 🔁 is off, the first step runs; then `queuePinTraining`, `queueAssist`, `addItem`, `clearQueue`, `setRepeat`, `stopQueue` and `toggleHiveManual` leave the owned queue as it is |
| `planner-step-pauses` | a forced failing action on the step's item: the pair is blocked, the step's items are gone, another step runs, the queue is running, the error is in the dev log |
| `planner-stalled` | a step whose counter does not move: replaced after the stall time, blocked for 6 h |
| `planner-ends-empty` | a target that vanishes before the first unit (a 598 twice, or no route): blocked; fewer than four decisions in the whole run — no tight loop, the brake not triggered |
| `planner-flapping` | provoked: more than six starts in ten minutes → the fallback chunk and the `flapping` line |
| `planner-restart` | the engine booted a second time on the same storage in the middle of a step: re-attached by ids, no second copy of an item, the counter kept, no new decision |
| `planner-interrupt-offering` | the offering interrupt goes ahead of a running step; the step resumes with its counter; the sample does not count the interrupt's time |
| `planner-merchant` | a merchant event with the owned character nearest: the order's items carry `pl:int:merchant:` ids ahead of the step; the step resumes |
| `planner-claims` | an achievement completes between two reads and a pending reward exists: the claim, the deposit, the dev-log line |
| `planner-never-idle` | every target blocked: the fallback gather runs |
| `planner-off` | switched off in the middle of a step: no `pl:` item left, the queue empty and stopped, the opt-out list as before; `addItem` and `startQueue` work again |

The fake learns what these need and no more: the account's achievements list from the scenario's world (and a
way for the scenario to move an objective's progress), pending items and `claim_item`, and the least of the
altar that lets the `offering` item finish for one category. Say in the report what the fake has now and what it
still lacks. If booting the engine twice in one process is not possible, say how `planner-restart` does it.

The mirror check, the bounce check and the layer check hold for the new scenarios as for the old; a scenario that
expects a 598 says so. Say the new total time of `npm run check`; if the scenarios push it past the runner's
limit, say what you changed.

## Out of scope
The outlook and `expected`; the Roadmap and every other UI (task 010); turning on any character but Fifth by
default; the core's rule, costs, roles and targets — gear by need, materials made by another craft, alchemy by
crafting, the price of a level gate, the roles' stability, the diamonds' 71-hour step (task 009); the spending
rule; the fleet on events; group fights and the `group-fight` item; `use`; keys, tolls, `has_item`; deleting
anything of the hive, the pins, the helpers, 🔁 or the queue editor (the clean-up); making the old pick functions
call the new ones; regenerating the atlas; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `008: planner runtime` on top of `Rework notes`; `git status` clean.
2. `npm run check` → the 37 checks of report 007 plus the new scenarios, all ok except `repeat-spin`, the only
   known one; exit 0. `598-is-an-answer` is among the ok ones with its new assertions.
3. `npm run check -- planner` → `deadline points 54 / 54 / 54`, as in report 007.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -n "insertItem(" -- src` → the hive, `eventorders.ts` (its branch for a character that is not on),
   `interrupt()` and the planner's own writer; nothing else.
6. `git show --stat HEAD` → `src/state/planner.ts` (new), `src/state/queue.ts`, `src/state/sync.ts`,
   `src/state/synced.ts`, `src/state/eventorders.ts`, `src/state/hive.ts`, `src/plan/queue.ts`,
   `src/ui/QueuePanel.tsx`, what the core needed (named in the report), the harness, the scenarios, `CLAUDE.md`,
   this task file and the report. Anything else is explained in the report.
7. After Alex has restarted the service (not part of the run): section "After the restart" of the report says
   what he will see.

## Report
`tasks/008-planner-runtime.report.md`, with these sections in this order:
- **Summary** — 3–6 lines.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is deleted
  for good). Each: the question in one line, the options (A / B), your recommendation, the default. "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **After the restart** — in plain words, no code: what happens to Fifth's queue at the first boot (what is
  dropped, read from the scenario, not from the live storage), the first step Fifth takes and why, what the other
  four keep doing, what Alex sees in the Character tab, and the lines to look for in `logs/dev.log` — for a good
  day (`plan Fifth: …`, samples) and for a bad one (`queue found stopped`, `flapping`, the same target blocked
  again and again). How Alex hands Fifth back if he wants to.
- **What was done / files** — per section 1–11: what, where (`path:line`); the seam of section 3 and why a start
  cannot be lost; where "who is on" lives; what the fake learned; every command run.
- **Notes** — what the runtime needs from the core that is still missing; what task 010 (all five on, the
  Roadmap) and the clean-up will meet; defects noticed and not touched; guesses in the numbers (the stall time,
  the 6 hours, the brake), most doubtful first.
- **To delete (Alex)** — or "Nothing".
