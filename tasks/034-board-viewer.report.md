# Report 034 — the board, seen

## Summary
- **Double-click `logs/board/view/index.html`** (Chrome, `file://`, works with no network). Four views: Everyone (the scatter with trails, the sortable table, points and top combat over time), An account (a row a character: combat level and XP, the activity ribbon, the skills' bursts, the set by slot; then achievements and counters a day a column), A level (what is fought and worn at a level or band, all and the fastest quarter), Two accounts (by the top fighter's level, or by day). `alverus` is orange everywhere. The view and its filter are in the URL's `#…`.
- **`npm run board:view`** = `derive.mjs`, then `view/build.mjs`, run on 41 reads: 024's two (11-22 19:23, 11-23 12:22) and 39 whole board reads up to 11-27 16:00. From empty: **2.5 s** (41 reads opened; derive 1.9 s). Again: **1.0 s** (0 opened; derive 0.4 s).
- **Size:** **26 KB a read** after the first (the raw read is 490 KB gzipped). 12 reads a day give **about 19 MB of page data after 60 days**. A synthetic 720-read set (63 days) was 19.2 MB: the page loaded in 1.2 s and each view drew in at most 0.45 s. That is under 40 MB, so there is no weekly split. `summary.json` is 288 KB now; a full day adds about 65 KB, so after about 15 days it keeps the newest days that fit in 1 MB (its `from` says where it starts).
- **The watch rebuilds the page:** one line in `run.vbs` starts derive and build after the read and does not wait for them, so it can change neither the read nor the exit code. I tested that line with a stand-in script (no read made): it returned its own exit code after 176 ms, and the page was rebuilt. The scheduled read at 18:00 UTC will be its first real run; I did not watch it.
- 024's reads are a plain mapping (the API's own bodies, the same parse). 022's read of 11-22 holds only the completed achievements, so it has no counters; counter moves start at 11-23. `.gitignore` ignores `logs/`, so nothing under `logs/board/derived/` or `logs/board/view/` is tracked.

## C.1 The plan (sections 1–5) against all 41 reads
Fights and sets are intervals of 6 h or less with combat XP, counted by the character's level at the interval's start: 3,301 intervals (S2 had 1,242). "Fastest quarter" is at or above the upper hinge of XP an hour.

