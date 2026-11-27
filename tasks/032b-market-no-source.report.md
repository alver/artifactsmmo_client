# 032b — The slime shield: a boss is a source of its drops, the market the other one: report

## Summary
- **Committed and pushed** to `origin/rework`: `d5fe240 032b: a boss is a source` (with the task file), then this report.
  `docs/rework.md` equalled `HEAD`: no `Rework notes`.
- **The slime shield is a need for First and Fifth today** (the World of 00:00 UTC on 11-27): a candidate now — it was outside
  `candidatesOf`'s ten-level window at combat 31 (Decision 2) — and in their gear-need sets (First 2, Fifth 11: the road to 41,
  `the_reaper`, `cultist_purifier`, `king_of_the_goblins`, …). **Its king slimeballs are bought.** With potions off, nobody wins
  the King Slime alone without the bank's potions (p 0), so it is no source of ours and B.2 buys: 6 at 273 = **1,638 gold**
  (5.5 h of gold with the trip), 12 = 3,276 (10.9 h); the plan's whole shortfall, 14 (two shields, a Greater Dreadful Amulet's
  two), 3,822 gold (13 h); reference 319 (33 trades). Counting the bank's potions, all five are admitted at 1,199–1,742 s a
  win (p 0.90–0.99): 6 slimeballs are **35 h** of kills, 12 are **71 h**, so B.1 would buy too. On the live state (a zero-call
  service, Notes) Second's next decision was `buy:king_slimeball` ×6 at 273 "— no source of ours; for Slime Shield for Fifth".
