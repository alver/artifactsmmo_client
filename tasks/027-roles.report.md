# Task 027 — Roles: report

## Summary
- **Stopped before the commit: the task's own stop applied.** From `logs/world/2026-11-24.json` to the deadline the role road gives
  **84**, `a394ae1` gives **96**: 12 points below, more than the 10 allowed. **Nothing is committed or pushed.** The working tree
  holds the whole change, and the gate is green on it. Whether to take it, and how, is decision 1.
- **Why the role road falls behind**, read from the two roads (no variant was played):
  1. **Weaponcrafting stops at 30.** Second turns fighter on day 3 of the model. It keeps its craft (no craft changes hands), but
     a fighter takes no craft step, and no worker holds weaponcrafting. The three fighters fight with a Skull Staff or a
     Battlestaff (level 20) all season. They stall at combat 39 (days 13–25) and 41 (days 27–60) and end at 44. On `a394ae1`
     weaponcrafting reaches 45 and all five characters reach combat 46–47.
  2. **A stalled fighter has no work it may take.** No fight is admitted for its level, so it falls back to gathering:
     **3,521 character-hours** of fallback (`a394ae1`: 229), from day 18 on, and nearly all of it the fighters'. The gathering
     achievements that `a394ae1`'s characters took slip by weeks (cabinet_maker day 2 → 35, master_miner 29 → 72,
     shining_secrets 31 → 78). Five never complete: 14 points (cursed_wood_blessed_victory, magic_harvester, tasks_coins_fan,
     making_a_nether_portal, king_of_the_goblins).
- **The roles work as written.** `check-roles` has 13 cases; on `a394ae1` 12 of them fail, and the 13th (no chicken hunt for a
  worker) passes there because that tree has no hunt at all. A fighter takes fight work only, and its XP pick when nothing
  ranks. A worker takes, in order: a fighter's need, an objective done within 6 h, its craft to 30, then its own lanes. Second
  turns fighter at weaponcrafting 30, and Fourth then holds woodcutting. Each fighter gets its own set (`openOf`), and the
  "two fighters, one piece" case is back to its old reading. The why says the role. The Now card shows the role.
- **Riding along, both done.** Restore potions: one entry per potion in slot order, and a short stack runs out (at the gate).
  `check-effects` pins three new cases (red on `a394ae1`). The forecast tool's strict bands are unchanged, and its restore
  forecast went from 1,011 to 862 potions against 867 drunk. `check-atlas`'s pins hold on the regenerated atlas. The golden
  egg: a fighter hunts it (1,000 chickens, 1.4 h in the model) and the sale is credited on the merchant's calendar
  (turning_treasures_to_gold +2 on day 2 of the role road). The hunt stops at 3,000 kills, and `waitingOf` names the reason.
- **The gate on the working tree**: `npm run typecheck` passes. `npm run check` → `101 checks: 101 ok, 0 known defects
  reproduced, 0 failed — 459.6 s` (025: 100 of 100). The build passes (372.5 kB; 025: 368.2). `npm run check -- planner` →
  `OK (651170 invariant checks, 97 made-up cases; deadline points 86 / 109 / 88 / 73 / 83)` in 2,935 s; 025's line was
  `OK (629839 …; 95 / 123 / 100 / 81 / 85)`.
- **The number that surprised me most**: the role road plays the season in **1,910 s against 5,234 s** (167,123 solves
  against 480,915). The workers have no combat road left to solve.

## Decisions for Alex
1. **The stop.** The roles as written give 84 against 96. Choices, none of them played:
   - (a) **Second stays a worker longer**: `fighterFrom` at weaponcrafting 40 or 45, or not at all, so the weapons keep coming.
     This is a value in `config.ts` and nothing else.
   - (b) **A fighter with no admitted fight works**: where it now gathers the fallback, it takes today's rule (the gathering
     objectives `a394ae1`'s characters take). It is a few lines in `decide.ts` (`today()` on the whole candidate list
     instead of `fallback`). "A fighter always has a fight" does not hold at the wall either way.
   - (c) **Both**, or (d) **commit as written** and let the gear road (028) move the wall. The weapon gap would remain until a
     worker holds weaponcrafting.

   My reading: (1) is the larger cause. The wall is where the weapons stop, and (2) only fills the time spent behind it. (a)
   is a config value.
