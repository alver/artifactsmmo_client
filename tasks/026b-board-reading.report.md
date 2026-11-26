# Report 026b — the board's days, read whole

## Summary
Every full read of the board watch from 11-24 09:17 to 11-25 16:00 UTC: 15 reads, 30.7 h, 50 accounts, 696 account-intervals
(the 09:21 read of 11-24 dropped as a duplicate four minutes after 09:17; 11-24 14:00 is partial). The tables in full are
`docs/strategy/board/whole-1.md`, made by `docs/strategy/board/tools/whole.mjs`. **The ten things this fleet should copy, the most
valuable first:**
1. **Craft from the bank in batches, with the others bringing the materials.** The 19 crafters (17 accounts) that gained 30,000+
   XP in 24 h or less made a median **7,032 XP an hour** while the craft moved (up to 77,288). Second made **1,745** and Third
   **1,071**, each one hunting its own drops (A.2).
2. **Keep a gold miner and gold bars in the bank.** 14 of the 19 windows had a character at gold_rocks or smelting gold. Zetark
   gained gold ore +2,156 and gold bars +47 in 30 h. Every level-30 recipe on the board takes 7–8 gold bars (A, F).
3. **Wield a level-30 weapon at 30.** The best quarter of combat 28–32 wears gold_sword (19 of 64 intervals), perfect_bow and
   elderwood_staff. First and Fifth wear a battlestaff 20. The one weapon without an event drop is greater_dreadful_staff (wc 30:
   cyclops, vampire, ogre, death knight). The 38–42 best quarter wore it 13 times (C).
4. **Train the level-30 tier from craft 30, and a cheap recipe 6–10 levels under the craft before that.** The board trains on
   gold_mask, royal_skeleton armour and pants, gold and emerald rings, gold_boots. Below 30: Elaus_'s air_ring (15) at 25–28 and
   Everywon1's water_ring (15) at 21–25 made 12,590 and 19,172 XP an hour (A.2).
5. **Fighters bank the drops of what they pass, even for no XP.** Turbofish's Orchid (46) farmed at the vampire (24). So did
   krolov's Tarina, automode's cruise, Trobyss, and brinko's Capablanca (A.1).
6. **Work the task you hold.** This fleet finished **0 tasks in 30.7 h**. The median account finished 8.6 a day, the best quarter
   23.4, and rs_appez 43 in 30 h. First holds a chicken task at 0/248 and Fifth a flying snake task at 0/367, while both fight
   vampires (E).
7. **Eat.** The median account's bags lost 297 cooked food a day; this fleet's lost 73. rs_eve made 3,750–5,929 XP an hour at the
   imp at 33–34 with cooked bass in the bag, 95 s a kill (B.3, E, F).
8. **Fight the imp from 30 and the owlbear from 34.** The imp's best is 6,237–6,517 XP an hour at 30–32, and it is the monster
   most fought at 32–33 and 37–38. The owlbear gives 6,818–8,425 at 34–35 and 39. Until 30 the vampire is right: at 27 First's and Fifth's
   vampire intervals are the best of the level (B.2).
9. **Make armour of 25–30 that needs no event drop:** royal_skeleton helmet, armor and pants, flying_boots (gc 30), gold, emerald
   and royal skeleton rings (jc 30), topaz amulet (jc 25). First wears adventurer_vest 10, iron_shield 10 and wisdom_amulet 15 (C).
10. **Take the cheap points next.** After 39 the commonest achievements are expert_lumberjack (2,277 dead wood left here) and
    cabinet_maker (295 dead wood planks). The combat ones (cultist_purifier, lich_please, life_lover) need combat 33–40 (D).

## For task 029 (A.4)
1. **How they level a craft:** in batches from the bank. The median is 7,032 XP an hour while the craft moves, over a median 8.7 h
   of crafting in the best 24 h. The others bring the materials: a gold miner or smelter in 14 of 19 windows, and fighters at the
   drop monsters, often for no XP.
2. **Supported:** A.1 (a craft level is the fleet's work), A.4 (the crafter crafts what the bank holds) and A.5 (a batch from the
   bank costs only the crafting). The bursts were 30,000–150,000 XP in two hours.
3. **Supported only in part:** A.3. The board's fighters farm drops at monsters that give them no XP (Orchid 46 at the vampire,
   24), not within 25% of their pick's rate. A 25% rule brings fewer drops than they bring. The board cannot say how much XP the
   farming cost them.
4. **Contradicted as the board's pattern, not as this fleet's choice:** "the workers are the crafters". 14 of the 19 fast crafters
   stood within 5 levels of their account's top combat, because the board's fleets are mostly even. What holds either way: no
   crafter hunts inside its training.
5. **Not shown:** A.2's one recipe. Crafters switch between recipes of the same level from read to read (_zero_'s Zero: gold_mask
   ↔ royal_skeleton_armor; aropan's Arkforge: gold_pickaxe, gold_sword, elderwood_staff), so they craft what the stock feeds. Also
   not shown: A.6's target, and how long a batch's materials took to gather (banks are not public).

