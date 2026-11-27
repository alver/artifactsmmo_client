# 032c — What the fleet cannot make is bought: a piece on sale is a candidate

Read first: `tasks/032-market.md` and its report (C.1), `tasks/032b-market-no-source.md` and its report (the table C,
decision 1), `CLAUDE.md` (the market's paragraphs as 032b left them; "Keys, tolls and what is spent"), `src/plan/planner/
gear.ts` (`candidatesOf`, `makeHours`, `gearPieces`, `PER_SLOT`), `market.ts` (`marketQuote`, `marketOffers`, `purseOf`),
`src/state/market.ts` (`refOf`, `wantRefs`).

## Where this starts
On top of `032b: report` (`122a769`), the top of `origin/rework`. If it is not there, say so and stop. The working tree
holds at most two changes from the planning chat (`docs/rework.md`, this file); anything else uncommitted: say so and
stop. The live service runs `122a769` (run `1cxk`, since 13:45:17 UTC on 11-27): 032 and 032b are live and buy.

**What is.**
- **The fighters' weapon is ten levels behind.** First and Fifth at combat 31 wear a Battlestaff (20). On `122a769` the
  market buys Fifth an Elderwood Staff (1,495); First gets none: the staff is its candidate and no need, its need is the
  Obsidian Battleaxe (a chain of 396 h).
- **The best weapon on sale is no candidate.** Report 032, C.1: `perfect_bow` 2 × 1,750 (reference 1,750, 7 trades) — the
  XP pick becomes the Imp, XP a second +74% (First) and +66% (Fifth), the Vampire 100 / 97 → 55 / 57 s a win;
  `death_knight_sword` 3 × 2,979 (reference 4,500, 6 trades): +40% / +26%. `candidatesOf` leaves both out: the bow's
  recipe asks demon horns (the Demon, an event nobody of ours can be a member of: the bill is infinite), the sword has
  no recipe (`!it.craft`).
- **The Imp is where the obsidian comes from**: it drops demoniac dust (1 in 12) and pieces of obsidian (1 in 50) — what
  the bills of the obsidian armour, helmet and battleaxe are short of (323–396 h today, report 032b).
- **The neighbours do it**: sqidking's fighters wear `mithril_platelegs` (40) that its gearcrafter cannot make
  (`docs/rework.md`, decision 86).
- **A gap in "careful"**: where rule 2 has no chain to compare with (032b's B.2), a reference from asks — the sellers'
  own standing price — is the only judge of a price.

**Alex (2026-11-27):** the market, carefully (decision 83). The chat: what the fleet cannot make and a fighter's work
pays for is inside that; the purse's caps stand as they are. **Alex, on the bows:** yes, of course, let it buy.

## A. A piece on sale is a candidate
1. **Who.** A wearable piece a character may equip now (the types and the level window `candidatesOf` takes today) that
   `candidatesOf` leaves out for want of a recipe or a crafter, or for a bill that is out or infinite, and that stands
   in `world.market` (an order not this account's), is a **bought candidate** when its lowest ask passes rule 3 on a
   reference from trades (B) and rule 4's purse — judged as `marketQuote` judges a material: a reference not read yet
   counts as fair for the candidacy, the service is asked for it (`wantRefs`) and the purchase waits for the read.
2. **Its price.** G is its gold ÷ `config.goldPerHour` plus the trip: no bill, no crafter, no level road (`makeHours`
   reads `craft` today). It is a need by today's rule for a fighter's work ((a) and (b): G + H1 ≤ `NEED_RATIO` × H0),
   one copy a wearer, and never a tool.
3. **Its step.** As a need it is bought by 032's step under rules 3–5 (rule 2 has no chain: "no source of ours"); its
   `gear:` target has no craft step. Refused, or gone from the market: no need, and the wearer's why says the market's
   answer once (032b's B.2 wording).
4. **Bounded.** Beside `PER_SLOT`'s craftable pieces at most two bought candidates a slot (the highest level, then the
   lowest ask). Say in the report what that cut on today's World, and `decide`'s seconds before and after; more than
   2 s slower: say so, do not tune.
5. The forward model has no market and buys nothing, as today; a bought piece reaches it as the bank's stock.

If A needs a change in the fight solve itself (not in its pool), say so and stop.

## B. With no chain to compare, trades are the judge
A purchase where rule 2 has nothing to compare with — a material by 032b's B.2, a piece by A — needs a reference from
trades, at least `MARKET_MIN_TRADES` (3) of them in the 7 days; a reference from asks, or from fewer trades, does not
serve there: not bought, "market: n trades in 7 days, no price to hold the ask against". A purchase with a chain of
ours: as today.

## C. Read-only, into the report (at most five lines each)
1. **The fighters' weapons.** On the newest live World and market: the weapon each of First's and Fifth's needs holds
   before and after A, with the pick, its seconds a win and the XP an hour. And why the Elderwood Staff is a candidate
   and no need for First today (032b's table: the Vampire 100 → 55 s).
2. **Three days with the bows.** 029's driver from the newest World, twice: as it is, and with two perfect bows in the
   starting bank. A day a line: each fighter's pick and combat level, the demoniac dust and pieces of obsidian banked;
   the day the first obsidian piece is made, if inside.
3. **The Death Knight with the market counted.** The cheapest set (gold and own hours, both said) that admits First or
   Fifth at the floor at combat 31, potion-free, out of 032b's 22 pieces and the wearables on sale; what of it the plan
   holds after A. (`the_reaper`: 40 / 250 here; all four accounts around this one hold it.)
4. **The potions' gap** (032b's decision 1): which of today's needs and bills rest on a kill admitted only with the
   bank's potions — the piece or objective, the monster, for whom. Nothing is changed.

## D. Riding along
`QUEUE_KINDS` lacks `claim` and `expand` (032's Notes: a stored one is dropped at a restart): add them, with a check.

## E. Proof
1. Checks, red first on the starting tree (the fake's `world.ge`):
   - a fighter whose solve prefers a weapon on sale that has no recipe, fair by 5 trades → a need, a worker's buy step
     for one copy, banked, a `spend` record; the fighter's next fight step wears it;
   - two fighters and two units → a copy each, two purchases; one unit → one copy, the other fighter as today;
   - the same piece at an ask above 1.25 × the reference; with 2 trades; with a reference from asks only → no
     candidate, the why says which;
   - a material with no source of ours and a reference from asks only → not bought (B); with 3 trades → bought, as 032b;
   - a piece on sale that has a chain in reach → as today (032's rule 2 decides);
   - no market → the decisions of the starting tree.
2. The recorded whys: what moved, and why (none without a market). The first 3 days of the newest road (029's driver)
   decision for decision against the starting tree. `npm run check -- planner` is not run.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
4. `CLAUDE.md`: the market's paragraphs and the gear candidates' line follow. Commit `docs/rework.md` as `Rework notes`
   if it differs from `HEAD`, then everything else (this file with it) as `032c: a piece on sale is a candidate`; push
   to `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start, stop
  or restart, no build into `dist/`; no request to the game but public reads for C — `/grandexchange/orders` (one) and
  `/grandexchange/history/{code}` (at most 30); nothing is bought by this task; nothing you run writes under `logs/`.
- No new dependencies. At most two new constants (`MARKET_MIN_TRADES`, the two a slot). Do not edit `docs/rework.md`.
- Everything you write is in English.

## Report
`tasks/032c-bought-pieces.report.md`, **at most about 70 lines**: Summary · Decisions for Alex · How Alex verifies ·
C.1–C.4 · What was done / files · Notes. Say first in the Summary: what is committed; what the service buys for First
and Fifth at its first tick on today's World and market (pieces, gold) and what the fighters' pick and XP an hour
become; what B refuses today that 032b bought; the gate's lines. No placeholders left in it.
