# Report 024 — the leaders' base

## Summary
- **No restart, no failed outlook during the work**: `logs/status.json` at 12:41 UTC still carries run `0yfi` (up since
  11:48:01, commit `7daf5e1`, 33 points); the last outlook ended 11:56 UTC (46 expected), the next is due about 14:56.
- **The read**: 53 public GETs of the cap of 150 (12:22:15–12:23:23 UTC on 11-23), every one 200, no 429; 26 accounts
  (the board's first 25 — `jowrjowr` at 25 ties `marcelomollaj` at 41 points — and `alverus`, 38th with 33), 1,272,106
  bytes; the achievements' public read carries the progress of the open ones too (91 a page, one page each).
- **The verdict — both, and the rule more than the forecast**: on the leaders' own sets this fleet's simulator expects a
  win in 59 of 60 solo fights they stand in and its stats agree with the API's on every stat but initiative (−100 on 40 of
  40); **the safe rule refuses 16 of the 27 XP-giving fights they farm, fights that win 98.4% (median; 99.9% with the
  API's initiative) of 2,000 rolled fights.** And they do what this fleet's plan does not: a healing rune and cooked food
  instead of potions, craft-30 event/coin weapons from combat 30, tasks on the monster they farm, boss groups.
- **The five distances at this fleet's stage, most costly first**:
  1. Sustain — 36 of 40 leaders' fight sets wear a rune, 27 carry food, 2 a restore potion; this fleet 0, 0, and its solve drinks 1–3 stocked potions a fight where its potion-free set is safe too (30 of 30 pairs at 20–34).
  2. Gear from 30 — leaders' best crafters median 32/35/32, their 30–34 fighters on craft-30 ⚡/¢ weapons; this fleet's 20/23/21 and no safe XP monster from combat 33 on its pool (with their sets the same planner gives 6.7–12.8 h a level).
  3. The safe rule — the pessimistic pass refuses 59% of the XP fights the leaders win ~98% of; "a win is enough" + a rune reopens 33–35 on this pool at 20–25 h a level.
  4. Time on combat — their fighters at 40–44 gained fight XP in 16 of 21 cases (median 30 h a level); this fleet 0–0.24 levels each in 17 h, all five gathering at the read; 15 of 39 leaders on a monster work its task.
  5. Initiative — the API's is the items' + 100; the model's monster strikes first in 31 of 65 fights, wrongly in 27.
- **The number that surprised me most**: this fleet's own planner, on its own bank of 00:00 UTC, finds a **safe set with
  no potion at all** against every monster the leaders' fighters of combat 20–34 stood on — and the set it actually
  picks drinks one to three potions a fight there anyway (table 3d).

## Decisions for Alex
None. (A second read — 27 requests light, 53 whole, 97 left under the cap — is the planning chat's to ask for; Notes say
what it would show.)

## How Alex verifies
1. `git branch --show-current` → `rework`; `git log --oneline -3` → `024: leaders` on top of `Rework notes` (the planning
   chat's notes, committed first as they were); `git status` clean; `git log origin/rework --oneline -1` → the same
   commit; `git log main --oneline -1` → `edaaf23`.
2. `docs/strategy/024/requests.log` → 53 lines, every path `/leaderboard/accounts…` or `/accounts/<a>/characters` or
   `/accounts/<a>/achievements…`, every status 200, starts 1.3 s apart (12:22:15.386 → 12:23:23.359);
   `docs/strategy/024/snapshot/2026-11-23T1222Z/` → 53 files, 1,272,106 bytes = the log's bytes column summed.
3. `git diff --stat 7daf5e1 HEAD -- src public scripts` → empty.
4. `node docs/strategy/024/tools/build.mjs`, `node docs/strategy/024/tools/stats.mjs`,
   `node --import tsx docs/strategy/024/tools/model.mts` (or `npm run leaders`) → the tables of this report, and
   `git status` still clean (the same bytes). Without a request: the request log keeps 53 lines; `fetch` appears in
   `tools/fetch.mjs` only (`grep -l "fetch\|node:http\|node:net" docs/strategy/024/tools/*`). I checked it harder: I
   deleted `base/` and `tables/`, ran the three with a preload that makes `fetch` and every socket connect throw, and
   all 24 files came back with the same SHA-256 (3 base, 21 tables). 3d and 3e read the newest `logs/world/` file: after
   the service writes 11-24's World they will differ (the other tables will not).
5. `npm run typecheck` → passes; `npm run check` → every check ok: `91 checks: 91 ok, 0 known defects reproduced, 0 failed — 185.0 s` (report 023's count). `src/` is untouched, so the planner replay was not run.
6. `logs/status.json` → run `0yfi`.

## The read and the base
- **The requests** (`docs/strategy/024/requests.log`): 53 — the leaderboard page 1 (1), the 26 accounts' characters (26,
  12:22:16.691–12:22:49.389, so every fleet's positions lie within 33 s), their achievements (26, one page each: `total`
  91, `pages` 1). Every status 200; none repeated, no 429. The task expected 105 (three achievement pages an account);
  the read needed one, because a page holds 100 and the season has 91 achievements. 97 of the 150 are left.
- **The achievements' public read carries the progress of open achievements** (`objectives[].progress`, e.g.
  `a_favored_champion` 275/500 for `uaprsf`), so the whole list was read, not `completed=true` only.
- **The snapshot**: `docs/strategy/024/snapshot/2026-11-23T1222Z/`, 53 files, 1,272,106 bytes, each body as it came.
- **The base** (`node docs/strategy/024/tools/build.mjs`): two snapshots — 022's of 19:23 UTC on 11-22 (17 accounts, read
  in place, its log `docs/strategy/022/requests.log`) and this one (26) — 215 character lines, 43 account lines, 2,905
  achievement lines (022's read holds completed achievements only). 12 accounts are in both reads (the top ten of 11-22,
  `automode`, `alverus`) — five of 022's accounts, those just above this fleet then, are not in today's top 25;
  14 of today's 25 were not read on 11-22), so 60 characters have two lines and a pace.
- **What stands on the tile** comes from `public/data/maps.json` by `map_id` (a monster with its level, a resource with its
  skill and level, a workshop, a bank, …) and, for an event, from `public/data/events.json` (every event that spawns on
  that map; at the read no leader stood on an event's place).
- Size of the base on disk: 1.2 MB (`characters.jsonl` 455 KB, `achievements.jsonl` 712 KB, `accounts.jsonl` 17 KB); the
  tables 140 KB.

## The statistics
Printed by `node docs/strategy/024/tools/stats.mjs` from `base/` (and `public/data/`; the outlook record for (g); 022's
`sec3.json` for (f)); each table is also a file of `docs/strategy/024/tables/`. This account's rows are marked **◀
alverus**. "Leaders" = the 25 accounts of today's read; where a band has too few fight sets today (20–34), 022's read of
11-22 adds its fight sets — five of whose accounts (`shuxart`, `FRALEXAlexander`, `chewbaccoin`, `Odiodin`, `Zetark`)
stood just above this fleet then and are not in today's 25.

### (a) The fleets
Of the 25, **one fleet fights with five at the read, one with four, four with three, five with two, eight with one, six
with none** (by the tile and the weapon); one character holds the three gear-crafting bests in 19 of 25; this fleet's
five stand within 3 levels of each other like six of the 25, but at 23–26 and all five gathering.

#### (a) The fleets (accounts.jsonl, characters.jsonl; each character: name, combat level, role, best gathering skill, best crafting skill)

| # | account | pts | m | the five | F/G/C | near+mid+far | wc/gc/jc best, held by |
|---|---|---|---|---|---|---|---|
| 1 | uaprsf | 81 | y | frtCombat 50F mi48 al50 · frtMiner 43G mi50 co50 · frtWood 48G wo50 co50 · frtFish 50F fi50 co50 · frtCraft 50F fi49 co47 | 3/2/0 | 4+1+0 | 41/46/40 one: frtCraft |
| 2 | Fox___ | 73 | y | Fox_1 46G mi42 wc40 · Fox_2 44G wo40 al9 · Fox_3 45G mi41 al6 · Fox_4 31F wo30 co50 · Fox_5 23G fi50 al42 | 1/4/0 | 3+0+2 | 40/40/35 one: Fox_1 |
| 3 | hunter2 | 69 | y | Pablo 45F mi41 co50 · Imoen 40G fi49 co50 · Jaheira 50F wo31 co45 · Viconia 43F wo42 co50 · Aerie 44F wo37 co50 | 4/1/0 | 1+3+1 | 35/40/34 one: Jaheira |
| 4 | Wudagem | 63 | n | Wudagem 46G mi24 al50 · Zeni 44G mi31 gc41 · Yuri 42G mi46 jc41 · Wuda 39G wo42 co42 · Boris 37C mi43 wc40 | 0/4/1 | 2+3+0 | 40/41/41 split |
| 5 | Pischke | 61 | n | Pischke 42F wo11 al2 · Rudolph 1G fi50 co50 · Thurolf 1G mi50 wc30 · Theo 1G fi32 al50 · Susi 1G wo50 al8 | 1/4/0 | 1+0+4 | 30/25/13 one: Thurolf |
| 6 | krolov | 59 | y | Karina 15G fi37 co42 · Zarina 41F wo39 al2 · Marina 44F fi38 al11 · Tarina 45F mi25 al40 · Darina 21G mi46 al26 | 3/2/0 | 2+1+2 | 30/31/30 one: Karina |
| 7 | Big_Shark | 58 | n | IronMan 39F mi29 gc36 · Hulk 40G mi41 co6 · BlackWidow 1G fi42 co50 · Rocket 45G mi5 al50 · Groot 1G wo50 al18 | 1/4/0 | 1+2+2 | 35/36/34 one: IronMan |
| 8 | Alrick00 | 56 | n | Alrick 41G mi35 co2 · Helena 33G fi48 co50 · Josh 41F wo40 gc35 · Thelebos 38G wo35 al43 · Astrid 41F mi41 wc32 | 2/3/0 | 4+1+0 | 32/35/32 split |
| 9 | Elemental | 54 | n | Ron 43F mi36 gc40 · Fredrick 43F mi35 co2 · George 43F wo39 co2 · Percy 22G fi44 co50 · Molly 22G fi48 co42 | 3/2/0 | 3+0+2 | 35/40/31 one: Ron |
| 10 | TheCarriedOne | 53 | y | Carried 40G mi38 co33 · Carried_B1 38G mi40 wc41 · Carried_G1 38G mi41 co34 · Carried_G2 40G wo41 co32 · Carried_G3 38G mi39 al42 | 0/5/0 | 5+0+0 | 41/41/32 one: Carried_B1 |
| 11 | Turbofish | 53 | y | Dorothy 42F wo37 gc40 · Turbofish 23G fi50 co50 · Orchid 41F wo49 co32 · Myrtle 37G mi39 al50 · Jade 22G mi48 co22 | 2/3/0 | 2+1+2 | 35/40/35 one: Dorothy |
| 12 | at0mstr0m | 52 | n | at0m_1 44F fi7 wc1 · at0m_2 12G mi39 wc30 · at0m_3 13G wo43 gc33 · at0m_4 13G fi45 co50 · at0m_5 13G wo25 al42 | 1/4/0 | 1+0+4 | 30/33/27 split |
| 13 | aropan | 51 | y | Arkforge 39G mi41 gc39 · Zynfin 38F fi40 al44 · Bixbrew 40F fi40 al50 · Orumine 37G mi41 co42 · Vexwood 41F wo41 al45 | 3/2/0 | 4+1+0 | 37/39/39 one: Arkforge |
| 14 | brinko | 50 | n | Alekhine 41F mi41 co40 · Botvinnik 42F wo40 co41 · Capablanca 43F fi24 co41 · Ding 41F mi41 co39 · Euwe 42F wo40 al42 | 5/0/0 | 5+0+0 | 37/39/40 split |
| 15 | automode | 49 | n | pilot 19G mi50 co21 · cruise 41F mi18 co41 · macro 21G fi48 co50 · daemon 33G mi32 co41 · yolo 27G wo49 jc41 | 1/4/0 | 1+1+3 | 40/33/41 split |
| 16 | Myoto | 47 | y | Conan 39G mi28 co41 · Grumpy 36F mi41 co40 · RedSonja 38G fi31 co39 · Silas 37F wo35 co37 · Gaia 36G fi32 al41 | 2/3/0 | 5+0+0 | 31/34/35 one: Grumpy |
| 17 | LewisHeidrick | 47 | n | LH_Fighter 41F wo7 al14 · LH_Miner 24G mi45 co50 · LH_Woodsman 24G wo43 co50 · LH_Fisher 23G fi47 co50 · LH_Crafter 30G mi31 co50 | 1/4/0 | 1+0+4 | 30/35/27 one: LH_Crafter |
| 18 | _zero_ | 47 | y | Zero 40F mi36 gc35 · Bodger 39G wo35 co32 · Baelin 22G fi50 co50 · Aloy 37G wo41 al50 · Bulma 37F wo45 al46 | 2/3/0 | 4+0+1 | 32/35/33 one: Zero |
| 19 | br_lemes | 46 | y | br1 36G fi36 al45 · br2 36G fi36 al44 · br3 36G fi37 al45 · br4 36G fi37 al45 · br5 36G fi36 al45 | 0/5/0 | 5+0+0 | 30/30/31 one: br1 |
| 20 | ront_tv | 46 | y | Ront 33G wo35 co41 · Shella 33G wo35 co41 · Reila 33G wo35 co41 · Olivia 32G wo35 co42 · Shuckle 32G mi35 co41 | 0/5/0 | 5+0+0 | 31/30/30 one: Shuckle |
| 21 | Trobyss | 44 | y | Trobyss 42F mi2 co13 · Proton 39F wo37 gc35 · Higgs 38G mi37 wc35 · Belatryss 34G mi41 jc37 · Kryss 15G fi42 co50 | 2/3/0 | 2+2+1 | 35/35/37 split |
| 22 | ShadyBliss | 43 | n | Shady 33G mi31 al31 · Shady2 33G mi31 al29 · Shady3 29G wo45 gc31 · Shady4 30G mi35 al41 · Shady5 30G fi42 co31 | 0/5/0 | 4+1+0 | 30/31/30 one: Shady3 |
| 23 | Grewaa | 42 | y | Grewa 36C mi34 co2 · Eliaurae 33G fi30 co2 · Martialou 31G wo31 co2 · JeanMagazine 30G mi32 co41 · JeanMichel 30G wo28 al50 | 0/4/1 | 2+3+0 | 30/31/31 one: JeanMichel |
| 24 | Tomlox | 42 | y | Cedrus 39F mi1 wc1 · TomMiner 5G mi37 co13 · CedWood 5G wo45 co15 · TomFish 6G fi44 co50 · CedCraft 15G fi29 co31 | 1/4/0 | 1+0+4 | 27/29/30 one: CedCraft |
| 25 | jowrjowr | 41 | y | saeka 31F fi33 al42 · salesalt 31G fi34 co41 · encabulator 31G fi32 co42 · fishmonger 31G fi34 co41 · harvester 31G fi34 co42 | 1/4/0 | 5+0+0 | 30/30/26 one: salesalt |
| 38 | **◀ alverus** | 33 | n | First 23G mi33 co31 · Second 26G wo32 co26 · Third 24G mi24 al34 · Fourth 24G mi35 co26 · Fifth 24G mi35 co27 | 0/5/0 | 5+0+0 | 20/23/21 split |

Role: F fighter, G gatherer, C crafter — by the tile it stands on (a monster, a resource, a workshop), else by its weapon (a fight weapon F; a tool with a `*_crafting` effect C; another tool G); – no weapon, on no such tile. near = within 3 combat levels of the account's top, far = 10 or more below. Fighters by that rule, of the 25: 5: 1, 4: 1, 3: 4, 2: 5, 1: 8, 0: 6; by "near the top": 5: 6, 4: 5, 3: 2, 2: 5, 1: 7. One character holds the three gear-crafting bests in 19 of 25.


### (b) Levels
The leaders' 125 characters: combat quartiles 30 / 37 / 41, **72 of 125 at 35 or above**; this fleet's five at 23–26 — the
last place of 26 in top combat, characters at 30+, weapon- and gearcrafting and fishing. Cooking 50 in 14 of 25 accounts.

#### (b1) Combat levels: the spread over the 125 leaders' characters and this fleet's five (characters.jsonl `level`)

| band | leaders | alverus |
|---|---|---|
| <20 | 17 | 0 |
| 20–24 | 11 | 4 |
| 25–29 | 2 | 1 |
| 30–34 | 23 | 0 |
| 35–39 | 28 | 0 |
| 40–44 | 33 | 0 |
| 45+ | 11 | 0 |

Leaders: quartiles 30 / 37 / 41; alverus: 23 26 24 24 24.

#### (b2) Per account: the top and the median combat level, the best of each skill

| account | pts | combat top | median | mi | wo | fi | wc | gc | jc | co | al |
|---|---|---|---|---|---|---|---|---|---|---|---|
| uaprsf | 81 | 50 | 50 | 50 | 50 | 50 | 41 | 46 | 40 | 50 | 50 |
| Fox___ | 73 | 46 | 44 | 42 | 40 | 50 | 40 | 40 | 35 | 50 | 50 |
| hunter2 | 69 | 50 | 44 | 41 | 42 | 49 | 35 | 40 | 34 | 50 | 49 |
| Wudagem | 63 | 46 | 42 | 46 | 42 | 31 | 40 | 41 | 41 | 42 | 50 |
| Pischke | 61 | 42 | 1 | 50 | 50 | 50 | 30 | 25 | 13 | 50 | 50 |
| krolov | 59 | 45 | 41 | 46 | 39 | 38 | 30 | 31 | 30 | 42 | 40 |
| Big_Shark | 58 | 45 | 39 | 41 | 50 | 42 | 35 | 36 | 34 | 50 | 50 |
| Alrick00 | 56 | 41 | 41 | 41 | 40 | 48 | 32 | 35 | 32 | 50 | 43 |
| Elemental | 54 | 43 | 43 | 45 | 39 | 48 | 35 | 40 | 31 | 50 | 38 |
| TheCarriedOne | 53 | 40 | 38 | 41 | 41 | 34 | 41 | 41 | 32 | 40 | 42 |
| Turbofish | 53 | 42 | 37 | 48 | 49 | 50 | 35 | 40 | 35 | 50 | 50 |
| at0mstr0m | 52 | 44 | 13 | 39 | 43 | 45 | 30 | 33 | 27 | 50 | 42 |
| aropan | 51 | 41 | 39 | 41 | 41 | 40 | 37 | 39 | 39 | 43 | 50 |
| brinko | 50 | 43 | 42 | 41 | 40 | 24 | 37 | 39 | 40 | 41 | 42 |
| automode | 49 | 41 | 27 | 50 | 49 | 48 | 40 | 33 | 41 | 50 | 50 |
| Myoto | 47 | 39 | 37 | 41 | 35 | 32 | 31 | 34 | 35 | 41 | 41 |
| LewisHeidrick | 47 | 41 | 24 | 45 | 43 | 47 | 30 | 35 | 27 | 50 | 31 |
| _zero_ | 47 | 40 | 37 | 37 | 45 | 50 | 32 | 35 | 33 | 50 | 50 |
| br_lemes | 46 | 36 | 36 | 32 | 32 | 37 | 30 | 30 | 31 | 42 | 45 |
| ront_tv | 46 | 33 | 33 | 35 | 35 | 35 | 31 | 30 | 30 | 42 | 40 |
| Trobyss | 44 | 42 | 38 | 41 | 37 | 42 | 35 | 35 | 37 | 50 | 32 |
| ShadyBliss | 43 | 33 | 30 | 35 | 45 | 42 | 30 | 31 | 30 | 31 | 41 |
| Grewaa | 42 | 36 | 31 | 34 | 31 | 30 | 30 | 31 | 31 | 41 | 50 |
| Tomlox | 42 | 39 | 6 | 37 | 45 | 44 | 27 | 29 | 30 | 50 | 17 |
| jowrjowr | 41 | 31 | 31 | 32 | 31 | 34 | 30 | 30 | 26 | 42 | 42 |
| **◀ alverus** | 33 | 26 | 24 | 35 | 32 | 23 | 20 | 23 | 21 | 31 | 34 |
| alverus's place of 26 | 26 | 26 | 22 | 21 | 23 | 26 | 26 | 26 | 25 | 25 | 23 |

#### (b3) The lanes: how many of the 25 accounts hold a 30, 40, 50 in each skill

| skill | ≥30 | ≥40 | ≥50 | median best | median characters at 30+ | alverus best | alverus characters at 30+ | alverus place of 26 |
|---|---|---|---|---|---|---|---|---|
| mining | 25 | 17 | 3 | 41 | 3 | 35 | 3 | 21 |
| woodcutting | 25 | 17 | 3 | 41 | 2 | 32 | 1 | 23 |
| fishing | 24 | 16 | 5 | 42 | 2 | 23 | 0 | 26 |
| weaponcrafting | 24 | 5 | 0 | 32 | 1 | 20 | 0 | 26 |
| gearcrafting | 23 | 7 | 0 | 35 | 1 | 23 | 0 | 26 |
| jewelrycrafting | 21 | 4 | 0 | 32 | 1 | 21 | 0 | 25 |
| cooking | 25 | 24 | 14 | 50 | 3 | 31 | 1 | 25 |
| alchemy | 24 | 21 | 10 | 43 | 1 | 34 | 1 | 23 |

#### (b4) The three gear-crafting skills: who holds the best of each, on how many characters

| account | weaponcrafting | gearcrafting | jewelrycrafting | characters holding the three | the gearcrafter's combat (account top), role | characters at 20+ wc/gc/jc |
|---|---|---|---|---|---|---|
| uaprsf | frtCraft 41 | frtCraft 46 | frtCraft 40 | 1 | 50 (top 50), F, fight set | 1/1/1 |
| Fox___ | Fox_1 40 | Fox_1 40 | Fox_1 35 | 1 | 46 (top 46), G | 1/1/1 |
| hunter2 | Jaheira 35 | Jaheira 40 | Jaheira 34 | 1 | 50 (top 50), F, fight set | 1/1/1 |
| Wudagem | Boris 40 | Zeni 41 | Yuri 41 | 3 | 44 (top 46), G | 1/1/1 |
| Pischke | Thurolf 30 | Thurolf 25 | Thurolf 13 | 1 | 1 (top 42), G | 1/1/0 |
| krolov | Karina 30 | Karina 31 | Karina 30 | 1 | 15 (top 45), G | 1/1/1 |
| Big_Shark | IronMan 35 | IronMan 36 | IronMan 34 | 1 | 39 (top 45), F, fight set | 1/1/1 |
| Alrick00 | Astrid 32 | Josh 35 | Thelebos 32 | 3 | 41 (top 41), F, fight set | 1/1/1 |
| Elemental | Ron 35 | Ron 40 | Ron 31 | 1 | 43 (top 43), F, fight set | 1/1/1 |
| TheCarriedOne | Carried_B1 41 | Carried_B1 41 | Carried_B1 32 | 1 | 38 (top 40), G | 1/1/1 |
| Turbofish | Dorothy 35 | Dorothy 40 | Dorothy 35 | 1 | 42 (top 42), F, fight set | 1/1/1 |
| at0mstr0m | at0m_2 30 | at0m_3 33 | at0m_5 27 | 3 | 13 (top 44), G | 1/1/1 |
| aropan | Arkforge 37 | Arkforge 39 | Arkforge 39 | 1 | 39 (top 41), G | 1/1/1 |
| brinko | Alekhine 37 | Botvinnik 39 | Capablanca 40 | 3 | 42 (top 43), F, fight set | 1/1/1 |
| automode | cruise 40 | daemon 33 | yolo 41 | 3 | 33 (top 41), G | 1/1/1 |
| Myoto | Grumpy 31 | Grumpy 34 | Grumpy 35 | 1 | 36 (top 39), F, fight set | 1/1/1 |
| LewisHeidrick | LH_Crafter 30 | LH_Crafter 35 | LH_Crafter 27 | 1 | 30 (top 41), G | 1/1/1 |
| _zero_ | Zero 32 | Zero 35 | Zero 33 | 1 | 40 (top 40), F, fight set | 1/1/1 |
| br_lemes | br1 30 | br1 30 | br1 31 | 1 | 36 (top 36), G | 1/1/1 |
| ront_tv | Shuckle 31 | Shuckle 30 | Shuckle 30 | 1 | 32 (top 33), G | 1/1/1 |
| Trobyss | Higgs 35 | Proton 35 | Belatryss 37 | 3 | 39 (top 42), F, fight set | 1/1/1 |
| ShadyBliss | Shady3 30 | Shady3 31 | Shady3 30 | 1 | 29 (top 33), G | 1/1/1 |
| Grewaa | JeanMichel 30 | JeanMichel 31 | JeanMichel 31 | 1 | 30 (top 36), G | 1/1/1 |
| Tomlox | CedCraft 27 | CedCraft 29 | CedCraft 30 | 1 | 15 (top 39), G | 1/1/1 |
| jowrjowr | salesalt 30 | salesalt 30 | salesalt 26 | 1 | 31 (top 31), G | 1/1/1 |
| **◀ alverus** | Second 20 | Third 23 | Fourth 21 | 3 | 24 (top 26), G | 1/1/1 |

The 25: weaponcrafting best median 32 (quartiles 30 / 32 / 37), gearcrafting 35 (31 / 35 / 40), jewelrycrafting 32 (30 / 32 / 36). Cooking best median 50, alchemy 43.


### (c) What they wear, by combat band
**At 20–29 the leaders' fight sets (ten, all from 11-22) are craft level 20 or below like this fleet's — 68 of 73 crafted
pieces — with King Slime's slimeballs in 22 of 90 pieces (slime shield 7, dreadful and skull amulets, steel legs, forest
whip: every boss mark at 20–29) and ring of the adept;** at 30–34 the weapon jumps to craft 30 with event or coin materials (elderwood staff, greater dreadful staff,
obsidian battleaxe) while the armor stays 20; from 35 the median piece is craft 30 in every skill, and 32 of 90, 89 of 234
and 34 of 72 pieces (35–39, 40–44, 45+) need an event material.

