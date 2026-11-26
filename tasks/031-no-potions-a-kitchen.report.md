# 031 — No potions, a kitchen: report

## Summary
- **Committed: `POTIONS` off, `KITCHEN` off.** KITCHEN is off by D.3's rule: with the kitchen the later fighter reaches combat 50 on
  road day 34 (First; Fifth 32), without it on day 33 (both). Day 34 is later, so the rule says off. The kitchen road ends 3 points
  higher (decision 1).
- **Combat 40 / 50 by road day** (from `logs/world/2026-11-26.json`, 11-26 is day 1): `d2fd93c` First 23/42, Fifth 23/39;
  **potions off, kitchen off (committed)** First 21/33, Fifth 19/33; potions off, kitchen on: First 21/34, Fifth 18/32.
- **The first level-30 weapon**: `d2fd93c` day 6 (Gold Sword); committed day 9 (Elderwood Staff); kitchen on day 4 (Elderwood Staff).
  All three are made by Second. No level-35 weapon on any road.
- **The potions' hours**: on `d2fd93c`'s road the potions' supply took **258 h** of the workers' time to day 42 (030's 325 h was
  potions plus food: 258 + 67). On the committed road that time goes to train steps (1,383 → 1,654 h) and to objectives' needs
  (30 → 216 h). A need's kills (388 → 285) and training supply (491 → 417) went down.
