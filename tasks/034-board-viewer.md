# 034 — The board, seen: a dataset from the raw reads and a page to look at it

Read first: `docs/season-plan.md` (what the data is used for now), `scripts/board/README.md` (what a read holds),
`docs/strategy/board/tools/whole.mjs` and `docs/strategy/024/tools/lib.mjs` (the helpers that already load a read),
`tasks/026b-board-reading.report.md`.

**Alex (11-27):** a parser that takes the raw reads apart and keeps the result, and a page in the browser where he
picks a player and sees its characters over time, or sees all players at once, or looks for patterns — "in a picture
things show that numbers hide". He cannot re-check the planning chat's tables; this page is how he checks them.

## Where this runs
A **second Claude Code session**, beside whatever task the main one runs. So: **no git command that writes** (the next
main task commits your files), nothing under `src/`, no `npm run check`, no build of the client, the live service
untouched, no request to the game or to any network. Everything is made from `logs/board/` as it is on disk (about 45
full reads since 11-24 09:17 UTC, twelve more a day; 50 accounts a read, their characters and achievements, the
ladder).

## A. The dataset — `scripts/board/derive.mjs`
1. Reads every whole read of `logs/board/` (the rule of `whole.mjs`: partial reads and duplicates out) and writes, under
   `logs/board/derived/` (generated, not tracked — check `.gitignore` and say):
   - one small file a read (so a rebuild takes only the new reads: an already derived read is not opened again);
   - the page's data, assembled from them.
2. A read keeps, compactly (codes through a dictionary; a value that did not change is not repeated):
   - an account: ladder position, points; each achievement's completion time; every objective counter that moved since
     the read before (kills by monster, gathered, crafted, recycled, tasks, favors);
   - a character: combat level and total XP; the eight skills, level and total XP; the tile it stands on (the monster,
     resource, workshop, bank… from `public/data/maps.json`); the worn pieces by slot; the bag's five largest stacks;
     the held task and its progress; HP.
3. Between two consecutive reads, for a character: the XP gained in combat and in each skill, and the hours.
4. Include 024's two reads of 11-22 and 11-23 (`docs/strategy/024/base/`) as the first two points **only if** that is a
   plain mapping of fields; else leave them and say so.
5. **For the planning chat**: `logs/board/derived/summary.json`, at most 1 MB — a day a row for every account and
   character (levels, the skills, XP gained, hours by monster, the set worn longest that day, points) — one file the
   chat can copy instead of a read's 105.
6. Say in the report: bytes a read adds, and what the page's data weighs after 60 days of reads. Above 40 MB, split it
   by week and load a week on demand.
7. `npm run board:view` = derive, then build B's page. Add it to the scheduled watch (`scripts/board/run.vbs`: the page
   is rebuilt after each read) **only if** it is a line or two and a failure of it can change neither the read nor its
   exit code; else leave the watch alone and say so.

## B. The page — `logs/board/view/index.html`
Sources in `scripts/board/view/`; the built page and its data land in `logs/board/view/` (generated). It opens by a
double click (`file://`), in Chrome, **with no network**: no CDN, no fetch of a local file — the data comes in as a
script. No npm dependency; charts in plain SVG or canvas, or one chart library vendored as a single file with its
licence (say which and why). Dark and light by the system's setting. `alverus` is always marked.

Four views, in this order of importance; the first three are the task, the fourth only when they are done:
1. **Everyone.** (a) A scatter, a dot an account: points against the mean combat level of its three highest characters,
   with the dot's trail over the reads — where an account bought points and where levels. (b) A sortable table: points,
   the five combat levels (cells coloured by level), the best weaponcrafting / gearcrafting / jewelrycrafting, the best
   of each gathering skill, combat XP a day (the last 24 h and the whole span), tasks a day. A click opens the account.
   (c) Points and top combat over time, every account a thin line, the picked one and ours bold.
2. **An account.** A row a character: level and XP over time; **an activity ribbon** — a cell a read, coloured by what
   the tile is (each monster its own colour, a resource, a workshop, the bank, elsewhere), on hover the tile, the XP
   gained since the read before and the bag; the skills over time (a craft's bursts must be visible); **the set over
   time** — a line a slot, a segment while a piece stays, on hover the piece and its level. Below: the achievements as
   they were completed, and the counters that moved, a day a column.
3. **A level.** Pick a combat level or a band: what the characters at it fight (the share of intervals, and XP an hour
   as dots a monster), what they wear slot by slot (bars), for all and for the fastest quarter by XP an hour. Every bar
   and dot lists its characters; a click opens the account at that read. This is the season plan's reference, live.
4. **Two accounts side by side**, aligned by time or **by the top fighter's level** — a row a level: the hours it took,
   what was fought, the weapon.

Keep it plain: readable at a glance, nothing decorative. Alex shapes the second version by using the first.

## C. The plan against the whole data (read-only, into the report)
1. `docs/season-plan.md`, sections 1–5: a line a claim that carries a number, at most 40 — **holds / differs**, with
   the dataset's number over all reads. The plan was written from one read (11-27 16:00) and 026b's two days.
2. At most ten things the data shows that the plan does not say, each with the view and the filter where Alex can see
   it. No advice beyond that.

## Proof
- `npm run board:view` twice: the second run opens no read already derived (say the seconds of both).
- The built page opened headless from `file://` with the network off: no console error; each of the views drawn from
  the real data; say how it was checked. Three numbers of the page checked by hand against a raw read (name them).
- Do not edit `docs/rework.md` or `docs/season-plan.md`.

## Rules
- Only `scripts/board/`, `logs/board/derived/`, `logs/board/view/`, `package.json` (the one script line) and this
  task's report are written; scratch in `D:\Temp`. The raw reads are never changed.
- Everything you write is in English.

## Report
`tasks/034-board-viewer.report.md`, **at most about 60 lines**: Summary (what to double-click, the dataset's size and
growth, whether the watch rebuilds the page) · C.1's table · C.2's lines · How Alex verifies · Files · Notes.
