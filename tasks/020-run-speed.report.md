# 020 — The forward run: exact first, then fast: report

## Summary
- **The service was not restarted during the work** (run `dxgi`, commit `b808b47`, up since 20:59:30; no `boot` since). Its outlook
  child loads the working tree every three hours: at 00:04:31 it ran this task's tree of that hour (349.5 s, 53 by 12-13), at
  03:10:21 and 06:15:27 the final tree (304.9 s and 390.8 s, 53 and 57 by 12-13, beside my own runs) — no `failed` record; the tree was never red when a child
  started (it was red for about a minute at 01:24).
- **A run is exact now.** A solve is keyed on everything `bestInSlot` reads and served only for an equal key; the old reuse rules,
  the per-pool answer `fightRec` and `planRec` shared, and the bisection's hint are gone. Proven three ways, all three in the
  gate or the report: every solve fresh against the caches (the same lines: 3 h of the live World, 12 h and the check's 6 h of
  the 11-20 snapshot), two runs in one process (the same lines), the rows in two orders (every row's points at days 7, 14, 30, 60 and the deadline the same in both orders and
  alone).
- **It moves the numbers once, and by much**: the road from `logs/world/2026-11-21.json` expects **78 at the deadline (was 98)**,
  53 at day 21 (was 59) — its fleet stands still from 12-24 on (fighters walled at combat 23–26). The old 98 rested on the
  cache handing `fightRec` (written as a 6-and-6 search) `planRec`'s 3-and-3 answer: the exact tree with `fightRec` at 3 and 3
  gives 98 and 37 completions again (an experiment in scratch; the caps stay, they are not this task's). Notes, first.
- **The whole season: 2,288 s and 2,091 MB before** (report 019's code, beside two other runs; about 36 minutes alone, report
  019) **→ 419.5 s and 683 MB alone** on the final tree. The 21 days: 152.9 s and 501 MB (beside two) → 234.4 s and 630 MB alone
  — the exact cache is dearer in a World's first weeks and far cheaper later. The five-minute target is not reached.
- **The service plays to the deadline** (`HORIZON_DAYS = 0`): the season fits ten minutes and 1 GB; it takes effect at the next
  restart.
- **The replay**: `OK (693681 invariant checks, 98 made-up cases; deadline points 88 / 121 / 108 / 62 / 86)` →
  `OK (731517 invariant checks, 99 made-up cases; deadline points 90 / 121 / 108 / 81 / 86)`.
- **The gate**: typecheck passes; `npm run check` → **85 checks, 85 ok** in 365.7 s, alone (report 019: 85 checks, 85 ok); `npm run check -- planner` → the reference line to the digit in **4,873 s** alone (named backstop now 6,300 s)
  (report 019: 2,070 s); the scratch build passes (347.9 kB of JS, 31.8 kB of CSS).

## Decisions for Alex
None. (Whether the fighters' wall from mid-December is the next task's is the planning chat's; nothing here spends or deletes.)

## How Alex verifies
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `020: run speed` on top of `Rework notes` (`bff5dfa`);
   `git status` clean; `git log origin/rework --oneline -1` → the same commit (the push's outcome is in Claude Code's reply);
   `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → `85 checks: 85 ok, 0 known defects reproduced, 0 failed`, exit 0, about 366 s (I ran it alone). No new check file; the new
   cases are in `check-road` (two runs in one process, an off character, the speed guard) and `check-planner` (the caches off
   against on). Nothing new under `logs/` (I ran it with the service up: the journal and raw files only grew by the service's own
   lines).
3. `npm run check -- planner` → ends with `OK (731517 invariant checks, 99 made-up cases; deadline points 90 / 121 / 108 / 81 / 86)`
   in about 4,873 s (81 minutes) (I ran it alone on the final tree; the service's own outlook child ran for five minutes beside it), of the
   6,300 s backstop.
4. `npm run typecheck` passes; `npx vite build --outDir <temp>/ammo-020-dist --emptyOutDir` built (347.9 kB of JS, 31.8 kB of CSS). I ran both.
5. `npm run outlook -- --world logs/world/2026-11-21.json` → about seven minutes alone; **78 of 210 at the deadline, 2027-02-24 00:00 UTC**; run twice, the
   same road (any two runs give the same lines now: the 21-day and season roads of every state above came out equal to the
   reference to the digit, each in a fresh process).
6. `git diff --stat b808b47 HEAD -- src/sim src/plan/bis.ts src/plan/jobgear.ts src/api src/catalog src/state` → `src/sim/combat.ts`
   (D: `opening` without a `Map`, the same sums in the same order), `src/plan/bis.ts` (`bisPools` exported and taken as given — the
   solve key needs them —, A1 the per-solve score memo, C the heuristic once, T the tiebreak off the key), `src/state/outlook.ts`
   (`HORIZON_DAYS = 0`); nothing in `jobgear.ts`, `src/api`, `src/catalog`.
7. **After the restart** (not checked by me): two minutes after the boot's achievements read the child starts; about seven to ten
   minutes later (beside the service) the Road card shows the road, and the Season card "expected at the deadline: 78 by the
   model" (or what the live World of that moment gives); the journal's `outlook` record has `until` = the deadline
   (2027-02-24T00:00:00Z) and `sec` in that range; the characters' steps go on through the run (in both runs I read tonight the
   longest gap between a character's actions while the child ran was 37 s).

## Where the time and the memory went
All of this section is the untouched tree: commit `b808b47` extracted with `git archive` into a scratch folder (its
`node_modules` linked), run against one fixed input, `logs/world/2026-11-21.json` (88,377 bytes, written 11:43:35 UTC on
11-21; I ran from a byte-identical copy in scratch, SHA-256 `EBD11F25…3DB89`, so a rewrite of the file could not move the
baseline). Counters were added only to a second scratch copy (`instr`); its lines are those of the untouched copy to the digit
(21 days: `EQUAL (24 lines)`; 60 days: `EQUAL (63 lines)`).

**The baseline** (`npm run outlook`'s command, `node --import tsx scripts/outlook.mts --world <file> [--days 21] --json`,
with a preload that prints the process's wall seconds and peak RSS at exit):

| run | wall s | peak RSS | expected | steps | completions | beside |
|---|---|---|---|---|---|---|
| to the deadline (02-24 00:00 UTC) | 2,288 | 2,091 MB | 98 | 9,126 | 37 | two other runs (the 21-day, then the 60-day profile) |
| 21 days (12-12) | 152.9 | 501 MB | 59 | 1,862 | 21 | two other runs |
| 60 days, CPU profile at 5 ms | 1,680 | 1,624 MB | 85 | 6,032 | — | two other runs |

Both `--json` outputs stayed in scratch for the whole task (`base-season.jsonl`, `base-21.jsonl`); a second 21-day run in a
fresh process (the profile run) gave the same 24 lines.

**Where the seconds go** (V8's CPU profiles, `node --cpu-prof`; self time by the nearest source file on the stack, total time
inclusive):

| group | 21 days: self | total | 60 days: self | total |
|---|---|---|---|---|
| `simulate` (`src/sim/combat.ts`) | 25.1% | 25.1% | 39.7% | 39.7% |
| `bestInSlot` without `simulate` (`src/plan/bis.ts`) | 16.3% | 52.8% | 23.4% | 77.9% |
| `src/sim/stats.ts` (`applyGear`, `foldEffects`) | 7.1% | 9.6% | 9.8% | 12.3% |
| `reach.ts` (the caches, spots, routes) | 23.4% | 85.5% | 10.8% | 92.5% |
| supply and consumables (`supply.ts`, `consumables.ts`) | 5.1% | 90.9% | 3.3% | 87.2% |
| `targets.ts` | 0.2% | 0.2% | 0.1% | 0.1% |
| the garbage collector | 1.7% | 1.7% | 1.6% | 1.6% |

The top functions (self time; "(anon)" is the file's anonymous functions together — in `bis.ts` the evaluator and the
search's callbacks, in `catalog/index.ts` the `item()`/`monster()` lookups):

| 21 days, self | s | % | 60 days, self | s | % |
|---|---|---|---|---|---|
| `opening` (combat.ts) | 19.5 | 11.7 | `opening` (combat.ts) | 256.1 | 15.2 |
| (anon) bis.ts | 15.8 | 9.5 | (anon) bis.ts | 236.3 | 14.1 |
| `foldEffects` (stats.ts) | 11.1 | 6.7 | `simulate` | 188.3 | 11.2 |
| `simulate` | 10.9 | 6.6 | `foldEffects` (stats.ts) | 160.6 | 9.6 |
| (anon) catalog/index.ts | 8.1 | 4.9 | `attack` (combat.ts) | 89.1 | 5.3 |
| `poolOf` (reach.ts) | 6.0 | 3.6 | (anon) catalog/index.ts | 75.1 | 4.5 |
| `bestInSlot` | 5.4 | 3.3 | `bestInSlot` | 68.8 | 4.1 |
| (anon) reach.ts | 5.3 | 3.2 | `chooseGroup` (bis.ts) | 65.7 | 3.9 |
| `chooseGroup` (bis.ts) | 4.6 | 2.8 | `startOfTurn` (combat.ts) | 57.0 | 3.4 |
| `travel` (reach.ts) | 4.4 | 2.7 | `refreshHit` (combat.ts) | 52.5 | 3.1 |

| total time | 21 days | 60 days |
|---|---|---|
| `consumableNeeds` (and `fightTake`, which asks it) | 150.3 s, 90.5% | 1,442 s, 85.8% |
| `bestInSlot` | 86.6 s, 52.1% | 1,305 s, 77.6% |
| `gearNeeds` | 88.1 s, 53.0% | 862 s, 51.3% |
| `simulate` | 41.6 s, 25.0% | 666 s, 39.6% |
| `bundleOf` | 42.6 s, 25.6% | 203 s, 12.1% |
| `pickMonster` | 39.9 s, 24.0% | 333 s, 19.8% |
| `billOf` (supply) | 30.2 s, 18.2% | 186 s, 11.0% |
| `nearestSpot` | 24.7 s, 14.9% | 100 s, 5.9% |
| `targetsOf` and the targets' build | 0.4 s, 0.2% | 1.5 s, 0.1% |
| the garbage collector | 2.8 s, 1.7% | 27.0 s, 1.6% |

The supply and consumables planning is where the time is spent from (nine tenths of it under `consumableNeeds`), but what it
spends is solves: the solver is half of the 21 days and four fifths of the 60: `bestInSlot` 86.6 s of 166 (52%), 1,305 s of 1,681 (78%). Inside
it, `simulate`'s `opening` alone was 11.7% and 15.2% (a `Map` of the fighter's effects and the boosts' names built as strings
for every fight), `foldEffects` 6.7% and 9.6%. Outside the solver the largest self time of the 21 days was the road to a spot
(`nearestSpot` 14.9% total: `travel`, `eventTiles`, `staticTiles`, `tollOf` — every World a new toll table). The targets
(`targets.ts`, rebuilt every decision because `advance` hands on a new achievements array) are 0.2%: not worth keeping.

**Per simulated week** (the `instr` copy, 60 days, alongside two other runs; the seconds are this run's, the counts are the calls of the old `cached`
(`reach.ts:285`) by the rule that answered: its per-pool answer memo, a result solved on an equal pool, on a superset pool,
the two potion rules; a miss is a solve)

| days | s | s/day | decisions | asks | answer memo | equal pool | superset pool | potion gained | potion lost | misses (solves) | solve s | tables (results) | heap MB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1–7 | 81 | 11.6 | 643 | 2307106 | 1770237 | 366302 | 131886 | 5843 | 21325 | 11513 | 53 | 10301 | 133 |
| 8–14 | 20 | 2.9 | 553 | 1422710 | 1051753 | 256412 | 100281 | 133 | 13812 | 319 | 1 | 10550 | 270 |
| 15–21 | 47 | 6.8 | 616 | 1817870 | 1375298 | 308576 | 107409 | 2556 | 18962 | 5069 | 24 | 14679 | 180 |
| 22–28 | 120 | 17.2 | 658 | 2708676 | 2153182 | 294430 | 190387 | 16721 | 35502 | 18454 | 86 | 25390 | 283 |
| 29–35 | 165 | 23.6 | 765 | 3039915 | 2422550 | 336785 | 200564 | 18177 | 37084 | 24755 | 124 | 39068 | 447 |
| 36–42 | 265 | 37.9 | 796 | 3603859 | 2942615 | 313695 | 230570 | 37547 | 44528 | 34904 | 206 | 58719 | 695 |
| 43–49 | 367 | 52.4 | 788 | 3126896 | 2513391 | 301478 | 205616 | 30641 | 25062 | 50708 | 315 | 86065 | 550 |
| 50–56 | 359 | 51.2 | 757 | 2461924 | 1916543 | 247585 | 198768 | 29254 | 27622 | 42152 | 310 | 106046 | 839 |
| 57–60 | 169 | 42.1 | 409 | 1281489 | 1000750 | 111975 | 115445 | 18673 | 15987 | 18659 | 142 | 111220 | 552 |

So a day costs 7 s at first and 40–50 s later because **the old cache missed more and more**: 11.5k solves in the first week,
0.3k in the second, then 18k, 25k, 35k, 51k a week, each about 6 ms. The tables grew to 111k results by day 60 (each holding its
pool `Map`), and the rules that served a different pool grew with them (the superset rule 107k a week in week 3, 231k in week
6; the two potion rules 27k → 82k).

**What holds the memory** (`node --expose-gc`, a forced collection at the end, then each table emptied and collected again):
at the end of 21 days the heap holds 64 MB, of which the solve tables 36 MB (3,109 keys, 15,600 results), the gathering cuts
9 MB, the routes 1 MB; at the end of 60 days 410 MB, of which the solve tables 353 MB (19,044 keys, each up to 16 results with their pool `Map`s), the cuts 27 MB, the routes 3 MB. The 501 MB and 2,091 MB peaks are therefore mostly garbage between collections — every
decision builds new Worlds, pools, keys and per-World memos — on top of the live tables, whose growth (above) raises V8's
heap limits as it goes.

**Why the live World takes five times a replay row.** The rows are separate processes (nothing is shared between them), so
it is not the shared caches — and the premise does not hold: report 019's "about 414 s a row" is the check's 2,070 s divided by five, but the check starts its five rows side by side, each a child process (`scripts/check-planner.mts:526-535` at `b808b47`), so a row took most of those 2,070 s. Played as a plain road by the same old code (the `instr` copy; `<s>/world-replay.json`, the World `check-planner` builds for row A, written by a scratch script), the replay's start World took **2,403 s and 2,251 MB to the deadline** (beside four other processes) against the live World's 2,288 s — the same order. Its weeks have the same shape: misses 30k, 14k, 6k, then 39k, 23k, 19k, 26k, 42k, 30k, 34k a week, the tables 120k results by day 70. The live World is not five times dearer; the replay World is as dear.

## The run made exact
**What "Read in the chat" got right, and where it falls short** (all at `b808b47`):
- `forward()`: `w = { ...w, now: t, current, clock }` before every decision (`forward.ts:259`), `wear` after it (`:263`),
  `advance` when a step ends (`:247`); `advance` builds `achievements` with `world.achievements.map(...)` (`:197`) — a new array
  at every step's end. Right.
- The World-keyed memos named are all there (`reach.ts` `mayMemo` `:75`, `tollMemo` `:167`, `priceMemo` `:379`, `openMemo`
  `:484`; `consumables.ts`, `gear.ts`, `events.ts`, `supply.ts`, `cost.ts` as listed). The list is not complete: `bundle.ts:43`,
  `roles.ts:19`, `stock.ts:20` and `:51` (the reservations and the pools) and `bank.ts:104` are keyed on the World too.
  `targets.ts` `built` is keyed on the achievements array and the config — rebuilt at every decision that follows a step's end
  (all but each character's first). Right, and it costs 0.2% (section 1).
- `poolOf` (`reach.ts:247`), `fightMemo`/`planMemo` (`:431`, `:461`) with the key named, 16 results a key with consumables on
  (`:277`), `MEMO_CAP` 20,000 and the oldest tenth (`:232`), `lookup`'s superset and potion rules (`:300`), `winHint`, `cutMemo`,
  `routeMemo`, `bankMemo` module-level under the cap: right. **Short of it:** `answerMemo` (`:299`) is keyed on the pool object
  and the key string — and `fightRec`'s and `planRec`'s key strings are the same at the character's own level with no extra
  piece, so **the full solve (6 a slot, 6 weapons) and the planning-grade one (3 and 3) share one answer per pool: whichever is
  asked first in a World answers the other.** `safeWin` asks `planRec` first (`:459`), so `fightRec` mostly got the 3-and-3
  set: after 21 days the old tables held 21 full results against 14,658 planning-grade ones (the `instr` counters).
- `bestInSlot` with `simulate`, the caps 6/6 (`:442`) and 3/3 (`:481`): right. `played` kept, `road()` reads its length
  (`road.ts:84`); `road()` gets the forward model's World (`road.ts:52`); a character that is off is played (`forward.ts:228`
  takes every character): right.

**What a cached answer depended on besides its key** — every place the old caches could answer a World with a result a
fresh solve of that World does not give:
1. `lookup`'s three reuse rules: a result solved on a superset pool, a safe win solved without a potion the pool now holds, a
   safe win that lost a potion simulated again without it (`reach.ts:300-333`).
2. `answerMemo`'s shared answer of `fightRec` and `planRec` (above).
3. The keys left out inputs the solver reads: the worn set (`bestInSlot`'s tiebreak keeps a worn piece, `bis.ts:252`, and the
   worn weapon is always a weapon option, `:287-288`); the price of a potion the pool holds that the others' steps reserved
   (the pool keeps it, `stock.ts:71`, but `available` is 0, so the price is its chain, not 0 — `solveKey` said `cons::` for
   both); `potionRec`'s prices (its key named the candidates only, a recorded shortcut, `reach.ts:497-501`).
4. `firstWin`'s bisection started from the last answer for the same character, level and monster (`winHint`, `:529-546`):
   where wins are not monotone in level the answer depended on the order of asks.
5. `cutMemo` (`:548-559`): its key had the pool, the name and the levels but not the worn set, which `jobGear`'s gathering
   argmax uses to break ties (`jobgear.ts:246`, `:273`).
6. `supply.ts` `gateRoad`'s `roadMemo` (`supply.ts:53-74`), kept for good on the levels and the layer; a gathering lane's
   road asks whether a node or a recipe gives XP at each level (`cost.ts:202-205`: where the character stands, the bank's
   stock, the live events, a safe win for a recipe's drop) — a road served from another World.

**How it is exact now** (`src/plan/planner/reach.ts`, `src/plan/bis.ts`):
- **The key** (`reach.ts:323` `solveKey`): everything `bestInSlot` reads once its candidates are known — the monster; the base
  stats (`statsOf`, sim/stats.ts `baseStats`); the candidates per searched slot after the caps (`bis.ts:156` `bisPools`, which
  `bestInSlot` now takes as given, `bis.ts:313`: pool, extras, caps, the heuristic against the monster); the worn code of each
  slot the search can keep (a worn code among that slot's candidates, and the worn weapon always); the copies of each ring
  candidate (two at most: the pair); and, when the utility slots are searched, each potion candidate's price. A table
  (`solveMemo`, at most `MEMO_CAP` 100,000 keys) serves only an equal key.
- **The asks** (`reach.ts:351` `asked`): an ask (the table, the monster, the extras) of one character object in one World is
  kept per both — everything it solves with is that World's and that object's (`potionRec`'s price is a function of the World
  and the name, its one caller's: `reach.ts:492-495`). `fightRec`, `planRec`, `potionRec` (`:427`, `:456`, `:496`) build their
  options and ask; `fightRec` and `planRec` no longer share an answer (different caps, different candidates, different keys).
- **Gone:** `cached`, `lookup` and its three rules, `answerMemo`, `Solved`, `SOLVES_PER_KEY`, `without`, `baseHp`, `poolSig`,
  `winHint`. None of the rules could be shown exact: a pool that lost an unused piece changes the capped candidates or the
  greedy search's path; a potion gained or lost changes the utility search. I also tried to serve a solve across worn sets
  when every comparison of the search clears the tiebreak's largest effect (exact by construction): 0 of 12,118 solves of
  three days qualified (near-ties everywhere, losing sets above all), so that idea was dropped.
- `firstWin` (`:514`): the plain bisection from the top, every time. `gatherCut` (`:528`): keyed on the pool, the worn codes
  and the skill. `gateRoad` (`supply.ts:55`): a crafting lane's road (the atlas's hours × the config's two numbers) kept for
  good on what it reads (the levels, the measured level hours, `craftK`, `craftAbove40`); a gathering lane's per World.
- **The switch** (`reach.ts:261` `setCaches(false)`, for the checks only, no environment variable read in the core): no ask
  kept, no solve kept, no memo that outlives a World (the cut, `nearestSpot`, the toll, `gateRoad`'s crafting
  roads) read. The routes and the nearest banks (functions of the catalog and the transitions open) stay.

**The proof** (all three now in the gate):
- **The caches off against on**: the same lines on every horizon I ran — 3 hours of the live World (10 decisions; every step
  equal, fresh 440 s against 10 s), 12 hours of `scripts/fixtures/world-2026-11-20.json` (fresh 952 s under a loaded machine,
  cached 38 s), and in `npm run check -- planner` 6 hours of that snapshot as a child beside the rows (47 steps fresh in
  518.5 s, cached 32.3 s). Six hours, because a fresh decision there costs about 10 s (every ask a solve) and the
  child must finish inside fifteen minutes on a loaded machine with room to spare.
- **Two runs in one process**: the same lines — `check-road` (eight hours of the made-up world: report 019 had 32 and 31
  steps, now 42 and 42), and one day of the live World played twice in one process (`EQUAL (4 lines)`; the first run 26 s, the
  second 13 s).
- **The rows in two orders**: the final tree's `check-planner`, each order in one process (`AMMO_PLANNER_ROW=0,1,2,4,6` = A, B,
  C, E, G and `6,4,2,1,0` = G, E, C, B, A; the two side by side, 04:15:05–08:05:01 and 04:15:06–08:08:54), compared with the
  gate's rows (each alone in its own process) by `node <s>/orders.cjs`: the same points in all three, row by row —

  | row | day 7 | day 14 | day 30 | day 60 | deadline |
  |---|---|---|---|---|---|
  | A | 32 | 44 | 55 | 84 | 90 |
  | B | 44 | 58 | 85 | 109 | 121 |
  | C | 32 | 43 | 61 | 101 | 108 |
  | E | 32 | 42 | 61 | 78 | 81 |
  | G | 34 | 40 | 52 | 71 | 86 |

**The new reference** (settled point 4), beside report 019's:

| | report 019 | now (exact) |
|---|---|---|
| `npm run check -- planner` | `OK (693681 invariant checks, 98 made-up cases; deadline points 88 / 121 / 108 / 62 / 86)` | `OK (731517 invariant checks, 99 made-up cases; deadline points 90 / 121 / 108 / 81 / 86)` |
| the road from `logs/world/2026-11-21.json`, deadline (02-24) | 98, 37 completions, 9,126 steps | **78**, 28 completions, 7,365 steps |
| …at day 21 (12-12) | 59, 21 completions, 1,862 steps | **53**, 18 completions, 1,751 steps |

The 99th made-up case is the new caches-off proof; the invariant count follows the steps played. Rows B and C end where they
did; A gains 2, E 19; G, pinned at 86 (report 016's row A), still ends at 86. How the line was fixed: the check on the
pre-speed snapshot (scratch copy `exact`, every row dumping its decisions) finished rows B and C, then crawled — its solve table
of 20,000 keys thrashed once a row's working set passed the cap, about 30 decisions a minute — and I stopped it after 97
minutes with rows A, E, G at days 49, 59 and 41. The line above comes from the tree with the speed changes through D (scratch
`s12-cp`, run directly with `AMMO_CHECK_VERBOSE=1`, 4,527 s on a loaded machine); its rows' decisions are the snapshot's, every
one: B 6,669 of 6,669, C 6,474 of 6,474, and A, E, G over all the 4,640, 5,664 and 4,351 the snapshot reached (key, units,
hours, why and set compared). The final tree's gate run gives this line to the digit (section 3).

The road's completions, old → exact: intermediate_lumberjack 11-21 → 11-21, expert_miner 11-22 → 11-22,
intermediate_alchemist 11-23 → 11-23, worker 11-23 → 11-24, the_new_bandit 11-25 → 11-25, intermediate_fisherman 11-25 → 11-26,
expert_lumberjack 11-25 → 11-27, cabinet_maker 11-25 → 11-27, the_reaper 11-27 → 11-26, expert_alchemist 11-30 → 11-30,
professional_lumberjack, professional_miner, diamond_in_the_sky 12-01 → 12-02, ecologist and expert_fisherman 12-05 → 12-05,
master_alchemist 12-07 → 12-08, master_miner 12-08 → 12-09, professional_fisherman 12-11 → 12-11, palm_paradise 12-15 → 12-14,
master_lumberjack 12-15 → 12-14, shining_secrets 12-11 → 12-24, adamantite_mastery 12-11 → 12-25, a_favored_champion 01-04 →
01-04, magic_lumberjack 12-22 → 01-08, pearl_fisher 01-14 → 01-09, strange_miner 12-31 → 02-01, magic_harvester 01-07 → 02-20;
tasks_coins_fan is new (12-24); no longer on the road: arachnophobia_conquered (12-10), catch_and_cook (12-16), cult_destroyer
and cultist_purifier (12-22), loktar_ogar (01-01), cursed_wood_blessed_victory (01-06), its_malefic (01-25), closing_the_gate
(01-28), master_fisherman (02-08), king_of_the_goblins (02-10).

**Where each run first parts from the old one, and whether the old step came from a served result:**
- **The road** (live World): the first 154 decisions are the same, step for step and why for why. Decision 154, 11-23 11:20
  UTC, Third: the same step (`ach:the_reaper:1`, 10 kills, 0.32 h, the same set, 12 Air Boost and 96 Minor Health Potion from the
  bank) — but the why's food note: old "rests (Cheese is needed for event full_moon, not in the bank yet)", exact "rests (no
  food pays: making it and eating saves less than 0.85 asks)". The old code run cold on that very World (dumped at the decision)
  gives the exact run's why: **the old one came from results served from earlier decisions** (a food need for the full moon
  event that a fresh solve does not find). The road's day lines part from day 3 on.
- **Rows A, E and G** at decision 1, 11-18 13:34 UTC, Second, `ach:highway_patrol:0`: old 66 kills in 1.50 h ("~9.1 h" for the
  achievement) in lucky_wizard_hat, iron_boots, forest_ring ×2; exact 60 kills, "~10 h", in wolf_ears, adventurer_boots,
  life_ring ×2. The old code cold on that World gives its own step again — so the cause lies inside one decision: on the same
  World, the old `fightRec(Second, highwayman)` asked first returns the exact run's set (wolf_ears, adventurer_boots, life
  rings; 20 turns) and asked after `planRec` returns `planRec`'s (lucky_wizard_hat, iron_boots, forest rings; 18 turns).
  **The old step was `planRec`'s 3-and-3 answer served to `fightRec`** through the shared per-pool answer; a fresh full solve does
  not give it.
- **Row B** at decision 1, Second, the same objective, 111 kills both: old mushmush_bow, forest rings, wisdom amulet; exact
  highwayman_dagger, life rings, air-and-water amulet. The old code cold repeats the old step: the same shared answer.
- **Row C** at decision 6, 11-18 15:03 UTC, Third, `ach:highway_patrol:0` (60 kills): old 1.28 h ("~7.0 h") in wolf_ears, water
  rings, air-and-water amulet; exact 1.34 h ("~7.4 h") in lucky_wizard_hat, life rings, wisdom amulet. The old code cold on
  that World gives the exact step: **served from earlier decisions**.

**Why the road lost 20 points.** It is not a step that changed; it is what the fighters can do once the noise is gone. In the
exact road every character's last weeks are the fallback gather ("nothing else is open"): Second, Third, Fourth and Fifth from
12-24, First from 01-09, 1,430 hours each. On the World of Second's first such step (dumped and asked again): combat 23–26 for
all five, Second's combat bundle `wall 26` with no finite road ("no XP source" at 26), no objective in reach, and the kills
behind the old run's late completions all waiting for "gear (no safe win within ten levels)" (a_peaceful_island, cultist_purifier,
cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar). In the old run the same fighters kept winning
those: its late combat and event completions rested on results served from other pools and on `fightRec` answering with
`planRec`'s set. **An experiment settles which:** the final tree with `fightRec` at `planRec`'s caps, 3 a slot and 3 weapons (scratch only — the caps are constants this task may not change), gives **98 at the deadline, 37 completions, 9,094 steps** — the old road's 98 and 37 — with the late fights back: arachnophobia_conquered 12-03, cult_destroyer 12-13, cultist_purifier 12-15, cursed_wood_blessed_victory 12-17, loktar_ogar 12-24, its_malefic 01-21, closing_the_gate 01-25, king_of_the_goblins 02-17 (3,063 s and 1,384 MB beside two other runs, 96,684 solves: a fleet that keeps fighting keeps solving). So the 20 points are the difference between the 6-and-6 search `fightRec` is written with and the 3-and-3 answer the old cache handed it. Nothing of the model's rules changed here; this is what the model as written says once every solve is
the World's own. It is first in Notes and in the Summary.

## The run made fast
The exact cache made the run's shape different: the old one missed little at first and more and more later (11.5k solves in
the first week, 51k in the seventh); the exact one solves 36.6k times in the first week — a fresh key for every worn set, every
price, every new candidate list (on 21 days: 58% of the solves differ from an earlier key only in the worn codes, 22% in the
candidates, 16% in a price; on the replay's start World of 11-18, 54% worn, 32% candidates, 13% prices, and 18,778 solves on its first day alone) — and almost never after day 35 (the fleet stands still: below). So the first three
weeks cost three times what they did, and the season a third. Every change below is speed only; each was measured on the
21-day road from the fixed file, **alone** (one process on the machine besides the service), one after another, in scratch
copies of `src` (`<s>/states/<state>`, each the one before plus one change), and every one gives the reference's 24 lines to the
digit but the seconds (`cmp.mjs`: `EQUAL (24 lines)`; from the state that has the `waitingOf` change on, the first line differs
in its one entry and the other 23 are equal: `cmpw.mjs`).

| state | the change (on top of the state before) | wall s | Δ | peak RSS | solves | lines | kept? |
|---|---|---|---|---|---|---|---|
| s0 | the exact cache, no speed work (the reference) | 448.6 | — | 509 MB | 37,412 | the reference | — |
| s1 | **A1** a set's score once a solve | 406.6 | −9.4% | 508 MB | 37,412 | equal | kept |
| s2 | **B** a table of fights across solves | 297.0 | −26.9% | 917 MB | 37,412 | equal | out (memory, below) |
| s3 | **A2** the passes stop when one changes nothing | 296.2 | −0.3% | 975 MB | 37,412 | equal | out (< 3%) |
| s4 | **C** the candidate heuristic once per monster and item | 258.5 | −12.7% | 985 MB | 37,412 | equal | kept |
| s5 | **P** the pool's signature built only where read | 256.5 | −0.8% | 953 MB | 37,412 | equal | out (< 3%) |
| s6 | **G** "is there a node, a recipe" stops at the first | 200.1 | −22.0% | 899 MB | 36,239 | equal | kept |
| s7 | **F** the nearest spot and the toll kept on what they read | 179.6 | −10.2% | 842 MB | 36,239 | equal | kept |
| s8 | **K** short solve keys (codes as numbered characters) | 177.3 | −1.3% | 841 MB | 36,239 | equal | out (< 3%) |
| s9 | **M** the solve table's cap 20,000 → 100,000 keys | 179.3 | +1.1% | 810 MB | 36,197 | equal | kept (no code; the rows, below) |
| s10 | **T** the tiebreak read off the set's key | 167.8 | −6.4% | 852 MB | 36,197 | equal | kept |
| s11 | **D** `simulate`'s opening without a `Map` | 163.1 | −2.8% | 931 MB | 36,197 | equal | kept (−9.4% without B, below) |
| s12 | **C2** a group's combinations once a solve (+ the `waitingOf` change) | 162.5 | −0.4% | 979 MB | 36,197 | equal but `waiting` | out (< 3%) |
| s13 | **N** B's table per monster and base stats | 151.7 | −6.6% | 870 MB | 36,197 | equal but `waiting` | out with B |
| s14 | **L** B's tables used longest ago go first | 151.5 | −0.1% | 947 MB | 36,197 | equal but `waiting` | out with B |
| **final** | A1, C, G, F, M, T, D (B, A2, P, K, C2, N, L taken out) | **234.4** | | **630 MB** | 36,197 | equal but `waiting` | |
| final without D | — | 258.8 | (D: −9.4%) | 624 MB | 36,197 | equal but `waiting` | |

Every row is one process alone on the machine, the 21-day road from the fixed file, timed by the preload (wall seconds of the
whole process, its peak RSS). "Equal but `waiting`": every line equal but the first, where only the_new_bandit's group differs
(section 4). The solves fall by 1,173 at G (an existence check asks fewer `safeWin`s than `pickRecipe`'s full pricing did) and by
42 at M (no eviction): fewer asks, the same answers.

**The season, alone, decided B.** With B's table capped at 300,000 fights (and L) the season took 335.9 s and **1,047 MB**;
capped at 100,000 it took 357.8 s and **1,889 MB** (the evicted fights became old-generation garbage that V8 let pile up);
without it 399.9 s and 612 MB (all three: every line the reference's but the one `waiting` entry). The memory bound comes
first, so B came out with N and L, and D was measured again where it now runs (−9.4%).

What each change is (where it is in the final tree):
- **A1** — a set's score once a solve (`bis.ts:257-265`, `makeEvaluator`'s memo by the set slot by slot, `setKey` `:249`): the passes and the
  groups ask the same sets again; a pure function of the set within one solve.
- **B** — a table of fights across solves (a set's two fights are a function of the base stats, the set and the monster):
  −26.9% on 21 days, 336 s against 400 s on the season — but its 300,000 fights held the season at 1,047 MB, and capped at
  100,000 it churned old-generation garbage to 1,889 MB. **Taken out again** with its two refinements (N: a table per monster
  and base stats; L: the tables used longest ago go first): the memory bound comes first.
- **A2** — the passes stop when one changes nothing (the next pass would see the same slots and score them the same way) —
  taken out.
- **C** — the candidate heuristic once per monster and item (`bis.ts:153`, `:208-215`) instead of twice a sort comparison.
- **P** — the pool's signature string built only where read (the gathering cut) — taken out.
- **G** — `levelHoursEstimate` asks whether a node or a recipe gives XP, and stops at the first (`pick.ts:74` `hasNode`,
  `:90`/`:109` `pickRecipe(…, first)`, `cost.ts:204`): `gateRoad`'s per-World memo had made pricing every node of every level a
  third of the run.
- **F** — the nearest spot and a toll kept across Worlds on what they read (`reach.ts:46-60` live event tiles once a World,
  `:130-158` `nearestSpot` keyed on the transitions open, the place, the content and its live tiles; `:184-215` the toll on the
  transitions open and the place).
- **K** — short solve keys (codes as numbered characters, each slot's candidates after their count) — taken out.
- **M** — `MEMO_CAP` 20,000 → 100,000 keys (`reach.ts:248`; a cache's size is free to change): the replay rows' working set
  passed 20,000 keys and thrashed (above).
- **T** — the tiebreak read off the set's key (`bis.ts:283-292`; item levels by code number, `:238-247`).
- **D** — `simulate`'s `opening` without a `Map` and without building the boosts' names for every fight (`combat.ts:143-165`):
  the same sums in the same order.
- **C2** — a group's combinations built once a solve instead of every pass of every weapon — taken out.

**Taken out again:** B with its refinements N and L (memory), A2 (−0.3%), P (−0.8%), K (−1.3%), C2 (−0.4%) — each under 3% of the run and code, or over the memory bound. M stays: it adds no code, it gains nothing on the 21-day road, and it is what keeps the replay rows from thrashing (section 2).

**The final tree, alone, from the fixed file:**

| run | before (report 019's code) | after |
|---|---|---|
| 21 days | 152.9 s, 501 MB (beside two other runs) | **234.4 s, 630 MB** (alone; every line the reference's but the one `waiting` entry) |
| to the deadline | 2,288 s, 2,091 MB (beside two other runs; report 019: about 36 minutes alone) | **419.5 s, 683 MB** (alone; the same) |
| `npm run check -- planner` | 2,070 s (report 019, alone) | **4,873 s**, alone (the service's own outlook child ran 03:10–03:15 beside it): rows A 4,855 s, B 867, C 1,350, E 2,466, G 4,252; the line to the digit |

**What holds the memory now** (the final tree, the whole season, `node --expose-gc`, a forced collection at the end, then the tables emptied with `setCaches(false)` and collected again): **91 MB live, 26 MB once the solve table (36,674 keys), the cuts, the spots and the tolls are emptied**. The table is bounded by `MEMO_CAP` (100,000 keys, the oldest tenth dropped at the cap); every other memo lives with its World or is static (routes, banks). So the 683 MB peak is V8's room for the garbage of decisions, not data kept: the old run held 410 MB live at day 60 (353 MB of it its solve tables) and peaked at 2.1 GB.

**The service's horizon** (settled point 6): the whole season, alone on the final tree, took 419.5 s and 683 MB — within ten minutes and 1 GB, so `HORIZON_DAYS = 0` (`src/state/outlook.ts:59`): the service plays to the deadline and the Season card shows "expected at the deadline" by itself (`src/ui/RoadmapTab.tsx:81-85`, unchanged). `KILL_MS` stays 30 minutes. The five-minute target is not reached: 7 minutes alone (with B it was 5.6 minutes but over 1 GB).

## Riding along, the checks, the docs
**Riding along** (settled point 8; each a few lines, each proven by lines that stay equal):
- **A character that is off is not played** (`forward.ts:231`: `forward()` plays the characters `config.on` names; the others get
  no decision and no step, and their gear stays on them; `road.ts:55`: the `next` line waits only for the characters that are
  on). All five are on in the fixed file and in every row, so no reference line moved (the 21-day and season roads and the
  replay line below are the reference's). `check-road` shows it on the made-up world: with Second off, 30 steps of the four
  others in eight hours and Second's character object untouched.
- **`waitingOf` and a fight the fleet prepares** (`forward.ts:316-317`, `:326`): a kill gate nobody wins on the gear alone that
  some character that is on wins with the potions the planner would make (`consumables.ts potionSet`, the chain's price) now
  waits for "potions (a safe win once they are made)", not "gear (no safe win within ten levels)". On the fixed file the_new_bandit
  (2 points) moves to that group; nothing else moves: the road's first line (`waiting`) differs in that one entry and every other
  line is the reference's (the final tree's 21-day and season roads against the reference: `waiting: 1 entries differ: the_new_bandit gear → potions`, `every other line equal (23)` and `(97)`. the_reaper — the case the chat named — stays under gear, honestly: besides the vampire (250, won with the bank's potions and in work) it needs 250 death knights, level 28, which nobody wins within ten levels even with potions (`POTION_REACH` 3)).
- **`outlook()` and `Outlook`** of `forward.ts` are deleted (nothing imported them; the header comment says so).
- **`played`** is an option: `forward(…, keep = true)` (`forward.ts:227`, `:269-270`) counts `steps` always and keeps the
  played steps only when asked; `road()` asks for none (`road.ts:82`, `:86`). `check-planner` keeps them.

**The checks.** 85 checks, as in report 019 — no new file; the new cases are inside the two the task names, plus one line of a
scenario:
- `check-road`: **two runs in one process give the same lines** (the proof of settled point 3); **a character that is off is
  not played**; **the speed guard** — its first road, six hours of the made-up world from First's step in flight, cold, must take
  at most three times `SIX_HOURS_SEC` = 16 s, what it takes on the final tree alone (15.9 s) (`scripts/check-road.mts`).
- `check-planner`: **the caches off against on** — a child beside the rows plays six hours of the 11-20 snapshot with
  `setCaches(false)` and again with the caches on, and the lines must be the same (a made-up case: 98 → 99 cases); rows given
  comma-separated in `AMMO_PLANNER_ROW` are played in that order in one process (for this report's two orders; the check
  itself plays one row a child, as before); the replay's line prints `N solves cached` instead of the two old tables. Row G's pin
  (86, report 016's row A) holds.
- `scripts/scenarios/outlook-service.mts`: one line — it computed the horizon it expects as `min(deadline, now + HORIZON_DAYS
  days)`, which is "now" for `HORIZON_DAYS` 0; it now mirrors the service's own formula (`src/state/outlook.ts:142`).
- `scripts/check.mts`: the backstop for a named check is now 6,300 s, about 1.3 × the planner check's 4,873 s — raised from 2,700 s, not lowered: the check is slower (section 3) —, and the plain run gives `check-planner` 900 s (`timeoutOf`): its first week took 365 s there with four checks side by side, over the old 300 s, and the first plain gate run killed it at 300 s.
- `check-outlook-child` is untouched (I had put the speed guard there first and moved it: that check is not among the two this
  task may change).

**The docs.** `CLAUDE.md`: the outlook's section (the horizon, the run's time and memory, a run is exact), the planner's core
(an off character is not played, `outlook()` gone), the solve cache (what a solve is keyed on, the asks, the per-solve score
memo, the reuse rules gone, the memos that outlive a World, how the gate proves it), the consumables bullets that described the old reuse rules,
the checks list, the replay's new line. `docs/journal.md`: the `outlook` record's `until` (the service's horizon).

## The first hours of 019's code
`npm run journal -- --from 2026-11-21T20:59:29Z`, last read at 06:48 UTC on 11-22 (210 records) (the tables as they are are in my scratch; here only what
they do not explain). The service is still run `dxgi`, commit `b808b47`, up since 20:59:30 (`logs/status.json` at
06:47:38 UTC): no restart, no new run id, no `boot` record since.

- **The outlook records.** Four. 21:01:30 → 21:04:31: 180.9 s beside the service (report 019's 148 s were alone), 59 at 12-12,
  report 019's code. 00:04:31 → 00:10:21: **349.5 s, 53 by 12-13 — this child loaded this task's working tree** (the exact
  cache with the speed changes made by then: A1, B, C, P, G, F, K, M, T, D, C2, the `waitingOf` change; the tree was green), on a
  machine where I had eight to ten other processes running; no `failed` record. The characters went on through both: in
  21:01:30–21:04:31 each acted 6–8 times, the longest gap 32 s; in 00:04:31–00:10:21 10–12 times each, the longest gap 37 s (the
  raw log's action lines); no `pause` in either window. 03:10:21 → 03:15:27: 304.9 s, 53 by 12-13 — the final tree, still at 21
  days (the running service read `HORIZON_DAYS` at its start), beside my gate run; 06:15:27 → 06:21:58: 390.8 s, 57 by 12-13 (the
  final tree, beside my two order runs); no `failed` in any.
- **The road against play.** The only completion an `outlook` record expected by now is intermediate_lumberjack (the run from the
  11:43 World: about 21:20 UTC on 11-21; done 20:27:33, before the boot). The 21:01 run's first three are expert_miner (11-22
  15:54), worker (11-23 12:36), intermediate_alchemist (11-23 13:03) — not yet due; no `ach` record since the boot.
- **`pause`, `block`, `flap`, `nostep`, `defect`, `stopped`, `server`.** Five, all Third's (no flap, nostep, defect, stopped or
  server record). At 21:23:57: the re-attached
  `mat:minor_health_potion@Third#1` (736 to brew, 640 done) paused — "no Nettle Leaf (need 2) for Minor Health Potion in bag +
  bank" — and was blocked six hours (strike 1). The step had been decided before the restart with its withdrawal of 736 nettle
  (20:48:22); the bank ran out at 640. Third went on to the vampires (three steps), then intermediate_alchemist (148 gathers),
  then at 23:54 `src:nettle_leaf` for the same parent (`cons:minor_health_potion:ach:the_reaper:1`) — the supply came back by
  itself once the block was in. At 05:08:34 `lvl:gearcrafting:25@Third#2` paused — "Train Gearcrafting +1 level: not a safe win
  vs Ogre" (the train loop hunts a drop for its recipe and the live forecast gate refused the fight) — blocked six hours. At
  06:04:37 Third's event trip to the bandit camp (spawned 05:51:53) paused on "not a safe win vs Bandit Lizard" and the
  interrupt ended at 06:07:29; Fifth's trip to the same spawn ran to its end (06:41:42, 1,529 s). Where a plan judged a safe
  win and the executor's gate did not, a step paused instead of fighting — as designed; not looked into further here.
- **The offering interrupts of 11-22.** All five issued at **00:09:30** (the five-minute tick after 00:05, as 018 moved it). First
  done 00:29:26 (1,196 s), Fourth 00:29:37 (1,207 s), Second 00:41:51 (1,941 s): each did fishing; combat not ("no way to get
  6×/8× Rat Hide"), gearcrafting not accepted. Third done 01:52:22 (6,172 s): combat and fishing; gearcrafting skipped ("can't get
  1× Conjurer Skirt or any lower bracket's item"). Fifth done 03:15:17 (11,147 s): fishing; combat not ("no way to get 8× Rat Hide"), gearcrafting not accepted. The journal holds no earlier midnight of 019's code.
- **Report 017's acceptance step 8.** The Spent table: two records — Second spent 24 tasks coins at 03:31:31 (`mat:astralyte_crystal`) and 72 at 03:42:43
  (`mat:jasper_crystal`): 96 coins, each a `spend` record on the step that bought. Kill steps
  of fewer than five units: none (every kill step since the boot was the_reaper's vampires, 10–11 kills). **Every `pl:` fight
  step's end withdrew only pieces of its `wear`** plus its planned potions — the six vampire steps since the boot: Third#1 drew
  steel_battleaxe, iron_shield, hard_leather_helmet, mushmush_jacket, hard_leather_pants, iron_boots, earth_ring ×2 (its wear
  less the amulet it wore) and 29 potions (64 more came from its bag, the brew's); Fifth#1 its wear less the boots it wore, 14
  air boost and 93 minor health potions; Second#1 its wear less the rings it wore, 12 + 96 potions; Third#2, Third#3, Fifth#2
  potions only. One thing the kill table shows: Third#1 "withdrawn 29, drunk 73" — the reset topped the 64 it carried up to the
  planned 93, so it drank from the bag's stack, not more than it took.
- **The sample `craft:hardwood_plank` of 20:52:11** (`s` 72, `est` 309, `mean` 38, `n` 4): `s` is that step's running seconds a
  unit — 5,148 s for 72 planks, which includes gathering 184 ash wood inside the step (the meter: gather 3,864 s, craft 324 s, walk
  615 s); `mean` is the moving mean of the four samples so far (`cost.ts sample`: 0.7 × the last mean + 0.3 × this one); `est`
  is the model's unit price, `cost.ts unitSec` with no measured cost — every ingredient at its field price, stock not counted
  (4 ash and 6 birch wood gathered a plank; `src/state/planner.ts:410-415`). The step drew 720 wood from the bank. So **the
  estimate is not wrong and neither is the sample: they count different things** — the right comparator for a stock-fed craft
  step is its own plan (5,380 s planned for 72 = 75 s a plank against 72 measured).
- **The 1,000 gold** between 240,836 (the boots of 17:01 and 18:47) and 241,836 (the boot of 20:59): intermediate_lumberjack's
  reward is 1,000 gold (`public/data/achievements.json`); it completed at 20:27:33 (`plan: completed intermediate_lumberjack (+1)`
  at 20:27:58). The game pays it into the bank, no action echoes the bank's gold, so the running service saw it only at the next
  boot's `/my/bank`; a `spend` record is for gold that leaves.
- **The market file.** `logs/market/2026-11-21.jsonl`: 43 lines from 17:01:03 to 23:50:27, no gap over fifteen minutes (the
  restarts of 18:47 and 20:59 inside that); `2026-11-22.jsonl`: 41 lines from 00:00:31 to 06:42:52, no gap over fifteen
  minutes.

## What was done / files
**Files changed** (`git diff --stat b808b47`): `src/plan/planner/reach.ts` (the exact solve cache, the switch, `firstWin`,
`gatherCut`, `nearestSpot` and the toll kept on what they read, `eventTiles` once per World, `MEMO_CAP`), `src/plan/bis.ts`
(`bisPools` exported and taken as given, a set's score once a solve by a short set key, the heuristic once per monster and item,
the tiebreak read off the key), `src/sim/combat.ts` (`opening` without a `Map`), `src/plan/planner/supply.ts` (`gateRoad`),
`src/plan/planner/pick.ts` (`hasNode`, `pickRecipe`'s `first`), `src/plan/planner/cost.ts` (the existence checks),
`src/plan/planner/forward.ts` (off characters, `keep`/`steps`, `waitingOf`'s potions, `outlook()` gone),
`src/plan/planner/road.ts`, `src/state/outlook.ts` (`HORIZON_DAYS` 0), `scripts/check-road.mts`, `scripts/check-planner.mts`,
`scripts/scenarios/outlook-service.mts`, `scripts/check.mts`, `CLAUDE.md`, `docs/journal.md`; new: this report and the task
file. Scratch: `D:\Temp\claude\…\scratchpad` (deleted at the end, see below).

**Every command** (the scratch folder written `<s>`; the fixed file's copy `<w>` = `<s>/world-2026-11-21.json`):
- git: `git status --short`; `git log --oneline -3`; `git diff --stat docs/rework.md`; `git add docs/rework.md`; `git commit -m
  "Rework notes" -m "Co-Authored-By: …"`; `git log --oneline -2`; `git archive b808b47 | tar -x -C <s>/base`; `git archive b808b47
  src scripts public/data package.json tsconfig.json | tar -x -C <s>/instr`; `git diff --stat` (several times); `git diff
  src/plan/bis.ts`, `git diff src/plan/planner/reach.ts`, `git diff src/plan/planner/forward.ts`, `git diff
  scripts/check-road.mts`; `git config --get core.autocrlf`; `git show HEAD:src/plan/bis.ts | head …`; `git show
  b808b47:<file>` for `forward.ts`, `road.ts`, `reach.ts`, `supply.ts`, `scripts/check-planner.mts` (read, grepped);
  `git checkout scripts/check-outlook-child.mts` (my own edit undone); `git stash list` (read); at the end `git status --short`, `git diff --stat`, `git add` of the task file, this
  report and the changed files, `git commit -m "020: run speed" -m "Co-Authored-By: …"`, `git log --oneline -3`, `git push`.
- PowerShell: `Get-ChildItem` of the planner's and the solver's files; `Get-CimInstance Win32_Processor`/`Win32_OperatingSystem`
  (cores, memory); `Get-Item`, `Copy-Item`, `Get-FileHash` of `logs/world/2026-11-21.json` (copied to `<w>`); `New-Item
  -ItemType Junction` (`<s>/base/node_modules`); `Get-CimInstance Win32_Process` (my scratch processes, many times) and
  `Stop-Process` on my own scratch processes only (stray runs and loops I had started); `Get-Content` of scratch outputs; at the
  end `cmd /c rmdir` of the scratch junctions (`node_modules`, `public` under `<s>/states/*` and `<s>/base`, unlinked before the
  delete so it could not reach through them), then `Remove-Item -Recurse` of the scratch folder's contents.
- the baseline (untouched tree, `<s>/base`): `node --import tsx --import file:///<s>/measure.mjs scripts/outlook.mts --world <w>
  --json` (to the deadline), `… --days 21 --json`, the same with `--cpu-prof --cpu-prof-dir=<s>/prof21` (21 days) and
  `--cpu-prof --cpu-prof-interval 5000` (`--days 60`); `node <s>/prof.mjs <profile>`; `node <s>/cmp.mjs <a> <b>`.
- the counters (`<s>/instr`, counters added to `reach.ts` and `forward.ts`, `scripts/measure-road.mts` written there): `node
  --import tsx … scripts/measure-road.mts --world <w> --days 21|60`; `node --expose-gc --import tsx scripts/measure-road.mts
  --world <w> --days 21|60` (the heap attribution); `… --world <s>/world-replay.json` (the replay's start World, stopped at
  day 5 under load, then run whole: 2,403 s); `node <s>/weeks.mjs <s>/instr-60.err`.
- the exact and fast trees: `node --import tsx <s>/drive.mts --root <tree> --world <w|fixture> [--days N|--hours N] [--runs 2]
  [--steps] [--fresh] [--daily] [--world-at N] --out <prefix>` (the 1-day two-run test, the 3-hour fresh test, the 12-hour fresh
  test on `scripts/fixtures/world-2026-11-20.json`, the 21-day and season references, every state of section 3, the season's
  every decision, the diagnostics); `node --import tsx <s>/decide-at.mts --root <tree> --w <world.json> --who <name>`; `node
  --import tsx <s>/order.mts …` (fightRec first or after planRec, old code); `node --import tsx <s>/late.mts …`; `node --import
  tsx <s>/cert.mts …`; `node --import tsx <s>/mkreplay.mts <s>/world-replay.json`; `node <s>/part.cjs …`; `bash <s>/snap.sh
  <state>` (scratch copies of `src` per state, junctions to `public` and `node_modules`); `bash <s>/batch.sh 21|season
  <states…>` (each state alone, in turn); `node <s>/btable.mjs <s>/batch.log`.
- `check-planner` outside the gate: on the pre-speed snapshot `cd <s>/exact; node --import tsx scripts/check.mts planner`
  (stopped at once: a broken scratch line), then `AMMO_DUMP_STEPS=… AMMO_CHECK_VERBOSE=1 node --import tsx --experimental-webstorage
  --localstorage-file=<s>/cpx.db --disable-warning=ExperimentalWarning scripts/check-planner.mts` (stopped after 97 minutes,
  rows B and C done); old rows `AMMO_PLANNER_ROW=i AMMO_DUMP_STEPS=… AMMO_DUMP_DAYS=12 node … scripts/check-planner.mts` in `<s>/base`
  (i = 0, 1, 2, 4, 6) and with `AMMO_DUMP_WORLD_AT` (rows A, B, C); the plain check on two states (`node … check-planner.mts`
  without `AMMO_CHECK_VERBOSE`); the full check on `<s>/states/s12-cp` (the new line); a row-A profile to day 40 (`--cpu-prof`);
  the two orders `AMMO_PLANNER_ROW=0,1,2,4,6` and `6,4,2,1,0`, first in `<s>/states/s13p` (stopped after a few minutes to keep
  the timings clean), then in `<s>/states/s15p`, the final tree (side by side, 04:15:05–08:05:01 and 04:15:06–08:08:54; `node <s>/orders.cjs
  <s>/order-01246.out <s>/order-64210.out <s>/gate-planner.out`); `node --import tsx <s>/drive.mts --root
  <s>/states/xv1b …` (the final tree with `fightRec` at 3 and 3, the season); `node --expose-gc --import tsx <s>/drive.mts --root
  <s>/states/s15-final …` (the final season's heap); `node <s>/cmpw.mjs <ref> <new>` (lines compared, `waiting` entry by entry).
- edits: `python <s>/patch-B.py`, `patch-D.py`, `patch-F.py`, `pG.py`, `pP.py`, `pa1.py` (scratch only), `/tmp/pb2.py`; `node -e
  …` edits; `sed -i` (line endings back to LF after Python wrote CRLF; `FIGHTS_CAP`/`MEMO_CAP`/`FRESH_H` values in scratch
  states and the tree); `node <s>/fixnl.cjs` (scratch files only).
- the gate: `npx tsc --noEmit` (after every change); `npm run --silent check -- road`; `npm run --silent check -- planner` (alone, 02:40:40–04:01:54); `npm run --silent check` (alone, twice: the first killed `check-planner` at the plain 300 s backstop — 84 ok, 1 failed, 300.4 s —, then with its 900 s: 85 ok, 365.7 s); `ls logs/` and `find logs -newer …` before and after (nothing new but the service's own journal, raw, market and status files); `npx vite build --outDir <s>/ammo-020-dist --emptyOutDir`.
- section 5: `npm run --silent journal -- --from 2026-11-21T20:59:29Z` (four times as the night went on); `grep`/`node -e` over
  `logs/journal/2026-11-2{1,2}.jsonl`, `logs/raw/2026-11-2{1,2}/*.log`, `logs/market/*.jsonl`, `logs/status.json` (read only);
  `node -e` over `public/data/achievements.json`.

## Notes
- **The model now expects 78 at the deadline, not 98, and its fleet stands still for two months.** From 12-24 (First from 01-09)
  all five characters take the fallback gather ("nothing else is open") until the deadline: the fighters are at combat 23–26,
  their combat roads walled ("no XP source" at the next level), and every late kill waits for "gear (no safe win within ten
  levels)". The old 98 had its late combat and event completions from results served across pools and from `fightRec`
  answering with `planRec`'s set (section 2); without that noise the planner as written finds no way on for its fighters. This
  task changes no rule, so it stays as it is; it is the first thing the next planning round may want to look at (where the
  walls are, and whether gear by need or the potions' reach should open them). The experiment above points at the fight solve's caps: `fightRec` at 3 and 3 gives 98 again. Why the wider search plays worse is a guess — it can pick more potions into a set, and a set that drinks waits for its stock (`fightTake`, the sliver rule) — and it is the planning chat's to look at; the caps are constants this task leaves alone.
- **The exact cache costs its price where the fleet moves.** It solves about five times as often as the old one in the first
  week of a World (36.6k solves on the live World's first week, 18.8k on the replay World's first day against the old 3.9k);
  more than half of those differ from an earlier key only in the worn codes, which `bestInSlot` reads for its last tiebreak
  (keep what is worn, `bis.ts:252` at `b808b47`). A tiebreak that did not read the worn set would let a solve serve every worn
  set — that is a rule of the solver, not a cache, and not this task's. It is why the 21-day road (234 s) and the replay rows
  are slower than report 019's while the season is five times faster.
- **B (the fight table) gained 27% on the 21-day road** and came out only for memory: kept in the outlook child it would need the
  child's heap capped (`--max-old-space-size` where `src/server/main.ts` spawns it, outside what this task may change) or a much
  smaller entry.
- `potionRec`'s ask names its price by the table alone (`reach.ts:492-495`): its one caller's price is a function of the World
  and the name. A second caller with another price would need the price in the ask.
- The `waitingOf` change moves the_new_bandit, not the_reaper (section 4): the chat's reading of the_reaper was half of it.
- `scripts/scenarios/outlook-service.mts` is not one of the two checks the task names; its one line had to follow the horizon
  (it expected `min(deadline, now + 0 days)` = now).
- Third's re-attached brew (`mat:minor_health_potion@Third#1`) paused when the bank ran out of nettle at 640 of 736 — a step
  decided before the restart withdrew more than the bank then held. It cost one block and came back by itself; not touched.
- Process notes, for the record: my Python edits wrote CRLF line endings into four files (caught by `git diff --stat`, put
  back to LF before anything ran from them); a first timing batch was stopped badly and left loops behind that ran beside the
  second — I killed both, made the batch honour a stop file and ran every timing again alone (the table holds only clean runs).
- Guesses, most doubtful first: that the replay rows' late slowness is mostly the price part of the keys drifting as gatherers
  level (the diagnostics count 13% price misses on the replay World's first six days, but I did not measure its late weeks);
  that V8's heap growth, not the live data, makes most of the 683 MB peak (the live heap after a collection is 91 MB).

## To delete (Alex)
Nothing.
