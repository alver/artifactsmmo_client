# 017 — Keys, tolls and what is spent: the places behind a conditional transition, tasks coins, a market read

## Goal
Nine of the map's thirty transitions have a condition and three tiles have conditional access. The runner walks
only the free ones (`src/plan/route.ts`, `FREE`), the core gives everything behind the others a `layer` gate that
nobody ever meets (`src/plan/planner/targets.ts placeGates`), and the forward model has no keyed or paid
transition. In every replay row the same 73 points stay open "behind a layer", so the roads from 40 to 50 score
without them today. The planner also spends nothing but a bank expansion: a material sold for tasks coins "comes
from tasks" (`targets.ts`), with 584 coins in the bank.

This task (decisions 10, 33, 44 and 45 of `docs/rework.md`; design D.2 and F.1 of `docs/design/planner.md`):
- **opens the conditional transitions to the planner and the runner**: a key, a carried item, a fare, an
  achievement — planned, reserved, withdrawn, paid, and never a character stranded behind one;
- **says what is spent**: a gold budget for fares with a price in the score, tasks coins on an objective's own
  material, a record of every unit spent;
- **repairs what reports 016 and the first journal hours showed** (settled point 13);
- **starts a standing read of the Grand Exchange** into the logs (Alex, 2026-11-21), for an analysis a few days
  from now. Nothing is bought or sold there.

**Read in the chat on 2026-11-21** (check each against the files; say where one is wrong):
- `public/data/maps.json`, the transitions with conditions:
  - Graveyard (9, 7) → Lich Tomb: `lich_tomb_key` ×1, cost;
  - Mine (3, −4, underground) → Mine (1, −4): `priestess_hideout_key` ×1, cost;
  - Lava Underground (7, 3) → (6, 2) and (8, 3) → (9, 2): `sonnengott_key` ×1, cost;
  - Enchanted Forest (−4, 9) → (−4, 8): 5,000 gold, cost;
  - Forest (2, 16) → Sandwhisper Isle (−2, 21) and back: 1,000 gold each way, cost;
  - Sandwhisper Isle (−3, 19) → Empress House: `sandwhisper_key` ×1, cost;
  - Forest (0, 13) → Rosenblood House: `cultist_cloak` ×1, `has_item`.
- Tiles with conditional access: the Tasks Trader (5, 11) — `tasks_farmer`, done on 11-08; Rosenblood
  (−1, 13, interior) — `clean_the_lab`, open, 0 of 100; the island's bank (−2, 19) — `secure_the_island`, open,
  0 of 50. The Enchanted Forest's tiles are `restricted` (dryads, enchanted mushroom, a raid).
- The day's snapshot (`logs/world/2026-11-21.json`, 11:43:35 UTC): bank gold 240,489; 24 lich tomb keys;
  584 tasks coins; 95 codes of 110 slots; 28 of 210 points.

