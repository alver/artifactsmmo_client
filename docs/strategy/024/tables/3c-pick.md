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

