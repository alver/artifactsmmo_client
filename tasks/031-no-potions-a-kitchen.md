# 031 — No potions, a kitchen: the fleet fights on gear, rune and food

Read first: `CLAUDE.md` (the "Consumables" paragraph; "A potion costs its chain" and its "Food" lines; the roles' order —
a worker's tier (1) in two halves; `DEFAULTS.roles`), `src/plan/planner/consumables.ts` (`consumableNeeds`, `consParents`,
`consPrice`, `fightTake`), `decide.ts` (`Candidate.gear`, `ORDER`), `roles.ts`, `tasks/030-weapons-before-potions.report.md`.

## Where this starts
On top of `030: weapons before potions` (`d2fd93c`), the top of `origin/rework`. If it is not the last commit, say so and
stop. The working tree holds at most two changes from the planning chat (`docs/rework.md`, this file); anything else
uncommitted: say so and stop. The live service runs `d2fd93c` (run `szzd`, since 11:23:39 UTC on 11-26). The planning
chat's calls on report 030: `GEAR_FIRST` stays `all`; decision 2 (no level-35 weapon) is left; the speed comes after this task.

**What is.**
- **The leaders do not drink.** Of the 40 fight sets of the 25 leading accounts, 2 wear a potion; 36 wear a rune and 27 carry
  food, a median 37 units, bass and salmon from 35 up (`docs/strategy/024/tables/2d-sustain.md`).
- **This fleet brews.** Report 030, C.2: sap and eggs for Health Potions took 6.1 of the workers' 9.1 h. At 11:25 UTC on
  11-26 Second and Fourth kill chickens — "Egg: 87931 actions short for Health Potion ×2347 for cultist_purifier (Cultist
  Acolyte, 2 chunks) (+4 pts, chain ~306 h)" — and First kills blue slimes for Water Boost Potion ×147 at 0 XP. On 030's
  `all` road the consumables' supply still takes 325 of the workers' hours to day 42. What the fighters drank in the 31 h
  to 07:25 UTC on 11-26: 275 Minor Health Potions.
- **The leaders keep a kitchen.** `docs/strategy/024/base/characters.jsonl`, the 11-23 read: 24 of 25 accounts have a cook
  at 40+ (14 at 50) and a fisher at 30+ (16 at 40+); in 11 the fisher stands 10+ combat levels under the account's best
  fighter; the two best fighters of an account have a median fishing level of 14. The fishers at 40+ stood at the salmon
  (8) and the bass (4).
- **Food by tier** (`items.json`): cooked trout 225 HP (fishing 20, cooking 20), bass 300 (30, 30), rat meat 400 (cooking
  30; the Rat drops it one kill in two), salmon 400 (40, 40), fish soup 3 × 500 from a salmon, a trout and a milk bucket
  (cooking 40). In play a trout is 29 s to catch and 5 s to cook; a Rat win took 73–78 s with trout and 103–115 s without.
- **This fleet has no cook at work.** Fishing 26 / 22 / 22 / 18 / 27, cooking 32 / 26 / 32 / 26 / 27; cooking is Fourth's
  since 029 (26: no bass, no rat meat). `logs/world/2026-11-26.json`: the bank held raw trout 4,140, shrimp 1,720, gudgeon
  1,965, raw chicken 1,241, raw wolf meat 686, raw beef 331, raw rat meat 151 and 669 cooked trout; the cooked trout were
  gone by 06:00 UTC, and `lvl:combat:39@First#6` then rested 4,550 s against 3,475 s of fight. 030's `all` road: cooking 12 h
  of the workers' hours to day 42.

**Alex (2026-11-26):** the other players get next to nothing from potions — do not make them. Third is the kitchen
instead of the alchemist.

## A. No potion is made
One named switch, `POTIONS`, off (`config.potions` overrides it for the roads and the checks only).
1. Off, no potion is a need: `consumableNeeds` names no potion for any of its four works (the road, a kill objective, a
   `src:` leaf, an event), no potion is a parent of supply, and no potion set is solved for a need.