The service was restarted at **11:43:34 UTC on 2026-11-21** (run `[0gpn]`, commit `c8cbd78`, report 016's code);
the five steps re-attached. The journal, the status, the hourly raw files and the day's snapshot are written.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 10, 33, 40–45; "Known and parked", the blocks of reports
014–016); `docs/design/planner.md` D.1, D.2, F.1; `docs/journal.md`; report 016 (Notes); the game's docs on maps
and movement and on the Grand Exchange, and `docs/api/openapi.json` (`TransitionSchema`, the conditions'
operators, `/grandexchange/*`); `src/plan/route.ts`, `src/state/access.ts`, `src/state/loopkit.ts` (`moveTo`,
`nearest`, `deposit`, `depositAll`), `src/state/exec.ts` (`gearSwapStep`, `bankOff`, `fightRound`),
`src/plan/jobgear.ts`, `src/state/queue.ts` (the `gear`, `fight`, `buy`, `expand`, `deposit-all` cases, `runLoop`),
`src/state/eventorders.ts`, `src/state/sync.ts` (`refreshEvents`), `src/state/planner.ts`, `src/lib/journal.ts`;
all of `src/plan/planner/` (`targets.ts`, `gates.ts`, `reach.ts`, `stock.ts`, `supply.ts`, `gear.ts`, `bank.ts`,
`consumables.ts`, `events.ts`, `decide.ts`, `compile.ts`, `cost.ts`, `forward.ts`, `config.ts`, `types.ts`);
`scripts/check-planner.mts`, `scripts/journal.mts`, `scripts/harness/*`, the scenarios `planner-*`, `event-*`,
`consumables-*`, `bank-*`, `journal-*`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`. **Nothing you
  run writes under `logs/`.** Reading under `logs/` is part of the task: `npm run journal` on the real
  `logs/journal`, the status, the snapshot, an hourly raw file as a stream.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Alex restarts only when the
  report exists. Write the report last, after the gate is green and the task commit is made. If the journal
  shows a restart during your work, say in the Summary what code it loaded.
- **Requests to the game: only the public Grand Exchange reads of section 5**, from a scratch script, without
  the token, at most 60 requests in all. No other request. Don't read `.env`.
- **Nothing is sold and nothing is bought by anything you run.** The code you write spends gold on fares and
  tasks coins on materials once the service is restarted, as settled below; it adds no Grand Exchange action.
- **Dependencies:** none new. `package.json` gets one script line (`market`) and nothing else.
- **What may change:** `src/plan/route.ts`; everything under `src/plan/planner/`; `src/plan/jobgear.ts` and
  `src/plan/queue.ts` only for settled points 6 and 13; `src/state/loopkit.ts`, `exec.ts`, `queue.ts`,
  `planner.ts`, `eventorders.ts`, `access.ts`; `src/state/sync.ts` and a new `src/state/market.ts` for settled
  point 14; `src/lib/journal.ts` (the `spend` record, the market file's sink); `src/server/main.ts` only if a
  sink needs it; `scripts/check-planner.mts`, `scripts/journal.mts`, a new `scripts/market.mts`,
  `scripts/harness/*`, new scenarios and fixtures; `CLAUDE.md`, `docs/journal.md`,
  `.claude/skills/verify/SKILL.md` (the log's name only). **Not** `src/sim/*`, not the UI, not the hive.
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.
- **A write that fails never breaks the runner; nothing new pauses a queue to wait for Alex.**
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about play give the UTC time of a record.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-017-dist --emptyOutDir` (never the project's `dist/`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again
  by the end, commit it again the same way before the task commit. At the end, `017: keys and tolls`: this task
  file, the report and what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't
  retry in a loop: say so under "How Alex verifies".

## What is settled
1. **A condition is read as the game gives it**: `cost` with `gold` is a fare; `cost` with an item is a key,
   consumed; `has_item` is an item carried and kept; `achievement_unlocked` is met by the account's
   achievements. A tile's conditional access is the same list. Find in the game's docs whether a cost is charged
   per character and per use, and whether `has_item` wants the item in the bag or worn. Where the docs are
   silent: per character, per use, in the bag — and that goes under the report's guesses.
2. **A `layer` gate is met by a character when a route exists through transitions the plan can open**: free
   ones; an achievement that is done; a key or a carried item the character may take (`available`), reserved and
   withdrawn by the step; a fare the gold budget covers (settled point 4). A step behind a conditional
   transition names in its `withdraw` the keys, the carried item and the `gold` of **the whole round trip to a
   bank and back**, so `reserved()` counts them and two characters never plan the same key.
3. **One trip, as much work as it carries.** A step behind a paid or keyed transition is at most what one bag
   carries (a gather, a drop), so one fare pays one trip; its fixed cost holds the transitions' seconds. A step
   whose character already stands behind the transition pays nothing to enter, but a planner's step starts with
   a bank reset: say what that means on the island, whose bank is closed until `secure_the_island`, and settle
   it so that nobody walks out and in again between two chunks for nothing (a reset that is skipped there, or a
   step compiled without one, as the tidy step is) — and say which.
4. **The gold budget is `available("gold")`**: bank gold less what the others' steps reserved less
   `GOLD_FLOOR`. A fare is refused below it; the step is then no candidate, and `waitingOf` says "gold: N short
   for the fare".
5. **A fare has a price in the score.** Gold counts as hours at `config.goldPerHour` (default 300, design D.2:
   a character-hour of fights earns about 236 gold, of tasks 124): a round trip's fares ÷ 300 are hours of the
   step and of the chain it serves. A key costs what its bill costs (`billOf`: its drop or recipe), nothing
   while the bank holds what the plan needs (the stock rule of task 012).
6. **The runner opens what the character carries.** `route()`'s `may` for a character is `FREE` plus every
   transition whose conditions it meets now: the gold in its pocket, the key or item in its bag, the
   achievements. The fare, the keys and the carried item of a trip ride the `keep` list: no bank-off, no gear
   swap, no `depositAll` banks them before the trip is over, and the pocket gold sweep leaves the fares.
   **Nobody is stranded**: a step carries its way back; a character behind a transition it cannot pay ends its
   item with one line (as a `BankFullError` does) and the planner decides again — never a pause.
7. **Bosses and raids stay out.** A place whose content is a boss keeps its `group` gate (the lich, the
   priestess, the empress, rosenblood); a raid stays out of scope. What 017 opens is the rest: say in the report
   which targets those are.
8. **An event on a tile behind a paid transition**: its members' trips carry the fares by the same rule, if it
   falls out of the same `may`. If it does not, leave `eventMembers` as it is and say so.
9. **The forward model walks the same transitions and pays the same fares.** Say how its gold moves (what it
   earns, what it pays); if it has no gold income today, the shortcut is today's bank gold plus a measured gold
   a day, named as a shortcut.
10. **`config.tolls` 0 is report 016's model whole** (no conditional transition opens, no tasks coin is spent):
    a replay row with it must end at report 016's row A, 86, to the day. It is for the replay only and not in
    the UI.
11. **Tasks coins are spent on an objective's own material.** A material the Tasks Trader sells for tasks coins
    is a `mat:` buy step with the coins from the bank, down to a floor of 50 coins (a task's cancel fee needs
    one; guess). `waitingOf` gives the honest reason ("tasks coins: N of M") where coins are short. **A gear
    piece by need with a tasks-coin material** is no longer rejected for it, by the same rule and floor, if that
    falls out of the same change; the report says what the replay then makes above combat 38. If it does not
    fall out, leave gear as it is and say why.
12. **Every unit spent is a record.** A new journal kind `spend`: who, what (`fare`, `key`, `coins`,
    `expansion`), the code and quantity, what for (the step's key, the transition). The reader prints a "Spent"
    table. `docs/journal.md` gets the kind.
13. **Riding along** (decision 44, and the journal's first hour):
    - **`tidyLeft` is true while a tidy step is in flight** (any character that is on). Today `tidyStep` gives
      nobody a step while another's runs, so during a character's last tidy step an expansion can be bought
      while the others still have codes to recycle.
    - **`statusNow()` runs inside a try**: a status that cannot be built is dropped like one that cannot be
      written.
    - **The set a `pl:` fight step wears is the step's `wear`.** `ach:the_reaper:1@First#1` (the `step` record
      of 11:45:34 UTC) planned steel battleaxe, iron shield, hard leather helmet, iron armor, hard leather pants
      and boots, two earth rings; its `end` (11:49:54) withdrew battlestaff, iron shield, hard leather helmet,
      mushmush jacket, hard leather pants and boots, a life ring and a water ring. Second wore a steel battleaxe
      on the same target at that time. And at 01:02 UTC First's reset banked the potions its step had planned
      and it already wore (report 016, note 1). Find the cause in the raw log and the code: the pool counts a
      piece it should not, or the executor solves again on another bank. Either way the plan is the one writer,
      as it is for `take` since task 014: the reset of a `pl:` step wears `wear`; a piece the bank no longer
      holds falls back to the executor's own solve with one raw line.
    - **An event trip takes what it planned** (Second's full moon trip, 01:12 UTC: 100 + 100 potions and 72
      trout planned, 54 and 9 taken, ran dry after 12 fights; report 016, note 2). Find the cause; repair it if
      it is in the member's `take` or its pool; a scenario shows the planned quantities withdrawn.
    - **No kill step for a sliver.** First ran `ach:the_reaper:1@First#1` and `#2` for one kill each (11:45 and
      11:49 UTC): 263 s and 231 s for a fight of about 40 s, 115 s and 111 s planned; Second's step held 84 of
      the minor health potions. A kill step that the stock caps below a third of its chunk is no candidate (its
      potions are a need, and supply serves it first). And the fixed seconds of a step, planned against metered:
      from the journal since 11:43 UTC, per step kind, the `end` meters' bank + walk + gear seconds against
      `stepSec`; repair the constants if they are off by more than a quarter.
    - **A tidy step's `units`** are the copies of all its codes, not of the last.
    - `.claude/skills/verify/SKILL.md` names the raw log's new place.
14. **The market read** (Alex, 2026-11-21: collect the Grand Exchange's prices into the logs, about every ten
    minutes, for an analysis in a few days).
    - A second standing poll beside `refreshEvents`: `GET /grandexchange/orders`, every page, sell and buy
      orders, every 10 minutes while the service is up. It is a public data endpoint: say in the report which
      rate bucket the docs put it in and what a poll costs in requests. More than 10 pages a poll: every 20
      minutes instead, and say so.
    - Written to `logs/market/<YYYY-MM-DD>.jsonl` through the journal's file sinks (the harness: a Map), one
      line a poll: the time, the run id, the number of orders, and per item code the lowest ask, the quantity at
      it, the whole quantity on sale and the number of sell orders, then the same four for the highest bid. The
      first line of a run and of a day is whole (`full`); a later line holds only the codes whose numbers
      changed, and a code that went. Keep a day under about 1 MB (the planning chat copies the file); say what
      a day weighs.
    - A failed poll writes nothing and breaks nothing. The planner does not read the market.
    - A reader, `npm run market -- [--from <ISO>] [--to <ISO>] [--code a,b] [--all]` (`scripts/market.mts`),
      read-only: per code over the window the lowest ask (first, last, lowest, median, highest), the quantity on
      sale and the highest bid at the end. By default the codes the planner makes or gathers for its fights:
      the potions and food of `consumables.ts` and their ingredients. Beside each, if the day's snapshot gives
      it cheaply, the fleet's own seconds a unit (the chain's) and the gold a fleet-hour of making it would
      cost at the ask.
    - `CLAUDE.md`'s "one sync, then no polling" names the second poll.
15. **Not in this task:** any purchase or sale on the Grand Exchange; buying a material for gold from an NPC
    (the report lists what would pass `gold ÷ hours ≤ goldPerHour`); group boss fights and raids; `use`
    objectives; selling or deleting bank stock; the clean-up, the Roadmap, the Lab; the replay's moves of rows
    B and C since report 014 (beyond section 6's one table); everything parked in `docs/rework.md`.

## 1. Read-only: the hours since 11:43:34 UTC on 11-21
`npm run journal -- --from 2026-11-21T11:43:00Z`, its tables as they are, and under them only what they do not
explain. **Nothing found here is fixed in this task** except what the settled points name.
- Report 016's acceptance step 8: the `boot` record and its commit, the status, the raw files, the snapshot,
  the first `end` records `partial`.
- Every `pause`, `block`, `flap`, `nostep`, `defect`, `stopped`, `server` record: a defect, or as designed.
- Craft steps of a two-a-run recipe: none pauses for one missing ingredient (016's settled point 10).
- Kill steps: `wd` planned against withdrawn, drunk and eaten; every step whose worn set differs from its
  `wear` (settled point 13); every kill step of fewer than five units.
- The bank: any tidy step, any `buy` or `bought`, any 462 and the read after it.
- What the reader could not say and the raw hour file could. What the reader should have printed and did not:
  fix the reader for it if it is a table of settled point 8 of task 016, else list it.

## 2. The transitions
- **The table**: every conditional transition and every tile with conditional access — the condition, what
  lies behind it (monsters, nodes, workshops, NPCs, events, with their levels), the open objectives and points
  behind it, where a key or the carried item comes from and what one costs (its bill), the round trip's fares,
  who of the fleet can use it today and at which level each character first can. Then: of the 73 points the
  replay leaves "behind a layer", which this task opens, which wait for a group, a raid or `use`.
- **The core**: settled points 2–5 and 7–10 — where (`path:line`), and a made-up case each in
  `scripts/check-planner.mts`: a keyed place with a key in the bank (reserved, a second character is refused
  the same key); a fare inside and outside the budget; the fare's hours in a score; a carried item; a boss
  behind a key still waiting for its group; `config.tolls` 0.
- **The runner**: settled points 3 and 6 — where, and the scenarios:
  - `transition-key` — the key is withdrawn, the transition consumes it, the work is done, the way back is
    walked;
  - `transition-toll` — the fares of the round trip are withdrawn and kept through the reset and the bank-off,
    one is paid each way, the rest of the pocket gold is banked at the end;
  - `transition-carried` — a `has_item` transition with the item in the bag, kept and banked after;
  - `transition-no-way-back` — a character behind a paid transition without the fare: the item ends with a
    line, no pause, the planner decides again;
  - `transition-refused` — bank gold at the floor: no step behind the toll is planned.
  Say what the fake had to learn.

## 3. What is spent
- The gold budget and the fare's price (settled points 4, 5): what the planner would pay for each paid
  transition today and at the levels the table names, in gold and in hours.
- Tasks coins (settled point 11): every open objective and every gear piece with a material sold for coins —
  the coins it takes, what the bank holds, what the planner does with it now; the scenario `coins-own-material`
  (the coins withdrawn, the buy at the Tasks Trader, the material banked, a `spend` record; refused at the
  floor).
- The `spend` record (settled point 12) and the reader's table.
- Read-only, for a later decision of Alex's: what an NPC sells for gold that would pass
  `gold ÷ hours ≤ goldPerHour` today, as a list.

## 4. Riding along
Settled point 13, item by item: the cause found (with the times of the records or raw lines that show it), the
repair (`path:line`), and its made-up case or scenario: `tidy-left-in-flight`, `fight-wears-plan`,
`event-trip-takes-plan`, `kill-sliver`.

## 5. The market
- From a scratch script, without the token, at most 60 requests: one full read of `GET /grandexchange/orders`
  (how many orders, how many pages, how many codes; by item type), and `GET /grandexchange/history/{code}` for
  at most 30 codes — the potions and food the fleet drinks and eats and their ingredients (algae, nettle leaf,
  sunflower, trout among them). A table: per code the lowest ask and the quantity on sale now, the trades of the
  last seven days (how many, the quantity, the median price).
- From the docs: where the Grand Exchange stands on the map, what buying takes (a character on the tile, the
  gold in its pocket), the tax on a sale.
- The poll, the file and the reader (settled point 14): where, the scenario `market-poll` (the fake answers
  the orders; a whole line, then a line with the one code that changed, then a failed poll that writes
  nothing), the reader's output on a fixture, and what a day weighs.

## 6. The replay
`npm run check -- planner`: rows A, B, C, E as before and a new row with `config.tolls` 0.
- The deadline points against report 016's 86 / 94 / 73 / 68; the new row must be 86.
- What the opened transitions pay in row A: per transition the day it is first used, the trips, the gold, the
  points; the gold in the bank over the season.
- One table from row A as it runs: **First's hours per ten days by answer** (objective, level, supply, tidy,
  fallback), and in two lines why its combat 40 comes on day 72 when the others' comes on days 36–40 (decision
  42). No extra row is run for it.

## 7. Read-only, for Alex's later decisions
- The bank's codes that are not gear (from the day's snapshot): for each, what uses it (a recipe in reach, an
  open objective, a planned consumable, an offering), and what nothing uses — with the gold an NPC on the map
  pays for it.
- The gear codes kept only by the rare-ingredient rule (`autoRecyclable`): the code, the copies, the rare
  ingredient, what a recycle would give back.

## Out of scope
Everything of settled point 15; `src/sim/*`; every UI; the hive; regenerating the atlas; moving or deleting
anything under `logs/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `017: keys and tolls` on top of `Rework
   notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why
   the push failed); `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → the 80 checks of report 016 plus the new scenarios, all ok except `repeat-spin`; exit 0;
   nothing new under `logs/` from it.
3. `npm run check -- planner` → ends with `OK (…)` inside the 2,700 s backstop, with the deadline points of the
   rows and the `config.tolls` 0 row at 86. If a row moved, the report says which change did it.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. `npm run market -- --file <the fixture>` prints the table of section 5.
8. **After the restart** (the planning chat says when): `logs/market/<today>.jsonl` gets a whole line at boot
   and a line about every ten minutes; `npm run journal` prints a "Spent" table (empty until something is
   spent); no kill step of one unit while its potions are held by another step; a `pl:` fight step's `end`
   withdraws the pieces of its `wear`.

## Report
`tasks/017-keys-and-tolls.report.md`, with these sections in this order:
- **Summary** — 5–9 lines: what the journal shows since 11:43 UTC; which transitions are open now, to whom, and
  what they cost; what is spent and under which limits; the deadline numbers against 86 / 94 / 73 / 68 and the
  `tolls` 0 row; the riding-along repairs in a line each; what the market read found today.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The hours since 11:43** — section 1.
- **The transitions** — section 2.
- **What is spent** — section 3.
- **Riding along** — section 4.
- **The market** — section 5.
- **The replay** — section 6.
- **For Alex's later decisions** — section 7.
- **What was done / files** — per section and settled point: what, where (`path:line`); every command run;
  every request sent to the game.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
