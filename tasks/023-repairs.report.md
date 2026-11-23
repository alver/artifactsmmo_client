# 023 — The repairs: report

## Summary
- **The new atlas costs the road 12 points**: from `logs/world/2026-11-22.json` the repaired tree gives 94 at the deadline on
  the old atlas and **82** on the new one (022's `P0s`: 100). Its fights from level 25 up are 30–60% cheaper, so consumables by
  need make potions for works that never complete — 7,549 supply character-hours against 3,489, of them 1,716 h for
  a_peaceful_island (open at the deadline: no safe win), 584 h for the portal efreet sultan, about 1,230 h for four fighters'
  roads to combat 50 — where the old atlas's road ran out of work at day 56 and its fallback gathering completed four gathering
  achievements, the tasks filler and a nether portal (15 points). The atlas stays; the cause is the needs' rule, 024's.
- **No restart** (run `0e2f`, commit `2db1053`, up since 2026-11-22 17:49:00 UTC, in `logs/status.json` and the journal through
  my hours); **no failed outlook**: the one of my hours, 09:23:36 UTC, loaded this tree and ended in 359.5 s (51 expected by
  12-14; the one of 06:17 expected 57).
- **The stranding is lifted** (022's `P0s`, without a key: `forward.ts advance` puts a tolled step's character at the bank its
  round trip starts from) and proven: from `logs/world/2026-11-22.json` the tree gave P0s's road line for line — 100 at the
  deadline, 37 completions, 8,916 steps; a made-up case in `check-planner` keeps it.
- **One verdict for a fight**, four faults: (a) a drained stack now re-solves (`offering-drained-stack`: the 11-22 offerings'
  stop, red → green); (b) a train loop's hunt wears the set its verdict judged — no brew set for an owned character, and is
  priced at that set's seconds a kill (`train-hunt-verdict`: Third's "not a safe win vs Spider", red → green); (c) an event
  member's set, kills and take come from one stock and its kills are what its take pays for (`check-event-stock` on the trip of
  06:00 UTC on 11-22 rebuilt, `event-take-pays`); (d) no piece booked twice — a member on its trip is booked with its set and take
  (the Tromatising Mask and 200 of 126 small potions, red → green). The task's fight, the one path not named, is repaired the
  same way; nothing is brewed or cooked inside an owned character's fight any more.
- **An offering never takes from the bank** an event-only, boss, coin-bought or rare code some recipe uses (50 codes today), nor
  what the running steps reserved: the 15 lizard eyes of 11-23 would have stayed (`offering-keeps-lizard-eyes`, red → green).
- **The atlas** (the first of the repaired solver, 2026-11-23): the Lv 20 plus target is the wolf at 32 s (was the pig at 49 s);
  gear, weapon and jewelry crafting 20 → 40 cost 6%, 12% and 5% fewer atlas hours; two pins of `check-atlas` moved.
