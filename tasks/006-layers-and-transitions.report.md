# 006 — Movement knows layers; free transitions are walked — report

## Summary
- `src/plan/route.ts` (new, pure) splits the map into regions `move` can travel and routes between any two places
  through the transitions a predicate opens; today only the 21 free ones. From the bank, 369 of the 421 walkable tiles
  are reachable.
- `nearest` takes the character, keeps only tiles it can reach and ranks them by travel time. `moveTo` takes a place
  with a layer and walks one leg per tick (a `move` or a `transition`). Every caller is changed (about 120 call sites).
- With no route, the item is skipped with a text that says the place is on another layer. Only transport failures and
  codes ≥ 500 that the OpenAPI document does not define are held as outages; 598, 595, 596 and the rest pause at once
  with `(code N)`.
- The `train` item picks the highest XP node this character can reach now: mining 30 → the gold rocks; 35–39 → the
  strange rocks while the event is up, else gold. The Nomadic Merchant no longer buys backpacks.
- The fake has `transition` and a path-checked `move`; a layer check runs on every scenario. Six new scenarios all pass
  on the new code and all fail on the old engine. Gate: typecheck clean, `npm run check` 35 ok + the known
  `repeat-spin`, scratch build ok.
- Section 7: over the last seven full days, 19 of 105 offerings were done. 75 of the 86 missed fall on 11-11 to 11-15,
  before the daily trigger existed. The rest are top-bracket items nobody could get and skills below the lowest bracket.

## Decisions for Alex
None.

## How Alex verifies
1. `git log --oneline -2` → `006: layers and transitions` on top of `Rework notes`; `git status` is clean.
2. `npm run check` → `36 checks: 35 ok, 1 known defect reproduced, 0 failed`, exit 0. The known one is `repeat-spin`.
3. `npm run check -- transition-gather` → the trace runs:
   - move (5, −3), transition, move (5, −4), gathering ×2;
   - move (5, −3), transition, move (4, 1), deposit;
   - move (5, −3), transition, move (5, −4), gathering ×3;
   - move (5, −3), transition, move (4, 1), deposit.

   Last line `ok [19 actions, 6 virtual min]`; no 598 (the run would fail the layer check).
4. `npm run check -- no-route` → two actions only: move (2, 0), then gathering. There is no move toward (9, 7) or
   (9, 8), and the queue runs to its end.
5. `git grep -n "nearest(" src/` → every call passes a character (`ch`, `who`, `leader`) as its third argument,
   never coordinates.
6. `npm run typecheck` → nothing after `tsc --noEmit`. Scratch build: see "Commands run".
7. `git show --stat HEAD` → the files listed under "What was done / files", this task file and this report.
8. *Not checked by me — needs the restart:* in `logs/dev.log`, the first miner at 30 shows
   `POST /my/<name>/action/transition` between moves to (5, −3) and (5, −4), and no `-> 598` follows.

## What was done / files

### 1. Routes — `src/plan/route.ts` (new), `src/types/catalog.ts`
- **Regions** (`regions()`, `route.ts:52-86`): a flood fill over the four neighbours on the same layer. It is built on
  the first call after a catalog load and kept per catalog (a memo on the maps array), never per call.
  `loadCatalog` is not touched, which avoids an import cycle between `route.ts` and the catalog.
