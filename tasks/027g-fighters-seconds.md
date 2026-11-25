# 027g — The fighter's seconds: the workers hunt the materials, the fighters eat what the bank holds

Read first: `src/plan/planner/decide.ts` (the header; `fighterHunts` and the supply loop around it; the fighter's
order near the end), `src/plan/planner/consumables.ts` (`reservable`, `fightTake`'s food, `restWhy`, work (a)'s food
need, `potionPrice`), `tasks/027e-level-first.report.md` (the roads; where a fighter's seconds go; invariant 3).

## Where this starts
On top of `027f: the train item's loop` (`2d1dfa8`); the live service runs it (run `0n77`, since 09:42:41 UTC on
11-25). The working tree holds two changes from the planning chat and nothing else: `docs/rework.md` (edited) and this
file. If anything else is uncommitted, say so and stop.

**What is.** Level first (027e) barely moved the fighters: 39/33/39 on day 14, 45 on season days 63–66 where the
leaders stood there on days 30–32.
- **They hunt materials.** 027e's road: the XP pick 387 h, a need's kills 2,037 h. In play on 11-25, 00:00–09:18 UTC:
  First 4.7 h on `src:` kills and 4.1 h on the pick, Fifth the same. `decide.ts`: a `src:` kill goes to a fighter
  whenever a fighter that is on is admitted (`fighterHunts`), and a fighter takes it before its pick (order 3).
- **They rest.** The same hours: First fights 3.09 h and rests 4.92 h, Fifth 3.10 h and 5.00 h; on the Vampire the
  rest is 63–66% of the step's seconds.
- **The food is in the bank.** Third cooked 984 Cooked Trout (done 08:02 UTC, for `cons:cooked_trout:ach:the_reaper:2`)
  and banked them. First's step of 08:42 and Fifth's of 09:18 still say "rests (Cooked Trout is needed for …'s road to
  combat 50, not in the bank yet)". `reservable` holds a food back for every work that scores better, and the_reaper
  (Death Knight kills, taken three at a time for its potions) scores better than a level.
- **Trout is a by-product.** Third's algae step at the Trout Spot gives 186 trout and about 20 algae per 186 gathers
  (1.5 h), and about 4,400 gathers are still asked. The hunts bank raw meat as well.

**Alex (2026-11-25):** the workers hunt the materials (agreed, at the price of their craft hours); nothing is kept in
the bank for a later fight — whoever fights eats. Small and direct: two orders of existing candidates and one switch.

## A. A need's kill is a worker's
1. **What comes along with the pick stays a fighter's.** The monster of a road need's `src:` kill joins the pick's
   `bonus` (as an open objective's monster and the held task's do): within 25% of the pick's rate the fighter fights
   it and the drops come along. No new term.
2. Any other `src:` kill goes to a worker that is on and admitted for the fight (the usual floor); among several,
   today's choice. A fighter takes it only when no worker that is on is admitted — then before its pick, as today.
3. 027d's coins stay a fighter's work. A worker's hunt wears, drinks and eats as any fight step does.
4. Say in the report which monsters of today's needs no worker is admitted for (they stay with the fighters), and
   which needs the fighters' picks cover by themselves.

