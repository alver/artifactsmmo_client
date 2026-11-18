# 004 — The achievement map: report

## Summary
- **What each achievement needs and the forced order**: `docs/design/achievement-map.md`, sections C and D — 91
  rows, a gate graph, and the order by points per character-hour (E).
- **Is 210 reachable? No.** The costable road is about 85,600 character-hours; the fleet delivers about 105 a day
  (measured), so 117 weeks against about 14 left (deadline taken as 2027-02-24). About 100 points fit (101 measured,
  105 never idle, 98 pessimistic) — and only if the client had every missing ability today. Left alone it ends
  near 30. 27 points depend on raids, whose rules are not documented.
- **What the client cannot do, with the open points behind each** (overlapping): map transitions 97 · the whole
  fleet on a live event 64 · choosing an achievement's work itself 50 · group boss fights without a click 40 ·
  raid fights 27 · using an item on purpose 10.
- No behaviour was changed. Five public requests were made, none with a token.

## Decisions for Alex
1. **What is the target, now that 210 is out?**
   A: the most points by the season's end, in the order of E (about 100; the 100-point tier and the bronze badge at
   105 are the realistic prizes). B: keep "every achievement" as the target and accept that the season ends first.
   Recommendation: A — it decides the planner's scope (see 3). Default: A.
