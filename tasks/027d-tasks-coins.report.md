# Task 027d — Tasks and coins: report

## Summary
- **The replay fails on one invariant, a defect that predates 027d.** `npm run check -- planner` → `FAILED`: invariant 3
  (every kill admitted), 88 of 34,947 checks; the five it prints are Fifth's `ach:loktar_ogar` steps from day 31.5 of row E
  (an earlier replay, before the last fixes, failed the same way on Second's, at 73.8%). For the orc, the
  solve's set wears two restore potions, Greater Health Potion and Health Potion, and wins 100% of the rolled fights. The
  expected fight never drinks the Health Potion (`used` 0: only a rolled crit brings on the second restore), so `fightTake`
  leaves it out of the take, and the step's own verdict without it is 69.5%. `9375a24` (027c) decides the same step on that
  World. 027d's road is the first to reach a bank that holds both potions. Not fixed (decision 1). Every other invariant holds,
  no made-up case mismatches, and rows A / B / C / E / G end at 101 / 119 / 90 / 87 / 87 (027c: 101 / 119 / 89 / 87 / 87).
- **The fighters are not lower on day 14:** First 39, Second 34, Fifth 38 (027c: 39 / 32 / 36).
- **Built (A, B):** a fighter holds a monsters task (a `task-visit` at the master starts its kill step when it holds none or a
  finished one; an items task is cancelled for a bank coin; its kills count; its monster joins the ×1.25 bonus); short coins
  are a fighter's `src:tasks_coin` kills; rule 4 cancels; the forward model plays it without dice; work (c) ranks by payback.
- **The road** (roles on, from `logs/world/2026-11-24.json`):
  - Points 43 / 51 / 56 / **101** on days 7 / 14 / 28 / deadline (027c: 45 / 50 / 56 / 91).
  - The Steel Fishing Rod is made on day 2.45, and the four gold tools on day 12.69 (027c: none of them).
  - Fighters turned in 275 tasks on purpose and 3 as a by-product; there were 64 cancels.
  - Coins: 2,177 earned (fighters 1,074, the workers' filler 1,103), 1,142 spent on trades plus 64 cancel fees; the bank
    goes from 192 to 1,163.
  - `src:tasks_coin` steps took 1,179 h, 18.8% of the fighters' hours.
  - The gather fallback took 68 h (027c: 526 h).
- **The rest of the gate:** `npm run typecheck` passes; `npm run check` → `104 checks: 104 ok, 0 known defects reproduced, 0
  failed — 323.2 s`; the build into `D:\Temp\ammo-027d\dist` passes (379.11 kB).
- Committed `Rework notes` (`0476ab9`), then `027d: tasks and coins`, pushed to `origin/rework` (`git log origin/rework
  --oneline -1`).

## Decisions for Alex
1. **The insurance potion (invariant 3).** A set may name a potion that only the rolled fights drink. There are two ways out:
   - the take carries every potion of the set, a potion the expected fight does not drink at some quantity (no number in the
     model gives it: `winRate` counts only wins);
   - the solve credits no p to a potion the take will not carry.

   Either one is a rule change. In play, the executor's gate judges the set as worn (the same 69.5%), so by its rule it would
   refuse the step and block the orc for that character for 24 h (not run).
2. **The draw rule.** `docs/api` states none for `task/new` ("Accepting a new task."). Here it is read as any monsters task at
   or below the character's combat level: a task has a `level` (`TaskFullSchema`), and `/tasks/list` filters by `max_level`.
   The World agrees: Second, at combat 26, holds Yellow Slime, a level-2 task. If the game draws differently, only `poolOf`
   (`tasks.ts`) changes.
3. **The forward model's draw is a Weyl rotation:** the fleet's n-th draw takes the task at n × 0.618… (mod 1) of the pool
   ordered by level, at its mean quantity ((50 + 400) ÷ 2 = 225). A plain rotation (n mod size) drew the level-35 to 40 tasks one
   after another, and rule 4 cancelled six of them in one day on day 30.6: 027c's potion-chain prices put those at 167–228 h
   for 225 kills. Those prices are 027e's question.
4. **The filler now earns coins in the forward model** (it banked none before 027d). The two rows below differ by that too.
5. **A fighter's items task is cancelled at its first visit whatever its progress.** On day 0 First gives up gudgeon at 222 of
   386 for one coin. A1 says so; it is named here because the progress is lost.

## How Alex verifies
1. `git log --oneline -3` → `027d: tasks and coins`, `Rework notes`, `9375a24 027c: tools`. `git status` shows only
   `tasks/027e-level-first.md` untracked. `git log origin/rework --oneline -1` shows the same commit.
2. Run `npm run typecheck`, then `npm run check` → 104 of 104, then `npx vite build --outDir <temp> --emptyOutDir`.
3. `npm run check -- tasks` → `OK (15 cases)`; `-- tools` → `OK (12 cases)` (case 6 prints the skin's score, 0.392, against
   Cheese's 0.088); `-- task-visit` passes. On `9375a24`, the files and the fixture copied in: check-tasks fails 10 of 15 (on
   both trees: a worker → no visit, …further → not, no fighter able → the wall's text, no coin → no cancel, a held task nobody
   works), check-tools fails case 6, task-visit hits its 180-minute limit.
4. `npm run check -- planner` → `FAILED`, invariant 3 only, in 3,821 s.
   - `node --import tsx D:\Temp\ammo-027d\inv3.mts <repo> E` plays row E to the first under-floor step (20 min) and writes
     `inv3-E.json`.
   - `D:\Temp\ammo-027d\dbg3.mts <tree> inv3-E.json` prints the solve (p 1, both potions) against the step (p 0.695). Both
     trees print the same.
5. The road: `docs/strategy/025/tools/drive.mts --tree <repo> --world <abs>/logs/world/2026-11-24.json --cfg "$(cat
   D:/Temp/ammo-027d/cfg-on.json)" --dec <file>` (`DEFAULTS.roles`), then `node D:\Temp\ammo-027d\tab.mjs`; the coins by
   source from `D:\Temp\ammo-027d\coins.mts` (`drive.mts` with a counter in its end hook: the same road, 101, 6,811 steps).

## The road (from `logs/world/2026-11-24.json`, roles on, to the deadline)
| | 027c roles on | 027d roles on |
|---|---|---|
| **points**, days 7 · 14 · 28 · deadline | 45 · 50 · 56 · 91 | 43 · 51 · 56 · **101** |
| **combat** F/S/T/Fo/Fi, day 7 · 14 | 36/32/24/24/34 · 39/32/24/24/36 | 33/32/25/24/33 · 39/34/25/24/38 |
| **combat**, day 28 · deadline | 45/45/24/24/44 · 50/48/24/24/50 | 45/40/25/24/46 · 50/50/25/24/50 |
| Steel Axe · Steel Pickaxe | day 0.0, Second | day 0.04 · 0.05, Second (a worker) |
| Steel Fishing Rod (Third) | never | day 2.45, Second (a fighter from day 2.19, forging) |
| Gold Axe, Gold Pickaxe (Fourth) · Gold Fishing Rod, Golden Gloves (Third) | never | day 12.69, Second (forging); the Golden Gloves again on day 50.45 |
| tasks a fighter turned in: on purpose (`src:tasks_coin`) · as a by-product | 0 · 0 | 275 (First 94, Second 81, Fifth 100) · 3 |
| the filler's tasks (workers' steps) | 597 | 319 |
| cancels | 0 | 64: 2 items tasks at the first visit (First, Fifth, day 0), 49 long, 13 not admitted; First 24, Second 16, Fifth 24 |
| coins earned | 0 (the model banked none) | 2,177: fighters on purpose 1,062, by-product 12; the filler: Fourth 612, Third 491 |
| bank coins, start → deadline | 192 → 56 | 192 → 1,163 |
| coins spent | 136: Astralyte 48, Jasper 88 | 1,142: Astralyte 408, Jasper 256, Magical Cure 296, Prime Fabric 182; and 64 fees |
| `src:tasks_coin` steps | — | 966 steps, 1,179 h (First 417, Second 286, Fifth 476): 18.8% of the fighters' 6,283 h; 62 of them a visit alone (0.5 h) |
| gather fallback h, F/S/T/Fo/Fi | 526 (128/126/126/19/127) | 68 (0/0/63/5/0) |
| completions / steps / seconds | 29 / 7,021 / 2,000 | 33 / 6,811 / 4,246 beside the replay, 3,582 alone |

"On purpose" counts the `src:tasks_coin` steps that turned a task in. A task's earlier kills may have come from other fights.
"By-product" counts the turn-ins at the start of another kill step. Days are those of the step's decision. No tuning after
the table: the code is the code the road and the replay ran.

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/tasks.ts` (new) | the held task, its coins and text; the pool and the draw (`drawOf`); `startVisit`, `visitSec`; rule 4 (`cancelOf`); `coinsInFlight`; the model's visit (`playVisit`) |
| `src/plan/planner/decide.ts` | the task's monster in `bonus`; the start visit on a fighter's kill step; the `src:tasks_coin` candidate (kills a chunk at a time, at most 2 chunks with its visit, the turn-in on the finishing step, a visit alone when there is nothing to work); the filler's cancel; the whys ("task: 37 of 212 Spider", "coins: 12 short for …"); `src:tasks_coin` is no forging step |
| `src/plan/planner/supply.ts` | `billOf`: short coins become a `src:tasks_coin` leaf when a fighter is on (codeSec's coin); otherwise the wall and its text |
| `src/plan/planner/types.ts`, `compile.ts` | `Step.visit`, `World.drawn`; the `task-visit` item before or after the field item, alone for a visit-only step |
| `src/plan/planner/forward.ts` | the visits (a turn-in banks the coins and counts `task:`; a cancel costs a coin; the draw); the kills count for the held task; the filler's task goes through the master |
| `src/plan/planner/gear.ts` | work (c): `points × (H0 − H1) ÷ H0 ÷ G`, fit when G fits the calendar |
| `src/plan/queue.ts`, `src/state/queue.ts` | the `task-visit` item (📜): complete or accept at the right master; cancel when asked and the task is still held (`cancelTask`, shared with `giveUpTask`) |
| `src/state/planner.ts` | `measure` counts units from the last item that is not a visit |
| `scripts/harness/fake.mts` | `task/new` (the scenario's `draws`), `task/complete`, `task/cancel`; a won fight counts for the held task |
| `scripts/check-tasks.mts` (new), `scripts/scenarios/task-visit.mts` (new) | 15 cases (hold, tie, coins, cancel) on the 11-21 fixture; the runner: a cancel paid by a bank coin, a turn-in, no coin so the task is kept, the kills counted |
| `scripts/check-tools.mts`, `scripts/fixtures/world-2026-11-24.json` (new) | case 6: the rod on the 11-24 World |
| `scripts/check-planner.mts` | the twins case on `EVEN`; invariant 15 allows a cancel's coin under the floor; invariant 3's message names the wear, the take and the why |
| `CLAUDE.md` | the paragraph; the queue vocabulary; gear by need's payback; the coins wall |
| `docs/rework.md` | committed as it stood (`Rework notes`) |

## Notes
- No new constant. A visit's actions cost `MIN_COOLDOWN` (3 s, `sim/cost.ts`) each, and the 2-chunk cap is `CHUNK_SEC`'s.
- C.3, read-only, the World of 11-24 (bank: 192 coins):
  - First items gudgeon 222 of 386 · Second monsters Yellow Slime 80 of 276 · Third items shrimp 125 of 374
  - Fourth items cooked_shrimp 0 of 131 · Fifth items spruce_wood 0 of 120
- A running trade reserves its coins, but the bill does not count the item bought as in flight. So a coins step can follow the
  buy (pre-existing). check-tasks asserts that the piece is made after the coins arrive.
- A kill step's sample includes its visit's walk. The model's filler takes `TASK_SEC` whatever the task drawn (a shortcut in
  the code). A worker's items task stays unless the worker works the filler.
- The Golden Gloves are made twice for Third. That is 027c's tool need; not looked into.
- The road is slower: 3,582 s alone (027c's road: 2,000 s, run beside its gate). `cancelOf`'s fresh draw prices a fight for every monster of the
  pool; how much of the difference that is was not measured.
- `tasks/027e-level-first.md` is untracked and not part of this commit. Scratch files are in `D:\Temp\ammo-027d\`.