| § | The plan | All reads | |
|---|---|---|---|
| 1–3 | Every level and point it quotes from S1 (ladder 32nd of 471, 42 pts; 98/91/78/78/74; nobody at 105; ours 31 31 28 27 25; the nine at 39–47 pts; the even and fighter-worker fleets; sqidking, Zetark, uaprsf, Fox___, Wudagem) | S1 is the last read: all equal | holds |
| 1 | XP since 11-22/23: First +113k, Fifth +119k, Second +33k, Third +36k, Fourth +17k | from 11-23 12:22: +113.6k, +120.0k, +33.1k, +36.3k, +17.9k | holds |
| 1 | Zetark/Ashmere +222k (26→36), Zetark/Zetark +139k; br_lemes +147–157k; ront_tv +107–156k | +222.3k, +139.3k; +147.3–157.2k; +106.9–156.1k | holds |
| 2 | XP a stage: 93,800 · 155,500 · 203,500 · 253,000 (705,800) | the same (the curve every read's `max_xp` agrees with) | holds |
| 2 | Ours 27k a day "over those days" | First 27.4k, Fifth 28.9k a day from 11-23 | holds |
| 2 | Ours 14k on 11-26, about 1k on 11-27 | 11-26: First 25.9k, Fifth 25.4k; 11-27 to 16:00: 2.4k, 4.3k (11-25: 58.3k, 62.4k) | **differs**: 26k on 11-26 |
| 2 | About 30k a day a character (br_lemes 30–32k, ront_tv 22–32k); the best in our band about 45k (Zetark/Ashmere) | 11-24 → 11-27: br_lemes 25.7–31.9k, ront_tv 21.1–37.3k; Ashmere 54.6k (67.5k on 11-25) | holds; Ashmere higher |
| 2 | 30k "is the board's number" | characters at combat ≥ 30 read a whole day: median 16.0k (11-25, 154 characters), 14.4k (11-26, 162); the fastest quarter from 26.6k / 28.0k | **differs**: 30k is the fastest quarter's pace |
| 3 | In the fighters-and-workers family the usual count is three fighters | 23 accounts with a character 12+ levels under the top: three within 8 levels of the top in 9, one in 7, four in 4, two in 3 | holds |
| 4.1 | Imp ×12/53 at 31, ×20/74 at 32, ×11/26 at 33; best 5,929–6,517 | ×19/141 (2nd after the vampire), ×28/198, ×30/133 (1st); best 8,329, 7,719, 6,433 | holds; best higher |
| 4.1 | Owlbear at 34–35 best 6,818–6,975; death knight 3,420–4,338 | owlbear 6,818, 6,975 (×6/131, ×14/138; the imp leads with ×35 at each); death knight best 6,328 at 34, 4,338 at 35 | holds; **death knight differs** at 34 |
| 4.1 | Fastest quarter 28–32: gold_sword 19, perfect_bow 8, elderwood_staff 5 of 64; slime_shield 56; steel_armor 20, royal_skeleton_armor 16; 122 of 128 utility slots empty | 31, 11, 10 of 161; slime 112 (iron_shield 33 next); 40, 23; 305 of 322 | holds |
| 4.1 | Legs: royal_skeleton_pants 30 (×14) or gold_platelegs 30 | 28–32: steel_legs_armor 20 ×39, gold_platelegs ×20, royal_skeleton_pants ×19 of 161; 33–37: royal_skeleton_pants ×43 of 155 leads | **differs** at 28–32 |
| 4.1 | Healing rune 10 of 10 | 113 of 161 (28–32), 128 of 155 (33–37) | **differs**: most, not all |
| 4.1 | Top fighter 36–40: crafts 31/31/30 (10 accounts); ours 28/30/26 | 13 accounts: 31/31/30; ours 28/30/26 | holds |
| 4.1 | ecologist 971/1,000; expert_lumberjack 3,723/6,000; the_reaper's 250 death knights | 971; 3,723; 40 of 250; done by 38, 37 and 40 of the 50 accounts | holds |
| 4.2 | Imp ×24/40 at 37, ×65/130 at 38 (best 6,021–8,108); owlbear ×21/107 at 39 (8,425); cultist acolyte at 39–40 best 4,934–5,766 | ×44/104, ×92/210 (6,834, 8,108); owlbear ×83/291, 1st now (8,425); 4,934, 6,112 | holds |
| 4.2 | The demon event is the most attended fight at 34–40 (×19, ×16, ×28, ×17) | ×20/131, ×18/138, ×38/291, ×35/260: 2nd, 2nd, 3rd, 2nd (imp, imp, owlbear, owlbear lead) | **differs** |
| 4.2 | Weapons 38–42: death_knight_sword 19, perfect_bow 19, greater_dreadful_staff 13; obsidian_battleaxe 11 at 33–37 | 39, 35, 23 of 256 (gold_sword 26 is third); 16 of 155 | holds |
| 4.2 | Set 38–42: royal_skeleton_ring 128/216; conjurer_skirt 48; slime_shield 44 or gold_shield 37; greater_dreadful_amulet 29 | 272/512; 108; gold_shield 102, slime_shield 89; 62 of 256 | holds; shields swapped |
| 4.2 | Gathering, top fighter 36–40: mining 40, woodcutting 38, fishing 38, cooking 42, alchemy 42; ours 37 35 27 39 37 | 38, 37, 38, 42, 41 (13 accounts); ours the same | holds |
| 4.3 | Cultist acolyte at 42–43 ×11/64, ×9/34, best 7,240–7,389; goblin guard at 41 median 3,354; wolfrider 6,606–7,735, bat 9,032 | ×29/126, ×21/116 (1st), 7,389, 7,240; 3,354; wolfrider 7,735 at 44, 10,193 at 45; bat 9,032 | holds; wolfrider higher |
| 4.3 | 19 fast crafters, median 7,032 XP an hour; ours 1,071–1,745 | 47 gained ≥ 30,000 in 24 h: median 5,020 an hour while training; ours 1,909–2,112 | **differs** |
| 4.3–4 | Crafts at top 41–45: 32/36/35, at 46–50: 38/41/39; gathering at 46–50: 46 49 48 50 50; bat 8,713–9,532 at 46; cultist alchemist 5,260–13,869 at 46–49 | the same (crafts and gathering to the unit, woodcutting 49.5); bat on 3 intervals, alchemist on 14 | holds |
| 4.5 | uaprsf five at 50, six skills at 50, 98 pts; our favors 108, tasks 409, recycles 971 | the same | holds |

## C.2 What the data shows that the plan does not say
1. **ShadyBliss levels fastest now**: #24, 48 pts, an even fleet at 38 37 35 33 33, up 2–4 levels each in 24 h, 364k combat XP a day. *Everyone (b), sort "combat XP a day, 24 h"; Two accounts: alverus and ShadyBliss.*
2. **Our fighters never stood at the imp in these reads.** In the intervals with combat XP, First (29) and Fifth (27) stood at the vampire (10, 11), spider, rat, highwayman and others. *An account: alverus, the "where" ribbons; A level: 31, the orange-ringed dots.*
3. **Tasks:** the median account turns in 11.6 tasks a day (the fastest quarter 23.6). Ours is 1.4 (403 → 409 since 11-23). *Everyone (b), sort "tasks a day".*
4. **Points:** since 11-24 we gain 1.5 a day, which is the median of the 50 accounts. *Everyone (a), the trails; (c), points.*
5. **The fastest quarter at 28–32 wears level 15–20 armour most.** Helmet ≤ 20 in 95 of 161 intervals (wolf_ears 15 ×38), legs in 73, boots in 145 (old_boots ×58). The commonest amulet is wisdom_amulet 15 (×47). *A level: 28 to 32, the fastest-quarter bars.*
6. **Monsters the plan does not name:** at 48–50 the most fought is rosenblood (×16 of 48, best 15,464 XP an hour). At 41–47 the cursed tree is third (×63 of 661, best 8,234). *A level: 48 to 50; 41 to 47.*
7. **The reads see only part of the fighting:** 22% of the intervals with combat XP show no monster at either read, so every "×n of N" counts only what the reads saw. *A level, any band: the "?" row.*

## How Alex verifies
```
npm run board:view            # prints the reads opened and kept, and the seconds; a second run opens none
node scripts/board/verify.mjs # every derived read against its raw read, field by field: 9,965 character-reads, 0 mismatches
start logs\board\view\index.html
```
- **Three numbers against the raw read of 11-27 16:00**, read from the page in headless Chrome: (1) the table's alverus #32 with 42 points = `leaderboard-1.json.gz`; (2) Zetark/Ashmere "combat 36" with perfect_bow = `acc-Zetark-characters.json.gz` (level 36, `weapon_slot`); (3) First's last ribbon cell, King Slime at Forest (3, −1) with its bag, task skeleton 85/224 and HP 995/995 = `acc-alverus-characters.json.gz` with `maps.json`.
- **The headless run:** Chrome 158 with the network cut (a dead proxy, no DNS, DevTools offline mode), every view in light and dark mode: 0 console errors, 0 exceptions, no request but the three local files. The DOM matched the data (52 table rows, 5 character blocks, 141 dots at level 31), and the row, bar (92 intervals), dot and sort clicks did what they should.

## Files
Written: `scripts/board/derive.mjs`, `verify.mjs`, `view/index.html`, `view/app.js`, `view/build.mjs`; in `scripts/board/`, two lines in `run.vbs` and a section in `README.md`; `package.json` (`board:view`); this report. Generated (untracked): `logs/board/derived/{reads/*.json, data.js, summary.json}` and `logs/board/view/{index.html, app.js, data.js}`. No git command, nothing under `src/`, no request; scratch in `D:\Temp`.

## Notes
- The level view, the summary's hours and the comparison use whole.mjs's rule for the monster fought (its counter rule decides 11 intervals). The level view leaves out intervals over 6 h (024's two reads, missed reads); the account view still draws them, as wide cells.
- The table also shows cooking beside the four gathering skills.
- A character is taken to be in every read of its account after its first; a deleted character would stay on the page. None was seen. (A `shortcut:` comment marks this in `app.js`.)
- Not done: the scheduled rebuild has not been observed yet. Hover tooltips were checked by their text in the DOM, not by moving a real mouse.