## B. Food
1. **Read-only first, five lines**: what the live rule does with the 984 trout (which needs hold how many, what the
   pick's step may take), and what Third's next steps are under `2d1dfa8` (does it fish for the road's food?).
2. **No food is held.** A fight step may take any food the character may plan with: `reservable` holds back nothing of
   a food, for no work and no event. Potions keep today's rule.
3. **A fight eats when eating is faster than resting in the fighter's own seconds** (the use against the rest) and the
   bank holds the food — whatever the step is for. The chain's price does not enter the choice of eating what is
   already cooked; it only prices making more.
4. **The cook cooks what the bank holds raw.** The road's food need is a first-tier need of the cook for the raw
   food the bank holds beyond other needs (the by-products: trout of the algae step, the hunts' meat). No gather or
   kill step is opened for food alone — behind one named switch, `FOOD_FISHING`, off; on, today's chain.
5. `restWhy` says what is: none in the bank (and whether raw waits for the cook), or eating is not faster.

## C. Invariant 3 (older than 027d; report 027e)
The take carries every potion its set names (the orc: 100% solved, 69.5% as worn), and the solve reads the worn
pinned artifacts (the Sandwarden: 76% against 47% with the Novice Guide). `npm run check -- planner` passes
invariant 3. If this needs more than the take and the solve's inputs, say so and leave it.

## D. Read-only: the board's first day (`docs/strategy/board/2026-11-25.md`, by 027b's reader, extended)
From `logs/board/`, every full read from 11-24 12:00 UTC to the newest, all 50 accounts. The planning chat read 17
of them by hand over 20 h (to 11-25 08:00 UTC): First and Fifth were 4th and 6th of 85 characters by combat XP an
hour (1,623 and 1,562; the best 2,172); 26 of 85 carried cooked food and 10 a potion in a utility slot (two of them
this fleet's workers); the fleets at combat 38–44 hold their gear crafts at 30–40, mostly 3–9 levels under their
top combat (this fleet: 22 / 25 / 23 under 27). Confirm or correct on the whole base:
1. Combat XP an hour between the first and the last read for every character, by level band (20–29, 30–34, 35–39,
   40+): the median, the top quarter, the best ten with what they wear, eat and fight (the drops in the bag, the
   task, the place). This fleet's five in the same table.
2. Food and potions: how many characters carry cooked food, which, how much; how many wear a potion in a utility
   slot, which; the same for the best quarter by XP an hour.
3. The gear crafts against the top combat level, an account a row (the 50), and each craft's XP over the period;
   how many levels a day the crafts of the accounts at combat 28–36 gain.
4. Where the hours go, an account a row: XP in combat, gathering, the gear crafts, cooking, alchemy over the period.
5. Five lines: what the fleets that level fastest do that this one does not.

## E. Proof
1. Checks, red first on the starting tree:
   - a `src:` kill of a monster within 25% of the pick's rate → the fighter's pick is that monster; another `src:`
     kill with an admitted worker on → the worker's, and the fighter takes its pick; no admitted worker → the
     fighter's, before its pick; the coins stay the fighter's;
   - the bank holds a cooked food that a better-scoring work's need also asks → the pick's step withdraws it and
     plans eating; a potion under an event's reserve is still held;
   - raw food in the bank, none cooked → the cook's first-tier step; no raw → no gather step for food with the
     switch off, today's chain with it on;
   - a fight where resting is faster → rests, and the why says so;
   - C's two cases.
2. A scenario on the fake: a fighter's level step with food in the bank eats between fights and does not rest
   (red today if the food is asked by a better-scoring need).
3. Three roads from the newest daily World in `logs/world/`, side by side: the starting tree, the final one, the final
   one with `FOOD_FISHING` on. One table: the five combat levels on days 3, 7, 14, 21, 28, 42 and at the deadline; the
   day each fighter reaches 30, 35, 40, 45, 50; the three gear crafts on those days and the day each reaches 30 and
   35; points on those days; a
   fighter's hours by kind (the pick, a need's kill, objective kills, forging, the free pass, the fallback) and its
   seconds a win split into fight, rest and eating; a worker's hours by kind (a need's kills, cooking, fishing for
   food, the gear crafts' training, an objective's needs, the rest). No tuning after the table.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, `npm run check -- planner` once.
5. `CLAUDE.md`: the roles' and the consumables' paragraphs follow A and B. Commit `docs/rework.md` as `Rework notes`
   if it differs from `HEAD`, then everything else as `027g: the fighter's seconds`; push to `origin/rework`. If the
   push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game.
- No new dependencies. Do not edit `docs/rework.md`.
- No new scoring term; one new constant (`FOOD_FISHING`). If A or B needs more, say so and stop.
- It is committed whatever the roads say (Alex: the levels first, the points second).
- The machine is strong: run the three roads and the gate side by side.
- Everything you write is in English.

## Report
`tasks/027g-fighters-seconds.report.md`, **at most about 110 lines**: Summary · Decisions for Alex · How Alex verifies ·
The roads (the one table) · Food as it was (B.1) · The board's day (D, its five lines; the tables are in the doc) · What was done / files · Notes. The combat
levels first, the points second. Say first in the Summary whether the fighters are higher on days 7 and 14 than on
the starting tree, and whether `FOOD_FISHING` on is worth its worker hours. No placeholders left in it.
