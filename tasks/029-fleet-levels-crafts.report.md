# 029 — The fleet levels the crafts: report

## Summary
- **The crafts reach 30 / 35 / 40** (road days from `logs/world/2026-11-25.json`; season day = road day + 32): weaponcrafting 4 / 46 / 87,
  gearcrafting 5 / 14 / 70, jewelrycrafting 5 / 13 / 19. Starting tree: 4 / 12 / 29, 3 / 9 / 31, 3 / 9 / 19. Its forward model gave a
  train step its level for the atlas's hours, with no materials. This one takes every batch from the bank (A.5). Decision 1.
- **Craft XP an hour while training** (days 1–7, over the train steps' hours): weaponcrafting 3,754, gearcrafting 1,981,
  jewelrycrafting 2,365, against the board's 7,032 and play's 1,745 / 1,071. Batches from the bank alone make 52,263–63,944 XP an hour,
  but fill only 0.3–1.1 h of 37–53 h; the rest is the crafter sourcing its own shortfall. Over all the crafter's hours: 877 / 562 / 800.
- **A level-30 weapon**: First day 7 (Elderwood Staff), Fifth day 8 (Gold Sword); start days 4, 5. No 35+ weapon (start: days 45–47).
- **Where they stand** (First / Fifth combat; weapon level; armour and jewelry slots at 30+ of 8): day 7 30 / 30, 30 / 20, 0 and 1;
  day 14 35 / 35, 30 / 30, 7 and 6; day 21 39 / 38, 30 / 30, 6 and 8. Starting tree: 36 / 36, 41 / 40, 45 / 45.
- **What `TRAIN_HUNT` costs them** (final against off): 1,006 h of training kills (Vampire 315, Skeleton 242, Flying Snake 130, Cow 79).
  Days 7 / 14 / 21: 30 / 35 / 39 against 34 / 38 / 40. They reach 40 on days 22 / 23 against 19 / 20, but 45 on 32 / 35 against
  33 / 36. With it off the crafts stall (jewelrycrafting 27 until day 27, weaponcrafting 31 from day 7 to 21). Points 86 against 82
  (start 101, ff 96; completions 22 / 22 against 30 / 28).
- **The gate**: typecheck passes; `npm run check` 115/115 in 320.4 s; the build into `D:\Temp\ammo-029\dist2` passes (379.12 kB).
  `npm run check -- planner` was killed twice at the 4,500 s backstop beside the roads. Run without the backstop (the same child,
  `AMMO_CHECK_VERBOSE=1`): `OK (838785 invariant checks, 97 made-up cases; deadline points 91 / 114 / 96 / 87 / 80)` for rows A / B /
  C / E / G in 5,303 s, row B alone 5,281 s (027g: 102 / 120 / 87 / 89 / 84 in 2,408.5 s). Decision 2.
- **Committed**: `029: the fleet levels the crafts` (no `Rework notes`: `docs/rework.md` equals `HEAD`), pushed to `origin/rework`.

## Decisions for Alex
1. **The final road is below the starting tree's (86 against 101)**: the start's crafts level free in its forward model; this one pays
   each batch. Days 14–42 the workers rank the fighters' potions above the training (algae for Greater Health Potions: Second 180 h,
   Third 120, Fourth 117; milk 54–75 h each), so weaponcrafting sits at 32–34. Second ends at combat 42 (start 50); with `fighterFrom`
   back the road gives 96. Options: give it back; let the training outrank a consumables need; leave it.
2. **Speed.** The final road: 16,270 s, 1,041,446 solves, 9,766 steps (start 6,220 s, 291,172, 9,815; off 6,410 s, 394,875, 10,057; ff
   13,064 s). A 90 s profile: fight solves asked by the consumables' needs (42%), events (32%), gear needs (18%); `train.ts` under 8%.
   The fight tables (`FIGHTS_CAP` 500,000) were dropped 1,509 times by day 50; a 10× cap is 21% faster with the same lines but needs
   ~500 MB more (the child has 1 GB): not changed. **The 21-day outlook took 3,326 s** beside the roads (peak 851 MB), over the child's
   30-minute kill: after a restart on this commit the page's outlook says "failed" (play does not wait for it). The replay's row B
   (5,281 s) outlasts the named check's 4,500 s backstop. Options: longer limits, fewer monsters asked, `TRAIN_HUNT` off.
