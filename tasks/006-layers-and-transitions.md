# 006 — Movement knows layers; free transitions are walked

## Goal
The map has three layers (`overworld`, `underground`, `interior`; 476 tiles each in `public/data/maps.json`) joined by
30 transition tiles. The runner ignores all of it: `nearest()` compares `x` and `y` only
(`src/state/loopkit.ts:61-76`), `moveTo` sends `x, y` (`:50-54`), and `actions.transition`
(`src/api/actions.ts:86`) is called by nothing. A target on another layer is "found" at the same coordinates on the
character's own layer; the action there answers 598, and `runLoop` holds 598 as a network outage every 60 s, forever,
without pausing (`src/state/queue.ts:1470-1475`).

This is about to happen for real. The `train` item asks `trainingResourceFor` for its node
(`src/state/queue.ts:419`, `src/plan/hive/skills.ts:48-55`); at mining 30 that is the gold rocks, which exist only
underground at (3, −5) and (5, −4), behind the free transition Forest (5, −3) ↔ Mine (5, −3). Fourth and Fifth mine
at 24. And the planner's design (`docs/design/planner.md` A.2, F.1, I.1) needs mining past 30 on three characters
within days of its first stage.

After this task:
1. no code can ask for "the nearest X" or "go to (x, y)" without a layer, and nothing walks to the right coordinates
   on the wrong layer;
2. a target behind **unconditional** transitions is reached by itself — walk, `transition`, walk — and left the same
   way (a full bag underground goes out to the bank and comes back);
3. a target with no route is an ordinary "not available" (skip or pause with a clear text), never a loop;
4. an answer the game defines is never treated as an outage.

It is the first half of the design's stage 2 (F.1), moved ahead of the planner because it does not depend on it:
every existing queue item works behind a transition once `moveTo` and `nearest` do. Keys, tolls and `has_item` come
later, with the planner, which owns stock and gold.

Read first: `CLAUDE.md`; `docs/rework.md`; `docs/design/planner.md` sections E (best monster, best node) and F.1;
the reports of 002 and 003; `src/state/loopkit.ts`; every caller of `nearest`, `nearestBank` and `moveTo` in
`src/state/queue.ts` and `src/state/exec.ts` (about sixty) and any in `src/ui/` and `src/plan/`;
`src/api/actions.ts`; `src/types/catalog.ts` (the map type; `transition` is `unknown` at `:104`); the catalog's map
loading; `scripts/atlas/model.mts:16-91` (regions by flood fill exist there, offline); `src/state/events.ts`
(`liveEvents`); `scripts/harness/*` and `scripts/scenarios/*`; `docs/api/openapi.json` for `action/move`
(it takes `x, y` or `map_id`; answers 595 "no path", 596 "map blocked", 496 "conditions not met"; the reply carries
`path`) and `action/transition` (404, 478, 492, 496; reply `CharacterTransitionDataSchema`).

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running and stays undisturbed.** Don't start, stop or restart a service; don't call the
  local one; don't run `npm start`, `npm run dev`, `npm run build` (it rewrites the `dist/` the running service
  serves), `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`, nothing
  writes to `logs/dev.log` (reading it is fine and section 6 needs it). The change takes effect at the service's
  next restart; the task does not do that restart.
- **No request to the game.** Don't read `.env`.
- **Scope of code changes:** `src/plan/route.ts` (new), `src/state/loopkit.ts`, `src/state/queue.ts`,
  `src/state/exec.ts`, `src/types/catalog.ts`, the catalog's map loading if regions are built there,
  `src/plan/queue.ts` (item types only), `src/plan/hive/skills.ts` (section 4 only), `src/plan/events.ts`
  (section 5 only), other files only where a changed signature forces a one-line consequence (list them), the
  harness and the scenarios, `CLAUDE.md` where it describes movement. Anything else that seems necessary goes to
  "Decisions for Alex" first.
