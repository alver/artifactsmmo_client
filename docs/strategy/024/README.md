# docs/strategy/024 — the leaders' base (task 024)

The top 25 accounts of the leaderboard by achievement points and this account (`alverus`), each with its whole fleet,
read once with public GETs (no token) and kept as they came, so that every statistic can be rebuilt without asking the
game again. Report: `tasks/024-leaders.report.md`. Run everything from the repository root (Node 24).

## What lies here

- `snapshot/<UTC start of the read, YYYY-MM-DDTHHMMZ>/` — every 200 answer byte for byte: `leaderboard-1.json`
  (`/leaderboard/accounts?sort=achievements_points&page=1&size=100`), `acc-<account>-characters.json`
  (`/accounts/<account>/characters`, the five full character objects), `acc-<account>-achievements-<page>.json`
  (`/accounts/<account>/achievements?size=100&page=<page>`, open ones too, with each objective's progress). One read:
  `2026-11-23T1222Z`.
- `requests.log` — one line a request ever made by `tools/fetch.mjs`: `<path> <status> <bytes> <iso time of its start>`.
  Its line count is what the cap counts.
- `base/` — built from the snapshot folders by `tools/build.mjs`, one JSON object a line, fixed order (the same input
  gives the same bytes). Report 022's read (`docs/strategy/022/snapshot/`, 17 accounts, 19:23 UTC on 11-22, its log
  `docs/strategy/022/requests.log`) is read in place as the earlier snapshot `2026-11-22T1923Z`.
  - `characters.jsonl` — a character and a snapshot: `snap`, `account`, `rank`, `points`, `member`, `read` (the time of
    its account's request), `name`, `level`, `xp`, `max_xp`, `skills` (each skill's `level`, `xp`, `max_xp`), `stats` (as
    the API gives them: `max_hp`, `hp`, `speed`, `haste`, `critical_strike`, `wisdom`, `prospecting`, `initiative`,
    `threat`, `attack_*`, `dmg`, `dmg_*`, `res_*`), `effects`, `slots` (weapon … bag; `utility1/2` with `qty`),
    `inventory` (non-empty slots), `inventory_max_items`, `gold`, `pos` (`x`, `y`, `layer`, `map_id`), `tile` (what
    `public/data/maps.json` puts on that map: a monster with its `level` and `mtype`, a resource with its `skill` and
    `level`, a workshop, a bank, an NPC, …; `file` names the file), `event` (every event of `public/data/events.json` that
    spawns on that map, with its content), `task`, `cooldown`, `cooldown_expiration`, `cd_left` (seconds from the read to
    the cooldown's end: > 0 still on cooldown, < 0 idle that long).
  - `accounts.jsonl` — an account and a snapshot: `rank`, `points`, `member`, `gold` (the board's), `read`, `names`,
    `combat` (the five levels), `shape` (`top`; `near` within 3 of it, `mid`, `far` 10 or more below), `crafters` (who
    holds the best weapon-, gear- and jewelrycrafting, and its level).
  - `achievements.jsonl` — an account and an achievement: `points`, `completed_at`, `day` (season day, day 1 =
    2026-10-24), `objectives` (`type`, `target`, `progress`, `total`). The 11-22 read holds the completed ones only.
- `tables/` — every table of the report as Markdown, one file a table: `2*.md` from `tools/stats.mjs` (section 2,
  (a)–(h)), `3*.md` from `tools/model.mts` (section 3). Readable without running anything.
- `tools/` — `fetch.mjs` (the only file that reaches the network), `build.mjs`, `stats.mjs`, `model.mts`, `lib.mjs`
  (shared: paths, the static data, report 022's marks of a recipe tree — copied from
  `docs/strategy/022/tools/sec1-analyze.mjs:44-104`).

## Rebuild the base and print the tables (no request)

```bash
node docs/strategy/024/tools/build.mjs                # snapshots → base/
node docs/strategy/024/tools/stats.mjs                # base/ → tables/2*.md, printed
node --import tsx docs/strategy/024/tools/model.mts   # base/ + this fleet's newest logs/world/ → tables/3*.md, printed
```

Without arguments `build.mjs` and `stats.mjs` give this folder's committed `base/` and `tables/2*.md`, the same bytes.

## The daily read (task 025)

The service reads the same 53 paths by itself once a UTC day at 12:22 (`src/state/leaders.ts`; not a dev service, not
one on another port, not with `LEADERS=off` in `.env`): public, no token, one at a time ≥ 1.3 s apart, at most 60 a day,
a 429 or a 5xx ends the day's read. Every 200 body lands byte for byte in `logs/leaders/<stamp>/` with the file names
above, one line a request in `logs/leaders/requests.log` (this folder's format), and one `leaders` record in the journal.
The tools take a snapshots directory and an output directory:

```bash
node docs/strategy/024/tools/build.mjs logs/leaders [<out>]   # 022's read + 024's + every day of logs/leaders → logs/leaders/base/
node docs/strategy/024/tools/stats.mjs logs/leaders [<out>]   # logs/leaders/base/ → logs/leaders/tables/2*.md, + (i) the days
npm run leaders                                               # the two in a row
```

`(i) the days` (`tables/2i-days.md`): per account of the newest read and per read, the board's points, the achievements
completed, the top and the median combat level, the fleet's combat XP an hour since its read before, how many of its
characters stand on a monster, how many stand at (0, 0) below a fifth of their HP (a loss seen), each fighter's weapon and
rune where they changed; per band the fighters' median hours a level from one read to the next; this account marked.
(a)–(h) are computed on the newest read that holds this account (a read a 429 cut may not).

`stats.mjs` also reads `public/data/` (items, monsters, maps, events, achievements, the atlas),
`docs/strategy/022/sec3.json` (report 022's roads, table (f)) and, for table (g), the newest `outlook` record of
`logs/journal/` at or before the read (gitignored: without it the planner's column says "not read").
`model.mts` imports `src/` as the service does (catalog, simulator, `reach.ts`, `pick.ts`, `cost.ts`), stands in a
`localStorage` that keeps nothing, opens no storage and reads this fleet's newest `logs/world/<day>.json` (3d, 3e) —
a new World snapshot changes 3d and 3e. Everything else comes back the same: the Monte Carlo of 3b uses a seeded
generator.

## Read again

```bash
node docs/strategy/024/tools/fetch.mjs                       # the leaderboard, its first 25 + alverus: characters, achievements (53 requests)
node docs/strategy/024/tools/fetch.mjs --only characters     # the light read: the leaderboard + 26 characters (27)
node docs/strategy/024/tools/fetch.mjs --accounts a,b,c      # these accounts, no leaderboard
#   --cap 150 (default): stops when requests.log holds that many lines; --top 25; --me alverus
```

Public GETs to `https://api.artifactsmmo.com`, no token and no `Authorization` header, one at a time, 1.3 s from start
to start; a 4xx/5xx is logged and not retried, a 429 stops the read for good. Each read writes a new
`snapshot/<stamp>/` and never writes into one that exists; `build.mjs` takes every snapshot folder it finds, so the
next build gives every character one line a read. A second read is the planning chat's to ask for: **the cap is
150 requests in all, 53 are spent** (a light read is 27, a whole one 53).