2. A fight is admitted on the gear, the rune and food. What that does not win is no candidate.
3. The potions the bank holds are drunk as today (`fightTake` from the stock, at today's price rule) until they are gone;
   nothing is brewed to replace them, nothing is sold or recycled.
4. An achievement whose own target is brewing stays an objective as it is. Say what else still asks alchemy.

## B. A kitchen
One named switch, `KITCHEN`, on.
1. **The roles** (`DEFAULTS.roles`): Third crafts gearcrafting and cooking and gathers fishing; Fourth keeps jewelrycrafting,
   mining and woodcutting. Alchemy is nobody's lane.
2. **Food is a (1a) need.** A food need of the fighters' road (the XP pick's among them) ranks in the first half of a
   worker's tier (1) with the gear work — its cook step and its fishing; the tools stay in (1b). Whether a food is a need
   stays `consumableNeeds`' test.
3. **The stock first.** While a fighter's fight step rests or its food take is short and the bank holds a raw food a worker
   that is on may cook, cooking it is that worker's step before the rest of (1a), a chunk at a time, the food that heals
   most first. Meat a fight drops (rat, wolf, beef, chicken, hellhound) counts as such stock.
4. **The kitchen's levels.** The holder's fishing and cooking rise to the next food tier (30, then 40) in its tier (3),
   beside its gear craft, today's scoring among them. The forward model eats what the kitchen can make at its levels.
No new scoring term. If B needs more than the one switch, say so and stop.

## C. Read-only, into the report (at most five lines each)
1. The achievements that wait with alchemy off the lanes and potions off: code, points, what each still needs.
2. The fighters' hours on coins for a tool (`src:tasks_coin` for a `gear:` tool) on each road to day 42.
3. The speed: seconds and solves of each road to day 42 (030's `all`: 5,507 s, 481,750 solves), and the 21-day outlook's
   seconds on the committed tree (030: 2,409 s).

## D. Proof
1. Checks, red first on the starting tree:
   - the 11-26 World: 030 makes Health Potion a parent of supply → `POTIONS` off: no potion parent, no egg or sap step for one;
   - a fight 030 admits only with a potion → no candidate; the same fight with the potion in the bank → it drinks it;
   - a fighter's step that rests, raw trout in the bank → Third's cook step before its other (1a) work; raw rat meat → cooked
     by a worker at cooking 30+, not offered to one under it;
   - Third's roles; Third at fishing 22 and cooking 32 → its tier (3) names fishing 30; at 30 / 32 → cooking and fishing 40.
2. **Three roads to day 42** from the newest daily World in `logs/world/`, side by side (029's driver, `--cfg`): `d2fd93c`
   as it is; `POTIONS` off with `KITCHEN` off; both as committed. One table: 030's rows (the fighters' combat, the three
   gear crafts, the weapon worn, points, "no fight admitted", a worker's hours by kind) and, new: the day each fighter
   reaches 40 and 50; Third's fishing and cooking on days 3, 7, 14, 21, 28, 42; the cooked food made by then (units, by
   code); the fighters' hours of rest and of eating. No tuning after the table.
3. **What is committed:** `POTIONS` off whatever the roads say (Alex: the leaders do not drink). `KITCHEN` on if on its
   road the later of the two fighters reaches 50 no later than with it off (neither by day 42: the higher sum of their
   levels on day 42; a tie: on); else off — say so first in the Summary.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory; `npm run check -- planner` once on the
   committed values, the way 030 ran it — its line into the report.
5. `CLAUDE.md`: the consumables', the food's and the roles' paragraphs follow. Commit `docs/rework.md` as `Rework notes` if
   it differs from `HEAD`, then everything else (this file with it) as `031: no potions, a kitchen`; push to
   `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start, stop
  or restart, no build into `dist/`, no request to the game; nothing you run writes under `logs/` (reading it is allowed).
- No new dependencies. Do not edit `docs/rework.md`. Two new constants (`POTIONS`, `KITCHEN`); more: say so and stop.
- If a why needs a new rule name (the stock's cook step), add it to `ORDER` (028's page reads it) and say so.
- The machine is strong: run the three roads and the gate side by side.
- Everything you write is in English.

## Report
`tasks/031-no-potions-a-kitchen.report.md`, **at most about 80 lines**: Summary · Decisions for Alex · How Alex verifies ·
The roads (the one table) · C.1–C.3 · What was done / files · Notes. Say first in the Summary: what is committed; the day
each fighter reaches 40 and 50 on each road; the first level-30 weapon on each; the workers' hours the potions took on
`d2fd93c`'s road and where those hours go now; Third's fishing and cooking on days 14 and 42; the road's seconds against
030's. No placeholders left in it.