- **Third's fishing / cooking**, days 14 and 42: committed 27/32 and 27/32 (`d2fd93c` 22/32 both); kitchen on 24/39 and 44/42.
- **Speed**: the committed road takes **2,127 s** and 268,043 solves to day 42 (030's `all`: 5,507 s and 481,750 solves). The 21-day
  outlook takes **1,363.9 s** (030: 2,409 s).
- **The gate**: typecheck passes; `npm run check` 117/117 in 179.2 s; the build into `D:\Temp\ammo-031\dist` passes (383.89 kB).
  `npm run check -- planner` on the committed values, without the backstop, `AMMO_CHECK_VERBOSE=1`: `OK (640537 invariant checks,
  97 made-up cases; deadline points 90 / 99 / 94 / 80 / 62)` in 5,220.3 s (030: 78 / 112 / 94 / 87 / 86; row B alone 5,201 s).

## Decisions for Alex
1. **The kitchen lost by one day on the rule but wins on points.** With the kitchen: 74 points on day 42 against 71, 209 h of
   fighter rest against 307 h, 39,326 cooked units against 33,846. Fifth reaches 50 a day earlier and First a day later. Options:
   keep it off (the rule's answer), or set `KITCHEN = true` in `config.ts` (one word; `DEFAULTS.roles` follows).
2. **The fighters still mostly rest**: rest / eating to day 42 committed 307 / 20 h, kitchen 209 / 33 h, `d2fd93c` 404 / 13 h.
   `FOOD_FISHING` stays off, so a food need opens no fishing; the kitchen's fish come from its fishing level road and the bank.
   Options: leave it; `FOOD_FISHING` on with the kitchen (a second switch, not done here).

## How Alex verifies
- `npm run check -- kitchen`: 6 cases on `scripts/fixtures/world-2026-11-26.json`; all 6 fail on `d2fd93c` (run in a `git archive` tree).
- Roads: `node --import tsx D:\Temp\ammo-031\drive.mts --tree <tree> --world <abs>\logs\world\2026-11-26.json --days 42 --dec <dec>`,
  tree `D:\Temp\ammo-031\base` (`d2fd93c`) or `\tree` (written with `KITCHEN` on; the kitchen-off road adds `--cfg
  '{"potions":false,"kitchen":false,"roles":<030's>}'` = the committed values); table `tab.mjs` → `table.txt`; `npm run outlook -- --days 21`.

## The roads (029's driver, the World of 11-26 to day 42; rest and eating are each kill step's kills × its set's seconds a win)
| | day 3 | day 7 | day 14 | day 21 | day 28 | day 42 |
|---|---|---|---|---|---|---|
| First/Fifth combat — d2fd93c / committed / kitchen | 30/30 · 30/30 · 30/30 | 31/32 · 30/31 · 31/32 | 36/36 · 35/36 · 36/36 | 38/39 · 40/41 · 40/40 | 42/42 · 46/46 · 46/46 | 50/50 · 50/50 · 50/50 |
| wc/gc/jc | 30/30/27 · 30/30/27 · 31/30/27 | 31/33/33 · 31/33/34 · 31/32/34 | 32/36/37 · 32/36/38 · 32/36/38 | 33/37/40 · 32/38/41 · 33/37/41 | 34/39/41 ×3 | 37/42/41 · 37/42/41 · 37/40/41 |
| weapon First/Fifth | 20/25 · 20/20 · 25/20 | 30/30 · 20/20 · 30/30 | 30/30 ×3 | 30/30 ×3 | 30/30 ×3 | 30/30 ×3 |
| points | 40 · 40 · 40 | 41 · 41 · 44 | 48 · 48 · 48 | 52 · 52 · 52 | 54 · 56 · 56 | 68 · 71 · 74 |
| Third fishing/cooking | 22/32 ×3 | 22/32 · 22/32 · 22/39 | 22/32 · 27/32 · 24/39 | 22/32 · 27/32 · 24/41 | 22/32 · 27/32 · 24/41 | 22/32 · 27/32 · 44/42 |
| cooked food made (units) | 0 · 0 · 6,026 | 0 · 0 · 13,099 | 4,313 · 8,461 · 27,158 | 5,878 · 11,738 · 31,212 | 6,738 · 19,290 · 33,119 | 51,095 · 33,846 · 39,326 |
| fighters' rest / eating h | 33/0 · 37/0 · 16/4 | 71/0 · 73/0 · 35/6 | 144/0 · 117/4 · 63/12 | 211/1 · 180/7 · 97/19 | 292/2 · 272/13 · 177/27 | 404/13 · 307/20 · 209/33 |
- **Combat 35/40/50, crafts 30/35/40 (wc; gc; jc) by road day**: `d2fd93c` First 13/23/42, Fifth 10/23/39 — 3/31/—; 3/10/31;
  5/9/17. Committed 12/21/33, 10/19/33 — 3/29/—; 3/9/29; 5/8/17. Kitchen 11/21/34, 11/18/32 — 3/29/—; 3/10/30; 5/9/17.
- **Cooked by day 42**: `d2fd93c` beef 16,887, chicken 9,720, cheese 8,900; committed beef 7,774, trout 7,268, wolf 4,832; kitchen
  trout 8,556, beef 8,382, wolf 6,197, bass 1,580. Drunk (potions / food): 3,409 / 38,793 · 641 / 34,472 · 659 / 38,915 (the bank
  held 862 potions). **"No fight admitted"**, fighters' hours: 47 · 53 · 61 (at the level cap: 76 · 424 · 422).
- **A worker's hours by kind** (all three workers; train step / training supply / potions' supply / food's supply / a need's kills /
  cooking / fishing level / an objective's needs / the rest): `d2fd93c` 1,383 / 491 / 258 / 67 / 388 / 12 / 1 / 30 / 250;
  committed 1,654 / 417 / 0 / 46 / 285 / 18 / 25 / 216 / 226; kitchen 1,262 / 390 / 0 / 16 / 443 / 38 / 227 / 219 / 295.

## C.1 What waits with alchemy off the lanes and potions off
- **The same four wait on all three roads.** Alchemy stays at 37 on every road and no road takes an alchemy step.
  `art_of_teleportation` (2): use 100 each of recall, forest bank, enchanted and sandwhisper potions, all brewed. `expert_alchemist` (1):
  alchemy 40 and 6,000 glowstem leaves. `master_alchemist` (2): alchemy 50 and another layer. `potion_brewer` (2): 100 enhanced health
  and 100 enhanced health splash potions at alchemy 45 / 50, waiting for another layer. Nothing else on the roads asks alchemy.
- **What potions off costs**: `cult_destroyer` (2) now waits for an event, and `cursed_wood_blessed_victory` (1) "does not fit"; only
  `d2fd93c` completes them (days 27, 33). `closing_the_gate` (4) waits on every road (`d2fd93c` for potions, now for an event).
- **Done on gear alone, as soon or sooner**: `the_reaper`, `cultist_purifier`, `king_of_the_goblins` on days 9 / 18 / 28 (committed),
  7 / 18 / 26 (kitchen), against 9 / 21 / 30 on `d2fd93c`.

## C.2 The fighters' hours on coins for a tool, to day 42
- `d2fd93c` 33.8 h (Steel Axe 22.0, Steel Pickaxe 7.3, Gold Pickaxe 4.5); committed 39.9 h (Steel Pickaxe 19.3, Steel Axe 9.3, Gold
  Pickaxe 9.3, Steel Fishing Rod 2.1); kitchen 39.5 h (Gold Pickaxe 36.3, Steel Axe 3.2). Coins for every parent: 854 · 500 · 548 h.

## C.3 The speed
- **To day 42** (side by side with the gate): `d2fd93c` 5,394 s, 481,750 solves (030: 5,507 s, the same solves); committed 2,127 s,
  268,043; kitchen 2,489 s, 301,040. **The 21-day outlook**, committed tree: 1,363.9 s, 792 MB, beside a road (030: 2,409 s).

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/config.ts`, `types.ts`, `roles.ts` | `POTIONS`, `KITCHEN` (both false), `config.potions` / `.kitchen`; `DEFAULTS.roles` follows `KITCHEN`; rule `cook`; with the kitchen, alchemy nobody pins is nobody's lane. |
| `consumables.ts`, `decide.ts`, `gear.ts` | No potion set for a need, works (b), (c) skipped; `hungry`, `stockCook`, `foodTiers`, `cookable`; the cook step before (1a), the road's food in (1a), the kitchen's levels in (3); `newPieces` counts no potion (row B crashed once alchemy had no crafter). |
| `scripts/check-kitchen.mts`, `fixtures/world-2026-11-26.json`, `whys-031.json` (new); `check-planner`, `-onepage`, `whys`, `-train` | D.1; invariant 14 holds a `cook` step open while a fighter rests, invariant 20 may be empty with potions off; tables follow `KITCHEN`. |
| `check-gear-first`, `-level`, `-roles`, `-seconds`, 3 scenarios, `check-planner`'s potion cases; `CLAUDE.md` | They test 030's mechanism: `potions: true` (and `kitchen: false` where 030's tiers matter). The paragraphs follow. |

## Notes
- **Constants**: two new; the food tiers come from the catalog (30, 40, then swordfish 50). Rule `cook` is in `ORDER` while
  `KITCHEN` is on. **The cook step has no parent**: it serves the fighters' running steps a whole chunk at a time (a need's horizon
  would cap it); it does not fire when the bank already holds what the fighter would eat.
- **The roads ran before the decision**: "kitchen" is this tree with `KITCHEN` on; the committed values equal the kitchen-off road.
- **The replay**: row A rose 78 → 90; rows B 112 → 99, E 87 → 80 and G 86 → 62 fell. Not looked into.
- **Older checks**: 50 of 97 whys moved (whys-031.json); check-onepage's road stays 48 h (first piece at 41.6 h; kitchen 83.0 h).
- **Not done**: no service run; nothing written under `logs/`; `docs/rework.md` equals `HEAD`, so no `Rework notes` commit.
