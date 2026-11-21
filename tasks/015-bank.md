# 015 — The bank: a full bank is answered, outdated gear is recycled, a slot is bought; two food repairs

## Goal
The bank stood at **102 of 110 slots** at 23:32:55 UTC on 2026-11-20 (three expansions bought, the next costs
28,000 gold, 231,984 gold in the bank). A slot is one item code, whatever the quantity. About 45 of the 102 codes
are gear, much of it level 1–10 pieces nobody wears (the fleet is at combat 22–25 in adventurer and steel sets),
and report 014's plan adds codes of its own: every potion, every cooked food, nettle.

**Nobody answers a full bank.** `src/api/client.ts:127` retries 499 and 461 only. A deposit of a code the bank
does not hold yet answers 462 when no slot is free; `depositAll` (`src/state/loopkit.ts:147-155`), `bankOff`
(`src/state/exec.ts:57-66`), the gear swap's deposit (`exec.ts:215`), the `deposit-all` item
(`src/state/queue.ts:502-506`) and the claim's deposit (`queue.ts:580`) pass it on as an error; `runLoop` pauses the
queue (`queue.ts:1577-1600`), the planner calls `next(name, head.error)` (`src/state/planner.ts:361`) and blocks the
step's target for 6 hours (`blockStep`, `:277-291`). The next step's bank reset meets the same bank. So the
targets are blocked one after another, for all five. Not seen in play yet.

This task makes the bank the planner's business: a 462 is an answer, not an error; outdated gear is recycled
before a slot runs short; an expansion is bought under a price cap when recycling has nothing left. Riding along
(decision 40 of `docs/rework.md`): two food defects of report 014, a sell rule that takes sap from under the
recipes, room for the replay check, and the branch `rework`.

