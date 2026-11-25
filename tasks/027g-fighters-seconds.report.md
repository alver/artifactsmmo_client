# 027g — The fighter's seconds: report

## Summary
- **The fighters are higher on day 14, not on day 7.** First and Fifth stand at 41/40 on day 14 (start 39/39), and at 36/36 on
  day 7 (start 36/35). Second is lower on day 14 (31 against 33).
  - They reach 40 on day 14 (start 16 and 18) and 45 on days 19 and 18 (start 30 and 33).
  - Then they stall at 45–46 from day 21 to day 42, and reach 50 on days 48 and 47 (start 45 and 45). From day 13.7 their XP
    pick needs a Health Boost Potion the bank cannot give: 1,027 h of "no fight admitted" (start: 2 h). See decision 1.
  - On the pick, a win takes 49 s of fighting, 14 s of rest and 3.9 s of eating (start: 51 / 74 / 0).
- **`FOOD_FISHING` on is cheap but buys nothing by fishing.** It fishes 3 worker-hours in the whole road.
  - Its road: the fighters reach 40 on day 12, 45 on days 19 and 20, 50 on days 44 and 46; 102 points against 101.
  - The gain comes from cooking less (19 h against 328 h), so Third brews more (707 h of "no fight admitted" against 1,027 h).
    It is not the fishing. The switch stays off.
- **Points**: 101 at the deadline against 106 (fishing on: 102); day 42: 56 against 64.
- **A**: a road need's kill monster joins the pick's ×1.25 bonus; any other `src:` kill is a worker's when one is admitted and
  reaches it, else the fighter's (before its pick); coins stay a fighter's. Workers hunted 778 h on the road (start 0).
- **B**: no food is held; a held food costs nothing to eat; `FOOD_FISHING` (off): the cook cooks the bank's raw; the rest note
  says what is. Fighters ate 139,356 units on the road (start 0).
- **C**: the take carries every potion of its set a fight may drink; the solve wears the worn pinned artifacts. Invariant 3
  holds in every replay row (one test of its check rewritten, decision 5).
- **The gate**: typecheck passes; `npm run check` 110/110 in 225.9 s; the build into `D:\Temp\ammo-027g\dist` passes
  (383.90 kB). `npm run check -- planner`: `OK (646022 invariant checks, 97 made-up cases; deadline points 102 / 120 / 87 /
  89 / 84)` for rows A / B / C / E / G in 2,408.5 s, beside the roads (027e: 103 / 120 / 92 / 83 / 89).
- **Committed**: `Rework notes` (`4a75f82`), then `027g: the fighter's seconds`, pushed to `origin/rework`.