3. **The training's score is no new term**: the best of a fighter's combat bundle, the lane's bundle and a gear piece of the craft above
   the holder's level (`trainScore`). Without the combat bundle gearcrafting had no parent.
4. **The train step the bank does not cover** is last in the worker's tier (1), a `CHUNK_SEC` chunk sourcing its shortfall itself
   (A.4); uncut it ran 10–21 h and stopped the crafter's supply to the others.
5. **A.5**: only the next level's batch is priced at the bank; the far road and the bills' gated roads stay the atlas's × `craftK`.
6. **A training's kill is priced at the quickest admitted fighter** (`supplierSec`), even with `TRAIN_HUNT` off.

## How Alex verifies
- `npm run check -- train`: 11 cases (A.1 ×2, A.3 ×3, A.4, A.5 ×2, B.2, B.3, B.4), all 11 fail on `6867428`; so do `train-from-bank`,
  `train-hunt-eats` and `train-bag-room` (B.1: it withdraws 100 Minor Health Potions where the room is 24).
- The roads: `node --import tsx D:\Temp\ammo-029\drive.mts --tree <tree> --world logs/world/2026-11-25.json --dec <dec> [--cfg
  '{"trainHunt":false}' | --cfg '<DEFAULTS.roles, Second with fighterFrom weaponcrafting 30>'] > <road>`, then `tab4.mjs start=<road>,<dec>
  final=… off=… ff=…`, `c.mjs <road> <dec>` (C) and `wear.mjs <dec> <road>` there. The speed: `npm run outlook -- --days 21`.

## The roads (start = `6867428`, final = this commit, off = `TRAIN_HUNT` off, ff = Second's `fighterFrom` as it was)
| | day 3 | day 7 | day 14 | day 21 | day 28 | day 42 | deadline |
|---|---|---|---|---|---|---|---|
| combat F/S/T/Fo/Fi — start | 31/26/25/24/32 | 36/29/26/24/36 | 41/31/26/24/40 | 45/31/26/24/45 | 46/32/26/24/46 | 46/32/27/24/46 | 50/50/28/24/50 |
| — final | 29/26/26/24/29 | 30/28/26/25/30 | 35/36/36/30/35 | 39/38/36/34/38 | 43/39/38/35/42 | 47/40/39/36/46 | 50/42/40/39/50 |
| — off | 31/27/26/25/31 | 34/28/27/27/34 | 38/28/27/27/37 | 40/28/27/28/40 | 41/29/29/30/42 | 46/31/31/30/45 | 50/35/38/36/49 |
| — ff | 29/26/26/24/29 | 31/30/27/26/33 | 39/33/31/31/38 | 42/33/32/32/41 | 45/35/34/32/43 | 47/36/35/33/46 | 50/50/39/34/50 |
| wc/gc/jc — start | 29/30/30 | 32/33/33 | 35/36/36 | 36/38/40 | 39/38/40 | 44/40/41 | 45/50/50 |
| — final | 28/29/27 | 31/31/31 | 32/35/36 | 33/36/40 | 33/36/41 | 34/37/41 | 40/44/41 |
| — off | 25/27/25 | 31/31/27 | 31/36/27 | 31/36/27 | 32/37/34 | 33/38/40 | 38/43/41 |
| — ff | 28/29/27 | 30/31/30 | 32/36/31 | 34/36/35 | 35/37/39 | 37/37/41 | 42/45/41 |
| points — start / final / off / ff | 40/40/39/40 | 45/40/40/43 | 48/50/48/48 | 52/54/52/53 | 53/56/56/55 | 56/62/59/62 | 101/86/82/96 |

