# 030 — Weapons before potions: report

## Summary
- **Committed: `GEAR_FIRST` = `all`.** First's and Fifth's combat levels on day 42 sum highest under it: 50 + 50 = **100**, against `pick` 46 + 46 = 92
  and `off` 45 + 45 = 90 (road days from `logs/world/2026-11-26.json`; 11-26 is road day 1).
- **The first level-30 weapon**: `off` day 9, `all` day 6 (Gold Sword), `pick` day 8 (Elderwood Staff); **level-35**: none by day 42.
- **First / Fifth**, days 14 · 28 · 42: `off` 35/35 · 40/40 · 45/45; `all` 36/36 · 42/42 · 50/50; `pick` 38/35 · 44/42 · 46/46.
- **Points on day 42**: `all` 68, `off` 65, `pick` 63. The committed value costs no points; it gains 3 over `off`.
- **The outlook** is killed after 90 minutes (was 30); its 21 days from 11-26 under `all` take 2,409 s (843 MB): inside, not before.
- **The gate**: typecheck passes; `npm run check` 116/116 in 256.3 s; the build into `D:\Temp\ammo-030\dist` passes (379.70 kB).
  `npm run check -- planner` on `all`, without the backstop, `AMMO_CHECK_VERBOSE=1`: `OK (802105 invariant checks, 97 made-up cases;
  deadline points 78 / 112 / 94 / 87 / 86)` in 4,856.3 s (029: 91 / 114 / 96 / 87 / 80). Decision 1.

## Decisions for Alex
1. **The replay's row A falls from 91 to 78 under `all`.** On the same check, `pick` gives 96 / 112 / 94 / 86 / 86 (744,150 checks,
   4,815 s). The task's rule reads the 11-26 road (all 100, pick 92, off 90), so `all` is committed. Options: keep `all`, or switch
   to `pick` (a one-word change in `config.ts`).
2. **No level-35 weapon by day 42 under any value.** The 35s are needs from day 11.5 and their materials are worked ahead, but each
   asks a Diamond: 40,000+ Diamond Stone actions, chains of 500–680 h. Once the fighters reach 40 (day 23), `gear.ts`'s `PER_SLOT`
   3 keeps only level-40 weapons, and none of those is a need (they ask weaponcrafting 40). Weaponcrafting reaches 35 on day 31
   (`pick` 42, `off` never). Yet the fighters reach 50 on level-30 weapons (`all`: days 42, 39). Options: leave it; a per-slot rule.
3. **Speed.** The roads under `all` and `pick` take 1.7 times `off`'s seconds to day 42: 5,507 and 5,265 s against 3,152 s, with
   481,750 and 436,332 solves against 302,745. They make the same number of decisions. This is task 031's subject.

## How Alex verifies
- `npm run check -- gear-first`: 4 cases on `scripts/fixtures/world-gear-first.json` (the 11-26 road at 8.38 h). All 4 fail on
  `2d3f66e`: the check file was run inside a `git archive 2d3f66e` tree from this folder, where `off` gives the Algae as asserted.
- The roads: `node --import tsx D:\Temp\ammo-029\drive.mts --tree D:\Temp\ammo-030\tree --world <abs>\logs\world\2026-11-26.json
  --days 42 --cfg '{"gearFirst":"all"}' --dec <dec>` (and `off`, `pick`), then `tab.mjs off=<road>,<dec> all=… pick=…`. C.1:
  `c1.mjs`, `dump3.mts all <day>` + `why35.mts` / `why-cyc.mts`; C.2: `c2.mjs` — all in `D:\Temp\ammo-030`. Speed: `npm run outlook`.

