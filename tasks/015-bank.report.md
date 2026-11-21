# 015 — The bank: a full bank is answered, outdated gear is recycled, a slot is bought; two food repairs — report

## Summary
- **Built.**
  - **A full bank is answered.** Every deposit goes through `loopkit.ts deposit()`: a code with no slot stays in the bag and the rest goes in. A bag with nothing bankable ends its item instead of pausing. The planner hears of it, and a step that ended empty for it is not blocked.
  - **Outdated gear is recycled.** `src/plan/planner/bank.ts`: tidy steps go first while fewer than 15 slots are free, one character at a time.
  - **An expansion is bought** below 10 free when nothing is left to tidy, under `expansionCap` 60,000 and the gold floor: the new `bank` interrupt and `expand` item.
  - **The merchant sells nothing a recipe uses**, and the sell floors no longer come off what a step plans with.
  - **Planned food** is at most a third of the bag, and it is the food the fight's loss covers.
  - **The checks.** 8 scenarios, 13 made-up cases, invariant 21, rows A/B/C/E by default and a 2,700 s backstop.
- **Since 13:00 UTC on 11-20.** 013's code mined, woodcut and brewed: 91–98% gathering for four of them. One restart, 23:32:54.550 `[tdhi]`, loaded report 014's code; there was none since and none during this work.
  - **014 holds so far.** First's kill step withdrew exactly its 12 planned trout (00:49:30); the potions of both kill steps since the restart are past the log's 160-character cut. Nothing was brewed or cooked inside a fight item, nothing ran dry, and "protected working stock" never showed.
  - **A 462 has happened once in the whole log** (11-13).
- **The bank today**: 102 of 110. **22 gear codes are outdated** (160 copies). Today the tidy recycles 10 codes in 4 steps, 653 s, and stops at 15 free: 7 slots net, since three new codes come back (ash and spruce planks, red slimeballs).
- **Deadline points**: A **86** / B **90** / C **78** / E **68**, against report 014's 87 / 94 / 77 / 68. Row D (89) and F (91) ran once beside them. Row C's +1 is the sell floor's end: with the old floor it is 77 again.
- **The price doubles** (7,000 and 14,000 in the log, 28,000 now). The cap of 60,000 buys two more expansions (150 slots). Row A's bank peaks at 179 codes with the tidy, which takes four expansions (420,000 gold); the cap bites at the third, about day 25 of the season.
- **The food repairs** cost row A one point at the deadline. Four fighters reach combat 40 one to five days earlier; the cook First reaches it on day 71.8 instead of 40.0. The bag capped 301 kill steps.

## Decisions for Alex
1. **Gear with a rare ingredient is not recycled.** I kept the client's standing rule for every automatic recycle (`src/plan/xp.ts autoRecyclable`, CLAUDE.md: "automation never recycles a rare-ingredient product"; a recycle gives back random units, so a jasper or astralyte crystal is mostly lost) as one more clause of settled point 3.
   - Today it decides one code alone: the **wooden staff ×2** (its wooden stick has no source). It also keeps the **spruce fishing rod ×5** (a jasper crystal in the recipe), but the rods are the fishers' tool, so a solve would keep them anyway.
   - Later it will keep every jasper- and astralyte-tier piece (iron tools, mushmush and hard-leather pieces) when they fall ten levels behind.
   - **Keep the rule (default), or recycle those too?** It is what is destroyed for good.
2. **The cap of 60,000 buys two expansions (28,000 and 56,000), and the season needs four.** The ladder doubles. Row A's bank, with the tidy, peaks at 179 codes; the third expansion (112,000) is above the cap from about day 25. From then on the rule "no slot, nothing to tidy, no purchase" holds the steps that bring a new code until the cap moves or 017 decides what non-gear stock goes.
   - The cap is a patch away: `setPlannerConfig({ expansionCap: … })`.
   - The four take 420,000 gold in all; the bank holds 231,984 today.
   - Nothing to decide today; the question comes back around mid-December.

## How Alex verifies
1. **The branch and the commits.**
   - `git branch --show-current` → `rework`.
   - `git log --oneline -2` → `015: bank` on top of `Rework notes` (`1b80879`).
   - `git status` clean.
   - `git log origin/rework --oneline -1` → the same commit. The first push (`git push -u origin rework`) worked.
   - `git log main --oneline -1` → `edaaf23`.
2. `npm run check` → `74 checks: 73 ok, 1 known defect reproduced, 0 failed`, about 2 minutes. That is report 014's 66 plus the 8 new scenarios: `bank-expand`, `bank-full-deposit`, `bank-full-stuck`, `bank-not-owned`, `bank-tidy`, `consumables-food-bag`, `consumables-food-fits`, `merchant-keeps-sap`.
3. `npm run check -- planner` → `OK (582401 invariant checks, 83 made-up cases; deadline points 86 / 90 / 78 / 68)` for rows A / B / C / E, in **1,535.7 s** of the 2,700 s backstop (row A, the long pole, 1,504 s). It prints the tables of sections 2–6: `## Task 015: the bank`, `## The bank today` and the rows' new lines.
   - Rows D and F: `AMMO_PLANNER_ROWS=all npm run check -- planner` (not run that way by me; I ran the two rows as their own processes: D 89, F 91, every invariant held).
   - Row C's case is now 78: section 6 says why.
4. `npm run typecheck` prints nothing after `tsc --noEmit`. The scratch build succeeded (`npx vite build --outDir <scratch>/ammo-015-dist --emptyOutDir`: `index-CPeo-m8m.js 446.15 kB │ gzip: 151.17 kB`, built in 1.67 s; deleted).
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → `CLAUDE.md`, `docs/game-actions.md`, `tasks/015-bank.md`, `tasks/015-bank.report.md`, and:
   - scripts: `scripts/check.mts`, `scripts/check-planner.mts`, `scripts/check-events.mts`, `scripts/harness/fake.mts`, `scripts/fixtures/bank-2026-11-20.json`, the eight new `scripts/scenarios/*.mts`;
   - `src/plan/events.ts`, `src/plan/queue.ts`;
   - `src/plan/planner/{bank (new),compile,config,consumables,decide,events,reach,stock,types}.ts`;
   - `src/state/{exec,loopkit,planner,queue}.ts`.

   On the edges:
   - `scripts/check-events.mts` is not on the task's list. It asserted the sap and shell sales the rule ends (section 4).
   - `src/plan/planner/events.ts` and `reach.ts` carry only the food's new reading (settled point 7).
   - `src/state/store.ts` is untouched: the read after a purchase is in the `expand` item.
