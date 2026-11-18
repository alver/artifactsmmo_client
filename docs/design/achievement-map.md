# The achievement map — season 9

Written 2026-11-18 by task 004. Facts for the planner's design; nothing here changes behaviour.

## Summary

1. **210 is not reachable this season.** The costable road is about 85,600 character-hours; the fleet delivers about
   105 a day as measured: 117 weeks of work against the 14 left. No end date is published; the map uses 2027-02-24
   (the API's start date 2026-10-24 plus the docs' "approximately 4 months").
2. **About 100 points fit (98–105), and only if the client gets every missing ability at once**: 101 at the measured
   pace, 105 never idle, 98 pessimistic. That is the edge of the free 100-point tier and of the bronze badge (105);
   the tier safely reached is 50. Silver (158) and gold (210) are out. Left alone, today's client ends near 30.
3. **Obstacle 1 — the levels behind the late content.** 81 of the 195 open points need combat 41 or more. By the
   atlas, getting five characters there with that band's gear crafting costs about 38,000 character-hours, almost
   all of it weapon, gear and jewelry crafting.
4. **Obstacle 2 — events.** 21 open achievements (64 points) need work that exists only while an event is up. The
   Corrupted Portal alone must be caught 64 times with all five characters: 89 days, or 447 with one as today.
5. **Obstacle 3 — raids and bosses.** 27 points need a raid (12 directly, 15 through the cultist cloak, paid in raid
   currency), and what counts as a raid "kill" is not documented. Three achievements need 1,200–1,500 boss kills.
6. **What the client cannot do today, with the open points behind each** (they overlap): use a map transition 97 ·
   put the whole fleet on an event 64 · choose an achievement's work itself 50 · start a group boss fight without
   a click 40 · fight in a raid 27 · use an item on purpose 10.
7. **Points by the deadline as abilities are added in that order**: none 30 → chooses the work 66 → transitions 84 →
   fleet on events 98 → boss groups 101 → `use` 101.
8. **Order**: favors daily from now, gathering and refining chains, tasks, then combat 25–35 (D and E).

## How to read this