2. **Which deadline does the planner work against?**
   A: 2027-02-24 (the API's start date 2026-10-24 + the docs' "approximately 4 months"). B: 2027-03-06
   (`docs/rework.md`: season 8's length counted from 2026-10-31). Recommendation: A, the earlier one; the points
   reached are the same in both (E). Default: A.
3. **Raids: in or out of the planner's first scope?**
   A: out — 27 points are written off for this season (12 raid kills and raid currency, 15 behind the cultist
   cloak). B: allow two more public reads (`GET /raids`, `GET /grandexchange/orders`) in a small follow-up to learn
   the schedule, the rules and whether the cloak's fabric can be bought from players, then decide.
   Recommendation: A for the design, B as a cheap side task — none of those 27 points fits before the deadline
   anyway (they all sit behind combat 45–50). Default: A.
4. **The spending rule.** The amounts are in section G (boat fares up to about 400,000 gold for island gathering,
   obsidian 350,000, backpacks 250,000, and smaller ones). The task asks for no recommendation here.
   A: the planner spends nothing beyond today's standing order (Lost World Maps, backpacks) until a rule exists.
   B: Alex sets a rule from the list in G before task 005. Recommendation: none, as instructed. Default: A.

## How Alex verifies
1. `git show --stat HEAD` → only `tasks/004-achievement-map.md`, `tasks/004-achievement-map.report.md`,
   `docs/design/achievement-map.md`, `docs/design/snapshot/*.json` (5 files) and
   `scripts/design/achievement-map.mts`. `git status` → clean. (`docs/rework.md` was untracked; it went into its
   own commit just before, so that the status is clean and this commit holds only the task's files.)
2. `node --import tsx scripts/design/achievement-map.mts` → runs offline in under a second; the first lines read
   "91 achievements, 210 points. Account `alverus`: 15 points (api: account.json), 13 achievements complete (…
   sum of their points = 15)". The script asserts all three and exits non-zero if one fails.
3. Open `docs/design/achievement-map.md`: the Summary (19 lines) answers the three questions.
4. Section C: 91 rows, no empty cell. Quick count: `grep -c "^| [a-z_]* | [A-Z]" docs/design/achievement-map.md`
   → 91; `grep -c "|  |" docs/design/achievement-map.md` → 0.
5. The requests are listed below: 5 of the 12 allowed, no `Authorization` header, none to the local service.
6. `npm run typecheck` → passes. `npm run check` → "30 checks: 29 ok, 1 known defect reproduced, 0 failed", exit 0.
   Both were run after the last change.
7. Could not check myself: whether the pasted tables still equal the script's output after any later edit — rerun
   the script and compare (the sections carry the same headings).

## What was done / files
**Written**
- `docs/design/achievement-map.md` — the map, sections Summary and A–H.
- `docs/design/snapshot/` — `status.json`, `character.json`, `account.json`, `characters.json`,
  `achievements.json`: the response bodies as they came. Checked: no token, e-mail or other secret; they hold the
  account name, the five characters and public game data.
- `scripts/design/achievement-map.mts` — reads `public/data/*.json` and the snapshot, prints sections A–G as
  markdown. No request, no storage, no import from `src/`.
- This report.

**What is the script's output and what is written by hand.** In the map, everything under a line "script output:"
up to the next hand-written heading is the script's output, pasted unchanged. Written by hand: the Summary, "How to
read this", the prose of A–G, the gate graph in D, the pace table in E (log measurements), the purchases table in
G, and all of H. The script's own section headings ("## A. Season" …) were dropped in favour of the document's.

**Requests** (plain `fetch` in a scratch script, no `Authorization` header, 1.5 s apart)

| # | time (UTC) | URL | status |
|---|---|---|---|
| 1 | 2026-11-18T13:34:00.361Z | `GET https://api.artifactsmmo.com/` | 200 |
| 2 | 2026-11-18T13:34:02.333Z | `GET https://api.artifactsmmo.com/characters/First` | 200 |
| 3 | 2026-11-18T13:34:04.044Z | `GET https://api.artifactsmmo.com/accounts/alverus` | 200 |
| 4 | 2026-11-18T13:34:05.771Z | `GET https://api.artifactsmmo.com/accounts/alverus/characters` | 200 |
| 5 | 2026-11-18T13:34:07.760Z | `GET https://api.artifactsmmo.com/accounts/alverus/achievements?size=100` | 200 |

`GET /season_rewards` was not needed (`GET /` carries the whole track); one page held all 91 achievements. No
request failed, none was retried.

**Public web pages read** (through a fetch sub-agent; each fact in the map carries its URL):
`docs.artifactsmmo.com/` and its pages `concepts/achievements`, `concepts/seasons`, `concepts/seasonal_altar`,
`concepts/raids`, `concepts/events`, `concepts/gems-shop`, `concepts/stats_and_fights`, `concepts/tasks`,
`concepts/resting_and_using_items`, `concepts/pending_items`, `concepts/maps_and_movement`,
`api_guide/rate_limits`, `changelog`. `artifactsmmo.com/` and `/news` returned empty bodies; `/changelog` and
`docs…/resources/updates` are 404. No season-9 announcement with an end date was found.

**Measured from `logs/dev.log`** (read only; scratch scripts, deleted). Period 2026-11-03 00:00 → 2026-11-18 13:33
UTC.
- Every `api POST /my/<character>/action/… -> ok` line is one action. Per character, a gap under 10 minutes between
  two actions counts as running, a longer one as idle. Result: 215,212 actions, 1,583.8 running and 229.8 idle
  character-hours (87.3% running; 94.3% from 11-08), 135.9 actions per running character-hour.
- Running time split by the last productive action before it: 30.6 s per gather (136,093), 51.9 s per fight (23,798).
- Running time while the queue head (the `head <character>: […] Complete … tasks` lines) is a task-loop: 783.8
  character-hours, 402 `task/complete` in it → 1.95 hours per task.
- `action/offering` calls per day: 31 in all; 8, 11, 10 on 11-16, 17, 18.
- `⚡` spawn lines: 16 distinct spawns in 26 hours.
- `fight win · … +Ng` lines: 22,894 fights, 3.4 gold on average.

**Commands run**: `node` one-liners over `public/data/*.json`, `docs/api/openapi.json` and the snapshot (reading);
`grep`, `tail`, `wc` over `logs/dev.log`; the scratch scripts above; `node --import tsx
scripts/design/achievement-map.mts` (many times); `npx tsc --noEmit -p .`; `npm run typecheck`; `npm run check`;
`git status`, `git add`, `git commit`. Not run: `npm start`, `npm run dev`, `npm run build`, `npm run atlas`,
`npm run assets`, the fetch scripts; nothing opened `.ammo/*`, `game.db` or `.env`.

## Notes
**Stale or wrong numbers found**
- `docs/rework.md`: season start 2026-10-31 — the API says 2026-10-24. "13 / 210 points" — 15 at the snapshot (one
  achievement completed that day). "19 reward tiers" — 19 point thresholds, 21 entries.
- `CLAUDE.md` and `docs/game-actions.md:17`: "actions ~2000/hr" — the API's `rate_limits` say 5,000 an hour for
  actions, 2,000 for data, 300 for account reads. (Already in `docs/audit/domain-rules.md`.)
- `docs/game-actions.md`: says 32 actions and "`fight` lacks `participants`"; the OpenAPI document has 35 action
  paths (`rename`, `offering/accept`, `offering` are missing from the list) and the group fight uses `participants`.
- Rest: the docs say "1 second per 1% of missing HP (rounded up), minimum 3 s"
  (https://docs.artifactsmmo.com/concepts/resting_and_using_items/). The client and `domain-rules.md` use "5 HP per
  second". The two agree only at 500 max HP; the fleet is at 470–565 today and will not stay there.
- Movement: the docs say 5 seconds per map tile crossed; nothing in the client's estimates uses it.

**The atlas** (used as it is)
- No kill time (`kill: null`) and no farmable gate for nine normal monsters of level 45–51 (sea marauder,
  sandwarden, both desert scorpions, baby and red dragon, flameche, fennec) and for the five bosses behind keys or
  events. Every item that needs them has `costSec: null`. The map sets those gates to 50 and guesses 300 s a kill.
- `craftTrain` above skill 40 looks implausible: jewelrycrafting 41–49 is 4,500–6,400 hours a level, weapon and
  gear crafting 900–1,300. These carry most of the road's cost in E (H.12).
- `monsters[].minLevel` ignores access: `cultist_alchemist` is "safe at 45 on special gear" although reaching it
  needs a cultist cloak whose fabric is paid in raid currency.
- `gatherTrain.alchemy` is empty for skill 16–19 and 31–39 (no node gives XP there); the script falls back to
  `craftTrain.alchemy` for those levels.
- The atlas is not stale: generated 2026-11-17 from the data of 2026-11-04.

**The script computes beside `src/` instead of importing it.** `src/plan/xp.ts` imports the catalog, which imports
the API client; that does not load under plain `node --import tsx` the way the task wants the script run. The two
formulas needed (gather cooldown, craft seconds) are restated in the script with their source lines.

**Model limits worth knowing before the numbers are used**
- The order in E is greedy (points per marginal hour); it is a good order, not a proven best one.
- Levelling is "all five characters, plus the three gear crafting skills at the band's start". Fewer fighters or
  bought gear would be cheaper; the map does not explore that.
- Calendar floors of events count from today, not from the day the gate is met — optimistic for late achievements.
- Gold is never spent in the costs; G lists what gold could replace.

**Defects noticed, not fixed**
- No `transition` anywhere in the runner: gold rocks (mining 30) are underground, so mining training will stop
  finding its node at 30 — earlier than the level-35 break recorded in audit C.3. Same for rats (an interior).
- The event standing order sends one character per spawn; no monster or resource order has been dispatched yet
  (audit G.5 already says so).
- Offerings run at 8–11 a day against a cap of 15.
- `public/data/events.json` carries `cooldown_expiration` values from August 2026 — a leftover of the snapshot,
  harmless.

**Commit note.** `docs/rework.md` was untracked at the start. It is not this task's file, so it was committed on
its own ("Rework notes") before the task's commit, unchanged.

## To delete (Alex)
Nothing. The scratch files were in the session's scratch directory under `D:\Temp` and are deleted.