The service was restarted at **23:32:54.550 UTC on 2026-11-20** (run `[tdhi]`, report 014's code `edaaf23`); the
five steps re-attached (`lvl:mining:35` for First, Fourth and Fifth, `ach:intermediate_lumberjack:0` for Second,
`lvl:alchemy:30` for Third). `[wj59]` (013's code) wrote its last line at 23:32:31.965.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 36–41; "Known and parked", the blocks of reports 012–014);
report 014 (Summary, "The executor", Notes); the game's docs on the bank, bank expansions, recycling and the
`use` action in `docs/` (`docs/api/openapi.json`, `docs/game-actions.md`: `buyExpansion`, `recycle`);
`src/api/client.ts`; `src/state/loopkit.ts`, `src/state/exec.ts`, `src/state/queue.ts` (the `deposit-all`,
`recycle`, `withdraw`, `buy`, `claim`, `gear` and `fight` cases; `runLoop`'s error path), `src/state/planner.ts`,
`src/state/eventorders.ts`, `src/state/store.ts` (`bankDetails`, `bankItems`); `src/plan/events.ts`
(`SELL_FLOORS`, `GOLD_FLOOR`, `merchantOrder`), `src/plan/xp.ts` (`autoRecyclable`, `recycleReturn`),
`src/plan/jobgear.ts`, `src/plan/consumables.ts`, `src/plan/bis.ts`; `src/plan/planner/*` (all of it; `stock.ts`,
`supply.ts`, `decide.ts`, `consumables.ts`, `reach.ts`, `gear.ts`, `compile.ts`, `forward.ts` closely);
`scripts/check.mts`, `scripts/check-planner.mts`, `scripts/harness/*`, the scenarios `consumables-*` and
`planner-*`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to
  `logs/dev.log`. **Reading `logs/dev.log` is part of the task** (section 1): read it as a stream, don't copy it
  into the project.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Alex restarts only when the
  report exists. Write the report last, after the gate is green and the task commit is made; don't wait for more
  log after that. If the log shows a restart during your work, say in the Summary what code it loaded.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **What may change:** `src/state/loopkit.ts`, `src/state/exec.ts` and `src/state/queue.ts` for a 462 at a
  deposit, the `expand` item (settled point 5) and the reset's food cap (settled point 7); `src/plan/queue.ts` for
  that item kind; `src/state/planner.ts` (the World's bank, the bank interrupt, the tidy step, the log lines);
  `src/state/store.ts` only if the bank's details need a read after a purchase; `src/state/eventorders.ts` and
  `src/plan/events.ts` for the sell rule (settled point 6); `src/plan/planner/*` (a new `bank.ts` there if it
  helps); `src/plan/jobgear.ts` only if the tidy rule needs what a solve picks; `scripts/check.mts` (the
  backstop), `scripts/check-planner.mts`, new scenarios with what the harness and the fake need for them;
  `CLAUDE.md` (the planner's section; the bank), `docs/game-actions.md` (who calls `buyExpansion`). **Not**
  `src/sim/*`, not the UI (one exception: an activity-log line is not UI), not the hive.
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about the log give the UTC time of a line.
- **Nothing is sold and nothing is bought in this task except a bank expansion** under settled point 5.
- The executor has a history of bank livelocks. Every change to what a deposit, a reset or a bank-off does gets a
  scenario that runs the step twice in a row and shows no bounce.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-015-dist --emptyOutDir` (never the project's `dist/`).
- **The branch and the commits** (decision 38; never `main`):
  1. First: `git switch -c rework` (from `main`'s HEAD, `edaaf23`). `docs/rework.md` was changed by the planning
     chat and is uncommitted: commit it, as it is, on its own: `Rework notes`. Then
     `git push -u origin rework`. If the push fails (the remote is `git@github.com-personal:alver/…`, an SSH
     alias), don't retry in a loop and don't change the remote: go on with the task and say so under "How Alex
     verifies".
  2. If `docs/rework.md` changed again by the end, commit it again the same way before the task commit.
  3. At the end, `015: bank`: this task file, the report and what the task changed. Then `git push`.
  Nothing is pushed to `main`, and `main` is not moved.

## What is settled
1. **A 462 is "the bank has no slot for this code".** It is never retried, never pauses a queue and never blocks
   a target. A deposit that meets it banks what the bank already holds a stack of (a stack needs no slot) and
   keeps the rest in the bag; the item goes on. This is an executor repair: it holds for every character, as the
   598 does. For a character the planner owns, the planner hears of it at once (the code, the time) and answers
   by settled points 3–5; a step is not blocked for it.
2. **Free slots are a fact of the World**: the bank's slots (`bankDetails.slots`), the distinct codes it holds,
   the next expansion's price. The forward model has no slots (the replay prints what the season would need,
   section 2); tidying and expansions never fire there.
3. **Outdated gear is recycled, a code at a time.** A slot is freed only when a code is gone whole, so a tidy
   takes every copy of a code. A gear code in the bank (an item that goes into a weapon, shield, helmet, body,
   legs, boots, ring or amulet slot, tools included; never an artifact, a rune, a bag or a utility) is
   **outdated** when all of this holds:
   - it has a recipe and somebody that is on may recycle it (the lane's crafter first: `mayCraft`);
   - its level is at least ten below the lowest combat level of the characters that are on;
   - nobody wears it, no running step's `wear` names it, and no solve the planner makes today picks it: each
     character's XP pick, the monsters of the open kill objectives, of the open `src:` kills and of the events
     it could be a member of, and the tool of each gathering lane it works;
   - no recipe uses it, no open objective's inputs and no open bill ask for it;
   - what comes back are codes the bank already holds, or the tidy still frees a slot net.
   Alex (2026-11-20): outdated gear is recycled, "definitely"; if a piece is ever wanted again it is made again.
   A piece that cannot be recycled (no recipe) stays; it is printed. Nothing but gear is tidied here.
4. **The tidy is a planned step**, by a character that may recycle the code, compiled to today's items (a craft
   job's reset, the `recycle` item, `deposit-all`), with the copies reserved like any withdrawal and a why that
   says what it frees ("Copper Helmet ×11 recycled: frees 1 bank slot (9 free of 110), 22 Copper Bar back").
   **It goes before any other step while fewer than 15 slots are free** (`TIDY_BELOW`), for one character at a
   time; with 15 or more free nothing is tidied. Several codes of one workshop may share a step if its four
   items hold them. What is recycled counts for the recycling achievement like any recycle.
5. **Then a slot is bought.** With fewer than 10 slots free (`EXPAND_BELOW`) and nothing left to tidy, the
   planner buys one expansion: an interrupt of its own class for the owned character with the shortest walk to
   a bank, a new queue item kind `expand` (walk to the bank, have the price where the game takes it from — the
   docs say which gold — and call `buyExpansion`), one at a time. **Only when the next price is at most 60,000
   gold** (`EXPANSION_CAP`; Alex's number of 2026-11-20, his to move: a planner config number, not in the UI)
   **and the bank keeps the gold floor** (`GOLD_FLOOR`, 20,000) after it. Otherwise it is not bought: one
   `plan: bank` line and one activity-log line a day say so with the price. Every purchase writes a line with
   the price paid, the slots before and after and the next price.
   - With no slot free, nothing to tidy and no purchase possible: a step whose product would be a code the bank
     does not hold is no candidate; the planner says once an hour what is stuck; nobody is paused.
6. **Nothing a recipe can use is sold, and a sell floor is not a planning floor.** `SELL_FLOORS`
   (`src/plan/events.ts:17`) lets the merchant's standing order sell every sap above 300 and every shell above 50
   (`merchantOrder`, `:56-66`); the bank holds 575 sap, and sap is a potion ingredient (Alex, 2026-11-20). And
   `stock.ts floor` (`:16`) takes the same numbers off what a step may plan with (`available`, `:43-46`). From
   now on the standing order sells no code that any recipe uses, and `floor` is the gold floor alone. What is
   sold at all is decided with "what is spent" (task 017).
7. **Planned food fits the bag and fits the fight** (decision 40; both in the plan and in the executor):
   - *The bag.* `fightTake` (`src/plan/planner/consumables.ts:459-465`) plans `ceil(units a kill × kills × 1.2)`
     and the reset withdraws until the bag is full (`src/state/queue.ts:519-528`); the old path capped a restock
     at a third of the bag (`src/plan/consumables.ts foodQuantity`, `:184-188`). A bag is 100 + 2 a level (144
     at combat 23). A plan above the bag fills it whole, `fightRound` calls `bankOff` with the food protected,
     and it throws "inventory full of protected working stock" (`exec.ts:62`): the step does nothing and its
     target is blocked for 6 hours. Now: a step's planned food is at most a third of its character's bag, its
     kills are capped by that as they are by a potion stack, and the reset never takes more than that whatever
     the item says.
   - *The fight.* `poolFood` (`consumables.ts:75-80`) returns the best-healing food with any stock, and
     `fightTake` takes `floor(lost ÷ heal)` units a kill: with 4 cooked trout (225 HP) in the bank, as today, a
     fight that loses 184 plans no food and rests, whatever lesser food the cook banked for it. Now: the food in
     the plan of a fight is the best-healing food in the reservable stock that the fight's loss covers at least
     once; the price and the need read the same food.
8. **The replay check gets room.** It ran 1,716 s of its 1,800 s backstop (`scripts/check.mts:18`; rows side by
   side, row D 1,689 s, row A 1,539 s). The named check's backstop becomes 2,700 s; rows D (a win is enough) and
   F (alchemy for all) run only with `AMMO_PLANNER_ROWS=all`; the default rows are A, B, C and E.
9. **Not in this task:** selling or buying anything else; the Grand Exchange; non-gear stock nobody asks for
   (240 air boost potions, section 2 prints the list); bank slots in the forward model; a fight step or a trip
   that carries more than a stack of a potion; the trip's stack against the forward model's event hours; the
   journal (016); keys, tolls and what is spent (017); everything parked in `docs/rework.md`.

## 1. Read-only: the hours since 13:00 UTC on 11-20, and report 014 in play
From `2026-11-20T13:00:14Z` (where report 014 stopped) to the end of `logs/dev.log`; name every restart inside
(run id, time, what re-attached; `[tdhi]` at 23:32:54.550 UTC is report 014's code). The same reader and caps as
report 014; **nothing found here is fixed in this task** except what the settled points name.
- Per character, the steps in order (time, key, answer, units planned and done, hours planned and taken; a
  `supply` step's parent), every sample against its estimate, achievements completed with the time.
- Every `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`, every lost fight:
  a defect, or as designed. Among them `src:ogre_skin@Fifth`, blocked for "lost 2 fights in a row" at about
  22:41 UTC on 11-20 (013's code): how the hunt went, what was worn and drunk, and what the record of
  `src/sim/validate.ts` says (the chat saw fights lost with 1–5 potions drunk against 8–9 predicted: a stack that
  ran out inside the fight).
- **Report 014's acceptance step 7, from the first decision after 23:32:54 UTC**: every kill step's `plan` line
  with the potions and food it names, and the reset's withdrawals beside it; any `restock`, `craft` or `gather`
  of a consumable inside an owned character's fight item; every `mat:` and `src:` line for a consumable with the
  work it names; every "ran dry" line and what followed. **The two defects of settled point 7**: any "inventory
  full of protected working stock"; per fight step, fights that ate against fights that rested, with the cooked
  food the log shows going into and out of the bank.
- Every 462 in the whole log. Every `plan: event` line since 13:00 and the spawn ratio now, beside 1.61.
- Where the time goes, per character, as report 014 had it.
- In at most six lines: what the log says that this task's rules must not get wrong.

## 2. The bank today, and what the season needs
Printed by `scripts/check-planner.mts`; no engine code changes in this section. The bank of 23:32:55 UTC on
11-20, read by the planning chat from the service's state (make it a fixture under `scripts/`):

```
adventurer_boots:2, air_and_water_amulet:5, air_boost_potion:240, air_ring:5, algae:1843, altar_doll:2, apple:597,
ash_wood:123, birch_wood:2191, blue_slimeball:23, coal:6389, cooked_trout:4, copper_armor:9, copper_axe:9,
copper_bar:47, copper_boots:5, copper_dagger:5, copper_helmet:11, copper_legs_armor:5, copper_ore:5881,
copper_pickaxe:5, copper_ring:15, cowhide:47, diamond_stone:51, earth_ring:5, emerald_stone:355, feather:30,
feather_coat:5, fire_ring:5, fire_staff:1, fishing_net:5, flying_wing:13, forest_ring:23, forest_staff:10,
greater_wooden_staff:5, green_cloth:55, green_slimeball:15, hard_leather:6, hard_leather_helmet:3,
hard_leather_pants:3, hardwood_plank:26, highwayman_dagger:4, iron_armor:8, iron_axe:4, iron_bar:7, iron_boots:4,
iron_dagger:16, iron_legs_armor:5, iron_pickaxe:2, iron_ring:8, iron_shield:5, iron_sword:5, leather_boots:24,
leather_hat:5, leather_legs_armor:16, lich_tomb_key:23, life_amulet:10, life_ring:1, lucky_wizard_hat:5,
magical_cure:11, milk_bucket:337, mushmush_bow:5, mushmush_jacket:3, mushroom:13, mushstaff:5, nettle_leaf:145,
pig_skin:141, prime_fabric:3, raw_beef:135, raw_chicken:451, ring_of_the_adept:4, ruby_stone:349, sap:575,
sapphire_stone:337, shell:52, shrimp:139, skeleton_armor:1, skeleton_bone:74, skeleton_pants:2, skeleton_skull:73,
small_bag_of_gold:2, small_health_potion:1, snake_hide:85, snakeskin:12, spruce_fishing_rod:5, spruce_wood:852,
steel_bar:141, steel_battleaxe:2, sticky_dagger:8, tasks_coin:584, topaz_stone:332, trout:142, vampire_blood:8,
vampire_tooth:9, vermin_leather:10, water_bow:2, water_ring:5, wolf_bone:119, wolf_hair:71, wooden_shield:5,
wooden_staff:2, wool:2
```
Slots 110, expansions 3, the next 28,000 gold, bank gold 231,984. Levels then: combat 23 / 25 / 22 / 23 / 23;
worn: iron pickaxes (First, Fourth, Fifth), an iron axe (Second), wolf ears, adventurer vests and pants, hard
leather and adventurer boots, life, steel and adept rings, wisdom amulets, novice guides, altar dolls.
- **The slots by kind**: gear, tools, materials, ingredients and consumables, drops, currencies and keys, the
  rest; and the codes no recipe, no open objective and no solve asks for (a list for 017; nothing is done with
  it).
- **Every gear code**: its level and slot, the copies in the bank and worn, the verdict of settled point 3 with
  the clause that decided it (outdated; or kept: worn, in a solve — which one —, an ingredient, an open bill,
  the level margin, not recyclable), what comes back and who recycles it. The slots the tidy frees today, and
  the seconds it takes.
- **The price ladder**: the docs' rule for an expansion's price if they give one, checked against "three
  bought, the next 28,000"; else say that only the live price is known. What 60,000 buys by that rule.
- **What the season needs**: on rows A and C, the distinct codes the forward model's bank holds on days 7, 14,
  30 and 60 and at the deadline, and the most it ever holds — with and without the tidy rule applied to that
  bank. In at most six lines: how many expansions the season takes, what they cost by the ladder, and where
  Alex's cap bites.

## 3. A full bank is answered
- **The deposit** (settled point 1): the one function a deposit goes through and each caller with `path:line`
  (`depositAll`, `bankOff`, the gear swap, `deposit-all`, the claim, the reset's stash); what it does on a 462
  (which codes go, which stay, what the item does next), how the planner hears of it, and why no path can
  bounce between the bank and a tile for it. What `bankOff` does with a bag that is full of codes the bank
  cannot take.
- **The World** (settled point 2): where the slots, the codes and the next price live, and what reads them.
- **The tidy** (settled points 3, 4): where the rule lives, the candidate's place in `rank()`, the step and its
  items, the reservation, the why; what the others' pools see while it runs.
- **The expansion** (settled point 5): the interrupt's class and its place in the class order, the `expand`
  item, where the gold comes from by the docs, the cap and the floor, the lines written; what happens to the
  details of the bank after the purchase (a read, or the answer's own echo).
- **No slot, no tidy, no gold**: the candidates that leave, the hourly line.
- Made-up cases in `scripts/check-planner.mts`: the bank of section 2 with 8 free — the first decision of a
  crafter is a tidy step, of a character that may recycle nothing an ordinary step; 15 free — no tidy; a code
  worn by one character — kept; a code a solve picks — kept, with the solve named; a code a recipe uses — kept;
  nothing to tidy, 8 free, the next price 28,000 — an expansion is asked for; the price 70,000 — none, with the
  line; gold at 40,000 — none (the floor); no slot free and nothing possible — a step that would bank a new code
  is no candidate.
- **Scenarios**: `bank-full-deposit` (a bag with one code the bank holds and one it does not, no slot free: the
  first is banked, the second stays, nothing pauses, nothing is blocked; twice in a row, no bounce);
  `bank-tidy` (12 free, outdated copper gear: the tidy step recycles a code whole, the slot is free, the bars
  are banked, the next decision is ordinary once 15 are free); `bank-expand` (8 free, nothing to tidy: the
  interrupt buys, slots +20, the lines; then the same at a price above the cap: nothing bought, one line);
  `bank-full-stuck` (no slot, nothing to tidy, no gold: the planner works on with what the bank holds, says so,
  nobody paused); `bank-not-owned` (a character the planner does not own meets a 462: what fits is banked, the
  rest stays, its item goes on). Say what the fake and the harness had to learn (slots, 462, `buy_expansion`,
  what a recycle gives back).

## 4. The sell rule
Settled point 6: `merchantOrder`'s sell list and `stock.ts floor`, each with `path:line` before and after; what
of today's bank the Timber Merchant would have been sold (275 sap) and is not; what the bills gain (300 sap, 50
shells). Scenario `merchant-keeps-sap` (a Timber Merchant spawn with 575 sap in the bank: no `sell` item for
sap). Say which other codes left the sell list by the rule and which stayed.

## 5. The two food repairs
Settled point 7: the cap in `fightTake` and in the reset, with what a step's why says when the bag caps its
kills; the food that fits, in `poolFood`'s callers (`consPrice`, `fightTake`, `useOf`, the needs) and in what
the fight eats. Made-up cases: 400 cooked chicken (80 HP) and 4 cooked trout (225) in the bank, a fight that
loses 184 — chicken ×2 a kill is planned, the kills capped by a third of the bag; a fight that loses 300 — trout
while it lasts. **Scenarios**: `consumables-food-bag` (a plan that would ask for 300 units: the reset takes a
third of the bag, the fights eat, no "protected working stock", the next reset banks what is left; twice in a
row, no bounce); `consumables-food-fits` (the made-up case in play: the fights eat chicken, nobody rests with
food that fits in the bank).

## 6. The replay
Rows A, B, C, E by default (settled point 8); D and F with `AMMO_PLANNER_ROWS=all`, run once for this report.
- The forward model has no slots: sections 3 and 4's tidy and expansion must not show in any row. The sell
  floor's end (300 sap and 50 shells more to plan with) and the food repairs may move rows. **Row C** is report
  013's model whole and ended at 77: if it moves, run it once with the old floor (a scratch flag, not kept) and
  say which change moved it and by how much.
- Per row, as report 014: the points on days 7, 14, 30, 60 and at the deadline; the day each fighter reaches
  combat 25 / 30 / 35 / 40; the hours by answer with the consumable hours as their own lines; fights that ate
  against fights that rested (new); the steps whose kills the bag capped (new).
- A against report 014's A (87; 35 / 41 / 51 / 74) on the same days. In at most six lines: what the food
  repairs changed.

## Out of scope
Everything of settled point 9; any sale; any purchase but an expansion; `src/sim/*`; the Roadmap, the outlook
and every UI; deleting anything of the hive or of a non-owned character's paths beyond the deposit of settled
point 1; regenerating the atlas; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `015: bank` on top of `Rework notes`;
   `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why the push
   failed); `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → the 66 checks of report 014 plus the new scenarios, all ok except `repeat-spin`; exit 0.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points a / b / c / e)`
   for the rows A default / B consumables free / C report 013's model / E no events, inside the 2,700 s
   backstop, and prints the tables of sections 2–6.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. **After the restart** (the planning chat says when): a `plan: bank` line with the slots (about 102 of 110);
   tidy steps for the outdated gear, each naming the slot it frees, until 15 are free; no expansion bought while
   something can be tidied; no `sell` of sap at a merchant; a kill step's food at most a third of the bag; no
   "inventory full of protected working stock".

## Report
`tasks/015-bank.report.md`, with these sections in this order:
- **Summary** — 4–8 lines: where the fleet's time went since 13:00 UTC on 11-20 and whether report 014 holds in
  play; what the tidy frees today; the deadline numbers against report 014's 87 / 94 / 77 / 68; then the last
  points of sections 2 and 6.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The hours, and 014 in play** — section 1.
- **The bank today** — section 2.
- **A full bank is answered** — section 3.
- **The sell rule** — section 4.
- **The food repairs** — section 5.
- **The replay** — section 6.
- **What was done / files** — per section 3–6: what, where (`path:line`); every command run.
- **Notes** — defects noticed and not touched; guesses in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