- **Sources.** Each figure names one: **api** (`docs/design/snapshot/*.json`, read 2026-11-18 13:34 UTC, or
  `docs/api/openapi.json`), **data** (`public/data/*.json`, fetched 2026-11-04), **atlas**
  (`public/data/atlas.json`, generated 2026-11-17; the field is named), **log** (`logs/dev.log`; period and method
  in E), **docs** (the game's public pages, URL given), **guess** (with what it rests on).
- **Units.** A character-hour ("char-h") is one character working one hour. A fleet-hour is five of them.
- **Tables.** Every table below a line "script output" is the output of
  `node --import tsx scripts/design/achievement-map.mts`, pasted unchanged. The prose is written by hand.
- **The model in one paragraph.** Each objective is priced in one character's seconds: gathers by the docs'
  cooldown formula, kills by the atlas's kill time, crafts through their recipes down to gathers and kills. Each
  achievement gets a combat gate (the atlas's lowest safe level for its monsters) and skill gates. The road is then
  ordered greedily: the next achievement is the one with the most points per hour, counting the levelling it still
  needs. Levelling means all five characters to the combat gate, the three gear crafting skills to the start of
  that level band, and one specialist per other skill. Work at one monster or node is counted once for every
  objective it serves, and kills and gathers done while levelling count too.

## A. The season

- **Season 9, "Altar of Sacrifice", started 2026-10-24 00:00 UTC** (api: `status.json`, `season.start_date`).
  `docs/rework.md` says 2026-10-31, from the game's announcement. The two disagree; the map uses the API. The
  catalog manifest of 2026-11-04 (data: `manifest.json`) shows 2026-10-24 as well.
- **End date: none published.** The API's season object has a name, a number, a start date and the rewards, and no
  end (api: `SeasonSchema` in `docs/api/openapi.json`). The docs say "each season lasting approximately 4 months"
  (docs: https://docs.artifactsmmo.com/concepts/seasons/). That gives **2027-02-24**, 13.9 weeks after the
  snapshot. `docs/rework.md` works with early March 2027 (season 8's 18 weeks counted from 2026-10-31), which is
  2027-03-06, 15.3 weeks away. The map uses 2027-02-24 and shows both in E.
- **The reward track** has 21 entries on 19 point thresholds (api: `status.json`). Seven entries are free: 50, 100,
  105 (bronze badge), 150, 158 (silver badge), 200 and 210 (gold badge). **210 is the last free tier, confirmed.**
  A second 210 entry, the colour badge, goes only to the first account to get there. The other 13 entries need
  membership. Rewards are granted automatically when the points are reached (docs: same page).
- **Points come only from achievements**, counted per account (docs:
  https://docs.artifactsmmo.com/concepts/achievements/).

script output:

Season 9 "Altar of Sacrifice", start 2026-10-24 (api: status.json). Snapshot taken 2026-11-18T13:34:02.719Z. Deadline used: 2027-02-24 (start + 4 months, docs) = 97.4 days = 13.9 weeks away; alternative 2027-03-06 (docs/rework.md) = 15.3 weeks away.

| points | reward | type | qty | member only | first only |
|---|---|---|---|---|---|
| 1 | small_bag_of_gems | item | 1 | yes | no |
| 10 | small_bag_of_gems | item | 1 | yes | no |
| 25 | bag_of_gems | item | 1 | yes | no |
| 40 | small_bag_of_gems | item | 1 | yes | no |
| 50 | small_bag_of_gems | item | 1 | no | no |
| 75 | bag_of_gems | item | 1 | yes | no |
| 80 | small_bag_of_gems | item | 1 | yes | no |
| 100 | altarion | skin | 1 | yes | no |
| 100 | small_bag_of_gems | item | 1 | no | no |
| 105 | season9_bronze | badge | 1 | no | no |
| 110 | small_bag_of_gems | item | 1 | yes | no |
| 125 | bag_of_gems | item | 1 | yes | no |
| 140 | small_bag_of_gems | item | 1 | yes | no |
| 150 | small_bag_of_gems | item | 1 | no | no |
| 158 | season9_silver | badge | 1 | no | no |
| 175 | bag_of_gems | item | 1 | yes | no |
| 180 | small_bag_of_gems | item | 1 | yes | no |
| 195 | small_bag_of_gems | item | 1 | yes | no |
| 200 | small_bag_of_gems | item | 1 | no | no |
| 210 | season9_gold | badge | 1 | no | no |
| 210 | season9_color | badge | 1 | no | yes |

## B. The account today

Account `alverus`: not a member, 15 achievement points, 13 of 91 achievements complete (api: `account.json`,
`achievements.json`). `docs/rework.md` says 13 points; Bite! Oh, algae! (2 points) completed at 13:18 UTC on the
day of the snapshot.

script output:

| character | combat | mining | woodcutting | fishing | alchemy | weaponcrafting | gearcrafting | jewelrycrafting | cooking | gear band worn | pieces of its level band's plus set |
|---|---|---|---|---|---|---|---|---|---|---|---|
| First | 20 | 22 | 21 | 16 | 18 | 3 | 2 | 1 | 26 | 15–19 (6 of 10 pieces) | 3 of 10 (band 20–24) |
| Second | 22 | 21 | 21 | 19 | 16 | 20 | 2 | 1 | 23 | 15–19 (5 of 9 pieces) | 2 of 10 (band 20–24) |
| Third | 20 | 22 | 18 | 18 | 17 | 2 | 21 | 1 | 22 | 10–14 (5 of 9 pieces) | 2 of 10 (band 20–24) |
| Fourth | 21 | 24 | 21 | 17 | 17 | 2 | 2 | 20 | 21 | 15–19 (6 of 9 pieces) | 2 of 10 (band 20–24) |
| Fifth | 20 | 24 | 18 | 19 | 16 | 2 | 2 | 1 | 21 | 15–19 (6 of 9 pieces) | 2 of 10 (band 20–24) |

What this means for the road:
- **Nobody is ahead.** All five stand at combat 20–22 and gather at 16–24. The fleet moves as one block.
- **One crafter per gear skill, and nobody behind them.** Second has weaponcrafting 20, Third gearcrafting 21,
  Fourth jewelrycrafting 20; every other character has 1–3 in those skills. First cooks at 26.
- **Skills nobody has.** No skill is at 30 anywhere. Alchemy is 16–18, so nobody can pick nettle (20) or brew a
  minor health potion; fishing is 16–19, so nobody can catch trout (20). Both are two to four levels away.
- **Gear is a band behind.** The characters are in the atlas's 20–24 band and wear mostly 15–19 pieces (Third
  10–14). The snapshot shows what was worn at that minute, which for four of them is a gathering or training set;
  the bank, which holds the fight sets, is not in a public read.

## C. Every achievement

91 rows, grouped by the type of the first objective. Columns:
- **needs before work can start** — the combat gate and its basis (atlas: `monsters[].minLevel`, tier plus, then
  special; "no farmable set wins by Lv 50" means the atlas found no gear a self-sufficient fleet can make that
  beats the monster, and the gate is set to 50), skills (data: recipes and nodes), events (data: `events.json`),
  transitions and their keys or tolls (data: `maps.json`; atlas: `monsters[].access.gates`), then after the dash
  the source the work was priced on.
- **how progress counts** — account-wide in every case (docs:
  https://docs.artifactsmmo.com/concepts/achievements/: "Progress is tracked at the account level, so all your
  characters contribute together"). What a unit is, is marked where the docs do not say.
- **work left** — actions (fights, gathers, crafts, uses, purchases), character-hours, and whether it splits
  across characters. A row is priced on its own here; work shared between rows is counted once in E.
- **costs besides time** — currencies and keys. Gold tolls are in the "needs" column and in G.
- **client today** — "auto" (happens with the features that run today, nobody queueing anything), "by hand" (a
  queue item or a button does it once someone uses it), "cannot" (nothing in the client does it). For an
  achievement with several objectives the worst of them is shown.

script output:

Unit times: gather = 29 + max(1, ⌊level/2⌋) s (docs formula); kill = atlas `monsters[].kill.sec`, else guess 300 s; boss = guess 600 s × 3 characters; craft 5 s; task = 1.95 h (log; the data's mean task of level ≤ 30 at the unit times above gives 3.7 h — the map uses the log); recycle = craft + recycle one copper_axe (1,835 s); offering = guess 20 min. "char-h" = one character's hours.

### favor (2 achievements, 6 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| a_favored_champion | A Favored Champion | 4 | favor 33/500 (467) | nothing — offerings | account-wide, one per completed offering (docs) | 934 · 156 · yes — 3 per character per day | time only | auto — daily trigger at 00:05 UTC on every running queue |
| a_helping_hand | A Helping Hand | 2 | favor 33/50 (17) | nothing — offerings | account-wide, one per completed offering (docs) | 34 · 5.7 · yes — 3 per character per day | time only | auto — daily trigger at 00:05 UTC on every running queue |

### combat_kill (24 achievements, 65 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| a_peaceful_island | A Peaceful island | 4 | combat_kill sandwarden 0/250 (250)<br>combat_kill desert_scorpion 0/250 (250)<br>combat_kill sand_snake 0/250 (250)<br>combat_kill dusk_beetle 0/250 (250) | combat 50; transition → Sandwhisper Isle: 1,000 gold boat each way — no farmable set wins by Lv 50; with any special item: Lv 42; guess 300 s / no farmable set wins by Lv 50; with any special item: Lv 40; guess 300 s / special gear, win but never safe; atlas kill.sec 372 / special gear, win but never safe; atlas kill.sec 325 | account-wide, all characters add up (docs) | 1,000 · 90 · yes | time only | cannot — no `transition` queue item |
| arachnophobia_conquered | Arachnophobia Conquered | 2 | combat_kill spider 0/1000 (1,000) | combat 25 — plus gear, safe; atlas kill.sec 112 | account-wide, all characters add up (docs) | 1,000 · 31 · yes | time only | by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster |
| around_the_world | Around The World | 5 | combat_kill king_slime 0/1 (1)<br>combat_kill lich 0/1 (1)<br>combat_kill goblin_priestess 0/1 (1)<br>combat_kill rosenblood 0/1 (1)<br>combat_kill duskworm 0/1 (1)<br>combat_kill sandwhisper_empress 0/1 (1) | combat 50; woodcutting 40; gearcrafting 40; event: cult_of_darkness, out_of_the_ground; boss: group of three; transition → Lich Tomb (underground); gate: lich_tomb_key (consumed); transition → Mine (underground); gate: priestess_hideout_key (consumed); transition → Rosenblood House (interior); gate: carry cultist_cloak; gate: achievement clean_the_lab; raid: enchanted_fairy (pixie); transition → Sandwhisper Isle: 1,000 gold boat each way; gate: sandwhisper_key (consumed) — plus gear, safe; solo sim, a group of three is not modelled; guess 3×600 s / no farmable set wins by Lv 50; with any special item: Lv 45; solo sim, a group of three is not modelled; guess 3×600 s / no farmable set wins by Lv 50; with any special item: Lv 40; solo sim, a group of three is not modelled; guess 3×600 s / no farmable set wins by Lv 50; with any special item: Lv 50; solo sim, a group of three is not modelled; guess 3×600 s | account-wide, all characters add up (docs); whether each of the three gets kill credit is not stated | unknown (raid) · split needs three at once | 3.0 lich_tomb_key, 3.0 priestess_hideout_key, 6.0 enchanted_coin, 3.0 sandwhisper_key | cannot — the boss is behind a transition; then by hand |
| blood_of_the_cursed | Blood of the Cursed | 3 | combat_kill rosenblood 0/1 (1) | combat 50; woodcutting 40; gearcrafting 40; event: cult_of_darkness; transition → Rosenblood House (interior); gate: carry cultist_cloak; gate: achievement clean_the_lab; raid: enchanted_fairy (pixie); boss: group of three — no farmable set wins by Lv 50; with any special item: Lv 40; solo sim, a group of three is not modelled; guess 3×600 s | account-wide, all characters add up (docs); whether each of the three gets kill credit is not stated | unknown (raid) · split needs three at once | 6.0 enchanted_coin | cannot — the boss is behind a transition; then by hand |
| clean_the_lab | Clean the lab | 3 | combat_kill cultist_alchemist 0/100 (100) | combat 45; woodcutting 40; gearcrafting 40; event: cult_of_darkness; transition → Rosenblood House (interior); gate: carry cultist_cloak; raid: enchanted_fairy (pixie) — special gear, safe; atlas kill.sec 150 | account-wide, all characters add up (docs) | unknown (raid) · split yes | 6.0 enchanted_coin | cannot — no `transition` queue item |
| closing_the_gate | Closing The Gate | 4 | combat_kill demon 0/500 (500)<br>combat_kill imp 0/500 (500)<br>combat_kill efreet_sultan 0/500 (500)<br>combat_kill grimlet 0/500 (500) | combat 45; event: portal_demon, portal_efreet_sultan, corrupted_portal — special gear, safe; atlas kill.sec 205 / plus gear, safe; atlas kill.sec 134 / special gear, win but never safe; atlas kill.sec 405 / special gear, win but never safe; atlas kill.sec 279 | account-wide, all characters add up (docs) | 2,000 · 142 · yes | time only | by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster |
| cult_destroyer | Cult Destroyer | 2 | combat_kill cultist_emperor 0/1 (1) | combat 40; event: cult_of_darkness — special gear, safe; atlas kill.sec 183 | account-wide, all characters add up (docs) | 1 · 0.1 · yes | time only | auto — event standing order: ONE free character, safe wins only, while the event is up |
| cultist_purifier | Cultist Purifier | 4 | combat_kill cultist_acolyte 0/500 (500) | combat 32 — special gear, safe; atlas kill.sec 219 | account-wide, all characters add up (docs) | 500 · 30 · yes | time only | by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster |
| feather_me_impressed | Feather Me Impressed | 1 | combat_kill chicken 1000/1000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| highway_patrol | Highway Patrol | 2 | combat_kill highwayman 599/1000 (401) | combat 10 — plus gear, safe; atlas kill.sec 83 | account-wide, all characters add up (docs) | 401 · 9.2 · yes | time only | by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster |
| i_want_bacon | I want bacon! | 2 | combat_kill pig 24/1000 (976) | combat 15 — plus gear, safe; atlas kill.sec 103 | account-wide, all characters add up (docs) | 976 · 28 · yes | time only | by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster |
| in_every_color | In every color | 1 | combat_kill red_slime 50/50 (0)<br>combat_kill blue_slime 50/50 (0)<br>combat_kill yellow_slime 50/50 (0)<br>combat_kill green_slime 50/50 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| king_of_the_forest | King of the Forest | 2 | combat_kill wolf 100/100 (0)<br>combat_kill flying_snake 100/100 (0)<br>combat_kill mushmush 100/100 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| king_of_the_sun | King of the Sun | 5 | combat_kill sonnengott 0/100 (100) | raid: sonnengott (Lv 55) | account-wide, all characters add up (docs); what counts as a raid "kill" is unknown | unknown (raid) · split unknown | time only | cannot — raid fights: the tile's content is `raid`, no queue item fights it |
| lich_please | Lich Please! | 2 | combat_kill lich 0/1 (1) | combat 50; transition → Lich Tomb (underground); gate: lich_tomb_key (consumed); boss: group of three — no farmable set wins by Lv 50; with any special item: Lv 45; solo sim, a group of three is not modelled; guess 3×600 s | account-wide, all characters add up (docs); whether each of the three gets kill credit is not stated | 1 · 0.6 · needs three at once | 3.0 lich_tomb_key | cannot — the boss is behind a transition; then by hand |
| loktar_ogar | Lok'tar ogar! | 1 | combat_kill orc 0/500 (500) | combat 40 — special gear, safe; atlas kill.sec 174 | account-wide, all characters add up (docs) | 500 · 24 · yes | time only | by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster |
| queen_of_the_enchanted_forest | Queen of the Enchanted Forest | 3 | combat_kill pixie 0/75 (75) | raid: pixie (Lv 40) | account-wide, all characters add up (docs); what counts as a raid "kill" is unknown | unknown (raid) · split unknown | time only | cannot — raid fights: the tile's content is `raid`, no queue item fights it |
| sands_of_power | Sands of Power | 3 | combat_kill sandwhisper_empress 0/1 (1) | combat 50; transition → Sandwhisper Isle: 1,000 gold boat each way; gate: sandwhisper_key (consumed); boss: group of three — no farmable set wins by Lv 50; with any special item: Lv 50; solo sim, a group of three is not modelled; guess 3×600 s | account-wide, all characters add up (docs); whether each of the three gets kill credit is not stated | 1 · 0.6 · needs three at once | 3.0 sandwhisper_key | cannot — the boss is behind a transition; then by hand |
| secure_the_island | Secure the island | 3 | combat_kill sea_marauder 0/50 (50) | combat 50; event: attacking_the_island; transition → Sandwhisper Isle: 1,000 gold boat each way — no farmable set wins by Lv 50; with any special item: Lv 40; guess 300 s | account-wide, all characters add up (docs) | 50 · 4.2 · yes | time only | auto — event standing order: ONE free character, safe wins only, while the event is up |
| slimed_to_none | Slimed to None | 3 | combat_kill king_slime 0/1 (1) | combat 30; boss: group of three — plus gear, safe; solo sim, a group of three is not modelled; guess 3×600 s | account-wide, all characters add up (docs); whether each of the three gets kill credit is not stated | 1 · 0.5 · needs three at once | time only | by hand — Fleet → Group fight (Prepare, then Fight: one fight per click) |
| take_her_down | Take her down! | 2 | combat_kill goblin_priestess 0/1 (1) | combat 50; transition → Mine (underground); gate: priestess_hideout_key (consumed); boss: group of three — no farmable set wins by Lv 50; with any special item: Lv 40; solo sim, a group of three is not modelled; guess 3×600 s | account-wide, all characters add up (docs); whether each of the three gets kill credit is not stated | 1 · 0.6 · needs three at once | 3.0 priestess_hideout_key | cannot — the boss is behind a transition; then by hand |
| the_new_bandit | The New Bandit | 2 | combat_kill bandit_lizard 0/100 (100) | combat 30; event: bandit_camp — plus gear, safe; atlas kill.sec 114 | account-wide, all characters add up (docs) | 100 · 3.2 · yes | time only | auto — event standing order: ONE free character, safe wins only, while the event is up |
| the_reaper | The Reaper | 3 | combat_kill skeleton 0/250 (250)<br>combat_kill vampire 0/250 (250)<br>combat_kill death_knight 0/250 (250) | combat 30 — plus gear, safe; atlas kill.sec 71 / plus gear, safe; atlas kill.sec 120 / plus gear, safe; atlas kill.sec 124 | account-wide, all characters add up (docs) | 750 · 22 · yes | time only | by hand — `fight ×N` item (or a hive achievement goal); auto only while it is the training monster |
| the_worm_turns | The Worm Turns | 3 | combat_kill duskworm 0/1 (1) | combat 50; event: out_of_the_ground; transition → Sandwhisper Isle: 1,000 gold boat each way; boss: group of three — no farmable set wins by Lv 50; with any special item: Lv 45; solo sim, a group of three is not modelled; guess 3×600 s | account-wide, all characters add up (docs); whether each of the three gets kill credit is not stated | 1 · 0.5 · needs three at once | time only | cannot — the boss is behind a transition; then by hand |

### crafting (15 achievements, 32 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| adamantite_mastery | Adamantite Mastery | 1 | crafting adamantite_bar 0/500 (500) | mining 50; transition → Sandwhisper Isle: 1,000 gold boat each way — craft mining 50 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 5,500 · 76 · yes | time only | cannot — a material is behind a transition or a raid |
| alchemist | Alchemist | 2 | crafting small_health_potion 200/200 (0)<br>crafting minor_health_potion 0/200 (200)<br>crafting health_splash_potion 0/200 (200) | alchemy 30; fishing 1 — craft alchemy 20 / craft alchemy 30 | account-wide, all characters add up (docs)<br>account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 2,700 · 22 · yes | time only | by hand — `craft ×N` item with the materials banked (or a hive achievement goal: gather + craft) |
| cabinet_maker | Cabinet Maker | 1 | crafting hardwood_plank 56/300 (244)<br>crafting spruce_plank 300/300 (0)<br>crafting dead_wood_plank 0/300 (300) | woodcutting 30 — craft woodcutting 20 / craft woodcutting 30 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only)<br>account-wide, all characters add up (docs) | 5,984 · 61 · yes | time only | by hand — `craft ×N` item with the materials banked (or a hive achievement goal: gather + craft) |
| catch_and_cook | Catch and Cook | 2 | crafting cooked_bass 0/500 (500)<br>crafting cooked_salmon 0/500 (500)<br>crafting cooked_swordfish 0/500 (500) | fishing 50; cooking 50; transition → Sandwhisper Isle: 1,000 gold boat each way — craft cooking 30 / craft cooking 40 / craft cooking 50 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 3,000 · 23 · yes | time only | cannot — a material is behind a transition or a raid |
| crafted_with_honor | Crafted with Honor | 3 | crafting masterful_necklace 0/1 (1) | combat 50; mining 35; jewelrycrafting 35; event: strange_apparition; transition → Mine (underground); boss: group of three; goblin_priestess: guess 3×600 s; gate: priestess_hideout_key (consumed) — craft jewelrycrafting 35 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 2,949 · 51 · yes | 4.8 priestess_hideout_key, 24 tasks_coin | cannot — a material is behind a transition or a raid |
| cursed_wood_blessed_victory | Cursed Wood, Blessed Victory | 1 | crafting cursed_plank 0/50 (50) | combat 35; woodcutting 35 — craft woodcutting 35 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 2,550 · 154 · yes | time only | by hand — `craft ×N` item with the materials banked (or a hive achievement goal: gather + craft) |
| diamond_in_the_sky | Diamond In The Sky | 3 | crafting diamond 0/2 (2) | mining 35; event: strange_apparition — craft mining 35 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 4,802 · 61 · yes | time only | by hand — `craft ×N` item with the materials banked (or a hive achievement goal: gather + craft) |
| heartbound | Heartbound | 3 | crafting heart_amulet 0/1 (1) | combat 50; woodcutting 50; jewelrycrafting 50; event: corrupted_portal, out_of_the_ground; transition → Sandwhisper Isle: 1,000 gold boat each way; boss: group of three; duskworm: guess 3×600 s; sandwarden: guess 300 s — craft jewelrycrafting 50 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 257 · 23 · yes | time only | cannot — a material is behind a transition or a raid |
| magic_power | Magic Power | 3 | crafting magic_shield 0/1 (1) | combat 50; woodcutting 50; mining 50; gearcrafting 50; event: corrupted_portal, attacking_the_island; transition → Sandwhisper Isle: 1,000 gold boat each way; desert_scorpion: guess 300 s; fennec: guess 300 s; transition → Lava Underground (underground); gate: sonnengott_key (consumed); sea_marauder: guess 300 s — craft gearcrafting 50 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 5,027 · 91 · yes | 2.6 sonnengott_key | cannot — a material is behind a transition or a raid |
| making_a_nether_portal | Making a Nether portal | 2 | crafting obsidian_bar 0/250 (250) | combat 30; mining 30 — craft mining 30 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 33,583 · 1,241 · yes | time only | by hand — `craft ×N` item with the materials banked (or a hive achievement goal: gather + craft) |
| palm_paradise | Palm Paradise | 2 | crafting palm_plank 0/500 (500) | woodcutting 50; transition → Sandwhisper Isle: 1,000 gold boat each way — craft woodcutting 50 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 5,500 · 76 · yes | time only | cannot — a material is behind a transition or a raid |
| potion_brewer | Potion Brewer | 2 | crafting enhanced_health_potion 0/100 (100)<br>crafting enhanced_health_splash_potion 0/100 (100) | combat 1; alchemy 50; woodcutting 50; fishing 50; event: magic_apparition; transition → Enchanted Forest: 5,000 gold entry; transition → Sandwhisper Isle: 1,000 gold boat each way; transition → Lava Underground (underground) — craft alchemy 45 / craft alchemy 50 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 2,950 · 39 · yes | time only | cannot — a material is behind a transition or a raid |
| shining_secrets | Shining Secrets | 3 | crafting alexandrite 0/2 (2) | mining 50; transition → Sandwhisper Isle: 1,000 gold boat each way — craft mining 50 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 9,602 · 144 · yes | time only | cannot — a material is behind a transition or a raid |
| welcome_to_hell | Welcome to Hell | 3 | crafting hell_reaper 0/1 (1) | combat 45; mining 40; weaponcrafting 45; event: portal_efreet_sultan, corrupted_portal; transition → Mine (underground) — craft weaponcrafting 45 | account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 1,211 · 85 · yes | 24 page_from_hell | cannot — a material is behind a transition or a raid |
| worker | Worker | 1 | crafting iron_bar 300/300 (0)<br>crafting steel_bar 126/300 (174)<br>crafting gold_bar 0/300 (300) | mining 30; transition → Mine (underground) — craft mining 20 / craft mining 30 | account-wide, all characters add up (docs)<br>account-wide, all characters add up (docs); assumed: items produced (guess; snapshot shows whole hundreds only) | 5,214 · 55 · yes | time only | cannot — a material is behind a transition or a raid |

### combat_level (3 achievements, 6 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| adept | Adept | 2 | combat_level 0/25 (25) | combat 25 — levelling | unknown: one character at that level is assumed; progress stays 0 until it happens (snapshot: adept 0/25 with Lv 22) | levelling only — see E · split no | time only | auto — `train combat` (pins) |
| grand_master | Grand Master | 3 | combat_level 0/50 (50) | combat 50 — levelling | unknown: one character at that level is assumed; progress stays 0 until it happens (snapshot: adept 0/25 with Lv 22) | levelling only — see E · split no | time only | auto — `train combat` (pins) |
| novice | Novice | 1 | combat_level 10/10 (0) | done | account-wide, all characters add up (docs) | none | — | done |

### gathering (27 achievements, 36 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| amateur_alchemist | Amateur Alchemist | 1 | gathering sunflower 6000/6000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| amateur_fisherman | Amateur Fisherman | 1 | gathering gudgeon 6000/6000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| amateur_lumberjack | Amateur Lumberjack | 1 | gathering ash_wood 6000/6000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| amateur_miner | Amateur Miner | 1 | gathering copper_ore 6000/6000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| bite_oh_algae | Bite! Oh, algae! | 2 | gathering algae 2500/2500 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| expert_alchemist | Expert Alchemist | 1 | gathering glowstem_leaf 0/6000 (6,000) | alchemy 40 — gather glowstem | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 82 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| expert_fisherman | Expert Fisherman | 1 | gathering bass 0/6000 (6,000) | fishing 30 — gather bass_spot | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 73 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| expert_lumberjack | Expert Lumberjack | 1 | gathering dead_wood 0/6000 (6,000) | woodcutting 30 — gather dead_tree | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 73 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| expert_miner | Expert Miner | 1 | gathering gold_ore 0/6000 (6,000) | mining 30; transition → Mine (underground) — gather gold_rocks | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 73 · yes | time only | cannot — no `transition` queue item |
| fisherman | Fisherman | 1 | gathering shrimp 6000/6000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| intermediate_alchemist | Intermediate Alchemist | 1 | gathering nettle_leaf 0/6000 (6,000) | alchemy 20 — gather nettle | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 65 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| intermediate_fisherman | Intermediate Fisherman | 1 | gathering trout 0/6000 (6,000) | fishing 20 — gather trout_spot | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 65 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| intermediate_lumberjack | Intermediate Lumberjack | 1 | gathering birch_wood 957/6000 (5,043) | woodcutting 20 — gather birch_tree | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 5,043 · 55 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| intermediate_miner | Intermediate Miner | 1 | gathering coal 3800/6000 (2,200) | mining 20 — gather coal_rocks | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 2,200 · 24 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| lumberjack | Lumberjack | 1 | gathering spruce_wood 6000/6000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| magic_harvester | Magic Harvester | 3 | gathering magic_sap 0/500 (500) | woodcutting 35; event: magic_apparition — gather magic_tree 1/10 | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 5,000 · 64 · yes | time only | auto — event standing order: ONE character (the highest skill) gathers while it is up |
| magic_lumberjack | Magic Lumberjack | 2 | gathering magic_wood 0/3000 (3,000) | woodcutting 35; event: magic_apparition — gather magic_tree | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 3,000 · 38 · yes | time only | auto — event standing order: ONE character (the highest skill) gathers while it is up |
| master_alchemist | Master Alchemist | 2 | gathering torch_cactus_flower 0/6000 (6,000) | alchemy 50; transition → Sandwhisper Isle: 1,000 gold boat each way — gather torch_cactus | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 90 · yes | time only | cannot — no `transition` queue item |
| master_fisherman | Master Fisherman | 2 | gathering swordfish 0/6000 (6,000) | fishing 50; transition → Sandwhisper Isle: 1,000 gold boat each way — gather swordfish_spot | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 90 · yes | time only | cannot — no `transition` queue item |
| master_lumberjack | Master Lumberjack | 2 | gathering palm_wood 0/6000 (6,000) | woodcutting 50; transition → Sandwhisper Isle: 1,000 gold boat each way — gather palm_tree | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 90 · yes | time only | cannot — no `transition` queue item |
| master_miner | Master Miner | 2 | gathering adamantite_ore 0/6000 (6,000) | mining 50; transition → Sandwhisper Isle: 1,000 gold boat each way — gather adamantite_rocks | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 90 · yes | time only | cannot — no `transition` queue item |
| miner | Miner | 1 | gathering iron_ore 6000/6000 (0) | done | account-wide, all characters add up (docs) | none | — | done |
| pearl_fisher | Pearl Fisher | 1 | gathering small_pearls 0/500 (500) | fishing 40 — gather salmon_spot 1/100 | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 50,000 · 681 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| professional_fisherman | Professional Fisherman | 1 | gathering salmon 0/6000 (6,000) | fishing 40 — gather salmon_spot | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 82 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| professional_lumberjack | Professional Lumberjack | 1 | gathering maple_wood 0/6000 (6,000) | woodcutting 40 — gather maple_tree | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 82 · yes | time only | by hand — `gather ×N` item (or a hive achievement goal); auto only while it is the training node |
| professional_miner | Professional Miner | 1 | gathering mithril_ore 0/6000 (6,000) | mining 40; transition → Mine (underground) — gather mithril_rocks | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 6,000 · 82 · yes | time only | cannot — no `transition` queue item |
| strange_miner | Strange Miner | 2 | gathering strange_ore 0/3000 (3,000) | mining 35; event: strange_apparition — gather strange_rocks | account-wide, all characters add up (docs); items received, not actions (snapshot: algae 2500/2500 from a 1/10 drop) | 3,000 · 38 · yes | time only | auto — event standing order: ONE character (the highest skill) gathers while it is up |

### use (4 achievements, 10 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| art_of_teleportation | Art of teleportation | 2 | use recall_potion 0/100 (100)<br>use forest_bank_potion 0/100 (100)<br>use enchanted_potion 0/100 (100)<br>use sandwhisper_potion 0/100 (100) | alchemy 50; fishing 50; transition → Enchanted Forest: 5,000 gold entry; transition → Sandwhisper Isle: 1,000 gold boat each way; gate: achievement secure_the_island — craft alchemy 5 / craft alchemy 20 / craft alchemy 40 / craft alchemy 50 | account-wide, all characters add up (docs); assumed: units used (guess) | 1,000 · 5.4 · yes | time only | cannot — no `use` queue item for potions |
| carnivore | Carnivore | 2 | use cooked_chicken 100/100 (0)<br>use cooked_beef 100/100 (0)<br>use cooked_wolf_meat 100/100 (0)<br>use cooked_rat_meat 0/100 (100)<br>use cooked_hellhound_meat 0/100 (100)<br>use cooked_desert_scorpion_meat 0/100 (100) | combat 50; cooking 50; transition → Abandoned House (interior); desert_scorpion: guess 300 s; transition → Sandwhisper Isle: 1,000 gold boat each way — craft cooking 30 / craft cooking 40 / craft cooking 50 | account-wide, all characters add up (docs)<br>account-wide, all characters add up (docs); assumed: units used (guess) | 1,200 · 34 · yes | time only | auto, but not aimed — no `use` item: a hurt fighter eats it only when it is the best food at hand |
| eat_the_forbidden_fruit | Eat the forbidden fruit | 3 | use corrupted_fruit 0/100 (100) | combat 45; event: corrupted_portal — cultist_wizard: 1 corrupted_gem | account-wide, all characters add up (docs); assumed: units used (guess) | 450 · 19 · yes | 100 corrupted_gem | auto, but not aimed — no `use` item: a hurt fighter eats it only when it is the best food at hand |
| gourmet_chef | Gourmet Chef | 3 | use fish_soup 0/300 (300)<br>use cheese 300/300 (0)<br>use mushroom_soup 179/300 (121)<br>use apple_pie 2/300 (298) | combat 40; fishing 40; cooking 40 — craft cooking 40 / craft cooking 15 / craft cooking 20 | account-wide, all characters add up (docs); assumed: units used (guess)<br>account-wide, all characters add up (docs) | 9,389 · 103 · yes | time only | auto, but not aimed — no `use` item: a hurt fighter eats it only when it is the best food at hand |

### combat_drop (8 achievements, 32 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| coin_collector | Coin Collector | 4 | combat_drop sandwhisper_coin 0/500 (500) | combat 50; sandwarden: guess 300 s; transition → Sandwhisper Isle: 1,000 gold boat each way — sandwarden 1/50 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | 16,667 · 1,389 · yes | time only | cannot — the source is behind a transition |
| corruption_eradicator | Corruption Eradicator | 4 | combat_drop corrupted_gem 0/800 (800) | combat 45; event: corrupted_portal — grimlet 1/5 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | 2,000 · 155 · yes | time only | auto — event standing order: ONE free character, safe wins only |
| draconic_harvest | Draconic Harvest | 4 | combat_drop dragon_bone 0/250 (250)<br>combat_drop baby_red_dragon_scale 0/100 (100)<br>combat_drop red_dragon_scale 0/100 (100) | combat 50; event: small_becomes_great; baby_red_dragon: guess 300 s; transition → Lava Underground (underground); red_dragon: guess 300 s — baby_red_dragon 1/20 / baby_red_dragon 1/10 / red_dragon 1/10 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | 7,000 · 583 · yes | time only | cannot — the source is behind a transition |
| elementary_book | Elementary Book | 4 | combat_drop elemental_page 0/30 (30) | combat 50; woodcutting 40; gearcrafting 40; boss: group of three; rosenblood: guess 3×600 s; transition → Rosenblood House (interior); gate: carry cultist_cloak; gate: achievement clean_the_lab; raid: enchanted_fairy (pixie) — rosenblood 1/50 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | unknown (raid) · split groups of three | time only | cannot — the source is behind a transition |
| its_malefic | Its Malefic! | 4 | combat_drop malefic_shard 0/24 (24) | combat 40; event: cult_of_darkness — cultist_emperor 1/50 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | 1,200 · 61 · yes | time only | auto — event standing order: ONE free character, safe wins only |
| king_of_the_goblins | King of the Goblins | 3 | combat_drop goblin_tooth 0/30 (30)<br>combat_drop goblin_eye 0/30 (30)<br>combat_drop wolfrider_hair 0/25 (25)<br>combat_drop broken_sword 0/10 (10)<br>combat_drop wolfrider_ponytail 0/25 (25)<br>combat_drop goblin_guard_foot 0/30 (30) | combat 40; transition → Mine (underground) — goblin 1/12 / goblin_wolfrider 1/12 / goblin_wolfrider 1/16 / goblin_wolfrider 1/6 / goblin_guard 1/10 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | 1,190 · 45 · yes | time only | cannot — the source is behind a transition |
| life_lover | Life Lover | 4 | combat_drop life_crystal_shard 0/24 (24) | combat 50; boss: group of three; lich: guess 3×600 s; transition → Lich Tomb (underground); gate: lich_tomb_key (consumed) — lich 1/50 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | 1,200 · 666 · groups of three | 144 lich_tomb_key | cannot — the source is behind a transition |
| secrets_in_the_sand | Secrets in the Sand | 5 | combat_drop codex_page 0/24 (24) | combat 50; boss: group of three; sandwhisper_empress: guess 3×600 s; transition → Sandwhisper Isle: 1,000 gold boat each way; gate: sandwhisper_key (consumed) — sandwhisper_empress 1/50 | account-wide, all characters add up (docs); assumed: items dropped, not kills (guess) | 1,200 · 760 · groups of three | 144 sandwhisper_key | cannot — the source is behind a transition |

### recycling (2 achievements, 5 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| ecologist | Ecologist | 1 | recycling 515/1000 (485) | nothing — craft + recycle copper_axe | account-wide, all characters add up (docs); assumed: items recycled (guess) | 32,980 · 248 · yes | time only | auto inside craft training (every trained product is recycled); by hand — `recycle ×N` item |
| the_planet_thanks_you | The planet thanks you | 4 | recycling 515/2500 (1,985) | nothing — craft + recycle copper_axe | account-wide, all characters add up (docs); assumed: items recycled (guess) | 134,980 · 1,015 · yes | time only | auto inside craft training (every trained product is recycled); by hand — `recycle ×N` item |

### npc_buy (3 achievements, 10 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| sandwhispers_hidden_treasure | Sandwhisper's Hidden Treasure | 4 | npc_buy sandwhisper_bag 0/1 (1) | combat 50; sandwarden: guess 300 s; transition → Sandwhisper Isle: 1,000 gold boat each way; transition → Sandwhisper Isle — sandwhisper_trader: 230 sandwhisper_coin each | account-wide, all characters add up (docs); assumed: units bought (snapshot: 24/25) | 7,668 · 639 · yes | 230 sandwhisper_coin | cannot — the trader is behind a transition |
| tanners_exchange | Tanner's Exchange | 2 | npc_buy hard_leather 24/25 (1)<br>npc_buy snakeskin 25/25 (0) | combat 10 — tailor: 3 cowhide each | account-wide, all characters add up (docs); assumed: units bought (snapshot: 24/25)<br>account-wide, all characters add up (docs) | 17 · 0.3 · yes | 3.0 cowhide | by hand — `buy` item with the currency in the bag (the hive's achievement goal handles gold offers only) |
| ultimate_rune | Ultimate Rune | 4 | npc_buy powerful_rune 0/1 (1) | raid: god_of_the_sun (sonnengott); transition → Lava Underground — sorceress: 150 sonnengott_coin each | account-wide, all characters add up (docs); assumed: units bought (snapshot: 24/25) | unknown (raid) · split yes | 150 sonnengott_coin | cannot — the currency comes from a raid |

### task (2 achievements, 6 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| tasks_coins_fan | Tasks Coins Fan | 5 | task 403/1000 (597) | nothing — log: 1.95 h per task | account-wide, all characters add up (docs); tasks completed | 139,698 · 1,164 · yes | time only | by hand — `task-loop ×0` item runs forever once queued |
| tasks_farmer | Tasks Farmer | 1 | task 100/100 (0) | done | account-wide, all characters add up (docs) | none | — | done |

### npc_sell (1 achievements, 2 points)

| code | name | pts | objectives: progress/total (left) | needs before work can start | how progress counts | work left: actions · char-h · split | costs besides time | client today |
|---|---|---|---|---|---|---|---|---|
| turning_treasures_to_gold | Turning Treasures to Gold | 2 | npc_sell golden_egg 3/5 (2)<br>npc_sell golden_shrimp 5/5 (0) | combat 1; event: nomadic_merchant — chicken 1/1000 | account-wide, all characters add up (docs); units sold (snapshot: 3/5)<br>account-wide, all characters add up (docs) | 2,000 · 24 · yes | time only | auto — the event standing order sells it when the merchant spawns; getting the item is luck (1/1000 per kill) |

## D. Dependencies and order

### The gates, as a graph

Read top to bottom; a line can start once the line above its indent is met. `*` needs a transition to another map
layer, `†` is on Sandwhisper Isle (a boat, 1,000 gold each way), `⚡` exists only during an event. Sources: data
(`maps.json`, `resources.json`, `monsters.json`, `items.json`), atlas (`monsters[].minLevel`).

```
today: combat 20–22, skills 16–26
├─ no combat gate
│   ├─ favors: 3 offerings per character per day → a_helping_hand (17 left) → a_favored_champion (467 left)
│   ├─ tasks: tasks_coins_fan (597 left)
│   ├─ recycling: ecologist (485 left) → the_planet_thanks_you (1,985 left), one counter
│   ├─ mining      20 coal → 30 gold ore*, gold bars → 35 strange ore⚡ (diamonds) → 40 mithril* → 50 adamantite*† (bars, alexandrite)
│   ├─ woodcutting 20 birch → 30 dead wood (planks) → 35 magic tree⚡ (wood, sap) → 40 maple → 50 palm† (planks)
│   ├─ fishing     20 trout → 30 bass → 40 salmon (pearls) → 50 swordfish†
│   └─ alchemy     20 nettle → 30 splash potions → 40 glowstem → 45–50 enhanced potions (magic sap⚡, palm†, lava fish*) → 50 torch cactus†
├─ combat 25: adept (rings of the adept) · spiders
├─ combat 30: king slime (boss, group) · skeletons, vampires, death knights (the_reaper → 10 lich keys)
│             · imps (obsidian) · bandit lizards⚡
├─ combat 32–35: cultist acolytes · cursed trees (cursed planks, with woodcutting 35)
├─ combat 40: orcs · goblins, wolfriders, goblin guards* (king_of_the_goblins → 10 priestess keys)
│             · cultist emperor⚡ (malefic cloth and shards) · eating fish soup (the item needs level 40)
├─ combat 45: demons⚡, imps, efreets⚡, grimlets⚡ (closing_the_gate → book from hell → hell reaper, weaponcrafting 45)
│             · grimlets⚡ → corrupted gems → corrupted fruit
│             · Rosenblood House: every fighter carries a cultist cloak = gearcrafting 40 + malefic cloth⚡
│               + enchanted fabric ← enchanted coins ← RAID → cultist alchemists → clean_the_lab → rosenblood (boss)
└─ combat 50 (the atlas finds no farmable set for any of these)
    ├─ Sandwhisper Isle†: sandwardens, scorpions, sand snakes, dusk beetles* · sea marauders⚡ → secure_the_island
    │   → the island's bank and the sandwhisper potion · sandwhisper key → empress (boss) · duskworm⚡ (boss)
    ├─ lava underground*: baby dragons → sonnengott keys → fennecs, flameches · red dragons⚡
    ├─ lich (boss, lich tomb key*) · goblin priestess (boss, hideout key*)
    └─ level-50 crafts: magic shield (gearcrafting 50), heart amulet (jewelrycrafting 50)
raids (rules unknown): enchanted fairy = pixie (Sundays; inside the Enchanted Forest, 5,000 gold entry) → enchanted coins
                       god of the sun = sonnengott (lava underground*) → sonnengott coins → powerful rune (150)
```

### Overlap

- **One counter, two achievements** (api: the same objective type and target): favors (50 → 500), recycling
  (1,000 → 2,500), tasks (100 → 1,000), each boss kill and Around The World. E counts them once.
- **One action, several objectives** (data: drop tables). A gather rolls every drop of its node, so 5,000 gathers
  at the magic tree give the 500 magic sap and the 3,000 magic wood together; 9,600 gathers at adamantite rocks
  give the alexandrite stones, the 6,000 ore and the 5,000 ore for bars; salmon fishing for pearls covers the
  salmon. A kill counts for a kill objective and rolls its drops: 500 grimlets for Closing The Gate are 500 of the
  2,000 that Corruption Eradicator needs.
- **Drops that pay for a purchase or a use.** The 800 corrupted gems and the 500 sandwhisper coins are counted when
  they drop, and can then be spent: 100 gems buy the 100 corrupted fruit, 230 coins buy the Sandwhisper bag.
- **Rewards that feed another achievement** (data: `achievements.json`; the costs in C do not count them):
  strange_miner pays 12 diamond stones and master_miner 12 alexandrite stones, a quarter each of the 48 that two
  gems need; the_reaper pays 10 lich keys, king_of_the_goblins 10 priestess keys, a_peaceful_island 10 and
  secure_the_island 4 sandwhisper keys, draconic_harvest 5 sonnengott keys; cult_destroyer pays one malefic cloth
  (a cloak needs two); closing_the_gate pays the book from hell that the hell reaper needs.
- **Paid by levelling.** The first table below sets the kills and gathers of the atlas's levelling road against
  the objectives that count them. Levelling pays in full for the pigs, the imps and six of the gathering
  achievements, and for most of four more.
- **Work with no other use**: tasks (1,164 char-h), recycling beyond what craft training produces (up to 1,015),
  obsidian bars (1,241), pearls (575 after the salmon), and everything that is 1,200 or more kills of one boss.

script output:

Kills and gathers the atlas's levelling road to 50 does anyway (five characters' combat, one specialist per gathering skill), against the objectives that count them:

| achievement | objective | actions left | paid by levelling | share |
|---|---|---|---|---|
| closing_the_gate | combat_kill imp 0/500 | 500 | 500 | 100% |
| expert_alchemist | gathering glowstem_leaf 0/6000 | 6,000 | 6,000 | 100% |
| expert_fisherman | gathering bass 0/6000 | 6,000 | 6,000 | 100% |
| expert_lumberjack | gathering dead_wood 0/6000 | 6,000 | 6,000 | 100% |
| expert_miner | gathering gold_ore 0/6000 | 6,000 | 6,000 | 100% |
| i_want_bacon | combat_kill pig 24/1000 | 976 | 976 | 100% |
| intermediate_alchemist | gathering nettle_leaf 0/6000 | 6,000 | 5,323 | 89% |
| intermediate_fisherman | gathering trout 0/6000 | 6,000 | 4,667 | 78% |
| intermediate_lumberjack | gathering birch_wood 957/6000 | 5,043 | 4,393 | 87% |
| intermediate_miner | gathering coal 3800/6000 | 2,200 | 2,200 | 100% |
| king_of_the_goblins | combat_drop wolfrider_hair 0/25 | 200 | 200 | 100% |
| king_of_the_goblins | combat_drop broken_sword 0/10 | 160 | 160 | 100% |
| king_of_the_goblins | combat_drop wolfrider_ponytail 0/25 | 150 | 150 | 100% |
| pearl_fisher | gathering small_pearls 0/500 | 50,000 | 7,771 | 16% |
| professional_fisherman | gathering salmon 0/6000 | 6,000 | 6,000 | 100% |
| professional_lumberjack | gathering maple_wood 0/6000 | 6,000 | 6,000 | 100% |
| professional_miner | gathering mithril_ore 0/6000 | 6,000 | 6,000 | 100% |

### Gates: combat level

| combat level needed | open achievements | points | fleet levelling to the top of the band, char-h from today (atlas: five characters + gear crafting) |
|---|---|---|---|
| none | a_favored_champion, a_helping_hand, adamantite_mastery, alchemist, art_of_teleportation, cabinet_maker, catch_and_cook, diamond_in_the_sky, ecologist, expert_alchemist, expert_fisherman, expert_lumberjack, expert_miner, intermediate_alchemist, intermediate_fisherman, intermediate_lumberjack, intermediate_miner, king_of_the_sun, magic_harvester, magic_lumberjack, master_alchemist, master_fisherman, master_lumberjack, master_miner, palm_paradise, pearl_fisher, professional_fisherman, professional_lumberjack, professional_miner, queen_of_the_enchanted_forest, shining_secrets, strange_miner, tasks_coins_fan, the_planet_thanks_you, ultimate_rune, worker | 72 | 0 |
| 1–22 | highway_patrol, i_want_bacon, potion_brewer, tanners_exchange, turning_treasures_to_gold | 10 | 22 |
| 23–25 | adept, arachnophobia_conquered | 4 | 595 |
| 26–30 | making_a_nether_portal, slimed_to_none, the_new_bandit, the_reaper | 10 | 1,641 |
| 31–35 | cultist_purifier, cursed_wood_blessed_victory | 5 | 4,400 |
| 36–40 | cult_destroyer, gourmet_chef, its_malefic, king_of_the_goblins, loktar_ogar | 13 | 8,976 |
| 41–45 | clean_the_lab, closing_the_gate, corruption_eradicator, eat_the_forbidden_fruit, welcome_to_hell | 17 | 37,866 |
| 46–50 | a_peaceful_island, around_the_world, blood_of_the_cursed, carnivore, coin_collector, crafted_with_honor, draconic_harvest, elementary_book, grand_master, heartbound, lich_please, life_lover, magic_power, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, take_her_down, the_worm_turns | 64 | 38,192 |

### Gates: skills

| skill | best in the fleet today | level needed → open achievements | one specialist to 50, char-h (atlas) |
|---|---|---|---|
| mining | 24 | 20: intermediate_miner<br>30: expert_miner, making_a_nether_portal, worker<br>35: crafted_with_honor, diamond_in_the_sky, strange_miner<br>40: professional_miner, welcome_to_hell<br>50: adamantite_mastery, magic_power, master_miner, shining_secrets | 260 |
| woodcutting | 21 | 20: intermediate_lumberjack<br>30: cabinet_maker, expert_lumberjack<br>35: cursed_wood_blessed_victory, magic_harvester, magic_lumberjack<br>40: around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, professional_lumberjack<br>50: heartbound, magic_power, master_lumberjack, palm_paradise, potion_brewer | 240 |
| fishing | 19 | 1: alchemist<br>20: intermediate_fisherman<br>30: expert_fisherman<br>40: gourmet_chef, pearl_fisher, professional_fisherman<br>50: art_of_teleportation, catch_and_cook, master_fisherman, potion_brewer | 247 |
| alchemy | 18 | 20: intermediate_alchemist<br>30: alchemist<br>40: expert_alchemist<br>50: art_of_teleportation, master_alchemist, potion_brewer | 236 |
| weaponcrafting | 20 | 45: welcome_to_hell | 15,488 |
| gearcrafting | 21 | 40: around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book<br>50: magic_power | 12,306 |
| jewelrycrafting | 20 | 35: crafted_with_honor<br>50: heartbound | 50,829 |
| cooking | 26 | 40: gourmet_chef<br>50: carnivore, catch_and_cook | 29 |

### Rewards that open or pay for something

| achievement | state | reward items |
|---|---|---|
| a_favored_champion | open | 5 altar_totem |
| a_helping_hand | open | 5 altar_doll |
| a_peaceful_island | open | 10 sandwhisper_key |
| adept | open | 6 ring_of_the_adept |
| alchemist | open | 50 greater_health_potion |
| arachnophobia_conquered | open | 20 antidote |
| blood_of_the_cursed | open | 1 rosenblood_elixir |
| carnivore | open | 100 cooked_desert_scorpion_meat |
| clean_the_lab | open | 5 dark_essence, 5 cursed_flask |
| closing_the_gate | open | 1 book_from_hell |
| corruption_eradicator | open | 10 diabolic_elixir |
| cult_destroyer | open | 1 malefic_cloth |
| cultist_purifier | open | 10 corrupted_stone, 5 cursed_book |
| draconic_harvest | open | 5 sonnengott_key |
| eat_the_forbidden_fruit | open | 50 corrupted_gem |
| feather_me_impressed | done | 2 golden_egg |
| gourmet_chef | open | 100 maple_syrup |
| grand_master | open | 5 amulet_of_the_grand_master |
| highway_patrol | open | 12 green_cloth |
| i_want_bacon | open | 12 pig_skin |
| in_every_color | done | 10 apple |
| king_of_the_forest | done | 10 wolf_bone, 10 wolf_hair, 10 mushroom, 10 flying_wing, 10 snake_hide |
| king_of_the_goblins | open | 10 priestess_hideout_key |
| king_of_the_sun | open | 5 sonnengott_coin |
| lich_please | open | 1 lich_crown |
| loktar_ogar | open | 10 orc_bone, 10 orc_skin |
| magic_lumberjack | open | 25 magic_sap |
| master_lumberjack | open | 15 coconut |
| master_miner | open | 12 alexandrite_stone |
| novice | done | 5 novice_guide |
| potion_brewer | open | 25 enhanced_health_splash_potion, 25 enhanced_health_potion |
| queen_of_the_enchanted_forest | open | 5 enchanted_coin |
| sands_of_power | open | 10 sandwhisper_coin |
| secure_the_island | open | 4 sandwhisper_key, 6 sandwhisper_coin |
| slimed_to_none | open | 3 king_slimeball |
| strange_miner | open | 12 diamond_stone |
| take_her_down | open | 1 priestess_orb |
| tanners_exchange | open | 10 vermin_leather |
| tasks_coins_fan | open | 40 tasks_coin |
| tasks_farmer | done | 20 tasks_coin |
| the_new_bandit | open | 12 lizard_eye, 12 lizard_skin |
| the_reaper | open | 10 lich_tomb_key |
| the_worm_turns | open | 3 duskworm_skin, 3 adventurer_skull |

### The order the dependencies force

1. **Favors start now and never stop.** The cap is 15 a day for the fleet, so the 467 left take 31 days at the
   least (docs: https://docs.artifactsmmo.com/concepts/seasonal_altar/). The first 17 pay the altar dolls (−10%
   gather and craft cooldown), which belong before the big gathering.
2. **A skill before its node, a level before its monster.** Within one skill the nodes come in level order, and
   each 6,000-gather achievement is most of the levelling to the next node.
3. **Transitions before anything underground or overseas**: gold ore (mining 30) is the first node behind one.
4. **Secure the island before long work on it.** Until then the island's bank is closed, and every full bag is a
   boat trip both ways (2,000 gold). Secure the island needs sea marauders (level 45, event).
5. **Keys before bosses, and the achievements that pay keys before the boss farming**: the_reaper before the lich,
   king_of_the_goblins before the priestess, a_peaceful_island before the empress.
6. **The cultist cloak before the Rosenblood House**, and so a raid before clean_the_lab, rosenblood, Elementary
   Book and Around The World.
7. **clean_the_lab before rosenblood** (the tile is gated on it; data: `maps.json`).
8. **closing_the_gate before the hell reaper** (the book from hell), **strange_miner and master_miner before the
   gems** (their reward stones).
9. **Event work starts on the first spawn after its gate is met**; a missed spawn is a day or more lost.

Free choices: the order among the four gathering chains and who specialises in what; when the tasks are done (no
gate, 1.95 hours each); whether gold replaces work (G); whether Around The World is attempted at all.

## E. Is it reachable?

### The fleet's pace, measured

From `logs/dev.log`, lines from 2026-11-03 00:00 UTC to 2026-11-18 13:33 UTC — all of this season's play that the
log holds (it has nothing between 2026-07-15 and 2026-11-03). Method: every line `api POST /my/<character>/action/…
-> ok` is one successful action. For each character, the time between two consecutive successful actions counts as
running when it is under 10 minutes and as idle otherwise (the threshold of `docs/audit/code-audit.md` G.5).

| measure | value |
|---|---|
| successful actions | 215,212 |
| running time | 1,583.8 character-hours |
| idle time (gaps of 10 minutes or more) | 229.8 character-hours |
| share of the time the queues ran | 87.3% (94.3% from 2026-11-08 on) |
| actions per running character-hour | 135.9 (per character 134–138) |
| seconds per gather, with moves and bank trips | 30.6 (136,093 gathers, nodes of level 1–20) |
| seconds per fight, with rest, food and bank trips | 51.9 (23,798 fights, monsters of level 1–19) |
| hours per completed task | 1.95 (783.8 running character-hours with a task-loop at the head of the queue, 402 tasks) |
| offerings completed | 31; on 2026-11-16, 17, 18: 8, 11, 10 (the cap is 15) |
| event spawns seen | 16 in the 26 hours after the poll went live; the rates predict 21 |

Time per gather and per fight is the running time split by the last productive action before it (fight, gather or
craft), divided by the count. The model uses the docs' gather formula (30–54 s by node level) and the atlas's kill
times (44–405 s) instead, because the log only covers nodes and monsters below level 20; at those levels the two
agree for gathers (30.6 s measured, 30–39 s by formula) and the atlas is slower than the log for fights.

### The whole road, three cases

- **As measured**: the queues run 87.3% of the time, the work is as modelled.
- **Never idle**: 100%.
- **Pessimistic**: 87.3%, and every piece of work takes 1.5 times as long (guess; it rests on the audit's finding
  that 53–88% of a day's actions were productive, and on a wolf lane that ran 130 s a fight against the atlas's 86).

"Points by" counts an achievement when its hours fit and its calendar floor does: the favor cap, or the spawns of
its events with all five characters on every one, counted from today. The raid-bound 27 points are in none of the
figures.

script output:

Pace (log, 2026-11-03 → 11-18): 136 actions per active character-hour; queues ran 87.3% of the time. One calendar day = 104.8 character-hours as measured, 120 never idle.

| case | whole costed road, char-h | fleet-hours (÷5) | calendar weeks of work | last achievement done | points by 2027-02-24 | points by 2027-03-06 | last free reward tier reached |
|---|---|---|---|---|---|---|---|
| as measured | 85,560 | 17,112 | 116.7 | 2029-02-12 | 101 | 101 | 100: small_bag_of_gems |
| never idle | 85,560 | 17,112 | 101.9 | 2028-10-31 | 105 | 105 | 105: season9_bronze |
| pessimistic (measured share, work × 1.5) | 128,339 | 25,668 | 175.0 | 2030-03-27 | 98 | 99 | 50: small_bag_of_gems |

Not costed (they need a raid, whose rules are unknown): around_the_world (5), blood_of_the_cursed (3), clean_the_lab (3), elementary_book (4), king_of_the_sun (5), queen_of_the_enchanted_forest (3), ultimate_rune (4) = 27 points. The most the costed road can reach is 183.

### The order by points per character-hour (levelling charged to the first achievement that needs it)

| # | achievement | pts | total | levelling char-h | own char-h | cumulative char-h | done by (measured) | done by (never idle) | done by (pessimistic) | calendar floor, days |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | tanners_exchange | 2 | 17 | 0 | 0 | 0 | 2026-11-18 | 2026-11-18 | 2026-11-18 | — |
| 2 | a_helping_hand | 2 | 19 | 0 | 6 | 6 | 2026-11-19 | 2026-11-19 | 2026-11-19 | 1.1 |
| 3 | highway_patrol | 2 | 21 | 0 | 9 | 15 | 2026-11-18 | 2026-11-18 | 2026-11-18 | — |
| 4 | turning_treasures_to_gold | 2 | 23 | 0 | 24 | 40 | 2026-11-18 | 2026-11-18 | 2026-11-19 | — |
| 5 | i_want_bacon | 2 | 25 | 0 | 28 | 68 | 2026-11-19 | 2026-11-19 | 2026-11-19 | — |
| 6 | intermediate_miner | 1 | 26 | 0 | 24 | 91 | 2026-11-19 | 2026-11-19 | 2026-11-19 | — |
| 7 | a_favored_champion | 4 | 30 | 0 | 150 | 241 | 2026-12-19 | 2026-12-19 | 2026-12-19 | 31.1 |
| 8 | alchemist | 2 | 32 | 66 | 22 | 330 | 2026-11-21 | 2026-11-21 | 2026-11-23 | — |
| 9 | intermediate_alchemist | 1 | 33 | 0 | 14 | 344 | 2026-11-21 | 2026-11-21 | 2026-11-23 | — |
| 10 | adept | 2 | 35 | 91 | 0 | 435 | 2026-11-22 | 2026-11-22 | 2026-11-24 | — |
| 11 | diamond_in_the_sky | 3 | 38 | 77 | 61 | 574 | 2026-12-07 | 2026-12-07 | 2026-12-07 | 18.6 |
| 12 | strange_miner | 2 | 40 | 0 | 38 | 612 | 2026-12-18 | 2026-12-18 | 2026-12-18 | 30.2 |
| 13 | expert_miner | 1 | 41 | 0 | 32 | 644 | 2026-11-24 | 2026-11-23 | 2026-11-27 | — |
| 14 | magic_harvester | 3 | 44 | 83 | 64 | 791 | 2026-12-07 | 2026-12-07 | 2026-12-07 | 19.4 |
| 15 | magic_lumberjack | 2 | 46 | 0 | 0 | 791 | 2026-12-19 | 2026-12-19 | 2026-12-19 | 31.0 |
| 16 | intermediate_lumberjack | 1 | 47 | 0 | 7 | 798 | 2026-11-26 | 2026-11-25 | 2026-11-29 | — |
| 17 | expert_lumberjack | 1 | 48 | 0 | 38 | 836 | 2026-11-26 | 2026-11-25 | 2026-11-30 | — |
| 18 | worker | 1 | 49 | 0 | 55 | 891 | 2026-11-27 | 2026-11-25 | 2026-12-01 | — |
| 19 | cabinet_maker | 1 | 50 | 0 | 61 | 953 | 2026-11-27 | 2026-11-26 | 2026-12-02 | — |
| 20 | intermediate_fisherman | 1 | 51 | 4 | 65 | 1,022 | 2026-11-28 | 2026-11-27 | 2026-12-03 | — |
| 21 | shining_secrets | 3 | 54 | 183 | 144 | 1,349 | 2026-12-01 | 2026-11-29 | 2026-12-07 | — |
| 22 | professional_miner | 1 | 55 | 0 | 0 | 1,349 | 2026-12-01 | 2026-11-29 | 2026-12-07 | — |
| 23 | master_miner | 2 | 57 | 0 | 90 | 1,439 | 2026-12-02 | 2026-11-30 | 2026-12-09 | — |
| 24 | adamantite_mastery | 1 | 58 | 0 | 76 | 1,514 | 2026-12-03 | 2026-12-01 | 2026-12-10 | — |
| 25 | palm_paradise | 2 | 60 | 157 | 76 | 1,747 | 2026-12-05 | 2026-12-03 | 2026-12-13 | — |
| 26 | professional_lumberjack | 1 | 61 | 0 | 0 | 1,747 | 2026-12-05 | 2026-12-03 | 2026-12-13 | — |
| 27 | master_lumberjack | 2 | 63 | 0 | 90 | 1,837 | 2026-12-06 | 2026-12-03 | 2026-12-14 | — |
| 28 | expert_fisherman | 1 | 64 | 51 | 73 | 1,961 | 2026-12-07 | 2026-12-04 | 2026-12-16 | — |
| 29 | catch_and_cook | 2 | 66 | 221 | 23 | 2,204 | 2026-12-09 | 2026-12-06 | 2026-12-20 | — |
| 30 | professional_fisherman | 1 | 67 | 0 | 0 | 2,204 | 2026-12-09 | 2026-12-06 | 2026-12-20 | — |
| 31 | master_fisherman | 2 | 69 | 0 | 90 | 2,294 | 2026-12-10 | 2026-12-07 | 2026-12-21 | — |
| 32 | potion_brewer | 2 | 71 | 170 | 39 | 2,503 | 2026-12-23 | 2026-12-23 | 2026-12-24 | 34.8 |
| 33 | expert_alchemist | 1 | 72 | 0 | 0 | 2,503 | 2026-12-12 | 2026-12-09 | 2026-12-24 | — |
| 34 | master_alchemist | 2 | 74 | 0 | 90 | 2,593 | 2026-12-13 | 2026-12-10 | 2026-12-25 | — |
| 35 | tasks_coins_fan | 5 | 79 | 0 | 1,164 | 3,757 | 2026-12-24 | 2026-12-19 | 2027-01-11 | — |
| 36 | ecologist | 1 | 80 | 0 | 248 | 4,005 | 2026-12-26 | 2026-12-21 | 2027-01-14 | — |
| 37 | the_planet_thanks_you | 4 | 84 | 0 | 767 | 4,772 | 2027-01-03 | 2026-12-28 | 2027-01-25 | — |
| 38 | arachnophobia_conquered | 2 | 86 | 504 | 31 | 5,307 | 2027-01-08 | 2027-01-01 | 2027-02-02 | — |
| 39 | cultist_purifier | 4 | 90 | 1,135 | 30 | 6,472 | 2027-01-19 | 2027-01-11 | 2027-02-19 | — |
| 40 | slimed_to_none | 3 | 93 | 0 | 1 | 6,473 | 2027-01-19 | 2027-01-11 | 2027-02-19 | — |
| 41 | the_new_bandit | 2 | 95 | 0 | 3 | 6,476 | 2027-01-19 | 2027-01-11 | 2027-02-19 | 0.5 |
| 42 | the_reaper | 3 | 98 | 0 | 22 | 6,498 | 2027-01-19 | 2027-01-11 | 2027-02-19 | — |
| 43 | pearl_fisher | 1 | 99 | 0 | 575 | 7,073 | 2027-01-25 | 2027-01-16 | 2027-02-27 | — |
| 44 | making_a_nether_portal | 2 | 101 | 0 | 1,241 | 8,314 | 2027-02-05 | 2027-01-26 | 2027-03-17 | — |
| 45 | gourmet_chef | 3 | 104 | 3,047 | 103 | 11,464 | 2027-03-07 | 2027-02-22 | 2027-05-01 | — |
| 46 | cursed_wood_blessed_victory | 1 | 105 | 0 | 154 | 11,617 | 2027-03-09 | 2027-02-23 | 2027-05-03 | — |
| 47 | its_malefic | 4 | 109 | 4,199 | 61 | 15,877 | 2027-04-19 | 2027-03-30 | 2027-07-03 | 18.5 |
| 48 | cult_destroyer | 2 | 111 | 0 | 0 | 15,877 | 2027-04-19 | 2027-03-30 | 2027-07-03 | 18.5 |
| 49 | king_of_the_goblins | 3 | 114 | 0 | 24 | 15,901 | 2027-04-19 | 2027-03-31 | 2027-07-04 | — |
| 50 | loktar_ogar | 1 | 115 | 0 | 24 | 15,925 | 2027-04-19 | 2027-03-31 | 2027-07-04 | — |
| 51 | secrets_in_the_sand | 5 | 120 | 29,216 | 760 | 45,902 | 2028-01-30 | 2027-12-06 | 2028-09-05 | — |
| 52 | grand_master | 3 | 123 | 0 | 0 | 45,902 | 2028-01-30 | 2027-12-06 | 2028-09-05 | — |
| 53 | sands_of_power | 3 | 126 | 0 | 0 | 45,902 | 2028-01-30 | 2027-12-06 | 2028-09-05 | — |
| 54 | the_worm_turns | 3 | 129 | 0 | 1 | 45,902 | 2028-01-30 | 2027-12-06 | 2028-09-05 | 0.2 |
| 55 | lich_please | 2 | 131 | 0 | 1 | 45,903 | 2028-01-30 | 2027-12-06 | 2028-09-05 | — |
| 56 | take_her_down | 2 | 133 | 0 | 1 | 45,903 | 2028-01-30 | 2027-12-06 | 2028-09-05 | — |
| 57 | secure_the_island | 3 | 136 | 0 | 4 | 45,907 | 2028-01-30 | 2027-12-06 | 2028-09-05 | 0.9 |
| 58 | art_of_teleportation | 2 | 138 | 0 | 5 | 45,913 | 2028-01-30 | 2027-12-06 | 2028-09-05 | — |
| 59 | eat_the_forbidden_fruit | 3 | 141 | 0 | 19 | 45,932 | 2028-01-31 | 2027-12-06 | 2028-09-06 | 5.9 |
| 60 | crafted_with_honor | 3 | 144 | 0 | 51 | 45,983 | 2028-01-31 | 2027-12-06 | 2028-09-06 | 30.3 |
| 61 | carnivore | 2 | 146 | 0 | 34 | 46,017 | 2028-01-31 | 2027-12-07 | 2028-09-07 | — |
| 62 | a_peaceful_island | 4 | 150 | 0 | 90 | 46,107 | 2028-02-01 | 2027-12-07 | 2028-09-08 | — |
| 63 | welcome_to_hell | 3 | 153 | 0 | 85 | 46,193 | 2028-02-02 | 2027-12-08 | 2028-09-09 | 29.4 |
| 64 | closing_the_gate | 4 | 157 | 0 | 123 | 46,316 | 2028-02-03 | 2027-12-09 | 2028-09-11 | 41.1 |
| 65 | corruption_eradicator | 4 | 161 | 0 | 116 | 46,432 | 2028-02-04 | 2027-12-10 | 2028-09-13 | 88.1 |
| 66 | draconic_harvest | 4 | 165 | 0 | 500 | 46,932 | 2028-02-09 | 2027-12-14 | 2028-09-20 | 18.9 |
| 67 | sandwhispers_hidden_treasure | 4 | 169 | 0 | 639 | 47,571 | 2028-02-15 | 2027-12-19 | 2028-09-29 | — |
| 68 | life_lover | 4 | 173 | 0 | 666 | 48,237 | 2028-02-22 | 2027-12-25 | 2028-10-09 | — |
| 69 | coin_collector | 4 | 177 | 0 | 1,368 | 49,605 | 2028-03-06 | 2028-01-05 | 2028-10-28 | — |
| 70 | magic_power | 3 | 180 | 6,121 | 91 | 55,817 | 2028-05-04 | 2028-02-26 | 2029-01-25 | 88.8 |
| 71 | heartbound | 3 | 183 | 29,719 | 23 | 85,560 | 2029-02-12 | 2028-10-31 | 2030-03-27 | 89.4 |

### What waits for a spawn

| event | content | chance per minute | mean wait | up | event-bound work, char-h | spawns needed (5 characters) | calendar days (5) | calendar days (1 character, today's client) | achievements |
|---|---|---|---|---|---|---|---|---|---|
| Corrupted Portal | monster grimlet | 1/2000 | 33.3 h | 60 min | 295 | 64.4 | 89.4 | 446.9 | closing_the_gate, corruption_eradicator, eat_the_forbidden_fruit, heartbound, magic_power, welcome_to_hell |
| Magic Apparition | resource magic_tree | 1/2000 | 33.3 h | 60 min | 115 | 25.1 | 34.8 | 174.2 | magic_harvester, magic_lumberjack, potion_brewer |
| Strange Apparition | resource strange_rocks | 1/2000 | 33.3 h | 60 min | 100 | 21.8 | 30.3 | 151.7 | crafted_with_honor, diamond_in_the_sky, strange_miner |
| Small Becomes Great | monster red_dragon | 1/1500 | 25.0 h | 60 min | 83 | 18.2 | 18.9 | 94.7 | draconic_harvest |
| Cult of Darkness | monster cultist_emperor | 1/2000 | 33.3 h | 60 min | 61 | 13.3 | 18.5 | 92.5 | around_the_world, blood_of_the_cursed, clean_the_lab, cult_destroyer, its_malefic |
| Portal (Efreet) | monster efreet_sultan | 1/2000 | 33.3 h | 60 min | 61 | 13.3 | 18.4 | 92.0 | closing_the_gate, welcome_to_hell |
| Portal (Demon) | monster demon | 1/1000 | 16.7 h | 60 min | 28 | 6.2 | 4.3 | 21.6 | closing_the_gate |
| Out Of The Ground | monster duskworm | 1/2000 | 33.3 h | 60 min | 16 | 3.4 | 4.7 | 23.5 | around_the_world, heartbound, the_worm_turns |
| Attacking The Island | monster sea_marauder | 1/1500 | 25.0 h | 60 min | 6.8 | 1.5 | 1.6 | 7.8 | magic_power, secure_the_island |
| Bandit Camp | monster bandit_lizard | 1/1000 | 16.7 h | 60 min | 3.2 | 0.7 | 0.5 | 2.4 | the_new_bandit |
| Nomadic Merchant | npc nomadic_merchant | 1/1500 | 25.0 h | 90 min | 0.0 | 0.0 | 0.0 | 0.0 | turning_treasures_to_gold |

Favors: 467 left for a_favored_champion; at most 15 a day (docs: one offering per category, three categories, per character) → at least 31.1 days; at the 10 a day of 2026-11-17/18 (log) 46.7 days.

### What the tables say

- **The costed road is eight times the season.** 85,560 character-hours against the 10,200 that 97 days hold at the
  measured pace. The first 44 achievements in the order (86 points on top of today's 15) cost 8,300 hours; the
  other 27 cost 77,200.
- **The break is at combat 40.** Step 45 (gourmet_chef: fish soup needs level 40 to eat) and step 47 (its_malefic)
  carry 7,200 hours of levelling between them; step 51 carries 29,200. Those hours are the atlas's crafting
  training (`craftTrain`), and they deserve a second look before anyone treats them as final (H.12).
- **Events set their own clock.** Six achievements wait for the Corrupted Portal; with five characters on every
  spawn it still takes 64 spawns, 89 days. The Magic Apparition needs 25 spawns (35 days), the Strange Apparition
  22 (30 days). With one character, as today, every figure is five times that. Spawns can be bought with gems (H.20).
- **Favors**: 31 days at the cap, 47 at the 10 a day of the last three days.
- **If 210 does not fit** — it does not — the order by points per character-hour is the table above. At the
  deadline it stands at step 44 as measured: the favors, all gathering and refining up to skill 50, the potions,
  the tasks, the recycling, the fights up to level 32 and King Slime. The tier reached is 100 as measured, 105
  (bronze) never idle, 50 in the pessimistic case.
- **Two things the hours do not show.** 18 of those 86 points are gathering on Sandwhisper Isle while its bank is
  still closed (secure_the_island sits at step 57): every full bag is a 2,000-gold boat trip (G). And all but
  seven of the 71 steps need an ability the client does not have (F).

## F. What the client cannot do today

Ordered by the open points that depend on each ability. The points overlap: an achievement behind a transition
that also needs a boss group is in both rows. The first table adds the abilities one after the other and reruns E.

script output:

| abilities the client has | open achievements it can then finish (ever) | their points | points by 2027-02-24 (measured pace) | never idle | pessimistic |
|---|---|---|---|---|---|
| today's client left alone | 7 | 18 | 30 | 30 | 30 |
| + picks the work itself | 29 | 55 | 66 | 66 | 63 |
| + transitions | 44 | 89 | 84 | 84 | 81 |
| + whole fleet on events | 58 | 130 | 98 | 98 | 95 |
| + group boss fights | 67 | 158 | 101 | 101 | 98 |
| + `use` on purpose | 71 | 168 | 101 | 105 | 98 |

| missing ability | achievements | points |
|---|---|---|
| use a transition (other layers, the island, keys, tolls) | a_peaceful_island, adamantite_mastery, around_the_world, art_of_teleportation, blood_of_the_cursed, carnivore, catch_and_cook, clean_the_lab, coin_collector, crafted_with_honor, draconic_harvest, elementary_book, expert_miner, heartbound, king_of_the_goblins, lich_please, life_lover, magic_power, master_alchemist, master_fisherman, master_lumberjack, master_miner, palm_paradise, potion_brewer, professional_miner, sands_of_power, sandwhispers_hidden_treasure, secrets_in_the_sand, secure_the_island, shining_secrets, take_her_down, the_worm_turns, ultimate_rune, welcome_to_hell, worker | 97 |
| put the whole fleet on a live event, not one character | around_the_world, blood_of_the_cursed, clean_the_lab, closing_the_gate, corruption_eradicator, crafted_with_honor, cult_destroyer, diamond_in_the_sky, draconic_harvest, eat_the_forbidden_fruit, heartbound, its_malefic, magic_harvester, magic_lumberjack, magic_power, potion_brewer, secure_the_island, strange_miner, the_new_bandit, the_worm_turns, welcome_to_hell | 64 |
| pick the achievement's work by itself (today: a queue item or hive goal by hand) | alchemist, arachnophobia_conquered, cabinet_maker, catch_and_cook, closing_the_gate, cultist_purifier, cursed_wood_blessed_victory, diamond_in_the_sky, expert_alchemist, expert_fisherman, expert_lumberjack, highway_patrol, i_want_bacon, intermediate_alchemist, intermediate_fisherman, intermediate_lumberjack, intermediate_miner, king_of_the_goblins, loktar_ogar, making_a_nether_portal, pearl_fisher, professional_fisherman, professional_lumberjack, tanners_exchange, tasks_coins_fan, the_reaper, worker | 50 |
| start a group boss fight without a manual step | around_the_world, blood_of_the_cursed, crafted_with_honor, elementary_book, heartbound, lich_please, life_lover, sands_of_power, secrets_in_the_sand, slimed_to_none, take_her_down, the_worm_turns | 40 |
| fight in a raid | around_the_world, blood_of_the_cursed, clean_the_lab, elementary_book, king_of_the_sun, queen_of_the_enchanted_forest, ultimate_rune | 27 |
| use an item on purpose (`use` item: food, potions) | art_of_teleportation, carnivore, eat_the_forbidden_fruit, gourmet_chef | 10 |

Open achievements that need none of these: a_favored_champion (4), a_helping_hand (2), adept (2), ecologist (1), grand_master (3), the_planet_thanks_you (4), turning_treasures_to_gold (2) = 18 points.

Each ability, exactly:

1. **Use a transition — cannot. 97 points.** The game: `POST /my/{name}/action/transition` on a tile that has one,
   5 s cooldown; `move` does not cross layers ("If no path is possible using move, it is very likely that a
   transition is necessary", docs: https://docs.artifactsmmo.com/concepts/maps_and_movement/). Conditions: `cost`
   consumes a key or gold, `has_item` wants the item carried. The client has the wrapper (`src/api/actions.ts:86`)
   and nothing that calls it from a queue; `nearest()` knows no layers; the log holds no transition call. Behind
   it: gold, mithril and adamantite rocks, the rats' house, the goblin mine, the lava underground, Sandwhisper
   Isle, the Enchanted Forest, every boss except King Slime.
2. **Put the whole fleet on a live event — can, automatically, with one character. 64 points.** The standing
   order sends one free character per spawn, and only into a safe win (`src/plan/events.ts`). No monster or
   resource order has ever been dispatched (`docs/audit/code-audit.md` G.5). The event work in E needs five.
3. **Choose an achievement's work by itself — can, but only by hand. 50 points.** `fight ×N`, `gather ×N`,
   `craft ×N`, `task-loop` and `buy` do the work once queued; the hive's achievement goal compiles the same items
   once launched. Nothing starts either. The training loops do some of it by accident, while the achievement's
   monster or node is also the best one to train on.
4. **Start a group boss fight without a manual step — can, but only by hand. 40 points.** Fleet → Group fight:
   "Prepare" queues a `prepare` item for up to three characters, "Fight" sends one fight
   (`src/ui/GroupFight.tsx`). One click per fight; a restart loses `prepare`. The game: up to three of the
   account's characters on the boss's tile, the leader calls `fight` with `participants` (docs:
   https://docs.artifactsmmo.com/concepts/stats_and_fights/). The simulator and the atlas know solo fights only.
5. **Fight in a raid — cannot. 27 points.** The game: a raid opens on set weekdays; while it is active a character
   on a tile whose content is `raid` uses the normal `fight`, up to three together; a fight is won by surviving
   100 turns or finishing the boss; damage lowers a pool shared by all players; rewards (one coin per 5,000 or
   10,000 damage) arrive as pending items after the raid ends (docs:
   https://docs.artifactsmmo.com/concepts/raids/, https://docs.artifactsmmo.com/changelog/ 8.2.3). The client's
   pickers list monster tiles only, and it reads no raid state (`GET /raids`). 12 points are raid kills or raid
   currency; 15 more need the cultist cloak, whose two enchanted fabrics cost one enchanted coin each (data:
   `npc_items.json`).
6. **Use an item on purpose — cannot. 10 points.** There is no `use` queue item. A hurt fighter eats the best
   food at hand, which is how Carnivore and Gourmet Chef got their progress; the four teleport potions (400 uses)
   are never used at all.

Smaller gaps, each "can, but only by hand", that a road to these points also crosses:
- **Claiming rewards.** Achievement rewards arrive as pending items and are claimed in the Achievements tab. Keys,
  rings of the adept, altar dolls and coins on the road above come that way.
- **Reading progress.** Achievement progress is a read of its own (`/accounts/{account}/achievements`, the 300 an
  hour bucket); today it happens on a button, and once per barrier inside a hive achievement goal.
- **Buying with an item currency.** The `buy` item needs the currency in the bag; the hive's achievement goal
  handles gold offers only (`src/plan/hive/achievements.ts:57-65`).
- **Gathering training at skill 35–39** picks the event-only node and skips when no event is up
  (`docs/audit/code-audit.md` C.3). The mining and woodcutting chains pass through exactly there.

## G. Spending

No rule is proposed here; the amounts are what a rule has to cover.

**Where gold comes from, at the fleet's pace.** Tasks pay 241 gold on average (data: `tasks.json`, level ≤ 30), and
the fleet completed about 25 a day (log), so about 6,000 a day. A won fight pays 3.4 gold on average (log: 22,894
fights). Open achievements pay 299,000 gold in total, 86,000 of it within the part E reaches by the deadline
(data). Event merchants buy golden eggs and golden shrimp at 1,000 and shells at 120 (data: `npc_items.json`). The
bank's gold is not in a public read; `docs/tasks/roadmap-tab.md` records about 107,000 gold and 526 tasks coins
on 2026-11-17.

**Purchases large enough to need a rule** (data: `npc_items.json`, `maps.json`):

| purchase | amount | what it is for |
|---|---|---|
| Lost World Map, Nomadic Merchant⚡ | 15,000 each, 75,000 for five | +10% XP artifact; the standing order buys it today (accepted, `docs/rework.md`) |
| Backpack, Nomadic Merchant⚡ | 50,000 each, 250,000 for five | +35 bag space; next on the standing order's list |
| Sandwhisper boat | 1,000 per character per crossing | 19 open achievements (53 points) work on the island; until secure_the_island opens the island's bank, each full bag is 2,000 gold — about 27,600 gathers there are about 200 bagfuls, 400,000 gold (guess: 140 items a bag) |
| Enchanted Forest entry | 5,000 per character per entry | enchanted mushrooms for 100 enchanted potions; the Enchanted Fairy raid tile |
| Piece of obsidian, Gemstone Merchant⚡ | 350 each, 350,000 for 1,000 | replaces 1,241 char-h of imp hunting for Making a Nether portal |
| Cursed wood, Timber Merchant⚡ | 350 each, 175,000 for 500 | replaces 153 char-h |
| Alexandrite, Gemstone Merchant⚡ | 75,000 | one, for the magic shield; replaces 72 char-h |
| Magic sap, Timber Merchant⚡ | 1,500 each, 150,000 for 100 | for Potion Brewer; replaces about five Magic Apparition spawns |
| Recall and forest bank potions, Herbal Merchant⚡ | 200 each, 40,000 for 200 | the two cheap halves of Art of teleportation |
| Raw ore, wood and fish, event merchants⚡ | 10–150 each; 150,000 for 3,000 gold ore | replaces 37 char-h — the worst trade on the list |
| Healing rune, Rune Vendor | 10,000 each, 50,000 for five | gear, not an achievement: the atlas's plus set from level 20 picks it (atlas: `bands[].loadout`) |
| Bank expansion | price unknown, rising | bought twice by hand on 2026-11-13 (`docs/audit/code-audit.md` G.3) |

**Tasks coins.** The achievements themselves need 24 (two astralyte crystals for the masterful necklace). The sink
is gear: 113 recipes use a Tasks Trader crystal at 8–14 coins each (data: `items.json`; atlas: `coinPrices`). The
597 tasks left pay about 3.1 coins each (data), 1,850 in all, plus 40 from Tasks Coins Fan. Cancelling a task
costs one coin (28 cancelled in the log's period).

**Event and raid currency, and keys.** Corrupted gems: 100 to spend, 800 dropped for Corruption Eradicator, 50
rewarded — no shortage once grimlets are farmed. Sandwhisper coins: 230 to spend, 500 dropped. Sonnengott coins:
150 for the powerful rune, one per 10,000 raid damage, so 1.5 million damage on a boss with 2 million shared hit
points (docs: changelog 8.2.3). Enchanted coins: two per cultist cloak, one per 5,000 raid damage. Keys: three per
group entry (guess: one per character per transition), then one entry per 25 fights (guess) — about 150 lich keys
and 150 sandwhisper keys for the two 1,200-kill achievements.

**Gems.** The free tiers at 50, 100, 150 and 200 points pay small bags of gems; gems can spawn an event (docs:
https://docs.artifactsmmo.com/concepts/gems-shop/; data: `events.json` carries a gem price per event, 50 for
Attacking The Island). How many gems a bag holds is not in the data.

script output:

| currency | amount over the whole road | achievements |
|---|---|---|
| lich_tomb_key | 150 | around_the_world, lich_please, life_lover |
| priestess_hideout_key | 11 | around_the_world, crafted_with_honor, take_her_down |
| enchanted_coin | 18 | around_the_world, blood_of_the_cursed, clean_the_lab |
| sandwhisper_key | 150 | around_the_world, sands_of_power, secrets_in_the_sand |
| tasks_coin | 24 | crafted_with_honor |
| corrupted_gem | 100 | eat_the_forbidden_fruit |
| sonnengott_key | 3 | magic_power |
| sandwhisper_coin | 230 | sandwhispers_hidden_treasure |
| cowhide | 3 | tanners_exchange |
| sonnengott_coin | 150 | ultimate_rune |
| page_from_hell | 24 | welcome_to_hell |

Tolls: Sandwhisper Isle boat 1,000 gold each way per character — 21 achievements (59 points) work there; Enchanted Forest 5,000 gold per entry per character — 2 achievements (4 points).

Materials an event merchant sells for gold (a bought material still counts for a craft or a use; a gathering objective counts only what is gathered):

| achievement | buy | quantity | merchant | gold each | gold total | char-h it replaces |
|---|---|---|---|---|---|---|
| adamantite_mastery | adamantite_ore | 5,000 | gemstone_merchant | 100 | 500,000 | 75 |
| alchemist | nettle_leaf | 400 | herbal_merchant | 35 | 14,000 | 4.3 |
| alchemist | algae | 200 | fish_merchant | 50 | 10,000 | 17 |
| alchemist | sunflower | 100 | herbal_merchant | 10 | 1,000 | 0.8 |
| art_of_teleportation | recall_potion | 100 | herbal_merchant | 200 | 20,000 | 0.9 |
| art_of_teleportation | forest_bank_potion | 100 | herbal_merchant | 200 | 20,000 | 1.2 |
| art_of_teleportation | salmon | 50 | fish_merchant | 100 | 5,000 | 0.7 |
| art_of_teleportation | swordfish | 50 | fish_merchant | 150 | 7,500 | 0.8 |
| cabinet_maker | ash_wood | 976 | timber_merchant | 10 | 9,760 | 8.1 |
| cabinet_maker | birch_wood | 1,464 | timber_merchant | 35 | 51,240 | 16 |
| cabinet_maker | dead_wood | 3,000 | timber_merchant | 50 | 150,000 | 37 |
| catch_and_cook | bass | 500 | fish_merchant | 75 | 37,500 | 6.1 |
| catch_and_cook | salmon | 500 | fish_merchant | 100 | 50,000 | 6.8 |
| catch_and_cook | swordfish | 500 | fish_merchant | 150 | 75,000 | 7.5 |
| crafted_with_honor | gold_ore | 24 | gemstone_merchant | 50 | 1,200 | 0.3 |
| crafted_with_honor | strange_ore | 36 | gemstone_merchant | 100 | 3,600 | 0.5 |
| cursed_wood_blessed_victory | cursed_wood | 500 | timber_merchant | 350 | 175,000 | 153 |
| gourmet_chef | salmon | 100 | fish_merchant | 100 | 10,000 | 1.4 |
| gourmet_chef | trout | 100 | fish_merchant | 50 | 5,000 | 1.1 |
| heartbound | palm_wood | 120 | timber_merchant | 100 | 12,000 | 1.8 |
| magic_power | palm_wood | 100 | timber_merchant | 100 | 10,000 | 1.5 |
| magic_power | alexandrite | 1 | gemstone_merchant | 75,000 | 75,000 | 72 |
| making_a_nether_portal | piece_of_obsidian | 1,000 | gemstone_merchant | 350 | 350,000 | 1,241 |
| palm_paradise | palm_wood | 5,000 | timber_merchant | 100 | 500,000 | 75 |
| potion_brewer | glowstem_leaf | 100 | herbal_merchant | 75 | 7,500 | 1.4 |
| potion_brewer | magic_sap | 100 | timber_merchant | 1,500 | 150,000 | 13 |
| welcome_to_hell | mithril_ore | 110 | gemstone_merchant | 75 | 8,250 | 1.5 |
| worker | iron_ore | 522 | gemstone_merchant | 25 | 13,050 | 4.9 |
| worker | coal | 1,218 | gemstone_merchant | 35 | 42,630 | 13 |
| worker | gold_ore | 3,000 | gemstone_merchant | 50 | 150,000 | 37 |

Gold from achievements still open: 299,000; tasks coins from them: 40.
Of that, the 44 achievements E finishes by 2027-02-24 at the measured pace pay 86,000 gold.
Pocket gold on the five characters: 114 (api: characters.json); bank gold is not in a public read.

## H. Assumptions and unknowns

| # | Assumed or unknown | What would settle it |
|---|---|---|
| 1 | The season ends around 2027-02-24. | An announcement; the API carries no end date. |
| 2 | `combat_level` means one character at that level. The snapshot shows 0/25 with a level-22 character, so progress is not a running maximum. | One read of the achievements when the first character reaches 25. |
| 3 | `gathering` counts items received (evidence: algae 2,500/2,500, a 1-in-10 drop). `crafting`, `recycling`, `use`, `npc_buy` and `combat_drop` are assumed to count items too. | One craft of a recipe that makes two (a minor health potion) between two reads. |
| 4 | One `use` call with a quantity counts every unit. | One `use` of 5 between two reads. |
| 5 | What a raid "kill" is, the raids' weekdays and hours, the level they need, whether a non-member may join. The docs name Sundays for the Enchanted Fairy and nothing else. | `GET /raids` (public; a request Alex would have to allow), then one raid fight in the log. |
| 6 | A key is consumed per character per use of the transition, and a won boss fight leaves the group inside. The docs say "consumed: yes" and that a lost fight returns the character to (0, 0) with 1 HP. | One lich run in the log. |
| 7 | Every participant of a group fight gets the kill; the kill counts once. | One King Slime win and a read. |
| 8 | A boss round takes 600 s for three characters; a monster the atlas has no kill time for takes 300 s. | Fight logs; an atlas run that models groups. |
| 9 | The atlas's gates hold for this fleet. They are for a hypothetical fleet that makes all its gear, fights alone, and wants a safe win. For nine normal monsters of level 45–51 and five bosses the atlas finds no farmable set at all by level 50; the map sets those gates to 50. | An atlas run with potions and groups; the first real fights at 30+. |
| 10 | Fighting at a level needs the three gear crafting skills at the start of that level's band. The atlas's pools assume every skill equals the combat level. | The gear the fleet really wears at 25 and 30. |
| 11 | Reaching a level takes the atlas's hours (`path[].t`, plus tier, then special from 38). | The log, as the fleet levels. |
| 12 | The atlas's crafting hours (`craftTrain`) are right. They carry most of the road's cost and look too high above 40: jewelrycrafting 41–49 is 4,500–6,400 hours a level. The atlas ignores recycling returns and bank stock (`docs/audit/code-audit.md` C.7) and prices every tasks coin at 3,450 s. | A second look at `scripts/atlas/econ.mts` (not this task). |
| 13 | All five characters are free, strong enough and on the tile for 55 of an event's 60 minutes. | Event orders in the log once they send more than one. |
| 14 | Events spawn independently at 1/rate a minute. The log shows 16 in 26 hours against 21 expected; the docs mention a maximum of active events. | A week of the event poll in the log. |
| 15 | A task takes 1.95 hours. That is measured on tasks for level 20–22 characters; the catalog's quantities at the unit times above give 3.7 hours for tasks up to level 30. | The log, as levels rise. |
| 16 | An offering takes 20 minutes, and 15 a day are possible. Three days at 8–11 say the cap is not being met. | The log; `scripts/check-offering.mts` cases for the skipped categories. |
| 17 | A source that exists all the time is taken over an event source unless the event's is five times cheaper; gold is never spent; reward items are not counted as a source. | A decision, not a fact: the planner's. |
| 18 | The bank's contents and gold. | The service's own state, or a `/my/bank` read (token; not allowed here). |
| 19 | Whether other players sell raid and event goods (enchanted fabric, keys, shards) on the Grand Exchange. That would take the raid out of the cultist cloak. | `GET /grandexchange/orders` (public; a request Alex would have to allow). The client has no Grand Exchange actions. |
| 20 | How many gems a bag holds, and whether a non-member may spawn an event with them. | The first bag, at 50 points. |
| 21 | The favor's ×1.5 drop quantity on the day's favored target is not modelled; on favored days it cuts a 6,000-item objective by a third. | Nothing to settle; a saving the planner can take. |
| 22 | The achievement list and the reward track stay as they are until the season ends. | Nothing short of the season ending. |