## The roads (029's driver, `--cfg`, the World of 11-26 to day 42; the weapon is that of the fighter's last kill step by the day)
| | day 3 | day 7 | day 14 | day 21 | day 28 | day 42 | reaches (road day) |
|---|---|---|---|---|---|---|---|
| First/Fifth combat — off | 31/31 | 32/32 | 35/35 | 39/39 | 40/40 | 45/45 | 35: 10/11 · 40: 23/25 |
| — all | 30/30 | 31/32 | 36/36 | 38/39 | 42/42 | 50/50 | 35: 13/10 · 40: 23/23 |
| — pick | 31/30 | 33/32 | 38/35 | 40/40 | 44/42 | 46/46 | 35: 10/12 · 40: 18/21 |
| wc/gc/jc — off | 30/28/24 | 31/31/27 | 31/35/28 | 31/36/29 | 32/37/39 | 34/39/41 | 30: 3/6/22 · 35: —/14/23 · 40: —/—/29 |
| — all | 30/30/27 | 31/33/33 | 32/36/37 | 33/37/40 | 34/39/41 | 37/42/41 | 30: 3/3/5 · 35: 31/10/9 · 40: —/31/17 |
| — pick | 31/30/27 | 31/33/33 | 32/36/38 | 32/37/41 | 33/38/41 | 35/40/41 | 30: 3/3/6 · 35: 42/10/9 · 40: —/38/16 |
| weapon First/Fifth — off | 20/20 | 20/20 | 30/30 | 30/30 | 30/30 | 30/30 | first 30: day 9 · 35: never |
| — all | 20/25 | 30/30 | 30/30 | 30/30 | 30/30 | 30/30 | first 30: day 6 · 35: never |
| — pick | 25/25 | 25/25 | 30/30 | 30/30 | 30/30 | 30/30 | first 30: day 8 · 35: never |
| points — off / all / pick | 39/40/40 | 43/41/44 | 48/48/45 | 50/52/52 | 57/54/52 | 65/68/63 | |
- **The fighters' hours of "no fight admitted"**, to day 42: `off` 53, `all` 47 (plus 76 h at the level cap), `pick` 295.
- **A worker's hours by kind** (all three workers; train step / training supply / consumables' supply / a need's kills / cooking /
  an objective's needs / the rest): `off` 585 / 321 / 1,162 / 412 / 3 / 44 / 366; `all` 1,383 / 491 / 325 / 388 / 12 / 30 / 251;
  `pick` 1,189 / 426 / 602 / 340 / 0 / 3 / 328.

## C.1 Materials ahead, and C.2 Play against the road
- **C.1** (no change). **029's road**: the Elderwood Staff waited for its wearer. `gear.ts candidatesOf` takes only a piece its fighter can wear
  (`canEquip`; the staff asks level > 29). First reached 30 at the end of day 5, so the Cyclops Eye leaves opened at 6.06; a worker had
  hunted the Cyclops since day 5.37. **No rule holds materials until the craft level**: `rank()` opens a piece's bill whatever the
  crafter's level. Lifting `canEquip` would touch `candidatesOf`, every need's solve (a set it cannot wear yet), H1 and the forward
  model's `wear`. **The committed road**: the Gold Sword (30) was made day 6.06; weaponcrafting hit 30 at the end of day 3. On day 4.5
  its Red Cloth was First's at 0.0125, under a training's kill at 0.0138: the score held it. **35**: decision 2.
- **C.2** (journal 07:25:53 → 10:27 UTC, 3.0 h, on `2d3f66e`; against day 1 of 029's final road): XP an hour over train steps /
  over the crafter's hours — weaponcrafting 3,058 over 0.93 h / 940 (road 4,054 / 1,826); gearcrafting 10,371 over 0.33 h / 1,132
  (2,303 / 987); jewelrycrafting none (3,090 / 658). Train steps: 2 ended, both re-attached and sourcing their own shortfall, none
  started (road: 29, 10 from the bank). Sap and Eggs for Health Potions took 6.1 of the workers' 9.1 h. Fighters: XP pick 2.9 h,
  coins for the Steel Axe 2.6 h, a training's kill 0.6 h (road: training kills 47.4 h).

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/config.ts`, `types.ts` | `GEAR_FIRST` (`all`), `config.gearFirst`; rule `need-cons`. |
| `src/plan/planner/decide.ts` | `Candidate.gear` (gear work (a) of a non-tool piece, its level, a training, any parent of a leaf; `pick`: the XP pick's consumables, by `along`'s picks); the worker's tier (1) in two halves; `ORDER` follows `GEAR_FIRST`. |
| `src/state/outlook.ts` | `KILL_MS` 30 → 90 minutes; its header. |
| `scripts/check-gear-first.mts`, `fixtures/world-gear-first.json`, `fixtures/whys-030.json` (new) | D.1; this tree's whys. |
| `scripts/check-tools.mts`, `check-onepage.mts`, `whys.mts` | The payback case runs `off`; whys-030, `need-cons`, A.2's road 48 h. |
| `CLAUDE.md`, `docs/journal.md` | The worker's tier (1), `ORDER`, the checks, the replay's line; the outlook's 90 minutes. |

## Notes
- **Constants**: one new, `GEAR_FIRST`. The new rule `need-cons` is in `ORDER`; its why reads "worker, a need (consumables or a tool): …",
  so the page marks which half took the step. (1a)'s own steps keep "worker, a need: …".
- **A leaf is (1a) by any parent it serves**: an Ogre Skin that a road piece needs is (1a), even when its best parent is a tool.
- **No scenario asserted the 30 minutes** (`outlook-service` drives a fake runner); only the texts followed. `HORIZON_DAYS` and
  `EVERY_MS` are unchanged.
- **Older checks**: under `all`, 67 of 97 whys moved, so whys-030.json is recorded. The 11-25 fixture's first piece comes at 41.6 h
  (`off` 31.7, `pick` 25.5), so A.2's road is now 48 h.
- **Not done**: no service run. Nothing was written under `logs/`. `docs/rework.md` equals `HEAD`, so there is no `Rework notes`
  commit.
