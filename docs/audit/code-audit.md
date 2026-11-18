# Code audit — ArtifactsMMO client

Task 001, 2026-11-18. Read-only: no code was changed. The working tree was audited as it stood, which
includes four uncommitted modified files (`CLAUDE.md`, `scripts/check-offering.mts`, `src/state/queue.ts`,
`src/ui/OfferingsPanel.tsx` — the offerings lower-bracket fallback).

Every claim carries `path:line`. **V** = verified (the code path was read end to end); **I** = inferred.
`CLAUDE.md` is treated as a claim about the code, not as evidence.

Short file names: a bare name stands for the one file with that name under `src/` (`exec.ts` =
`src/state/exec.ts`, `jobgear.ts` = `src/plan/jobgear.ts`, `HivePanel.tsx` = `src/ui/HivePanel.tsx`, …).
Five names exist twice and always mean: `queue.ts` = `src/state/queue.ts`, `hive.ts` = `src/state/hive.ts`,
`acquire.ts` = `src/plan/hive/acquire.ts`, `roadmap.ts` = `src/plan/roadmap.ts`, `events.ts` =
`src/plan/events.ts`; the other file of each pair is written with its directory. A reference that starts
with a colon (`:123`) continues the file named just before it in the same sentence, bullet or table row.
Line numbers of `logs/dev.log` are those of 2026-11-18; the file only grows, so they stay valid.

## Summary

- **Condition: uneven, not rotten.** One `fetch`, one action chokepoint, a pure and cycle-free planning layer, a
  verified simulator and a working server/tab split are sound; `npm run typecheck` and all 11 check scripts pass.
- The damage sits in **`src/state/queue.ts` (1,606 lines)** and the hive. Alex is right that layers undo each
  other — through three concepts the code never got, not through a wrong foundation.
- **Worst 1 — nobody arbitrates the head of a queue.** Eight automatic writers; five insert ahead of the running
  head knowing nothing about who owns it. 11 of 28 writer pairs can conflict (B.3).
- **Worst 2 — shared stock has rules but no ledger.** Every protective rule is a filter at one call site and is
  bypassed at others (D): the hive can sell dropped gear and recycle banked gear; a failed read empties the bank.
- **Worst 3 — one question, several answers.** "Can X beat Y" has three thresholds and two gear pools, "who is
  the specialist" three definitions, "how to get an item" six resolvers (C).
- **Confirmed in code and log:** helpers ping-ponged bank stock for 7 hours on 2026-11-17 (3,883 bank moves, 4
  crafts; B.4-7); a `buy` that needs bank gold withdraws it and never buys (72,000 g; B.4-1); the hive is not
  frozen (B.5); `prepare` is lost at every restart; a satisfied 🔁 queue spins 20 times a second (B.4).
- **Nothing tests the runner.** The check scripts cover pure planning only; `queue.ts`'s runner, `exec.ts`,
  `apply.ts`, `client.ts` and the hive runtime have no check at all (H.3).
- **Recommended: option A — clean up in place, harness first** (J). The defects are local or sit at a few choke
  points, about 4,000 lines can be kept as they are, and a rewrite would have no oracle to be checked against.

