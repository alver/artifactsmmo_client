# Task 040 — the gold tables (read-only)

The tables behind `tasks/040-gold.report.md`. Counted on 2026-11-28 (to 13:37 UTC) from what is on disk only.
Sources: `logs/world/2026-11-21.json` … `2026-11-28.json` (the bank's gold, the characters' pocket gold, the bank at
00:00 UTC), `logs/raw/2026-11-21` … `2026-11-28` (every fight's `+Ng`, every `npc/sell`, `npc/buy`, `task/complete`,
gather line), `logs/journal/2026-11-21` … `2026-11-28.jsonl` (`spend`, `ach`, `event`, `bank`, `step` + `end` with
the meter's `gin`), `logs/market/2026-11-21` … `2026-11-28.jsonl` (794 reads, 11-21 17:01 → 11-28 13:22, 6.85 days),
`logs/board/2026-11-24/0917Z` … `2026-11-28/1200Z` (51 reads), `public/data/*.json`, `stage.json`,
`docs/api/openapi.json`. The scripts were scratch (`D:\Temp\claude\…\scratchpad\a1.mjs b1.mjs mkt.mjs d.mjs c.mjs
tidy.mts`); every number below can be recounted with the greps of the report's "How Alex verifies".

## A.1 The ledger, a day (UTC)

Start = `logs/world/<day>.json` `bankDetails.gold` + the five pockets. Income: kills = the raw log's `fight win … +Ng`
summed; achievements = `achievements.json` `rewards.gold` of every `ach` record's code; merchant sales = `npc/sell` ×
`npc_items.json` `sell_price`; tasks = what is left (below). Spent: `spend` records (`market`, `expansion`) and the gold
`npc/buy` lines × `buy_price` (the 11-21 maps have no `spend` record: task 021 came later). Check = the next start less
this start less (income − spent): 0 on four days; on 11-25/26/27 it is +210, +709, +1,186 for 1, 3, 5 `task/complete`
lines — the tasks' gold (236 a task; `tasks.json`: 200 a monsters task under 20, 300 at 20–29, 500 from 30).

| day | start: bank + pockets | kills (fights) | tasks | achiev. | merchant sales | market sales | spent: market | merchant | expansion | net | check |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 11-21 (from 11:43) | 240,489 + 42 | 665 (152) | — | 1,000 | 1,000 egg | 0 | 0 | 75,000 (5 lost world maps) | 0 | −72,335 | 0 |
| 11-22 | 168,196 + 0 | 2,086 (347) | — | 3,000 | 0 | 0 | 0 | 0 | 28,000 | −22,914 | 0 |
| 11-23 | 145,206 + 76 | 3,814 (1,517) | — | 2,000 | 0 | 0 | 0 | 0 | 0 | +5,814 | 0 |
| 11-24 | 151,096 + 0 | 10,872 (2,734) | — | 5,000 | 1,000 egg | 0 | 0 | 50,000 (5 healing runes) | 0 | −33,128 | 0 |
| 11-25 | 117,777 + 191 | 22,078 (5,575) | 210 (1) | 0 | 1,000 shrimp | 0 | 0 | 0 | 56,000 | −32,712 | +210 = tasks |
| 11-26 | 84,755 + 501 | 26,464 (7,522) | 709 (3) | 3,000 | 0 | 0 | 0 | 0 | 0 | +30,173 | +709 = tasks |
| 11-27 | 114,901 + 528 | 32,722 (8,162) | 1,186 (5) | 4,000 | 0 | 0 | 24,041 | 0 | 0 | +13,867 | +1,186 = tasks |
| 11-28 (to 13:37) | 128,179 + 1,117 | 23,056 (4,421) | ~940 (4) | 0 | 1,000 egg | 0 | 0 | 0 | 0 | bank 153,200 at 13:22 | pockets not read |
| **11-21 11:43 → 11-28 00:00** | 240,531 → 129,296 | **98,701** | **2,105** | **18,000** | **3,000** | **0** | **24,041** | **125,000** | **84,000** | **−111,235** | 0 |

The market's 24,041 of 11-27 (task 032's first day): king slimeballs 11,380 (42), perfect bows 3,500, royal skeleton
rings 3,200, a gold sword 2,100, lizard eyes 2,275 (13), owlbear hair 742, ogre eyes 450, red cloth 255, green cloth 70,
pig skin 69. Other `npc/buy` (cloth, hard leather, snakeskin, vermin leather at the tailor; crystals, magical cure at the
tasks trader) are paid in materials and coins, not gold.

