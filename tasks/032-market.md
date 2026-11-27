# 032 — The market: a need may be bought, carefully

Read first: `CLAUDE.md` ("The second standing poll: the market read"; "Keys, tolls and what is spent" — `available("gold")`,
`GOLD_FLOOR`, `config.goldPerHour`, `tradeOf`, the `spend` record; "The healing rune" — `runePays`, `runeCheck`),
`src/state/market.ts`, `src/plan/planner/supply.ts`, `gear.ts` (`candidatesOf`, `billOf`), `decide.ts` (`ORDER`),
`docs/api/openapi.json` (`/grandexchange/orders`, `/grandexchange/orders/{id}`, `/grandexchange/history/{code}`,
`/my/{name}/action/grandexchange/buy`), `docs/rework.md` decision 82 ("Gold and the Grand Exchange").

## Where this starts
On top of 031b's last commit (`031b: report`, or `031b: the kitchen is on` if no second commit was made), the top of
`origin/rework`. If 031b is not there, say so and stop. The working tree holds at most two changes from the planning
chat (`docs/rework.md`, this file); anything else uncommitted: say so and stop. The live service runs 031b or `fd8b44c`.

**What is.**
- **Gold lies idle.** The bank: 101,962 gold at 11:23 UTC on 11-26, 127,544 at 07:55 UTC on 11-27 — about 30,000 a day,
  1,250 an hour for five characters. Nothing spends it: an expansion's cap is 60,000 and the next one costs 112,000.
- **The market sells what the road waits for.** The 07:55 UTC read of 11-27 (lowest ask, units at it / on sale):
  `elderwood_staff` 1,498 (1 / 6), `perfect_bow` 1,750 (2 / 2), `death_knight_sword` 2,979 (3 / 19),
  `royal_skeleton_armor` 2,049 (2 / 4), `royal_skeleton_pants` 1,800 (1 / 1), `royal_skeleton_ring` 1,578 (2 / 20),
  `gold_ring` 1,199 (3 / 12), `steel_bar` 250 (91 / 397), `mithril_bar` 570 (10 / 100), `diamond` 45,000 (2 / 2).
  The fighters at combat 31 wear a Battlestaff (20), skeleton armour (20) and an iron shield (10); 031's roads make the
  first level-30 weapon on days 4–9 and no level-35 weapon at all (each asks a Diamond, chains of 500–680 h).
- **Nothing reads it.** `market.ts` sums the orders into `logs/market/` (since 11-21); the planner does not see them.
- **A buy names its order**: `POST …/grandexchange/buy` takes an order's id and a quantity (≤ 100) at that order's price.

**Alex (2026-11-27):** let us try the market — the leaders will be putting what we need there. **Be careful with prices.**