- **Dependencies:** none new.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`.
- Gate: `npm run typecheck`, `npm run check`, and a production build into a scratch folder:
  `npx vite build --outDir <temp dir>/ammo-006-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`.
  2. At the end, `006: layers and transitions`: this task file, the report and what the task changed.

## 1. Routes — `src/plan/route.ts`, pure
- **Regions.** Tiles of one layer that `move` can travel between. Built once when the catalog loads, never per
  call. Take the walkability rule from the docs' description of `move` and from the tiles' `access.type`
  (`standard` 413, `blocked` 1,007, `restricted` 5, `conditional` 3 in the data) and say in the report which types
  are walkable and why. The atlas has the same flood fill offline (`scripts/atlas/model.mts:16-91`): one
  implementation is the aim — move it here and let the atlas script import it if that is a small change; if it is
  not, say what differs and leave the atlas alone.
- **`route(from, to, may)`** → the legs (`walk to (x, y)` | `transition at (x, y)`) or `undefined`. Breadth-first
  over regions through transition tiles. `may(transition)` says whether a transition is open to this traveller.
  **In this task it opens only transitions without conditions** (21 of the 30); the parameter exists so that keys,
  tolls and `has_item` are a later change of the caller, not of this module. A destination whose own tile has
  `conditional` or `restricted` access stays what it is today (`nearestBank` already refuses the island's bank).
- **`travelSec(legs)`**: 5 s per map crossed, 5 s per transition (docs, maps and movement). The game's `move`
  path-finds around blocked maps, so the count of maps crossed is the path's length inside the region, not the
  Manhattan distance; if computing real path lengths is more than a breadth-first search on the region, use
  Manhattan inside a region and say so.
- The map type gets a typed `transition` (`map_id`, `x`, `y`, `layer`, `conditions[]`).

## 2. `moveTo` and `nearest` — `src/state/loopkit.ts`
- **`nearest`** takes the traveller (position **and** layer; `layerOf` exists at `:20`), considers a tile only if
  `route()` reaches it, ranks by `travelSec`, and returns the tile with its layer. Event tiles
  (`liveEvents()`) are considered on their own layer. `nearestBank` follows.
- **`moveTo`** takes a destination with a layer and walks the legs: `move` to the transition tile,
  `actions.transition`, repeat, then `move`. Already there (same `x`, `y` **and** layer) → no call. No route → a
  typed error (`NoRouteError` or the like), never a `move` to the same coordinates on another layer.
- A leg is one action and one cooldown; a route is interruptible between legs the way everything else is (⏹, the
  head changing under a step — `src/state/queue.ts:1449`). A character stopped half-way is simply somewhere else;
  the next tick routes from there.
- **Every caller is changed.** No caller may be able to name a place without a layer. Queue items that persist
  `x, y` (`it.x`, `it.y` — `src/state/queue.ts:236`, `:257`, `:268` and the like): a persisted pair without a layer
  means the overworld, so queues saved before this change keep working; new writes carry the layer.
- Checks that ask "is there such a tile at all" (`src/state/queue.ts:660`, `:1224`, `:1305-1309` and the like) now
  ask "can this character reach one". That changes picks — a monster or a node nobody can reach is no longer a
  candidate — and is the point.
- Cost: `nearest` runs in hot paths (the monster memo loops over every monster). No flood fill and no search over
  all tiles per call beyond what it does today; memoise routes per pair of regions.

## 3. What a missing route and a 598 become
- No route: the item is skipped or the queue pauses exactly as it does today for "no … on the map (event over?)",
  with a text that says the place is on another layer and not reachable. No retry loop.
- **Outages.** `runLoop` holds and retries on `code === 0 || code >= 500` (`src/state/queue.ts:1470`). The game
  uses that range for its own answers (598 "… not found on this map", 595, 596, and the 55x–57x family in
  `docs/api/openapi.json`). Hold and retry only for transport failures and server faults; every code the OpenAPI
  document defines is an answer and takes the ordinary error path. List the codes on each side in the report.
- If `move` itself answers 595 or 596 although `route()` said yes, the regions are wrong: the error text says so
  (from, to, the code), and the item takes the ordinary error path.

## 4. The `train` item's node
`trainingResourceFor(skill, level)` returns the highest-level node of the skill whether or not it is on the map: at
35 that is an event node, and training skips until 40 (audit C.3, parked in `docs/rework.md`). The planner will
replace this function (`pickNode`, design E); until then, the smallest change: among the nodes that still give XP,
the `train` item takes the highest-level one **this character can reach now**. Mining 30 → the gold rocks, through
the transition; mining 35–39 → the gold rocks, or the event node while it is up.

## 5. One line riding along: the Nomadic Merchant's wishlist
Report 005, decision 2 (default A): backpacks are no longer bought; the gold is kept for boat and forest fares.
Remove the `backpack` wish from `WISHLIST` (`src/plan/events.ts:28-33`); Lost World Maps stay. Adjust
`merchant-order` if it counts backpacks. Nothing else in that file.

## 6. Harness and scenarios
The fake already keeps a layer on characters and tiles and answers 598 on the wrong tile
(`scripts/harness/fake.mts:55`, `:193-198`). It gets:
- `transition`: validation and the reply shape from the OpenAPI document (no transition on the tile → 404; an unmet
  condition → 478, 492 or 496); the character's `x`, `y`, `layer`, `map_id` change; cooldown 5 s;
- `move` that answers what the game answers for a blocked or unreachable destination (596, 595) instead of going
  there. Say in the report what the fake charges for a move today and whether it matches 5 s per map crossed; make
  it match if that is small.
- A **layer check, automatic on every scenario** (like the mirror and the bounce checks): any 598 answered by the
  fake fails the scenario unless it declares that it expects one.

Scenarios:
- `transition-gather`: a character at the bank with `gather` on the gold rocks, bag nearly full: walks to
  Forest (5, −3), transitions, gathers underground, the bag fills, goes out to a bank and deposits, comes back,
  finishes. Exactly two transitions per round trip; no 598.
- `transition-fight`: the same for a monster that lives only behind a free transition (rats in the Abandoned
  House, or bats), with a rest in between.
- `no-route`: a target behind a conditional transition only (the lich, behind the tomb key): the item ends as
  section 3 says; no `move` to (9, 7) on the overworld is ever sent; the next item of the queue runs.
- `598-is-an-answer`: a forced 598 on a gather: the ordinary error path within one tick, the code in the error; no
  60 s hold. And the existing outage scenarios (`transient-faults`, `486-after-500`) still pass unchanged.
- `train-mining-30`: the node choice of section 4 at mining 29, 30 and 35, with and without the event node live.
  The fake has no XP, so if a running `train` item cannot be driven to a level-up, pin the choice with direct calls
  in the scenario file and say so.
- `old-queue-item`: a persisted item with `x, y` and no layer still runs, on the overworld.

## 7. A read-only question, for the report's Notes — no code
The log shows 8–11 offerings a day against a cap of 15 (map E), and each one missed is a quarter of a level and a
favor. The design keeps the `offering` item underneath its interrupt, so if the cause is inside the item, the
planner inherits it. From `logs/dev.log` and the code (the daily trigger `src/state/queue.ts:1606-1630`,
`queueOfferings`, the `offering` handler, `obtainOffering`): for each of the last seven full UTC days, the offerings
completed per character, and for each one missed the reason — never queued, skipped (with which text), not
obtainable, ran out of day, something else. One table and the two or three causes behind most of the gap. Fix
nothing.

## Out of scope
Keys, tolls, `has_item` and achievement-gated access (the lich tomb, the priestess, the Enchanted Forest, the boat,
the cultist house, the island's bank); the planner and its `pickNode` / `pickMonster`; group fights; any UI change
beyond what a changed signature forces; regenerating the atlas; the offerings (section 7 only reads); everything
parked in `docs/rework.md` except "598 treated as an outage", "no `transition` anywhere in the runner" and "mining
and woodcutting training break at skill 35–39", which this task closes.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `006: layers and transitions` on top of `Rework notes`; `git status` clean.
2. `npm run check` → every scenario passes except `repeat-spin`, the only known one; exit 0. The layer check ran on
   all of them (the report says what it showed on the scenarios that existed before).
3. `npm run check -- transition-gather` → the trace shows move, transition, gathers, move, transition, deposit, and
   back; no 598.
4. `npm run check -- no-route` → no move to the lich's coordinates; the queue goes on.
5. `git grep -n "nearest(" src/` → no call passes bare coordinates without a layer.
6. `npm run typecheck` passes; the scratch build succeeded (the report quotes its last lines).
7. `git show --stat HEAD` → only files inside "Scope of code changes", the task and the report.

## Report
`tasks/006-layers-and-transitions.report.md`, with these sections in this order:
- **Summary** — 3–6 lines.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is deleted
  for good). Each: the question in one line, the options (A / B), your recommendation, the default. "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What was done / files** — per section 1–6: the change and the lines; which access types are walkable; the codes
  held as outages and the codes that are answers; every caller changed (a count per file is enough); every command
  run.
- **What changes for the running fleet at the next restart** — in plain words: what characters will do differently,
  and what Fourth and Fifth do when mining reaches 30.
- **Notes** — section 7's table and causes; anything else, including defects noticed and not touched, and what the
  second half of stage 2 (keys, tolls) will need from `route()`.
- **To delete (Alex)** — or "Nothing".
