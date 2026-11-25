# 027e — Level first: report

## Summary
- **The fighters are not higher on day 14.** First and Fifth stand at combat 39/39 on both trees, and Second is lower (33 against 34).
  - On day 7, First and Fifth are higher (36/35 against 34/34), but Second is lower: 27 against 34. From weaponcrafting 30 (day 3) its fights are a need's kills for road gear (99 h to day 14) and it takes no XP pick; the starting tree gives it 43 h of the pick.
  - After day 14 the final tree leads: day 21 at 43/37/41 against 39/42/39, and day 42 at 48/39/48 against 45/43/46.
  - First and Fifth reach 50 on day 45. On the starting tree First reaches it on day 56 and Fifth stops at 48.
- **Points**: 106 at the deadline against 97. By day: 40 / 45 / 48 / 53 / 55 / 64 on days 3–42, against 43 / 43 / 48 / 53 / 56 / 60.
- **A (the fighter's order)**: (1) `config.first`, (2) forging (027b), (3) a kill a need of a fighter's road asks, (4) the XP pick, (5) today's rule over the whole list.
  - Tier (5) applies only with no admitted XP fight, or at the level cap. The cap is 50: docs/api's `FakeCharacterSchema.level` maximum, where the atlas's `xpNeeded` ends; the code reads the atlas.
- **B (the worker's order)**: (1) the fighters' road — gear work (a), its craft levels, the road's consumables — and a lane holder's tool, (2) done within 6 h, (3) the gear craft to the fighters' next tier, (4) the lanes.
  - The craft tier is the highest fighter's level + 5, down to a multiple of 5, at least 30, at most the cap.
  - A kill objective's needs (work (b)) and an event's now rank in tier (4).
- **C**:
  - A sliver of a potion now plans the set without that potion, where it is still admitted.
  - The XP pick itself (with the pool's potions) joins the road's consumable needs.
  - A walled road scores a finite number: walled levels are priced at the pace of the last level priced.
  - A candidate dropped for its score is named in the step's why, so in the journal. The final road dropped none.
  - No new constant, no new score.
- **The gate**: typecheck passes; `npm run check` 105/105 in 196.8 s; the build into `D:\Temp\ammo-027e\dist` passes (380.53 kB).
  - `npm run check -- planner` **FAILED, on invariant 3 only**: 14 of 17,897 checks, in row E.
  - That failure is pre-existing, and `90597fe` decides the same step (decision 6).
  - Rows A / B / C / E / G end at 103 / 120 / 92 / 83 / 89 (027d: 101 / 119 / 90 / 87 / 87). The run took 1,384 s beside the two roads.
- **Committed** as `027e: level first` on `rework` and pushed to `origin/rework`. `docs/rework.md` did not differ from `HEAD`, so there is no `Rework notes` commit.

## Decisions for Alex
1. **Second stalls in its first fighter weeks.**
   - As a fighter, Second only forges and takes road kills until about day 13 (combat 27 → 30). The need's kills crowd out its pick, and their drops come from low-level monsters.
   - Options: keep A.3 as it is, or let a need's kill go first only for its own road.
2. **At the cap the fighters gather.**
   - From day 45 First and Fifth are at 50. Tier (5) gives them 1,702 h of today's rule and 1,321 h of gather fallback (weeks 9–12).
   - The starting tree spends 152 h in that fallback.
3. **Tools wait (A.3 as written: the road only).**
   - A tool's kill materials and its coins are a fighter's fifth tier.
   - Steel pickaxe and rod: day 7.5 (start: 1.2 / 2.3). Gold axe, pickaxe and rod: day 32.4 (start: 20.5 / 23.6 / 25.8). Golden gloves: day 2.6 (start: 28.1), its drops shared with a road piece.
   - Option: add "a lane holder's tool" to A.3, as B.1 has it.
4. **A leaf counts as a need by every parent it serves** (`supply.ts SupplyNeed.via`).
   - The road's potion leaf (sunflower) was labelled with an event's reserve parent, which sorts first, so it fell out of the first tier.
   - The leaf's score and its why still name the best parent. For example, "Obsidian Helmet for Fifth (cultist_purifier)" is a road piece too.
5. **The free pass keeps a fighter's tasks** (`holder`): the visit, the held task's bonus and coin steps. At the cap the free pass is the fighter's normal state. 027d had tied these to the role filter, which the free pass turns off.
6. **Invariant 3 (pre-existing)**.
   - At the Sandwarden, Fifth's solve's set (Greater and Health Potion) wins 76%. With the worn Novice Guide added — the step's own verdict keeps pinned artifacts — it wins 47%.
   - The planner's solves don't read worn gear. `90597fe` decides the same step on the same World (`D:\Temp\ammo-027e\inv3-E.json`).
   - Not fixed.
7. **Food (part D)**: two cooked trout a win would raise First from ~1,550 to ~2,770 XP/h and Fifth from ~1,490 to ~2,380, for about one worker-hour a fighter-hour. Food is the next task's decision.
8. **Older checks rewritten to the new order** (the same mechanism, played where the order now allows it):
   - `check-roles`' golden egg and `check-tasks`' "bought and made after the coins" put the fighters at the cap.
   - `check-planner`'s "the fighter does something else meanwhile" now allows its own need's kills.
   - `check-planner`'s "a forward run … drinks" takes the pick's own candidate.

## How Alex verifies
- `npm run check -- level`: 15 cases. On `90597fe`, 12 of them fail; three pass on both trees: no admitted fight, a road need first, craft 26 → 30.
- The roads:
  1. `node --import tsx docs/strategy/025/tools/drive.mts --tree <tree> --world logs/world/2026-11-25.json --dec <dec.jsonl> > <road.jsonl>` on `90597fe` and on this commit.
  2. Then `node D:\Temp\ammo-027e\tab.mjs <road-start> <dec-start> <road-final> <dec-final>` prints the table below.
- Part D: `node --experimental-webstorage --localstorage-file=<f> --import tsx D:\Temp\ammo-027e\fighters.mts`. The leaders line: `node D:\Temp\ammo-027e\board-days.mjs`.

## The roads (from `logs/world/2026-11-25.json`, roles on; start = `90597fe`, final = this commit)
| | day 3 | day 7 | day 14 | day 21 | day 28 | day 42 | deadline |
|---|---|---|---|---|---|---|---|
| combat First/Second/Third/Fourth/Fifth — start | 30/27/27/24/30 | 34/34/27/24/34 | 39/34/27/24/39 | 39/42/27/24/39 | 41/43/28/24/44 | 45/43/28/24/46 | 50/50/28/24/48 |
| combat — final | 33/26/25/24/33 | 36/27/25/24/35 | 39/33/25/24/39 | 43/37/25/24/41 | 44/39/25/24/44 | 48/39/25/24/48 | 50/50/25/24/50 |
| weapon/gear/jewelry crafting (Second/Third/Fourth) — start | 30/29/30 | 30/30/30 | 34/35/34 | 35/35/36 | 37/37/37 | 42/40/40 | 45/50/40 |
| crafts — final | 30/30/30 | 32/31/33 | 35/35/35 | 36/35/35 | 37/37/38 | 42/42/41 | 45/50/50 |
| points — start | 43 | 43 | 48 | 53 | 56 | 60 | 97 |
| points — final | 40 | 45 | 48 | 53 | 55 | 64 | 106 |

- **Day each fighter reaches 30/35/40/45/50** (road day; season day = road day + 33):
  - start: First 3/8/26/35/56, Fifth 3/8/22/32/never, Second 5/16/19/52/60
  - final: First 2/4/16/30/45, Fifth 2/6/18/33/45, Second 13/15/44/46/54
- **Fighter hours by kind** (decisions' planned hours, Second from its turn) — the pick / a need's kill (start: any `src:` kill or
  coins) / objective kills / forging / the free pass / the fallback: start 1,440 / 2,231 / 904 / 670 / 809 / 152; final 387 / 2,037 /
  0 / 730 / 1,704 (1,702 at the cap) / 1,321.

- **Worker hours by tier**: start 3,058 / 30 / 80 / 1,067 (fallback 34); final 1,859 / 14 / 1,149 / 915 (fallback 333).
- **Totals**: 29 against 32 completions; 6,777 against 6,051 steps; 3,292 s against 2,693 s (beside the gate, not alone).
- **The leaders** (kept reads: 11-22 19:23 → 11-25 08:00, season days 30–33; season start 10-24; places by the 11-25 08:00 read):
  - All ten of places 1–10 already had a character at 30 and at 40 at the first read (day 30). Their `adept` (25) came on days 13–18.
  - At 45: four by day 30, Wudagem and krolov on day 31, Elemental and Turbofish on day 32. Pischke (43) and at0mstr0m (44) not yet on day 33.
  - This fleet stood at 27 on day 33. The final road's fighters reach 45 on season days 63–66.

## Where a fighter's seconds go (journal 11-24 13:31 → 11-25 08:02, kill steps' meters; read-only)
| fighter | kill steps | s a win: fight / rest / eat / walk / bank / other = all | XP/h | eating the fastest food: s a win, XP/h, worker h a fighter h | eating the fleet's cheapest: s, XP/h, worker h |
|---|---|---|---|---|---|
| First | 25, 16.9 h, 641 wins | 28 / 58 / 0 / 4 / 1 / 4 = 95 | 1,546 | 45, 3,284, 15.4 | 53, 2,770, 1.21 |
| Fifth | 35, 15.6 h, 1,076 wins | 17 / 27 / 0 / 3 / 1 / 5 = 52 | 1,486 | 32, 2,462, 12.2 | 33, 2,382, 1.03 |

- **First fought**:
  - spiders for `arachnophobia_conquered` (5.9 h);
  - the vampire as its combat level's pick (4.1 h);
  - ogres for the dreadful ring's eyes and the steel boots' skin (3.9 h);
  - skeletons, wolves, snakes and cows for the snakeskin pieces (2.4 h);
  - death knights for `the_reaper` (0.4 h).
- **Fifth fought**:
  - the vampire as its pick (4.2 h);
  - spiders for the achievement (4.1 h);
  - red slimes for the fire boost potion of `the_reaper` (2.0 h);
  - ogres and cyclopes for the same ring and boots (2.5 h);
  - drop hunts (2.3 h).
- **Rest is the biggest part of a win**: 61% of First's seconds a win, 52% of Fifth's. Nothing was eaten; every step's why said "no food pays: at its chain, eating costs more than resting".
- **How eating was priced**: the simulator's expected loss on the set each step wore, against the 11-25 World. Only foods the bank holds or Third may cook at cooking 32 count. A unit costs its field chain (`xp.ts potionSec`).
- **The fastest heal is dear**: cooked chicken ×7 at 85 s a unit, Fried Eggs ×4 at 483 s. The fleet's cheapest is two cooked trout a win: XP/h ×1.8 (First) and ×1.6 (Fifth), for 1.2 and 1.0 worker-hours a fighter-hour.

## What was done / files
| file | what |
|---|---|
| `src/plan/planner/decide.ts` | The fighter's order (A).<br>The worker's first tier by the road (`road`, `needs`, `flags`) and its craft target (B.3).<br>The sliver plans `without` the slivered potions (C.1).<br>The dropped-for-score note (C.2).<br>`holder`: tasks in the free pass. |
| `src/plan/planner/consumables.ts` | `fightTake(…, without)` and `Take.stocks` (per potion).<br>Work (a) adds the XP pick with the pool's potions; its road paces walled levels; no 0 × ∞. |
| `src/plan/planner/gear.ts` | Work (a): H1 paces walled levels; no 0 × ∞. |
| `src/plan/planner/supply.ts` | `SupplyNeed.via`: every parent a leaf serves. |
| `scripts/check-level.mts` (new) | E.1's 15 cases, on the 11-21 fixture. |
| `scripts/check-roles.mts`, `check-tasks.mts`, `check-planner.mts` | The five cases of decision 8. |
| `CLAUDE.md` | The roles' `decide` paragraph follows A and B; the sliver and work (a) lines. |
| `tasks/027e-level-first.md`, this report | |

## Notes
- **Constants**: none added. The "+ 5, down to a multiple of 5" of B.3 is the task's rule, inline. Without the cap a fighter at 50 asked for "craft to 55".
- **The sliver case** in `check-level` needs a cheap potion (10,000 sunflowers banked). Fifth is off in it, so that no better need holds the 20 potions back. On the fixtures a restore potion is otherwise named only where the gear alone is not admitted.
- **"Nothing covered"** (better works reserve the stock: `K < 1`) still plans the gear alone, as before. Only the sliver path plans without the slivered potions alone.
- **The replay was started twice.** The first run had loaded `check-planner`'s two cases before I rewrote them, so I stopped it; the run above is the second, on the final tree.
- **Line endings**: three files picked up CRLF from a scripted edit during the work; all are back to LF before the commit.
- **Not done**: no service run (`/verify` would start one against the game, which the rules forbid). Food, fares and gold are not touched.
- `tasks/027e-level-first.md` is committed with the work.
