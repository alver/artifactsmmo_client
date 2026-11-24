# Task 027b — Roles, finished: weapons by need, a fighter at the wall, the board read: report

## Summary
- **Committed with 027's change**: `Rework notes` (`docs/rework.md` as the planning chat left it), then `027: roles` (027's
  working tree, this task's engine change, the checks, the reader and both reports), pushed to `origin/rework` — see How Alex
  verifies for the hashes.
- **The two engine changes work as written.** A fighter that holds a gear craft forges by need before its fights. In the role
  road Second, a fighter from day 3, takes six forging steps for three pieces (Dreadful Staff, Elderwood Staff, Gold Sword), and
  weaponcrafting goes 30 → 45: 14 levels by need, 1 by today's rule at the wall. A fighter with no admitted fight works by today's rule ("fighter, no fight admitted: …") and fights again at
  the next admitted fight. `check-roles` has 20 cases; the three new behaviours were red on 027's tree and are green now.
- **The combat levels first**: with roles on, the fighters reach **43 / 45 / 44 on day 28** (027 alone: 41 / 40 / 41; 42 / 45 / 45
  with roles off) and **46 / 46 / 50 at the deadline** (027: 44 / 44 / 44; `a394ae1`: 46–47 on every character). The two workers
  stay at combat 24, as their role says.