## A.2 A day now, by source and character

| source | 11-27 (whole day) | 11-28 (00:00–13:37, 13.6 h) | a day now |
|---|---|---|---|
| kills | 32,722: First 11,889 · Fifth 8,555 · Second 4,976 · Fourth 4,113 · Third 3,189 | 23,056: Fourth 5,498 · First 5,335 · Second 4,413 · Third 3,974 · Fifth 3,836 | 33–41k |
| tasks | 1,186 (5) | ~940 (4) | ~1k |
| achievements | 4,000 (ecologist, the_reaper) | 0 | 2.8k (18,000 in 6.5 days; lumpy) |
| merchant sales | 0 | 1,000 (golden egg) | 0.6k (4,000 in 7 days) |
| market sales | 0 | 0 | 0 (the engine makes no sell order) |
| **total** | **37,908** | ~25,000 | **~37–45k** |

## B.1 Kills: gold a kill and an hour (the meter, 11-25 → 11-28 13:37, `step` + `end` records)

Gold a kill is the catalog's mean `(min_gold + max_gold) / 2` within the dice (vampire 5.0 measured / 5, owlbear 7.3 / 7.5,
death knight 5.9–6.2 / 6, spider 4.8 / 5, chicken 1.4 / 1.5). An hour is the meter's seconds (fight, rest, eat, walk, bank).

| who | monster | hours | kills | gold a kill | s a kill | gold an hour |
|---|---|---|---|---|---|---|
| First | death knight | 4.5 | 396 | 6.2 | 41 | 537 |
| First | owlbear | 11.5 | 593 | 7.3 | 70 | 374 |
| Fifth | death knight | 5.9 | 267 | 5.9 | 80 | 267 |
| Fifth | owlbear | 6.1 | 173 | 8.2 | 128 | 230 |
| First / Fifth | vampire | 15.4 / 18.3 | 596 / 744 | 5.0 / 5.1 | 93 / 88 | 193 / 206 |
| Fifth | imp | 1.5 | 69 | 6.6 | 80 | 295 |
| workers | skeleton | 6.7 / 5.9 / 5.2 | 497 / 391 / 397 | 3.9–4.1 | 47–55 | 260–310 |
| First / Fifth | blue slime | 4.1 / 2.6 | 1,306 / 855 | 2.5 | 11 | 799 / 805 |
| First | sheep | 2.1 | 702 | 2.5 | 11 | 815 |
| Fourth / Second | cow | 5.2 / 2.5 | 923 / 531 | 3.4–3.7 | 17–20 | 600–790 |
| Fourth / Second | chicken | 0.7 / 0.5 | 286 / 251 | 1.4–1.5 | 8 | 560–720 (+ eggs, B.2) |

At 40 (`public/data/atlas.json` `path[39]`, the XP pick of a level-40 character): the cursed tree 127 s a kill × 7.5 =
213 an hour; the hellhound 84 s × 12.5 = 536. The board's fleets at 39–46 (C) make 308–488 an hour a character in
steady pocket gold. Merchant drops ride on kills: the death knight sword 1 in 600 (3 in 676 of our kills) → 1,500 at the
nomadic merchant = +2.5 a kill (+110–220 an hour); bandit armor 1 in 600 → 2,000 (bandit camp, an event); the golden
egg 1 in 1,000 (chicken) → 1,000 = +1 a kill, ~430 an hour at 8 s a kill, and eggs 1 in 12 to the standing bids (9).

## B.2 What the merchants buy that we get (`npc_items.json` `sell_price`; every buyer is an event, 90 min a visit)