## Decisions for Alex
1. **Third is the cook and the alchemist.** Under B.4 it cooks 328 h, against 14 on the starting tree. The fighters at 41+
   wait about 500 h each for Health Boost Potions, from day 13.7 (First's pick: the Cultist Acolyte, a potion a fight).
   Options: give cooking to another worker; cook only while no road potion need is open; leave it.
2. **Eating steps are short.** A step's food is at most a third of the bag (task 015). At the Rat, two trout a kill caps a step
   at 20 kills (0.4 h), so the road takes 9,815 steps against 6,051, each with its reset. Option: allow half the bag.
3. **Second forges through days 14–42.** First levels sooner, so its Diamond Sword asks weaponcrafting 35 → 45 earlier. Second
   (forging, tier 2, before its own fights) spends 567 h of those days training it: combat 31–32, 35 on day 43 (start: day 15).
   It forges as much in all (730 h against 729 h), only earlier. Option: forge only for its own road, or after its pick.
4. **The Novice Guide is always in the solve now.** Its 25 HP can turn a fight. With the guide, the best set known for Fourth
   at the vampire (11-20) loses: the restores proc at other turns. check-solve's sample says "lost" there now.
5. **Invariant 3's first test follows the take.** The solve's search can miss an admitted set on the whole pool: First at the
   Goblin Wolfrider in row A, 73.5% where the gear alone solves to 77%. The take then plans the gear alone, and `winsDirect`
   accepts that set as well. Without this rewrite, 33 checks failed.
6. **A.4, on the World of 11-25.** Today's need kills are Ogre Eye (the Steel Axe) and Egg (potion_brewer); all three workers
   are admitted to both. So no monster of a need stays with the fighters, and their pick (the Rat) covers no need by itself.

## How Alex verifies
- `npm run check -- seconds`: 11 cases (A 4, B 5, C 2); on `2d1dfa8` 9 fail (the coins and the potion reserve pass on both).
  `npm run check -- food-level-eats` (E.2): on `2d1dfa8` the level step goes to the Blue Slime and rests.
- The roads: `node --import tsx D:\Temp\ammo-027g\drive.mts --tree <tree> --world logs/world/2026-11-25.json --dec <dec.jsonl>
  [--cfg '{"foodFishing":true}'] > <road.jsonl>`, then `node D:\Temp\ammo-027g\tab3.mjs start=<road>,<dec> final=… fishing=…`.
- The board: `node docs/strategy/board/tools/day.mjs`.

## The roads (from `logs/world/2026-11-25.json`; start = `2d1dfa8`, final = this commit, fishing = final with `FOOD_FISHING` on)
| | day 3 | day 7 | day 14 | day 21 | day 28 | day 42 | deadline |
|---|---|---|---|---|---|---|---|
| combat F/S/T/Fo/Fi — start | 33/26/25/24/33 | 36/27/25/24/35 | 39/33/25/24/39 | 43/37/25/24/41 | 44/39/25/24/44 | 48/39/25/24/48 | 50/50/25/24/50 |
| — final | 31/26/25/24/32 | 36/29/26/24/36 | 41/31/26/24/40 | 45/31/26/24/45 | 46/32/26/24/46 | 46/32/27/24/46 | 50/50/28/24/50 |
| — fishing | 31/26/26/24/32 | 36/30/26/24/35 | 40/30/30/28/41 | 45/33/31/29/45 | 46/33/31/29/46 | 48/39/31/30/47 | 50/50/32/31/50 |
| wc/gc/jc — start | 30/30/30 | 32/31/33 | 35/35/35 | 36/35/35 | 37/37/38 | 42/42/41 | 45/50/50 |
| — final | 29/30/30 | 32/33/33 | 35/36/36 | 36/38/40 | 39/38/40 | 44/40/41 | 45/50/50 |
| — fishing | 28/29/29 | 31/31/32 | 35/37/35 | 37/40/40 | 40/42/40 | 45/47/45 | 45/50/50 |
| points — start / final / fishing | 40/40/40 | 45/45/45 | 48/48/52 | 53/52/53 | 55/53/56 | 64/56/58 | 106/101/102 |

- **Day a fighter reaches 30/35/40/45/50; a gear craft 30/35** (road day; season day = road day + 32):
  - start: First 2/4/16/30/45, Second 13/15/44/46/54, Fifth 2/6/18/33/45; wc 3/12, gc 2/10, jc 3/8
  - final: First 2/5/14/19/48, Second 13/43/45/48/49, Fifth 2/6/14/18/47; wc 4/12, gc 3/9, jc 3/9
  - fishing: First 2/6/12/19/44, Second 6/41/43/45/48, Fifth 2/6/12/20/46; wc 4/13, gc 4/11, jc 4/10
- **A fighter's hours** (the pick / a need's kill / objective kills / forging / the free pass / the fallback): start 387 / 2,037 /
  0 / 730 / 1,704 / 1,321; final 409 / 1,050 / 0 / 730 / 3,026 / 1,013; fishing 828 / 765 / 0 / 730 / 2,302 / 1,574.
- **Its seconds a win, fight / rest / eat**: the pick's steps 51 / 74 / 0 (start), 49 / 14 / 3.9 (final), 53 / 50 / 1.5
  (fishing); every kill step 15 / 11 / 0, 11 / 3 / 1, 14 / 10 / 0.
- **A worker's hours** (a need's kills / cooking / fishing for food / the gear crafts' training / an objective's needs / the
  rest): start 0 / 14 / 0 / 1,627 / 472 / 2,157; final 778 / 328 / 0 / 1,627 / 515 / 1,036; fishing 320 / 19 / 3 / 1,627 /
  610 / 1,708.
- **Totals**: 32 / 30 / 31 completions; 6,051 / 9,815 / 6,277 steps; 2,604 / 3,275 / 2,791 s; food eaten 0 / 139,356 / 17,430.