- **A fighter reaches 30/35/40/45/50; a gear craft 30/35/40** (road day): start First 2/5/14/19/48, Fifth 2/6/14/18/47, wc 4/12/29,
  gc 3/9/31, jc 3/9/19 · final First 5/14/22/32/62, Fifth 7/13/23/35/60, wc 4/46/87, gc 5/14/70, jc 5/13/19 · off First 2/8/19/33/71,
  Fifth 2/8/20/36/—, wc 6/53/—, gc 5/11/54, jc 27/29/40 · ff First 5/9/16/27/64, Fifth 5/9/18/31/63, wc 4/28/53, gc 5/12/69, jc 5/21/29.
- **A fighter's hours** (the pick / a need's kill / a training's kill / forging / the free pass / the fallback): start 409 / 1,050 / 0 /
  730 / 3,026 / 1,013; final 476 / 891 / 1,006 / 0 / 1,823 / 0; off 840 / 1,318 / 0 / 0 / 2,030 / 0; ff 537 / 847 / 960 / 1,572 / 2,249 / 0.
- **A worker's hours** (a need's kills / cooking / the train step / its supply, kills apart / an objective's needs / the rest): start 778
  / 328 / 1,627 / 0, 0 / 515 / 1,036; final 1,325 / 436 / 2,054 / 601, 0 / 198 / 1,689; off 1,103 / 541 / 1,670 / 338, 838 / 134 /
  1,721; ff 1,220 / 372 / 813 / 460, 0 / 520 / 891.

## Weapons and armour by day (C.1, C.5; the final road, worn at the day's end, First / Fifth)
- **Weapon level, slots at 30+**: days 1–2 25 / 20, 0 and 0; day 3 25 / 25 (Skull Wands); day 5 25 / 20; day 7 30 / 20, 0 and 1;
  day 14 30 / 30, 7 and 6; day 21 30 / 30, 6 and 8. No level-40 weapon by the deadline (weaponcrafting 40 on day 87).
- **The first level-30 weapon**: the Elderwood Staff, made by Second on day 7 (12-01 08:00 UTC) for First. It waited for
  weaponcrafting 30 (day 4, 11-28 17:19 UTC: 46 train steps of 2–7 runs, 16 from the bank, 30 sourcing their own materials, most
  1.1–1.5 h) and for three Cyclops Eyes, which Third and Fourth hunted on day 6.
- **The board's pieces**: Skull Wand ×2 day 3, Emerald Ring day 8, Gold and Royal Skeleton Rings day 9, Flying Boots day 10 (First),
  Greater Dreadful Staff ×2 day 11. Never: the Dreadful Staff, the Steel Armor, the Royal Skeleton helmet, armor and pants, the Topaz
  Amulet, the Ruby, Sapphire and Topaz rings. The rule: `gear.ts` keeps per slot the `PER_SLOT` 3 highest-level craftable pieces, ties
  to the code. At 30 the Royal Skeleton pieces are fourth (after Conjurer, Gold, Obsidian), Ruby/Sapphire/Topaz after Emerald/Gold/Royal
  Skeleton; the rest sit under three higher pieces. (The World has First in a Skeleton Armor; the road: Piggy Armor day 1, Obsidian by day 14.)

## Where the fighters wait (C.2, "no fight admitted", the final road)
- None in weeks 1–5. Weeks 6–9 (days 36–63, combat 46–47): 53–103 h a week each, 664 h in all. Their pick, the Hellhound, is admitted
  only with Health Boost Potions the bank lacks. So they hunt Cows for milk (Health Boost Potion ×165 for their road to 50) and gather
  algae for an event's Greater Health Potion reserve (the Efreet Sultan, 34,312 actions short), sap and coins.

## The crafts' pace, gold and tasks (C.3, C.4, C.6)
- **The recipe by level** (`trainPick`): weaponcrafting Skull Staff / Battlestaff 23–30, Elderwood Staff / Gold Sword 31–33, Perfect
  Bow / Obsidian Battleaxe 33–35. Gearcrafting Hard Leather Armor / Tromatising Mask 25, Steel Armor, Snakeskin and Steel Boots
  26–30, Snakeskin Legs Armor 31–35. Jewelrycrafting Steel Ring 24–29, Gold Ring 30–39 (Royal Skeleton Ring, Lost Amulet between).
