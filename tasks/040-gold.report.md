# 040 — Gold: report (read-only, 2026-11-28 to 13:37 UTC)
Read from disk only: no request, nothing under `src/` changed, no git write. The full tables: `docs/strategy/gold/tables.md`.

## Summary
- **The fleet makes ~37–45k gold a day**: kills 33–41k (about 90%), tasks ~1k, achievements ~2.8k on average, merchant sales ~0.6k, the market 0. From 11-21 11:43 to 11-28 00:00, 121.8k came in and 233.0k went out (lost world maps 75k, healing runes 50k, expansions 84k, the market 24k). The bank went 240.5k → 153.2k (11-28 13:22).
- **B's three** (the most gold for the least plan lost): (1) **the bank's gem stones**, cut and sold to the gemstone merchant: 121,500 once, then ~300 an hour of the mining lane's own work; (2) **the gathering lanes' merchant by-products and the bank's sellable stock** (sap, shells, pearls, the nomadic merchant's gear): ~60k once, then 190–300 an hour of woodcutting or fishing; (3) **sell orders where the book takes asks** (coal, iron ore, copper bars from the bank's 5,881 copper ore): a few thousand a day. The engine does none of the three today.
- **The bank**: 48 of its 128 codes are asked for by nothing in the plan. Merchants and standing bids would take 26 of them for **~192k gold**, recycling 5 more now and 10 at the level margin. The next expansion costs **112,000** for 20 slots, above the engine's 60,000 cap.
- **E**: the week's bill is crafters' backpacks 150k + two burn runes 60k + the market purse 105–175k. Against 260–315k of income that leaves a gap of **−55k to 0** with the purse at its pace so far, **−125k to −70k** with the full purse, and **−112k more** with the expansion. The bank holds 133k above its floor, and D.2's ~192k one-time gold covers the gap.

## A. Our gold so far (`logs/world`, `logs/raw`, `logs/journal`, 11-21 → 11-28; tables.md A.1)
| day | start (bank) | kills | tasks | achiev. | merchant sales | spent: market · merchant · expansion | net |
|---|---|---|---|---|---|---|---|
| 11-21 (from 11:43) | 240,489 | 665 | — | 1,000 | 1,000 | 0 · 75,000 (5 lost world maps) · 0 | −72,335 |
| 11-22 | 168,196 | 2,086 | — | 3,000 | 0 | 0 · 0 · 28,000 | −22,914 |
| 11-23 | 145,206 | 3,814 | — | 2,000 | 0 | 0 · 0 · 0 | +5,814 |
| 11-24 | 151,096 | 10,872 | — | 5,000 | 1,000 | 0 · 50,000 (5 healing runes) · 0 | −33,128 |
| 11-25 | 117,777 | 22,078 | 210 (1) | 0 | 1,000 | 0 · 0 · 56,000 | −32,712 |
| 11-26 | 84,755 | 26,464 | 709 (3) | 3,000 | 0 | 0 · 0 · 0 | +30,173 |
| 11-27 | 114,901 | 32,722 | 1,186 (5) | 4,000 | 0 | 24,041 · 0 · 0 | +13,867 |
| 11-28 (to 13:37) | 128,179 | 23,056 | ~940 (4) | 0 | 1,000 | 0 · 0 · 0 | bank 153,200 at 13:22 |
The ledger closes against the snapshots on every day. Market sales were 0 every day. Tasks are what is left over: about 236 gold a turn-in.
**A.2, a day now**: kills 33–41k (11-27: First 11.9k · Fifth 8.6k · Second 5.0k · Fourth 4.1k · Third 3.2k), tasks ~1k, achievements 2.8k (lumpy), merchants 0.6k. Total ~37–45k.

## B. The ways gold is earned (an hour of one character; tables.md B.1–B.5)
| way | today | fighters at 40 | limit | whose hours |
|---|---|---|---|---|
| kills on a fighter's XP pick | 190–540 (First: death knight 537, owlbear 374) | 213–536 (atlas pick); board 308–488 | none | the plan's own |
| kills on the fastest monsters (slimes, sheep, cows) | 600–815 | same | — | a worker's lane; a fighter gets no XP (035) |
| chickens: kill gold + golden egg (1,000) + eggs to the bids (9) | ~1,300 | same | nomadic ~1 visit/day; ~2,200 eggs wanted | a worker's lane |
| gem stones, mining gold rocks (cut, 1,500 a gem) | ~300 | ~300 (mithril) | gemstone 5 visits in 7 days, 90 min; bids 900 × 6–8 | none: the mining lane |
| sap, woodcutting (timber 15) | 190–270 | ~275 (maple sap 25) | timber 9 visits; the order skips sap | none: the woodcutting lane |
| shells, golden shrimp, pearls, fishing (fish 120 / 1,000 / 250) | 105–300 | ~315 (salmon) | fish 6 visits; perfect pearl wants 20 | none: the fishing lane |
| death knight sword drop (nomadic 1,500) | +110–220 at the death knight | — | 1 in 600 (3 in 676 ours); a stage-2 piece | none: the pick |
| market sell orders where asks are taken | iron ore ≥243/day at ~12, coal ≥310 at ~8, skeleton bone ≥44 at ~87 | — | the book (lower bounds) | an exchange walk; no sell order exists |
| market bids (filled) | pearls 80, slimeballs 8–12, egg 9, gems 900, wolf ears 220 | — | units wanted | every bid is below the merchant's price |
| crafts sold: gems from stones | 24 stones (220–890 at asks) → 1,500 | — | gemstone visits | ~5 s a cut |
| crafts sold: iron bar · copper bar · level-30 pieces | ~250 (ore 120) · ~77 (free ore) · 1,700–2,500 | — | ≥13 · ≥21 · ≤3.4 a day each | crafters; the pieces share the stage's gold bars |
| tasks | 236 a task measured (500 + 5 coins from 30) | 500 a task | ours 1–5 a day | none when its monster is the pick |
| achievements | 18,000 in 6.5 days; 28,000 open in stages 1–2 | — | the points | the plan's own |
| coin exchange (6 coins → a random reward) | ~225 expected | — | coins | the tools' coins |
**What the engine sells today:** golden eggs and golden shrimp, through the merchant standing order (4 sales, 4,000 gold since 11-21). `SELL_FLOORS` names sap and shell, but the order skips any code a recipe uses (settled point 6). Gear is never sold. On the exchange it only buys (task 032), and it cuts no gem.
**B's three, and what each would need:** (1) gems: a cut step (24 stones a gem, mining 20, diamond 35: Fourth 37, Fifth 36) before a gemstone visit, and the order selling what the plan does not ask for instead of "no recipe uses it". (2) the by-products: the same sell rule on all five merchants, plus the nomadic merchant's non-recyclable gear. (3) `grandexchange/create_sell_order` and `cancel` (`fill` for bids), with a price from the book. The document does not say where a filled sell order's gold lands.

## C. What the board shows (51 reads, 11-24 → 11-28; tables.md C)
Pocket gold only: a rise between two reads. A deposit hides gold, so a fleet that banks often shows little, and **the bank's gold is not public**. Pocket gold cannot tell a sale from a reward or from gold taken out of a bank.
- Steady rises (at most 3,000 in two hours): brinko 58.5k a day (46–44: goblin wolfrider, imp, the forest), rs_appez 40.3k (38–34: skeleton, rat, imp), Elaus_ 37.0k (44–39: imp, cursed tree, cultist acolyte), hunter2 36.8k. The median is 6.0k. **Ours shows 5.5k (30th)** because ours deposit at every bank trip; our fights made 26–33k a day.
- Jumps: Alrick00 71k a day (Thelebos +59,400 in two hours at the gold rocks with gem stones in its bag; +40,050 at the glowstem), Turbofish 33k, hunter2 23k. The 111 jumps were at monsters 66, resources 16, the bank 10, the exchange 4.

## D. The bank (`logs/world/2026-11-28.json`, 128 codes of 150; 131 at 13:22; tables.md D)
1. By kind: a listed piece's material 37 · a training's 8 · the steel tools' 3 · food and raw 11 · potions 5 · tools 4 · worn gear 9 · keys and currencies 3 · **asked by nothing 48**. The gem stones and sap count as asked by nothing: two copies of every listed piece take 4 emeralds and 2 sapphires, and the bank already holds 7 and 3 cut.
2. Asked by nothing, largest first: topaz stone 509 → 21 gems 31,500 · ruby stone 481 → 30,000 · sapphire stone 448 → 27,000 · **sap 1,688 → timber 25,320** · emerald stone 303 → 18,000 · diamond stone 77 → 15,000 · **shell 87 → fish 10,440** · small pearls 24 → 6,000 (or a perfect pearl) · copper ore 5,881 → 5,881 · highwayman dagger 13 → 4,550 · wolf ears 13 → 3,900 · ruby 2, forest staff 25, forest ring 24, magic sap 8, strange ore, golden egg … (38 lines in tables.md D.2). **26 codes leave by merchants and bids for ~192k gold**; 5 by recycling now (adventurer vest, air/earth/fire/water rings); 10 at the level margin (steel battleaxe 18, shuriken, steel ring …); 7 only by a sell order or deletion (copper bar 181, feather 719, mushstaff …).
3. Expansions: three before 11-21 (prices not logged), 28,000 on 11-22 (110 → 130), 56,000 on 11-25 (130 → 150). The next is **112,000 for 20 slots** (5,600 a slot); D.2's merchants and bids alone free 26 slots and bring ~192k.
4. The tidy today: it runs only below 15 free slots (22 at 00:00, 19 at 13:22), so nothing runs. It recycles only gear 10 levels under the lowest combat level (26): 5 codes qualify; level-20 gear waits; non-recyclable gear, resources, stones and sap are never touched. Below 10 free with nothing to tidy it would buy an expansion only up to 60,000, so at 112,000 the bank would get stuck (`bankStuck`).

## E. What the plan will spend (tables.md E)
| item | gold | when |
|---|---|---|
| backpacks for the crafters (Second, Third, Fourth), at the nomadic merchant | 150,000 | now (Alex); the order's `WISHLIST` holds only lost world maps |
| backpacks for the fighters | 100,000 | later |
| burn runes at 40 (First, Fifth; Second if it fights) | 60,000 (90,000) | 2–6 Dec (season plan, section 2) |
| the next expansion | 112,000 | below 10 free; above the cap |
| the market purse | ≤25,000 a day; real: 24,041 on 11-27, 0 on 11-28 | daily |
| fares (stages 4–5) | 1,000 a way to Sandwhisper Isle, 5,000 the Enchanted Forest | from ~45 |
**A week:** income 260–315k against crafters' backpacks 150k + runes 60k + purse 105k (pace) to 175k (full) = **−55k to 0**, or −125k to −70k at the full purse; the expansion adds −112k. The bank holds 133k above the 20,000 floor.

## How Alex verifies (the hand checks)
- **B, gold a kill**: Fifth's step `lvl:combat:41@Fifth#1` (11-27 23:37:34 → 11-28 02:02:02), `logs/raw/2026-11-27/23.log` + `2026-11-28/00–02.log`: 105 `Fifth fight: fight win` lines, +598 gold, 5.70 a kill. Its `end` record has won 105, gin 598. The catalog says 0–12.
- **B, stones**: `cat logs/raw/*/*.log | grep 'gathering: +1 gold_ore'` gives 10,190 lines; 449 carry a stone (4.4%, the catalog's 4 × 1/100) and 8 a diamond stone.
- **B, sap**: 12,338 ash/spruce/birch/dead-wood gather lines, 1,441 with sap (11.7%, the catalog's 1/10).
- **D, slots**: `logs/raw/2026-11-28/13.log` 13:22:43 says "131 of 150 slots used (19 free), the next expansion 112,000 gold, bank gold 153,200". The world file's `bank` holds 128 codes, matching the 10:50 line "128 … (22 free)".
- **D, the last expansion**: `logs/raw/2026-11-25/23.log` 23:57:43 says "Fourth bought a bank expansion for 56,000 gold: slots 130 → 150, the next costs 112,000". The journal `bank` records show 140,755 → 84,755.
- **A, a day's kills**: `grep -h 'fight: fight win' logs/raw/2026-11-27/*.log | grep -o '+[0-9]*g$' | tr -d '+g' | awk '{s+=$1} END {print s}'` prints 32722. Every gold spend is in `grep '"k":"spend"' logs/journal/*.jsonl`.

## Files
`tasks/040-gold.report.md` (this) · `docs/strategy/gold/tables.md` (every table, with its files and days). Scratch, not kept: `D:\Temp\claude\71701bc605da51df\0945f457-d39a-4ce0-ac93-d66f6be70e21\scratchpad\` (`a1.mjs` ledger, `b1.mjs` meter, `mkt.mjs` book, `c.mjs` board, `d.mjs` + `tidy.mts` bank).