2. **Readings I took where the task leaves room** (each is a line to change):
   - A worker's tier 2 (an objective done within 6 h) is open to **any lane**, as written; only tier 4 is inside its lanes.
     Never a kill.
   - **⭐ first** acts in a worker's tier 4 only (after its craft is 30); for a fighter, as before among its fight work.
   - A fighter with **no admitted fight at all** takes the old gather fallback (the planner always returns a step).
   - A worker's **craft objective** may still hunt a drop inside its own step (`planMake`'s in-step sources), as the train
     loop's hunts do.
   - The **golden egg's** score is the hunt's hours. Its fit adds one mean gap of the Nomadic Merchant (43 h).
3. **The model's gear-craft hours.** All three crafts reach 30 on day 3 of the model (`craftK` 0.1 × the atlas). Report 023
   measured about twelve days of three workers. So the early role road is optimistic, and in play Second turns fighter later
   than the model says.

## How Alex verifies
1. `git status` shows the files below modified and `scripts/check-roles.mts` and `tasks/027-roles.report.md` new. The branch
   is `rework` and `git log -1` is still `555fd2b` (no commit). `git worktree list` lists only the repository (my scratch
   worktree of `a394ae1` in `D:\Temp` is removed).
2. `npm run typecheck`; `npm run check` → 101 of 101; `npx vite build --outDir <temp> --emptyOutDir`. I ran all three on the
   final tree.
3. `npm run check -- roles` → `OK (13 cases)`, each case with its detail line. Red first: `git worktree add <temp> a394ae1`,
   copy `scripts/check-roles.mts` and `scripts/check-effects.mts` in (with a `node_modules` junction), and run both → 12 of 13
   fail and `check-effects` shows 3 MISMATCH. I did this.
4. `npm run check -- planner` → the line above, about 50 minutes.
5. `npm run outlook -- --world logs/world/2026-11-24.json` → "expected 84 at 2027-02-24". The same on a worktree of `a394ae1`
   (its own `scripts/outlook.mts`) → 96. The levels: `node --import tsx docs/strategy/025/tools/drive.mts --tree <tree>
   --world <abs path> [--cfg '{"roles":…}'] [--dec <file>]` (the final tree with `--cfg` holding `DEFAULTS.roles`: the same 84,
   line for line with the outlook). I ran all four, and the role road twice (84 both times).
