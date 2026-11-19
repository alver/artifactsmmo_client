# 010 — The live round: what a potion costs, a brake per target, offerings that catch up, the first hours read — report

## Summary
- **The log says potions are the dearest thing in real play — and that the chains' first gear takes them away.** Under 009's core (14:57:11 → 16:22:26 UTC) Second, Third and Fifth were on the pig steps 008's core had picked: potion making took 32%, 35% and 55% of their time; a batch of 16 small health potions lasted 3–6 fights, and at a step's tail batches shrank to 2–4 potions an expedition. The chains ran (hard leather trades, steel bars, ash wood, iron ore), and from 15:50 the first pieces were made — 2 steel battleaxes, 2 hard leather helmets, 3 pants, all "for First … Fifth — The Reaper" (a shared objective counted whole); wearing them, Second fought 22 pigs without a brew. Nothing was blocked, braked, stalled or lost; no offering had run on 11-19.
- **At 16:22:33 UTC the service was restarted** (a clean `prod` start, no crash before it; not by me — I start no service). `npm start` runs the engine from `src/`, so since then it runs **this task's code** (every source file of this commit was last written by 15:29 UTC). Its first visible act: the offerings catch-up — five `interrupt offering` lines at 16:22:34, five combat offerings accepted, one completed by 16:38 — and three skeleton fights lost while hunting skeleton bones for it (16:35–16:38), because the offering item hunts by an expected win, not a safe one (an older defect, now exercised).
- **Deadline points: 49 / 49 / 49 / 52 against 56 / 56 / 56 / 59.** With a potion priced at what making another takes, the replay's fighters past ~28 are safe only with potions (an imp at combat 35: about 3,700 s a kill), 87% of all fight hours are potion making, and combat levelling — a road that fits no deadline but still "scores" — now runs all season ahead of the filler. The 7 points lost are exactly the filler of 009's row A (ecologist, tasks_coins_fan, pearl_fisher).
- On the fleet, the honest price moves Second, Third, Fourth and Fifth from potion pigs to potion-free highwaymen (622–653 XP/h estimated, against 250–257 for pigs with 6 potions a fight); First keeps potion-free pigs.
- The brake is per target, the offerings trigger is the planner's per character and day and catches up, the panel's buttons issue the interrupt and show the bracket the item takes, a favor counts in the picks. `npm run check`: 52 checks, 51 ok, `repeat-spin` known.

## Decisions for Alex
None. One thing to know: the replay's −7 points are not a cost of this task's price but of rule 4 meeting it — an unfittable road (combat to 50 for `grand_master`) outranks every filler (`src/plan/planner/decide.ts:288-291`). That is the planning chat's to settle (see "Notes"); it does not matter for the service now running this code (restarted at 16:22 UTC), because in real play no fighter is near the levels where it bites (the fleet is at combat 21–22).

