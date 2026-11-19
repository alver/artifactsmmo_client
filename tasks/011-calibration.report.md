# 011 — The calibration round: what a fight drinks, filler before a road that does not fit, an objective is the fleet's work, the next hours read — report

## Summary
- **Section 2's verdict is (c), the sets.** Report 010's 6 small health potions a pig fight were the snapshot pool's set (highwayman dagger, wooden shield: First wore the only mushstaff set). On the sets the fighters really wore on 11-19 (mushstaff, iron shield, mushmush jacket, leather hat) the forecast says 4–5, Monte Carlo 3.5–4.05, the log 3.0–4.8, and the HP a fight cost matches (209–245 against 213–265). At today's price those sets win the pig **with no potion at all** (147 s, 879–928 XP/h), so the pig is the pick again. The expected mode is off Monte Carlo by under one proc, either way, at 20 and at 30. The simulator stays; `validate.ts` now records each real fight's potions against the forecast's.
- **Deadline points 56 / 56 / 56 / 59** (A default, B potions at half price, C free, D a win is enough) against report 010's 49 / 49 / 49 / 52 and report 009's 56 / 59. Section 3 brings the filler back (17.3% of the hours, the 7 points report 010 lost; the road to `grand_master` now takes the fallback's hours). Section 4 makes 31 pieces in row C against report 009's 67. **Row C lands on 56** because rows A–C finish every achievement the model can reach; the other 154 points wait for a layer, an event, gear above 38, `use`, a raid or a group, exactly as in report 009. So sections 3 and 4 move days and cost, not the count.
- **Combat does stall at 29–30 at today's price. That is the potion's price, not the count.** From 29 the pig gives no XP. The safe XP monsters left need 5–14 minor health potions a fight (89–93% of the kill), and the forecast's count holds there (imp: 11 against Monte Carlo 11.27). Combat 30 comes on days 41–64 (free potions: 13–22) and 35 only for Fifth, on day 96 (free: 17–26). The gathering specialists reach 40 on days 5.8–15.7 either way, so layers are not delayed. Events (the fighters at 30) are, by about a month. 78% of a minor health potion's price is algae, of which the bank holds 2,099.
- No restart during the work: the service runs report 010's code (`[ca7c]`, 16:22:33 UTC); the log was read to 19:34 UTC (and checked to 19:54).

## Decisions for Alex
None. The open lever — whether a by-product (algae, slimeballs, the diamonds at the copper rocks) counts in a price or a choice of node — is the planning chat's (settled point 3); this report prints what hangs on it.

## How Alex verifies
1. `git log --oneline -2` → `011: calibration round` on top of `5a60dae Rework notes`; `git status` clean.
2. `npm run check` → `52 checks: 51 ok, 1 known defect reproduced, 0 failed` (`repeat-spin` known; about 70 s); `check-planner` `OK (10823 invariant checks, 24 made-up cases)`.
3. `npm run check -- planner` → about 6.5 minutes; ends `OK (401775 invariant checks, 24 made-up cases; deadline points 56 / 56 / 56 / 59)`. It prints, after the "safe" tables: `## What a pig fight drinks` (the log against the simulator), `## What a fight drinks, per fighter` twice (the snapshot; the fleet at 19:21 UTC), `## By-products in a potion's price`, `## Gear by need` twice; in every replay row the lines `hours by answer`, `a gathering role at 40`, `gear made (task 011)`, `work (c)`, `filler not reached`; in row A also `by-products made on the way` and `each fighter at combat 25, 28, 30, 35`.
4. `npm run typecheck` prints nothing after `tsc --noEmit`; the scratch build succeeded (see "Commands run").
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → `tasks/011-calibration.md`, `tasks/011-calibration.report.md`, `CLAUDE.md`, `scripts/check-planner.mts`, `src/plan/planner/{bundle,config,cost,decide,gear,reach,supply,types}.ts`, `src/sim/validate.ts`, `src/state/apply.ts` — all allowed by the task.
7. **After the restart — not checked by me** (the restart is Alex's): a `gear:` step's why names each copy's character with its own work, so a kill objective appears beside one character only ("Steel Battleaxe ×1 for Fifth (i_want_bacon (pig)) — the best: …"); no `supply` step for a piece "for X (<objective> (<monster>))" starts while another character's step on that objective runs and covers what is left. And the next potion fight's record carries `predPotions` / `actualPotions` (in `ammo:v1:simdev`; no UI shows them).

I ran 2–5 on the final code; 1 and 6 after the commit.

## The hours since 16:43
Read as a stream from `logs/dev.log` (never copied), by scratch scripts, **from 16:43:42.130 to 19:34:46.231 UTC** (its last line when read; the statistics run to 19:32:38): 2.82 hours. **No restart inside**: every line carries `[ca7c]`, the run that started at 16:22:33 on report 010's code. Code references in this section are to `93790c7` (010), the code that ran.

### Steps per character
Units planned/done; hours planned/taken (taken = the step's own items at the head; in brackets: with an interrupt inside). Steps in brackets started before 16:43.

| who | steps |
|---|---|
| First | (16:10:07 `src:ash_wood#2`, supply, 200/201 gathers, 1.4/1.54 h (2.95 h — the offering 16:22:34–17:47:17 inside); parent Hard Leather Helmet for First (the_reaper)) · 19:07:17 `src:diamond_stone#1`, supply, 212 planned, 62 by 19:32; parent diamond_in_the_sky |
| Second | (15:51:13 `ach:i_want_bacon:0`, objective, 46/46 pigs, 1.5/1.07 h) · 17:11:39 `mat:hardwood_plank` 30/30, 0.0/0.19 h · 17:23:15 `mat:steel_bar` 34/34, 0.0/0.13 h · 17:30:47 `src:blue_slimeball` 150/150 kills, 1.1/0.83 h — all three for Battlestaff for Third (the_reaper) · 18:20:40 `src:skeleton_bone` 42/42, 1.5/0.72 h, for Skeleton Armor for Second (i_want_bacon) · 19:03:43 `lvl:combat:25` (skeleton), 69 planned, 28 by 19:32 |
| Third | (16:00:07 `src:iron_ore#1`, 66/67, 0.5/0.67 h; Steel Battleaxe for Third (the_reaper)) · 17:45:59 `src:iron_ore#2` 3/3, 0.0/0.05 h (Skeleton Helmet for Third (i_want_bacon)) · 17:49:11 `gear:hard_leather_boots` 2/2 · 17:50:22 `gear:hard_leather_helmet` 2/2 (0.02 h each) · 17:51:20 `mat:iron_bar` 7/7, 0.03 h (Skeleton Helmet for Second (i_want_bacon)) · 17:53:25 `src:diamond_stone#1` 212/212, 1.5/1.56 h · 19:26:44 `#2`, 14 by 19:32 — diamond_in_the_sky |
| Fourth | (15:29:39 `src:iron_ore#1`, 102/102; Hard Leather Pants for Third (the_reaper); only its deposit in the window) · 17:45:44 `src:flying_wing` 40/40 kills, 1.1/0.92 h (Mushmush Jacket for Second (i_want_bacon)) · 18:41:01 `mat:hardwood_plank` 3/3, 0.06 h (Steel Battleaxe for Fourth (i_want_bacon)) · 18:44:37 `src:diamond_stone#1`, 212 planned, 118 by 19:32 |
| Fifth | (16:02:55 `ach:the_reaper:0`, objective, 42/42 skeletons, 1.5/1.09 h (1.91 h, the offering 16:22:34–17:11:31 inside)) · 17:57:12 `src:skeleton_bone#1` 38/38, 1.5/0.71 h (Skeleton Helmet for Second (i_want_bacon)) · 18:39:34 `#2` 38/38, 1.5/0.63 h (Steel Battleaxe for Fourth (i_want_bacon)) · 19:17:07 `src:diamond_stone#1`, 29 by 19:32 |

Every kill chunk finished in 0.42–0.84 of its planned hours; every `mat:` / `gear:` step (planned 0.0 h) took 1–11 minutes. The diamond chain's "actions short": 6000 → 5788 → 4076 → 3864 (17:53:25, 18:44:37, 19:07:17, 19:17:07) — four stones at 1,500 gathers each, less the others' 212 in flight, less one stone found by Third at 18:35:45 and banked 18:55:22.

### Samples against their estimates
| time | who | key | measured | estimate | × |
|---|---|---|---|---|---|
| 17:23:15 | Second | `craft:hardwood_plank` | 23 s | 5 s | **4.60** (n=1) |
| 17:53:25 | Third | `craft:iron_bar` | 18 s | 5 s | **3.60** (n=1) |
| 17:30:46 | Second | `craft:steel_bar` | 13 s | 5 s | **2.60** (n=1) |
| 17:45:59 | Third | `gather:iron_rocks` | 37 s | 29 s | 1.28 (n=2) |
| 19:07:17 | First | `gather:ash_tree` | 28 s | 25 s | 1.12 (n=2) |
| 18:20:39 | Second | `kill:blue_slime` | 20 s | 18 s | 1.11 (n=1) |
| 17:45:44 | Fourth | `gather:iron_rocks` | 32 s | 29 s | 1.10 (n=1) |
| 19:26:43 | Third | `gather:copper_rocks` | 26 s | 25 s | 1.04 (n=1) |
| 18:41:01 | Fourth | `kill:flying_snake` | 83 s | 101 s | 0.82 (n=1) |
| 17:11:37 | Second | `kill:pig` | 84 s | 107 s | 0.79 (n=5) |
| 17:57:12 | Fifth | `kill:skeleton` | 93 s | 143 s | 0.65 (n=1, a brew inside) |
| 19:03:42 | Second | `kill:skeleton` | 61 s | 127 s | **0.48** (n=3) |
| 18:39:34 | Fifth | `kill:skeleton` | 67 s | 143 s | **0.47** (n=2) |
| 19:17:07 | Fifth | `kill:skeleton` | 59 s | 143 s | **0.41** (n=4) |

Three `plan: slower than expected` lines, the three craft samples (17:23:15, 17:30:46, 17:53:25): a craft step is a bank reset, a walk and a deposit, 13–23 s a run against the model's 5 s. Skeleton kills ran at 0.41–0.65 of the estimate, with no potion drunk on a skeleton since 16:24.

### Every notable line
**None** of `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`, `offering interrupt issued again`, `comes back at`, `took over`, `re-attached`, `not a safe win`, `lost 2 fights in a row`, a paused queue or `network trouble` in the window.

| time | line(s) | verdict |
|---|---|---|
| 16:49:13, 16:51:23, 16:56:35, 17:05:14, 17:17:50, 17:21:21, 17:27:20 | `log[bad] … queue: lost a fight — healing and retrying` (First, Fourth ×4, First, Third; losses 16:48:22 … 17:26:30) | known and accepted (decision 28, settled point 5): the offering hunts skeletons by an expected win (`src/state/queue.ts:1357`, `:693`) |
| 17:14:14, 17:27:57, 17:29:49, 19:17:08 | `unequip … -> 483` (not enough HP; Third, Third, Fourth, Fifth) | as designed: healed and retried, ok |
| 17:23:15, 17:30:46, 17:53:25 | `plan: slower than expected — craft:…` | as designed (the line); the price of a craft step is low (see "Notes") |
| 17:11:37–39, 17:57:12 | `queue complete` / `queue started — 3 items` (Second, Fifth) | as designed (step to step) |
| 18:12:42, 18:52:47 | `⚡ Sunsting Awakening (0, 18) until 19:12`, `⚡ Portal (Demon) (-3, 9) until 19:52`; no `interrupt event` | cannot be judged from the log: an order's "nothing to do" goes to `eventPlans`, not to the log (`src/state/eventorders.ts:84`) |
| 18:20:22 → 18:21:10, 18:39:21 → 18:39:34, 19:03:27 → 19:03:43 | cooked beef deposited by a step's `Deposit everything`, withdrawn by the next fight step's restock 13–48 s later (Second, Fifth, Second) | a small defect: a deposit→withdraw bounce at a fight→fight step boundary (the harness only checks withdraw→deposit) |
| 17:13:01–17:14:47 | Second's bank reset deposits its fight set; First, Fourth, Third (offering hunts) take it | as designed (the bank is the shared pool; the parked "a made piece in every fighter's pool") |

### Task 010's acceptance step 7
- **No potion expedition in the window, nor since the restart**: no `gather Sunflower`, `withdraw Sunflower`, `craft Small Health Potion` note, no potion crafted. The only potion moves are the 16 small health potions Fifth brewed at 16:21:37 for The Reaper: unequipped 16:24:07 (the offering's set), carried through 61 skeleton fights unworn, deposited 17:57:56; **Second equipped them 17:58:33 on blue slimes** (`src:blue_slimeball`) after 65 slime wins without, drank none (16 in, 16 out 18:20:50); **Fourth equipped them 18:21:26 on flying snakes** (`src:flying_wing`) after 24 wins without them (the rest is hidden by the cut of the 18:41:29 deposit). Neither monster needs a potion by the log (150/150 and 40/40 won). That is the executor's gear self-heal wearing banked potions on a fight it wins anyway — a utility slot filled because the stack is there, no brew.
- **No `flapping` line**, so nothing to check for "one target".

### Offerings
**The rest of 11-19** (the catch-up of 16:22:34, `pl:int:offering:2026-11-19:0`). All five accepted `20261119_combat_10_20` (6 skeleton bones; favor × 1.5 XP on skeletons); weaponcrafting and jewelrycrafting skipped by their crafters (16:24:31 Second: Steel Axe; 16:23:48 Fourth: Ring of Chance), no bracket for the other three.

| who | hunt fights / lost (times) | completed | inside the interrupt |
|---|---|---|---|
| Second | 14 / 0 | 16:38:30, +2,550 XP | 16:22:34 → 16:38:36, 16.0 min |
| Fifth | 21 / 0 (3 bones from the bank 16:24:01; fished 23 trout, cooked 43) | 17:11:25, +2,300 | → 17:11:31, 49.0 min |
| Third | 36 / 2 (16:37:21, 17:17:04) | 17:27:51, +2,300 | → 17:27:56, 65.4 min |
| Fourth | 41 / 5 (16:38:53, 16:50:32, 16:55:44, 17:20:27, 17:26:30) | 17:44:48, +2,550 | → 17:44:53, 82.3 min |
| First | 52 / 3 (16:35:42, 16:48:22, 17:04:24) | 17:47:12, +2,300 | → 17:47:17, 84.7 min |

164 hunt fights, 10 lost (6.1%: Fourth 5 of 41 = 12%, under the "one in five" of settled point 5), 4.96 character-hours inside; 12,000 XP from the completions and 9,466 from the hunts' fights. **00:05 UTC of 11-20 is not in the log** (it ends 19:34 on 11-19).

**Favors.** The combat favor (× 1.5 XP on skeletons) was active for all five from 16:23–16:24. XP a skeleton fight: 57 (Second), 60–62 (the others) with it, against 40 for Fifth at 16:06:15 before accepting. The only `why` that states XP — Second's `lvl:combat:25` at 19:03:43, "Skeleton at 0.46 XP/s" — uses it (`src/plan/planner/pick.ts:35`): `fightXp(18, 480, normal, 23)` = 24 (× 0.7 for the five-level gap) × 1.5 = 36 XP over the table's 77.9 s. **Real: 57 XP a kill every 62 s, 0.92 XP/s** (see "Notes": the fight-XP formula's base is about two thirds of the real one). The six skeleton supply steps were chosen by their bills, not by XP, but collected the favored XP all the same.

### Gear
**Pieces crafted in the window: two crafts, both by Third.**

| crafted | piece × copies | the step's why | first wearer | at 19:32 (as far as visible) |
|---|---|---|---|---|
| 17:49:54 | Hard Leather Boots ×2 | "×2 for Third, Fourth — i_want_bacon (pig): H0 29 h, with it 22 h" | Second 17:50:34 (19 s after the deposit, blue slimes) and First 17:51:18 (ash wood: the boots carry prospecting) | First and Third (Second's went back 18:20:50, Third 18:21:40), both mining copper |
| 17:50:53 | Hard Leather Helmet ×2 | "×3 for First, Third, Fourth — i_want_bacon (pig): H0 29 h, with it 22 h + 0.9 h" | Fourth 17:52:07, flying snakes | both in the bank (18:41:29); the second copy never seen worn |

Per code: boots, 2 made for 2 named (Third, Fourth), neither worn against a pig; helmets, 2 made of 3 named (First, Third, Fourth), one worn 49 minutes by Fourth against flying snakes. The pieces of 15:50–15:59 travel the same way: Second's battleaxe, helmet and jacket → bank 17:13:28 → First 17:14:47 (the offering hunt) → bank 17:48:56 → Second 17:50:01 (Second at the end); Fifth wore its battleaxe and helmet through 116 skeleton fights and banked them 19:18:27 for mining. Equip and withdraw bodies are cut at 200 characters (cut equips at 17:14:13, 17:14:31, 17:14:35, 17:29:24, 17:31:28, 17:46:29, 17:48:38, 18:42:11, 19:19:07; a cut withdraw at 18:41:56): a piece in a cut tail is not seen.

**The bill of settled point 4** — a `gear:`, `src:` or `mat:` step whose parent is a kill objective another character was on (a running `ach:` step) or won safely at the time (the log: Second 46/46 pigs potion-free 15:51–17:11; skeletons potion-free and lossless, Second 70 and Fifth 136 in the window):

| start | who | step | hours | for | at that time |
|---|---|---|---|---|---|
| 16:00:07 | Third | `src:iron_ore#1` | 0.67 (0.30 in the window) | Steel Battleaxe for Third (the_reaper) | Fifth on `ach:the_reaper` from 16:02:55 |
| 16:10:07 | First | `src:ash_wood#2` | 1.54 (1.33) | Hard Leather Helmet for First (the_reaper) | Fifth on `ach:the_reaper` |
| 17:11:39 | Second | `mat:hardwood_plank` | 0.19 | Battlestaff for Third (the_reaper) | Fifth on it (17:11:31–17:57:12); Second wins skeletons |
| 17:23:15 | Second | `mat:steel_bar` | 0.13 | the same | the same |
| 17:30:47 | Second | `src:blue_slimeball` | 0.83 (150 kills, **0 XP**) | the same | the same |
| 17:45:59 | Third | `src:iron_ore#2` | 0.05 | Skeleton Helmet for Third (i_want_bacon) | Second wins pigs |
| 17:49:11 | Third | `gear:hard_leather_boots` | 0.02 | for Third, Fourth (i_want_bacon) | the same |
| 17:50:22 | Third | `gear:hard_leather_helmet` | 0.02 | for First, Third, Fourth (i_want_bacon) | the same |
| 18:39:34 | Fifth | `src:skeleton_bone#2` | 0.63 | Steel Battleaxe for Fourth (i_want_bacon) | the same |
| 18:41:01 | Fourth | `mat:hardwood_plank` | 0.06 | Steel Battleaxe for Fourth (i_want_bacon) | the same |

**4.14 character-hours, 3.56 inside the window: 25% of the fleet's 14.1 hours.** Besides, 2.38 hours of gear for Second itself (`src:flying_wing`, `mat:iron_bar`, `src:skeleton_bone` ×2: Mushmush Jacket, Skeleton Helmet, Skeleton Armor for Second (i_want_bacon)) — Second is the pig fighter, but each was priced on all 788 pigs (`H0` is its own hours for everything left, `gear.ts` work (b) before this task).

### Fights (16:43:42 → 19:32:38)
| who | monster (step) | fights | lost | XP an hour, real | s/kill planned → real |
|---|---|---|---|---|---|
| First | skeleton (offering) | 44 | 2 (16:48:22, 17:04:24) | – | – |
| Second | pig (`ach:i_want_bacon`, the whole step) | 46 | 0 | 1,700 | 117 → 84 |
| Second | blue slime (`src:blue_slimeball`) | 150 | 0 | **0** | 26 → 20 |
| Second | skeleton (`src:skeleton_bone`) | 42 | 0 | 3,325 | 129 → 62 |
| Second | skeleton (`lvl:combat:25`, running) | 28 | 0 | **3,325** against the why's 0.46 XP/s = 1,656 | 78 → 62 |
| Third | skeleton (offering) | 27 | 1 (17:17:04) | – | – |
| Fourth | skeleton (offering) | 32 | 4 (16:50:32, 16:55:44, 17:20:27, 17:26:30) | – | – |
| Fourth | flying snake (`src:flying_wing`) | 40 | 0 | 826 | 99 → 83 |
| Fifth | skeleton (offering) | 20 | 0 | – | – |
| Fifth | skeleton (`ach:the_reaper`, the whole step) | 42 | 0 | 2,349 | 129 → 93 (a brew inside) |
| Fifth | skeleton (`src:skeleton_bone#1`, `#2`) | 38 + 38 | 0 | 3,228; 3,619 | 142 → 67; 142 → 60 |

522 fights, **7 lost, all offering-hunt skeletons**; 0 lost in the 399 fights of planner steps.

### Where the time went (the whole window, report 010's method)
| | fight + rest | food | potions | walk + bank | crafting | own gathering | other | standing | of it, the offering |
|---|---|---|---|---|---|---|---|---|---|
| First | 23.1% | 8.5% | 0 | 7.7% | 0 | 59.0% | 0.1% | 1.5% | 37.6% |
| Second | 66.0% | 11.5% | 0 | 13.4% | 3.3% | 0 | 0 | 5.8% | 0 |
| Third | 17.0% | 5.7% | 0 | 10.2% | 0.6% | 64.7% | 0.1% | 1.6% | 26.2% |
| Fourth | 47.4% | 9.0% | 0 | 12.8% | 0.2% | 28.2% | 0.1% | 2.4% | 36.2% |
| Fifth | 61.0% | **21.0%** | 0 | 8.6% | 0 | 6.9% | 0.1% | 2.4% | 16.5% |

Potions 0 for everyone (32–55% under 009's core). Food is the new large share: Fifth ate 133 times in 136 fights and cooked four batches (43 trout, 46 + 32 + 47 beef). Of the fleet's 14.1 character-hours: the offering 3.28 h (23%), the bill 3.56 h (25%), diamonds at the copper rocks 3.13 h (22%; four of five characters since 19:17).

### Diamond Stone at the copper rocks
`diamond_stone` drops only from rocks (`public/data/resources.json`; no monster, no NPC):

| node | mining level | rate | who gathers it (mining on 11-18: First 22, Second 21, Third 22, Fourth 24, Fifth 24 — may have risen) |
|---|---|---|---|
| copper_rocks | 1 | 1 in 1,500 | all; **0 XP** for all (`gatherXp`: none 10+ levels above) |
| iron_rocks | 10 | 1 in 1,500 | all; 0 XP at 21+ |
| coal_rocks | 20 | 1 in 1,500 | all; 20–21 XP a gather at 21–24 |
| gold_rocks | 30 | 1 in 1,250 | nobody (underground, ≤ 24) |
| strange_rocks | 35 | 1 in 100 | nobody (the Strange Apparition event only) |
| mithril / adamantite rocks | 40 / 50 | 1 in 1,250 / 1,000 | nobody |

**Where the node is chosen**: `sourceFor(code)` → `fieldSource` (`src/plan/planner/targets.ts:60-84`): every resource that drops the code is a candidate with its level gate and `est = gatherSec(level) × perUnit(drops, code)` (`:71`), static gates first, then the least `est` (`:80`), memoised for good — one node for everyone, blind to the gatherer's level, its XP and the ore. Per stone: copper 30 s × 1,500 = 45,000 s, iron 51,000, coal 58,500 → **copper**. `billOf` (`src/plan/planner/supply.ts:92-139`) opens diamond → `mat:diamond` (gate mining 35, `:117`) → 48 stones less stock (6000 actions = 4 short: about 44 on hand, not visible in the log) → `src:diamond_stone` at `fleetSec` → 6,000 × 25.2 s = **42 h**. The parent's own gate (the diamond recipe wants mining 35) is neither tested nor priced: `objectiveParents` (`supply.ts:167-180`) checks only `inStep` and what is out of reach. In `rank()` the `src` branch tests the leaf's gate (mining 1) and takes the nearest tile of that resource.

**What 42 hours of one miner give** (the log's rates; `gatherSec(L) = 29 + max(1, ⌊L/2⌋)`, `src/plan/xp.ts:55`; `gatherXp`, `src/plan/planner/xp.ts`):

| node | s a gather: model / log | gathers an hour (log, with bank trips) | diamonds in 42 h | ore in 42 h | mining XP an hour (at 22–24) |
|---|---|---|---|---|---|
| copper (today) | 30 / 24.5 | 136 | **3.8** | 5,700 copper ore (no open chain asks for it) | **0** |
| iron | 34 / 29.7 | 122 | 3.4 | 5,100 iron ore (steel and iron bars) | 0 |
| coal | 39 / 35 | 103 | 2.9 | 4,300 coal (steel bars: 7 coal each) | **2,060** (86,000 in 42 h) |

**On the target at 19:32**: Third (17:53:25, #2 19:26:44), Fourth (18:44:37), First (19:07:17), Fifth (19:17:07) — four of five, about 580 gathers an hour together, 0.39 stones an hour: the 3 stones still short are about 7.7 hours of all four. The chain then stops at the diamond craft until a miner has 35 (they are at 22–24).

### Network errors
19 `network error — retry` lines: 16h 0, 17h 8, 18h 11, 19h 0 (on gathering 9, fight 5, rest 2, use 2, withdraw 1). All recovered at the first retry (First 18:46:36 at the second); no `network trouble`, no pause, **no step lost**.

### What the log says the next task should fix first
1. **A shared kill objective counted whole per fighter** — 3.56 of 14.1 character-hours went to gear for objectives someone else was on or won safely (Battlestaff for Third, Steel Battleaxe for Fourth, boots and helmets for First, Third, Fourth), 150 blue slimes at 0 XP among them, and the pieces went to whoever reset first. **This task fixes it** (section 4); acceptance step 7 checks it live.
2. **The diamond chain at the copper rocks**: four characters on a node with 0 mining XP and unwanted ore, picked by `gatherSec × rate` alone (`targets.ts:71`, `:80`), for a craft gated at mining 35 that the chain never prices (`supply.ts:167-180`). Coal drops the stone at the same rate (24% fewer an hour) with 2,060 mining XP an hour and the ore the steel chains want.
3. **Kill prices from the forecast are twice the log**: skeleton 127–143 s against 59–67 s, pig 107–117 s against 84 s; and a craft or trade step at 5 s a run against 13–23 s.
4. **The fight-XP formula reads about two thirds of the real XP** (skeleton at 23: 24 against 38 before the favor) — every XP-per-hour pick is priced on it.
5. Small: the deposit→restock bounce of cooked beef at fight-step boundaries; food at 9–21% of a fighter's time.

## What a fight drinks
### The evidence (logs/dev.log, the pig steps of 2026-11-19 13:43–14:57 UTC)
The log carries no fight's turns and no final HP, but every fight is followed by the heal that undoes it: `healOnce` eats as many units of food as the deficit covers, then rests the rest (`src/state/exec.ts:69-81`), and `fightRound` fights only at full HP (`:487-492`). So **the HP a fight cost = the food eaten + the HP the rest line restored** — e.g. Second 14:02:09 one cooked wolf meat (200) + 14:02:14 `rested +20 hp` = 220.

| fighter (combat) | the stacks of 16 small health potions (equip → refill) | fights each stack lasted | potions a fight | HP lost a fight |
|---|---|---|---|---|
| Second (22) | 14:02:03, 14:10:08, 14:18:30, 14:30:11, 14:51:25 | 5, 5, 6, 5, 6 | 2.96–3.64 | 213–253 (14:02–14:07) |
| Third (20) | 13:46:36, 13:57:01, 14:06:58, 14:16:00, 14:27:23, 14:51:25 | 4, 4, 4, 5, 5, 4 | 3.69–4.80 | 222–235 (rest only, 14:03–14:12) |
| Fifth (21) | 13:55:07, 14:05:11, 14:13:55, 14:21:42, 14:40:37 | 4, 5, 4, 5, 5 | 3.48–4.44 | 227–265 (porkchop 225 + rest, 14:05–14:16) |
| First (21, control) | none | – | 0 | 243–390 (14:15–14:23) |

A stack is refilled when the slot is empty after a fight (the differ), so its last fight drained it: with F fights a stack, a fight drinks between 16 ÷ F and 16 ÷ (F − 1) — the bounds above, pooled over the stacks. Each was brewed from 24 sunflowers (`withdraw` 14:00:53 …, `crafting … quantity 8` → 16) or the batch the old rule sized. No `use` of a potion: a utility potion is drunk by the fight itself.

**The sets** (the reset's `unequip`, `bank/deposit`, `bank/withdraw` and `equip` lines; `scripts/check-planner.mts` `REAL_SETS`): mushstaff, iron shield, leather hat, mushmush jacket, iron boots on all three — Second 13:58:28–14:00:39, Third 13:44:27–13:45:21, Fifth 13:53:14–13:53:34 — and the adventurer pants none of them took off. **The 200-character cut hides the rest of each reset**: ring2 and the amulet (the equips of 13:58:49, 13:44:44, 13:53:34 end in `…`). They are filled with what was seen last: Second fire ring (14:00:28) + earth ring (the `ea…` of the 13:58:28 withdraw), the air and water amulet it put on at 11:16:20; Third two earth rings (13:44:27 `ea…`), the wisdom amulet (10:36:21 `wi…`); Fifth life ring + forest ring (13:45:04–13:45:15), the air and water amulet (10:37:57). First wears the same set in the snapshot (its pig step, 14:12:13). Second's helmet and ring1 ping-ponged three times between 13:59:09 and 14:00:39 (wolf ears + earth ring ↔ leather hat + fire ring; the leather hat stayed).

**Report 010's table did not solve these sets.** The snapshot's bank (2026-11-17, `scripts/fixtures/roadmap-fleet.json`) holds no mushstaff, iron shield, mushmush jacket, iron boots or earth ring — First wore the only copies — so the solve gave Second, Third and Fifth highwayman dagger + wooden shield + lucky wizard hat + adventurer vest: 545–555 HP, slower kills, more turns under half HP. By 11-19 the bank held a mushstaff set for each of the four fighters.

### The model on those fighters
`npm run check -- planner`, "What a pig fight drinks": `simulate` on the set worn and on report 010's set; Monte Carlo 4,000 fights (crits rolled; a seeded RNG, so the check prints the same numbers every run), and how many fights a stack of 16 lasts by those draws:

| fighter | the log: potions a fight / a stack lasts | set worn: expected (killSeconds) | Monte Carlo mean ± sd, a stack lasts | pessimistic | report 010's set: expected / Monte Carlo / pessimistic |
|---|---|---|---|---|---|
| Second (22, 470 HP) | 2.96–3.64 / 5.4 | 5 (lost 209 HP) | 4.05 ± 0.93, 4.3 fights (lost 230) | 7 | 6 / 6.19 / 11 (555 HP, lost 287) |
| Third (20, 470 HP) | 3.69–4.80 / 4.3 | 4 (lost 209) | 3.65 ± 0.89, 4.8 fights (lost 229) | 7 | 6 / 6.56 / 11 |
| Fifth (21, 510 HP) | 3.48–4.44 / 4.6 | 4 (lost 239) | 3.52 ± 0.95, 4.9 fights (lost 245) | 7 | 6 / 6.33 / 11 |
| First (21, control) | 0 | 0 (lost 329) | 0 (lost 339) | a loss | – |

The HP a fight costs agrees too: 209–245 by the model on the sets worn against 213–265 in the log (report 010's set: 287).

### The verdict: (c) — the real sets differ from the ones report 010's table solved
- **6 against about 3.5 was the set.** On report 010's set every mode says 6 (expected 6, Monte Carlo 6.2–6.6); on the sets worn the expected mode says 4–5 and Monte Carlo 3.5–4.05, inside the log's bounds for Third and Fifth and 0.4 over them for Second. The HP a fight cost matches the sets worn (209–245 against 213–265), not report 010's (287).
- **Not (a).** The expected mode is off the Monte Carlo mean by a fraction of a proc either way, never by a factor: +0.95, +0.35, +0.48 on the three sets worn; −0.19, −0.56, −0.33 on report 010's; and at the levels where the replay stalls (Fifth at 30–34 on its own pool with the pieces the replay makes, a scratch probe): imp 11 expected against 11.27, vampire 4 against 4.34, rat 5 against 5.61. A deterministic trajectory crosses half HP in whole turns; the sign follows where it crosses, not a bias. Nothing to repair; no solve-time change.
- **Not (b), on the evidence there is.** The docs (`public/data/effects.json`, `restore`: "Restores {value} HP at the start of the turn if the player has lost more than 50% of their health points") match the simulator (`src/sim/combat.ts:299`); one potion was worn, so "two at once" did not arise. **Initiative** (the API's characters carry `initiative` 100, the simulator starts the player at 0, so a pig — 100 — strikes first): with the player first on the tie, Monte Carlo gives Second 3.11 (inside its bounds) but Third 2.89 and Fifth 2.60, below theirs. The log does not settle it; Second's remaining 0.4 is within what the hidden ring2 and amulet move (a life ring for the earth ring: 3.72).
- **So the simulator stays.** The record decides the rest from the next potion fights: `src/sim/validate.ts` now keeps, per real fight, the potions the forecast drinks and the potions the fight really took, with the exact set worn (see below); its turn error will show the initiative question too.

**What changed in the picks.** At today's price, on the sets worn, the pig is a safe win **without** a potion: 147 s a kill, 879–928 XP/h (snapshot levels), so the executor's set drops the potion and the pick goes back from the highwayman (622–653 XP/h) to the pig. The fighters drank before 16:22 only because the old objective priced a potion at the rest its heal buys (6 s), so a potion was a gain on a set that was safe without it. In the log since 16:22 no fighter brewed or drank (section 1). At the log's latest levels with the four pieces crafted since in the bank: every fighter's pick is the pig at 1,154–1,275 XP/h, no potion; the skeleton becomes a safe win (131–151 s).

**The two traps of `bis.ts`'s header** (`scripts/check-planner.mts`, "the traps", First stripped to 10, 165 HP, against a cow) — unchanged by this task, since the simulator and the price are: fire staff, iron sword, small health potions → iron sword + potion, safe, 18 turns, 4 potions, 74 s before (a potion at its rest) / 240 s after (`potionSec`); iron sword, copper armor, potions → sword + **armor** + potion, safe, 4 potions, 74 s / 240 s.

**The record** (`src/sim/validate.ts`): `Deviation.predPotions` (the forecast's `used`) and `actualPotions` (per utility code: the stack before minus the stack the fight echoed, an emptied slot = all of it), only on fights with a potion worn; `SimAccuracy.potionFights` and `medianPotionErr` (signed, forecast − real, units a fight). `recordFight(prev, monster, fight, after)` takes the echoed character from the one call in `src/state/apply.ts:46`; no request. Entries stored before carry neither field and still load and aggregate (a made-up case). No UI.

### By-products, read-only
Every potion of report 010's price table whose price is half or more one by-product ingredient (`npm run check -- planner`, "By-products in a potion's price"; a by-product = a monster's drop or a node's 1-in-N drop):

| potion | price | the ingredient (source) | its part | the price if it were free | the snapshot bank holds |
|---|---|---|---|---|---|
| minor health | 192 s | algae (fishing, 1 in 10) | 150 s | **42 s** | **2,099** |
| health splash | 207 s | algae | 150 s | 57 s | 2,099 |
| air / earth / fire / water boost | 368 s | green / yellow / red / blue slimeball (1 in 10) | 200 s | 168 s | 15 / 0 / 0 / 0 |
| air / water / fire / earth res | 672 s | the slimeballs | 400 s | 272 s | 15 / 0 / 0 / 0 |
| small antidote | 412 s | milk bucket (cow) | 240 s | 172 s | 5 |
| health potion / greater health | 432 / 442 s | egg (chicken) | 240 s | 192 / 202 s | 15 |
| health boost | 432 s | milk bucket | 240 s | 192 s | 5 |
| enhanced health splash | 827 s | coconut (palm tree) | 540 s | 287 s | 0 |

**Produced on the way in the replay's row A** (units, by the target whose work dropped them): algae 3,790 by `ach:pearl_fisher`, 796 by the fishing level road, 600 each by the intermediate, expert and professional fisherman objectives (≈ 6,400 over the season); green slimeballs 131 on the alchemy road; blue 55 and yellow 8 by their own `src:` steps; milk 106 by `src:cowhide` and Tanner's Exchange; eggs 2 by `src:feather`; red slimeballs and coconuts none. **The potion the fighters drink from combat 30 in row A is the minor health potion** (14 an imp fight, 93% of the kill's price) — 78% of its price is algae, of which the bank already holds 2,099 and the fishing objectives make thousands more.

## The replay
`npm run check -- planner`, from the 2026-11-18 snapshot to 2027-02-24, all five on, every invariant on every decision; four rows in four child processes (each now with its own storage file, `scripts/check-planner.mts:688`). The potion's price reaches every `killSeconds` of the core's solves through one config number, `config.potionK` × `potionSec` (`src/plan/planner/reach.ts:200`, the solves `:215`, `:238`, the prices `cost.ts:71`, `:193`, `gear.ts:72`, `supply.ts:47`); default 1, not in the UI, the executor's solves keep 1 (`src/plan/planner/config.ts:40-43`).

| row | day 7 | day 14 | day 30 | day 60 | deadline | report 010 | report 009 | fight hours that are potion making |
|---|---|---|---|---|---|---|---|---|
| A default | 33 | 42 | 46 | 56 | **56** | 49 | 56 | 7,129 of 8,253 h, 86.4% |
| B potions at half price | 33 | 37 | 46 | 56 | **56** | 49 | 56 | 6,578 of 8,103 h, 81.2% (at half price) |
| C potions free | 34 | 44 | 46 | 56 | **56** | 49 | 56 | 0 of 1,464 h |
| D a win is enough | 32 | 36 | 49 | 59 | **59** | 52 | 59 | 6,887 of 8,025 h, 85.8%; 490 h on wins that are not safe |

**Hours by answer** (section 3; row A against report 009's and 010's row A):

| row | objective | level (of it combat) | supply | filler | fallback | filler not reached |
|---|---|---|---|---|---|---|
| A, this task | 15.5% | 65.5% (61.6%) | 1.7% | **17.3%** | **0.0%** | **6 points** |
| A, report 010 | 15.0% | 77.7% combat + 7.3% the other levels and supply | | **0%** | 0% | 13 points |
| A, report 009 | 7.2% | 26.7% (21.2%) | 1.4% | 17.3% | 47.4% | 6 points |
| B | 11.1% | 70.4% (65.1%) | 1.3% | 17.2% | 0.0% | 6 |
| C | 6.7% | 17.3% (11.5%) | 1.0% | 17.4% | 57.7% | 6 |
| D | 17.0% | 64.1% (58.2%) | 1.6% | 17.2% | 0.0% | 6 |

The filler is back to report 009's share and the road to `grand_master` now takes what the fallback had (47.4% in 009): settled point 1, exactly. Ecologist, tasks_coins_fan and pearl_fisher complete again (A: days 19.6, 34.4, 53.4; report 009: 34.6, 46.9, 65.9) — the 7 points report 010 lost. "Filler not reached" is the same 6 points as report 009 in every row (making_a_nether_portal, the_planet_thanks_you).

**The day each fighter reaches combat 25 / 30 / 35 / 40** (— = not by the deadline):

| row | First | Second | Third | Fourth | Fifth | at the end |
|---|---|---|---|---|---|---|
| A | 53.8 / 63.8 / — | 1.7 / 43.8 / — | 12.8 / 43.6 / — | 14.4 / 47.0 / — | 10.8 / 41.2 / 96.0 | combat 33–35, waiting for combat 50 ("grand_master") |
| B | 50.4 / 57.2 / 93.7 | 1.7 / 35.1 / 65.7 | 7.3 / 36.8 / 68.0 | 8.1 / 39.7 / 73.9 | 8.5 / 37.0 / 69.4 | 37 |
| C | 19.8 / 22.0 / 26.2 | 1.7 / 15.5 / 19.8 | 9.7 / 12.6 / 16.8 | 3.3 / 16.1 / 20.3 | 3.2 / 13.7 / 18.0 | 38: gear, no safe XP monster on the way to 50 |
| D | 57.4 / 67.7 / — | 1.6 / 45.2 / — | 8.2 / 46.6 / — | 9.6 / 49.2 / — | 18.6 / 45.6 / — | 34 |
| report 009, A | 4.4 / 22.9 / 31.0 | 1.7 / 16.8 / 24.9 | 6.5 / 14.8 / 22.8 | 7.6 / 17.5 / 26.0 | 3.6 / 17.0 / 25.2 | 38 |

Nobody reaches 40 in any row. (First reaches 25 late in A, B and D because `adept` is the account's once Second has 25 on day 1.7: First's combat road then carries only arachnophobia and grand_master.)

**A gathering role at 40** (the layer): row A: Third alchemy day 5.8, Fourth mining 9.6, Second woodcutting 9.8, First fishing 15.7 — Fifth (mining) never: it spends its hours on combat, the only fighter that reaches 35; First's and Fourth's second and third lanes never (one specialist a lane gets there). B: 10.3, 12.4, 13.8, 15.9, Fifth 15.3. C: 5.8, 10.6, 10.9, 16.5, Fifth 9.7. D: 17.3, —, 18.0, 16.8, Fifth 11.2.

**Open points at the deadline** (rows A–C the same; D: the_reaper done, gear 12): another layer 67 · an event 35 · gear, no safe win within ten levels 15 (cultist_purifier, cursed_wood_blessed_victory, grand_master, king_of_the_goblins, loktar_ogar, the_reaper) · use 10 · unhandled 10 · a raid 8 · filler not reached 6 · a group 3 — the list of report 009, point for point.

**Row C against report 009: 56 = 56, and that is the answer, not a miss.** Rows A, B and C complete the same 25 achievements; the other 154 points wait for a layer, an event, gear above the wall, `use`, a raid, a group or are unhandled — every one of them already open in report 009's row A at 56. So sections 3 and 4 cannot add points to C; they move days and cost: in C against 009's A, ecologist 24.5 (34.6), tasks_coins_fan 36.9 (46.9), pearl_fisher 55.8 (65.9), arachnophobia 11.4 (7.7), combat 35 on days 16.8–26.2 (22.8–31.0); 31 gear pieces against 67; supply 1.0% of the hours against 1.4%. C's 57.7% fallback is the hours a free-potion fleet has nothing that scores (009's A: 47.4%). The model's ceiling is 56 + 3 for "a win is enough" (D: the_reaper on day 17.1) until keys, tolls and events.

**Row A, per fighter at combat 25, 28, 30 and 35** (or where it ends; the pick, kill seconds as the planner prices them, the potions a fight drinks and their share of the kill; the next monster up it does not win safely and what flips it — `piecesFor`):

| fighter | 25 | 28 | 30 | 35 / the end |
|---|---|---|---|---|
| First | pig 94 s, no potion; next cyclops (25): nothing craftable | pig 94 s, no potion; cyclops: nothing | **imp 3,739 s, 14 minor health = 93%**; death knight (28): nothing | 33: vampire 1,398 s, 5 minor health = 89%; cyclops: nothing |
| Second | pig 101 s, no potion; ogre (20): nothing craftable | pig 104 s; cyclops: nothing | imp 3,736 s, 14 minor health = 93%; death knight: nothing | 34: rat 1,391 s, 5 minor health = 89% |
| Third | pig 110 s; spider (20): magic wizard hat + skeleton armor + snakeskin legs + hard leather boots in 22 h | pig 94 s; cyclops: nothing | imp 3,729 s, 14 minor health = 93% | 34: rat 1,395 s, 5 = 89% |
| Fourth | pig 120 s; ogre: nothing | pig 117 s; cyclops: nothing | imp 3,736 s, 14 minor health = 93% | 34: rat 1,639 s, 6 = 91% |
| Fifth | pig 107 s; spider: magic wizard hat in 7.2 h | pig 104 s; cyclops: nothing | imp 3,468 s, 13 minor health = 93% | 35: imp 3,489 s, 13 = 93%; death knight: nothing |

**Gear (section 4)**: pieces made in the first eight days / to the deadline, against report 009's 67 (row A) — A 23 / 51, B 30 / 49, C 30 / 31, D 32 / 43; supply 197 / 145 / 110 / 187 character-hours. By the work they were made for, row A: the combat road 31, arachnophobia_conquered (spiders) 19, i_want_bacon 1; C: 27, 3, 1; D: 35, 2, and the_reaper 6. In report 009's 67, eight of the nineteen codes were asked (also) for The Reaper, I want bacon or Highway Patrol, and 19 pieces for arachnophobia; row A has one piece for any of the first three. The 19 for arachnophobia in A are one need at a time whose holder moves (Fifth on day 2.7; Second, First, Third and Fourth on days 17.9–20.8) because a piece made for one fighter is worn by whichever fighter starts a fight step first — the parked "a made piece in every fighter's pool" (row A's "not worn within a day": 15 lines, 5 of them "worn by" another fighter) — not the count of section 4.

**Does combat stall near 28–30 for want of cheap potions, or was that the count?**
1. Not the count: report 010's 6 a pig fight was the snapshot's set (section 2); at 30 the forecast's 11–14 an imp fight agrees with Monte Carlo (11 against 11.27).
2. It stalls, at 29–30, for the price: the pig stops giving XP at a 10-level gap, and the safe XP monsters left (imp 28, vampire 24, rat 25) are safe only with 5–14 minor health potions a fight — 89–93% of the kill's price; nothing craftable flips the next ones (cyclops, death knight).
3. By the price: combat 30 on days 41–64 (A), 35–57 (B), 13–22 (C); 35 on day 96 for Fifth alone (A), 66–94 (B), 17–26 (C); the gear wall at 38 only with free potions.
4. The minor health potion is 150 of its 192 s algae priced as a fishing gather — the bank holds 2,099 algae and the replay's fishing objectives make about 6,400 more on the way: whether a by-product counts is the lever, the planning chat's (settled point 3).
5. Events (the fighters at 30): days 41–64 at today's price, 13–22 with free potions (report 009: 15–23).
6. Layers (the gathering specialists at 40): days 5.8–15.7 for alchemy, mining, woodcutting and fishing in row A — not held up by potions (C: 5.8–16.5); only Fifth's mining waits, for combat. Keys and tolls (012) are not later than decision 26 assumed (about day 14).

## What was done / files
**Section 2 — what a fight drinks** (verdict (c): no change to `src/sim/combat.ts`, `src/sim/types.ts`, `src/plan/bis.ts`)
- `src/sim/validate.ts:42-46` `Deviation.predPotions` / `actualPotions` (optional: old entries load); `:77` `recordFight(prev, monster, fight, after?)`; `:99-100` set on a fight with a potion worn; `:117-128` `potionsDrunk` (per utility slot: the stack before minus the echoed stack, an emptied slot = all of it); `:142-146` `SimAccuracy.potionFights`, `medianPotionErr` (signed); `:165-166`, `:178-179` the aggregate.
- `src/state/apply.ts:46` the one call passes the echoed character (`characters.value[name]`, already folded two lines up).
- `scripts/check-planner.mts`: `REAL_SETS`, `PIG_LOG`, `LOG_PIECES`, `realWorld` (`:65-97`; `LOG_LEVELS` to the log's 19:21 UTC); `drinkTable` (`:816`), `potionTable` with before and after worlds (`:787`), `fieldOf` / `BYPRODUCT_POTIONS` (`:164-180`), `byproductTable` (`:846`), the by-products a replay step makes on the way (`:259-266`); the fight-record case (`:636`).

**Section 3 — filler before a road that does not fit**
- `src/plan/planner/decide.ts:286-303` the order of settled point 1 (`top` per tier: first by fit, first by points per hour, real that fits, filler that fits, real by points per hour, filler by points per hour, fallback); a filler chosen while a real candidate has points per hour says "filler (nothing else fits the deadline)" (`:300`); the header's rules 4 and 5 (`:6-11`).
- The order restated elsewhere, now following: `scripts/check-planner.mts` invariant 6 (`:107`, `:210-218`: a filler only when no real candidate fits, and by points per hour only when nothing real scores; a real step by points per hour only when no filler fits, unless it is on `config.first`; the fallback only when nothing scores); comments in `src/plan/planner/bundle.ts:97` and `types.ts:80`. `forward.ts` does not restate it (its `waitingOf` label "filler not reached" is unchanged).
- Made-up cases (`scripts/check-planner.mts:620-634`; grand_master and ecologist open, the deadline 300 h away): Second takes the filler ("filler (nothing else fits the deadline): Ecologist …") while `lvl:combat:25` has fit 0 and points per hour > 0; the filler blocked → "level: combat 22 → 50 … (nothing fits the deadline: points per hour)"; 100,000 coal on `config.first` → the coal, by points per hour, before the fitting filler.

**Section 4 — an objective is the fleet's work**
- `src/plan/planner/gear.ts:176-191` `gearNeeds(world, name)` (the deciding character: its own `current` is the step it just finished; memo per World and name), `gMin` per character; `:274-297` work (b): `left` less the others' running steps on the target (`:275`, as `rank()`'s `inFlight`); `H0` the least hours among the characters that are on, meet the other gates and win safely (`:282-284`); a need of X when `G + H1(X) ≤ 0.85 × H0`; one need per objective, the least `G + H1`, ties to the name (`:285-296`); the score's other hours = the achievement's other objectives (`:292`). Header `:5-12`. Work (a) unchanged.
- `src/plan/planner/decide.ts:223` passes the name; `:224-243` a `gear:` step's why names each copy's character with its own work ("Steel Battleaxe ×2 for Fifth (i_want_bacon (pig)), Second (combat 22 → 25) — the best: …"), so a kill objective is named beside one character only (acceptance step 7).
- **Work (c), the tool for an open gathering objective**: the same fault in structure — per role holder, `H0` is its own hours for all that is left (`gear.ts:246-270`, `:266`), so one objective can ask a tool of each holder. The replay's count: **0** in all four rows (the check now records it, `scripts/check-planner.mts:273-276`, printed `:743`). Not the same three lines (it needs the fleet's `H0` over the holders, the in-flight units and the one-need rule) → "Notes".
- **`supply.ts`**: an objective's materials are counted **once per objective**, not per character: `objectiveParents` (`src/plan/planner/supply.ts:167-180`) opens `per × t.left` (`:171`) from the deciding character's view, `supplyNeeds` shares one virtual bank over all parents and subtracts the others' supply steps in flight (`:187-199`). Not the same fault; a smaller one in "Notes" (an objective's own craft step in flight is not subtracted from `left`). A gear piece's parent is the sum of its copies less the `gear:` steps in flight (`decide.ts:238`).
- Made-up cases (`scripts/check-planner.mts:598-618`; Fifth and its twin Fourth in armour without a weapon, ten kills of the wolf an iron sword flips): Fourth wears the sword → no need for Fifth; nobody wins → one need, Fifth's (the tie, by name), H0 ∞; Fourth's step of ten kills in flight → no need.
- **Every need, before (`93790c7`'s `gear.ts`, run from a `git archive` copy in scratch) and after** (`npm run check -- planner`, "Gear by need"):

  | world | before | after |
  |---|---|---|
  | the 2026-11-18 snapshot | Second combat 22 → 25: battlestaff + air ring ×2 (H0 55 h, H1 43 h, G 1.1 h) · Third and Fifth combat 20 → 25: battlestaff + iron shield + iron boots + air ring ×2 (82 / 60 / 1.2 h) · Fourth combat 21 → 25: battlestaff + air ring ×2 (69 / 54 / 1.1 h) · **Third and Fifth highway_patrol: battlestaff + iron shield + iron boots + air ring ×2, H0 13 h (their own), H1 9.4 h, G 1.2 h** | the four road needs, the same · **no highway_patrol need**: the fleet's H0 is First's 12.4 h (111 s a kill × 401) and 1.2 + 9.4 > 0.85 × 12.4 |
  | the same, once First has started Tanner's Exchange (the first week's second decision) | – | one need, for First: highway_patrol, battlestaff, H0 12.3 h, H1 9.4 h, G 1.0 h |
  | the fleet at 19:21 UTC (the sets the log shows, the four pieces crafted since in the bank, `LOG_LEVELS`) | none | none (every fighter wins pigs and skeletons safely with the bank's pieces; the made pieces are in every pool — the parked rule) |

**Section 5 — the replay**
- `src/plan/planner/types.ts:88` `PlannerConfig.potionK`; `config.ts:40-43` its default 1 and what it is for; `reach.ts:197-209` `potionPrice(world)` (undefined at 1: every call takes `bis.ts`'s default), passed to both solves (`:215`, `:238`, `potionK` in their cache keys) and to every `killSeconds` of the core (`cost.ts:71`, `:193`; `gear.ts:72`; `supply.ts:47`). `potionSec` and `fieldSec` untouched.
- `scripts/check-planner.mts`: rows A–D (`:345-349`); the row's price in the potion share (`verify`); hours by answer (`:729`); a gathering role at 40 (`:741`); gear made in eight days / to the deadline and supply hours (`:742`); work (c)'s count (`:743`); row A's by-products and each fighter at 25 / 28 / 30 / 35 (`levelLine`, `:309`; `:746-753`); "filler not reached" in points (`:762`); each child row its own storage file (`:688`; without it the fight-record case's write locks the shared SQLite file and rows B–D die at start — the first run did).

**`CLAUDE.md`**: the gear-model paragraph (the `killSeconds` of task 010 and the forecast-sized brew batch, `BREW_MAX`), and the planner's section (rule 4's order, work (b), a calibration bullet, the check's prints).

**Commands run**
- `git add docs/rework.md; git commit -m "Rework notes"` first (`5a60dae`); at the end the task commit. `docs/rework.md` did not change again.
- `npm run typecheck` (several times; final clean); `npm run check -- planner` (three runs: the first failed on the storage lock of rows B–D, the second green, the third on the final code — `OK (401775 invariant checks, 24 made-up cases; deadline points 56 / 56 / 56 / 59)`, 377.7 s); `npm run check` (final: `52 checks: 51 ok, 1 known defect reproduced, 0 failed — 67.2 s`; `check-planner` 66.7 s, `OK (10823 invariant checks, 24 made-up cases)`); single runs of `scripts/check-planner.mts` with scratch storage.
- `npx vite build --outDir <scratch>/ammo-011-dist --emptyOutDir`, then deleted: `index.html 0.40 kB`, `assets/index-Dc_NjE2T.css 37.23 kB`, `assets/index-DjSlLPsS.js 394.93 kB │ gzip: 133.24 kB`, `✓ built in 1.62s`.
- Scratch (all deleted): the log readers (`node` + `readline` over `logs/dev.log`: line kinds, a grep by time window, the potion timeline per character, the levels and pieces since the snapshot); the simulator probes (the sets worn and report 010's sets against pigs in the three modes; imp, vampire and rat at 30–34); the needs printer run on a `git archive HEAD` copy and on the working tree; `rank()` probes for section 3's world. A background agent read section 1 (stream reads only). No request to the game, no `.env`, no `.ammo/*`; no service started, stopped or called. The check run I stopped to re-run on the final code left seven node children; I stopped those by process id (their command lines were the check's) and removed their temp folder — the service's three processes were not touched.

## Notes
**Defects noticed and not touched**
- **Work (c) has section 4's fault in structure**: a tool for an open gathering objective is judged per role holder on its own hours for everything left (`src/plan/planner/gear.ts:246-270`), so one objective can ask a tool of each of three miners. The replay never triggered it (0 in all rows); the fix is the shape of work (b), not three lines.
- **An objective's own craft step in flight is not subtracted from its demand**: `objectiveParents` opens `per × t.left` (`src/plan/planner/supply.ts:171`) while `available()` already leaves out the materials that step reserved (`stock.ts:43-46`): the shortfall is over-counted by one step's materials while it runs.
- **A made piece goes to whoever resets first** (parked, settled point 7) — now the larger part of the duplicate gear: row A's 19 pieces for Arachnophobia Conquered are one need at a time whose holder moves as the pieces wander (`scripts/check-planner.mts` prints the "worn by" lines); live, the boots and helmet made at 17:49–17:50 for Third, Fourth and First went to Second's slimes, First's ash wood and Fourth's flying snakes.
- **The diamond chain** (section 1): the node of a `src:` gather is the least `gatherSec × rate` for everyone (`src/plan/planner/targets.ts:71`, `:80`) — copper, 0 mining XP, ore nobody asks for; coal drops the stone at the same rate with 2,060 XP an hour and the steel chains' coal. And the parent's own gate (the diamond recipe wants mining 35, the miners are at 22–24) is neither tested nor priced in `objectiveParents` (`supply.ts:167-180`): four characters gather stones for a craft nobody can make yet.
- **The fight-XP formula reads about two thirds of the real XP** (section 1: skeleton at combat 23, 24 by `fightXp` — the × 0.7 for a 5-level gap — against 38 real before the favor; `src/plan/xp.ts:61-66`): every XP-per-hour pick and level estimate leans on it. The skeleton's kill price ran at 2.1–2.4× the log (127–143 s against 59–67 s) and a craft step at 2.6–4.6× (5 s against 13–23 s).
- **Banked potions ride on fights that do not need them**: Second wore Fifth's 16 small health potions on blue slimes (17:58:33), Fourth on flying snakes (18:21:26), none drunk — the solver's "fills a slot" tie-break adds a potion that is used 0 times (also seen in the scratch probe: pig at 25 with two potions, 0 used). Harmless while none is drunk; the stack leaves the bank.
- **The model still cannot say which side strikes first**: the API's characters carry `initiative` 100, the simulator starts the player at 0 (parked since report 002). Section 2's numbers do not settle it; the new record's turn and potion errors will.
- The deposit→restock bounce of cooked beef at a fight→fight step boundary (18:20:22 → 18:21:10, 18:39:21 → 18:39:34, 19:03:27 → 19:03:43); the harness's bounce check looks only at withdraw→deposit.
- Two monster events spawned (18:12:42, 18:52:47) with no `interrupt event` and nothing in the log to say why (`src/state/eventorders.ts:84` writes "nothing to do" to `eventPlans` only).
- The offering hunt lost 10 of 164 fights on 11-19 (Fourth 5 of 41, 12%): under the "one in five" of settled point 5.
- `scripts/check-planner.mts`'s replay rows shared the parent's storage file; the new fight-record case wrote to it and SQLite locked the children out — fixed in the check (each row its own file), noted because any future write in the parent would have hit the same.

**Guesses in the numbers, most doubtful first**
1. The hidden slots of the sets worn (ring2 and the amulet, cut at 200 characters): filled with the pieces seen last; they move a fight's count by up to 0.4 (Second: earth ring 4.05, life ring 3.72 by Monte Carlo).
2. The log's bounds assume a stack was refilled exactly when its slot emptied (the differ's rule) and that every fight between two refills drank from it.
3. `potionK` as a pure price factor: rows B and C price potions at half and nothing but keep the same stock model (none — the forward model keeps no potion stock), so C is "potions cost nothing", not "potions are banked".
4. The "fleet at 19:21 UTC": combat levels from the snapshot's XP plus the logged XP, the pig sets of 13:43–14:57 worn, the four pieces crafted since put in the bank (who wears them at the end is in section 1, not in that world).
5. By-product = a monster's drop or a node's 1-in-N drop (an algae from fishing, a slimeball, a milk bucket, an egg, a coconut).
6. Monte Carlo over 4,000 fights with a seeded generator (the check's numbers repeat); the scratch probes used 20,000.

## To delete (Alex)
Nothing. The scratch scripts, probes, the `git archive` copy and the scratch build are deleted.
