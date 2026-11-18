# 005 — The planner's design: report

## Summary
- **This changes `docs/rework.md` decision 8, and both soft spots change the picture**: the leader has five characters at combat 40–42 and crafting 40 / 41 / 35 after at most 16–26 days; the atlas prices that crafting alone at 8,384 character-hours. `craftTrain` is a model artefact (H.12), nobody levels gear with the fighters (H.10); combat levelling is as the atlas says (910 character-hours to 40 for this fleet, not 8,976).
- **This fleet can expect 105–135 points by 2027-02-24, most likely about 120**: bronze likely, silver only if everything goes right, gold out. The leader has 59; this account is rank 63.
- **Levelling first is right, as a spine and not as an all-in**: with the leaderboard's costs it beats the map's greedy order by 13–24 points; "level to 50, then harvest" is best in three of five cost cases and ends at 15 points in the other two.
- **The planner**: one pure `decide(character, world)` recomputed at every step boundary, 90-minute steps compiled to today's queue items, one `interrupt()` for events, offerings and claims, measured costs replacing estimates, nobody ever paused.
- **Recommended options**: order recomputed, steps bound when started, plan-time reservations, gold to tolls first, all five characters behind a per-character flag.
- **Stage 1** is four small tasks (pure core and check script; runtime; Roadmap as home; gear by need), worth 68 points by the deadline in the model; transitions must follow at once.

## Decisions for Alex
1. **Tasks stop being the fleet's default work.** They took 49% of the running hours so far; Tasks Coins Fan
   (5 points, about 1,160 character-hours) becomes filler, done in gaps and last, and the gold from tasks (about
   6,000 a day) mostly stops.
   A: filler, the planner decides. B: one character stays on tasks for the gold.
   Recommendation: A. Default: A.
2. **Backpacks are no longer bought** (50,000 gold each for a few saved bank trips); the gold is kept for boat
   fares. Lost World Maps for all five stay.
   A: drop the backpacks. B: keep the standing order's list.
   Recommendation: A. Default: A.
3. **Deleted for good, one week after the planner runs all five characters**: the hive (goals, craft orders,
   earn-gold, continuous mode, its panel), pins and "Train pins", helpers and "Fleet helps", 🔁, the queue editor
   (queues stay visible, read-only), the Roadmap's band checklist, suggestions and fleet analysis; with the
   group-fight stage, the Group fight panel. Until then they are only switched off.
   A: delete after that week. B: keep everything switched off behind the flag until the season ends.
   Recommendation: A. Default: A.
4. **Gems** (the first bag comes at 50 points): may the planner spend them on spawning an event that carries open
   points? The docs do not say whether a non-member can, nor how many gems a bag holds.
   A: yes, by the spending rule. B: no — the first bag is reported and asked about.
   Recommendation: B. Default: B.

## How Alex verifies
1. `git log --oneline -2` → `005: planner design` on top of `Rework notes`. `git show --stat HEAD` → this report,
   `tasks/005-planner-design.md`, `docs/design/planner.md` and four files under `docs/design/snapshot/`
   (`leaderboard-accounts.json`, `leaderboard-characters.json`, `leader-achievements.json`,
   `leader-characters.json`). `git status` → clean.
2. `docs/design/planner.md` opens with a 20-line summary and has sections A–I. Two items are marked "not
   determinable" with the reason: whether healing runes are bought (D.2 — the bank's gear is not in a public
   read), and the event floors against the leaderboard (A.1).
3. The requests, all without a token or an `Authorization` header, 4 of the 6 allowed, about 2 s apart:

   | # | time (UTC) | URL | status |
   |---|---|---|---|
   | 1 | 2026-11-18 14:28:30 | `https://api.artifactsmmo.com/leaderboard/accounts?sort=achievements_points&page=1&size=100` | 200 |
   | 2 | 14:28:32 | `https://api.artifactsmmo.com/leaderboard/characters?sort=combat&page=1&size=100` | 200 |
   | 3 | 14:28:34 | `https://api.artifactsmmo.com/accounts/uaprsf/achievements?size=100` | 200 |
   | 4 | 14:28:36 | `https://api.artifactsmmo.com/accounts/uaprsf/characters` | 200 |

   None failed, none was retried. `grep -c Authorization docs/design/snapshot/lead*.json` → 0 in each.
4. The leaderboard facts: `leaderboard-accounts.json` → the first row is `uaprsf`, 59 points; `alverus` is
   position 63 with gold 155,976. `leader-characters.json` → levels 42, 42, 41, 40, 40; `frtCraft` has
   `weaponcrafting_level` 40, `gearcrafting_level` 41, `jewelrycrafting_level` 35. `leader-achievements.json` →
   `life_lover` completed 2026-11-17T02:58, `lich_please` 2026-11-16T16:42.
