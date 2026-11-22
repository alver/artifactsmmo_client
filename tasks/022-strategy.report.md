# 022 — The strategy experiment: what the fleet should play for first: report

## Summary
- **No restart** (run `0e2f` throughout); one outlook in my hours, **20:54:29 → 21:08:40 UTC, ended** (851.2 s); none failed;
  the characters never waited beyond a cooldown (longest gap 145.5 s, after a 48-potion craft; `logs/raw/2026-11-22/19–22`).
- **The leaders**: combat early (25 by season day 15), one character holding all three gear-crafting skills, craft-30 gear with
  event and tasks-coin materials, a **healing rune and cooked fish instead of potions**; often three fighters and two workers.
- **The result** (exact forward model, `logs/world/2026-11-22.json` to the deadline): P0 98 (report 021's road), P0s 100;
  best policy **S30 103** (all five at combat 41 on day 42 against 33–42; 44–46 at the end), C30/C35 101, S25 98 (best early:
  78 on day 42); the rest 92–97, D1 alone 69. **Consumables free (B): 121 under any rule.**
- **Silver is out by the model under every policy** (P0s 58 short, B 37); bronze only with free consumables (01-05/06). The
  missing points are capabilities — other layers 45, events 14, group bosses 11, `use` 10, raids 8 — not the order of work.
- **Believed**: about 51 of P0s's 100 rest on what play has shown; S30's +3 is the tasks filler, C's +1 rests on crafting
  levels priced 6–8× below their measured cost.
- **Recommendation**: 023 builds `P0s` (the stranding repair) with the executor's repairs and no first-tier policy.

## Decisions for Alex
1. **What the game is played for first** — the policies that survived, by the model (day 42 / the deadline): **P0s 73 / 100**
   (the rule as it is with the repair; recommended); **S30 66 / 103** (every fighter at 41 by day 42, the leaders' shape, its
   gain the tasks filler); **S25 78 / 98** (the most points soonest); C30 65 / 101 and C35 68 / 101 (crafting levels priced
   cheap; not believed). Every other policy ends below P0s.
2. **What may be spent on consumables**: nothing pays by the model. Potions are not on sale (0 Minor and 0 Health Potions sold
   in seven days); 37,000 algae (≈ 74,000 gold) cost 5 points in the model, five healing runes (50,000 gold) 3. The season's
   potions priced at the market's ingredients are 1.6–1.9 million gold, ten times the bank. Recommended: spend nothing on
   consumables now. Whether to try a healing rune in play against the model's verdict (the leaders all wear one) is Alex's.
3. **What follows 023**: the planner's order is not where silver is; the capabilities are (group boss fights, `use`
   objectives, the layers behind keys and items) and the potion forecast on 40+ sets. Which first is Alex's and the planning
   chat's.

## How Alex verifies
1. `git branch --show-current` → `rework`; `git log --oneline -3` → `022: strategy experiment`, `Rework notes` (`1680dda`),
   `021: fight solve`; `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the push's failure is in
   Claude Code's reply); `git log main --oneline -1` → `edaaf23`.
2. `git diff --stat 2db1053 HEAD -- src scripts public docs/design docs/audit` → empty.
3. `ls docs/strategy/022` → `snapshot/` (42 raw reads, all 200), `policies/` (11 patches), `runs/` (35 `.jsonl` and
   `measure.txt`), `tools/` (the scripts that made the tables, with a README), `requests.log` (the 42 requests: path, status,
   bytes, time), `sec3.json` (section 3's numbers).
4. `node docs/strategy/022/tools/tab.mjs docs/strategy/022/runs P0 P0s B-S30 B-B` → the rows of section 4 (P0 98, P0s 100, S30
   103, B 121), from the runs alone. `DETAIL=1` prints the tables a policy.
5. `docs/strategy/022/runs/P0.jsonl`, its `done` line → `expected` 98, 36 completions, `steps` 9014 (report 021's road).
6. `git apply --check docs/strategy/022/policies/*.patch` → no output (every patch applies to HEAD; I ran it).
7. `logs/status.json` → `"run": "0e2f"`; the journal's `outlook` records after 17:49 UTC: 17:54:28 and 21:08:40, both ended (and
   the next, due about 00:08 UTC, not seen by me). The raw log `logs/raw/2026-11-22/19.log`–`22.log`: every `api POST
   /my/<who>/action/… -> ok` line, per character the longest gap — Third 145.5 s (ending 19:46:54, after
   `crafting {"code":"minor_health_potion","quantity":48}`), Second 126.3 s (20:08:18, after a long `move`), First, Fourth,
   Fifth 33–34 s; no `-> 4xx/5xx` line (I checked to 22:45 UTC).
8. **Not checked by me**: a policy re-played from its patch — in a scratch copy of the tree `git apply docs/strategy/022/
   policies/all.patch`, then `node --import tsx docs/strategy/022/tools/drive.mts --tree <copy> --world logs/world/2026-11-22.json
   --cfg '{"home":1,"spine":30}'` → the lines of `runs/B-S30.jsonl` (about an hour alone).
## What the leaders did

**Sources.** The reads of 2026-11-22 19:23:28–19:24:33 UTC (`docs/strategy/022/snapshot/`, 42 public GETs, all 200;
the log `D:\Temp\a022\out\requests.log`): the leaderboard by achievement points, pages 1–2 (200 of 431 accounts), and
`/accounts/{a}/characters` + `/accounts/{a}/achievements?completed=true` for 17 accounts (the top ten; `automode`, the
fifth best non-member; `shuxart`, `FRALEXAlexander`, `chewbaccoin`, `Odiodin`, `Zetark`, the five just above this
account; `alverus`) — every achievements read is complete on one page (`total` ≤ 44). The old read: the leaderboard of
**2026-11-18 14:28 UTC** (`docs/design/snapshot/leaderboard-accounts.json`, page 1 = 100 of 410 accounts; the time from
`docs/design/planner.md:4`), the character board of the same read (`leaderboard-characters.json`, the first 100
characters) and `leader-characters.json` (uaprsf). Static data: `public/data/*.json`. Season day 1 = 2026-10-24
(`manifest.json` `start_date`); the deadline 2027-02-24 00:00 UTC (`src/plan/planner/config.ts:19`) is the start of
season day 124; today 19:24 UTC is day 30, 93.2 days before the deadline. Every table below is printed by
`node D:\Temp\a022\out\sec1-analyze.mjs` (read-only: the snapshot files and `public/data`), except the market book
(`npm run market`).

### The leaderboard

- **This account: position 41 of 431, 29 points on the board** (`leaderboard-accounts-1.json`). Its completed list
  sums to **30** (`acc-alverus-achievements.json`): `expert_miner`, completed 18:46:53 UTC, is not on the board read
  37 minutes later. `hunter2` (61 vs 62, newest 19:03:21) and `chewbaccoin` (32 vs 33, newest 19:10:06) lag the same
  way, while `Big_Shark`'s 14:37 completion is counted: the board is recomputed some time between 37 min and 4.8 h
  after a completion (guess: periodically). Below, the board's numbers are the board's; the read accounts also get
  their exact sums from `completed_at`.
- **Nobody is at bronze or silver**: 0 accounts at or above 105, 0 at or above 158; the top is 77 (`uaprsf`).
- On 11-18 this account was 63rd with 13 on the board (15 by its account read of 13:34, `docs/design/snapshot/account.json`).

**The top thirty, 11-18 14:28 → 11-22 19:23 UTC (4.21 days), and the day a linear pace from now reaches 158**
(board: `leaderboard-accounts.json` → `leaderboard-accounts-1.json`, `achievements_points`; last column: the sum of
the points of the achievements whose `completed_at` falls before each time, `acc-<a>-achievements.json`):

| # | account | member | 11-18 (#) | now | +pts | pts/day | 158 at that pace: season day (date) | read accounts by `completed_at`: 11-18 → now, pts/day, 158 on |
|---|---|---|---|---|---|---|---|---|
| 1 | uaprsf | y | 59 (1) | 77 | 18 | 4.28 | 49 (2026-12-11) | 59 → 77, 4.28, 49 (12-11) |
| 2 | Fox___ | y | 51 (3) | 65 | 14 | 3.33 | 58 (2026-12-20) | 51 → 65, 3.33, 58 (12-20) |
| 3 | hunter2 | y | 47 (5) | 61 | 14 | 3.33 | 59 (2026-12-21) | 47 → 62, 3.57, 57 (12-19) |
| 4 | Pischke | n | 42 (12) | 59 | 17 | 4.04 | 55 (2026-12-17) | 42 → 59, 4.04, 55 (12-17) |
| 5 | Big_Shark | n | 43 (11) | 58 | 15 | 3.57 | 58 (2026-12-20) | 44 → 58, 3.33, 60 (12-22) |
| 6 | Wudagem | n | 43 (9) | 58 | 15 | 3.57 | 58 (2026-12-20) | 43 → 58, 3.57, 58 (12-20) |
| 7 | krolov | y | 51 (4) | 55 | 4 | 0.95 | 139 (2027-03-11), after the deadline | 51 → 55, 0.95, 139 |
| 8 | Elemental | n | 43 (8) | 54 | 11 | 2.62 | 70 (2027-01-01) | 44 → 54, 2.38, 74 (01-05) |
| 9 | Turbofish | y | 45 (6) | 53 | 8 | 1.90 | 86 (2027-01-17) | 45 → 53, 1.90, 86 (01-17) |
| 10 | TheCarriedOne | y | 52 (2) | 53 | 1 | 0.24 | 472 (2028-02-07), after | 52 → 53, 0.24, 472 |
| 11 | aropan | y | 39 (18) | 50 | 11 | 2.62 | 72 (2027-01-03) | |
| 12 | automode | n | 44 (7) | 49 | 5 | 1.19 | 122 (2027-02-22) | 44 → 49, 1.19, 122 (02-22) |
| 13 | Alrick00 | n | 40 (14) | 49 | 9 | 2.14 | 81 (2027-01-12) | |
| 14 | _zero_ | y | 43 (10) | 47 | 4 | 0.95 | 147 (2027-03-19), after | |
| 15 | Myoto | y | not on the 11-18 page (≤ 2 then, or renamed — unknown) | 47 | — | — | — | |
| 16 | brinko | n | 42 (13) | 47 | 5 | 1.19 | 124 (2027-02-24), after | |
| 17 | at0mstr0m | n | 40 (15) | 47 | 7 | 1.66 | 97 (2027-01-28) | |
| 18 | ront_tv | y | 39 (16) | 46 | 7 | 1.66 | 98 (2027-01-29) | |
| 19 | br_lemes | y | 37 (20) | 46 | 9 | 2.14 | 83 (2027-01-14) | |
| 20 | Trobyss | y | 34 (24) | 44 | 10 | 2.38 | 78 (2027-01-09) | |
| 21 | ShadyBliss | n | 29 (31) | 42 | 13 | 3.09 | 68 (2026-12-30) | |
| 22 | LewisHeidrick | n | 35 (23) | 42 | 7 | 1.66 | 100 (2027-01-31) | |
| 23 | Tomlox | y | 38 (19) | 42 | 4 | 0.95 | 152 (2027-03-24), after | |
| 24 | jowrjowr | y | 36 (22) | 41 | 5 | 1.19 | 129 (2027-03-01), after | |
| 25 | Grewaa | y | 32 (25) | 39 | 7 | 1.66 | 102 (2027-02-02) | |
| 26 | Donatien | n | 24 (37) | 39 | 15 | 3.57 | 64 (2026-12-26) | |
| 27 | marcelomollaj | n | 36 (21) | 39 | 3 | 0.71 | 197 (2027-05-08), after | |
| 28 | rs_appez | y | 32 (27) | 38 | 6 | 1.43 | 114 (2027-02-14) | |
| 29 | Steavi | n | 30 (28) | 37 | 7 | 1.66 | 103 (2027-02-03) | |
| 30 | Ncookie | n | 20 (47) | 36 | 16 | 3.80 | 62 (2026-12-24) | |
| 41 | **alverus** | n | 13 (63) | 29 | 16 | 3.80 | 64 (2026-12-26) | 15 → 30, 3.57, 66 (12-28) |

- Over the four days the top thirty made **1.90 points a day (median; 29 of 30 on the old page), 0.24 to 4.28**; the
  six best 3.3–4.3. At its own pace **22 of the 29 pass 158 before the deadline**, the earliest `uaprsf` on day 49
  (12-11); 7 do not. A linear pace is not a forecast: silver needs 158 of the 210, so for a leader it means most of
  the content behind combat 45–50, the island, bosses and raids (`docs/design/achievement-map.md` D) — whether that
  holds is not in these reads.
- **What silver asks of this account**: 128 points in 93.2 days, **1.37 a day** from 30 (1.38 from the board's 29) —
  faster than 8 of the 29 measured top-thirty accounts went these four days, slower than their median 1.90, and kept
  to the end. Its own pace: 3.80 a day by the
  board over the four days (13 → 29), 3.57 by `completed_at` (15 → 30) → 158 on day 64–66 (12-26 to 12-28); **2.43
  over the last 7 days → day 83 (2027-01-14); 1.64 over the last 14 → day 108 (2027-02-08)**. Its last four days
  were cheap points (adept, the gathering 20s and 30s, below); the model (report 021, cited in `tasks/022-strategy.md`)
  expects 82–103 at the deadline, 0.56–0.78 a day from here.

**Points by season day, from `completed_at`** (read accounts; dN = points completed by the end of day N):

| account | board | Σ completed | first (day) | d10 | d15 | d20 | d24 | d26 | d28 | d30 | pts/day, last 7 d | last 14 d |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| uaprsf | 77 | 77 | 10 | 3 | 26 | 40 | 52 | 60 | 67 | 77 | 4.14 | 3.57 |
| Fox___ | 65 | 65 | 10 | 2 | 20 | 36 | 50 | 55 | 62 | 65 | 2.57 | 2.93 |
| hunter2 | 61 | 62 | 9 | 1 | 21 | 33 | 39 | 52 | 55 | 62 | 3.43 | 2.86 |
| Pischke | 59 | 59 | 10 | 1 | 11 | 27 | 36 | 42 | 48 | 59 | 3.43 | 3.29 |
| Big_Shark | 58 | 58 | 10 | 1 | 13 | 25 | 43 | 44 | 54 | 58 | 2.57 | 3.14 |
| Wudagem | 58 | 58 | 10 | 4 | 13 | 28 | 38 | 43 | 46 | 58 | 3.14 | 3.07 |
| krolov | 55 | 55 | 10 | 3 | 24 | 41 | 49 | 51 | 51 | 55 | 1.29 | 2.21 |
| Elemental | 54 | 54 | 10 | 2 | 20 | 37 | 42 | 44 | 46 | 54 | 2.14 | 2.29 |
| Turbofish | 53 | 53 | 10 | 1 | 10 | 30 | 41 | 45 | 46 | 53 | 2.14 | 3.07 |
| TheCarriedOne | 53 | 53 | 10 | 2 | 8 | 26 | 48 | 52 | 53 | 53 | 1.29 | 3.21 |
| automode | 49 | 49 | 10 | 1 | 13 | 29 | 44 | 45 | 47 | 49 | 1.43 | 1.93 |
| shuxart | 32 | 32 | 10 | 2 | 6 | 22 | 24 | 27 | 32 | 32 | 1.29 | 1.71 |
| FRALEXAlexander | 32 | 32 | 16 | 0 | 0 | 14 | 22 | 25 | 27 | 32 | 2.29 | 2.07 |
| chewbaccoin | 32 | 33 | 10 | 2 | 8 | 22 | 27 | 27 | 30 | 33 | 1.29 | 1.71 |
| Odiodin | 31 | 31 | 10 | 3 | 7 | 13 | 27 | 29 | 30 | 31 | 0.86 | 1.64 |
| Zetark | 31 | 31 | 13 | 0 | 4 | 10 | 18 | 24 | 29 | 31 | 2.29 | 1.93 |
| **alverus** | 29 | 30 | 12 | 0 | 5 | 11 | 13 | 15 | 26 | 30 | 2.43 | 1.64 |

- **Nobody played before day 9.** The first completion of any read account is 2026-11-01 23:25 UTC (`hunter2`,
  `feather_me_impressed`, day 9); `novice` falls on 11-02/11-03 (days 10–11) for the top ten, on 11-05 (day 13) for
  this account. So day 30 is about 21 days of play for the leaders (the game announced 10-31; the API says 10-24).
- The leader has not slowed: 3.57 a day over 14 days, 4.14 over the last 7. At day 24 the leader had 52, the best
  non-members 36–43; this account had 13.

### The order

For the leader and the best non-members — `Pischke` (59), then `Big_Shark` and `Wudagem` tied at 58 (the board puts
`Big_Shark` 5th; both are shown) — every completed achievement with its season day (`completed_at`), against this
account. **gate (data)**: what the objectives ask, from `public/data` — `combat N` (a combat_level), a skill and level
(the lowest node that yields a gathered item, `resources.json`; a craft's `craft.level`, `items.json`), `kill LvN` /
`drop LvN` (the monster's level, `monsters.json`; `boss` = `type: boss`), `⚡` only during an event (the monster or
node is on no static tile of `maps.json`), `*` only underground. A skill gate is hard: on that day some character of
the account had at least that level. A kill's monster level is not the character's level. **map**: the combat gate
the map priced it at (`docs/design/achievement-map.md` C, the atlas's estimate; `·` = done by this account on 11-18,
no gate given).

| achievement | pts | gate (data) | map | uaprsf | Pischke | Big_Shark | Wudagem | alverus |
|---|---|---|---|---|---|---|---|---|
| novice | 1 | combat 10 | · | 10 | 10 | 10 | 10 | 13 |
| in_every_color | 1 | kill Lv7 | · | 10 | 12 | 11 | 10 | 14 |
| feather_me_impressed | 1 | kill Lv1 | · | 10 | 13 | 11 | 10 | 12 |
| miner | 1 | mining 10 | · | 12 | 17 | 13 | 11 | 18 |
| fisherman | 1 | fishing 10 | · | 13 | 17 | 16 | 28 | 22 |
| lumberjack | 1 | woodcutting 10 | · | 13 | 20 | | 29 | 22 |
| king_of_the_forest | 2 | kill Lv15 | · | 13 | 16 | 13 | 12 | 20 |
| slimed_to_none | 3 | kill Lv15 boss | 30 | 13 | 21 | 14 | 19 | |
| a_helping_hand | 2 | favors | — | 14 | 18 | 21 | 14 | 28 |
| highway_patrol | 2 | kill Lv15 | 10 | 15 | 26 | 18 | 16 | 27 |
| adept | 2 | combat 25 | 25 | 15 | 15 | 15 | 15 | 28 |
| tasks_farmer | 1 | tasks | · | 15 | 27 | 15 | 22 | 16 |
| i_want_bacon | 2 | kill Lv19 | — | 15 | 18 | 21 | 16 | 28 |
| intermediate_fisherman | 1 | fishing 20 | — | 15 | 15 | 18 | 30 | |
| tanners_exchange | 2 | buy at tailor | 10 | 15 | 30 | 18 | 15 | 27 |
| amateur_lumberjack | 1 | woodcutting 1 | · | 15 | 20 | 17 | 17 | 18 |
| turning_treasures_to_gold | 2 | sell to nomadic / fish merchant ⚡ | 1 | 15 | 29 | 18 | 29 | |
| intermediate_miner | 1 | mining 20 | — | 16 | 14 | 20 | 17 | 27 |
| bite_oh_algae | 2 | fishing 1 | · | 17 | 19 | 22 | | 26 |
| the_new_bandit | 2 | kill Lv25 ⚡ | 30 | 17 | | 21 | 20 | |
| intermediate_lumberjack | 1 | woodcutting 20 | — | 17 | 14 | 20 | | 29 |
| the_reaper | 3 | kill Lv28 | 30 | 18 | 25 | 23 | 20 | |
| ecologist | 1 | recycling | — | 19 | 29 | 18 | 18 | |
| cabinet_maker | 1 | woodcutting 30 | — | 20 | 21 | | 22 | |
| worker | 1 | mining 30 | — | 20 | 23 | 26 | 22 | |
| expert_miner | 1 | mining 30 * | — | 20 | 19 | 27 | 23 | 30 |
| expert_fisherman | 1 | fishing 30 | — | 20 | 18 | 22 | | |
| expert_lumberjack | 1 | woodcutting 30 | — | 21 | 17 | 24 | 25 | |
| alchemist | 2 | alchemy 30 | — | 21 | 14 | 24 | 21 | 29 |
| cult_destroyer | 2 | kill Lv35 ⚡ | 40 | 22 | | 27 | 27 | |
| diamond_in_the_sky | 3 | mining 35 (+ strange apparition ⚡, map) | — | 23 | | | | |
| arachnophobia_conquered | 2 | kill Lv20 | 25 | 24 | 27 | 21 | 24 | |
| lich_please | 2 | kill Lv30 boss | 50 | 24 | | 27 | 21 | |
| life_lover | 4 | drop Lv30 boss | 50 | 25 | | 30 | 30 | |
| take_her_down | 2 | kill Lv35 boss | 50 | 25 | | | | |
| professional_fisherman | 1 | fishing 40 | — | 26 | 24 | | | |
| professional_miner | 1 | mining 40 * | — | 26 | 23 | | | |
| professional_lumberjack | 1 | woodcutting 40 | — | 27 | 23 | 28 | | |
| crafted_with_honor | 3 | jewelrycrafting 35 | — | 28 | | | | |
| clean_the_lab | 3 | kill Lv40 (Rosenblood House, a cultist cloak, map) | 45 | 28 | | | | |
| secure_the_island | 3 | kill Lv45 ⚡ (Sandwhisper Isle) | 50 | 29 | | | | |
| blood_of_the_cursed | 3 | kill Lv40 boss | 50 | 29 | | | | |
| king_of_the_goblins | 3 | drop Lv40 | — | 29 | | | 30 | |
| pearl_fisher | 1 | fishing 20 (1/300; 1/100 at 40) | — | 30 | | | | |
| amateur_alchemist | 1 | alchemy 1 | · | | 15 | 21 | | 15 |
| amateur_miner | 1 | mining 1 | · | | 20 | 12 | 10 | 12 |
| expert_alchemist | 1 | alchemy 40 | — | | 22 | | | |
| intermediate_alchemist | 1 | alchemy 20 | — | | 25 | | | |
| master_alchemist | 2 | alchemy 50 (island) | — | | 27 | | | |
| amateur_fisherman | 1 | fishing 1 | · | | 28 | | 30 | 16 |
| catch_and_cook | 2 | cooking 50 (island) | — | | 29 | | | |
| palm_paradise | 2 | woodcutting 50 (island) | — | | 30 | | | |
| master_lumberjack | 2 | woodcutting 50 (island) | — | | 30 | | | |
| cultist_purifier | 4 | kill Lv33 | 32 | | | 28 | 25 | |

**The levels the order proves** (the first day a hard gate of a completed achievement shows a character at that
level, `N@dD`):

| account | combat | mining | woodcutting | fishing | alchemy | cooking | jewelrycr. |
|---|---|---|---|---|---|---|---|
| uaprsf | 10@d10 25@d15 | 20@d16 30@d20 35@d23 40@d26 | 20@d17 30@d20 40@d27 | 20@d15 30@d20 40@d26 | 30@d21 | | 35@d28 |
| Pischke | 10@d10 25@d15 | 20@d14 30@d19 40@d23 | 20@d14 30@d17 40@d23 50@d30 | 20@d15 30@d18 40@d24 | 30@d14 40@d22 50@d27 | 50@d29 | |
| Big_Shark | 10@d10 25@d15 | 20@d20 30@d26 | 20@d20 30@d24 40@d28 | 20@d18 30@d22 | 30@d24 | | |
| Wudagem | 10@d10 25@d15 | 20@d17 30@d22 | 30@d22 | 20@d30 | 30@d21 | | |
| alverus | 10@d13 25@d28 | 20@d27 30@d30 | 20@d29 | 10@d22 | 30@d29 | | |

What the order says:
- **Combat 25 came on day 15 (11-07) for all four** — five days after their first achievement; this account's on
  day 28 (11-20), 13 days later. The combat levels on 11-18 (day 26) were: `uaprsf` 40–42, `Wudagem` 34–41, `Big_Shark` 35 and 40,
  `Pischke` 39 (the character board of 11-18); now 43–49, 37–44, 38–45, 42.
- **Gathering 30 in every lane by day 17–22** (`uaprsf` all three on day 20; `Pischke` 17–19), **40 by day 23–27,
  50 by day 27–30** (`Pischke`: alchemy, woodcutting, cooking). This account: mining 30 proved on day 30, woodcutting
  20 on day 29, fishing 10.
- **Bosses below the map's gates**: King Slime (a level-15 boss; map 30) on days 13–21 — `uaprsf`'s on day 13, two
  days *before* its `adept`, so below combat 25; the Lich (level 30; map 50) on days 21–27, `Wudagem`'s on day 21 when
  its characters were at most 34–41 five days later, `uaprsf`'s on day 24 at about 40 (40–42 on day 26); the Goblin
  Priestess (35; map 50) on day 25 at about 40 and Rosenblood (40; map 50) on day 29 at 43–49, by `uaprsf`. So 5 to
  about 20 levels below the map's gates. How `Pischke`, with one fighter and four characters at combat 1, fought the
  King Slime is not in the reads. `life_lover` (24 shards, 1/50 from the lich) on day 25 and twice on day 30.
- **Events early**: `the_new_bandit` (bandit camp, level 25) days 17–21, `cult_destroyer` (cultist emperor, 35) days
  22–27, `turning_treasures_to_gold` (nomadic merchant) days 15–29.
- **This account first** (they later or never): `amateur_alchemist`, `amateur_fisherman`, `amateur_miner` (the
  leader has none of the three: 6,000 low gathers for a point each), and `tasks_farmer` before `Pischke` (d27) and
  `Wudagem` (d22); `feather_me_impressed`, `amateur_lumberjack`, `tanners_exchange` before `Pischke`; `fisherman`,
  `lumberjack`, `bite_oh_algae`, `intermediate_lumberjack` before `Wudagem`. Nothing worth more than 2 points.
- **They have, this account not**: `uaprsf` 25 achievements / 50 points, `Pischke` 19 / 29, `Big_Shark` 15 / 30,
  `Wudagem` 15 / 32. **Done by at least three of the four, not by this account: 15 achievements, 27 points** —
  `slimed_to_none` 3, `the_reaper` 3, `life_lover` 4, `lich_please` 2, `arachnophobia_conquered` 2,
  `the_new_bandit` 2, `cult_destroyer` 2, `turning_treasures_to_gold` 2 (19 points of fights, bosses and events),
  and `ecologist`, `worker`, `cabinet_maker`, `intermediate_fisherman`, `expert_fisherman`, `expert_lumberjack`,
  `professional_lumberjack` 1 each (gathering 20–40, refining, recycling).

### Levels against points

Per account (`acc-<a>-characters.json`: `level`, `*_level`; points from the board):

| account | pts | m | combat (sorted) | max | med | wc max/med | gc max/med | jc max/med | the crafter: combat, wc/gc/jc |
|---|---|---|---|---|---|---|---|---|---|
| uaprsf | 77 | y | 49 47 46 46 43 | 49 | 46 | 41/1 | 45/2 | 40/1 | frtCraft 46: 41/45/40 |
| Fox___ | 65 | y | 46 44 44 30 23 | 46 | 44 | 40/2 | 40/1 | 35/1 | Fox_1 46: 40/40/35 |
| hunter2 | 61 | y | 48 45 44 42 40 | 48 | 44 | 35/1 | 40/1 | 34/1 | Jaheira 48: 35/40/34 |
| Pischke | 59 | n | 42 1 1 1 1 | 42 | 1 | 30/1 | 25/1 | 13/1 | Thurolf 1: 30/25/13 |
| Big_Shark | 58 | n | 45 40 38 1 1 | 45 | 38 | 35/1 | 35/1 | 32/1 | IronMan 38: 35/35/32 |
| Wudagem | 58 | n | 44 44 42 39 37 | 44 | 42 | 40/1 | 41/2 | 40/1 | split: Boris 37 wc 40, Zeni 44 gc 41, Yuri 42 jc 40 |
| krolov | 55 | y | 43 43 41 21 15 | 43 | 41 | 30/1 | 31/1 | 30/1 | Karina 15: 30/31/30 |
| Elemental | 54 | n | 42 42 41 22 22 | 42 | 41 | 35/1 | 40/1 | 31/1 | Ron 42: 35/40/31 |
| Turbofish | 53 | y | 42 41 37 23 22 | 42 | 37 | 33/2 | 40/2 | 35/1 | Dorothy 42: 33/40/35 |
| TheCarriedOne | 53 | y | 40 39 38 38 38 | 40 | 38 | 41/1 | 41/1 | 31/1 | Carried_B1 38: 41/41/31 |
| automode | 49 | n | 41 33 27 21 19 | 41 | 27 | 39/1 | 33/2 | 38/1 | split: cruise 41 wc 39, daemon 33 gc 33, yolo 27 jc 38 |
| shuxart | 32 | n | 35 29 27 21 20 | 35 | 27 | 31/1 | 31/1 | 31/1 | Kellhus 35: 31/31/31 |
| FRALEXAlexander | 32 | n | 31 18 18 17 17 | 31 | 18 | 21/7 | 21/1 | 25/1 | split |
| chewbaccoin | 32 | y | 35 35 20 18 13 | 35 | 20 | 24/1 | 27/1 | 24/1 | split |
| Odiodin | 31 | y | 29 27 24 19 12 | 29 | 24 | 22/1 | 19/2 | 17/1 | Bean 29: 22/19/1 |
| Zetark | 31 | y | 34 26 26 24 23 | 34 | 26 | 30/1 | 26/1 | 25/1 | split |
| **alverus** | 29 | n | 25 24 24 23 23 | 25 | 24 | 20/2 | 23/2 | 21/1 | split: Second 25 wc 20, Third 24 gc 23, Fourth 23 jc 21 |

- **The top combat level ranks the points almost exactly**: Spearman 0.96 between points and the account's highest
  combat level over the 17 accounts; 0.71 for the median combat level, 0.69 for the best weapon- and gearcrafting,
  0.58 for jewelrycrafting. Every top-ten account has a character at 40+; the five accounts just above this one top
  out at 29–35.
- **Many points and low combat: `Pischke`** — 59 points (4th, the best non-member) with one fighter at 42 and four
  characters at **combat 1**, each a gatherer at 50 (Rudolph fishing + cooking, Thurolf mining (+ wc 30 / gc 25 / jc
  13), Theo alchemy, Susi woodcutting). Its points are the gathering lanes to 50, alchemy and cooking (four on the
  island: `master_alchemist`, `catch_and_cook`, `palm_paradise`, `master_lumberjack`, days 27–30), and the cheap kills
  one fighter can do (`the_reaper` d25, `arachnophobia_conquered` d27, `slimed_to_none` d21).
- **High combat and few points: none with few** — the nearest is `TheCarriedOne` (all five at 38–40, 53 points, +1 in
  four days, 0.24 a day) and `krolov` (+4). Combat alone did not make their last four days.
- **One character holds all three gear-crafting skills in 9 of the top ten** (and `shuxart`); it is usually also a
  fighter at 38–48 (`frtCraft`, `Fox_1`, `Jaheira`, `IronMan`, `Ron`, `Dorothy`, `Carried_B1`). `Wudagem` and `automode`
  split them over three characters as this account does (`src/plan/planner/config.ts:27-32`).
- **Four days, 11-18 → 11-22** (the character board of 11-18 lists characters down to level 30 only): combat +1 to +7
  for most, +8 to +10 for `hunter2` (Pablo 37→45, Jaheira 38→48); `uaprsf` 42/40/41/42/40 → 46/43/47/49/46. The
  crafters: `frtCraft` 40/41/35 → 41/45/40, `Fox_1` 35/35/34 → 40/40/35, `Carried_B1` 31/32/31 → 41/41/31,
  `Jaheira` 33/37/31 → 35/40/34, `Dorothy` 30/36/30 → 33/40/35.

### What they wear

The characters' `*_slot` at 19:24 UTC, by combat band. A character whose weapon is a tool (`items.json` `subtype:
tool`) wears a gathering set and is left out: at 30–34 3 of 4 characters are in a fight set, at 35–39 **3 of 11**, at
40+ **18 of 29**. The sample below 40 is small. Per piece: the crafting skill and level (`items.json` `craft`;
wc/gc/jc = weapon/gear/jewelrycrafting, nc = not crafted) and what its recipe needs through every level of
ingredients: ⚡ a material only an event gives, ¢ tasks coins (`tasks_trader`), B a boss drop, R a raid, A only an
achievement's reward; a material with any plain source (a static monster or node) carries no mark. No worn piece needs
NPC gold.

| slot | combat 30–34 (3 in a fight set) | 35–39 (3) | 40+ (18) |
|---|---|---|---|
| weapon | obsidian_battleaxe 1 (wc30 ⚡), battlestaff 1 (wc20), greater_dreadful_staff 1 (wc30 ¢) | gold_sword 2 (wc30 ⚡), greater_dreadful_staff 1 (wc30 ¢) | gold_sword 5 (wc30 ⚡), obsidian_battleaxe 4 (wc30 ⚡), mithril_sword 2 (wc40 ¢), bloodblade 2 (wc40 ¢), elderwood_staff 2 (wc30 ⚡), diamond_sword 1 (wc35 ⚡¢), +2 |
| shield | iron_shield 2 (gc10), slime_shield 1 (gc20 B) | gold_shield 1 (gc30 ⚡¢), wooden_shield 1, iron_shield 1 | gold_shield 8 (gc30 ⚡¢), dreadful_shield 3 (gc35 ¢), iron_shield 2 (gc10), slime_shield 2 (gc20 B), fire_shield 1, air_shield 1 (gc40 ⚡B), +1 |
| helmet | magic_wizard_hat 2 (gc20), gold_mask 1 (gc30 ⚡) | gold_mask 2, gold_helm 1 (gc30 ⚡) | jester_hat 5 (gc35 ¢), lich_crown 2 (nc B), gold_mask 2, gold_helm 2 (gc30 ⚡), mithril_helm 1 (gc40 ⚡¢), strangold_helmet 1 (gc35 ⚡¢), +5 |
| body | stormforged_armor 1 (gc25 ⚡¢), steel_armor 1 (gc20), bandit_armor 1 (nc ⚡) | skeleton_armor 2 (gc20), gold_platebody 1 (gc30 ⚡) | stormforged_armor 4 (gc25 ⚡¢), royal_skeleton_armor 2 (gc30), bandit_armor 2 (nc ⚡), piggy_armor 2, snakeskin_armor 2 (gc25 ⚡¢), mithril_platebody 1 (gc40 ⚡¢), +5 |
| legs | gold_platelegs 1 (gc30 ⚡), steel_legs_armor 1 (gc20 B), snakeskin_legs_armor 1 (gc25) | snakeskin_legs_armor 2 (gc25), steel_legs_armor 1 (gc20 B) | gold_platelegs 9 (gc30 ⚡), royal_skeleton_pants 2 (gc30), enchanter_pants 2 (gc35 ⚡¢), wrathpants 1 (gc40 B R), strangold_legs_armor 1 (gc35 ⚡¢), mesh_legs_armor 1 (gc45 ⚡R), +2 |
| boots | snakeskin_boots 1, steel_boots 1 (gc20), old_boots 1 (nc) | steel_boots 2, hard_leather_boots 1 (gc20) | gold_boots 6, lizard_boots 5 (gc30 ⚡¢), old_boots 2 (nc), snakeskin_boots 2 (gc20), mithril_boots 1 (gc40 ⚡¢), hard_leather_boots 1, +1 |
| rings (2) | gold_ring 2 (jc30), ring_of_the_adept 2 (nc A), ring_of_chance 1 (jc20 ¢B), life_ring 1 (jc15) | steel_ring 4 (jc20), royal_skeleton_ring 2 (jc30) | **royal_skeleton_ring 17 (jc30)**, topaz_ring 6 (jc30 ¢), gold_ring 3 (jc30), celest_ring 2 (jc40 ⚡B¢), mithril_ring 2 (jc40 ⚡), malefic_ring 2 (jc35 ⚡¢), +2 |
| amulet | dreadful_amulet 2 (jc20 B), sapphire_amulet 1 (jc25 ¢) | greater_dreadful_amulet 1 (jc30 B), air_and_water_amulet 1 (jc10), skull_amulet 1 (jc20 B) | topaz_amulet 6 (jc25 ¢), fire_and_earth_amulet 3 (jc10), prospecting_amulet 2 (jc30 ¢), greater_sapphire_amulet 1, greater_ruby_amulet 1 (jc40 ¢), lost_amulet 1 (jc30), +4 |

- **The crafted pieces worn at 40+ are craft level 30** — median 30 in each skill (weaponcrafting n = 17, max 40;
  gearcrafting n = 84, max 45; jewelrycrafting n = 52, max 40); at 30–39 the median is 20 (gear, jewelry) and 30
  (weapons). Only 9 of 162 pieces at 40+ are not crafted (lich crown 2, bandit armor 2, old boots 2, ring of the
  adept 2, death knight sword 1).
- **Of the 162 pieces worn at 40+, 77 need an event material, 74 tasks coins, 11 a boss, 2 a raid, 0 gold; 44 none of
  these.** The gear road the fleets took to 40+: the **gold tier at craft 30** (gold bars, mining 30 underground) with
  **demon horns** and **bandit-lizard eyes and skins** from events, **royal skeleton rings** (jc30: gold bars, owlbear
  claws, vampire teeth, spider legs, ogre skin — no flagged material) and **tasks-coin crystals**; the level-35–45
  pieces (mithril, bloodblade, celest, jester hat) sit on the leading fleets' own crafters and best fighters.

The flagged materials behind those pieces (fight sets at combat 30+; worn instances):

| material | mark | source (`public/data`) | pieces worn (instances) | worn |
|---|---|---|---|---|
| magical_cure | ¢ | tasks_trader, 8 tasks coins | gold_shield 9, gold_boots 6, topaz_ring 6, lizard_boots 5, prospecting_amulet 2, +4 | 32 |
| demon_horn | ⚡ | demon (Lv 30), only in the `portal_demon` event | gold_shield 9, gold_sword 7, gold_mask 5, gold_helm 3, enchanter_pants 2, perfect_bow 1, gold_platebody 1 | 28 |
| jasper_crystal | ¢ | tasks_trader, 8 tasks coins | topaz_amulet 6, stormforged_armor 5, piggy_armor 2, snakeskin_armor 2, greater_dreadful_staff 2, +7 | 24 |
| lizard_eye | ⚡ | bandit_lizard (Lv 25, `bandit_camp`) / 12 from `the_new_bandit` | gold_platelegs 10, gold_boots 6, mithril_ring 2, malefic_ring 2, mithril_platelegs 1 | 21 |
| lizard_skin | ⚡ | bandit_lizard / 12 from `the_new_bandit` | lizard_boots 5, obsidian_battleaxe 5, stormforged_armor 5, elderwood_staff 2, +3 | 20 |
| astralyte_crystal | ¢ | tasks_trader, 12 tasks coins | dreadful_shield 3, mithril_sword 2, celest_ring 2, bloodblade 2, malefic_ring 2, +4 | 15 |
| prime_fabric | ¢ | tasks_trader, 14 tasks coins | jester_hat 5, enchanter_pants 2, +4 | 11 |
| king_slimeball | B | King Slime (Lv 15 boss) / 3 from `slimed_to_none` | slime_shield 3, (greater_)dreadful_amulet 4, steel_legs_armor 2, +2 | 11 |
| strange_ore | ⚡ | strange rocks (mining 35, `strange_apparition`) / gemstone merchant (event) | celest_ring 2, malefic_ring 2, fire/air shield 2, strangold 2 | 8 |
| full_moon_vampire_cape | ⚡ | full_moon_vampire (Lv 24, `full_moon`) | enchanter_pants 2, piggy_armor 2, snakeskin_armor 2, +2 | 8 |
| rosenblood_elixir, priestess_orb, lich_crown | B | Rosenblood (40), Goblin Priestess (35), Lich (30) | celest_ring 2, fire/air shield 2, wrathpants 1, dreadful_armor 1, lich_crown 2 | 8 |
| magic_wood, echoless_bat_wing, malefic_cloth, efreet_cloth, bandit_armor | ⚡ | magic tree (wc 35), echoless bat (38), cultist emperor (35), efreet sultan (42), bandit lizard | enchanter_pants, diamond_sword, mithril_helm/platebody/boots, cultist_hat, malefic_armor, mesh_legs_armor, bandit_armor | 13 |
| enchanted_fabric | R | beastmaster, 1 enchanted coin (`queen_of_the_enchanted_forest`, the pixie raid) | wrathpants 1, mesh_legs_armor 1 | 2 |

### What they hold that this fleet does not make

| account | utility slots (code qty) | rune | artifacts | bag | food in the bags |
|---|---|---|---|---|---|
| uaprsf | — | healing ×3 | perfect_pearl ×4, novice_guide ×4, altar_doll ×2, corrupted_skull, life_crystal, lost_world_map | satchel ×5 | cooked_salmon 506 (4 chars) |
| Fox___ | — | healing, burn | novice_guide ×5, perfect_pearl ×3, altar_doll ×3, lost_world_map ×2, corrupted_skull, life_crystal | satchel ×5 | cooked_salmon 109, cooked_chicken 91 |
| hunter2 | fire_boost 90, health_boost 90, air_boost 73 | healing ×3, healing_aura ×2 | perfect_pearl ×5, novice_guide ×4, lost_world_map ×4, altar_doll, life_crystal | satchel ×5 | cooked_salmon 70, cooked_bass 30 |
| Pischke | greater_health 1 | healing | altar_doll ×5, novice_guide, perfect_pearl | — | cooked_salmon 21 |
| Big_Shark | — | healing | altar_doll ×4, novice_guide ×3, perfect_pearl ×3, life_crystal | satchel ×3 | cooked_bass 25, cooked_wolf_meat 21 |
| Wudagem | health_boost 99 | — | novice_guide ×5, altar_doll ×5, perfect_pearl ×3, lost_world_map ×2 | satchel ×5 | cooked_trout 191 |
| krolov | — | healing ×3 | novice_guide ×5, altar_doll ×3, lost_world_map ×3, perfect_pearl | — | — |
| Elemental | minor_health 9 | healing, healing_aura, burn | novice_guide ×5, perfect_pearl ×4, lost_world_map ×3 | backpack ×4 | cooked_salmon 136 |
| Turbofish | — | healing ×2, burn | lost_world_map ×5, novice_guide ×5, altar_doll ×5 | — | — |
| TheCarriedOne | — | healing ×5 | lost_world_map ×5, altar_doll ×5, perfect_pearl ×3, novice_guide ×2 | satchel ×5 | — |
| automode | — | healing_aura ×2, healing, protection | altar_doll ×5, lost_world_map ×4, perfect_pearl ×4 | — | cooked_beef 52, cooked_salmon 2 |
| the five above this account | small_health 44 + minor_health 4 (Odiodin), health_splash 50 (FRALEX) | healing ×8, burn ×1 | novice_guide, altar_doll, lost_world_map, perfect_pearl ×1 | satchel ×1 | trout, bass, apples, chicken, gudgeon |
| **alverus** | — | — | novice_guide ×5, altar_doll ×5, lost_world_map ×5 | — | — |

- **Every fighter at 35+ in a fight set wears a rune (21 of 21)**: healing rune 14 (`healing` 5: 5% of max HP every
  3 turns), burn 5, healing aura 2. **16 of 21 carry cooked food** (cooked salmon above all: 400 HP at level 40;
  trout 225 at 20, bass 300 at 30 — `items.json` `heal`). **One of 21 wears a restore potion** (`Pischke`: 1 Greater
  Health Potion); two wear boost potions (`hunter2`). Of the 19 characters at 35+ in a gathering set, 2 have a potion.
  Runes over all 85 characters: healing 29, healing aura 5, burn 4, protection 1. **This fleet has no rune.**
- Where they come from (`npc_items.json`, `items.json`): runes from the `rune_vendor` (a static NPC, overworld 8,13)
  for gold — healing 10,000, lifesteal 20,000, healing aura 25,000, burn and protection 30,000; level 20 to wear. The
  simulator models `healing` (`src/sim/combat.ts:297`); the planner plans no rune, artifact, utility or bag
  (`src/plan/planner/decide.ts:161-162`, `forward.ts:36-37`).
- **Artifacts**: `perfect_pearl` on 32 of 85 (prospecting +100; the archaeologist, 20 small pearls — fishing 1/300 at
  trout and bass, 1/100 at salmon), `life_crystal` 4 (24 lich shards), `corrupted_skull` 2 (75 corrupted gems). This
  fleet wears the three the leaders also wear (novice guide, altar doll, lost world map) and no pearl.
- **Bags**: a satchel on 29 of 85 (+15 slots; gearcrafting 5 from 5 cowhide, 2 feathers and 1 jasper crystal = 8
  tasks coins), a backpack on 4 (+35; 50,000 gold, nomadic merchant). **This fleet wears no bag.**

### How many characters fight

Near = within 3 levels of the account's top combat level; far = 10 or more below (`acc-<a>-characters.json`):

| account | pts | combat | near | 4–9 below | far | the far ones: combat, skills at 40+ |
|---|---|---|---|---|---|---|
| uaprsf | 77 | 49 47 46 46 43 | 4 | 1 | 0 | — |
| Fox___ | 65 | 46 44 44 30 23 | 3 | 0 | 2 | Fox_4 30: alchemy 50, cooking 50; Fox_5 23: fishing 50, alchemy 42 |
| hunter2 | 61 | 48 45 44 42 40 | 2 | 3 | 0 | — |
| Pischke | 59 | 42 1 1 1 1 | 1 | 0 | 4 | four at combat 1: fishing 50 + cooking 50; mining 50; alchemy 50; woodcutting 50 |
| Big_Shark | 58 | 45 40 38 1 1 | 1 | 2 | 2 | BlackWidow 1: fishing 42, alchemy 49, cooking 50; Groot 1: woodcutting 50 |
| Wudagem | 58 | 44 44 42 39 37 | 3 | 2 | 0 | — |
| krolov | 55 | 43 43 41 21 15 | 3 | 0 | 2 | Karina 15: cooking 42 (+ wc/gc/jc 30/31/30); Darina 21: mining 45 |
| Elemental | 54 | 42 42 41 22 22 | 3 | 0 | 2 | Percy 22: fishing 43, cooking 50; Molly 22: mining 45, fishing 47, cooking 42 |
| Turbofish | 53 | 42 41 37 23 22 | 2 | 1 | 2 | Turbofish 23: fishing 50, cooking 50; Jade 22: mining 47 |
| TheCarriedOne | 53 | 40 39 38 38 38 | 5 | 0 | 0 | — |
| automode | 49 | 41 33 27 21 19 | 1 | 1 | 3 | pilot 19: mining 50; macro 21: fishing 47, alchemy 50, cooking 50; yolo 27: woodcutting 49 |
| shuxart / FRALEX / chewbaccoin / Odiodin / Zetark | 31–32 | top 29–35 | 1–2 | 0–2 | 2–4 | gatherers at 40–50 or nothing at 40 |
| **alverus** | 29 | 25 24 24 23 23 | 5 | 0 | 0 | — |

- **Three fighters and two workers is the commonest shape of the top ten**: `Fox___`, `krolov`, `Elemental` (3 + 2
  far below), `Big_Shark` (fighters 45, 40, 38 + two workers at combat 1) and `Turbofish` (2 + 1 + 2); `Pischke` goes
  further, one fighter and four workers. The workers are gatherers and cooks at 42–50, and two of them hold the
  crafting skills (`krolov`'s Karina, `Pischke`'s Thurolf). `uaprsf`, `hunter2`, `Wudagem` and `TheCarriedOne` level
  all five (40–49). This account is five at 23–25: the shape of the leader without its levels.

### The Grand Exchange: is a potion bill on sale?

`/grandexchange/history/{code}` gives the last 7 days of sales (`docs/api/openapi.json`); one page of 100 was read, so
for algae and nettle (3–4 pages) the 7-day units are the page's units × total rows ÷ rows read (a guess). Price is per
unit (the book's asks agree). Beside it, the market book of `logs/market/` 2026-11-21 17:01 → 2026-11-22 19:29 UTC
(`npm run market -- --code … --from 2026-11-21T00:00Z`, 161 polls; the last saw 947 orders).

| code | sales in 7 days: rows (units) | per day | price min / median / max | sellers (the top ones by units) | buyers | the book, 11-21 → 11-22 (`npm run market`) |
|---|---|---|---|---|---|---|
| minor_health_potion | **0** (0) | 0 | — | — | — | asks 479 → 409 gold, median 456; **47 on sale at the end, 3 sell orders**, no bid |
| small_health_potion | 20 (127) | 18 | 45 / 47 / 48 | 3: Saw249 72%, Bombardilo 20%, eruphoria 9% | 2 | not on the book in the window |
| health_potion | **0** (0) | 0 | — | — | — | not on the book |
| algae | 319 (≈ 8,900; page: 100 rows, 2,788 units, 11-16 → 11-19) | ≈ 1,270 | 1 / 2 / 2 | 8: sqidking 49%, Lordix 12%, Bombardilo 11% | 8 | ask 2 while on sale, 0 on sale at the end |
| nettle_leaf | 250 (≈ 8,300; page: 100 rows, 3,314 units, 11-19 → 11-22) | ≈ 1,180 | 6 / 10 / 20 | 4: Lordix 68%, at0mstr0m 24%, Donatien 7% | 6 | asks 6–10, median 7; 0 on sale at the end |
| sunflower | 38 (399) | 57 | 5 / 8 / 10 | 5: eruphoria 37%, LurigaLennart 25%, Donatien 19% | 6 | not on the book |

- **The potions are not on sale in any volume.** Nobody sold a Minor or a plain Health Potion in seven days; the 47
  Minor Health Potions on the book at 409–479 gold went unsold for a day; Small Health Potions moved 127 units in a
  week, three sellers, at 45–48. A season's bill of hundreds to thousands of potions (the chat's example:
  `ach:the_reaper:1@Second#2`, 10 kills, 61 Minor Health Potions — `tasks/022-strategy.md`) cannot be bought as
  potions; at the book's ask a thousand would be about 456,000 gold against the bank's 169,966.
- **The ingredients are.** A Minor Health Potion craft takes 2 nettle and 1 algae and gives 2 (`items.json`), so
  1,000 potions take 1,000 nettle + 500 algae: about **11,000 gold at the week's medians** (10 and 2), less than one
  day of each market's volume. By `npm run market`'s own chain (the fleet's seconds a unit on the 11-22
  snapshot's gear): algae 252.8 s, nettle 36.9 s, the potion 166.6 s — so per 1,000 potions the making is about 46
  character-hours, **35 of them the algae** (0.5 × 252.8 s × 1,000), which the market sells for about 1,000 gold.
  (Arithmetic on public numbers; nothing is bought in this task — settled point 9.)
- The ingredient markets are thin at the top: one seller holds 49% of the algae and 68% of the nettle sold this week.

### The leaders' way, in five lines

1. **Combat early and kept going**: combat 25 by day 15 (five days after the first achievement), 40–42 by day 26,
   42–49 now; the account's top combat level ranks the points (Spearman 0.96); bosses fall 5–20 levels below the
   map's gates.
2. **Not everyone fights**: in six of the top ten, two to four characters stay 15–41 levels below the top and
   gather, cook and brew at 42–50 (`Pischke`'s four gatherers at 50 made its island points).
3. **One crafter holds all three gear-crafting skills** (9 of the top ten), 30–41 on day 26 and 35–45 now; the
   fighters wear **craft-level-30 gear**, 48% of it with an event drop and 46% with tasks-coin crystals in the recipe.
4. **Sustain is a healing rune bought for gold and cooked fish, not potions**: 21 of 21 fighters at 35+ wear a rune,
   16 carry food, 1 wears a restore potion; nobody trades restore potions on the Grand Exchange.
5. **The pace has not slowed**: 3.3–4.3 points a day for the top six over the last four days, the leader at 4.14 over
   the last seven — silver by mid to late December at that pace, if the late content opens as the early did.

**The nearest policy.** The leader (`uaprsf`: all five at 43–49, one crafter at 41/45/40 who also fights) is **CS** —
the crafters' floor beside the spine — with two differences: the floor is one character holding all three skills,
not three role holders, and it stood level with the spine rather than ahead of it (on day 26 the crafter's 40/41/35
against the fighters' combat 40–42, `leader-characters.json`); the spine reaches 40+, so **S40**'s depth. The best non-members are **F3** (`Big_Shark` exactly: three fighters, two workers at combat 1;
`Fox___`, `krolov`, `Elemental` the same shape; `Pischke` an extreme F1). **Two things none of the policies does**,
candidates for "one of our own":
- **Sustain without restore potions**: a healing rune on every fighter (10,000 gold each at the `rune_vendor`; five =
  50,000 of the bank's 169,966) and cooked fish from a fishing + cooking worker (trout 225 HP at level 20, bass 300 at
  30). Today the planner plans no rune (`decide.ts:161-162`); `B` (consumables free) bounds the gain from the other
  side.
- **One crafter for the three gear skills** — `D2` pays a crafter's road once for the fleet, but here the three roads
  sit on three characters (`config.ts:27-32`); the leaders put all three on one character, who fights too, and keep
  the other four whole for combat and gathering. Whether that saves hours or only moves them is for the runs (guess:
  it is what makes their three-fighters-two-workers shape possible).
Smaller ones the reads show: a satchel on every character (+15 bag slots for 8 tasks coins each) and a perfect pearl
(+100 prospecting) are worn by most leading fleets and by none of this one.

### Notes

- **One moment in time.** The equipment read is 19:24 UTC: 11 of 29 characters at 40+ and 8 of 11 at 35–39 were in a
  gathering set, so the 30–39 gear sample is 3 + 3 characters. Utility slots may be empty between fights; potions in
  a bank are not public. The rune on every fighter is robust (21 of 21); the absence of restore potions is a strong
  hint, not a proof.
- **The board lags** (above): 29 on the board, 30 completed; all paces in the last column use `completed_at`.
- **The 11-18 read** covers the first 100 accounts only (2 points at position 100): `Myoto` (47 now) is not on it —
  2 points or fewer on 11-18, or a renamed account (unknown). The 11-18 character board stops at level 30.
- **Season days vs days played**: day 1 = 10-24 by the API; no read account completed anything before day 9 (11-01).
- **Gates**: a skill gate from `public/data` proves a level on that day (a lower bound; the skill may have come
  earlier); a kill's monster level says nothing exact about the characters. The map's combat gates are atlas
  estimates (`docs/design/achievement-map.md:118-121`) and for the bosses they were 5–20 levels high — the same finding
  as `docs/design/planner.md` A.1 on 11-18. The characters' combat on the day of a boss kill is read from the 11-18
  character board (day 26), so "about 40" for `uaprsf`'s day-24/25 kills is a guess within two levels.
- **Flags**: a material gets a mark only when every source of it carries that mark (a material any static monster or
  node gives is unmarked); an achievement's reward counts as its achievement's own needs (lizard skin: the bandit
  camp event either way). The event merchants' gold offers (gemstone, timber) count as events.
- **GE**: the history's page order is not documented; for algae and nettle one page of 3–4 was read, so their 7-day
  units are extrapolated (guess). The book (`logs/market/`) starts 2026-11-21 17:01 UTC.
- **Members**: `uaprsf`, `Fox___`, `hunter2` are members; what membership adds to play was not checked. The best
  non-members (59, 58, 58) are within 7 of the second and third.
- **Linear paces** are the brief's measure, not forecasts (the 210 points cap them, and the late content is gated by
  raids, the island and bosses).
## Where the hours go

Read at 19:49 UTC on 11-22: the journal (`logs/journal/2026-11-21.jsonl`, `2026-11-22.jsonl`; no 11-23 file yet) to its last
record, 19:29:17; the raw log (`logs/raw/2026-11-21/11.log` … `2026-11-22/19.log`) to 19:49:14. **No restart after 17:49:00**:
the journal's last `boot` is `0e2f` at 17:49:01.527 and the raw log holds no other run id after it; `logs/status.json`
(19:46:02) carries `0e2f`, up since 17:49:00.735. **No failed outlook after 17:49**: the one `outlook` record since is
17:54:28 (318.1 s, 55 expected by 12-13); the last failed one is 16:46:02 (run `4zfd`, before the restart).

Two measures are used. **(a) The chat's**: Σ `ran` of every `end` record plus Σ `s` of every `int-end` record whose time is
in the window (journal). **(b) Raw slices**: every `api POST /my/<who>/action/… -> ok` line of the raw log, from its time to the
same character's next ok action (cut at its run's last line), attributed to the `head <who>: [pl:…]` line in force and clipped
to the window. It is the meter's own slicing rebuilt from the raw log (`docs/journal.md`, "The meter"), so the meter's `wait`
is folded into each group; unlike the journal's meters it keeps what re-attached (`partial`) steps did before a restart and
splits at midnight. The fleet was never idle: no slice is longer than 222 s (a 98-potion craft), and the service was down
0.2 character-hours (ch-h) in all across five restarts. Scripts: `D:\Temp\a022\out\sec2\an.mjs`, `an2.mjs`, `an3.mjs`.

### The chat's table, checked
Window 11-21 11:43:34 (the journal's first record, boot `0gpn`) → 11-22 17:25:00: 5 × 29.69 h = 148.5 ch-h.

| the chat's number | (a) recomputed | (b) raw slices | where it differs, and why |
|---|---:|---:|---|
| 149.5 ch-h | 149.5 | 148.2 (+0.1 down, 0.1 unsliced) | (a) counts whole the `ran` of the first ends (11:45–13:07, re-attached steps that began before 11:43) and leaves out the steps still running at 17:25 |
| `level` 76.5 h | 76.5 | 75.2 | — |
| of it `lvl:mining:35` 67.5 h | **69.7** | 68.5 | **67.5 is planned hours**: 45 `lvl:mining:35` steps *started* in the window × 1.50 h (`step.h`); the 47 that *ended* in it ran 69.7 h |
| `supply` 36.9 h | 36.9 | 37.5 | — |
| of it Minor + Small Health Potion 35.2 h | 35.3 | 35.8 | (a) by parent: `cons:minor…:ach:the_reaper:1` 12.2, `cons:small…:event:bandit_camp` 10.3, `cons:minor…:event:bandit_camp` 7.0, `cons:small…:ach:the_reaper:1` 4.7, `cons:small…:src:ogre_eye` 1.1 |
| `objective` 26.2 h | 26.2 | 25.6 | — |
| offering interrupts 6.0 h | 6.0 | 6.0 | — |
| event trips 3.8 h | 3.8 | 3.7 | — |
| meter: gather 104.7 h (85%) | 104.7 (85.1% of 123.1 h) | 126.9 (85.6%) | **the chat's meter is the steps' `end` meters only**: it leaves out the interrupts' meters (9.7 h: offerings and trips) and the 16.6 h the re-attached steps' meters lost at restarts (Σ `ran − m.s`) |
| meter: fight 2.0 h (1.6%) | 2.0 steps only; **4.7 h (3.5%) with the interrupts** | **4.9 (3.3%)** | more than half the fleet's fighting is in interrupts: offerings 1.48 h, event trips 1.17 h (`int-end` `m.by.fight`) |
| meter: rest 2.3 h | 2.3 steps only; 4.1 with the interrupts | 4.3 | as above |
| three combat levels | Third 23 (11-21 13:12), Third 24 (11-22 05:41), Fifth 24 (06:24) | | `level` records, `skill: combat` — confirmed |
| one point, a second at 18:46 | `intermediate_lumberjack` +1 (game time 11-21 20:27:33); `expert_miner` +1 (18:46:53, recorded 18:51:09) | | `ach` records — confirmed; both are worth 1 point (`public/data/achievements.json`) |

The chat's "seventeen hours of making a fight hour" is 35.2 h of potion supply ÷ the steps-only 2.0 h of the fight group; the
measure below prices the potions actually drunk instead.

### Per UTC day (raw slices, ch-h)
| | 11-21 from 11:43 (12.3 h) | 11-22 to 19:49 (19.8 h) | whole journal (32.1 h) |
|---|---:|---:|---:|
| available (5 × wall) / service down | 61.4 / 0.1 | 99.1 / 0.1 | 160.5 / 0.2 |
| **objective** | **24.2** (39.6%) | **4.8** (4.9%) | **29.0** (18.1%) |
| — intermediate_lumberjack · cabinet_maker · intermediate_alchemist · the_reaper · arachnophobia · expert_miner | 14.0 · 4.2 · 2.5 · 3.4 · 0.1 · 0 | 0 · 0 · 1.2 · 0 · 0 · 3.7 | 14.0 · 4.2 · 3.7 · 3.4 · 0.1 · 3.7 |
| **level** | **28.3** (46.2%) | **53.1** (53.7%) | **81.4** (50.8%) |
| — mining 35 · woodcutting 30 · woodcutting 35 · gearcrafting 25 | 28.2 · 0 · 0 · 0 | 44.0 · 4.6 · 3.7 · 0.8 | 72.3 · 4.6 · 3.7 · 0.8 |
| **supply** | **8.6** (14.1%) | **31.3** (31.6%) | **39.9** (24.9%) |
| — consumables: Minor Health Potion for the_reaper · for bandit_camp | 6.7 · 1.5 | 6.8 · 7.2 | 13.5 · 8.6 |
| — consumables: Small Health Potion for bandit_camp · for the_reaper · for `src:ogre_eye` | 0 · 0 · 0 | 10.3 · 4.7 · 1.1 | 10.3 · 4.7 · 1.1 |
| — gear (pieces, their `mat:`/`src:` legs: steel ring, wizard hat, ruby amulet, tromatising mask, piggy pants, steel boots) | 0.5 | 1.2 | 1.7 |
| — objective materials | 0 | 0 | 0 |
| **filler / fallback** | 0 | 0 | 0 |
| **tidy** | 0.1 | 0.1 | 0.2 |
| **interrupts**: offering · event · merchant | 0 · 0 · 0.02 | 6.0 · 3.7 · 0 | 6.0 · 3.7 · 0.02 |
| groups: fight · rest · eat | 1.4 (2.4%) · 1.7 · 0.0 | 3.4 (3.5%) · 2.7 · 0.2 | 4.9 (3.0%) · 4.3 · 0.2 |
| groups: bank · walk · gear | 0.5 · 2.7 · 0.3 | 1.1 · 4.7 · 0.6 | 1.7 · 7.4 · 0.9 |
| groups: gather · craft · trade · task · other | 53.8 (87.9%) · 0.7 · 0 · 0 · 0 | 84.5 (85.3%) · 1.7 · 0.0 · 0 · 0.0 | 138.3 (86.3%) · 2.5 · 0.0 · 0 · 0.0 |
| `wait` (journal meters, not in the slices) | | | steps 6.45 h of 123.1 (5.2%), interrupts 0.68 h of 9.7 (the chat window) |
| points (`ach`) | intermediate_lumberjack +1 → 29 | expert_miner +1 → 30 | +2 |
| combat levels (`level`) | Third 23 | Third 24, Fifth 24 | 3 |
| other levels | mining ×5, woodcutting ×4 | mining ×7, woodcutting ×1, cooking ×3, fishing ×2, gearcrafting (Third 23), jewelrycrafting (Fourth 21) | |

Fighting by answer (whole journal, raw slices): objective kill steps (the_reaper, arachnophobia) 1.3 h of fight + 1.5 of rest;
gear `src:` hunts 0.6 + 0.5; interrupts 2.8 + 1.9; a `level` step 0.2 + 0.4 (the gearcrafting train loop's drop hunt).

### Every kill step and event trip
Planned s/kill = the step's planned seconds (`end.plan` = `step.h` × 3600) ÷ its kills; a trip: its "≈N kills in M min" (the
`event` record's member line) as M × 60 ÷ N. Measured = `end.ran` ÷ kills done; a trip: its `int-end` meter `m.s` ÷ kills.
Potions planned: the step's `wd`, which is the forecast's units × `MARGIN` 1.2 (`src/plan/planner/config.ts:98`), so a kill's
planned potions are `wd` ÷ 1.2 ÷ kills; a trip's `take` is capped at 100 a utility stack and is not divided. Drunk, eaten, won
and lost: the meter (`m.drunk`, `m.used`, `m.won`/`m.lost`); fights of the partial step from the raw log's `fight:` lines.

| start | who | step / trip | monster | kills planned → done | lost | s/kill planned → measured (÷) | potions planned → drunk | a kill: planned → drunk (÷) |
|---|---|---|---|---|---|---|---|---|
| 11-21 11:45 | First | `ach:the_reaper:1@First#1` | vampire | 1 → 1 | 0 | 115 → 260 (2.26) | 2 air + 9 minor → 1 + 8 | 9.2 → 9.0 (0.98) |
| 11-21 (re-att.) | Second | `ach:the_reaper:1@Second#1` (partial) | vampire | 10 → 10 | 0 | 112 → 100 (0.90) | ? → ≥ 3 air + 19 minor | — |
| 11-21 11:48 | Second | `…@Second#2` | vampire | 10 → 10 | 0 | 111 → 109 (0.98) | 12 air + 84 minor → 10 + 61 | 8.0 → 7.1 (0.89) |
| 11-21 11:49 | First | `…@First#2` | vampire | 1 → 1 | 0 | 111 → 231 (2.08) | 2 + 9 → 1 + 8 | 9.2 → 9.0 (0.98) |
| 11-21 12:07–12:20 | Second | `…@Second#3`, `#4`, `#5` | vampire | 8 → 8 | 0 | 110 → 131–140 (1.19–1.27) | 11 air + 68 minor → 8 + 47 | 8.1–8.3 → 6.5–7.0 (0.78–0.86) |
| 11-21 12:24, 12:28 | Second | `ach:arachnophobia_conquered:0@Second#1`, `#2` | spider | 2 → 2 | 0 | 94 → 229, 206 (2.44, 2.19) | 4 air + 12 minor → 2 + 7 | 6.7 → 4.5 (0.68) |
| 11-21 12:49 | Third | `src:snake_hide@Third#1` (gear: steel ring) | flying snake | 12 → 12 | 0 | 52 → 55 (1.06) | 15 air → 12 | 1.0 → 1.0 |
| 11-21 13:00 | Third | `ach:the_reaper:1@Third#1` | vampire | 10 → 10 | 0 | 110 → 108 (0.98) | 12 air + 96 minor → 10 + 69 | 9.0 → 7.9 (0.88) |
| 11-21 13:11 | Fourth | `src:blue_slimeball@Fourth#1` (gear: wizard hat) | blue slime | 30 → 30 | 0 | 21 → 19 (0.91) | 36 air → 30 | 1.0 → 1.0 |
| 11-21 13:20–13:38 | Fourth | `ach:the_reaper:1@Fourth#1`, `#2`, `#3` | vampire | 10 → 10 | 0 | 110 → 117–150 (1.07–1.37) | 13 air + 95 minor → 10 + 77 | 8.1–10.2 → 8.5–9.0 (0.86–1.08) |
| 11-21 21:24, 21:44, 22:03 | Third | `ach:the_reaper:1@Third#1`, `#2`, `#3` | vampire | 33 → 33 | 0 | 108–110 → 100–109 (0.92–1.00) | 279 minor → 225 | 7.0 → 6.6–7.1 (0.94–1.01) |
| 11-21 21:42, 22:02 | Fifth | `ach:the_reaper:1@Fifth#1`, `#2` | vampire | 22 → 22 | 0 | 110 → 106–112 (0.96–1.02) | 28 air + 186 minor → 22 + 161 | 8.1 → 8.1–8.5 (1.00–1.05) |
| 11-21 22:15 | Second | `ach:the_reaper:1@Second#1` | vampire | 10 → 10 | 0 | 108 → 116 (1.07) | 12 air + 96 minor → 10 + 65 | 9.0 → 7.5 (0.83) |
| 11-22 03:45 | Second | `src:snake_hide@Second#1` (gear: ruby amulet) | flying snake | 19 → 19 | 0 | 72 → 46 (0.63) | 23 air → 19 | 1.0 → 1.0 |
| 11-22 05:10 | Third | `src:skeleton_bone@Third#1` (gear: tromatising mask) | skeleton | 40 → 40 | 0 | 56 → 65 (1.17) | 48 trout → 38 eaten | — |
| 11-22 06:00 | Third | trip `bandit_camp@05:51:53` | bandit lizard | ≈44 → 0 (removed) | 0 | 68 → — | 100 small (+32 trout) → 0 | — |
| 11-22 06:02 | Second | trip, same spawn | bandit lizard | ≈47 → 12 (ran dry) | 0 | 61 → 165 (2.69) | 96 minor + 100 small → 96 + 26 | 4.2 → 10.2 (2.44) |
| 11-22 06:14 | Fourth | trip, same spawn | bandit lizard | ≈33 → 12 (ran dry) | 0 | 65 → 100 (1.53) | 100 + 100 → 100 + 63 | 6.1 → 13.6 (2.24) |
| 11-22 06:16 | Fifth | trip, same spawn | bandit lizard | ≈30 → 8 (ran dry) | 1 | 66 → 188 (2.85) | 70 minor + 64 small → 70 + 0 | 4.5 → 8.8 (1.96) |
| 11-22 10:36 | Second | trip `bandit_camp@10:35:52` | bandit lizard | ≈55 → 13 (ran dry) | 0 | 63 → 96 (1.52) | 100 + 100 → 100 + 77 | 3.6 → 13.6 (3.74) |
| 11-22 10:36 | Third | trip, same spawn | bandit lizard | ≈36 → 12 (ran dry) | 0 | 97 → 131 (1.35) | 100 + 100 → 100 + 65 | 5.6 → 13.8 (2.48) |
| 11-22 10:42 | Fifth | trip, same spawn | bandit lizard | ≈32 → 12 (ran dry) | 0 | 98 → 134 (1.37) | 100 + 100 → 100 + 56 | 6.3 → 13.0 (2.08) |
| 11-22 11:02 | First | trip, same spawn | bandit lizard | ≈29 → 12 (ran dry) | 0 | 66 → 117 (1.76) | 100 + 100 → 100 + 61 | 6.9 → 13.4 (1.95) |
| 11-22 11:04 | Fourth | trip, same spawn | bandit lizard | ≈27 → 11 (ran dry) | 1 | 67 → 176 (2.64) | 100 + 100 → 100 + 21 | 7.4 → 11.0 (1.49) |
| 11-22 13:15 | Second | trip `bandit_camp@13:13:09` | bandit lizard | ≈37 → 0 (ran dry after a loss) | 1 | 91 → — | 2 minor + 83 small → 2 + 7 | — |

"Ran dry": the raw log's `ran dry after N fights … the fresh forecast is no win` (`logs/raw/2026-11-22/06.log`, `10.log`,
`11.log`, `13.log`). Every trip that fought drank its whole Minor Health Potion take (70–100) in 8–13 fights, then ran dry.

**Per monster** (the partial step left out):

| monster | steps / trips | kills planned → done | lost | s/kill planned → measured (÷) | potions a kill planned → drunk (÷) | of the running: fight · rest |
|---|---|---|---|---|---|---|
| vampire (the_reaper) | 16 | 105 → 105 | 0 | 109.6 → 115.0 (**1.05**) | 8.05 → 7.55 (**0.94**: 7.1 minor + 1 air) | 36% · 43% |
| spider | 2 | 2 → 2 | 0 | 94 → 218 (2.31; one-kill steps, the walk is the step) | 6.7 → 4.5 (0.68) | 12% · 24% |
| flying snake | 2 | 31 → 31 | 0 | 64 → 49 (0.77) | 1.0 → 1.0 | 38% · 38% |
| blue slime | 1 | 30 → 30 | 0 | 21 → 19 (0.91) | 1.0 → 1.0 | 45% · 31% |
| skeleton | 1 | 40 → 40 | 0 | 56 → 65 (1.17) | food only: 1.2 trout → 0.95 | 47% · 32% |
| bandit lizard (trips) | 10 | ≈370 → 92 (the 8 that fought: ≈289 → 92) | 3 | 73.5 → 144.0 (**1.96**) | take ÷ kills 4.6 → drunk **12.4** (2.68) | 32% · 35% |

The planner's kill steps are priced right (vampire 1.05 and 0.94); the bandit-lizard trips drink 2–3.7 times their take a kill
and deliver a third of their kills (92 of ≈289).

**The hours of making behind an hour of fighting.** A potion is priced by what the journal's own supply steps took a unit
(non-partial `end` records, Σ `ran` ÷ Σ `m.got`/`m.made`): nettle 31.0 s (1,598 leaves), **algae 209.7 s** (68 algae from 641
gudgeon-spot gathers, `src:algae` ×3), sunflower 26.1 s (1,888), the craft 2.7 s (minor, 914 made) and 2.9 s (small, 1,248) a
potion. Recipes (`public/data/items.json`): minor = 2 nettle + 1 algae → 2, small = 3 sunflower → 2. So **a Minor Health
Potion 138.5 s** (105 s of it algae), **a Small Health Potion 42.0 s**; Air Boost Potion 298 s and Cooked Trout 44 s are the
atlas's `costSec` (none made in the journal; a guess).

| fights | won | drunk | eaten | fight group h (meter) | fight + rest + eat h | running h | making h behind | making ÷ fight-group h | making ÷ running h |
|---|---:|---|---|---:|---:|---:|---:|---:|---:|
| kill steps (planner) | 245 | 138 air + 747 minor | 38 trout | 1.8 | 3.8 | 5.1 | 40.6 | 22.3 | 8.0 |
| event trips | 92 | 768 minor + 376 small | 32 trout | 1.2 | 2.5 | 3.7 | 34.3 | 29.5 | 9.3 |
| offering interrupts (combat) | 108 | 574 minor + 126 small | 111 trout | 1.5 | 2.0 | 6.0 | 24.9 | 16.9 | 4.2 |
| **all** | 445 | 138 air + 2,089 minor + 502 small | 181 trout | **4.5** | 8.3 | 14.7 | **99.9** | **22.4** | **6.8** |

So **an hour of the fight group carries 22 hours of making; an hour of fight work (fight, rest, eat, walk, bank, gear, wait)
carries 6.8** (a vampire kill: 115 s of step against ~1,280 s of potions, 11 times). The raw slices of every potion supply step
in the journal are 38.2 ch-h, in line with the 99.9 h priced (the rest came from the bank's stock: the 11-22 00:00 snapshot,
`logs/world/2026-11-22.json`, held 390 minor potions, 884 algae, 148 nettle).

### What the executor's known faults cost (settled point 8)
Every `pause`, `block`, removed interrupt, trip that ended short and refused offering of the journal (`npm run journal`'s
"Blocks … pauses" table, the `int-end` records, the raw log's `queue paused`, `skipped today's … offering`, `ran dry`,
`the planned set needs` lines).

| day | fault | where (journal / raw) | ch-h in it | potions, food | work it did not do | points its target carries |
|---|---|---|---:|---|---|---|
| 11-21 | none of the four | — | 0 | — | — | — |
| 11-21 | (not one of the four) a bill short of its input | Third `mat:minor_health_potion@Third#1` paused 21:23:57 "no Nettle Leaf (need 2)", blocked 6 h (strike 1) | 0 (640 of 736 made in 2,116 s) | — | 96 potions; the target off Third for 6 h | the_reaper 3 (the `cons:` parent) |
| 11-22 | **3** a drained stack does not re-solve | the combat offerings of First, Fourth, Second, Fifth, refused "no way to get 6/8× Rat Hide" at 00:27:13, 00:27:53, 00:40:06, 03:13:31 (from the `int` at 00:09:30) | **4.18** (1,062 + 1,102 + 1,836 + 11,041 s; Fifth's includes 1.6 h of sunflowers for its own potions) | 292 minor + 126 small + 76 trout (≈11.2 h of making for the minor at 138.5 s) | four combat offerings (28 rat hides); 6,302 combat XP is all they bought (report 021) | 0 (offerings give XP and favors) |
| 11-22 | **1** a train loop's drop hunt adopts a brew set and never brews | Third `lvl:gearcrafting:25@Third#2` 05:04–05:08 and `#1` 15:28–15:30, "not a safe win vs Ogre"; two 6 h blocks (strikes 1 and 2, the second until 21:30) | 0.10 (254 + 119 s) | — | two gearcrafting levels (3.79 h planned each); gearcrafting stays 23 | the_reaper 3 (via Piggy Pants for Second, the step's why) |
| 11-22 | **2** an event member's `take` without the potion its set needs | Third's trip 06:00, removed 06:07 "not a safe win vs Bandit Lizard" (report 021: its set needed its bag's 96 minor, the take held 100 small); Second's trip 13:15 (take 2 minor + 83 small, lost its first fight, ran dry after 0) — the second is this class by its take, a guess | 0.25 (444 + 445 s) | 2 minor + 7 small | ≈44 + ≈37 kills | the_new_bandit 2 |
| 11-22 | **4** `eventMembers` books one piece twice | the Tromatising Mask for Third (06:00) and Second (06:02): `plan Second: the planned set needs Tromatising Mask, which the bank no longer holds` (06:02:40); Second fought in a Hard Leather Helmet until 06:07:45, when Third's reset banked the mask | 0 directly | — | not separable from the trip's dry run | the_new_bandit 2 |
| 11-22 | (the model's, not a fault) the trips drink 2–3.7× their take | the 8 trips that fought, each ran dry at 8–13 kills | 3.46 (Σ `m.s`) | 766 minor + 369 small (≈33.8 h of making) | 197 of ≈289 kills | the_new_bandit 2 (92 of 100 kills now: the 13:23 `event` record's demand is 8) |

**Per day: 11-21 nothing; 11-22 4.5 ch-h directly (4.6% of the day's 99.1) plus 292 Minor Health Potions (≈11 h of making)**,
two gearcrafting levels not trained, and ≈81 bandit-lizard kills not fought; the points behind them are the_reaper's 3 and
the_new_bandit's 2. All four sit on fights the executor runs outside a planner step's priced `take` — the offering's combat, a
train loop's drop hunt, an event trip — so a combat-first policy keeps them (the interrupts stay as they are) and loses about
this much a day until 023 repairs them, more as the trips and drop hunts grow (an extrapolation from one day).

### The samples against their estimates
`sample` records (s a unit; a level's in seconds), unit-weighted measured ÷ estimate:

| kind | samples | units | measured ÷ estimate (range) | within a tenth |
|---|---:|---:|---|---|
| gather: gold rocks · coal · birch · nettle · sunflower · dead tree · gudgeon spot | 39 · 12 · 13 · 15 · 11 · 2 · 3 | 6,033 · 2,166 · 2,297 · 2,399 · 2,058 · 288 · 642 | 0.92 · 0.90 · 0.88 · 0.89 · 0.91 · 0.89 · 0.88 (0.83–1.00) | 44 of 95: **the model is 8–12% slow on every gather** |
| level: mining 29, 30 (×2), 31 | 4 | 20 levels | 0.86 (21,693–23,267 s against 25,282–27,207) | 0 of 4 (follows the gathers) |
| kill: vampire | 9 | 95 | 1.17 (0.75–1.33; est 84–87 s, one 133) | 0 of 9 — but the steps' plans hold (above: 1.05), since the fixed walk is priced in the step |
| kill: flying snake · blue slime · skeleton | 2 · 1 · 1 | 31 · 30 · 40 | 0.73 · 1.00 · 1.41 | 2 of 4 |
| craft: minor · small potion | 4 · 6 | 910 · 1,248 | 0.83 · 0.96 (0.67–4.00; seconds of 2–4) | 5 of 10 |
| craft: hardwood plank (cabinet_maker) | 3 | 165 | **0.30** (est 309 s a plank: the field price; the steps took most of the wood from the bank) | 0 of 3 |
| level: gearcrafting 22 → 23 (the step, no `sample`) | 1 | 1 level | **0.19** (2,353 s against 12,388) | — |

By step (non-partial ends with every unit done; `end.ran` ÷ `end.plan`): level/gather 40 steps 0.99 (37 within a tenth);
supply/gather 21: 0.91; supply/craft 21: 0.98; objective/kill 18: 1.07 (median 1.19, the one-kill steps); supply/kill 4: 0.97;
supply/buy 5: 0.86; tidy 2: 1.37; level/train 1: 0.19.

### The crafting levels: what a gear-crafting level costs in play
**In the journal** there is one crafting level step, `lvl:gearcrafting:25@Third#1` (11-22 04:25:07 → 05:04:20): planned 3.441
h = `craftK` 0.1 × the atlas's 34.41 h for gearcrafting 22 (`src/plan/planner/cost.ts:197-200`, `config.ts:37`), ran **2,353 s**,
done (Third gearcrafting 23 at 05:03:56). It gained **6,277 gearcrafting XP** (`m.xp`) — level 22 needs 10,200 (`atlas.xpNeeded[22]`),
so Third began it with about 3,900 (the 00:00 snapshot: 2,751, plus two gear crafts at 04:24). Its seconds (`m.by`): **fight 688,
rest 1,225** (23 skeleton fights, 81%), walk 175, wait 144, bank 51, gear 30, **craft 40** (two crafts: 5 Skeleton Helmet + 4
Skeleton Pants). Everything else came from the bank (`m.wd`): 35 iron bar, 28 ash plank, 22 wolf bone, 23 skeleton bone, 8
wolf hair, 5 skeleton skull; the hunt brought the 4 missing bones (+2 skulls). The products were banked, not recycled. The two
later attempts (`#2` 05:04, `#1` 15:28) stopped at the ogre gate (fault 1). Normalised to a whole level: 10,200 ÷ 9,604 XP/h =
**1.06 h of the trainer, 0.31 of the model's 3.44 h** — with the materials free. Priced at the atlas's `costSec`
(`public/data/atlas.json` items: iron bar 345 s, ash plank 305, wolf bone/hair 688, skeleton bone 568, skull 852), the
materials it spent are 60,851 s = **16.9 h**: with them, 357 XP a fleet-hour.

**Does it hold for later levels?** No, past the stock: the 11-22 00:00 bank held 66 iron bar, 18 ash plank (+10 from the 04:19
tidy), 29 skeleton bone; after the step about 31 bars and no planks are left — four more helmets (~2,800 XP at the step's
~700 XP a piece), a quarter of level 23's 11,200. Beyond that a level costs what the old loops measured from scratch.

**In `logs/dev.log`** (no planner `lvl:<craft>` step before 11-21; the deleted 📌 train loops, the same `runTrainCraft`, with
their "Fleet helps" helpers): per `Train <Skill> …` item of the role holder, its raw slices; beside it the slices of every
`Help <holder> train <Skill>` item of the other four in the same hours; its XP = the holder's craft actions × the `+N xp each`
of its `train <Skill>: craft …` note (checked against the craft actions' `quantity`: Second's 102 iron daggers × ~197 = 20,094
against 20,134). The level at an item's start is not in the log; the measure is XP a fleet-hour, against the atlas's `xph`
for the same recipe at the item's bracket (the target less 5 to the target less 1, assumed).

| skill | item (holder) | when | holder h + helpers h (4) = fleet h | XP | recipe | XP / fleet-h | atlas xph | play ÷ atlas | **play ÷ model** (craftK 0.1) |
|---|---|---|---|---:|---|---:|---:|---:|---:|
| weapon | to Lv 10 (Second) | 11-06 11:25–18:08 | 6.9 + 27.8 = 34.7 | 5,911 | sticky dagger | 170 | 184 | 1.08 | 10.8 |
| jewelry | to Lv 10 (Fourth) | 11-09 12:22–15:25 | 3.3 + 12.2 = 15.5 | 6,138 | life amulet | 395 | 154 | 0.39 | 3.9 |
| gear | to Lv 15 (Third) | 11-10 07:41–12:20 | 4.9 + 19.6 = 24.5 | 8,552 | leather boots | 349 | 294 | 0.84 | 8.4 |
| weapon | to Lv 15 (Second) | 11-10 12:40–16:18 | 3.9 + 15.5 = 19.4 | 8,772 | iron dagger | 452 | 267 | 0.59 | 5.9 |
| jewelry | to Lv 15 (Fourth) | 11-13 13:00–17:21 | 4.4 + 17.4 = 21.8 | 8,200 | iron ring | 377 | 261 | 0.69 | 6.9 |
| weapon | to Lv 20 (Second) | 11-16 09:26–20:59 | 11.0 + 33.8 = 44.7 | 20,134 | iron dagger | 450 | 256 | 0.57 | 5.7 |
| jewelry | to Lv 20 (Fourth) | 11-16 21:11–11-17 05:15 | 8.0 + 31.5 = 39.5 | 15,235 | life, air ring | 386 | 283 | 0.74 | 7.4 |
| gear | to Lv 20 (Third) | 11-17 09:54–18:24 | 8.6 + 33.9 = 42.5 | 16,580 | leather boots/legs, adventurer boots, iron armor | 390 | 282 | 0.72 | 7.2 |
| gear | +1 level, 20 → 21 (Third) | 11-18 07:25–11:19 | 1.4 + 0 = 1.4 | 7,215 | leather legs (bank stock: 139 spruce planks) | 5,147 | 299 | 0.06 | 0.58 |
| gear | journal, 22 → 23 (Third) | 11-22 04:25–05:04 | 0.65 + 0 | 6,277 | skeleton helmet, pants (bank stock) | 9,604 | 296 | 0.03 | 0.31 |

(The holders' own hours in the scratch loops were gather 2–9 h, fight + rest 0.5–6.9 h, craft 0.2–0.5 h an item: the helpers
gathered iron ore, ash wood and copper and hunted cows, slimes and chickens. Gearcrafting's first "to Lv 10", 1,860 XP in 24.5
fleet-h, is left out: copper armor, early helpers.)

**What a gear-crafting level costs this fleet**: from scratch, **350–450 XP a fleet-hour at levels 10–19, i.e. 0.57–0.84 of
the atlas's hours — 5.7–8.4 times the model's `craftK` 0.1** (weapon 5.7–5.9, jewelry 6.9–7.4, gear 7.2–8.4); at level 22
that is ~25 fleet-hours a level against the model's 3.4. From bank stock, 0.65–1.4 h of the trainer a level, **0.31–0.58 of
the model**, with no fleet time for materials that were made earlier. The model's 0.1 is right for neither: it is 2–3 times
dear while the bank feeds the recipe and 6–8 times cheap once it does not. `craftAbove40` 60 h against the atlas × the play
factor at 40: weapon ~365 h, gear ~185 h, jewelry ~95 h a level (an extrapolation of the atlas, below).

**For section 3** (levels from `logs/status.json`, 19:46:02):

| skill (holder) | level now | measured, from scratch | measured, bank-fed | road | the model (craftK 0.1; 60 h above 40) | by section 2's measure (atlas × play ÷ atlas) |
|---|---|---|---|---|---:|---:|
| weaponcrafting (Second) | 20 (6,508 of 8,200 XP into 20 at 11-22 00:00) | 450 XP/fleet-h, iron dagger, 10–19 (0.57–0.59 × atlas) | — | 20→30 · 30→35 · 35→40 · 40→45 | 45 · 155 · 265 · 300 h | 257–266 · 882–913 · 1,510–1,563 · 2,665–2,759 h |
| gearcrafting (Third) | 23 (since 11-22 05:03) | 349–390 XP/fleet-h, leather pieces, 10–19 (0.72–0.84) | 5,147 and 9,604 XP a trainer-hour (11-18, 11-22) | 23→30 · 30→35 · 35→40 · 40→45 | 35 · 54 · 98 · 300 h | 252–294 · 388–453 · 704–821 · 3,063–3,573 h |
| jewelrycrafting (Fourth) | 21 (since 11-22 06:13, by 4 steel + 4 skull rings of gear supply, no training) | 377–386 XP/fleet-h, iron/air ring, 10–19 (0.69–0.74) | — | 21→30 · 30→35 · 35→40 · 40→45 | 47 · 41 · 57 · 300 h | 321–344 · 286–306 · 395–424 · 13,544–14,525 h |

The measure is taken at 10–19 on the old recipes and applied to the atlas's recipe choice above 20 (a guess): the atlas's
weaponcrafting above 30 is the Dreadful Staff at 63–64 XP a fleet-hour (`craftTrain` rows 31–35) and gearcrafting the Snakeskin
Legs at ~200 then the Royal Skeleton Armor at ~152, both far below the 250–300 of the recipes measured; every skill's 40→45
is the atlas's own wall (jewelrycrafting 19,629 atlas hours). A bank already holding a level's materials makes the level about an hour of the trainer.

### Notes
- The chat's 67.5 h of `lvl:mining:35` is planned hours (45 × 1.5); the chat's meter (gather 85%, fight 1.6%) is the steps'
  `end` meters only, without the interrupts and without what the re-attached steps' meters lost (16.6 h).
- Raw slices run response to response; the meter runs request to request — equal sums but for latency jitter. A slice is cut at
  its run's last raw line, so the restarts' few seconds are "down".
- `ach:the_reaper:1@Second#1` (re-attached at 11:43) has no `step` record and a partial meter; it is listed, not in the per-monster
  ratios.
- A trip's planned potions a kill (take ÷ ≈kills) is an upper bound of the plan's own drink: the take holds `MARGIN` and is
  capped at a 100-stack; the 2–3.7 ratio is therefore at least that.
- Algae is the minor potion's price: 641 gudgeon-spot gathers gave 68 algae (one in 9.4) while the 00:00 bank held 884 algae.
  Why three characters fished algae at 14:09–15:51 with that stock is not in the journal (the bank at 14:09 is not logged).
- The old train loops' helpers may have gathered more than the loop consumed (the bank's growth is not logged), so XP a fleet-hour
  is a lower bound of the efficiency, the play ÷ model ratio an upper bound.
- Fault 2 for Second's 13:15 trip is my reading of its take (2 minor + 83 small, the bank's last 2 minor) — the forecast behind
  its member check is not logged.
- `public/data/atlas.json` predates the 021 solver (report 021's Notes), so its `costSec` and `xph` are the old solver's.
- Prices of the air boost potion and cooked trout are the atlas's `costSec` (nothing of either was made in the journal).
## What a combat level costs and what gear buys
All of it on the fixed World (`logs/world/2026-11-22.json`, the snapshot of 00:00:32 UTC; SHA-256 `14AA19CB…E940AA`) with the
`P0s` tree (`<s>/t/home`: HEAD plus the stranding repair, which changes nothing here), by `tools/sec3.mts` (its output kept as
`docs/strategy/022/sec3.json`, the tables `tools/sec3tab.mjs`; one process, 84–132 s beside the runs). The fighters then:
First, Third, Fourth, Fifth combat 23, Second 25; the crafters weaponcrafting 20 (Second), gearcrafting 22 (Third),
jewelrycrafting 20 (Fourth).

**How it is priced** — the planner's own pieces, nothing new: a character at a level above its own is `reach.ts chAt` (+5 max HP
a level); a fight is `reach.ts fightRec` (the pool's gear, caps 6/6) and, at today's price, also `reach.ts potionRec` with every
potion the character may drink a candidate at its chain's price **with the stock left out** (`consumables.ts chainSec` on an
empty bank — as `consumables.ts potionSet` asks it, without its three-level bound); the cheaper of the two by seconds per XP is
taken. Seconds a kill = the fight and its healing (`bis.ts killSeconds` with no potion price, the pool's food) + the walks
(`cost.ts killWalk`) + the potions' making (used × chain seconds). "Potions free" = `potionK` 0 (row B's config: every potion
an extra candidate, free). Hours a level = `xpNeeded[L]` ÷ XP an hour (`xp.ts fightXp`, the set's wisdom). The pools: (i) the bank
of the World without its potions (`consumables.ts gearWorld`); (ii) plus every gear piece the three crafters can make at their
skill today; (iii)–(v) every piece of weapon-, gear- and jewelrycrafting at level ≤ 30, 35, 40; five copies of each piece (ten
of a ring) in the bank. A piece whose recipe tree needs a material with an event gate, a boss (group fight) gate, a toll, tasks
coins or gold, or that has no source at all, is only in the **+special** column (`special()` walks the recipes with
`targets.ts sourceFor` and `supply.ts tradeOf`). Pieces: (ii) 65 plain / 23 special, (iii) 72 / 67, (iv) 72 / 88, (v) 73 / 129.
Beyond 30 almost every new piece is special: jasper crystal (tasks coins) in the jewellery, event materials (full moon vampire
cape, lizard skin, demon horn, magic wood, strange ore, malefic cloth), King Slimeballs (a boss) and island materials (another
layer).

**Per fighter, the best of the three XP monsters it wins safely** (hours a level · monster · seconds a kill (of it the
potions' making) · potions a kill; at today's price | potions free). First, Fourth and Fifth are Third's numbers (the same
level, the same pool):

Second (25)
| pool | L25 today | L25 free | L30 today | L30 free | L35 today | L35 free | L40 today | L40 free |
|---|---|---|---|---|---|---|---|---|
| i | 7.7 · wolf · 47 · 0.0 | 3.1 · rat · 52 · 7.0 | 44.9 · rat · 476 (356) · 7.0 | 5.3 · owlbear · 92 · 24.0 | 83.6 · rat · 427 (305) · 6.0 | 7.2 · hellhound · 174 · 27.0 | 617 · owlbear · 3711 (3587) · 8.0 | 9.2 · hellhound · 165 · 18.0 |
| ii | 7.3 · pig · 57 · 0.0 | 3.0 · ogre · 42 · 6.0 | 12.4 · rat · 132 · 0.0 | 5.4 · owlbear · 91 · 20.0 | 25.4 · rat · 120 · 0.0 | 7.2 · owlbear · 84 · 16.0 | 578 · owlbear · 3252 (3139) · 7.0 | 8.9 · hellhound · 152 · 20.0 |
| ii +sp | 6.1 · highwayman · 36 · 0.0 | 2.9 · spider · 35 · 6.0 | 11.6 · rat · 117 · 0.0 | 4.8 · owlbear · 77 · 20.0 | 24.1 · rat · 114 · 0.0 | 7.2 · owlbear · 80 · 10.0 | 481 · owlbear · 2702 (2586) · 8.0 | 8.4 · hellhound · 145 · 17.0 |
| iii | 7.0 · highwayman · 43 · 0.0 | 3.0 · spider · 37 · 8.0 | 10.4 · rat · 105 · 0.0 | 4.1 · cyclops · 44 · 8.0 | 21.8 · rat · 103 · 0.0 | 5.7 · hellhound · 137 · 22.0 | 482 · owlbear · 2808 (2691) · 6.0 | 7.2 · orc · 88 · 20.0 |
| iii +sp | 4.6 · wolf · 28 · 0.0 | 2.9 · owlbear · 72 · 20.0 | 3.4 · rat · 35 · 0.0 | 1.9 · owlbear · 33 · 4.0 | 6.4 · owlbear · 75 · 0.0 | 2.9 · owlbear · 34 · 2.0 | 12.3 · owlbear · 74 · 0.0 | 4.0 · orc · 48 · 10.0 |
| iv | 7.0 · highwayman · 43 · 0.0 | 3.0 · spider · 37 · 8.0 | 10.4 · rat · 105 · 0.0 | 4.1 · cyclops · 44 · 8.0 | 21.8 · rat · 103 · 0.0 | 5.7 · hellhound · 137 · 22.0 | 482 · owlbear · 2808 (2691) · 6.0 | 7.2 · orc · 88 · 20.0 |
| iv +sp | 4.6 · wolf · 28 · 0.0 | 2.9 · owlbear · 72 · 20.0 | 3.4 · rat · 35 · 0.0 | 1.9 · owlbear · 33 · 4.0 | 5.8 · rat · 28 · 0.0 | 2.5 · goblin · 30 · 4.0 | 12.1 · owlbear · 68 · 0.0 | 3.5 · orc · 40 · 10.0 |
| v | 7.0 · highwayman · 43 · 0.0 | 3.0 · spider · 37 · 8.0 | 10.4 · rat · 105 · 0.0 | 4.1 · cyclops · 44 · 8.0 | 21.8 · rat · 103 · 0.0 | 5.7 · hellhound · 137 · 22.0 | 481 · owlbear · 2706 (2586) · 8.0 | 7.2 · orc · 88 · 20.0 |
| v +sp | 4.6 · wolf · 28 · 0.0 | 2.9 · owlbear · 72 · 20.0 | 3.4 · rat · 35 · 0.0 | 1.9 · owlbear · 33 · 4.0 | 5.8 · rat · 28 · 0.0 | 2.5 · goblin · 30 · 4.0 | 6.1 · hellhound · 102 · 0.0 | 3.3 · orc · 38 · 4.0 |

Third (First, Fourth and Fifth are alike: 23, the same pool)
| pool | L23 today | L23 free | L28 today | L28 free | L33 today | L33 free | L38 today | L38 free |
|---|---|---|---|---|---|---|---|---|
| i | 5.3 · pig · 76 · 0.0 | 2.5 · rat · 52 · 7.0 | 11.1 · pig · 64 · 0.0 | 4.4 · rat · 56 · 7.0 | 80.1 · rat · 477 (356) · 7.0 | 7.0 · cultist_acolyte · 100 · 30.0 | 347 · imp · 2658 (2497) · 10.0 | 9.1 · hellhound · 180 · 40.0 |
| ii | 4.5 · pig · 60 · 0.0 | 2.3 · spider · 36 · 8.0 | 9.7 · pig · 56 · 0.0 | 4.2 · rat · 52 · 7.0 | 21.9 · rat · 121 · 0.0 | 6.8 · owlbear · 91 · 20.0 | 292 · imp · 2170 (1997) · 8.0 | 8.8 · hellhound · 177 · 36.0 |
| ii +sp | 4.1 · pig · 55 · 0.0 | 2.3 · spider · 33 · 6.0 | 9.5 · pig · 53 · 0.0 | 4.6 · vampire · 50 · 8.0 | 20.8 · rat · 115 · 0.0 | 6.2 · owlbear · 80 · 16.0 | 261 · imp · 1944 (1794) · 4.0 | 8.4 · hellhound · 160 · 34.0 |
| iii | 4.5 · pig · 60 · 0.0 | 2.3 · spider · 36 · 8.0 | 9.9 · pig · 55 · 0.0 | 4.4 · rat · 52 · 8.0 | 17.5 · vampire · 86 · 0.0 | 5.3 · hellhound · 144 · 46.0 | 103 · imp · 768 (611) · 12.0 | 7.5 · orc · 103 · 32.0 |
| iii +sp | 4.1 · pig · 55 · 0.0 | 2.3 · spider · 33 · 6.0 | 7.0 · pig · 39 · 0.0 | 3.6 · rat · 44 · 4.0 | 5.6 · owlbear · 76 · 0.0 | 2.4 · owlbear · 33 · 4.0 | 10.9 · owlbear · 74 · 0.0 | 3.9 · hellhound · 76 · 14.0 |
| iv | 4.5 · pig · 60 · 0.0 | 2.3 · spider · 36 · 8.0 | 9.9 · pig · 55 · 0.0 | 4.4 · rat · 52 · 8.0 | 17.5 · vampire · 86 · 0.0 | 5.3 · hellhound · 144 · 46.0 | 103 · imp · 768 (611) · 12.0 | 7.5 · orc · 103 · 32.0 |
| iv +sp | 4.1 · pig · 55 · 0.0 | 2.3 · spider · 33 · 6.0 | 7.0 · pig · 39 · 0.0 | 3.6 · rat · 44 · 4.0 | 5.6 · owlbear · 76 · 0.0 | 2.4 · owlbear · 33 · 4.0 | 8.6 · cultist_acolyte · 82 · 0.0 | 3.0 · goblin · 30 · 4.0 |
| v | 4.5 · pig · 60 · 0.0 | 2.3 · spider · 36 · 8.0 | 9.9 · pig · 55 · 0.0 | 4.4 · rat · 52 · 8.0 | 17.5 · vampire · 86 · 0.0 | 5.3 · hellhound · 144 · 46.0 | 103 · imp · 768 (611) · 12.0 | 7.5 · orc · 103 · 32.0 |
| v +sp | 4.1 · pig · 55 · 0.0 | 2.3 · spider · 33 · 6.0 | 7.0 · pig · 39 · 0.0 | 3.6 · rat · 44 · 4.0 | 5.6 · owlbear · 76 · 0.0 | 2.4 · owlbear · 33 · 4.0 | 8.6 · cultist_acolyte · 82 · 0.0 | 3.0 · goblin · 30 · 4.0 |

**The roads** (fleet-hours from the World to combat 30 / 35 / 40 / 45, each fighter the best monster at every level; fight +
the potions' making; "×" = no safe XP monster on the way):

at today's potion price (the chain's)
| pool | First | Second | Third | Fourth | Fifth | fleet to 30 / 35 / 40 (fight + potions) | gear bill h |
|---|---|---|---|---|---|---|---|
| i | 61.2 / 415 / 2055 / 5867 | 53.1 / 387 / 2018 / 5715 | 61.2 / 415 / 2055 / 5867 | 61.2 / 415 / 2055 / 5867 | 61.2 / 415 / 2055 / 5867 | 298 (298 + 0.0) / 2047 (749 + 1299) / 10238 (1260 + 8978) | 0.8 |
| ii | 53.5 / 150 / 1512 / 5174 | 44.2 / 141 / 1503 / 5164 | 53.5 / 150 / 1512 / 5174 | 53.5 / 150 / 1512 / 5174 | 53.5 / 150 / 1512 / 5174 | 258 (258 + 0.0) / 742 (742 + 0.0) / 7552 (1293 + 6260) | ∞ |
| iii | 54.4 / 132 / 873 / 3602 | 45.0 / 123 / 864 / 3593 | 54.4 / 132 / 873 / 3602 | 54.4 / 132 / 873 / 3602 | 54.4 / 132 / 873 / 3602 | 262 (262 + 0.0) / 651 (651 + 0.0) / 4355 (1157 + 3197) | ∞ |
| iv | 54.4 / 132 / 873 / 3602 | 45.0 / 123 / 864 / 3593 | 54.4 / 132 / 873 / 3602 | 54.4 / 132 / 873 / 3602 | 54.4 / 132 / 873 / 3602 | 262 (262 + 0.0) / 651 (651 + 0.0) / 4355 (1157 + 3197) | ∞ |
| v | 54.4 / 132 / 873 / 3601 | 45.0 / 123 / 864 / 3592 | 54.4 / 132 / 873 / 3601 | 54.4 / 132 / 873 / 3601 | 54.4 / 132 / 873 / 3601 | 262 (262 + 0.0) / 651 (651 + 0.0) / 4355 (1157 + 3197) | ∞ |
| ii +special | 51.8 / 143 / 1334 / 4384 | 43.0 / 134 / 1325 / 4375 | 51.8 / 143 / 1334 / 4384 | 51.8 / 143 / 1334 / 4384 | 51.8 / 143 / 1334 / 4384 | 250 (250 + 0.0) / 707 (707 + 0.0) / 6661 (1200 + 5460) | ∞ |
| iii +special | 40.0 / 65.1 / 114 / 691 | 31.2 / 56.2 / 106 / 682 | 40.0 / 65.1 / 114 / 691 | 40.0 / 65.1 / 114 / 691 | 40.0 / 65.1 / 114 / 691 | 191 (191 + 0.0) / 316 (316 + 0.0) / 563 (563 + 0.0) | ∞ |
| iv +special | 40.0 / 65.1 / 104 / 180 | 31.2 / 56.2 / 95.5 / 171 | 40.0 / 65.1 / 104 / 180 | 40.0 / 65.1 / 104 / 180 | 40.0 / 65.1 / 104 / 180 | 191 (191 + 0.0) / 316 (316 + 0.0) / 513 (513 + 0.0) | ∞ |
| v +special | 40.0 / 65.1 / 104 / 139 | 31.2 / 56.2 / 95.5 / 130 | 40.0 / 65.1 / 104 / 139 | 40.0 / 65.1 / 104 / 139 | 40.0 / 65.1 / 104 / 139 | 191 (191 + 0.0) / 316 (316 + 0.0) / 513 (513 + 0.0) | ∞ |

potions free
| pool | First | Second | Third | Fourth | Fifth | fleet to 30 / 35 / 40 (fight + potions) | gear bill h |
|---|---|---|---|---|---|---|---|
| i | 25.1 / 57.0 / 99.9 / 151 | 19.5 / 49.0 / 90.2 / 142 | 25.1 / 57.0 / 99.9 / 151 | 25.1 / 57.0 / 99.9 / 151 | 25.1 / 57.0 / 99.9 / 151 | 120 (120 + 0.0) / 277 (277 + 0.0) / 490 (490 + 0.0) | 1.0 |
| ii | 24.2 / 54.7 / 96.4 / 147 | 19.3 / 49.8 / 91.5 / 142 | 24.2 / 54.7 / 96.4 / 147 | 24.2 / 54.7 / 96.4 / 147 | 24.2 / 54.7 / 96.4 / 147 | 116 (116 + 0.0) / 269 (269 + 0.0) / 477 (477 + 0.0) | ∞ |
| iii | 24.6 / 49.6 / 83.9 / 125 | 19.8 / 44.8 / 79.0 / 120 | 24.6 / 49.6 / 83.9 / 125 | 24.6 / 49.6 / 83.9 / 125 | 24.6 / 49.6 / 83.9 / 125 | 118 (118 + 0.0) / 243 (243 + 0.0) / 415 (415 + 0.0) | ∞ |
| iv | 24.6 / 49.6 / 83.9 / 125 | 19.8 / 44.8 / 79.0 / 120 | 24.6 / 49.6 / 83.9 / 125 | 24.6 / 49.6 / 83.9 / 125 | 24.6 / 49.6 / 83.9 / 125 | 118 (118 + 0.0) / 243 (243 + 0.0) / 415 (415 + 0.0) | ∞ |
| v | 24.6 / 49.6 / 83.9 / 126 | 19.8 / 44.8 / 79.0 / 121 | 24.6 / 49.6 / 83.9 / 126 | 24.6 / 49.6 / 83.9 / 126 | 24.6 / 49.6 / 83.9 / 126 | 118 (118 + 0.0) / 243 (243 + 0.0) / 415 (415 + 0.0) | ∞ |
| ii +special | 25.0 / 53.9 / 94.7 / 143 | 20.0 / 48.9 / 89.7 / 138 | 25.0 / 53.9 / 94.7 / 143 | 25.0 / 53.9 / 94.7 / 143 | 25.0 / 53.9 / 94.7 / 143 | 120 (120 + 0.0) / 265 (265 + 0.0) / 468 (468 + 0.0) | ∞ |
| iii +special | 22.0 / 33.6 / 51.2 / 74.1 | 17.0 / 28.6 / 46.2 / 69.1 | 22.0 / 33.6 / 51.2 / 74.1 | 22.0 / 33.6 / 51.2 / 74.1 | 22.0 / 33.6 / 51.2 / 74.1 | 105 (105 + 0.0) / 163 (163 + 0.0) / 251 (251 + 0.0) | ∞ |
| iv +special | 22.0 / 33.6 / 48.2 / 68.2 | 17.0 / 28.6 / 43.2 / 63.2 | 22.0 / 33.6 / 48.2 / 68.2 | 22.0 / 33.6 / 48.1 / 68.2 | 22.0 / 33.6 / 48.1 / 68.2 | 105 (105 + 0.0) / 163 (163 + 0.0) / 236 (236 + 0.0) | ∞ |
| v +special | 22.0 / 33.6 / 48.2 / 66.7 | 17.0 / 28.6 / 43.2 / 61.7 | 22.0 / 33.6 / 48.2 / 66.7 | 22.0 / 33.6 / 48.1 / 66.7 | 22.0 / 33.6 / 48.1 / 66.7 | 105 (105 + 0.0) / 163 (163 + 0.0) / 236 (236 + 0.0) | ∞ |

Days, for the fleet (five characters at 23.3 h a day after offerings): to combat 35 at today's price on today's pool 2,047
fleet-hours = **17.6 days**, with the crafters' plain pieces 651–742 = **5.6–6.4 days**, with the special pieces 316 = **2.7
days**, potions free 243–277 = **2.1–2.4 days**; to combat 40: **88 days** (today's pool), **37 days** (plain pieces of
crafters at 30+), **4.4 days** (special pieces), **3.6–4.2 days** (potions free).

**Where it stops**: on today's pool at today's price the road does not stop — it becomes dear: above 33–35 every safe XP monster
needs potions whose making is most of the kill (an owlbear kill at 40: 3,711 s, 3,587 of them the potions; an imp kill at 38: 2,658
s, 2,497 of them potions — the potion it drinks there sits behind an alchemy level road); with the plain pieces of crafters at
30–40 it still costs 103 h a level at 38 (imp, 611 s of a 768 s kill in potions). The special pieces make potions unnecessary up
to 40 (owlbear, cultist acolyte, hellhound at 0–1 potion a kill). Their bills cannot be met today: King Slimeball (a boss, group
fight), Priestess Orb, Dark Essence, Cursed Flask (another layer), demon horn and malefic cloth (events whose calendar is ∞ with
the members that can go: portal demon, cult of darkness); the rest of the events' materials take 43–174 h of calendar each
(full moon vampire cape 43 h, bandit camp lizard skin 145–174 h, magic wood 56–113 h, strange ore 56 h — `billOf`'s `events`).

**The crafters' own roads by the model** (`cost.ts hoursToLevel`: `craftK` 0.1 × the atlas's `craftTrain` hours to 40,
`craftAbove40` 60 h a level above):
- weaponcrafting (Second, 20): to 30 **45.1 h**, 35 **199.8 h**, 40 **464.7 h**, 45 764.7 h (from 31 a level costs 33–60 h:
  the atlas's recipe there needs drops the model prices dear);
- gearcrafting (Third, 22): to 30 **38.4 h**, 35 **92.3 h**, 40 **190.1 h**, 45 490.1 h;
- jewelrycrafting (Fourth, 20): to 30 **49.5 h**, 35 **90.9 h**, 40 **148.1 h**, 45 448.1 h.
By section 2's measure (one level in the journal — Third's gearcrafting 22 → 23 on 11-22, 2,353 s against 12,388 s planned,
fed from the bank but for a skeleton-bone hunt — and the old train loops of `logs/dev.log` at levels 10–19, which sourced
everything): **from scratch a level costs 5.7–8.4 times the model's hours** (350–450 XP a fleet-hour against the atlas's rate ×
`craftK` 0.1), **from bank stock 0.31–0.58 of them**:

| road | the model | from scratch (section 2) |
|---|---|---|
| weaponcrafting 20 → 30 · 30 → 35 · 35 → 40 | 45 · 155 · 265 h | 257–266 · 882–913 · 1,510–1,563 fleet-h |
| gearcrafting 23 → 30 · 30 → 35 · 35 → 40 | 35 · 54 · 98 h | 252–294 · 388–453 · 704–821 fleet-h |
| jewelrycrafting 21 → 30 · 30 → 35 · 35 → 40 | 47 · 41 · 57 h | 321–344 · 286–306 · 395–424 fleet-h |

So the model's crafters' floors (`C30`, `C35`) are priced cheap: in play, unless the bank's stock feeds them, 30 for the three
crafters is about 830–900 fleet-hours, not 133.

**What the points behind combat are** (the open achievements of the World by the combat level their targets' gates ask — a
`level` gate of combat, or a `win` gate's level, the atlas's guess, `targets.ts`; cumulated; 181 points open in 70
achievements):

| combat ≤ | points | achievements | of them also waiting for |
|---|---|---|---|
| 30 | 7 | 3 (arachnophobia_conquered 2 @25, the_new_bandit 2 @30, the_reaper 3 @30) | an event 2 |
| 35 | 11 | + cultist_purifier 4 @32 | an event 2 |
| 40 | 21 | + cult_destroyer 2, its_malefic 4, king_of_the_goblins 3, loktar_ogar 1 | an event 8 |
| 45 | 32 | + clean_the_lab 3, closing_the_gate 4, corruption_eradicator 4 | an event 16, a toll 3 |
| 50 | 46 | + a_peaceful_island 4, draconic_harvest 4, grand_master 3, secure_the_island 3 | an event 23, a toll 10 |
| no combat gate in the targets | 135 | 55 | a group (bosses) 38, another layer/toll 47, an event 17, `use` 10, a raid 8, unhandled 4, nothing else 54 |

So by the planner's gates only 46 points sit behind a combat level, and half of them also wait for an event's calendar; the
map's count (81 of 195 behind combat 41+, decision 11) also counts the island's monsters, the bosses and the raids, whose gates
here are "another layer", "a group", "a raid" — they need combat too, and something else first.

**What this section answers alone.** The combat road is not expensive in fight-hours (about 25–60 a fighter to 30, 50–130 to
35); it is expensive in **potions**, and what removes the potions is not the crafters' level but the **special materials** of
the pieces they would make: with the crafters' plain recipes at 30, 35 or 40 a level at 38 still costs 100 h at today's potion
price; with the special pieces 9–11 h; with potions free 7–9 h. Levelling the three crafters to 30/35/40 by itself buys little
(pools iii–v plain equal each other within a tenth), so a `C` policy alone cannot pay; the spine (`S`) pays only where
potions are cheap or gear with event/coin/boss materials is made. That is the shape the policies' runs below confirm or not.
## The policies
**How they were built and played.** The scratch tree is `git archive HEAD src scripts public/data package.json tsconfig.json`
in `D:\Temp\a022\repo` (a scratch git repo, base `a45e6cf` = HEAD's tree), `node_modules` a junction to the project's. Each
policy is a key of `PlannerConfig` (`src/plan/planner/types.ts`, the scratch tree), off by default, on its own branch, merged
into one tree `all` that every run of stages A and B used (frozen copies `t/all`, `t/all2`, `t/all3` as keys were added; the
runs started after a key was added used the copy that has it). The patches are in `docs/strategy/022/policies/` (one a
policy: the branch's diff against HEAD, `src/` only; each applies to HEAD — `git apply --check`, run by me); each run's lines
are `docs/strategy/022/runs/<name>.jsonl` (`A-` 42 days, `B-` the deadline; `P0`/`P0d`/`P0s` the deadline).

| key (scratch) | where | what it does |
|---|---|---|
| `home` 1 (**P0s**, in every policy) | `forward.ts:194` → `advance`; `reach.ts homeBankOf` | a step with a toll (`step.toll.via`) ends with its character at the bank its round trip starts from — the home side; P0 put it on the work tile (on Sandwhisper Isle) |
| `spine` N (**S30/S35/S40**) | new `tier.ts`; `decide.ts` (`tierOf`, `levelCand`'s tag, the first tier `firstOf`), `supply.ts supplyNeeds` (every parent of a leaf) | while a character's combat is below N: its combat level step; the gear pieces of an (a) need of a character below N (gear.ts) and the crafter's level for them; the consumable needs whose work is such a road (`workKey` `lvl:combat:…@who`); every supply leaf one of whose parents is such a piece or need, and a level gated in such a chain — all in the first tier, ranked as `config.first` ranks (`decide.ts:361-364`) |
| `crafters` N (**C30/C35**) | `tier.ts floorLanes`, `decide.ts` | each gear-crafting role holder (Second weapon-, Third gear-, Fourth jewelrycrafting) below N gets the level candidate `lvl:<skill>:N` (one level of `train` at a time; the train step sources inside itself in the model, so "their materials' supply with it"), first tier, scored by its lane's bundle where one exists, else last within the tier |
| both (**CS**) | `tier.ts firstOf` | a crafter below its floor takes its floor (and a tight calendar) alone; everyone else, and a crafter at its floor, the spine |
| `calKeep` H (72 when spine or crafters is on) | `tier.ts calTight` | **the calendar guard**: a level candidate whose bundle holds an event achievement with 0 ≤ slack < 72 h (slack = hours to the deadline − the road − the calendar, `bundle.ts cal`) joins the first tier |
| `gates` 1 (**D1**) | `bundle.ts bestGate` | rule 3's bundle is the best gate of the lane by Σ points that fit ÷ (hours to g + their hours), then points per hour, then the nearest — not the nearest gate (`bundle.ts:128-129`). Its cost bounded: the road is walked once to the farthest gate with `hoursToLevel` and the combat pace (`cost.ts roadRate`, monsters up to ten levels up) memoised per World, past a wall at the last pace, so no solve beyond the nearest gate's (the solve counts in the table) |
| `fleetGear` 1 (**D2**, run as D1+D2) | `gear.ts fleetRoad`, `fleetNeeds` | gear by need (a) for the fleet: per fighter its pick and flips solved with every candidate (the same solve as (a)'s first); fighters whose sets share a piece form a group; one G for the union (each wearer's copies; a crafter's level road once — `makeHours` takes the highest level per crafter); the need holds when G + Σ H1 ≤ 0.85 × Σ H0, else the dearest piece goes and the members solve again (at most three times); each member's score carries G ÷ members |
| `fighters` [names] (**F3**) | `roles.ts fights`; `decide.ts` lanes; gear.ts and consumables.ts (a) | only the named characters have the combat lane (no combat level step, no road need); kills for objectives and supply stay open to all |
| `potionK` 0 (**B**) | the replay's row B config | consumables free (no code) |
| `runes` 5 (**R**, my own) | `forward.ts forward` | five healing runes (10,000 gold each, the `rune_vendor`) in the bank at the start, their gold off the bank |
| `buy` {algae: 37,000} (**I**, my own) | `forward.ts forward` | 37,000 algae in the bank at the start (≈ 74,000 gold at 2, about a third of the market's 1,270 a day over the season) |

**Why R and I** (section 1): the leaders' fighters at 35+ wear a healing rune (21 of 21) and carry cooked fish; nobody drinks
restore potions, and nobody sells them (0 Minor Health Potions sold in seven days) — but the ingredients sell cheaply, and algae
is 35 of the 46 hours behind 1,000 Minor Health Potions. R is the leaders' sustain bought; I is the one part of `B` a market
actually offers.

**Every key off = P0, to the digit.** The final tree (`t/all3`, every key) with `{}`: **97 of 97 lines equal to P0's and all
9,014 decisions identical** (`runs/B-off.jsonl`; `<s>/tools/cmp.mjs`; `cmp` of the decision files). A 42-day run is the first
42 days of the deadline run: the 42-day lines and all decisions equal for A/B-S30 (4,332 decisions), C35 (3,800), B (2,644),
D1 (3,048) and A-off/P0 (4,260) — so for the combinations played only to the deadline (S30+D1D2, F3 on D1+D2, I on S30, S25)
stage A is their first 42 days.

**The harness, first** (settled point 1): the untouched tree (`P0`, HEAD's `scripts/outlook.mts --world <w> --json`) from the
fixed World: **98 at the deadline, 36 completions, 9,014 steps** — report 021's road; the seven dates report 021 names
(cultist_purifier and cult_destroyer 12-09, loktar_ogar 12-17, cursed_wood_blessed_victory 12-25, king_of_the_goblins 01-14,
closing_the_gate and its_malefic 01-31) are the same; 4,883.8 s beside eleven other runs (report 021: 3,587.7 s alone), peak
1,481 MB. My driver (`<s>/tools/drive.mts`: `road()`'s body with read-only hooks — the levels at each midnight, hours by answer,
potions drunk, kills, every decision, `waitingOf` at the end) on the same tree (`P0d`): the same 97 lines.

**The repair** (`P0s`, settled point 2) is small (6 lines, `P0s.patch`) and is worth **+8 points on day 42 (73 against 65) and
+2 at the deadline (100 against 98)**. P0 and P0s part at decision 700, **11-29 15:42 UTC (day 8)**: Third's
`ach:potion_brewer:0@Third#1`, the same step, 0.07 h in P0 and 0.048 h in P0s — Third's walk starts from the bank on the home
side instead of from where its last tolled step put it. In P0s the fleet reaches combat 44–45 by the deadline (P0: 30–47).

**Speed** (settled point 3): not bought. The runs fit the machine's time (12 side by side, the longest 5,928 s), so the solve
table's cap was left alone.

**Ran side by side**: 12 runs at a time (16 physical cores less four), each `--max-old-space-size=2048`, together at most about
10.4 GB (`<s>/out/watch.log`); from 21:07 UTC at Idle priority (below the service's outlook child), which changes no line.
Seconds in the tables are wall seconds beside 11 other runs, not alone.
### The comparison
Every run from the same World (`logs/world/2026-11-22.json`, 00:00:32 UTC; 29 points in it, 30 in play since 18:46), with the
stranding repair unless the name is `P0`/`P0d`/`off`. "Day n" counts from 11-22 (day 1) — season day n + 29; day 94 ends at the
deadline 2027-02-24 00:00 UTC. "105 on" / "158 on" = the day the run passes 105 / 158 points (— = never). Combat: First / Second
/ Third / Fourth / Fifth; crafters: Second weaponcrafting / Third gearcrafting / Fourth jewelrycrafting at the end. Shares are of
the fleet's character-hours by the step's work (fight = kill steps + event shares, make = craft, train, buy, gather = gather
steps; tasks and offerings are the rest). Potions = potions and food drunk and eaten (`forward.ts drinksOf`); B's are free and
counted 0 here (what its sets drink is in its table below). Seconds are wall seconds beside eleven other runs. `P0`'s own row is
`scripts/outlook.mts`'s (no stats line; its road is `P0d`'s, line for line).

**Stage B — to the deadline** (`node docs/strategy/022/tools/tab.mjs docs/strategy/022/runs <runs>`):

| policy | d7 | d14 | d21 | d28 | d42 | d56 | d70 | d84 | end | 105 on | 158 on | compl. | combat d42 | combat end | crafters end (wc/gc/jc) | fight % | make % | gather % | potions | kills | kill steps | s | solves |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P0 | 42 | 50 | 56 | 58 | 65 | 75 | 76 | 88 | **98** | — | — | 36 | — | — | — | 0 | 0 | 0 | 0 | 0 | — | 4884 | — |
| P0d | 42 | 50 | 56 | 58 | 65 | 75 | 76 | 88 | **98** | — | — | 36 | 31/43/28/41/39 | 46/47/30/47/47 | 37/42/41 | 14 | 13 | 71 | 187577 | 524269 | 2231 | 4942 | 561817 |
| P0s | 42 | 49 | 56 | 58 | 73 | 81 | 90 | 98 | **100** | — | — | 37 | 33/41/38/42/38 | 44/45/45/45/45 | 37/42/41 | 13 | 16 | 66 | 173883 | 476630 | 2037 | 5928 | 623910 |
| B-S25 | 37 | 44 | 48 | 59 | 78 | 88 | 93 | 98 | **98** | — | — | 36 | 36/41/41/40/41 | 45/45/45/45/45 | 37/43/43 | 13 | 14 | 70 | 171692 | 498248 | 1859 | 3600 | 489851 |
| B-S30 | 36 | 43 | 48 | 55 | 66 | 72 | 84 | 98 | **103** | — | — | 37 | 41/41/41/41/41 | 44/46/45/45/45 | 38/40/40 | 12 | 11 | 63 | 165624 | 486609 | 1652 | 3357 | 359000 |
| B-S35 | 37 | 41 | 50 | 52 | 55 | 66 | 83 | 94 | **94** | — | — | 35 | 39/45/39/42/43 | 45/47/45/45/46 | 38/41/41 | 14 | 12 | 70 | 185469 | 547483 | 2023 | 5392 | 589590 |
| B-S40 | 37 | 41 | 43 | 52 | 55 | 64 | 79 | 88 | **92** | — | — | 32 | 41/41/37/42/41 | 46/46/45/47/46 | 31/42/30 | 15 | 6 | 76 | 188486 | 576637 | 1808 | 4646 | 504750 |
| B-C30 | 43 | 50 | 57 | 60 | 65 | 77 | 77 | 85 | **101** | — | — | 37 | 27/46/28/31/30 | 38/50/35/45/45 | 33/40/31 | 15 | 9 | 74 | 207943 | 702661 | 2468 | 5018 | 558147 |
| B-C35 | 41 | 47 | 51 | 61 | 68 | 80 | 86 | 93 | **101** | — | — | 37 | 25/46/26/26/45 | 28/50/29/28/50 | 38/40/41 | 11 | 14 | 67 | 166622 | 529620 | 1734 | 2214 | 237916 |
| B-CS | 35 | 39 | 44 | 52 | 63 | 69 | 80 | 87 | **94** | — | — | 33 | 34/43/34/45/42 | 40/50/41/50/49 | 35/40/35 | 16 | 8 | 72 | 199404 | 722469 | 2322 | 5226 | 580992 |
| B-D1 | 42 | 49 | 52 | 52 | 61 | 69 | 69 | 69 | **69** | — | — | 23 | 24/28/24/24/24 | 24/28/24/24/24 | 31/36/41 | 1 | 4 | 82 | 13208 | 2939 | 130 | 503 | 12555 |
| B-D1D2 | 42 | 49 | 56 | 62 | 71 | 81 | 81 | 89 | **93** | — | — | 34 | 28/40/29/28/30 | 36/48/39/34/46 | 31/40/38 | 12 | 9 | 75 | 204217 | 530740 | 2207 | 5345 | 569112 |
| B-S30D1D2 | 35 | 40 | 43 | 51 | 59 | 71 | 80 | 88 | **95** | — | — | 35 | 36/41/34/37/38 | 46/47/43/46/46 | 34/40/40 | 12 | 12 | 72 | 183216 | 396705 | 1830 | 3784 | 454658 |
| B-F3S30 | 37 | 41 | 50 | 54 | 64 | 76 | 90 | 90 | **92** | — | — | 35 | 38/27/24/44/45 | 46/27/24/46/47 | 45/45/45 | 9 | 24 | 56 | 140734 | 375122 | 1530 | 2113 | 241164 |
| B-F3D1D2 | 40 | 49 | 51 | 53 | 63 | 72 | 80 | 88 | **93** | — | — | 34 | 26/28/26/36/40 | 27/28/26/44/45 | 39/41/41 | 9 | 16 | 62 | 129412 | 416070 | 1406 | 1600 | 204754 |
| B-R5 | 42 | 47 | 56 | 61 | 67 | 80 | 83 | 87 | **97** | — | — | 35 | 40/45/43/45/45 | 46/48/46/48/48 | 32/44/40 | 13 | 12 | 72 | 186954 | 393307 | 2024 | 4997 | 538685 |
| B-I | 42 | 50 | 56 | 59 | 65 | 80 | 88 | 91 | **95** | — | — | 34 | 32/46/33/45/45 | 40/50/41/49/50 | 33/40/35 | 18 | 9 | 70 | 252086 | 835202 | 2858 | 6457 | 803349 |
| B-IS30 | 43 | 45 | 51 | 54 | 63 | 82 | 94 | 100 | **100** | — | — | 37 | 44/45/42/44/44 | 45/45/46/46/46 | 45/45/41 | 13 | 22 | 57 | 219700 | 550047 | 2157 | 3672 | 464626 |
| B-B | 53 | 60 | 73 | 89 | 104 | 116 | 119 | 121 | **121** | 46 | — | 43 | 25/50/50/42/50 | 26/50/50/43/50 | 45/40/41 | 8 | 17 | 62 | 0 | 70930 | 411 | 668 | 31848 |
| B-BS30 | 52 | 60 | 65 | 85 | 103 | 115 | 119 | 121 | **121** | 46 | — | 43 | 39/48/50/41/50 | 39/48/50/41/50 | 45/40/41 | 9 | 16 | 62 | 0 | 74989 | 438 | 1045 | 52969 |
| B-BD1D2 | 52 | 59 | 68 | 93 | 99 | 119 | 119 | 121 | **121** | 45 | — | 43 | 25/49/50/42/50 | 26/50/50/42/50 | 45/36/41 | 8 | 14 | 65 | 0 | 69115 | 390 | 514 | 23759 |
| B-off | 42 | 50 | 56 | 58 | 65 | 75 | 76 | 88 | **98** | — | — | 36 | 31/43/28/41/39 | 46/47/30/47/47 | 37/42/41 | 14 | 13 | 71 | 187577 | 524269 | 2231 | 4708 | 561817 |

**Stage A — 42 days** (the 42-day runs; the combinations played only to the deadline have stage B's first 42 days above):

| policy | d7 | d14 | d21 | d28 | d42 | d56 | d70 | d84 | end | 105 on | 158 on | compl. | combat d42 | combat end | crafters end (wc/gc/jc) | fight % | make % | gather % | potions | kills | kill steps | s | solves |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A-off | 42 | 50 | 56 | 58 | 65 | — | — | — | **65** | — | — | 23 | 31/43/28/41/39 | 31/43/28/41/39 | 32/37/33 | 15 | 9 | 72 | 101972 | 225274 | 1193 | 2308 | 299086 |
| A-S30 | 36 | 43 | 48 | 55 | 66 | — | — | — | **66** | — | — | 23 | 41/41/41/41/41 | 41/41/41/41/41 | 30/32/30 | 19 | 7 | 71 | 112520 | 266147 | 1292 | 2536 | 284487 |
| A-S35 | 37 | 41 | 50 | 52 | 55 | — | — | — | **55** | — | — | 17 | 39/45/39/42/43 | 39/45/39/42/43 | 30/31/31 | 20 | 6 | 71 | 117026 | 320333 | 1304 | 3081 | 394741 |
| A-S40 | 37 | 41 | 43 | 52 | 55 | — | — | — | **55** | — | — | 16 | 41/41/37/42/41 | 41/41/37/42/41 | 30/35/30 | 19 | 6 | 72 | 107577 | 270376 | 1159 | 2830 | 352343 |
| A-C30 | 43 | 50 | 57 | 60 | 65 | — | — | — | **65** | — | — | 23 | 27/46/28/31/30 | 27/46/28/31/30 | 30/34/30 | 15 | 7 | 75 | 91719 | 305727 | 1076 | 1682 | 212128 |
| A-C35 | 41 | 47 | 51 | 61 | 68 | — | — | — | **68** | — | — | 24 | 25/46/26/26/45 | 25/46/26/26/45 | 35/38/35 | 14 | 13 | 71 | 80264 | 212703 | 866 | 1225 | 129566 |
| A-CS | 35 | 39 | 44 | 52 | 63 | — | — | — | **63** | — | — | 21 | 34/43/34/45/42 | 34/43/34/45/42 | 35/38/35 | 17 | 12 | 68 | 99994 | 237959 | 1158 | 2370 | 303342 |
| A-D1 | 42 | 49 | 52 | 52 | 61 | — | — | — | **61** | — | — | 20 | 24/28/24/24/24 | 24/28/24/24/24 | 31/36/41 | 2 | 9 | 63 | 13208 | 2939 | 130 | 275 | 12555 |
| A-D1D2 | 42 | 49 | 56 | 62 | 71 | — | — | — | **71** | — | — | 25 | 28/40/29/28/30 | 28/40/29/28/30 | 31/31/38 | 10 | 9 | 75 | 72804 | 147632 | 743 | 1195 | 139391 |
| A-F3S30 | 37 | 41 | 50 | 54 | 64 | — | — | — | **64** | — | — | 22 | 38/27/24/44/45 | 38/27/24/44/45 | 33/40/35 | 16 | 11 | 70 | 103666 | 259621 | 1136 | 1587 | 191960 |
| A-R5 | 42 | 47 | 56 | 61 | 67 | — | — | — | **67** | — | — | 23 | 40/45/43/45/45 | 40/45/43/45/45 | 30/40/32 | 21 | 10 | 66 | 101116 | 250110 | 1315 | 3349 | 369067 |
| A-I | 42 | 50 | 56 | 59 | 65 | — | — | — | **65** | — | — | 23 | 32/46/33/45/45 | 32/46/33/45/45 | 32/40/35 | 25 | 12 | 60 | 147813 | 444260 | 1759 | 4324 | 526616 |
| A-B | 53 | 60 | 73 | 89 | 104 | — | — | — | **104** | — | — | 37 | 25/50/50/42/50 | 25/50/50/42/50 | 37/40/41 | 17 | 22 | 35 | 0 | 39047 | 411 | 642 | 31706 |

**What the table says.**
- **No policy reaches silver, and only free consumables reach bronze.** The best real policy is **S30, 103** — 3 above `P0s`
  (100), 5 above `P0` (98); C30 and C35 101; everything else is below `P0s`: S25 98, R5 97, S30+D1D2 95, I 95, S35 94, CS 94,
  D1+D2 93, F3 92–93, S40 92, D1 alone 69. **B (consumables free) is 121 on any rule** — on P0s, S30 and D1+D2 alike — passing
  bronze on day 45–46 (2027-01-05/06, season day 74–75) and never silver.
- **The spine makes fighters, not points.** S30 has all five at combat 41 on day 42 (P0s: 33–42) and 44–46 from day 70, but it
  pays for it early (66 on day 42 against 73) and gains 3 by the deadline — and those 3 are the tasks filler (tasks_coins_fan +5,
  two never-fought kill points fewer; the split below). A deeper spine costs more: S35 and S40 stand at 55 on day 42 and end at
  94 and 92 — their hours go into the potions the road drinks (about 175,000–190,000 potions a season, as in P0s). A shallower
  one, S25, is the best early policy of all (78 on day 42, 88 on day 56) and ends at 98.
- **The crafters first** (C30, C35) end at 101, but on the model's crafting prices: section 2 measured a level from scratch at
  5.7–8.4 times `craftK`'s hours. CS (C35 + S30) does worse than either half (94): two first tiers compete for the same hours.
- **D1 alone stalls** (69): the best far gate pulls the island's gathering roads ahead of the fights that earn the fares' gold;
  by day 42 a third of its hours are filler and a fifth the fallback. **D1+D2** is the best non-bound policy on day 42 (71; Second
  at combat 40) and ends at 93: the fleet-judged gear needs make pieces, the potions still decide.
- **Three fighters** (F3: First, Fourth, Fifth; Third and Second freed — the two with the most supply and crafting hours in P0s,
  1,832 and 1,573) lose 11 on S30 (92 against 103) and gain nothing on D1+D2 (93 against 93): the freed two do the supply faster, but the points behind combat
  are fewer and the fighters' potions are the same.
- **My own policies do not pay in the model either.** **R** (five healing runes, 50,000 gold): 97 — its fighters are at
  40–45 on day 42 (the rune cuts potions a kill by 20–30%, `tools/runecheck.mts`), the points do not follow. **I** (37,000 algae
  bought): 95, and 100 on S30 — the ingredient free at the bank makes the potions cheap by the stock rule (`xp.ts potionPriceOf`),
  so the fleet drinks more (about 252,000 in I) instead of fighting less.
- **The bound**: B's 21 points over P0s are the potion economy. Everything that changes only the order of the same work moves
  the deadline by −8 to +3; nothing reaches 105 without free consumables.

### Where the two best part from P0s
(`<s>/tools/part.mjs`, the decision files; day 1 = 11-22.)
- **S30** at decision 0, **day 1, 11-22 01:01 UTC, First**: P0s `lvl:mining:35@First#4` (level, 183 units, 1.5 h): "level:
  mining 29 → 35 for Diamond in the chain of diamond_in_the_sky (+3 pts, chain ~34 h, of it the road 34 h by Fourth); Coal at
  2320 XP/h" — S30 `src:sunflower@First#1` (supply, 170 gathers, 1.5 h): "Sunflower: 8409 actions short for Small Health Potion
  ×100 for event bandit_camp (Bandit Lizard, one spawn) (+2 pts, chain ~14 h)" — the leaf is first tier because one of its
  parents is a spine potion need (First's road to combat 50); its best parent, which the why names, is the event's reserve.
- **C35** at decision 1, **day 1, 11-22 01:22 UTC, Fourth**: P0s `lvl:mining:35@Fourth#5` (level, 158 units, 1.5 h: "mining 31 →
  35 for Diamond …; Gold Ore at 2522 XP/h") — C35 `lvl:jewelrycrafting:35@Fourth#1` (level, one level of training, 2.9 h:
  "jewelrycrafting 20 → 35: the crafters' floor").
- (C30, the other 101, parts the same way as C35.)

### The calendar guard
How it is kept: a level candidate whose bundle holds an event achievement with less than 72 h of slack (the deadline less the
road and the event's calendar, `bundle.ts` `cal`) joins the first tier (`tier.ts calTight`; in CS also beside a crafter's
floor). What the policies lost (`tools/cal.mjs`): nothing — every spine and crafter run completes the three apparition
achievements, later than P0s:

| run | magic_lumberjack | strange_miner | magic_harvester | its_malefic | closing_the_gate |
|---|---|---|---|---|---|
| P0s | 12-22 | 12-27 | 01-07 | 02-10 | 02-10 |
| S30 | 01-02 | 01-09 | 01-19 | 01-17 | 01-29 |
| S35 | 01-03 | 01-25 | 01-19 | 01-15 | — |
| S40 | 01-25 | 01-18 | 02-12 | 01-08 | 01-21 |
| C35 | 12-23 | 01-03 | 01-08 | 02-10 | 02-21 |
| B | 12-22 | 12-26 | 01-06 | 12-16 | 12-12 |

S40 takes magic_harvester to 02-12 — twelve days before the deadline; the guard held it, with less margin than the others.

### How far the numbers are believed (settled point 7)
The points each run gains over the World's 29 (`tools/believe.mts`: an achievement goes to the first group of — a toll (a
layer gate on a target or a material: the island), an event gate, a kill (a kill or drop objective, a kill-sourced material, a
combat level: the run's kills), else gathering/crafting/tasks; "fought, held" = monsters the fleet fought in the journal or
`logs/dev.log` with the planner's potions holding — vampire 0.94 of plan, spider, flying snake, blue slime, skeleton (section 2),
and the chicken, cow, slimes, sheep, wolf, highwayman, mushmush and pig the old runner fought by the thousand; "fought, did not
hold" = bandit lizard (2.68 × the potions), rat, ogre, full moon vampire, King Slime):

| run | end | gathering, crafting, tasks | kills fought, potions held | kills fought, did not hold | kills never fought | event work | behind a toll |
|---|---|---|---|---|---|---|---|
| P0s | 100 | +20 | +2 (arachnophobia_conquered) | 0 | +14 (the_reaper — its death knight —, cultist_purifier, cursed_wood_blessed_victory, loktar_ogar, king_of_the_goblins, making_a_nether_portal) | +19 (the_new_bandit, cult_destroyer, magic_lumberjack, strange_miner, magic_harvester, closing_the_gate, its_malefic) | +16 (master_alchemist, master_miner, adamantite_mastery, catch_and_cook, shining_secrets, master_fisherman, palm_paradise, master_lumberjack) |
| S30 | 103 | +25 (of it tasks_coins_fan 5, filler) | +2 | 0 | +12 (the same less making_a_nether_portal) | +19 | +16 |
| C35 | 101 | +20 | +2 | 0 | +15 (+ grand_master) | +19 | +16 |
| B | 121 | +25 | +2 | 0 | +17 | +26 | +22 |

So **about 51 of P0s's 100 rest on what play has shown** (29 now + 20 + 2); 14 on monsters never fought, 19 on events (whose
trips drank 2.68 times their plan in play), 16 on the island behind the boat. **S30 wins over P0s only in tasks** (+5, filler)
and loses 2 in never-fought kills; **C35 wins one point in never-fought kills** (grand_master). B's extra 21 are events (+7),
the island (+6), never-fought kills (+3) and tasks (+5) — the last groups the settled point asks to name.

### A table a policy
For each deadline run: its config, the points and every fighter's combat and the crafters' skills on days 7, 14, 21, 28, 42, 56,
70, 84 and at the deadline; the fleet's hours by answer (level by lane, supply by what it is for — the consumable it makes, gear
materials, objective materials —, objective, filler, fallback, offering, event; the twelve largest and the rest) and by kind;
the potions and food drunk and eaten (B: what its sets drink); kills and kill steps; every completion with its day; what the
open points wait for at the deadline (`waitingOf`'s groups). Rebuilt by `### P0s — {"home":1}
points at the start 29, at the end 100; 8916 steps, 5928 s, 623910 solves, peak 1214 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 24 | 28 | 25 | 25 | 26 | 25 | 25 | 25 | 44 |
| 14 | 49 | 24 | 29 | 27 | 26 | 26 | 25 | 25 | 25 | 49 |
| 21 | 56 | 24 | 30 | 29 | 27 | 27 | 30 | 27 | 27 | 50 |
| 28 | 58 | 25 | 33 | 31 | 33 | 28 | 30 | 30 | 30 | 50 |
| 42 | 73 | 33 | 41 | 38 | 42 | 38 | 30 | 33 | 31 | 50 |
| 56 | 81 | 41 | 43 | 42 | 43 | 42 | 30 | 39 | 31 | 50 |
| 70 | 90 | 42 | 44 | 44 | 45 | 44 | 33 | 40 | 39 | 50 |
| 84 | 98 | 44 | 45 | 45 | 45 | 45 | 34 | 40 | 41 | 50 |
| 94 | 100 | 44 | 45 | 45 | 45 | 45 | 37 | 42 | 41 | 50 |

hours by answer (11238 character-hours): supply:consumables:greater_health_potion 3367 (30%); supply:consumables:minor_health_potion 1171 (10%); objective 1046 (9%); filler 898 (8%); supply:consumables:health_potion 704 (6%); level:woodcutting 628 (6%); supply:consumables:small_health_potion 579 (5%); level:combat 459 (4%); level:gearcrafting 310 (3%); offering 305 (3%); level:weaponcrafting 287 (3%); level:mining 286 (3%); the rest 1197
by kind: gather 7375, offering 305, event 167, fight 1270, make 1776, task 343
drunk and eaten: minor_health_potion 46177, small_health_potion 41306, greater_health_potion 38882, health_boost_potion 8676, cooked_bass 7611, health_potion 7426; in all 173883
kills: chicken 297562, cow 38622, yellow_slime 37970, imp 31381, green_slime 14944, red_slime 14090, death_knight 8538, owlbear 7042; in all 476630 in 2037 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), the_reaper 11-25 (+3), intermediate_fisherman 11-25 (+1), arachnophobia_conquered 11-25 (+2), the_new_bandit 11-25 (+2), expert_lumberjack 11-26 (+1), cabinet_maker 11-26 (+1), expert_alchemist 11-29 (+1), professional_miner 12-02 (+1), diamond_in_the_sky 12-03 (+3), expert_fisherman 12-04 (+1), professional_lumberjack 12-04 (+1), ecologist 12-08 (+1), master_alchemist 12-09 (+2), professional_fisherman 12-10 (+1), master_miner 12-10 (+2), adamantite_mastery 12-11 (+1), catch_and_cook 12-17 (+2), cultist_purifier 12-20 (+4), cult_destroyer 12-20 (+2), shining_secrets 12-20 (+3), magic_lumberjack 12-22 (+2), cursed_wood_blessed_victory 12-23 (+1), loktar_ogar 12-24 (+1), strange_miner 12-27 (+2), pearl_fisher 01-04 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-07 (+3), master_fisherman 01-18 (+2), palm_paradise 01-21 (+2), master_lumberjack 01-21 (+2), king_of_the_goblins 01-28 (+3), closing_the_gate 02-10 (+4), its_malefic 02-10 (+4), making_a_nether_portal 02-15 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); filler not reached 9 (tasks_coins_fan, the_planet_thanks_you); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-S25 — {"home":1,"spine":25}
points at the start 29, at the end 98; 8539 steps, 3600.1 s, 489851 solves, peak 1262 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 26 | 27 | 26 | 26 | 25 | 20 | 25 | 25 | 34 |
| 14 | 44 | 26 | 27 | 28 | 26 | 27 | 25 | 25 | 25 | 46 |
| 21 | 48 | 27 | 29 | 30 | 28 | 30 | 30 | 30 | 30 | 46 |
| 28 | 59 | 27 | 31 | 32 | 29 | 32 | 30 | 30 | 30 | 50 |
| 42 | 78 | 36 | 41 | 41 | 40 | 41 | 30 | 32 | 30 | 50 |
| 56 | 88 | 42 | 43 | 43 | 43 | 43 | 30 | 34 | 30 | 50 |
| 70 | 93 | 44 | 45 | 44 | 44 | 45 | 30 | 36 | 31 | 50 |
| 84 | 98 | 45 | 45 | 45 | 45 | 45 | 32 | 39 | 40 | 50 |
| 94 | 98 | 45 | 45 | 45 | 45 | 45 | 37 | 43 | 43 | 50 |

hours by answer (11206 character-hours): supply:consumables:greater_health_potion 2734 (24%); supply:consumables:minor_health_potion 1729 (15%); objective 956 (9%); supply:consumables:health_potion 896 (8%); level:woodcutting 639 (6%); supply:consumables:small_health_potion 540 (5%); supply:gear materials 499 (4%); level:combat 432 (4%); level:gearcrafting 357 (3%); offering 305 (3%); supply:consumables:health_boost_potion 292 (3%); level:weaponcrafting 287 (3%); the rest 1540
by kind: gather 7828, offering 305, make 1549, fight 1276, event 193, task 55
drunk and eaten: minor_health_potion 42538, small_health_potion 41990, greater_health_potion 39507, health_potion 18458, health_boost_potion 5236, cooked_bass 5106; in all 171692
kills: chicken 371385, green_slime 34544, cow 29325, yellow_slime 12650, red_slime 10720, owlbear 9532, death_knight 5581, cursed_tree 3492; in all 498248 in 1859 kill steps
completions: intermediate_alchemist 11-23 (+1), the_new_bandit 11-24 (+2), intermediate_fisherman 11-26 (+1), arachnophobia_conquered 11-26 (+2), expert_miner 11-27 (+1), worker 11-28 (+1), the_reaper 11-30 (+3), expert_lumberjack 11-30 (+1), cabinet_maker 11-30 (+1), expert_alchemist 12-05 (+1), expert_fisherman 12-05 (+1), professional_lumberjack 12-06 (+1), professional_miner 12-06 (+1), ecologist 12-09 (+1), professional_fisherman 12-12 (+1), diamond_in_the_sky 12-13 (+3), cultist_purifier 12-17 (+4), catch_and_cook 12-18 (+2), cult_destroyer 12-19 (+2), master_miner 12-21 (+2), master_fisherman 12-21 (+2), shining_secrets 12-23 (+3), adamantite_mastery 12-23 (+1), master_alchemist 12-24 (+2), magic_lumberjack 12-26 (+2), cursed_wood_blessed_victory 12-26 (+1), palm_paradise 12-28 (+2), master_lumberjack 12-28 (+2), strange_miner 01-01 (+2), a_favored_champion 01-05 (+4), king_of_the_goblins 01-10 (+3), magic_harvester 01-11 (+3), pearl_fisher 01-22 (+1), its_malefic 01-29 (+4), closing_the_gate 02-01 (+4), loktar_ogar 02-08 (+1)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-S30 — {"home":1,"spine":30}
points at the start 29, at the end 103; 8294 steps, 3356.9 s, 359000 solves, peak 1447 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 36 | 27 | 30 | 26 | 27 | 27 | 25 | 25 | 25 | 34 |
| 14 | 43 | 30 | 30 | 28 | 30 | 30 | 25 | 26 | 30 | 34 |
| 21 | 48 | 31 | 32 | 30 | 30 | 33 | 30 | 30 | 30 | 40 |
| 28 | 55 | 33 | 37 | 31 | 35 | 33 | 30 | 30 | 30 | 50 |
| 42 | 66 | 41 | 41 | 41 | 41 | 41 | 30 | 32 | 30 | 50 |
| 56 | 72 | 43 | 44 | 43 | 43 | 43 | 30 | 40 | 30 | 50 |
| 70 | 84 | 44 | 46 | 45 | 45 | 45 | 30 | 40 | 30 | 50 |
| 84 | 98 | 44 | 46 | 45 | 45 | 45 | 33 | 40 | 38 | 50 |
| 94 | 103 | 44 | 46 | 45 | 45 | 45 | 38 | 40 | 40 | 50 |

hours by answer (11251 character-hours): supply:consumables:greater_health_potion 3613 (32%); filler 1282 (11%); supply:consumables:minor_health_potion 1138 (10%); objective 913 (8%); supply:consumables:health_potion 700 (6%); level:woodcutting 479 (4%); supply:consumables:small_health_potion 453 (4%); level:combat 447 (4%); level:weaponcrafting 341 (3%); supply:consumables:earth_boost_potion 307 (3%); offering 303 (3%); level:mining 222 (2%); the rest 1054
by kind: gather 7124, offering 303, make 1259, event 205, fight 1196, task 1164
drunk and eaten: greater_health_potion 46468, minor_health_potion 39462, small_health_potion 38211, health_potion 13646, cooked_trout 7100, apple_pie 4136; in all 165624
kills: chicken 391710, yellow_slime 26927, cow 13039, green_slime 8097, owlbear 7244, death_knight 6527, red_slime 5543, blue_slime 4217; in all 486609 in 1652 kill steps
completions: the_new_bandit 11-23 (+2), expert_miner 11-25 (+1), intermediate_alchemist 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_fisherman 11-27 (+1), the_reaper 12-01 (+3), worker 12-03 (+1), expert_fisherman 12-03 (+1), cabinet_maker 12-04 (+1), ecologist 12-05 (+1), expert_lumberjack 12-08 (+1), cultist_purifier 12-10 (+4), professional_lumberjack 12-14 (+1), professional_fisherman 12-14 (+1), cult_destroyer 12-14 (+2), cursed_wood_blessed_victory 12-15 (+1), expert_alchemist 12-17 (+1), professional_miner 12-17 (+1), catch_and_cook 12-20 (+2), diamond_in_the_sky 12-22 (+3), loktar_ogar 12-26 (+1), magic_lumberjack 01-02 (+2), king_of_the_goblins 01-02 (+3), a_favored_champion 01-05 (+4), strange_miner 01-09 (+2), its_malefic 01-17 (+4), pearl_fisher 01-19 (+1), magic_harvester 01-19 (+3), closing_the_gate 01-29 (+4), master_alchemist 02-03 (+2), master_fisherman 02-04 (+2), master_miner 02-06 (+2), adamantite_mastery 02-08 (+1), shining_secrets 02-08 (+3), palm_paradise 02-10 (+2), master_lumberjack 02-10 (+2), tasks_coins_fan 02-23 (+5)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); filler not reached 6 (making_a_nether_portal, the_planet_thanks_you); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-S35 — {"home":1,"spine":35}
points at the start 29, at the end 94; 8552 steps, 5392.2 s, 589590 solves, peak 1140 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 26 | 30 | 25 | 26 | 26 | 29 | 25 | 26 | 34 |
| 14 | 41 | 28 | 33 | 25 | 28 | 28 | 30 | 30 | 30 | 43 |
| 21 | 50 | 35 | 37 | 35 | 35 | 36 | 30 | 30 | 30 | 43 |
| 28 | 52 | 36 | 41 | 36 | 38 | 40 | 30 | 30 | 31 | 50 |
| 42 | 55 | 39 | 45 | 39 | 42 | 43 | 30 | 31 | 31 | 50 |
| 56 | 66 | 41 | 46 | 42 | 43 | 45 | 30 | 31 | 31 | 50 |
| 70 | 83 | 42 | 47 | 43 | 45 | 45 | 33 | 38 | 31 | 50 |
| 84 | 94 | 45 | 47 | 45 | 45 | 46 | 35 | 41 | 39 | 50 |
| 94 | 94 | 45 | 47 | 45 | 45 | 46 | 38 | 41 | 41 | 50 |

hours by answer (11227 character-hours): supply:consumables:greater_health_potion 4135 (37%); supply:consumables:minor_health_potion 1334 (12%); supply:consumables:health_potion 903 (8%); objective 751 (7%); supply:consumables:small_health_potion 585 (5%); level:combat 458 (4%); level:woodcutting 440 (4%); level:mining 384 (3%); level:weaponcrafting 348 (3%); filler 333 (3%); offering 299 (3%); level:gearcrafting 236 (2%); the rest 1022
by kind: gather 7872, offering 299, make 1402, event 193, fight 1350, task 111
drunk and eaten: greater_health_potion 55206, small_health_potion 46675, minor_health_potion 36944, health_potion 9423, health_boost_potion 7610, cooked_trout 7100; in all 185469
kills: chicken 418082, cow 30470, yellow_slime 30275, red_slime 11370, green_slime 8360, imp 7276, rat 5964, death_knight 5774; in all 547483 in 2023 kill steps
completions: the_new_bandit 11-23 (+2), expert_miner 11-25 (+1), intermediate_alchemist 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_fisherman 11-27 (+1), ecologist 11-28 (+1), expert_fisherman 12-03 (+1), the_reaper 12-03 (+3), cult_destroyer 12-07 (+2), cabinet_maker 12-09 (+1), worker 12-10 (+1), cultist_purifier 12-10 (+4), expert_lumberjack 12-11 (+1), expert_alchemist 12-15 (+1), professional_fisherman 12-18 (+1), cursed_wood_blessed_victory 12-20 (+1), catch_and_cook 12-24 (+2), magic_lumberjack 01-03 (+2), a_favored_champion 01-05 (+4), pearl_fisher 01-08 (+1), its_malefic 01-15 (+4), professional_lumberjack 01-18 (+1), magic_harvester 01-19 (+3), diamond_in_the_sky 01-20 (+3), strange_miner 01-25 (+2), professional_miner 01-26 (+1), master_alchemist 01-26 (+2), master_fisherman 01-28 (+2), king_of_the_goblins 01-30 (+3), master_miner 02-07 (+2), palm_paradise 02-07 (+2), master_lumberjack 02-08 (+2), adamantite_mastery 02-09 (+1), shining_secrets 02-09 (+3), loktar_ogar 02-10 (+1)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 18 (closing_the_gate, corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-S40 — {"home":1,"spine":40}
points at the start 29, at the end 92; 8723 steps, 4645.8 s, 504750 solves, peak 963 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 26 | 30 | 25 | 26 | 26 | 29 | 25 | 26 | 34 |
| 14 | 41 | 28 | 33 | 25 | 28 | 28 | 30 | 30 | 30 | 43 |
| 21 | 43 | 31 | 37 | 27 | 34 | 33 | 30 | 30 | 30 | 47 |
| 28 | 52 | 37 | 40 | 29 | 38 | 38 | 30 | 32 | 30 | 50 |
| 42 | 55 | 41 | 41 | 37 | 42 | 41 | 30 | 35 | 30 | 50 |
| 56 | 64 | 43 | 44 | 41 | 45 | 44 | 31 | 36 | 30 | 50 |
| 70 | 79 | 45 | 45 | 43 | 46 | 45 | 31 | 40 | 30 | 50 |
| 84 | 88 | 46 | 46 | 45 | 47 | 46 | 31 | 41 | 30 | 50 |
| 94 | 92 | 46 | 46 | 45 | 47 | 46 | 31 | 42 | 30 | 50 |

hours by answer (11251 character-hours): supply:consumables:greater_health_potion 4714 (42%); supply:consumables:minor_health_potion 1828 (16%); supply:consumables:small_health_potion 654 (6%); supply:consumables:health_potion 537 (5%); level:combat 387 (3%); supply:consumables:earth_boost_potion 381 (3%); objective 355 (3%); level:gearcrafting 310 (3%); offering 301 (3%); event 273 (2%); level:mining 255 (2%); supply:consumables:health_boost_potion 238 (2%); the rest 1018
by kind: gather 8584, offering 301, make 672, event 273, fight 1421
drunk and eaten: greater_health_potion 67351, small_health_potion 45446, minor_health_potion 36445, health_potion 8820, cooked_trout 5967, cooked_rat_meat 4775; in all 188486
kills: chicken 459538, cow 33680, yellow_slime 18810, red_slime 16019, rat 9550, imp 7016, death_knight 4048, green_slime 3740; in all 576637 in 1808 kill steps
completions: the_new_bandit 11-23 (+2), expert_miner 11-25 (+1), intermediate_alchemist 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_fisherman 11-27 (+1), ecologist 11-28 (+1), expert_fisherman 12-03 (+1), the_reaper 12-03 (+3), cult_destroyer 12-07 (+2), cultist_purifier 12-13 (+4), expert_alchemist 12-13 (+1), diamond_in_the_sky 12-15 (+3), professional_fisherman 12-16 (+1), worker 12-23 (+1), cabinet_maker 12-23 (+1), expert_lumberjack 12-25 (+1), a_favored_champion 01-05 (+4), its_malefic 01-08 (+4), pearl_fisher 01-16 (+1), strange_miner 01-18 (+2), cursed_wood_blessed_victory 01-18 (+1), catch_and_cook 01-21 (+2), closing_the_gate 01-21 (+4), professional_lumberjack 01-22 (+1), king_of_the_goblins 01-25 (+3), magic_lumberjack 01-25 (+2), loktar_ogar 02-01 (+1), corruption_eradicator 02-08 (+4), magic_harvester 02-12 (+3), professional_miner 02-13 (+1), master_alchemist 02-16 (+2), master_fisherman 02-23 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 7 (draconic_harvest, welcome_to_hell); a level 6 (adamantite_mastery, master_miner, shining_secrets); does not fit 6 (master_lumberjack, palm_paradise, turning_treasures_to_gold); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master)

### B-C30 — {"home":1,"crafters":30}
points at the start 29, at the end 101; 9692 steps, 5018 s, 558147 solves, peak 1012 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 43 | 24 | 28 | 25 | 26 | 26 | 30 | 30 | 30 | 37 |
| 14 | 50 | 25 | 29 | 27 | 27 | 27 | 30 | 30 | 30 | 46 |
| 21 | 57 | 25 | 37 | 27 | 29 | 28 | 30 | 31 | 30 | 47 |
| 28 | 60 | 25 | 40 | 27 | 29 | 28 | 30 | 33 | 30 | 50 |
| 42 | 65 | 27 | 46 | 28 | 31 | 30 | 30 | 34 | 30 | 50 |
| 56 | 77 | 31 | 48 | 30 | 37 | 34 | 30 | 35 | 31 | 50 |
| 70 | 77 | 36 | 49 | 33 | 41 | 42 | 30 | 39 | 31 | 50 |
| 84 | 85 | 38 | 49 | 34 | 45 | 45 | 30 | 40 | 31 | 50 |
| 94 | 101 | 38 | 50 | 35 | 45 | 45 | 33 | 40 | 31 | 50 |

hours by answer (11276 character-hours): supply:consumables:greater_health_potion 4099 (36%); supply:consumables:health_potion 1191 (11%); supply:consumables:minor_health_potion 1129 (10%); objective 983 (9%); level:woodcutting 560 (5%); supply:consumables:small_health_potion 506 (4%); level:combat 366 (3%); supply:consumables:health_boost_potion 342 (3%); level:mining 333 (3%); offering 307 (3%); supply:consumables:earth_boost_potion 297 (3%); level:gearcrafting 190 (2%); the rest 973
by kind: gather 8306, offering 307, make 963, event 166, fight 1534
drunk and eaten: greater_health_potion 54102, small_health_potion 43992, minor_health_potion 43318, health_potion 21946, cooked_bass 10179, health_boost_potion 7187; in all 207943
kills: chicken 527662, yellow_slime 50890, cow 38136, red_slime 27640, green_slime 22560, owlbear 6550, death_knight 4278, cursed_tree 3411; in all 702661 in 2468 kill steps
completions: expert_miner 11-22 (+1), ecologist 11-22 (+1), worker 11-23 (+1), arachnophobia_conquered 11-25 (+2), intermediate_alchemist 11-25 (+1), intermediate_fisherman 11-25 (+1), the_reaper 11-26 (+3), the_new_bandit 11-26 (+2), cabinet_maker 11-27 (+1), expert_lumberjack 11-27 (+1), expert_alchemist 12-02 (+1), professional_lumberjack 12-03 (+1), expert_fisherman 12-03 (+1), professional_miner 12-04 (+1), diamond_in_the_sky 12-04 (+3), cultist_purifier 12-09 (+4), professional_fisherman 12-09 (+1), cult_destroyer 12-11 (+2), loktar_ogar 12-14 (+1), catch_and_cook 12-18 (+2), magic_lumberjack 12-20 (+2), cursed_wood_blessed_victory 12-27 (+1), strange_miner 12-31 (+2), pearl_fisher 01-03 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-05 (+3), master_fisherman 01-09 (+2), master_alchemist 01-14 (+2), closing_the_gate 02-07 (+4), its_malefic 02-11 (+4), grand_master 02-15 (+3), master_miner 02-20 (+2), palm_paradise 02-20 (+2), master_lumberjack 02-20 (+2), shining_secrets 02-22 (+3), adamantite_mastery 02-22 (+1), king_of_the_goblins 02-23 (+3)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); does not fit 6 (a_peaceful_island, turning_treasures_to_gold); unhandled 4 (ultimate_rune)

### B-C35 — {"home":1,"crafters":35}
points at the start 29, at the end 101; 8892 steps, 2214.2 s, 237916 solves, peak 961 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 41 | 24 | 26 | 24 | 24 | 28 | 34 | 35 | 35 | 37 |
| 14 | 47 | 24 | 26 | 24 | 24 | 30 | 35 | 35 | 35 | 46 |
| 21 | 51 | 24 | 30 | 24 | 24 | 33 | 35 | 35 | 35 | 46 |
| 28 | 61 | 24 | 37 | 24 | 24 | 36 | 35 | 35 | 35 | 46 |
| 42 | 68 | 25 | 46 | 26 | 26 | 45 | 35 | 38 | 35 | 50 |
| 56 | 80 | 27 | 47 | 27 | 27 | 46 | 35 | 40 | 35 | 50 |
| 70 | 86 | 28 | 49 | 29 | 28 | 48 | 35 | 40 | 35 | 50 |
| 84 | 93 | 28 | 50 | 29 | 28 | 50 | 35 | 40 | 35 | 50 |
| 94 | 101 | 28 | 50 | 29 | 28 | 50 | 38 | 40 | 41 | 50 |

hours by answer (11222 character-hours): supply:consumables:greater_health_potion 2883 (26%); supply:consumables:health_potion 1846 (16%); supply:consumables:minor_health_potion 1240 (11%); objective 1018 (9%); filler 911 (8%); level:woodcutting 578 (5%); level:weaponcrafting 348 (3%); offering 307 (3%); level:combat 288 (3%); supply:consumables:small_health_potion 279 (2%); level:mining 252 (2%); level:gearcrafting 190 (2%); the rest 1083
by kind: gather 7545, offering 307, make 1549, event 148, fight 1139, task 534
drunk and eaten: minor_health_potion 56674, health_potion 38482, greater_health_potion 30255, small_health_potion 21212, cooked_bass 4357, earth_boost_potion 2852; in all 166622
kills: chicken 430952, yellow_slime 24550, imp 19558, red_slime 16150, cow 9240, green_slime 5150, cursed_tree 4179, rat 3202; in all 529620 in 1734 kill steps
completions: expert_miner 11-22 (+1), ecologist 11-22 (+1), worker 11-23 (+1), intermediate_fisherman 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_alchemist 11-28 (+1), the_reaper 11-28 (+3), the_new_bandit 11-28 (+2), cabinet_maker 12-01 (+1), expert_lumberjack 12-01 (+1), expert_fisherman 12-01 (+1), expert_alchemist 12-04 (+1), professional_miner 12-04 (+1), professional_lumberjack 12-05 (+1), professional_fisherman 12-08 (+1), diamond_in_the_sky 12-10 (+3), catch_and_cook 12-13 (+2), master_fisherman 12-15 (+2), cultist_purifier 12-16 (+4), cult_destroyer 12-18 (+2), magic_lumberjack 12-23 (+2), loktar_ogar 12-23 (+1), cursed_wood_blessed_victory 12-27 (+1), king_of_the_goblins 12-30 (+3), strange_miner 01-03 (+2), pearl_fisher 01-03 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-08 (+3), master_miner 01-14 (+2), shining_secrets 01-19 (+3), adamantite_mastery 01-19 (+1), master_alchemist 01-19 (+2), grand_master 02-01 (+3), its_malefic 02-10 (+4), palm_paradise 02-14 (+2), master_lumberjack 02-14 (+2), closing_the_gate 02-21 (+4)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-CS — {"home":1,"crafters":35,"spine":30}
points at the start 29, at the end 94; 9524 steps, 5225.6 s, 580992 solves, peak 1457 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 35 | 24 | 26 | 24 | 24 | 24 | 34 | 35 | 35 | 34 |
| 14 | 39 | 25 | 30 | 27 | 24 | 30 | 35 | 35 | 35 | 34 |
| 21 | 44 | 31 | 33 | 32 | 31 | 33 | 35 | 35 | 35 | 42 |
| 28 | 52 | 32 | 39 | 34 | 38 | 38 | 35 | 35 | 35 | 50 |
| 42 | 63 | 34 | 43 | 34 | 45 | 42 | 35 | 38 | 35 | 50 |
| 56 | 69 | 35 | 47 | 36 | 46 | 45 | 35 | 40 | 35 | 50 |
| 70 | 80 | 38 | 49 | 39 | 49 | 48 | 35 | 40 | 35 | 50 |
| 84 | 87 | 40 | 50 | 41 | 50 | 49 | 35 | 40 | 35 | 50 |
| 94 | 94 | 40 | 50 | 41 | 50 | 49 | 35 | 40 | 35 | 50 |

hours by answer (11275 character-hours): supply:consumables:greater_health_potion 4967 (44%); supply:consumables:minor_health_potion 1511 (13%); objective 647 (6%); supply:consumables:health_potion 585 (5%); level:combat 417 (4%); supply:consumables:small_health_potion 407 (4%); level:woodcutting 402 (4%); level:mining 333 (3%); offering 301 (3%); supply:consumables:earth_boost_potion 273 (2%); event 238 (2%); supply:consumables:health_boost_potion 226 (2%); the rest 967
by kind: gather 8164, offering 301, make 938, event 238, fight 1569, task 64
drunk and eaten: greater_health_potion 82853, small_health_potion 34356, minor_health_potion 28666, cooked_bass 9859, health_potion 8350, earth_boost_potion 6766; in all 199404
kills: chicken 592620, yellow_slime 38618, cow 26152, green_slime 11920, red_slime 8360, death_knight 6951, blue_slime 5611, rat 5579; in all 722469 in 2322 kill steps
completions: ecologist 11-22 (+1), intermediate_fisherman 11-28 (+1), intermediate_alchemist 11-28 (+1), expert_miner 11-28 (+1), the_new_bandit 11-28 (+2), worker 11-29 (+1), arachnophobia_conquered 11-30 (+2), expert_fisherman 12-03 (+1), the_reaper 12-07 (+3), cabinet_maker 12-08 (+1), expert_lumberjack 12-09 (+1), diamond_in_the_sky 12-13 (+3), cult_destroyer 12-13 (+2), professional_fisherman 12-15 (+1), expert_alchemist 12-16 (+1), cursed_wood_blessed_victory 12-17 (+1), cultist_purifier 12-20 (+4), loktar_ogar 12-20 (+1), catch_and_cook 12-24 (+2), strange_miner 12-31 (+2), magic_lumberjack 01-02 (+2), a_favored_champion 01-05 (+4), pearl_fisher 01-09 (+1), professional_lumberjack 01-15 (+1), magic_harvester 01-18 (+3), its_malefic 01-20 (+4), closing_the_gate 01-24 (+4), grand_master 02-03 (+3), corruption_eradicator 02-11 (+4), professional_miner 02-15 (+1), master_alchemist 02-17 (+2), master_fisherman 02-18 (+2), master_miner 02-22 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); does not fit 13 (adamantite_mastery, king_of_the_goblins, master_lumberjack, palm_paradise, shining_secrets, turning_treasures_to_gold); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 7 (draconic_harvest, welcome_to_hell); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune)

### B-D1 — {"home":1,"gates":1}
points at the start 29, at the end 69; 7116 steps, 502.8 s, 12555 solves, peak 612 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 24 | 28 | 24 | 24 | 24 | 25 | 25 | 25 | 41 |
| 14 | 49 | 24 | 28 | 24 | 24 | 24 | 26 | 25 | 25 | 50 |
| 21 | 52 | 24 | 28 | 24 | 24 | 24 | 31 | 35 | 35 | 50 |
| 28 | 52 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 40 | 50 |
| 42 | 61 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 56 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 70 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 84 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 94 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |

hours by answer (11276 character-hours): fallback 6941 (62%); filler 1886 (17%); objective 642 (6%); level:woodcutting 572 (5%); offering 307 (3%); level:mining 253 (2%); supply:consumables:minor_health_potion 142 (1%); supply:consumables:small_health_potion 131 (1%); level:fishing 123 (1%); level:alchemy 107 (1%); event 82 (1%); level:weaponcrafting 45 (0%); the rest 43
by kind: gather 9247, offering 307, event 82, fight 33, make 442, task 1164
drunk and eaten: minor_health_potion 5990, small_health_potion 5847, cooked_trout 676, cheese 674, air_boost_potion 22; in all 13208
kills: spider 998, chicken 954, death_knight 250, skeleton 238, pig 192, bandit_lizard 100, imp 68, flying_snake 54; in all 2939 in 130 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), the_new_bandit 11-25 (+2), intermediate_fisherman 11-26 (+1), arachnophobia_conquered 11-26 (+2), expert_lumberjack 11-26 (+1), cabinet_maker 11-26 (+1), the_reaper 11-27 (+3), expert_alchemist 12-02 (+1), professional_miner 12-02 (+1), diamond_in_the_sky 12-02 (+3), professional_lumberjack 12-03 (+1), expert_fisherman 12-05 (+1), ecologist 12-06 (+1), adamantite_mastery 12-09 (+1), professional_fisherman 12-11 (+1), tasks_coins_fan 12-22 (+5), magic_lumberjack 12-23 (+2), strange_miner 12-26 (+2), a_favored_champion 01-05 (+4), magic_harvester 01-07 (+3), pearl_fisher 01-09 (+1)
open at the deadline: another layer 38 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, crafted_with_honor, elementary_book, sands_of_power, secrets_in_the_sand, secure_the_island, take_her_down, the_worm_turns); gold: 1365 short for the fare 29 (a_peaceful_island, catch_and_cook, heartbound, magic_power, master_alchemist, master_fisherman, master_lumberjack, master_miner, palm_paradise, sandwhispers_hidden_treasure, shining_secrets); an event 21 (closing_the_gate, corruption_eradicator, cult_destroyer, draconic_harvest, its_malefic, welcome_to_hell); gear (no safe win within ten levels) 12 (cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a group 9 (lich_please, life_lover, slimed_to_none); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); filler not reached 6 (making_a_nether_portal, the_planet_thanks_you); unhandled 4 (ultimate_rune); gold: 4365 short for the fare 2 (potion_brewer); does not fit 2 (turning_treasures_to_gold)

### B-D1D2 — {"home":1,"gates":1,"fleetGear":1}
points at the start 29, at the end 93; 10471 steps, 5344.7 s, 569112 solves, peak 1377 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 25 | 27 | 26 | 25 | 26 | 24 | 25 | 25 | 34 |
| 14 | 49 | 25 | 28 | 26 | 25 | 28 | 25 | 25 | 25 | 48 |
| 21 | 56 | 25 | 29 | 28 | 26 | 28 | 30 | 26 | 25 | 50 |
| 28 | 62 | 26 | 33 | 29 | 26 | 29 | 31 | 30 | 38 | 50 |
| 42 | 71 | 28 | 40 | 29 | 28 | 30 | 31 | 31 | 38 | 50 |
| 56 | 81 | 29 | 46 | 29 | 29 | 32 | 31 | 33 | 38 | 50 |
| 70 | 81 | 34 | 47 | 35 | 30 | 41 | 31 | 37 | 38 | 50 |
| 84 | 89 | 36 | 48 | 39 | 33 | 44 | 31 | 40 | 38 | 50 |
| 94 | 93 | 36 | 48 | 39 | 34 | 46 | 31 | 40 | 38 | 50 |

hours by answer (11277 character-hours): supply:consumables:greater_health_potion 3942 (35%); supply:consumables:minor_health_potion 1687 (15%); objective 970 (9%); supply:consumables:health_potion 736 (7%); level:woodcutting 596 (5%); supply:consumables:small_health_potion 495 (4%); supply:consumables:health_boost_potion 467 (4%); offering 304 (3%); filler 296 (3%); level:mining 276 (2%); level:combat 275 (2%); level:gearcrafting 186 (2%); the rest 1046
by kind: gather 8417, offering 304, event 171, fight 1236, make 968, task 179
drunk and eaten: minor_health_potion 64985, greater_health_potion 46768, small_health_potion 43034, health_boost_potion 12579, health_potion 7974, earth_boost_potion 5906; in all 204217
kills: chicken 369628, cow 52280, yellow_slime 47370, red_slime 18674, blue_slime 7600, green_slime 6540, imp 3777, death_knight 3468; in all 530740 in 2207 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), arachnophobia_conquered 11-25 (+2), the_new_bandit 11-25 (+2), intermediate_fisherman 11-26 (+1), expert_lumberjack 11-27 (+1), cabinet_maker 11-27 (+1), the_reaper 11-27 (+3), professional_lumberjack 12-04 (+1), expert_alchemist 12-04 (+1), expert_fisherman 12-04 (+1), professional_miner 12-05 (+1), diamond_in_the_sky 12-05 (+3), ecologist 12-08 (+1), master_alchemist 12-10 (+2), professional_fisherman 12-10 (+1), master_miner 12-12 (+2), adamantite_mastery 12-12 (+1), cultist_purifier 12-19 (+4), catch_and_cook 12-19 (+2), cult_destroyer 12-22 (+2), magic_lumberjack 12-23 (+2), strange_miner 12-28 (+2), shining_secrets 12-31 (+3), loktar_ogar 01-03 (+1), pearl_fisher 01-04 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-08 (+3), cursed_wood_blessed_victory 01-14 (+1), palm_paradise 01-31 (+2), master_lumberjack 01-31 (+2), closing_the_gate 02-11 (+4), its_malefic 02-18 (+4)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); does not fit 7 (king_of_the_goblins, master_fisherman, turning_treasures_to_gold); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master)

### B-S30D1D2 — {"home":1,"spine":30,"gates":1,"fleetGear":1}
points at the start 29, at the end 95; 8984 steps, 3783.9 s, 454658 solves, peak 1475 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 35 | 25 | 30 | 27 | 25 | 26 | 25 | 25 | 25 | 34 |
| 14 | 40 | 30 | 31 | 27 | 30 | 30 | 25 | 25 | 25 | 34 |
| 21 | 43 | 30 | 31 | 30 | 30 | 30 | 25 | 26 | 25 | 34 |
| 28 | 51 | 32 | 36 | 32 | 33 | 33 | 30 | 30 | 28 | 50 |
| 42 | 59 | 36 | 41 | 34 | 37 | 38 | 30 | 35 | 34 | 50 |
| 56 | 71 | 44 | 44 | 37 | 44 | 44 | 30 | 40 | 35 | 50 |
| 70 | 80 | 46 | 46 | 40 | 46 | 46 | 30 | 40 | 35 | 50 |
| 84 | 88 | 46 | 47 | 43 | 46 | 46 | 30 | 40 | 40 | 50 |
| 94 | 95 | 46 | 47 | 43 | 46 | 46 | 34 | 40 | 40 | 50 |

hours by answer (11262 character-hours): supply:consumables:greater_health_potion 3578 (32%); supply:consumables:minor_health_potion 1875 (17%); objective 1017 (9%); supply:consumables:health_potion 802 (7%); level:combat 543 (5%); supply:consumables:small_health_potion 534 (5%); level:mining 504 (4%); level:woodcutting 383 (3%); offering 304 (3%); supply:consumables:earth_boost_potion 298 (3%); level:gearcrafting 190 (2%); event 188 (2%); the rest 1045
by kind: gather 8112, offering 304, make 1338, event 188, fight 1211, task 109
drunk and eaten: minor_health_potion 59050, small_health_potion 45692, greater_health_potion 35348, cooked_bass 10616, health_potion 9396, health_boost_potion 5733; in all 183216
kills: chicken 272559, cow 33537, yellow_slime 17558, red_slime 13860, green_slime 12630, cultist_acolyte 7623, owlbear 6350, blue_slime 5010; in all 396705 in 1830 kill steps
completions: the_new_bandit 11-23 (+2), intermediate_alchemist 11-25 (+1), intermediate_fisherman 11-26 (+1), arachnophobia_conquered 11-27 (+2), the_reaper 12-01 (+3), expert_miner 12-01 (+1), expert_fisherman 12-02 (+1), worker 12-06 (+1), cabinet_maker 12-06 (+1), professional_fisherman 12-11 (+1), ecologist 12-13 (+1), expert_lumberjack 12-13 (+1), cultist_purifier 12-15 (+4), cult_destroyer 12-17 (+2), cursed_wood_blessed_victory 12-20 (+1), catch_and_cook 12-20 (+2), expert_alchemist 12-23 (+1), diamond_in_the_sky 12-26 (+3), professional_lumberjack 12-30 (+1), a_favored_champion 01-05 (+4), magic_lumberjack 01-05 (+2), professional_miner 01-08 (+1), king_of_the_goblins 01-11 (+3), strange_miner 01-14 (+2), magic_harvester 01-21 (+3), pearl_fisher 01-24 (+1), loktar_ogar 01-28 (+1), its_malefic 01-30 (+4), closing_the_gate 02-01 (+4), master_alchemist 02-09 (+2), master_fisherman 02-12 (+2), palm_paradise 02-18 (+2), master_lumberjack 02-18 (+2), adamantite_mastery 02-23 (+1), master_miner 02-23 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); does not fit 5 (shining_secrets, turning_treasures_to_gold); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master)

### B-F3S30 — {"home":1,"spine":30,"fighters":["First","Fourth","Fifth"]}
points at the start 29, at the end 92; 7838 steps, 2112.7 s, 241164 solves, peak 1472 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 28 | 26 | 24 | 27 | 30 | 25 | 25 | 25 | 34 |
| 14 | 41 | 30 | 26 | 24 | 30 | 31 | 25 | 25 | 27 | 36 |
| 21 | 50 | 32 | 27 | 24 | 33 | 35 | 30 | 30 | 30 | 43 |
| 28 | 54 | 32 | 27 | 24 | 40 | 40 | 30 | 31 | 30 | 50 |
| 42 | 64 | 38 | 27 | 24 | 44 | 45 | 33 | 40 | 35 | 50 |
| 56 | 76 | 43 | 27 | 24 | 46 | 46 | 33 | 40 | 35 | 50 |
| 70 | 90 | 45 | 27 | 24 | 46 | 46 | 37 | 40 | 41 | 50 |
| 84 | 90 | 46 | 27 | 24 | 46 | 47 | 41 | 43 | 43 | 50 |
| 94 | 92 | 46 | 27 | 24 | 46 | 47 | 45 | 45 | 45 | 50 |

hours by answer (11275 character-hours): supply:consumables:greater_health_potion 1971 (17%); filler 1643 (15%); supply:consumables:minor_health_potion 1390 (12%); supply:consumables:health_potion 1259 (11%); objective 804 (7%); level:weaponcrafting 765 (7%); level:gearcrafting 490 (4%); supply:consumables:small_health_potion 489 (4%); level:woodcutting 482 (4%); level:combat 331 (3%); level:jewelrycrafting 328 (3%); offering 307 (3%); the rest 1016
by kind: gather 6306, offering 307, make 2663, event 127, fight 937, task 934
drunk and eaten: minor_health_potion 39164, small_health_potion 35003, health_potion 20706, greater_health_potion 19948, health_boost_potion 5149, cooked_trout 3924; in all 140734
kills: chicken 258463, imp 31294, cow 24530, yellow_slime 23800, red_slime 7110, cultist_acolyte 5027, cursed_tree 4473, green_slime 2890; in all 375122 in 1530 kill steps
completions: intermediate_alchemist 11-23 (+1), the_new_bandit 11-24 (+2), arachnophobia_conquered 11-25 (+2), the_reaper 11-27 (+3), intermediate_fisherman 11-29 (+1), expert_miner 12-02 (+1), worker 12-03 (+1), expert_lumberjack 12-05 (+1), expert_fisherman 12-07 (+1), ecologist 12-07 (+1), cabinet_maker 12-07 (+1), cultist_purifier 12-10 (+4), cult_destroyer 12-10 (+2), expert_alchemist 12-15 (+1), cursed_wood_blessed_victory 12-15 (+1), loktar_ogar 12-16 (+1), professional_fisherman 12-17 (+1), professional_lumberjack 12-22 (+1), catch_and_cook 12-23 (+2), professional_miner 12-24 (+1), diamond_in_the_sky 12-24 (+3), king_of_the_goblins 12-31 (+3), magic_lumberjack 01-03 (+2), a_favored_champion 01-05 (+4), strange_miner 01-10 (+2), master_alchemist 01-14 (+2), master_fisherman 01-15 (+2), magic_harvester 01-19 (+3), master_miner 01-19 (+2), shining_secrets 01-21 (+3), adamantite_mastery 01-21 (+1), palm_paradise 01-21 (+2), master_lumberjack 01-21 (+2), pearl_fisher 01-28 (+1), making_a_nether_portal 02-17 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 19 (closing_the_gate, corruption_eradicator, draconic_harvest, its_malefic, welcome_to_hell); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); filler not reached 9 (tasks_coins_fan, the_planet_thanks_you); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-F3D1D2 — {"home":1,"gates":1,"fleetGear":1,"fighters":["First","Fourth","Fifth"]}
points at the start 29, at the end 93; 7961 steps, 1599.5 s, 204754 solves, peak 1261 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 40 | 24 | 27 | 24 | 24 | 24 | 20 | 25 | 24 | 34 |
| 14 | 49 | 24 | 27 | 25 | 24 | 24 | 20 | 25 | 24 | 45 |
| 21 | 51 | 24 | 28 | 26 | 29 | 30 | 27 | 28 | 25 | 49 |
| 28 | 53 | 25 | 28 | 26 | 33 | 34 | 30 | 30 | 28 | 49 |
| 42 | 63 | 26 | 28 | 26 | 36 | 40 | 30 | 34 | 28 | 50 |
| 56 | 72 | 26 | 28 | 26 | 43 | 43 | 30 | 39 | 38 | 50 |
| 70 | 80 | 27 | 28 | 26 | 44 | 44 | 35 | 40 | 40 | 50 |
| 84 | 88 | 27 | 28 | 26 | 44 | 45 | 37 | 41 | 40 | 50 |
| 94 | 93 | 27 | 28 | 26 | 44 | 45 | 39 | 41 | 41 | 50 |

hours by answer (11271 character-hours): supply:consumables:greater_health_potion 2743 (24%); filler 1639 (15%); supply:consumables:minor_health_potion 1080 (10%); objective 1010 (9%); level:woodcutting 686 (6%); supply:consumables:health_potion 514 (5%); supply:consumables:small_health_potion 424 (4%); fallback 416 (4%); level:weaponcrafting 405 (4%); offering 306 (3%); level:mining 285 (3%); supply:consumables:earth_boost_potion 267 (2%); the rest 1496
by kind: gather 6975, offering 306, event 154, fight 852, make 1820, task 1164
drunk and eaten: greater_health_potion 32798, minor_health_potion 31701, small_health_potion 31063, earth_boost_potion 11058, health_boost_potion 7004, health_potion 6326; in all 129412
kills: chicken 240956, yellow_slime 68353, cow 35464, imp 31346, green_slime 16748, red_slime 7718, rat 6059, cursed_tree 2556; in all 416070 in 1406 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), the_new_bandit 11-25 (+2), expert_lumberjack 11-25 (+1), intermediate_fisherman 11-26 (+1), cabinet_maker 11-26 (+1), the_reaper 11-26 (+3), arachnophobia_conquered 11-29 (+2), professional_lumberjack 12-03 (+1), expert_fisherman 12-04 (+1), expert_alchemist 12-05 (+1), professional_miner 12-05 (+1), diamond_in_the_sky 12-05 (+3), professional_fisherman 12-10 (+1), ecologist 12-12 (+1), catch_and_cook 12-16 (+2), cult_destroyer 12-20 (+2), cultist_purifier 12-20 (+4), magic_lumberjack 12-23 (+2), strange_miner 12-28 (+2), a_favored_champion 01-05 (+4), pearl_fisher 01-07 (+1), magic_harvester 01-08 (+3), cursed_wood_blessed_victory 01-12 (+1), master_alchemist 01-23 (+2), master_miner 01-24 (+2), shining_secrets 01-26 (+3), adamantite_mastery 01-26 (+1), palm_paradise 02-01 (+2), master_lumberjack 02-02 (+2), master_fisherman 02-07 (+2), making_a_nether_portal 02-12 (+2), tasks_coins_fan 02-18 (+5)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 19 (closing_the_gate, corruption_eradicator, draconic_harvest, its_malefic, welcome_to_hell); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); potions (a safe win once they are made) 8 (a_peaceful_island, king_of_the_goblins, loktar_ogar); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-R5 — {"home":1,"runes":5}
points at the start 29, at the end 97; 9095 steps, 4996.9 s, 538685 solves, peak 1478 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 26 | 28 | 27 | 23 | 28 | 25 | 25 | 25 | 41 |
| 14 | 47 | 26 | 29 | 30 | 24 | 29 | 26 | 27 | 26 | 46 |
| 21 | 56 | 27 | 32 | 33 | 26 | 35 | 30 | 30 | 30 | 46 |
| 28 | 61 | 27 | 39 | 38 | 33 | 40 | 30 | 31 | 30 | 46 |
| 42 | 67 | 40 | 45 | 43 | 45 | 45 | 30 | 40 | 32 | 50 |
| 56 | 80 | 44 | 47 | 45 | 46 | 47 | 30 | 40 | 32 | 50 |
| 70 | 83 | 46 | 48 | 46 | 48 | 48 | 30 | 41 | 32 | 50 |
| 84 | 87 | 46 | 48 | 46 | 48 | 48 | 31 | 41 | 37 | 50 |
| 94 | 97 | 46 | 48 | 46 | 48 | 48 | 32 | 44 | 40 | 50 |

hours by answer (11201 character-hours): supply:consumables:greater_health_potion 3459 (31%); supply:consumables:minor_health_potion 1163 (10%); objective 1035 (9%); supply:consumables:small_health_potion 941 (8%); supply:consumables:health_potion 848 (8%); level:woodcutting 620 (6%); level:combat 602 (5%); level:gearcrafting 426 (4%); offering 305 (3%); filler 252 (2%); supply:consumables:health_boost_potion 251 (2%); level:mining 238 (2%); the rest 1059
by kind: gather 8041, offering 305, event 188, make 1378, fight 1249, task 39
drunk and eaten: small_health_potion 62671, minor_health_potion 56902, greater_health_potion 24805, health_potion 14236, cooked_bass 4850, health_boost_potion 4821; in all 186954
kills: chicken 260400, cow 29457, yellow_slime 21480, green_slime 13948, imp 11150, red_slime 10240, death_knight 7410, cursed_tree 6923; in all 393307 in 2024 kill steps
completions: expert_miner 11-22 (+1), worker 11-23 (+1), the_new_bandit 11-24 (+2), intermediate_alchemist 11-24 (+1), arachnophobia_conquered 11-24 (+2), the_reaper 11-25 (+3), intermediate_fisherman 11-26 (+1), cabinet_maker 11-27 (+1), expert_lumberjack 11-27 (+1), expert_alchemist 12-02 (+1), professional_lumberjack 12-03 (+1), professional_miner 12-03 (+1), expert_fisherman 12-04 (+1), ecologist 12-05 (+1), cultist_purifier 12-11 (+4), diamond_in_the_sky 12-11 (+3), cult_destroyer 12-11 (+2), professional_fisherman 12-14 (+1), king_of_the_goblins 12-18 (+3), cursed_wood_blessed_victory 12-19 (+1), catch_and_cook 12-20 (+2), strange_miner 12-27 (+2), magic_lumberjack 12-27 (+2), a_favored_champion 01-05 (+4), its_malefic 01-11 (+4), pearl_fisher 01-12 (+1), closing_the_gate 01-13 (+4), magic_harvester 01-17 (+3), master_fisherman 02-12 (+2), master_alchemist 02-13 (+2), master_miner 02-15 (+2), shining_secrets 02-17 (+3), adamantite_mastery 02-17 (+1), palm_paradise 02-21 (+2), master_lumberjack 02-22 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 3 (loktar_ogar, turning_treasures_to_gold)

### B-I — {"home":1,"buy":{"algae":37000}}
points at the start 29, at the end 95; 10801 steps, 6456.5 s, 803349 solves, peak 1036 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 25 | 27 | 24 | 25 | 28 | 23 | 25 | 25 | 41 |
| 14 | 50 | 25 | 29 | 27 | 27 | 31 | 28 | 30 | 29 | 46 |
| 21 | 56 | 27 | 36 | 28 | 30 | 37 | 30 | 31 | 32 | 50 |
| 28 | 59 | 28 | 43 | 29 | 38 | 40 | 30 | 36 | 35 | 50 |
| 42 | 65 | 32 | 46 | 33 | 45 | 45 | 32 | 40 | 35 | 50 |
| 56 | 80 | 34 | 47 | 35 | 46 | 46 | 32 | 40 | 35 | 50 |
| 70 | 88 | 37 | 48 | 38 | 48 | 48 | 33 | 40 | 35 | 50 |
| 84 | 91 | 39 | 50 | 40 | 49 | 50 | 33 | 40 | 35 | 50 |
| 94 | 95 | 40 | 50 | 41 | 49 | 50 | 33 | 40 | 35 | 50 |

hours by answer (11244 character-hours): supply:consumables:greater_health_potion 4035 (36%); supply:consumables:health_potion 1360 (12%); objective 1018 (9%); supply:consumables:minor_health_potion 830 (7%); supply:consumables:small_health_potion 496 (4%); level:woodcutting 437 (4%); supply:consumables:health_boost_potion 401 (4%); level:combat 353 (3%); level:mining 306 (3%); offering 304 (3%); supply:consumables:earth_res_potion 232 (2%); event 218 (2%); the rest 1255
by kind: gather 7835, offering 304, event 218, fight 1833, make 1049, task 4
drunk and eaten: greater_health_potion 72304, minor_health_potion 65680, small_health_potion 38742, health_potion 19259, health_boost_potion 12501, earth_boost_potion 10007; in all 252086
kills: chicken 597066, yellow_slime 90840, cow 54984, green_slime 25980, red_slime 22640, rat 6262, imp 5405, cursed_tree 5287; in all 835202 in 2858 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), arachnophobia_conquered 11-25 (+2), the_new_bandit 11-25 (+2), the_reaper 11-26 (+3), intermediate_fisherman 11-26 (+1), expert_lumberjack 11-26 (+1), cabinet_maker 11-26 (+1), expert_alchemist 12-02 (+1), professional_miner 12-02 (+1), professional_lumberjack 12-03 (+1), diamond_in_the_sky 12-03 (+3), ecologist 12-04 (+1), expert_fisherman 12-05 (+1), cult_destroyer 12-10 (+2), cultist_purifier 12-10 (+4), loktar_ogar 12-13 (+1), professional_fisherman 12-15 (+1), cursed_wood_blessed_victory 12-18 (+1), catch_and_cook 12-22 (+2), magic_lumberjack 12-23 (+2), strange_miner 12-27 (+2), a_favored_champion 01-05 (+4), magic_harvester 01-08 (+3), its_malefic 01-08 (+4), closing_the_gate 01-10 (+4), master_alchemist 01-19 (+2), master_fisherman 01-20 (+2), pearl_fisher 01-22 (+1), king_of_the_goblins 01-24 (+3), grand_master 02-09 (+3), palm_paradise 02-22 (+2), master_lumberjack 02-22 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); does not fit 8 (adamantite_mastery, master_miner, shining_secrets, turning_treasures_to_gold); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune)

### B-IS30 — {"home":1,"spine":30,"buy":{"algae":37000}}
points at the start 29, at the end 100; 8485 steps, 3672 s, 464626 solves, peak 1532 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 43 | 24 | 30 | 24 | 24 | 30 | 28 | 27 | 26 | 34 |
| 14 | 45 | 30 | 35 | 32 | 33 | 36 | 30 | 30 | 30 | 48 |
| 21 | 51 | 33 | 40 | 34 | 40 | 40 | 30 | 30 | 30 | 50 |
| 28 | 54 | 42 | 43 | 39 | 41 | 42 | 30 | 30 | 33 | 50 |
| 42 | 63 | 44 | 45 | 42 | 44 | 44 | 30 | 30 | 33 | 50 |
| 56 | 82 | 44 | 45 | 42 | 44 | 45 | 30 | 36 | 33 | 50 |
| 70 | 94 | 44 | 45 | 42 | 44 | 45 | 36 | 44 | 40 | 50 |
| 84 | 100 | 45 | 45 | 45 | 45 | 46 | 42 | 45 | 41 | 50 |
| 94 | 100 | 45 | 45 | 46 | 46 | 46 | 45 | 45 | 41 | 50 |

hours by answer (11276 character-hours): supply:consumables:greater_health_potion 2781 (25%); filler 1255 (11%); objective 909 (8%); supply:consumables:health_potion 879 (8%); level:weaponcrafting 765 (7%); level:mining 647 (6%); supply:consumables:minor_health_potion 613 (5%); supply:consumables:small_health_potion 585 (5%); level:combat 513 (5%); level:gearcrafting 490 (4%); level:woodcutting 463 (4%); offering 303 (3%); the rest 1072
by kind: gather 6390, offering 303, make 2508, event 197, fight 1320, task 558
drunk and eaten: small_health_potion 60178, minor_health_potion 59713, greater_health_potion 51390, cooked_trout 8043, earth_boost_potion 7514, health_boost_potion 7015; in all 219700
kills: chicken 372287, yellow_slime 50670, cow 34878, imp 31346, death_knight 11801, red_slime 10713, rat 8918, green_slime 6788; in all 550047 in 2157 kill steps
completions: the_new_bandit 11-23 (+2), arachnophobia_conquered 11-24 (+2), intermediate_alchemist 11-24 (+1), expert_miner 11-25 (+1), worker 11-25 (+1), intermediate_fisherman 11-27 (+1), expert_lumberjack 11-28 (+1), cabinet_maker 11-28 (+1), the_reaper 11-28 (+3), ecologist 11-28 (+1), cult_destroyer 12-04 (+2), cultist_purifier 12-08 (+4), expert_alchemist 12-08 (+1), expert_fisherman 12-08 (+1), cursed_wood_blessed_victory 12-13 (+1), loktar_ogar 12-13 (+1), professional_lumberjack 12-16 (+1), professional_fisherman 12-20 (+1), magic_lumberjack 12-24 (+2), catch_and_cook 12-30 (+2), its_malefic 01-01 (+4), closing_the_gate 01-04 (+4), a_favored_champion 01-05 (+4), magic_harvester 01-10 (+3), master_alchemist 01-10 (+2), professional_miner 01-12 (+1), diamond_in_the_sky 01-13 (+3), master_fisherman 01-14 (+2), palm_paradise 01-21 (+2), master_lumberjack 01-21 (+2), strange_miner 01-23 (+2), master_miner 01-26 (+2), adamantite_mastery 01-27 (+1), shining_secrets 01-27 (+3), pearl_fisher 01-31 (+1), king_of_the_goblins 02-03 (+3), making_a_nether_portal 02-12 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); filler not reached 9 (tasks_coins_fan, the_planet_thanks_you); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-B — {"home":1,"potionK":0}
points at the start 29, at the end 121; 6385 steps, 668.1 s, 31848 solves, peak 868 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 53 | 24 | 37 | 42 | 26 | 42 | 30 | 29 | 27 | 34 |
| 14 | 60 | 24 | 47 | 50 | 37 | 50 | 30 | 29 | 32 | 46 |
| 21 | 73 | 24 | 48 | 50 | 39 | 50 | 30 | 40 | 40 | 46 |
| 28 | 89 | 24 | 50 | 50 | 40 | 50 | 30 | 40 | 40 | 50 |
| 42 | 104 | 25 | 50 | 50 | 42 | 50 | 37 | 40 | 41 | 50 |
| 56 | 116 | 26 | 50 | 50 | 43 | 50 | 43 | 40 | 41 | 50 |
| 70 | 119 | 26 | 50 | 50 | 43 | 50 | 45 | 40 | 41 | 50 |
| 84 | 121 | 26 | 50 | 50 | 43 | 50 | 45 | 40 | 41 | 50 |
| 94 | 121 | 26 | 50 | 50 | 43 | 50 | 45 | 40 | 41 | 50 |

hours by answer (11276 character-hours): fallback 5044 (45%); filler 1807 (16%); objective 1180 (10%); level:weaponcrafting 765 (7%); level:woodcutting 621 (6%); offering 301 (3%); event 287 (3%); level:combat 286 (3%); level:mining 229 (2%); level:gearcrafting 190 (2%); level:fishing 172 (2%); level:alchemy 161 (1%); the rest 234
by kind: gather 7042, offering 301, fight 599, event 287, make 1884, task 1164
free (what the kill steps' sets drink): greater_health_potion 192370, enhanced_health_potion 186279, minor_health_potion 78683, health_potion 71498, small_health_potion 18399, enhanced_boost_potion 2601; in all 558352
kills: imp 31293, baby_red_dragon 5000, hellhound 4810, chicken 3669, corrupted_ogre 3176, cursed_tree 3053, corrupted_owlbear 2595, orc 2312; in all 70930 in 411 kill steps
completions: arachnophobia_conquered 11-22 (+2), expert_miner 11-22 (+1), the_reaper 11-23 (+3), the_new_bandit 11-23 (+2), worker 11-23 (+1), intermediate_alchemist 11-24 (+1), intermediate_fisherman 11-24 (+1), cultist_purifier 11-25 (+4), expert_lumberjack 11-25 (+1), cabinet_maker 11-25 (+1), ecologist 11-26 (+1), cult_destroyer 11-27 (+2), king_of_the_goblins 11-27 (+3), loktar_ogar 11-27 (+1), cursed_wood_blessed_victory 11-29 (+1), grand_master 12-01 (+3), expert_fisherman 12-02 (+1), professional_lumberjack 12-05 (+1), expert_alchemist 12-05 (+1), professional_fisherman 12-06 (+1), professional_miner 12-06 (+1), diamond_in_the_sky 12-06 (+3), catch_and_cook 12-11 (+2), master_miner 12-12 (+2), closing_the_gate 12-12 (+4), shining_secrets 12-13 (+3), adamantite_mastery 12-13 (+1), master_fisherman 12-14 (+2), a_peaceful_island 12-14 (+4), its_malefic 12-16 (+4), potion_brewer 12-16 (+2), palm_paradise 12-20 (+2), master_lumberjack 12-20 (+2), master_alchemist 12-21 (+2), magic_lumberjack 12-22 (+2), strange_miner 12-26 (+2), tasks_coins_fan 01-02 (+5), a_favored_champion 01-06 (+4), corruption_eradicator 01-06 (+4), magic_harvester 01-06 (+3), pearl_fisher 01-14 (+1), welcome_to_hell 01-21 (+3), making_a_nether_portal 02-04 (+2)
open at the deadline: a group 30 (coin_collector, crafted_with_honor, lich_please, life_lover, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, slimed_to_none, take_her_down); another layer 27 (around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, heartbound, magic_power, secure_the_island, the_worm_turns); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 4 (draconic_harvest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-BS30 — {"home":1,"potionK":0,"spine":30}
points at the start 29, at the end 121; 6353 steps, 1045.2 s, 52969 solves, peak 1043 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 52 | 33 | 38 | 46 | 31 | 46 | 25 | 25 | 27 | 34 |
| 14 | 60 | 34 | 45 | 50 | 37 | 50 | 25 | 29 | 30 | 46 |
| 21 | 65 | 36 | 46 | 50 | 39 | 50 | 25 | 39 | 40 | 47 |
| 28 | 85 | 38 | 47 | 50 | 41 | 50 | 25 | 40 | 40 | 50 |
| 42 | 103 | 39 | 48 | 50 | 41 | 50 | 37 | 40 | 41 | 50 |
| 56 | 115 | 39 | 48 | 50 | 41 | 50 | 43 | 40 | 41 | 50 |
| 70 | 119 | 39 | 48 | 50 | 41 | 50 | 45 | 40 | 41 | 50 |
| 84 | 121 | 39 | 48 | 50 | 41 | 50 | 45 | 40 | 41 | 50 |
| 94 | 121 | 39 | 48 | 50 | 41 | 50 | 45 | 40 | 41 | 50 |

hours by answer (11277 character-hours): fallback 4645 (41%); filler 1755 (16%); objective 1288 (11%); level:weaponcrafting 765 (7%); level:woodcutting 589 (5%); level:mining 436 (4%); event 353 (3%); level:combat 336 (3%); offering 295 (3%); level:fishing 228 (2%); level:gearcrafting 190 (2%); level:jewelrycrafting 145 (1%); the rest 250
by kind: gather 6964, make 1830, offering 295, fight 671, event 353, task 1164
free (what the kill steps' sets drink): greater_health_potion 179490, enhanced_health_potion 176968, minor_health_potion 84641, health_potion 70763, enhanced_boost_potion 33061, small_health_potion 32567; in all 614751
kills: imp 31276, hellhound 6901, baby_red_dragon 5000, corrupted_ogre 3962, corrupted_owlbear 3712, chicken 3645, death_knight 2632, cursed_tree 2600; in all 74989 in 438 kill steps
completions: arachnophobia_conquered 11-22 (+2), the_new_bandit 11-23 (+2), the_reaper 11-23 (+3), cultist_purifier 11-23 (+4), king_of_the_goblins 11-24 (+3), worker 11-24 (+1), cult_destroyer 11-24 (+2), expert_miner 11-25 (+1), loktar_ogar 11-25 (+1), cabinet_maker 11-25 (+1), intermediate_alchemist 11-25 (+1), expert_lumberjack 11-26 (+1), intermediate_fisherman 11-27 (+1), grand_master 11-30 (+3), cursed_wood_blessed_victory 11-30 (+1), expert_alchemist 12-04 (+1), professional_lumberjack 12-04 (+1), ecologist 12-05 (+1), expert_fisherman 12-05 (+1), professional_miner 12-07 (+1), diamond_in_the_sky 12-07 (+3), professional_fisherman 12-11 (+1), closing_the_gate 12-13 (+4), a_peaceful_island 12-14 (+4), its_malefic 12-16 (+4), potion_brewer 12-17 (+2), catch_and_cook 12-17 (+2), palm_paradise 12-19 (+2), master_lumberjack 12-19 (+2), master_alchemist 12-21 (+2), master_fisherman 12-22 (+2), master_miner 12-24 (+2), shining_secrets 12-26 (+3), adamantite_mastery 12-26 (+1), corruption_eradicator 12-26 (+4), magic_lumberjack 12-28 (+2), strange_miner 12-29 (+2), a_favored_champion 01-06 (+4), tasks_coins_fan 01-07 (+5), magic_harvester 01-16 (+3), pearl_fisher 01-19 (+1), welcome_to_hell 01-22 (+3), making_a_nether_portal 02-02 (+2)
open at the deadline: a group 30 (coin_collector, crafted_with_honor, lich_please, life_lover, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, slimed_to_none, take_her_down); another layer 27 (around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, heartbound, magic_power, secure_the_island, the_worm_turns); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 4 (draconic_harvest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-BD1D2 — {"home":1,"potionK":0,"gates":1,"fleetGear":1}
points at the start 29, at the end 121; 6212 steps, 514 s, 23759 solves, peak 799 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 52 | 24 | 41 | 46 | 27 | 43 | 26 | 25 | 26 | 34 |
| 14 | 59 | 24 | 46 | 50 | 37 | 48 | 26 | 25 | 26 | 46 |
| 21 | 68 | 24 | 47 | 50 | 39 | 49 | 26 | 25 | 26 | 46 |
| 28 | 93 | 24 | 48 | 50 | 40 | 50 | 34 | 33 | 36 | 50 |
| 42 | 99 | 25 | 49 | 50 | 42 | 50 | 40 | 36 | 41 | 50 |
| 56 | 119 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |
| 70 | 119 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |
| 84 | 121 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |
| 94 | 121 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |

hours by answer (11278 character-hours): fallback 5006 (44%); filler 1956 (17%); objective 1066 (9%); level:weaponcrafting 765 (7%); level:woodcutting 578 (5%); level:mining 372 (3%); event 310 (3%); offering 302 (3%); level:combat 280 (2%); level:fishing 228 (2%); level:alchemy 164 (1%); level:jewelrycrafting 88 (1%); the rest 163
by kind: gather 7296, offering 302, fight 648, event 310, make 1557, task 1164
free (what the kill steps' sets drink): greater_health_potion 235223, enhanced_health_potion 226067, minor_health_potion 79701, health_potion 69468, small_health_potion 22847, enhanced_antidote 2433; in all 643261
kills: imp 31277, baby_red_dragon 5000, hellhound 4057, chicken 3669, corrupted_ogre 3073, death_knight 2947, cursed_tree 2534, corrupted_owlbear 2162; in all 69115 in 390 kill steps
completions: arachnophobia_conquered 11-22 (+2), expert_miner 11-22 (+1), the_reaper 11-23 (+3), the_new_bandit 11-23 (+2), worker 11-23 (+1), intermediate_alchemist 11-24 (+1), intermediate_fisherman 11-24 (+1), cultist_purifier 11-25 (+4), expert_lumberjack 11-25 (+1), cabinet_maker 11-25 (+1), cult_destroyer 11-26 (+2), king_of_the_goblins 11-26 (+3), loktar_ogar 11-26 (+1), grand_master 11-30 (+3), cursed_wood_blessed_victory 11-30 (+1), expert_fisherman 12-03 (+1), expert_alchemist 12-05 (+1), professional_lumberjack 12-05 (+1), professional_miner 12-06 (+1), diamond_in_the_sky 12-06 (+3), professional_fisherman 12-09 (+1), master_lumberjack 12-12 (+2), palm_paradise 12-12 (+2), ecologist 12-13 (+1), closing_the_gate 12-13 (+4), master_miner 12-13 (+2), catch_and_cook 12-15 (+2), potion_brewer 12-16 (+2), master_fisherman 12-17 (+2), its_malefic 12-18 (+4), shining_secrets 12-18 (+3), adamantite_mastery 12-18 (+1), a_peaceful_island 12-19 (+4), master_alchemist 12-23 (+2), magic_lumberjack 12-27 (+2), strange_miner 12-28 (+2), tasks_coins_fan 01-04 (+5), a_favored_champion 01-05 (+4), corruption_eradicator 01-07 (+4), magic_harvester 01-15 (+3), welcome_to_hell 01-15 (+3), pearl_fisher 01-15 (+1), making_a_nether_portal 01-31 (+2)
open at the deadline: a group 30 (coin_collector, crafted_with_honor, lich_please, life_lover, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, slimed_to_none, take_her_down); another layer 27 (around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, heartbound, magic_power, secure_the_island, the_worm_turns); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 4 (draconic_harvest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)=1 node docs/strategy/022/tools/tab.mjs
docs/strategy/022/runs <run>`.

### P0s — {"home":1}
points at the start 29, at the end 100; 8916 steps, 5928 s, 623910 solves, peak 1214 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 24 | 28 | 25 | 25 | 26 | 25 | 25 | 25 | 44 |
| 14 | 49 | 24 | 29 | 27 | 26 | 26 | 25 | 25 | 25 | 49 |
| 21 | 56 | 24 | 30 | 29 | 27 | 27 | 30 | 27 | 27 | 50 |
| 28 | 58 | 25 | 33 | 31 | 33 | 28 | 30 | 30 | 30 | 50 |
| 42 | 73 | 33 | 41 | 38 | 42 | 38 | 30 | 33 | 31 | 50 |
| 56 | 81 | 41 | 43 | 42 | 43 | 42 | 30 | 39 | 31 | 50 |
| 70 | 90 | 42 | 44 | 44 | 45 | 44 | 33 | 40 | 39 | 50 |
| 84 | 98 | 44 | 45 | 45 | 45 | 45 | 34 | 40 | 41 | 50 |
| 94 | 100 | 44 | 45 | 45 | 45 | 45 | 37 | 42 | 41 | 50 |

hours by answer (11238 character-hours): supply:consumables:greater_health_potion 3367 (30%); supply:consumables:minor_health_potion 1171 (10%); objective 1046 (9%); filler 898 (8%); supply:consumables:health_potion 704 (6%); level:woodcutting 628 (6%); supply:consumables:small_health_potion 579 (5%); level:combat 459 (4%); level:gearcrafting 310 (3%); offering 305 (3%); level:weaponcrafting 287 (3%); level:mining 286 (3%); the rest 1197
by kind: gather 7375, offering 305, event 167, fight 1270, make 1776, task 343
drunk and eaten: minor_health_potion 46177, small_health_potion 41306, greater_health_potion 38882, health_boost_potion 8676, cooked_bass 7611, health_potion 7426; in all 173883
kills: chicken 297562, cow 38622, yellow_slime 37970, imp 31381, green_slime 14944, red_slime 14090, death_knight 8538, owlbear 7042; in all 476630 in 2037 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), the_reaper 11-25 (+3), intermediate_fisherman 11-25 (+1), arachnophobia_conquered 11-25 (+2), the_new_bandit 11-25 (+2), expert_lumberjack 11-26 (+1), cabinet_maker 11-26 (+1), expert_alchemist 11-29 (+1), professional_miner 12-02 (+1), diamond_in_the_sky 12-03 (+3), expert_fisherman 12-04 (+1), professional_lumberjack 12-04 (+1), ecologist 12-08 (+1), master_alchemist 12-09 (+2), professional_fisherman 12-10 (+1), master_miner 12-10 (+2), adamantite_mastery 12-11 (+1), catch_and_cook 12-17 (+2), cultist_purifier 12-20 (+4), cult_destroyer 12-20 (+2), shining_secrets 12-20 (+3), magic_lumberjack 12-22 (+2), cursed_wood_blessed_victory 12-23 (+1), loktar_ogar 12-24 (+1), strange_miner 12-27 (+2), pearl_fisher 01-04 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-07 (+3), master_fisherman 01-18 (+2), palm_paradise 01-21 (+2), master_lumberjack 01-21 (+2), king_of_the_goblins 01-28 (+3), closing_the_gate 02-10 (+4), its_malefic 02-10 (+4), making_a_nether_portal 02-15 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); filler not reached 9 (tasks_coins_fan, the_planet_thanks_you); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-S25 — {"home":1,"spine":25}
points at the start 29, at the end 98; 8539 steps, 3600.1 s, 489851 solves, peak 1262 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 26 | 27 | 26 | 26 | 25 | 20 | 25 | 25 | 34 |
| 14 | 44 | 26 | 27 | 28 | 26 | 27 | 25 | 25 | 25 | 46 |
| 21 | 48 | 27 | 29 | 30 | 28 | 30 | 30 | 30 | 30 | 46 |
| 28 | 59 | 27 | 31 | 32 | 29 | 32 | 30 | 30 | 30 | 50 |
| 42 | 78 | 36 | 41 | 41 | 40 | 41 | 30 | 32 | 30 | 50 |
| 56 | 88 | 42 | 43 | 43 | 43 | 43 | 30 | 34 | 30 | 50 |
| 70 | 93 | 44 | 45 | 44 | 44 | 45 | 30 | 36 | 31 | 50 |
| 84 | 98 | 45 | 45 | 45 | 45 | 45 | 32 | 39 | 40 | 50 |
| 94 | 98 | 45 | 45 | 45 | 45 | 45 | 37 | 43 | 43 | 50 |

hours by answer (11206 character-hours): supply:consumables:greater_health_potion 2734 (24%); supply:consumables:minor_health_potion 1729 (15%); objective 956 (9%); supply:consumables:health_potion 896 (8%); level:woodcutting 639 (6%); supply:consumables:small_health_potion 540 (5%); supply:gear materials 499 (4%); level:combat 432 (4%); level:gearcrafting 357 (3%); offering 305 (3%); supply:consumables:health_boost_potion 292 (3%); level:weaponcrafting 287 (3%); the rest 1540
by kind: gather 7828, offering 305, make 1549, fight 1276, event 193, task 55
drunk and eaten: minor_health_potion 42538, small_health_potion 41990, greater_health_potion 39507, health_potion 18458, health_boost_potion 5236, cooked_bass 5106; in all 171692
kills: chicken 371385, green_slime 34544, cow 29325, yellow_slime 12650, red_slime 10720, owlbear 9532, death_knight 5581, cursed_tree 3492; in all 498248 in 1859 kill steps
completions: intermediate_alchemist 11-23 (+1), the_new_bandit 11-24 (+2), intermediate_fisherman 11-26 (+1), arachnophobia_conquered 11-26 (+2), expert_miner 11-27 (+1), worker 11-28 (+1), the_reaper 11-30 (+3), expert_lumberjack 11-30 (+1), cabinet_maker 11-30 (+1), expert_alchemist 12-05 (+1), expert_fisherman 12-05 (+1), professional_lumberjack 12-06 (+1), professional_miner 12-06 (+1), ecologist 12-09 (+1), professional_fisherman 12-12 (+1), diamond_in_the_sky 12-13 (+3), cultist_purifier 12-17 (+4), catch_and_cook 12-18 (+2), cult_destroyer 12-19 (+2), master_miner 12-21 (+2), master_fisherman 12-21 (+2), shining_secrets 12-23 (+3), adamantite_mastery 12-23 (+1), master_alchemist 12-24 (+2), magic_lumberjack 12-26 (+2), cursed_wood_blessed_victory 12-26 (+1), palm_paradise 12-28 (+2), master_lumberjack 12-28 (+2), strange_miner 01-01 (+2), a_favored_champion 01-05 (+4), king_of_the_goblins 01-10 (+3), magic_harvester 01-11 (+3), pearl_fisher 01-22 (+1), its_malefic 01-29 (+4), closing_the_gate 02-01 (+4), loktar_ogar 02-08 (+1)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-S30 — {"home":1,"spine":30}
points at the start 29, at the end 103; 8294 steps, 3356.9 s, 359000 solves, peak 1447 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 36 | 27 | 30 | 26 | 27 | 27 | 25 | 25 | 25 | 34 |
| 14 | 43 | 30 | 30 | 28 | 30 | 30 | 25 | 26 | 30 | 34 |
| 21 | 48 | 31 | 32 | 30 | 30 | 33 | 30 | 30 | 30 | 40 |
| 28 | 55 | 33 | 37 | 31 | 35 | 33 | 30 | 30 | 30 | 50 |
| 42 | 66 | 41 | 41 | 41 | 41 | 41 | 30 | 32 | 30 | 50 |
| 56 | 72 | 43 | 44 | 43 | 43 | 43 | 30 | 40 | 30 | 50 |
| 70 | 84 | 44 | 46 | 45 | 45 | 45 | 30 | 40 | 30 | 50 |
| 84 | 98 | 44 | 46 | 45 | 45 | 45 | 33 | 40 | 38 | 50 |
| 94 | 103 | 44 | 46 | 45 | 45 | 45 | 38 | 40 | 40 | 50 |

hours by answer (11251 character-hours): supply:consumables:greater_health_potion 3613 (32%); filler 1282 (11%); supply:consumables:minor_health_potion 1138 (10%); objective 913 (8%); supply:consumables:health_potion 700 (6%); level:woodcutting 479 (4%); supply:consumables:small_health_potion 453 (4%); level:combat 447 (4%); level:weaponcrafting 341 (3%); supply:consumables:earth_boost_potion 307 (3%); offering 303 (3%); level:mining 222 (2%); the rest 1054
by kind: gather 7124, offering 303, make 1259, event 205, fight 1196, task 1164
drunk and eaten: greater_health_potion 46468, minor_health_potion 39462, small_health_potion 38211, health_potion 13646, cooked_trout 7100, apple_pie 4136; in all 165624
kills: chicken 391710, yellow_slime 26927, cow 13039, green_slime 8097, owlbear 7244, death_knight 6527, red_slime 5543, blue_slime 4217; in all 486609 in 1652 kill steps
completions: the_new_bandit 11-23 (+2), expert_miner 11-25 (+1), intermediate_alchemist 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_fisherman 11-27 (+1), the_reaper 12-01 (+3), worker 12-03 (+1), expert_fisherman 12-03 (+1), cabinet_maker 12-04 (+1), ecologist 12-05 (+1), expert_lumberjack 12-08 (+1), cultist_purifier 12-10 (+4), professional_lumberjack 12-14 (+1), professional_fisherman 12-14 (+1), cult_destroyer 12-14 (+2), cursed_wood_blessed_victory 12-15 (+1), expert_alchemist 12-17 (+1), professional_miner 12-17 (+1), catch_and_cook 12-20 (+2), diamond_in_the_sky 12-22 (+3), loktar_ogar 12-26 (+1), magic_lumberjack 01-02 (+2), king_of_the_goblins 01-02 (+3), a_favored_champion 01-05 (+4), strange_miner 01-09 (+2), its_malefic 01-17 (+4), pearl_fisher 01-19 (+1), magic_harvester 01-19 (+3), closing_the_gate 01-29 (+4), master_alchemist 02-03 (+2), master_fisherman 02-04 (+2), master_miner 02-06 (+2), adamantite_mastery 02-08 (+1), shining_secrets 02-08 (+3), palm_paradise 02-10 (+2), master_lumberjack 02-10 (+2), tasks_coins_fan 02-23 (+5)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); filler not reached 6 (making_a_nether_portal, the_planet_thanks_you); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-S35 — {"home":1,"spine":35}
points at the start 29, at the end 94; 8552 steps, 5392.2 s, 589590 solves, peak 1140 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 26 | 30 | 25 | 26 | 26 | 29 | 25 | 26 | 34 |
| 14 | 41 | 28 | 33 | 25 | 28 | 28 | 30 | 30 | 30 | 43 |
| 21 | 50 | 35 | 37 | 35 | 35 | 36 | 30 | 30 | 30 | 43 |
| 28 | 52 | 36 | 41 | 36 | 38 | 40 | 30 | 30 | 31 | 50 |
| 42 | 55 | 39 | 45 | 39 | 42 | 43 | 30 | 31 | 31 | 50 |
| 56 | 66 | 41 | 46 | 42 | 43 | 45 | 30 | 31 | 31 | 50 |
| 70 | 83 | 42 | 47 | 43 | 45 | 45 | 33 | 38 | 31 | 50 |
| 84 | 94 | 45 | 47 | 45 | 45 | 46 | 35 | 41 | 39 | 50 |
| 94 | 94 | 45 | 47 | 45 | 45 | 46 | 38 | 41 | 41 | 50 |

hours by answer (11227 character-hours): supply:consumables:greater_health_potion 4135 (37%); supply:consumables:minor_health_potion 1334 (12%); supply:consumables:health_potion 903 (8%); objective 751 (7%); supply:consumables:small_health_potion 585 (5%); level:combat 458 (4%); level:woodcutting 440 (4%); level:mining 384 (3%); level:weaponcrafting 348 (3%); filler 333 (3%); offering 299 (3%); level:gearcrafting 236 (2%); the rest 1022
by kind: gather 7872, offering 299, make 1402, event 193, fight 1350, task 111
drunk and eaten: greater_health_potion 55206, small_health_potion 46675, minor_health_potion 36944, health_potion 9423, health_boost_potion 7610, cooked_trout 7100; in all 185469
kills: chicken 418082, cow 30470, yellow_slime 30275, red_slime 11370, green_slime 8360, imp 7276, rat 5964, death_knight 5774; in all 547483 in 2023 kill steps
completions: the_new_bandit 11-23 (+2), expert_miner 11-25 (+1), intermediate_alchemist 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_fisherman 11-27 (+1), ecologist 11-28 (+1), expert_fisherman 12-03 (+1), the_reaper 12-03 (+3), cult_destroyer 12-07 (+2), cabinet_maker 12-09 (+1), worker 12-10 (+1), cultist_purifier 12-10 (+4), expert_lumberjack 12-11 (+1), expert_alchemist 12-15 (+1), professional_fisherman 12-18 (+1), cursed_wood_blessed_victory 12-20 (+1), catch_and_cook 12-24 (+2), magic_lumberjack 01-03 (+2), a_favored_champion 01-05 (+4), pearl_fisher 01-08 (+1), its_malefic 01-15 (+4), professional_lumberjack 01-18 (+1), magic_harvester 01-19 (+3), diamond_in_the_sky 01-20 (+3), strange_miner 01-25 (+2), professional_miner 01-26 (+1), master_alchemist 01-26 (+2), master_fisherman 01-28 (+2), king_of_the_goblins 01-30 (+3), master_miner 02-07 (+2), palm_paradise 02-07 (+2), master_lumberjack 02-08 (+2), adamantite_mastery 02-09 (+1), shining_secrets 02-09 (+3), loktar_ogar 02-10 (+1)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 18 (closing_the_gate, corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-S40 — {"home":1,"spine":40}
points at the start 29, at the end 92; 8723 steps, 4645.8 s, 504750 solves, peak 963 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 26 | 30 | 25 | 26 | 26 | 29 | 25 | 26 | 34 |
| 14 | 41 | 28 | 33 | 25 | 28 | 28 | 30 | 30 | 30 | 43 |
| 21 | 43 | 31 | 37 | 27 | 34 | 33 | 30 | 30 | 30 | 47 |
| 28 | 52 | 37 | 40 | 29 | 38 | 38 | 30 | 32 | 30 | 50 |
| 42 | 55 | 41 | 41 | 37 | 42 | 41 | 30 | 35 | 30 | 50 |
| 56 | 64 | 43 | 44 | 41 | 45 | 44 | 31 | 36 | 30 | 50 |
| 70 | 79 | 45 | 45 | 43 | 46 | 45 | 31 | 40 | 30 | 50 |
| 84 | 88 | 46 | 46 | 45 | 47 | 46 | 31 | 41 | 30 | 50 |
| 94 | 92 | 46 | 46 | 45 | 47 | 46 | 31 | 42 | 30 | 50 |

hours by answer (11251 character-hours): supply:consumables:greater_health_potion 4714 (42%); supply:consumables:minor_health_potion 1828 (16%); supply:consumables:small_health_potion 654 (6%); supply:consumables:health_potion 537 (5%); level:combat 387 (3%); supply:consumables:earth_boost_potion 381 (3%); objective 355 (3%); level:gearcrafting 310 (3%); offering 301 (3%); event 273 (2%); level:mining 255 (2%); supply:consumables:health_boost_potion 238 (2%); the rest 1018
by kind: gather 8584, offering 301, make 672, event 273, fight 1421
drunk and eaten: greater_health_potion 67351, small_health_potion 45446, minor_health_potion 36445, health_potion 8820, cooked_trout 5967, cooked_rat_meat 4775; in all 188486
kills: chicken 459538, cow 33680, yellow_slime 18810, red_slime 16019, rat 9550, imp 7016, death_knight 4048, green_slime 3740; in all 576637 in 1808 kill steps
completions: the_new_bandit 11-23 (+2), expert_miner 11-25 (+1), intermediate_alchemist 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_fisherman 11-27 (+1), ecologist 11-28 (+1), expert_fisherman 12-03 (+1), the_reaper 12-03 (+3), cult_destroyer 12-07 (+2), cultist_purifier 12-13 (+4), expert_alchemist 12-13 (+1), diamond_in_the_sky 12-15 (+3), professional_fisherman 12-16 (+1), worker 12-23 (+1), cabinet_maker 12-23 (+1), expert_lumberjack 12-25 (+1), a_favored_champion 01-05 (+4), its_malefic 01-08 (+4), pearl_fisher 01-16 (+1), strange_miner 01-18 (+2), cursed_wood_blessed_victory 01-18 (+1), catch_and_cook 01-21 (+2), closing_the_gate 01-21 (+4), professional_lumberjack 01-22 (+1), king_of_the_goblins 01-25 (+3), magic_lumberjack 01-25 (+2), loktar_ogar 02-01 (+1), corruption_eradicator 02-08 (+4), magic_harvester 02-12 (+3), professional_miner 02-13 (+1), master_alchemist 02-16 (+2), master_fisherman 02-23 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 7 (draconic_harvest, welcome_to_hell); a level 6 (adamantite_mastery, master_miner, shining_secrets); does not fit 6 (master_lumberjack, palm_paradise, turning_treasures_to_gold); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master)

### B-C30 — {"home":1,"crafters":30}
points at the start 29, at the end 101; 9692 steps, 5018 s, 558147 solves, peak 1012 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 43 | 24 | 28 | 25 | 26 | 26 | 30 | 30 | 30 | 37 |
| 14 | 50 | 25 | 29 | 27 | 27 | 27 | 30 | 30 | 30 | 46 |
| 21 | 57 | 25 | 37 | 27 | 29 | 28 | 30 | 31 | 30 | 47 |
| 28 | 60 | 25 | 40 | 27 | 29 | 28 | 30 | 33 | 30 | 50 |
| 42 | 65 | 27 | 46 | 28 | 31 | 30 | 30 | 34 | 30 | 50 |
| 56 | 77 | 31 | 48 | 30 | 37 | 34 | 30 | 35 | 31 | 50 |
| 70 | 77 | 36 | 49 | 33 | 41 | 42 | 30 | 39 | 31 | 50 |
| 84 | 85 | 38 | 49 | 34 | 45 | 45 | 30 | 40 | 31 | 50 |
| 94 | 101 | 38 | 50 | 35 | 45 | 45 | 33 | 40 | 31 | 50 |

hours by answer (11276 character-hours): supply:consumables:greater_health_potion 4099 (36%); supply:consumables:health_potion 1191 (11%); supply:consumables:minor_health_potion 1129 (10%); objective 983 (9%); level:woodcutting 560 (5%); supply:consumables:small_health_potion 506 (4%); level:combat 366 (3%); supply:consumables:health_boost_potion 342 (3%); level:mining 333 (3%); offering 307 (3%); supply:consumables:earth_boost_potion 297 (3%); level:gearcrafting 190 (2%); the rest 973
by kind: gather 8306, offering 307, make 963, event 166, fight 1534
drunk and eaten: greater_health_potion 54102, small_health_potion 43992, minor_health_potion 43318, health_potion 21946, cooked_bass 10179, health_boost_potion 7187; in all 207943
kills: chicken 527662, yellow_slime 50890, cow 38136, red_slime 27640, green_slime 22560, owlbear 6550, death_knight 4278, cursed_tree 3411; in all 702661 in 2468 kill steps
completions: expert_miner 11-22 (+1), ecologist 11-22 (+1), worker 11-23 (+1), arachnophobia_conquered 11-25 (+2), intermediate_alchemist 11-25 (+1), intermediate_fisherman 11-25 (+1), the_reaper 11-26 (+3), the_new_bandit 11-26 (+2), cabinet_maker 11-27 (+1), expert_lumberjack 11-27 (+1), expert_alchemist 12-02 (+1), professional_lumberjack 12-03 (+1), expert_fisherman 12-03 (+1), professional_miner 12-04 (+1), diamond_in_the_sky 12-04 (+3), cultist_purifier 12-09 (+4), professional_fisherman 12-09 (+1), cult_destroyer 12-11 (+2), loktar_ogar 12-14 (+1), catch_and_cook 12-18 (+2), magic_lumberjack 12-20 (+2), cursed_wood_blessed_victory 12-27 (+1), strange_miner 12-31 (+2), pearl_fisher 01-03 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-05 (+3), master_fisherman 01-09 (+2), master_alchemist 01-14 (+2), closing_the_gate 02-07 (+4), its_malefic 02-11 (+4), grand_master 02-15 (+3), master_miner 02-20 (+2), palm_paradise 02-20 (+2), master_lumberjack 02-20 (+2), shining_secrets 02-22 (+3), adamantite_mastery 02-22 (+1), king_of_the_goblins 02-23 (+3)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); does not fit 6 (a_peaceful_island, turning_treasures_to_gold); unhandled 4 (ultimate_rune)

### B-C35 — {"home":1,"crafters":35}
points at the start 29, at the end 101; 8892 steps, 2214.2 s, 237916 solves, peak 961 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 41 | 24 | 26 | 24 | 24 | 28 | 34 | 35 | 35 | 37 |
| 14 | 47 | 24 | 26 | 24 | 24 | 30 | 35 | 35 | 35 | 46 |
| 21 | 51 | 24 | 30 | 24 | 24 | 33 | 35 | 35 | 35 | 46 |
| 28 | 61 | 24 | 37 | 24 | 24 | 36 | 35 | 35 | 35 | 46 |
| 42 | 68 | 25 | 46 | 26 | 26 | 45 | 35 | 38 | 35 | 50 |
| 56 | 80 | 27 | 47 | 27 | 27 | 46 | 35 | 40 | 35 | 50 |
| 70 | 86 | 28 | 49 | 29 | 28 | 48 | 35 | 40 | 35 | 50 |
| 84 | 93 | 28 | 50 | 29 | 28 | 50 | 35 | 40 | 35 | 50 |
| 94 | 101 | 28 | 50 | 29 | 28 | 50 | 38 | 40 | 41 | 50 |

hours by answer (11222 character-hours): supply:consumables:greater_health_potion 2883 (26%); supply:consumables:health_potion 1846 (16%); supply:consumables:minor_health_potion 1240 (11%); objective 1018 (9%); filler 911 (8%); level:woodcutting 578 (5%); level:weaponcrafting 348 (3%); offering 307 (3%); level:combat 288 (3%); supply:consumables:small_health_potion 279 (2%); level:mining 252 (2%); level:gearcrafting 190 (2%); the rest 1083
by kind: gather 7545, offering 307, make 1549, event 148, fight 1139, task 534
drunk and eaten: minor_health_potion 56674, health_potion 38482, greater_health_potion 30255, small_health_potion 21212, cooked_bass 4357, earth_boost_potion 2852; in all 166622
kills: chicken 430952, yellow_slime 24550, imp 19558, red_slime 16150, cow 9240, green_slime 5150, cursed_tree 4179, rat 3202; in all 529620 in 1734 kill steps
completions: expert_miner 11-22 (+1), ecologist 11-22 (+1), worker 11-23 (+1), intermediate_fisherman 11-25 (+1), arachnophobia_conquered 11-27 (+2), intermediate_alchemist 11-28 (+1), the_reaper 11-28 (+3), the_new_bandit 11-28 (+2), cabinet_maker 12-01 (+1), expert_lumberjack 12-01 (+1), expert_fisherman 12-01 (+1), expert_alchemist 12-04 (+1), professional_miner 12-04 (+1), professional_lumberjack 12-05 (+1), professional_fisherman 12-08 (+1), diamond_in_the_sky 12-10 (+3), catch_and_cook 12-13 (+2), master_fisherman 12-15 (+2), cultist_purifier 12-16 (+4), cult_destroyer 12-18 (+2), magic_lumberjack 12-23 (+2), loktar_ogar 12-23 (+1), cursed_wood_blessed_victory 12-27 (+1), king_of_the_goblins 12-30 (+3), strange_miner 01-03 (+2), pearl_fisher 01-03 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-08 (+3), master_miner 01-14 (+2), shining_secrets 01-19 (+3), adamantite_mastery 01-19 (+1), master_alchemist 01-19 (+2), grand_master 02-01 (+3), its_malefic 02-10 (+4), palm_paradise 02-14 (+2), master_lumberjack 02-14 (+2), closing_the_gate 02-21 (+4)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-CS — {"home":1,"crafters":35,"spine":30}
points at the start 29, at the end 94; 9524 steps, 5225.6 s, 580992 solves, peak 1457 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 35 | 24 | 26 | 24 | 24 | 24 | 34 | 35 | 35 | 34 |
| 14 | 39 | 25 | 30 | 27 | 24 | 30 | 35 | 35 | 35 | 34 |
| 21 | 44 | 31 | 33 | 32 | 31 | 33 | 35 | 35 | 35 | 42 |
| 28 | 52 | 32 | 39 | 34 | 38 | 38 | 35 | 35 | 35 | 50 |
| 42 | 63 | 34 | 43 | 34 | 45 | 42 | 35 | 38 | 35 | 50 |
| 56 | 69 | 35 | 47 | 36 | 46 | 45 | 35 | 40 | 35 | 50 |
| 70 | 80 | 38 | 49 | 39 | 49 | 48 | 35 | 40 | 35 | 50 |
| 84 | 87 | 40 | 50 | 41 | 50 | 49 | 35 | 40 | 35 | 50 |
| 94 | 94 | 40 | 50 | 41 | 50 | 49 | 35 | 40 | 35 | 50 |

hours by answer (11275 character-hours): supply:consumables:greater_health_potion 4967 (44%); supply:consumables:minor_health_potion 1511 (13%); objective 647 (6%); supply:consumables:health_potion 585 (5%); level:combat 417 (4%); supply:consumables:small_health_potion 407 (4%); level:woodcutting 402 (4%); level:mining 333 (3%); offering 301 (3%); supply:consumables:earth_boost_potion 273 (2%); event 238 (2%); supply:consumables:health_boost_potion 226 (2%); the rest 967
by kind: gather 8164, offering 301, make 938, event 238, fight 1569, task 64
drunk and eaten: greater_health_potion 82853, small_health_potion 34356, minor_health_potion 28666, cooked_bass 9859, health_potion 8350, earth_boost_potion 6766; in all 199404
kills: chicken 592620, yellow_slime 38618, cow 26152, green_slime 11920, red_slime 8360, death_knight 6951, blue_slime 5611, rat 5579; in all 722469 in 2322 kill steps
completions: ecologist 11-22 (+1), intermediate_fisherman 11-28 (+1), intermediate_alchemist 11-28 (+1), expert_miner 11-28 (+1), the_new_bandit 11-28 (+2), worker 11-29 (+1), arachnophobia_conquered 11-30 (+2), expert_fisherman 12-03 (+1), the_reaper 12-07 (+3), cabinet_maker 12-08 (+1), expert_lumberjack 12-09 (+1), diamond_in_the_sky 12-13 (+3), cult_destroyer 12-13 (+2), professional_fisherman 12-15 (+1), expert_alchemist 12-16 (+1), cursed_wood_blessed_victory 12-17 (+1), cultist_purifier 12-20 (+4), loktar_ogar 12-20 (+1), catch_and_cook 12-24 (+2), strange_miner 12-31 (+2), magic_lumberjack 01-02 (+2), a_favored_champion 01-05 (+4), pearl_fisher 01-09 (+1), professional_lumberjack 01-15 (+1), magic_harvester 01-18 (+3), its_malefic 01-20 (+4), closing_the_gate 01-24 (+4), grand_master 02-03 (+3), corruption_eradicator 02-11 (+4), professional_miner 02-15 (+1), master_alchemist 02-17 (+2), master_fisherman 02-18 (+2), master_miner 02-22 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); does not fit 13 (adamantite_mastery, king_of_the_goblins, master_lumberjack, palm_paradise, shining_secrets, turning_treasures_to_gold); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 7 (draconic_harvest, welcome_to_hell); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune)

### B-D1 — {"home":1,"gates":1}
points at the start 29, at the end 69; 7116 steps, 502.8 s, 12555 solves, peak 612 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 24 | 28 | 24 | 24 | 24 | 25 | 25 | 25 | 41 |
| 14 | 49 | 24 | 28 | 24 | 24 | 24 | 26 | 25 | 25 | 50 |
| 21 | 52 | 24 | 28 | 24 | 24 | 24 | 31 | 35 | 35 | 50 |
| 28 | 52 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 40 | 50 |
| 42 | 61 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 56 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 70 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 84 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |
| 94 | 69 | 24 | 28 | 24 | 24 | 24 | 31 | 36 | 41 | 50 |

hours by answer (11276 character-hours): fallback 6941 (62%); filler 1886 (17%); objective 642 (6%); level:woodcutting 572 (5%); offering 307 (3%); level:mining 253 (2%); supply:consumables:minor_health_potion 142 (1%); supply:consumables:small_health_potion 131 (1%); level:fishing 123 (1%); level:alchemy 107 (1%); event 82 (1%); level:weaponcrafting 45 (0%); the rest 43
by kind: gather 9247, offering 307, event 82, fight 33, make 442, task 1164
drunk and eaten: minor_health_potion 5990, small_health_potion 5847, cooked_trout 676, cheese 674, air_boost_potion 22; in all 13208
kills: spider 998, chicken 954, death_knight 250, skeleton 238, pig 192, bandit_lizard 100, imp 68, flying_snake 54; in all 2939 in 130 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), the_new_bandit 11-25 (+2), intermediate_fisherman 11-26 (+1), arachnophobia_conquered 11-26 (+2), expert_lumberjack 11-26 (+1), cabinet_maker 11-26 (+1), the_reaper 11-27 (+3), expert_alchemist 12-02 (+1), professional_miner 12-02 (+1), diamond_in_the_sky 12-02 (+3), professional_lumberjack 12-03 (+1), expert_fisherman 12-05 (+1), ecologist 12-06 (+1), adamantite_mastery 12-09 (+1), professional_fisherman 12-11 (+1), tasks_coins_fan 12-22 (+5), magic_lumberjack 12-23 (+2), strange_miner 12-26 (+2), a_favored_champion 01-05 (+4), magic_harvester 01-07 (+3), pearl_fisher 01-09 (+1)
open at the deadline: another layer 38 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, crafted_with_honor, elementary_book, sands_of_power, secrets_in_the_sand, secure_the_island, take_her_down, the_worm_turns); gold: 1365 short for the fare 29 (a_peaceful_island, catch_and_cook, heartbound, magic_power, master_alchemist, master_fisherman, master_lumberjack, master_miner, palm_paradise, sandwhispers_hidden_treasure, shining_secrets); an event 21 (closing_the_gate, corruption_eradicator, cult_destroyer, draconic_harvest, its_malefic, welcome_to_hell); gear (no safe win within ten levels) 12 (cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a group 9 (lich_please, life_lover, slimed_to_none); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); filler not reached 6 (making_a_nether_portal, the_planet_thanks_you); unhandled 4 (ultimate_rune); gold: 4365 short for the fare 2 (potion_brewer); does not fit 2 (turning_treasures_to_gold)

### B-D1D2 — {"home":1,"gates":1,"fleetGear":1}
points at the start 29, at the end 93; 10471 steps, 5344.7 s, 569112 solves, peak 1377 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 25 | 27 | 26 | 25 | 26 | 24 | 25 | 25 | 34 |
| 14 | 49 | 25 | 28 | 26 | 25 | 28 | 25 | 25 | 25 | 48 |
| 21 | 56 | 25 | 29 | 28 | 26 | 28 | 30 | 26 | 25 | 50 |
| 28 | 62 | 26 | 33 | 29 | 26 | 29 | 31 | 30 | 38 | 50 |
| 42 | 71 | 28 | 40 | 29 | 28 | 30 | 31 | 31 | 38 | 50 |
| 56 | 81 | 29 | 46 | 29 | 29 | 32 | 31 | 33 | 38 | 50 |
| 70 | 81 | 34 | 47 | 35 | 30 | 41 | 31 | 37 | 38 | 50 |
| 84 | 89 | 36 | 48 | 39 | 33 | 44 | 31 | 40 | 38 | 50 |
| 94 | 93 | 36 | 48 | 39 | 34 | 46 | 31 | 40 | 38 | 50 |

hours by answer (11277 character-hours): supply:consumables:greater_health_potion 3942 (35%); supply:consumables:minor_health_potion 1687 (15%); objective 970 (9%); supply:consumables:health_potion 736 (7%); level:woodcutting 596 (5%); supply:consumables:small_health_potion 495 (4%); supply:consumables:health_boost_potion 467 (4%); offering 304 (3%); filler 296 (3%); level:mining 276 (2%); level:combat 275 (2%); level:gearcrafting 186 (2%); the rest 1046
by kind: gather 8417, offering 304, event 171, fight 1236, make 968, task 179
drunk and eaten: minor_health_potion 64985, greater_health_potion 46768, small_health_potion 43034, health_boost_potion 12579, health_potion 7974, earth_boost_potion 5906; in all 204217
kills: chicken 369628, cow 52280, yellow_slime 47370, red_slime 18674, blue_slime 7600, green_slime 6540, imp 3777, death_knight 3468; in all 530740 in 2207 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), arachnophobia_conquered 11-25 (+2), the_new_bandit 11-25 (+2), intermediate_fisherman 11-26 (+1), expert_lumberjack 11-27 (+1), cabinet_maker 11-27 (+1), the_reaper 11-27 (+3), professional_lumberjack 12-04 (+1), expert_alchemist 12-04 (+1), expert_fisherman 12-04 (+1), professional_miner 12-05 (+1), diamond_in_the_sky 12-05 (+3), ecologist 12-08 (+1), master_alchemist 12-10 (+2), professional_fisherman 12-10 (+1), master_miner 12-12 (+2), adamantite_mastery 12-12 (+1), cultist_purifier 12-19 (+4), catch_and_cook 12-19 (+2), cult_destroyer 12-22 (+2), magic_lumberjack 12-23 (+2), strange_miner 12-28 (+2), shining_secrets 12-31 (+3), loktar_ogar 01-03 (+1), pearl_fisher 01-04 (+1), a_favored_champion 01-05 (+4), magic_harvester 01-08 (+3), cursed_wood_blessed_victory 01-14 (+1), palm_paradise 01-31 (+2), master_lumberjack 01-31 (+2), closing_the_gate 02-11 (+4), its_malefic 02-18 (+4)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); does not fit 7 (king_of_the_goblins, master_fisherman, turning_treasures_to_gold); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master)

### B-S30D1D2 — {"home":1,"spine":30,"gates":1,"fleetGear":1}
points at the start 29, at the end 95; 8984 steps, 3783.9 s, 454658 solves, peak 1475 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 35 | 25 | 30 | 27 | 25 | 26 | 25 | 25 | 25 | 34 |
| 14 | 40 | 30 | 31 | 27 | 30 | 30 | 25 | 25 | 25 | 34 |
| 21 | 43 | 30 | 31 | 30 | 30 | 30 | 25 | 26 | 25 | 34 |
| 28 | 51 | 32 | 36 | 32 | 33 | 33 | 30 | 30 | 28 | 50 |
| 42 | 59 | 36 | 41 | 34 | 37 | 38 | 30 | 35 | 34 | 50 |
| 56 | 71 | 44 | 44 | 37 | 44 | 44 | 30 | 40 | 35 | 50 |
| 70 | 80 | 46 | 46 | 40 | 46 | 46 | 30 | 40 | 35 | 50 |
| 84 | 88 | 46 | 47 | 43 | 46 | 46 | 30 | 40 | 40 | 50 |
| 94 | 95 | 46 | 47 | 43 | 46 | 46 | 34 | 40 | 40 | 50 |

hours by answer (11262 character-hours): supply:consumables:greater_health_potion 3578 (32%); supply:consumables:minor_health_potion 1875 (17%); objective 1017 (9%); supply:consumables:health_potion 802 (7%); level:combat 543 (5%); supply:consumables:small_health_potion 534 (5%); level:mining 504 (4%); level:woodcutting 383 (3%); offering 304 (3%); supply:consumables:earth_boost_potion 298 (3%); level:gearcrafting 190 (2%); event 188 (2%); the rest 1045
by kind: gather 8112, offering 304, make 1338, event 188, fight 1211, task 109
drunk and eaten: minor_health_potion 59050, small_health_potion 45692, greater_health_potion 35348, cooked_bass 10616, health_potion 9396, health_boost_potion 5733; in all 183216
kills: chicken 272559, cow 33537, yellow_slime 17558, red_slime 13860, green_slime 12630, cultist_acolyte 7623, owlbear 6350, blue_slime 5010; in all 396705 in 1830 kill steps
completions: the_new_bandit 11-23 (+2), intermediate_alchemist 11-25 (+1), intermediate_fisherman 11-26 (+1), arachnophobia_conquered 11-27 (+2), the_reaper 12-01 (+3), expert_miner 12-01 (+1), expert_fisherman 12-02 (+1), worker 12-06 (+1), cabinet_maker 12-06 (+1), professional_fisherman 12-11 (+1), ecologist 12-13 (+1), expert_lumberjack 12-13 (+1), cultist_purifier 12-15 (+4), cult_destroyer 12-17 (+2), cursed_wood_blessed_victory 12-20 (+1), catch_and_cook 12-20 (+2), expert_alchemist 12-23 (+1), diamond_in_the_sky 12-26 (+3), professional_lumberjack 12-30 (+1), a_favored_champion 01-05 (+4), magic_lumberjack 01-05 (+2), professional_miner 01-08 (+1), king_of_the_goblins 01-11 (+3), strange_miner 01-14 (+2), magic_harvester 01-21 (+3), pearl_fisher 01-24 (+1), loktar_ogar 01-28 (+1), its_malefic 01-30 (+4), closing_the_gate 02-01 (+4), master_alchemist 02-09 (+2), master_fisherman 02-12 (+2), palm_paradise 02-18 (+2), master_lumberjack 02-18 (+2), adamantite_mastery 02-23 (+1), master_miner 02-23 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); does not fit 5 (shining_secrets, turning_treasures_to_gold); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master)

### B-F3S30 — {"home":1,"spine":30,"fighters":["First","Fourth","Fifth"]}
points at the start 29, at the end 92; 7838 steps, 2112.7 s, 241164 solves, peak 1472 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 37 | 28 | 26 | 24 | 27 | 30 | 25 | 25 | 25 | 34 |
| 14 | 41 | 30 | 26 | 24 | 30 | 31 | 25 | 25 | 27 | 36 |
| 21 | 50 | 32 | 27 | 24 | 33 | 35 | 30 | 30 | 30 | 43 |
| 28 | 54 | 32 | 27 | 24 | 40 | 40 | 30 | 31 | 30 | 50 |
| 42 | 64 | 38 | 27 | 24 | 44 | 45 | 33 | 40 | 35 | 50 |
| 56 | 76 | 43 | 27 | 24 | 46 | 46 | 33 | 40 | 35 | 50 |
| 70 | 90 | 45 | 27 | 24 | 46 | 46 | 37 | 40 | 41 | 50 |
| 84 | 90 | 46 | 27 | 24 | 46 | 47 | 41 | 43 | 43 | 50 |
| 94 | 92 | 46 | 27 | 24 | 46 | 47 | 45 | 45 | 45 | 50 |

hours by answer (11275 character-hours): supply:consumables:greater_health_potion 1971 (17%); filler 1643 (15%); supply:consumables:minor_health_potion 1390 (12%); supply:consumables:health_potion 1259 (11%); objective 804 (7%); level:weaponcrafting 765 (7%); level:gearcrafting 490 (4%); supply:consumables:small_health_potion 489 (4%); level:woodcutting 482 (4%); level:combat 331 (3%); level:jewelrycrafting 328 (3%); offering 307 (3%); the rest 1016
by kind: gather 6306, offering 307, make 2663, event 127, fight 937, task 934
drunk and eaten: minor_health_potion 39164, small_health_potion 35003, health_potion 20706, greater_health_potion 19948, health_boost_potion 5149, cooked_trout 3924; in all 140734
kills: chicken 258463, imp 31294, cow 24530, yellow_slime 23800, red_slime 7110, cultist_acolyte 5027, cursed_tree 4473, green_slime 2890; in all 375122 in 1530 kill steps
completions: intermediate_alchemist 11-23 (+1), the_new_bandit 11-24 (+2), arachnophobia_conquered 11-25 (+2), the_reaper 11-27 (+3), intermediate_fisherman 11-29 (+1), expert_miner 12-02 (+1), worker 12-03 (+1), expert_lumberjack 12-05 (+1), expert_fisherman 12-07 (+1), ecologist 12-07 (+1), cabinet_maker 12-07 (+1), cultist_purifier 12-10 (+4), cult_destroyer 12-10 (+2), expert_alchemist 12-15 (+1), cursed_wood_blessed_victory 12-15 (+1), loktar_ogar 12-16 (+1), professional_fisherman 12-17 (+1), professional_lumberjack 12-22 (+1), catch_and_cook 12-23 (+2), professional_miner 12-24 (+1), diamond_in_the_sky 12-24 (+3), king_of_the_goblins 12-31 (+3), magic_lumberjack 01-03 (+2), a_favored_champion 01-05 (+4), strange_miner 01-10 (+2), master_alchemist 01-14 (+2), master_fisherman 01-15 (+2), magic_harvester 01-19 (+3), master_miner 01-19 (+2), shining_secrets 01-21 (+3), adamantite_mastery 01-21 (+1), palm_paradise 01-21 (+2), master_lumberjack 01-21 (+2), pearl_fisher 01-28 (+1), making_a_nether_portal 02-17 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 19 (closing_the_gate, corruption_eradicator, draconic_harvest, its_malefic, welcome_to_hell); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); filler not reached 9 (tasks_coins_fan, the_planet_thanks_you); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-F3D1D2 — {"home":1,"gates":1,"fleetGear":1,"fighters":["First","Fourth","Fifth"]}
points at the start 29, at the end 93; 7961 steps, 1599.5 s, 204754 solves, peak 1261 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 40 | 24 | 27 | 24 | 24 | 24 | 20 | 25 | 24 | 34 |
| 14 | 49 | 24 | 27 | 25 | 24 | 24 | 20 | 25 | 24 | 45 |
| 21 | 51 | 24 | 28 | 26 | 29 | 30 | 27 | 28 | 25 | 49 |
| 28 | 53 | 25 | 28 | 26 | 33 | 34 | 30 | 30 | 28 | 49 |
| 42 | 63 | 26 | 28 | 26 | 36 | 40 | 30 | 34 | 28 | 50 |
| 56 | 72 | 26 | 28 | 26 | 43 | 43 | 30 | 39 | 38 | 50 |
| 70 | 80 | 27 | 28 | 26 | 44 | 44 | 35 | 40 | 40 | 50 |
| 84 | 88 | 27 | 28 | 26 | 44 | 45 | 37 | 41 | 40 | 50 |
| 94 | 93 | 27 | 28 | 26 | 44 | 45 | 39 | 41 | 41 | 50 |

hours by answer (11271 character-hours): supply:consumables:greater_health_potion 2743 (24%); filler 1639 (15%); supply:consumables:minor_health_potion 1080 (10%); objective 1010 (9%); level:woodcutting 686 (6%); supply:consumables:health_potion 514 (5%); supply:consumables:small_health_potion 424 (4%); fallback 416 (4%); level:weaponcrafting 405 (4%); offering 306 (3%); level:mining 285 (3%); supply:consumables:earth_boost_potion 267 (2%); the rest 1496
by kind: gather 6975, offering 306, event 154, fight 852, make 1820, task 1164
drunk and eaten: greater_health_potion 32798, minor_health_potion 31701, small_health_potion 31063, earth_boost_potion 11058, health_boost_potion 7004, health_potion 6326; in all 129412
kills: chicken 240956, yellow_slime 68353, cow 35464, imp 31346, green_slime 16748, red_slime 7718, rat 6059, cursed_tree 2556; in all 416070 in 1406 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), the_new_bandit 11-25 (+2), expert_lumberjack 11-25 (+1), intermediate_fisherman 11-26 (+1), cabinet_maker 11-26 (+1), the_reaper 11-26 (+3), arachnophobia_conquered 11-29 (+2), professional_lumberjack 12-03 (+1), expert_fisherman 12-04 (+1), expert_alchemist 12-05 (+1), professional_miner 12-05 (+1), diamond_in_the_sky 12-05 (+3), professional_fisherman 12-10 (+1), ecologist 12-12 (+1), catch_and_cook 12-16 (+2), cult_destroyer 12-20 (+2), cultist_purifier 12-20 (+4), magic_lumberjack 12-23 (+2), strange_miner 12-28 (+2), a_favored_champion 01-05 (+4), pearl_fisher 01-07 (+1), magic_harvester 01-08 (+3), cursed_wood_blessed_victory 01-12 (+1), master_alchemist 01-23 (+2), master_miner 01-24 (+2), shining_secrets 01-26 (+3), adamantite_mastery 01-26 (+1), palm_paradise 02-01 (+2), master_lumberjack 02-02 (+2), master_fisherman 02-07 (+2), making_a_nether_portal 02-12 (+2), tasks_coins_fan 02-18 (+5)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 19 (closing_the_gate, corruption_eradicator, draconic_harvest, its_malefic, welcome_to_hell); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); potions (a safe win once they are made) 8 (a_peaceful_island, king_of_the_goblins, loktar_ogar); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-R5 — {"home":1,"runes":5}
points at the start 29, at the end 97; 9095 steps, 4996.9 s, 538685 solves, peak 1478 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 26 | 28 | 27 | 23 | 28 | 25 | 25 | 25 | 41 |
| 14 | 47 | 26 | 29 | 30 | 24 | 29 | 26 | 27 | 26 | 46 |
| 21 | 56 | 27 | 32 | 33 | 26 | 35 | 30 | 30 | 30 | 46 |
| 28 | 61 | 27 | 39 | 38 | 33 | 40 | 30 | 31 | 30 | 46 |
| 42 | 67 | 40 | 45 | 43 | 45 | 45 | 30 | 40 | 32 | 50 |
| 56 | 80 | 44 | 47 | 45 | 46 | 47 | 30 | 40 | 32 | 50 |
| 70 | 83 | 46 | 48 | 46 | 48 | 48 | 30 | 41 | 32 | 50 |
| 84 | 87 | 46 | 48 | 46 | 48 | 48 | 31 | 41 | 37 | 50 |
| 94 | 97 | 46 | 48 | 46 | 48 | 48 | 32 | 44 | 40 | 50 |

hours by answer (11201 character-hours): supply:consumables:greater_health_potion 3459 (31%); supply:consumables:minor_health_potion 1163 (10%); objective 1035 (9%); supply:consumables:small_health_potion 941 (8%); supply:consumables:health_potion 848 (8%); level:woodcutting 620 (6%); level:combat 602 (5%); level:gearcrafting 426 (4%); offering 305 (3%); filler 252 (2%); supply:consumables:health_boost_potion 251 (2%); level:mining 238 (2%); the rest 1059
by kind: gather 8041, offering 305, event 188, make 1378, fight 1249, task 39
drunk and eaten: small_health_potion 62671, minor_health_potion 56902, greater_health_potion 24805, health_potion 14236, cooked_bass 4850, health_boost_potion 4821; in all 186954
kills: chicken 260400, cow 29457, yellow_slime 21480, green_slime 13948, imp 11150, red_slime 10240, death_knight 7410, cursed_tree 6923; in all 393307 in 2024 kill steps
completions: expert_miner 11-22 (+1), worker 11-23 (+1), the_new_bandit 11-24 (+2), intermediate_alchemist 11-24 (+1), arachnophobia_conquered 11-24 (+2), the_reaper 11-25 (+3), intermediate_fisherman 11-26 (+1), cabinet_maker 11-27 (+1), expert_lumberjack 11-27 (+1), expert_alchemist 12-02 (+1), professional_lumberjack 12-03 (+1), professional_miner 12-03 (+1), expert_fisherman 12-04 (+1), ecologist 12-05 (+1), cultist_purifier 12-11 (+4), diamond_in_the_sky 12-11 (+3), cult_destroyer 12-11 (+2), professional_fisherman 12-14 (+1), king_of_the_goblins 12-18 (+3), cursed_wood_blessed_victory 12-19 (+1), catch_and_cook 12-20 (+2), strange_miner 12-27 (+2), magic_lumberjack 12-27 (+2), a_favored_champion 01-05 (+4), its_malefic 01-11 (+4), pearl_fisher 01-12 (+1), closing_the_gate 01-13 (+4), magic_harvester 01-17 (+3), master_fisherman 02-12 (+2), master_alchemist 02-13 (+2), master_miner 02-15 (+2), shining_secrets 02-17 (+3), adamantite_mastery 02-17 (+1), palm_paradise 02-21 (+2), master_lumberjack 02-22 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); an event 14 (corruption_eradicator, crafted_with_honor, draconic_harvest, welcome_to_hell); a group 11 (lich_please, life_lover, slimed_to_none, take_her_down); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); gear (no safe win within ten levels) 7 (a_peaceful_island, grand_master); unhandled 4 (ultimate_rune); does not fit 3 (loktar_ogar, turning_treasures_to_gold)

### B-I — {"home":1,"buy":{"algae":37000}}
points at the start 29, at the end 95; 10801 steps, 6456.5 s, 803349 solves, peak 1036 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 42 | 25 | 27 | 24 | 25 | 28 | 23 | 25 | 25 | 41 |
| 14 | 50 | 25 | 29 | 27 | 27 | 31 | 28 | 30 | 29 | 46 |
| 21 | 56 | 27 | 36 | 28 | 30 | 37 | 30 | 31 | 32 | 50 |
| 28 | 59 | 28 | 43 | 29 | 38 | 40 | 30 | 36 | 35 | 50 |
| 42 | 65 | 32 | 46 | 33 | 45 | 45 | 32 | 40 | 35 | 50 |
| 56 | 80 | 34 | 47 | 35 | 46 | 46 | 32 | 40 | 35 | 50 |
| 70 | 88 | 37 | 48 | 38 | 48 | 48 | 33 | 40 | 35 | 50 |
| 84 | 91 | 39 | 50 | 40 | 49 | 50 | 33 | 40 | 35 | 50 |
| 94 | 95 | 40 | 50 | 41 | 49 | 50 | 33 | 40 | 35 | 50 |

hours by answer (11244 character-hours): supply:consumables:greater_health_potion 4035 (36%); supply:consumables:health_potion 1360 (12%); objective 1018 (9%); supply:consumables:minor_health_potion 830 (7%); supply:consumables:small_health_potion 496 (4%); level:woodcutting 437 (4%); supply:consumables:health_boost_potion 401 (4%); level:combat 353 (3%); level:mining 306 (3%); offering 304 (3%); supply:consumables:earth_res_potion 232 (2%); event 218 (2%); the rest 1255
by kind: gather 7835, offering 304, event 218, fight 1833, make 1049, task 4
drunk and eaten: greater_health_potion 72304, minor_health_potion 65680, small_health_potion 38742, health_potion 19259, health_boost_potion 12501, earth_boost_potion 10007; in all 252086
kills: chicken 597066, yellow_slime 90840, cow 54984, green_slime 25980, red_slime 22640, rat 6262, imp 5405, cursed_tree 5287; in all 835202 in 2858 kill steps
completions: expert_miner 11-22 (+1), intermediate_alchemist 11-23 (+1), worker 11-23 (+1), arachnophobia_conquered 11-25 (+2), the_new_bandit 11-25 (+2), the_reaper 11-26 (+3), intermediate_fisherman 11-26 (+1), expert_lumberjack 11-26 (+1), cabinet_maker 11-26 (+1), expert_alchemist 12-02 (+1), professional_miner 12-02 (+1), professional_lumberjack 12-03 (+1), diamond_in_the_sky 12-03 (+3), ecologist 12-04 (+1), expert_fisherman 12-05 (+1), cult_destroyer 12-10 (+2), cultist_purifier 12-10 (+4), loktar_ogar 12-13 (+1), professional_fisherman 12-15 (+1), cursed_wood_blessed_victory 12-18 (+1), catch_and_cook 12-22 (+2), magic_lumberjack 12-23 (+2), strange_miner 12-27 (+2), a_favored_champion 01-05 (+4), magic_harvester 01-08 (+3), its_malefic 01-08 (+4), closing_the_gate 01-10 (+4), master_alchemist 01-19 (+2), master_fisherman 01-20 (+2), pearl_fisher 01-22 (+1), king_of_the_goblins 01-24 (+3), grand_master 02-09 (+3), palm_paradise 02-22 (+2), master_lumberjack 02-22 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); filler not reached 11 (making_a_nether_portal, tasks_coins_fan, the_planet_thanks_you); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); does not fit 8 (adamantite_mastery, master_miner, shining_secrets, turning_treasures_to_gold); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune)

### B-IS30 — {"home":1,"spine":30,"buy":{"algae":37000}}
points at the start 29, at the end 100; 8485 steps, 3672 s, 464626 solves, peak 1532 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 43 | 24 | 30 | 24 | 24 | 30 | 28 | 27 | 26 | 34 |
| 14 | 45 | 30 | 35 | 32 | 33 | 36 | 30 | 30 | 30 | 48 |
| 21 | 51 | 33 | 40 | 34 | 40 | 40 | 30 | 30 | 30 | 50 |
| 28 | 54 | 42 | 43 | 39 | 41 | 42 | 30 | 30 | 33 | 50 |
| 42 | 63 | 44 | 45 | 42 | 44 | 44 | 30 | 30 | 33 | 50 |
| 56 | 82 | 44 | 45 | 42 | 44 | 45 | 30 | 36 | 33 | 50 |
| 70 | 94 | 44 | 45 | 42 | 44 | 45 | 36 | 44 | 40 | 50 |
| 84 | 100 | 45 | 45 | 45 | 45 | 46 | 42 | 45 | 41 | 50 |
| 94 | 100 | 45 | 45 | 46 | 46 | 46 | 45 | 45 | 41 | 50 |

hours by answer (11276 character-hours): supply:consumables:greater_health_potion 2781 (25%); filler 1255 (11%); objective 909 (8%); supply:consumables:health_potion 879 (8%); level:weaponcrafting 765 (7%); level:mining 647 (6%); supply:consumables:minor_health_potion 613 (5%); supply:consumables:small_health_potion 585 (5%); level:combat 513 (5%); level:gearcrafting 490 (4%); level:woodcutting 463 (4%); offering 303 (3%); the rest 1072
by kind: gather 6390, offering 303, make 2508, event 197, fight 1320, task 558
drunk and eaten: small_health_potion 60178, minor_health_potion 59713, greater_health_potion 51390, cooked_trout 8043, earth_boost_potion 7514, health_boost_potion 7015; in all 219700
kills: chicken 372287, yellow_slime 50670, cow 34878, imp 31346, death_knight 11801, red_slime 10713, rat 8918, green_slime 6788; in all 550047 in 2157 kill steps
completions: the_new_bandit 11-23 (+2), arachnophobia_conquered 11-24 (+2), intermediate_alchemist 11-24 (+1), expert_miner 11-25 (+1), worker 11-25 (+1), intermediate_fisherman 11-27 (+1), expert_lumberjack 11-28 (+1), cabinet_maker 11-28 (+1), the_reaper 11-28 (+3), ecologist 11-28 (+1), cult_destroyer 12-04 (+2), cultist_purifier 12-08 (+4), expert_alchemist 12-08 (+1), expert_fisherman 12-08 (+1), cursed_wood_blessed_victory 12-13 (+1), loktar_ogar 12-13 (+1), professional_lumberjack 12-16 (+1), professional_fisherman 12-20 (+1), magic_lumberjack 12-24 (+2), catch_and_cook 12-30 (+2), its_malefic 01-01 (+4), closing_the_gate 01-04 (+4), a_favored_champion 01-05 (+4), magic_harvester 01-10 (+3), master_alchemist 01-10 (+2), professional_miner 01-12 (+1), diamond_in_the_sky 01-13 (+3), master_fisherman 01-14 (+2), palm_paradise 01-21 (+2), master_lumberjack 01-21 (+2), strange_miner 01-23 (+2), master_miner 01-26 (+2), adamantite_mastery 01-27 (+1), shining_secrets 01-27 (+3), pearl_fisher 01-31 (+1), king_of_the_goblins 02-03 (+3), making_a_nether_portal 02-12 (+2)
open at the deadline: another layer 45 (around_the_world, blood_of_the_cursed, clean_the_lab, coin_collector, elementary_book, heartbound, magic_power, potion_brewer, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, the_worm_turns); a group 14 (crafted_with_honor, lich_please, life_lover, slimed_to_none, take_her_down); an event 11 (corruption_eradicator, draconic_harvest, welcome_to_hell); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); filler not reached 9 (tasks_coins_fan, the_planet_thanks_you); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); potions (a safe win once they are made) 4 (a_peaceful_island); unhandled 4 (ultimate_rune); gear (no safe win within ten levels) 3 (grand_master); does not fit 2 (turning_treasures_to_gold)

### B-B — {"home":1,"potionK":0}
points at the start 29, at the end 121; 6385 steps, 668.1 s, 31848 solves, peak 868 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 53 | 24 | 37 | 42 | 26 | 42 | 30 | 29 | 27 | 34 |
| 14 | 60 | 24 | 47 | 50 | 37 | 50 | 30 | 29 | 32 | 46 |
| 21 | 73 | 24 | 48 | 50 | 39 | 50 | 30 | 40 | 40 | 46 |
| 28 | 89 | 24 | 50 | 50 | 40 | 50 | 30 | 40 | 40 | 50 |
| 42 | 104 | 25 | 50 | 50 | 42 | 50 | 37 | 40 | 41 | 50 |
| 56 | 116 | 26 | 50 | 50 | 43 | 50 | 43 | 40 | 41 | 50 |
| 70 | 119 | 26 | 50 | 50 | 43 | 50 | 45 | 40 | 41 | 50 |
| 84 | 121 | 26 | 50 | 50 | 43 | 50 | 45 | 40 | 41 | 50 |
| 94 | 121 | 26 | 50 | 50 | 43 | 50 | 45 | 40 | 41 | 50 |

hours by answer (11276 character-hours): fallback 5044 (45%); filler 1807 (16%); objective 1180 (10%); level:weaponcrafting 765 (7%); level:woodcutting 621 (6%); offering 301 (3%); event 287 (3%); level:combat 286 (3%); level:mining 229 (2%); level:gearcrafting 190 (2%); level:fishing 172 (2%); level:alchemy 161 (1%); the rest 234
by kind: gather 7042, offering 301, fight 599, event 287, make 1884, task 1164
free (what the kill steps' sets drink): greater_health_potion 192370, enhanced_health_potion 186279, minor_health_potion 78683, health_potion 71498, small_health_potion 18399, enhanced_boost_potion 2601; in all 558352
kills: imp 31293, baby_red_dragon 5000, hellhound 4810, chicken 3669, corrupted_ogre 3176, cursed_tree 3053, corrupted_owlbear 2595, orc 2312; in all 70930 in 411 kill steps
completions: arachnophobia_conquered 11-22 (+2), expert_miner 11-22 (+1), the_reaper 11-23 (+3), the_new_bandit 11-23 (+2), worker 11-23 (+1), intermediate_alchemist 11-24 (+1), intermediate_fisherman 11-24 (+1), cultist_purifier 11-25 (+4), expert_lumberjack 11-25 (+1), cabinet_maker 11-25 (+1), ecologist 11-26 (+1), cult_destroyer 11-27 (+2), king_of_the_goblins 11-27 (+3), loktar_ogar 11-27 (+1), cursed_wood_blessed_victory 11-29 (+1), grand_master 12-01 (+3), expert_fisherman 12-02 (+1), professional_lumberjack 12-05 (+1), expert_alchemist 12-05 (+1), professional_fisherman 12-06 (+1), professional_miner 12-06 (+1), diamond_in_the_sky 12-06 (+3), catch_and_cook 12-11 (+2), master_miner 12-12 (+2), closing_the_gate 12-12 (+4), shining_secrets 12-13 (+3), adamantite_mastery 12-13 (+1), master_fisherman 12-14 (+2), a_peaceful_island 12-14 (+4), its_malefic 12-16 (+4), potion_brewer 12-16 (+2), palm_paradise 12-20 (+2), master_lumberjack 12-20 (+2), master_alchemist 12-21 (+2), magic_lumberjack 12-22 (+2), strange_miner 12-26 (+2), tasks_coins_fan 01-02 (+5), a_favored_champion 01-06 (+4), corruption_eradicator 01-06 (+4), magic_harvester 01-06 (+3), pearl_fisher 01-14 (+1), welcome_to_hell 01-21 (+3), making_a_nether_portal 02-04 (+2)
open at the deadline: a group 30 (coin_collector, crafted_with_honor, lich_please, life_lover, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, slimed_to_none, take_her_down); another layer 27 (around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, heartbound, magic_power, secure_the_island, the_worm_turns); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 4 (draconic_harvest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-BS30 — {"home":1,"potionK":0,"spine":30}
points at the start 29, at the end 121; 6353 steps, 1045.2 s, 52969 solves, peak 1043 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 52 | 33 | 38 | 46 | 31 | 46 | 25 | 25 | 27 | 34 |
| 14 | 60 | 34 | 45 | 50 | 37 | 50 | 25 | 29 | 30 | 46 |
| 21 | 65 | 36 | 46 | 50 | 39 | 50 | 25 | 39 | 40 | 47 |
| 28 | 85 | 38 | 47 | 50 | 41 | 50 | 25 | 40 | 40 | 50 |
| 42 | 103 | 39 | 48 | 50 | 41 | 50 | 37 | 40 | 41 | 50 |
| 56 | 115 | 39 | 48 | 50 | 41 | 50 | 43 | 40 | 41 | 50 |
| 70 | 119 | 39 | 48 | 50 | 41 | 50 | 45 | 40 | 41 | 50 |
| 84 | 121 | 39 | 48 | 50 | 41 | 50 | 45 | 40 | 41 | 50 |
| 94 | 121 | 39 | 48 | 50 | 41 | 50 | 45 | 40 | 41 | 50 |

hours by answer (11277 character-hours): fallback 4645 (41%); filler 1755 (16%); objective 1288 (11%); level:weaponcrafting 765 (7%); level:woodcutting 589 (5%); level:mining 436 (4%); event 353 (3%); level:combat 336 (3%); offering 295 (3%); level:fishing 228 (2%); level:gearcrafting 190 (2%); level:jewelrycrafting 145 (1%); the rest 250
by kind: gather 6964, make 1830, offering 295, fight 671, event 353, task 1164
free (what the kill steps' sets drink): greater_health_potion 179490, enhanced_health_potion 176968, minor_health_potion 84641, health_potion 70763, enhanced_boost_potion 33061, small_health_potion 32567; in all 614751
kills: imp 31276, hellhound 6901, baby_red_dragon 5000, corrupted_ogre 3962, corrupted_owlbear 3712, chicken 3645, death_knight 2632, cursed_tree 2600; in all 74989 in 438 kill steps
completions: arachnophobia_conquered 11-22 (+2), the_new_bandit 11-23 (+2), the_reaper 11-23 (+3), cultist_purifier 11-23 (+4), king_of_the_goblins 11-24 (+3), worker 11-24 (+1), cult_destroyer 11-24 (+2), expert_miner 11-25 (+1), loktar_ogar 11-25 (+1), cabinet_maker 11-25 (+1), intermediate_alchemist 11-25 (+1), expert_lumberjack 11-26 (+1), intermediate_fisherman 11-27 (+1), grand_master 11-30 (+3), cursed_wood_blessed_victory 11-30 (+1), expert_alchemist 12-04 (+1), professional_lumberjack 12-04 (+1), ecologist 12-05 (+1), expert_fisherman 12-05 (+1), professional_miner 12-07 (+1), diamond_in_the_sky 12-07 (+3), professional_fisherman 12-11 (+1), closing_the_gate 12-13 (+4), a_peaceful_island 12-14 (+4), its_malefic 12-16 (+4), potion_brewer 12-17 (+2), catch_and_cook 12-17 (+2), palm_paradise 12-19 (+2), master_lumberjack 12-19 (+2), master_alchemist 12-21 (+2), master_fisherman 12-22 (+2), master_miner 12-24 (+2), shining_secrets 12-26 (+3), adamantite_mastery 12-26 (+1), corruption_eradicator 12-26 (+4), magic_lumberjack 12-28 (+2), strange_miner 12-29 (+2), a_favored_champion 01-06 (+4), tasks_coins_fan 01-07 (+5), magic_harvester 01-16 (+3), pearl_fisher 01-19 (+1), welcome_to_hell 01-22 (+3), making_a_nether_portal 02-02 (+2)
open at the deadline: a group 30 (coin_collector, crafted_with_honor, lich_please, life_lover, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, slimed_to_none, take_her_down); another layer 27 (around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, heartbound, magic_power, secure_the_island, the_worm_turns); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 4 (draconic_harvest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)

### B-BD1D2 — {"home":1,"potionK":0,"gates":1,"fleetGear":1}
points at the start 29, at the end 121; 6212 steps, 514 s, 23759 solves, peak 799 MB
| day | points | First combat | Second combat | Third combat | Fourth combat | Fifth combat | Second wc | Third gc | Fourth jc | Third alch |
|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 52 | 24 | 41 | 46 | 27 | 43 | 26 | 25 | 26 | 34 |
| 14 | 59 | 24 | 46 | 50 | 37 | 48 | 26 | 25 | 26 | 46 |
| 21 | 68 | 24 | 47 | 50 | 39 | 49 | 26 | 25 | 26 | 46 |
| 28 | 93 | 24 | 48 | 50 | 40 | 50 | 34 | 33 | 36 | 50 |
| 42 | 99 | 25 | 49 | 50 | 42 | 50 | 40 | 36 | 41 | 50 |
| 56 | 119 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |
| 70 | 119 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |
| 84 | 121 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |
| 94 | 121 | 26 | 50 | 50 | 42 | 50 | 45 | 36 | 41 | 50 |

hours by answer (11278 character-hours): fallback 5006 (44%); filler 1956 (17%); objective 1066 (9%); level:weaponcrafting 765 (7%); level:woodcutting 578 (5%); level:mining 372 (3%); event 310 (3%); offering 302 (3%); level:combat 280 (2%); level:fishing 228 (2%); level:alchemy 164 (1%); level:jewelrycrafting 88 (1%); the rest 163
by kind: gather 7296, offering 302, fight 648, event 310, make 1557, task 1164
free (what the kill steps' sets drink): greater_health_potion 235223, enhanced_health_potion 226067, minor_health_potion 79701, health_potion 69468, small_health_potion 22847, enhanced_antidote 2433; in all 643261
kills: imp 31277, baby_red_dragon 5000, hellhound 4057, chicken 3669, corrupted_ogre 3073, death_knight 2947, cursed_tree 2534, corrupted_owlbear 2162; in all 69115 in 390 kill steps
completions: arachnophobia_conquered 11-22 (+2), expert_miner 11-22 (+1), the_reaper 11-23 (+3), the_new_bandit 11-23 (+2), worker 11-23 (+1), intermediate_alchemist 11-24 (+1), intermediate_fisherman 11-24 (+1), cultist_purifier 11-25 (+4), expert_lumberjack 11-25 (+1), cabinet_maker 11-25 (+1), cult_destroyer 11-26 (+2), king_of_the_goblins 11-26 (+3), loktar_ogar 11-26 (+1), grand_master 11-30 (+3), cursed_wood_blessed_victory 11-30 (+1), expert_fisherman 12-03 (+1), expert_alchemist 12-05 (+1), professional_lumberjack 12-05 (+1), professional_miner 12-06 (+1), diamond_in_the_sky 12-06 (+3), professional_fisherman 12-09 (+1), master_lumberjack 12-12 (+2), palm_paradise 12-12 (+2), ecologist 12-13 (+1), closing_the_gate 12-13 (+4), master_miner 12-13 (+2), catch_and_cook 12-15 (+2), potion_brewer 12-16 (+2), master_fisherman 12-17 (+2), its_malefic 12-18 (+4), shining_secrets 12-18 (+3), adamantite_mastery 12-18 (+1), a_peaceful_island 12-19 (+4), master_alchemist 12-23 (+2), magic_lumberjack 12-27 (+2), strange_miner 12-28 (+2), tasks_coins_fan 01-04 (+5), a_favored_champion 01-05 (+4), corruption_eradicator 01-07 (+4), magic_harvester 01-15 (+3), welcome_to_hell 01-15 (+3), pearl_fisher 01-15 (+1), making_a_nether_portal 01-31 (+2)
open at the deadline: a group 30 (coin_collector, crafted_with_honor, lich_please, life_lover, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, slimed_to_none, take_her_down); another layer 27 (around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, heartbound, magic_power, secure_the_island, the_worm_turns); use 10 (art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef); a raid 8 (king_of_the_sun, queen_of_the_enchanted_forest); an event 4 (draconic_harvest); filler not reached 4 (the_planet_thanks_you); unhandled 4 (ultimate_rune); does not fit 2 (turning_treasures_to_gold)
## What stays open
For the best policy's run, **S30** (`runs/B-S30.jsonl`, the `stats` line's `endWaiting` = `forward.ts waitingOf` of the last
World with `now` at the deadline; 103 points, 37 completions). Its fighters stand at combat 41 on day 42 (01-02) and 44–46
from day 70 (01-30); Second weaponcrafting 38, Third gearcrafting 40 and alchemy 50, Fourth jewelrycrafting 40 at the end.

| waits for | points | achievements | what would open it, and when the fleet meets its other gates in this run |
|---|---|---|---|
| another layer | 45 | around_the_world 5, secrets_in_the_sand 5, coin_collector 4, elementary_book 4, sandwhispers_hidden_treasure 4, blood_of_the_cursed 3, clean_the_lab 3, heartbound 3, magic_power 3, sands_of_power 3, secure_the_island 3, the_worm_turns 3, potion_brewer 2 | a transition the plan may not open (`reach.ts mayOf`: a key, a carried item or an achievement it cannot get, or a place no free or paid route reaches); the combat is there from day 70 (44–46), so the gate is the layer, not the level |
| a group | 14 | life_lover 4, crafted_with_honor 3, slimed_to_none 3, lich_please 2, take_her_down 2 | boss fights of three (`targets.ts` gate `group`); the planner does not plan group fights (stage 4); the leaders killed bosses 5–20 levels below the map's gates (section 1), so with group fights as code the fleet's combat 41 from day 42 would likely do |
| an event | 11 | corruption_eradicator 4, draconic_harvest 4, welcome_to_hell 3 | calendars that do not fit with the members that can go (`events.ts calendar`); free consumables (`B`) take corruption_eradicator and welcome_to_hell (01-06, 01-21) |
| `use` | 10 | eat_the_forbidden_fruit 3, gourmet_chef 3, art_of_teleportation 2, carnivore 2 | the `use` objectives the planner does not handle (decision 55: "the points the code cannot take yet") — work, not a level |
| a raid | 8 | king_of_the_sun 5, queen_of_the_enchanted_forest 3 | raids (out this season, decision 11) |
| filler not reached | 6 | the_planet_thanks_you 4, making_a_nether_portal 2 | hours (filler is last) |
| potions | 4 | a_peaceful_island 4 | the island's monsters win safely once potions are made; behind the toll too |
| unhandled | 4 | ultimate_rune 4 | `targets.ts unhandledOf` |
| gear | 3 | grand_master 3 | no safe win within ten levels for one of its monsters |
| does not fit | 2 | turning_treasures_to_gold 2 | hours |

**The consumables' bill of the season in gold** (`<s>/tools/bill.mjs`: each potion and food the run drank and ate — `drinksOf`
per applied step — opened into its recipe's gathered ingredients and priced at the market: section 1's seven-day medians from
`/grandexchange/history` — algae 2, nettle 10, sunflower 8 — and `npm run market`'s book of 11-21/22 — sap 3, red slimeball 50,
cooked trout 70; the bid where nobody asks — egg 7, the other slimeballs 8; a code with no market is listed, not priced):

| run | drunk and eaten (the largest) | ingredients priced | gold | no market seen | the model's bank gold, start → end |
|---|---|---|---|---|---|
| P0s | minor 46,177; small 41,306; greater 38,882; health boost 8,676; cooked bass 7,611; health 7,426; … ≈ 170,000 units | nettle 62,806; sunflower 65,856; egg 24,750; algae 46,427; cooked trout 1,410; slimeballs 6,900 | **1,630,877** | glowstem 40,867; ash, spruce, dead wood 40,255 each; maple wood 53,449; bass 7,611; milk 4,951; … | 168,196 → 920,994 |
| S30 | greater 46,468; minor 39,462; small 38,211; health 13,646; cooked trout 7,100; apple pie 4,136; … ≈ 165,000 | nettle 56,095; cooked trout 7,100 (497,000 gold); sunflower 60,110; egg 32,667; algae 45,758 | **1,911,436** | glowstem 47,538; woods 41,150 each; maple wood 16,325; … | 168,196 → 773,682 |
| C35 | minor 56,674; health 38,482; greater 30,255; small 21,212; … | nettle 97,042; sunflower 35,018; egg 34,989; algae 46,665 | **1,691,828** | woods 98,754 each; glowstem 31,278; … | 168,196 → 711,903 |
| B (free; what its kill steps' sets drink, `freeUse`) | greater 192,370; enhanced 186,279; minor 78,683; health 71,498; small 18,399; … ≈ 556,000 | egg 225,073; nettle 150,487; algae 136,721; sunflower 28,793 | **3,609,819** | magic wood 1,444,050; glowstem 382,180; woods 180,274 each; enchanted mushroom 94,440; … | 168,196 → 359,605 |

Against the bank's 169,966 gold (logs/status.json) the bill is ten times out of reach, and the market could not deliver it
anyway: the season's S30 asks about 600 nettle and 650 sunflower a day where the market sold about 1,180 and 57 a day
(section 1), and the potions themselves are not on sale (0 Minor and 0 Health Potions sold in seven days, 127 Small). The
model's gold grows (kills earn their monster's mean gold, `forward.ts:149`; nothing is bought in the model), so it cannot say
what spending would leave.

**Row B's gain and what a point bought that way costs**: B ends at 121 on P0s, S30 and D1+D2 alike — 21 above P0s, 18 above S30.
Its kill steps' sets drink about 556,000 potions over the season: at least 3.6 million gold of priced ingredients plus about
1.4 million magic wood and 380,000 glowstem with no market seen — **over 170,000 gold a point**, for potions nobody sells. `B`
is a bound, not a purchase. The purchases the market does offer were played as my own policies: **I** (37,000 algae,
≈ 74,000 gold) and **R** (five healing runes, 50,000 gold) — section 4.

**Gems** (what is known, no number guessed): a non-member gets a Small Bag of Gems at 50, 100, 150 and 200 points
(`public/data/manifest.json` season rewards; 105 and 158 are badges, no gems); a Small Bag adds 25 gems, a Bag of Gems 50 and is
members-only at 25, 75, 125 and 175 (`public/data/items.json` effect `gems`). So at 50 points 25 gems, at 100 another 25. Gems
spawn an event (`POST /gems_shop/spawn_event`, `docs/api/openapi.json`); the price of a spawn is in the gems shop catalog
(`GET /gems_shop/`), which is not one of this task's allowed reads, so whether 25 or 50 gems buy one spawn is not known here;
every event's `cooldown` is 120 (`public/data/events.json`; `config.ts` reads it as the wait before a spawn may be bought). The
bags are `tradeable` (items.json). What one spawn is worth: the apparition achievements need 12–19 spawns each (the planner's
why of 11-22 in `logs/status.json`: magic_lumberjack 12, magic_harvester 19), so one or two bought spawns would not close one alone.
## The recommendation
**Build `P0s` in 023 — the stranding repair with the executor's repairs — and no first-tier policy.** On the fixed World every
policy that only reorders the same work moves the deadline by −8 to +3 points: S30's +3 is the tasks filler, C30's and C35's
+1 stands on crafting levels the model prices at a sixth to an eighth of what a level cost this fleet from scratch (section 2),
and every deeper or combined policy (S35, S40, CS, D1+D2, F3, R, I) ends below P0s. P0s is the cheapest change (`P0s.patch`,
6 lines), it is worth +8 points on day 42 (73 against 65) and +2 at the deadline, and it removes a model fault that stranded four
characters on the island. If Alex wants points sooner rather than the same points later, **S25** is the alternative (78 on day
42, 88 on day 56, 98 at the deadline); if he wants the leaders' shape — every fighter at 41 by day 42 — **S30** (66 on day 42,
103 at the deadline).

**What it expects**: **100 at the deadline by the model** (98 → 100), 37 completions; the fleet at combat 44–45 by day 84; the
crafters at 37 / 42 / 41. **How far that is believed**: about **51** of the 100 rest on what play has shown (29 now, 20 of
gathering, crafting and tasks, 2 of fights the plan's potions held); 19 hang on events whose trips drank 2.68 times their plan,
16 on the island behind the boat, 14 on monsters never fought (section 4).

**Silver**: not passed in any run — P0s is **58 short**, the best real policy (S30) 55, free consumables (B) 37. Bronze only
with free consumables, on day 45–46 (2027-01-05/06). What the 58 hang on (P0s at the deadline, `waitingOf`): **another layer
45** (13 achievements behind transitions the plan cannot open: keys, carried items, achievements, the island's deeper places),
**an event 14**, **a group 11** (boss fights, not planned), **`use` 10**, **a raid 8**, filler 9, gear 7, unhandled 4. Silver
is a question of what the code can do, not of what it does first: the order moves 3 points, the potion economy 21, the
capabilities about 80.

**What 023 has to build beyond lifting the patch** — the executor's faults that bite P0s first, in order (section 2's costs on
11-22):
1. **A drained stack does not re-solve** (`exec.ts:246-254`): every day's combat offerings refuse after the stack runs dry — 4.18
   character-hours on 11-22 and the day's combat favors; it bites every day.
2. **An event member's `take` without the potion its set needs** (`queue.ts` trip, the pool's bag stock): 19 of P0s's 100 points
   are event work; the trips of 11-22 drank 2.68 times their plan and fought 92 of about 370 planned kills. With it, the trip's
   `take` should be what its set drinks in play (the overdrink is not a fault but costs 3.46 h a day).
3. **A train loop's drop hunt adopts a brew set and never brews** (`queue.ts:694-698`): every crafting level with a drop hunt —
   P0s trains the three crafters to 37 / 42 / 41 — risks the same 6-hour blocks as Third's two of 11-22.
4. **`eventMembers` books one piece twice** (no cost measured; it can send two members with one mask).

**What would change the recommendation**:
- **Group boss fights as code**: the leaders kill bosses 5–20 levels below the map's gates (section 1), so S30's and S25's
  combat 41 by day 42 would turn into the 11–14 group points the model cannot see — then S30 (or S25) over P0s.
- **The potions a 40+ fight drinks measured in play**: the model drinks about 170,000 potions a season and makes them with 57% of
  all hours; the leaders drink none (a rune and fish). If the forecast overdrinks on those sets, R (the rune) and the spine are
  worth re-running on a corrected forecast before anything else.
- **A crafting level from bank stock at 0.31–0.58 of the model** held over a whole road (section 2 has one level) — then C30 is
  believed and pays a little; at the measured cost from scratch it does not.
- **Potions on the market** in volume: B is +21 — it is the one lever this experiment found that is larger than the order.
## What was done / files
**Files** — only these change in the repository: `tasks/022-strategy.md` (the task file, as it came), this report, and
`docs/strategy/022/`: `snapshot/` (the 42 raw reads), `policies/` (11 patches), `runs/` (35 `.jsonl` and `measure.txt`), `tools/` (the
scripts that made the tables, README), `requests.log`, `sec3.json`. `docs/rework.md` was committed first, as it was, on its own
(`Rework notes`, `1680dda`). Nothing under `src/`, `scripts/`, `public/`, `logs/`, `docs/design/`, `docs/audit/` changed; nothing opened `.ammo/*`,
`game.db` or `.env`; no service was started, stopped, restarted or called. Scratch: `D:\Temp\a022` (`<s>`), deleted at the end.

**Every request to the game** (all `GET` on public paths of `docs/api/openapi.json`, no token, no `Authorization` header, at least
1.2 s apart, by `<s>/tools/get.mjs`; path, status, bytes, time — `docs/strategy/022/requests.log`): 42 requests, every one 200.

- `/leaderboard/accounts?sort=achievements_points&page=1&size=100` 200 (11018 bytes, 2026-11-22T19:23:28.135Z)
- `/leaderboard/accounts?sort=achievements_points&page=2&size=100` 200 (10711 bytes, 2026-11-22T19:23:29.339Z)
- `/accounts/uaprsf/characters` 200 (13002 bytes, 2026-11-22T19:23:46.521Z)
- `/accounts/uaprsf/achievements?completed=true&size=100` 200 (17174 bytes, 2026-11-22T19:23:47.730Z)
- `/accounts/Fox___/characters` 200 (13615 bytes, 2026-11-22T19:23:48.933Z)
- `/accounts/Fox___/achievements?completed=true&size=100` 200 (15698 bytes, 2026-11-22T19:23:50.140Z)
- `/accounts/hunter2/characters` 200 (12930 bytes, 2026-11-22T19:23:51.342Z)
- `/accounts/hunter2/achievements?completed=true&size=100` 200 (14683 bytes, 2026-11-22T19:23:52.548Z)
- `/accounts/Pischke/characters` 200 (13802 bytes, 2026-11-22T19:23:53.754Z)
- `/accounts/Pischke/achievements?completed=true&size=100` 200 (15706 bytes, 2026-11-22T19:23:54.957Z)
- `/accounts/Big_Shark/characters` 200 (13630 bytes, 2026-11-22T19:23:56.164Z)
- `/accounts/Big_Shark/achievements?completed=true&size=100` 200 (13452 bytes, 2026-11-22T19:23:57.371Z)
- `/accounts/Wudagem/characters` 200 (14205 bytes, 2026-11-22T19:23:58.577Z)
- `/accounts/Wudagem/achievements?completed=true&size=100` 200 (13758 bytes, 2026-11-22T19:23:59.783Z)
- `/accounts/krolov/characters` 200 (13374 bytes, 2026-11-22T19:24:00.990Z)
- `/accounts/krolov/achievements?completed=true&size=100` 200 (13956 bytes, 2026-11-22T19:24:02.202Z)
- `/accounts/Elemental/characters` 200 (12481 bytes, 2026-11-22T19:24:03.405Z)
- `/accounts/Elemental/achievements?completed=true&size=100` 200 (13254 bytes, 2026-11-22T19:24:04.608Z)
- `/accounts/Turbofish/characters` 200 (14362 bytes, 2026-11-22T19:24:05.827Z)
- `/accounts/Turbofish/achievements?completed=true&size=100` 200 (13240 bytes, 2026-11-22T19:24:07.028Z)
- `/accounts/TheCarriedOne/characters` 200 (14564 bytes, 2026-11-22T19:24:08.239Z)
- `/accounts/TheCarriedOne/achievements?completed=true&size=100` 200 (13493 bytes, 2026-11-22T19:24:09.442Z)
- `/accounts/automode/characters` 200 (14853 bytes, 2026-11-22T19:24:10.644Z)
- `/accounts/automode/achievements?completed=true&size=100` 200 (13132 bytes, 2026-11-22T19:24:11.849Z)
- `/accounts/shuxart/characters` 200 (14593 bytes, 2026-11-22T19:24:13.056Z)
- `/accounts/shuxart/achievements?completed=true&size=100` 200 (8199 bytes, 2026-11-22T19:24:14.266Z)
- `/accounts/FRALEXAlexander/characters` 200 (12154 bytes, 2026-11-22T19:24:15.472Z)
- `/accounts/FRALEXAlexander/achievements?completed=true&size=100` 200 (8820 bytes, 2026-11-22T19:24:16.678Z)
- `/accounts/chewbaccoin/characters` 200 (14504 bytes, 2026-11-22T19:24:17.880Z)
- `/accounts/chewbaccoin/achievements?completed=true&size=100` 200 (9112 bytes, 2026-11-22T19:24:19.093Z)
- `/accounts/Odiodin/characters` 200 (14669 bytes, 2026-11-22T19:24:20.294Z)
- `/accounts/Odiodin/achievements?completed=true&size=100` 200 (8732 bytes, 2026-11-22T19:24:21.504Z)
- `/accounts/Zetark/characters` 200 (12203 bytes, 2026-11-22T19:24:22.718Z)
- `/accounts/Zetark/achievements?completed=true&size=100` 200 (8057 bytes, 2026-11-22T19:24:23.920Z)
- `/accounts/alverus/characters` 200 (14205 bytes, 2026-11-22T19:24:25.128Z)
- `/accounts/alverus/achievements?completed=true&size=100` 200 (8457 bytes, 2026-11-22T19:24:26.338Z)
- `/grandexchange/history/minor_health_potion?size=100` 200 (51 bytes, 2026-11-22T19:24:27.541Z)
- `/grandexchange/history/small_health_potion?size=100` 200 (3423 bytes, 2026-11-22T19:24:28.746Z)
- `/grandexchange/history/health_potion?size=100` 200 (51 bytes, 2026-11-22T19:24:29.958Z)
- `/grandexchange/history/algae?size=100` 200 (15490 bytes, 2026-11-22T19:24:31.158Z)
- `/grandexchange/history/nettle_leaf?size=100` 200 (15984 bytes, 2026-11-22T19:24:32.366Z)
- `/grandexchange/history/sunflower?size=100` 200 (6181 bytes, 2026-11-22T19:24:33.570Z)

**Every command — mine**
- PowerShell: `git status --short; git log --oneline -3; git branch --show-current; Get-CimInstance Win32_Processor | Select NumberOfCores,NumberOfLogicalProcessors; (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory; Get-Content logs/status.json -Raw` (16 cores / 32 threads, 63.9 GB; run 0e2f)
- PowerShell: `git diff --stat; git add docs/rework.md; git commit -m "Rework notes" -m "Co-Authored-By: …"; git log --oneline -2` → 1680dda
- PowerShell: `Get-ChildItem src/plan/planner/*.ts` (line counts), `Get-ChildItem logs/world, logs/journal`, `Get-Content scripts/outlook.mts | Measure-Object -Line`
- bash: `mkdir -p <s>/w <s>/out <s>/runs; git archive HEAD src scripts public/data package.json tsconfig.json | tar -x -C <s>; cp logs/world/2026-11-22.json <s>/w/; sha256sum logs/world/2026-11-22.json <s>/w/2026-11-22.json`
- bash (scratch only): `mv src scripts public package.json tsconfig.json <s>/repo/; git init; git add -A; git commit -m base` (the scratch repo, a45e6cf); `cat scripts/outlook.mts`
- bash: wrote `<s>/mk.sh` (a frozen copy of the scratch repo: `git -C <s>/repo archive <ref> | tar -x -C <s>/t/<name>`, `node_modules` as a junction) and `<s>/measure.mjs` (prints wall seconds and peak RSS at exit); `mk.sh P0 HEAD` (its `cmd //c mklink /J` failed: "The system cannot find the path specified")
- PowerShell: `New-Item -ItemType Junction -Path <s>/t/P0/node_modules -Target G:\alex\projects\artifactsmmo\node_modules; Test-Path …\tsx`
- bash: `sed -i` on mk.sh; in `<s>/t/P0`: `nohup node --max-old-space-size=2048 --import tsx --import file:///<s>/measure.mjs scripts/outlook.mts --world <w> --json > <s>/runs/P0.jsonl 2> <s>/runs/P0.err &` (19:20 UTC — the harness, the untouched tree)
- bash: `date -u`; `mk.sh ztest HEAD; ls …/node_modules; od -c <s>/mk.sh; rm -rf <s>/t/ztest` (a test copy; its junction failed again); `ls node_modules | wc -l` and `ls …/tsx/package.json …` (the project's node_modules intact, 59 entries); `sed -i` on mk.sh (junction through PowerShell with forward slashes); `mk.sh ztest HEAD; ls; rm -rf <s>/t/ztest`
- PowerShell: `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` (the service, its supervisor, my runs; several times during the work)
- bash: wrote `<s>/tools/drive.mts` (road() of the tree line for line, plus a stats line) and `<s>/tools/cmp.mjs`; in `<s>/t/P0`: `node --import tsx scripts/outlook.mts --world <w> --days 2 --json` and `node --max-old-space-size=2048 --import tsx <s>/tools/drive.mts --tree <s>/t/P0 --world <w> --days 2 --dec …` → `cmp.mjs`: 5 vs 5 lines, equal
- bash: wrote `<s>/run.sh` (one driver run in the background: `node --max-old-space-size=2048 --import tsx --import file:///<s>/measure.mjs <s>/tools/drive.mts --tree <s>/t/<tree> --world <w> [--days N] --cfg '<json>' --dec <s>/dec/<name>.dec > <s>/runs/<name>.jsonl`); `run.sh P0d P0` (19:22:51)
- bash: `node -e` over `docs/api/openapi.json` (the public paths' parameters and security; `AccountLeaderboardType`; the schemas); `ls docs/design/snapshot/; head -c … leaderboard-accounts.json, leader-achievements.json, account.json`; `node -e` over `public/data/manifest.json` (season start 2026-10-24)
- bash: wrote `<s>/tools/get.mjs` (the public reads: no token, no Authorization header, ≥ 1.2 s apart, the body saved as it came, a 120 cap); `node <s>/tools/get.mjs <s>/out/list1.txt` (2 requests); `node -e` summary of the two leaderboard pages; `node <s>/tools/get.mjs <s>/out/list2.txt` in the background (40 requests)
- reads of the planner's source in the scratch repo: `sed -n`, `grep -n` (read-only)
- scratch repo edits (`python` with `<s>/tools/ed.py`, LF kept): first attempt wrote CRLF (`git reset --hard a45e6cf` in the scratch repo); `npx tsc --noEmit -p tsconfig.json` in the scratch repo before it had node_modules — npx fetched and ran the unrelated npm package `tsc@2.0.4` (it only prints a notice; it lands in npm's npx cache); then a node_modules junction in the scratch repo (`.git/info/exclude`) and `node_modules/.bin/tsc --noEmit -p tsconfig.json` after every change; scratch git: `commit`, `branch -f home`, `checkout -b tiers|d1|d2|f3|all`, `merge` (types.ts and gear.ts conflicts resolved by `node -e` / `python`)
- `mk.sh home home; run.sh P0s home - '{"home":1}'` (19:27:29); `mk.sh tiers tiers` and three 2-day smoke runs (`{}`, S30, C30) of drive.mts; `cmp.mjs` (keys off = P0, 5 lines equal); `node -e` summaries of their decisions
- `mk.sh all all`; stage A: `run.sh A-S30|A-S35|A-S40|A-C30|A-C35|A-D1|A-D1D2|A-B|A-off all 42 '<cfg>'` (19:33:33)
- bash: `<s>/tools/watch.sh` in the background (every 60 s: logs/status.json's time, run, outlook; my processes' count and memory → `<s>/out/watch.log`)
- `npm run --silent journal -- --from 2026-11-21T11:43:00Z --to 2026-11-22T17:25:00Z > <s>/out/journal-chat.md` (read-only); `node -e` survey of the record kinds in logs/journal/2026-11-21.jsonl and 2026-11-22.jsonl
- `ls -la logs/dev.log; du -sh logs/raw; grep` over logs/dev.log and logs/raw/*/*.log for the monsters fought (`fight <Name>`, per name counts)
- two background agents (sections 1 and 2; their commands are in `<s>/out/sec1-cmds.md`, `<s>/out/sec2-cmds.md`)
- `<s>/tools/tab.mjs` (the tables), `<s>/tools/sched.sh` in the background (a queue of runs, at most 12 of mine alive), `<s>/tools/believe.mts` (settled point 7), `<s>/tools/sec3.mts` (section 3; four runs as it was fixed), `<s>/tools/sec3tab.mjs`
- Monitor: a background until-loop over `<s>/runs/*.jsonl`, `<s>/out/sched.log`, `<s>/out/watch.log`
- section 3: `python <s>/tools/sec3fix.py`, `sec3fix2.py` and two `python -c` edits of `<s>/tools/sec3.mts`; in `<s>/t/home`: `node --max-old-space-size=2048 --import tsx <s>/tools/sec3.mts --tree <s>/t/home --world <w> --out <s>/out/sec3.json` (six runs in all as it was fixed: a trade paid in a material is not special; potions at the chain's price; the stock left out; the special roads; the bill's reasons); `node <s>/tools/sec3tab.mjs > <s>/out/sec3tab.md`; `sed -i` on sec3tab.mjs
- the driver: `python` edit adding `freeUse` (what a consumables-free run's kill steps drink, read from the decision's own cached solve) — the runs started after 19:43 carry it
- `<s>/tools/runecheck.mts` in `<s>/t/all2` (`node --import tsx`): the solver and a healing rune
- scratch repo: branch `runes` (keys `runes`, then `buy`), `merge` into `all` (types.ts conflicts resolved by `node -e`), `tsc --noEmit`; branch `f3tiers` (tiers + f3) for the F3 patch; `mk.sh all2 all`, `mk.sh all3 all`
- queue edits (`sed -i`, `cat >>` on `<s>/queue.txt`): stage A and B runs, A-R5, B-R5, A-CS, B-CS, A-I, B-I, B-BS30, B-BD1D2, A-F3S30, B-F3S30, B-S30D1D2, B-F3D1D2, B-IS30, B-S25; `sed -i` moving B-off to the final tree
- reads: `sed -n`/`grep` of `docs/rework.md`, `docs/design/planner.md`, `docs/design/achievement-map.md`; `node -e` over `public/data/manifest.json` (season rewards), `public/data/items.json` (runes, gem bags, potion recipes, pieces), `public/data/npc_items.json` (rune prices), `docs/api/openapi.json` (the gems shop paths); `npm run --silent market -- --code egg,sap,…` (read-only)
- `node <s>/tools/tab.mjs <s>/runs …` and `DETAIL=1 …` (the tables, many times); `node <s>/tools/cmp.mjs` (P0 against P0d: 97 of 97 lines); `node -e` comparisons of A-off with P0d and of four A-/B- pairs (lines and decisions)
- `node --import tsx <s>/tools/believe.mts --tree <s>/t/home --world <w> --fought … --held … <runs>` (settled point 7); `node <s>/tools/bill.mjs <s>/runs …` (section 5's bill); `node <s>/tools/cal.mjs …` (the calendar); `node <s>/tools/part.mjs P0s <run>` (where roads part)
- the patches: `git -C <s>/repo diff a45e6cf <branch> -- src` into `docs/strategy/022/policies/<name>.patch` (11 files); in the project: `git apply --check docs/strategy/022/policies/*.patch` (all apply to HEAD; nothing changed) and `git status --short`
- PowerShell: `Get-CimInstance Win32_Process` (the outlook child 9052, its priority); `(Get-Process -Id …).PriorityClass = 'Idle'` on my runs only (21:07), then `<s>/tools/idle.sh` in the background (every 60 s, my runs only)
- background waits (`until grep …; do sleep …; done`) and Monitor until-loops over my scratch files; `TaskStop` of two of my own wait loops that could never end
- the gate's reads: `node -e` over `logs/status.json`; `grep` of the `boot`/`outlook` records in `logs/journal/2026-11-22.jsonl`;
  `cat logs/raw/2026-11-22/19.log … 22.log | grep -E '… api POST /my/…/action/… -> ok'` with a `node -e` per-character gap
  count (first with a pattern that missed actions with a body: Third 1,635 s, Second 378 s — wrong; then every action), `grep -c
  " -> [45][0-9][0-9]"` of the same files, and `awk`/`grep` of the lines around the two longest gaps; `cp` of the agents'
  scripts (`<s>/out/sec2/*.mjs`, `sec1-analyze.mjs`) into `docs/strategy/022/tools/`; the report assembled with `cat` of the
  section drafts and edited with the editor
- at the end: `git diff --stat docs/rework.md` (unchanged since `1680dda`); `git status --short`; `git diff --stat HEAD -- src scripts public docs/design docs/audit`; `git add tasks/022-strategy.md tasks/022-strategy.report.md docs/strategy/022`; `git commit -F <msg>` (`022: strategy experiment`); `git log --oneline -3`; `git push`; `git log origin/rework --oneline -1`; `git log main --oneline -1`; the scratch loops stopped (`touch` of their stop files, `kill` of the watcher), the junctions removed and `<s>` deleted (PowerShell `Remove-Item`).

**Every command — the section 1 agent** (`<s>/out/sec1-cmds.md`, as it wrote it):


No git command, no network request, nothing written under G:\alex\projects\artifactsmmo. Shell: Git Bash. Every
output went to the terminal or to `D:\Temp\a022\out\` (`sec1-analyze.mjs`, `sec1-tables.md`, `sec1.md`, this file).

```
ls -la /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/ /g/alex/projects/artifactsmmo/docs/design/snapshot/ /d/Temp/a022/out/ 2>&1 | head -80
cat /d/Temp/a022/out/requests.log; echo ---; cat /d/Temp/a022/out/list1.txt; echo; cat /d/Temp/a022/out/get2.out | head -50
ls -la /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/ | grep -i -E "sun|leader"; ls -la /g/alex/projects/artifactsmmo/docs/strategy/022/; ls /g/alex/projects/artifactsmmo/docs/strategy/
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; head -c 1500 leaderboard-accounts-1.json; echo; echo ----; head -c 3000 acc-uaprsf-characters.json; echo; echo ----; head -c 1200 acc-uaprsf-achievements.json; echo; echo; head -c 800 ge-history-small_health_potion.json; echo; cat ge-history-minor_health_potion.json
cd /g/alex/projects/artifactsmmo/docs/design/snapshot/; head -c 1500 leaderboard-accounts.json; echo; echo ---; tail -c 300 leaderboard-accounts.json; echo; head -c 600 leader-achievements.json; echo; tail -c 300 leader-achievements.json; echo; head -c 400 leader-characters.json; echo; cat account.json; echo; head -c 1500 status.json
cd /g/alex/projects/artifactsmmo/public/data; ls -la; node -e "<print length and first row of achievements, items, monsters, resources, npcs, events>"
cd /g/alex/projects/artifactsmmo; sed -n 1,60p scripts/market.mts; ls logs/market/
cd /g/alex/projects/artifactsmmo; npm run market -- --code minor_health_potion,small_health_potion,health_potion,algae,nettle_leaf,sunflower 2>&1 | tail -40; echo ======; npm run market -- --code minor_health_potion,small_health_potion,health_potion,algae,nettle_leaf,sunflower --from 2026-11-21T00:00Z 2>&1 | tail -30
cd /g/alex/projects/artifactsmmo; sed -n 60,140p scripts/market.mts; grep -n "Row\b\|type Row\|\[number" src/state/market.ts | head
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; for f in acc-*-achievements.json ge-*.json leaderboard-*.json; do node -e "<print data.length, total, pages of $f>"; done
cd /g/alex/projects/artifactsmmo; grep -n "deadline" src/plan/planner/config.ts | head -5; grep -n "start\|badge\|bronze\|silver" public/data/manifest.json | head -20; node -e "<first/last sold_at of ge-history algae, sunflower, nettle_leaf>"
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; for c in algae nettle_leaf sunflower small_health_potion; do node -e "<order check of ge-history-$c.json: inversions, min, max sold_at>"; done
cd /g/alex/projects/artifactsmmo; node -e "<docs/api/openapi.json: descriptions of /grandexchange/history/{code}, /accounts/{account}/achievements, /leaderboard/accounts>"
cd /g/alex/projects/artifactsmmo/docs/design/snapshot/; node -e "<leaderboard-characters.json: length, total, first row; characters per read account>"; grep -o '"name":"[^"]*","account":"[^"]*"' leader-characters.json | head; grep -rn "leaderboard-characters\|leaderboard/characters" /g/alex/projects/artifactsmmo/docs/design/planner.md | head -3
cd /g/alex/projects/artifactsmmo/public/data; node -e "<item type/subtype counts; npcs and their currencies; monsters by type; events' content>"; head -c 600 npc_items.json
cd /g/alex/projects/artifactsmmo/public/data; node -e "<maps.json first monster tile; achievement adept; items satchel, healing_rune, celest_ring, corrupted_skull, perfect_pearl, mithril_sword, wrathpants>"
cd /g/alex/projects/artifactsmmo/public/data; node -e "<static NPC tiles in maps.json; every rune, bag and artifact with its craft; their npc_items offers>"
cd /d/Temp/a022/out && node sec1-analyze.mjs > sec1-tables.md; echo exit $?; wc -l sec1-tables.md
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; node -e "<completed_at of novice, adept, feather_me_impressed, in_every_color, a_helping_hand, tasks_farmer per read account>" 2>&1 | head -120
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; node -e "<every read character: combat, the nine skills, weapon, position, task>"; node -e "<the three earliest completed_at over all read accounts>"
cd /d/Temp/a022/out && node -e "<patch sec1-analyze.mjs: an achievement reward inherits its achievement's flags (achFlags)>"; grep -n "achFlags" sec1-analyze.mjs | head
cd /d/Temp/a022/out && node sec1-analyze.mjs > sec1-tables.md; echo exit $?; sed -n 1,45p sec1-tables.md; grep -n "Done by at least" sec1-tables.md; sed -n '/Combat levels 11-18/,/How many characters/p' sec1-tables.md; sed -n '/## 6/,/## 4/p' sec1-tables.md
cd /d/Temp/a022/out && sed -n '/## 4. What they wear/,$p' sec1-tables.md | grep -v "^| food\|^| art\|^| rune\|^| util\|^| bag" | head -150
cd /g/alex/projects/artifactsmmo; grep -rn "rune" src/plan/bis.ts src/plan/jobgear.ts src/sim/effects.ts src/plan/planner/*.ts 2>/dev/null | head -20; grep -n "healing\b\|\"healing\"\|healing:" src/sim/effects.ts src/sim/combat.ts | head; node -e "<healing_rune effects; effects.json healing>"
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; node -e "<characters wearing a utility potion; fighters 35+ with weapon, rune, food in bag>"
cd /g/alex/projects/artifactsmmo/public/data; node -e "<craft of minor/small/health potion; resources dropping algae, nettle_leaf, sunflower>"
cd /g/alex/projects/artifactsmmo/public/data; node -e "<levels, conditions, effects, craft of cooked fish, potions, runes, bags, perfect_pearl and the common 40+ pieces; nodes dropping small_pearls>"
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; node -e "<the two newest completions of hunter2, chewbaccoin, alverus, Big_Shark, Elemental; 158 dates at alternative paces>"; grep -n "15 → 30\|expert_miner" /g/alex/projects/artifactsmmo/tasks/022-strategy.md | head -3
cd /d/Temp/a022/out && node sec1-analyze.mjs > sec1-tables.md && grep -n "^Of the\|^Craft level" sec1-tables.md
cd /d/Temp/a022/out && node sec1-analyze.mjs > sec1-tables.md && sed -n '/flagged materials of the pieces/,/The worn pieces with/p' sec1-tables.md
cd /d/Temp/a022/out && node -e "<patch sec1-analyze.mjs: fewer day columns, no linear-deadline column>" && node sec1-analyze.mjs > sec1-tables.md && sed -n 7,12p sec1-tables.md && sed -n '/## 1b/,/dN =/p' sec1-tables.md && sed -n '/Totals over/,/## 7/p' sec1-tables.md
cd /d/Temp/a022/out && node -e "<patch sec1-analyze.mjs: gates for npc_buy, npc_sell, task, recycling, favor>" && node sec1-analyze.mjs > sec1-tables.md && sed -n '/## 2. The order/,/### Levels the order/p' sec1-tables.md
cd /d/Temp/a022/out && sed -n '/### Levels the order proves/,/## 3/p' sec1-tables.md && sed -n '/## 3. Levels/,/Spearman/p' sec1-tables.md
cd /g/alex/projects/artifactsmmo/docs/strategy/022/snapshot/; node -e "<non-crafted pieces worn by fight sets at combat 40+>"
```

The `node -e` one-liners are given by what they printed (`<…>`); each only read JSON files with `require`/`readFileSync`
and printed to the terminal. To rebuild the tables: `node D:\Temp\a022\out\sec1-analyze.mjs` (reads
`docs/strategy/022/snapshot/`, `docs/design/snapshot/`, `docs/design/achievement-map.md`, `public/data/`).

Files read with the Read/Grep tools: `tasks/022-strategy.md`; `docs/design/achievement-map.md` (lines 1–465, the
headings); `docs/design/planner.md` (lines 1–100; a grep for the snapshot's time); `scripts/market.mts`.

**Every command — the section 2 agent** (`<s>/out/sec2-cmds.md`, as it wrote it):


cd /g/alex/projects/artifactsmmo && wc -l tasks/022-strategy.md docs/journal.md tasks/021-fight-solve.report.md && ls logs/journal/ logs/raw/ && ls -la logs/status.json && mkdir -p /d/Temp/a022/out/sec2 && ls /d/Temp/a022/out/
cd /g/alex/projects/artifactsmmo && grep -n "^#" tasks/021-fight-solve.report.md | head -60
cd /d/Temp/a022/out && ls -la . sec2 && head -c 3000 journal-chat.md && wc -l journal-chat.md watch.log requests.log
cd /g/alex/projects/artifactsmmo && wc -l logs/journal/*.jsonl && tail -c 600 logs/journal/2026-11-22.jsonl && grep -c '"k":"boot"' logs/journal/*.jsonl && grep '"k":"boot"' logs/journal/2026-11-22.jsonl | cut -c1-200 && grep '"k":"outlook"' logs/journal/2026-11-22.jsonl | cut -c1-300 && cat logs/status.json | head -c 1500; ls logs/raw/2026-11-22/; ls -la logs/dev.log; ls logs/world
cd /g/alex/projects/artifactsmmo && cat logs/journal/*.jsonl | node -e '<count record kinds, print one sample of each>'
cd /g/alex/projects/artifactsmmo && cat logs/journal/*.jsonl | grep -E '"k":"(int|int-end|pause|block|level|ach|spend|slow|bank)"' | node -e '<print them compactly>'
cd /g/alex/projects/artifactsmmo && cat logs/journal/*.jsonl | grep -E '"k":"(step|end|sample)"' | node -e '<compact listing>' > /d/Temp/a022/out/sec2/steps.txt; wc -l /d/Temp/a022/out/sec2/steps.txt
cd /g/alex/projects/artifactsmmo/logs/raw && ls -la 2026-11-21 2026-11-22 | head -60 && head -c 2500 2026-11-22/17.log
cd /g/alex/projects/artifactsmmo/logs/raw && cat 2026-11-2*/*.log | sed -E '<strip time/run>' | sed -E '<normalise paths>' | awk '{print $1, $2, $3}' | sort | uniq -c | sort -rn | head -70
cd /g/alex/projects/artifactsmmo/logs/raw && for f in 2026-11-21/16.log 2026-11-21/18.log 2026-11-21/20.log 2026-11-22/08.log 2026-11-22/17.log; do grep -n -m1 -B2 -A3 -E "\[(qf93|k66s|dxgi|4zfd|0e2f)\]" $f | cut -c1-220 | head -8; done
cd /g/alex/projects/artifactsmmo && npm run journal -- --from 2026-11-21T00:00Z --to 2026-11-23T00:00Z > /d/Temp/a022/out/sec2/journal-all.md 2>&1; wc -l /d/Temp/a022/out/sec2/journal-all.md; grep -n "^## " /d/Temp/a022/out/sec2/journal-all.md
cd /g/alex/projects/artifactsmmo/logs/raw && grep -h -m3 "log\[ok\] Third fight" 2026-11-22/05.log; grep -h -m3 "crafting" 2026-11-22/04.log | head -5; grep -h -m5 "head " 2026-11-22/04.log; grep -h "plan Third" 2026-11-22/04.log | head; grep -h "action/" 2026-11-2*/*.log | grep -v -- "-> ok" | sed -E 's/^[^ ]+ //' | sort | uniq -c | sort -rn | head -30
cd /g/alex/projects/artifactsmmo && sed -n 1,80p src/plan/planner/config.ts
cd /g/alex/projects/artifactsmmo && grep -n "craftK\|craftAbove40\|craftTrain\|levelHoursEstimate" -r src/plan | head -40
(Read tool) src/plan/planner/cost.ts lines 160-269
cd /g/alex/projects/artifactsmmo && node -e '<atlas keys; craftTrain rows 18-40 of weapon/gear/jewelry/cooking crafting; xpNeeded 18-41>'
cd /g/alex/projects/artifactsmmo && grep -h '"key":"lvl:gearcrafting' logs/journal/*.jsonl; grep -h "level:gearcrafting\|level:weaponcrafting\|level:jewelrycrafting" logs/journal/*.jsonl | head
cd /g/alex/projects/artifactsmmo && ls public/data/ && node -e '<items.json recipes of training items and materials>'
cd /g/alex/projects/artifactsmmo && node -e '<atlas.items lookup (object form)>'
cd /g/alex/projects/artifactsmmo && node -e '<atlas.items lookup (array form) with costSec>'
cd /g/alex/projects/artifactsmmo/logs && grep -c "" dev.log; head -c 300 dev.log; tail -c 300 dev.log; grep -n -E "plan [A-Za-z]+: lvl:(gear|weapon|jewelry)crafting|plan [A-Za-z]+: lvl:cooking" dev.log | cut -c1-330 | head -40
cd /g/alex/projects/artifactsmmo/logs && grep -o -E "(Train|train) (Gear|Weapon|Jewelry)crafting[^\"]{0,40}" dev.log | sort | uniq -c | sort -rn | head -20; grep -E "(gear|weapon|jewelry)crafting" dev.log | sed -E 's/^[^ ]+ \[[a-z0-9]+\] //' | awk '{print $1,$2,$3}' | sort | uniq -c | sort -rn | head -30
cd /g/alex/projects/artifactsmmo/logs && grep -n -m5 "train Gearcrafting" dev.log | cut -c1-200; grep -n -i -m10 -E "level ?up|reached level|Lv [0-9]+ gearcrafting|gearcrafting [0-9]+ →|gearcrafting Lv" dev.log | cut -c1-250; grep -m5 "Third crafting:" dev.log | cut -c1-250; grep -m5 "Third recycling:" dev.log | cut -c1-250
cd /g/alex/projects/artifactsmmo/logs && grep -n -E "\] head [A-Za-z]+: \[[a-z0-9]+\] Train (Gear|Weapon|Jewelry)crafting" dev.log | cut -c1-160; grep -E "note [A-Za-z]+: train (Gear|Weapon|Jewelry)crafting" dev.log | awk '<hour, who, skill>' | sort | uniq -c | awk '{print $2,$3,$4,$1}' > /d/Temp/a022/out/sec2/oldtrain-hours.txt; wc -l …; head -80 …
sed -n 80,120p /d/Temp/a022/out/sec2/oldtrain-hours.txt; cd /g/alex/projects/artifactsmmo/logs && grep -n -E "\] head (Second|Third|Fourth): " dev.log | awk -F'] head ' '{print $1"|"$2}' | cut -c1-200 > /d/Temp/a022/out/sec2/old-heads.txt; wc -l /d/Temp/a022/out/sec2/old-heads.txt
cd /g/alex/projects/artifactsmmo && ls docs/design/snapshot/ scripts/fixtures/ | head -40; node -e '<crafting levels in scripts/fixtures/world-2026-11-20.json, logs/world/2026-11-21.json, logs/world/2026-11-22.json>'
cd /g/alex/projects/artifactsmmo && node -e '<crafting levels in docs/design/snapshot/characters.json>'; ls -la docs/design/snapshot/; grep -rn "<crafting level patterns>" tasks/*.md docs/rework.md | cut -c1-220 | head -20
cd /g/alex/projects/artifactsmmo/logs && grep -E "note Third: train Gearcrafting" dev.log | sed -E '<strip>' | sort | uniq -c | sort -rn | head -40; grep -E "2026-11-1[78].*note Third: train Gearcrafting" dev.log | sed -n '1p;$p'
cd /g/alex/projects/artifactsmmo && grep -h '"k":"event"' logs/journal/*.jsonl | node -e '<event records with members and takes>'
cd /g/alex/projects/artifactsmmo && node -e '<achievement points>'; node -e '<atlas costSec of air boost, trout, potions, rat hide>'
cd /g/alex/projects/artifactsmmo/logs/raw && cat 2026-11-22/00.log 2026-11-22/01.log 2026-11-22/02.log 2026-11-22/03.log | grep -E "note (First|Fifth): offering" | sed -E '<strip>' | sort | uniq -c | sort -rn | head -30
cd /g/alex/projects/artifactsmmo/logs/raw && cat 2026-11-22/0[0-3].log | grep -E "\] note (First|Second|Third|Fourth|Fifth): " | sed -E '<strip>' | sort | uniq -c | sort -rn | head -40
cd /g/alex/projects/artifactsmmo/logs/raw && grep -E "Second" 2026-11-22/13.log | awk '$1>="2026-11-22T13:13" && $1<="2026-11-22T13:24"' | cut -c1-260 | grep -v gathering
cd /g/alex/projects/artifactsmmo/logs/raw && grep -h -E "ran dry|lost a fight|not a safe win|no way to get|can't get" 2026-11-2*/*.log | cut -c1-230
cd /g/alex/projects/artifactsmmo && grep -h '"k":"end"' logs/journal/*.jsonl | grep -E 'src:(algae|sunflower|nettle)|intermediate_alchemist|mat:(minor|small)' | node -e '<got/made per supply end>'; grep -h "fight: fight" logs/raw/2026-11-2*/*.log | sed -E 's/^.*fight: fight ([a-z]+).*$/\1/' | sort | uniq -c
cd /g/alex/projects/artifactsmmo && grep -n "MARGIN" src/plan/planner/*.ts | head -12; grep -n "≈.*kills in" src/plan/planner/events.ts src/state/eventorders.ts | head -5
cd /g/alex/projects/artifactsmmo/logs/raw && grep -E "(Second|Third)" 2026-11-22/06.log | awk '$1>="2026-11-22T06:00" && $1<="2026-11-22T06:12"' | grep -E "equip|withdraw|planned set|plannedSet|needs" | cut -c1-330
cd /g/alex/projects/artifactsmmo && node -e '<logs/world/2026-11-22.json: bank stock of training and potion materials; costs>'
cd /g/alex/projects/artifactsmmo && node -e '<logs/world/2026-11-22.json costs: level:/kill:/craft: rows>'
cd /g/alex/projects/artifactsmmo && node -e '<logs/status.json: run, outlook, blocked, skills per character; roads 20→30→35→40 at craftK 0.1 vs a play factor>'
cd /g/alex/projects/artifactsmmo/logs && grep -o -E "note [A-Za-z]+: (help|for) [A-Za-z]+[^\"]{0,50}" dev.log | sed -E 's/[0-9]+\/[0-9]+//g' | sort | uniq -c | sort -rn | head -15; grep -m3 -E "action/crafting" dev.log | cut -c1-200; grep -E "2026-11-1[0-8].*(train Gearcrafting: craft|train Weaponcrafting: craft|train Jewelrycrafting: craft).*xp each" dev.log | sed -E '<hour who skill item xp>' | sort | uniq -c | head -60
cd /g/alex/projects/artifactsmmo/logs && grep -o -E "\] head [A-Za-z]+: \[[a-z0-9]+\] [^\n]{0,80}" dev.log | sed -E 's/\[[a-z0-9]+\] //' | sed -E 's/[0-9]+×//g' | sort | uniq -c | sort -rn | awk '$0 ~ /rain|elp/' | head -30
cd /g/alex/projects/artifactsmmo && node -e '<atlas xpNeeded 0-29 and sums>'; cd /d/Temp/a022/out/sec2 && node -e '<crafting actions under Train heads; craft notes without xp>'
cd /g/alex/projects/artifactsmmo/logs && awk '$1>="2026-11-04" && $1<"2026-11-21T11:44"' dev.log | grep -E "\] (head (Second|Third|Fourth): |api POST /my/(Second|Third|Fourth)/action/crafting)" | node -e '<units crafted by code within Train items>'
cd /g/alex/projects/artifactsmmo && node -e '<roads by model vs measured factor ranges; atlas rows 20-40>'
cd /d/Temp/a022/out/sec2 && node an.mjs > an.out.md 2>&1   (run five times while the script grew; scripts lib.mjs, an.mjs, an2.mjs, an3.mjs written with the Write/Edit tools in D:\Temp\a022\out\sec2\)
cd /d/Temp/a022/out/sec2 && node - <<'EOF' … EOF   (two in-place text patches of an.mjs / an2.mjs, scratch only)
cd /d/Temp/a022/out/sec2 && tail -5 an.out.md; grep -n "fs.writeFileSync" an.mjs
cd /d/Temp/a022/out/sec2 && head -12 an.out.md; sed -n 36,46p an.mjs
cd /d/Temp/a022/out/sec2 && node an2.mjs > an2.out.md 2>&1   (three times)
cd /d/Temp/a022/out/sec2 && time node --max-old-space-size=4096 an3.mjs > an3.out.md 2>&1   (twice)
cd /d/Temp/a022/out/sec2 && node -e '<check: 45 lvl:mining:35 steps started × 1.5 h = 67.5; steps-only and interrupts meters; Σ(ran − m.s)>'
cd /d/Temp/a022/out/sec2 && node an.mjs > an.out.md && node an2.mjs > an2.out.md && node an3.mjs > an3.out.md && head -2 an.out.md && sed -n '/## Combined table/,$p' an.out.md && tail -1 …/logs/journal/2026-11-22.jsonl | cut -c1-120 && grep -c '"k":"boot"' …/2026-11-22.jsonl && grep '"k":"outlook"' …/2026-11-22.jsonl | tail -1 | cut -c1-140; ls …/logs/journal/
cd /d/Temp/a022/out/sec2 && sed -n '/## Samples against/,$p' an2.out.md; grep -h '"k":"int"' …/logs/journal/2026-11-22.jsonl | grep offering | cut -c1-80
cd /d/Temp/a022/out/sec2 && cat an2.out.md | head -60
(final check) cd /g/alex/projects/artifactsmmo && grep '"k":"boot"\|"k":"outlook"' logs/journal/2026-11-2*.jsonl | cut -c1-160 | tail -4; head -c 200 logs/status.json
## Notes
Defects noticed and not touched; guesses last, most doubtful first.
- **The forward model's potions are the season.** In P0s the consumables' supply is 57% of all character-hours (6,378 of
  11,238; greater health potion alone 30%, `runs/P0s.jsonl` stats `hours`), about 170,000 potions and foods are drunk and
  eaten, and most of the 297,562 chicken kills are for eggs (an egg drops 1 in 12, `monsters.json`; the run's 46,308 health and
  greater health potions take about 23,000 eggs, about 278,000 chicken kills). In play the fleet
  has never drunk a greater health potion; a fighter at 40+ in the model drinks potions where the leaders wear a rune and eat
  fish. Whether the model's fights drink too much (the simulator's restore procs on sets the leaders would not wear) is
  023's question; the vampire steps of 11-21/22 drank 0.94 of plan (section 2), the event trips 2.68 times.
- **Row B's free potions are unbounded per fight**: a fight planned with free potions may drink 30–46 a kill (hellhound 46 at
  combat 33, section 3) — more than a utility stack of 100 holds for a two-or-three-kill trip. B is a bound even as a model.
- **The kill objective's gates in `targets.ts` miss what section 1 found**: the leaders kill bosses 5–20 levels below the map's
  combat gates; the planner's win gates are the atlas's guesses (`g.level`), so section 3's "points behind combat" (46 by the
  targets' gates) differs from decision 11's map count (81 of 195 behind 41+) — both are model readings.
- **The executor and a rune**: the planner's step `wear` leaves the rune slot out (`decide.ts:161-162` `WEAR_SLOTS`) while the
  executor's sets manage it (`jobgear.ts:30` `MANAGED_SLOTS` holds every non-utility slot); a bought rune would be worn by
  the executor's own solve, not by the plan. Not checked in play.
- **Gold in the model only rises** (kills earn their mean gold, `forward.ts:149`; tasks, sales, offerings and purchases are left
  out): the bank's gold ends at 360,000–1,150,000 in every run, so "gold short for the fare" (D1: 1,365 short on day 42)
  comes from the order of steps, not from spending.
- **`D1` alone** stalls from about day 21: by day 42 34% of its hours are filler and 21% the fallback, and 29 points wait for
  "gold short for the fare" — the best far gate pulls the island's gathering roads ahead of the fights that earn the gold
  (`runs/A-D1.jsonl`). With `D2` it is the best policy on day 42 (71) and falls back to 93 at the deadline.
- The leaderboard lags: 29 for this account at 19:23 UTC against 30 completed (section 1).
- My driver samples the levels at the first decision after each midnight, not at the midnight itself; its kills are the
  forward model's (`as` supply: units are kills; else units × `perOf`), event kills included.
- `npx tsc` in the scratch repo (before it had `node_modules`) fetched and ran the unrelated npm package `tsc@2.0.4` (it only
  prints a notice) into `D:\npm-global\_npx\1d6e82a4126006c4` — see "To delete".
- **Guesses**: that `I`'s 37,000 algae could be bought (a third of the market's seven-day volume, every day of the season, at
  today's 2 gold; the model has it all on day one); that the ingredient prices of one week hold for a season; that the
  section 2 measure of a crafting level (one level in the journal, older loops at 10–19) holds above 30 (section 2's Notes);
  that the policies' order at the deadline would survive the executor's faults (section 2: about 4.5 character-hours a day
  on 11-22, the potions' overdrink of the event trips not counted).

## To delete (Alex)
- `D:\npm-global\_npx\1d6e82a4126006c4` — the npm package `tsc@2.0.4` that my mistaken `npx tsc` fetched into the npx cache
  (19:26 UTC; nothing uses it).
