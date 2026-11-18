# 004 — The achievement map (facts for the planner; no engine change)

## Goal
The rework's target (`docs/rework.md`): the client plays the season by itself until every achievement is done —
91 achievements, 210 points in `public/data/achievements.json`. One planner will drive the fleet there. Before that
planner is designed, three questions need facts, not guesses:
1. What does each achievement need, and in what order do the dependencies force them?
2. Is 210 reachable before the season ends, with five characters and no membership? If not, which order earns the
   most points in the time there is?
3. What must the client be able to do that it cannot do today, and how many points hang on each missing ability?

This task answers them and changes no behaviour. It writes:
1. `docs/design/achievement-map.md` — the map (sections A–H below);
2. `docs/design/snapshot/` — the raw responses of the few public reads this task makes, so the numbers can be
   re-derived;
3. `scripts/design/achievement-map.mts` — one offline script that computes the map's tables from `public/data/*.json`
   and the snapshot;
4. `tasks/004-achievement-map.report.md`.

The planner's design is the next task and is not part of this one. Don't sketch it, and don't write the next task.

Read first: `docs/rework.md`; `CLAUDE.md` (the sections on the roadmap, the hive and the gear model);
`docs/audit/domain-rules.md`; `docs/audit/code-audit.md` (Summary, C, G.5); `docs/tasks/roadmap-tab.md`;
`docs/game-actions.md`; `src/plan/roadmap.ts`; `src/plan/hive/achievements.ts` and `objectives.ts`;
`src/catalog/atlas.ts` and `scripts/atlas/*.mts` (what each number in `public/data/atlas.json` means and how it was
computed); `public/data/achievements.json`, `atlas.json`, `events.json`, `npc_items.json`, `tasks.json`,
`task_rewards.json`; in `docs/api/openapi.json` the schemas of the endpoints listed below.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to the temp dir (`D:\Temp`) or your session
  scratch directory; delete them at the end.
- **The real service is running and stays undisturbed.** Don't start, stop or restart a service; don't call the local
  one (`/rpc`, `/events`); don't run `npm start`, `npm run dev`, `npm run build`, `npm run atlas`, `npm run assets`
  or the fetch scripts. Nothing opens `.ammo/*` or `game.db`, nothing writes to `logs/dev.log` (reading it is fine).
- **Requests to the game: only the public reads listed here, without a token.** Don't read `.env`. Send no
  `Authorization` header. One request at a time, at least one second apart, **at most 12 requests in total**, with a
  plain `fetch` in a scratch script (not through `src/api/client.ts`):
  - `GET /` — server status: the season (name, number, start date, reward track), max levels;
  - `GET /season_rewards` — the reward track, if `GET /` does not carry all of it;
  - `GET /characters/{name}` for one character — to learn the account's name (take a character name from
    `logs/dev.log`);
  - `GET /accounts/{account}` — the account: member or not, achievement points;
  - `GET /accounts/{account}/characters` — the five characters: levels, skills, gear;
  - `GET /accounts/{account}/achievements` — progress on every achievement (`size=100`; a second page if needed).
  Save each response body as it came under `docs/design/snapshot/` (`status.json`, `account.json`, …) and list every
  request in the report: URL, time, HTTP status. If a request fails, don't retry more than once; say what is missing.
  Nothing secret is in these responses; check that before committing them.
- **The game's public web pages may be read** (documentation, announcements) for rules the API document does not
  state: how achievement progress counts across characters, what a `favor` objective is, when the season ends. Give
  the URL for everything taken from there.
- **No change under `src/`, to `CLAUDE.md`, to the harness or the scenarios.** New files only, in the places named
  above. No new dependencies.
- The atlas is used as it is. If `atlas.json` is stale or a number in it looks wrong, say so under "Notes"; don't
  regenerate or correct it.
- One task only. Don't fix what you notice; list it under "Notes".
- Everything you write is in **English**.
- Gate: `npm run typecheck` and `npm run check` pass as before (30 checks, 29 ok, `repeat-spin` known).
- Commit at the end, `004: achievement map`: this task file, the report, `docs/design/**` and the script. No push.

## What every number must carry
Each figure in the map says where it comes from: **api** (the snapshot or the OpenAPI document), **data**
(`public/data/*.json`), **atlas** (name the field), **log** (measured from `logs/dev.log`; say over which period and
how), **docs** (URL), or **guess** (say what it rests on). Where two sources disagree, show both and say which one
the map uses. An "unknown" with the reason is a valid cell; an empty cell is not.

## `docs/design/achievement-map.md`
Open with a summary of at most 20 lines: is 210 reachable and by when; if not, how many points are and which reward
tier that reaches; the three largest obstacles; the abilities the client lacks, with the points behind each.

### A. The season
Name, number, start date; the end date if any source gives one, otherwise the working assumption from
`docs/rework.md` (about early March 2027) and what it rests on. The reward track: every tier with its required
points, what it gives, and whether it needs membership. Confirm that 210 is the last free tier.

