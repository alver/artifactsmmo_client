# 040 — Gold: where it comes from, where it goes, and what fills the bank (read-only)

Read first: `docs/season-plan.md` (section 8), `CLAUDE.md` (the market, the bank and its tidy, the merchants), then the
data named below.

**Alex (11-28):** the bank has little room left and the next expansion already costs a lot; the bank will have to be
cleaned; and we have to look for the ways gold is earned. This task gathers the facts. A new planning chat decides
from its report.

## Where this runs
A **second Claude Code session**, beside whatever task the main one runs (039 now). So: **no git command that
writes**, nothing under `src/`, no `npm run check`, the live service untouched, no request to the game or to any
network. Everything is read from what is on disk:
- `logs/world/<day>.json` (a day a file since 11-21: the bank and its gold, the market's orders, what was spent);
- `logs/market/<day>.jsonl` (the order book every twenty minutes since 11-21: asks and bids a code);
- `logs/journal/`, `logs/raw/` (our steps, fights with their gold, spends, sales, rewards);
- `logs/board/` and `logs/board/derived/` (50 accounts a read since 11-24; a character's pocket gold is in the raw
  reads);
- `public/data/` (`monsters.json` gold a kill, `npc_items.json` what a merchant buys and for how much,
  `task_rewards.json`, `achievements.json` rewards, `items.json`), `docs/api/openapi.json` (what the Grand Exchange
  offers).

## A. Our gold so far
1. The bank's gold day by day since 11-21, and each day's income by source (kills, tasks, achievements, sales to a
   merchant, sales on the market) and spending by kind (the market, a merchant, an expansion). One line a day.
2. What a day of the fleet earns now, by source.

## B. The ways gold is earned, ranked
One table, a line a way, gold an hour of one character of ours today and with its fighters at 40:
1. a kill's own gold, by monster the fleet fights or could;
2. a drop or a gathered thing a merchant buys (`npc_items.json` `sell_price`: the gems at 1,500, a death knight sword
   1,500, a bandit armor 2,000, a golden egg or shrimp 1,000, small pearls 250 …): what an hour of ours yields, which
   merchant, and — where the merchant is an event — how often and how long it has stood since 11-21 (the journal's
   `event` records);
3. a thing sold on the market, **only where the order book shows demand**: a standing bid, or asks that were taken
   between snapshots; the price, the units a day that moved, what an hour of ours makes of it;
4. a craft sold: where the materials' cost (our hours, or their own ask) stands under what the product fetches;
5. the tasks' and achievements' gold.
For each line: the limit (the book's depth, the merchant's visits) and whose hours it takes from the plan.
Then: **the three that pay best for the least plan lost**, and what the engine would need to do them (it sells
nothing today? — say what it does).

## C. What the board shows
From the raw reads: the accounts whose characters' pocket gold grows fastest, and what those characters were doing
in the hours it grew (the tile, the bag). At most ten lines; say plainly what pocket gold cannot show (the bank's
gold is not public).

## D. The bank
1. The slots as they stand (the newest `logs/world` file): a line a kind — a listed piece's or a training's material
   the current or the next stage asks, food and its raw, tools and worn gear in use, keys and currencies, **and what
   nothing in the plan asks for**.
2. For the last kind, an item a line (at most 40, the largest first): the count, how it could leave (recycled, sold
   to which merchant for how much, a standing bid, nothing) and the gold or materials that brings. The slots that
   frees.
3. The expansions so far and their prices; the next one's price against D.2's slots.
4. What the bank's tidy does today, in three lines.

## E. What the plan will spend
The list with its timing: a backpack for each craft holder (Alex: the crafters first, the fighters later; 50,000
each at the nomadic merchant), burn runes at 40 (30,000 each), an expansion, the market's purse (25,000 a day, what
was really spent a day), anything else the plan's stages name. Against A.2: the gap a week.

## Proof
Three of B's numbers and two of D's checked by hand against the raw files (name them). Every table says the files
and the days it was counted from.

## Rules
- Written: only this task's report and, if the tables do not fit it, `docs/strategy/gold/` (tables as `.md`);
  scratch in `D:\Temp`. Nothing else is changed.
- No advice beyond B's three and D.2's column "how it could leave". The deciding is the planning chat's.
- Everything you write is in English.

## Report
`tasks/040-gold.report.md`, **at most 80 lines**: Summary (the fleet's gold a day; B's three; the bank's slots that
can be freed and what they bring; the gap of E) · A · B's table · C · D · E · How Alex verifies · Files.