- **The new reference** (024's baseline) from the 11-22 file: **82 at the deadline**, 30 completions, 9,138 steps, 65% of the
  hours making consumables, 147,800 drunk; played twice, the same 97 lines. **The replay**: `OK (681887 invariant checks, 97 made-up cases; deadline points 92 / 121 / 102 / 84 / 89)` against report 021's `OK (694523 invariant checks, 96 made-up cases; deadline points 88 / 121 / 108 / 86 / 81)`, 2,855 s alone (021: 3,343 s).
- **The gate**: typecheck passes; `npm run check` 91 of 91 in 189.7 s alone (report 021: 86 of 86 in 193.1 s; five checks new); `npm run check -- planner` 2,855.3 s alone; the scratch build passes (356.1 kB of JS).
- **The potion-free set today**: of the potion-free set's nine 30–40 pieces only four have a finite bill today (obsidian armor, gold platelegs, lizard boots, topaz amulet) — the rest wait for owlbear and cyclops kills nobody wins safely and for the portal demon nobody can join; five of the six 26–29 pieces are makeable from the bank once the crafters reach 25 (the slime shield needs King Slime), and gear by need offers any of them to Second alone, because it never looks above a fighter's own level.

## Decisions for Alex
None.

## How Alex verifies
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `023: repairs` on top of `Rework notes`; `git status` clean;
   `git log origin/rework --oneline -1` → the same commit (the push's outcome is in Claude Code's reply); `git log main --oneline -1` → `edaaf23`.
2. `npm run typecheck` passes; `npm run check` → `91 checks: 91 ok, 0 known defects reproduced, 0 failed`, exit 0 (report 021: 86 of 86); the new checks are
   `check-event-stock`, `event-take-pays`, `offering-drained-stack`, `offering-keeps-lizard-eyes`, `train-hunt-verdict` (and a case
   in `check-planner`); `npx vite build --outDir <temp>/ammo-023-dist --emptyOutDir` builds (356.1 kB of JS, 31.8 kB of CSS). I ran
   all three.
3. `npm run check -- planner` → ends with `OK (681887 invariant checks, 97 made-up cases; deadline points 92 / 121 / 102 / 84 / 89)` in about 48 minutes (2,855.3 s; report 021: 3,343 s) (I ran it alone on the final tree).
4. `npm run outlook -- --world logs/world/2026-11-22.json` → **82 at the deadline** (2027-02-24); run twice, the same road
   (I played it twice: the driver and `npm run outlook --json`, `cmp.mjs` → "97 vs 97 lines; equal").
5. `git diff --stat 7524933 HEAD -- src/plan/bis.ts src/sim src/api src/catalog src/plan/planner/decide.ts src/plan/planner/config.ts
   src/plan/planner/gear.ts src/plan/planner/supply.ts docs/strategy` → empty.
6. The red runs (optional): a copy of `7524933`'s tree (`git archive 7524933 src scripts public package.json tsconfig.json docs/design/snapshot`),
   a `node_modules` link, the five new checks and `scripts/fixtures/world-2026-11-22-0600.json` copied in, `node --import tsx
   scripts/check.mts <name>` → each fails as "What was done" lists.
7. **After the restart** (not checked by me): at the next 00:05 UTC no offering's `int-end` record withdraws a lizard eye or
   skin (`wd`), nor a code of the list in section 3; a `lvl:` step's hunt either fights in its verdict's set or its recipe is
   another one — no "not a safe win" pause of a `lvl:` step; an `event` record's member line states kills with "(its stacks buy
   N; the spawn's time M)" where its take caps them, and a member not sent says "its stacks buy N kills"; an owned character's
   offering fights no longer brew or cook (no `crafting` or `gathering` inside an offering interrupt's meter for a combat
   category); the first outlook's expected points follow the new reference (its 21 days from the live World).

## The stranding
`docs/strategy/022/policies/P0s.patch` lifted without its key (`config.home` does not enter `PlannerConfig`):
`src/plan/planner/forward.ts:193-196` — a step with a toll whose round trip passes a conditional transition (`step.toll.via`
not empty) puts its character at the bank that round trip starts from, `reach.ts:181-185 homeBankOf` (the nearest bank with every
transition open, never the island's conditional bank — `nearestBankOf` skips it); any other step at its place, as before. That
is all of it.

**The proof** (settled point 1), started on the working tree when those two edits were all of its changes (the process loads every module at its start; the runner's and the events' edits came while it ran) (`NODE_OPTIONS=
--max-old-space-size=2048 npm run -s outlook -- --world logs/world/2026-11-22.json --json`, SHA-256 of the file `14AA19CB…E940AA`,
as report 022's): `node docs/strategy/022/tools/cmp.mjs <s1.jsonl> docs/strategy/022/runs/P0s.jsonl` → **"97 vs 97 lines; equal"** — every `day` line and the `done` line equal but the seconds: **100 at the deadline, 37 completions, 8,916 steps** (the untouched tree: 98, 36, 9,014). The run: 4,282.1 s of play by its `done` line, 71 min 23 s of wall time, beside up to three other runs of mine (not alone).

**The made-up case** (`scripts/check-planner.mts`, section 5h, beside task 017's isle cases): the isle world, First a woodcutter
50 with 23,000 gold in the bank — the palm step's round trip (2,000) paid, 1,000 over `GOLD_FLOOR` is left: one way only. After
`advance` First stands at (7, 13) on the overworld with a free route to the city; on 7524933's core (the same case copied into
the scratch tree) at (-3, 20) — Sandwhisper Isle — with no free route: "MISMATCH task 023: gold for one way only …".

## The runner: one verdict
Line numbers in this section are the final tree's unless they say `2db1053` (the code that played, `src/` unchanged by 022).

**First, what else happened (Third's step of 02:13–04:42 UTC on 11-23):** (a) and (b) cover the refusal at the spider; the
103 rests did not break the rule but the train picker's price did, and that is repaired too: a train loop's hunt was priced at
`xp.ts FIGHT_SEC` (40 s a fight round, `src/plan/xp.ts:83`) where its 102 skeleton fights cost 79 s each (fight 2,824 s + rest
5,236 s, the journal's `end` record), two thirds of it rest; an owned character's hunt is now priced at its verdict's seconds a
kill (`queue.ts:720 huntSec`: `fightSetFor(…).sec`, `jobgear.ts fightSeconds` = `bis.ts killSeconds` with the
executor's potion price — the fight, the rest back to full, its potions). The constant itself is xp.ts's and stays.

### Every fight path of an owned character

| path | what chooses the fight | what solves the set | the stacks come from | the gate | brewed / cooked inside |
|---|---|---|---|---|---|
| `pl:` fight step (`fight` item with `take`, `wear`) — **today = after** | `decide` (`fightRec` on the pool, `consumables.ts fightTake` caps its kills at the stock its score may reserve) | `queue.ts plannedSet` (the step's `wear` + its take's potions); a piece gone: `desiredForJob(…, take)` (`jobGear` planned: only the take's potions, free) | the step's reset, exactly the take (`nextGearAction` `utility: take`); a round never refills | `exec.ts fightRound` `simulate(currentFighter(ch), m).win` (`exec.ts:573`; `:507` at `2db1053`) | nothing (task 014); "ran dry" ends it |
| event trip (`pl:int:event:`, `fight` with `take`, `wear`) — **before** | `events.ts eventMembers`: `contentSec` → `safeWin`/`fightRec` on the pool (bank + bag + worn stacks, a reserved potion kept) | `setOf` = `fightRec` on that pool | the trip's reset: the take, cut to the bank's stock (`available`) — not the bag's; kills counted by the spawn's time | the same gate | nothing |
| event trip — **after** | `membersOf` on `stockWorld`: what the take may draw after the reset (bank less the others' reservations and the members before it, plus its own bag and worn stacks) | `fightRec` on that same World | the take from that stock, its kills the lesser of the time and what the take pays for; a trip on its way booked with its set and take (`Trips`) | the same gate | nothing |
| an offering's combat (`obtainOffering`, fight leg) — **before** | `canObtainOffering` → `canBeat` = `ownedFightForecast` over bank ∪ bag ∪ worn (no brew) | `desiredForJob` → `jobGear`'s brew escalation (a set may name potions nobody holds), memoised on the bank, the level, the monster | the differ: whole stacks of 100 from the bank, any of it reserved; an emptied slot refilled from the bank — or left empty when the bank has none, the memo naming it still | the same gate | **yes**: `provisionPotions` brews, `provisionFood` cooks / gathers (`ctxOf` `fed` true) — 11-22: Fifth 5,670 s of sunflowers, Third 668 s of brewing and cooking |
| an offering's combat — **after** | `canBeat` = `fightSetFor(…).forecast.win` — the forecast of the very set it will wear | `fightSetFor`: `ownedFightRec` on the bank less the running steps' reservations (`freeBank`), re-solved when a named stack is gone | the differ, capped at what it wears and holds plus what the bank may give (`stackCaps`) | the same gate | nothing: `provisionPotions` only for a character the planner does not own; it eats what it holds and rests |
| a train loop's hunt (`sourceOne` → `fightGear`) — **before** | `trainRecipe` → `unitSec` → `canBeat` (`ownedFightForecast`, no brew), priced at `FIGHT_SEC` | `fightGear` → `desiredForJob` → `jobGear`'s brew set | the differ (whole stacks) | the same gate | none brewed — so the brew set's potions were never there (11-22 05:08 and 15:30 the ogre, 11-23 04:42 the spider) |
| a train loop's hunt — **after** | `canBeat` = the verdict; priced at the verdict's seconds a kill | `fightSetFor` (as the offering's) | `stackCaps` | the same gate | nothing |
| a task's fight (`task-loop`, `runWorkTask` → `taskGear`) — **before** | the Tasks Master's monster (the planner's `task` step accepts whatever comes); no check before the fight | `desiredForJob` → brew set | the reset and the differ, whole stacks | the same gate; no win: `giveUpTask` cancels it for a coin | **yes**: `provisionPotions`, `provisionFood` |
| a task's fight — **after** | the same | `fightSetFor` | `stackCaps` (the reset too) | the same gate, the same cancel | nothing |
| `prepare` (the Group fight fold) | refused for an owned character (`queue.ts queuePrepare` → `refused`) — not a path of the rule | | | | |

The task fight is the one path the four faults did not name; it broke the rule the same way (a brew set, brewing and cooking
inside the fight) and is repaired the same way (`taskGear`, `ctxOf`). The rule as code: `src/state/exec.ts` `fightSetFor`,
`freeQty`/`freeBank`, `stackCaps`, `setReservedOf` (the hook, set in `src/state/eventorders.ts` from `stock.ts reserved` on the
live World — `state/planner.ts` was not this task's to change); `src/state/queue.ts` `canBeat`, `huntSec`, `fightGear`, `taskGear`,
`obtainOffering`, `canObtainOffering`, `ctxOf`.

**What the reservations cost** (settled point 2 (b)): a hunt, an offering and a task fight of an owned character now solve on
the bank less what the other characters' running steps reserved (`stock.ts reserved`: their `withdraw` and the pieces of their
`wear` they do not hold), and put no more of a potion in a slot than that. A running fight step's take stays "reserved" after
its reset withdrew it (stock.ts counts a step's whole `withdraw`), so while one runs the others see that many potions fewer than
the bank holds: at 00:00 UTC on 11-23 Third's `src:ogre_skin` step reserved 96 minor and 96 small health potions, so an offering
fight then saw 13 of the bank's 109 minor potions (the snapshot's `current`). Of the 212 steps of 11-21 to 11-23, 30 took
potions (the journal's `step` records' `wd`). No solve is added: the reservations' signature joins the memo's key.

### Third's level step of 02:13–04:42 UTC on 11-23
From the journal (`step` 02:13:07, `end` and `pause` 04:42:25), the raw log `02.log`–`04.log`, and my rebuild of the bank and
Third's set at each moment (`<scratch>/replay.mts`: the 00:00 snapshot `logs/world/2026-11-23.json` plus every bank move and
(un)equip of the raw log since; the worn stacks emptied where the fights drank them; the solves run on that state).
- **The recipe**: Skeleton Helmet (gearcrafting 20; Third at 23: +521 XP each, the note at 04:37:27), a batch of 5 runs — the
  bank held 66 skulls, 63 wolf bones and 44 iron bars, but 8 Skeleton Bones of the 15 (the 00:00 snapshot, my rebuild at 02:14),
  so 7 to hunt from the skeleton (1 in 12, 1–2 a drop). Its bones were priced at `FIGHT_SEC` × 8 = 320 s each (`queue.ts:736`
  at `2db1053`).
- **The hunt**: 102 fights, all won; 7 bones (12.75 expected by the drop table; 7 or fewer has an 11% chance), 8
  skulls, 4 lich tomb keys. **103 rests** = one after each fight plus the 483 "not enough HP to unequip" at 02:13:43:
  `fightRound` heals to full before every fight (`exec.ts:498-503` at `2db1053`) and a non-combat train item provisions no food
  (`ctxOf`), so each fight (about half the HP lost) is followed by one rest of about 51 s (1 s per 1% of max HP): rest 5,236 s ÷
  103 = 50.8 s, fight 2,824 s ÷ 102 = 27.7 s.
- **The set at the gates**: 02:15:17 battlestaff, iron shield, magic wizard hat, mushmush jacket, hard leather boots, steel ring
  ×2, wisdom amulet, novice guide, altar doll, lost world map, **4 Minor Health Potion** (the bank's last 4; it held 661 small);
  02:21:13 + skeleton pants (a bank echo, a new solve). The forecast at the first fight (02:16:20): **win in 15 turns, 254 of 485
  HP left, 1 minor potion a fight**; `canBeat`'s set (the same pieces, the altar doll for the novice guide) a safe win. The 4
  potions went in the first fights (`drunk` 4); without a potion the worn set still wins the skeleton (15 turns, 244 HP left) —
  so the skeleton hunt was a long win, not a fault of the rule.
- **The spider** (04:39:55): the helmets crafted (04:38:49, +3,335 XP), the next pick was Snakeskin Boots (5 hardwood planks,
  2 spider legs, 2 snakeskin, 2 green cloth a run): 30 planks and the bank's 1 spider leg withdrawn, 11 legs short → the
  spider. At the refusal (04:42:24) the forecasts: **`canBeat`** (`ownedFightForecast` over bank ∪ bag ∪ worn) — skull staff,
  iron shield, tromatising mask, skeleton armor and pants, old boots, skull ring, steel ring, **Small Health Potion** 5 a fight
  → a win in 17 turns, 60 HP left, not safe; **`fightGear`'s set** (`jobGear`'s brew branch, `jobgear.ts:193-205`) —
  battlestaff, iron shield, magic wizard hat, mushmush jacket, adventurer pants, hard leather boots, steel rings, wisdom amulet,
  **Minor Health Potion and Small Antidote**, neither held by anyone (the bank: 0 minor, 0 antidote, 661 small) — the differ
  left both slots empty; **the worn set**: lost in 12 turns → "not a safe win vs Spider" (`queue.ts:943` at `2db1053`).
- **The three strikes**: 11-22 05:08:34 (run `dxgi`, the ogre), 11-22 15:30:24 (run `4zfd`, the ogre), 11-23 04:42:25 (run
  `0e2f`, the spider) — all three the same brew set; the third blocks `lvl:gearcrafting:25` for all five until 11-24 00:00.

With this task's code the spider hunt wears `canBeat`'s set with the bank's small potions (a win, not safe) and fights; were
it no win, Snakeskin Boots would not be the pick.

### The trip of 06:00 UTC on 11-22
Rebuilt as the two Worlds of the polls that sent Third (06:00:05) and Second (06:02:07): `logs/world/2026-11-22.json` (00:00) +
the raw log's bank moves and (un)equips to that moment + the journal's level-ups and step records (the running steps' `wd` and
`wear`) + Third's bag (96 Minor Health Potion brewed by its `mat:minor_health_potion` step at 05:58:53; at 06:02 the gear its
trip's reset had just taken off) + the spawn (`<scratch>/rebuild.mts` → `scripts/fixtures/world-2026-11-22-0600.json`). On these
Worlds 7524933's core gives the 06:02:07 line of the journal word for word ("Third (on the trip, ≈44 kills left), Second (≈47
kills in 48 min with 96 Minor Health Potion and 100 Small Health Potion and 32 Cooked Trout)") and the 06:00:05 one with 46
kills where the journal says 44 (the rebuild's achievements are 00:00's).
- **Third's stock**: its solve's pool (`reach.ts poolOf` → `ownedQtyOf(ch, poolBank)`) counts its bag: the set's forecast drinks
  8 minor potions a kill; its take is cut to `available` — the bank's, which held none (`events.ts:402-405` at `2db1053`) — so the
  trip took 100 small and 32 trout for "≈44 kills" (the journal; 46 on the rebuild) that 100 small pay 10 of; the reset banked the 96 minor (06:01:41).
- **The mask**: at 06:02:07 Third was on the trip (`busy`), counted with the time left and nothing booked (`events.ts:359-365`
  at `2db1053`: no `withSet`); its reset withdrew its set at 06:02:30, so the pool Second's solve read still held the bank's one
  Tromatising Mask — and Third's 100 small (the takes held 200 of 126) and its 32 trout. Second's plan named the mask, which was
  gone when its reset came (06:02:40).

### The repairs
| fault | what it was | what it is now | its check (red on 7524933 → green) |
|---|---|---|---|
| (a) a drained stack | the fight set memoised on the bank, the level, the monster (`exec.ts:246-254` at `2db1053`); a stack running dry changed none of them | one memo per character and job (`exec.ts fightSetFor`), answered again when a utility stack it named is not worn, not in the bag and none is in the bank it may draw on; the new set is the owned character's solve on that bank | `offering-drained-stack`: the death knight's red cloth, the set safe with 3 minor potions, lost without them, another set of the bank wins without — red: "skipped today's combat offering — no way to get 2× Red Cloth"; green: completed, the second set worn. On 11-22's own bank the re-solve would have found no winning set either (report 021: every set needed a potion the bank lacked), so those offerings would still have ended — at once, honestly, and without brewing |
| (b) a train loop's hunt | `canBeat` judged bank ∪ bag ∪ worn, `fightGear` wore `jobGear`'s brew set and never brewed | `canBeat` and `fightGear` read one verdict (`fightSetFor`): no brew set for an owned character, the stacks capped at what the bank may give; a recipe whose drop it cannot win that way is not picked; the hunt priced at the verdict's seconds a kill | `train-hunt-verdict` (the fake has no recycle action and no XP, so it stops at the hunt's first fights): Royal Skeleton Armor short of red cloth, minor potions brewable and none held — red: "not a safe win vs Death Knight" after 4 minutes; green: three fights in the bank's set |
| (c) an event member's stock and kills | solved on bag + bank + worn stacks (a reserved potion kept), its take cut to the bank, its kills the spawn's time, the demand reduced by those | one stock (`events.ts stockWorld`), kills = min(time, what the take pays for), the demand reduced by that, under `SLIVER` no member; a member on its trip counted for what it carries | `check-event-stock` (06:00:05: the take names every potion the set drinks, the stated kills are paid) and `event-take-pays` (20 kills wanted, a stack buys 6: Ann and Bob go, Cid's 26 potions buy 1 — red: "Ann (≈35 kills in 58 min with 100 Health Potion); not: Bob — not needed") |
| (d) a piece booked twice | a member on its trip booked nothing; across two spawns each started from the same World; a member's set overwrote its step underneath's `wear` | a member on its trip is booked with its trip's set and, while its reset is to run, its take (`Trips` from the queue, `eventorders.ts tripsOf`); `eventPlans` hands each spawn the World the last one left; the set beside the step's `wear` (`withSet`) | `check-event-stock` 06:02:07 — red: "2 sets name tromatising_mask, the bank and the members hold 1", "the takes hold 200 small_health_potion, the bank and the members 126" |

The red runs: a scratch copy of 7524933's tree (`git archive`) with each new check copied in, `node --import tsx scripts/check.mts
<name>`; the full lines are under "What was done". Two scenarios of earlier tasks state the old count and were changed to the
new rule, both still on their recorded case: `consumables-event-trip` (task 014: the stack of 100 buys 6 kills, so the take is
those 6 kills' 87; at the next spawn the 13 left buy none — "its stacks buy 0 kills" where it said "gate: no safe win") and
`event-trip-takes-plan` (task 017: 30 potions now buy 2 kills, under the sliver, so the bank holds 75 and the plan is 5 kills'
72 — inside the stock, as the task asked).

## What an offering may give away
**What the offerings took from the bank** (the journal's `int-end` records of the offering interrupts, their `wd`; 11-21's file
starts at 11:43 UTC, after that day's offerings, so it holds none):

| UTC | who | done | taken from the bank | the new rule |
|---|---|---|---|---|
| 11-22 00:29:26 | First | fishing | 2 rat hide; 67 trout; 47 minor health potion; a fight set (steel battleaxe, iron shield, hard leather helmet, mushmush jacket, hard leather pants, leather boots, earth ring) | keeps none: the rat hide and the trout can be had again at will; the gear and potions were the fight set's swap, not the requirement (the potions now capped at what the running steps leave) |
| 11-22 00:29:37 | Fourth | fishing | 68 trout; 43 minor; a fight set (with skeleton armor and pants) | none (the skeleton pieces were worn, not given) |
| 11-22 00:41:51 | Second | fishing | 67 trout; 2 rat hide; 100 minor; a fight set | none |
| 11-22 01:52:22 | Third | combat, fishing | 2 rat hide; 92 trout; 100 minor; 148 nettle, 92 algae (it brewed 184 minor potions and cooked 57 trout inside the offering — now neither); two fight sets | none |
| 11-22 03:15:17 | Fifth | fishing | 62 trout; 102 minor; 48 cooked trout; two fight sets | none |
| 11-23 00:11:35 | Fifth | — | nothing ("no way to get 5× Lizard Eye") | — |
| 11-23 00:11:38 | Second | combat | **5 lizard eye** | **kept** (event-only) |
| 11-23 00:12:15 | First | combat | **5 lizard eye** | **kept** |
| 11-23 00:15:19 | Fourth | combat, jewelrycrafting | **5 lizard eye**; 5 iron bar, 4 green slimeball, 3 flying wing (an air ring crafted for the jewelry offering) | **the eyes kept**; the ring's materials not |
| 11-23 00:19:53 | Third | alchemy | 1 nettle, 4 sunflower, 4 algae (a brew for the alchemy offering); a fight set | none |

So the rule would have kept exactly the 15 lizard eyes of 11-23 — at the price of those three offerings' 9,250 combat XP
(2,800 + 3,650 + 2,800), or a lower bracket's: with the bank closed the 21–30 combat offering goes to the bandit lizard (an event monster, not up), then
to the next lower bracket, else it is skipped (the scenario `offering-keeps-lizard-eyes` takes a made-up 10–20 bracket's feathers;
red on 7524933: "no lizard eye leaves the bank: withdrew [\"lizard_eye\"]").

**The rule** (`src/state/offerings.ts:90` `keptFromOfferings`, `:122` `offeringMayTake`; used by `queue.ts:1232`, the bank leg of
`obtainOffering`, which every requirement and every craft ingredient at any depth goes through, and `:1284`, its dry run): a code
some recipe uses that cannot be had again at will — **event-only** (it has a field source and every monster or node dropping it
stands only on an event's tiles: `targets.ts placeGates` gives an `event` gate; or no field source, no recipe, no NPC sells it and
an achievement pays it), **a boss or raid drop** (every monster dropping it is a boss or a raid boss), **bought with tasks coins**
(an NPC sells it for `tasks_coin`), **rare** (more than `RARE_ACTIONS` 50 actions a unit from its cheapest source — xp.ts's
`unitActions`, private there, copied with a `shortcut:` comment since xp.ts is not this task's to change). **The planner's
reservations**, the small change: the bank the offering reads is the bank less what the other characters' running steps
reserved (`exec.ts:247 freeQty`, `stock.ts reserved` on the live World); an open parent's bill is not a reservation in stock.ts
and is not respected (Notes).

**Today's list** (`<scratch>/sec3.mts` on the final tree's catalog): 50 codes.
- event-only (15): demon horn, echoless bat wing, efreet cloth, full moon vampire cape, grimlet bone, lava bucket, lizard eye,
  lizard skin, magic sap, magic wood, malefic cloth, marauder hand, red dragon scale, solar desert scorpion tail, strange ore;
- event-only and a boss's (2): adventurer skull, duskworm skin;
- a boss or raid drop (3): king slimeball, priestess orb, rosenblood elixir (rare too);
- bought with tasks coins, and rare (4): astralyte crystal, jasper crystal, magical cure, prime fabric;
- rare only (26): the gems and their stones (alexandrite, diamond, emerald, ruby, sapphire, topaz and their `_stone`s), fire
  crystal, enchanted fabric, book from hell, shell, wooden stick, and gear made of such stuff that another recipe takes
  (dreadful amulet and staff, emerald / ruby / sapphire / topaz amulet, skeleton armor, helmet and pants).

## The atlas and the new reference
### What the repairs move in the model (settled point 5)
`events.ts` is the core's: the forward model attends events through `sharesOf`, which reads each member's `actions` and `use`
from `eventMembers`. The capped kills **fall out of the same function** — a member's `use` is now its kills × its seconds a kill
(`events.ts:483`), so its share (`use ÷ gapSec`, `:557`) and its seconds an action follow the capped kills; nothing was built for it.
The road from `logs/world/2026-11-22.json` on the repaired tree with the old atlas (`<scratch>/s5tree`, `drive.mts`):
**94 at the deadline, 35 completions, 7,696 steps** (P0s: 100, 37, 8,916); the points first part on day 4 (40 → 34); combat
40 for all five from day 56 (P0s: 44–45 at the end), 68,109 potions and foods drunk (P0s: 173,883), 299,728 kills; the fallback
17% and the filler 16% of the 11,276 character-hours (P0s: the filler 8%). The event achievements move out: the_reaper 11-25 →
11-28, the_new_bandit 11-25 → 12-23; at the deadline "an event" waits with 19 points (P0s 14) and "a group" 14 (P0s 11).
(`tab.mjs` with `DETAIL=1` on `<scratch>/runs`; the driver's own play seconds 3,222 beside three other runs.)
**Where it first parts from settled point 1's road** (the drivers' decision files, `<scratch>/dec-s1.dec` against `dec-s5.dec`):
equal for 7 decisions; the 8th, day 1, is the same step at another time — Third `ach:intermediate_alchemist:0@Third#2`
(objective, 147 units, 1.5 h, "objective: Intermediate Alchemist: 3059 Nettle Leaf left, +1 pts in ~31 h; 147 now (1.5 h)") at
**02:55:36** UTC where P0s's is at **02:57:41**: Third's first step (01:25:18, 1.505 h planned) is stretched by its event share
for 2 minutes less, because its share of the bandit camp is now the kills its take pays for; Fifth's next step comes 28 s
later (02:59:42 against 02:59:14) — the demand Third no longer covers is Fifth's share. Right by settled point 2 (c): a member
counted for kills its stacks cannot buy made the model's events pay what play never saw (report 022: the eight trips of 11-22
planned 289 kills and made 92).

### The atlas (settled point 6)
`npm run atlas` once, after the plain gate was green (`<scratch>/check1.txt`): 212 s beside three long runs; `generatedAt`
2026-11-17T12:10:07Z → **2026-11-23T08:48:42Z** — the first atlas of the repaired solver (021) and of the prices since 012 (rest
by 1% of max HP, potions at their making). `xpNeeded` unchanged; 43 monsters' minimum levels or kill seconds moved, 111 of 527
items' `availAt`/`bis`, the loadouts of every band from 10–14 up; `coinPrices` unchanged, `coinSec` 3,450 → 3,375.

**The XP target per level, where it changed** (`path[L].t`: the target, its seconds a kill and the level's hours; core / plus /
special tiers; `<scratch>/atlasdiff.txt`):

| levels | old (11-17) | new (11-23) |
|---|---|---|
| 1–4 (all tiers) | yellow slime 56 s, 0.05–0.54 h | yellow slime 89–94 s, 0.09–0.86 h |
| 5–8 | green slime 26 s | green slime 35–36 s |
| 9 | red slime 46 s, 1.09 h | green slime 34 s, 1.34 h |
| 10–12 | red slime 29 s | red slime 30–33 s (12: 1.95 → 1.51–1.61 h) |
| 13 | green slime 18 s, 2.36 h | cow 63–68 s, 2.41–2.60 h |
| 14 (plus) | highwayman 101 s, 2.81 h | red slime 30 s, 3.08 h |
| 15–19 (plus) | red slime 22 s / pig 103 s / wolf 76 s | wolf 75–77 s (15: 2.69 → 2.61 h, 18: 4.65 → 4.16 h) |
| 15–19 (core) | highwayman 92 s | wolf 102–104 s |
| 20 (plus) | **pig 49 s, 2.94 h** | **wolf 32 s, 2.35 h** |
| 21–28 (plus) | pig 36–49 s, 3.38–7.39 h | pig 31–45 s, 3.11–6.36 h |
| 29 (plus / special) | rat 116 / 96 s, 11.97 / 9.90 h | rat 84 / 72 s, 8.67 / 7.43 h |
| 30 (plus / special) | imp 134 / 86 s | rat 42 / 27 s, 4.69 / 3.02 h |
| 32–33 (core) | — (no safe target) | rat 125 s, 23.9 / 25.5 h |
| 34 (core) | rat 147 s, 31.8 h | rat 124 s, 26.8 h |
| 35–37 (plus) | imp 118–119 s, 15.2–17.0 h | imp 94 s, 12.0–13.5 h |
| 38–39 (special) | cursed tree 108 s / owlbear 78 s | cursed tree 64 s, 7.3 / 7.8 h |
| 40–49 (special) | goblin wolfrider 80–147 s, 11.8–14.8 h | hellhound 51–84 s, 4.6–7.5 h |

The special tier's road 1 → 40: 167.9 h → 131.4 h. The core still stalls at 29 (and finds the rat at 32–34), the plus at 38.

**`craftTrain`, the three gear-crafting skills, 20 → 40** (hours by five levels, old → new; the pick at 20 / 25 / 30 / 35 / 39):

| skill | 20–25 | 25–30 | 30–35 | 35–40 | 20 → 40 | picks |
|---|---|---|---|---|---|---|
| gearcrafting | 172 → 158 | 271 → 249 | 539 → 577 | 978 → 861 | 1,959 → 1,845 | skeleton helmet to 34; 35–39 snakeskin legs armor / royal skeleton armor → royal skeleton pants |
| weaponcrafting | 175 → 164 | 276 → 258 | 1,547 → 1,404 | 2,649 → 2,272 | 4,647 → 4,097 | skull staff to 34, dreadful staff, greater dreadful staff (unchanged) |
| jewelrycrafting | 184 → 209 | 311 → 328 | 414 → 367 | 573 → 507 | 1,481 → 1,410 | 20–25 air ring → steel ring; gold ring from 30 (unchanged) |

(The core prices a crafting level at `craftK` 0.1 of these hours, `cost.ts hoursToLevel`.)

**`check-atlas`'s pins** (`scripts/check-atlas.mts`), old → new, the two that moved updated, each named in the file:
"Lv 20 plus tier trains on pigs" → **"…on wolves"**; "Lv 20 vs pig on plus gear ≈ 49 s per kill" → **"Lv 20 vs wolf … ≈ 32 s"**;
unchanged and still true: core stalls at 29, plus at 38, nine bands, the Lv 20 plus set's steel rings, jasper 8 coins, the steel
axe's skills. `OK (8 checks)`.

### The new reference — 024's baseline
From `logs/world/2026-11-22.json` to the deadline on the final tree (`drive.mts` on `<scratch>/s6tree`, a copy of the final
tree; 83 min 51 s of wall time, 5,030.1 s of play by its `done` line, beside two other runs; `npm run outlook --json` gave the
same lines — `cmp.mjs` → "97 vs 97 lines; equal" (87 min 10 s of wall time beside the driver)). `tab.mjs` on the three runs (P0s is `docs/strategy/022/runs/P0s.jsonl`; "R5" the repairs on the old
atlas, above):

| run | d7 | d14 | d21 | d28 | d42 | d56 | d70 | d84 | **end** | completions | steps | consumables' supply of the hours | potions and foods drunk | kills | combat at the end |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P0s (022) | 42 | 49 | 56 | 58 | 73 | 81 | 90 | 98 | **100** | 37 | 8,916 | 6,378 of 11,238 h (56.8%) | 173,883 | 476,630 | 44/45/45/45/45 |
| R5: the repairs, the old atlas | 40 | 42 | 48 | 54 | 63 | 79 | 88 | 94 | **94** | 35 | 7,696 | 3,215 of 11,276 h (28.5%) | 68,109 | 299,728 | 40 ×5 |
| **the new reference** | **40** | **42** | **47** | **53** | **63** | **76** | **80** | **80** | **82** | **30** | **9,138** | **7,319 of 11,275 h (64.9%)** | **147,800** | 573,381 | 46 ×5 |

**The completions with their days** (day 1 = 11-22): expert_miner 1, intermediate_alchemist 2, worker 2, arachnophobia_conquered
4, intermediate_fisherman 5, expert_lumberjack 6, cabinet_maker 6, the_reaper 6, ecologist 9, expert_fisherman 13,
professional_lumberjack 16, cultist_purifier 17, professional_fisherman 22, the_new_bandit 23, expert_alchemist 26,
catch_and_cook 28, cursed_wood_blessed_victory 31, magic_lumberjack 32, diamond_in_the_sky 33, cult_destroyer 37, strange_miner 40,
a_favored_champion 45, loktar_ogar 45, magic_harvester 49, master_alchemist 53, king_of_the_goblins 54, pearl_fisher 60,
professional_miner 65, master_fisherman 69, master_miner 94. Neither bronze (105) nor silver (158) is crossed.

**What the open points wait for at the deadline**: another layer 45, an event 19 (closing_the_gate, corruption_eradicator,
draconic_harvest, its_malefic, welcome_to_hell), a group 14, the filler not reached 11 (making_a_nether_portal, tasks_coins_fan,
the_planet_thanks_you), does not fit 10 (adamantite_mastery, master_lumberjack, palm_paradise, shining_secrets,
turning_treasures_to_gold), `use` 10, a raid 8, gear 7 (a_peaceful_island, grand_master), unhandled 4 (ultimate_rune).
Hours by answer (11,275 character-hours): greater health potion's supply 2,528 (22%), minor 2,178 (19%), health potion 1,804
(16%), combat levels 898 (8%), objectives 850 (8%); by kind gather 7,776, fight 2,044, make 1,054, offering 309, event 92.

**Where it first parts from `P0s`**: at the same decision as R5 (above: day 1, Third's second step at 02:55:36 against 02:57:41 —
the repairs). **The atlas's own first effect**: the 20th decision (day 1, 06:02 UTC, Second's `ach:the_reaper:1`) is the same step
with another price ("+3 pts in ~5.4 h" against R5's "~9.3 h": the vampire at 84 s a kill, was 120 s); the first different step is
the 124th — day 2, 12:24 UTC, Third: R5 brews 112 Small Health Potion for the bandit camp's reserve, the reference gathers 170
sunflowers for "Small Health Potion ×824 for closing_the_gate (Imp, 2 chunks) (+4 pts, chain ~157 h)".

**The new atlas costs the road 12 points** (R5's 94 → 82; more than five, so first in the Summary). The cause, from the two
runs' decisions: with the fights from level 25 up 30–60% cheaper in the atlas's seconds (the vampire 120 → 84 s, the demon 205 → 111 s, the efreet sultan 405 → 160 s), consumables by need judge potions worth making
for works that do not pay by the deadline — the supply steps take 7,549 character-hours against R5's 3,489: 1,716 h for
a_peaceful_island (open at the deadline: "gear (no safe win within ten levels)"), 584 h for the portal efreet sultan event, about
1,230 h for four fighters' roads to combat 50 (the atlas now has an XP target at every level to 49), 203 h for
closing_the_gate (open: "an event"; R5 249 h); the fleet reaches combat 46 and drinks 147,800 potions. R5 instead ran out of fitting work at
day 56 and spent 1,926 h in the fallback, whose gathering completed shining_secrets, adamantite_mastery, palm_paradise and
master_lumberjack, and reached making_a_nether_portal and the tasks filler (15 points); the reference takes king_of_the_goblins
(3) instead. Not the atlas's fault as such — it is the first atlas of the repaired solver and its prices are the core's — but the
consumables-by-need rule spending on works that cannot complete; 024's question (Notes).

**The replay** (`npm run check -- planner`, alone on the final tree): `OK (681887 invariant checks, 97 made-up cases; deadline points 92 / 121 / 102 / 84 / 89)` in 2,855.3 s (47 min 38 s of wall time, alone) — rows A / B / C / E / G: A +4, B unchanged, C −6, E −2, G +8 (both the repairs and the atlas move them; not traced row by row — Notes); one made-up case more (the stranding's); against report 021's `OK (694523 invariant
checks, 96 made-up cases; deadline points 88 / 121 / 108 / 86 / 81)`.

## The potion-free set, today
Read-only. The snapshot `logs/world/2026-11-23.json` (00:00:04 UTC; combat First 23, Second 26, Third 24, Fourth 23, Fifth 24;
weaponcrafting 20 Second, gearcrafting 23 Third, jewelrycrafting 21 Fourth), the final tree (the repairs and the atlas of
2026-11-23T08:48:42Z). Every number comes from the planner's own functions on that World unless named otherwise:
`supply.ts billOf` (one copy, five, ten rings), `gear.ts candidatesOf` / `gearNeeds`, `events.ts materialCal` /
`possibleMembers`, `cost.ts hoursToLevel` (`craftK` 0.1 × the atlas's `craftTrain` hours), `reach.ts safeWin` / `winLevel` /
`fightRec` / `potionRec`; scratch scripts `sec5.mts`, `sec5b.mts`, `sec5c.mts` (outputs `out.json`, `outb.json`, `outc.txt`).
A leaf's seconds are `supply.ts fleetSec` × `cost.ts perOf` (the quickest character that is on, a safe win required); ∞ = nobody
that is on wins its source safely now; "cal" = an event-only material, priced by its calendar.

### Per piece
| piece (craft) | crafter now → needs | road (model) | one copy: bill h / what blocks | five (ten rings) | leaves of one copy (bank holds) |
|---|---|---|---|---|---|
| obsidian battleaxe (weapon 30) | Second 20 → 30 | 42.2 h | ∞ — cyclops eye | ∞ | 7 obsidian bar ← 28 piece of obsidian: imp, 1/50, 5,239 s each (0); 3 cyclops eye: cyclops ∞ (0); 3 imp tail 943 s (0); 4 dead wood plank (5); 3 lizard skin (28) |
| gold shield (gear 30) | Third 23 → 30 | 32.2 h | ∞ — demon horn: portal demon, no member | ∞ (20 horns) | 7 gold bar ← gold ore (7,344); 4 demon horn cal ∞ (0); 7 dead wood plank (5); 1 sapphire (1); 1 magical cure (11) |
| gold helm (gear 30) | Third 23 → 30 | 32.2 h | ∞ — demon horn, owlbear hair | ∞ | 8 gold bar; 2 demon horn ∞; 3 imp tail 943 s; 3 vampire tooth (24); 4 owlbear hair ∞ (0) |
| obsidian armor (gear 30) | Third 23 → 30 | 32.2 h | **79.6 h** (of it the full moon's calendar 42.6) | 228.1 h (17 capes, 1 spawn) | 6 obsidian bar ← 24 pieces 5,239 s; 1 ruby (1); 5 spider leg 561 s (1); 4 full moon vampire cape cal (3); 4 demoniac dust 1,257 s (0) |
| conjurer skirt (gear 30) | Third 23 → 30 | 32.2 h | ∞ — owlbear claw | ∞ | 6 obsidian bar; 4 vampire tooth (24); 3 owlbear claw ∞ (0); 4 cape cal (3); 3 vermin leather (10) |
| *or* gold platelegs (gear 30) | Third 23 → 30 | 32.2 h | **0.4 h** | 4.9 h | 8 gold bar; 3 lizard eye (19); 3 vermin leather (10); 4 vampire tooth (24); 2 ogre skin 641 s (0) |
| flying boots (gear 30) | Third 23 → 30 | 32.2 h | ∞ — owlbear hair | ∞ | 8 dead wood plank; 3 hard leather (2: a trade); 5 demoniac dust 1,257 s; 3 owlbear hair ∞; 1 magical cure (11) |
| *or* lizard boots (gear 30) | Third 23 → 30 | 32.2 h | **1.1 h** | 8.4 h | 8 dead wood plank; 4 lizard skin (28); 4 imp tail 943 s; 3 vermin leather (10); 1 magical cure (11) |
| *or* gold boots (gear 30) | Third 23 → 30 | 32.2 h | ∞ — owlbear hair | ∞ | 8 gold bar; 4 vampire blood (40); 3 lizard eye (19); 4 owlbear hair ∞; 1 magical cure (11) |
| royal skeleton ring ×2 (jewelry 30) | Fourth 21 → 30 | 50.3 h | ∞ — owlbear claw | ∞ | 8 gold bar; 3 owlbear claw ∞; 3 vampire tooth (24); 2 spider leg 561 s (1); 4 ogre skin 641 s (0) |
| topaz amulet (jewelry 25) | Fourth 21 → 25 | 17.5 h | **0.0 h** | 0.1 h | 8 hardwood plank (175); 1 topaz ← 24 topaz stone (443); 5 wolf hair (63); 2 jasper crystal (8) |
| skull wand (weapon 25) | Second 20 → 25 | 16.4 h | **0.3 h** | 2.2 h | 4 hardwood plank (175); 3 skeleton skull (66); 2 vampire tooth (24); 3 spider leg 561 s (1); 1 jasper (8) |
| slime shield (gear 20) | Third 23 (met) | 0 | out — King Slimeball: a boss (group fight) | out | 6 hardwood plank (175); 6 king slimeball (0); 3 cloth (1: a trade for wool, sheep 72 s) |
| piggy helmet (gear 25) | Third 23 → 25 | 7.3 h | ∞ — cyclops eye | ∞ | 6 steel bar (37); 6 pig skin (114); 2 cyclops eye ∞; 2 cape (3) |
| snakeskin armor (gear 25) | Third 23 → 25 | 7.3 h | **42.6 h** (the full moon's calendar) | 45.2 h (17 capes) | 2 snakeskin (24); 5 skeleton bone (8); 4 cape cal (3); 1 jasper (8) |
| piggy pants (gear 25) | Third 23 → 25 | 7.3 h | **0.0 h** (all in the bank) | 0.0 h | 5 pig skin (114); 5 hardwood plank (175); 3 snakeskin (24); 2 jasper (8) |
| emerald amulet (jewelry 25) | Fourth 21 → 25 | 17.5 h | **0.2 h** | 1.6 h | 8 hardwood plank; 1 emerald ← 24 emerald stone (457); 5 snake hide: flying snake 247 s (3); 2 jasper (8) |

The bill's own roads (`Bill.gated`) are empty for every piece: the sub-crafts (gold bar and obsidian bar: mining 30, First 32; dead
wood plank: woodcutting 30, Second 31; topaz/emerald/ruby/sapphire: mining 20) are met; the crafter's own level is the "road"
column (`gear.ts makeHours`, `:128-132`). **What blocks**: owlbear hair and claw (the owlbear, L30: every fighter wins it, none
safely, no safe win within ten levels — `winLevel` undefined; `sec5c`), cyclops eye (the cyclops, L25, the atlas's safe level 33:
the same), demon horn (the portal demon: nobody can ever be a member, `possibleMembers` empty), King Slimeball (a boss). Another
layer: none of these bills. Boss drops: King Slimeball only.

### Per fighter and piece (`gear.ts candidatesOf`, `gearNeeds`)
- **First (23), Third (24), Fourth (23), Fifth (24): no piece of either set is a candidate** — every one is level 25 or 30, above
  their combat level, and `candidatesOf` takes only what the fighter can equip now (`gear.ts:90`, `canEquip`); the slime shield (20)
  is rejected "King Slimeball: a boss (group fight)" (`gear.ts:95`). Gear by need never aims above a fighter's own level.
- **Second (26)**: skull wand, snakeskin armor, piggy pants, emerald amulet are candidates; topaz amulet is cut by `PER_SLOT` 3
  (`gear.ts:67`, `:106`: the level-25 amulets sorted by code — emerald, ruby, sapphire first); piggy helmet rejected "nobody that is
  on sources Cyclops Eye yet" (`gear.ts:96-100`); slime shield as above; the level-30 pieces not equippable.
- **The need holds for Second, not for the set**: `gearNeeds` gives Second "combat 26 → 36" with **skull wand + piggy pants +
  emerald amulet** (vs the rat): H0 **∞**, H1 117.0 h, G 41.8 h (supply 0.45, crafts 0.09, the crafters' levels 41.2: weapon 25
  16.4 + gear 25 7.3 + jewelry 25 17.5). H0 is ∞ for all five: the ten-level window (`gear.ts:205-214`) crosses combat 30, where
  `cost.ts levelHoursEstimate` is ∞ (no safe XP monster on today's pool; per level, `sec5b`: First 23→29 4.0–13.4 h, then ∞ at
  30–32; Second 26→29 5.4–13.4, ∞ at 30–35; Third and Fifth ∞ from 30). With H0 ∞ every finite set passes `G + H1 ≤ NEED_RATIO ×
  H0` (0.85, `gear.ts:159`), so `fightNeed` drops the dearest new piece up to `DROPS` 3 times (`gear.ts:153-164`): the snakeskin
  armor goes first (its G 50.0 h, of it the full moon's calendar 42.6 h; `sec5b`). The other needs: First and Fourth snakeskin
  boots (G 0.17, H1 79.9), Third a hunting bow (vs the ogre, H1 ∞), Fifth a magic wizard hat (and the spider objective).

### The whole set for five fighters, one bill
The set: obsidian battleaxe, gold shield, gold helm, obsidian armor, conjurer skirt, flying boots ×5, royal skeleton ring ×10,
topaz amulet ×5 (`billOf(world, "", …)`; `sec5.mts` `whole`):

| kind | fleet-hours | of it |
|---|---:|---|
| kills (finite) | **608.5** | imp 576.6 (**piece of obsidian 380 = 95 bars at 1 in 50: 553.0**, demoniac dust 45: 15.7, imp tail 30: 7.9), vampire tooth 41: 14.2, ogre skin 40: 7.1, spider leg 44: 6.9, rat hide 20: 3.1 (vermin leather), cowhide 16: 0.6 (hard leather) |
| kills ∞ | — | owlbear hair 35, owlbear claw 45, cyclops eye 15: no safe win today |
| gathering | 3.3 | dead wood 354 (the bank's 546 short of 900) |
| crafts | 0.7 + pieces | bars, planks, gems, trades (`Bill.crafts`) |
| crafters' levels, model | 124.7 | weapon 20→30 42.2, gear 23→30 32.2, jewelry 21→30 50.3 (`hoursToLevel`) |
| crafters' levels, play | 819–893 | report 022's from-scratch factor (play ÷ atlas: weapon 0.57–0.59, gear 0.72–0.84, jewelry 0.69–0.74; its section 2) × the new atlas: 240–249 · 232–271 · 347–373 |
| tasks for coins | 0 | 10 magical cure (bank 11) and 10 jasper (bank 8: 2 bought, 16 coins) of the bank's 432 coins (382 above `COIN_FLOOR` 50); a coin would cost `TASK_SEC` 7,020 ÷ `COINS_PER_TASK` 3.69 = 1,902 s |
| events | calendar | full moon: 37 capes (40 less the bank's 3) = 444 kills, **3 spawns, 127.9 h = 5.3 days**, members today all five; portal demon: 30 horns, **∞ — nobody can be a member** |

The measured gearcrafting of the 11-23 step: 3,335 XP in 8,958 s (`logs/journal/2026-11-23.jsonl:65`) = 1,340 XP an hour against
level 23's 11,200 (`atlas.xpNeeded[23]`): 8.4 h a level, 2.4 × the model's 3.49 h (craftK 0.1 × the atlas's 34.92 h,
`craftTrain.gearcrafting[22]`) — with a 102-fight bone hunt in it.

**The events behind the set** (`possibleMembers` today): full moon (vampire cape) and bandit camp (lizard skin, eye) — all five;
**portal demon (demon horn) — nobody** (the demon L30: no safe win within ten levels on the fleet's gear, no potion set; report
022 found the same); corrupted owlbear, cult of darkness, silent night and every 38+ event — nobody. The bank's 28 lizard skins and
19 eyes (4 since the offerings of 00:11–00:15) covered five battleaxes (15 skins) and five gold platelegs (15 eyes); lizard boots ×5 would need 20 skins more than the
battleaxes leave (7 short: one bandit camp spawn).

**What cannot be had at all yet**: demon horn (gold shield, gold helm), owlbear hair and claw (gold helm, conjurer skirt, flying
boots, gold boots, royal skeleton rings), cyclops eye (obsidian battleaxe, piggy helmet), King Slimeball (slime shield). Five of
the nine pieces of the 30–40 set; the alternatives gold platelegs and lizard boots avoid the owlbear.

### The bank today (00:00 UTC on 11-23)
lizard eye 19 (at 00:11–00:15 the combat offerings took 15 of them: 4 since — section 3) · lizard skin 28 · demon horn 0 · magical cure 11 · jasper crystal 8 · tasks coins 432 · gold bar 0 (gold ore 7,344
+ 157 in bags) · obsidian: piece of obsidian 0, obsidian bar 0 · strange ore 0 · king slimeball 0. Beside them: full moon vampire
cape 3, vampire tooth 24, vampire blood 40, topaz stone 443, emerald stone 457, hardwood plank 175, spider leg 1, healing rune 0;
bank gold 145,206.

### The healing rune
- **The planner's solve already wears it** when it is in the pool: the rune is a searched slot (`bis.ts:114` `SINGLE_SLOTS`,
  `reach.ts:320` `SEARCHED`), and every row of the check below wears it. What it must learn: a step's `wear` drops the rune slot
  (`decide.ts:161-162` `WEAR_SLOTS`), so a `pl:` step's reset never puts a banked rune on (`queue.ts:201-215 plannedSet`: `wear` and
  the utility slots only); the executor's own solves do manage it (`jobgear.ts:30` `MANAGED_SLOTS` holds the rune, `:126` every
  slot of the recommendation). Gear by need never asks for one: `gear.ts:89` skips type `rune` (and a rune has no recipe), and
  supply never buys for gold (`supply.ts:114`, `x.currency !== "gold"`). The healing rune is the rune vendor's, 10,000 gold
  (`public/data/npc_items.json`).
- **`runecheck.mts` today** (its body on today's World and tree, no policy patch — its only key, `home`, is in the tree; `sec5b`):
  the bank without its potions (`consumables.ts gearWorld`) with and without five healing runes, vs each fighter's XP pick and the
  bandit lizard. **No verdict changes**: gear alone First, Fourth, Fifth still lose the rat (25 → 31 turns) and the lizard (15 →
  16); Second and Third were safe without it. With potions (`potionRec`) the rune cuts what a fight drinks: rat 6 minor + 6 small →
  9 small (First, Fourth, Fifth), 10 → 7 small (Second); lizard 7 + 7 → 6 minor + 1 antidote (First, Fourth); Third's ogre 4 minor →
  3 + 3. A rune alone does not make today's fighters potion-free.

### The shortest order, as I read it (a proposal for the planning chat; nothing built)
1. **The crafters to 25** (model 7.3 gear, 16.4 weapon, 17.5 jewelry h; ×5.7–8.4 from scratch): the 26–29 set without its two
   blocked pieces — skull wand, piggy pants, emerald amulet, topaz amulet from the bank (+ a few spider legs and snake hides),
   snakeskin armor with the full moon's capes (3 in the bank, one spawn for five). Jasper: 32 crystals for both sets = 256 coins of
   the 382 above the floor — no task. Second wears it now; the others at combat 25 (one or two levels).
2. **Re-judge the blockers in that set**: owlbear (hair, claw: five of the nine pieces) and cyclops (eye) need a safe win; the demon
   a safe win within ten levels for the portal demon to have members. If they do not flip, the 30–40 set is out of reach whatever
   the crafters do.
3. **The crafters to 30** (model 124.7 h, play 819–893 fleet-h — the dearest part by play's measure).
4. **Without owlbear and demon**: obsidian armor, gold platelegs (instead of the skirt), lizard boots (instead of flying boots; 7
   skins: one bandit camp spawn), topaz amulet — about 8 fleet-hours of bills plus the obsidian: **95 bars are 553 fleet-hours of
   imp kills** (1 in 50), the single dearest material; the demon drops it at 1 in 12 (portal demon only).
5. **Then** the battleaxe (cyclops eye), the rings (owlbear claw), shield and helm (demon horn) as their sources open; the full moon
   calendar (5.3 days for 37 capes) runs beside.

## What was done / files
**Changed** (`git diff --stat 7524933`; nothing in `src/plan/bis.ts`, `src/sim`, `src/api`, `src/catalog`, `decide.ts`,
`config.ts`, `gear.ts`, `supply.ts`, `docs/strategy/`, `logs/`, `docs/audit/`, `docs/design/`, `docs/rework.md` but its own commit):
- `src/plan/planner/forward.ts`, `reach.ts` — the stranding (`advance`, `homeBankOf`).
- `src/state/exec.ts` — the one verdict: `fightSetFor` (the memo per character and job, re-solved on a drained stack), `freeQty`,
  `freeBank`, `setReservedOf`, `stackCaps`; `desiredForJob` through it; `provisionPotions` finds its monster in the new memo.
- `src/state/queue.ts` — `canBeat`, `huntSec`, `fightGear`, `taskGear`, `obtainOffering`, `canObtainOffering` (the verdict, the
  stack caps, no brew for an owned character, the offering's bank rule), `ctxOf` (no cooking inside an owned offering or task).
- `src/state/offerings.ts` — `keptFromOfferings`, `offeringMayTake` (and a copy of xp.ts's `unitActions`).
- `src/state/eventorders.ts` — the reservations' hook; `tripsOf` (the trips' sets, takes and pending resets) to the core.
- `src/plan/jobgear.ts` — `fightSeconds` (an export: the executor's seconds a kill).
- `src/plan/planner/events.ts` — `stockWorld`, `paidKills`, `withSet` (booked beside the step's wear, the take less what is
  held), `membersOf` (on-trip members booked and counted for what they carry; kills capped, `SLIVER`), `eventPlans` (the World
  handed on), `Trips`; `consumables.ts` — `STACK` exported.
- `public/data/atlas.json` — by `npm run atlas`.
- `scripts/check-atlas.mts` (two pins), `scripts/check-planner.mts` (the stranding case), `scripts/check-event-stock.mts` (new),
  `scripts/fixtures/world-2026-11-22-0600.json` (new: the two rebuilt Worlds of 06:00 and 06:02 on 11-22, 111 kB),
  `scripts/scenarios/` `train-hunt-verdict`, `offering-drained-stack`, `offering-keeps-lizard-eyes`, `event-take-pays` (new),
  `consumables-event-trip` and `event-trip-takes-plan` (their counts to the new rule).
- `CLAUDE.md` (offerings, the train item, the one verdict, events, tolls, the checks, the atlas, the reference; the replay's line).
  `docs/journal.md` unchanged: no record's fields changed (an `event` record's member `why` reads differently, below).
- `tasks/023-repairs.md`, this report.

**The red runs on 7524933** (a scratch copy of its tree, each new check copied in, `node --import tsx scripts/check.mts <name>`):
- `train-hunt-verdict`: `FAIL — the train loop goes on: not a safe win vs Death Knight [6 actions, 4 virtual min]` (green: `ok [11 actions, 6 virtual min]`)
- `offering-drained-stack`: `FAIL — the offering is not given up: … skipped today's combat offering — no way to get 2× Red Cloth [14 actions, 8 virtual min]` (green: `ok [24 actions, 13 virtual min]`)
- `offering-keeps-lizard-eyes`: `FAIL — no lizard eye leaves the bank: withdrew ["lizard_eye"] [6 actions, 2 virtual min]` (green: `ok [11 actions, 5 virtual min]`)
- `event-take-pays`: `FAIL — Ann goes for the 6 kills her stack buys: … members: Ann (≈35 kills in 58 min with 100 Health Potion); not: Bob — not needed: the members bring the demand, Cid — not needed: the members bring the demand` (green: Ann and Bob ≈6 kills each "(its stacks buy 6; the spawn's time 35)", "Cid — its stacks buy 1 kills")
- `check-event-stock`: `FAILED (10)` — "06:00:05: Third's set drinks 8.0 minor_health_potion a kill, its take has none ({"small_health_potion":100,"cooked_trout":32})"; "Third is counted for 45.7 kills, its 100 small_health_potion pay for 10"; "06:02:07: 2 sets name tromatising_mask, the bank and the members hold 1"; "the takes hold 200 small_health_potion, the bank and the members 126"; "the takes hold 64 cooked_trout, the bank and the members 32"; "Second is counted for 47.4 kills, its 96 minor_health_potion pay for 8" (and four more of the same kind)
- `check-planner` (plain, the new case): `MISMATCH task 023: gold for one way only — the isle's step ends at the bank its trip starts from, a free route to the city` (First at (-3, 20) on the isle)

**Every command run**, in order (`<scratch>` = `D:\Temp\claude\71701bc605da51df\39b0e8b4-3413-4ac7-ae45-71336315f156\scratchpad`):
- 1. `git status --short; git log --oneline -3; git diff --stat`
- 2. `git add docs/rework.md; git commit -m "Rework notes" …; git log --oneline -2` → 78359a8
- 3. `sha256sum logs/world/2026-11-22.json` (+ head/tail of P0s.jsonl, ls logs/world, cat logs/status.json) → 14aa19cb…e940aa
- 4. `npm run -s typecheck` (after the stranding repair) → ok, 9 s
- 5. `NODE_OPTIONS=--max-old-space-size=2048 npm run -s outlook -- --world logs/world/2026-11-22.json --json > <scratch>/s1.jsonl` (background)
- 6. `git status --short; git log --oneline -3; git diff --stat` … (reads); `wc -l` of the files to read; `ls logs/raw/2026-11-23/ logs/journal/`
- 7. `grep` of the journal for `gearcrafting:25`, the raw log 02–04 UTC of 11-23 (Third), the journal's level/step/int records of 11-23
- 8. `node -e` reads of logs/world/2026-11-23.json (bank, recipes, drops)
- 9. `node --max-old-space-size=2048 --import tsx <scratch>/replay.mts logs/world/2026-11-23.json Third <time> <monsters>` (×3: 02:14, 02:16:20, 04:42:24; DRUNK=… to empty the stacks the fights drank)
- 10. `grep` of the journal 11-22 `event` records and the raw log 06.log of 11-22 (the mask); step records before 06:01
- 11. `npm run -s typecheck` (×3 during the repairs) → ok
- 12. git archive 7524933 src scripts public package.json tsconfig.json | tar -x -C <scratch>/old; mklink /J <scratch>/old/node_modules node_modules (the old runner, for the red runs)
- 13. npm run -s check -- <name> (new scenarios, one at a time) and in <scratch>/old: node --import tsx scripts/check.mts <name> (the red runs)
- 14. node --import tsx <scratch>/rebuild.mts <scratch>/world-0600.json 2026-11-22T06:00:05.500Z 2026-11-22T06:02:07.100Z; cp → scripts/fixtures/world-2026-11-22-0600.json; node --import tsx <scratch>/evtest.mts <root> <fixture> (old and new core)
- 15. scratch trees: <scratch>/s1tree = git archive 7524933 + git apply of `git diff 7524933 -- src/plan/planner/forward.ts src/plan/planner/reach.ts` (the stranding alone); <scratch>/s5tree = a copy of the repaired tree (src, public) once the repairs were in; node_modules junctions
- 16. node --max-old-space-size=2048 --import tsx docs/strategy/022/tools/drive.mts --tree <s1tree> --world logs/world/2026-11-22.json --dec <scratch>/dec-s1.dec > <scratch>/d-s1.jsonl (background, beside 16b and the outlook of 5)
- 16b. the same on <s5tree> → <scratch>/d-s5.jsonl, dec-s5.dec
- 17. node --import tsx <scratch>/sec3.mts > <scratch>/sec3.txt (section 3: the int-end withdrawals, the rule's list; a first run hung on store.ts's clock and was stopped)
- 18. npm run -s typecheck; npm run -s check > <scratch>/check1.txt → 91 of 91 ok, 190.3 s (beside three long runs)
- 19. node … scripts/check-planner.mts (plain) on the repaired tree and on <scratch>/old with the new case (the red run); git archive 7524933 docs/design/snapshot into <scratch>/old
- 20. cp public/data/atlas.json <scratch>/atlas-old.json; (time npm run atlas) — the one allowed run
- 21. node <scratch>/atlasdiff.mjs <scratch>/atlas-old.json public/data/atlas.json; node --import tsx scripts/check-atlas.mts (2 MISMATCH, then the pins updated: OK (8 checks))
- 22. <scratch>/s6tree = a copy of the final tree with the new atlas; node --max-old-space-size=2048 --import tsx docs/strategy/022/tools/drive.mts --tree <s6tree> --world logs/world/2026-11-22.json --dec <scratch>/dec-s6.dec > <scratch>/d-s6.jsonl (background, beside 5, 16, 16b)
- 23. Stop-Process of the d-s1 drive (PowerShell, by its command line) at day 31: its decisions had given the first parting point; P0s's own stats line is in docs/strategy/022/runs/P0s.jsonl
- 24. NODE_OPTIONS=--max-old-space-size=2048 npm run -s outlook -- --world logs/world/2026-11-22.json --json > <scratch>/s6-outlook.jsonl (the final tree, the reference road a second time; background beside 5, 16b, 22)
- 25. node docs/strategy/022/tools/cmp.mjs <scratch>/s1.jsonl docs/strategy/022/runs/P0s.jsonl → 97 vs 97 lines; equal (the run of 5: 71 min 23 s wall, 4,282.1 s by its done line)
- 26. (between 11 and 13) `npm run -s check` (the first plain run after the repairs: 84 of 86, consumables-event-trip and event-trip-takes-plan failing on their old counts); `npm run -s check -- event-trip-takes-plan` / `-- consumables-event-trip` (×2 each, with the scenarios' new numbers, `sed`/`node` edits); `node --import tsx <scratch>/explore-a.mts`, `explore-a2.mts`, `explore-a3.mts` (L=12, 20 …: finding a drained-stack fight for the scenario); `grep` reads of the harness, scenarios, `check.mts`, `check-planner.mts`, `public/data/*.json` (`node -e`), `tasklist`, `Get-CimInstance Win32_Processor` (16 cores, 32 threads)
- 27. `git diff --stat; git status --short; git diff src/plan/planner/events.ts …` (reviews); `grep -n` of the final line numbers; `date -u`; reads of `logs/status.json` and the journal's `outlook`/`boot` records
- 28. section 5 (a forked agent of this session, read-only; its own list is in the section): scripts `<scratch>/sec5/sec5.mts`, `sec5b.mts`, `sec5c.mts` with `node --max-old-space-size=2048 --import tsx`, `node -e` reads, `grep`/`sed` reads of the tree
- 29. npx vite build --outDir <scratch>/ammo-023-dist --emptyOutDir (the scratch build)
- 30. cp the runs into <scratch>/runs (P0s.jsonl, d-s5 → R5.jsonl); DETAIL=1 node docs/strategy/022/tools/tab.mjs <scratch>/runs P0s R5; node docs/strategy/022/tools/cmp.mjs <scratch>/d-s5.jsonl docs/strategy/022/runs/P0s.jsonl → differ at next, day4 …
- 31. node docs/strategy/022/tools/cmp.mjs <scratch>/s6-outlook.jsonl <scratch>/d-s6.jsonl → 97 vs 97 lines; equal (the outlook run: 87 min 10 s wall); cp d-s6 → <scratch>/runs/REF.jsonl; DETAIL=1 node docs/strategy/022/tools/tab.mjs <scratch>/runs P0s R5 REF; node -e reads of the decision files (where REF parts from R5 and P0s; supply hours by work) and of the runs' stats (the consumables' share)
- 32. (time npm run check -- planner) > <scratch>/replay.txt — alone on the final tree → `OK (681887 invariant checks, 97 made-up cases; deadline points 92 / 121 / 102 / 84 / 89)`, `1 checks: 1 ok … 2855.3 s`, 47 min 38 s wall
- 33. CLAUDE.md: the replay's line (node edit); npm run -s typecheck; (time npm run -s check) > <scratch>/check2.txt — the final plain gate, alone → `91 checks: 91 ok, 0 known defects reproduced, 0 failed — 189.7 s`
- 34. `node <scratch>/assemble.mjs <scratch>/values.json tasks/023-repairs.report.md` (this report from the scratch drafts); reads of `logs/status.json` and the journal's `outlook`/`boot` records; `git status --short`
- 34b. `node` edits and `sed` of the report itself (wording, the notes' order) after reading it through
- 35. after writing it: `git add -A tasks/023-repairs.md tasks/023-repairs.report.md src scripts public/data/atlas.json CLAUDE.md; git status --short; git commit -m "023: repairs" …; git log --oneline -3; git push origin rework; git log origin/rework --oneline -1; git log main --oneline -1`; `cmd /c rmdir` of the four `node_modules` junctions in the scratch trees, then `rm -rf` of the scratchpad's contents

Section 5's own (the forked agent's), as it listed them:
(scratch = `D:\Temp\claude\71701bc605da51df\39b0e8b4-3413-4ac7-ae45-71336315f156\scratchpad\sec5`)
1. `mkdir -p <scratch>; head -40 docs/strategy/022/tools/runecheck.mts; head -30 docs/strategy/022/tools/sec3.mts; wc -l` (both)
2. `grep -n` in `src/plan/planner/decide.ts` (WEAR_SLOTS), `src/plan/jobgear.ts` (MANAGED_SLOTS), `src/plan/planner/gear.ts`, `src/plan/planner/config.ts` (COIN_FLOOR, TASK_SEC, COINS_PER_TASK, NEED_RATIO, PER_SLOT)
3. Read `src/plan/planner/gear.ts:60-320`; `grep -n` exports of `src/plan/planner/supply.ts` and `billOf -A 30`; Read `supply.ts:176-235`
4. `grep -n` the sections of `tasks/022-strategy.report.md`; Read it `:670-889`
5. `grep -n` in `cost.ts` (levelOf, hoursToLevel …), `roles.ts`, `pick.ts`, `config.ts` (craftK); `sed -n '/export function hoursToLevel/,/^}/p' cost.ts`
6. `grep -n` bundleOf, gearWorld, events.ts exports; `grep -n 'export function gateRoad' -A 25 supply.ts`; `node -e` the 11-23 snapshot's config.on, roles, levels, current, bags
7. `node -e` items.json (the set's codes and recipes, the runes) and npc_items.json (the runes' sellers)
8. `grep -n` stepSec/makePlace/perOf (cost.ts), usableSec/gapSec (events.ts), MonsterPick (pick.ts)
9. `node --max-old-space-size=2048 --import tsx <scratch>/sec5.mts <scratch>/out.json` (2.6 s)
10. `node -e` reads of out.json (needs, roads, bank, coins, crafters; the per-piece summary → pieces.txt; candidates, events, the whole bill → rest.txt)
11. `node --max-old-space-size=2048 --import tsx <scratch>/sec5b.mts <scratch>/outb.json` (2.5 s); `node -e` its rune rows; `sed -n 155,175p src/plan/planner/decide.ts`; `sed -n 25,35p src/plan/jobgear.ts`; `grep -n '"rune"' src/plan/bis.ts src/plan/planner/reach.ts src/state/queue.ts`
12. `node --max-old-space-size=2048 --import tsx <scratch>/sec5c.mts <scratch>/outc.txt` (who wins the source monsters, sub-recipes); `grep -n` plannedSet / jobSetFromRecommendation; `sed -n 122,130p src/plan/jobgear.ts`
13. `node -e` the whole bill's field leaves in fleet-hours; `node -e` the snapshot's bank of the sub-materials, bags, gold
14. `sed -n 106,118p src/plan/planner/supply.ts`; `node -e` atlas xpNeeded[23], [24], craftTrain.gearcrafting[22], coinPrices

## Notes
Defects noticed and not touched, then guesses, the most doubtful first.
1. **`stock.ts reserved` counts a running step's whole `withdraw` after its reset has taken it** (`stock.ts:32`): the planner's
   `available` and now the runner's `freeQty` see the bank short by that much while the step runs (11-23 00:00: Third's ogre step's
   96 minor and 96 small health potions). Conservative, never a double booking; stock.ts beyond a member's take was not this
   task's to change.
2. **An offering respects the running steps' reservations, not an open parent's bill**: a bill's material (a gear piece's iron
   bars, say) is no reservation in stock.ts, so an offering may still take it. The static rule covers the event, boss, coin and
   rare codes either way.
3. **A train loop's `sourceOne` withdraws its materials whatever the running steps reserved** (`queue.ts:920`, its bank leg); only its
   hunt's potions and set read `freeQty`.
4. **`xp.ts unitActions` is private**: `src/state/offerings.ts:66-80` carries a copy (with a `shortcut:` comment) — two copies of
   one rule until xp.ts exports it.
5. **`FIGHT_SEC` (40 s, `xp.ts:83`) still prices a drop fight** in `xp.ts fieldSec` (the potions' and food's price of the core)
   and in the train picker of a character the planner does not own (none today); Third's 102 skeleton fights cost 79 s each.
6. **A member's kills are capped by its forecast's use a kill**; the bandit camp trips of 11-22 drank 2.68 times their plan
   (report 022). Where the forecast drinks too little the cap is still too generous — the rule follows the forecast, not the log.
7. **The drop luck of 11-23** (7 bones in 102 skeleton fights against 12.75 by the drop table) I read as luck — a chance of 11% by the drop table (1 in 12, 1–2 a drop); one sample.
8. **The rebuilt Worlds of 06:00 and 06:02 on 11-22** (`scripts/fixtures/world-2026-11-22-0600.json`) carry 00:00's achievements
   and only Third's bag; 7524933's core gives the 06:02 line word for word and the 06:00 one with 46 kills for the journal's 44 (its
   demand lacks the lizard skin item the gear needs added by then).
9. **`train-hunt-verdict` sets `plannerOn` itself** (the harness cannot queue a train item for an owned character, and the planner
   would not choose that recipe); it proves what the runner does with an owned character's train item, not that the planner
   writes one.
10. **The on-trip member's pending reset** is read from the queue: the trip's first item, id ending `:0` (`eventorders.ts:98`); a
    trip written another way would count as reset.
11. **The rule's "rare" list holds gear** (skeleton armor, helmet, pants; the gem amulets; dreadful staff and amulet) because another
    recipe takes them and their materials sum over 50 actions — xp.ts's rule as it stands; and `shell` and `wooden_stick`, by the
    same rule.
12. **The offering's and the task's fights of an owned character now rest where they cooked** (`ctxOf`); on 11-22 Third cooked 57
    trout and brewed 184 minor potions inside one offering. The offering may now end "no way to get …" sooner; that is the rule
    (task 014's), and the offerings round is later.
13. **Consumables by need spend on works that do not complete** (the reference road, section 4): 1,716 character-hours of
    potions for a_peaceful_island, open at the deadline ("gear: no safe win within ten levels"), 584 h for the portal efreet
    sultan, 203 h for closing_the_gate ("an event"). A need is judged per work on `G + H1 ≤ NEED_RATIO × H0`
    (`consumables.ts consumableNeeds`); whether the work's achievement can complete at all is not in it. The new atlas made it
    visible (cheaper fights make more needs hold); a price of the core, so 024's, not this task's.
14. **The reference road's fleet drinks 147,800 potions and reaches combat 46**; 65% of its hours make consumables, more than
    P0s's 57% — the potion-free set of section 5 is the lever report 022 named.
15. **The replay's rows moved both ways** (A +4, C −6, E −2, G +8) and I did not trace them row by row: the replay's World is not the live one, and the repairs and the atlas act together there; the reference road is the measure this task was asked for.

## To delete (Alex)
Nothing. My scratch (`D:\Temp\claude\71701bc605da51df\39b0e8b4-3413-4ac7-ae45-71336315f156\scratchpad`: the four scratch trees with their `node_modules` junctions removed first, the runs, the decision files, the build) is deleted by me at the end; `.ammo/atlas.db` is `npm run atlas`'s own.