## A to F: the lines to act on
- **A, crafts.** Make gold bars a standing stock: Fourth mines, and the level-30 tier takes 8 bars a run. Feed every craft batch from
  the bank. From 23 to 30 is 102,400 XP: 59 h at Second's pace, 15 h at the board's median. Until 30, use a recipe 6–10 levels under
  the craft. **What the data cannot show:** banks, which gear was crafted (crafting counters exist for bars, planks, food, potions
  and four single pieces only), or crafts as opposed to recycles.
- **B, fights.** The vampire up to 29, then the imp (31–33: 95 s and 100 XP a kill with a level-25 wand and food). The owlbear at
  34–39, cultist_acolyte at 42–43, goblin_wolfrider and bat at 44–46. From 29 the best quarter wears weapons of level 25–40 (one steel cleaver 20 at 39).
  **What the data cannot show:** what was fought between reads (237 of 1,020 stints show no monster), wins and losses, potions
  drunk. Most kill counters stop early, so only 9 kills can be timed.
- **C, gear.** Per slot at 28–32: a level-30 weapon, slime_shield 20, piggy_helmet 25 or gold_helm 30, steel_armor 20 or
  royal_skeleton_armor 30, royal_skeleton_pants 30, old_boots or steel_boots 20, two rings of the adept, a dreadful or topaz amulet,
  the healing rune, the same three artifacts as this fleet, and no potions (122 of 128 utility slots empty). The gold armour (helm, mask,
  shield, platelegs, boots) and the board's other level-30 weapons need demon horns or bandit-lizard skin, which come from events. **What the data cannot show:**
  banks, or how a piece was obtained.
- **D, achievements.** The 31 accounts above 39 took gathering and crafting milestones first (expert_miner in 17 accounts,
  expert_lumberjack in 13, worker, cabinet_maker, the fishing ones), then cultist_purifier (11), diamonds, the lich and life_lover.
  From 60 to 80: king_of_the_goblins, clean_the_lab, grand_master. **What the data cannot show:** why an account chose its order.
- **E, rates a day** (median / best quarter / this fleet): favors 7.8 / 10.9 / 7.8; tasks 8.6 / 23.4 / 0; event kills 0 / 15.2 /
  9.4; food leaving bags 297 / 584 / 73; idle reads 0% / 0% / 0%. **What the data cannot show:** eaten against banked, and anything
  after a counter reaches its total.
- **F, the twins** (top combat 28–36 at the first read): Zetark +9 combat levels, rs_appez +7, ArmaRGool +7, against this fleet's
  **+10**. Zetark is the one to copy: its crafters fight at their craft's level (Ashmere cb 32/wc 30, Sunbloom cb 30/gc 30), a miner
  supplies gold, and it wore a level-30 weapon and armour at 30. rs_appez shows food and tasks: two fishers, cooked bass in every
  fighter's bag, 43 tasks.

## How Alex verifies
```
sha256sum docs/strategy/board/whole-1.md                        # 7f454de9500a31ea1a52719446bdd238e38b2b40b9af785e0d7058978193e58d
node docs/strategy/board/tools/whole.mjs                         # rewrites it from logs/board/ (about 1–15 s, offline)
sha256sum docs/strategy/board/whole-1.md                        # the same hash: the same bytes
node docs/strategy/board/tools/whole.mjs --out - | less          # or print it without writing
node docs/strategy/board/tools/whole.mjs --to 2026-11-26/1600Z --out D:/Temp/whole-2.md   # a later span, a separate file
```
Each part's prose ("the lines this fleet can act on", "what the data cannot show", F's ten lines) comes from
`docs/strategy/board/tools/whole-1.lines.md`, which the tool splices in after the part's tables. Edit that file and rerun to change
the prose. Every number in it was checked against the tables it follows.

## Notes
- **Files written:** `docs/strategy/board/tools/whole.mjs`, `docs/strategy/board/tools/whole-1.lines.md`,
  `docs/strategy/board/whole-1.md` (533 KB: B.1 lists all 1,020 stints, F has four pages), and this report. No git command that
  writes, nothing run from `src/` or `scripts/`, no request. Scratch went to `D:\Temp`.
- **Why the helpers are copied:** `read.mjs` and `day.mjs` run on import and export nothing, so `whole.mjs` repeats their few
  helpers (`cum`, `load`) and imports 024's `lib.mjs` as they do. The XP curve is the atlas's, and the reads' `max_xp` agrees with
  it for every level 1–49.
- **The window:** `--to` defaults to `2026-11-25/1600Z`, the newest read when this task started, so the file reproduces. A read under
  90 minutes after the one before it counts as a duplicate.
- **Recipes come from the bags.** The XP per recycle is shown but not used. Our journal of 11-25 shows Second's train loop banking
  battlestaffs instead of recycling them, so recycles are not a count of runs. "For no XP" means the monster is more than 10 levels
  under the character at that read; "stands at" means the character was on the tile but gained no combat XP.
- **Counters are per account.** A kill or gathering counter is given to a character only through its tile and skill XP. A counter
  that reached its total in an interval is marked ⊤.
- **F's twin rule** (the most combat levels gained among accounts at 28–36) picks rs_appez and ArmaRGool behind Zetark. Neither is
  a fleet like this one; their lines say so. This fleet's own page closes F for comparison.