Visits from the journal's `event` records, 11-21 11:54 → 11-28 13:00 (7.05 days): **gemstone 5** (11-22 13:03,
11-25 03:53, 11-25 09:57, 11-26 02:56, 11-28 01:11; gaps of 2.6, 0.3, 0.7, 1.9 days) · **nomadic 7** · **fish 6** ·
**timber 9** · **herbal 5**. Only the nomadic merchant's 3 visits and the fish merchant's 1 sold anything (the standing
order: golden egg, golden shrimp; 4,000 gold); every other visit was "nothing to do".

| item | price | merchant | where ours comes from (measured on the raw log) | an hour of ours |
|---|---|---|---|---|
| ruby, sapphire, emerald, topaz | 1,500 | gemstone | 24 stones a gem (mining 20); gold rocks: 449 stones in 10,190 gathers (4.4%), 106 gathers an hour | ~290 |
| diamond | 5,000 | gemstone | 24 diamond stones (mining 35); gold rocks 8 in 10,190 (1 in 1,274); strange rocks 1 in 100 | ~17 (gold) · ~220 (strange) |
| death knight sword | 1,500 | nomadic | 1 in 600 kills (3 in 676) | +110–220 at the death knight |
| bandit armor | 2,000 | nomadic | bandit lizard 1 in 600 (bandit camp: 12 spawns in 7 days) | +~50 there |
| golden egg | 1,000 | nomadic | chicken 1 in 1,000 | ~430 at the chickens |
| golden shrimp | 1,000 | fish | shrimp spot 1 in 1,000 | ~135 |
| small pearls | 250 | fish | trout and bass 1 in 300 (23 in 5,876 trout gathers), salmon 1 in 100 | ~105 (trout) · ~315 (salmon, fishing 40) |
| shell | 120 | fish | gudgeon and shrimp 1 in 100 | ~190 (gudgeon) |
| sap | 15 | timber | ash, spruce, birch, dead tree 1 in 10 (1,441 in 12,338 wood gathers, 11.7%) | 190–270 |
| magic sap | 150 | timber | magic tree 1 in 10 (an event: 2 spawns in 7 days) or 15 magic wood (woodcutting 35) | — |
| wolf ears, highwayman dagger, wooden club, old boots, forest ring/staff | 300, 350, 350, 350, 100 | nomadic | 1 in 200–300 of wolf, highwayman, ogre, spider, mushmush, flying snake | <100 |

## B.3 The market: where the order book shows demand (`logs/market/`, 6.85 days)

"Filled" counts a drop of the units wanted while the number of buy orders stayed (a partial fill, a lower bound); "taken"
a drop of the units on sale while the sell orders stayed (a lower bound; an order that vanished may have been bought or
cancelled). Price: the bid or the lowest ask at the drop. `docs/api/openapi.json` names no fee.