Contents: [A Map](#a-map) · [B Queue writers](#b-who-puts-work-on-a-characters-queue) ·
[C Deciders](#c-who-decides-what-is-best) · [D Shared stock](#d-shared-stock-and-the-rules-that-protect-it) ·
[E Invariants](#e-the-stated-invariants) · [F CLAUDE.md and dead code](#f-claudemd-against-the-code-and-dead-code) ·
[G Errors in practice](#g-errors-seen-in-practice) · [H Complexity](#h-complexity) ·
[I Verdicts](#i-verdict-per-module) · [J Options](#j-options-not-a-decision)

---

## A. Map

### A.1 Modules

Layers, dated from `git log` (98 commits, 2026-06-29 → 2026-11-17):

| Layer | When | What arrived |
|---|---|---|
| L0 scaffold | 06-29 | API client, store, apply, persist, sync, catalog |
| L1 actions + sim + queue | 06-30 → 07-02 | action wrappers, simulator, BIS solver, the queue and its executor (a planner/campaign layer came with it and was deleted 07-06) |
| L2 bank gear + events + tasks | 07-03 → 07-07 | `jobgear`, map events, gates, `work-task` / `task-loop` |
| L3 consumables + hive | 07-13 → 07-15 | food, potions, dev log, the hive, coverage, earn-gold |
| — | 07-15 → 11-03 | no commits |
| L4 skill loops + table UI | 11-03 → 11-04 | hive rework, pins, `train`, 🔁, season-9 data, tabs, offerings |
| L5 local service | 11-05 | `remote`, `synced`, `server/main`, `serve.mjs` |
| L6 training economics | 11-06 → 11-09 | `plan/xp`, helpers, combat training, `autoRecyclable` |
| L7 group fights, pace, daily trigger | 11-11 → 11-16 | `prepare`, lane pace, food rules, `scheduleOfferings` |
| L8 event orders + roadmap | 11-17 | `plan/events`, `eventorders`, atlas, roadmap, fleet analysis, sim effects |

Engine and shared modules (all **V**; lines from `wc -l`):

| Module | Lines | Role | Layer | Status |
|---|---:|---|---|---|
| `src/lib/remote.ts` | 44 | `IS_SERVER`, `expose`, `rpc` | L5 | live |
| `src/lib/devlog.ts` | 32 | buffered trace to `logs/dev.log` | L3 | live |
| `src/lib/util.ts` | 68 | asset URLs, `cooldownRemaining`, labels | L0 | live |
| `src/api/client.ts` | 168 | the one `fetch`, retries, pagination, token | L0 | live (`getToken` unused, `:25`) |
| `src/api/actions.ts` | 112 | `act()` + typed wrappers | L0–L1 | live |
| `src/catalog/index.ts` | 213 | catalog load, lookups, `itemSources`, `itemUses` | L0 | live |
| `src/catalog/load.ts` | 34 | data-file reader with live-API fallback | L0 | live |
| `src/catalog/atlas.ts` | 111 | atlas type + accessors | L8 | live (`atlasMonster` `:104`, `bandOf` `:111` unused) |
| `src/types/api.ts`, `catalog.ts` | 304, 157 | types, `GEAR_SLOTS`, `SLOTS_FOR_TYPE` | L0 | live |
| `src/sim/combat.ts` | 442 | fight simulator | L1, rebuilt L8 | live |
| `src/sim/stats.ts`, `types.ts`, `cost.ts`, `effects.ts`, `monte.ts`, `loglab.ts` | 109, 67, 15, 77, 45, 109 | fighter derivation, stat vocabulary, rest time, effect audit list, Monte Carlo, fight-log parser | L1 | live |
| `src/sim/validate.ts` | 151 | forecast-vs-reality window (a persisted signal) | L1 | live; its header still describes an "advisory" gate and a deleted `fight.ts` (`:6-7`) |
| `src/plan/bis.ts` | 353 | best-in-slot solver, `canEquip`, `killSeconds` | L1 | live |
| `src/plan/jobgear.ts` | 606 | job gear sets + the stateless swap differ | L2 | live (`canWinWithOwned` unused, `:132`) |
| `src/plan/consumables.ts` | 188 | food and potion selection | L3 | live |
| `src/plan/xp.ts` | 71 | XP and time formulas, `autoRecyclable` | L6 | live |
| `src/plan/queue.ts` | 144 | queue item vocabulary + row text | L1 | live |
| `src/plan/acquire.ts` | 22 | `npcForSell` only | L1 remnant | live, misnamed |
| `src/plan/types.ts` | 38 | `AcquisitionStep`, `GearJob`, `FoodSpec` | L1 remnant | live |
| `src/plan/coverage.ts` | 208 | "virtual bank reset for everyone" | L3 | live (UI only) |
| `src/plan/events.ts` | 115 | event standing orders, pure half | L8 | live |
| `src/plan/roadmap.ts` | 469 | milestones, next steps, `coinDemand` | L8 | live |
| `src/plan/fleetcheck.ts` | 137 | Roadmap fleet analysis | L8 | live |
| `src/plan/hive/*` (12 files) | 2,170 | goal proposal, scoring, compile to waves | L3, reworked L4 | live; helpers are also used outside the hive: `ctx.ts` by coverage, roadmap, fleetcheck; `skills.ts:48` by the queue's `train` item; `objectives.ts` by the Achievements tab |
| `src/state/store.ts` | 318 | every signal (server-owned and UI-local mixed), pins, the 4 Hz clock | L0+ | live |
| `src/state/apply.ts` | 129 | folds action echoes into state | L0 | live |
| `src/state/persist.ts` | 86 | `ammo:v1:state` | L0 | live |
| `src/state/sync.ts` | 192 | boot, reconcile, event poll, on-demand reads, login | L0 | live |
| `src/state/synced.ts` | 118 | `SYNCED`, the tab's `connect()`, browser-era import | L5 | live; import part is a leftover |
| `src/state/loopkit.ts` | 106 | cooldown waits, `moveTo`, `nearest`, `depositAll` | L1 | live (`waitCooldown` unused, `:23`) |
| `src/state/exec.ts` | 505 | gear swap step, `runStep`, food and potion provisioning, `fightRound` | L1–L3 | live |
| `src/state/queue.ts` | 1,606 | queue store, edit ops, the runner, every item handler, training economics, offerings, the daily trigger, helpers | L1 + every later layer | live |
| `src/state/hive.ts` | 856 | hive runtime: observer, dispatch, rebalancing, barrier, hand-off | L3–L4, touched L7–L8 | live |
| `src/state/events.ts` | 94 | event lookups | L2 | live |
| `src/state/eventorders.ts` | 85 | event standing orders, runtime half | L8 | live |
| `src/state/offerings.ts` | 61 | the once-a-day offerings read | L4 | live |
| `src/state/access.ts` | 63 | tile gates | L2 | live |
| `src/state/roadmap.ts` | 21 | `analyzeRoadmap` rpc | L8 | live |
| `src/server/main.ts` | 225 | HTTP server, SSE, `/rpc`, static files, boot | L5 | live; `importLocal` is a leftover |

UI (28 files, 6,006 lines without `styles.css`): see I.1. Scripts: see H.3 and F.3.

No module in `src/` is dead as a whole. Dead parts are listed in F.2.

### A.2 Import graph

Computed over all value imports in `src/` (type-only imports excluded). **V**

- **No static cycle.** The strongly-connected-component pass finds none.
- **One dynamic import inside the engine**, used exactly to avoid a cycle: `src/state/hive.ts:538`
  loads `./sync` for `loadAchievements` (`sync.ts` imports `hive.ts` statically, `src/state/sync.ts:29`).
  The other dynamic import is Vite in dev mode (`src/server/main.ts:213`).
- Direction, top to bottom: `server/main → state/sync, state/synced → state/hive → state/queue →
  state/exec → state/loopkit → api/actions → api/client`; `api/actions → state/apply → state/persist,
  sim/validate`. `plan/*` imports only `catalog`, `sim`, `types`, `lib/util` and other `plan` modules.
- **Hidden coupling 1:** every `plan/` module imports `catalog/index`, which imports `catalog/load`, which
  imports `api/client` (`src/catalog/load.ts:6`). `client.ts` reads `localStorage` at import when running
  under Node (`src/api/client.ts:23`). So the "pure" layer cannot be imported in Node without the
  web-storage flag — that is why every check script needs it.
- **Hidden coupling 2:** `plan/hive/tasks.ts` reads the loaded atlas from module state
  (`src/plan/hive/tasks.ts:81-82`, `src/catalog/atlas.ts:86`), not from the `HiveCtx` it is given, and
  imports `plan/roadmap` (`:10`). The hive's saturation check therefore depends on a file loaded elsewhere.
- **Cross-layer value imports worth knowing:** `state/queue.ts` imports `plan/hive/skills`
  (`src/state/queue.ts:27`); `plan/coverage.ts`, `plan/roadmap.ts`, `plan/fleetcheck.ts` import
  `plan/hive/ctx`; `state/hive.ts` imports `state/exec` and `state/loopkit` only for `invQty` and `bankQty`
  (`src/state/hive.ts:32-33`). The hive cannot be removed without moving these helpers.

### A.3 Entry points

| Entry | What it starts | Source |
|---|---|---|
| `scripts/serve.mjs` | supervisor: spawns the service, restarts it | `package.json` (`start`, `dev`) |
| `src/server/main.ts` | the service: binds `127.0.0.1:PORT` (`:221`), then `boot()` (`:224`) | `src/server/main.ts:199-225` |
| `src/main.tsx` | the tab: `connect()` then render | `src/main.tsx` |
| `scripts/atlas.mts` | offline atlas generator | `package.json` (`atlas`) |
| `scripts/check-*.mts` (11) | offline assertion scripts, run by hand | — |
| `scripts/fetch-data.mjs`, `fetch-map-assets.mjs`, `download-assets.sh` | season re-snapshot tools (they call the game) | `CLAUDE.md` Commands |

### A.4 Persistence keys

All in the service's `localStorage` file (`.ammo/storage.db`) unless marked "tab". **V**

| Key | Owner | Written when | Also read or written by |
|---|---|---|---|
| `ammo:v1:token` | `src/api/client.ts:20-34` | `setToken` | seeded from `.env` by `src/server/main.ts:48`; `drive.mjs:60` and `hive-probe.mjs:19` still seed it in a browser (stale) |
| `ammo:v1:state` | `src/state/persist.ts:13` | `saveState()`, debounced 300 ms (`:57-84`), called from `apply.ts:53`, `sync.ts:70,116,167`, `offerings.ts:29`, and by rpc from the tab after a pin toggle | holds characters, bank, account, log, `syncedAt`, pins, events, pending rewards, offerings |
| `ammo:v1:queue` | `src/state/queue.ts:50-86` | an `effect` on **every** change of the `queues` signal, including each note change | read by `drive.mjs:23` (stale: it reads the browser's storage) |
| `ammo:v1:offeringsDaily` | `src/state/queue.ts:1572-1581` | the daily trigger | — |
| `ammo:v1:hive` | `src/state/hive.ts:116-141` | an `effect` on every hive change | — |
| `ammo:v1:eventOrders` | `src/state/eventorders.ts:17-34` | an `effect` on `eventPlans` | — |
| `ammo:v1:simdev` | `src/sim/validate.ts:44-64` | an `effect` after every recorded fight | — |
| `ammo:server:imported` | `src/server/main.ts:52-63` | once, by `importLocal` | `importLocal` writes **any** key starting with `ammo:` it is handed (`:58-61`) |
| `ammo:v1:migrated` (tab) | `src/state/synced.ts:59,105,113` | once per browser | — |
| `ammo:v1:ui:activityHidden` (tab) | `src/ui/ActivityLog.tsx:7-17` | panel toggle | — |
| `ammo:v1:gearsets` (tab) | `src/ui/SimPlayground.tsx:57-67` | sim presets | — |

`.ammo/atlas.db*` exists next to the real storage file; it is the scratch storage of `npm run atlas` (F.3).

### A.5 `SYNCED` and rpc

`SYNCED` (`src/state/synced.ts:35-57`), 21 signals: `characters`, `bankItems`, `bankDetails`, `account`,
`log`, `activeEvents`, `authed`, `syncedAt`, `syncing`, `lastError`, `skillPins`, `achievements`,
`achievementsLoading`, `achievementsError`, `offerings`, `pendingRewards`, `queues`, `hive`, `eventPlans`,
`simDeviations`, `roadmapAnalysis`.

Functions callable over `POST /rpc` (10 `expose` calls, 34 names). **V**

| Where | Names |
|---|---|
| `src/api/actions.ts:112` | `act` (generic: any `/my/{name}/action/{path}` with any body), `move` |
| `src/api/client.ts:168` | `setToken` |
| `src/server/main.ts:70` | `importLocal` |
| `src/state/hive.ts:856` | `toggleHiveAuto`, `queueGoal`, `unqueueGoal`, `launchHive`, `stopHive`, `retryAssignment`, `skipAssignment`, `toggleHiveManual` |
| `src/state/offerings.ts:61` | `loadOfferings` |
| `src/state/persist.ts:86` | `saveState` |
| `src/state/queue.ts:1606` | `addItem`, `removeItem`, `updateItem`, `moveItem`, `clearQueue`, `setRepeat`, `queuePinTraining`, `queueAssist`, `queueOfferings`, `startQueue`, `stopQueue` |
| `src/state/roadmap.ts:21` | `analyzeRoadmap` |
| `src/state/store.ts:318` | `togglePin` |
| `src/state/sync.ts:192` | `reconcile`, `loadAchievements`, `loadPendingRewards`, `login`, `logout` |

### A.6 Module-level mutable state

Outside the signals in `store.ts`. "Reset" = what clears it short of a service restart. **V**

| Module | State | Reset by |
|---|---|---|
| `src/state/queue.ts:71` | `queues` signal, hydrated at import | edits; never cleared |
| `queue.ts:72`, `:77` | `stopFlags`, `liveLoops` | the loop's `finally` (`:1457-1463`) |
| `queue.ts:630`, `:648` | `forecastMemo`, `monsterMemo` — keyed per character, valid for one bank array reference + level | a new bank echo or a level-up; one entry deleted at `:670` |
| `queue.ts:1181` | `offeringsUnavailable` (1 h back-off) | time |
| `queue.ts:1389`, `:1392` | `lastHead` (dev log), `lossState` (loss streak) | `lossState` at `:1434`, `:1529`; `lastHead` never |
| `queue.ts:1573` | `offeringsTimer` | re-armed by `resumeQueue` |
| `src/state/exec.ts:227` | `fightSetMemo` — ONE entry per character (job, bank reference, level) | overwritten when the monster, bank or level changes |
| `src/state/hive.ts:130`, `:133` | `hive` (persisted), `hiveProposals` (not persisted, not synced) | — |
| `hive.ts:214` | `tickQueued` | each tick |
| `src/state/eventorders.ts:27` | `eventPlans` (persisted) | ended spawns dropped each pass (`:68`) |
| `src/state/sync.ts:59` | `eventsTimer` | `watchEvents` |
| `src/state/persist.ts:57` | `saveTimer` | fires |
| `src/state/store.ts:251` | the 4 Hz interval (runs in the service too, and prunes expired events there) | never — it keeps any Node process alive, which is why check scripts end in `process.exit` |
| `store.ts:280`, `:293`, `:101`, `:110`, `:188` | cooldown flag cache, log id counter, focus counters, tile-pick callback | — |
| `src/state/events.ts:37` | `_staticCodes` (static map content per type) | never; a new `maps.json` needs a restart |
| `src/sim/validate.ts:56` | `simDeviations` (persisted, 200 entries) | — |
| `src/plan/xp.ts:24` | `unitMemo` (actions per unit, per item) | never |
| `src/plan/coverage.ts:77` | `_typePools` | never |
| `src/plan/hive/ctx.ts:96`, `gear.ts:53` | `_bisCache`, `_probeCache` — `WeakMap` keyed by the bank array | garbage-collected with the bank array |
| `src/plan/hive/gold.ts:61` | `_staticMap` | never |
| `src/catalog/index.ts:32,102,170`, `atlas.ts:86-88`, `load.ts:9` | the catalog, its two caches, the atlas, the data reader | never |
| `src/api/client.ts:23` | `_token` | `setToken` |
| `src/lib/devlog.ts:10-12`, `remote.ts:14` | log buffer + sink, rpc handler table | — |
| `src/server/main.ts:53`, `:74-76` | `fresh` (computed once at start), SSE clients, dirty set | — |

Four modules that call themselves pure hold caches that are never invalidated (`xp.ts`, `coverage.ts`,
`gold.ts`, `events.ts`). They are safe only because the catalog never changes within a process.

---

## B. Who puts work on a character's queue

### B.1 The mechanism every writer shares

- A queue is `{ items, running, note, repeat }` (`src/state/queue.ts:43-48`). The runner executes
  `items[0]`, one action per tick, and re-reads the head from the signal on every tick (`:1403-1420`).
- All writes go through three internal functions with no access rule: `setQueue` (`queue.ts:88-94`),
  `patchItem` (`:99-103`) and direct assignment to `queues.value` (`:116`, `:1469`, `:1532`).
- User edits refuse to touch a running head (`headLocked`, `queue.ts:107`). Automatic writers do not use that
  rule; they use `insertItem` (`:135-138`, no check at all), `dropItem` (`:128-131`) or `setQueue`.
- **An item has no owner.** Ownership is inferred from the id: `hive:<startedAt>:<waveSeq>:<char>:<ns><i>`
  (`src/state/hive.ts:165-166`), `ev:<eventKey>:<i>` (`src/state/eventorders.ts:79`), anything else a
  random 8-character id (`src/plan/queue.ts:96`). Only two places read a prefix: the 🔁 rule
  (`src/state/queue.ts:1430`) and the hive's leftover sweep (`src/state/hive.ts:168`, `:593`, `:736`).
- When a step finishes while the head has changed under it, the result is **discarded**
  (`src/state/queue.ts:1422-1423`): the old item stays in the list and is evaluated again later. That is
  safe for items that check their own completion first, and wrong for the one item that does not: `buy`
  returns "done" unconditionally (`:266-267`).
- A failure is written onto the item that was running, by id (`queue.ts:1451`), and the queue pauses — even if that
  item is no longer the head. `startQueue` clears an error only on the head (`:1530-1531`).

### B.2 Every writer

"Finds its items" = how the writer recognises its own items later. All **V**.

**User, over rpc**

| # | Path | Trigger | Assumes | Ids | Finds its items |
|---|---|---|---|---|---|
| U1 | `addItem` `queue.ts:110-117` | Add form (`QueuePanel.tsx:545`), Items tab (`TableTabs.tsx:139`), bank Sell (`CatalogPanel.tsx:284`) | a running queue never takes an insert at index 0 (`:114`) | random | by id |
| U2 | `removeItem` `queue.ts:119`, `updateItem` `queue.ts:141`, `moveItem` `queue.ts:147`, `clearQueue` `queue.ts:160` | queue editor | not the running head; `clearQueue` only when stopped | — | by id |
| U3 | `setRepeat` `queue.ts:1467-1471` | 🔁 button | creates the queue if missing | — | — |
| U4 | `startQueue` `queue.ts:1511-1535`, `stopQueue` `queue.ts:1542-1548` | ▶ ⏹, Fleet "Retry"/"Run" | a draining loop is reused, not doubled (`queue.ts:1517-1524`) | — | — |
| U5 | `queueOfferings` `queue.ts:1592-1598` | Offerings fold, altar drawer | none — inserts at index 0 of any queue, running or not, and removes other `offering` items | random | by kind |
| U6 | bank "Sell" button `CatalogPanel.tsx:283-286` | click | `addItem` then `startQueue`, **not awaited**: two concurrent POSTs; if the start lands first on an idle queue the item stays queued and stopped | random | — |
| U7 | `cancelTaskWithFee` `CatalogPanel.tsx:497-508` | Tasks drawer "cancel" | not a queue write: a move → withdraw → move → cancel chain driven **from the tab** with `loopkit` primitives, on a character whose queue may be running | — | — |

**Runner (self-writes)**

| # | Path | What | Source |
|---|---|---|---|
| R1 | progress patches | `done`, `from`, `geared`, `day`/`skip` on its own item, by id | `queue.ts:281`, `:308`, `:335`, `:401`, `:408`, `:438`, `:472`, `:513`, `:1008`, `:1335` |
| R2 | item done | head removed, or with 🔁 moved to the back with `done`, `from`, `geared`, `error` wiped | `queue.ts:1421-1433` |
| R3 | `prepare` done | head removed and `running: false` — the only item that stops its queue | `queue.ts:1428-1432` |
| R4 | failure | error on the item, `running: false` | `queue.ts:1450-1454` |
| R5 | queue empty | `running: false` | `queue.ts:1410-1414` |
| R6 | `skipItem` | reports "done" for a target that is not on the map; the item is then removed or recycled like any finished item | `queue.ts:177-180` |
| R7 | `giveUpTask` | no queue write; spends bank stock and a tasks coin and cancels the task | `queue.ts:1037-1077` |

**🔁 repeat flag**

| # | Path | Trigger | Source |
|---|---|---|---|
| F1 | set on | user; `queuePinTraining` | `queue.ts:1470`, `:1488` |
| F2 | set off | user; **every hive dispatch**, never restored | `src/state/hive.ts:490` |

**Pin training — `queuePinTraining`** (`queue.ts:1478-1489`). Trigger: Fleet "📌 Train pins"
(`FleetView.tsx:69`), queue editor button (`QueuePanel.tsx:92`), hive hand-off (`hive.ts:597`).
Appends, per pin, `gear{reset}` + `train{levels: 1}` and turns 🔁 on. Assumes nothing: no check for an
existing pin rotation, so a second call doubles it. Random ids; it never looks for its items again. A
combat pin freezes the monster of the moment into the `gear` item (`queue.ts:1483-1485`).

**Helpers — `queueAssist`** (`queue.ts:1495-1508`). Trigger: "🤝 Fleet helps" (`QueuePanel.tsx:113`), Roadmap
(`RoadmapTab.tsx:48`). For **every other character**: `stopQueue` → `addItem(…, 0)` → `startQueue`.
Assumes nothing about the target queue: it starts queues that were stopped or paused, and goes ahead of
hive items, event trips, `prepare` and offerings alike. Target level = the crafter's own train item
(`queue.ts:1498-1501`), else forever. Random ids. Helpers are recognised only by live inspection of queue heads
(`helpersOf`, `queue.ts:774-778`) — a helper whose help item is not at the head does not count.

**Hive** (`src/state/hive.ts`)

| # | Path | Trigger | Assumes | Finds its items |
|---|---|---|---|---|
| H1 | `launchHive` `hive.ts:715-757` | Launch button; `moveOn` (auto) | stops **every** participant's queue (`hive.ts:734`); manual launch clears it, auto launch (`keepUserItems`) removes only `hive:*` items | — |
| H2 | `dispatchWave` `hive.ts:468-504` | observer tick | appends (`addItem`), or inserts ahead of the head for a stolen slice of a waiting crafter (`insertItem`, `hive.ts:487`); clears 🔁 (`hive.ts:490`); starts the queue | deterministic ids + presence check (`hive.ts:483-486`) |
| H3 | `rebalanceWave` → `planSteal` `hive.ts:353-399`, `hive.ts:414-464` | tick while a wave is unfinished | shrinks `times` / `quantity` on the victim's **running** head (`patchItem`, `hive.ts:435`); the thief must have an empty stopped queue, or be a starved waiter (`hive.ts:432`) | ids `s<k>` |
| H4 | fillers `hive.ts:444-456` | same | an infinite `train` or `task-loop` on an empty stopped queue | ids `f<i>` |
| H5 | `releaseStarved` `hive.ts:317-336` | same | removes a waiting craft from under the runner (`dropItem`) and trims its recycle | by id |
| H6 | `pullFillers` `hive.ts:521-530` | barrier, when the run continues | stop + remove | by id |
| H7 | `stopHive` → `unwindStop` `hive.ts:761-782`; `skipAssignment` `hive.ts:793-820`; `toggleHiveManual` `hive.ts:824-830` | ⏹, Skip, opt-out | stop + remove own ids | by id |
| H8 | `retryAssignment` `hive.ts:785-788` | Retry | `startQueue` | — |
| H9 | `handOffToTasks` `hive.ts:585-612` | a goal ended and nothing else launched | only queues that are stopped and hold nothing but `hive:*` leftovers; then `queuePinTraining` + start, or a plain infinite `task-loop` | plain random ids — the hive forgets them |
| H10 | `moveOn` / `nextGoal` `hive.ts:636-671` | 100 ms after a goal ends; after `queueGoal` or switching continuous mode on while idle | launches the next backlog goal, else in continuous mode the best proposal | — |

**Event standing orders** — `reactToEvents` (`src/state/eventorders.ts:64-85`). Trigger: after every
boot sync, every manual Refresh (`src/state/sync.ts:117`) and every 5-minute poll (`:63`). Inserts each
order's items at indexes `0…n-1` (`:79`). A character is "free" when its queue is running and its head is
neither `prepare` nor an `ev:` item (`:37-43`) — the head only, nothing about who owns the queue or what
sits behind the head. Ids `ev:<code>@<created_at>:<i>`. The spawn is remembered as handled the moment the
items are inserted (`:80`); whether the trip ever ran is not tracked.

**Daily offerings** — `scheduleOfferings` (`queue.ts:1574-1589`). Trigger: a timer for 00:05 UTC, armed
by `resumeQueue`; a boot later in the day catches up once. For every queue that is **running** and whose
head is not already an `offering` (`:1583`): `queueOfferings` (U5). No check for `prepare`, `ev:` or
`hive:` heads. The day marker is written before the inserts and regardless of whether any queue qualified
(`:1580-1581`).

**Group fight — `prepare`** (`GroupFight.tsx:44-51`). `addItem(…, 0)` then `startQueue`, both awaited.
The button is disabled while the character's queue runs anything else (`:41`, `:98-105`) — a guard in the
UI only.

**Roadmap actions** (`RoadmapTab.tsx:39-52`): `train` = `stopQueue` → `addItem(…, 0)` → `startQueue`,
awaited, after a confirm; `assist` = `queueAssist`; `hive` = `queueGoal` (H10: with no goal running it
launches at once, with `keepUserItems`).

**Boot**

| # | Path | What | Source |
|---|---|---|---|
| B1 | `loadStored` | drops queues of unknown shape and **items whose kind is not in `QUEUE_KINDS`** | `queue.ts:51-63` |
| B2 | `resumeQueue` | relaunches every `running` queue; a queue whose character is unknown is set to stopped | `queue.ts:1555-1567` |
| B3 | `resumeHive` | re-attaches by ids, redoes a barrier, or finishes an interrupted stop | `hive.ts:840-850` |
| B4 | `importLocal` | writes raw storage keys handed over by a browser, then exits the process | `server/main.ts:55-69` |

**Writers that were not on the task's list:** U5 (the manual offerings insert), U6, U7, R3, R6, F2
(the hive clearing 🔁), H5, H8, H10, B1 and B4.

### B.3 Pairwise matrix of the automatic writers

Writers: **Hive** (H1–H10) · **Events** (event orders) · **Offer** (daily trigger) · **🔁** (repeat
recycling) · **Assist** (`queueAssist`) · **Pins** (`queuePinTraining`) · **Road** (Roadmap-launched
train item or backlog goal) · **Boot** (resume).

Cell codes: **C** safe by construction · **G** safe by a guard (cited below) · **X-n** conflict possible,
scenario *n* below. The matrix is symmetric; the lower triangle repeats the upper.

| | Hive | Events | Offer | 🔁 | Assist | Pins | Road | Boot |
|---|---|---|---|---|---|---|---|---|
| **Hive** | G1 | X-1 | X-2 | X-3 | X-4 | X-5 | X-6 | G2 |
| **Events** | X-1 | G3 | X-7 | G4 | X-8 | C1 | X-9 | G5 |
| **Offer** | X-2 | X-7 | G6 | G7 | X-10 | G7 | X-10 | G8 |
| **🔁** | X-3 | G4 | G7 | X-11 | X-11 | X-12 | C2 | C3 |
| **Assist** | X-4 | X-8 | X-10 | X-11 | X-13 | C4 | C5 | C3 |
| **Pins** | X-5 | C1 | G7 | X-12 | C4 | X-14 | C5 | C3 |
| **Road** | X-6 | X-9 | X-10 | C2 | C5 | C5 | C6 | C7 |
| **Boot** | G2 | G5 | G8 | C3 | C3 | C3 | C7 | G9 |

11 of the 28 distinct pairs, and 3 of the 8 same-writer cells, can conflict.

**Safe by construction**

- **C1** Events × Pins — the trip runs ahead of the `gear`/`train` items; afterwards the `train` item
  re-derives gear and materials from live state every tick (`queue.ts:417`, `:820-822`). Cost: one bank trip.
- **C2** 🔁 × Road — a recycled "train → Lv N" item is satisfied at once on later laps (`queue.ts:409-410`).
  Harmless unless nothing else is on the queue (X-11).
- **C3** Boot × 🔁 / Assist / Pins — the flag and the items are persisted with the queue; every item
  resumes from its own completion check (`queue.ts:8-11`).
- **C4** Assist × Pins — documented behaviour: the help item sits ahead of the pin rotation
  (`queue.ts:1491-1494`). Side effect: a crafter on a pin rotation has a "+1 level" item, so the helpers' target is
  one level (`:1501`) and they stop after it.
- **C5** Road × Assist / Pins; Assist × Road — the Roadmap's actions are these same functions, or a finite
  train item at the front.
- **C6** Road × Road — two front inserts queue up; both are finite.
- **C7** Road × Boot — items and the hive backlog are persisted. A backlog with no goal running is not
  launched at boot (`hive.ts:840-842`); it waits for the next `queueGoal` or toggle.

**Safe by a guard**

- **G1** Hive × Hive — one goal at a time (`hive.ts:727`, `:637`); dispatch is idempotent (`:483-486`).
- **G2** Hive × Boot — `resumeHive` runs after `resumeQueue` (`sync.ts:46-47`) and re-attaches by id.
- **G3** Events × Events — a character already on a trip is not free (`eventorders.ts:41`) and one pass
  hands each character at most one trip (`:81`). The guard reads the head only: a character whose trip is
  queued *behind* an offering item counts as free and can be given a second trip.
- **G4** Events × 🔁 — `ev:` items are never recycled (`queue.ts:1430`).
- **G5** Events × Boot — handled spawns are persisted (`eventorders.ts:27-34`); orders are dispatched
  after the queues are back (`sync.ts:46-48`).
- **G6** Offer × Offer — day marker (`queue.ts:1580`), head check (`:1583`), older offering items removed
  (`:1597`).
- **G7** Offer × 🔁 / Pins — a finished offering item is recycled into the rotation; the next day's
  trigger removes that copy and inserts a fresh one (`queue.ts:1597`); alone on the queue it holds instead of
  spinning (`:1340-1347`). Side effect: every 🔁 queue carries a permanent `offering` item after its first
  trigger.
- **G8** Offer × Boot — the trigger runs inside `resumeQueue` before the loops start, once per day
  (`queue.ts:1556`, `:1580`).
- **G9** Boot × Boot — `login` calls `resumeQueue` again; a live loop is never doubled (`queue.ts:1400`, `:1558`).

**Conflict scenarios**

- **X-1 Hive × Events.** *State:* a hive goal is running; Fifth is a participant with a `hive:` item at
  the head. *Order:* a Nomadic Merchant spawns → `free()` accepts Fifth (`eventorders.ts:37-43`) → the trip
  goes ahead of the hive item. *Result:* the wave waits for the trip. If the trip pauses (a fight that is
  no longer a win, two losses), the error is on a non-hive item, the assignment reads "blocked"
  (`hive.ts:200-201`) and the whole wave holds until the user acts. In the other order, a manual Launch
  clears the queue including the trip (`hive.ts:737`) while the spawn stays marked handled — the order is
  lost. **Seen (the benign half):** `logs/dev.log` lines 808944–809013 (2026-11-17 23:31–23:32): Fifth's
  trip ran ahead of `hive:1794779144645:0:Fifth:f0`, a leftover filler; no wave was waiting on it.
- **X-2 Hive × Offer.** *State:* a wave is running at 00:05 UTC. *Order:* an `offering` item goes ahead of
  every running hive head (`queue.ts:1582-1584`). *Result:* every lane stops producing for as long as the
  offerings take (a drop hunt can be an hour); `lanePace` counts that time as lane work
  (`hive.ts:255-264`), which distorts steal sizing; a waiting crafter with an offering at its head is no
  longer "starved" (`:302`), so `releaseStarved` cannot release the wave (`:325`).
- **X-3 Hive × 🔁.** *State:* a queue with a pin rotation and 🔁 on. *Order:* any hive dispatch to that
  character runs `setRepeat(false)` (`hive.ts:490`). *Result:* 🔁 stays off for good. After the goal the
  hand-off restores a pin rotation only on queues that are stopped and hold no user items (`:592-594`);
  a character still running a filler stays on one infinite single-skill item with 🔁 off.
- **X-4 Hive × Assist.** *State:* a wave is running. *Order:* the user presses "Fleet helps".
  *Result:* an infinite help item lands ahead of every other participant's hive items
  (`queue.ts:1502-1507`); those lanes never run; every assignment reads "running" (`hive.ts:199`), so
  nothing reports a problem and the wave never ends. Reverse order: an auto-launched goal appends behind
  an infinite help item and starves the same way.
- **X-5 Hive × Pins.** *State:* the fleet runs pin rotations. *Order:* a goal is auto-launched (backlog or
  continuous mode). *Result:* the hive's items are appended **behind** the pin items (`hive.ts:488`) with
  🔁 now off; each character first gains one level per pin — hours — before reaching the goal.
- **X-6 Hive × Road.** *State:* five pin rotations running, no goal running. *Order:* Roadmap → "Craft 1×
  iron pickaxe" → `queueGoal` → `moveOn` → `launchHive(…, keepUserItems)` (`hive.ts:683-688`, `:640`).
  *Result:* **every** participant's queue is stopped (`:734`). Only characters with an assignment in the
  wave are restarted (`:491`). The others keep their items but are never restarted: rebalancing skips a
  queue that holds items (`:432`), and so does the hand-off at the end (`:594`). They stand idle until the
  user presses Run.
- **X-7 Events × Offer.** *State:* a merchant trip is under way at 00:05 UTC. *Order:* the offering item
  goes ahead of the trip (the trigger does not look at the head's id). *Result:* the trip waits; merchant
  events last 90 minutes; if the offerings outlast the event the trip's items are skipped
  (`queue.ts:264`, `:276`) and that spawn is never retried.
- **X-8 Events × Assist.** "Fleet helps" during a trip puts an infinite help item ahead of it; the trip
  never runs and its items stay queued behind the helper.
- **X-9 Events × Road.** A Roadmap "train → Lv N" is stop → insert at 0 → start
  (`RoadmapTab.tsx:44-46`), so it goes ahead of a trip in progress, which then waits for the level.
- **X-10 Offer × Assist / Road.** A help item or a Roadmap train item inserted at the front after 00:05
  sits ahead of the day's offering item; the offerings wait behind it and the day can pass. The next day's
  trigger inserts ahead again, so the loss is one day at a time.
- **X-11 🔁 with nothing left to do.** *State:* 🔁 on and every item already satisfied — for example a
  single "help X train to Lv 20" after X reached 20, a lone `move`, or a lone Roadmap train item whose
  level is reached. *Result:* each lap is `sleep(50)` → item done → recycled (`queue.ts:1405`,
  `:1421-1431`): 20 laps a second, each one a full JSON write of all queues to storage (`:80-86`) and an
  SSE push. Only the `offering` item guards against this (`:1340-1347`).
- **X-12 🔁 × Pins.** *State:* a queue holding a one-off item, e.g. `craft 5× copper ring` or a `buy`.
  *Order:* "Train pins" appends the rotation and turns 🔁 on (`queue.ts:1488`). *Result:* the one-off item becomes
  part of the rotation and is executed again on every lap.
- **X-13 Assist × Assist.** "Fleet helps" for crafter X, later for crafter Y. Y's queue is skipped by the
  second call (`queue.ts:1503`), so Y's head is still "help X" (infinite): Y never crafts, while everyone else now
  helps Y. `assistPick` has no stop condition — it always returns the least-covered ingredient
  (`:900-904`) — so the helpers stock the bank without limit for a crafter who is not consuming.
- **X-14 Pins × Pins.** A second "Train pins" on a queue that already has the rotation doubles every pair
  (`queue.ts:1481-1487`); the button in the queue editor is not gated on that (`QueuePanel.tsx:92`).

### B.4 Defects in the shared mechanism

1. **`buy` completes without buying. V, confirmed in the log.** The handler returns "done" after one
   `runStep` (`queue.ts:266-267`). When the character's pocket gold is short, that one step is the gold
   withdrawal, which returns without buying (`exec.ts:283-292`). Pocket gold is swept into the bank on
   every deposit (`loopkit.ts:104-105`), so this is the normal case. *Log:* 2026-11-17 23:32:33 head
   "Buy 5× Lost World Map" → `bank/withdraw/gold {"quantity":72000}` → 23:32:48 the head is already the
   next item; the last `npc/buy` in the whole log is from 2026-11-15. Same pattern 2026-11-13 12:45
   (7,000 then 14,000 withdrawn, no purchase). The nine purchases that did succeed were all paid in item
   currencies, where the cost is 0 and the gold branch is skipped. The code is from 2026-07-03
   (`git blame`). Affected: the event merchant wishlist, hive `buy` items (`plan/hive/acquire.ts:367`,
   `plan/hive/achievements.ts:340`), the user's `buy` item.
2. **A step result is lost when the head changes under it** (`queue.ts:1422-1423`) — see B.1.
3. **`prepare` does not survive a restart.** `QUEUE_KINDS` omits it (`src/plan/queue.ts:91-94`) and
   `loadStored` filters by that list (`queue.ts:57`). The list has no other user. **V**
4. **The 🔁 spin** — X-11.
5. **Every code ≥ 500 is treated as an outage and retried forever** (`queue.ts:1444-1449`), but 598 is a
   game refusal ("this tile has no such content"). Outside the offering handler (`:1373`) a persistent 598
   — a stale `maps.json` after a season change, for example — shows as "network trouble" every 60 s and
   never pauses. **V** (code); no 598 appears in the log so far (G.3).
6. **`startQueue` can be silently ignored** in the 50 ms after a `prepare` item finishes: the loop is
   still registered (`queue.ts:1400-1401`), the stop flag is not set, so `:1517-1524` returns without starting.
   **V**, narrow.
7. **Helpers withdraw and re-deposit the same raw material forever. V, confirmed in the log.** A helper
   refines banked raw stock: `runTrainAssist` → `sourceOne` (`queue.ts:919`) → the sub-craft branch →
   an inner `sourceOne` for the raw material, where `fromBank` defaults to true (`:982`, `:938-943`). When
   the bank holds less than the trip needs, the next tick takes the gather branch, whose first act is
   `gatherGear` → `gearSwapStep` (`:949`). The character is standing on the bank tile with its set
   converged, so the differ applies its last rule — "sweep the bag if we happen to be at the bank"
   (`src/plan/jobgear.ts:603-604`) — and deposits everything outside `keep`. A helper's `keep` is its
   tools only (`queue.ts:795-803`). Withdraw 68, deposit 68, repeat. *Log:* 2026-11-17 11:36 → 18:24, four
   helpers, 1,946 withdraws + 1,937 deposits out of 6,911 actions and 4 crafts in total (sample: lines
   776663–776672, Second, `spruce_wood` ×68, notes "withdraw Spruce Wood" → "stow gear"). It began when the
   bank dropped below one trip's load and ended only when the queues were replaced by hand. The path is
   unchanged in the working tree. The same sweep rule caused the raw-beef loop (2026-07-14) and the
   tasks-coin loop (2026-11-04), each fixed by adding one more code to one more keep list.
8. **A 486 pauses the queue.** After a server 500 the runner holds 60 s and retries; if the first call is
   still being processed the retry answers 486 "an action is already in progress", which is not in the
   hold list (`queue.ts:1444`) — the queue pauses. *Log:* 2026-11-09 23:50 (Second, line 338090) and
   2026-11-10 00:00 (First): 15.5 character-hours idle overnight. **V**

### B.5 Is the hive frozen?

No. `CLAUDE.md` says "the hive is kept but frozen". **V**

- **It changed after that sentence was written** (2026-11-04): commits 73f9b22 (11-12, lane pace and
  waiting crafters stealing) and 29cb31f (11-17, hand-off to pin training, `coinDemand`).
- **It was used:** 52 goals launched in the log, 41 of them between 2026-11-03 and 2026-11-15 (G.5). The
  last launch is 2026-11-15 21:45; **its filler item was still the head of Fifth's queue on 2026-11-17
  23:32**, two days after the goal ended (`logs/dev.log` lines 682261, 685888, 809013 area) — an infinite
  task-loop under a `hive:` id with 🔁 off, which nothing ever takes back (B.3 X-3).
- **Paths that reach it today:**
  1. the Fleet tab's Hive fold — every control is live over rpc (`hive.ts:856`);
  2. the Roadmap's craft-order and tool buttons → `queueGoal` → immediate launch when idle
     (`RoadmapTab.tsx:50`, `hive.ts:683-688`);
  3. continuous mode, persisted in `ammo:v1:hive` (`hive.ts:109`, `:123`): once on, every goal end
     launches the next proposal without a click (`:660-668`);
  4. `resumeHive` at every boot (`sync.ts:47`);
  5. its hand-off writes plain items to queues and calls `queuePinTraining` (`hive.ts:585-612`);
  6. its helpers are load-bearing for other features (A.2).

---

## C. Who decides what is best

### C.1 Best monster to fight

| Implementation | Candidates | Gear pool | Must be | Objective |
|---|---|---|---|---|
| `trainingMonsterFor` `queue.ts:649-663` | on the map now, static **or live event** (`:655`); level ≤ character + 10; XP > 0 | bank + own bag + own worn, potions owned (`jobgear.ts:136-143`) | a **win** (`queue.ts:657`) | XP ÷ `killSeconds` |
| the fight gate `exec.ts:490` | the one target | what is worn right now | a **win** | — |
| event orders `plan/events.ts:91-104` | the event's monster | bank + own | **safe** (`:97`) | lowest `killSeconds` |
| hive candidates `plan/hive/acquire.ts:176-184`, `achievements.ts:51-55` | the dropper / the target | bank + **every participant's** bag and worn gear, no potions, half-width search (`plan/hive/ctx.ts:105-129`) | safe if anyone is, else a win | — |
| hive gold lane `plan/hive/gold.ts:108-126` | static map only, level ≤ character | as above | **safe** | gold per kill |
| atlas `path` (scripts) | a hypothetical naked character with tiered "progressive" pools | none of the fleet's | safe | XP per second (see C.7) |
| fleet analysis `plan/fleetcheck.ts:68-70` | takes the atlas's plus-tier target for the level as given | — | — | — |
| Roadmap milestone `plan/roadmap.ts:222-229` | shows the atlas target and its hours; the button queues a `train combat` item, which fights `trainingMonsterFor`'s pick | — | — | — |

*A state where they disagree.* A level-21 character whose best owned set wins against monster M on the
expected-value pass but loses the pessimistic one. `trainingMonsterFor` picks M and the gate lets it
fight; an event order would refuse M; the hive counts M as "not suitable" for task suitability
(`plan/hive/tasks.ts:54`). Second state: one steel sword, worn by A. The hive's pool includes A's sword
when it judges B (`ctx.ts:64-78`), so B is assigned a fight lane; B's live gear swap cannot see the sword
(`jobgear.ts:66-76`), the gate says no, the queue pauses with "not a safe win" and holds the wave. Third:
the Roadmap card says "best XP: pig, 49 s/kill"; pressing its button fights whatever
`trainingMonsterFor` picks from owned gear, which may be a different monster.

### C.2 Best gear set

| Implementation | Pool | Method | Utilities | Allocation between characters |
|---|---|---|---|---|
| `jobGear` `jobgear.ts:154-274` | bank + own bag + own worn | fight: BIS by seconds per kill; gather/craft: per-slot argmax of prospecting, wisdom, tool | fights: yes, plus potions the character could brew if they materially help (`:174-186`) | none — first to the bank wins; the loser re-plans on a 404/478 |
| `bestInSlot` `bis.ts:245-309` | whatever the caller passes | the solver itself | optional | — |
| `fleetBis` `plan/hive/ctx.ts:105-129` | bank + all participants' bags and worn gear | BIS, caps 6/6 | **never** | none — every character is judged against the whole pool |
| `fleetCoverage` `coverage.ts:89-208` | bank + all characters | **item level**, no simulation; tools and utilities excluded | no | greedy: a contested copy goes to whoever has the worst fallback |
| Roadmap band set `roadmap.ts:114-122`, `:189-204` | bank + all characters | the atlas's most-picked plus-tier item per slot group; any owned item of the group with level ≥ the pick counts (`:209-210`) | no | its own rule: the wearer keeps, the rest in account order — deliberately not `fleetCoverage` (`:183-188`) |
| fleet analysis `fleetcheck.ts:63-91` | worn vs `fleetBis` vs the atlas's set | simulation | no | none |
| atlas pools (scripts) | hypothetical | tiered, progressive | potion rule of its own (C.7) | — |

*A state where they disagree.* The fleet's highest-level weapon is a water staff; the target is a pig
(40% water resistance, per the progression-atlas note). Coverage shows the staff as everyone's best
weapon; `jobGear` equips a lower-level weapon of another element. The Roadmap ticks "Lv 20 set: owned —
a gear reset wears it" (`roadmap.ts:274`) for any body armour of level ≥ the pick, yet the reset wears
whatever the solver prefers against that monster — the tick promises something `jobGear` does not do.

### C.3 Best recipe or node to train on

| Implementation | Window | Ranks by | Sees stock | Sees recycling | Sees helpers |
|---|---|---|---|---|---|
| `trainRecipe` `queue.ts:746-771` | any recipe with XP > 0 (skill − item ≤ 10) | XP per fleet-second | yes — banked materials are free (`:755-763`) | yes, and the rare-ingredient rule (`:766`) | yes (`by`) |
| hive `trainingRecipeFor` `plan/hive/skills.ts:62-85` | item level in `skill−8 … skill` | upper half of the window first, then fewest actions | only through `planAcquire`'s feasibility probe | no | no |
| atlas `craftTrain` (scripts) | per skill level | XP per hour for a hypothetical fleet | no | see C.7 | no |
| `trainingResourceFor` `plan/hive/skills.ts:48-55` (used by the queue's `train`, the hive and fillers) | node level in `skill−9 … skill` | **highest node level** | — | — | — |
| atlas `gatherTrain` (scripts) | open-map nodes | XP per hour, with the tier's tool | — | — | — |

*A state where they disagree.* 1,595 spruce wood in the bank, weaponcrafting 12: `trainRecipe` picks the
spruce recipe because the wood is already paid for; the hive's level-skill goal for the same character
picks by action count from scratch and may order ash to be gathered — the exact waste the comment at
`queue.ts:755-757` describes, still present in the hive's picker.

**Not yet hit: mining and woodcutting training break at levels 35–39.** `trainingResourceFor` returns
the highest-level node, and the level-35 nodes (`strange_rocks`, `magic_tree`) exist only during events
(catalog, **V**). With no event up, the `train` item finds no tile and **skips**
(`queue.ts:414-416`): on a 🔁 pin rotation that is a bank reset followed by a skip, every lap, until
level 40. The atlas picks only open-map nodes, so the Roadmap will keep showing a valid target.

### C.4 How to get an item

| Resolver | Order of sources | Depth | Bank | Buys | Fights |
|---|---|---|---|---|---|
| `fieldSource` `queue.ts:588-601` | gather → craft (own skill) → the monster with the best drop rate | 1 | never | never | names a monster without asking whether it can be beaten or is on the map |
| `sourceOne` `queue.ts:927-985` (train loops, helpers) | bank → gather → hunt → sub-craft | 2 | first (helpers: only for raw materials) | never | yes, gated by the live fight gate |
| `runWorkTask` `queue.ts:1086-1174` | gather / fight; a craft only if **every** ingredient is gatherable (`:1154-1155`) | 1 | never (bank only at the dead end) | never | yes |
| `obtainOffering` / `canObtainOffering` `queue.ts:1224-1296` | bank → favoured target → `fieldSource` | 3 | first, except for a craft offering's product | never | yes |
| `produceOnce` `exec.ts:386-429` (food, potions) | craft from bag → bank → gather | 1 | yes | never | **never** |
| `planAcquire` `plan/hive/acquire.ts:63-287` | bank (virtual) → gather by anyone → craft → fight or buy | 12 | first, with claims inside one compile | yes, gold or item currency | yes |
| `provisionFood` / `foodPlan` `consumables.ts:129-153` | stocked food → cook from stock → gather + cook | 1 | first | never | never |
| `itemSources` `catalog/index.ts:109` | display only | — | — | — | — |

*A state where they disagree.* An items task for a cooked dish whose raw ingredient is a monster drop.
`runWorkTask` sees a craft with a non-gatherable ingredient and gives up — the task is cancelled for a
tasks coin (`queue.ts:1154-1155`, `:1059-1076`). The train loop would hunt the monster for the same
ingredient (`:954-964`); the hive would assign a fight lane; an offering would walk the same three steps.
Four resolvers, one of which throws a coin away.

### C.5 Time, XP and value estimates

| Quantity | Value | Where |
|---|---|---|
| one gather | `29 + level/2` s | `plan/xp.ts:55` (train picker, food rule) |
| one action of any kind | 30 s | `plan/hive/score.ts:28` (all hive estimates, steal sizing) |
| one fight round | 40 s | `plan/xp.ts:71` (train picker, for a drop hunt) |
| one kill | `2 s × turns` + rest for all HP lost | `plan/bis.ts:70` (gear choice, monster choice, event orders) |
| one kill | 1.3 actions = 39 s | `plan/hive/gold.ts:41` |
| one kill | measured on the lane, once ≥ 5 are done | `state/hive.ts:255-264` |
| one task | mean task size of the eligible pool + 5 actions | `plan/hive/tasks.ts:25-30` |
| one gathering level | 25 gathers | `plan/hive/skills.ts:132` |
| seconds of work per item, per tasks coin; XP per hour per level | atlas tables | `catalog/atlas.ts:22-24`, `:67-68`, `:75-78` (C.7) |

*A state where they disagree.* A wolf: the gear solver says ~30–50 s per kill, the hive plans it at 30 s
(one action), the train picker at 40 s, and the lane measured ~130 s (`state/hive.ts:252-254`). The
hive's value-per-hour ranking and the Roadmap's hour figures are not comparable with each other.

### C.6 Who is the specialist for a skill

| Implementation | Rule |
|---|---|
| `craftPins()` `store.ts:87-95` → hive `crafterFor` `plan/hive/ctx.ts:50-59` | the character's **first workshop pin** only (weapon, gear, jewelry, cooking — not alchemy); among characters pinning the same skill, the **first in account order**; with no pin, the highest level |
| hive craft candidates `plan/hive/acquire.ts:132-139` | every qualified character, the one above first |
| Roadmap `specialist()` `plan/roadmap.ts:125-128` | **highest level** among characters with the skill in **either** pin slot, any skill including gathering and alchemy; with no pin, the highest level |
| Items tab "best crafter" `TableTabs.tsx:246-251`, `:374-384` | any pin counts, then level |
| helpers `queue.ts:774-778`, `:1498` | whoever has a plain `train` item for the skill — pins are not consulted |

*A state where they disagree (today's fleet, per `docs/tasks/roadmap-tab.md:64-65`).* First pins cooking +
alchemy, Fifth pins cooking + fishing. The hive routes every cooking craft to First whatever the levels;
the Roadmap names whichever of the two is higher. A character pinning `[cooking, weaponcrafting]` is the
weaponcrafting specialist for the Roadmap and the Items tab and not for the hive.

### C.7 The atlas scripts

`scripts/atlas.mts` and `scripts/atlas/{model,combat,econ}.mts` (669 lines) build `public/data/atlas.json`.
**V** by reading; the generator was not run.

**Imported from `src/`:** `bestInSlot`, `killSeconds` (`src/plan/bis.ts`), `fightXp`, `gatherSec`,
`CRAFT_SEC` (`src/plan/xp.ts`), `STAT_CODES`, `isCombatEffect` (`src/sim/types.ts`), `GEAR_SLOTS`
(`src/types/api.ts`), the catalog loader, and types. So the fight simulation, the gear solver and the fight
XP formula are shared.

**Re-implemented**, each with rules that differ from the engine's:

| # | In the atlas | Engine counterpart | Difference |
|---|---|---|---|
| 1 | hypothetical character: HP `115 + 5·L`, every other base stat 0, every skill = L (`scripts/atlas/combat.mts:9-18`) | base stats = API totals minus worn gear (`src/sim/stats.ts:65-75`) | the formula exists only in the atlas |
| 2 | craft XP `craftXpOf` (`scripts/atlas/econ.mts:120-130`) | `craftXp` (`src/plan/xp.ts:9-15`) | same table, but the atlas gives **refining recipes (mining, woodcutting) ×0.1** and has no wisdom term; the engine has no refining rule |
| 3 | gathering XP `gatherXpOf` with its own base table (`econ.mts:131-132`) | none — the engine picks the highest-level node (`src/plan/hive/skills.ts:48-55`) | the atlas ranks by XP per hour; the two also disagree at a gap of exactly 10 levels |
| 4 | XP needed per level, a hard-coded table (`econ.mts:7`) | none — the engine reads `max_xp` from the character | matches the fixture on the six points checked |
| 5 | best XP monster (`scripts/atlas.mts:31-49`) | `trainingMonsterFor` (`src/state/queue.ts:649-663`) | atlas: **safe** win, level window L−9…L+12, no bosses, free static tiles only, no potions. Engine: any **win**, up to L+10, any type, anything on the map including live events, potions owned |
| 6 | seconds per kill `killFor` (`econ.mts:11-27`) | `FIGHT_SEC` 40, `SEC_PER_ACTION` 30, measured lane pace | a fourth figure (C.5) |
| 7 | seconds per unit of an item `cost()`, 8 levels deep, with NPC currencies and coins (`econ.mts:35-64`) | `unitSec` (`queue.ts:691-708`), `unitActions` (`plan/xp.ts:30-44`) | the atlas ignores recycling returns and bank stock |
| 8 | rarity tiers by raw drop rate: ≥ 50 plus, ≥ 500 special (`scripts/atlas/model.mts:109`) | `RARE_ACTIONS` 50 on rate ÷ mean quantity, strictly greater (`plan/xp.ts:23`, `:51`) | a 1-in-50 drop is "plus" in the atlas and "common" for the recycle rule |
| 9 | item sources `sourcesOf` (`model.mts:111-158`) | `itemSources`, `fieldSource`, `gatherSourceFor` | a fourth enumerator, the only one that knows achievements and tasks |
| 10 | map reachability by breadth-first search from tile (4, 1) (`model.mts:16-91`) | none — `nearest()` is Manhattan distance (`src/state/loopkit.ts:61-76`) | the engine has no notion of reachability |
| 11 | best tool `bestTool` (`econ.mts:135-148`) | `jobGear`'s tool pick + `canEquip` | the atlas hard-codes "greater than" for every condition and ignores `altar_doll` |
| 12 | potion rule in the progressive pools (`combat.mts:86-96`) | brewing escalation (`src/plan/jobgear.ts:174-186`), fleet analysis (`src/plan/fleetcheck.ts:103-108`) | three acceptance tests |
| 13 | solver options: an owned *set*, no quantities (`combat.mts:92`, `:132`) | owned quantities passed (`jobgear.ts:142`, `:164`) | without quantities any ring may be worn twice (`src/plan/bis.ts:255`) |
| 14 | seconds per tasks coin `calibrateCoin` (`econ.mts:68-85`) | `actionsPerTask`, 2.5 + 1 coins per task (`src/plan/hive/tasks.ts:25-30`, `:96`) | different models |

*Where the atlas and the engine disagree in practice.* (1) Gathering at skill 35–39: the atlas trains on
`dead_tree` / `gold_rocks`, the engine targets the event-only level-35 nodes and skips (C.3). (2) Combat
target: for a monster that is a win but not a safe win, the Roadmap names the atlas's safe target while the
`train combat` item fights the unsafe one. (3) `craftTrain.alchemy` is computed (`scripts/atlas.mts:92`) and
used by nobody (`src/plan/roadmap.ts:243`).

---

## D. Shared stock and the rules that protect it

There is no reservation of bank stock anywhere. Each rule below is a filter at one call site. All **V**
unless marked.

### D.1 Rules and their bypasses

| Rule | Enforced at | Paths that consume the same thing without the check |
|---|---|---|
| **`keep` list** (working stock is not banked) — `keepOf` `queue.ts:185-205` | `bankOff` (`exec.ts:53-63`); the swap sweep and reset stash (`jobgear.ts:377-412`, `:459-477`) | the list belongs to the **head item**. When another writer inserts ahead (B.3), the new head's list does not cover the old head's materials, and the next swap at the bank deposits them. Not lost, but re-fetched. The `deposit-all` item ignores `keep` by design (`queue.ts:444`). |
| **`trainKeep`** `queue.ts:796-814` | same | recomputed from the current recipe pick every tick; a pick that changes on a bank echo un-protects the previous pick's materials. **A helper keeps only its tools** (`:795-803`), so the raw stock it has just withdrawn to refine is swept back at the bank — the 7-hour ping-pong of 2026-11-17 (B.4-7). |
| **Pinned artifacts** `jobgear.ts:43`, `:433-442` | the differ, for worn copies | manual unequip; a user `sell`/`recycle` item. Neither is automatic. |
| **Task deliverable is never eaten or banked** `exec.ts:332`, `queue.ts:190` | food choice, `keep` | **`giveUpTask` hands over BANK stock of the task item** with no floor (`queue.ts:1045-1057`), and so does the `deliver` item (`:545-552`). If the task item is something the fleet stocks on purpose — potions, bars, cooked food — the stock goes to the tasks master. |
| **"Gear is never sold"** | only as a whitelist in `merchantOrder` (`plan/events.ts:63`: `SELL_FLOORS[code] ?? Infinity`) | **hive earn-gold**: `sellValue` adds a `sell` for every drop that has a gold buyer (`plan/hive/gold.ts:76-87`) and tops it up with **all bank stock** of that code (`:199-207`). Twelve equippable items have a gold buyer (the Nomadic Merchant), ten of them monster drops such as `forest_ring`, `wolf_ears`, `old_boots` (catalog). The hive's `npc_sell` achievement objective sells bank stock of its target (`plan/hive/achievements.ts:343-351`). User `sell` items and the bank's Sell button are manual. |
| **`SELL_FLOORS`** `plan/events.ts:17` | when the order is **planned** (`:63`) | the quantity is frozen into the item; at execution the handler sells `min(banked, left, free space)` (`queue.ts:285-291`). Stock that dropped between planning and selling — a brew used the sap — is sold below the floor. Earn-gold applies no floor at all: it would sell every ore, wood and herb in the bank for 1 g each when the matching merchant is up. |
| **`autoRecyclable`** (never recycle a rare-ingredient product) `plan/xp.ts:49-52` | train loop (`queue.ts:833`), train picker (`:766`), hive skill batches (`plan/hive/skills.ts:183`), hive recycling objective (`plan/hive/achievements.ts:320`) | the rule protects rare *ingredients*, not gear in use. **The hive's recycling objective recycles "the most-stocked recyclable in the bank"** (`achievements.ts:314-331`) — that is banked gear, which under the bank-reset model is the fleet's wardrobe whenever characters are gathering. Achievement goals are auto-proposed and, in continuous mode, auto-launched. Manual `recycle` ignores the rule by design. |
| **`healingFoods`** (a food that is an ingredient is never eaten) `consumables.ts:39-48` | every food choice | — |
| **`gearMaterial`** (never cook what feeds a gear recipe) `consumables.ts:50-53` | the cook and gather tiers (`:139`) | the rule covers *ingredients of gear*. Nothing protects **finished food or raw fish that someone else needs**: a fighter withdraws the best stocked food (`exec.ts:367-374`) or cooks from stocked raw ingredients (`consumables.ts:140-144`) — including the fish a cooking trainer's helpers just banked, a hive order's cooked output, or the item another character's offering asks for. This is the mushroom incident one step along. |
| **`GOLD_FLOOR`** 20,000 `plan/events.ts:20` | the event merchant's budget (`:61`) | hive purchases budget the whole vault (`plan/hive/acquire.ts:65`, `:196-200`); the hive's `npc_buy` objective (`achievements.ts:336`); the user's `buy`; bank expansion. And B.4-1: a `buy` parks its gold in a pocket — 72,000 on 2026-11-17 — until the next deposit. |
| **Coin reserve / `coinDemand`** `plan/hive/tasks.ts:80-84` | whether farm-tasks goals are *proposed* | every spender: `giveUpTask` cancels for a coin taken from the bank (`queue.ts:1064-1074`) — a `task-loop` at a master whose tasks the character mostly cannot do pays one coin per attempt until the bank has none; the tab's `cancelTaskWithFee`; hive purchases in tasks coins (`acquire.ts:198-200`, `:368-371`). |
| **Hive virtual bank** `plan/hive/acquire.ts:64`, `:81-88` | inside **one** compile | invisible to everything else that draws on the bank: train loops and helpers (`bankQty`, `stockOf`), offerings (bank first, `queue.ts:1234-1241`), food and potions, `giveUpTask`, other characters' gear swaps, a merchant sell. The `wait` craft and the barrier recompile absorb the shortfall by gathering again. |
| **One-character claims** | earn-gold sells (`gold.ts:185`, `:202-205`); the hive's bank-remainder craft (`acquire.ts:426-435`); helpers count each other's loads (`queue.ts:899-902`) | nothing else claims. Potions: the differ withdraws up to 100 of a potion for one slot (`jobgear.ts:552`, `:562-569`) — the first fighter to reach the bank takes the whole stack. |
| **A craft offering never takes its product from the bank** `queue.ts:1308`, `:1384` | offerings | every *other* offering takes its requirement from the bank first (`:1234-1241`), without a floor. |
| **Gear comes only from the bank** `jobgear.ts:66-76` | the gear swap | the hive, coverage, the roadmap and the fleet analysis count gear in other characters' hands as available (C.2). |

### D.2 Incidents waiting to happen

Ranked by how little it takes.

1. **A failed bank read empties the local bank.** `reconcile` turns a failed `/my/bank/items` into `[]`
   (`sync.ts:98`) and assigns it (`:113`). Until the next bank echo every planner sees an empty bank: gear
   sets plan as if nothing is owned, `craft` items fail "no materials", the train picker re-ranks, the
   hive's ownership checks change. Triggered by the Refresh button or a boot during a hiccup. **V**
2. **Hive earn-gold sells dropped gear and raw materials** (D.1). Needs: an earn-gold goal and the right
   event merchant. With no merchant up, the same goal's sell items are skipped ("no merchant buys …") and
   a gather lane earns nothing — all gold buyers of drops are event merchants (catalog) while the lane is
   priced as if they were always there (`gold.ts:76-87`; `npcGateMet` passes any NPC without a static tile,
   `acquire.ts:45-49`). **V**
3. **Hive recycling objective recycles banked gear** (D.1). Needs: continuous mode, or one click on a
   proposed achievement. **V**
4. **Fighters eat or cook what a cook or an order stocked** (D.1). Needs: a fighter out of food while raw
   fish or cooked food sits in the bank. **V**
5. **Coin drain through `giveUpTask`** (D.1). Needs: a `task-loop` at a master that often hands out tasks
   the character cannot do. See G for the count of cancels in the log. **V**
6. **A train loop recycles the character's own tool.** The loop recycles every copy of the product code
   in the bag (`queue.ts:831-838`), and `trainKeep` deliberately does not protect a tool with the
   product's code (`:803`). If the recipe being trained is the tool the character itself carries — a
   woodcutter training weaponcrafting on axes — and that tool is in the bag at that moment (unequipped for
   a drop hunt), it is recycled with the batch. **I** — reasoned from the code, not seen.
7. **Offerings re-read every minute around a missed rotation.** `todayOfferings` treats a cached day as
   stale once `expires_at` has passed and the read is older than 60 s (`offerings.ts:17-22`). If the
   server still returns the old day, five characters re-read once a minute — the whole 300/h account
   budget. The 00:05 trigger avoids the usual case. **I**
8. **`getAllPages` never gives up on 429** (`client.ts:156-159`). A boot during a rate-limit window loops
   until the window ends. **V**

---

## E. The stated invariants

| # | Invariant (`CLAUDE.md`) | Verdict | Evidence |
|---|---|---|---|
| 1 | `api/client.ts` is the only `fetch` to the game | **holds** | the only `fetch` calls in `src/` are `client.ts:76` (game), `catalog/load.ts:10` (local data file), `lib/remote.ts:31` (local rpc). The season tools in `scripts/` call the game on purpose. |
| 2 | `act()` is the only action chokepoint | **holds** | the only action URL is built at `api/actions.ts:16`. Note that `act` is itself exposed over rpc as a generic call (`:112`). |
| 3 | `applyActionResult` is the only place responses fold into state | **holds with exceptions** | other writers of server-owned state: `reconcile` (`sync.ts:105-115`), the two bank-race corrections that delete codes from the local bank (`exec.ts:197`, `:268`), `loadOfferings` (`offerings.ts:28`), `loadAchievements` and `loadPendingRewards` (`sync.ts:150`, `:166`), the event poll (`:85`), the clock's expiry pruning (`store.ts:255-258`). All are reads or documented corrections. |
| 4 | nothing polls the account except `refreshEvents` | **holds with exceptions** | `refreshEvents` is the only timer that reads (`sync.ts:58-75`) and it reads a data endpoint. Reads that are not timers but recur: one `/my/{name}/offerings` per character per day through the daily trigger; one achievements read per barrier of an achievement goal (`hive.ts:535-540`); the offerings re-read on 574/576/577 (`queue.ts:1372`) and the once-a-minute case in D.2-7. The boot sync is 6 endpoints, not the 5 listed (`sync.ts:95-104`, `:114`): `/accounts/{name}` is fetched, persisted, synced and read by nobody. |
| 5 | `plan/` is pure: no signals, no `state/` imports, no API | **holds with exceptions** | no `plan/` file imports from `state/` or `@preact/signals` (A.2). Exceptions: it transitively imports `api/client` (A.2, coupling 1); `plan/hive/tasks.ts:81-82` reads the atlas from module state; four modules keep permanent caches (A.6). |
| 6a | the tab never runs the engine | **broken in two places** | (1) `cancelTaskWithFee` runs a move → withdraw → move → cancel chain in the tab (`CatalogPanel.tsx:497-508`) on `loopkit.moveTo`/`step`, which have no guard (`loopkit.ts:44-54`); closing the tab mid-chain strands the character. (2) Hive planning runs in the tab: `refreshProposals` has neither guard nor expose (`hive.ts:161-163`), `compileGoal` runs there, and the resulting plan is posted to `launchHive`, which checks only that it has a wave and no infinite item (`:721-726`). The BIS solve also runs on the tab's main thread in the Monsters tab and the Sim playground (`TableTabs.tsx:515-530`, `SimPlayground.tsx:163-188`). |
| 6b | every UI-called mutator has the `IS_SERVER` guard and `expose` | **holds with exceptions** | all 34 exposed functions have the guard. The exceptions are the unguarded ones in 6a. Two UI sites fire order-dependent rpc pairs without awaiting (`FleetView.tsx:69`, `CatalogPanel.tsx:284-285`); `RoadmapTab.tsx:37-38` documents that very hazard and awaits. |
| 6c | every server-owned signal the UI reads is in `SYNCED` | **holds with one exception** | `hiveProposals` is written on the service by `moveOn`/`nextGoal` (`hive.ts:644`, `:663`) and in the tab by `refreshProposals`; it is not in `SYNCED`, so the service's copy — a multi-second synchronous sweep — reaches nobody. |
| 6d | the UI never writes a synced signal | **holds** | no write to a `SYNCED` signal in `src/ui/**`, `app.tsx`, `main.tsx`. Pin persistence, though, is driven from the UI: `togglePin` does not save; both call sites follow it with a `saveState()` rpc (`CharacterPanel.tsx:47`, `FleetView.tsx:292`). |
| 7 | runner persistence does not go through `persist.ts` | **holds** | queue, hive, event orders, sim window and the daily marker own their keys (A.4). |
| 8 | the hive performs no API calls except `loadAchievements` | **holds** | `state/hive.ts` imports no API module; the one read is at `hive.ts:538-539`. |
| 9 | queue items are the only execution vocabulary | **holds with exceptions** | executors outside the queue: `cancelTaskWithFee` (6a); the manual group fight (`GroupFight.tsx:115`) and every manual action button (by design). `giveUpTask` acts as a small planner inside an item. |
| 10 | hive waves hold no infinite items and at most one assignment per character | **holds with documented exceptions** | checked only at launch (`hive.ts:723-726`); a recompiled wave is not re-checked (`:547-571`). The runtime itself adds infinite fillers (`:448-456`) and second assignments for stolen slices (`:440`). |
| 11 | the bank is the single source of truth for gear | **holds for the gear swap, broken for planning** | `jobGear` uses bank + own (`jobgear.ts:66-76`). The hive, coverage, roadmap and fleet analysis count gear worn or carried by other characters (`plan/hive/ctx.ts:64-78`). See C.1's second state. |
| 12 | one sync, then no polling; state from echoes | **holds** | with the exception in D.2-1: a failed bank read is not "keep what we have". |
| 13 | stop sticks (a reload never resurrects a stopped queue) | **holds** | `queue.ts:1542-1548`, `hive.ts:761-768`. |
| 14 | the service binds its port before `boot()` | **holds** | `server/main.ts:216-225`. |
| 15 | `/rpc` and `/events` accept only local `Host`/`Origin`; `/rpc` needs JSON | **holds** | `server/main.ts:140-152`, `:201-206`. |
| 16 | big components do not read the 4 Hz clock | **holds** | only `Cooldown.tsx:31` and `EventsPanel.tsx:42` read `now`. |

---

## F. `CLAUDE.md` against the code, and dead code

### F.1 Stale or wrong in `CLAUDE.md`

| Claim | Reality | Evidence |
|---|---|---|
| "the hive is kept but frozen" | changed on 11-12 and 11-17; 41 goals launched in November, the last on 11-15; a leftover item of it still running on 11-17; reachable by six paths | B.5 |
| "Merchants: sell … then buy the `WISHLIST`" | the selling works; the buying has never happened | B.4-1 |
| "exactly one authoritative read of `/my/characters`, `/my/bank`, `/my/bank/items`, `/events/active`, `/my/pending_items`, account" (and "5 reads" in `server/main.ts:32`) | six endpoints; the account one is unused | `sync.ts:95-104`, `:114`, `:128` |
| "Actions are ~2000/hr" | the docs' figure recorded on 2026-11-17 is 5,000/h | memory note `request-budget`; not determinable from code |
| "map tiles in `MapView` have no fallback — they must ship in the build" | `MapView` falls back to the CDN | `src/ui/MapView.tsx:29-34` |
| "`insertItem` … the hive-only" (and the code comment `queue.ts:133`) | event orders use it | `eventorders.ts:79` |
| "🛡 Prepare puts a `prepare` item at the front of each picked queue and starts it" | true only because the button is disabled while the queue runs; `addItem` never inserts at 0 on a running queue | `GroupFight.tsx:41`, `queue.ts:114` |
| "the runner … never re-appended by 🔁" for `prepare` | true, and also: it is dropped at restart | B.4-3 |
| "`hiveProposals` … stays local (pure UI state)" | the service writes its own copy | E-6c |
| "the hive itself performs ZERO API calls except … a cold `proposeGoals` is … behind an explicit button" | `proposeGoals` also runs on the service after every goal end in continuous mode, and unconditionally in `moveOn` when nothing launches | `hive.ts:644`, `:662` |
| "`handOffToTasks` sends every idle participant back to its pinned training" | only participants whose queue is stopped and holds no user items; the rest are left as they are | `hive.ts:592-594`; B.3 X-6 |
| "An auto-launch keeps user items on participants' queues (the hive appends behind them)" | it also stops every participant's queue and clears 🔁 | `hive.ts:734`, `:490` |
| "a withdraw hitting 404/478 … drops the code from the local `bankItems` signal" | true; not said: that this leaves every other planner with a wrong bank until the next echo | `exec.ts:197`, `:268` |
| "`api()` handles 429" | four attempts in `api()`, unbounded in `getAllPages` | `client.ts:101-116`, `:156-159` |
| "craft XP … zero once the skill is 10+ above the item" | the code says more than 10 | `plan/xp.ts:10` |
| "Game codes 574–577/598 are ≥ 500, which runLoop would treat as an outage — runOffering catches them itself" | true for offerings; 598 anywhere else is still treated as an outage | B.4-5 |
| "The tab never runs the engine" | E-6a | |
| "Everything lives in a tab — no drawers left except the Map tab's building drawer" | several headers still describe drawers | `HivePanel.tsx:1-3`, `plan/coverage.ts:1` |
| "`sync.ts` defaults to the first [character]" | in the tab that is `synced.ts:90-93`; the service-side writes at `sync.ts:40`, `:109-110` are dead | |
| the file itself | the copy loaded at the start of this session contained a "Working by tasks" section; the file on disk does not (it is 124 lines) | see the report's Notes |

### F.2 What the code does that `CLAUDE.md` does not mention

- The `buy`, `prepare`, 🔁-spin and head-swap behaviours in B.4.
- `launchHive` stops all participants; dispatch clears 🔁 (B.2 H1, F2).
- A finished `offering` item joins every 🔁 rotation for good (B.3 G7).
- Helpers never stop producing (`queue.ts:900-904`); a help item is recognised only at the head (`:774-778`).
- `act` is exposed as a generic rpc; `saveState` is exposed so the UI can persist pins.
- Smoke-test services write into the same `logs/dev.log` as the real one (G).
- `giveUpTask` uses bank stock and bank coins (D.1).
- Alchemy is trained only by gathering (`queue.ts:605`, `store.ts:13-18`).
- The fight gate requires a win, not a safe win, while its error text says "not a safe win"
  (`exec.ts:490`, `queue.ts:436`).
- The 4 Hz clock runs in the service too (`store.ts:251`).
- A missing catalog file makes the service fall back to the live API at boot (`catalog/load.ts:27-34`).

### F.3 Dead, orphaned, leftover

**Exports nothing uses** (name appears in no other file; **V** by scan, each checked by grep):

| Item | Where |
|---|---|
| `getToken` | `src/api/client.ts:25` |
| `atlasMonster`, `bandOf` | `src/catalog/atlas.ts:104`, `:111` |
| `fleetSkill`, `hiveCraftFocus` | `src/plan/hive/ctx.ts:28`, `:38` |
| `canWinWithOwned` | `src/plan/jobgear.ts:132` |
| `waitCooldown` | `src/state/loopkit.ts:23` |
| `Badge` type | `src/types/catalog.ts:148` |
| `ActionRunner.cooling` | `src/ui/useAction.ts:9`, `:41` |
| exported only for a check script | `trainRecipe`, `assistPick`, `canObtainOffering`, `offeringPick` (`queue.ts:746`, `:880`, `:1284`, `:1303`); `planSteal`, `rebalanceWave`, `releaseStarved`, `nextGoal` (`hive.ts:353`, `:414`, `:317`, `:651`) |

**Queue vocabulary nothing creates or reads**

| Item | Finding |
|---|---|
| `QUEUE_KINDS` | used only as the load filter; `prepare` missing from it (B.4-3) |
| `gear` item `desired` (a frozen slot map) | no code creates one any more; every creator passes `job` (`queue.ts:1485`, `plan/hive/skills.ts:162`, the Add form). Read at `queue.ts:448`. |
| `fight.keep`, `gear.keep`, `deliver.keep` | read by `keepOf` (`queue.ts:187`); no creator found in `src/` |
| `withdraw.x/y`, `craft.x/y`, `sell.x/y`, `recycle.x/y`, `buy.x/y`, `gather.x/y`, `train.x/y` | read by the handlers; set only by the Add form's "pick on map" for some kinds — not checked field by field (**I**) |
| `AcquisitionStep` kind `train` | created at `queue.ts:418`, handled at `exec.ts:298-308` — live, but it is a gather with a different note |
| `ctxOf`'s old `FoodSpec` tolerance | `queue.ts:208-210` — for queues persisted before 2026-07-13 |

**Leftovers of removed layers**

| Leftover | Where |
|---|---|
| planner/campaign layer (removed 2026-07-06) | file names `plan/acquire.ts`, `plan/types.ts` (`AcquisitionStep`); comments in `sim/validate.ts:6-7` ("see fight.ts"), `sim/combat.ts:1` ("the whole planner rests on"), `plan/hive/skills.ts:1-6` ("the legacy `train` item", "the old traincraft loop") |
| browser-era migration | `importBrowserState` (`synced.ts:97-118`), `importLocal` + `fresh` (`server/main.ts:50-70`, `:101`), marker keys — live code for a one-time move that happened on 2026-11-05 |
| legacy single craft pin | `persist.ts:24`, `:48` |
| GitHub Pages | comment at `store.ts:150-153` |
| browser-tab engine | `import.meta.hot` self-reload at `queue.ts:1604` and `hive.ts:854`; "may spin the tab" at `queue.ts:1404`; "runs … in the browser" at `sim/combat.ts:4-5` |
| roster/card UI | wording in `Cooldown.tsx:21`, `MapView.tsx:314`, `store.ts:54`, `:98`, `exec.ts:45`; CSS selectors `.card*` in `styles.css:152-180`, `:556-565` |
| step-1 comments | `api/actions.ts:51-52`, `api/client.ts:3-4` ("ported from web/index.html") |
| stale hive UI text | `HivePanel.tsx:334-338`, `:74` describe the task-loop hand-off replaced on 2026-11-17 |

**Scripts and tools that no longer work or no longer fit**

| Item | Finding | |
|---|---|---|
| `.claude/skills/verify/drive.mjs` (238 lines) | browser-era: seeds the token into the tab's storage (`:60`) and reads `ammo:v1:queue` / `ammo:v1:state` from the tab (`:22-26`); both live on the service now, so it throws at `:102` before doing anything. Its default URL is the live port (`:12`). | V |
| `.claude/skills/verify/hive-probe.mjs` (70 lines) | reads `.env` (`:11`), targets the live service on 5173 (`:20`), and its in-page `loadAchievements()` becomes an rpc on the live service — a real account read (`:33`). Works only in dev mode. Not marked as browser-era in `SKILL.md:104-107`. | V |
| `.claude/skills/verify/SKILL.md` | sections on the removed planner (`SKILL.md:71-73`, `SKILL.md:80-86`), a "＋ Add" button that no longer exists (`SKILL.md:75`), a tab list without `roadmap` (`SKILL.md:34`), three different counts of boot reads (`SKILL.md:20`, `SKILL.md:95`, `hive-probe.mjs:4`), and an instruction to put the `.env` token into an environment variable (`SKILL.md:101`) | V |
| `scripts/check-idle.mts` | passes, referenced by nothing; its two "no task farming at 526 coins" cases cannot fail on the saturation rule — the synthetic character suits no master, so the result is `[]` either way | V / I |
| `scripts/check-doll.mts`, `check-recycle.mts` | their headers and `CLAUDE.md` promise more than they assert ("never for fights"; "asserts the split") | V |
| `tsconfig.json:19` | `include` is `src` and `vite.config.ts`: **`npm run typecheck` does not cover `scripts/` or the verify skill** | V |
| `package.json` | no script runs the checks; each is started by hand from the command in its header, all pointing at the same `/tmp/x.db` | V |
| `.env.example` `PORT` | read at `src/server/main.ts:25`, before `.env` is loaded at `:44` — a `PORT` in `.env` has no effect | V |
| `src/sim/combat.ts:54` | the comment says pass `() => 0` for a no-crit run; the roll is `rng() < crit` (`:323`), so `() => 0` always crits. The check script correctly uses `() => 1`. | V |

**Files at the repo root and in data directories**

| Item | Finding |
|---|---|
| `game.db` (1,085,440 bytes, 2026-06-28) | git-ignored, never tracked, referenced by no code — a leftover of the pre-rewrite client |
| `.ammo/atlas.db`, `-shm`, `-wal` | created by `npm run atlas` (`package.json`), whose only storage access is the token read at import; sits next to the real storage file |
| `public/data/task_rewards.json` | fetched by `scripts/fetch-data.mjs`, loaded by no code (one comment mentions it, `src/plan/hive/score.ts:19`) |
| `public/data/badges.json`, `events.json`, `npc_items.json`, `manifest.json` | not loaded by the engine; used only by the asset script, the atlas generator and the README |
| `docs/game-actions.md` | tracked, referenced by nothing; says `fight` has no participants support (`docs/game-actions.md:39`, `docs/game-actions.md:181`) — it has since 2026-11-11 |
| `README.md` | no Roadmap tab, no event poll ("no polling", "re-sync only on Refresh"), no `npm run atlas`; says `npm run assets` also fetches map tiles (it does not) |
| `scripts/fixtures/roadmap-fleet.json` | committed; contains the real account name in every character record |
| `docs/tasks/roadmap-tab.md` | untracked; names files that no longer exist (`tools/atlas-v1/`, `Season 9 Progression Atlas.html`) |

---

## G. Errors seen in practice

Source: `logs/dev.log`, scanned whole with grep and awk (no sampling for the counts). Counts marked ✓ were
re-run for this document; the others come from the same full scan and were spot-checked against the quoted
lines. Context excerpts around individual lines were sampled.

### G.1 The log itself

- **Size and period.** 59.4 MB, 832,328 lines at the time of the scan, 2026-07-14 09:20 → 2026-11-18 10:49
  UTC. 55,166 lines are from 07-14/07-15; 777,165 from 11-03 → 11-18; nothing in between (111 days).
- **Line kinds.** notes 367,083 · API calls 230,573 · successful log entries 230,081 · info 1,976 · head
  changes 1,893 · error log entries 450 · service starts 52 ✓ · failed rpc 4.
- **Processes.** 170 distinct process tags. 118 are browser-tab loads from before the service existed
  (up to 11-05 09:20; 62 on 11-04 alone). 52 are service starts ✓: **28 on port 5173 (the real service)
  and 24 on port 5199 (smoke tests)**.
- **Smoke tests write into the same file.** The log directory is taken from the working directory
  (`src/server/main.ts:27`, `:40-41`), so a test service appends its lines — mock errors, a fake character
  ("Ghost"), all 4 rpc failures — to the real log. Example: line 775011, `[d6ua] … -> 400 mock: actions disabled`.
- **Blind spots — not determinable from the log:** 429s are retried before anything is logged
  (`src/api/client.ts:113-116`); paged reads log nothing at all (`:141-166`), so the bank read, the
  pending-items read and the 5-minute event poll are invisible; a hive goal's `incomplete` carries no reason;
  "nothing to do" decisions of the hive and of event orders are not logged; an unchanged note is logged once,
  so a long hold shows as a gap, not as repetition.

### G.2 Our logic was wrong

| # | Cause | Count and dates | Evidence | Responsible code |
|---|---|---|---|---|
| 1 | **Helper withdraw ↔ deposit ping-pong** | 2026-11-17 11:36 → 18:24: 1,668 exact withdraw→deposit pairs (spruce wood 701, ash wood 748, iron ore 218); four helpers made 1,946 withdraws + 1,937 deposits out of 6,911 actions and 4 crafts. That day 53% of all actions were productive (other November days 62–88%). 98 of the day's 404s on withdraws are fallout. | lines 776663–776672 ✓ | B.4-7 |
| 2 | The same sweep rule, earlier | 07-14 10:14–10:33: raw beef, 416 actions; 07-14 09:21: slimeballs, ~110 actions; 11-04 11:23–11:33: tasks coin, 84 actions | lines 1567–3607, 85253–85734 | the bank-tile sweep, `src/plan/jobgear.ts:603-604`; fixed case by case in `src/state/exec.ts:94-129` and `src/state/queue.ts:1059-1061` |
| 3 | **`buy` completes without buying** | 11-17 23:32: 72,000 gold withdrawn for "Buy 5× Lost World Map", no purchase; the gold stayed in the pocket until 01:43. No `lost_world_map` purchase exists in the log. Also 11-13 12:45. | lines 808944–809013 ✓ | B.4-1 |
| 4 | **486 after a 500 pauses the queue** | 2 times (11-09 23:50, 11-10 00:00), 15.5 character-hours idle | line 338090 ✓ | B.4-8 |
| 5 | **A win is not a safe win** | 39 lost fights in 27,141 (07-14 7, 07-15 3, 11-06 16, 11-07 13; none after 11-07). Third lost 16 of 46 against sheep on 11-06. The "two losses in a row" stop fired **0 times** ✓ — losses alternate with wins. | line 205844 | the gate asks for a win on the expected-value pass (`src/state/exec.ts:490`); the stop needs consecutive losses (`:498-499`) |
| 6 | Paused on "not a safe win" | 13 pauses: task-loops 10 (11-03, 11-04; 320 + 672 minutes idle overnight), helpers 3 (11-06, 11-07; 1,093 minutes) | line 188914 | a helper or task is given a hunt the worn set cannot win; C.1 |
| 7 | Task dead ends | 7 pauses "no way to acquire Small Health Potion" (11-04, 489 minutes idle), then **28 tasks cancelled for a coin** ✓: 21 of them "no way to gather Trout" between 11-12 and 11-18 on all five characters — about 3 coins a day | line 445579 | `giveUpTask`, `src/state/queue.ts:1037-1077`; D.2-5 |
| 8 | Hive goals ending incomplete | 5 of 52 ✓ (G.5) | lines 12116, 83542, 86219, 114746, 661483 | — |
| 9 | Equip refused: `novice_guide` below level 10 | 5 pauses, 11-06 08:50–09:02, an 8-action equip → 496 → deposit → withdraw cycle | lines 165207–165322 | fixed the same day (`src/plan/jobgear.ts:106`) |
| 10 | Unequip refused at low HP (483) | 21 (2 paused the queue on 07-14; 19 healed and retried since) | — | handled in `src/state/exec.ts:168-177`; the HP and the item's bonus are both known beforehand |
| 11 | Cooldown not waited after a restart | 335 answers "still on cooldown" (499); 322 are a character's first action in a new process | line 6389 | the runner acts first and waits after (`src/state/loopkit.ts:44-47`); `api()` absorbs it |
| 12 | Rest after every fight | 27,144 fights, 26,872 rests; peak 1,835 requests in one hour (11-16 22h) | — | every HP deficit is healed before the next fight (`src/state/exec.ts:482-487`) |
| 13 | Daily offerings fired twice in one day | 11-16 14:06 and 16:11 | — | the day the trigger was deployed and its time changed |
| 14 | Crafts queued without stock | 10 pauses "no … in bag + bank", 07-14 → 11-16 | — | mostly user-queued |

### G.3 The game said no, and the client handled it

| What | Count | Handling |
|---|---|---|
| withdraw: item not found (404) / not enough (478) | 175 / 8 | the bank-race handler re-plans; never paused (`src/state/exec.ts:191-200`, `:263-271`). The 98 of 11-17 belong to G.2-1. |
| bank full (462) | 1 (11-13) | paused 30 minutes; two expansions bought by hand |
| item skipped, target not on the map | 2 ✓ (07-14: sell golden egg / golden shrimp, no merchant) | by design |
| offering category skipped | 27 (11-16: cooked bass ×8, dead wood ×2; 11-18: 17 "not accepting it") | by design; 12 offerings accepted and never completed all predate the "accept only what can be completed" rule |
| never seen | 461, 497, 498, 598, 574–577, code 0 | — |

### G.4 Infrastructure

| What | Count | Outcome |
|---|---|---|
| transport errors, retried | 151 (07-14, 11-04, 11-13, 11-17) | never exhausted the retries; no code-0 error ever reached a queue |
| server 500 ("Fatal error") | 46 in 10 bursts, 11-03 → 11-17 | 41 held 60 s and succeeded; 3 paused on 11-03 (before the hold existed); 2 became G.2-4 |
| real-service starts | 28 over 14 days | the shortest gap between two is 20 s, once; no crash loop; every start follows normal activity; the 8 latest commits each have a start within 5 minutes |
| unhandled rejections, uncaught exceptions | **0** | — |
| failed rpc on the real service | 0 (the 4 in the log are from smoke tests) | — |
| outage | 11-05 01:13 → 08:57, a browser tab that died with two queues running | the reason the engine moved to a service |

### G.5 Hive, events and idle time

- **Hive: 52 goals launched ✓ — 37 done ✓, 5 incomplete ✓, 8 abandoned ✓, 2 with no end line.** By kind:
  craft-order 45, farm-tasks 3, achievement 3, level-skill 1. By day: 07-14 9, 07-15 2, 11-03 8, 11-04 6,
  11-05 1, 11-07 4, 11-08 4, 11-09 3, 11-10 1, 11-11 1, 11-12 1, 11-13 3, 11-14 2, 11-15 7; none since.
  Steals 13, fillers 131, starved crafts released 44, hand-offs to a task-loop 90, to pin training 1, stall
  guard 1 ✓ (Craft 5× Life Ring, 11-15 — the day fighters were cooking and eating the order's mushrooms).
- **Events:** 16 spawns logged since the poll went live on 11-17. Four merchant orders were created (one in
  a smoke test). Selling worked (golden eggs, golden shrimp, 188 shells); the one buy did not (G.2-3). **No
  monster or resource order was ever dispatched**, though eight such events spawned — whether "nobody
  safe" or "nobody free" is not logged. For the Nomadic Merchant of 11-17 10:46 the real service, restarted
  at 10:53, logged neither the spawn nor an order — cause not established.
- **Idle time.** Gaps of 10 minutes or more between a character's successful actions: 149 gaps, 254.8
  character-hours out of about 1,923 covered (13%). By first cause: queue finished 141.8 h · queue paused
  ~49 h · resumed after a reload (mostly the 11-05 outage) 16.7 h · stopped by the user 16.6 h · the 486
  chain 15.5 h · waiting for materials ~10.6 h (longest 213 minutes: "waiting for Yellow Slimeball",
  11-08). **The largest single cause of idle characters is a finite queue that ran out.**
- **Nothing sold that should not have been:** every NPC sale in the log is golden egg, golden shrimp or
  shell. The 86 recycling calls are all common-tier items. The hazards in D.2-2 and D.2-3 have not happened.

---

## H. Complexity

### H.1 Largest files and functions

| File | Lines | Responsibilities in one file |
|---|---:|---|
| `src/state/queue.ts` | 1,606 | queue store and persistence · user edit ops · the runner loop · 19 item handlers · field sourcing · the craft-training economics (`trainRecipe`, `unitSec`, `stockOf`, `batchRuns`) · helper coordination · task dead-ends · offerings · the daily scheduler · pin training · rpc surface |
| `src/state/hive.ts` | 856 | persistence · derived status · observer · pace measurement · work stealing · fillers · dispatch · barrier · hand-off · continuous mode · user actions · resume |
| `src/plan/jobgear.ts` | 606 | job sets (fight, gather, craft) · pinned artifacts · bag rule · the swap differ |
| `src/state/exec.ts` | 505 | gear swap step · `runStep` · food · potions · the fight round |
| `src/plan/roadmap.ts` | 469 | seven milestone generators in one function · `coinDemand` · next steps |
| `src/plan/hive/acquire.ts` | 463 | resolver · wave builder |

Functions of about 80 lines or more (line ranges from reading; **V**):

| Function | Where | Lines | Note |
|---|---|---:|---|
| `runItem` | `queue.ts:230-571` | 342 | one `switch` over 19 kinds, ~105 branch points, three levels of nested conditions inside `craft` (`:338-403`) |
| `roadmap` | `plan/roadmap.ts:168-434` | 267 | seven milestone families, closures over shared maps |
| `planAcquire` | `plan/hive/acquire.ts:63-287` | 225 | one recursive closure `need` of 178 lines with six exits |
| `nextGearAction` | `plan/jobgear.ts:422-606` | 185 | six ordered legs; pure and deterministic, so testable |
| `acquireWaves` | `plan/hive/acquire.ts:321-463` | 143 | splitting, chaining and pipelining in one pass |
| `jobGear` | `plan/jobgear.ts:154-274` | 121 | two unrelated algorithms behind one `if` |
| `fleetCoverage` | `plan/coverage.ts:89-208` | 120 | — |
| `compileObjective` | `plan/hive/achievements.ts:258-369` | 112 | one case per objective type |
| `proposeAchievementGoals` | `plan/hive/achievements.ts:101-208` | 108 | mirrors `compileObjective` case by case — the two must be kept in step by hand (`:155-156`) |
| `simulate` | `sim/combat.ts:354-442` | 89 | flat, performance-critical |
| `runWorkTask` | `queue.ts:1086-1174` | 89 | gather / fight / craft paths plus four exits to `giveUpTask` |
| `runStep` | `exec.ts:245-327` | 83 | four step kinds |
| `gearSwapStep` | `exec.ts:137-218` | 82 | — |
| `analyzeFleet` | `plan/fleetcheck.ts:63-137` | 75 | — |
| `runOffering` | `queue.ts:1317-1386` | 70 | — |
| `runLoop` | `queue.ts:1399-1464` | 66 | the only place the completion, recycle, pause and outage rules meet |
| `MapView`'s effect | `src/ui/MapView.tsx` | ~390 | one closure |

**Mirrored logic that must be kept in step by hand** (each pair is a comment saying "MUST mirror"):
`brewKeep` ↔ `provisionPotions` (`exec.ts:94-113`, `:439-457`); `foodKeep` ↔ `provisionFood`
(`:115-129`); `canObtainOffering` ↔ `obtainOffering` (`queue.ts:1283-1296`); achievement scoring ↔
compile (`plan/hive/achievements.ts:115`, `:155`); `npcGateMet` ↔ `state/access.ts`
(`plan/hive/acquire.ts:42-44`); `CRAFT_SKILLS` ↔ `CRAFT_TRAIN_SKILLS` (`plan/hive/ctx.ts:12-14`).

### H.2 Where the design keeps being patched

Dated notes are rare in the code (17 in all of `src/` and `scripts/`); the dates live in `CLAUDE.md`
(14) and in commit messages. Three measures, all pointing the same way:

| Module | Commits touching it | Comments that recall an incident | Share of dated incidents in `CLAUDE.md` |
|---|---:|---:|---|
| `src/state/queue.ts` | 41 | 14 | offerings (3 dates), skill loops, helpers, recycling, task dead-ends |
| `src/plan/jobgear.ts` | 17 | 1 (plus the long rationale blocks) | the two BIS objective changes (11-07, 11-08), artifacts |
| `src/state/exec.ts` | 13 | 11 | brew livelock, raw-beef loop, 483, bank races |
| `src/state/hive.ts` | 11 | 1 | lane pace, hand-off |
| `src/plan/bis.ts` | 10 | 5 | `canEquip` spelling, tie-break livelock, objective |
| `src/plan/queue.ts` | 19 | 2 | every new item kind |
| `src/state/store.ts` | 22 | 0 | every feature adds a signal here |

"Comments that recall an incident" = lines matching livelock, ping-pong, "used to", "was a", "caught in",
dev.log, forever, raced, strand and similar (a grep count, approximate).

Reading: `exec.ts` and `bis.ts` are patched but **converging** — their notes are one-off discoveries about
the game, each fixed at the root. `queue.ts` is patched and **diverging** — its notes are about
interactions between features that share the file and the head of the queue.

### H.3 Testability

**What makes the engine hard to test today**

| Obstacle | Where |
|---|---|
| Signals are created, hydrated from storage and wired to persisting effects at import | `queue.ts:71-86`, `hive.ts:130-141`, `eventorders.ts:27-34`, `sim/validate.ts:56-64` |
| `IS_SERVER` is a module constant (`typeof window`); storage is the global `localStorage` | `lib/remote.ts:11`, `api/client.ts:23` |
| Importing anything that touches the catalog pulls in the API client and therefore `localStorage` | A.2 |
| A 4 Hz `setInterval` starts at import and never stops | `store.ts:251` |
| Time is `Date.now()` and real `setTimeout` everywhere; cooldowns are waited in real seconds | `loopkit.ts:23-41`, `queue.ts:1405`, `:373`, `:865`, `:1447`, `:1574-1589` |
| The API base URL is a constant | `api/client.ts:12` |
| The runner's state lives in module-level sets and maps with no reset | A.6 |
| Item handlers read signals directly (`characters.value`, `bankItems.value`, `queues.value`) rather than taking a snapshot | throughout `queue.ts`, `exec.ts` |
| The catalog is module state loaded once | `catalog/index.ts:32` |

What already helps: every item handler re-derives its state each tick, the differ and the planners are
pure functions of plain data, and `simulate` has no dependencies at all.

**What the check scripts cover.** There is no test runner. Eleven `scripts/check-*.mts` files, each run by
hand. All eleven were read, confirmed offline, and run for this audit with scratch storage outside the
project: **all pass** (2026-11-18).

| Script | Asserts | Exercises | Does not cover |
|---|---|---|---|
| `check-effects` | 13 exact-number fights | `simulate`, the eight effects added on 11-17 | the base damage formula, crits, the timeout, every older effect |
| `check-atlas` | 8 facts of the committed `atlas.json` | nothing (reads the file) | cannot tell a stale atlas from current code |
| `check-doll` | 2: gather and craft sets wear `altar_doll` | `jobGear`, non-fight branch | fight sets, pins, the bag rule, **the whole swap differ** |
| `check-food` | 9 `foodPlan` outcomes | `plan/consumables.ts` | `foodQuantity`, `brewablePotions`, the executors |
| `check-recycle` | 9 sample items | `autoRecyclable` | the XP and time formulas — nothing checks `craftXp`, `fightXp`, `gatherSec` |
| `check-idle` | 5 (2 of them vacuous, F.3) | `fillerItems`, `proposeTaskGoals` | `taskSuitability`, the hand-off |
| `check-assist` | 3: helpers pick different ingredients; banked ore counts; the picker uses stock | `assistPick`, `trainRecipe` | the training loops themselves — the ping-pong of B.4-7 is on the path it does not reach |
| `check-events` | 7 merchant orders, 2 resource orders, one dispatch | `plan/events.ts`, `reactToEvents`, `insertItem` | monster orders, the "free" rule, expiry, and whether the items it inserts can run (B.4-1) |
| `check-offering` | 6 feasibility cases, 3 bracket picks | `canObtainOffering`, `offeringPick` | the offering runner, the daily trigger |
| `check-roadmap` | 16 over a saved fleet | `roadmap`, `nextSteps`, `coinDemand`, `analyzeFleet` | the achievements-loaded path, event and coin milestones |
| `check-steal` | 4: pace-sized steal, waiting crafter's slice | `planSteal`, `rebalanceWave` | launch, dispatch, barrier, stall guard, fillers, `moveOn` |

| Engine area | Checked | Not checked at all |
|---|---|---|
| `state/queue.ts` | four pure pickers | `runLoop`, `runItem`, start/stop/resume, 🔁, pause, skip, every `run…` function, `trainingMonsterFor`, the scheduler |
| `state/exec.ts` | — | everything |
| `state/hive.ts` | stealing | everything else |
| `state/apply.ts`, `api/client.ts`, `api/actions.ts`, `state/sync.ts`, `state/persist.ts`, `server/main.ts` | — | everything |
| `plan/jobgear.ts` | two asserts | the differ `nextGearAction`, fight sets |
| `plan/bis.ts` | indirectly, through frozen atlas numbers | objective, tie-breaks, caps |
| `plan/hive/*` | `tasks.ts` | `acquire`, `gear`, `gold`, `order`, `achievements`, `skills`, `score` |
| `plan/coverage.ts`, `plan/queue.ts` | — | everything |

The pattern: every check exercises a pure function on a synthetic snapshot. Both defects confirmed in the
log (B.4-1, B.4-7) live exactly where no check reaches — in the step-by-step interaction of a handler, the
executor and the differ.

**Hazard in the check scripts themselves.** Importing `state/queue.ts`, `state/hive.ts` or
`state/eventorders.ts` writes their keys to whatever storage file the process was given, at import and on
every assignment (A.4). `check-assist`, `check-events` and `check-steal` assign synthetic queues and a
synthetic hive run. Pointed at `.ammo/storage.db` they would overwrite the live queues. Nothing guards
against it; the headers' `/tmp/x.db` is a convention. The scripts are offline only when run from the repo
root: the data reader is relative to the working directory and a failed read falls back to the live API
(`src/catalog/load.ts:27-34`).

**What the mock API can do** (`.claude/skills/verify/mock-api.mjs`, 23 lines; **V**, not run). It is a
preload that replaces `fetch` for the game's host: GETs for characters, bank, bank items, account and
achievements are answered from a saved `/events` snapshot; active events and pending items come back
empty; any other GET is a 404; **every POST is refused with a 400**. With it the real service boots,
renders and accepts rpc edits with zero game calls — and a started queue pauses on its first action. It
does not answer `/my/{name}/offerings`, does not model cooldowns, and holds no state.

**What a runner harness would still need:** a mock that executes actions against a fake character and
bank and echoes the shapes `applyActionResult` folds; a way to make cooldowns and the fixed waits instant;
injectable errors for the branches the runner treats differently (499, 461, 404/478, 486, 497, ≥ 500,
transport); a place for the scripts in `tsconfig.json`; one command that runs them all. The engine can be
driven without the HTTP service, the way the check scripts already do: import it with scratch storage,
replace `fetch`, seed `characters`, `bankItems` and `queues`, call `startQueue`, and assert on the signal.

---

## I. Verdict per module

### I.1 Table

Quality: good / acceptable / poor. Recommendation: keep / refactor / rewrite / delete.

| Module | Lines | Layer | Status | Quality | Recommendation | Why |
|---|---:|---|---|---|---|---|
| `lib/remote.ts` | 44 | L5 | live | good | keep | small and does one thing; the `rpc(): never` type trick is the only wart |
| `lib/devlog.ts` | 32 | L3 | live | good | keep | the reason any of section G exists |
| `lib/util.ts` | 68 | L0 | live | good | keep | — |
| `api/client.ts` | 168 | L0 | live | good | keep | two small holes (unbounded 429 loop, no log of paged reads) |
| `api/actions.ts` | 112 | L0 | live | good | keep | the chokepoint works |
| `catalog/*` | 358 | L0, L8 | live | good | keep | cut the import of `api/client` so the pure layer loads without storage |
| `types/*` | 461 | L0 | live | good | keep | — |
| `sim/combat.ts` and helpers | 864 | L1 | live | good | keep | the best-tested part (a check script pins every effect; fight logs verify the formula) |
| `sim/validate.ts` | 151 | L1 | live | acceptable | keep | a persisted signal inside `sim/`; stale header |
| `plan/bis.ts` | 353 | L1 | live | good | keep | deterministic, order-free, well explained |
| `plan/jobgear.ts` | 606 | L2 | live | acceptable | refactor | two planners and a differ in one file; the differ is the most valuable pure function in the project and has no check |
| `plan/consumables.ts` | 188 | L3 | live | good | keep | — |
| `plan/xp.ts` | 71 | L6 | live | good | keep | — |
| `plan/queue.ts` | 144 | L1 | live | acceptable | refactor | the vocabulary is right; `QUEUE_KINDS` is wrong and items carry no owner |
| `plan/acquire.ts`, `plan/types.ts` | 60 | L1 | live | acceptable | refactor | remnants; rename and fold in |
| `plan/coverage.ts` | 208 | L3 | live | acceptable | keep | a status view with its own ranking rule (C.2) |
| `plan/events.ts` | 115 | L8 | live | good | keep | small, pure, checked |
| `plan/roadmap.ts` | 469 | L8 | live | acceptable | refactor | one 267-line function; its own specialist and allocation rules |
| `plan/fleetcheck.ts` | 137 | L8 | live | acceptable | keep | — |
| `plan/hive/ctx.ts`, `score.ts`, `objectives.ts`, `types.ts` | 415 | L3 | live | good | keep | the parts other features use |
| `plan/hive/acquire.ts` | 463 | L3–L4 | live | acceptable | refactor | the only multi-level, fleet-aware resolver — and the fifth resolver (C.4) |
| `plan/hive/gear.ts`, `order.ts`, `skills.ts`, `tasks.ts` | 626 | L3–L4 | live | acceptable | keep or delete with the hive | fine as planners; `skills.ts` has the weaker of two recipe pickers |
| `plan/hive/gold.ts` | 218 | L3 | live | poor | rewrite or delete | priced against merchants that are almost never there; sells gear and all banked materials (D.2-2) |
| `plan/hive/achievements.ts` | 375 | L3 | live | poor | rewrite or delete | recycles banked gear, spends the vault, scoring mirrored by hand |
| `state/store.ts` | 318 | L0+ | live | acceptable | refactor | server-owned signals, UI-only signals, pins and the clock in one module |
| `state/apply.ts` | 129 | L0 | live | good | keep | — |
| `state/persist.ts` | 86 | L0 | live | good | keep | — |
| `state/sync.ts` | 192 | L0 | live | acceptable | keep | fix the failed-bank-read case |
| `state/synced.ts` | 118 | L5 | live | good | keep | drop the migration half |
| `state/loopkit.ts` | 106 | L1 | live | good | keep | — |
| `state/exec.ts` | 505 | L1–L3 | live | acceptable | refactor | correct and hard-won; the mirrored keep rules are fragile; holds the `buy` half of B.4-1 |
| `state/queue.ts` | 1,606 | L1+ | live | **poor** | **refactor (split)** | the item handlers are individually sound; the file is five modules and the head of the queue has no arbiter |
| `state/hive.ts` | 856 | L3–L4 | live | acceptable | decide (J) | careful code for a feature the owner called too complex; it conflicts with every newer writer |
| `state/events.ts`, `offerings.ts`, `access.ts`, `roadmap.ts` | 239 | L2–L8 | live | good | keep | — |
| `state/eventorders.ts` | 85 | L8 | live | acceptable | refactor | right idea, wrong question ("is the head free" instead of "may I interrupt") |
| `server/main.ts` | 225 | L5 | live | good | keep | drop `importLocal` |
| `main.tsx`, `app.tsx` | 121 | L0+ | live | good | keep | small; no "service unreachable" indicator |
| `ui/DataTable`, `Cooldown`, `EventsPanel`, `ItemPopup`, `MapInspector`, `GearSlots`, `GearCoveragePanel`, `PendingRewardsPanel`, `AchievementsPanel`, `ActivityLog`, `CharacterPanel`, `useAction` | 1,414 | L0–L4 | live | good | keep | presentation over signals; the 4 Hz rule is respected |
| `ui/FleetView`, `QueuePanel`, `RoadmapTab`, `OfferingsPanel`, `GroupFight`, `SimPlayground`, `CombatForecast`, `MapView`, `ActionBar`, `Token`, `roadmapText` | 2,803 | L1–L8 | live | acceptable | refactor where touched | each carries some engine logic: item defaults in `QueuePanel.tsx:324-381`, status rules copied three times (`FleetView.tsx:36-41`), four different "safe" verdicts, hard numbers in prose |
| `ui/TableTabs.tsx` | 626 | L4 | live | acceptable | refactor | re-implements `crafterFor`, `npcForSell` and `itemUses`; its win verdict disagrees with the engine's (`TableTabs.tsx:491-496`) |
| `ui/CatalogPanel.tsx` | 589 | L0+ | live | acceptable | refactor | five panels in one file and the one real violation of the split (E-6a) |
| `ui/HivePanel.tsx` | 453 | L3 | live | poor | with the hive | runs the planner and the compiler in the tab; describes behaviour that was replaced |
| `styles.css` | 2,812 | L0+ | live | not audited | — | contains selectors of the removed card UI (`styles.css:152-180`, `styles.css:556-565`) |

### I.2 Clean seams — parts that could be lifted out as they are

| Part | Lines | What it needs from outside |
|---|---:|---|
| `api/client.ts` + `api/actions.ts` | 280 | a token, storage for it, an `applyActionResult` callback |
| `catalog/*` + `types/*` | 819 | a data reader (already injectable, `load.ts:14-16`) |
| `sim/*` except `validate.ts` | 864 | the catalog, for `stats.ts` only; `combat.ts` needs nothing |
| `plan/bis.ts`, `plan/xp.ts`, `plan/consumables.ts`, `plan/jobgear.ts` | 1,218 | the catalog; plain `Character` and bank arrays in, plain data out |
| `plan/events.ts`, `plan/coverage.ts`, `plan/hive/ctx.ts` | 452 | the above |
| `lib/remote.ts` + `state/synced.ts` + `server/main.ts` | 387 | a table of signals — the server/tab split does not care what the engine is |
| `state/apply.ts` + `state/persist.ts` | 215 | the store |
| `docs/audit/domain-rules.md` | — | nothing |

### I.3 What everything else is tangled around

1. **The head of the queue** (`queue.ts:88-138`, `:1399-1464`). Every feature since L4 reaches the
   runner by writing to position 0 or 1 of a list, with its own private idea of when that is allowed.
2. **The live bank array** (`bankItems.value`). Twenty-odd call sites read it as "what I may take";
   memoisation everywhere is keyed on its reference; two sites edit it locally. There is no place to say
   "this is spoken for".
3. **`state/store.ts`**: every module imports it, and it mixes what the service owns with what a tab owns.
4. **The hive's helper functions**, used by four non-hive features (A.2), which is what keeps a
   "frozen" layer alive.

---

## J. Options, not a decision

The decision is Alex's. What the evidence says about each:

### Option A — clean up in place

- **Cost.** Mostly small tasks against known lines. The confirmed defects are each a few lines (B.4). The
  three structural gaps — an arbiter for the queue head, a ledger for shared stock, one decider per
  question — each replace N scattered call sites with one (5 front-inserters, ~10 stock consumers, the
  tables in C). The one large mechanical job is splitting `queue.ts`.
- **Risk.** More patching in the style that produced the problem; without a harness each fix is verified
  only by watching the fleet. `queue.ts` is hard to change safely as long as it is one file.
- **The fleet meanwhile.** Keeps playing on every commit that passes. Each engine edit restarts the
  service (one boot sync).

### Option B — a new core next to the old code, features moved one at a time

- **Cost.** A second runner and a second item model alive at once; an adapter so the UI, the hive and the
  rpc surface can address either; every item kind ported and re-verified. The per-character runners are
  independent, so characters could move over one by one — but they share one bank, so the stock rules must
  work across both cores from the first day.
- **Risk.** The long middle: two engines, two sets of rules about the same bank. The new core would have
  to re-earn the special cases in `exec.ts` one incident at a time, unless it calls `exec.ts` — in which
  case it is option A with a different entry file.
- **The fleet meanwhile.** Keeps playing; behaviour differs per character during the move.

### Option C — a rewrite from scratch

- **Cost.** Roughly 10,000 lines of engine and planning and 6,000 of UI, built in about three weeks of
  commits in July and three in November. `domain-rules.md` preserves the knowledge, not the behaviour:
  the swap differ's ordering, the keep-list mirroring and the bank-race handling are in the code, not in
  the rules.
- **Risk.** No oracle. Nothing today can tell a correct runner from an incorrect one except the game.
  A rewrite reproduces the same missing concepts unless they are designed first, and it meets every
  incident in H.2 again.
- **The fleet meanwhile.** Idle or on the old code with no fixes, for the duration.

### What the evidence supports

**Option A, with a harness before anything else.**

- The parts that would be most expensive to rebuild are the ones in good condition (I.2: about 4,000
  lines that can be kept as they are).
- The damage is localised: one file is poor, two hive planners are poor, the rest is good or acceptable.
- The contradictions Alex noticed come from **three missing concepts**, not from a wrong foundation. Each
  can be added at a choke point that already exists (`setQueue`/`insertItem`; `bankQty`/`bankItems`; the
  pure planners).
- There are no import cycles and the planning layer really is pure, so splitting and consolidating are
  mechanical once behaviour is pinned.
- What is missing for any option is a way to run the runner offline. That is the first step whichever
  option is chosen.

**Option B would be the better choice if** Alex wants a different *execution model* — priorities and
preemption as first-class ideas, reservations instead of filters — rather than the current model with
its gaps closed; or if the harness (step 1) shows that the item handlers cannot be exercised without
rewriting them anyway.

**Option C would be the better choice if** the fleet could stand still for weeks, the hive and the
roadmap were dropped from scope so the target is the July-sized client, and the harness and a scenario
suite existed first to serve as the oracle. Today none of the three holds.

### First three steps for option A (one task each)

1. **An offline runner harness.** Make one queue runnable to completion in a check script against the
   mock API, with a controllable clock and scratch storage, and record the scenario that reproduces B.4-1
   (the `buy` that does not buy). No behaviour change.
2. **Fix the confirmed local defects, each pinned by a scenario:** the helper ping-pong (B.4-7), `buy`
   (B.4-1), 486 after a 500 (B.4-8), `prepare` lost at restart (B.4-3), the 🔁 spin (B.3 X-11), 598 treated
   as an outage (B.4-5), the bank emptied by a failed read (D.2-1).
3. **One entry point for "put work ahead of the head".** Route the five front-inserters (event orders,
   daily offerings, `queueAssist`, Roadmap train, hive front slices) and the manual ones through a single
   function that knows who owns the head and encodes the matrix in B.3; make a finished step safe when the
   head has changed (B.1).

After these, in an order for Alex to choose: a ledger for shared stock (D); the hive decision (keep,
switch its automatic paths off, or remove); splitting `queue.ts`; one decider per question in C.