6. To take the change as it is: commit `docs/rework.md` as `Rework notes` (the planning chat's), then everything else as
   `027: roles`, and push. I did neither.

## The road (one road each, from `logs/world/2026-11-24.json`)
| | day 7 | day 14 | day 28 | deadline |
|---|---|---|---|---|
| points, `a394ae1` | 45 | 53 | 63 | **96** |
| points, roles | 43 | 43 | 55 | **84** |
| combat F/S/T/Fo/Fi, `a394ae1` | 27/26/30/24/29 | 29/37/40/36/40 | 38/42/44/44/44 | 47/46/46/47/46 |
| combat F/S/T/Fo/Fi, roles | 34/33/24/24/34 | 39/38/24/24/37 | 41/40/24/24/41 | 44/44/24/24/44 |
| weapon / gear / jewelry, `a394ae1` | 24/30/26 | 30/30/30 | 30/31/30 | 45/45/44 |
| weapon / gear / jewelry, roles | 30/30/30 | 30/35/32 | 30/38/32 | 30/40/40 |

The day each craft reaches 30: on the roles, all three on day 3 (11-26), and **Second turns fighter on day 3**. On `a394ae1`:
weapon day 9, gear day 7, jewelry day 9. Starting levels: weapon 20, gear 23, jewelry 24; combat 24–26.

| | `a394ae1` | roles |
|---|---|---|
| completions / steps | 31 / 6,189 | 27 / 7,438 |
| outlook seconds (beside other runs) / solves | 5,234 / 480,915 | 1,910 / 167,123 |
| hours: level:combat · objective · filler · fallback | 1,977 · 1,850 · 2,066 · 229 | 950 · 1,168 · 1,296 · **3,521** |
| hours: greater health potions made for needs | 834 | 1,269 |
| expected fights / losses | 253,401 / 1,240 | 228,046 / 851 |

The fallback by character on the roles: First 1,244 h, Fifth 1,144, Second 1,134, Third and Fourth none. It starts on day 18
("fighter: fallback (nothing else is open to First): Gold Ore at mining 33"). The fighters' weapon in their steps' sets: a
Skull Staff or a Battlestaff to day 27, after that the fallback's pickaxe. The completion dates side by side:
`D:\Temp\ammo-027\cmp.md`. Both roads, the decisions of the role road and the tables: `D:\Temp\ammo-027\` (`drive-*.jsonl`,
`dec-final.jsonl`, `outlook-*.txt`).

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/types.ts` | `RoleConfig` (`role`, `fighterFrom`), `World.hunted`, `PlannerState.hunted` |
| `src/plan/planner/config.ts` | `DEFAULTS.roles`: the task's table |
| `src/plan/planner/roles.ts` | `roleOfCh`/`roleOf` (the one place a role is read), `fights`; a fighter holds no gathering lane, a lane pinned to several workers is the first one's, no computed lane for a fighter |
| `src/plan/planner/decide.ts` | the role filters; a worker's four tiers; a fighter's XP pick; the role in the why; a worker's fallback in its lanes; `WORKER_SHORT_H` 6, `WORKER_CRAFT` 30 |
| `src/plan/planner/gear.ts`, `consumables.ts` | needs (a) and (b) only for those that fight |
| `src/plan/planner/bank.ts` | no tidy step for a fighter |
| `src/plan/planner/reach.ts` | `openOf`: no fighter's worn set counts as the bank's |
| `src/plan/planner/targets.ts`, `supply.ts` | a sale's input is its item's source; the sale is a parent; `HUNT_STOP`, `huntStop`, `saleWait` |
| `src/plan/planner/forward.ts` | the hunt's kills counted; `sales` (the merchant's calendar); `progressed` factored out of `advance`; `waitingOf`'s three sale answers |
| `src/state/planner.ts` | a sale hunt's kills added at its step's end (`hunted …` raw line); `worldOf` passes them |
| `src/sim/combat.ts`, `stats.ts`, `types.ts`, `monte.ts` | restore entries in slot order; `EffectEntry.qty` from a short worn stack; the seed key carries it |
| `src/ui/RoadmapTab.tsx` | the role under each name on the Now card |
| `scripts/check-roles.mts` (new) | the proof's scenarios, on the 11-21 fixture |
| `scripts/check-effects.mts` | three restore pins |
| `scripts/check-planner.mts` | invariants 6 and 11, the roles section, "two fighters, one piece" in its old reading, case 1 on the piece made, `EVEN` (the pins before 027) for the mechanism cases of 8 made-up worlds (the event miner, two crafts deep, alchemy at 17, rule 4, the pickaxe, one miner against three, the consumables' worlds, the beef) |
| `scripts/check-solve.mts` | four sample tiers restated (below) |
| `scripts/outlook.mts` | the snapshot's config patch over this code's `DEFAULTS` |
| `docs/strategy/025/tools/forecast.mts` | H-a is the simulator itself once the repair is in |
| `public/data/atlas.json` | regenerated, 2026-11-24T10:07:48Z, 4 min 39 s |
| `CLAUDE.md` | "The roles (task 027)"; the restore potions; the outlook's config; the replay line |

**Restore potions, what moved.** `check-solve`'s sample: the cultist acolyte for First, Third, Fourth and Fifth goes from "win
win win" to "lost lost lost". The old 12/10 answers wore two restore potions that won only because their heals were summed. I
checked those sets under the new simulator: lost, 0 HP left. A 40/40 search finds no winning set either. Second's row holds.
The forecast tool (`--until 2026-11-23T13:45:00Z`, 20 s each tree):

| | `a394ae1` | now |
|---|---|---|
| strict, p 0.9–0.99 / ≥ 0.99: fights, Σp, won | 22, 21.7, 21 / 619, 619.0, 613 | unchanged |
| restore potions the 7 strict steps drank (867): the forecast | 1,011 | 862 |
| the drain factor (drunk ÷ the rolled mean) | 0.760 | 0.834 |
| strict fights wearing two restore potions; HP left, observed / forecast | 166; 310 / 343 | 229; 290 / 290 |
| inferred, fights < 0.75 / 0.75–0.9 / 0.9–0.99 / ≥ 0.99 | 382 / 145 / 156 / 28,623 | 1,246 / 260 / 471 / 27,329 |

The inferred rebuild drains its estimated stacks by the forecast, so its bands move with it (report 025: indicative only).
`check-atlas`: its 8 pins read the atlas's `path`, which did not change; neither did `bands`, `craftTrain` or `gatherTrain`.
6 monster rows and 9 item rows of level-40 drops differ in detail, and `unlocked` has the death knight at 25 (was 27).

## The live service since the restart (run `13i6`, 11-24 07:39 → 11:18 UTC, read-only)
| what | |
|---|---|
| runes bought | 5, 07:44–08:04, 10,000 gold each (50,000): First "Pig 58 → 48 s a win (−17%)", Second 57 → 47, Third "Wolf 41 → 31 (−24%)", Fourth 58 → 48, Fifth 62 → 52 |
| fight steps ended | Fifth, spider: 58 fights, forecast p 0.945, won 58. Second, spider: 58, p 1.00, won 58 |
| running | First, spider (`arachnophobia_conquered`): 13 fights, 2 lost |
| `loss` records | 2: First vs spider, 10:28:15 and 10:50:39, p 0.958, at full HP (630 of 630), 14 turns |
| points | 36 → 37 (`intermediate_fisherman`, completed 07:55) |

## Notes
- **Observed in play, not touched**: First's `mat:cheese` step (540 cheese, a consumable need for `the_reaper`) made no unit,
  was handed back at 09:13 and blocked at 09:33 for stalling (`a394ae1`'s runtime). The road also plans cheese for Third
  (354, tier 1). Worth a look in the raw log of 09:02–09:33 UTC.
- After Second turns fighter, `bank.ts tidyVerdicts` may still name Second as the one to recycle an outdated weapon. Nobody's
  tidy step takes it then, so the next expansion may come sooner.
- The forward model credits a sale at the first decision after its due time, at most one step late. The hunt counter grows
  only at a step's end (a step stopped mid-way counts its kills then).
- `scripts/outlook.mts` now plays a snapshot with this code's `DEFAULTS` under the snapshot's patch. That is what the
  service would play after a restart. A snapshot's own config is the one of the code that wrote it: the roles before 027,
  and `risk: "safe"` for the 11-24 file. `a394ae1`'s outlook reads the file's config, which equals its own defaults.
- `check-planner`'s first week: 323 s with three long runs beside it (025: 345 s); in the plain gate 459 s beside four.
- The role road was played twice (once with its decision log), and the two runs gave the same 84 and the same 7,438 steps.

## To delete (Alex)
- `docs/strategy/025/tools/forecast.mts`, `patchedSim`'s three restore replacements (now dead: the early return covers the
  new simulator).
- From 025, still there: `reach.ts minWinOf`'s reading of an old `config.risk` string.