- **C.2, the Death Knight**: today p 0 on the potion-free pool (play's gate said 0% / 22%). **Gold Platelegs + Obsidian Armor +
  Topaz Amulet admit both fighters at 31** (First p 0.93, 145 s a win; Fifth 0.97, 124 s), and at 33 (0.94 / 0.91) and 35
  (0.91 / 0.98). Today the plan holds the platelegs (a need of 9 sets, nothing short: a craft) and the armour (3 sets, 323 h of
  chain) as needs; the Topaz Amulet is no candidate (PER_SLOT: three amulets above it).
- **The gate**: `npm run typecheck` passes; `npm run check` **122 checks: 122 ok, 0 known defects reproduced, 0 failed — 176.5 s**
  (121 + `check-boss`); the build into `D:\Temp\ammo-032b\dist` passes (398.09 kB). `decide` on the 11-27 World, five characters
  cold: **7.39 → 7.42 s**; with the 12:51 market **7.19 → 7.59 s**. D.2: 3 days of road (029's driver), **437 of 437 decisions
  identical** (points 42 / 43 / 43); the slime shield is never worn there: the forward model has no market and nobody wins the
  King Slime without potions. `npm run check -- planner` was not run.

## Decisions for Alex
1. **Potions decide the King Slime.** A boss is judged as its kill step would fight it — potions off: no bank potions (worn
   stacks stay). Today only potions carry that fight, so the slimeballs come from the market. The same gap stands, older, for
   every monster: a bill admits with the bank's potions where the step (`fightTake`) cannot — left as it was.
2. **The window** (a pool change, not the solve): below ten levels a piece is a candidate only where its slot has none inside
   and it beats the worn one (empty slot: none). Without it no level-20 piece reaches a fighter at 31.
3. **Two orders reads, not one**: the history script re-read the orders first (22 pages instead of 11); the second was
   discarded. Five history reads; 032's twelve of 12:13 reused.

## How Alex verifies
- `npm run check -- boss` (4 cases; on `163d6c3` cases 1–3 fail), `-- onepage` (`whys-032b.json`), `-- seconds`, `-- market`.
- After the restart: a worker's step "worker, the market: … King Slimeball ×n at … — no source of ours; for Slime Shield …"; a
  `spend` record `market` for king slimeballs; Third's `gear:slime_shield` craft once 6 are banked; then a fighter's set with it.

## C. The neighbours' kit (First / Fifth at 31; "need N": the gear-need sets holding it; Vampire's s a win 100 / 97 today)
| piece | First / Fifth | Vampire s a win | short, h | ask (ref) |
|---|---|---|---|---|
| gold_sword 30 | no: demon horn, an event nobody can join | 60 / 62 | demon horn ×2: ∞ | — |
| elderwood_staff 30 | cand / need 3 | 55 / 57 | cyclops eye ×4, red cloth: 27 | 1,494 (1,700) |
| perfect_bow 30 | no: demon horn | 55 / 57 | demon horn ×2: ∞ | 1,750 (1,750) |
| obsidian_battleaxe 30 | need 1 / need 1 | 56 / 57 | obsidian ×6, cyclops eye ×2: 396 | — |
| slime_shield 20 | need 2 / need 11 | 97 / 94 | king slimeball ×6 (market), cloth, wool: 5.6 | slimeball 273 (319) |
| steel_armor 20 | no: the window (a piece inside) | 91 / 94 | cloth, wool: 0.1 | — |
| steel_legs_armor 20 | no: the window | 100 / 97 | slimeball ×3, cloth, wool: 2.9 | — |
| steel_boots 20 | no: the window | 100 / 97 | none | — |
| gold_helm 30 | no: demon horn | 88 / 90 | demon horn ×2: ∞ | — |
| gold_platelegs 30 | need 1 / need 8 | 95 / 97 | none | — |
| gold_boots 30 | cand / need 6 | 98 / 94 | owlbear hair ×4: 32 | hair 74 (96) |
| obsidian_armor 30 | need 1 / need 2 | 93 / 88 | obsidian ×5, demoniac dust ×2: 323 | — |
| obsidian_helmet 30 | cand / need 1 | 86 / 88 | obsidian ×5, owlbear hair ×3: 339 | — |
| obsidian_legs_armor 30 | cand / cand | 99 / 95 | obsidian ×5, owlbear claw ×3: 350 | — |
| royal_skeleton_armor 30 | cand / need 3 | 93 / 95 | red cloth, demoniac dust: 7.9 | 2,049 (2,050) |
| royal_skeleton_pants 30 | no: PER_SLOT | 100 / 97 | owlbear hair ×3: 24 | — |
| royal_skeleton_helmet 30 | need 2 / need 4 | 100 / 97 | owlbear claw ×4: 32 | — |
| lizard_boots 30 | need 2 / need 5 | 89 / 92 | none | — |
| topaz_amulet 25 | no: PER_SLOT | 93 / 90 | topaz ×1: 0 | topaz 2,496 (2,499, 1 trade) |
| dreadful_amulet 20 | no: the window | 93 / 96 | slimeball ×2 (market): 1.8 | 3,492 (3,498) |
| gold_ring 30 | cand / need 1 | 100 / 97 | wolf bone ×2, skeleton bone ×3: 0.4 | 1,198 (1,200) |
| royal_skeleton_ring 30 | cand / need 9 | 90 / 90 | owlbear claw ×3: 24 | 1,600 (1,800) |
1. **The King Slime**: in the Summary. B.1 or B.2 by the potions: with them the kills (35 h for 6) lose to the gold (5.5 h); without them there is no source and B.2 buys.
2. **The Death Knight**: in the Summary; the three pieces on the potion-free pool, cheapest first by the plan's own hours.
3. **The other bosses**: the Lich, the Goblin Priestess, Rosenblood, the Duskworm and the Sandwhisper Empress admit nobody of
   ours alone today (with the bank's potions or without), nor First up to combat 50 with all 22 pieces; the atlas's best sets of
   every tier never admit them alone (the King Slime: from 25–30).

## What was done / files
- `targets.ts` (a boss as a source: `killGates(…, solo)`), `pick.ts` (bosses in `pickSource`), `consumables.ts` (`bossWorld`),
  `supply.ts` (`fleetSec` on it; `billOf`'s market price with no source of ours), `market.ts` (`marketQuote`, `purseOf`,
  `ownHours` without the market, the "no source of ours" why), `decide.ts` (the refused rule 2 named; the fighter's market
  answer), `gear.ts` (the window). Checks: `check-boss` + `fixtures/boss-none-032.json`; `whys-032b.json` re-recorded (59 whys
  moved, all on Worlds where the King Slime is admitted alone); `check-onepage` A.3 and `check-seconds` B(b) given their premise
  (an ogre-eye-less bank; the full moon's demand by an objective); `check-market` case 5 on the Obsidian Battleaxe. `CLAUDE.md`.

## Notes
- The page: no change. The live state was driven by the verify skill's mock (scratch copy, port 5199, the GE of 12:51, no
  game call); the reads: 22 orders pages, 5 histories, public, no token.
- `check-seconds` B(b) reads "0 of 0 held back" on `163d6c3` too: its potion is absent from that bank (vacuous, older).
