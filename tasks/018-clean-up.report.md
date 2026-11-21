# 018 — The clean-up: report

## Summary
- **The service was not restarted during the work.** `logs/status.json` at 17:22:01 and at 18:19:01 UTC: run `qf93`, commit `b322195`, up since 17:01:00 UTC; the journal's only `boot` in the window is 17:01:00 (`qf93`). It runs report 017's code until Alex restarts.
- **What went**: 20 modules of `src/` deleted whole (4,929 lines at `b322195`: the hive's 13 files with its panel, the old Roadmap's 5, the gear coverage view's 2), one moved unchanged (`src/plan/hive/objectives.ts` → `src/plan/objectives.ts`), and a net 1,485 lines out of 21 surviving files (the editor, the pins, 🔁, the helpers and the training loops in `state/queue.ts`, dead CSS). `src/` is 89 files and 20,700 lines against 109 and 27,114 (−24%). Under `scripts/`: 4 checks and 5 scenarios.
- **What the tab can still ask the service to do**: the direct actions (`act`, `move`), the token, the reads (`reconcile`, achievements, pending rewards, offerings), the 🧭 switch (`setPlannerConfig`), the offering interrupt of an owned character (`queueOfferings`) and the Group fight's `queuePrepare` — the one new function, which writes what the fold wrote before. Nothing in the tab writes a queue.
- **The gate**: `npm run check` → **82 checks, 82 ok** (report 017: 90, 89 ok + `repeat-spin` known; −9 deleted, +1 `cleanup-boot`); `npm run check -- planner` → `OK (693681 invariant checks, 98 made-up cases; deadline points 88 / 121 / 108 / 62 / 86)` in 2,079 s — report 017's line to the digit; typecheck and the scratch build pass. No file under `src/plan/planner/`, `src/sim/`, `src/api/`, `src/lib/`, `src/catalog/` or `scripts/check-planner.mts` changed.
- **What a restart drops from storage**, one raw line each (`boot: dropped … — nothing writes or reads it since task 018`): `ammo:v1:hive`, `ammo:v1:offeringsDaily`, the pins in `ammo:v1:state` (and `craftPins` if it is still there). The five queues hold only `pl:` items (all five are owned), so no queue item and no 🔁 flag is expected to go. `.ammo/` was not read: this is from the code and `logs/status.json`, not from the storage.

## Decisions for Alex
None.

## How Alex verifies
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `018: clean-up` on top of `d9739a2 Rework notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit; `git log main --oneline -1` → `edaaf23`.
2. `git diff --stat b322195 HEAD -- src/plan/planner src/sim src/api src/lib src/catalog scripts/check-planner.mts` → empty (I ran it on the working tree before the commit).
3. `npm run check` → `82 checks: 82 ok, 0 known defects reproduced, 0 failed`, exit 0, about 180 s; nothing new under `logs/` (the harness writes in memory). The 90 of report 017 less the nine of section 3, plus `cleanup-boot`.
4. `npm run check -- planner` → ends with `OK (693681 invariant checks, 98 made-up cases; deadline points 88 / 121 / 108 / 62 / 86)` for rows A / B / C / E / G, report 017's line to the digit, in about 2,080 s of the 2,700 s backstop (I ran it; nothing in its import graph changed after it started).
5. `npm run typecheck` passes; `npx vite build --outDir <temp>/ammo-018-dist --emptyOutDir` built (336.7 kB of JS, 31.1 kB of CSS). I ran both.
6. `git grep -nE "[^c]hive|Hive|skillPins|craftPins|queueAssist|queuePinTraining|setRepeat|roadmapAnalysis" -- src scripts` → only what section 4 lists ("The grep of acceptance step 6"): history comments, the boot drop's key names, the core's files (which may not change), a fixture `check-planner` reads, and the design script of task 004.
7. `git show --stat HEAD` → deletions; changes only in `src/` outside the protected directories, `scripts/` checks, scenarios and harness, `.claude/skills/verify/`, `CLAUDE.md`, and the task and report files. `docs/rework.md` is in the commit before it.
8. **After the restart** (not checked by me — the service runs `b322195` until Alex restarts):
   - the journal's `boot` record carries the new commit and the five `re-attached` steps (`npm run journal`, "Restarts");
   - the raw log of the boot hour (`logs/raw/<day>/<HH>.log`) has a `boot: dropped ammo:v1:hive …` line, one for `ammo:v1:offeringsDaily`, one for `ammo:v1:state's pins` — and nothing else of the kind is expected;
   - no `pause` record; `logs/status.json` rewritten every minute;
   - `http://localhost:5173/` opens on Fleet; the top bar is Fleet · Character · Bank · Items · Monsters · Achievements · Map · Sim (no Roadmap); no 🐝 strip or fold, no 🛡 Gear coverage fold, no queue form anywhere; each character's Character tab shows its queue read-only with the 🧭 line (the step's why).

## The plan of the deletion
Made from the import graph and the files before the first deletion; corrected below to what was done (each correction says so).

**Modules deleted whole** (lines at `b322195`):

| module | lines | | module | lines |
|---|---|---|---|---|
| `src/state/hive.ts` | 863 | | `src/plan/roadmap.ts` | 469 |
| `src/ui/HivePanel.tsx` | 453 | | `src/plan/fleetcheck.ts` | 137 |
| `src/plan/hive/achievements.ts` | 375 | | `src/state/roadmap.ts` | 21 |
| `src/plan/hive/acquire.ts` | 463 | | `src/ui/RoadmapTab.tsx` | 425 |
| `src/plan/hive/ctx.ts` | 129 | | `src/ui/roadmapText.ts` | 124 |
| `src/plan/hive/gear.ts` | 238 | | `src/plan/coverage.ts` | 208 |
| `src/plan/hive/gold.ts` | 218 | | `src/ui/GearCoveragePanel.tsx` | 127 |
| `src/plan/hive/index.ts` | 73 | | | |
| `src/plan/hive/order.ts` | 33 | | **moved** `src/plan/hive/objectives.ts` → `src/plan/objectives.ts` | 70 |
| `src/plan/hive/score.ts` | 44 | | | |
| `src/plan/hive/skills.ts` | 205 | | | |
| `src/plan/hive/tasks.ts` | 152 | | | |
| `src/plan/hive/types.ts` | 172 | | **total deleted** | **4,929** |

