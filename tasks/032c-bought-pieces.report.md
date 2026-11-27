# 032c — What the fleet cannot make is bought: a piece on sale is a candidate: report

## Summary
- **Committed and pushed** to `origin/rework`: `Rework notes` (`docs/rework.md` differed from `HEAD`), then `032c: a piece on sale is
  a candidate` (the code, the checks, `CLAUDE.md`, the task file and this report).
- **The first tick on today's World** (the snapshot of 00:00 UTC, the service's market read of 14:05, the references of 032's and
  032b's reads and the service's log): the workers buy a **Perfect Bow ×1 at 1,750 for Fifth** (`cultist_purifier`, "— no source
  of ours", reference 1,750 of 7 trades), then five materials, then **Death Knight Sword ×2 at 2,979 (5,958), one each for First
  and Fifth** (`king_of_the_goblins`): 7,708 gold for the pieces, 13,415 in seven purchases (`122a769`: the Elderwood Staff,
  1,494; 8,033). **The pick**: with the bow the Imp, **2,979 XP/h (First) / 2,831 (Fifth) against 1,710** on the Vampire (+74% /
  +66%); with a sword the Death Knight, 2,398 / 2,158 (+40% / +26%). But for three days of road the two fighters spend 139–141 of
  their 144 character-hours on a training's kills (C.2): the pick waits.
- **B refuses nothing today that 032b bought**: every purchase with no chain of ours has a reference of 6 trades or more (king
  slimeball 33, owlbear hair 12, dreadful amulet 6; the bow 7, the sword 6). Only the Diamond and topaz have 1 trade.
- **The gate**: `npm run typecheck` passes; `npm run check` **125 checks: 125 ok, 0 known defects reproduced, 0 failed — 191.8 s**;
  the build into `D:\Temp\ammo-032c\dist` passes (399.93 kB). `decide` on the live World with the market, cold: **7.63 → 7.78 s**. Without a market nothing moved: the
  recorded whys equal 032b's (`check-onepage` A.1); 3 days of road (029's driver): **437 of 437 decisions identical**, byte for
  byte (points 42 / 43 / 43). `npm run check -- planner` was not run.

## Decisions for Alex
1. **First's road need cannot ask for the bow.** Gear work (a) judges the current pick (the Vampire) and flips two levels up; the
   bow pays on another monster (the Imp), a bound `gear.ts` names. And H0 is ∞ (levels 39–40 have no XP source on the pool
   alone): every set qualifies and (a) keeps the solve's set against the Vampire after three drops — the Greater Dreadful Staff
   (51 s a win; bow and Elderwood 55 s). The bow comes through Fifth's `cultist_purifier`. Changing (a) is a new need rule; left.
2. **A banked piece is anyone's**: in C.2 the workers wear the bows to hunt the Imp, as with any banked piece. Left.
3. **Added beyond the task**: a purchase leaves the kept order with what the counter read less what was bought (`soldFrom`) —
   the live log of 14:13: Second bought 8 owlbear hair, the next decision took the emptied order, "the order is gone", a 6 h
   block; and `bestOrder` counts the others' purchases in flight (two workers, two orders of one: a copy each).

## How Alex verifies
- `npm run check -- bought` (6 cases; on `122a769` cases 1–4 fail), `-- market-bought-piece` (fails there), `-- queue-kinds` (too).
- After the restart: raw `market: perfect_bow — reference …`, then "worker, the market: supply: Perfect Bow ×1 at 1,750 (…): 1,750
  gold is 5.8 h with the trip — no source of ours; for Perfect Bow for Fifth (cultist_purifier …)", its `spend` record; later
  two Death Knight Swords. A refused piece: a fighter's why "market, no source of ours: … — ask …" or "… no price to hold …".

## C.1 The fighters' weapons (combat 31, a Battlestaff; the Vampire 76 s a kill, 100 / 97 s a win, 1,710 XP/h)
- Before A: First's needs hold the Greater Dreadful Staff (road), the Obsidian Battleaxe (`cult_destroyer`); Fifth's the Greater
  Dreadful Staff (road, Goblin, Wolfrider) and the **Elderwood Staff** (`cultist_purifier`, Goblin Guard, the Orc).
- After A: First's road the same; Fifth's `cultist_purifier` the **Perfect Bow**, Wolfrider and Guard the **Death Knight Sword**;
  with the bow banked, First's Wolfrider need holds a Death Knight Sword too.