### B. The account today
From the snapshot: member or not; achievement points; per character: combat level, every skill level, the gear band
it wears (in the atlas's terms). One paragraph on what that means for the road: who is ahead, who is behind, which
skills nobody has.

### C. Every achievement
One row per achievement (all 91), grouped by objective type: code, name, points, each objective with
progress / total and what is left, and:
- **what it needs before work can start**: the combat level and gear band to beat the monster at an acceptable rate
  (the atlas's terms), the skill level for the resource or the recipe, the items a `use` objective consumes and where
  they come from, the NPC and whether it is a permanent one or an event one, a gated tile and its key, a task type,
  a group of characters, a seasonal offering;
- **how progress counts**: account-wide or per character, and whether five characters working in parallel add up
  (give the source; if it cannot be established without playing, say "unknown" and say how it could be observed
  from the log);
- **the work left**, in actions and in fleet-hours, and whether it can be split across characters;
- **what it costs** besides time: gold, tasks coins, event currency, materials that compete with gear;
- **whether the client can do it today**, by which existing queue item or feature, or "cannot" with the reason.

### D. Dependencies and order
- The gates, as a graph in text: which combat levels, skill levels, gear bands and unlocks (events, keys, bosses)
  stand in front of which achievements.
- Overlap: achievements that advance each other, and achievements that the levelling road to the maximum level
  pays for anyway (kills, gathers and crafts that would happen during levelling) against those that need work with
  no other use.
- The order the dependencies force, and where there is a free choice.

### E. Is it reachable?
- The fleet's real pace, measured from `logs/dev.log`: actions per character-hour while a queue runs, and the share
  of the time the queues actually ran (idle, paused, outages). Say how you measured.
- The whole road in fleet-hours and in calendar weeks, in three cases (pace as measured; the fleet never idle; a
  pessimistic case), each next to the deadline from A.
- The event-dependent part separately: what waits for a spawn, the spawn odds from `events.json`, and the expected
  calendar time that adds regardless of how fast the fleet is.
- If 210 does not fit: the order by points per fleet-hour, the points reachable by the deadline in each case, and
  the reward tier that reaches.

### F. What the client cannot do today
Each missing ability once, with the achievements and points that depend on it and what the game requires for it
(for example: a group boss fight started without a manual step, a raid, an objective type nothing in the client
produces, an event that has to be caught while it is up). Ordered by points blocked. This list is the planner's
minimum scope, so be exact about "cannot" against "can, but only by hand" against "can, automatically".

### G. Spending
What the road costs in gold, tasks coins and event currency, where that money comes from at the fleet's pace, and
the purchases that are large enough to need a rule (a list with amounts). No recommendation on the rule; that is
Alex's.

### H. Assumptions and unknowns
Everything the map assumes without proof, each with what would settle it (a doc page, one observation in the log,
one request Alex would have to allow).

## `scripts/design/achievement-map.mts`
Offline: reads `public/data/*.json` and `docs/design/snapshot/*.json`, prints the tables of C and the totals of E.
No request, no storage, no import from `src/state/`; importing pure modules from `src/plan/`, `src/catalog/` or
`src/sim/` is fine if they load without the engine (if one does not, don't change it; compute beside it and say so
under "Notes"). Run as `node --import tsx scripts/design/achievement-map.mts`. It is not part of `npm run check`.
The document's tables are this script's output, pasted; the report says so and names anything edited by hand.

## Out of scope
The planner's design or any part of it; any change of behaviour; the hive; new scenarios; regenerating the atlas;
UI.

## Acceptance (Alex checks)
1. `git show --stat HEAD` → only `tasks/004-achievement-map.md`, its report, `docs/design/**` and
   `scripts/design/achievement-map.mts`. `git status` clean.
2. `node --import tsx scripts/design/achievement-map.mts` → runs offline and prints 91 achievements, 210 points and
   the account's current points, equal to the figure in `docs/design/snapshot/`.
3. The map opens with the summary and answers the three questions of the Goal in it.
4. Section C has 91 rows and no empty cell.
5. The report lists every request made: 12 at most, none with a token, none to the local service.
6. `npm run typecheck` passes; `npm run check` → 30 checks, 29 ok, 1 known, exit 0.

## Report
`tasks/004-achievement-map.report.md`, with these sections in this order:
- **Summary** — 3–6 lines: the answers to the three questions.
- **Decisions for Alex** — numbered. Each: the question in one line, the options (A / B), your recommendation, and
  the default if Alex doesn't answer. Only real decisions; "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What was done / files** — the documents written; every request (URL, time, status); what was measured from the
  log and how; every command run.
- **Notes** — anything else: wrong or stale numbers found in the atlas or in `CLAUDE.md`, defects noticed.
- **To delete (Alex)** — or "Nothing".