## A. Read-only first: the first shopping list (into the report, before anything is built)
For today's live World (the newest `logs/world/` file) and the newest whole line of `logs/market/`: every need of today's
plan — a gear piece of the fighters' road or a tool (`gear:`), and the materials their bills and the training batches are
short of — that has a sell order. One table, at most 25 rows, the largest gain first: code · for what · ask × units at
it (sellers) · the reference price (B.3: n trades and their median, or the asks' median) · gold ÷ `goldPerHour` + the
trip, in hours · the hours the planner's own chain gives for the same units · the verdict by B's rules (buy, or the
first rule that refuses). Allowed for this: one read of `/grandexchange/orders` and at most 60 reads of
`/grandexchange/history/{code}` (public data endpoints, no token).

## B. The market as one more source of a need
One named switch: `config.market.day`, the gold a UTC day (default `MARKET_DAY_GOLD` 25,000; 0 = nothing is bought).
1. **Only a need, only its shortfall.** A purchase is a source for a `gear:` or `mat:` / `src:` target the plan already
   holds as a need (first-tier or an objective's), for the units it is short of — one copy of a piece a wearer. Never a
   potion, food or their ingredients; nothing for stock; nothing is sold and no buy order is placed.
2. **It must pay in hours.** Gold costs hours at `config.goldPerHour`. A purchase is taken when gold ÷ `goldPerHour` plus
   the trip (bank → the Grand Exchange → bank) is at most **half** the hours the planner's own price gives the same units
   (the remaining chain as `billOf` / `chainSec` price it today; a level road stays left out, as today).
3. **It must be a fair price.** The reference price of a code: the median unit price of its trades of the last 7 days
   (`/grandexchange/history/{code}`, read at most once an hour a code and only for a code that passed 1 and 2); with no
   trade — the median of its lowest ask over the last 72 h of `logs/market/`, if the code has been on sale for 24 h or
   more; else there is none. A purchase is taken only at an ask ≤ 1.25 × the reference; no reference: not bought.
4. **It must fit the purse.** One purchase (a piece, or a step's batch of a material) costs at most `config.market.piece`
   (default `MARKET_PIECE_GOLD` 10,000); the day's purchases at most `config.market.day`; the bank's gold after it covers
   what `runePays` already asks (the floor, the fares, a due expansion). A need that passes 1–3 and fails only here is
   **wanted**: said once in the journal and listed in the status (code, ask, the hours it would save), never bought.
5. **The step.** A worker's buy step, as the Tasks Trader's `mat:` buy is one (never a fighter's while a worker is on):
   it reserves and withdraws exactly price × quantity, goes to the Grand Exchange, **reads the order again by its id**,
   buys that order only if its price is the planned one and it still holds the units (fewer: what it holds), and brings
   the goods and any gold left back to the bank. 404, 434, 435, 436 or another price: nothing is bought, the need stays,
   no other order is tried in that step. Every purchase is a `spend` record (`what: "market"`, code, units, unit price,
   the reference, the order's id).
6. **Where it lives.** The service keeps the last read's sell orders (id, code, price, quantity, account) and hands them
   to the runtime's World as `world.market`, with the references it has. The pure core decides from that; the forward
   model's World has none, so the outlook, the roads and the replay buy nothing — with no `world.market` every decision
   is the one of today (proof D.2). The why of a bought step says the ask, the reference and both hours; a need the
   market refused for 3 or 4 says so in its own step's why ("market: ask 2,979 above 1.25 × 2,100").
7. **Seen.** `logs/status.json` gets `market`: the day's gold spent of the budget, the purchases, the wanted list. The
   page gets one line of the same in the season strip. If the two config values fit the existing knobs block as two
   rows, add them; if a knob needs more than that, leave it out and say so.
A new rule name for the buy step goes into `ORDER` (028's page reads it). If B needs a change in `gear.ts candidatesOf`
or in the fight solve's pool, say so and stop: that is C.1's question, not this task's.

## C. Read-only, into the report (at most five lines each)
1. **Pieces the plan does not ask for.** Wearable pieces on sale that are no need today (a drop like `death_knight_sword`,
   or a piece above its craft's level): for First and Fifth, what each would change — the seconds a win on the XP pick,
   a blocked kill it admits — with its ask and reference. The best five.
2. **The other side.** What the bids of the newest read would pay for stock the bank holds beyond every recipe's need
   (code, units, gold); nothing is sold.
3. **The Diamond.** Its trades of 7 days, its asks since 11-21, the hours a level-35 weapon's chain takes with it bought.

## D. Proof
1. Checks, red first where a starting tree can show it (a scenario with the fake's `world.ge` and a buy on it):
   - a gear need on sale that passes 1–4 → a worker's buy step for one copy, the gold reserved; the piece in the bank
     after it, a `spend` record, the day's gold counted;
   - the same ask above 1.25 × the reference → made as today, the why says it; no trade and under 24 h on sale → not bought;
   - `steel_bar` at 250 for a training batch → not bought (rule 2);
   - an ask above the piece's cap, and a day's budget spent → wanted, not bought; the next UTC day buys;
   - the order gone, or its price changed between the plan and the counter → nothing bought, the gold back in the bank;
   - a potion or a food need on sale → not bought; `config.market.day` 0 → nothing bought.
2. **Nothing moves without a market**: the recorded whys (0 of 97 moved) and the first 3 days of the newest road
   (029's driver) decision for decision against 031b's tree. If they hold, `npm run check -- planner` is not run; if
   anything moved, say what, and run it.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
4. `CLAUDE.md`: the market read's paragraph, "what is spent" and the runner pattern's cooldown wait follow. Commit `docs/rework.md` as `Rework notes` if it
   differs from `HEAD`, then everything else (this file with it) as `032: the market`; push to `origin/rework`. If the
   push fails, say so.

## E. Riding along: a cooldown is waited by the game's clock, not this machine's
**What is.** `waitCooldown` / `waitCooldownFull` (`loopkit.ts`) wait until `cooldown_expiration` — the server's absolute
time — has passed on the local clock (`lib/util.ts cooldownRemaining(ch, Date.now())`). This machine's clock runs slow
by about 0.1 s an hour between Windows' time syncs, so every action waits that much longer. The journal's `wait` ÷
actions, by UTC hour: 11-26 00 h 1.0 s, 06 h 1.5, 12 h 2.5, 17 h 2.8, then (a sync) 19 h 0.9, 20 h 0.5; 11-27 01 h 1.1,
06 h 1.6, 10 h 2.0. Raw log, 09 h on 11-27: Second gathers ash every 23.03 s (median; p90 23.19) on a 21 s cooldown; no
499 in the hour. On runs `szzd` and `tmek` to 10:40 UTC: 9.9 h of `wait` over 21,499 actions, 9% of all metered
seconds, where 0.5 s an action (20 h on 11-26) is what the request itself takes. Alex sees it on the page as 2–3 h of
"wait" a hero a day.
1. On the service, the wait after an action does not depend on the local wall clock's offset: it is what the echo's
   `cooldown` says is left, counted from the echo's arrival on a monotonic clock (or the expiration corrected by an
   offset the service keeps from the echoes — choose after reading what the echo carries; say which and why). Before a
   character's first echo of a run (a boot inside a cooldown) today's rule stands. A 499 stays answered as today.
2. Nothing else reads the local clock against `cooldown_expiration` on the service after this (the tab's cooldown
   ring may). If something does and cannot follow in a few lines, say so.
3. A check, red on the starting tree: the fake's clock 3 s ahead of the local one, and 3 s behind — in both a
   character's gather loop does the same number of actions in a virtual hour as with no offset, and no 499 is answered.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start, stop
  or restart, no build into `dist/`; no request to the game but part A's public reads; nothing is bought by this task;
  nothing you run writes under `logs/` (reading it is allowed).
- No new dependencies. Do not edit `docs/rework.md`. At most six new constants (the two defaults, 1.25, the half, the
  windows); more: say so and stop.
- Everything you write is in English.

## Report
`tasks/032-market.report.md`, **at most about 80 lines**: Summary · Decisions for Alex · How Alex verifies · A (the
table) · C.1–C.3 · E · What was done / files · Notes. Say first in the Summary: what is committed; what the service would
buy at its first tick by A's table (codes, gold, the hours saved) and what it refuses for its price; the wanted list;
E's rule in a line; the gate's lines. No placeholders left in it.
