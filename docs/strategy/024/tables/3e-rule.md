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