- With each in the bank: bow — Imp, 134 / 141 s a kill, 2,979 / 2,831 XP/h, the Vampire 55 / 57 s; sword — Death Knight, 90 / 100
  s, 2,398 / 2,158; Elderwood — Imp, 127 / 137 s, **3,142 / 2,913**. With the bow or the Elderwood the Imp is admitted potion-free
  (p 1.00); today it needs a Small Health Potion. Why the Elderwood is no need for First: Decision 1.

## C.2 Three days with the bows (029's driver from the 00:00 World; levels and the bank at each midnight)
| day | as is: First / Fifth | dust, obsidian, bars | two bows banked: First / Fifth | dust, obsidian, bars |
|---|---|---|---|---|
| 11-27 | 31 / 31 | 2, 2, 1 | 31 / 31, both wear a bow | 2, 2, 1 |
| 11-28 | 31 / 31 | 2, 2, 1 | 31 / 31 | 18.8, 2, 2 |
| 11-29 | 31 / 31 | 2, 2, 1 | 31 / 31 | 97.4, 0.9, 7 |
The fighters spend 141 (as is) and 139 (bows) of 144 character-hours on a training's kills (skeleton, cow, flying snake; with the
bows also the King Slime and wolves): no XP-pick step in either run. The 763 Imp kills are Second's and Third's (demoniac dust
for Royal Skeleton Armor, obsidian). No obsidian piece is made in the three days; points 42 / 43 / 43 in both.

## C.3 The Death Knight with the market counted (potion-free, combat 31; `the_reaper` 40 / 250)
Of 86 pieces (032b's 22 and 70 on sale), the cheapest set that admits First or Fifth: **Gold Platelegs + Gold Boots + Royal
Skeleton Ring ×2** (and the bank's Forest Whip): p 0.91, 157 s a win. Platelegs a craft, nothing short; Boots 1.0 h with 4 owlbear
hair bought (~300 gold; own chain ∞: the Owlbear only with potions); Rings 3,200 gold (10.7 h; their claws none on sale, no
source of ours). **After A Fifth's needs hold all three** (9, 7 and 9 needs), First's none.

## C.4 The potions' gap (kills behind today's needs: admitted with the bank's potions, not without)
10 of 32 (bank: 358 health splash, 100 minor, 56 health, 50 greater, 8 small): Cyclops (eyes: Greater Dreadful Staff and Amulet,
First's road; Obsidian Battleaxe, Piggy Helmet, Fifth), Death Knight (red cloth: those two, Royal Skeleton Armor, Elderwood
Staff), King Slime (slimeballs), Owlbear (Royal Skeleton Helmet and Ring, Gold Boots, Prospecting Amulet; Fifth), Imp (obsidian,
demoniac dust: Emerald Ring, Obsidian Armor and Battleaxe; Fifth), Cursed Tree (`cursed_wood_blessed_victory`), Cultist Acolyte
(`cultist_purifier`, 500), Goblin, Wolfrider, Guard (`king_of_the_goblins`; First, Fifth). Without potions nobody is admitted.

## What was done / files
- `plan/planner/gear.ts` (bought candidates, `BOUGHT_PER_SLOT`, their gold in `makeHours`, `Need`/`Piece.bought`: no demand),
  `market.ts` (B, `MARKET_MIN_TRADES`; rule 2 void for a bought piece; `bestOrder` in flight), `config.ts`, `decide.ts`, `train.ts`;
  `state/market.ts` `soldFrom`, `state/queue.ts`; `plan/queue.ts` (`QUEUE_KINDS` a `Record`: `claim`, `expand` added).
- `check-bought` (+ `fixtures/world-2026-11-27.json`, `bought-none-032b.json`), `check-queue-kinds`, `market-bought-piece`; `CLAUDE.md`.

## Notes
- No request to the game: the orders of the service's 14:05 read (`logs/market/`), the references of 032's and 032b's reads and
  the service's raw log. The cut: three weapons on sale for each fighter (bow, sword, Wooden Club 25); the club falls.
- The page on a zero-call service (scratch copy, port 5199, the GE of 12:51, the live state of 14:38): five cards, the market line,
  no page error. On that state no purchase was due at the first decisions: First's pick is already the Imp (0.83 XP/s).
- A piece gone from the market is no candidate and nothing is said (every unmade wearable would be). C.2's bank: the World at each
  night's last decision; fractions are the forward model's expected drops.