- **Who supplied it** (whole road, hours): weaponcrafting Fourth 133, Third 128, Second 87, Fifth 57, First 56; gearcrafting First 250,
  Fifth 223, Third 53, Fourth 49, Second 7; jewelrycrafting Fifth 177, First 166, Fourth 59, Third 48, Second 38.
- **Gold**: the bank holds 5,672 ore and 342 bars (909 bars). The first level-30 batches: Skull Staff ×6, Steel Boots ×6 (no gold), Gold
  Ring ×20 (160 bars); jewelrycrafting 30 → 41 takes 2,704 bars in weeks 1–4. Short first on day 11: Fourth mines (1,458 actions for 26
  Gold Rings). Gold ore in all: Fourth 183 h, Third 178 h, the fighters 13 h.
- **Tasks** (no change):
  1. A held, unfinished monsters task gets no visit: `startVisit` makes one only when a fighter holds no task or a finished one.
  2. `cancelOf` asks only of a task worked on purpose (`src:tasks_coin`, the coins filler), so the two are never cancelled.
  3. At combat 29 the Chicken (1) and the Flying Snake (12) give no XP; `pickMonster` skips them, so the task's ×1.25 never applies.
  4. A redraw until the task names the Vampire: about 21 monsters in the pool at combat 29–30, so about 21 coins a fighter, 42 for two.
  5. The bank holds 56 coins and `COIN_FLOOR` is 50: six to spend.

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/train.ts` (new) | `craftTarget`, `supplierSec`, `trainPick` (the one picker), `trainParents`, `trainScore`, `trainPlan`. |
| `src/plan/planner/decide.ts` | `ORDER` + `train-kill`, `train`; the training's parents and leaves; the worker's tier (0) and tier (1)'s end; the fighter's tier 3. |
| `planner/supply.ts`, `forward.ts`, `compile.ts`, `types.ts`, `config.ts`, `consumables.ts`, `events.ts` | `billOf`'s `sec0`; the forward train step (A.5); the item's `code`/`runs`; `TRAIN_HUNT`; B.2, B.4; B.3 (half the bag). |
| `src/plan/queue.ts`, `src/state/queue.ts`, `exec.ts`, `planner.ts` | The item's `code`/`runs`/`done`, `loopPick`, the fleet's shortfall ends it, the last batch recycled; B.1 `trainRoom`/`StepCtx.room`; an owned loop eats from the bank; the runs left. |
| `scripts/check-train.mts`, `scenarios/train-{from-bank,hunt-eats,bag-room}.mts`, `fixtures/whys-029.json` (new); `check-{planner,roles,level,seconds,onepage}.mts`, `whys.mts`, `scenarios/consumables-food-bag.mts` | D.1, D.2, B.1, this tree's whys; older cases follow A and B (Notes). |
| `CLAUDE.md` | The train item's, the roles' and the consumables' paragraphs; the ORDER list. |

## Notes
- **Constants**: one new, `TRAIN_HUNT` (on); `config.trainHunt` overrides it for the roads and checks only. **028's page**: two new rule
  names in `ORDER`, `train-kill` ("a kill a craft's training asks") and `train`; nothing else changed.
- **B.1** (journal from 15:56 UTC on 11-25, `c03bff4`, run `ghfm`): Fourth's `lvl:jewelrycrafting:30` (17:00:13) and `:25` (17:03:34)
  blocked, "inventory full of protected working stock" (16 steel bars, the set, 100 Minor and 18 Small Health Potions). A hunt's
  stacks now get a third each of the bag less the batch and 12 set pieces.
- **Older checks**: `check-level`, `-seconds`, `-roles` put their made-up crafts at the target; `check-planner`'s roles table has Fourth
  cooking, its demon-horn case restores `fighterFrom`, invariant 14 accepts `train:`; `check-onepage` compares with `whys-029.json`
  (this tree's: the training changes whys), its A.2 road 36 h (first piece at 31.7 h); `consumables-food-bag` checks half the bag.
- **CLAUDE.md is wrong about the fake**: it answers `recycle` (`train-from-bank` recycles on it) and the task actions; left as it is.
  Not done: no service run (the rules forbid one).