5. Three references to try: `src/state/loopkit.ts:61-76` (`nearest()` compares `x`, `y` and never a layer);
   `scripts/atlas.mts:96` (`obtain(it.code).tier <= 1` in the craft-training filter); `src/state/queue.ts:1449`
   (a finished step is applied only if the head's id is unchanged).
6. `npm run typecheck` → passes. `npm run check` → `30 checks: 29 ok, 1 known defect reproduced, 0 failed`,
   exit 0. I ran both after the documents were written.

Not checked by me: the numbers of the scratch model can no longer be re-run — the script is deleted, as the task
requires. Its first row reproduced the map's 101 points, which is the one check it had. The 598 loop at mining 30
(Notes) is read from the code, not run.

## What was done / files
**Written**: `docs/design/planner.md` (935 lines), the four snapshot files (the bodies as they came), this report.
Commit 1 `Rework notes` (`524c83e`): `docs/rework.md` as it was.

**Read in full**: `tasks/005-planner-design.md`, `docs/rework.md`, `docs/design/achievement-map.md`,
`scripts/design/achievement-map.mts`, `docs/audit/code-audit.md`, `docs/audit/domain-rules.md`, `CLAUDE.md`, the
reports of 002 and 003, `src/plan/queue.ts`, `src/plan/events.ts`, `src/state/eventorders.ts`, `scripts/atlas.mts`,
`scripts/atlas/econ.mts`.

**Sampled, not read in full** — the design's `path:line` references into these were each looked up, the rest
rests on the audit: `src/state/queue.ts` (lines 40–184, 327–334, 405–450, 468–494, 636–672, 1410–1638, and a list
of every function with its line); `src/state/hive.ts` (580–672, function list); `src/state/sync.ts` (30–90,
136–172); `src/api/actions.ts` (10–112); `src/state/loopkit.ts` (44–106); `src/ui/GroupFight.tsx` (30–60,
95–123); `scripts/atlas/model.mts` (1–60, 95–160); `src/plan/hive/types.ts` (28–41), `ctx.ts` (50–59), `skills.ts`
(48–55); `src/state/synced.ts` (35–57). **Export lists only**: `src/state/exec.ts`, `src/plan/roadmap.ts`,
`src/plan/jobgear.ts`, `src/plan/bis.ts`, `src/plan/xp.ts`, `src/plan/fleetcheck.ts`, the rest of
`src/plan/hive/*`, `src/catalog/atlas.ts`, the Roadmap, Fleet, Queue and Hive components, `scripts/harness/*`.
**Not opened**: `scripts/atlas/combat.mts` (used through its functions), the scenario files,
`docs/tasks/roadmap-tab.md` (headings and its line on the bank only).

**Commands run**: `git status`, `git diff --stat`, `git add`, `git commit` (twice), `git log`; `wc`, `grep`,
`sed -n` (reading); `node -e` over `docs/api/openapi.json`, `public/data/*.json` and the snapshot;
`node lb.mjs` (the four requests, a plain `fetch`); three offline scratch scripts under the session scratch
directory with `node --import tsx --experimental-webstorage --localstorage-file=<scratch>/scratch.db` — a
breakdown of the atlas's craft-training cost, the atlas price of the leader's levels with kill and gather times by
level, and the plan comparison (a copy of the map script with three knobs); `npm run typecheck`, `npm run check`.
No service was started or called, `.env` was not read, `.ammo/`, `game.db` and `logs/dev.log` were not opened,
nothing under `src/` or `scripts/` was changed. The scratch scripts, their storage file and the request log are
deleted.

**Web pages read** (through a fetch agent; rules only): `https://docs.artifactsmmo.com/concepts/` +
`stats_and_fights/`, `maps_and_movement/`, `events/`, `gems-shop/`, `skills/`, `seasonal_altar/`, `seasons/`,
`actions/`, `resting_and_using_items/`.

## Notes
- **Where the design contradicts the map or `docs/rework.md`**:
  - decision 8 and the map's summary points 1–3 (above);
  - map H.13: a resource event takes only characters with the skill at 35, so "five on every spawn" needs mining
    and woodcutting 35 on several characters — the design levels three;
  - map H.17 ("gold is never spent") is replaced by D.2, as decision 10 asks;
  - map G says the bank's gold is not in a public read: the accounts leaderboard carries the account's gold
    (155,976 on 2026-11-18; `docs/tasks/roadmap-tab.md` recorded about 107,000 the day before);
  - the map's boss gates (50) and boss costs; the offerings' XP (25% of a level each, docs), which the map does
    not count.
- **The season's start.** The leader's first achievement is from 2026-11-02 and the board has 410 accounts; that
  fits the announced opening of 2026-10-31 better than the API's 2026-10-24. If the four months run from the
  opening, the end is a week later than the working deadline. Not settled.
- **Defect, read not run — near in time.** `nearest()` ignores layers (`src/state/loopkit.ts:61-76`). At mining
  30 `trainingResourceFor` returns the gold rocks (`src/plan/hive/skills.ts:48-55`: coal is excluded at exactly ten
  levels below), which exist only underground; the miner walks to the same coordinates on the overworld, the
  gather answers 598, and the runner holds it as a network outage every 60 s without pausing
  (`src/state/queue.ts:1470-1475`). Fourth and Fifth mine at 24. If mining is pinned on them, this arrives before
  the planner does. The planning chat may want a guard earlier than stage 1.
- **The scratch model's limits**: it runs the map's greedy order and a fixed spine, not the bundle rule the
  design recommends (A.2 says so); it assumes five characters on every event spawn; it does not model the
  offerings' XP. The numbers order the plans; they are not forecasts to the point.
- **Drops in a group fight** are granted to each participant "independently" (docs). Whether that is three rolls
  a kill is an inference from the leader's 24 shards in 10 hours, not a documented rule.
- **The docs disagree with themselves on rest**: "1 second per 1% of missing HP" on one page, "1s per 5 HP" on
  another. Already parked in `docs/rework.md`.
- **This account on the board**: 13 points while the account read of the same day says 15 — the board lags.
- **Harness**: level steps are designed as `fight` and `gather` chunks rather than `train` items partly because
  the fake has no XP; a planner scenario then needs no level-up. Crafting levels still use `train` and have no
  scenario until the fake models XP.
- The design numbers the build tasks inside a stage only; it writes no task.

## To delete (Alex)
Nothing.