- **The points second**: roles on **93** at the deadline, roles off **93**, `a394ae1` 96 (report 027's road), 027 alone 84.
  Roles off and on end equal: the 3 points under `a394ae1` are what the restore potions' repair, the egg and the regenerated
  atlas cost (the roles-off road). The roles cost timing: 10 points behind roles off on day 28 (56 against 66), and 20
  achievements land more than a week later than on `a394ae1` (three never), while the workers train their crafts.
- **One thing looks wrong, and I left it alone**: the final tree **without** roles spends **3,052 hours** in the gather fallback
  (`a394ae1`: 229; roles on: 1,718). Its characters reach combat 45 by day 28 and stand there to the deadline (45–46). I did not
  look into why, as the task says.
- **The gate**: `npm run typecheck` passes. `npm run check` → `101 checks: 101 ok, 0 known defects reproduced, 0 failed —
  491.8 s`. The build into a temp directory passes (372.9 kB). `npm run check -- planner` → `OK (625032 invariant checks, 97
  made-up cases; deadline points 97 / 117 / 83 / 72 / 85)` in 2,336 s; 027's tree gave `651170 … 86 / 109 / 88 / 73 / 83` and
  025's `629839 … 95 / 123 / 100 / 81 / 85`.
- **The board, first reading** (`docs/strategy/board/2026-11-24.md`): the leaders forge on their fighters (the best
  weaponcrafter is a fighter in 34 of 50 accounts), and only two of the 50 are shaped like 027's roles. Five lines under
  "The board".

## Decisions for Alex
1. **The fallback that is left.** Roles on still spends 1,718 character-hours in the gather fallback (`a394ae1`: 229). That is
   now today's rule's own fallback: a fighter with no admitted fight, given the whole candidate list, still finds nothing that
   scores, and so does Fourth for 281 h. I did not touch it (no tuning). The fighters with no admitted fight worked 3,199 h by
   today's rule in all; for 1,437 h of it the rule had nothing better than gathering.
2. **A fighter at the wall gets today's whole list**, as written in point A.2. For Second that list includes its craft's levels
   for points and filler, which point A.1 rules out while it has a fight. I read A.2 as overriding A.1 at the wall. The line to
   change it is `decide.ts`'s free pass.
3. **"Materials in the bank or on their way"**: the `gear:` step is offered when the bank feeds at least one run (`feedable`,
   as before). Materials still in another character's bag count only once they are banked, so a piece waits one step at most.
4. **The model's craft hours (report 027, decision 3) are unchanged**: all three crafts still reach 30 on day 3, and Second turns
   fighter that day (report 023 measured about twelve days for the three).

## How Alex verifies
1. `git log --oneline -3` → `027: roles` on top of `Rework notes` on top of `555fd2b`; `git log origin/rework --oneline -1` →
   the same commit; `git status` → clean.
2. `npm run typecheck`; `npm run check` → 101 of 101; `npx vite build --outDir <temp> --emptyOutDir`. All three run on the final
   tree.
3. `npm run check -- roles` → `OK (20 cases)`, each with its detail line (who took what, and the why).
4. `npm run check -- planner` → the line above, about 40 minutes.
5. The roads: `node --import tsx docs/strategy/025/tools/drive.mts --tree <repo> --world <abs path to logs/world/2026-11-24.json>
   --cfg '<json>' --dec <file>`, the roles on with `{"roles": DEFAULTS.roles}`, off with `a394ae1`'s table (no `role` field). The
   table comes from `D:\Temp\ammo-027b\tab.mjs` over the drive and decision files beside it.
6. `node docs/strategy/board/tools/read.mjs --from 2026-11-24/0921Z --to 2026-11-24/1200Z` → the reading's tables in full; with
   no argument, the newest read alone.

## The roads (from `logs/world/2026-11-24.json`, to the deadline)
The combat levels first, the points second. `a394ae1` is report 027's road (not played again). It has no decision log, so its
weapons are not recorded. Each fighter's weapon is the one in its last kill step's set up to that day.

| days 7 · 14 · 28 · deadline | `a394ae1` | roles off | roles on |
|---|---|---|---|
| **combat** First/Second/Third/Fourth/Fifth | 27/26/30/24/29 · 29/37/40/36/40 · 38/42/44/44/44 · 47/46/46/47/46 | 25/27/30/24/28 · 25/36/37/35/36 · 42/45/45/45/45 · 45/45/45/45/46 | 34/33/24/24/34 · 37/35/24/24/37 · 43/45/24/24/44 · 46/46/24/24/50 |
| **points** | 45 · 53 · 63 · 96 | 47 · 55 · 66 · 93 | 43 · 46 · 56 · 93 |
| weaponcrafting / gearcrafting / jewelrycrafting | 24/30/26 · 30/30/30 · 30/31/30 · 45/45/44 | 22/30/26 · 30/31/30 · 30/32/30 · 45/45/45 | 30/30/30 · 33/35/33 · 35/40/35 · 45/45/45 |
| First's weapon | — | skull staff 20 · battlestaff 20 · greater dreadful staff 30 · gold sword 30 | dreadful staff 25 · battlestaff 20 · gold sword 30 · gold sword 30 |
| Second's weapon | — | wooden club 25 · elderwood staff 30 · elderwood staff 30 · gold sword 30 | steel battleaxe 20 · skull staff 20 · gold sword 30 · gold sword 30 |
| Fifth's weapon | — | battlestaff 20 · greater dreadful staff 30 · death knight sword 30 · death knight sword 30 | skull staff 20 · battlestaff 20 · elderwood staff 30 · elderwood staff 30 |
| Second turns fighter | — (weaponcrafting 30 on day 9) | — (weaponcrafting 30 on day 10) | **day 3** |
| fallback hours (F/S/T/Fo/Fi) | 229 (165/0/1/34/29) | **3,052** (657/330/547/671/847) | 1,718 (520/502/0/281/415) |
| completions / steps / seconds / solves | 31 / 6,189 / 5,238 / 480,915 | 30 / 6,326 / 3,241 / 284,063 | 30 / 6,967 / 1,976 / 171,018 |

**Slipping more than a week against `a394ae1`** (its day → this road's):
- roles off, 2: making_a_nether_portal 83 → never, king_of_the_goblins 87 → never. Earlier by more than a week: turning_treasures_to_gold
  never → 2, cursed_wood_blessed_victory 39 → 23, tasks_coins_fan 57 → 47.
- roles on, 20: expert_lumberjack 2 → 15, cabinet_maker 2 → 22, expert_alchemist 4 → 28, professional_lumberjack 6 → 64,
  professional_miner 8 → 59, professional_fisherman 14 → 22, catch_and_cook 20 → 73, master_alchemist 23 → never, master_fisherman
  26 → 80, master_miner 29 → 76, shining_secrets 31 → 78, strange_miner 31 → 40, magic_lumberjack 32 → never, adamantite_mastery
  36 → 78, palm_paradise 38 → 79, master_lumberjack 38 → 80, cursed_wood_blessed_victory 39 → 52, pearl_fisher 52 → 89,
  magic_harvester 53 → never, making_a_nether_portal 83 → never. Earlier by more than a week: turning_treasures_to_gold never → 2,
  loktar_ogar never → 74, king_of_the_goblins 87 → 76, grand_master never → 81.

## The board (`docs/strategy/board/2026-11-24.md`)
The read of 12:00 UTC, 50 accounts (`alverus` 32nd, 37 points), and the changes since 09:21 (2.6 h). What the leaders and the
neighbours do that 027's roles do not:
1. **They forge on their fighters.** The best weaponcrafter is a fighter in 34 of the 50 (gearcrafting 32, jewelrycrafting 34).
   Only two are shaped like 027's roles: sqidking (39th) and krolov (6th). krolov keeps all three crafts (30 / 31 / 30) on one
   combat-15 character.
2. **Even fleets are the commonest shape** (18 of 50), then one-fighter fleets (13); the nine three-fighter fleets have the best
   median points (57).
3. **Their weapons lag by about a band**: at combat 30–49 a fighter wears a median level-30 weapon, and 3 of 65 armed fighters
   there hold one within 5 of their level.
4. **Their fighters gather**: 79 of 162 fighters held a tool at noon, and between the reads 66 fighters gathered against 51 that
   fought.
5. **Points come slowly to everyone**: three of the 50 gained one point each in 2.6 h; the combat levels came from fleets that
   fought with every character.

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/decide.ts` | `rank(name, world, free)`: the free pass for a fighter with no admitted fight; a fighter's forging tier (non-kill candidates first, today's scoring); `levelCand` lets a fighter train its own gear craft for a needed piece; the gear loop offers a fighter the pieces a fighter needs |
| `src/plan/planner/bank.ts` | `tidyStep`: a fighter recycles the pieces of the gear craft it holds |
| `scripts/check-roles.mts` | section 8, seven cases: forge, train, no need → fight, a worker gathers the materials, First never forges, no fight → the objective, a fight again |
| `CLAUDE.md` | "The roles": forging by need, a fighter with no admitted fight, the cases |
| `docs/strategy/board/tools/read.mjs` (new) | the board reader (plain Node, `zlib`, 024's `lib.mjs`) |
| `docs/strategy/board/2026-11-24.md` (new) | the first reading |
| 027's whole change | as report 027 lists it, unchanged |

## Notes
- **Not looked into, from report 027**: First's `mat:cheese` step in play (stalled, blocked at 09:33 UTC on 11-24).
- `bank.ts tidyVerdicts` still names Second for an outdated weapon; Second now takes that tidy step itself (a fighter's own gear
  craft). In the role road no tidy step came up: the forward model has no bank slots.
- The reader's "fighter" is a character within 5 combat levels of its account's best; this fleet stands at 24–26 on all five,
  so `alverus` reads as five fighters. The reader takes a read's start time from `logs/board/reads.jsonl`.
- The roads were played once each beside the gate and the replay. Their files are in `D:\Temp\ammo-027b\`: `drive-*.jsonl`,
  `dec-*.jsonl`, `board.md`.