`objectives.ts` (70 lines, a little over settled point 6's "about 60") moved as a file for the Achievements tab, as the task names it; only its three import paths and its header comment changed. `trainingResourceFor` did not need a move: no surviving handler calls it once the `train` item of a gathering skill is gone.

**Exports that go, per file of settled point 5** (functions that lose only `export` stay in their file):
- `src/state/queue.ts`: `removeItem`, `updateItem`, `moveItem`, `clearQueue`, `setRepeat`, `queuePinTraining`, `queueAssist`, `stopQueue`, `assistPick` deleted; `patchItem`, `trainRecipe` no longer exported; `addItem` and `startQueue` stay for the harness, no longer exposed. Gone inside: `headLocked`, `trainingMonsterFor` and its memo, `runTrainCombat`, `levelsPin`, `runTrainAssist`, `scheduleOfferings` with its marker and timer. New: `queuePrepare` (exposed, settled point 3), `droppedAtLoad` (settled point 9).
- `src/plan/queue.ts`: the kinds `move`, `rest`, `accept-task`, `work-task`, `deliver`, `turn-in` (type, `QUEUE_KINDS`, text, icon).
- `src/plan/events.ts`: `fieldOrder`.
- `src/state/eventorders.ts`: no export; `free()`'s line for a character that is not owned, `offeringFirst`, `orderFor`'s monster/resource branch, the `ev:*` insert.
- `src/state/store.ts`: `MAX_PINS`, `skillPins`, `togglePin` (exposed), `craftPins`, `tilePick`, `armTilePick`, `disarmTilePick`, `deliverTilePick`, `hiveOpen`, `gearCoverageOpen`. `PIN_SKILLS` stays: it is the skill list of the skills card and the Fleet grid.
- `src/state/persist.ts`: the `pins`/`craftPins` fields; `saveState` no longer exposed (correction: its only tab callers were the pin clicks — found by listing every exposed function's UI caller).
- `src/state/synced.ts`: `skillPins`, `hive`, `roadmapAnalysis` out of `SYNCED`.
- `src/state/sync.ts`: the two `resumeHive()` calls; new `dropOld()` (settled point 9).
- `src/ui/FleetView.tsx`: `Fold` no longer exported (correction: found by the unused-export scan, its other users were the deleted panels).
- `src/state/offerings.ts`, `src/plan/acquire.ts`, `src/plan/xp.ts`, `src/plan/consumables.ts`, `src/plan/bis.ts`, `src/plan/jobgear.ts`, `src/state/exec.ts`, `src/state/loopkit.ts`: nothing — no export of theirs was orphaned (section 2).

**The kinds table** (settled point 4):

| kind | who writes it after this task | |
|---|---|---|
| `fight` | `planner/compile.ts` (kill steps), `planner/events.ts` (event trips) | kept |
| `gather` | `planner/compile.ts`, `planner/events.ts` | kept |
| `craft` | `planner/compile.ts` | kept |
| `withdraw` | `planner/compile.ts` (a trade's currency) | kept |
| `deposit-all` | `planner/compile.ts`, `planner/events.ts` | kept |
| `buy` | `planner/compile.ts`, `plan/events.ts merchantOrder` (the `merchant` interrupt) | kept |
| `sell` | `plan/events.ts merchantOrder` | kept |
| `recycle` | `planner/compile.ts` (tidy steps) | kept |
| `train` | `planner/compile.ts` (a crafting level only) | kept; combat, gathering and `for` shapes deleted with their handlers |
| `gear` | `planner/compile.ts`, `planner/events.ts` | kept |
| `task-loop` | `planner/compile.ts` | kept (`runWorkTask` stays as its function) |
| `offering` | `state/planner.ts` (interrupt) | kept |
| `claim` | `state/planner.ts` (interrupt) | kept |
| `expand` | `state/planner.ts` (the `bank` interrupt) | kept |
| `prepare` | `ui/GroupFight.tsx` → `queuePrepare` | kept (settled point 3) |
| `move` | nobody | deleted |
| `rest` | nobody | deleted |
| `accept-task` | nobody | deleted |
| `work-task` | nobody | deleted (its handler `runWorkTask` stays: `task-loop` calls it) |
| `deliver` | nobody | deleted |
| `turn-in` | nobody | deleted |

**UI elements that go, per tab**:
- Fleet: the 🐝 status strip and the 🐝 Hive fold; the 🛡 Gear coverage fold; in "Needs you" the Paused (Retry), Stopped (▶ Run) and Idle (📌 Train pins) rows; the "Main skills" column; "🔁 repeat" under Up next; the pin click (and the pin outline and number) in the skills grid.
- Character: in the queue card ▶ Run, ⏹, 🔁, 📌 Train pins, ✕ clear, 🤝 Fleet helps, the add form (with its "Pick on map"), the per-row ↑ ↓ ✎ ✕ and the edit form; in the skills card the Pin / 📌N buttons.
- Items: the "Craft…" column and its "Add to X's queue" row form; the 📌 after the best crafter.
- Monsters: "Fight…" and its row form.
- Map: in the bank drawer the "Sell · Ng" button (it queued a sell); the form tile-pick ("Pick on map") in the map and the pop-up map (Walk's pick stays).
- The Roadmap tab and its route.

**Storage keys and fields that go**: `ammo:v1:hive`, `ammo:v1:offeringsDaily`; `pins` and `craftPins` of `ammo:v1:state`; from `ammo:v1:queue` every item of a deleted kind, a `train` of combat or a gathering skill or with `for`, and `repeat`. Kept (read by surviving code): `:state`, `:queue`, `:planner`, `:eventOrders`, `:simdev`, `:token`, `ammo:server:imported`; in the tab `:migrated`, `:ui:activityHidden`, `:gearsets`. `PlannerState.optedOut` stays in `ammo:v1:planner`: its type is in `src/plan/planner/types.ts` (may not change); nobody reads or writes it now.

**Checks and scenarios**: deleted `check-assist`, `check-idle`, `check-roadmap`, `check-steal`, `helper-bank-covers-trip`, `helper-full-bag`, `helper-ping-pong`, `repeat-spin`, `train-mining-30`; rewritten for settled point 2 `planner-off`, `merchant-order`, `check-events` (its runtime half); cut where they used a deleted feature `planner-takes-over`, `no-route`, `old-queue-item`, `buy-head-changes`; new `cleanup-boot`. **Correction**: the plan deleted `scripts/fixtures/roadmap-fleet.json` with `check-roadmap` as the task says; `check-planner` reads it too (`scripts/check-planner.mts:61`, the bank of 2026-11-17), so it stays.

## The deletion
Each group of settled point 1, what went, and how I know nothing that survives used it.

**The hive.** `src/state/hive.ts`, `src/plan/hive/*` (but `objectives.ts`, moved), `src/ui/HivePanel.tsx`; in `FleetView.tsx` `HiveStrip` and the Hive fold; `hiveOpen` (`store.ts`); `hive` in `SYNCED`; both `resumeHive()` calls (`b322195:src/state/sync.ts:50`, `:186`); in `state/planner.ts` `optOut` and the opt-out list's two calls (`b322195:src/state/planner.ts:757-761`, `:788`) and the `optedOut` writes. The hive's other importers (`plan/roadmap.ts`, `plan/fleetcheck.ts`, `plan/coverage.ts`, `RoadmapTab.tsx`) went with their own groups; `state/queue.ts`'s `trainingResourceFor` import went with the gathering `train`. Proof: the import list of the task file checked against `git grep` (it is right: the eight importers it names are all there were; nothing under `src/plan/planner/` imports it — `planner/gear.ts:18`, `pick.ts:4` and `types.ts:156` only name it in comments), then the typecheck and `scripts`' own importers (`check-idle`, `check-steal`, `planner-off`, `planner-takes-over`).

**The pins and the training loops.** `skillPins`, `togglePin`, `craftPins`, `MAX_PINS` (`store.ts`); the pin fields of `persist.ts`; `skillPins` in `SYNCED`; the Pin buttons (`CharacterPanel.tsx`), the grid's pin click and the Main skills column (`FleetView.tsx`), the pinned-first sort (`TableTabs.tsx craftersFor`); `queuePinTraining`; `runTrainCombat`, `trainingMonsterFor`; the gathering-node tail of the `train` case (`b322195:src/state/queue.ts:500-507`); `levelsPin`. Proof: `git grep` of each name; the typecheck (`noUnusedLocals` flags a local left without a caller).

**The helpers.** `queueAssist`, `runTrainAssist`, `assistPick`, the `train` case's call (`b322195:src/state/queue.ts:497`), the form's "help X" select, 🤝 Fleet helps. The `for` field stays in the type for the branches that read it (section 4). Proof: as above, and `check-assist` was the one outside user.

**🔁.** `setRepeat`, `QueueState.repeat`, the 🔁 recycle in `runLoop`'s `finish` (`b322195:src/state/queue.ts:1643-1649`), `runOffering`'s hold "alone on a 🔁 queue" (`b322195:src/state/queue.ts:1542-1548`), `resetQueue`'s `repeat: undefined`, the toggle and the "🔁 repeat" note; the harness's `queue(…, { repeat })`. Proof: the type is gone, so every reader failed the typecheck until cut.

**The queue editor.** `QueuePanel.tsx`'s add form, edit form, row controls, ▶/⏹/🔁/✕/Train pins/Fleet helps; `TableTabs.tsx`'s `QueueTo` with its two openers; `CatalogPanel.tsx`'s queued sell; the form tile-pick (`store.ts`, `MapView.tsx`, `app.tsx`); `addItem`, `removeItem`, `updateItem`, `moveItem`, `clearQueue` as calls the tab can make (the rpc guard and `expose` of the first, the rest deleted: nobody else called them). `startQueue` and `stopQueue` too: settled point 3 counts `startQueue` among the calls the tab may no longer make, and ▶/⏹ and Retry/Run served only queues of old writers (an owned queue refused them already). `startQueue` stays unexposed for the harness; `stopQueue` had no caller left and went. The fold's call is `queuePrepare` (`src/state/queue.ts:1495-1501`): refuses an owned character, puts a `prepare` at the front unless the head is already that prepare, starts the queue — what `GroupFight.tsx` did with `addItem` + `startQueue` (`b322195:src/ui/GroupFight.tsx:45-51`).

**The old Roadmap.** `src/plan/roadmap.ts`, `src/state/roadmap.ts`, `src/plan/fleetcheck.ts`, `src/ui/RoadmapTab.tsx`, `src/ui/roadmapText.ts`, the `roadmap` entry of `TABS` (`b322195:src/app.tsx:22`), `roadmapAnalysis` in `SYNCED`. Proof: their importers were only each other, the hive and `synced.ts`; `check-roadmap` the one script.

**The gear coverage view.** `src/plan/coverage.ts`, `src/ui/GearCoveragePanel.tsx`, `gearCoverageOpen`, the fold. Proof: `GearCoveragePanel.tsx` was `coverage.ts`'s only importer, `FleetView.tsx` the panel's.

**The standing orders of a character that is not the planner's.** `fieldOrder` (`b322195:src/plan/events.ts:91-115`); in `eventorders.ts` `free()`'s non-owned line (`b322195:src/state/eventorders.ts:54`), `offeringFirst`, `orderFor`'s monster/resource branch, the `ev:*` insert (`b322195:…:156`); `scheduleOfferings`, its marker and its call in `resumeQueue`; `queueOfferings`' path for a character that is not owned (`b322195:src/state/queue.ts:1863-1867`). The planner's interrupts are as they were: `free()` keeps the owned line word for word (`src/state/eventorders.ts:53`), the merchant still goes to the nearest free owned character through `interrupt(…, "merchant", …)` (`:145`), `ownedEvents` is untouched, `offeringsDue` and `catchUpOfferings` are untouched (`src/state/planner.ts:721-742`). One thing moves in time: the 00:05 UTC call of `scheduleOfferings` for the owned characters is gone, so their offering interrupt comes from the five-minute tick (`src/state/planner.ts:560`), at most five minutes later (the 00:05 offerings day is unchanged).

**Settled point 9, stored state.** `src/state/sync.ts:39-63` `dropOld()`, first thing in `boot()` (`:66`); the queue's part is recorded where the queue loads (`src/state/queue.ts:52-72`), because the queue module hydrates and rewrites `ammo:v1:queue` at import, before the raw log has a sink. A storage error is swallowed (the next save writes the state without the pins anyway); nothing pauses, nothing throws.

**How I know nothing that survives used what went.** The typecheck (`noUnusedLocals`, every reader of a deleted type field, every deleted import); `git grep` of each deleted name; a scan of every export of the files of settled point 5 and of the UI files against every other file under `src/` and `scripts/`, comments stripped — the same scan at `b322195` gives the same list but for `Fold` and `availableResources` (section 4), so nothing else was orphaned; a reachability walk from the roots of settled point 5 — no module of `src/` is unreachable, before or after (`scripts/design/achievement-map.mts` is unreached at `b322195` too: it is run by hand). The `npx` unused-export finder was refused by the session's permission check; the two scans are small scratch scripts (deleted).

**Dead CSS** (`src/styles.css`, 2,812 → 2,370 lines): the classes the UI named at `b322195` and names no more — the hive's (`hive-*`), the coverage view's (`cov-*`), the Roadmap's (`road-*`, `warn-text`, `.fold-body h4`), `btn-refine`, `btn-stop`, `q-add-form`, `q-opt-sep`, `.q-head .cat-btn.sell`, `.q-actions button`, `cp-skill-focus`, `fleet-pin`, `pin-n`, `.skill-cell.pinned`, `.skill-cell sup`. The grid's cells are `<span class="skill-cell">` now (were buttons for the pin click): the class gives them the same look, without the hand cursor.

## The checks and the docs
**Deleted** (with the feature each tested): `check-assist` (the helpers' pick, `assistPick`/`trainRecipe` with helpers), `check-idle` (the hive's filler), `check-roadmap` (the old Roadmap's milestones and fleet analysis), `check-steal` (the hive's wave rebalancing), `helper-bank-covers-trip`, `helper-full-bag`, `helper-ping-pong` (the helpers), `repeat-spin` (🔁; it was the known defect), `train-mining-30` (`train` of a gathering skill).

**Rewritten for settled point 2** (diffs below): `planner-off` (switched off: the queue empty and stopped, then 30 virtual minutes in which nobody writes to it and Pia does not act — was: Alex's `addItem` + `startQueue` work again, and the hive's opt-out list), `merchant-order` (a merchant spawns while an off character works: no trip, nothing sold or bought, the bank as it was — was: the trip itself; the owned case is `planner-merchant`), `check-events` (its runtime half: no trip and no plan for an off fleet — was: the dispatch to the nearest running queue; `fieldOrder`'s two lines went with it; the eight `merchantOrder` lines are unchanged).

**Cut where they used a deleted feature** (their other assertions unchanged):
- `planner-takes-over`: the pin rotation (`train` of mining) became a crafting level (`train` of weaponcrafting) and the 🔁 flag went, so the run before the switch stops at Ivy's first action (with no 🔁 a finished reset leaves the queue, and "four items before" counted on it); the hive item's id `hive:1:0:Ivy:0` → `old:1:0:Ivy:0`; "🔁 is off" and "on the hive's opt-out list" went; the old writers' block is now the two that are left (the harness's `addItem`, the fold's `queuePrepare`): two refusal lines, the queue as it was.
- `no-route`: the `move` item pinned underground became a `gather` pinned there (the same `NoRouteError` skip in `runLoop`); its skip text "Move to (9, 8)" → "Gather 1× Copper Ore".
- `old-queue-item`: its `move` item went; the trace and the final tile follow (ends on the copper rocks).
- `buy-head-changes`: the inserted `move` became a `claim` with nothing to claim; the calls are `move, npc/buy` (were `move, npc/buy, move`).
- `scripts/harness/index.mts`: `queue()` lost its `repeat` option.

```diff
diff --git a/scripts/check-events.mts b/scripts/check-events.mts
index 522b566..850fa4c 100644
--- a/scripts/check-events.mts
+++ b/scripts/check-events.mts
@@ -3,7 +3,7 @@
 import { readFile } from "node:fs/promises";
 import { setDataReader } from "../src/catalog/load";
 import { loadCatalog } from "../src/catalog";
-import { fieldOrder, merchantOrder } from "../src/plan/events";
+import { merchantOrder } from "../src/plan/events";
 import { eventPlans, reactToEvents } from "../src/state/eventorders";
 import { queues } from "../src/state/queue";
 import { activeEvents, bankDetails, bankItems, characters } from "../src/state/store";
@@ -34,25 +34,20 @@ want("poor", merchantOrder("nomadic_merchant", bank, 30_000, fleet)?.text, "sell
 const mapped = fleet.map((c) => ({ ...c, artifact2_slot: "lost_world_map" }) as Character);
 want("no backpacks", merchantOrder("nomadic_merchant", bank, 200_000, mapped)?.text, "sell 3 Golden Egg");
 
-// Resource event: only a character with the skill for the node goes.
+// Runtime, task 018, settled point 2: a character the planner does not own gets no order — no trip ahead of any
+// running queue's head, no plan for the spawn (it is retried at every poll while nobody owned is free).
 const ev = (code: string, type: string, content: string, x = 3): ActiveEvent =>
   ({ name: code, code, map: { x, y: 2, layer: "overworld", interactions: { content: { type, code: content } } }, duration: 90, expiration: new Date(Date.now() + 3_600_000).toISOString(), created_at: "2026-11-17T10:00:00Z" }) as unknown as ActiveEvent;
-want("magic tree, nobody", fieldOrder(ev("magic_apparition", "resource", "magic_tree"), bank, fleet)?.character, undefined);
-want("magic tree, D", fieldOrder(ev("magic_apparition", "resource", "magic_tree"), bank, [...fleet.slice(0, 3), mk("D", 9, { woodcutting_level: 36 })])?.character, "D");
-
-// Runtime: the nearest running queue gets the trip ahead of its head, once.
 characters.value = Object.fromEntries(fleet.map((c) => [c.name, c]));
 bankItems.value = bank;
 bankDetails.value = { gold: 107_469 } as BankDetails;
 queues.value = Object.fromEntries(fleet.map((c) => [c.name, { running: c.name !== "B", items: [{ id: `h${c.name}`, kind: "gather", code: "ash_wood", resource: "ash_tree", times: 0, done: 0 }] }])) as unknown as typeof queues.value;
 eventPlans.value = {}; // a reused --localstorage-file may hold the last run's plans
-activeEvents.value = [ev("nomadic_merchant", "npc", "nomadic_merchant", 4)]; // B (x 3) is closest but stopped → A (x 0) or C (x 6): C is 2 away
+activeEvents.value = [ev("nomadic_merchant", "npc", "nomadic_merchant", 4)];
+reactToEvents();
 reactToEvents();
-reactToEvents(); // a second poll must not dispatch again
-const c = queues.value.C.items.map((it) => it.kind + (it.id.startsWith("ev:") ? "*" : ""));
-want("dispatch to C", c.join(","), "sell*,buy*,gather");
-want("plan text", eventPlans.value[Object.keys(eventPlans.value)[0]], "C: sell 3 Golden Egg · buy 5 Lost World Map");
-want("B untouched", String(queues.value.B.items.length), "1");
+want("no trip", fleet.map((c) => queues.value[c.name].items.map((it) => it.kind).join(",")).join(" "), "gather gather gather gather gather");
+want("no plan", JSON.stringify(eventPlans.value), "{}");
 
 for (const f of fails) console.log(`MISMATCH ${f}`);
 console.log(fails.length ? "FAILED" : "OK");
diff --git a/scripts/harness/index.mts b/scripts/harness/index.mts
index e42b42a..6efd1cc 100644
--- a/scripts/harness/index.mts
+++ b/scripts/harness/index.mts
@@ -29,7 +29,7 @@ import { setDevlogSink } from "../../src/lib/devlog";
 import { fileSinks } from "../../src/lib/journal";
 import { queueItemText, withId } from "../../src/plan/queue";
 import { setPlannerConfig } from "../../src/state/planner";
-import { addItem, insertItem, queues, setRepeat, startQueue } from "../../src/state/queue";
+import { addItem, insertItem, queues, startQueue } from "../../src/state/queue";
 import { bankDetails, bankItems, characters, lastError } from "../../src/state/store";
 import { boot } from "../../src/state/sync";
 import type { PlannerConfig } from "../../src/plan/planner/types";
@@ -195,9 +195,8 @@ function handle(limits: { actions: number; minutes: number }, carried: unknown)
       process.exit(code);
     },
     /** Append items to a character's queue and start it. */
-    queue(name: string, items: QueueItemInput[], opts: { repeat?: boolean } = {}): void {
+    queue(name: string, items: QueueItemInput[]): void {
       for (const it of items) addItem(name, withId(it));
-      if (opts.repeat) setRepeat(name, true);
       startQueue(name);
     },
     /** Put an item at `index` of a queue, even ahead of the running head — what the automatic writers do (insertItem). */
diff --git a/scripts/scenarios/buy-head-changes.mts b/scripts/scenarios/buy-head-changes.mts
index eedac4a..8c16753 100644
--- a/scripts/scenarios/buy-head-changes.mts
+++ b/scripts/scenarios/buy-head-changes.mts
@@ -1,6 +1,7 @@
 // Audit B.1 / B.4-2: a step's result is thrown away when the head changed
 // under it. While the buy step is in flight (npc/buy answered, its cooldown not
-// yet waited out) another writer inserts an item ahead. The buy item is then
+// yet waited out) another writer inserts an item ahead (task 018: a `claim` with
+// nothing to claim, the `move` item is gone). The buy item is then
 // looked at again later — and must not buy a second time: the purchase is
 // recorded on the item the moment it happens.
 // Before task 003: bought twice.
@@ -15,11 +16,11 @@ await scenario(
     await t.run({ until: () => t.calls("npc/buy").length > 0 }); // stops inside the step, before its cooldown ends
     t.eq(t.q("Dan").items.map((i) => i.kind), ["buy"], "the buy is still the head");
 
-    t.insert("Dan", { kind: "move", x: 7, y: 13 });
+    t.insert("Dan", { kind: "claim" });
     await t.run();
 
     t.eq(t.q("Dan"), { items: [], running: false }, "the queue ran to the end");
-    t.eq(t.calls().map((c) => c.action), ["move", "npc/buy", "move"], "the calls, in order");
+    t.eq(t.calls().map((c) => c.action), ["move", "npc/buy"], "the calls, in order");
     t.eq([t.inv("Dan", "healing_rune"), t.world.chars.get("Dan")!.gold], [1, 15_000], "one rune, one price paid");
   },
 );
diff --git a/scripts/scenarios/merchant-order.mts b/scripts/scenarios/merchant-order.mts
index 4fc4035..3080514 100644
--- a/scripts/scenarios/merchant-order.mts
+++ b/scripts/scenarios/merchant-order.mts
@@ -1,8 +1,6 @@
-// The Nomadic Merchant standing order, end to end (audit B.4-1 was why it never
-// bought anything): the 5-minute event poll finds a running queue, puts the
-// trip ahead of its head — sell the golden eggs, buy the Lost World Maps the
-// fleet lacks (two level-20 characters, none owned, 15,000 gold each) from bank
-// gold + the sale, down to GOLD_FLOOR (20,000) — and the old head resumes.
+// The Nomadic Merchant standing order and a character the planner does not own (task 018, settled point 2): a
+// merchant spawns while Max works a hand-written queue — no trip is put ahead of its head, nothing is sold or
+// bought, the bank stays as it was, and the queue goes on. (The planner's characters: planner-merchant.)
 import { merchantEvent, scenario } from "../harness/index.mts";
 
 await scenario(
@@ -12,30 +10,16 @@ await scenario(
       { name: "Ola", x: 0, y: 0, level: 20 }, // idle
     ],
     bank: { golden_egg: 5 }, // the merchant pays 1,000 each
-    gold: 45_000, // 45,000 − 20,000 + 5,000 = two maps
+    gold: 45_000, // 45,000 − 20,000 + 5,000 = two maps, were anyone sent
     events: [merchantEvent("nomadic_merchant", 3, 2)],
   },
   async (t) => {
-    t.queue("Max", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 0, done: 0 }]);
-    await t.run({ until: () => t.calls("npc/buy").length > 0 && t.q("Max").items[0]?.kind === "gather" });
+    t.queue("Max", [{ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 20, done: 0 }]);
+    await t.run();
 
-    const trip = t.calls().filter((c) => c.action !== "gathering").map((c) => [c.action, c.body]);
-    t.eq(
-      trip,
-      [
-        ["move", { x: 4, y: 1 }],
-        ["bank/withdraw/item", [{ code: "golden_egg", quantity: 5 }]],
-        ["move", { x: 3, y: 2 }],
-        ["npc/sell", { code: "golden_egg", quantity: 5 }],
-        ["move", { x: 4, y: 1 }],
-        ["bank/withdraw/gold", { quantity: 25_000 }],
-        ["move", { x: 3, y: 2 }],
-        ["npc/buy", { code: "lost_world_map", quantity: 2 }],
-      ],
-      "the trip, in order",
-    );
-    t.eq(t.world.gold, 20_000, "bank gold left: GOLD_FLOOR");
-    t.eq([t.inv("Max", "lost_world_map"), t.world.chars.get("Max")!.gold], [2, 0], "the maps are in the bag, the pocket is empty");
-    t.eq(t.q("Max").items.map((i) => i.kind), ["gather"], "the old head is back");
+    t.eq(t.calls().filter((c) => c.action !== "gathering").map((c) => c.action), [], "no trip: only the gathers");
+    t.eq([t.calls("npc/sell").length, t.calls("npc/buy").length], [0, 0], "nothing sold, nothing bought");
+    t.eq([t.world.gold, t.bank("golden_egg")], [45_000, 5], "the bank as it was");
+    t.eq(t.calls("gathering", "Max").length, 20, "the queue went on");
   },
 );
diff --git a/scripts/scenarios/no-route.mts b/scripts/scenarios/no-route.mts
index fda6af3..dfb61ac 100644
--- a/scripts/scenarios/no-route.mts
+++ b/scripts/scenarios/no-route.mts
@@ -4,7 +4,8 @@
 // held as an outage every 60 s, forever). Now: no route, the item is skipped
 // with a text that says so, no move toward the lich is ever sent, and the next
 // item runs. The same for a place pinned on an item (x, y, layer): moveTo's
-// NoRouteError skips the item.
+// NoRouteError skips the item (task 018: a gather pinned there; the `move` item
+// is gone).
 import { scenario } from "../harness/index.mts";
 import { log } from "../../src/state/store";
 
@@ -15,7 +16,7 @@ await scenario(
   async (t) => {
     t.queue("Liz", [
       { kind: "fight", monster: "lich", times: 1, done: 0, food: false },
-      { kind: "move", x: 9, y: 8, layer: "underground" },
+      { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 1, done: 0, x: 9, y: 8, layer: "underground" },
       { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 1, done: 0 },
     ]);
     await t.run();
@@ -25,6 +26,6 @@ await scenario(
     const skipped = log.value.filter((e) => e.text.startsWith("skipped:")).map((e) => e.text).reverse();
     t.eq(skipped.length, 2, "two items skipped");
     t.ok(/^skipped: Fight 1× Lich — no lich reachable — only on another layer/.test(skipped[0]), `the fight's skip says why: ${skipped[0]}`);
-    t.ok(/^skipped: Move to \(9, 8\) — \(9, 8\) underground is not reachable from \(4, 1\) overworld/.test(skipped[1]), `the move's skip says why: ${skipped[1]}`);
+    t.ok(/^skipped: Gather 1× Copper Ore — \(9, 8\) underground is not reachable from \(4, 1\) overworld/.test(skipped[1]), `the pinned gather's skip says why: ${skipped[1]}`);
   },
 );
diff --git a/scripts/scenarios/old-queue-item.mts b/scripts/scenarios/old-queue-item.mts
index 01d08b5..bda704b 100644
--- a/scripts/scenarios/old-queue-item.mts
+++ b/scripts/scenarios/old-queue-item.mts
@@ -1,7 +1,7 @@
 // Task 006: an item persisted before layers were stored carries x, y and no
 // layer. It still runs, on the overworld — even when the character starts
 // underground, where the same x, y is another tile: it walks out through the
-// transition first.
+// transition first. (Task 018: the `move` item of the same queue is gone.)
 import { scenario } from "../harness/index.mts";
 
 await scenario(
@@ -9,21 +9,20 @@ await scenario(
     characters: [{ name: "Old", x: 5, y: -4, layer: "underground", mining_level: 30 }], // on the gold rocks, underground
   },
   async (t) => {
-    // As a queue saved before 006 holds them: x, y only (a gather pinned to the copper rocks, a move).
+    // As a queue saved before 006 holds them: x, y only (a gather pinned to the copper rocks).
     t.queue("Old", [
       { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 1, done: 0, x: 2, y: 0 },
-      { kind: "move", x: 4, y: 1 },
     ]);
     await t.run();
 
     t.eq(t.q("Old"), { items: [], running: false }, "the queue ran to the end");
     t.eq(
       t.calls().map((c) => [c.action, c.body]),
-      [["move", { x: 5, y: -3 }], ["transition", undefined], ["move", { x: 2, y: 0 }], ["gathering", undefined], ["move", { x: 4, y: 1 }]],
-      "out through the transition, then the overworld tiles",
+      [["move", { x: 5, y: -3 }], ["transition", undefined], ["move", { x: 2, y: 0 }], ["gathering", undefined]],
+      "out through the transition, then the overworld tile",
     );
     t.eq(t.inv("Old", "copper_ore"), 1, "gathered on the overworld copper rocks");
     const old = t.world.chars.get("Old")!;
-    t.eq([old.x, old.y, old.layer], [4, 1, "overworld"], "the move ended on the overworld");
+    t.eq([old.x, old.y, old.layer], [2, 0, "overworld"], "the gather ended on the overworld");
   },
 );
diff --git a/scripts/scenarios/planner-off.mts b/scripts/scenarios/planner-off.mts
index 2b7dc1a..bb00e12 100644
--- a/scripts/scenarios/planner-off.mts
+++ b/scripts/scenarios/planner-off.mts
@@ -1,11 +1,8 @@
 // Task 008, section 7: switched off in the middle of a step. No `pl:` item is left, the queue is empty and
-// stopped, the hive's opt-out list is as it was before the planner (the planner put Pia there, so Pia leaves it),
-// blocks and costs are kept — and the queue is Alex's again: addItem and startQueue work.
+// stopped, blocks and costs are kept. Task 018, settled point 2: a character whose planner is off gets no item from
+// anyone — half an hour later the queue is still empty and stopped, and Pia has not acted.
 import { achievement, planLines, scenario } from "../harness/index.mts";
-import { withId } from "../../src/plan/queue";
 import { planner, setPlannerConfig } from "../../src/state/planner";
-import { hive } from "../../src/state/hive";
-import { addItem, startQueue } from "../../src/state/queue";
 
 await scenario(
   {
@@ -17,21 +14,19 @@ await scenario(
   },
   async (t) => {
     await t.run({ until: () => t.calls("fight", "Pia").length >= 3 });
-    t.ok(hive.value.manual.includes("Pia"), "while on, Pia is on the hive's opt-out list");
     const done = t.q("Pia").items.find((it) => it.kind === "fight");
 
     setPlannerConfig({ on: { Pia: false } });
     await t.run({ until: () => !t.q("Pia").running });
     t.eq(t.q("Pia"), { items: [], running: false }, "no pl: item left; the queue is empty and stopped");
-    t.ok(!hive.value.manual.includes("Pia") && !planner.value.optedOut.includes("Pia"), "off the opt-out list again, as before the planner");
     t.eq(planner.value.current.Pia, undefined, "no current step");
     t.ok(done?.kind === "fight" && done.done >= 2, "it was mid-step");
 
-    addItem("Pia", withId({ kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 2, done: 0 }));
-    startQueue("Pia");
-    await t.run();
-    t.eq(t.inv("Pia", "copper_ore"), 2, "addItem and startQueue work again: Alex's item ran");
-    await t.run({ minutes: 1 });
+    await t.run({ minutes: 1 }); // the in-flight action drains
+    const acted = t.calls(undefined, "Pia").length;
+    await t.run({ minutes: 30 });
+    t.eq(t.q("Pia"), { items: [], running: false }, "half an hour later: nobody wrote to the queue");
+    t.eq(t.calls(undefined, "Pia").length, acted, "and Pia stood still: no action");
     t.ok(planLines(t, "Pia").some((l) => l.startsWith("handed back")), "the hand-back is in the dev log");
     t.eq(planner.value.config.on, { Pia: false }, "the patch over the defaults holds Pia: false");
   },
diff --git a/scripts/scenarios/planner-takes-over.mts b/scripts/scenarios/planner-takes-over.mts
index 9700a88..5fa67b7 100644
--- a/scripts/scenarios/planner-takes-over.mts
+++ b/scripts/scenarios/planner-takes-over.mts
@@ -1,13 +1,12 @@
-// Task 008, section 7: switching a character on through setPlannerConfig. Its queue — a 🔁 pin rotation, an
-// infinite item and a hive item — is logged item by item and dropped, 🔁 goes off, it joins the hive's opt-out
-// list and the first step runs. Then every old writer leaves the owned queue as it is: queuePinTraining,
-// queueAssist (as crafter and as helper), addItem, clearQueue, setRepeat, stopQueue, toggleHiveManual.
+// Task 008, section 7: switching a character on through setPlannerConfig. Its queue — a reset, a crafting level, an
+// infinite item and an item of another writer — is logged item by item and dropped, and the first step runs. Then
+// every writer that is not the planner's leaves the owned queue as it is (task 018: the harness's addItem and the
+// Group fight fold's queuePrepare are what is left of them).
 import { achievement, planLines, scenario } from "../harness/index.mts";
 import { withId } from "../../src/plan/queue";
 import { planner, setPlannerConfig } from "../../src/state/planner";
-import { hive, toggleHiveManual } from "../../src/state/hive";
-import { addItem, clearQueue, insertItem, queueAssist, queuePinTraining, setRepeat, stopQueue } from "../../src/state/queue";
-import { log, skillPins } from "../../src/state/store";
+import { addItem, insertItem, queuePrepare } from "../../src/state/queue";
+import { log } from "../../src/state/store";
 
 await scenario(
   {
@@ -20,14 +19,14 @@ await scenario(
     limits: { actions: 400, minutes: 120 },
   },
   async (t) => {
-    // Ivy's own queue: a pin rotation (reset + train mining +1), an infinite gather and a hive item, 🔁 on.
+    // Ivy's own queue: a reset, a crafting level, an infinite gather and another writer's item.
     t.queue("Ivy", [
       { kind: "gear", job: { kind: "gather", skill: "mining" }, reset: true },
-      { kind: "train", skill: "mining", toLevel: 0, levels: 1, gear: true },
+      { kind: "train", skill: "weaponcrafting", toLevel: 0, levels: 1, gear: true },
       { kind: "gather", code: "copper_ore", resource: "copper_rocks", times: 0, done: 0 },
-    ], { repeat: true });
-    insertItem("Ivy", { ...withId({ kind: "fight", monster: "chicken", times: 3, done: 0 }), id: "hive:1:0:Ivy:0" }, 3);
-    await t.run({ minutes: 2 });
+    ]);
+    insertItem("Ivy", { ...withId({ kind: "fight", monster: "chicken", times: 3, done: 0 }), id: "old:1:0:Ivy:0" }, 3);
+    await t.run({ until: () => t.calls(undefined, "Ivy").length > 0 }); // the reset under way (no 🔁 to keep a finished item)
     const before = t.q("Ivy").items.map((it) => it.id);
     t.eq(before.length, 4, "four items before");
 
@@ -36,28 +35,19 @@ await scenario(
     const plan = planLines(t, "Ivy");
     for (const id of before) t.ok(plan.some((l) => l.startsWith(`took over — dropped [${id}] `)), `dropped and logged: ${id}`);
     const q = t.q("Ivy");
-    t.ok(q.running && !q.repeat, "the queue runs, 🔁 is off");
+    t.ok(q.running, "the queue runs");
     t.ok(q.items.every((it) => it.id.startsWith("pl:")), `only the planner's items: ${q.items.map((i) => i.id)}`);
-    t.ok(hive.value.manual.includes("Ivy") && planner.value.optedOut.includes("Ivy"), "on the hive's opt-out list, by the planner");
     t.ok(!!planner.value.current.Ivy?.step.key.startsWith("ach:chicken_hunt:0@Ivy#1"), "the first step is the open objective");
 
-    // Every old writer, against the owned queue.
+    // Every writer that is not the planner's, against the owned queue.
     const snap = JSON.stringify(t.q("Ivy").items.map((it) => it.id));
-    skillPins.value = { Ivy: ["mining"] };
     const mark = log.value[0]?.id ?? 0;
-    queuePinTraining("Ivy");
-    queueAssist("Ivy", "weaponcrafting"); // Ivy as the crafter: refused
-    queueAssist("Bob", "weaponcrafting"); // Ivy as a helper: skipped
-    addItem("Ivy", withId({ kind: "rest" }));
-    clearQueue("Ivy");
-    setRepeat("Ivy", true);
-    stopQueue("Ivy");
-    toggleHiveManual("Ivy");
+    addItem("Ivy", withId({ kind: "deposit-all" }));
+    queuePrepare("Ivy", "chicken");
     const lines = log.value.filter((e) => e.id > mark && /planner owns/.test(e.text));
-    t.eq(lines.length, 7, "one refusal line each: pins, assist as crafter, add, clear, repeat, stop, the hive's opt-out (assist as a helper skips Ivy silently)");
+    t.eq(lines.length, 2, "one refusal line each: add, prepare");
     t.eq(JSON.stringify(t.q("Ivy").items.map((it) => it.id)), snap, "the owned queue is as it was");
-    t.ok(t.q("Ivy").running && !t.q("Ivy").repeat, "still running, 🔁 still off");
-    t.ok(hive.value.manual.includes("Ivy"), "still opted out of the hive");
+    t.ok(t.q("Ivy").running, "still running");
     await t.run({ minutes: 5 });
     t.ok(t.q("Ivy").items.every((it) => it.id.startsWith("pl:")) && t.q("Ivy").running, "minutes later: still only the planner's items, running");
   },
```

**New: `cleanup-boot`** (`scripts/scenarios/cleanup-boot.mts`). The first boot runs Pia's planner step to its second chicken, then writes into storage what the old service left (a hive state with a `farm-tasks` goal running, the 00:05 marker, pins in the state, and on Bo's queue — Bo is off — 🔁 on, a `move`, a `train` of mining and a `gather` ×2) and restarts; the second boot:

```
2026-01-15T12:01:46.750Z [nim8] boot: dropped ammo:v1:hive — nothing writes or reads it since task 018
2026-01-15T12:01:46.750Z [nim8] boot: dropped ammo:v1:offeringsDaily — nothing writes or reads it since task 018
2026-01-15T12:01:46.750Z [nim8] boot: dropped ammo:v1:state's pins — nothing writes or reads it since task 018
2026-01-15T12:01:46.750Z [nim8] boot: dropped Bo's queue: the 🔁 repeat flag — nothing writes or reads it since task 018
2026-01-15T12:01:46.750Z [nim8] boot: dropped Bo's queue: [old1] move — nothing writes or reads it since task 018
2026-01-15T12:01:46.750Z [nim8] boot: dropped Bo's queue: [old2] train mining — nothing writes or reads it since task 018
2026-01-15T12:01:46.750Z [nim8] log[info] Bo queue: queue resumed after reload
2026-01-15T12:01:46.750Z [nim8] plan Pia: re-attached ach:chicken_hunt:0@Pia#1
2026-01-15T12:01:46.800Z [nim8] head Bo: [old3] Gather 2× Copper Ore
2026-01-15T12:01:46.800Z [nim8] log[ok] Bo gathering: +1 copper_ore
2026-01-15T12:02:16.900Z [nim8] log[ok] Bo gathering: +1 copper_ore
2026-01-15T12:02:47.050Z [nim8] log[ok] Bo queue: queue complete
{"t":"2026-01-15T12:01:46.750Z","run":"nim8","k":"boot","chars":{"Pia":{"step":"ach:chicken_hunt:0@Pia#1"}}}
```
Then Bo's gather ×2 runs to its end, Pia's step goes on (two more fights), no `pause` record, nothing thrown.

**The docs.** `CLAUDE.md`: the engine line, the server/tab rules (no hive effect, no `hiveProposals`), the events paragraph (the standing orders are the planner's; nothing for an off character), the queue paragraph (who writes it, the vocabulary after point 4, `task-loop` with what `work-task` was), offerings (the trigger is the planner's), the skill-loops paragraph cut to the `train` item of a crafting level, a new section "Who writes a queue (task 018)" in place of "The hive", the gear coverage bullet, the UI layout (tabs, Fleet, Character, Items/Monsters, the pop-up map), "The roadmap" cut to "The atlas" (`npm run atlas` is now "read by the planner's core and check-planner"), the planner's "Who is on" / "One writer" / offerings lines, `cleanup-boot` in the checks list. `.claude/skills/verify/`: `drive.mjs` and `hive-probe.mjs` deleted (browser-era; the queue form and the hive), `SKILL.md` cut (the `addItem` rpc example, `togglePin`, the editor's and pins' selectors, the hand-added flows, the two scripts' paragraphs). `docs/journal.md`: unchanged — no record kind went (the kinds written at `b322195` and now are the same 20).

## What is left
**`src/` by directory** (files, lines; `src (top)` holds `styles.css`, `app.tsx`, `main.tsx`, `vite-env.d.ts`):

| directory | files b322195 | lines b322195 | files after | lines after |
|---|---|---|---|---|
| src (top) | 4 | 2934 | 4 | 2488 |
| src/api | 2 | 289 | 2 | 289 |
| src/catalog | 3 | 372 | 3 | 372 |
| src/lib | 4 | 411 | 4 | 411 |
| src/plan | 12 | 2736 | 10 | 1941 |
| src/plan/hive | 12 | 2172 | 0 | 0 |
| src/plan/planner | 19 | 4660 | 19 | 4660 |
| src/server | 1 | 258 | 1 | 258 |
| src/sim | 8 | 1069 | 8 | 1069 |
| src/state | 16 | 5778 | 14 | 4522 |
| src/types | 2 | 470 | 2 | 470 |
| src/ui | 26 | 5965 | 22 | 4220 |
| **src/** | 109 | 27114 | 89 | 20700 |

**Branches only an old item shape reaches** (settled point 5: nothing cut; for the planning chat). Lines of the tree after the task:

| path:line | the shape that reached it | about |
|---|---|---|
| `src/state/queue.ts:461`, `:459` (round refill), `:250` (`fed`), `exec.ts provisionPotions` / `provisionFood` | a `fight` item without `take` (hand-written; the old event order's) — brews potions, provisions food, refills a utility slot every round | 3 lines here, `provisionPotions`/`provisionFood` in exec.ts |
| `src/state/queue.ts:456`, `:488` (`desiredForJob` after `plannedSet`) | a `fight` or `gear` item without `wear` — a fresh solve on the bank (also the planner's fallback when a planned piece is gone: reachable) | 2 |
| `src/state/queue.ts:488` (`it.desired`) | a `gear` item with a frozen `desired` map (the hive's) | 1 |
| `src/state/queue.ts:524` | a `gear` item without `reset` (the editor's) | 2 |
| `src/state/queue.ts:402-409` | a `craft` with `wait` (the hive's pipelining) | 8 |
| `src/state/queue.ts:373-395` (`infinite`) | a `craft` with quantity 0 (the editor's) | about 10 |
| `src/state/queue.ts:327` | a `sell` without `partial` (the editor's, CatalogPanel's) — the throw "nothing left to sell" | 2 |
| `src/state/queue.ts:286`, `:297`, `:309`, `:336`, `:358`, `:431` (`pinnedAt(it)`) | an item pinned to x, y (layer) — the editor's and the hive's; nobody pins now | 6 |
| `src/state/queue.ts:439-440`, `:795-802` (`helpersOf`, `trainPick`), `:820-831` (`trainKeep`), `:858` and `:896-900` (`runTrainCraft`'s wait for helpers), `:918-921` (`sourceOne`'s `fromBank`, its label) | a `train` with `for` (a helper), or a crafter with a helper's queue running | about 25 |
| `src/state/queue.ts:239`, `:250`, `:259` | a `train` of combat (`keepOf`, `ctxOf`) | 3 |
| `src/state/queue.ts:445` (the train case's last line, `runTrainCraft`) | a `train` of a gathering skill or combat would now reach `runTrainCraft` and pause ("no Mining recipe …"); boot drops a stored one | 1 |
| `src/state/queue.ts` `task-loop` with `master: "items"` | the editor's (the planner writes `monsters`); an items task held from before is reached by state, not shape | — |
| `src/ui/QueuePanel.tsx:129-134` (`itemProgress`'s `train`), `src/plan/queue.ts:116` (`queueItemText`'s "Help X train") | a `train` with `for` | 2 |

**The pairs of settled point 7**:

| the planner's | the old one | after this task |
|---|---|---|
| `pickMonster` (`src/plan/planner/pick.ts:34`) | `trainingMonsterFor` | deleted with combat training (its callers were `runTrainCombat` and `queuePinTraining`) |
| `pickNode` (`pick.ts:57`) | `trainingResourceFor` | deleted with `src/plan/hive/skills.ts` (its callers: the hive, the gathering `train`) |
| `nearestSpot` and `travel` (`src/plan/planner/reach.ts:126`, `:112`) | `nearest` and `nearestBank` (`src/state/loopkit.ts:142`) | kept: the runner's every target (39 calls in `state/queue.ts`, 8 in `exec.ts`, 3 in `loopkit.ts`, 2 in `state/events.ts`, `GroupFight.tsx`, `CatalogPanel.tsx`; `planner/reach.ts` names it once) |
| `fightRec` (`reach.ts:437`) | `forecastVs` (`src/state/queue.ts:702`) | kept: `canBeat` (`:710`) for `unitSec` (`:736`, the `train` item's recipe pick) and `canObtainOffering` (`:1274`, the offering's bracket) |
| `craftsPerLevel` (`src/plan/planner/cost.ts:170`) | `trainRecipe` (`src/state/queue.ts:767`) | kept: `runTrainCraft` (`:859`), `trainKeep` (`:821`), `trainPick` (`:802`) — the planner's `train` item |

**What the tab can still ask the service to do** (every `expose` after the task):

| function | UI element |
|---|---|
| `act` (`src/api/actions.ts:120`) — every `actions.*` | the action bar (`ActionBar.tsx`: Enter/transition), gear slots (unequip), the inventory (equip, use, deposit, recycle, delete), the Map tab's building drawer (bank deposit/withdraw gold and items, expansion; workshop craft and recycle; NPC buy and sell; tasks master new/complete/trade/exchange/cancel; "🚶 Send"), the altar drawer (accept, complete), pending rewards (claim), ⚔ Fight (Group fight) |
| `move` (`actions.ts:120`) | a map click with 🚶 Walk armed (`MapView.tsx:354`), "🚶 Send" (`CatalogPanel.tsx:159`) |
| `setToken`, `login` | the token gate (`Token.tsx:13-14`) |
| `logout`, `reconcile` | Sign out, ↻ Refresh (`app.tsx:91`, `:94`); the bank drawer after an expansion (`CatalogPanel.tsx:201`) |
| `loadAchievements` | the Achievements tab (first show, ↻), the drawer's 🔒 line (`CatalogPanel.tsx:96`) |
| `loadPendingRewards` | the rewards view (`PendingRewardsPanel.tsx:38`) |
| `loadOfferings` | the 🛐 fold and the altar drawer (`OfferingsPanel.tsx:101`) |
| `setPlannerConfig` | 🧭 planner on/off (`QueuePanel.tsx:87`) |
| `queueOfferings` | 🛐 "＋ Queue", "＋ Queue for all", the altar drawer's "＋ Queue offerings" (`OfferingsPanel.tsx:143`, `:154`, `:229`) — an owned character's offering interrupt; nothing for one that is off |
| `queuePrepare` | ⚔ Group fight's 🛡 Prepare (`GroupFight.tsx:47`) |
| `importLocal` | the one-time import of the browser era (`synced.ts:110`), not a button |

**Every tab after the task**:
- **Fleet**: Needs you (rewards to claim → Achievements; live events with the fleet's plan → Show on map); Characters (character, status, doing now with progress, up next, bag, task, where); Skills across the fleet (read-only grid); 🛐 Seasonal offerings (per character and category, ↻, ＋ Queue / ＋ Queue for all); ⚔ Group fight (boss, up to three characters, 🛡 Prepare, ⚔ Fight).
- **Character**: switcher; summary (level, HP, where, task, gold) with the action bar; the queue read-only (running or not, items left, 🧭 switch, the planner's line with the step's why and blocks, the table with progress and the head's live note); Forecast on a monster tile; Equipment (unequip); Skills (level and XP); Inventory (equip, use, deposit, recycle, delete).
- **Bank**: the tile grid (unchanged).
- **Items**: the catalog table (best crafter by level; no Craft… column).
- **Monsters**: the forecast table with 🏦 Best (no Fight…).
- **Achievements**: pending rewards with claim, then progress (unchanged).
- **Map**: the map, the events column, the building drawer (bank: withdraw, gold, expansion; workshop; NPC; tasks master; altar).
- **Sim**: unchanged.

**The grep of acceptance step 6** after the task: `scripts/design/achievement-map.mts:184`, `:194`, `:199`, `:212`, `:442` (strings of task 004's script — it writes `docs/design/achievement-map.md`, which may not change; it describes the client of 2026-11-18); `scripts/fixtures/roadmap-fleet.json:1` (its `skillPins` field — the fixture `check-planner` reads); `src/plan/consumables.ts:51` (history: "fighters cooked a hive order's mushrooms"); `src/plan/objectives.ts:3` (history: moved from `plan/hive/`); `src/plan/planner/gear.ts:18`, `:20`, `pick.ts:4`, `types.ts:156` (comments in the core, which may not change); `src/plan/queue.ts:33` (history: the deleted hive's `wait`); `src/state/queue.ts:403` (the same, in the branch); `src/state/sync.ts:41`, `:47` (the boot drop names the key it removes); `src/state/synced.ts:95` (history: what the browser era stored).

**The first hours of report 017's code** — `npm run journal -- --from 2026-11-21T17:01:00Z` at 18:19 UTC:

*The journal 2026-11-21T17:01Z → 2026-11-21T18:19Z*
18 records in 1 file(s) of logs/journal, 11-21 17:01:00 → 11-21 17:57:52

**Restarts**
| time | run | commit | mode | per character |
|---|---|---|---|---|
| 11-21 17:01:00 | qf93 | b322195 (rework) | prod | First: re-attached ach:intermediate_lumberjack:0@First#1; Second: re-attached ach:intermediate_lumberjack:0@Second#4; Third: re-attached src:nettle_leaf@Third#3; Fourth: re-attached ach:intermediate_lumberjack:0@Fourth#1; Fifth: re-attached lvl:mining:35@Fifth#4 |

**Steps per character**
Units planned / done; hours planned / taken (wall) / running; a supply step's parent. `partial`: re-attached after a restart.

*Fifth*
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 11-21 17:11:04 | lvl:mining:35@Fifth#5 | level | 162 / … | 1.50 / … / … | running |  |
| (11-21 17:11:01) | lvl:mining:35@Fifth#4 |  | 144 / 144 | 1.50 / 1.33 / 1.32 | done (partial) | decided before the window |

*First*
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 11-21 17:37:48 | ach:intermediate_lumberjack:0@First#2 | objective | 181 / … | 1.50 / … / … | running |  |
| (11-21 17:37:47) | ach:intermediate_lumberjack:0@First#1 |  | 173 / 173 | 1.50 / 1.39 / 1.38 | done (partial) | decided before the window |

*Fourth*
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 11-21 17:46:39 | ach:intermediate_lumberjack:0@Fourth#2 | objective | 183 / … | 1.50 / … / … | running |  |
| (11-21 17:46:39) | ach:intermediate_lumberjack:0@Fourth#1 |  | 173 / 173 | 1.50 / 1.39 / 1.38 | done (partial) | decided before the window |

*Second*
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 11-21 17:57:52 | ach:intermediate_lumberjack:0@Second#5 | objective | 184 / … | 1.50 / … / … | running |  |
| (11-21 17:57:51) | ach:intermediate_lumberjack:0@Second#4 |  | 178 / 178 | 1.50 / 1.42 / 1.42 | done (partial) | decided before the window |

*Third*
| time | key | answer | units | hours | ended | parent |
|---|---|---|---|---|---|---|
| 11-21 17:48:16 | src:nettle_leaf@Third#4 | supply | 148 / … | 1.50 / … / … | running | cons:minor_health_potion:ach:the_reaper:1 |
| (11-21 17:48:16) | src:nettle_leaf@Third#3 |  | 147 / 147 | 1.50 / 1.48 / 1.48 | done (partial) | decided before the window |

**Blocks, flaps, no step, defects, stopped queues, pauses, removed interrupts**
none

**Interrupts**
none

**Fights lost, by step and interrupt**
none

**Samples against their estimates**
| time | who | key | this step | estimate | ÷ | mean (n) |
|---|---|---|---|---|---|---|
| 11-21 17:11:01 | Fifth | gather:gold_rocks | 33 s × 144 | 37 s | 0.89 | 33 s (4) |
| 11-21 17:37:47 | First | gather:birch_tree | 29 s × 173 | 33 s | 0.88 | 30 s (23) |
| 11-21 17:46:39 | Fourth | gather:birch_tree | 29 s × 173 | 33 s | 0.88 | 30 s (24) |
| 11-21 17:48:16 | Third | gather:nettle | 36 s × 147 | 41 s | 0.88 | 37 s (14) |
| 11-21 17:57:51 | Second | gather:birch_tree | 29 s × 178 | 33 s | 0.88 | 29 s (25) |

**Where the time goes (the meter: steps' and interrupts' ends in the window)**
| who | hours | fight | rest | eat | bank | walk | gear | gather | craft | trade | task | other | wait | in interrupts |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fifth | 0.17 | 0 | 0 | 0 | 2.0% | 11.7% | 0 | 82.6% | 0 | 0 | 0 | 0 | 3.8% | 0 |
| First | 0.61 | 0 | 0 | 0 | 0.3% | 2.3% | 0 | 94.2% | 0 | 0 | 0 | 0 | 3.3% | 0 |
| Fourth | 0.76 | 0 | 0 | 0 | 0.2% | 1.8% | 0 | 94.7% | 0 | 0 | 0 | 0 | 3.3% | 0 |
| Second | 0.95 | 0 | 0 | 0 | 0.2% | 1.5% | 0 | 95.0% | 0 | 0 | 0 | 0 | 3.4% | 0 |
| Third | 0.79 | 0 | 0 | 0 | 0.2% | 0.5% | 0 | 96.3% | 0 | 0 | 0 | 0 | 3.0% | 0 |

**Kill steps: what they planned to drink and eat, against what they did**
none

**Events**
| time | spawn | tile | until | verdict |
|---|---|---|---|---|
| 11-21 17:42:07 | fish_merchant | 2, 5, overworld | 11-21 19:11:16 | nothing to do |

The spawn ratio: 1 distinct spawn(s) seen in 0.9 h of journal; the docs expect 0.7 ± 0.9 (a 1/rate chance a minute while not up): expected ÷ seen = 0.74, beside SPAWN_LOG 1.64. (A spawn is seen only while the service is up.)

**Levels**
none

**Achievements**
none

**The bank**
| time | what | used / slots (free) | next | gold | the rest |
|---|---|---|---|---|---|
| 11-21 17:01:01 | boot | 93 / 110 (17) | 28000 | 240836 |  |

**Spent**
none

Under the tables, report 017's acceptance step 8:
- **The market file**: `logs/market/2026-11-21.jsonl`, 8 lines to 18:11:27 UTC: a whole one at 17:01:03 (run `qf93`, 959 orders on 10 pages, 133 codes, 5.3 kB), then one every ten minutes (17:11, 17:21, … 18:11) with the 4–13 codes that changed (229–556 bytes); every poll read 10 pages, 951–966 orders.
- **The Spent table**: none — nothing spent since the restart.
- **Kill steps of fewer than five units**: none — no kill step started or ended in the window. Every step since the restart was a gather: birch for `intermediate_lumberjack` (First, Second, Fourth), nettle for the minor health potions of `the_reaper` (Third), gold ore for mining 35 (Fifth).
- **A `pl:` fight step's `end` and its `wear`**: no `pl:` fight step ended in the window, so it cannot be read yet (the first kill step after the restart will show it in "Kill steps" and its `end`).
- **`pause`, `block`, `flap`, `nostep`, `defect`, `stopped`, `server`**: none in the window — the journal holds `boot` 1, `bank` 1, `step` 5, `end` 5, `sample` 5, `event` 1 since 17:01 (the reader's "Blocks, flaps, no step, defects, stopped queues, pauses, removed interrupts": none). The one spawn, a fish merchant at 17:42, had "nothing to do" (its order found nothing to trade).

## What was done / files
Commands, in order (PowerShell unless said):
1. `git status --short; git log --oneline -3; git diff --stat`; `git add docs/rework.md; git commit -m "Rework notes"` → `d9739a2`.
2. (Bash) `find src scripts … | xargs wc -l` — line counts (it left `bash.exe.stackdump` in the project root, deleted at once).
3. Reads of the files the task names; `Get-Content logs/status.json` (17:22 UTC: `qf93`, `b322195`).
4. `git mv src/plan/hive/objectives.ts src/plan/objectives.ts`; `git rm` of the 20 modules, the four checks, the five scenarios, `scripts/fixtures/roadmap-fleet.json`, `.claude/skills/verify/drive.mjs`, `hive-probe.mjs`; later `git restore` of the fixture (`check-planner` reads it).
5. The edits (Edit tool; three small Node scripts in the scratch directory for exact block cuts in `styles.css`, `CLAUDE.md` and `SKILL.md`).
6. `npm run typecheck` (five times, the first already green), `npx vite build --outDir <scratch>/ammo-018-dist --emptyOutDir`.
7. `npm run check` (three times: 79 ok + 3 failed — `check-planner` without its fixture, `cleanup-boot` reading the dev log before its flush, `planner-takes-over` counting on 🔁; then 82 ok; then 82 ok again on the final tree), `npm run check -- cleanup-boot` (three times), `npm run check -- planner-takes-over`.
8. `npx --yes ts-unused-exports@11.0.1 …` — refused by the session's permission check; instead `node <scratch>/unused-exports.mjs` on the tree and on `git archive b322195 src scripts` (unzipped in scratch), `node <scratch>/reach.mjs`, `node <scratch>/css-classes.mjs`, `node <scratch>/count.mjs`.
9. `npm run check -- planner` (in the background, alone).
10. `npm run journal -- --from 2026-11-21T17:01:00Z` (twice), `npm run market -- --from 2026-11-21T17:01:00Z`, reads of `logs/market/2026-11-21.jsonl` and `logs/status.json`.
11. `git grep` of acceptance step 6; `git diff --stat b322195 -- <the protected paths>` (empty).
12. `git add -A`; `git commit -m "018: clean-up"`; `git push` (it went through: `rework` on `origin` is the commit).

Files: deleted — the modules of section 1, `scripts/check-assist.mts`, `check-idle.mts`, `check-roadmap.mts`, `check-steal.mts`, `scripts/scenarios/helper-bank-covers-trip.mts`, `helper-full-bag.mts`, `helper-ping-pong.mts`, `repeat-spin.mts`, `train-mining-30.mts`, `.claude/skills/verify/drive.mjs`, `hive-probe.mjs`; moved — `src/plan/objectives.ts`; changed — `src/app.tsx`, `src/plan/events.ts`, `src/plan/queue.ts`, `src/server/main.ts` (a comment), `src/state/eventorders.ts`, `persist.ts`, `planner.ts`, `queue.ts`, `store.ts`, `sync.ts`, `synced.ts`, `src/styles.css`, `src/ui/AchievementsPanel.tsx` (an import path), `CatalogPanel.tsx`, `CharacterPanel.tsx`, `FleetView.tsx`, `GroupFight.tsx`, `MapView.tsx`, `QueuePanel.tsx`, `TableTabs.tsx`, `scripts/check-events.mts`, `scripts/harness/index.mts`, the scenarios `buy-head-changes`, `merchant-order`, `no-route`, `old-queue-item`, `planner-off`, `planner-takes-over`, `.claude/skills/verify/SKILL.md`, `CLAUDE.md`; new — `scripts/scenarios/cleanup-boot.mts`, `tasks/018-clean-up.report.md`; and `tasks/018-clean-up.md` (the task file). Scratch files (the build, the old tree, the helper scripts, the outputs) are in the session's scratch directory, deleted at the end.

## Notes
Most doubtful first.
- **Where the task file was wrong**: `scripts/fixtures/roadmap-fleet.json` is not only `check-roadmap`'s — `check-planner` reads its bank (`scripts/check-planner.mts:61`); it stays. The import graph of "Read in the chat" is right in every line I checked against the files (the importers of `src/plan/hive/*` and of `src/state/hive.ts`, the Roadmap's and the coverage view's, the exposed list of `state/queue.ts`, the readers of the pins, the item kinds and their writers, the storage keys).
- **A `train` of a gathering skill or combat now reaches `runTrainCraft`** (`src/state/queue.ts:445`) and pauses with "no Mining recipe this character can feed": the `train` case had to end in a return once its other branches went. Nobody writes one and boot drops a stored one, so it is only reachable by a hand-written harness queue.
- **The owned characters' offering interrupt can come up to five minutes after 00:05 UTC** (the planner's tick), not at 00:05 (`scheduleOfferings` was the old trigger). The day's rule and the catch-up are unchanged.
- **`saveState` and `startQueue`/`stopQueue` left the tab beyond the five editor calls the task names**: the first because its only tab callers were the pin clicks, the other two because settled point 3 counts `startQueue` among the calls the tab may no longer make and ▶/⏹/Retry/Run only served old writers. If Alex wants ⏹ back for a running `prepare` of a character that is off, it is a new element (not in this task).
- **`PlannerState.optedOut`** stays in the type and in `ammo:v1:planner` with whatever it holds (all five names, probably): `src/plan/planner/types.ts:156` may not change. Nobody reads or writes it.
- `availableResources` (`src/state/events.ts`) lost its last caller (the add form's gather select); `state/events.ts` is not a file of settled point 5's list, so it stays. Exports unused already at `b322195` and still unused, left as they were: `QueueItemKind`, `newId` (`plan/queue.ts`), `MapHover`, `routeHash` (`store.ts`), `RARE_ACTIONS` (`xp.ts`), `FoodChoice`, `bestFood`, `FoodPlan` (`plan/consumables.ts`), `MANAGED_SLOTS`, `jobSetFromRecommendation`, `canWinWithOwned`, `GearActionOpts`, `GearAction` (`jobgear.ts`), `healOnce`, `StepResult`, `provisionFood`, `FightOutcome` (`exec.ts`), `waitCooldown`, `waitCooldownFull`, `mayFor` (`loopkit.ts`) — most are used inside their file. The CSS classes `.card` and `.skills` and the comment "Pinned crafting specialization badge" (`src/styles.css:596`) were dead at `b322195` already.
- A character that is off still runs a stored queue of surviving kinds after a restart (`cleanup-boot`'s Bo): settled point 9 drops only deleted kinds. Today none is expected (all five are owned).
- `scripts/design/achievement-map.mts` is reached by no root before or after; it is task 004's generator, run by hand.
- The Monsters table's last column keeps its 150 px for the one button left; the skills card keeps its fifth grid track empty (no restyle).

## To delete (Alex)
Nothing.