## How Alex verifies
1. `git log --oneline -3` → `010: live round`, then `Rework notes`, then `009: planner core, second round`; `git status` clean.
2. `npm run check` → `52 checks: 51 ok, 1 known defect reproduced, 0 failed` (the 50 of report 009 plus `planner-brake-target` and `planner-offering-catchup`); `check-planner` ends `OK (11393 invariant checks, 17 made-up cases)`.
3. `npm run check -- planner` → about 6.5 minutes; ends `OK (422911 invariant checks, 17 made-up cases; deadline points 49 / 49 / 49 / 52)`; prints, after the "safe" tables, `## What a potion costs` twice (the snapshot, then the fleet at the log's levels), and in every replay row a line `potion making (task 010): … fight hours, …%`. The made-up worlds print the two traps of `bis.ts`'s header, before and after.
4. `npm run typecheck` prints nothing after `tsc --noEmit`; the scratch build succeeded (see "Commands run").
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → the files listed under "What was done / files"; three existing scenarios changed are explained there.
7. **After the restart** — it already happened, at 16:22:33 UTC (see "Summary"); this code runs since. Seen by me in `logs/dev.log`: five `interrupt offering — Today's seasonal offerings` lines at 16:22:34 (the catch-up for 11-19; the old marker held 11-19 00:05, so the old code would have issued none). **Not yet checkable when I stopped reading (16:43 UTC — every fighter was still in the offering):** within an hour of the offering's end, no `gather Sunflower n/m` note under a `Fight` head unless the step's `why` names a monster that is safe only with the potion (expected from the table below: Second–Fifth on potion-free highwaymen unless an objective names pigs or skeletons, First on potion-free pigs); `flapping` lines name one target each; at 00:05 UTC of 11-20 five `interrupt offering` lines.

I ran 2–5 myself on the final code; 1 and 6 after the commits.

## The first hours
Read as a stream from `logs/dev.log` (61 MB, never copied), by a scratch script, to its last line at 16:43:42 UTC (I waited 50 minutes for more of it). Three runs: **009's core, `[fhnz]` 14:57:11 → 16:22:26 UTC (1.4 h)**; **this task's code, `[ca7c]` 16:22:33 → 16:43:42 (0.35 h)** — the service was restarted then (see "Summary"); and, for the record, **008's core, `[9f2v]` 09:15:44 → 14:57:11 (5.7 h)**.

### Steps per character
**009's core.** The restart re-attached all five steps (14:57:12: `lvl:combat:25` on pigs for First, Second, Third, Fifth — decided by 008's core at 14:10, 13:57, 13:43, 13:51 — and Fourth's `ach:intermediate_miner:0@Fourth#3`), so the first decisions of 009's core came only when a step ended:

| character | 009's core (14:57–16:22): time, key, answer, units planned/done, hours planned/taken |
|---|---|
| First | (the pig step of 14:10 until 15:09: sample `kill:pig` 95 s) · 15:09:19 `mat:hard_leather` ×2, supply (a trade), 43/43, 0.00/0.05 h · 15:12:16 `mat:steel_bar`, supply, 3/3, 0.00/0.05 h · 15:15:11 `mat:hard_leather`, supply, 7/7, 0.00/0.01 h · 15:16:03 `src:ash_wood`, supply, 120/120, 0.80/0.90 h · 16:10:07 `src:ash_wood#2`, supply, 200 planned, 1.40 h (re-attached at 16:22, then the offering) |
| Second | (the pig step of 13:57 until 15:47: sample `kill:pig` 179 s) · 15:47:31 `gear:steel_battleaxe`, supply, 2/2, 0.00/0.06 h · 15:51:13 `ach:i_want_bacon:0`, objective (pigs), 46 planned, 22 done by 16:22 (141 s a kill, all in, no brew) |
| Third | (the pig step of 13:43 until 15:55: sample `kill:pig` 214 s) · 15:55:32 `gear:hard_leather_helmet`, supply, 2/2, 0.00/0.06 h · 15:59:04 `gear:hard_leather_pants`, supply, 3/3, 0.00/0.02 h · 16:00:07 `src:iron_ore`, supply, 66 planned, 0.50 h (44 done by 16:43, the offering between) |
| Fourth | (coal until 15:29: Intermediate Miner completed, sample `gather:coal_rocks` 35 s) · 15:29:39 `src:iron_ore`, supply, 102/102, 0.80/1.22 h (the offering inside) |
| Fifth | (the pig step of 13:51 until 16:02: sample `kill:pig` 212 s) · 16:02:55 `ach:the_reaper:0`, objective (skeletons), 42 planned, 2 done by 16:22 |

Every supply step names its parent: hard leather helmets and pants and a steel battleaxe, all for The Reaper (skeletons), "H0 ∞ h, with it 4.8–5.4 h" — gear that makes the skeleton a safe win. **This task's code** (16:22–16:43) made no decision yet: the restart re-attached all five steps (16:22:34) and the offering interrupts went ahead of them.

**008's core** (runs condensed; units planned/done; hours planned/taken):

| character | steps |
|---|---|
| First | 09:25 Highway Patrol ×2, 96/96 kills, 2.3/1.65 h · 11:04 Intermediate Miner ×3, 315/315 coal, 2.9/3.1 h · 14:10 `lvl:combat:25` (pig), 37 planned, 29 done by 14:57 |
| Second | 09:25 Highway Patrol ×2, 64/64, 2.0/1.12 h · 10:33 `lvl:combat:25` (highwayman), 80/80, 1.5/1.75 h · 12:17 Intermediate Miner, 162/162, 1.5/1.65 h · 13:57 `lvl:combat:25` (pig), 25 done by 14:57 (144 s a kill, all in) |
| Third | 09:25 Highway Patrol, 45/45, 1.5/1.15 h · 10:34 Intermediate Miner ×2, 324/324, 3.0/3.14 h · 13:43 `lvl:combat:25` (pig), 25 done by 14:57 (177 s a kill, all in) |
| Fourth | 09:25 Highway Patrol ×2, 84/84, 2.2/1.79 h · 11:13 Intermediate Miner ×3, 436 planned, 379 done by 14:57 |
| Fifth | 09:16 Tanner's Exchange 1/1 (0.02 h) · 09:17 Highway Patrol ×3, 90/90, 2.7/1.89 h · 11:10 Intermediate Miner ×2, 273/273, 2.6/2.69 h · 13:51 `lvl:combat:25` (pig), 23 done by 14:57 (171 s a kill, all in) |

Every highwayman step finished early (1.1–1.9 h for 1.5–2.7 h planned), every coal step on time. The four pig steps of 13:43–14:10 are the steps 009's core inherited.

### Samples, sorted by measured ÷ estimate
| time | who | key | measured | estimate | × |
|---|---|---|---|---|---|
| 16:02:55 | Fifth | `kill:pig` | 212 s | 104 s | **2.04** (n=4) |
| 15:55:32 | Third | `kill:pig` | 214 s | 107 s | **2.00** (n=3) |
| 15:47:31 | Second | `kill:pig` | 179 s | 147 s | 1.22 (n=2) |
| 13:57:02 | Second | `gather:coal_rocks` | 37 s | 33 s | 1.12 (n=7) |
| 13:51:35, 14:11:04 | Fifth, Fourth | `gather:coal_rocks` | 36 s | 33 s | 1.09 (n=6, 9) |
| 16:10:06 | First | `gather:ash_tree` | 27 s | 25 s | 1.08 (n=1) |
| 12:09:16 – 15:29:39 | Third, First, Fifth, Fourth, Third, First, Fourth | `gather:coal_rocks` | 35 s | 33 s | 1.06 (n=1–5, 8, 10) |
| 10:34:41 | Third | `kill:highwayman` | 92 s | 113 s | 0.81 (n=6) |
| 11:10:21 | Fifth | `kill:highwayman` | 83 s | 108 s | 0.77 (n=9) |
| 11:13:12 | Fourth | `kill:highwayman` | 84 s | 111 s | 0.76 (n=10) |
| 12:17:46 | Second | `kill:highwayman` | 79 s | 108 s | 0.73 (n=11) |
| 10:40:04 | Fifth | `kill:highwayman` | 79 s | 111 s | 0.71 (n=7) |
| 10:33:03 | Second | `kill:highwayman` | 69 s | 111 s | 0.62 (n=5) |
| 15:09:18 | First | `kill:pig` | 95 s | 156 s | 0.61 (n=1, no potion) |
| 10:18:32 | Fourth | `kill:highwayman` | 70 s | 120 s | 0.58 (n=4) |
| 10:16:35, 10:08:15 | First, Fifth | `kill:highwayman` | 62 s, 67 s | 111 s, 120 s | 0.56 (n=3, 1) |
| 10:15:47, 11:04:44 | Second, First | `kill:highwayman` | 61 s | 111 s | 0.55 (n=2, 8) |

Highwayman kills ran at 0.55–0.81 of the estimate (the log factor 1.3 is too high for them), coal at 1.06–1.12; **a pig kill with potions ran at twice the old estimate** (179–214 s all in, brewing included, against 104–147 s priced with a potion at the rest its heal buys). **No `slower than expected`** in any run: the line fires on the exponential mean, which had not yet passed 2×.

### Every notable line
| time | line | verdict |
|---|---|---|
| 09:16:13 | Fifth `took over — dropped [wmgrrihk] Move to (8, 6)` | as designed (the switch-on of 008) |
| 09:17:14, 09:17:37 | `completed tanners_exchange (+2)`; `claim Fifth: … 10× vermin_leather` | as designed |
| 11:04:44, 11:05:44 | `completed highway_patrol (+2)`; `claim Fifth: … 12× green_cloth` | as designed |
| 14:57:12 | `re-attached` ×5 (the four pig steps, Fourth's coal) | as designed |
| 15:29:39 | `plan: completed intermediate_miner (+1)` | as designed |
| 16:22:33 | `[ca7c] server start (prod) on :5173`; the last line of `[fhnz]` is 16:22:26, nothing between | a restart (not a crash, not mine); it loaded this task's code |
| 16:22:34 | `re-attached` ×5 (First `src:ash_wood#2`, Second `ach:i_want_bacon:0`, Third and Fourth `src:iron_ore`, Fifth `ach:the_reaper:0`) | as designed |
| 16:22:34 | `interrupt offering — Today's seasonal offerings` ×5 | as designed: this task's catch-up (the old marker held 11-19 00:05) |
| 16:23:48, 16:24:31 | Fourth: "skipped today's jewelrycrafting offering — can't get 1× Ring of Chance or any lower bracket's item"; Second: the same for weaponcrafting, 1× Steel Axe | as designed (no completable bracket; decision 24) |
| 16:24:02, 16:24:21 | Third, Fourth: `withdraw skeleton_bone` → 404, "bank changed — replanning" | as designed (five characters raced for the bank's few bones) |
| 16:24:08 | First: `unequip` → 483 (HP too low) | as designed (heal, retry) |
| 16:35:42, 16:37:21, 16:38:53 | First, Third, Fourth: `fight loss` on skeletons while hunting bones for the offering, then "lost a fight — healing and retrying" | **a defect** (not this task's): the offering item hunts by an expected win (`canObtainOffering` → `canBeat`, `src/state/queue.ts:693`, `:1357`), not a safe one — the skeleton is "win, not safe" |
| 16:38:30 | Second: `completed combat offering · +2550 xp` | as designed |

No `blocked`, `flapping`, `no step`, `defect`, `queue found stopped` or `interrupt removed` in any run; no `not a safe win`, no `lost 2 fights in a row`, no queue paused.

### The chains
Every `src:`, `mat:` and `gear:` step (the model's time: 5 s a craft or a trade, a gather or kill chunk at its estimate):

| start | who | step | units | model / real | for |
|---|---|---|---|---|---|
| 15:09:19 | First | `mat:hard_leather#1` (trade) | 35/35 | 5 s / 124 s | Hard Leather Helmet for Second |
| 15:11:24 | First | `mat:hard_leather#2` | 8/8 | 5 s / 52 s | Hard Leather Pants for Third |
| 15:12:16 | First | `mat:steel_bar` | 3/3 | 15 s / 175 s | Hard Leather Pants for Third |
| 15:15:11 | First | `mat:hard_leather` | 7/7 | 5 s / 52 s | Hard Leather Pants for Third |
| 15:16:03 | First | `src:ash_wood#1` | 120/120 | 2,880 s / 3,244 s | Hard Leather Helmet for Third |
| 16:10:07 | First | `src:ash_wood#2` | 200 planned | 5,040 s / running | Hard Leather Helmet for First |
| 15:29:39 | Fourth | `src:iron_ore` | 102/102 | 2,880 s / 4,389 s (an offering inside) | Hard Leather Pants for Third |
| 15:47:31 | Second | `gear:steel_battleaxe` | 2/2 | 10 s / 222 s | "×5 for First, Second, Third, Fourth, Fifth — the_reaper: H0 ∞ h, with it 4.8 h" |
| 15:55:32 | Third | `gear:hard_leather_helmet` | 2/2 | 10 s / 212 s | "×4 for First, Second, Fourth, Fifth — the_reaper" |
| 15:59:04 | Third | `gear:hard_leather_pants` | 3/3 | 15 s / 62 s | "×5 for First … Fifth — the_reaper" |
| 16:00:07 | Third | `src:iron_ore` | 66 planned, 44 by 16:43 | 1,800 s / running | Steel Battleaxe for Third |

A craft or trade step is 1–3 minutes in real play against the model's 5–15 s (each is a bank reset, a walk and a deposit); a gather chunk ran 1.1–1.5× its estimate. **Pieces made and their first wearer** (equip lines are cut at 200 characters, so a later wearer can be missed): 15:50:41 Second crafts 2 steel battleaxes → Second equips one at 15:52:12 (1.5 min later); 15:58:38 Third crafts 2 hard leather helmets → Second at 16:00:42 (2.1 min); 15:59:35 Third crafts 3 hard leather pants → Second at 16:00:42 (1.1 min). A helmet asked for First, Second, Fourth and Fifth went to Second first — report 009's "silly thing" 1 (a made piece is in every fighter's pool). **No step ended empty because another character took its materials**; the only raced withdrawals are the offering's skeleton bones (above).

### Fights
| character | monster | 09:15–14:57 (008) | 14:57–16:22 (009) | 16:22–16:43 (010) | lost |
|---|---|---|---|---|---|
| First | highwayman · pig · skeleton (offering) | 96 · 29 · – | – · 8 · – | – · – · 8 | 1 skeleton, 16:35:42 |
| Second | highwayman · pig · skeleton (offering) | 144 · 25 · – | – · 34 · – | – · 2 · 14 | 0 |
| Third | highwayman · pig · skeleton (offering) | 45 · 25 · – | – · 13 · – | – · – · 9 | 1 skeleton, 16:37:21 |
| Fourth | highwayman · skeleton (offering) | 84 · – | – · – | – · 9 | 1 skeleton, 16:38:53 |
| Fifth | highwayman · pig · skeleton (The Reaper) · skeleton (offering) | 90 · 23 · – · – | – · 14 · 2 · – | – · – · – · 1 | 0 |

Until 16:22 no fight was lost; the three losses since are the offering's skeleton hunts (41 fights). No `not a safe win`, no `lost 2 fights in a row`. Fifth's two skeleton fights for The Reaper (a planned step, so a safe win by the planner's solve with the new pieces) were won.

### Where the time went
Every gap between two successful actions of a character is given to the first one's kind, up to that kind's own cooldown (fight 180 s, gather 70 s, move 90 s, rest by the HP it restored, a craft 10 s a unit, a bank action or anything else 12 s); the rest of the gap is "standing". Potion time = every action while the character fills a potion expedition under a fight item (`gather X n/m`, `withdraw X`, `craft X` notes of `produceOnce`), food likewise (`eat`, `restock`, a cooked recipe), so the walks of an expedition count for it.

**009's core, 14:57 → 16:22** (1.4 h), and in brackets **this task's code, 16:22 → 16:43** (0.35 h, almost all of it the offering):

| | fight + rest | food | potions | walk + bank | crafting | own gathering | other | standing |
|---|---|---|---|---|---|---|---|---|
| First | 10.6% (44.7) | 2.4% (16.9) | 0 (0) | 8.9% (37.2) | 0.4% | 77.0% (0) | 0.3% (0.5) | 0.4% (0.6) |
| Second | 42.2% (55.7) | 5.9% (9.4) | **32.4%** (0) | 17.9% (29.3) | 0.3% | 0 | 0 (1.0) | 1.3% (4.5) |
| Third | 25.0% (54.0) | 0 (13.6) | **35.1%** (0) | 13.2% (27.7) | 0.6% | 25.0% (0) | 0 (0.4) | 1.1% (4.2) |
| Fourth | 0 (46.5) | 0 (18.7) | 0 (0) | 2.0% (32.5) | 0 | 98.0% (0) | 0 (0.5) | 0 (1.8) |
| Fifth | 19.5% (4.5) | 5.9% (61.1) | **55.4%** (0) | 18.6% (20.5) | 0 | 0 (13.5) | 0 (0.5) | 0.5% (0) |

**008's core, 09:15 → 14:57** (and, in brackets, its last hour 13:57–14:57, the pig hour):

| | fight + rest | food | potions | walk + bank | crafting | own gathering | other | standing |
|---|---|---|---|---|---|---|---|---|
| First | 30.0% | 5.1% | 0 | 5.3% | 0 | 53.4% | 0 | 6.2% |
| Second | 38.5% (39.9) | 4.7% (6.3) | 6.7% (**37.4**) | 8.5% (15.5) | 0 | 27.5% | 0 | 14.1% (0.8) |
| Third | 16.6% (54.4) | 0.2% | 7.4% (**35.7**) | 5.5% (8.9) | 0 | 54.7% | 0 | 15.7% (0.9) |
| Fourth | 20.4% | 2.1% | 0 | 5.5% | 0 | 64.1% | 0 | 7.9% |
| Fifth | 27.4% (43.9) | 4.1% (4.4) | 7.9% (**43.3**) | 8.7% (8.3) | 0 | 44.9% | 0.1% | 6.9% (0.2) |

**Potion batches** (a batch = one craft): 008's core, 13:45–14:57 — Second 5 batches, 80 potions, lasting 5, 5, 6, 5, 4 fights; Third 6, 96, 4, 4, 4, 5, 5, –; Fifth 5, 80, 4, 5, 4, 5, 5. 009's core, 14:57–16:22 — Second 5 batches, 26 potions (12, 6, 4, 2, 2) lasting 5, 3, 1, 1 fights, then **22 pig fights without a brew** once it wore the made pieces (15:52, 16:00); Third 4, 30 (12, 8, 6, 4), lasting 4, 3, 2, 3; Fifth 7, 58 (14, 10, 8, 4, 4, 2, 16), lasting 4, 3, 3, 1, 2, 3 — the last batch (16:21:37) for The Reaper's skeletons. The shrinking batches are the old rule `min(fights left, 15)` at a step's tail: an expedition of walks for 2 potions and one fight. No brew since 16:22. A full batch is 24 sunflowers at ~32.5 s (Second 14:36:40 → 14:50:42: 14 min for 16 potions, 52.6 s a potion with the walks and the craft); several batches of 008's period came from banked sunflowers (Second withdrew 24 at 14:29:00), so the pig hour shows 36–43% and not two thirds. The "standing" of 008's period is mostly the 13–16 network-error minutes of 09:00 and 13:00 and the coal steps' bank trips with a full bag.

### Offerings
**None on 11-19 until 16:22.** The last offering lines before are 11-18 00:05 (the old trigger; combat skipped for every character: "can't get 5× Demon Horn"). On 11-19 the only lines until 16:22 are five reads at 09:25:59 (`GET /my/<name>/offerings`, Alex opening the panel); no interrupt was issued — at 00:05 every queue stood stopped, `scheduleOfferings` skipped them and wrote the marker (decision 24). **At 16:22:34 this task's catch-up issued one interrupt per character** (`pl:int:offering:2026-11-19:0`): all five accepted the combat offering (`20261119_combat_10_20`, favor ×1.5 XP on skeletons; 16:23:23 Fifth, 16:23:24 Third, 16:23:42 Fourth, 16:24:03 First, 16:24:26 Second); the day's two skills were weaponcrafting and jewelrycrafting: their crafters skipped them with no completable bracket (Second: Steel Axe; Fourth: Ring of Chance), and the other three have no bracket there at skill 1–2 (decision 17), so their items have no work in them. Second completed its combat offering at 16:38:30 (+2,550 XP); the other four were still hunting skeleton bones at 16:43.

### Network errors
67 `network error — retry` lines since 09:15 (09h 19, 10h 8, 11h 12, 12h 1, 13h 16, 14h 6, 15h 5, 16h 0): 62 on actions (gathering 29, fight 14, use 9, rest 5, move 3, deposit 2), 5 on reads. Every one recovered at the first or second retry; no outage hold (`network trouble`), no pause, **no step lost**.

### The simulator's record (`src/sim/validate.ts`)
It keeps the last 200 single fights (`WINDOW`, `validate.ts:45`); for each, `recordFight` (called from `apply.ts:46` with the pre-fight character) re-runs `simulate` in expected mode on the worn set and records predicted against real win, turns and final HP (`validate.ts:71-106`); "mispredicted" counts `winMatch === false` (`:133`). Every queue fight is gated on the same forecast — `fightRound` refuses a predicted loss (`src/state/exec.ts:496`) — so a queue fight can only be mispredicted one way: **a predicted win that was lost.** The log has exactly that: the 200 fights before the fleet stopped on 11-18 (18:21:40 → 20:55:18 UTC; nothing fought until 11-19 09:25) are 159 skeletons and 41 cows, and **44 skeleton fights were lost** (Second 10, Third 11, Fourth 11, First 8, Fifth 4; first at 18:27:55, last at 20:55:18). Since 11-19 10:53 the window holds highwaymen and pigs only and **0 losses**, so the panel should now read 0. **It bears on "safe" directly**: the skeleton is the "win, not safe" monster of report 009's table (the pessimistic pass dies on turn 17) — an expected-mode win that the real fights lost 28% of the time (44 of 159). `config.risk: "safe"` keeps the planner off it.

### What the log says the next task should fix first
1. **Potion fights.** 32–55% of Second, Third and Fifth's time under 009's core was potion making for pigs they won safely only with 3–4 potions a fight; this task prices it (live since 16:22). The log's best evidence that it pays: made gear took Second off potions (22 pig fights, no brew).
2. **The offering item hunts by an expected win, not a safe one** (`canObtainOffering` → `canBeat`, `src/state/queue.ts:1357`, `:693`): 3 skeleton losses in 41 fights within 20 minutes of the catch-up. It should ask the planner's question (a safe win) before it accepts a fight bracket.
3. **A shared objective counted whole per fighter**, live: 5 steel battleaxes, 5 hard leather pants and 4 helmets asked for The Reaper (15:47–15:59), and the first copies worn by whoever reset first (Second).
4. **Brew batches that shrink at a step's tail** (Second 15:35, 15:40, 15:45: 4, 2, 2 potions, an expedition each for one fight): the old `min(fights left, 15)`; this task sizes the batch by the forecast, but a step's last fights still brew small.
5. **Tiny supply steps**: First's `mat:` steps of 15:09–15:16 took 52–175 s each for the model's 5–15 s; harmless under the per-target brake, but each is a bank reset.
Nothing else in the log asks for a fix: no block, no stall, no lost step; network errors all recovered at the first or second retry.

## What a potion costs
**What a fight consumes** (`FightForecast.used`, `src/sim/combat.ts:34-37`): a `restore` potion one unit per proc — the start of each own turn under half HP (`:299`); every other potion one unit a fight — a boost is applied once at the fight's start (`opening`, `:150`); an antidote is taken as one a fight too (a guess: the simulator does not count its procs). Two restore potions worn together fire together (their values are summed, `:205`). **`hpRestored` counted** the HP all restore procs put back (`restore` × procs, `:299`, `:452`); it stays on the forecast (the atlas scripts read it) but no longer prices anything.

**`potionSec(code)`** (`src/plan/xp.ts:101-112`, with `fieldSec` `:73-90`) — here because `xp.ts` already holds every per-action price (`gatherSec`, `CRAFT_SEC`, `FIGHT_SEC`) and both `bis.ts` and the planner's core import it without a cycle (`consumables.ts` imports `bis.ts`). A recipe: its ingredients' field seconds plus 5 s, over the recipe's quantity; an ingredient gathered = drop rate × the surest node's gather seconds (as `gatherPays`, `consumables.ts:109-116`, without the skill filter); dropped = rate × `FIGHT_SEC` (40 s, the measured fight figure of `xp.ts:71`); made by a craft = its own inputs one level deep plus 5 s. No recipe: the rest its heal buys (a floor). Per unit:

| potion | s per unit | the old price (rest of its heal) |
|---|---|---|
| small health (3 sunflowers → 2) | **47.5** (the log: 48.8 s of gathering, 52.6 s with walks and craft) | 6 |
| minor health | 191.5 (an algae is a 1-in-10 fishing drop: 300 s) | 14 |
| health / greater / enhanced health | 431.5 / 441.5 / 546 | 20 / 40 / 60 |
| air, earth, fire, water boost | 367.5 (a slimeball 1 in 10 at 40 s, an algae 300 s) | 0 |
| res potions (×4) | 672 | 0 |
| health boost / enhanced boost | 431.5 / 546 | 0 |
| small antidote / antidote / enhanced antidote | 412 / 729 / 956.5 | 0 |
| health splash / enhanced health splash | 206.5 / 826.5 | 0 |
| diabolic elixir (no recipe) | 0 (floor) | 0 |

**`killSeconds`** (`src/plan/bis.ts:73-80`) = the fight's cooldown + the rest for the HP missing at its end + Σ units used × `potionSec`. The header's point 3 is rewritten (`bis.ts:8-23`).

**The two traps, before and after** (`scripts/check-planner.mts:500-534`, kept as made-up cases; First stripped to level 10, 165 HP, against a cow):

| pool | before (a potion at its rest) | after (`potionSec`) |
|---|---|---|
| fire staff, iron sword, small health potions | iron sword + potion — safe, 18 turns, 4 potions, 74 s | iron sword + potion — safe, 18 turns, 4 potions, 240 s |
| iron sword, copper armor, small health potions | sword + **armor** + potion — safe, 4 potions, 74 s | sword + **armor** + potion — safe, 4 potions, 240 s |

The fire staff set drinks 10 potions in 36 turns (563 s after, 148 s before), so the slow weapon loses by more than before. The armor stays because it saves procs (cow: 3 instead of 4 with copper armor; wolf at 15: 10 instead of 13 with iron armor — probes in "Commands run"). The cow is safe only with the potion here, so both keep it: safe stays the first tier.

**The brew batch** (`src/state/exec.ts:350`, `:453-457`): units a fight drinks by the forecast of the set being brewed for × the item's fights left, at most `BREW_MAX` 45, at least 1, still capped by `produceOnce` (bag room, stock). The monster is the one `desiredForJob` solved that very set for (`fightSetMemo`, identity-checked); nothing else of `exec.ts` changed.

**The planner's prices follow by themselves** — every place goes through `killSeconds`: `cost.ts:71` (`actionSec` of a kill, the full solve) and `:193` (`roadRate`, levels above the character's own), `gear.ts:66-67` (`killSec`, the need's H1), `supply.ts:47` (`fleetSec`, a source kill). `reach.ts` prices nothing itself; its solves (`fightRec` `:202`, `planRec` `:225`) choose their sets by `bestInSlot`'s objective, which is `killSeconds` (`bis.ts:245`), so they follow too. **Nothing needed a fix.** The one number that does not come from `killSeconds` is `atlasKillSec` (`targets.ts:44`), the atlas's kill time — used when the pool has no win (`cost.ts:71`) and to rank a drop's sources (`targets.ts:77`, `:123`); the atlas was made with the old objective and already rejects sets that lean on potions (`scripts/atlas/combat.mts:94`); regenerating it is out of scope.

**Can the planner and the executor disagree about a planned fight's set?** Yes, in one direction. The planner's solves see the potions its pool holds (the bank less reservations); the executor's (`jobGear`, `jobgear.ts:154-188`) also the brewable ones (`brewablePotions`), adopted only on a win-flip, a safe-flip or a faster kill — now by the honest price. So the executor may wear a brewed potion the planner did not plan (a fight the planner judged safe from the bank's potions whose stack ran dry: the executor brews more if that keeps it safe), never the other way round; a fight that is safe only with a brewable potion is not a planner candidate at all (missed work, not a disagreement in the queue). In the queue the `fight` item solves again each round (`desiredForJob`, memoised per bank reference) and wears the executor's set; the live gate only refuses a predicted loss (`exec.ts:496`), so a set that is a win but not safe fights on, and a predicted loss pauses the item ("not a safe win vs …"), which the planner blocks for 6 h. The step's `wear` reservation is the planner's set and may differ from what is worn.

### Per fighter, before and after (`npm run check -- planner`, the executor's set: the pool's potions + the brewable ones; s/kill as the planner prices it: × 1.3 + bank trips)
On the 2026-11-18 snapshot (bank of 11-17):

| fighter | XP monster | before | after |
|---|---|---|---|
| First (20, 470 HP) | pig (19) | safe, 143 s, 953 XP/h, drinks 1 air boost + 4 small health | safe, 156 s, 874 XP/h, **no potion** |
| | highwayman (15) / wolf (15) | safe 111 / 106 s, no potion | the same |
| | skeleton (18) | win, not safe, 176 s, 1 air boost + 6 small health | win, not safe, 191 s, no potion |
| Second (22, 565 HP) | pig (19) | safe, 192 s, 676 XP/h, 1 air boost + 6 small health | safe, **519 s, 250 XP/h, 6 small health** |
| | highwayman (15) | safe, 113 s, 636 XP/h, 1 air boost + 1 small health | safe, 116 s, 622 XP/h, **no potion** |
| | wolf (15) | safe, 149 s, 1 air boost + 3 small health | safe, 156 s, no potion |
| Third, Fourth, Fifth (20–21) | pig (19) | safe, 192 s, 695–714 XP/h, 1 air boost + 6–7 small health | safe, 519 s, 257–263 XP/h, 6 small health |
| | highwayman (15) | safe, 113 s, 668 XP/h, 1 air boost + 1 small health | safe, 116 s, 653 XP/h, no potion |

**The pick**, snapshot: First pig → pig (no potion now); Second pig 676 → **highwayman 622**; Third pig 714 → **highwayman 653**; Fourth pig 695 → **highwayman 653**; Fifth pig 714 → **highwayman 653** XP/h. On the fleet as the log shows it (`LOG_LEVELS`: First 21, Second 22, Third 21, Fourth 21, Fifth 21 — the snapshot's XP plus every combat XP gain logged to 15:37 UTC; no gear piece crafted since the snapshot): the same picks (First pig 928 → 904 XP/h without its potions; the other four pig 676–695 → highwayman 622–653). Ogre, spider and everything above 20 win with no set, before or after.

**Against the log** (the pig steps of 13:43–14:57, all in — fights, rests, food, brewing, walks): Second 144 s a kill, Third 177 s, Fifth 171 s (all three with potions), First 96 s (none); the runtime's own samples at the end of those steps say 179 s (Second, 15:47:31), 214 s (Third, 15:55:32) and 212 s (Fifth, 16:02:55) — twice the old estimate of 104–147 s. The new estimate is 519 s with potions (147 s for First without): **about 2.5–3.5 times what the log measured.** The potion's price is right (47.5 s against 48.8 s measured); the count is not: the forecast drinks 6 a fight, the log's batches of 16 lasted 3–6 fights (about 3.2 a fight), and some batches were brewed from banked sunflowers. That forecast count is the most doubtful number of this task (see "Notes"). The verdict holds either way: at 3.2 potions the pig is about 350 s by the planner's price, still dearer per XP than the potion-free highwayman — and in the log the two were about even (Second: highwayman 22 XP a win at 61–92 s, about 1,000 XP/h; pig 41 XP at 144 s, about 1,025 XP/h with banked sunflowers), so the switch costs nothing and frees the potion time.

### The replay
The four rows as they are (`scripts/check-planner.mts`, four child processes, ~4.5 min each):

| row | day 7 | day 14 | day 30 | day 60 | deadline | 009 | potion making ÷ fight hours |
|---|---|---|---|---|---|---|---|
| A (default) | 32 | 39 | 45 | 49 | **49** | 56 | 8,721 of 10,044 h, 86.8% |
| B (craftK 0.25) | 32 | 39 | 45 | 49 | **49** | 56 | 86.9% |
| C (craftK 1) | 32 | 39 | 45 | 49 | **49** | 56 | 86.8% |
| D (a win is enough) | 33 | 40 | 48 | 52 | **52** | 59 | 87.0% |

**The day each fighter reaches combat 25 / 30 / 35** (row A; report 009 in brackets): First 20.2 / 30.4 / 86.3 (4.4 / 22.9 / 31.0) · Second 1.7 / 29.0 / 95.6 (1.7 / 16.8 / 24.9) · Third 16.7 / 34.7 / 91.1 (6.5 / 14.8 / 22.8) · Fourth 18.9 / 30.9 / 89.1 (7.6 / 17.5 / 26.0) · Fifth 17.3 / 30.3 / 89.5 (3.6 / 17.0 / 25.2). Nobody reaches 40 (009: nobody either; all ended at 38 then).

What changed and why: combat levelling is 77.7% of all character-hours (009: 21.2%), objectives 15.0%, **filler and fallback 0%** (009: 17.3% and 47.4%). Where row A leaves the fighters (combat 35), the only safe XP monster is the imp, at 3,743–3,963 s a kill (55–58 XP/h): safe only with potions at their making price. Its road still "scores" (`grand_master`'s points over 9,000 hours: fit 0, but points per hour > 0), and rule 4 puts filler only after anything that scores (`decide.ts:288-291`), so combat levelling runs to the deadline and the filler never comes: **ecologist, tasks_coins_fan and pearl_fisher — the 7 points — are the difference** (completed on days 34.6, 46.9 and 65.9 in 009's row A; "filler not reached" 13 points now against 6). The early combat gates come later too (combat 25 on days 17–20 for four fighters, against 3.6–7.6): the bundle's hours to the next gate include the potion-priced levels above, so gathering levels and supply outrank combat for the first two weeks. Arachnophobia Conquered moves from day 7.7 to 28.6.

`outlook()`'s note now says the forward model keeps no potion stock because the kill's price carries what drinking a potion costs (`src/plan/planner/forward.ts:247`); the forward model drops favors (`:172`).

## What was done / files
**Section 2 — what a potion costs**
- `src/sim/types.ts:24-27`: `EffectEntry.potion`, the utility item an effect comes from. `src/sim/stats.ts:24-37`, `:88`, `:106-108`: `applyGear` and `currentFighter` tag a utility's effects with its code.
- `src/sim/combat.ts:34-37` (`used`), `:93` (`procs`), `:299` (a restore proc counted), `:359-360` (`NO_USE`, so the solver's hot loop allocates nothing without a potion), `:438-443` (units per potion).
- `src/plan/xp.ts:73-112`: `fieldSec`, `potionSec`.
- `src/plan/bis.ts:8-23` (header point 3), `:67-68` (`BisOptions.potionPrice`, only the check's "before" passes it), `:73-80` (`killSeconds`), `:245`, `:262` (the evaluator takes the price).
- `src/state/exec.ts:343-350` (`BREW_MAX`), `:453-457` (the batch).
- `src/plan/planner/forward.ts:8-11`, `:172`, `:244-248`: the notes; favors dropped.
- `scripts/check-planner.mts`: `potionPart`, `restFloor` (`:129-132`), the replay's potion share (`:189-197`, printed `:570`), the traps (`:500-534`, two made-up cases), `execSet` and `potionTable` (`:601-632`), printed for the snapshot and for `LOG_LEVELS` (`:60-63`, `:553-554`).

**Section 3 — the brake, per target** (`src/state/planner.ts:113-118`, `:128-159`)
- A start is recorded with its target; a step whose target this character started 6 times inside 10 minutes blocks that target for 30 minutes (`why: "flapping"`), one line `flapping — <target>: n starts in 10 min, blocked 30 min`, and the decision is made again, three times at most; the ceiling of 20 starts of any kind keeps today's "block every candidate". `fallback()` passes over a blocked `fallback:<skill>` (009), so a flapping fallback is braked by the same rule.
- `scripts/scenarios/planner-brake-target.mts` (new): Pia supplies three crafting objectives only Bob (not on) can craft: `src:ash_wood`, `mat:ash_plank`, `src:copper_ore`, `mat:copper_bar`, `mat:spruce_plank`, `src:iron_ore`, `mat:iron_bar` — seven targets, all started inside ten virtual minutes, no `flapping`; then a kill objective with one kill left (weighted behind the supply) runs six one-kill steps, the seventh start blocks that target alone with one line, and the same `start()` takes the fallback.
- `scripts/scenarios/planner-flapping.mts` (report 008's brake scenario) stays green; it asserted "the flapping line names the six keys" and now asserts one line naming the target, only that target blocked, and the fallback decided in the same `start()`.

**Section 4 — offerings**
- `src/plan/planner/types.ts:135-137`: `PlannerState.offered` (per character: the offerings day, re-issues, the next one due).
- `src/state/planner.ts:451-496`: `offerDay` (the date of the most recent 00:05 UTC), `offeringsDue` (the hook and the panel: records the day, issues the interrupt), `catchUpOfferings` (at boot `:597`, switch-on `:532`, the five-minute tick `:381`; the 00:05 trigger goes through the hook), `offeringLater` (a removed offering interrupt, `:332`, comes back an hour later, three times a day at most, with a dev-log line each time).
- `src/state/queue.ts:1717-1721`: `queueOfferings` → the owned hook before `refused`; the comment of `scheduleOfferings` (`:1689-1694`).
- `src/ui/OfferingsPanel.tsx:40-82`, `:128`, `:207`: each open category shows the bracket `offeringPick` will take — its requirement; "lower bracket (min–max)" when it is not the own; "nothing completable today" when none. `offeringPick` runs in the tab as it is (pure over the mirrored bank, catalog and map); a monster bracket asks a BIS solve (`canBeat`, memoised per bank reference), so the panel keeps each answer per bank snapshot, day and level. The "＋ Queue" / "＋ Queue for all" buttons and the altar drawer's button already call `queueOfferings`, which now issues the interrupt for an owned character.
- **Favors**: `World.favors` (`src/plan/planner/types.ts:104-110`), filled in `worldOf` from today's offerings cache (`src/state/planner.ts:89`, `:93-108`, no read); `pickMonster` and `pickNode` multiply a favored target's XP while it lasts (`src/plan/planner/pick.ts:19-21`, `:35`, `:57`). **Does a favor outlast its completion?** The API document says `active_favors` are "XP favors active for this character until reset" and the complete action echoes `favor_expires_at` (`docs/api/openapi.json`, `CharacterSeasonalOfferingsSchema`, `OfferingDataSchema`); the panel says "Favor active until reset" (`OfferingsPanel.tsx:87`). So: until the reset, also after completion — read from the document, not seen in play (`docs/audit/domain-rules.md:223` had it as a guess). Drops: not one line (`perOf` knows no character), see "Notes".
- `scripts/scenarios/planner-offering-catchup.mts` (new): the old day's marker written, offerings open, nothing issued — at boot Pia and Ann get one interrupt each, Bob (not on) none; the five-minute tick issues none; Ann (done by hand) costs one item, no walk, no action; Pia's accept answers 598, the interrupt pauses and is removed ("comes back at 13:04Z (1 of 3 today)"), and is issued again an hour later and completes.
- `scripts/scenarios/planner-interrupt-offering.mts` and `planner-merchant.mts`: their setup suppressed the boot's offering through the old marker only; the planner's own day now decides, so the setup marks today's in the planner's state too (one line each). Not in the task's list of files; without it both fail on purpose-built timing, not on behaviour.

**`CLAUDE.md`**: the planner's section only — offerings, the brake, the dev-log lines, what a potion costs.

**Commands run**
- `git add docs/rework.md; git commit -m "Rework notes"` first (`163b8f8`); at the end the task commit.
- `npm run typecheck` (several times; final clean); `npm run check` (all; final: 52 checks, 51 ok, `repeat-spin` known, 108.6 s; `check-planner` 108.2 s); `npm run check -- planner` (final: OK, 49 / 49 / 49 / 52, 390.6 s); single scenarios with `npm run check -- <name>`.
- `npx vite build --outDir <scratch>/ammo-010-dist --emptyOutDir`, then deleted:
  ```
  …/ammo-010-dist/index.html                   0.40 kB │ gzip:   0.27 kB
  …/ammo-010-dist/assets/index-Dc_NjE2T.css   37.23 kB │ gzip:   7.26 kB
  …/ammo-010-dist/assets/index-r1qmt1Jm.js   393.41 kB │ gzip: 132.64 kB
  ✓ built in 1.62s
  ```
- Scratch scripts in the session's scratch directory (all deleted): every utility's `potionSec`; the two traps on cow, wolf and pig; the log reader (`logs/dev.log` as a stream: steps, samples, notable lines, chains, fights, brews, time shares, offerings, network errors) for 09:15–14:57, 13:57–14:57 and 14:57–end; the 200-fight windows; the fleet's levels from the log. PowerShell `Select-String` over the log for single questions. No request to the game, no `.env`, no `.ammo/*`; I started, stopped and called no service. I waited 50 minutes (a background timer) before the final read so the log covered more of the restart; during that wait the service was restarted at 16:22:33 UTC by someone else and loaded the working tree, which by then held this task's final source files (last written 15:29 UTC; only the report and the check output changed after).

## Notes
**Defects noticed and not touched**
- **Rule 4 lets an unfittable road outrank filler that fits** (`src/plan/planner/decide.ts:288-291`: a real candidate with fit 0 but points per hour > 0 is picked before any filler). With honest potions the road to `grand_master` (9,000+ hours) eats the season and costs the replay its 7 filler points. Since 009 it already took 21% of the hours.
- **The offering item fights by an expected win** (`canObtainOffering` → `canBeat`, `src/state/queue.ts:1357`, `:693`; `obtainOffering` → `fightRound`): the catch-up's first combat offering sent four fighters after skeleton bones and they lost 3 of 41 fights (16:35:42, 16:37:21, 16:38:53). The planner's steps ask for a safe win; the offering does not.
- Five characters accepted the same combat offering at once and raced for the bank's skeleton bones (two 404s, 16:24:02 and 16:24:21); harmless, but the bones went to one and the other four hunt.
- **The forecast drinks about twice the potions the log shows** on pigs (6 a fight against ~3.2): an EV-mode reading (crits folded, initiative 0), or the real sets differ from the snapshot bank's — not settled; it decides how dear a potion fight looks.
- The brew batch is still sized by the item's fights left, so a step's last fights brew small (the 2-potion expeditions of 15:40 and 15:45); a fight step's next chunk continues the same target and brews again.
- Favor drops: `perOf` (`cost.ts:83-87`) knows no character, so a favored kill or gather is not counted as ×1.5 drops (a parameter through every caller, not one line).
- `CLAUDE.md`'s gear-model paragraph still describes the old `killSeconds` (rest for the restored HP) and `BREW_BATCH` ~15; only the planner's section was this task's to change.
- `fightRound`'s refusal says "not a safe win" for an expected-mode loss (`src/state/queue.ts:468`); the text misleads.
- Two restore potions in the two utility slots fire together in the simulator (summed); the game may fire them one at a time.
- From earlier reports, still open: offerings after a 598 now come back (this task), the two string couplings of report 008, report 009's "silly things" 1, 2, 4 (all three now visible live: 15:47:31, 15:09–15:16).

**Potions as supply through the bank?** Not by these numbers. A potion is the same gathering whoever brews it (47.5 s by the price, 48.8 s measured). What bulk brewing would save is the expedition's walks and craft — about 4 s of the 52.6 s a potion in a full batch (8%), up to a minute a potion in the 2-potion tail batches (which the forecast-sized batch already cuts). Over the pig hour of 13:57–14:57 that is about 3 of the 22–26 potion minutes per fighter; and with the honest price four of five fighters leave potion fights altogether. The lever, if potions come back at higher levels, is their gathering cost (an algae is a 1-in-10 drop priced as a whole fishing gather; boost and minor health potions are 80% algae), not who brews.

**Guesses in the numbers, most doubtful first**
1. Potions drunk a fight by the forecast (above).
2. `potionSec`'s by-products: algae and the slimeballs priced as if gathered or hunted for themselves alone; a drop at 40 s a fight (`FIGHT_SEC`); one level deep for a crafted ingredient.
3. A boost or antidote consumed once a fight (the docs in `docs/` do not say; the simulator applies a boost once).
4. `BREW_MAX` 45 (the task's guess: three of today's batches).
5. The re-issue of an offering an hour after a removal, three times a day.
6. The brake's numbers (6 of one target, 20 of any, 10 minutes, 30 minutes).
7. The log reader's caps (fight 180 s, gather 70 s, move 90 s, a bank action 12 s) for "standing"; a walk to an expedition counts as potion time.
8. Favors until the reset after completion (the API document's wording, not seen).

## To delete (Alex)
Nothing. The scratch scripts and the scratch build are deleted.