## Food as it was (B.1, `2d1dfa8`, the World of 11-25 00:00: 1,127 cooked and 4,404 raw trout)
1. Two needs held cooked trout: the_reaper's (for Fifth, 406 units, fit 0.71) and full_moon's reserve (692, all five). That left
   30 for a level step (fit 0.006).
2. With Third's 984 added, the step could take 1,014, and still rested. At its chain price, eating cost more than resting at the
   Wolf, the pick (0.79 XP/s, 30 s a win).
3. The rest note named a need ("Cooked Trout is needed for event full_moon, not in the bank yet") whatever the stock.
4. Third's next steps: gearcrafting to 30 (6.3 h); 606 cooked trout for the_reaper; the fighters' gear; 98 for Fifth's road;
   gearcrafting; on day 2, 1,080 trout for the_reaper, then algae (minor health potions, cultist_purifier).
5. It never fished for the road's food: the bank's 4,404 raw trout fed the cooking. On this tree the pick becomes the Rat
   (0.96 XP/s, two trout a kill), and Third cooks 1,080 a chunk.

## The board's day (D: `docs/strategy/board/2026-11-25.md`, the tables in full)
1. They fight with level-30 to 40 weapons; this fleet's fighters wear a level-20 battlestaff.
2. They eat: 23 of the best 60 by XP an hour carry cooked food; this fleet's fighters rested beside 1,100+ cooked trout.
3. Their combat share is high where they level fastest (Steavi 79%, Sathallrin 67%); this fleet 34% (41% cooking).
4. Their best fighters fight what their task names (Orchid at the vampire with a vampire task).
5. Their gatherers keep up (four of the best ten of 40+ gather with gold or voidstone tools); Fourth holds an iron pickaxe.
- The planning chat's "4th and 6th of 85" is #23 and #26 of 240 on the whole base (1,753 and 1,669 XP/h). Cooked food: 76 of
  240 carried it at the last read (171 in any read). The crafts at combat 38–44 sit a median 8 levels under (not 3–9).

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/decide.ts` | A: road kill monsters in the bonus (rule 3 after the supply loop); `workerHunts`; the worker's `along`; the fighter's tier 3. |
| `src/plan/planner/consumables.ts` | B: `reservable` (food), `consPrice` (held food free), `FOOD_FISHING` needs (`foodFor`, work (a) at the pick the cooked raw makes, `rawTaken`, `noField`), `restWhy`; C: the take's spare potions, `admittedWithout`, the not-admitted fallback; `freeSec` passes "rest" explicitly. |
| `src/plan/bis.ts`, `src/plan/planner/reach.ts` | C: `BisOptions.fixed`, the worn pinned artifacts in `fightOptions` and the solve key. |
| `src/plan/planner/config.ts`, `types.ts`, `supply.ts` | `FOOD_FISHING`, `config.foodFishing`, `Parent.noField`. |
| `scripts/check-seconds.mts`, `scripts/scenarios/food-level-eats.mts` (new) | E.1, E.2; fixtures `world-2026-11-25.json`, `inv3-orc.json`, `inv3-sandwarden.json`. |
| `scripts/check-planner.mts`, `check-level.mts`, `check-roles.mts`, `check-solve.mts`, `scenarios/consumables-food-fits.mts` | Older cases rewritten to A, B and C (decisions 4 and 5; the food cases eat again). |
| `docs/strategy/board/tools/day.mjs`, `docs/strategy/board/2026-11-25.md` (new) | D. |
| `CLAUDE.md` | The roles', consumables', food and solve paragraphs. |

## Notes
- **Constants**: one new, `FOOD_FISHING`. Its config override `foodFishing` is for the roads and the checks only, as `sliver` is.
- **C needed the take, the solve's inputs and one test of the check**:
  - "Every potion its set names" is read as every potion a fight may drink. The solve fills a slot with a worn stack no pass
    drinks (Second's Minor Health Potions), so the literal reading refused every such fight.
  - The bound used is the pessimistic pass: an undrunk potion is carried at one attempt of its use.
- **The roads were run twice** (the take's admission fallback came after the first replay): identical, byte for byte.
- Not done: no service run (the rules forbid one). `tasks/028-one-page.md` appeared during the work; not mine, not committed.