#### (c) By band, fight sets only (leaders; fight sets: now + the 2026-11-22T1923Z read's not in a fight set of the band now)

| band | characters now | fight sets | pieces | median craft level wc/gc/jc | crafted ≤ 20 | ⚡ event | ¢ coins | B boss | no mark |
|---|---|---|---|---|---|---|---|---|---|
| 20–24 | 11 | 0 + 4 | 36 | 20/20/20 | 33/33 | 0 | 4 | 12 | 23 |
| 25–29 | 2 | 0 + 6 | 54 | 20/20/20 | 35/40 | 3 | 3 | 10 | 31 |
| 30–34 | 23 | 2 + 3 | 45 | 30/20/25 | 21/39 | 11 | 10 | 9 | 19 |
| 35–39 | 28 | 7 + 3 | 90 | 30/30/30 | 21/82 | 32 | 18 | 8 | 41 |
| 40–44 | 33 | 24 + 2 | 234 | 30/30/30 | 35/218 | 89 | 98 | 19 | 67 |
| 45+ | 11 | 7 + 1 | 72 | 35/30/30 | 1/67 | 34 | 34 | 4 | 16 |

Marks (022's rule, lib.mjs pieceInfo): ⚡ a material only an event gives, ¢ tasks coins, B a boss drop, R a raid, A only an achievement's reward, g NPC gold; wc/gc/jc = weapon/gear/jewelrycrafting level, nc = not crafted; `?` = one of several marked routes.

#### (c) Combat 20–24: 11 leaders' characters now, 0 in a fight set, + 4 fight sets of the 2026-11-22T1923Z read (shuxart/Esmenet 21, Odiodin/Nilla 24, Zetark/Flintvein 24, Zetark/Reedfin 23) — the pieces worn (count; craft skill and level; marks)

| slot | pieces |
|---|---|
| weapon | steel_battleaxe (wc20) ×2, battlestaff (wc20), forest_whip (wc20 B) |
| shield | slime_shield (gc20 B) ×3, iron_shield (gc10) |
| helmet | iron_helm (gc10), magic_wizard_hat (gc20), skeleton_helmet (gc20), steel_helm (gc20) |
| body | hard_leather_armor (gc20), mushmush_jacket (gc15), skeleton_armor (gc20), steel_armor (gc20) |
| legs | steel_legs_armor (gc20 B) ×2, hard_leather_pants (gc20), skeleton_pants (gc20) |
| boots | steel_boots (gc20) ×3, leather_boots (gc10) |
| rings | forest_ring (nc) ×3, ring_of_chance (jc20 ¢B) ×3, earth_ring (jc15), steel_ring (jc20) |
| amulet | dreadful_amulet (jc20 B) ×3, wisdom_amulet (jc15 ¢) |

Craft level of the crafted pieces, median: weapon 20, gear 20, jewelry 20; 33 of 33 crafted pieces at craft level 20 or below; of 36 pieces 0 need an event material, 4 tasks coins, 12 a boss; 23 none of the marks.

#### (c) Combat 25–29: 2 leaders' characters now, 0 in a fight set, + 6 fight sets of the 2026-11-22T1923Z read (shuxart/Achamian 29, shuxart/Mimara 27, Odiodin/Lediv 27, Odiodin/Bean 29, Zetark/Ashmere 26, Zetark/Sunbloom 26) — the pieces worn (count; craft skill and level; marks)

| slot | pieces |
|---|---|
| weapon | skull_staff (wc20) ×3, forest_whip (wc20 B), skull_wand (wc25 ¢), steel_battleaxe (wc20) |
| shield | slime_shield (gc20 B) ×4, iron_shield (gc10) ×2 |
| helmet | tromatising_mask (gc20) ×3, piggy_helmet (gc25 ⚡), steel_helm (gc20), wolf_ears (nc) |
| body | hard_leather_armor (gc20) ×2, skeleton_armor (gc20) ×2, bandit_armor (nc ⚡), piggy_armor (gc25 ⚡¢) |
| legs | skeleton_pants (gc20) ×3, snakeskin_legs_armor (gc25) ×2, adventurer_pants (gc15) |
| boots | old_boots (nc) ×2, steel_boots (gc20) ×2, iron_boots (gc10), leather_boots (gc10) |
| rings | ring_of_the_adept (nc A) ×8, forest_ring (nc) ×2, steel_ring (jc20) ×2 |
| amulet | skull_amulet (jc20 B) ×4, dreadful_amulet (jc20 B), wisdom_amulet (jc15 ¢) |

Craft level of the crafted pieces, median: weapon 20, gear 20, jewelry 20; 35 of 40 crafted pieces at craft level 20 or below; of 54 pieces 3 need an event material, 3 tasks coins, 10 a boss; 31 none of the marks.

#### (c) Combat 30–34: 23 leaders' characters now, 2 in a fight set, + 3 fight sets of the 2026-11-22T1923Z read (automode/daemon 33, FRALEXAlexander/FRALEX0000 31, Zetark/Zetark 34) — the pieces worn (count; craft skill and level; marks)

| slot | pieces |
|---|---|
| weapon | battlestaff (wc20) ×2, elderwood_staff (wc30 ⚡), greater_dreadful_staff (wc30 ¢), obsidian_battleaxe (wc30 ⚡) |
| shield | iron_shield (gc10) ×2, slime_shield (gc20 B) ×2, gold_shield (gc30 ⚡¢) |
| helmet | magic_wizard_hat (gc20) ×2, gold_mask (gc30 ⚡), hard_leather_helmet (gc20 ¢), obsidian_helmet (gc30 ⚡) |
| body | bandit_armor (nc ⚡) ×2, lizard_skin_armor (gc25 ⚡¢), steel_armor (gc20), stormforged_armor (gc25 ⚡¢) |
| legs | conjurer_skirt (gc30 ⚡), gold_platelegs (gc30 ⚡), leather_legs_armor (gc10), snakeskin_legs_armor (gc25), steel_legs_armor (gc20 B) |
| boots | old_boots (nc) ×2, hard_leather_boots (gc20), snakeskin_boots (gc20), steel_boots (gc20) |
| rings | ring_of_chance (jc20 ¢B) ×3, gold_ring (jc30) ×2, ring_of_the_adept (nc A) ×2, royal_skeleton_ring (jc30) ×2, life_ring (jc15) |
| amulet | dreadful_amulet (jc20 B) ×2, sapphire_amulet (jc25 ¢) ×2, greater_dreadful_amulet (jc30 B) |

Craft level of the crafted pieces, median: weapon 30, gear 20, jewelry 25; 21 of 39 crafted pieces at craft level 20 or below; of 45 pieces 11 need an event material, 10 tasks coins, 9 a boss; 19 none of the marks.

#### (c) Combat 35–39: 28 leaders' characters now, 7 in a fight set, + 3 fight sets of the 2026-11-22T1923Z read (shuxart/Kellhus 35, chewbaccoin/Chewbaccoin 35, chewbaccoin/Vador 35) — the pieces worn (count; craft skill and level; marks)

| slot | pieces |
|---|---|
| weapon | perfect_bow (wc30 ⚡) ×3, death_knight_sword (nc) ×2, elderwood_staff (wc30 ⚡) ×2, gold_sword (wc30 ⚡) ×2, greater_dreadful_staff (wc30 ¢) |
| shield | gold_shield (gc30 ⚡¢) ×3, slime_shield (gc20 B) ×3, iron_shield (gc10) ×2, dreadful_shield (gc35 ¢), wooden_shield (gc1) |
| helmet | obsidian_helmet (gc30 ⚡) ×3, gold_mask (gc30 ⚡) ×2, royal_skeleton_helmet (gc30) ×2, gold_helm (gc30 ⚡), lich_crown (nc B), piggy_helmet (gc25 ⚡) |
| body | bandit_armor (nc ⚡) ×4, skeleton_armor (gc20) ×2, conjurer_cloak (gc30 ⚡¢), gold_platebody (gc30 ⚡), piggy_armor (gc25 ⚡¢), royal_skeleton_armor (gc30) |
| legs | conjurer_skirt (gc30 ⚡) ×3, royal_skeleton_pants (gc30) ×3, snakeskin_legs_armor (gc25) ×2, piggy_pants (gc25 ¢), steel_legs_armor (gc20 B) |
| boots | gold_boots (gc30 ⚡¢) ×4, steel_boots (gc20) ×3, hard_leather_boots (gc20), lizard_boots (gc30 ⚡¢), snakeskin_boots (gc20) |
| rings | royal_skeleton_ring (jc30) ×14, steel_ring (jc20) ×4, ring_of_the_adept (nc A), ruby_ring (jc30 ¢) |
| amulet | greater_dreadful_amulet (jc30 B) ×2, lost_amulet (jc30) ×2, ruby_amulet (jc25 ¢) ×2, air_and_water_amulet (jc10), prospecting_amulet (jc30 ¢), skull_amulet (jc20 B), wisdom_amulet (jc15 ¢) |

Craft level of the crafted pieces, median: weapon 30, gear 30, jewelry 30; 21 of 82 crafted pieces at craft level 20 or below; of 90 pieces 32 need an event material, 18 tasks coins, 8 a boss; 41 none of the marks.

#### (c) Combat 40–44: 33 leaders' characters now, 24 in a fight set, + 2 fight sets of the 2026-11-22T1923Z read (Fox___/Fox_3 44, krolov/Tarina 43) — the pieces worn (count; craft skill and level; marks)

| slot | pieces |
|---|---|
| weapon | obsidian_battleaxe (wc30 ⚡) ×8, death_knight_sword (nc) ×4, gold_sword (wc30 ⚡) ×4, elderwood_staff (wc30 ⚡) ×3, greater_dreadful_staff (wc30 ¢) ×3, perfect_bow (wc30 ⚡) ×3, mithril_sword (wc40 ¢) |
| shield | dreadful_shield (gc35 ¢) ×9, gold_shield (gc30 ⚡¢) ×8, slime_shield (gc20 B) ×7, iron_shield (gc10) ×2 |
| helmet | jester_hat (gc35 ¢) ×9, obsidian_helmet (gc30 ⚡) ×5, gold_helm (gc30 ⚡) ×3, hard_leather_helmet (gc20 ¢) ×3, gold_mask (gc30 ⚡) ×2, lich_crown (nc B) ×2, leather_hat (gc10), royal_skeleton_helmet (gc30) |
| body | bandit_armor (nc ⚡) ×8, royal_skeleton_armor (gc30) ×4, stormforged_armor (gc25 ⚡¢) ×4, conjurer_cloak (gc30 ⚡¢) ×2, lizard_skin_armor (gc25 ⚡¢) ×2, dreadful_armor (gc35 B¢), gold_platebody (gc30 ⚡), hard_leather_armor (gc20), +3 |
| legs | gold_platelegs (gc30 ⚡) ×7, royal_skeleton_pants (gc30) ×6, conjurer_skirt (gc30 ⚡) ×4, ancient_jean (gc35 ⚡¢) ×2, mithril_platelegs (gc40 ⚡) ×2, stormforged_pants (gc25 ⚡¢) ×2, enchanter_pants (gc35 ⚡¢), hard_leather_pants (gc20), +1 |
| boots | gold_boots (gc30 ⚡¢) ×9, snakeskin_boots (gc20) ×7, lizard_boots (gc30 ⚡¢) ×5, hard_leather_boots (gc20) ×2, steel_boots (gc20) ×2, flying_boots (gc30 ¢) |
| rings | royal_skeleton_ring (jc30) ×30, topaz_ring (jc30 ¢) ×12, sapphire_ring (jc30 ¢) ×3, malefic_ring (jc35 ⚡¢) ×2, ring_of_the_adept (nc A) ×2, ruby_ring (jc30 ¢) ×2, ring_of_chance (jc20 ¢B) |
| amulet | topaz_amulet (jc25 ¢) ×8, greater_dreadful_amulet (jc30 B) ×6, prospecting_amulet (jc30 ¢) ×3, fire_and_earth_amulet (jc10) ×2, ruby_amulet (jc25 ¢) ×2, air_and_water_amulet (jc10), life_amulet (jc5), lost_amulet (jc30), +2 |

Craft level of the crafted pieces, median: weapon 30, gear 30, jewelry 30; 35 of 218 crafted pieces at craft level 20 or below; of 234 pieces 89 need an event material, 98 tasks coins, 19 a boss; 67 none of the marks.

#### (c) Combat 45+: 11 leaders' characters now, 7 in a fight set, + 1 fight sets of the 2026-11-22T1923Z read (Fox___/Fox_1 46) — the pieces worn (count; craft skill and level; marks)

| slot | pieces |
|---|---|
| weapon | bloodblade (wc40 ¢) ×2, greater_dreadful_staff (wc30 ¢) ×2, gold_sword (wc30 ⚡), mithril_sword (wc40 ¢), obsidian_battleaxe (wc30 ⚡), wrathsword (wc40 ¢) |
| shield | gold_shield (gc30 ⚡¢) ×5, fire_shield (gc40 ⚡B), goblin_guard_shield (nc), mithril_shield (gc40 ⚡) |
| helmet | lich_crown (nc B) ×2, darkforged_helmet (gc45 ⚡¢), gold_helm (gc30 ⚡), jester_hat (gc35 ¢), mithril_helm (gc40 ⚡¢), obsidian_helmet (gc30 ⚡), royal_skeleton_helmet (gc30) |
| body | gold_platebody (gc30 ⚡) ×2, obsidian_armor (gc30 ⚡) ×2, lizard_skin_armor (gc25 ⚡¢), mithril_platebody (gc40 ⚡¢), royal_skeleton_armor (gc30), strangold_armor (gc35 ⚡¢) |
| legs | gold_platelegs (gc30 ⚡) ×2, royal_skeleton_pants (gc30) ×2, enchanter_pants (gc35 ⚡¢), mesh_legs_armor (gc45 ⚡AR), mithril_platelegs (gc40 ⚡), strangold_legs_armor (gc35 ⚡¢) |
| boots | gold_boots (gc30 ⚡¢) ×2, lizard_boots (gc30 ⚡¢) ×2, cultist_boots (gc40 ⚡AR), flying_boots (gc30 ¢), iron_boots (gc10), mithril_boots (gc40 ⚡¢) |
| rings | royal_skeleton_ring (jc30) ×9, mithril_ring (jc40 ⚡) ×2, ruby_ring (jc30 ¢) ×2, sapphire_ring (jc30 ¢) ×2, ring_of_the_adept (nc A) |
| amulet | greater_sapphire_amulet (jc40 ¢) ×2, topaz_amulet (jc25 ¢) ×2, amulet_of_the_grand_master (nc A), greater_dreadful_amulet (jc30 B), greater_ruby_amulet (jc40 ¢), lost_amulet (jc30) |

Craft level of the crafted pieces, median: weapon 35, gear 30, jewelry 30; 1 of 67 crafted pieces at craft level 20 or below; of 72 pieces 34 need an event material, 34 tasks coins, 4 a boss; 16 none of the marks.

#### (c) This fleet's five sets at the read (alverus, 2026-11-23T1222Z; a tool in the weapon slot = a gathering set)

| slot | First 23 | Second 26 | Third 24 | Fourth 24 | Fifth 24 |
|---|---|---|---|---|---|
| weapon | spruce_fishing_rod (wc10 ¢) | iron_axe (wc10 ¢) | steel_gloves (wc20 ¢) | iron_axe (wc10 ¢) | spruce_fishing_rod (wc10 ¢) |
| shield | — | — | — | — | — |
| helmet | wolf_ears (nc) | wolf_ears (nc) | hard_leather_helmet (gc20 ¢) | wolf_ears (nc) | wolf_ears (nc) |
| body_armor | adventurer_vest (gc10) | adventurer_vest (gc10) | adventurer_vest (gc10) | adventurer_vest (gc10) | adventurer_vest (gc10) |
| leg_armor | adventurer_pants (gc15) | adventurer_pants (gc15) | adventurer_pants (gc15) | adventurer_pants (gc15) | adventurer_pants (gc15) |
| boots | hard_leather_boots (gc20) | hard_leather_boots (gc20) | hard_leather_boots (gc20) | hard_leather_boots (gc20) | hard_leather_boots (gc20) |
| ring1 | steel_ring (jc20) | ring_of_the_adept (nc A) | steel_ring (jc20) | steel_ring (jc20) | steel_ring (jc20) |
| ring2 | steel_ring (jc20) | ring_of_the_adept (nc A) | steel_ring (jc20) | steel_ring (jc20) | steel_ring (jc20) |
| amulet | wisdom_amulet (jc15 ¢) | wisdom_amulet (jc15 ¢) | wisdom_amulet (jc15 ¢) | wisdom_amulet (jc15 ¢) | wisdom_amulet (jc15 ¢) |
| rune | — | — | — | — | — |
| artifact1 | novice_guide | novice_guide | novice_guide | novice_guide | novice_guide |
| artifact2 | altar_doll | altar_doll | altar_doll | altar_doll | altar_doll |
| artifact3 | lost_world_map | lost_world_map | lost_world_map | lost_world_map | lost_world_map |
| bag | — | — | — | — | — |
| utility | — | — | — | — | — |
| fight set | no | no | no | no | no |


### (d) Sustain
**A rune on 36 of the 40 fight sets now (healing 25, burn 8), food on 27, a restore potion on 2**; at 20–29, 5 of 10 a
rune, 9 food, 4 a restore potion (one worn: a minor health potion). This fleet: no rune, no food, no bag, no potion at the
read.

#### (d) Sustain, fight sets by combat band (characters.jsonl: `rune`, `utility1/2`, `inventory`, `bag`, `artifact1–3`; now + the 2026-11-22T1923Z read's, as in (c))

| band | n | rune (kind) | utility worn | a restore potion worn or carried | food carried (median units) | other potions carried | bag | artifacts |
|---|---|---|---|---|---|---|---|---|
| 20–24 (0 + 4) | 4 | 1: healing | 0: — | 2 | 4 (median 13): trout ×3, chicken, gudgeon | — | 0: — | novice_guide ×4, altar_doll ×2 |
| 25–29 (0 + 6) | 6 | 4: healing ×4 | 1: minor_health | 2 | 5 (median 24): apple ×3, gudgeon ×2, trout ×2 | — | 1: satchel | novice_guide ×6, altar_doll ×4, lost_world_map ×2 |
| 30–34 (2 + 3) | 5 | 4: healing ×2, burn, healing_aura | 1: health_splash | 2 | 4 (median 51): apple, bass, beef, chicken, +2 | enchanted, forest_bank, recall | 2: satchel ×2 | perfect_pearl ×4, lost_world_map ×3, novice_guide ×3, altar_doll, +1 |
| 35–39 (7 + 3) | 10 | 7: healing ×5, burn ×2 | 0: — | 0 | 7 (median 57): bass ×5, apple ×2, shrimp ×2, trout ×2, +2 | recall ×5, forest_bank ×3 | 5: satchel ×3, backpack ×2 | novice_guide ×9, lost_world_map ×6, altar_doll ×5, perfect_pearl ×4 |
| 40–44 (24 + 2) | 26 | 25: healing ×18, burn ×7 | 1: greater_health | 1 | 17 (median 25): salmon ×9, bass ×4, beef ×4, porkchop ×4, +5 | recall ×5, enchanted, forest_bank | 11: satchel ×7, backpack ×4 | novice_guide ×25, perfect_pearl ×16, altar_doll ×12, lost_world_map ×11, +2 |
| 45+ (7 + 1) | 8 | 8: healing ×5, healing_aura ×2, lifesteal | 1: fire_res, greater_health | 1 | 6 (median 102.5): salmon ×4, chicken ×3, bass ×2, hellhound_meat ×2, +1 | recall ×5, forest_bank ×4, enchanted | 7: satchel ×7 | perfect_pearl ×8, novice_guide ×7, lost_world_map ×4, life_crystal ×2, +2 |
| all 25 leaders' fight sets now | 40 | 36: healing ×25, burn ×8, healing_aura ×2, lifesteal | 2: greater_health ×2, fire_res | 2 | 27 (median 37): salmon ×11, bass ×10, beef ×5, chicken ×5, +9 | recall ×14, forest_bank ×8, enchanted | 23: satchel ×17, backpack ×6 | novice_guide ×37, perfect_pearl ×28, lost_world_map ×18, altar_doll ×15, +2 |
| their other characters now | 85 | 41: healing ×30, burn ×8, healing_aura ×2, protection | 3: health ×2, greater_health, minor_health, small_antidote | 2 | 8 (median 25): chicken ×5, rat_meat ×5, apple ×3, trout ×3, +3 | recall ×29, forest_bank ×24, enchanted ×4 | 54: satchel ×49, backpack ×5 | altar_doll ×71, novice_guide ×69, lost_world_map ×36, perfect_pearl ×32 |
| **◀ alverus** (all five) | 5 | 0: — | 0: — | 0 | 0 | — | 0: — | altar_doll ×5, lost_world_map ×5, novice_guide ×5 |

A restore potion: an item with a `restore` or `splash_restore` effect (items.json). Food: `subtype` food.


### (e) Where they stand
Active = its cooldown ended less than 60 s before the read, or had not ended (cooldown_expiration against the request's time, requests.log). In 2026-11-23T1222Z the ended cooldowns lie 0.1–1.8 s before the read and one 324.5 s; in 2026-11-22T1923Z every ended one within 8 s but five over 12 h. So a script acts within seconds of its cooldown; 60 s keeps every such character and drops the stopped ones. Not active now: at0mstr0m/at0m_4 324.5 s.

**No leader fights a monster at or above its own level** (0 of 66, both reads); at 20–29 the gap was 5–14 (11-22), at 40–44 it is 6–34
with a median of 12.5 — 14 of 24 fight where they get no XP (drops, tasks, kill counts). Of the 39 on a monster now, 15 work
a tasks-master task for that very monster.

#### (e1) Where the active characters stand, by band (the tile: maps.json, else an event's place in events.json)

| band | active | monster | resource | workshop | bank | grand_exchange | tasks_master | npc | none |
|---|---|---|---|---|---|---|---|---|---|
| <20 | 16 | 0 | 16 | 0 | 0 | 0 | 0 | 0 | 0 |
| 20–24 | 11 | 0 | 11 | 0 | 0 | 0 | 0 | 0 | 0 |
| 25–29 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 30–34 | 23 | 2 | 18 | 0 | 1 | 0 | 0 | 0 | 2 |
| 35–39 | 28 | 7 | 19 | 2 | 0 | 0 | 0 | 0 | 0 |
| 40–44 | 33 | 24 | 9 | 0 | 0 | 0 | 0 | 0 | 0 |
| 45+ | 11 | 6 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| **◀ alverus** | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |

#### (e2) Every active character on a monster's tile: the monster, its level, the character's level less the monster's, the set, the task

| account | character | combat | monster | monster level | gap | weapon + rune + utilities + food | HP at the read | task (progress) |
|---|---|---|---|---|---|---|---|---|
| Fox___ | Fox_4 | 31 | chicken | 1 | 30 | elderwood_staff + burn rune + food | 1305/1305 | yellow_slime 0/272 |
| jowrjowr | saeka | 31 | green_slime | 4 | 27 | battlestaff + healing rune + food | 618/750 | nettle_leaf 0/111 |
| Myoto | Grumpy | 36 | imp | 28 | 8 | elderwood_staff + food | 188/1100 | mushmush 233/323 |
| _zero_ | Bulma | 37 | imp | 28 | 9 | elderwood_staff + healing rune + food | 349/1185 | pig 167/227 |
| Myoto | Silas | 37 | cyclops | 25 | 12 | perfect_bow + food | 1065/1065 | cyclops ✓ 205/323 |
| aropan | Zynfin | 38 | imp | 28 | 10 | perfect_bow + burn rune | 652/1100 | — |
| Big_Shark | IronMan | 39 | ogre | 20 | 19 | perfect_bow + healing rune + food | 798/1105 | gudgeon 58/117 |
| Tomlox | Cedrus | 39 | skeleton | 18 | 21 | death_knight_sword | 1010/1010 | cow 0/264 |
| Trobyss | Proton | 39 | vampire | 24 | 15 | death_knight_sword + healing rune | 213/1175 | cursed_tree 114/278 |
| _zero_ | Zero | 40 | imp | 28 | 12 | elderwood_staff + food | 436/1200 | spider 0/343 |
| aropan | Bixbrew | 40 | cultist_acolyte | 33 | 7 | perfect_bow + burn rune | 1110/1110 | cultist_acolyte ✓ 322/387 |
| Alrick00 | Josh | 41 | death_knight | 28 | 13 | greater_dreadful_staff + healing rune | 544/930 | dryad 0/379 |
| Alrick00 | Astrid | 41 | cursed_tree | 34 | 7 | obsidian_battleaxe + healing rune | 414/1195 | cyclops 101/111 |
| aropan | Vexwood | 41 | cultist_acolyte | 33 | 8 | elderwood_staff + burn rune | 1165/1165 | — |
| automode | cruise | 41 | vampire | 24 | 17 | gold_sword + healing rune + food | 644/1020 | highwayman 308/345 |
| brinko | Alekhine | 41 | pig | 19 | 22 | death_knight_sword + healing rune + food | 282/1025 | pig ✓ 124/246 |
| brinko | Ding | 41 | goblin_guard | 35 | 6 | obsidian_battleaxe + healing rune | 1095/1095 | goblin_guard ✓ 174/182 |
| krolov | Zarina | 41 | vampire | 24 | 17 | death_knight_sword + healing rune | 876/1055 | vampire ✓ 66/316 |
| LewisHeidrick | LH_Fighter | 41 | cursed_tree | 34 | 7 | death_knight_sword + healing rune + food | 142/1005 | cursed_tree ✓ 91/256 |
| Turbofish | Orchid | 41 | spider | 20 | 21 | greater_dreadful_staff + burn rune + food | 631/925 | spider ✓ 120/141 |
| brinko | Botvinnik | 42 | rat | 25 | 17 | gold_sword + healing rune + food | 777/1160 | rat ✓ 100/255 |
| brinko | Euwe | 42 | cow | 8 | 34 | obsidian_battleaxe + healing rune + food | 270/1110 | cow ✓ 75/187 |
| Pischke | Pischke | 42 | mushmush | 10 | 32 | gold_sword + healing rune + greater_health_potion 1 + food | 734/800 | spider 193/233 |
| Trobyss | Trobyss | 42 | owlbear | 30 | 12 | obsidian_battleaxe + burn rune | 1070/1070 | goblin_wolfrider 0/333 |
| Turbofish | Dorothy | 42 | wolf | 15 | 27 | death_knight_sword + healing rune + food | 1170/1170 | wolf ✓ 76/291 |
| brinko | Capablanca | 43 | ogre | 20 | 23 | perfect_bow + healing rune + food | 289/1015 | ogre ✓ 250/329 |
| Elemental | Ron | 43 | goblin_guard | 35 | 8 | obsidian_battleaxe + healing rune + food | 319/1035 | highwayman 92/387 |
| Elemental | Fredrick | 43 | goblin_guard | 35 | 8 | obsidian_battleaxe + burn rune + food | 1035/1035 | blue_slime 283/316 |
| Elemental | George | 43 | goblin_guard | 35 | 8 | obsidian_battleaxe + burn rune + food | 113/1035 | spider 48/301 |
| hunter2 | Viconia | 43 | cursed_tree | 34 | 9 | obsidian_battleaxe + healing rune + food | 445/1105 | cursed_tree ✓ 21/266 |
| at0mstr0m | at0m_1 | 44 | imp | 28 | 16 | perfect_bow + healing rune + food | 1110/1110 | ogre 40/136 |
| hunter2 | Aerie | 44 | mushmush | 10 | 34 | greater_dreadful_staff + healing rune + food | 1165/1165 | mushmush ✓ 110/193 |
| krolov | Marina | 44 | cursed_tree | 34 | 10 | gold_sword + healing rune | 1140/1140 | vampire 95/381 |
| hunter2 | Pablo | 45 | rat | 25 | 20 | obsidian_battleaxe + healing rune + food | 953/1225 | rat ✓ 181/209 |
| krolov | Tarina | 45 | cursed_tree | 34 | 11 | gold_sword + healing rune | 1105/1105 | — |
| hunter2 | Jaheira | 50 | cultist_acolyte | 33 | 17 | greater_dreadful_staff + healing rune + food | 692/1495 | cultist_acolyte ✓ 337/367 |
| uaprsf | frtCombat | 50 | rosenblood (boss) | 40 | 10 | bloodblade + healing_aura rune + food | 1190/1190 | — |
| uaprsf | frtFish | 50 | rosenblood (boss) | 40 | 10 | wrathsword + healing rune + greater_health_potion 44, fire_res_potion 49 + food | 1935/1935 | — |
| uaprsf | frtCraft | 50 | rosenblood (boss) | 40 | 10 | mithril_sword + healing_aura rune + food | 1100/1100 | — |

⚡ = an event's place (events.json) with no monster on the static map: the event was up. ✓ = the task is a tasks-master task for the monster it stands on. Of the leaders' 39 on a monster now: 15 its task's monster, 18 another task, 6 no task; in the 2026-11-22T1923Z read: 6 its task's monster, 16 another task, 5 no task.

#### (e3) The gap (character level − monster level) of the leaders' active fighters, by band and read

| band | read | n | min | Q1 | median | Q3 | max | ≤ 0 (at or above its level) | 6–10 (XP × 0.7) | > 10 (no XP) |
|---|---|---|---|---|---|---|---|---|---|---|
| 20–24 | 2026-11-22T1923Z | 2 | 5 | 5 | 7 | 9 | 9 | 0 | 1 | 0 |
| 25–29 | 2026-11-22T1923Z | 3 | 8 | 8 | 9 | 14 | 14 | 0 | 2 | 1 |
| 30–34 | 2026-11-23T1222Z | 2 | 27 | 27 | 28.5 | 30 | 30 | 0 | 0 | 2 |
| 30–34 | 2026-11-22T1923Z | 3 | 14 | 14 | 16 | 24 | 24 | 0 | 0 | 3 |
| 35–39 | 2026-11-23T1222Z | 7 | 8 | 9 | 12 | 19 | 21 | 0 | 3 | 4 |
| 35–39 | 2026-11-22T1923Z | 2 | 10 | 10 | 10 | 10 | 10 | 0 | 2 | 0 |
| 40–44 | 2026-11-23T1222Z | 24 | 6 | 8 | 12.5 | 21.5 | 34 | 0 | 10 | 14 |
| 40–44 | 2026-11-22T1923Z | 10 | 4 | 7 | 9.5 | 17 | 32 | 0 | 6 | 3 |
| 45+ | 2026-11-23T1222Z | 6 | 10 | 10 | 10.5 | 17 | 20 | 0 | 3 | 3 |
| 45+ | 2026-11-22T1923Z | 7 | 6 | 6 | 11 | 16 | 30 | 0 | 3 | 4 |

XP: × 0.7 more than 5 levels above the monster, nothing more than 10 above (src/plan/xp.ts:68-69).


(e4) Every active character on a resource (80 leaders' and this fleet's five, `tables/2e-where.md`): the leaders' skill
stands 5 / 9 / 12 (quartiles) above the node's level; this fleet's 2–14.

### (f) The pace
Between the reads (17.0 h): **16 characters (15 leaders' and this fleet's Fourth) gained exactly a quarter of their level's
XP and nothing else — the day's combat offering**; that quarter is taken off. With it off, the leaders' fighters at 40–44 took a median **30 h a level**
(fastest 11.3: `Elemental`'s three at the goblin guard), against the atlas's special tier 6.4 h, 022's "every special
piece, potions free" 3.9 h and 022's "today's pool, today's price" 785 h. **No leader was faster than this fleet's model
with every piece free and potions free (022 v) where that road is defined (to 44); two were faster than the atlas's
special tier: `uaprsf`'s frtCombat and frtCraft, 46 → 50 at 6.0–6.1 h a level** — on the hellhound at 19:23 on 11-22, on
the Rosenblood boss as a group of three at this read (a boss's XP is doubled, `src/plan/xp.ts:70`). This fleet: 0–0.24 levels of fight XP each.

#### (f1) Every character in both reads that gained combat XP (2026-11-22T1923Z → 2026-11-23T1222Z): measured against this fleet's model for the same levels

| account | character | combat | hours between reads | combat XP | XP/h | levels | levels less one offering | h a level (measured, less the offering) | atlas core | atlas plus | atlas special | 022 pool i today | 022 v +special, potions free | flag | skill XP/h (top two) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| krolov | Karina | 15 → 15 | 17.0 | 1100 | 65 | 0.25 | offering only | — | 3.5 | 2.6 | 2.6 | — | — |  | fi 1791/h, jc 92/h |
| automode | pilot | 19 → 19 | 17.0 | 1800 | 106 | 0.25 | offering only | — | 6.4 | 4.7 | 4.7 | — | — |  | — |
| krolov | Darina | 21 → 21 | 17.0 | 2300 | 136 | 0.25 | offering only | — | 3.8 | 3.1 | 3.1 | — | — |  | fi 2117/h, mi 1626/h |
| Turbofish | Jade | 22 → 22 | 17.0 | 2550 | 150 | 0.25 | offering only | — | 4.3 | 3.5 | 3.5 | — | — |  | mi 2916/h, wo 2638/h |
| **◀ alverus** | First | 23 → 23 | 17.0 | 3085 | 182 | 0.28 | 0.03 | 667.0 | 4.7 | 3.8 | 3.8 | 5.3 | 2.3 |  | mi 1697/h, fi 1196/h |
| **◀ alverus** | Fourth | 23 → 24 | 17.0 | 2800 | 165 | 0.24 | offering only | — | 5.0 | 4.1 | 4.1 | 5.7 | 2.5 |  | mi 2390/h, wo 1023/h |
| Turbofish | Turbofish | 23 → 23 | 17.0 | 2800 | 165 | 0.25 | offering only | — | 4.7 | 3.8 | 3.8 | 5.3 | 2.3 |  | jc 2/h, al 2/h |
| **◀ alverus** | Third | 24 → 24 | 17.0 | 5974 | 352 | 0.49 | 0.24 | 70.8 | 5.2 | 4.3 | 4.3 | 6.0 | 2.7 |  | al 606/h, gc 292/h |
| **◀ alverus** | Fifth | 24 → 24 | 17.0 | 112 | 7 | 0.01 | 0.01 | 1848.9 | 5.2 | 4.3 | 4.3 | 6.0 | 2.7 |  | mi 3871/h, fi 934/h |
| **◀ alverus** | Second | 25 → 26 | 17.0 | 5072 | 299 | 0.35 | 0.12 | 141.6 | 9.0 | 5.3 | 4.3 | 9.0 | 3.0 |  | wo 2644/h, mi 4/h |
| Fox___ | Fox_4 | 30 → 31 | 17.0 | 4925 | 290 | 0.25 | offering only | — | — | 5.0 | 3.2 | 47.8 | 2.0 |  | wo 473/h |
| automode | daemon | 33 → 33 | 17.0 | 9617 | 567 | 0.40 | 0.15 | 115.2 | 25.5 | 8.0 | 4.8 | 80.1 | 2.4 |  | — |
| Turbofish | Myrtle | 37 → 37 | 17.0 | 11375 | 670 | 0.37 | 0.12 | 146.6 | — | 13.5 | 6.5 | 323.4 | 2.8 |  | mi 2761/h, jc 4/h |
| Wudagem | Boris | 37 → 37 | 17.0 | 9941 | 586 | 0.32 | 0.07 | 243.7 | — | 13.5 | 6.5 | 323.4 | 2.8 |  | mi 3280/h, fi 1437/h |
| Big_Shark | IronMan | 38 → 39 | 17.0 | 26153 | 1541 | 0.78 | 0.54 | 31.7 | — | — | 7.5 | 423.1 | 3.2 |  | jc 2808/h, wo 485/h |
| TheCarriedOne | Carried_B1 | 38 → 38 | 17.0 | 8225 | 485 | 0.25 | offering only | — | — | — | 7.3 | 347.0 | 3.0 |  | mi 4881/h, jc 312/h |
| TheCarriedOne | Carried_G1 | 38 → 38 | 17.0 | 8225 | 485 | 0.25 | offering only | — | — | — | 7.3 | 347.0 | 3.0 |  | fi 3699/h, mi 354/h |
| TheCarriedOne | Carried_G3 | 38 → 38 | 17.0 | 8225 | 485 | 0.25 | offering only | — | — | — | 7.3 | 347.0 | 3.0 |  | mi 3555/h, fi 2059/h |
| TheCarriedOne | Carried_G2 | 39 → 40 | 17.0 | 8675 | 511 | 0.25 | offering only | — | — | — | 7.2 | 584.7 | 3.4 |  | co 3869/h, mi 2796/h |
| Wudagem | Wuda | 39 → 39 | 17.0 | 10114 | 596 | 0.29 | 0.04 | 409.3 | — | — | 7.8 | 571.6 | 3.5 |  | fi 2935/h, al 18/h |
| Big_Shark | Hulk | 40 → 40 | 17.0 | 10170 | 599 | 0.28 | 0.03 | 592.9 | — | — | 5.7 | 616.7 | 3.3 |  | mi 79/h |
| hunter2 | Imoen | 40 → 40 | 17.0 | 13085 | 771 | 0.36 | 0.11 | 156.5 | — | — | 5.7 | 616.7 | 3.3 |  | fi 7215/h, mi 325/h |
| TheCarriedOne | Carried | 40 → 40 | 17.0 | 9125 | 538 | 0.25 | offering only | — | — | — | 5.7 | 616.7 | 3.3 |  | co 8344/h, fi 3801/h |
| Elemental | George | 41 → 43 | 17.0 | 71214 | 4196 | 1.73 | 1.50 | 11.3 | — | — | 6.4 | 785.3 | 3.8 |  | mi 202/h |
| krolov | Zarina | 41 → 41 | 17.0 | 9650 | 569 | 0.25 | offering only | — | — | — | 5.9 | 736.5 | 3.5 |  | al 2/h |
| Turbofish | Orchid | 41 → 41 | 17.0 | 12950 | 763 | 0.34 | 0.09 | 198.5 | — | — | 5.9 | 736.5 | 3.5 |  | wo 2558/h, co 630/h |
| Elemental | Ron | 42 → 43 | 17.0 | 72797 | 4289 | 1.74 | 1.50 | 11.3 | — | — | 6.5 | 799.8 | 3.8 |  | mi 216/h |
| Elemental | Fredrick | 42 → 43 | 17.0 | 65325 | 3849 | 1.56 | 1.32 | 12.9 | — | — | 6.5 | 800.3 | 3.8 |  | mi 435/h |
| hunter2 | Viconia | 42 → 43 | 17.0 | 33170 | 1954 | 0.81 | 0.56 | 30.3 | — | — | 6.4 | 784.6 | 3.9 |  | co 7075/h, fi 2121/h |
| Pischke | Pischke | 42 → 42 | 17.0 | 13199 | 778 | 0.32 | 0.07 | 228.5 | — | — | 6.3 | 776.5 | 3.9 |  | al 2/h |
| Turbofish | Dorothy | 42 → 42 | 17.0 | 10175 | 599 | 0.25 | offering only | — | — | — | 6.3 | 776.5 | 3.9 |  | wc 2242/h, al 698/h |
| Wudagem | Yuri | 42 → 42 | 17.0 | 10562 | 622 | 0.26 | 0.01 | 1785.0 | — | — | 6.3 | 776.5 | 3.9 |  | mi 3785/h, jc 1528/h |
| krolov | Marina | 43 → 44 | 17.0 | 51485 | 3033 | 1.16 | 0.92 | 18.5 | — | — | 6.9 | 852.5 | 4.0 |  | al 31/h |
| krolov | Tarina | 43 → 45 | 17.0 | 46627 | 2747 | 1.04 | 0.80 | 21.2 | — | — | 7.0 | — | — |  | al 538/h, mi 407/h |
| uaprsf | frtMiner | 43 → 43 | 17.0 | 10700 | 630 | 0.25 | offering only | — | — | — | 6.6 | 821.2 | 3.8 |  | al 4/h |
| Fox___ | Fox_2 | 44 → 44 | 17.0 | 22840 | 1346 | 0.51 | 0.26 | 65.6 | — | — | 7.0 | 861.5 | 4.0 |  | mi 2834/h, wo 2180/h |
| Fox___ | Fox_3 | 44 → 45 | 17.0 | 39171 | 2308 | 0.86 | 0.61 | 27.7 | — | — | 6.2 | — | — |  | mi 1898/h, wo 833/h |
| hunter2 | Aerie | 44 → 44 | 17.0 | 36363 | 2142 | 0.81 | 0.56 | 30.3 | — | — | 7.0 | 861.5 | 4.0 |  | co 3646/h, fi 2238/h |
| Wudagem | Wudagem | 44 → 46 | 17.0 | 80440 | 4739 | 1.72 | 1.48 | 11.5 | — | — | 5.5 | — | — |  | jc 2/h |
| Wudagem | Zeni | 44 → 44 | 17.0 | 11630 | 685 | 0.26 | 0.01 | 1881.7 | — | — | 7.0 | 861.5 | 4.0 |  | mi 483/h, al 467/h |
| Big_Shark | Rocket | 45 → 45 | 17.0 | 28778 | 1695 | 0.61 | 0.36 | 46.9 | — | — | 4.6 | — | — |  | — |
| hunter2 | Pablo | 45 → 45 | 17.0 | 14561 | 858 | 0.31 | 0.06 | 283.8 | — | — | 4.6 | — | — |  | fi 379/h, mi 300/h |
| Fox___ | Fox_1 | 46 → 46 | 17.0 | 22200 | 1308 | 0.45 | 0.20 | 82.8 | — | — | 6.7 | — | — |  | wc 788/h, mi 753/h |
| uaprsf | frtCombat | 46 → 50 | 17.0 | 158578 | 9342 | 3.03 | 2.80 | 6.1 | — | — | 7.2 | — | — | faster than the atlas's special tier | — |
| uaprsf | frtCraft | 46 → 50 | 17.0 | 161287 | 9501 | 3.08 | 2.85 | 6.0 | — | — | 7.2 | — | — | faster than the atlas's special tier | gc 2848/h, mi 240/h |
| uaprsf | frtWood | 47 → 48 | 17.0 | 12650 | 745 | 0.25 | offering only | — | — | — | 7.1 | — | — |  | wo 427/h |
| hunter2 | Jaheira | 48 → 50 | 17.0 | 77490 | 4565 | 1.44 | 1.20 | 14.1 | — | — | 7.4 | — | — |  | al 4165/h, gc 538/h |
| uaprsf | frtFish | 49 → 50 | 17.0 | 4265 | 251 | 0.08 | 0.08 | 215.7 | — | — | 7.5 | — | — |  | — |

The model's hours a level: public/data/atlas.json `path[L].t[0..2].hours` (a hypothetical character, wisdom 0, no potions, the tier's pool) and report 022's roads (docs/strategy/022/sec3.json: Third's from 23, Second's from 25; pool i at today's potion price, pool v with the special pieces and potions free), each averaged over the levels crossed, weighted by the share of each. Measured = the hours between the reads ÷ the levels gained less one combat offering (a quarter of a level, a guess); the whole interval counts, so a character that also gathered or idled levelled faster than shown. — = no number (no road of 022 above 44, no atlas tier with a safe XP monster).

#### (f2) The pace by band (the band at the first read; the leaders in both reads)

| band | characters | with fight XP beyond one offering | median combat XP/h (all) | median h a level (measured) | fastest | atlas special | 022 v +special free | 022 i today | faster than every piece free |
|---|---|---|---|---|---|---|---|---|---|
| <20 | 8 | 0 | 0 | — | — | — | — | — | 0 |
| 20–24 | 7 | 0 | 0 | — | — | — | — | — | 0 |
| 25–29 | 1 | 0 | 0 | — | — | — | — | — | 0 |
| 30–34 | 2 | 1 | 428.4 | 115.2 | 115.2 | 4.8 | 2.4 | 80.1 | 0 |
| 35–39 | 8 | 4 | 548.4 | 195.2 | 31.7 | 7.0 | 3.0 | 373.2 | 0 |
| 40–44 | 21 | 16 | 777.6 | 30.3 | 11.3 | 6.4 | 3.9 | 784.9 | 0 |
| 45+ | 8 | 7 | 1501.6 | 46.9 | 6.0 | 7.2 | — | — | 0 |
| **◀ alverus** | 5 | 4 | 181.8 | 404.3 | 70.8 | 4.3 | 2.7 | 6.0 | 0 |

#### (f3) Per account: the points between the reads (the board; the sum of completed achievements) and the fleet's combat XP an hour

| account | board | + | completed (achievements.jsonl) | points a day (completed) | fleet combat XP/h |
|---|---|---|---|---|---|
| uaprsf | 77 → 81 | 4 | 77 → 81 | 5.7 | 20470 |
| Fox___ | 65 → 73 | 8 | 65 → 73 | 11.3 | 5251 |
| hunter2 | 61 → 69 | 8 | 62 → 69 | 9.9 | 10290 |
| Wudagem | 58 → 63 | 5 | 58 → 63 | 7.1 | 7228 |
| Pischke | 59 → 61 | 2 | 59 → 61 | 2.8 | 778 |
| krolov | 55 → 59 | 4 | 55 → 59 | 5.7 | 6549 |
| Big_Shark | 58 → 58 | 0 | 58 → 58 | 0 | 3835 |
| Alrick00 | — → 56 | — | — → 56 | — | — |
| Elemental | 54 → 54 | 0 | 54 → 54 | 0 | 12333 |
| TheCarriedOne | 53 → 53 | 0 | 53 → 53 | 0 | 2503 |
| Turbofish | 53 → 53 | 0 | 53 → 53 | 0 | 2348 |
| at0mstr0m | — → 52 | — | — → 52 | — | — |
| aropan | — → 51 | — | — → 51 | — | — |
| brinko | — → 50 | — | — → 50 | — | — |
| automode | 49 → 49 | 0 | 49 → 49 | 0 | 673 |
| Myoto | — → 47 | — | — → 47 | — | — |
| LewisHeidrick | — → 47 | — | — → 47 | — | — |
| _zero_ | — → 47 | — | — → 47 | — | — |
| br_lemes | — → 46 | — | — → 46 | — | — |
| ront_tv | — → 46 | — | — → 46 | — | — |
| Trobyss | — → 44 | — | — → 44 | — | — |
| ShadyBliss | — → 43 | — | — → 43 | — | — |
| Grewaa | — → 42 | — | — → 42 | — | — |
| Tomlox | — → 42 | — | — → 42 | — | — |
| jowrjowr | — → 41 | — | — → 41 | — | — |
| **◀ alverus** | 29 → 33 | 4 | 30 → 33 | 4.2 | 1004 |

The board lags completions (report 022: 37 min to 4.8 h). 2026-11-22T1923Z: 17 accounts read; the others have no pace.


### (g) The achievements
**Ten achievements that more than half of the 25 have and this account has not, 16 points**; the newest outlook (11:56
UTC) expects eight of the ten by 12-14 — not `slimed_to_none` (24 of 25, King Slime, a group) nor
`turning_treasures_to_gold` (23) — and ten of all 31 that any of the 25 has and this account has not. Every achievement this account has, at least 16 of the 25 have too. The leaders carry progress on
open ones this fleet has not touched: `closing_the_gate` (all 25: 500 demons and 500 imps killed, median), `around_the_world`
(24), `making_a_nether_portal` (21), `corruption_eradicator` (18).

(g1) — every one of the 91 with how many of the 25 have it and their median day: `tables/2g-achievements.md`.

#### (g2) What N of 25 have and alverus has not, by N (the planner's word: the newest outlook record at or before the read, 2026-11-23T11:56:05.636Z, names the expected completions only)

| achievement | pts | of 25 | median day | alverus's progress | the planner |
|---|---|---|---|---|---|
| arachnophobia_conquered | 2 | 25 | 23 | 29/1000 | on the road: 11-30 |
| slimed_to_none | 3 | 24 | 16 | 0/1 | not read |
| ecologist | 1 | 24 | 21 | 683/1000 | on the road: 12-03 |
| turning_treasures_to_gold | 2 | 23 | 18 | 4/5 5/5 | not read |
| the_reaper | 3 | 22 | 23 | 250/250 250/250 0/250 | on the road: 11-26 |
| intermediate_fisherman | 1 | 22 | 18.5 | 1309/6000 | on the road: 11-24 |
| cabinet_maker | 1 | 21 | 24 | 300/300 300/300 5/300 | on the road: 11-26 |
| expert_fisherman | 1 | 20 | 24.5 | 0/6000 | on the road: 12-04 |
| expert_lumberjack | 1 | 20 | 24.5 | 1842/6000 | on the road: 11-26 |
| intermediate_alchemist | 1 | 14 | 24.5 | 5310/6000 | on the road: 11-23 |
| lich_please | 2 | 12 | 24 | 0/1 | not read |
| cultist_purifier | 4 | 11 | 30 | 0/500 | not read |
| professional_fisherman | 1 | 11 | 30 | 0/6000 | on the road: 12-09 |
| diamond_in_the_sky | 3 | 7 | 29 | 0/2 | not read |
| cult_destroyer | 2 | 7 | 27 | 0/1 | not read |
| life_lover | 4 | 6 | 29.5 | 0/24 | not read |
| professional_lumberjack | 1 | 5 | 28 | 0/6000 | not read |
| king_of_the_goblins | 3 | 4 | 30 | 0/30 0/30 0/25 0/10 0/25 0/30 | not read |
| take_her_down | 2 | 4 | 27 | 0/1 | not read |
| expert_alchemist | 1 | 4 | 30 | 0/6000 | on the road: 12-13 |
| professional_miner | 1 | 4 | 26 | 0/6000 | not read |
| clean_the_lab | 3 | 3 | 31 | 0/100 | not read |
| crafted_with_honor | 3 | 2 | 27.5 | 0/1 | not read |
| grand_master | 3 | 2 | 30.5 | 0/50 | not read |
| blood_of_the_cursed | 3 | 1 | 29 | 0/1 | not read |
| secure_the_island | 3 | 1 | 29 | 0/50 | not read |
| catch_and_cook | 2 | 1 | 29 | 0/500 0/500 0/500 | not read |
| master_alchemist | 2 | 1 | 27 | 0/6000 | not read |
| master_lumberjack | 2 | 1 | 30 | 0/6000 | not read |
| palm_paradise | 2 | 1 | 30 | 0/500 | not read |
| pearl_fisher | 1 | 1 | 30 | 3/500 | not read |

10 achievements that more than half of the 25 have and alverus has not, 16 points.

#### (g3) What alverus has, by how few of the 25 have it

| achievement | pts | of 25 | alverus's day | their median day |
|---|---|---|---|---|
| amateur_alchemist | 1 | 16 | 15 | 22 |
| amateur_fisherman | 1 | 17 | 16 | 18 |
| amateur_miner | 1 | 19 | 12 | 12 |
| fisherman | 1 | 20 | 22 | 14.5 |
| alchemist | 2 | 21 | 29 | 22 |
| expert_miner | 1 | 21 | 30 | 24 |
| the_new_bandit | 2 | 22 | 30 | 21.5 |
| worker | 1 | 22 | 31 | 23 |
| a_helping_hand | 2 | 23 | 28 | 18 |
| bite_oh_algae | 2 | 23 | 26 | 20 |
| intermediate_lumberjack | 1 | 23 | 29 | 20 |
| lumberjack | 1 | 24 | 22 | 14.5 |
| adept | 2 | 25 | 28 | 15 |
| highway_patrol | 2 | 25 | 27 | 16 |
| i_want_bacon | 2 | 25 | 28 | 17 |
| king_of_the_forest | 2 | 25 | 20 | 13 |
| tanners_exchange | 2 | 25 | 27 | 18 |
| amateur_lumberjack | 1 | 25 | 18 | 16 |
| feather_me_impressed | 1 | 25 | 12 | 10 |
| in_every_color | 1 | 25 | 14 | 11 |
| intermediate_miner | 1 | 25 | 27 | 18 |
| miner | 1 | 25 | 18 | 14 |
| novice | 1 | 25 | 13 | 10 |
| tasks_farmer | 1 | 25 | 16 | 17 |

#### (g4) Open achievements alverus has not touched (every objective at 0) that leaders are working on: their progress

| achievement | pts | of 25 done | of 25 with progress, open | the open ones' median progress |
|---|---|---|---|---|
| expert_fisherman | 1 | 20 | 2 | gathering bass: median 2378.5 of 6000 |
| cultist_purifier | 4 | 11 | 7 | combat_kill cultist_acolyte: median 209 of 500 |
| professional_fisherman | 1 | 11 | 5 | gathering salmon: median 2213 of 6000 |
| diamond_in_the_sky | 3 | 7 | 5 | crafting diamond: median 1 of 2 |
| life_lover | 4 | 6 | 1 | combat_drop life_crystal_shard: median 1 of 24 |
| professional_lumberjack | 1 | 5 | 10 | gathering maple_wood: median 1971.5 of 6000 |
| king_of_the_goblins | 3 | 4 | 8 | combat_drop goblin_tooth: median 3 of 30; combat_drop goblin_eye: median 4 of 30; combat_drop wolfrider_hair: median 0 of 25; combat_drop broken_sword: median 0 of 10; combat_drop wolfrider_ponytail: median 1 of 25; combat_drop goblin_guard_foot: median 19.5 of 30 |
| expert_alchemist | 1 | 4 | 11 | gathering glowstem_leaf: median 1857 of 6000 |
| professional_miner | 1 | 4 | 9 | gathering mithril_ore: median 1399 of 6000 |
| catch_and_cook | 2 | 1 | 19 | crafting cooked_bass: median 500 of 500; crafting cooked_salmon: median 500 of 500; crafting cooked_swordfish: median 0 of 500 |
| master_alchemist | 2 | 1 | 3 | gathering torch_cactus_flower: median 100 of 6000 |
| around_the_world | 5 | 0 | 24 | combat_kill king_slime: median 1 of 1; combat_kill lich: median 0.5 of 1; combat_kill goblin_priestess: median 0 of 1; combat_kill rosenblood: median 0 of 1; combat_kill duskworm: median 0 of 1; combat_kill sandwhisper_empress: median 0 of 1 |
| a_peaceful_island | 4 | 0 | 1 | combat_kill sandwarden: median 0 of 250; combat_kill desert_scorpion: median 0 of 250; combat_kill sand_snake: median 3 of 250; combat_kill dusk_beetle: median 2 of 250 |
| closing_the_gate | 4 | 0 | 25 | combat_kill demon: median 500 of 500; combat_kill imp: median 500 of 500; combat_kill efreet_sultan: median 0 of 500; combat_kill grimlet: median 0 of 500 |
| coin_collector | 4 | 0 | 1 | combat_drop sandwhisper_coin: median 1 of 500 |
| corruption_eradicator | 4 | 0 | 18 | combat_drop corrupted_gem: median 32 of 800 |
| elementary_book | 4 | 0 | 1 | combat_drop elemental_page: median 28 of 30 |
| its_malefic | 4 | 0 | 4 | combat_drop malefic_shard: median 2.5 of 24 |
| eat_the_forbidden_fruit | 3 | 0 | 3 | use corrupted_fruit: median 14 of 100 |
| magic_harvester | 3 | 0 | 15 | gathering magic_sap: median 28 of 500 |
| queen_of_the_enchanted_forest | 3 | 0 | 5 | combat_kill pixie: median 24 of 75 |
| shining_secrets | 3 | 0 | 1 | crafting alexandrite: median 1 of 2 |
| art_of_teleportation | 2 | 0 | 17 | use recall_potion: median 100 of 100; use forest_bank_potion: median 100 of 100; use enchanted_potion: median 0 of 100; use sandwhisper_potion: median 0 of 100 |
| magic_lumberjack | 2 | 0 | 15 | gathering magic_wood: median 210 of 3000 |
| making_a_nether_portal | 2 | 0 | 21 | crafting obsidian_bar: median 66 of 250 |
| master_fisherman | 2 | 0 | 2 | gathering swordfish: median 2074 of 6000 |
| master_miner | 2 | 0 | 1 | gathering adamantite_ore: median 4601 of 6000 |
| potion_brewer | 2 | 0 | 1 | crafting enhanced_health_potion: median 22 of 100; crafting enhanced_health_splash_potion: median 0 of 100 |
| adamantite_mastery | 1 | 0 | 1 | crafting adamantite_bar: median 460 of 500 |
| cursed_wood_blessed_victory | 1 | 0 | 10 | crafting cursed_plank: median 16 of 50 |
| loktar_ogar | 1 | 0 | 4 | combat_kill orc: median 39 of 500 |


### (h) This fleet against the 25, one page
#### (h) alverus against the 25, one page: every number where it is outside the middle half, by how far

| measure | alverus | the 25: Q1 / median / Q3 | place (1 = highest) |  | distance (IQRs outside) |
|---|---|---|---|---|---|
| top combat level | 26 | 39 / 41 / 44.5 | 26 of 26 | below | 2.4 |
| characters at combat 30+ | 0 | 3 / 4 / 5 | 26 of 26 | below | 1.5 |
| best jewelrycrafting | 21 | 30 / 32 / 36 | 25 of 26 | below | 1.5 |
| best weaponcrafting | 20 | 30 / 32 / 37 | 26 of 26 | below | 1.4 |
| best cooking | 31 | 42 / 50 / 50 | 25 of 26 | below | 1.4 |
| achievements completed | 24 | 30.5 / 34 / 36.5 | 26 of 26 | below | 1.1 |
| points (board) | 33 | 46 / 51 / 58.5 | 26 of 26 | below | 1.0 |
| characters holding the three gear-crafting bests | 3 | 1 / 1 / 2 | 1 of 26 | above | 1.0 |
| best gearcrafting | 23 | 31 / 35 / 40 | 26 of 26 | below | 0.9 |
| best woodcutting | 32 | 38 / 41 / 45 | 23 of 26 | below | 0.9 |
| best fishing | 23 | 34.5 / 42 / 48.5 | 26 of 26 | below | 0.8 |
| max HP of the best fighter | 625 | 870 / 1105 / 1172.5 | 25 of 26 | below | 0.8 |
| best alchemy | 34 | 40.5 / 43 / 50 | 23 of 26 | below | 0.7 |
| median combat level | 24 | 30.5 / 37 / 41.5 | 22 of 26 | below | 0.6 |
| characters wearing a rune | 0 | 1.5 / 3 / 5 | 23 of 26 | below | 0.4 |
| fight sets | 0 | 0.5 / 1 / 2.5 | 20 of 26 | below | 0.3 |
| active characters on a monster's tile | 0 | 0.5 / 1 / 2.5 | 20 of 26 | below | 0.3 |
| best mining | 35 | 37 / 41 / 45.5 | 21 of 26 | below | 0.2 |
| fleet combat XP an hour between the reads | 1004.1 | 2347.8 / 5251.1 / 10290.1 | 10 of 12 | below | 0.2 |
| characters within 3 of the top | 5 | 1 / 3 / 4.5 | 1 of 26 | above | 0.1 |
| pieces worn in fight sets with a ⚡/¢/B material | 0 | 1.5 / 6 / 14.5 | 20 of 26 | below | 0.1 |
| best character's combat XP an hour | 352.0 | 763.0 / 2307.6 / 4565.1 | 12 of 12 | below | 0.1 |

Distance = how far outside the quartiles, in interquartile ranges (an IQR under a tenth of the median counts as a tenth of it). Measures from tables (a)–(g); the pace ones over the accounts in both reads.


## The leaders through this fleet's model
Printed by `node --import tsx docs/strategy/024/tools/model.mts`; it imports `src/` read-only (the catalog, `sim/stats.ts`,
`sim/combat.ts`, `plan/planner/reach.ts`, `pick.ts`, `cost.ts`), stands in a `localStorage` that keeps nothing (as 022's
`runecheck.mts`), opens no storage, and reads this fleet's World of 00:00 UTC (`logs/world/2026-11-23.json`). A leader's
character is the base's line turned back into the API's shape and put in a World of its own: no bank, its bag as `bags`,
nothing running — so its pool is exactly what it wears and carries.

### The stats
**Every stat this fleet's arithmetic computes agrees with the API's on all 40 fight sets — HP (115 + 5·L plus the items),
attack, damage, resistances, critical strike, haste, wisdom, prospecting — except initiative, which the API gives 100
higher on every one.** The model starts the player at 0 (`src/sim/stats.ts:49-65` copies no initiative, `:74-76` drops it
from the base, `:109` adds the items'); the API's base is 100 (as `docs/rework.md`'s "Who strikes first?" suspected).
The combat effects agree too (a rune's `healing`, lifesteal, burn); the API's `effects` list the gathering and crafting
cuts of an altar doll and leave the worn potions out, neither of which is a hole.

#### (3a) The API's stats against this fleet's arithmetic, 40 characters in a fight set (2026-11-23T1222Z): every stat that does not agree

| stat | characters that differ | API − model: min / median / max | examples (API vs model) |
|---|---|---|---|
| initiative | 40 of 40 | 100 / 100 / 100 | frtCombat 380 vs 280; frtFish 810 vs 710; frtCraft 330 vs 230 |

The model: 115 + 5·L HP and 0 for every other stat (the atlas's hypothetical character, scripts/atlas/combat.mts:10-19), plus every worn code's effects (src/sim/stats.ts:85-90 applyGear). "gate" = src/sim/stats.ts:102-112 currentFighter (exec.ts:440, :573), which copies the API's totals but initiative: currentStats leaves it 0 (src/sim/stats.ts:49-65), the worn items' initiative is added (:109); the solve's base drops it too (:74-76). Every stat not listed agrees on every character. Combat effects (the API's `effects` against the worn codes' but the utility potions', both without the gathering and crafting cuts): equal on every character.


(The per-character list: `tables/3a-stats-detail.md`.)

### The fights
**What "safe" asks** (`src/plan/planner/reach.ts:475` `safeWin`): the planning-grade solve (3 candidates a slot, the pool's
potions in) must win the expected fight, and the full solve (`fightRec`, 6/6) must be `safe` — its expected fight won
without a timeout **and the pessimistic pass won too: the player never crits and the monster crits every hit**
(`src/plan/bis.ts:330`, `reach.ts:468-469` `wins`; `config.risk` "win" would take any expected win). **What a lost fight
costs** by the game's documents as this project recorded them: the character returns to (0, 0) with 1 HP
(`docs/design/planner.md:704`, `docs/design/achievement-map.md:807`) — the walk back and the rest to full; nothing is
dropped. **Count: of 60 solo fights the leaders stood in (both reads, bosses left out), the rule refuses 18; of the 27 that
give XP (gap ≤ 10) it refuses 16.** The three clearest: `LewisHeidrick`'s LH_Fighter on the cursed tree (41 vs 34) — the
only expected loss, 52.8% of rolled fights with the model's initiative, 90.0% with the API's, working a cursed-tree task
(91/256) at 142 HP; `Elemental`'s George and Fredrick on the goblin guard (43 vs 35) — 88 HP left of 1,035 expected, the
monster first by the model's initiative, 87.3% rolled → 99.9% with the API's; `Fox___`'s Fox_3 on the hellhound (44 vs 40)
— 111 of 1,360 left, 95.7% either way.

#### (3b) Every active leader on a monster's tile: this fleet's simulator on the character as it is, and this fleet's rule

| read | account | character | combat | monster | level | gap | the gate's fighter (worn set; initiative 0 + items) | wins of 2,000 (crits rolled) | the same with the API's initiative | wins of 2,000 | reach.ts safeWin on its own pool |
|---|---|---|---|---|---|---|---|---|---|---|---|
| now | uaprsf | frtCombat | 50 | rosenblood (boss: a group) | 40 | 10 | **loss** · 5 t · 0/1190 · 2nd | — | **loss** · 5 t · 0/1190 · 2nd | — | — |
| now | uaprsf | frtFish | 50 | rosenblood (boss: a group) | 40 | 10 | **loss** · 100 t · 938/1935 · greater_health 36, fire_res 1 | — | **loss** · 100 t · 938/1935 · greater_health 36, fire_res 1 | — | — |
| now | uaprsf | frtCraft | 50 | rosenblood (boss: a group) | 40 | 10 | **loss** · 5 t · 0/1100 · 2nd | — | **loss** · 5 t · 0/1100 · 2nd | — | — |
| now | Fox___ | Fox_4 | 31 | chicken | 1 | 30 | safe · 1 t · 1305/1305 | 100% | safe · 1 t · 1305/1305 | 100% | safe |
| now | hunter2 | Pablo | 45 | rat | 25 | 20 | safe · 9 t · 1126/1225 | 100% | safe · 9 t · 1126/1225 | 100% | safe |
| now | hunter2 | Jaheira | 50 | cultist_acolyte | 33 | 17 | safe · 15 t · 891/1495 | 100% | safe · 15 t · 891/1495 | 100% | safe |
| now | hunter2 | Viconia | 43 | cursed_tree | 34 | 9 | safe · 17 t · 496/1105 | 100% | safe · 17 t · 496/1105 | 100% | safe |
| now | hunter2 | Aerie | 44 | mushmush | 10 | 34 | safe · 5 t · 1165/1165 | 100% | safe · 5 t · 1165/1165 | 100% | safe |
| now | Pischke | Pischke | 42 | mushmush | 10 | 32 | safe · 6 t · 751/800 · greater_health 0 · 2nd | 100% | safe · 5 t · 781/800 · greater_health 0 | 100% | safe |
| now | krolov | Zarina | 41 | vampire | 24 | 17 | safe · 11 t · 820/1055 | 100% | safe · 11 t · 820/1055 | 100% | safe |
| now | krolov | Marina | 44 | cursed_tree | 34 | 10 | win, not safe · 23 t · 170/1140 | 95.7% | win, not safe · 23 t · 170/1140 | 95.7% | **refused** (win, not safe) |
| now | krolov | Tarina | 45 | cursed_tree | 34 | 11 | win, not safe · 19 t · 241/1105 | 97.7% | win, not safe · 19 t · 241/1105 | 97.7% | **refused** (win, not safe) |
| now | Big_Shark | IronMan | 39 | ogre | 20 | 19 | safe · 7 t · 1003/1105 | 100% | safe · 7 t · 1003/1105 | 100% | safe |
| now | Alrick00 | Josh | 41 | death_knight | 28 | 13 | safe · 11 t · 531/930 | 100% | safe · 11 t · 531/930 | 100% | safe |
| now | Alrick00 | Astrid | 41 | cursed_tree | 34 | 7 | win, not safe · 16 t · 320/1195 · 2nd | 99.9% | win, not safe · 15 t · 444/1195 | 100% | **refused** (win, not safe) |
| now | Elemental | Ron | 43 | goblin_guard | 35 | 8 | win, not safe · 24 t · 209/1035 · 2nd | 100% | win, not safe · 21 t · 329/1035 | 100% | **refused** (win, not safe) |
| now | Elemental | Fredrick | 43 | goblin_guard | 35 | 8 | win, not safe · 22 t · 88/1035 · 2nd | 87.3% | win, not safe · 21 t · 174/1035 | 99.9% | **refused** (win, not safe) |
| now | Elemental | George | 43 | goblin_guard | 35 | 8 | win, not safe · 22 t · 88/1035 · 2nd | 87.3% | win, not safe · 21 t · 174/1035 | 99.9% | **refused** (win, not safe) |
| now | Turbofish | Dorothy | 42 | wolf | 15 | 27 | safe · 5 t · 1170/1170 | 100% | safe · 5 t · 1170/1170 | 100% | safe |
| now | Turbofish | Orchid | 41 | spider | 20 | 21 | safe · 6 t · 758/925 | 100% | safe · 6 t · 758/925 | 100% | safe |
| now | at0mstr0m | at0m_1 | 44 | imp | 28 | 16 | safe · 26 t · 842/1110 · 2nd | 100% | safe · 25 t · 878/1110 | 100% | safe |
| now | aropan | Zynfin | 38 | imp | 28 | 10 | safe · 26 t · 583/1100 · 2nd | 100% | safe · 25 t · 621/1100 | 100% | safe |
| now | aropan | Bixbrew | 40 | cultist_acolyte | 33 | 7 | win, not safe · 18 t · 123/1110 · 2nd | 84.5% | win, not safe · 17 t · 233/1110 | 99.3% | **refused** (win, not safe) |
| now | aropan | Vexwood | 41 | cultist_acolyte | 33 | 8 | win, not safe · 18 t · 132/1165 · 2nd | 99.2% | win, not safe · 17 t · 247/1165 | 100% | **refused** (win, not safe) |
| now | brinko | Alekhine | 41 | pig | 19 | 22 | safe · 5 t · 1019/1025 | 100% | safe · 5 t · 1019/1025 | 100% | safe |
| now | brinko | Botvinnik | 42 | rat | 25 | 17 | safe · 9 t · 1013/1160 | 100% | safe · 9 t · 1013/1160 | 100% | safe |
| now | brinko | Capablanca | 43 | ogre | 20 | 23 | safe · 8 t · 873/1015 · 2nd | 100% | safe · 7 t · 921/1015 | 100% | safe |
| now | brinko | Ding | 41 | goblin_guard | 35 | 6 | win, not safe · 24 t · 330/1095 · 2nd | 100% | win, not safe · 21 t · 439/1095 | 100% | **refused** (win, not safe) |
| now | brinko | Euwe | 42 | cow | 8 | 34 | safe · 3 t · 1090/1110 | 100% | safe · 3 t · 1090/1110 | 100% | safe |
| now | automode | cruise | 41 | vampire | 24 | 17 | safe · 9 t · 822/1020 | 100% | safe · 9 t · 822/1020 | 100% | safe |
| now | Myoto | Grumpy | 36 | imp | 28 | 8 | safe · 26 t · 570/1100 · 2nd | 100% | safe · 25 t · 609/1100 | 100% | safe |
| now | Myoto | Silas | 37 | cyclops | 25 | 12 | safe · 10 t · 594/1065 · 2nd | 100% | safe · 9 t · 688/1065 | 100% | safe |
| now | LewisHeidrick | LH_Fighter | 41 | cursed_tree | 34 | 7 | **loss** · 25 t · 0/1005 · 2nd | 52.8% | win, not safe · 25 t · 84/1005 | 90.0% | **refused** (loss) |
| now | _zero_ | Zero | 40 | imp | 28 | 12 | safe · 25 t · 758/1200 | 100% | safe · 25 t · 758/1200 | 100% | safe |
| now | _zero_ | Bulma | 37 | imp | 28 | 9 | safe · 25 t · 980/1185 | 100% | safe · 25 t · 980/1185 | 100% | safe |
| now | Trobyss | Trobyss | 42 | owlbear | 30 | 12 | safe · 11 t · 660/1070 | 100% | safe · 11 t · 660/1070 | 100% | safe |
| now | Trobyss | Proton | 39 | vampire | 24 | 15 | safe · 9 t · 966/1175 | 100% | safe · 9 t · 966/1175 | 100% | safe |
| now | Tomlox | Cedrus | 39 | skeleton | 18 | 21 | safe · 7 t · 890/1010 | 100% | safe · 7 t · 890/1010 | 100% | safe |
| now | jowrjowr | saeka | 31 | green_slime | 4 | 27 | safe · 3 t · 739/750 | 100% | safe · 3 t · 739/750 | 100% | safe |
| 11-22 | uaprsf | frtCombat | 46 | hellhound | 40 | 6 | safe · 21 t · 531/1290 | 100% | safe · 21 t · 531/1290 | 100% | safe |
| 11-22 | uaprsf | frtFish | 49 | goblin | 33 | 16 | safe · 15 t · 933/1605 | 100% | safe · 15 t · 933/1605 | 100% | safe |
| 11-22 | uaprsf | frtCraft | 46 | hellhound | 40 | 6 | win, not safe · 23 t · 353/1370 | 100% | win, not safe · 23 t · 353/1370 | 100% | **refused** (win, not safe) |
| 11-22 | Fox___ | Fox_1 | 46 | goblin_guard | 35 | 11 | win, not safe · 24 t · 113/1170 · 2nd | 88.8% | win, not safe · 23 t · 220/1170 | 100% | **refused** (win, not safe) |
| 11-22 | Fox___ | Fox_3 | 44 | hellhound | 40 | 4 | win, not safe · 21 t · 111/1360 | 95.7% | win, not safe · 21 t · 111/1360 | 95.7% | **refused** (win, not safe) |
| 11-22 | hunter2 | Pablo | 45 | wolf | 15 | 30 | safe · 5 t · 1170/1170 | 100% | safe · 5 t · 1170/1170 | 100% | safe |
| 11-22 | hunter2 | Jaheira | 48 | goblin_priestess (boss: a group) | 35 | 13 | **loss** · 15 t · 0/1650 · fire_boost 1, health_boost 1 · 2nd | — | **loss** · 15 t · 0/1650 · fire_boost 1, health_boost 1 · 2nd | — | — |
| 11-22 | hunter2 | Viconia | 42 | goblin_priestess (boss: a group) | 35 | 7 | **loss** · 9 t · 0/1130 · air_boost 1 · 2nd | — | **loss** · 10 t · 0/1130 · air_boost 1 | — | — |
| 11-22 | hunter2 | Aerie | 44 | goblin_priestess (boss: a group) | 35 | 9 | **loss** · 7 t · 0/1010 · 2nd | — | **loss** · 8 t · 0/1010 | — | — |
| 11-22 | Pischke | Pischke | 42 | mushmush | 10 | 32 | safe · 6 t · 751/800 · greater_health 0 · 2nd | 100% | safe · 5 t · 781/800 · greater_health 0 | 100% | safe |
| 11-22 | Big_Shark | Rocket | 45 | goblin_guard | 35 | 10 | win, not safe · 24 t · 437/1225 · 2nd | 100% | win, not safe · 21 t · 548/1225 | 100% | **refused** (win, not safe) |
| 11-22 | krolov | Zarina | 41 | ogre | 20 | 21 | safe · 11 t · 849/1065 | 100% | safe · 11 t · 849/1065 | 100% | safe |
| 11-22 | krolov | Marina | 43 | cultist_acolyte | 33 | 10 | win, not safe · 23 t · 197/1085 | 99.9% | win, not safe · 23 t · 197/1085 | 99.9% | **refused** (win, not safe) |
| 11-22 | krolov | Tarina | 43 | cultist_acolyte | 33 | 10 | win, not safe · 21 t · 137/1055 | 99.9% | win, not safe · 21 t · 137/1055 | 99.9% | **refused** (win, not safe) |
| 11-22 | Elemental | Ron | 42 | goblin_guard | 35 | 7 | win, not safe · 24 t · 203/1030 · 2nd | 100% | win, not safe · 21 t · 323/1030 | 100% | **refused** (win, not safe) |
| 11-22 | Elemental | George | 41 | goblin_guard | 35 | 6 | win, not safe · 22 t · 78/1025 · 2nd | 87.3% | win, not safe · 21 t · 164/1025 | 99.9% | **refused** (win, not safe) |
| 11-22 | automode | cruise | 41 | vampire | 24 | 17 | safe · 9 t · 822/1020 | 100% | safe · 9 t · 822/1020 | 100% | safe |
| 11-22 | automode | daemon | 33 | pig | 19 | 14 | safe · 5 t · 803/860 | 100% | safe · 5 t · 803/860 | 100% | safe |
| 11-22 | FRALEXAlexander | FRALEX0000 | 31 | red_slime | 7 | 24 | safe · 4 t · 703/735 · health_splash 1 · 2nd | 100% | safe · 3 t · 719/735 · health_splash 1 | 100% | safe |
| 11-22 | chewbaccoin | Chewbaccoin | 35 | rat | 25 | 10 | safe · 12 t · 536/805 | 100% | safe · 12 t · 536/805 | 100% | safe |
| 11-22 | chewbaccoin | Vador | 35 | rat | 25 | 10 | safe · 13 t · 524/790 | 100% | safe · 13 t · 524/790 | 100% | safe |
| 11-22 | Odiodin | Nilla | 24 | wolf | 15 | 9 | safe · 14 t · 339/540 · 2nd | 100% | safe · 14 t · 339/540 · 2nd | 100% | safe |
| 11-22 | Odiodin | Lediv | 27 | skeleton | 18 | 9 | safe · 16 t · 433/745 · 2nd | 100% | safe · 15 t · 472/745 | 100% | safe |
| 11-22 | Odiodin | Bean | 29 | wolf | 15 | 14 | safe · 12 t · 598/755 · minor_health 0 · 2nd | 100% | safe · 11 t · 624/755 · minor_health 0 | 100% | safe |
| 11-22 | Zetark | Zetark | 34 | skeleton | 18 | 16 | safe · 8 t · 817/930 · 2nd | 100% | safe · 7 t · 857/930 | 100% | safe |
| 11-22 | Zetark | Ashmere | 26 | skeleton | 18 | 8 | safe · 14 t · 585/780 · 2nd | 100% | safe · 13 t · 624/780 | 100% | safe |
| 11-22 | Zetark | Reedfin | 23 | skeleton | 18 | 5 | safe · 14 t · 411/655 · 2nd | 100% | safe · 13 t · 446/655 | 100% | safe |

Of 60 solo fights (bosses left out) the rule refuses 18; of the 27 that give XP (gap ≤ 10) it refuses 16. The refused fights' win rate with crits rolled: min 52.8%, median 98.4%; with the API's initiative min 90.0%, median 99.9%. Each cell: safe / win, not safe / loss (src/sim/combat.ts simulate, the expected fight; safe = the pessimistic pass — the player never crits, the monster always does — wins too, src/plan/bis.ts:330); turns; HP left of max; the potions the fight drinks; "2nd" = the monster strikes first (combat.ts:394, initiative). The rule: reach.ts:475 safeWin on a World holding only this character, its bag and no bank (its pool = what it wears and carries). A boss is a group fight (1v1 not simulated).

#### (3b) The fights this fleet's rule refuses: 18

| account | character | combat | monster (level) | the worn set | wins of 2,000 (model / API initiative) | the task | the rule's best set of its pool | HP at the read |
|---|---|---|---|---|---|---|---|---|
| LewisHeidrick | LH_Fighter | 41 | cursed_tree (34) | **loss** · 25 t · 0/1005 · 2nd | 52.8% / 90.0% | cursed_tree 91/256 | **loss** · 25 t · 0/1005 · 2nd | 142/1005 |
| Elemental | George | 41 | goblin_guard (35) | win, not safe · 22 t · 78/1025 · 2nd | 87.3% / 99.9% | spider 48/301 | win, not safe · 22 t · 98/1045 · 2nd | 1025/1025 |
| Fox___ | Fox_3 | 44 | hellhound (40) | win, not safe · 21 t · 111/1360 | 95.7% / 95.7% | hellhound 15/151 | win, not safe · 21 t · 111/1360 | 253/1360 |
| Elemental | Fredrick | 43 | goblin_guard (35) | win, not safe · 22 t · 88/1035 · 2nd | 87.3% / 99.9% | blue_slime 283/316 | win, not safe · 21 t · 213/1135 | 1035/1035 |
| Elemental | George | 43 | goblin_guard (35) | win, not safe · 22 t · 88/1035 · 2nd | 87.3% / 99.9% | spider 48/301 | win, not safe · 21 t · 213/1135 | 113/1035 |
| Fox___ | Fox_1 | 46 | goblin_guard (35) | win, not safe · 24 t · 113/1170 · 2nd | 88.8% / 100% | goblin_guard 67/91 | win, not safe · 24 t · 113/1170 · 2nd | 1158/1170 |
| aropan | Bixbrew | 40 | cultist_acolyte (33) | win, not safe · 18 t · 123/1110 · 2nd | 84.5% / 99.3% | cultist_acolyte 322/387 | win, not safe · 19 t · 160/1110 | 1110/1110 |
| aropan | Vexwood | 41 | cultist_acolyte (33) | win, not safe · 18 t · 132/1165 · 2nd | 99.2% / 100% | — | win, not safe · 18 t · 132/1165 · 2nd | 1165/1165 |
| krolov | Tarina | 43 | cultist_acolyte (33) | win, not safe · 21 t · 137/1055 | 99.9% / 99.9% | rat 77/216 | win, not safe · 21 t · 137/1055 | 1055/1055 |
| krolov | Marina | 44 | cursed_tree (34) | win, not safe · 23 t · 170/1140 | 95.7% / 95.7% | vampire 95/381 | win, not safe · 23 t · 170/1140 | 1140/1140 |
| krolov | Marina | 43 | cultist_acolyte (33) | win, not safe · 23 t · 197/1085 | 99.9% / 99.9% | — | win, not safe · 23 t · 197/1085 | 223/1085 |
| Elemental | Ron | 42 | goblin_guard (35) | win, not safe · 24 t · 203/1030 · 2nd | 100% / 100% | highwayman 92/387 | win, not safe · 23 t · 373/1100 | 230/1030 |
| Elemental | Ron | 43 | goblin_guard (35) | win, not safe · 24 t · 209/1035 · 2nd | 100% / 100% | highwayman 92/387 | win, not safe · 23 t · 379/1105 | 319/1035 |
| krolov | Tarina | 45 | cursed_tree (34) | win, not safe · 19 t · 241/1105 | 97.7% / 97.7% | — | win, not safe · 19 t · 241/1105 | 1105/1105 |
| uaprsf | frtCraft | 46 | hellhound (40) | win, not safe · 23 t · 353/1370 | 100% / 100% | — | win, not safe · 23 t · 353/1370 | 275/1370 |
| Alrick00 | Astrid | 41 | cursed_tree (34) | win, not safe · 16 t · 320/1195 · 2nd | 99.9% / 100% | cyclops 101/111 | win, not safe · 16 t · 320/1195 · 2nd | 414/1195 |
| brinko | Ding | 41 | goblin_guard (35) | win, not safe · 24 t · 330/1095 · 2nd | 100% / 100% | goblin_guard 174/182 | win, not safe · 21 t · 400/1105 | 1095/1095 |
| Big_Shark | Rocket | 45 | goblin_guard (35) | win, not safe · 24 t · 437/1225 · 2nd | 100% / 100% | rat 220/257 | win, not safe · 24 t · 437/1225 · 2nd | 484/1225 |


### The leaders' fighters under this fleet's planner (combat 25–39)
With its own worn set as the pool, this fleet's XP pick finds a safe XP monster for 18 of the 21, every one at **0 potions
a kill**, at **4.7–18 h a level** (none for the other three); at 26–29 (skull staff, skull wand, forest whip — craft 20–25) pig at 5.7–13.8 h, much like
this fleet's own pool (022: 7.7–11.1 h at 25–28); at 33–35 with craft-30 weapons (obsidian battleaxe, gold sword, greater
dreadful staff) vampire or rat at 6.7–12.8 h, where this fleet's pool has none (3e). Eleven of the 21 stood where the pick
gives no XP. Only two of the 21 are in both reads with fight XP; both pace numbers are in (f1).

#### (3c) Every leader's fighter at combat 25–39 (both reads), its own worn set and bag as the pool: this fleet's XP pick and the hours it gives a level

| read | account | character | combat | weapon | pick.ts pickMonster: monster · seconds a kill · potions a kill · hours a level | where it stands, priced the same way | measured between the reads (table f1) |
|---|---|---|---|---|---|---|---|
| 11-22 | automode | daemon | 33 | obsidian_battleaxe | vampire (24) · 39.2 s · 0 potions · 7.7 h | pig (19) · 17.5 s · no XP | 33 → 33: 115.2 h a level |
| 11-22 | shuxart | Kellhus | 35 | greater_dreadful_staff | rat (25) · 32.5 s · 0 potions · 6.7 h | flying_snake (12) · 10.1 s · no XP | — |
| 11-22 | shuxart | Achamian | 29 | skull_staff | pig (19) · 44.4 s · 0 potions · 9.4 h | ogre (20) · 84.1 s · 14.7 h | — |
| 11-22 | shuxart | Mimara | 27 | skull_staff | pig (19) · 48.5 s · 0 potions · 8.9 h | ogre (20) · refused | — |
| 11-22 | FRALEXAlexander | FRALEX0000 | 31 | battlestaff | no safe XP monster | red_slime (7) · 13.1 s · no XP | — |
| 11-22 | chewbaccoin | Chewbaccoin | 35 | gold_sword | rat (25) · 58.5 s · 0 potions · 11.5 h | rat (25) · 58.5 s · 11.5 h | — |
| 11-22 | chewbaccoin | Vador | 35 | gold_sword | rat (25) · 60.5 s · 0 potions · 12.8 h | rat (25) · 60.5 s · 12.8 h | — |
| 11-22 | Odiodin | Lediv | 27 | steel_battleaxe | pig (19) · 60.5 s · 0 potions · 11.1 h | skeleton (18) · 74.1 s · 13.5 h | — |
| 11-22 | Odiodin | Bean | 29 | skull_staff | pig (19) · 65.4 s · 0 potions · 13.8 h | wolf (15) · 45.3 s · no XP | — |
| 11-22 | Zetark | Zetark | 34 | greater_dreadful_staff | rat (25) · 63.5 s · 0 potions · 11.3 h | skeleton (18) · 29.1 s · no XP | — |
| 11-22 | Zetark | Ashmere | 26 | skull_wand | pig (19) · 39.4 s · 0 potions · 5.7 h | skeleton (18) · 53.1 s · 7.7 h | — |
| 11-22 | Zetark | Sunbloom | 26 | forest_whip | pig (19) · 50.5 s · 0 potions · 6.8 h | workshop gearcrafting | — |
| now | Fox___ | Fox_4 | 31 | elderwood_staff | imp (28) · 81.2 s · 0 potions · 4.7 h | chicken (1) · 5.2 s · no XP | 30 → 31: no fight XP |
| now | Big_Shark | IronMan | 39 | perfect_bow | no safe XP monster | ogre (20) · 24.1 s · no XP | 38 → 39: 31.7 h a level |
| now | aropan | Zynfin | 38 | perfect_bow | death_knight (28) · 55.1 s · 0 potions · 13.2 h | imp (28) · 99.1 s · 13.3 h | — |
| now | Myoto | Grumpy | 36 | elderwood_staff | imp (28) · 101.2 s · 0 potions · 10.7 h | imp (28) · 101.2 s · 10.7 h | — |
| now | Myoto | Silas | 37 | perfect_bow | imp (28) · 96.2 s · 0 potions · 12.0 h | cyclops (25) · 65.1 s · no XP | — |
| now | _zero_ | Bulma | 37 | elderwood_staff | cultist_acolyte (33) · 88.1 s · 0 potions · 9.1 h | imp (28) · 68.2 s · 9.2 h | — |
| now | Trobyss | Proton | 39 | death_knight_sword | owlbear (30) · 91.1 s · 0 potions · 15.7 h | vampire (24) · 36.1 s · no XP | — |
| now | Tomlox | Cedrus | 39 | death_knight_sword | no safe XP monster | skeleton (18) · 26.1 s · no XP | — |
| now | jowrjowr | saeka | 31 | battlestaff | rat (25) · 116.5 s · 0 potions · 18.0 h | green_slime (4) · 9.0 s · no XP | — |

pickMonster (src/plan/planner/pick.ts:34-48): every monster ≤ L+10 that gives XP, reachable, reach.ts safeWin; XP by xp.ts fightXp with the set's wisdom; seconds by cost.ts actionSec (the fight, its rest or food, the potions at the chain's price, × KILL_LOG, the walks to the bank). Hours a level = xpNeeded[L] ÷ XP an hour. The pace measured for the same characters is table (f1).


### This fleet's fighters the other way
At the read all five wore gathering sets (tools): they lose to the pig, the wolf and the skeleton with or without a rune.
**The planner's best set of the bank wins all six monsters safely, and so does the same solve with every potion taken out of
the bank — while the set it picks drinks one to three potions a fight (minor and small health, an air boost).** A healing
rune adds 60–70 HP at the end of a pig or wolf fight and turns nothing.

#### (3d) First to Fifth against the monsters the leaders' fighters of combat 20–34 stood on (both reads)

| monster | stood on by | ours | worn at the read | worn + healing rune | the planner's best set of the bank (reach.ts fightRec, logs/world/2026-11-23.json) | the same, no potion anywhere | no potion, 5 healing runes in the bank |
|---|---|---|---|---|---|---|---|
| pig (19) | automode/daemon 33 | First 23 (23 in the World) | **loss** · 30 t · 0/510 | **loss** · 40 t · 0/510 | safe · 18 t · 376/555 · minor_health 1, small_health 1 | safe · 16 t · 377/625 | safe · 16 t · 439/625 |
| pig (19) | automode/daemon 33 | Second 26 (26 in the World) | **loss** · 37 t · 0/625 · 2nd | **loss** · 51 t · 0/625 · 2nd | safe · 16 t · 442/690 · air_boost 1, minor_health 0 | safe · 14 t · 432/665 | safe · 14 t · 498/665 |
| pig (19) | automode/daemon 33 | Third 24 (24 in the World) | **loss** · 32 t · 0/535 | **loss** · 42 t · 0/535 | safe · 16 t · 374/550 · minor_health 1, small_health 1 | safe · 14 t · 402/635 | safe · 14 t · 465/635 |
| pig (19) | automode/daemon 33 | Fourth 24 (23 in the World) | **loss** · 30 t · 0/515 | **loss** · 40 t · 0/515 | safe · 18 t · 376/555 · minor_health 1, small_health 1 | safe · 16 t · 377/625 | safe · 16 t · 439/625 |
| pig (19) | automode/daemon 33 | Fifth 24 (24 in the World) | **loss** · 30 t · 0/515 | **loss** · 40 t · 0/515 | safe · 16 t · 374/550 · minor_health 1, small_health 1 | safe · 16 t · 372/620 | safe · 16 t · 434/620 |
| red_slime (7) | FRALEXAlexander/FRALEX0000 31 | First 23 (23 in the World) | safe · 35 t · 204/510 | safe · 35 t · 357/510 | safe · 6 t · 600/645 · air_boost 1, minor_health 0 | safe · 6 t · 600/645 | safe · 6 t · 614/630 |
| red_slime (7) | FRALEXAlexander/FRALEX0000 31 | Second 26 (26 in the World) | safe · 36 t · 301/625 · 2nd | safe · 36 t · 489/625 · 2nd | safe · 4 t · 646/680 · air_boost 1, minor_health 0 | safe · 4 t · 646/680 | safe · 4 t · 646/680 |
| red_slime (7) | FRALEXAlexander/FRALEX0000 31 | Third 24 (24 in the World) | safe · 33 t · 247/535 | safe · 33 t · 381/535 | safe · 6 t · 635/680 · air_boost 1, minor_health 0 | safe · 6 t · 635/680 | safe · 6 t · 619/635 |
| red_slime (7) | FRALEXAlexander/FRALEX0000 31 | Fourth 24 (23 in the World) | safe · 35 t · 209/515 | safe · 35 t · 364/515 | safe · 6 t · 600/645 · air_boost 1, minor_health 0 | safe · 6 t · 600/645 | safe · 6 t · 614/630 |
| red_slime (7) | FRALEXAlexander/FRALEX0000 31 | Fifth 24 (24 in the World) | safe · 35 t · 209/515 | safe · 35 t · 364/515 | safe · 6 t · 605/650 · air_boost 1, minor_health 0 | safe · 6 t · 605/650 | safe · 6 t · 619/635 |
| wolf (15) | Odiodin/Nilla 24, Odiodin/Bean 29 | First 23 (23 in the World) | **loss** · 34 t · 0/510 | **loss** · 46 t · 0/510 | safe · 12 t · 470/635 · air_boost 1, minor_health 0 | safe · 12 t · 470/635 | safe · 12 t · 534/635 |
| wolf (15) | Odiodin/Nilla 24, Odiodin/Bean 29 | Second 26 (26 in the World) | **loss** · 41 t · 0/625 · 2nd | **loss** · 63 t · 0/625 · 2nd | safe · 12 t · 533/690 · air_boost 1, minor_health 0 | safe · 12 t · 533/690 | safe · 12 t · 602/690 |
| wolf (15) | Odiodin/Nilla 24, Odiodin/Bean 29 | Third 24 (24 in the World) | **loss** · 36 t · 0/535 | **loss** · 50 t · 0/535 | safe · 12 t · 515/680 · air_boost 1, minor_health 0 | safe · 12 t · 515/680 | safe · 12 t · 583/680 |
| wolf (15) | Odiodin/Nilla 24, Odiodin/Bean 29 | Fourth 24 (23 in the World) | **loss** · 36 t · 0/515 | **loss** · 50 t · 0/515 | safe · 12 t · 470/635 · air_boost 1, minor_health 0 | safe · 12 t · 470/635 | safe · 12 t · 534/635 |
| wolf (15) | Odiodin/Nilla 24, Odiodin/Bean 29 | Fifth 24 (24 in the World) | **loss** · 36 t · 0/515 | **loss** · 50 t · 0/515 | safe · 12 t · 475/640 · air_boost 1, minor_health 0 | safe · 12 t · 475/640 | safe · 12 t · 539/640 |
| skeleton (18) | Odiodin/Lediv 27, Zetark/Zetark 34, Zetark/Ashmere 26, Zetark/Reedfin 23 | First 23 (23 in the World) | **loss** · 24 t · 0/510 | **loss** · 28 t · 0/510 | safe · 18 t · 366/535 · minor_health 2, small_health 2 | safe · 16 t · 262/590 | safe · 16 t · 316/585 |
| skeleton (18) | Odiodin/Lediv 27, Zetark/Zetark 34, Zetark/Ashmere 26, Zetark/Reedfin 23 | Second 26 (26 in the World) | **loss** · 27 t · 0/625 · 2nd | **loss** · 35 t · 0/625 · 2nd | safe · 16 t · 436/680 · minor_health 1, small_health 1 | safe · 16 t · 348/660 | safe · 16 t · 414/660 |
| skeleton (18) | Odiodin/Lediv 27, Zetark/Zetark 34, Zetark/Ashmere 26, Zetark/Reedfin 23 | Third 24 (24 in the World) | **loss** · 24 t · 0/535 | **loss** · 30 t · 0/535 | safe · 20 t · 329/460 · minor_health 3, small_health 3 | safe · 16 t · 292/620 | safe · 16 t · 354/620 |
| skeleton (18) | Odiodin/Lediv 27, Zetark/Zetark 34, Zetark/Ashmere 26, Zetark/Reedfin 23 | Fourth 24 (23 in the World) | **loss** · 24 t · 0/515 | **loss** · 28 t · 0/515 | safe · 18 t · 366/535 · minor_health 2, small_health 2 | safe · 16 t · 262/590 | safe · 16 t · 316/585 |
| skeleton (18) | Odiodin/Lediv 27, Zetark/Zetark 34, Zetark/Ashmere 26, Zetark/Reedfin 23 | Fifth 24 (24 in the World) | **loss** · 24 t · 0/515 | **loss** · 28 t · 0/515 | safe · 16 t · 354/515 · minor_health 2, small_health 2 | safe · 16 t · 258/570 | safe · 16 t · 315/570 |
| chicken (1) | Fox___/Fox_4 31 | First 23 (23 in the World) | safe · 17 t · 478/510 | safe · 17 t · 510/510 | safe · 1 t · 620/620 · air_boost 1, minor_health 0 | safe · 1 t · 620/620 | safe · 1 t · 620/620 |
| chicken (1) | Fox___/Fox_4 31 | Second 26 (26 in the World) | safe · 18 t · 589/625 · 2nd | safe · 18 t · 625/625 · 2nd | safe · 1 t · 695/695 · air_boost 1, minor_health 0 | safe · 1 t · 695/695 | safe · 1 t · 695/695 |
| chicken (1) | Fox___/Fox_4 31 | Third 24 (24 in the World) | safe · 17 t · 503/535 | safe · 17 t · 535/535 | safe · 1 t · 625/625 · air_boost 1, minor_health 0 | safe · 1 t · 625/625 | safe · 1 t · 625/625 |
| chicken (1) | Fox___/Fox_4 31 | Fourth 24 (23 in the World) | safe · 17 t · 483/515 | safe · 17 t · 515/515 | safe · 1 t · 620/620 · air_boost 1, minor_health 0 | safe · 1 t · 620/620 | safe · 1 t · 620/620 |
| chicken (1) | Fox___/Fox_4 31 | Fifth 24 (24 in the World) | safe · 17 t · 483/515 | safe · 17 t · 515/515 | safe · 1 t · 625/625 · air_boost 1, minor_health 0 | safe · 1 t · 625/625 | safe · 1 t · 625/625 |
| green_slime (4) | jowrjowr/saeka 31 | First 23 (23 in the World) | safe · 23 t · 378/510 | safe · 23 t · 479/510 | safe · 3 t · 610/620 · air_boost 1, minor_health 0 | safe · 3 t · 610/620 | safe · 3 t · 610/620 |
| green_slime (4) | jowrjowr/saeka 31 | Second 26 (26 in the World) | safe · 24 t · 481/625 · 2nd | safe · 24 t · 606/625 · 2nd | safe · 3 t · 685/695 · air_boost 1, minor_health 0 | safe · 3 t · 685/695 | safe · 3 t · 685/695 |
| green_slime (4) | jowrjowr/saeka 31 | Third 24 (24 in the World) | safe · 23 t · 403/535 | safe · 23 t · 507/535 | safe · 3 t · 615/625 · air_boost 1, minor_health 0 | safe · 3 t · 615/625 | safe · 3 t · 615/625 |
| green_slime (4) | jowrjowr/saeka 31 | Fourth 24 (23 in the World) | safe · 23 t · 383/515 | safe · 23 t · 484/515 | safe · 3 t · 610/620 · air_boost 1, minor_health 0 | safe · 3 t · 610/620 | safe · 3 t · 610/620 |
| green_slime (4) | jowrjowr/saeka 31 | Fifth 24 (24 in the World) | safe · 23 t · 383/515 | safe · 23 t · 484/515 | safe · 3 t · 615/625 · air_boost 1, minor_health 0 | safe · 3 t · 615/625 | safe · 3 t · 615/625 |

Worn at the read: the alverus characters of the newest read (a tool in the weapon slot is a gathering set). The planner's set: reach.ts:450 fightRec on the World of this fleet's newest snapshot (the bank, the others' reservations, the potions of the pool in); "no potion": the same World with every utility item taken out of the bank, the bags and the worn slots; the rune column adds five healing runes to that bank (as docs/strategy/022/tools/runecheck.mts did).


### What the rule and the potions cost this fleet's own road
On its own pool (Second, Third): **from combat 33 there is no safe XP monster with or without potions**; "a win is
enough" alone gives the ogre at 30 (20–22 h a level, no potion); **"a win is enough" with a healing rune and no potion
reopens 30–35: rat or vampire at 11–25 h a level**. At their own level the potions are what makes the pick fast (rat 5.7 h
with 12 potions a kill against skeleton 9.6 h with none).

#### (3e) This fleet's XP pick for Second and Third on its own pool (logs/world/2026-11-23.json), at its level and above: the safe rule against "a win is enough", potions against none, a healing rune

| character | combat | as it is | risk win | no potion | no potion, risk win | no potion + rune | no potion + rune, risk win |
|---|---|---|---|---|---|---|---|
| Second | 26 | rat · 85.5 s · 12 p · **5.7 h** | owlbear · 117.1 s · 38 p · **4.9 h** | skeleton · 66.3 s · 0 p · **9.6 h** | skeleton · 66.3 s · 0 p · **9.6 h** | skeleton · 66.3 s · 0 p · **9.6 h** | vampire · 110.5 s · 0 p · **8.1 h** |
| Second | 28 | ogre · 71.1 s · 10 p · **10.2 h** | ogre · 71.1 s · 10 p · **10.2 h** | skeleton · 66.3 s · 0 p · **11.6 h** | skeleton · 66.3 s · 0 p · **11.6 h** | skeleton · 66.3 s · 0 p · **11.6 h** | vampire · 110.5 s · 0 p · **9.8 h** |
| Second | 30 | ogre · 70.1 s · 10 p · **11.6 h** | ogre · 70.1 s · 10 p · **11.6 h** | no XP monster | ogre · 131.1 s · 0 p · **21.7 h** | no XP monster | rat · 130.5 s · 0 p · **12.3 h** |
| Second | 33 | no XP monster | no XP monster | no XP monster | no XP monster | no XP monster | vampire · 110.5 s · 0 p · **21.2 h** |
| Second | 35 | no XP monster | no XP monster | no XP monster | no XP monster | no XP monster | rat · 126.5 s · 0 p · **24.8 h** |
| Third | 24 | ogre · 71.1 s · 10 p · **4.4 h** | owlbear · 121.1 s · 38 p · **4.1 h** | pig · 71.7 s · 0 p · **5.8 h** | pig · 71.7 s · 0 p · **5.8 h** | wolf · 39.3 s · 0 p · **5.1 h** | wolf · 39.3 s · 0 p · **5.1 h** |
| Third | 28 | ogre · 68.1 s · 8 p · **9.5 h** | ogre · 68.1 s · 8 p · **9.5 h** | skeleton · 66.3 s · 0 p · **11.2 h** | skeleton · 66.3 s · 0 p · **11.2 h** | skeleton · 66.3 s · 0 p · **11.2 h** | vampire · 110.5 s · 0 p · **9.3 h** |
| Third | 30 | ogre · 72.1 s · 10 p · **12.0 h** | ogre · 72.1 s · 10 p · **12.0 h** | no XP monster | ogre · 129.1 s · 0 p · **20.2 h** | no XP monster | rat · 127.5 s · 0 p · **11.3 h** |
| Third | 33 | no XP monster | no XP monster | no XP monster | no XP monster | no XP monster | vampire · 110.5 s · 0 p · **20.1 h** |
| Third | 35 | no XP monster | no XP monster | no XP monster | no XP monster | no XP monster | rat · 124.5 s · 0 p · **23.2 h** |

Each cell: pick.ts pickMonster's monster · seconds a kill (cost.ts actionSec) · potions a kill (the fight set's forecast) · hours a level. "risk win" = config.risk "win" (reach.ts:468-469: any expected win that does not time out, the replay's row D). A level above the character's own is reach.ts chAt (+5 HP a level); there the first look (planRec) is solved on the gear alone (reach.ts:484-492) and the set and its potions are fightRec's, the pool's potions in (reach.ts:450-458).


## The verdict
**Both readings hold, and the first is the larger at this fleet's stage.**

- **The forecast is not too dark; the safe rule is.** The simulator's expected fight agrees with what the leaders do — 59
  of their 60 solo fights are expected wins — and its stat arithmetic matches the API's on every stat but initiative. The
  rule is what refuses: 16 of the 27 XP-giving fights the leaders farm, which win 98.4% of rolled fights by this fleet's
  own simulator (median; minimum 52.8%), 99.9% with the API's initiative (minimum 90.0%). On this fleet's own pool the rule
  is the difference between a road that stops at 30–33 and one that goes on to 35 at 11–25 h a level (3e, with a rune).
  The initiative hole makes the rule darker still: the model has the monster strike first in 31 of 65 fights, wrongly in 27.
- **The leaders also do what the read of 11-22 only hinted at.** (a) They sustain with a rune and food, not potions (36 / 27
  / 2 of 40 fight sets); (b) from 30 they wield craft-30 weapons with event or coin materials, from 35 the median piece is craft
  30 (36–47% of the pieces with an event material) — with those sets this fleet's own planner levels them at 6.7–12.8 h, 0 potions; (c) they
  work tasks-master tasks on the monster they farm (15 of 39) — the coins behind 98 of 234 pieces at 40–44; (d) they kill
  bosses in groups (King Slime pieces on 22 of 90 pieces at 20–29; `uaprsf`'s three on Rosenblood at the read); (e) they
  fight monsters 5–14 levels below (never at or above) and mostly for drops and tasks once past 40. What the read does not
  show: losses — one character stood on (0, 0) (`ront_tv`'s Ront, 153/695 HP, active, on a plank task); a second read would.
- **How much each**: the rule (with the initiative) refuses 59% of the XP fights at a median loss rate of 1.6% (0.1% with the API's initiative) — it is what stops
  this fleet's road at 33 today; the gear is what makes the leaders' road cheap from 30 (6.7–12.8 h a level against none on
  this pool); the potions cost 65% of the model's hours (report 023) and buy no safety the potion-free set lacks at 20–29.

**The five largest distances at this fleet's own stage, most costly first:**

1. **Sustain: potions instead of a rune and food.** The base: 36 of 40 leaders' fight sets wear a rune, 27 carry cooked
   food (median 37 units), 2 a restore potion; at 20–29, 5 / 9 / 4 of 10; this fleet 0 / 0 / 0 (d). Its planner's set
   drinks 1–3 potions a fight against every monster the leaders farmed at 20–34 although a potion-free set wins them safely
   (3d), and the model spends 65% of its hours making consumables (report 023). The code: a potion the pool holds costs
   nothing (`src/plan/planner/consumables.ts:126` `consPrice`, through `reach.ts:413-432` `potionPrice` into
   `bis.ts:107` `killSeconds`), so any stocked potion that saves a turn of rest is worn; a step's set plans no rune, artifact,
   utility or bag (`src/plan/planner/decide.ts:161-162` `WEAR_SLOTS`); food enters a plan only when the pool holds some
   (`consumables.ts:129` `poolFood`), and nobody cooks for fighting (cooking best 31 against a median
   of 50).
2. **Gear from 30: craft-30 weapons with event and coin materials.** The base: the leaders' best crafters median
   32 / 35 / 32, the fight sets at 30–34 on obsidian battleaxe, greater dreadful staff, elderwood staff; this fleet 20 / 23 /
   21, last of 26 (b2, b4, c). With the leaders' 30–35 sets this fleet's planner prices a level at 6.7–12.8 h with no potion
   (3c); on its own pool there is no safe XP monster from 33 (3e). The code: gear by need looks only at pieces the fighter can
   wear at its level (`src/plan/planner/gear.ts:90`), a piece whose bill is out of reach — tasks coins, a boss — is rejected
   (`gear.ts:95`), the three crafting lanes sit on three role holders (`src/plan/planner/config.ts:27-32`) where 19 of 25
   leaders put them on one.
3. **The safe rule.** The base: 16 of the 27 XP-giving fights the leaders farm are refused, at 98.4% rolled wins (3b);
   "a win is enough" with a rune reopens this fleet's road at 30–35 (3e). The code: `reach.ts:475` `safeWin` and `:468-469`
   `wins` ask the pessimistic pass of `bis.ts:330` (every monster hit a crit, no player crit) — a fight a 52.8–100% win
   rate cannot pass.
4. **Time on combat, and tasks.** The base: between the reads the leaders' fighters at 40–44 gained fight XP in 16 of 21
   cases (median 30 h a level), this fleet's five 0–0.24 levels each in 17 h (f1), all five gathering at the read (e4);
   top combat 26 against the 25's quartiles 39 / 41 / 44.5 (h); 15 of the 39 leaders on a monster work its task (e2). The
   code: a combat level is a candidate only for the points behind its gate (`src/plan/planner/decide.ts:256-277`
   `levelCand`), and tasks are a filler (`src/plan/planner/config.ts:9` `FILLER`).
5. **Initiative.** The base: the API's initiative is the worn items' + 100 on 40 of 40 fight sets (3a). The model starts at
   0 (`src/sim/stats.ts:49-65`, `:74-76`, `:109`), and the side with the higher initiative strikes first
   (`src/sim/combat.ts:394`): the monster first in 31 of 65 fights, in 27 of them wrongly; the refused fights' rolled win
   rate goes from 98.4% to 99.9% (median), the worst from 52.8% to 90.0%. The cheapest of the five to repair.

No repair is made; the order of repairs is the planning chat's and Alex's.

## What was done / files
**New**: `docs/strategy/024/` — `tools/fetch.mjs`, `tools/build.mjs`, `tools/lib.mjs`, `tools/stats.mjs`,
`tools/model.mts`, `README.md`, `requests.log` (53 lines), `snapshot/2026-11-23T1222Z/` (53 files), `base/` (3 files),
`tables/` (21 files); this report. **Changed**: `CLAUDE.md` (one section, "The leaders' base (task 024)"), `package.json`
(the script `leaders`). Nothing under `src/`, `public/`, `scripts/`; `docs/strategy/022/` and `docs/rework.md` untouched by
the task (the latter committed first as the planning chat left it).

Every command, in order (Bash; the working directory the repository root unless named; scratch =
`D:\Temp\claude\…\scratchpad`):
1. `git status --short && git log --oneline -3 && ls docs/strategy/022/ docs/strategy/022/tools docs/strategy/022/snapshot && cat logs/status.json` (read).
2. `cat docs/strategy/022/tools/get.mjs docs/strategy/022/tools/README.md; wc -l docs/strategy/022/tools/sec1-analyze.mjs; cat docs/strategy/022/requests.log` and `cat docs/strategy/022/tools/sec1-analyze.mjs` (read).
3. `node -e` (four times): `docs/api/openapi.json`'s paths `/accounts/{account}/achievements`, `/characters`, `/leaderboard/accounts`, `/accounts/{account}` and the schemas `AccountAchievementSchema`, `AccountAchievementObjectiveSchema`, `AccountLeaderboardSchema`; the shapes of 022's snapshot files; the count of `public/data/achievements.json` (91); `alverus`'s place in 022's board, `events.json`, `maps.json` (read).
4. `ls docs/ docs/strategy; ls logs/world | tail -5; git diff --stat docs/rework.md` (read); `grep -n` of `docs/rework.md`'s headings and decisions (read).
5. `git add docs/rework.md && git commit -q -m "Rework notes" -m "Co-Authored-By: …" && git log --oneline -2` → `7ae7d3c Rework notes`.
6. Reading the code: `grep -n` of the exports of `src/sim/*.ts`, `src/plan/bis.ts`, `src/plan/planner/reach.ts`, `pick.ts`, `cost.ts`, `types.ts`, `consumables.ts`, `gear.ts`, `decide.ts`, `config.ts`; `cat src/sim/stats.ts src/sim/types.ts`; `sed -n` of `src/sim/combat.ts` 1–120, `reach.ts` 275–560, `bis.ts` 1–80, `scripts/atlas/combat.mts` 1–60 and 100–165, `scripts/atlas.mts` 25–50, `src/sim/monte.ts` 1–40, `decide.ts` 155–166, `gear.ts` 84–94; `grep -rn` for lost fights in `docs/`, for `initiative` in `combat.ts` and `docs/rework.md`, `killWalk`, `xpNeeded`, `fightXp`; `node -e` on `public/data/atlas.json`, `items.json`, `monsters.json`, `logs/world/2026-11-23.json`, `logs/status.json`, `logs/journal/2026-11-23.jsonl` (`grep` of the newest `outlook` record), `docs/strategy/022/sec3.json` (read).
7. `! test -e docs/strategy/024/requests.log && node docs/strategy/024/tools/fetch.mjs --cap 150` — **the read**: 53 requests, 12:22:15–12:23:23 UTC.
8. `cat`/`du -sh`/`node -e` on `docs/strategy/024/requests.log` and the snapshot (pages, progress, ranks, the smallest gap 1,300 ms) (read).
9. `node docs/strategy/024/tools/build.mjs` (several times while writing it; two `sed -i` on it: an unused field, the 11-22 read's time window, the header); `node -e` on `base/characters.jsonl` (the cooldowns, the XP curve against `xpNeeded`: 0 mismatches over 130 characters, the tasks on monster tiles, `(0, 0)`).
10. `node docs/strategy/024/tools/stats.mjs > <scratch>/stats.md` (several times; two `node -` patch scripts and `Edit`s on it: the offering's quarter, the 11-22 fight sets of 20–34, the task column).
11. `node --import tsx docs/strategy/024/tools/model.mts > <scratch>/model.md` (several times, 1.4–2.5 s each; `node <scratch>/patch-model.cjs` and `sed -i` on it: the effects' comparison, the seeded Monte Carlo, the pace beside the pick, the potion-free set, two line references); `awk` on its output (the initiative flips).
12. `npm run typecheck` → exit 0 (it covers `src`, `scripts`, `vite.config.ts`; the task's `.mts` file is not in its `include` and runs under `tsx`).
13. `npm run check > <scratch>/check.out` (background) → `91 checks: 91 ok, 0 known defects reproduced, 0 failed — 185.0 s`.
14. The rebuild without the network: `node build.mjs; node stats.mjs; node --import tsx model.mts` → `sha256sum base/* tables/* > <scratch>/before.sha`; `rm -r docs/strategy/024/base docs/strategy/024/tables`; the three again with `--import file:///<scratch>/nonet.mjs` (a preload that makes `fetch` and `net.Socket.prototype.connect` throw) → `sha256sum -c`: 24 OK, 0 different; `wc -l < requests.log` 53 before and after; `grep -ln "fetch\|node:http\|node:https\|node:net" docs/strategy/024/tools/*` → `fetch.mjs` only.
15. `node -e` on `package.json` (the `leaders` script) and `git diff package.json`; `Edit` of `CLAUDE.md`; `Write` of `docs/strategy/024/README.md`.
16. `date -u`; `node -e` on `logs/status.json` (12:41 UTC: run `0yfi`); `du -sb docs/strategy/024/snapshot`; `awk` on the request log (bytes, non-200s).
17. `node <scratch>/fix-tpl.cjs` and `node <scratch>/assemble.cjs` — this report from its text and `docs/strategy/024/tables/*.md`.
18. `git status --short`; `git diff --stat 7daf5e1 HEAD -- src public scripts` (empty); `git add CLAUDE.md package.json docs/strategy/024 tasks/024-leaders.md tasks/024-leaders.report.md && git commit -m "024: leaders"`; `git push`; `git log --oneline -3`; `git log origin/rework --oneline -1`; `git log main --oneline -1`; `git status`.
19. `rm -r` of the scratch directory's files.

## Notes
**Defects noticed and not touched**
- `src/sim/stats.ts:74-76` says "`initiative` isn't reported on Character totals": it is now — the API's `initiative`
  carries a base of 100 plus the items (3a). `currentStats` (`:49-65`) ignores it, so the live gate (`exec.ts:440`, `:573`)
  and every solve start the player at the items' initiative alone.
- `docs/strategy/022/tools/README.md` says 022's request log lay in scratch; a copy is in the repository
  (`docs/strategy/022/requests.log`, 42 lines) and the base reads the read times from it.
- The API's `effects` of a character name the gathering and crafting cuts of its artifacts and not the worn potions'
  effects; nothing in this fleet reads them.

**Guesses, most doubtful first**
- The offering's quarter: 16 characters gained exactly a quarter of their level's XP between the reads, so a quarter of
  the first read's level is taken off as the day's combat offering wherever the gain holds one (`stats.mjs` (f)). A
  character that did no offering and fought a quarter of a level is miscounted; a character crossing a level got the
  quarter of the later level, not the earlier.
- "Active" = the cooldown ended less than 60 s before the read: in this read every ended cooldown lay within 1.8 s, one at
  324.5 s (`at0mstr0m`'s at0m_4); in 022's within 8 s and five over 12 h. A character between two scripts' actions for a
  minute counts as active.
- The role rule (tile first, then the weapon) calls a fighter at the bank in a fight set a fighter, a fighter walking in a
  gathering set a gatherer; (a)'s counts are of the moment.
- The measured hours a level take the whole 17 h interval: a character that also gathered levelled faster than shown, so
  "faster than the model" is said only when even that holds.
- The Monte Carlo win rate is this fleet's simulator with crits rolled (`src/sim/monte.ts`'s method); it shares every
  other reading of the simulator. That the leaders win those fights is shown by their standing there, most at full HP, with
  scripts that act within seconds — not measured — no loss is visible in one read.
- (e)'s "no XP" uses `src/plan/xp.ts:68-69` (nothing more than 10 levels above the monster); a leader on such a monster may
  be after its drops, its task or a kill count — the base shows the task, not the motive.

**What one read at one moment cannot show, and a second read would**
- Losses: a character on (0, 0) with low HP between two reads of the same character; this read shows one there
  (`ront_tv`'s Ront, 153/695 HP, on a plank task — perhaps only walking).
- The pace of the 14 accounts not read on 11-22 (`Alrick00`, `at0mstr0m`, `aropan`, `brinko`, `Myoto`, `LewisHeidrick`,
  `_zero_`, `br_lemes`, `ront_tv`, `Trobyss`, `ShadyBliss`, `Grewaa`, `Tomlox`, `jowrjowr`) and the pace of a fighter at
  25–39 (two in both reads).
- What a leader does in a day: one read is one tile; the share of a day on combat, on tasks, on gathering needs reads
  hours apart (a light read is 27 requests).

## To delete (Alex)
Nothing. The scratch files of this task (`D:\Temp\claude\…\scratchpad`: the patch scripts, the network-blocking preload,
the table drafts, the hashes, the check's output) are deleted at the end of the task.
