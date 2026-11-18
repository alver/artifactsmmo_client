# 008 — The planner's runtime: Fifth plays on the planner — report

## Summary
- `src/state/planner.ts` (new, 527 lines) runs the planner's core for every character that is on: it decides a step, writes its `pl:` items, watches the queue, and decides again when the step ends, pauses, stalls or ends empty. It is the only automatic writer of an owned queue; everything ahead of a step goes through `interrupt()` (offerings, merchant / event orders, claims).
- `DEFAULTS.on = { Fifth: true }`. Alex's config is stored as a patch over the defaults. With nobody on, the runtime does nothing; the 37 checks of report 007 pass unchanged except `598-is-an-answer`, rewritten for the new rule (a 598 is looked at once more, then skipped; never a pause).
- Twelve new scenarios, all ok. One of them (`planner-restart`) boots a second engine in a new process on the same storage. `npm run check`: 49 checks, 48 ok, `repeat-spin` the known one, 7.7–8.7 s. `npm run check -- planner`: `deadline points 54 / 54 / 54`.
- On the 2026-11-18 snapshot, Fifth's first step would be Tanner's Exchange (24 cows → the hard leather), then 47-highwayman chunks for Highway Patrol.

## Decisions for Alex
None.

## How Alex verifies
1. `git log --oneline -2` → `008: planner runtime` on top of `Rework notes`; `git status` clean.
2. `npm run check` → `49 checks: 48 ok, 1 known defect reproduced, 0 failed` (about 9 s), exit 0. `598-is-an-answer` and the twelve `planner-*` are among the ok ones.
3. `npm run check -- planner` → last line `OK (171067 invariant checks, 5 made-up cases; deadline points 54 / 54 / 54)` (about 46 s).
4. `npm run typecheck` prints nothing after `tsc --noEmit`. The scratch build succeeded (see "Commands run").
5. `git grep -n "insertItem(" -- src` → five lines: the definition `src/state/queue.ts:146`, the hive `src/state/hive.ts:487`, `src/state/eventorders.ts:88` (the branch for a character that is not on), `interrupt()` `src/state/planner.ts:409`, and the planner's own writer `src/state/planner.ts:139`.
6. `git show --stat HEAD` → the files of acceptance 6, plus `src/state/store.ts` (who is on lives there, section 7) and `src/plan/planner/types.ts` + `config.ts` (the core's part, section 1).
7. After the restart (I could not check this): the section below.

Steps 1–6 I ran myself (step 1 and 6 after the commit).

## After the restart
**Fifth's queue at the first boot.** Everything in it is dropped, and each dropped item gets one line in the dev log (`plan Fifth: took over — dropped [<id>] <item>`). From what `docs/rework.md` says Fifth runs ("Train pins", maybe a leftover hive item), that is the pin rotation — a bank reset and "train +1 level" per pinned skill — and any hive item; 🔁 goes off. The scenario `planner-takes-over` shows exactly this for a 🔁 pin rotation, an endless gather and a hive item. Fifth goes on the hive's "manual" (opt-out) list if it is not there already. Nothing Fifth carries is lost: the first step starts with a bank reset.

**Fifth's first step, and why.** The planner reads the achievements once, then decides. On the snapshot of 2026-11-18, with Fifth the only character on, the best target is Tanner's Exchange: one hard leather left, 2 points for about 0.4 hours (24 cows for 3 cowhide, then buy the hard leather from the tailor). If someone already finished it, the next is Highway Patrol: chunks of 47 highwaymen (about 1.5 hours each) until the 401 kills are done, then combat to 25, coal for Intermediate Miner, and so on, as report 007 described for Fifth. Every chunk starts with a bank reset into the best set from the bank.

**The other four** keep doing what they do: their queues, pins, helpers and the hive are untouched — except that none of them can use Fifth any more. "Fleet helps" skips Fifth; the hive leaves Fifth out. If the Nomadic Merchant comes and Fifth is the nearest busy character, Fifth makes the trip as an interrupt and then goes back to its step. At 00:05 UTC, Fifth gets its offerings ahead of its step, the same way.

**In the Character tab**, for Fifth: a green "🧭 planner on" button; one line above the queue with the reason for the current step ("objective: Highway Patrol: 354 Highwayman kills left, +2 pts in ~11 h; 47 now (1.5 h)"), and, if anything is blocked, a "⛔ blocked: … until hh:mm (why)" line. The queue table and the live note are there; the add form, the arrows, edit, remove, clear, 🔁, Run, Stop, "Train pins" and "Fleet helps" are gone. The other four show a grey "🧭 planner off" button next to their usual controls.

**In `logs/dev.log`, a good day looks like:**
- `plan Fifth: ach:highway_patrol:0@Fifth#3 (objective, 47 units, 1.5 h) — objective: Highway Patrol: …` — a new step about every 90 minutes;
- `plan Fifth: sample kill:highwayman 64 s (n=2, estimate 57 s)` — a measured cost at each step's end;
- `plan Fifth: interrupt offering — Today's seasonal offerings` once a day, and maybe `interrupt merchant — …`;
- `plan: completed highway_patrol (+2)`, then `plan Fifth: interrupt claim — Claim pending rewards` and `claim Fifth: … — 1× small_bag_of_gems (gems 25 each), …`.

**A bad day looks like:**
- `plan Fifth: queue found stopped — started` — the queue stood still for a whole 5-minute tick; that is a defect;
- `plan Fifth: flapping — <six keys>` — seven steps in ten minutes; a defect;
- the same `plan Fifth: blocked <target> 6 h — …` again and again, or `blocked <target> for everyone until …` (three times running);
- `plan Fifth: no step — …` or `defect: …`;
- `plan: slower than expected — kill:highwayman …` is not a defect, but it says the estimate is far off.

**Handing Fifth back.** Click "🧭 planner on" in Fifth's queue panel. The planner's items go, the queue is left empty and stopped, Fifth leaves the hive's opt-out list if the planner put it there, and the choice is stored (it survives restarts). Then Fifth is Alex's and the old writers' again ("Train pins" etc. work). Clicking "🧭 planner off" hands it to the planner again (with a confirm, because its queue is dropped).

## What was done / files
**1. State — the `planner` signal** (`src/state/planner.ts`)
- Key `ammo:v1:planner`, hydrated at load (`:39`, `:48`) before its persisting effect (`:50`); the effect writes only when the value changed, so nobody on means no write. Added to `SYNCED` (`src/state/synced.ts:29`, `:54`).
- `PlannerState` and `Running` changed in the core's types (`src/plan/planner/types.ts:103-125`): `current[name]` holds the step, `startedAt`, `n` (items compiled), `run` (running seconds), `progress` + `movedAt` (the counter and the running second it last moved), `units` (the highest count seen), `from` (a train step's start level), `lv` (a level step's level and its running seconds), `over` (ended and accounted). The ended step stays in `current[name]` until the next decision, so `world.current[name]` of the deciding character is the step it just finished (the +10%). Also `strikes`, `optedOut`, `config` as a `Partial<PlannerConfig>` patch; `blocked` entries may carry `levels` (`:94-95`).
- `configOf(patch)` merges the patch over `DEFAULTS` (`:63`), one object per patch so `targets.ts`' memo holds. `worldOf(now)` (`:81`): characters in account order, bank, bank gold, achievements, `liveEvents()`, `current` of owned characters only, costs, blocked, config.
- `setPlannerConfig(patch)` (`:466`): guard + `expose` (`:527`); `on` is merged per name.

**2. Boot** — `resumePlanner()` (`:498`), called after `resumeQueue()` in `boot()` and `login()` (`src/state/sync.ts:48`, `:182`).
- Per owned character: anything that is not `pl:` → take-over; the step's `pl:` items still queued → `re-attached <key>`, the queue started if it stands; a step that ended while the service was down is marked `over` without a sample.
- Then one forced achievements read and one `loadPendingRewards` (`bootRead`, `:482`), then a claim if rewards are pending. A failed read is retried every minute until decisions are allowed; free characters decide after the first good read, or after five minutes with the world as it is.
- One change of order against the task: the take-over runs **before** the read, synchronously. `resumeQueue()` has already relaunched the old queue; doing it after the read would let the old queue act during the read.
- `sync.ts` hands its two reads to `resumePlanner({ loadAchievements, loadPendingRewards })` instead of `planner.ts` importing `sync.ts` (a cycle). A dynamic `import("./sync")`, as the hive does, resolves through tsx's loader thread in the harness, so the read would land at a random virtual time.

**3. The step loop**
- `start(name)` (`:104`): brake check, `decide`, `itemsOf`, items appended behind whatever is queued (interrupts), `runQueue`, and the line `plan <name>: <key> (<as>, <units> units, <h> h) — <why>`. It refuses to decide while a step item is queued (`:107`).
- `tick()` (`:288`), one microtask per queue write (`:283`): removes a paused interrupt; observes the running step; ends it when its items are gone; blocks it when its item paused or it stalled; decides for a character with no step.
- `next(name, block?)` (`:248`): drops what is left of the step, blocks or samples it, reads the achievements after an objective's or filler's step, then `start`.
- **The seam** (header comment `:8-13`). The effect only schedules a microtask. (1) `runLoop` removes a step's last item while the loop is alive and `running` (`src/state/queue.ts:1525`), then sleeps 50 ms (`:1492`) before it looks at the head again; the tick runs before that timer, so the next step's items are in the queue when the loop looks. No start is needed, and the queue never stops (`planner-picks-kill` checks `running` between every two timers). (2) When the decision first awaits an achievements read, the loop may run dry and exit. Its exit — `setQueue(running: false)` (`:1498`) → `return` → `finally` with `liveLoops.delete` (`:1564-1565`) — is one synchronous run, so a continuation after the await finds the loop either alive and running, or gone; `runQueue` then launches a new one. (3) The heartbeat starts any owned queue with items that stands stopped without an error, with the line `queue found stopped — started` (`:339-344`).
- The planner's way in, not exposed (`src/state/queue.ts`): `insertItem` now creates a missing queue (`:146`), `resetQueue` (`:182`), `runQueue` (`:1627`), `haltQueue` (`:1663`); `startQueue` / `stopQueue` are the guard plus these (`:1621`, `:1657`).

**4. Fails, stalls, ends empty**
- A paused step item → `next(name, error)` (`:306`). A stall: `run − movedAt > max(20 min, 5 × hours/units)` of running time (`:269`, `:307`); counter = finished items × 10⁶ + every item's `done` + a buy's `bought`; for a train step, every XP of the character, because sourcing a batch gathers or hunts before it crafts (`:146-160`). Ended with no unit → `ended empty: <skip line from the activity log>` (`:241`, `:255`).
- `blockStep` (`:223`): 6 h for the pair, line `blocked <target> 6 h — <why>`. The third block in a row of a target (`strikes`, reset by a step of it that did units) blocks it for every owned character until the next UTC midnight, with `levels`, which the heartbeat clears at a level-up of a gate lane (`:329-338`).
- A paused interrupt is removed and the queue runs (`:294-300`).
- The brake (`:113-121`): the 7th start within 10 min blocks every candidate `rank()` returns for 30 min, so `decide` gives the fallback; line `flapping — <six keys>`.

**5. `interrupt()`** (`:401`): ids `pl:int:<cls>:<what>:<i>`, placed after any leading interrupt of the same or a higher class (`:392-395`), idempotent per (cls, what), starts a stopped queue.
- Offerings: `scheduleOfferings` calls a hook for owned characters (`src/state/queue.ts:1697`, `:1706`) and skips them in its old loop (`:1708`); the hook is `offeringsDue` (`src/state/planner.ts:416-417`), `<what>` = the UTC date, so one per character and day.
- Event orders: `free()` for an owned character (`src/state/eventorders.ts:39-46`); after 22:00 UTC an owned character with an offering interrupt still queued is not a candidate for a monster or resource event (`:49-55`); the dispatch goes through `interrupt(…, "merchant" | "event", items, eventKey)` (`:87`), the old `insertItem` branch stays for the others (`:88`).

**6. The `claim` item**: the type and text (`src/plan/queue.ts:90-92`, `:142`, the 🎁 icon `:150`), the handler (`src/state/queue.ts:521-542`). At the bank, `claimItem` per pending row, its codes (and "gold") recorded in `got`, then those deposited. The dev log line `claim <name>: <description> — 1× small_bag_of_gems (gems 25 each), …, 500 gold` writes a bag's effects out. A reward that does not fit answers 497 and `runLoop`'s full-bag path banks the bag first. The claim is triggered by `readAchievements` (`src/state/planner.ts:357`: a completion since the read before → one pending read → `claimRewards`, `:381`, the emptiest bag, one at a time) and at boot. Not in `QUEUE_KINDS`, as the task says — but `QUEUE_KINDS` is the restore filter of `loadStored` (`src/state/queue.ts:58`), not the editor's list (that is `ADDABLE` in `QueuePanel.tsx`), so a claim queued at a restart is dropped then; the boot check re-issues it.

**7. Take-over, hand-back, guards**
- `takeOver` (`src/state/planner.ts:430`): halt, one line per dropped item, `resetQueue` keeping `pl:int:` items (🔁 off), then onto `hive.manual` with `optedOut` remembered (`:421`).
- The task says to wait for the loop to drain first; I do not wait. `runLoop` ignores a finished step whose item is gone (`src/state/queue.ts:1524`), so the drained action changes nothing. The planner's next `runQueue` cancels the stop, and the live loop goes on with the new head.
- `handBack` (`:439`): halt, drop every `pl:` item, clear `current`, leave the opt-out list if the planner put it there.
- **Who is on lives in `src/state/store.ts:220-221`** (`plannerOn`, `isOwned`), kept by an effect in `planner.ts` (`:67`), so `queue.ts`, `hive.ts` and `eventorders.ts` read it without importing `planner.ts`.
- Guards:
  - `refused()` (`src/state/queue.ts:112`) in `addItem`, `removeItem`, `updateItem`, `moveItem`, `clearQueue`, `setRepeat`, `startQueue`, `stopQueue`, `queueOfferings`, `queuePinTraining`, and `queueAssist` for an owned crafter.
  - `queueAssist` skips an owned helper (`:1613`).
  - `toggleHiveManual` refuses an owned character (`src/state/hive.ts:824`); `setHiveManual` (`:832`) is the planner's way in.
  - `launchHive`'s take-over already skips the opt-out list.

**8. 598 in `runLoop`** (`src/state/queue.ts:1488`, `:1507-1520`): the first 598 on an item logs "looking again" and the item runs once more; a second in a row skips it (`skipItem`). A success in between resets the count. `runOffering`'s own catch stays.
- `598-is-an-answer` asserted before: one call answered 598, the queue paused with `… (code 598)` on the head, no 60 s hold.
- It asserts now: a 598 then three gathers (looked again); on a second item two 598s in a row → skipped, the queue runs to its end, the skip line is in the log, never "network trouble", never paused.

**9. Reads and samples**
- Reads (`:357`): the boot read (forced), every 30 minutes on the heartbeat, and after an objective's or filler's step — at most six attempts in any hour (`:317`, `:359-361`), whatever asks, however many characters are on.
- Five characters therefore cost at most 6 achievements reads an hour, plus one pending-rewards read per new completion: about 2–3% of the 300 an hour, not 5× the one-character figure.
- Samples (`stepSample`, `:205`): kill, gather, task or craft, ≥ 5 units, `run ÷ units` against the model's own estimate (`unitSec` with empty `costs`); line `sample <key> <s> s (n=…, estimate … s)`; `plan: slower than expected — …` the first time a mean passes twice its estimate (`:192`).
- Level samples (`observe`, `:174-185`): the running seconds of a lane's level between two observed level-ups while level steps of that lane run, carried across consecutive level steps of the lane. They are stored **in hours**, because `hoursToLevel` reads `measured(level:…)` as hours (`src/plan/planner/cost.ts:144`, design A.3 "hours for one level"); the dev log line prints seconds.

**10. The UI** (`src/ui/QueuePanel.tsx`, +49 / −13 lines): `const owned = isOwned(…)` (`:62`); for an owned character the head shows only state and count (`:67-71`), `PlannerLine` replaces the add form (`:163`), rows lose their buttons (`:239`, `:248`); `PlannerSwitch` for every character (`:151`). Everything from the `planner` and `queues` signals. The UI bundle grows from 330 kB to 369 kB: the tab now loads `state/planner.ts` and with it the planner's core.

**11. Scenarios and the fake**

| scenario | what it asserts |
|---|---|
| `planner-picks-kill` | 40 chicken kills after the reset into the bank's dagger; step #2 queued and running; `running` true between every two timers; two reads |
| `planner-takes-over` | four items logged and dropped, 🔁 off, opt-out set, first step running; pins, assist ×2, add, clear, repeat, stop, the hive's toggle: seven refusal lines, the queue unchanged |
| `planner-step-pauses` | an injected 452 on the fight: pair blocked 6 h with the error, items gone, fallback running, the dev-log line |
| `planner-stalled` | a 1,000-turn fight: replaced 20–25 min in, blocked "stalled", the next step queued behind the fight in flight |
| `planner-ends-empty` | two 598 → skipped → "ended empty: <skip line>" block; fewer than four decisions in 30 min; no brake |
| `planner-flapping` | six one-kill steps of a target whose achievements never move → the 7th start brakes: 30-min blocks, fallback, the line with the six keys |
| `planner-restart` | second boot in a new process: same ids, same step, counter kept, running seconds kept, `re-attached`, no decision line |
| `planner-interrupt-offering` | the offering ahead of the running fight; accept, bank, complete at the altar; the step resumes; its running seconds grew < 30 s during a > 120 s interrupt; the sample leaves it out |
| `planner-merchant` | dispatched by the 5-min poll mid-step, ids `pl:int:merchant:<key>:0..1` ahead of the fight item; sold, bought; the step resumes |
| `planner-claims` | completion between reads + a pending row → claim, deposit, bank holds the gem bag; dev-log line with "gems 25 each" |
| `planner-never-idle` | both objectives blocked before boot → `fallback:mining` runs |
| `planner-off` | mid-step off: queue empty and stopped, opt-out gone, current cleared; `addItem` + `startQueue` work |

- The fake now has (`scripts/harness/fake.mts`): `achievements` (read `:597`; scenarios move progress by hand), `pending` (read `:596`) and `claim_item/{id}` (`:546`), the altar's `offering/accept` and `offering` for the scenario's `offerings` (`:486`, `:495`; read `:599`), and `saveWorld`/`loadWorld` (`:179`, `:183`).
- The fake still lacks XP and levels (so no scenario exercises a level sample or the long block's level-up release), task, recycle and give actions, favor effects, and any automatic achievement progress.
- Booting twice in one process is not possible (module state: `liveLoops`, the signals hydrated at import). `t.restart(carry)` (`scripts/harness/index.mts:155`) writes the fake's world to a file, spawns the same scenario with the same Node flags and storage file, `AMMO_CHECK_RESTART` and `AMMO_CHECK_NOW` (the clock goes on, `scripts/harness/clock.mts:27`), and exits with the child's code. The guard lets the second process start on a non-empty file (`scripts/harness/guard.mts:20`). The first engine is simply frozen: no timer of it fires again.
- Also new: `ScenarioDef.planner` and `setup` (`index.mts:243-244`), `achievement()` and `planLines()` helpers (`:208`, `:213`).
- No existing scenario has a character named Fifth. The new ones use Pia / Ivy / Bob, switched on through `planner: { on: { Pia: true } }`. Only `planner-ends-empty` declares `expect598`. The mirror, bounce and layer checks ran on all of them.
- `npm run check` now takes 7.7–8.7 s (7.7 s before with 37 checks); the longest new scenario takes 0.7 s, far from the runner's 110 s per check.

**The core**: types only (above) and `DEFAULTS.on` (`src/plan/planner/config.ts:25`); no rule, cost, role or target changed. `npm run check -- planner` gives 54 / 54 / 54.

**`CLAUDE.md`**: the core section became "The planner (task 008: Fifth is on)"; the 598 sentence of the runner paragraph and the harness's fake description were stale after this task and were updated.

**Commands run**
- `git add docs/rework.md; git commit -m "Rework notes"`
- `npm run typecheck` (several times), `npm run check` (several times), `npm run check -- <scenario>` per new scenario, `npm run check -- planner`
- `npx vite build --outDir <session scratch>/ammo-008-dist --emptyOutDir` — last lines:
  ```
  …/ammo-008-dist/index.html                   0.40 kB │ gzip:   0.27 kB
  …/ammo-008-dist/assets/index-Dc_NjE2T.css   37.23 kB │ gzip:   7.26 kB
  …/ammo-008-dist/assets/index-BT6KpA3e.js   368.53 kB │ gzip: 123.92 kB
  ✓ built in 1.60s
  ```
- Scratch probes in the session scratch directory: a two-process webstorage probe (the child sees the parent's writes), and Fifth's first four decisions on the snapshot (`node --import tsx --experimental-webstorage --localstorage-file=<scratch>` with a scratch storage file). All deleted at the end.
- `git diff`, `git grep -n --untracked "insertItem(" -- src`, `git checkout -- src/state/sync.ts` (once, to undo a PowerShell edit that had re-encoded the file; the edit was then redone with the editor).

## Notes
**What the runtime needs from the core that is still missing**
- `fallback()` ignores `blocked` (`src/plan/planner/decide.ts:240`). A fallback step that ends empty is blocked, and the next decision gives the same fallback again. Only the brake and the pace of its actions slow that down; the brake's second firing does not stop it.
- `world.current` holds only the owned characters. With one character on, Fifth does not see what the other four are doing: no `inFlight`, no reservations of their stock. It may take the hard leather that First was about to buy.
- `left` comes from the last achievements read. A short tail step of an objective can be decided twice within the read cap (the flapping scenario is the extreme case).
- `PlannerState.outlook` stays unset (settled point 4).

**What task 010 (all five on, the Roadmap) and the clean-up will meet**
- `QUEUE_KINDS` is the restore filter: `claim` and `prepare` are dropped at a restart (a claim is re-issued at boot; `prepare` is decision 4's known defect).
- The guards (`refused`, `isOwned` in `queueAssist` / `free` / `scheduleOfferings`), `setHiveManual`, `optedOut`, the `ev:` branch of `reactToEvents` and the old `free()` rule all go with the hive, the pins and the editor.
- The `event` class is still the one-character order; `group` is reserved.
- With five on, the boot read and the pending-rewards read happen once, and the six-reads-an-hour cap is global.
- `reconcile()` already reads `/my/pending_items` at boot, so the boot `loadPendingRewards` the task asked for is a second read of the same thing.
- The running-seconds rule recognises an outage hold by its note text (`OUTAGE_NOTE`, `src/state/queue.ts:1482`). The "ended empty" reason is read from the activity log by the `skipped: ` prefix. Both are string couplings.

**Defects noticed and not touched**
- `runOffering` still turns a 598 at the altar into a plain error that pauses (`src/state/queue.ts:1441`, kept as the task says). For an owned character the planner then removes that offering interrupt, so the day's offerings are lost for that character.
- The hive's dynamic `import("./sync")` resolves through tsx's loader thread in the harness, so no hive scenario would be deterministic about when it lands. There is none today.
- `planner-restart`'s first process stays alive, frozen, until the second exits. Harmless, but both hold the storage file open.

**Guesses in the numbers, most doubtful first**
1. The stall time, `max(20 min, 5 × the unit estimate)` of running time. A rare-drop hunt has a big unit estimate and is safe. A craft step's batch sourcing is not measured.
2. The 6-hour block. Too short for "not a safe win" (nothing changes in 6 h without gear), and long for a vanished event target.
3. The brake (7 starts in 10 min, 30 min of blocks), and three strikes for the long block.
4. Six reads an hour and the five-minute wait for the first read at boot.
5. Level samples need two observed level-ups in a row of level steps of one lane. The first level of every run is never sampled.

## To delete (Alex)
Nothing.