Standing bids on what we hold or make (the bid's share of reads · its median · at 11-28 13:22 · filled a day):
small pearls 100% · 20 · 80 × 385 (6 orders) · ≥39 — egg 100% · 8 · 9 × 2,235 · ≥41 — green slimeball 100% · 8 · 8 × 264 ·
≥130 — blue slimeball 100% · 8 · 8 × 51 · ≥98 — red slimeball 100% · 12 · 11 × 1,207 · ≥38 — sap 32% · 3 · 3 × 1,164
(14 orders) · ≥86 — cyclops eye 63% · 50 · 50 × 530 · ≥6 — owlbear claw 63% · 10 · 10 × 154 · ≥9 — wolf ears 43% · 220 ·
220 × 23 · ≥8 — highwayman dagger 43% · 200 · 200 × 18 · ≥12 — forest ring / staff 43% · 75 · 75 × 30 / 29 · 0 — wooden
club 43% · 250 · 250 × 10 · 0 — golden egg 37% · 750 · 750 × 44 · ≥1 — golden shrimp 43% · 750 · 750 × 5 · 0 — ruby,
emerald, sapphire, topaz 34–36% · 900 · 900 × 6–8 · ≤1 — diamond 29% · 4,000 · 4,000 × 8 · 0.3 — magic wood 17% · 5 ·
10 × 775 · 0 — gold ore 5% · 4 · none now · ≥205 — ogre skin 30% · 21 · none now · ≥88. **Every bid stands below the
merchant's price where a merchant buys the code.**

Asks taken a day (lower bound) on codes we hold or make: iron ore ≥243 at ~12 · coal ≥310 at ~8 · spruce wood ≥201 at
~14 · nettle leaf ≥108 at ~7 · bass ≥134 at ~3 · birch wood ≥51 at ~13 · skeleton bone ≥44 at ~87 · copper bar ≥21 at
~77 · hardwood plank ≥28 at ~80 · cooked chicken ≥46 at ~17 · cooked beef ≥38 at ~17 · cooked trout ≥14 at ~72 · iron bar
≥13 at ~250 · lizard eye ≥14 at 175 · king slimeball ≥9 at ~318 · emerald / ruby / sapphire / topaz stone ≥41 / 20 / 22
/ 13 at 9–37 · royal skeleton ring ≥3.4 at ~1,800 · elderwood staff ≥1.6 at ~1,700 · perfect bow ≥1.3 at ~1,750 · gold
platelegs ≥1.0 at ~2,200 · gold helm ≥0.7 at ~2,500 · gold mask ≥0.7 at ~2,100 · gold ring ≥1.2 at ~1,200 · death knight
sword ≤1.2 at ~2,800–2,980 (none taken as a partial).

## B.4 Crafts: the product against its materials (materials at their median lowest ask; our bank's stock beside)

| product | skill | sells (taken a day) | materials at asks | note |
|---|---|---|---|---|
| a gem (ruby, sapphire, emerald, topaz) | mining 20 | 1,500 at the gemstone merchant; bid 900 × 6–8 | 24 stones at 9–37 = 220–890 | the bank holds 1,741 stones of the four |
| diamond | mining 35 | 5,000 at the merchant; bid 4,000 × 8 | 24 diamond stones (none on sale taken) | the bank holds 77 |
| iron bar | mining 10 | ~250 (≥13) | 10 iron ore ≈ 120 | |
| copper bar | mining 1 | ~65–84 (≥21) | 10 copper ore (no ask) | the bank holds 5,881 copper ore |
| hardwood plank | woodcutting 20 | ~80 (≥28) | 4 ash + 6 birch ≈ 74 | |
| cooked trout | cooking 20 | ~72 (≥14) | 1 trout | the fighters' food |
| cooked chicken / beef | cooking 1 / 5 | ~17 (≥46 / ≥38) | 1 raw (chicken ask 9) | the bank holds 2,916 raw chicken, 811 raw beef |
| magic sap | woodcutting 35 | 150 at the timber merchant | 15 magic wood (bid 10) | break-even against the bid |
| sap | woodcutting 30 | 15 at the timber merchant | 5 ash + 5 spruce + 5 dead wood | 15 woods for 15 gold: no |
| royal skeleton ring | jewelrycrafting 30 | ~1,800 (≥3.4) | 8 gold bars, 3 owlbear claws, 3 vampire teeth, 2 spider legs, 4 ogre skins | the stage pieces take the same gold bars |
| gold platelegs · gold helm · gold mask | gearcrafting 30 | ~2,200 · 2,500 · 2,100 (≤1 each) | 8 gold bars + drops (demon horn: an event) | listed stage-2 pieces themselves |
| dreadful amulet | jewelrycrafting 20 | ~3,500 (≥0.7) | 6 hardwood planks, 4 ogre eyes, 2 hard leather, 2 king slimeballs ≈ 1,120 | |

## B.5 Tasks, achievements, the coin exchange

- A task (`tasks.json`): monsters 200 gold + 3 coins (level < 20), 300 + 4 (20–29), 500 + 5 (30+), 50–400 kills; items
  150–350 + 2–4. Ours: 236 a task (9 tasks, 11-25 → 11-27), 13 `task/complete` lines in 7 days.
- Achievements (`achievements.json` `rewards.gold`): 18,000 paid in 6.5 days; the open ones of stages 1–2 (`stage.json`):
  28,000 (cabinet_maker 1,000, cultist_purifier 4,000, diamond_in_the_sky 3,000, expert/professional/master fisherman,
  lumberjack, miner 1,000–2,000 each, grand_master 3,000, lich_please 2,000, life_lover 4,000); every open one: 268,000.
- The exchange (`task/exchange`): 6 coins for one reward of `task_rewards.json` (a chance of 1 in `rate`): small bag of gold
  (1,000) 1 in 20, bag of gold (2,500) 1 in 50, a gem 1 in 100 each, diamond and alexandrite 1 in 200 — ~225 gold in
  expectation for 6 coins; the tasks trader sells a jasper crystal for 8.

## C The board's pocket gold (51 reads, 11-24 09:17 → 11-28 12:00, two hours apart)

A character's rise between two reads; a fall (a deposit) is not counted, so a fleet that banks often shows little. "Steady"
= rises of at most 3,000 in an interval (kills, tasks); "jumps" = larger (a sale, a reward, gold taken out of the bank —
pocket gold cannot tell them apart). A day = the sum over the account's hours.

| account | combat levels (11-28) | steady a day | where it rose | jumps a day (n) |
|---|---|---|---|---|
| brinko | 46 46 45 45 44 | 58,520 | the forest, goblin wolfrider, the bank, imp | 13,554 (6) |
| rs_appez | 38 36 36 35 34 | 40,285 | skeleton, rat, imp, vampire | 7,427 (1) |
| Elaus_ | 44 43 41 41 39 | 36,953 | the forest, imp, cursed tree, cultist acolyte | 0 |
| hunter2 | 50 47 46 46 43 | 36,761 | the forest, chicken, lich, bass | 22,870 (13) |
| Turbofish | 47 45 43 35 34 | 29,875 | rat, pig, cow, vampire | 32,908 (28) |
| Alrick00 | 45 45 45 40 40 | 27,170 | the forest, chicken, cursed tree, imp | 70,932 (13): Thelebos +59,400 at the gold rocks with gem stones in its bag; +40,050 at the glowstem |
| Myoto · aropan · ront_tv | 42–39 · 45–41 · 40–38 | 27,157 · 26,958 · 25,090 | imp, gold rocks · cultist acolyte, vampire · imp, bass | 0 · 1,892 · 10,349 |
| median of 52 | | 5,961 | | |
| **alverus (ours)** | 36 33 29 28 27 | **5,476 (30th)** | highwayman, flying snake, wolf, mushmush | 0 — our fights made 26–33k a day (A); ours deposit gold at every bank trip (478 `deposit/gold` since 11-21) |

The 111 jumps stood at a monster (66), a resource (16), the bank (10), the forest (10), a workshop (5), the exchange (4).

## D.1 The bank by kind (`logs/world/2026-11-28.json`, 00:00 UTC: 128 codes of 150 slots; 131 at 13:22)

Rules: a **listed piece's material** = in the recipe tree of a `pieces` code of stage 1 or 2 (`stage.json`); a
**training's** = in the tree of a weapon-, gear- or jewelrycrafting recipe of level 20 to the stage's number (a recipe
with a gem ingredient is not trained: `xp.ts autoRecyclable`); the **tools'** = the steel axe, pickaxe and fishing rod
(the plan's parents at 00:00); **worn** = a code a character wears or the tidy finds in a solve (`bank.ts tidyVerdicts`,
run on the snapshot with the current `stage.json`); the gem stones and sap are counted as asked by nothing: two copies of
every listed piece take 4 emeralds and 2 sapphires, and the bank holds 7 and 3 cut.

| kind | codes | the codes (count) |
|---|---|---|
| a listed piece's material | 37 | coal 5,644 · gold ore 6,617 · dead wood 2,800 · gold bar 315 · steel bar 361 · vampire blood 288 · vampire tooth 174 · red cloth 141 · hardwood plank 136 · wolf hair 114 · birch wood 111 · ash wood 283 · pig skin 70 · dead wood plank 60 · ogre eye 42 · hard leather 37 · ash plank 27 · iron ore 19 · skeleton bone 18 · lizard skin 15 · imp tail 15 · magical cure 11 · lizard eye 11 · cyclops eye 9 · demoniac dust 9 · full moon vampire cape 9 · vermin leather 8 · emerald 7 · owlbear hair 6 · wolf bone 5 · ogre skin 4 · sapphire 3 · prime fabric 3 · piece of obsidian 3 · skeleton pants 3 · skeleton armor 2 · obsidian bar 1 |
| a training's material | 8 | skeleton skull 168 · blue slimeball 95 · iron bar 58 · rat hide 40 · snakeskin 19 · skeleton helmet 10 · snake hide 3 · wool 1 |
| the tools' material | 3 | green cloth 113 · flying wing 65 · spider leg 71 |
| food and its raw | 11 | raw chicken 2,916 · trout 3,869 · gudgeon 2,193 · shrimp 1,720 · raw wolf meat 1,383 · apple 822 · raw beef 811 · milk bucket 414 · apple pie 289 · cooked rat meat 241 · mushroom 30 |
| potions (drunk from stock, none made: `POTIONS` off) | 5 | health splash 358 · small antidote 83 · greater health 50 · antidote 13 · air boost 4 |
| tools | 4 | spruce fishing rod 5 · iron axe 5 · iron pickaxe 5 · steel gloves 1 |
| worn gear (spares of a worn code) | 9 | battlestaff 36 · skull ring 16 · wisdom amulet 15 · adventurer pants 5 · steel armor 4 · magic wizard hat 2 · iron shield 2 · hard leather helmet 1 · old boots 1 |
| keys and currencies | 3 | lich tomb key 225 · tasks coin 65 · small bag of gold 2 |
| **asked by nothing in the plan** | **48** | D.2 |

## D.2 Asked by nothing: how each could leave (largest gold first)

Gold at the merchant's price (all copies), else the standing bid of 11-28 13:22 (up to its units). "Recycle" = the tidy's
verdict on the snapshot (what comes back for every copy).

| # | code | count | how it could leave | gold |
|---|---|---|---|---|
| 1 | topaz stone | 509 | cut 21 topaz (mining 20) → gemstone 1,500; 5 stones left (asks 11–21, ≥13 a day) | 31,500 |
| 2 | ruby stone | 481 | cut 20 rubies → gemstone 1,500; 1 left | 30,000 |
| 3 | sapphire stone | 448 | cut 18 → gemstone 1,500; 16 left | 27,000 |
| 4 | sap | 1,688 | timber 15 (the standing order skips it: a recipe uses it); bid 3 × 1,164 | 25,320 |
| 5 | emerald stone | 303 | cut 12 → gemstone 1,500; 15 left | 18,000 |
| 6 | diamond stone | 77 | cut 3 diamonds (mining 35) → gemstone 5,000; bid 4,000 × 8; 5 left | 15,000 |
| 7 | shell | 87 | fish 120 (skipped: the iron knife uses it) | 10,440 |
| 8 | small pearls | 24 | fish 250; bid 80 × 385; or 20 for a perfect pearl (package 7a) | 6,000 |
| 9 | copper ore | 5,881 | gemstone 1; or 588 copper bars on the market (~77, ≥21 a day) | 5,881 |
| 10 | highwayman dagger | 13 | nomadic 350; bid 200 × 18 (not recyclable) | 4,550 |
| 11 | wolf ears | 13 | nomadic 300; bid 220 × 23 (not recyclable; nobody wore one at 00:00 — package 7d may ask it) | 3,900 |
| 12 | ruby | 2 | gemstone 1,500; bid 900 × 6 | 3,000 |
| 13 | forest staff | 25 | nomadic 100; bid 75 × 29 | 2,500 |
| 14 | forest ring | 24 | nomadic 100; bid 75 × 30 | 2,400 |
| 15 | magic sap | 8 | timber 150 | 1,200 |
| 16 | strange ore | 1,003 | gemstone 1 (strangold bars are mining 35, stage 3) | 1,003 |
| 17 | golden egg | 1 | nomadic 1,000 (the standing order sells it) | 1,000 |
| 18 | magic wood | 97 | bid 10 × 775 (or 6 magic sap → 900) | 970 |
| 19 | green slimeball | 98 | bid 8 × 264 | 784 |
| 20 | wooden club | 2 | nomadic 350; bid 250 × 10 | 700 |
| 21 | red slimeball | 44 | bid 11 × 1,207 | 484 |
| 22 | sunflower | 241 | herbal 1 | 241 |
| 23 | nettle leaf | 226 | herbal 1 (asks ~7, ≥108 a day) | 226 |
| 24 | yellow slimeball | 26 | bid 6–8 (57% of reads; none at 13:22) | ~160 |
| 25 | algae | 130 | fish 1 | 130 |
| 26 | cowhide | 2 | bid 9–11 (5% of reads) | ~20 |
| 27 | copper bar | 181 | no merchant, no bid; asks ~77 taken ≥21 a day | (sell order) |
| 28 | spruce plank | 21 | asks ~5 taken ≥26 a day | (sell order) |
| 29 | feather | 719 | nothing (asks at 1, none taken) | 0 |
| 30 | air ring | 11 | recycle, outdated now: 14 iron bar, 11 green slimeball, 8 flying wing | materials |
| 31 | adventurer vest · fire · earth · water ring | 5 each | recycle, outdated now (wool, cowhide, spruce plank, slimeballs, iron bar, flying wing) | materials |
| 32 | steel battleaxe | 18 | recycle once the lowest combat level on is 30 (level margin): 18 steel bar, 18 hardwood plank, 18 skeleton bone, 18 wolf hair | materials |
| 33 | shuriken · steel ring | 10 · 9 | recycle at 30 (10 steel bar, 8 wolf bone … · 13 steel bar, 5 skeleton bone …); steel ring asks 400–1,000 (≥0.7 a day) | materials |
| 34 | hard leather boots · hunting bow · snakeskin boots | 7 · 5 · 5 | recycle at 30 | materials |
| 35 | skull staff · hard leather pants | 3 · 3 | recycle at 30 | materials |
| 36 | lizard skin armor · gold sword | 1 · 1 | recycle at 35 / 40 (level 25 / 30); gold sword asks ~2,100 (≥0.6 a day) | materials |
| 37 | life ring | 5 | recycle refused: the cloth back needs a new slot | materials |
| 38 | mushstaff · mushmush bow · wooden staff | 5 · 5 · 2 | nothing: recycling refused (a jasper crystal comes back mostly lost) | 0 |

**What it brings:** ~192,000 gold by the merchants and the bids (rows 1–26; the stones 121,500, sap 25,320, shell 10,440);
rows 1–26 free **26 slots** once every copy is gone (the stones' leftovers sold on the market or kept as 5 slots); the
outdated rings and vest **5 more** by recycling now; rows 32–36 **10** at the level margin (or by sell orders); rows 27–29
and 37–38 **7** only by a sell order or a deletion. All 48 if everything goes.

## D.3 The expansions

| when | price | slots | source |
|---|---|---|---|
| before 11-21 (two on 11-13, one earlier) | not in the logs | 50 → 110 (3 expansions) | `logs/dev.log` `buy_expansion` lines; `bankDetails.expansions` 3 on 11-21 |
| 11-22 20:59 (Third) | 28,000 | 110 → 130 | `spend` record; raw `plan: bank — Third bought …` |
| 11-25 23:57 (Fourth) | 56,000 | 130 → 150 | `spend` record; raw `plan: bank — Fourth bought …` |
| next | **112,000** | 150 → 170 | `bankDetails.next_expansion_cost`; above `config.expansionCap` 60,000 |

## E What the plan will spend

| item | gold | when | from |
|---|---|---|---|
| backpacks for the crafters (Second, Third, Fourth) | 150,000 | now (Alex, 11-28) | the nomadic merchant, 7 visits in 7 days; the standing order's `WISHLIST` holds only lost world maps |
| backpacks for the fighters (First, Fifth) | 100,000 | later | the same |
| burn runes at 40 (First, Fifth; Second if a fighter) | 60,000 (90,000) | stage 2's end: 2–6 Dec (season plan, section 2) | the rune vendor, (8, 13) |
| the next expansion | 112,000 | below 10 free (19 free at 13:22) | the engine stops at 60,000 |
| the market's purse | up to 25,000 a day | daily; spent 24,041 on 11-27, 0 on 11-28 to 13:37 | `config.market` |
| fares, stages 4–5 | 1,000 a way (Sandwhisper Isle), 5,000 (the Enchanted Forest) | from ~45 | `maps.json` transitions |
| the gold floor | 20,000 kept | always | `GOLD_FLOOR` |