- **Which access types are walkable** (`neighbours`, `route.ts:88-97`):
  - `standard` (413): walkable.
  - `blocked` (1,007): never.
  - `restricted` (5, all of them the Enchanted Forest): only from another restricted tile. The only way in is an
    overworld → overworld transition with a 5,000-gold toll, (−4, 9) → (−4, 8); it would buy nothing if the forest
    could be walked into.
  - `conditional` (3: Tasks Trader, the island's bank, Rosenblood): part of its neighbour's region as a destination,
    never a corridor. Whether the condition is met stays the server's call, as before. `nearestBank` still refuses the
    island's bank.
- **`route(from, to, may)`** (`route.ts:155-178`):
  - breadth-first over regions through transition tiles that `may` opens (`hopsBetween`, `:124-150`);
  - the transitions to use are memoised per (`may`, region pair);
  - legs are `walk to (x, y)` or `transition at (x, y)`; `[]` means already there, `undefined` means no route.
  - `FREE` (`:37`) opens transitions without conditions, 21 of 30. Keys, tolls and `has_item` will only change what
    the caller passes as `may`.
- **`travelSec(legs)`** (`:180`): 5 s per map crossed plus 5 s per transition.
  - Maps crossed are the real path length: a breadth-first search inside the region, kept per source tile
    (`walkTiles`, `:98-118`). That is no more than the task allowed, so Manhattan distance is not used.
  - Shortcut: where two transitions join the same pair of regions, the first one found is taken, not the nearer one.
    Today that is only the lava cave's two keyed ones.
- **Type** (`types/catalog.ts:104-115`): the map's `transition` is typed as `Transition { map_id, x, y, layer,
  conditions[] | null }`.
- **Atlas:** left alone. `scripts/atlas/model.mts:16-91` answers a different question: from the fixed tile (4, 1), in
  rounds of increasing gate count, it labels each tile with its cheapest list of gates, counting a conditional tile's
  own conditions as gates. `route.ts` answers "which legs and how many seconds, from any place to any place".
  - The walking rule also differs in one point: the atlas lets a restricted tile step out onto a standard neighbour,
    so you can leave the Enchanted Forest on foot. `route.ts` uses the forest's free exit transition (−4, 8) →
    (−4, 9) instead.
  - Moving the atlas onto `route.ts` would need gate labels, a fewest-gates search and a regenerated `atlas.json`
    (out of scope). That is not a small change.
- **Probe on the real data:**
  - From the bank (4, 1) the gold rocks are 35 s away and the rats 95 s.
  - Not reachable: the lich, the dryads, the whole island, the cultists, the priestess, and the northern lava cave
    (fennec, flameche, lava fish).
  - Reachable: the bats, mithril, and the baby red dragons and sorceress (three transitions via the Abandoned House).
  - A `nearest` sweep over all 58 monsters costs 0.65 ms; the old one cost 0.21 ms.

### 2. `moveTo` and `nearest` — `src/state/loopkit.ts`
- `placeOf`, `isAt` (`:51-53`): `isAt` compares x, y **and** layer. `NoRouteError` (`:56`).
- `moveTo(name, place)` (`:66-85`):
  - one leg per call: `move` to the next tile, or `transition`; returns true once there;
  - already there → true, with no call;
  - no route → `NoRouteError`, never a `move` to the same coordinates on another layer;
  - 595/596 although `route()` found a path → an error naming both ends and the code: "the map's regions are wrong".
- Interruption: since each tick does one leg, ⏹ and a change of head take effect between legs. Callers re-derive their
  target every tick.
  - Two orderings changed for this. `runStep`'s gather (`exec.ts:307`) and `fightRound` (`exec.ts:493`) now check the
    full bag **before** walking toward work; otherwise a bank trip of several legs would turn back toward the node.
  - Side effect: `helper-full-bag` takes 57 actions instead of 59 (no walk to the node with a full bag).
- `walkTo` (`:88-91`) walks every leg in one call. It is used only where the old code was atomic on purpose:
  `giveUpTask`'s coin fetch and cancel (`queue.ts:1095`, `:1099`; the "no-win only exists on the monster tile"
  livelock) and the UI's "cancel task with fee".
- `nearest(type, code, character, ok?)` (`:100-117`): only tiles with a route, ranked by `travelSec`. Event tiles are
  considered on their own layer. `nearestBank(character)` follows (`:129`).
- `missingText` (`:120-126`): either "no X reachable — only on another layer, behind a transition this client does not
  use (from …)" or the old "no X on the map (event over?)".
- **Callers changed** (diff counts):
  - `queue.ts`: `nearest` 29, `nearestBank` 9, `bankOff` 14, `moveTo` 7, x/y-only position checks 6, `runStep`
    targets 21.
  - `exec.ts`: `nearest` 3, `nearestBank` 5, `bankOff` 5, `moveTo` 9, x/y-only checks 3, `runStep` targets 4.
  - `ui/CatalogPanel.tsx`: 3. `ui/GroupFight.tsx`: 1.
  - `bankOff(name, keep, note)` reads the live character instead of taking coordinates.
  - `runStep` targets carry a `Place` (`at`) instead of `x, y`, and a step that only walked a leg returns `moved`, so
    it never counts as progress.
- **Persisted items** (`plan/queue.ts:14-52`): `move`, `gather`, `craft`, `withdraw`, `buy`, `sell`, `recycle` and
  `train` get an optional `layer`. `pinnedAt` (`queue.ts:187`) reads a pair without a layer as the overworld.
- **"Is there such a tile" became "can this character reach one"**: `trainingMonsterFor`, `favorSource`,
  `canObtainOffering`, `sourceOne`, the work-task sources and the `train` node all go through `nearest`.

### 3. Missing routes and 598
- No route from `nearest` → the existing skip or pause paths, with `missingText`: gather, train, fight, prepare,
  buy/sell (NPC), `sourceOne`; the work-task paths throw it.
- `NoRouteError` from `moveTo` (a pinned place on an unreachable layer) → `runLoop` skips the item
  (`queue.ts:1463`). No retry loop.
- **Outages** (`queue.ts:1433-1438`, `isOutage`):
  - **Held 60 s and retried:** code 0 (transport, after `client.ts`'s own backoff) and any code ≥ 500 that
    `docs/api/openapi.json` does not define (500 "Fatal error", 502, 503, 504, …).
  - **Answers, on the ordinary error path:** every code the document defines. That covers the 4xx as before, plus
    550, 551, 552, 560–567, 570–577, 595, 596 and 598.
  - Unchanged: 486 keeps its 5 s × 6 handling; 497 still triggers a bank-off; 499, 461 and 429 are still handled
    inside `api()`.
  - A paused item's error now ends in `(code N)` for an `ApiError` (`queue.ts:1500`).

### 4. The `train` item's node
`trainingResourceFor(skill, level, reach?)` (`plan/hive/skills.ts:50`) takes an optional reachability filter. The
`train` item passes "`nearest` finds it from here" (`queue.ts:426`). The hive's call is unchanged.

### 5. Wishlist
The `backpack` wish is removed (`plan/events.ts:27-33`). `merchant-order` does not count backpacks, so it is unchanged.
`scripts/check-events.mts` asserted the backpack buy; it now asserts that nothing more is bought once every map is owned.

### 6. Harness and scenarios
- `fake.mts`:
  - **`move`:**
    - path-checked against its own path-finding (`pathLength`, `:206`), written apart from `route.ts` so that a wrong
      region shows up as 595;
    - answers 596 on a blocked tile and 595 with no path;
    - now charges 5 s per map crossed. Before, it charged 5 s × the Manhattan distance; on the old scenarios' mainland
      paths that is the same number, so their virtual times did not change.
  - **`transition`** (`:307`): 404 with no transition on the tile; 478 for a missing cost item or carried item; 492 for
    gold; 496 for anything else. The character's x, y, layer and `map_id` change; cooldown 5 s.
  - A lost fight now sends the character to (0, 0) **on the overworld** (a guess, marked).
  - `CharInit` takes `layer`.
- `index.mts`: the **layer check** (`:210`) fails a scenario on any 598 unless it declares `expect598`. On the 19
  scenarios that existed before, it found no 598 anywhere.
- **New scenarios.** The column on the right is what the pre-006 engine does in the same world (I stashed `src/` and
  ran them):

  | scenario | now | old engine |
  |---|---|---|
  | `transition-gather` | gather behind Forest (5, −3), bag fills, out to the bank and back; 4 transitions for 2 round trips; ok | 598 every 60 s until the 180-minute limit |
  | `transition-fight` | rats in the Abandoned House, rest between fights; out to the **nearer** bank by route, (7, 13), not (4, 1); ok | 180-minute limit |
  | `no-route` | the lich is skipped ("only on another layer"); a `move` pinned to (9, 8) underground is skipped through `NoRouteError`; the next item runs; ok | walks to (9, 8) on the overworld, pauses |
  | `598-is-an-answer` | one call, paused at once, `Resource not found on this map. (code 598)`; ok | held, then retried |
  | `train-mining-30` | miners at 29 / 30 / 35, the strange rocks event ending at 4 minutes: coal / gold / strange then gold; ok | no gold at 30 (598 holds) |
  | `old-queue-item` | x, y without a layer, starting underground: out through the transition, then the overworld tiles; ok | 180-minute limit |

  `train-mining-30` drives the running `train` item, not direct calls. The fake has no XP, so each miner stays at its
  level and the item's pick can be watched.
  `transient-faults` and `486-after-500` still pass unchanged.

### Files outside the scope list that a changed signature forced
- `src/plan/types.ts`: `AcquisitionStep` carries `at: Place`.
- `src/ui/CatalogPanel.tsx` and `src/ui/GroupFight.tsx`: the `nearest` / `moveTo` signatures.
- `scripts/check-events.mts`: the backpack assertion.
- `CLAUDE.md`: besides movement, three sentences that would otherwise be false: the outage rule, runOffering's
  "would be treated as an outage", and the wishlist.

### Commands run
- `git commit` (Rework notes).
- `npm run check` (a baseline before any change, then after each step).
- `npm run typecheck`.
- `npm run check -- <scenario>` for each new scenario.
- A route probe and a `nearest` cost probe with tsx and a scratch storage file (deleted).
- `git stash push -- src` / `git stash pop`, around the old-engine runs.
- `grep` / `awk` / `node -e` reads of `public/data/*.json`, `docs/api/openapi.json`, `docs/design/snapshot/*.json` and
  `logs/dev.log` (read only).
- `npx vite build --outDir D:/Temp/ammo-006-dist --emptyOutDir`, then the folder was deleted. Last lines:
  ```
  D:/Temp/ammo-006-dist/index.html                 0.40 kB │ gzip:   0.27 kB
  D:/Temp/ammo-006-dist/assets/index-Dc_NjE2T.css  37.23 kB │ gzip:   7.26 kB
  D:/Temp/ammo-006-dist/assets/index-BZi3vrq8.js   330.40 kB │ gzip: 110.35 kB
  ✓ built in 1.30s
  ```

## What changes for the running fleet at the next restart
- **Walking.** Characters reach anything behind a free transition: gold rocks and mithril underground, rats in the
  Abandoned House, bats, and the baby dragons and sorceress in the lava cave. They walk, `transition`, walk, and come
  out the same way to the nearest bank **by route**; from the Abandoned House that is the bank at (7, 13).
- **Unreachable places.** The lich, the dryads, the island, the cultists and the northern lava cave are no longer
  walked to on the wrong layer. An item aimed at them is skipped with "only on another layer…".
  - Before, that walk ended in a 598 held as an outage forever.
  - An event on the island (the duskworm) is skipped the same way; the Silent Night bats underground are reachable.
- **Combat training** (`trainingMonsterFor`) now counts the rats (25) as a candidate, if the bank's set beats them.
  The bats (38) come in from combat 28 (the pick stops at level + 10). What cannot be reached is dropped.
- **Errors.** A game answer ≥ 500 (598, 595, 596, …) pauses the queue at once with its code instead of holding for
  60 s forever. Real outages (500, 502, …, transport) are still held and retried.
- **Full bag.** A gatherer or fighter with a full bag goes to the bank first, before walking to its node or monster.
- **Nomadic Merchant.** Lost World Maps only; no more 50,000-gold backpacks.
- **Queue editor.** A "Move" item from the editor has no layer and now means the overworld; it used to mean "the
  character's current layer". Persisted items keep working, on the overworld.
- **Fourth and Fifth** (mining 24) keep training on the coal rocks.
  - **At 30:** the gold rocks — walk to Forest (5, −3), transition, one tile to (5, −4), gather. With a full bag: one
    tile back, transition, five tiles to the bank, deposit, and back the same way. About 35 s each way plus the
    deposit.
  - **At 35–39:** the strange rocks while the Strange Apparition is up, else the gold rocks. Before, training skipped
    until 40.
  - **At 40:** mithril, through Mountain (−2, 6).

## Notes

### Section 7 — offerings, the last seven full UTC days (11-11 to 11-17)
The cap is 15 a day: five characters × (combat + two rotating skills). Sources: the dev log, the code, and the levels in
`docs/design/snapshot/characters.json`.

| UTC day (categories) | First | Second | Third | Fourth | Fifth | done |
|---|---|---|---|---|---|---|
| 11-11 … 11-15 (each day) | 0 | 0 | 0 | 0 | 0 | **0 / 15** — never queued: no offering read, accept or completion in the log |
| 11-16 (combat, cooking, woodcutting) | 1: cooking ✓ · combat, woodcutting not attempted by the item (see below) | 1: combat ✓ · cooking skipped "no way to get 15× Cooked Bass" · woodcutting skipped "no way to get 31× Dead Wood" | 2: combat, woodcutting ✓ · cooking skipped (Cooked Bass) | 2: same as Third | 2: same as Third | **8 / 15** |
| 11-17 (combat, alchemy, gearcrafting) | 2: combat, alchemy ✓ · gearcrafting: no bracket (gearcrafting 2) | 2: same as First | 3 ✓ | 2: same as First | 2: same as First | **11 / 15** |
| *(11-18, part of a day)* | 2 | 2 | 2 | 2 | 2 | *10 / 15: combat skipped by all five — "can't get 6× Ogre Eye / 5× Demon Horn or any lower bracket's item"; mining and cooking done after the 10:13 restart through the lower-bracket fallback* |

Seven days: **19 of 105**. No day ran out of time: 11-16 was done by 15:16 and 11-17 by 00:35.

The causes behind the 86 missed:
1. **No daily trigger before 2026-11-16: 75 of the 86.** `scheduleOfferings` arrived with `bb2bb65` / `f3d6ce0` on
   11-16 and first fired at the 14:06 UTC restart that day. Before it, the `offering` item ran only when queued by
   hand, and nobody queued it. This is fixed and not inside the item.
2. **The character's own bracket asks for an item nobody can get: 5 on 11-16.** Cooked Bass and Dead Wood need fishing
   and woodcutting 30. On 11-18 every combat offering failed the same way: Ogre Eye is a monster drop the fleet does not
   win safely, and Demon Horn comes from an event monster.
   - On 11-16 the offerings were accepted and then skipped, before `c962d96` ("accept only what the character can
     complete").
   - The lower-bracket fallback (`aa63544`, live since the restart on 11-18) recovers the skills. It cannot recover
     combat, because 10–20 is the lowest bracket.
   - **This cause is inside the item** (`offeringPick` → `canObtainOffering`), so the planner inherits it. The combat
     drops get obtainable only as the fleet levels or `pickMonster` makes a drop fight worth its while.
3. **A skill below the lowest bracket (level 10): 4 on 11-17**, gearcrafting 2 on First, Second, Fourth and Fifth.
   - `offeringSlots` gives such a category the status `none` (`state/offerings.ts:55-57`) and drops it **without a log
     line**. That is why the log shows 11 completions and no skip that day.
   - Inside the item, and nothing it can do except level the skill to 10. This will recur on every day gearcrafting,
     weaponcrafting or jewelrycrafting rotates in, since four characters are at 1–2 in those.
4. **First on 11-16: 2 not attempted by the item.** Its cooking offering was already accepted when the item first read
   the day, and the log has no accept for it. After cooking, the item had no work left, so combat and woodcutting were
   done (or none) by then.
   - The favor count fits work done in the game's UI: 33 favors in the snapshot against 31 completions in the log.
   - This is an inference, not a fact from the log.

### Other things noticed and not touched
- `runOffering` still catches 598 and 575 itself (`queue.ts`, the altar step). That is redundant now, and harmless.
- `src/plan/roadmap.ts:83` still lists the backpack as an event buy.
- The hive calls `trainingResourceFor` without the reachability filter. A level-skill goal at 35–39 still pins the
  event node and skips (the hive is frozen).
- `availableMonsters` / `availableResources` (the UI pickers, `state/events.ts`) still list unreachable content. An
  item made from them is skipped with the new text.
- Manual moves from the map (`MapView`, CatalogPanel "Send") still send x, y on the character's current layer. The
  queue editor's Move item writes no layer (UI, out of scope).
- `trainingMonsterFor`'s memo is per bank reference and level, not per position. That is fine while every free-reachable
  area is one connected set, which it is today.
- A 🔁 queue whose only item is unreachable skips in a loop: the known `repeat-spin` defect (B.3 X-11), the same as any
  other skip.
- `walkTo` in `giveUpTask` cannot be interrupted between legs, like the atomic sequence it replaces.
- No time estimate outside `nearest` uses `travelSec` yet: the hive's lane pace and `trainRecipe`'s field seconds still
  ignore walking.

### What the second half of stage 2 (keys, tolls) needs from `route()`
- **Opening transitions:** a `may` built from the traveller and the plan.
  - Conditions are `cost` (an item or gold, consumed per use), `has_item` (carried) and `achievement_unlocked`.
  - The legs already carry the transition with its conditions. A step can read them, withdraw the key or fare before
    leaving the bank side, and keep it as working stock.
  - The memo is per `may` function. A `may` that changes with stock needs either a fresh function per stock reference
    or the memo dropped.
- **Pricing:** a toll is gold, not seconds. The region search picks the fewest transitions; with tolls it needs a cost
  (Dijkstra over regions, seconds plus gold valued by the D.2 rule). Two routes between the same regions — key vs walk,
  boat vs anything — then matter.
- **The restricted reading.** Restricted tiles are only entered through their transition. Confirm it the first time
  the forest toll is paid: watch whether the character is walked out on foot.
- **Conditional tiles** (Tasks Trader, Rosenblood, the island's bank) remain the server's call. The planner will want
  the achievement state to rank them.
- **The island:** with its bank closed, a trip there is one bagful and two fares (design D.2). `nearestBank` already
  never picks that bank.

## To delete (Alex)
Nothing.
