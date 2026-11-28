# 041 — Gold in: the sell list, the cut, the tidy

Read first: `tasks/040-gold.report.md` (Summary, B's "What the engine sells today", D.2, D.4), `CLAUDE.md` ("Event
standing orders", "The bank", "The stage"), `src/plan/events.ts` (`merchantOrder`), `stage.json` (the new top-level
`sell` and `cut`, written by the chat).

**Alex (11-28, on report 040):** what lies in the bank asked by nothing is sold to the merchants; **sap is not** ("not
much to earn on it, let it lie in the bank"); no expansion at 112,000 — the bank is cleaned instead. Sell orders on
the exchange and a gold lane for a worker are not built. Backpacks come with the bags (the next task), not here.

## Where this starts
The top of `origin/rework`: 039b's commit if it is there, else 039's — say which. The working tree may hold the
planning chat's files (`stage.json`, `docs/season-plan.md`, `docs/rework.md`, this file) and, if 039b did not commit
them, task 040's (`tasks/040-gold.md`, its report, `docs/strategy/gold/`). Anything else uncommitted: say so and stop.
The live service runs an older commit and already reads the new `stage.json`; its parser takes only `stages`.

## A. The sell list
`stage.json`, top level: `"sell": { "<code>": <the count the bank keeps> }`. Read where the stages are read (boot and
every change, no restart). A code the catalog does not know, or that no merchant buys for gold, is left out and named
as an unknown piece is.
1. `merchantOrder` sells a listed code down to its count, to the merchant that buys it. **The list replaces
   `SELL_FLOORS` and the "no recipe uses it" test** (settled point 6 ends here: the chat answers for the list).
   Nothing off the list is sold. A file with no `sell` sells what today's order sells.
2. One bagful a visit, the most gold first; the rest waits for the next visit. No order is made for less than 1,000
   gold of sales, unless it also buys.
3. A gear code on the list is not sold while a running step's `wear` names it or a solve of today picks it (the
   tidy's own test in `bank.ts`).
4. Nothing is hunted, gathered or made for the list; the golden egg's rule stays as it is; the forward model sells
   nothing new.
5. A sale leaves a journal record `sale` (the merchant, the code, the count, the gold) as a purchase leaves `spend`,
   and a line in `docs/journal.md`.

## B. The cut
`stage.json`, top level: `"cut": ["ruby", "sapphire", "emerald", "topaz"]` — products made of one material (24
stones a gem, mining 20).
1. While the bank holds the materials for at least 6 of the listed products together, cutting is a step of the mining
   lane's holder (else of any character that is on and has the recipe's level), ranked right after the tidy: whole
   batches withdrawn, crafted at the mining workshop, banked, until no whole batch is left. The remainder stays.
2. It is no objective, no training and no need; it changes no other step's rank; the forward model does not cut.
The bank on 11-28 00:00: 509 topaz, 481 ruby, 448 sapphire, 303 emerald stones — 21 + 20 + 18 + 12 = 71 gems.

## C. The tidy
The tidy runs while fewer than 40 slots are free (`TIDY_BELOW` 15 → 40; with 19 free it never ran). Its verdicts,
the level margin, and the expansion's rules (below 10 free, the cap 60,000) stay as they are.

## Proof
1. Checks, red first: a listed code is sold down to its count and sap in the same bank is untouched; a file with no
   `sell` gives today's order; sales under 1,000 gold make no order; a listed gear code a solve picks is kept; more
   than a bagful is cut to the most gold; stones for 7 gems make the cut step and leave the remainder, stones for 5
   make none; an outdated ring with 19 slots free is tidied.
2. The newest live state on a zero-call service with `stage.json`: the order each of the five merchants would get
   today (its text and gold) before the cut and after it; the cut step (who, the trips, the minutes); the codes the
   tidy takes now and the slots that frees; the first three steps of each of the five, to show nothing else moved.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
4. `CLAUDE.md` follows ("Event standing orders", "The bank", "The stage"). Commits, staged by path, pushed to
   `origin/rework`: `Rework notes` (`docs/rework.md`, `docs/season-plan.md`) if they differ from `HEAD`; `040: gold,
   read-only` (040's task, report and tables, unchanged) if not committed yet; then `041: the sell list, the cut, the
   tidy` (yours, `stage.json`, this file).

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/`.
- No new dependencies. Do not edit `docs/rework.md`, `docs/season-plan.md` or `stage.json` (name what should change
  in it).
- Nothing beyond A, B and C: no sell order on the exchange, no backpack, no bag, no change to what the market buys.
- Everything you write is in English.

## Report
`tasks/041-gold-in.report.md`, **at most 40 lines**: Summary (Proof 2 first: the five orders with their gold, the cut,
the tidy's slots; what is committed; the gate's line) · Decisions for Alex · How Alex verifies (where the first `sale`
records and the first cut will show) · Files.