7. **After the restart — not checked by me** (the restart is Alex's):
   - **The boot line.** One `plan: bank — 102 of 110 slots used (8 free), the next expansion 28,000 gold, bank gold …; tidy below 15 free, buy below 10 (cap 60,000); outdated: Copper Axe ×9, Copper Boots ×5, …` line. The numbers are the bank's at the restart: the log showed 105 codes by 23:59 UTC, from potions made and worn sets banked by resets.
   - **Tidy steps until 15 are free.** Each crafter's first decision is a tidy step while fewer than 15 are free, one character at a time: `plan Third: tidy:copper_boots@Third#1 (tidy, 25 units, …) — tidy: Copper Boots ×5 and Copper Helmet ×11 and Copper Armor ×9 recycled: frees 3 bank slots (8 → 11 free of 110), …`. Second's codes are tools and weapons, Fourth's the copper and iron rings and the amulets. In the log: `recycling` actions, then a `deposit-all` of the bars. When 15 or more are free, the next decision is ordinary.
   - **No expansion while something can be tidied**: no `bank/buy_expansion` while outdated codes are left (`bankCheck` returns before the purchase).
   - **No sap sale.** No `npc/sell` of sap or shell at a merchant: a Timber Merchant spawn gives "nothing to trade".
   - **Food within a third of the bag.** A kill step's planned food is at most a third of its character's bag (48 at 144), and the reset's `bank/withdraw/item` of food is never above it. A step capped by it says "the bag caps it at N kills". A fight that loses less than the best food in the bank plans a smaller food that it covers, or rests if none.
   - **No "inventory full of protected working stock".**

## The hours, and 014 in play
**How it was read.** `logs/dev.log` was read as a stream by scratch readers: a background agent wrote them, and I re-ran them to the log's end before writing this and re-read the lines quoted. **Window: 2026-11-20 13:00:14.862 to 2026-11-21 00:57:55.621 UTC.** Before 23:32:54 the code is report 013's (`c8266ac`), after it report 014's (`edaaf23`).

**One limit throughout.** An `api` line's body is cut at 160 characters (`src/api/client.ts:15-19`), so a reset's multi-item withdraw or equip hides its last codes, usually the potions.

**One restart.**
- `[wj59]` wrote its last line at 23:32:31.965; `[tdhi] server start (prod)` came at 23:32:54.550.
- At 23:32:55.513 `[tdhi]` re-attached `lvl:mining:35@First#11`, `ach:intermediate_lumberjack:0@Second#12`, `lvl:alchemy:30@Third#1`, `lvl:mining:35@Fourth#7` and `lvl:mining:35@Fifth#1`.
- Third's first action met the old cooldown (499, 23:32:55.793).
- No restart since. The log's last line, 00:57:55, is still `[tdhi]`, so the service runs report 014's code and none of this task's.

### Steps per character
Units planned/done, hours planned/taken. Brackets: started before 13:00. `*`: one action repeated across the restart.

| who | steps |
|---|---|
| First | (12:10:17 `lvl:mining:35#4` 157/157, 1.5/1.51) · 13:40:46 `#5` 157/157, 1.54 · 15:13:18 `#6` 154/154, 1.49 · 16:42:56 `#7` 160/160, 1.56 · 18:16:19 `#8` 163/163, 1.49 · 19:45:47 `#9` 172/172, 1.58 · 21:20:49 `#10` 173/173, 1.58 · 22:55:34 `#11` 175/176\*, 1.86 (the 00:05 offering inside it) · **014's code**: 00:47:11 `ach:the_reaper:1@First#1` (objective) 11 planned, 7 won by 00:57 |
| Second | (11:34:24 `ach:intermediate_lumberjack:0#4` 159/159, 1.51) · 13:04:42 `#5` 159/159, 1.51 · 14:35:32 `#6` 158/158, 1.51 · 16:06:16 `#7` 158/158, 1.52 · 17:37:24 `#8` 157/157, 1.47 · 19:05:31 `#9` 158/158, 1.41 · 20:30:25 `#10` 161/161, 1.45 · 21:57:21 `#11` 163/163, 1.47 · 23:25:45 `#12` 164 planned, 120 by 00:57 |
| Third | (12:28:39 `ach:alchemist:1#1` 121 nettle, 120 of 121 potions, **blocked 13:53:13**) · 13:53:14 `ach:the_reaper:1#1` 16 won + 2 lost, 1.5/0.49 · 14:22:56 `gear:skeleton_pants#1` 2/2, 0.10 · 14:29:12 `src:blue_slimeball#1` 20/20, 0.15 · 14:38:16 – 18:51:03 `lvl:alchemy:30#1–#4` 132, 132, 132, 140, 1.38–1.44 each · 20:14:06 `ach:alchemist:1#1` 80/80, 0.08 · 20:18:39 `ach:the_reaper:1#1` 59 won + 4 lost, 1.5/**1.80** · 22:06:28 `lvl:alchemy:30#1` 143/144\*, 1.49 · **014's code**: 23:35:49 `mat:minor_health_potion#1` 286/286, 0.2/0.26 (the_reaper) · 23:51:11 `mat:snakeskin#1` 12/12 bought (Magic Wizard Hat for Fourth) · 23:51:54 `mat:minor_health_potion#1` 2/2 (ogre skin for that hat) · 23:52:53 `src:ash_wood#1` 5/5 (Snakeskin Boots for Fourth) · 23:55:16 `src:blue_slimeball#1` 83 planned, 62 won by 00:57 (Battlestaff for Fourth) |
| Fourth | (11:48:03 `lvl:mining:35#3` 157/157, 1.51) · 13:18:22 `#4` 157/157, 1.55 · 14:51:11 `gear:steel_ring#1` 4/4, 0.05 (for Second and Fifth) · 14:54:08 `mat:hardwood_plank#1` 14/14, 0.06 · 14:57:49 `src:ogre_skin#1` 7 planned, 0 won + 1 lost, **blocked 15:03:08** · 15:03:10 – 21:57:57 `lvl:mining:35#1–#6` 155–178 each, all done, 1.35–1.43 · 23:23:28 `#7` 179 planned, 155 by 00:57 |
| Fifth | (12:24:41 `lvl:mining:35#4` 157/157, 1.54) · 13:56:59 `mat:ash_plank#1` 1/1 · 14:00:16 `mat:snakeskin#1` 2/2 · 14:01:07 `src:blue_slimeball#1` 40/40, 0.2/0.26 · 14:16:45 – 21:10:25 `lvl:mining:35#1–#6` 156–178 each, all done, 1.32–1.42 · 22:35:37 `src:ogre_skin#1` 7 planned, 0 won + 2 lost, **blocked 22:41:10** · 22:41:10 `lvl:mining:35#1` 181/182\*, 1.88 · **014's code**: 00:34:09 `mat:hard_leather#1` 15/15 bought (Steel Ring for Second) · 00:36:02 `lvl:mining:35#1` 177 planned, 46 by 00:57 |

Every `lvl:mining:35` why reads "for Diamond in the chain of diamond_in_the_sky (+3 pts …)", the chain falling from ~67 h to ~55 h. As in report 014, three miners stand on one 3-point road. Mining went from 24 to 26 (First, 15:36:59 and 20:52:27) and from 26 to 28 (Fourth, 21:38:55).

**Samples against their estimates**:
- `gather:coal_rocks` ×20: 29–35 s against 33 s (0.88–1.06).
- `gather:birch_tree` ×9: 32–35 s against 33 s.
- `gather:nettle` ×5: 36–39 s against 41 s.
- `gather:ash_tree`: 29 s against 25 s.
- `kill:blue_slime`: 23 and 27 s against 17 s.
- `kill:vampire`: 111 and 110 s against 331 s (0.33; the plan of 20:18:39 itself put 92 s a kill).
- `craft:hardwood_plank`: 16 s against 5 s, with "slower than expected" at 14:57:48; known, report 014's note on a sample's estimate.
- `craft:minor_health_potion`: 3 s against 170 s (013's price, 20:18:37) and against 3 s (014's: the stock is free, 23:51:09).
- `level:mining:24 / 25 / 27`: 17,637 / 18,928 / 20,229 s against 16,653 / 19,254 / 22,702 s.

**Achievements**: no `plan: completed` or `claim` line in the window.

### Every notable line
**Nothing of this kind** in the window: `flapping`, `no step`, `defect`, `queue found stopped`, `took over`, `ran dry`, a 462, "inventory full of protected working stock".

**Three blocks and one removed interrupt.** 10 lost fights in all: 8 under 013's code, 2 under 014's, both in First's offering hunt.

| time (UTC) | line(s) | verdict |
|---|---|---|
| 11-20 13:53:13 | Third `queue paused — Craft 121× Minor Health Potion: no Nettle Leaf (need 2)`, `blocked ach:alchemist:1 6 h` | **defect, not this task's**: `planMake` sources an ingredient per product, not per run (61 runs need 122 nettle; 121 gathered; `edaaf23:src/plan/planner/decide.ts:78`) |
| 13:56:13, 20:21:20 (Third, vampire), 15:00:13 (Fourth, ogre), 22:38:45 (Fifth, ogre) | the first fight of a fight step lost | **defect of 013's executor**, fixed by 014 for an owned character: the reset's stash kept one unit per wanted utility slot (`c8266ac:src/plan/jobgear.ts:494-501`), so the first fight ran on a stack of one (Third banked 119 of 120 minor potions at 13:53:38 and equipped 1 at 13:54:15) |
| 14:15:06, 21:18:26, 21:28:54, 21:57:38 (Third, vampire) | a stack drunk out inside a fight: 100 lasted 13 wins + 1 loss, refills of 46 lasted 6–7 fights | as designed for 013 (refill on empty) |
| 15:03:08 | Fourth `not a safe win vs Ogre`, `blocked src:ogre_skin 6 h` | as designed: the executor's gate after the refill is the judge |
| 22:41:10 | Fifth `lost 2 fights in a row`, `blocked src:ogre_skin 6 h` | as designed (013's code); see below |
| 11-21 00:13:43, 00:16:51 | First, offering hunt (head `pl:int:offering:2026-11-21:0`): 2 fights lost, `interrupt removed — Today's seasonal offerings: lost 2 fights in a row`, "comes back at 01:16Z (1 of 3 today)" | as designed (task 010's offering catch-up); not looked into: an offering's fight plans no potions |
| 00:06:46 | Third `bank/withdraw/item snake_hide 8 -> 478` | as designed: a race for the bank's stock, re-planned |
| 17:42:22, 17:42:56, 17:50:25 | `network error — retry 1/6` | as designed, no pause |
| 14:23:55, 22:42:28, 00:17:26 | `unequip -> 483` | as designed: the swap heals and retries |

**`src:ogre_skin@Fifth`** (013's code):
- **The decision** (22:35:37) read "Ogre Skin: 32 actions short for Magic Wizard Hat for Fourth … 7 kills now (1.6 h)".
- **The reset** stowed `minor_health_potion 3, small_health_potion 6` right after a cut withdrawal (22:37:28). By the stash rule the fight wore one of each. Fight 1 was lost at 22:38:45 after 6 cooked trout were withdrawn by "restock" (22:38:02).
- **The retry.** 22:39:48 withdrew 3 minor and 6 small and equipped them (22:39:55). Fifth ate 2 trout and rested; **fight 2 was lost at 22:41:10** and the target was blocked.
- **What fight 2 drank.** The bank of 23:32:55 holds 1 small and no minor health potion, and no other move of either shows between. So fight 2 drank **8 of the 9 worn** and still lost.
- **Against the chat's reading.** The chat saw losses with 1–5 drunk against 8–9 predicted: a stack run out inside the fight. The log fits that for the stack-of-one first fights and for Third's vampire losses. It does not fit Fifth's second fight, which is a forecast miss or a run of crits.
- **The validator's record cannot be read here.** `src/sim/validate.ts` keeps its per-fight record in storage (`ammo:v1:simdev`, `:49`, `:65`), not in the log.

### Report 014's acceptance step 7 (from the first decision after the restart, 23:35:49)
**Kill steps.**
- **Third**, 23:55:16 `src:blue_slimeball`: "83 kills now (0.5 h) with 100 Air Boost Potion from the bank; rests (no food heals so little)". 83 is the stack ÷ 1.2. Its 62 fights so far rested (a slime costs about 10 HP).
- **First**, 00:47:11 `ach:the_reaper:1`: "11 now (0.2 h) with 14 Air Boost Potion and 93 Minor Health Potion and 12 Cooked Trout from the bank". **Its reset withdrew exactly 12 cooked trout** (00:49:30). The potions sit past the 160-character cut of the 00:48:34 withdrawal and can be checked only by the leftover deposit at the step's end. 6 of its 7 fights ate trout.

**No `restock`, `craft` or `gather` of a consumable inside an owned `pl:` fight item since the restart.** Before it, under 013's code: restock ×5, porkchop withdrawn ×5 and cooked ×2, nettle and algae ×7 each and a minor potion crafted ×7, trout cooked ×1.

**`mat:` / `src:` lines for a consumable** name their work:
- 23:35:49: "Minor Health Potion: 7076 short for Minor Health Potion ×1260 for the_reaper (Vampire, 2 chunks) (+3 pts, chain ~20 h); 286 made now".
- 23:51:54: "… ×845 for Ogre Skin for Magic Wizard Hat for Fourth … (Ogre, 2 chunks) …; 2 made now".
- The "short" sums every parent's while the label names the best one (Notes).

**"ran dry"**: none.

### The two food defects
- **"inventory full of protected working stock"**: none in the whole log.
- **Fights that ate (a `use` before the next fight) against fights that rested, per fight step:**

  | step | code | fights | ate | rested | eaten |
  |---|---|---|---|---|---|
  | Third `ach:the_reaper:1`, 13:53:14 | 013 | 18 | 17 | 0 | porkchop 19 |
  | Fifth `src:blue_slimeball`, 14:01:07 | 013 | 40 | 0 | 39 | — |
  | Third `src:blue_slimeball`, 14:29:12 | 013 | 20 | 0 | 19 | — |
  | Fourth `src:ogre_skin`, 14:57:49 | 013 | 1 | 1 | 0 | porkchop 2 |
  | Third `ach:the_reaper:1`, 20:18:39 | 013 | 63 | 60 | 2 | porkchop 49, trout 17 |
  | Fifth `src:ogre_skin`, 22:35:37 | 013 | 2 | 1 | 0 | trout 2 |
  | Third `src:blue_slimeball`, 23:55:16 | 014 | 62 | 0 | 60 | — |
  | First `ach:the_reaper:1`, 00:47:11 | 014 | 7 | 6 | 1 | trout 6 |

  The vampires ate 225-HP food, the slimes rested: no fight rested with a food in the bag that its loss covered.
- **Cooked food into and out of the bank**:
  - Out: 23 porkchop (13:55:04), 11 (14:59:17), 11 (20:20:15), 6 trout (22:38:02), 12 trout (00:49:30, the planned 12).
  - In: 10 porkchop (14:16:28), 8 (15:03:48), 6 trout (22:07:19), 4 trout (22:42:24) — these are the bank's `cooked_trout:4` of 23:32:55 — and 9 trout (00:23:20).
  - The largest food withdrawal is 23, far under a third of a 144 bag.

### 462s, events, the spawn ratio
- **One 462 in the whole log**: 2026-11-13 12:15:28.550 `[8nqf]` First `bank/deposit/item [iron_ore 35, cloth 10] -> 462 Your bank is full.`, then `queue paused — Deposit everything` (the hive's era). The two expansions were bought by hand at 12:45:47 and 12:46:03, and the same two codes went in together at 12:46:18.
- **`plan: event` since 13:00**:
  - 17:24:15 `portal_demon` — "does not fit: 500 Demon kills for closing_the_gate … 78.9 expected by the deadline";
  - 20:30:47 `sunsting_awakening` — "nobody needs it";
  - 20:42:49 `attacking_the_island` — "does not fit" (coin_collector, secure_the_island);
  - 22:41:08 `portal_efreet_sultan` — "does not fit … 40.5 expected";
  - 23:05:12 `full_moon` — "nobody needs it".

  There was no event interrupt.
- **The ratio**: 44 `⚡` lines, **41 distinct**, from 11-17 10:51:33 to 11-21 00:57:59 = **86.11 h**. The docs expect **67.3 ± 8.2**, so **expected ÷ seen = 1.64**, beside 1.61 (report 014) and `SPAWN_LOG` 1.64.

### Where the time goes
An action's seconds run from its line to the character's next action line.

| 13:00:14 → 23:32:54 (013's code, 10.54 h) | fight | rest | eat | bank | walk | gear | gather | craft | own consumables |
|---|---|---|---|---|---|---|---|---|---|
| First | 0 | 0 | 0 | 0.3% | 3.5% | 0.1% | 96.1% | 0 | 0 |
| Second | 0 | 0 | 0 | 0.3% | 2.1% | 0 | 97.6% | 0 | 0 |
| Third | 9.5% | 3.6% | 0.8% | 1.2% | 7.1% | 1.0% | 72.7% | 1.2% | 2.8% |
| Fourth | 0.1% | 0.1% | 0.0% | 0.8% | 4.7% | 0.4% | 93.5% | 0.2% | 0.1% |
| Fifth | 1.2% | 1.1% | 0.0% | 1.0% | 4.7% | 0.5% | 91.2% | 0.0% | 0.2% |

| 23:32:54 → 00:57:55 (014's code, 1.42 h) | fight | rest | eat | bank | walk | gear | gather | craft | own consumables |
|---|---|---|---|---|---|---|---|---|---|
| First | 6.2% | 3.3% | 0.6% | 3.1% | 12.9% | 3.7% | 68.4% | 1.4% | 0 |
| Second | 12.0% | 5.1% | 0.1% | 2.0% | 10.2% | 1.4% | 68.2% | 0.8% | 0 |
| Third | 31.7% | 27.8% | 0 | 3.9% | 16.2% | 1.5% | 5.3% | 13.2% | 0 |
| Fourth | 7.1% | 3.7% | 0 | 1.9% | 10.1% | 1.2% | 75.2% | 0.5% | 0 |
| Fifth | 7.5% | 4.3% | 0 | 2.6% | 13.9% | 1.5% | 69.2% | 0.5% | 0 |

The fights after 00:05 are mostly the offerings' hunts.

### What the log says this task's rules must not get wrong
1. **A 462 refuses the whole request** (11-13 12:15:28): the held codes must go in a request apart from the new one.
2. **An expansion is paid from the character's gold, withdrawn first** (7,000 at 12:45:41, 14,000 at 12:45:57), and the price doubles.
3. **A reset puts worn-only codes into the bank** (Third, 23:55:29: wolf ears, an adventurer vest and pants, none among the 102). The replayed bank held 105 codes at 23:59 and 102 at 00:58: the free count moves with every reset.
4. **The merchant order sold 3,095 sap** (First, 11-18 18:03:59 → 19:03:13, 58 sales) **and 188 shells**: the rule must stop exactly this.
5. **Food never came near a third of the bag** (23 at most). Vampire fights ate 225-HP food and slimes rested, so the cap and "the food that fits" must keep both.
6. **Recycling gives back random amounts** (8 copper armours: 10–13 bars, 3–6 wool): a tidy's "N back" is an expectation, and a slot frees only when the last copy is gone.

## The bank today
Printed by `npm run check -- planner` (`## The bank today`). The input is the bank of 23:32:55 UTC on 11-20 as the task gives it, saved as `scripts/fixtures/bank-2026-11-20.json`: 102 codes, 110 slots, 3 expansions, the next 28,000, 231,984 gold. It is played with the snapshot's characters at combat 23 / 25 / 22 / 23 / 23, wearing the sets the task names. The per-character assignment of those sets is mine (in the fixture); only who wears a code at all decides a verdict. Skills and achievements are the snapshot's of 11-18.

### The slots by kind
| kind | slots | codes |
|---|---|---|
| gear | 44 | copper and iron pieces, the elemental rings and amulets, staffs, bows, daggers, leather, skeleton and hard-leather pieces, forest rings, adept rings |
| drops | 22 | slimeballs, cowhide, feather, wings, cloth, milk, mushroom, pig skin, raw beef and chicken, skeleton, snake, vampire and wolf drops, hard leather, snakeskin, vermin leather, wool |
| materials | 15 | ash, birch and spruce wood, coal, copper ore and bars, iron bars, steel bars, hardwood planks, the five stones, sap |
| ingredients and consumables | 9 | 240 air boost potions, algae, apple, cooked trout, nettle, shell, shrimp, small health potion, trout |
| tools | 6 | copper axe and pickaxe, fishing net, iron axe and pickaxe, spruce fishing rod |
| currencies and keys | 5 | lich tomb key, magical cure, prime fabric, small bag of gold, tasks coin |
| the rest | 1 | altar doll |

**No recipe, no open objective and no solve asks for** (a list for 017; nothing is done with it): cooked trout 4, lich tomb key 23, small bag of gold 2, tasks coin 584. The 240 air boost potions are not on it: the XP picks' solves wear them (held stock is free), so by this test a solve asks for them.

### Every gear code (settled point 3)
The lowest combat level on is 22, so outdated means level 12 or below.

| code | level, slot | bank / worn | verdict — the clause | what comes back · who recycles |
|---|---|---|---|---|
| copper axe | 1 weapon (tool) | 9 / – | **outdated** | 18 copper bar · Second |
| copper boots | 1 boots | 5 / – | **outdated** | 10 copper bar · Third |
| copper dagger | 1 weapon | 5 / – | **outdated** | 10 copper bar · Second |
| copper helmet | 1 helmet | 11 / – | **outdated** | 22 copper bar · Third |
| copper pickaxe | 1 weapon (tool) | 5 / – | **outdated** | 10 copper bar · Second |
| copper ring | 1 ring | 15 / – | **outdated** | 30 copper bar · Fourth |
| fishing net | 1 weapon (tool) | 5 / – | **outdated** | 10 ash plank (new) · Second |
| wooden shield | 1 shield | 5 / – | kept — in a solve: the_reaper (skeleton) for First | 10 ash plank · Third |
| wooden staff | 1 weapon | 2 / – | kept — a rare ingredient (`autoRecyclable`: the wooden stick has no source) | wooden stick, ash wood · Second |
| copper armor | 5 body | 9 / – | **outdated** | 13 copper bar, 5 wool · Third |
| copper legs armor | 5 legs | 5 / – | **outdated** | 7 copper bar, 3 feather · Third |
| feather coat | 5 body | 5 / – | **outdated** | 7 feather, 3 ash plank (new) · Third |
| fire staff | 5 weapon | 1 / – | **outdated** | red slimeball, ash plank (both new) · Second |
| life amulet | 5 amulet | 10 / – | **outdated** | 13 feather, 7 red slimeball (new) · Fourth |
| sticky dagger | 5 weapon | 8 / – | **outdated** | 11 copper bar, 5 green slimeball · Second |
| water bow | 5 weapon | 2 / – | **outdated** | 1 blue slimeball, 3 ash plank (new) · Second |
| air and water amulet | 10 amulet | 5 / – | **outdated** | 5 iron bar, 3 green, 3 blue slimeball · Fourth |
| forest ring | 10 ring | 23 / – | kept — not recyclable | — |
| forest staff | 10 weapon | 10 / – | kept — not recyclable | — |
| greater wooden staff | 10 weapon | 5 / – | **outdated** | 8 spruce plank (new), 3 blue slimeball · Second |
| iron armor | 10 body | 8 / – | kept — in a solve: the_reaper (vampire) for Second | — · Third |
| iron axe | 10 weapon (tool) | 4 / Second | kept — worn | — · Second |
| iron boots | 10 boots | 4 / – | kept — in a solve: First's XP pick (pig) | — · Third |
| iron dagger | 10 weapon | 16 / – | **outdated** | 24 iron bar, 8 feather · Second |
| iron legs armor | 10 legs | 5 / – | **outdated** | 6 iron bar, 4 cowhide · Third |
| iron pickaxe | 10 weapon (tool) | 2 / First, Fourth, Fifth | kept — worn | — · Second |
| iron ring | 10 ring | 8 / – | **outdated** | 12 iron bar, 4 wool · Fourth |
| iron shield | 10 shield | 5 / – | kept — in a solve: First's XP pick (pig) | — · Third |
| iron sword | 10 weapon | 5 / – | **outdated** | 8 iron bar, 3 feather · Second |
| leather boots | 10 boots | 24 / – | kept — in a solve: event corrupted_ogre for Second | — · Third |
| leather hat | 10 helmet | 5 / – | **outdated** | 6 cowhide, 4 yellow slimeball (new) · Third |
| leather legs armor | 10 legs | 16 / – | **outdated** | 20 spruce plank (new), 12 cowhide · Third |
| spruce fishing rod | 10 weapon (tool) | 5 / – | kept — a rare ingredient (jasper crystal; `autoRecyclable`) | — · Second |
| adventurer boots, air / earth / fire / water ring, life ring, lucky wizard hat, mushmush bow / jacket, mushstaff | 15 | 2–5 each / Third wears adventurer boots, Second a life ring | kept — the level margin | — |
| hard leather helmet / pants, skeleton armor / pants, steel battleaxe | 20 | 1–3 each / – | kept — the level margin | — |
| highwayman dagger (15), ring of the adept (25) | | 4 / 4 (ring: all five) | kept — not recyclable | — |

**What the tidy frees.**
- **All of it**: 22 outdated codes, 160 copies, 22 slots. Eight of them bring back a code the bank does not hold (ash, spruce plank, the red and yellow slimeballs: 4 new codes), so together they still free net.
- **Today**: the tidy stops at 15 free. That takes 4 steps and 10 codes (copper axe, dagger and pickaxe; fishing net, fire staff, sticky dagger; water bow, greater wooden staff, iron dagger; iron sword), **653 s** of the step's fixed seconds and 5 s a copy.
- Who: the check plays one recycler, Second. In play whoever decides first takes the next tidy (Third's first decision on this bank is copper boots, helmets and armour).

### The price ladder
The docs give no rule. The log does: First withdrew **7,000** gold at 12:45:41 UTC on 11-13 and bought an expansion at 12:45:47, withdrew **14,000** at 12:45:57 and bought at 12:46:03 (the only two purchases in the log). The next is 28,000 with three bought. So each price doubles: 3,500 · 7,000 · 14,000 · **28,000 · 56,000** · 112,000 · 224,000 · …

**60,000 buys two more**: 28,000 → 130 slots and 56,000 → 150 slots, 84,000 gold in all, which leaves 147,984. The third, 112,000, is above the cap.

### What the season needs
The forward model's bank, distinct codes in whole units, without / with the tidy rule applied to that bank (rows A and C):

| row | day 0 | day 7 | day 14 | day 30 | day 60 | deadline | the most |
|---|---|---|---|---|---|---|---|
| A | 78 / 61 | 114 / 96 | 133 / 113 | 175 / 159 | 197 / 170 | 203 / 173 | **211 / 179** (day 87.7) |
| C | 78 / 62 | 110 / 92 | 116 / 100 | 162 / 131 | 170 / 139 | 171 / 139 | 184 / 149 (day 52.9) |

- **The model starts at the bank of 11-17**: 78 codes, where the real bank held 102 on 11-20 at model day 2.4, about the same pace. It never holds a worn set and counts every code with a whole expected unit, rare drops included.
- **With the tidy, row A peaks at 179 codes.** That takes **4 expansions** (190 slots): 28,000 + 56,000 + 112,000 + 224,000 = 420,000 gold. Without the tidy it peaks at 211, which takes 6 expansions and more than 1.7 million.
- **The cap bites at the third expansion** (112,000, at 150 slots). Row A passes 150 codes with the tidy between days 14 and 30, about day 25 (mid-December).
- From then on the bank is full, nothing gear is left to tidy, and no purchase is allowed. A step that would bring a new code waits (settled point 5) until Alex moves the cap, or 017 decides what non-gear stock is spent or sold: of today's 102 codes, 22 are gear the rule calls outdated and 58 are not gear at all.

## A full bank is answered
### The deposit (settled point 1)
**One function**: `deposit(name, items)` (`src/state/loopkit.ts:166`). It is what every item deposit goes through.

**What it does.**
1. It decides first from the bank as the engine knows it. `noSlotFor` (`:146`) takes the free slots as `bankDetails.slots` less the codes `bankItems` holds (`freeSlots`, `:143`). A code the bank holds a stack of always goes in. A new code goes in only while a free slot is left, in bag order.
2. What has no slot is not offered at all and stays in the bag.
3. If the game answers 462 anyway (the bank changed under it: a stale slot count), the answer is the same. The local slot count is set to the codes the bank holds, and the codes it holds a stack of go in one more request (`:174-181`). The log shows a 462 refuses the whole request (11-13 12:15:28 UTC: iron ore and cloth both stayed), so they have to go apart. This is never a retry of the same request.
4. It returns what was kept and reports it (`reportNoSlot`, `:158`).

**Its callers.**
- `depositAll` (`loopkit.ts:192-200`) → `bankOff` (`src/state/exec.ts:57-73`): the full-bag trips of the fight, gather, sell, recycle, deliver, craft and train items, and runLoop's 497 path (`src/state/queue.ts:1627`).
- The `deposit-all` item (`queue.ts:502-511`). It no longer goes through `bankOff`. It is done when nothing in the bag has a slot and the pockets are empty; otherwise it walks to the bank and calls `depositAll`.
- The gear swap's deposit (`exec.ts:223`): the reset's stash, a junk-gear stow, the room a swap needs.
- The claim's deposit (`queue.ts:586-587`). A kept code leaves the claim's `got` list, so the claim item does not wait for it.

There is one more guard, before any deposit is offered. `gearSwapStep` adds the bag's codes that have no slot to `keep` (`exec.ts:160-161`). The differ (`jobgear.ts nextGearAction`, untouched) therefore never plans a stash of them, and a reset with a full bag still converges.

**What the item does next.** It goes on. A gather or fight item keeps working with the room the banked codes freed.

**A bag full of codes the bank cannot take.** `bankOff` sees before walking that nothing loose in the bag has a slot (`exec.ts:65-70`). It reports it and throws `BankFullError` (`loopkit.ts:153`). runLoop ends the item with one activity line, "bank full — <item> ends: …" (`queue.ts:1603-1606`, `:1625`, `:1627`). It is never a pause and never a 60-second hold.

**How the planner hears of it.** Through the hook `setNoSlotHook` (`src/state/planner.ts:428-433`). It writes one `plan: bank — <name> could not bank <codes>: no slot (<codes> codes of <slots> slots) — kept in the bag` line, at most once an hour for the same character and codes. It records the time and runs `bankCheck` at once. A step that ended with no unit after such a refusal is not blocked; one line says so (`planner.ts:314-316`). The rule holds for every character: the executor's part does not ask who owns the queue.

**Why no path can bounce.**
- A bounce needs a withdrawal and a deposit of the same code with only moves between. Nothing here withdraws.
- A code with no slot is never offered twice: the local slot count is corrected on the first 462, and every later deposit and every stash leaves the code out by `noSlotFor`.
- A full bag of such codes ends its item before any walk.
- `deposit-all` is done as soon as only such codes are left.

`bank-full-deposit` runs two steps' resets in a row: one 462, then never the feathers again. `bank-not-owned` runs four deposits: one 462, then three clean ones.

### The World (settled point 2)
- `World.bankSlots` and `World.nextExpansion` (`src/plan/planner/types.ts:118-121`) come from `bankDetails` in `worldOf` (`planner.ts:97-98`).
- The free slots are `bank.ts freeSlots` (`:47`): the slots less the codes the bank holds.
- Who reads them: `tidyStep` (`bank.ts:180`) from `rank()` (`decide.ts:171-173`), `bankStuck` (`bank.ts:220`) in `rank()` (`decide.ts:333-337`), and the runtime's `bankCheck` (`planner.ts:442`).
- The forward model's World has neither, so `freeSlots` is undefined and nothing fires. A new invariant, 21, checks every replay step for it.

### The tidy (settled points 3, 4)
**The rule.** `tidyVerdicts(world, name)` (`src/plan/planner/bank.ts:113-169`) gives every gear code of the bank a verdict and the clause that decided it. Gear means weapon (tools too), shield, helmet, body, legs, boots, ring and amulet (`isGear`, `:41-42`). The clauses are tried cheapest first:
1. not recyclable;
2. the level margin (`TIDY_MARGIN` 10 below the lowest combat level on);
3. worn;
4. a running step's `wear`;
5. an ingredient;
6. an open objective's inputs, bill (`baseParents`) or gear piece (`gearPieces`);
7. nobody on may recycle it (the lane's crafter first, `mayCraft`);
8. a rare ingredient (`xp.ts autoRecyclable`; see Decision 1);
9. then, only for what is left, the solves (`solvePicks`, `:70-102`). These are each character's XP pick (`pickMonster` → `fightRec`), the monsters of the open kill objectives and of the open `src:` kills (characters up to ten levels below the monster), every event monster of which the character is a possible member (`possibleMembers`), and every gathering lane's tool (`jobGear`, gather). They are memoised on the levels, the bank's gear and the monsters.
10. Last, what comes back: the codes that bring back a code the bank does not hold all go when, together, they free more slots than they add; otherwise none of them goes.

**The candidate's place in `rank()`.** First, before anything else (`decide.ts:171-173`). The step is `tidyStep(world, name)` (`bank.ts:180-208`), and it is returned only while fewer than `TIDY_BELOW` 15 slots are free and no other character's current step is a tidy step.

**The step and its items.**
- Up to three codes of one workshop, taken from the outdated codes this character may recycle and nobody else reserved, lowest level first.
- `Step.as` is `"tidy"`, the target `tidy:<first code>` (so the brake counts per code), and the work `{ kind: "recycle", codes }` (`types.ts:23-24`).
- Compiled to `[recycle ×copies of each code, deposit-all]` (`compile.ts:63-72`). The `recycle` item withdraws the copies a bagful at a time and recycles them at the workshop (`queue.ts` recycle case, untouched).

**One deviation: no craft reset.** A craft job's reset strips the worn set into a bank that is nearly full. The log shows a reset banking three worn-only codes (Third, 23:55:29 UTC). Its wisdom pick can also be the very piece to recycle: copper boots carry wisdom 10. `bank-tidy` caught both, with 8 iron codes reaching the bank at the next reset. Without the reset the step's four items hold three codes. Nothing else of the settled point changes.

**The reservation.** Every copy is reserved: `Step.withdraw` holds every copy, so `stock.ts reserved` takes them off the others' `available` and `poolBank`.

**The why.** For example, "tidy: Copper Boots ×5 and Copper Helmet ×11 recycled: frees 2 bank slots (12 → 14 free of 18), 10 Copper Bar, 22 Copper Bar back". The returns are an expectation (`recycleReturn`, spread by the recipe; the log shows 10–13 bars for 8 copper armours).

**What the others see while it runs.** The others' pools lack the reserved copies, and no second tidy starts. After the step the codes are gone whole. The next decision of anyone tidies again while fewer than 15 slots are free.

### The expansion (settled point 5)
**The check.** `bankCheck()` (`planner.ts:442-468`) runs at boot after the first read (`:656`), on the 5-minute tick (`:409`) and right after every refusal. It acts only below `EXPAND_BELOW` 10 free, with no `expand` item queued, nothing outdated left (`tidyVerdicts`) and `expansionOk` true (`bank.ts:211-217`). That means a price of at most `config.expansionCap` (60,000; `config.ts:54-56`, `types.ts:94`, a patch can move it, not in the UI) with the bank keeping `GOLD_FLOOR` (20,000) after it.

**The interrupt.** It goes on the owned character with the shortest walk to a bank (`reach.ts bankSec`), class `bank` (`planner.ts:512-514`), placed after `event` and `merchant` (a spawn's clock sets those) and before `offering` and `claim` (a full bank stops every deposit). Its `what` is `expand<expansions>`, so it is idempotent per purchase.

**The `expand` item** (`src/plan/queue.ts:96-99`; `src/state/queue.ts:590-623`):
1. Walk to the bank.
2. If the next price is above the agreed one, skip.
3. Withdraw the price less the pocket gold. The docs say the game takes the character's gold (`docs/api/openapi.json`, buy_expansion's 492 "The character does not have enough gold"), and the log of 11-13 shows 7,000 and 14,000 withdrawn right before each purchase (12:45:41, 12:45:57 UTC).
4. `buyExpansion`; `bought` is recorded before the cooldown, as `buy` does.
5. One read of `/my/bank`, since the echo carries the price and no bank details. Unread, the local slots are +20 and the next price doubled.

`expand` is not in `QUEUE_KINDS`: a restart drops it like a `claim`, and the boot sync and `bankCheck` decide again.

**The lines.**
- The decision: `plan: bank — 8 of 18 slots free and nothing left to tidy: Pia buys an expansion for 28,000 gold (bank gold …)`.
- The purchase (dev log and activity log): `<name> bought a bank expansion for 28,000 gold: slots 18 → 38, the next costs 70,000`.
- No purchase: `plan: bank — … the next expansion costs 70,000 gold: not bought (above the cap of 60,000)`, once a day, also in the activity log.
- At boot: one `plan: bank — <used> of <slots> slots used (<free> free), the next expansion …, bank gold …; tidy below 15 free, buy below 10 (cap 60,000); outdated: …` line.

### No slot, no tidy, no gold
- **The candidates that leave.** `bankStuck(world)` (`bank.ts:220-224`) holds when no slot is free, nothing is outdated and no purchase is possible. Then every objective, level, supply and filler candidate whose step would bring a code the bank holds no stack of leaves `rank()` (`newCodes`, `bank.ts:228-239`: a craft's or buy's product, or a kill's or gather's drop of which its chunk expects a unit). The fallback stays as it was (C.4: always a step).
- **The hourly line.** `plan: bank — no slot free, nothing to tidy, no expansion (<why>): a step that would bring a code the bank does not hold waits; nobody is paused; kept in bags: …` (`planner.ts:464-467`).

### Made-up cases (`scripts/check-planner.mts`, section 5f, on the bank of section 2)
All pass (`## Task 015: the bank`, section 5f). The bank world is the fixture of section 2.

| case | the result printed |
|---|---|
| 8 free — a crafter's first decision is a tidy step | Third: `tidy:copper_boots@Third#1` "Copper Boots ×5 and Copper Helmet ×11 and Copper Armor ×9 recycled: frees 3 bank slots (8 → 11 free of 110), 10 Copper Bar, 22 Copper Bar, 13 Copper Bar, 5 Wool back" |
| …a character that may recycle nothing takes an ordinary step | Fifth: `ach:tanners_exchange:0@Fifth#1` (objective) |
| 15 free — no tidy | Third: `ach:tanners_exchange:0@Third#1` |
| a code worn by one character — kept | copper helmet on Fifth: "worn (Fifth)" |
| a code a solve picks — kept, with the solve named | the fishing net with the spruce rods taken out of the bank: "in a solve: First's fishing tool". With the rods in the bank it is outdated. |
| a code a recipe uses — kept | no recyclable gear of level 10 or below is an ingredient, so the fleet goes to combat 32: skeleton armour (level 20) is "an ingredient (Royal Skeleton Armor)" |
| nothing to tidy, 8 free, the next price 28,000 — an expansion is asked for | the outdated codes taken out, 8 free: 28,000 may be bought (the runtime's conditions: under `EXPAND_BELOW`, nothing outdated, `expansionOk`) |
| …the price 70,000 — none, with the line | "above the cap of 60,000" |
| …gold at 40,000 — none (the floor) | "the bank would keep 12,000 gold, under the floor of 20,000" |
| no slot free and nothing possible — a step that would bank a new code is no candidate | Third and Fifth take `ach:tanners_exchange:0` (no new code). With slots unknown, 10 of their candidates would bring one. |

### Scenarios (all pass)
- **`bank-full-deposit`** (211 actions, 103 virtual min). Setup: Pia (owned) carries copper ore, which the bank holds a stack of, and feathers, which it does not. The bank is full, and the engine read one free slot at boot that is gone before the first deposit.
  - The first step's reset deposits both, the game answers 462, and the ore goes in alone. The feathers stay in the bag and the step gathers on.
  - The second step's reset and every bank-off never offer the feathers again.
  - Result: one 462 in all, nothing paused, nothing blocked, the `plan: bank — Pia could not bank Feather` line.
- **`bank-tidy`** (17 actions, 4 virtual min). Setup: 12 of 18 free. Pia (owned, combat 15, in iron gear, every crafting role) has outdated copper gear in the bank.
  - `tidy:copper_boots@Pia#1` recycles the boots ×5 and the helmets ×11: "frees 2 bank slots (12 → 14 free of 18)".
  - `tidy:copper_dagger@Pia#1` recycles the daggers ×5: "(14 → 15 free of 18)".
  - The bank then holds 3 codes, with the bars back (+2 a copy). The next decision is the ordinary fallback, and the copper rings, outdated too, stay.
  - Two tidy steps in a row: no bounce, nothing blocked.
- **`bank-expand`** (66 actions, 31 virtual min). Setup: 8 of 18 free, no gear in the bank, price 28,000, bank gold 100,000.
  - The `bank` interrupt on Pia withdraws 28,000 and buys. The game's slots go 18 → 38 and the engine reads back 38 and the next price, 70,000 (the scenario's ladder). Both lines are written.
  - Then 21 more codes reach the bank (7 of 38 free): nothing more is bought, and one line says "the next expansion costs 70,000 gold: not bought (above the cap of 60,000)".
- **`bank-full-stuck`** (81 actions, 40 virtual min). Setup: 4 of 4 slots, no gear, 5,000 gold. An open objective gathers ash wood, which the bank does not hold.
  - The objective is no candidate. Pia takes `fallback:mining` (copper ore, held) and gathers.
  - The "no slot free, nothing to tidy, no expansion … nobody is paused" line is written once, and the price line once.
  - Nothing paused, nothing blocked.
- **`bank-not-owned`** (18 actions, 6 virtual min). Setup: Bo is not owned. His bag is full of ore and feathers; the bank is full, and the engine read a stale free slot.
  - The gather item's bank-off answers 462, the ore goes alone, and the gather goes on to its five.
  - Two `deposit-all` items and a second gather follow: deposits 462, 200, 200, 200, never the feathers.

**What the fake learned** (`scripts/harness/fake.mts`):
- The bank's slots (`world.slots`, default 500 so that no older scenario changes) and `/my/bank` answering them.
- A 462 on a deposit of a new code with no slot. Guess: the whole request is refused, as the log of 11-13 shows.
- `bank/buy_expansion`: on a bank tile, from the character's gold (492), +20 slots, the next price doubled or the scenario's `ladder`, the echo `{ transaction: { price } }`.
- `recycling`: on the item's workshop (598), at its level (493), recyclable (473). It gives back `recycleReturn(units)` units per item, dealt over the recipe's ingredient units in order (a guess; the game's are random), at 5 s an item.

The harness itself needed nothing.

## The sell rule
**Before** (`edaaf23`):
- `src/plan/events.ts:17` held `SELL_FLOORS` = sap 300, shell 50, golden shrimp 0, golden egg 0.
- `merchantOrder` (`:56-82`, its sell loop `:61-66`) sold every whitelisted code above its floor.
- `src/plan/planner/stock.ts:16` `floor` took the same numbers off what a step may plan with (`available`, `:43-46`).

**After**:
- `merchantOrder` skips any code a recipe uses (`events.ts:62-64`, `itemUses(o.code).recipes.length`). `SELL_FLOORS` stays as the whitelist and its floors (`:13-17`, the comment says so).
- `floor` is the gold floor alone (`stock.ts:15-17`; `SELL_FLOORS` is no longer imported there).

**Today's bank** (the fixture of 23:32:55 UTC): the Timber Merchant would have sold **275 sap** (575 − 300) and now has nothing to trade. The Fish Merchant would have sold 2 shells (52 − 50) and has nothing either: no golden shrimp is in the bank. These are made-up cases of section 5f.

**What the bills gain.** Every step plans with all 575 sap and 52 shells, where it had 275 and 2: +300 sap and +50 shells for `available`, the bills, `feedable` and the potion price's stock.

**The log** (section 1, appendix): the old order sold **3,095 sap** in 58 sales (First, 11-18 18:03:59 → 19:03:13 UTC) and **188 shells** (11-19 02:39:46 → 10:33:59).

**By the rule:**
- **Left the sell list**: sap (small antidote, gold knife, health potion, health boost potion) and shell (iron knife).
- **Stayed**: golden shrimp and golden egg; no recipe uses them.

Gear was never on the list.

**Scenario `merchant-keeps-sap`** (20 actions, 10 virtual min): a Timber Merchant spawns with 575 sap in the bank. There is no trip, no `sell` item and no sale; the running gather goes on; the sap stays.

**Outside the list of the rules.** `scripts/check-events.mts:21-24` asserted the old sales ("sell 2613 Sap", "sell 167 Shell"). It now expects none for the Timber Merchant and the golden shrimp alone for the Fish Merchant. That file is not on the task's list; the rule cannot pass it otherwise.

## The food repairs
### The bag (settled point 7, first half)
**The plan.** `fightTake` (`src/plan/planner/consumables.ts:449-491`) now caps a step's planned food at a third of its character's bag (`:474`). When the food the step would plan (its units a kill × the kills × 1.2, at most the reservable stock) is above that third, the kills are capped to what the third covers, as a potion stack caps them (`:476-479`). The why then says so, for example "… with 23 Air Boost Potion and 46 Cooked Chicken from the bank; the bag caps it at 19 kills (2 Cooked Chicken a kill, 46 is a third of 138)" (`:487-489`).

The cap applies only when the food would exceed the third. A step planned with 4 trout keeps its 83 kills (the potion stack's cap) and rests once the trout is eaten; the first version capped it at 38 and the made-up case caught it.

**The forward model.** It uses the same `fightTake`, so its kill steps are capped too. The bag there is the character's at the start: the forward model raises max HP with a level, not the bag (Notes).

**The executor.** The reset never takes more than a third of the bag, whatever the item's `take` says (`src/state/queue.ts:526-529`).

### The food that fits (settled point 7, second half)
**`poolFood(world, name, lost)`** (`consumables.ts:88-90`, over `poolFoods`, `:75-87`, memoised per World and name) is the best-healing food of the pool that the fight's loss covers at least once (`hp ≤ lost`).

**One reading for every caller.** `Price.food` is now a function of the loss (`src/plan/planner/reach.ts:253-255`), so every caller reads the food for its own fight:
- the price: `fightSecOf` (`reach.ts:294`), `consPrice` (`consumables.ts:128`);
- the need's H0 and H1: `judgeRun`'s `food0` (`:223`), the road's (`:318`, `:332`);
- the events' kill seconds (`src/plan/planner/events.ts:84`, `:116`);
- the trip's use (`useOf`, `consumables.ts:517-526`);
- the step's food (`fightTake`, `:472`): the best-healing food the loss covers, of the stock a work of the step's score may reserve.

The need (`foodFor`) already asked for a food eaten at least once a fight.

**What the fight eats.** The executor eats the best food in hand when the deficit covers one unit (`exec.ts healOnce`, untouched). Since the reset takes only the planned food, the hand holds the food that fits.

### Made-up cases (section 5f)
The bank of section 2 plus 400 cooked chicken (80 HP); it already holds 4 cooked trout (225). First is at combat 23 with a bag of 138 (the snapshot's), a third of which is 46.

| case | result |
|---|---|
| the price and the need read the food that fits | `poolFood(…, 184)` → cooked chicken; `(…, 300)` → cooked trout; the best of the pool is trout |
| a fight that loses 160–224 HP: chicken ×2 a kill, the kills capped by a third of the bag | the highwayman, 173 HP lost: "19 kills with 23 Air Boost Potion and 46 Cooked Chicken from the bank; the bag caps it at 19 kills (2 Cooked Chicken a kill, 46 is a third of 138)" |
| a fight that loses 225 or more: trout while it lasts | the pig, 248 HP lost: "83 kills with 100 Air Boost Potion and 4 Cooked Trout from the bank" — the potion stack caps the kills, the 4 trout go, then it rests |
| before the repair | the plan read cooked trout for the highwayman: floor(173 ÷ 225) = 0 a kill, so it rested |

### Scenarios (both pass)
- **`consumables-food-bag`** (76 actions, 12 virtual min). Two fight steps whose items ask for 300 cooked chicken out of 400; Ann's bag is 118 (a third: 39).
  - The first reset takes 39, the second 9 (what the first step ate), with no deposit between.
  - The fights eat 19 in all (one a fight, rest after) and drop ten feathers each. The full bag banks the feathers (90 at 00:04:55 virtual) and keeps the chicken; "protected working stock" never shows.
  - The third step's reset banks what is left: 381 in the bank.
- **`consumables-food-fits`** (63 actions, 16 virtual min). Pia (owned, combat 15, iron gear) kills cows, about 152 HP lost a fight by the forecast. The bank holds 400 cooked chicken (80 HP) and 4 cooked wolf meat (200 HP).
  - The step takes 36 cooked chicken (30 kills × 1 a kill × 1.2) and its why says so. The wolf meat is never withdrawn.
  - The fights eat chicken: 20 `use` in 21 fights, each followed by a rest for the HP under 80.
  - Before the repair, the plan read wolf meat (152 ÷ 200 = 0 a kill) and every fight rested.

## The replay
`npm run check -- planner` runs rows A, B, C and E by default (settled point 8). D and F come with `AMMO_PLANNER_ROWS=all`. For this report I ran D and F once as their own row processes (`AMMO_PLANNER_ROW=3` and `=5`) beside the default run.

**The forward model has no slots.** Its World carries no `bankSlots`, so `tidyStep` and `bankStuck` return nothing and `bankCheck` is the runtime's alone. The new invariant 21 ("the forward model has no bank slots: no tidy step") held on every decision of every row (35,182 in A, B, C and E; 183,595 and 171,987 checks of every invariant in D and F, none failed).

### The points
| row | day 7 | day 14 | day 30 | day 60 | deadline | report 014 | seconds · decisions |
|---|---|---|---|---|---|---|---|
| **A** default | 32 | 41 | 52 | 72 | **86** | 87 (35 / 41 / 51 / 74) | 1,569 · 10,099 |
| **B** consumables free | 44 | 55 | 65 | 83 | **90** | 94 | 479 · 7,140 |
| **C** consumables 0 (report 013's model) | 32 | 36 | 56 | 72 | **78** | 77 | 945 · 7,044 |
| **D** a win is enough | 36 | 41 | 57 | 70 | **89** | 89 | 1,435 · 9,923 |
| **E** no events | 34 | 39 | 49 | 63 | **68** | 68 | 774 · 9,961 |
| **F** alchemy for all | 35 | 43 | 56 | 75 | **91** | 86 | 1,563 · 9,290 |

**Row C moved, 77 → 78, and the sell floor's end did it.** I ran row C once more with the old floor: a scratch flag in `stock.ts floor`, reverted at once and not kept. It ends at **77** with 7,009 decisions, report 014's to the decision. With the floor gone, the 300 sap and 50 shells come into the plans:
- loktar_ogar completes on day 76.6 (+1; it was open at the deadline);
- its_malefic on day 78.8 instead of 90.7;
- king_of_the_goblins on 37.9 instead of 39.1;
- magic_harvester on 58.1 instead of 59.0.

Nothing else of this task reaches report 013's model: `config.consumables` 0 plans no food, `fightTake` returns at once, and the forward model has no slots. The check's case is now "row C ends at 78 (77 with the old sell floors)" (`scripts/check-planner.mts`, section 6).

### Combat 25 / 30 / 35 / 40 (day)
| | First | Second | Third | Fourth | Fifth |
|---|---|---|---|---|---|
| A | 35.6 / 65.7 / 68.5 / 71.8 | 1.3 / 11.8 / 28.9 / **33.1** | 1.2 / 17.2 / 33.9 / **37.2** | 2.7 / 21.7 / 33.1 / **34.9** | 9.1 / 13.2 / 32.6 / **34.9** |
| A, report 014 | 21.8 / 33.4 / 37.7 / 40.0 | 8.6 / 22.0 / 35.3 / 37.6 | 0.9 / 18.4 / 37.2 / 39.4 | 17.7 / 21.4 / 36.7 / 38.8 | 16.0 / 21.8 / 30.3 / 35.9 |
| B | 6.6 / — / — / — | 0.5 / 4.7 / 9.3 / 11.3 | 1.2 / 4.3 / 7.7 / 9.9 | 6.3 / 7.4 / 11.9 / 14.0 | 1.3 / 6.2 / 7.7 / 9.1 |
| C | 13.4 / 16.5 / 52.1 / 77.6 | 0.9 / 14.9 / 51.1 / 54.0 | 12.5 / 15.5 / 33.2 / 59.6 | 13.5 / 16.5 / 43.0 / 66.3 | 11.9 / 14.8 / 35.2 / 51.4 |
| D | 24.1 / 31.4 / 33.4 / 39.1 | 1.1 / 22.7 / 24.9 / 31.2 | 7.3 / 11.4 / 24.0 / 31.1 | 8.7 / 31.4 / 32.2 / 35.1 | 7.3 / 17.9 / 23.8 / 31.0 |
| E | 18.0 / 30.0 / 46.3 / 61.1 | 1.3 / 14.3 / 19.1 / 27.8 | 1.2 / 14.2 / 45.7 / 60.8 | 9.1 / 16.7 / 46.4 / 71.7 | 6.9 / 11.8 / 43.0 / 61.4 |
| F | 17.6 / 30.5 / 32.1 / 34.8 | 0.9 / 26.9 / 28.9 / 31.9 | 0.9 / 8.3 / 20.7 / 24.3 | 0.9 / 27.2 / 28.9 / 31.7 | 5.3 / 26.2 / 27.2 / 30.4 |

### The hours by answer, the consumables, the food
| row | objective | level | supply | filler | fallback | events | consumable making: ingredients · brewing · cooking (share of fight + making hours) | fights that ate · rested (kills) | kill steps the bag capped |
|---|---|---|---|---|---|---|---|---|---|
| A | 5.0% | 18.9% | 72.4% | 1.7% | 0.0% | 2.0% (230 h) | 7,934 h · 170 h · 30 h (**79.7%**) | 21,051 · 705,425 | 301 |
| B | 7.4% | 14.6% | 1.5% | 15.8% | 58.7% | 2.0% (224 h) | — | 0 · 31,677 | 0 |
| C | 25.0% | 50.0% | 17.6% | 6.1% | 0.0% | 1.3% (149 h) | report 013's: 7,797 of 8,909 fight hours brewing inside the fights (87.5%) | 0 · 51,181 | 0 |
| D | 5.0% | 21.2% | 67.1% | 4.6% | 0.0% | 2.1% (239 h) | 7,146 h · 155 h · 41 h (77.4%) | 23,667 · 534,589 | 450 |
| E | 6.3% | 19.3% | 62.3% | 12.0% | 0.2% | — | 6,833 h · 133 h · 1.1 h (76.8%) | 3,372 · 629,809 | 16 |
| F | 4.3% | 17.1% | 63.4% | 13.2% | 0.1% | 2.0% (226 h) | 6,895 h · 153 h · 23 h (80.9%) | 16,591 · 566,025 | 224 |

**How the new columns are counted.**
- "Ate" counts the kills of the steps that planned a food, and "rested" the kills of the rest, by the steps' plans.
- Most kills are hunts for drops, slimes above all, whose loss no food covers, so resting is right there.
- B and C plan no food (`fightTake` returns at once for both), so their fights count as rested by construction.
- The first capped steps of row A are combat 23 steps of Fourth and Second on day 0.5: "with 46 Cooked Shrimp from the bank; the bag caps it at 19 kills (2 Cooked Shrimp a kill, 46 is a third of 140)".

**Gear made** (the first eight days / to the deadline): A 29 / 96 · B 34 / 41 · C 11 / 71 · D 51 / 110 · E 17 / 74 · F 26 / 85.

### What the food repairs changed (row A against report 014's A)
1. **A ends at 86 against 87.** On the same days: 32 / 41 / 52 / 72 against 35 / 41 / 51 / 74, within three points everywhere.
2. **Four fighters reach combat 40 one to five days earlier**: Second 33.1 (37.6), Third 37.2 (39.4), Fourth 34.9 (38.8), Fifth 34.9 (35.9). The cook First reaches it on day 71.8 (40.0): its road waited 574 h on its gathering roles (woodcutting 35, fishing 40, algae, sap).
3. **The bag capped 301 kill steps**, mostly 19 kills at 2 units a kill (46 food, a third of 138–140). Steps are shorter, with more resets.
4. **Planned food went into 21,051 kills, rest into 705,425.** Most kills are hunts for drops that no food fits. Before the repair the plan read the best food in stock, whether or not the loss covered it.
5. **The sell floor's end** puts sap into the potions of the needs: `src:sap` appears in every fighter's road waits (68–108 h). That is 300 more sap to plan with, and the health and health-boost potions start from it.
6. **The three changes are not separated.** That would take a run each. Row C, the floor alone in report 013's model, moved +1; row E, no events, stayed at 68.

## What was done / files
### Section 3 — a full bank is answered

**The executor:**
- `src/state/loopkit.ts`: `freeSlots`, `noSlotFor`, `BankFullError`, `setNoSlotHook` / `reportNoSlot`, `deposit` (`:140-182`); `depositAll` through `deposit` (`:192-200`).
- `src/state/exec.ts`: `bankOff` with no walk and `BankFullError` when nothing has a slot (`:57-73`); `gearSwapStep` keeps codes with no slot (`:160-161`) and deposits through `deposit` (`:223`).
- `src/state/queue.ts`:
  - `deposit-all` (`:502-511`) and the claim's deposit (`:586-587`);
  - the `expand` item (`:590-623`; `api`, `bankDetails` and `BankDetails` imported);
  - runLoop's `finish` and `bankFull` (`:1587-1606`, `:1625`, `:1627`).
- `src/plan/queue.ts`: the `expand` kind (`:96-99`), its text (`:150`) and icon.

**The core:**
- `src/plan/planner/bank.ts` (new).
- `types.ts`: `Work.recycle.codes`, `Answer` `"tidy"`, `PlannerConfig.expansionCap`, `World.bankSlots` and `nextExpansion`.
- `config.ts`: `expansionCap` 60,000.
- `decide.ts`: the tidy first (`:171-173`) and the stuck filter (`:333-337`).
- `compile.ts`: the tidy step's items (`:63-72`).

**The runtime** (`src/state/planner.ts`):
- `worldOf`'s bank (`:97-98`);
- the no-block after a refusal (`:314-316`);
- the hook, `bankLine` and `bankCheck` (`:413-468`);
- `bankCheck` on the tick (`:409`) and at boot (`:656`);
- the `bank` class (`:512-514`).

### Section 4 — the sell rule
- `src/plan/events.ts:13-17` (the comment), `:64` (the rule).
- `src/plan/planner/stock.ts:15-17`.
- `scripts/check-events.mts:21-24`.

### Section 5 — the food repairs
- `src/plan/planner/consumables.ts`: `poolFoods`, `poolFood(…, lost)`, `lostOf` (`:75-92`); `consPrice`'s food (`:128`); `judgeRun` and the road (`:223`, `:318`, `:332`); `fightTake`'s food, cap and note (`:469-490`); `useOf` (`:517-526`).
- `reach.ts`: `Price.food` (`:253-255`), `fightSecOf` (`:294`).
- `events.ts`: `:84`, `:116`.
- `src/state/queue.ts:526-529`: the reset's cap.

### Section 6 and the checks
**`scripts/check.mts`**: the named check's backstop is 2,700 s (`:16-19`).

**`scripts/check-planner.mts`:**
- `ROW_ON`: A, B, C and E unless `AMMO_PLANNER_ROWS=all`; the results by row.
- Invariant 21.
- `Run.food` and `Run.codes`, `codesOf` and `tidyCodesOf`.
- The bank fixture and `bankWorld`; section 5f's 13 made-up cases (sections 3, 4 and 5); `bankTable` (`## The bank today`).
- Per row: the ate / rested and bag-capped line; rows A and C: the distinct codes.

**The harness and the scenarios:**
- `scripts/harness/fake.mts`: slots, 462, `bank/buy_expansion`, `recycling`, `ladder`.
- `scripts/fixtures/bank-2026-11-20.json` (new).
- Eight scenarios: `scripts/scenarios/{bank-full-deposit,bank-not-owned,bank-tidy,bank-expand,bank-full-stuck,merchant-keeps-sap,consumables-food-bag,consumables-food-fits}.mts`.

**Docs**: `CLAUDE.md` (the planner's section: a "The bank (task 015)" bullet, the food, the interrupt classes, the checks; the merchant and bank-trip paragraphs) and `docs/game-actions.md` (the bank: slots, 462, `deposit()`, who calls `buyExpansion`).

### Commands run
**Git:**
- `git switch -c rework` from `edaaf23`.
- `git add docs/rework.md; git commit -m "Rework notes"` → `1b80879`.
- `git push -u origin rework`: worked (`* [new branch] rework -> rework`).
- `docs/rework.md` did not change again during the work.

**Typecheck and the checks:**
- `npm run typecheck` after every change; final clean.
- `npm run check -- <name>` for each new scenario. `bank-tidy` failed twice before it passed:
  1. the first version of the tidy step started with a craft reset, which put Pia's worn iron set into the bank (11 codes, not 3) → the tidy step lost its reset;
  2. the measure was taken after the next step's reset → it is now taken at the decision.
- `npm run check` (all): `74 checks: 73 ok, 1 known defect reproduced, 0 failed — 115.5 s`.
- The plain `scripts/check-planner.mts` once by hand before the last fixes. It failed the "a recipe uses it" case (no recyclable gear of level 10 or below is an ingredient, so the case now raises the fleet to combat 32 and uses the bank's skeleton armour). It also showed the trout step capped at 38 kills for 4 trout, which made the cap apply only when the food would exceed the third.
- `npm run check -- planner`, twice:
  1. It failed only "row C ends at 77" (A 86, B 90, C 78, E 68; 1,601.5 s). After the old-floor run named the cause, the case became 78.
  2. Green: `OK (582401 invariant checks, 83 made-up cases; deadline points 86 / 90 / 78 / 68)`, 1,535.7 s.
- `npm run check` (all), again on the final tree: `74 checks: 73 ok, 1 known defect reproduced, 0 failed — 115.0 s`.
- Rows D and F as row processes (`AMMO_PLANNER_ROW=3`, `=5`, in parallel with the default run): 1,436 s and 1,563 s, every invariant held.
- Row C with the old floor (a scratch flag in `stock.ts`, reverted as soon as the process had loaded it): 77, 7,009 decisions, 959 s.

**The build**: `npx vite build --outDir <scratch>/ammo-015-dist --emptyOutDir`: built, deleted.

**Scratch, all deleted at the end**: probes of the bank's codes and of fights' HP loss, the agent's log readers and their outputs.

**What was not touched**: no request to the game, no `.env`, no `.ammo/*`; no service started, stopped or called; nothing written to `logs/dev.log`.

## Notes
### Defects noticed and not touched
- **Worn-only codes move through the bank.** Every step starts with a bank reset that strips the worn set into the bank. A worn code the bank holds no stack of takes a slot while its owner wears something else (section 1: Third's reset banked wolf ears, an adventurer vest and pants at 23:55:29 UTC, none of them among the 102).
  - So the free count moves by up to a few slots a reset, which `TIDY_BELOW` 15 absorbs.
  - With no slot, such a stripped piece stays in the bag (settled point 1).
  - The World counts the bank only (settled point 2).
- **`planMake` sources an ingredient per product, not per run.** 121 minor health potions need 61 runs = 122 nettle, but the step gathered 121, paused at the craft and was blocked (`ach:alchemist:1@Third`, 13:53:13 UTC on 11-20; `edaaf23:src/plan/planner/decide.ts:78`).
- **013's executor ran a fight step's first fight on a stack of one potion.** The reset's stash kept one unit per wanted utility slot, and four first fights were lost on 11-20 (13:56:13, 15:00:13, 20:21:20, 22:38:45). 014's code keeps the planned quantity for an owned character; under it no fight has been lost yet (section 1).
- **Fifth's second ogre fight of 22:41:10 was lost with 8 of 9 worn potions drunk** (section 1). That is a forecast miss, not a stack that ran out. Only `src/sim/validate.ts`'s record in storage (`ammo:v1:simdev`) can say how far off; the log carries no potion count a fight.
- **A supply line's "N short" sums every parent's shortfall while it names the best one** ("7076 short for Minor Health Potion ×1260 for the_reaper", 23:35:49 UTC): as designed, but it reads wrong.
- **The fake deals a recycle's returns in recipe order.** The game's are random (the log: 10–13 bars for 8 copper armours), so a tidy's "N back" is an expectation.
- **The forward model raises max HP with a combat level but not the bag** (`forward.ts:178`), so its food cap stays at a third of the bag at the start (46 of 138 for First) as its fighters climb.
- **Section 1's reader cannot see a reset's potions.** An `api` line's body is cut at 160 characters (`src/api/client.ts:15-19`), so the potions a reset withdrew show only by the leftover deposit at the step's end.

### Guesses in the numbers, most doubtful first
1. **The ladder doubles.** It rests on two hand purchases (7,000 and 14,000) and today's 28,000. The season's four expansions and their 420,000 follow from it.
2. **The season's codes** are the forward model's: it counts a code from one whole expected unit, starts from the bank of 11-17 (78 codes, not 102), holds no worn set and tidies nothing but gear.
3. **`TIDY_BELOW` 15, `EXPAND_BELOW` 10 and `TIDY_MARGIN` 10** are the chat's guesses.
4. **"No solve the planner makes today picks it"** covers each character's XP pick, the open kill objectives' and `src:` kills' monsters up to ten levels above, the events it can be a member of and every gathering lane's tool. It does not cover gear by need's own solves (sets with pieces not made yet) or a level's next pick.
   - The solves are memoised on the levels, the bank's gear and the monsters. During a tidy every code that leaves changes the key, and the first decision after it solves again (cache hits through `reach.ts`'s subset rule for most).
5. **A recycle's returns.** `recycleReturn` spread by the recipe; a tidy step's hours use 5 s a copy (the fake's guess, as a craft).
6. **What a tidy frees together.** The codes that bring a new code free net when they are more than the new codes they bring (8 against 4 today). A single tidy step can still free nothing net for a while (a fishing net's slot for ash planks' slot).

## To delete (Alex)
Nothing. The scratch scripts, probes, the log readers, the row outputs and the scratch build are deleted.
