# 022 — The strategy experiment: what the fleet should play for first

## Goal
Alex, 2026-11-22: the whole approach is on the table. He believes there must be a way to **silver (158 points)**
this season and asks whether the fleet should stop going straight for achievements — level the heroes first, then
take the achievements faster — or whether another way exists. The account stands at 30 points on day 29 of about
123; the model expects 82–103 at the deadline (report 021), bronze is 105.

What the chat read that makes the question a real one (each to be checked, section 2 and 3):
- **The fleet does not fight.** The journal from 11-21 11:43 to 11-22 17:25 UTC, 149.5 character-hours: `level`
  steps 76.5 h (67.5 h of it `lvl:mining:35`), `supply` 36.9 h (35.2 h of it for Minor and Small Health Potion),
  `objective` 26.2 h, offering interrupts 6.0 h, event trips 3.8 h. By the meter: gather 104.7 h (85%), fight 2.0 h
  (1.6%), rest 2.3 h. Three combat levels in the fleet (Third 23 and 24, Fifth 24), one point (a second at 18:46).
- **A fight hour costs about seventeen hours of making**: 24 kill steps, each vampire kill drinking 6–8 Minor Health
  Potions (`ach:the_reaper:1@Second#2`: 10 kills, 61 potions).
- **The points are behind combat**: by the map, 81 of the 195 points open on 11-18 need combat 41+, 64 of them
  46–50 (`docs/rework.md`, decision 11). The fleet is at combat 23–25; the leader of 11-18 had five characters at
  40–42 and one crafter at 40 / 41 / 35 after 16–26 days.
- **The rule cannot see that far** (read in the chat at `2db1053`):
  - rule 3's bundle is the nearest gate of a lane only: `bundle.ts:128-129` keeps the achievements behind `next =
    min(at)`; the points behind every later gate of the lane are in no score;
  - an objective fits or does not (`decide.ts:245`, `fit = h <= calH ? 1 : 0`): work that could wait until January
    at the same price ranks as work that cannot;
  - gear by need is judged per fighter on its next ten levels (`gear.ts:201-205`), and a crafter's level road is
    charged in full to that one fighter's need (`makeHours`' `levels`, `gear.ts:127-133`) though five fighters and
    every later piece would use it; a crafting level is a candidate only through such a need (`decide.ts:291-294`);
  - consumables free are worth 33 points in the replay (row B 121 against row A 88, report 021) — a third of the
    season is potion making.

After this task Alex can choose **what the game is played for first**, on numbers: every policy below played by the
exact forward model from one fixed World to the deadline, beside what the leaders did and what play has shown so
far. **Nothing in the engine changes in this task**; the chosen policy is built in 023, with the executor's repairs
report 021 named.

The service was restarted at **17:49:00 UTC on 2026-11-22** (run `0e2f`, commit `2db1053`, report 021's code): five
steps re-attached; the first outlook took 318.1 s to 12-13 (`HORIZON_DAYS` 21), 55 expected by then; expert_miner
came at 18:46:53 UTC (the outlook said 18:51:40); 30 points; bank 96 of 110, gold 169,966; blocked:
`lvl:gearcrafting:25@Third` until 21:30 UTC ("not a safe win vs Ogre", the second strike).

Read first: `CLAUDE.md`; `docs/rework.md` ("The goal", decisions 11, 12, 26, 32, 34, 40, 46, 54, 55; "Open
questions"); `docs/design/planner.md` (A.2, A.5, B.3); `docs/design/achievement-map.md` (F, H); report 021 whole;
reports 005 (the comparison of plans) and 014 ("the levers"); then `src/plan/planner/decide.ts`, `bundle.ts`,
`gear.ts`, `consumables.ts`, `cost.ts`, `forward.ts`, `road.ts`, `roles.ts`, `config.ts`; `scripts/outlook.mts`;
`scripts/check-planner.mts` (how the rows set their config); `docs/journal.md`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed**, and in it only: this task file, the report, and a new folder
  `docs/strategy/022/`. **Nothing under `src/`, `scripts/`, `public/`, `logs/`, `docs/design/`, `docs/audit/` and no
  other file of the working tree changes** (`docs/rework.md` is the planning chat's). Every policy lives in scratch
  copies of the tree, as 021's states did (`git archive HEAD … | tar -x`, `node_modules` linked); scratch goes to
  `D:\Temp` or your session scratch directory and is deleted at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start, stop
  or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`, `npm run
  atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`. Nothing you run writes under
  `logs/`; reading there is allowed. If the journal or `logs/status.json` shows a restart or a new run id during
  your hours, say so first in the Summary.
- **Requests to the game: public reads only, allowed by Alex on 2026-11-22 for this task.** `GET` on
  `https://api.artifactsmmo.com` paths that `docs/api/openapi.json` marks without security — `/leaderboard/accounts`,
  `/leaderboard/characters`, `/accounts/{account}`, `/accounts/{account}/characters`,
  `/accounts/{account}/achievements`, `/characters/{name}`, `/grandexchange/history/{code}` — **no token, no
  `Authorization` header, `.env` is not read**, at most 120 requests in all, at least a second apart, each
  response saved as it came under `docs/strategy/022/snapshot/`. A 4xx or 5xx is reported, not retried in a loop.
  No other request to the game.
- **Dependencies:** none new.
- **The machine is strong and may be used** (Alex, 2026-11-22: many runs in parallel are fine; report 021 read 16
  cores / 32 threads and 63.9 GB). Read the core count first; run **as many long runs side by side as there are
  physical cores less four**, each a process of its own with `--max-old-space-size=2048`, the runs' memory together
  under 40 GB. Timings need not be taken alone in this task; say how many ran together. The service must not
  notice: its characters' steps go on (no gap in the action lines beyond a cooldown) and its outlook child (about
  five minutes every three hours, below normal priority, killed at thirty) still ends — name every `failed` outlook
  record of your hours in the Summary, and if one fails, halve the runs side by side.
- One task only. Don't write the next task. Everything you write is in **English**.
- For every claim about the code give `path:line`; for every number say where it comes from (the run, the file,
  the request).
- **Every command you run is in the report's list**, git commands too.
- Gate: `git status --short` shows only this task file, the report and `docs/strategy/022/`; `git diff --stat HEAD
  -- src scripts public docs/design docs/audit` is empty. No other gate: nothing the checks read has changed.
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the planning
  chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again by the end,
  commit it again the same way before the task commit. `022: strategy experiment` holds this task file, the report
  and `docs/strategy/022/`. Then `git push` (to `origin/rework`). If the push fails, don't retry in a loop: say so
  under "How Alex verifies".

## What is settled
1. **The experiment is the forward model's, from one fixed World**: `logs/world/2026-11-22.json` (the snapshot of
   00:00:32 UTC; report 021 played it with the final tree: 98 at the deadline, 36 completions, 9,014 steps,
   3,587.7 s, 561,788 solves; its 21 days 423.9 s). Copy it to scratch once, with its SHA-256 in the report. **The
   harness is proven first**: the untouched tree (`P0`) from that file gives report 021's road to the digit. A
   policy is a config key of the scratch tree that is off by default — with every key off the scratch tree gives
   `P0`'s lines — so 023 can lift it; each policy's diff against `HEAD` is saved as
   `docs/strategy/022/policies/<name>.patch`, each run's `--json` lines as `docs/strategy/022/runs/<name>.jsonl`.
2. **The model's known defect is repaired in scratch before anything is compared** (`P0s`): a character whose
   tolled step ends stands at a bank on the home side, as in play (report 021, Notes, first: `forward.ts:194`,
   `:143`, `reach.ts:101`). `P0` against `P0s` says what the stranding cost; every policy below carries the repair.
   If the repair is not a small one, say so first in the Summary, and compare on `P0` instead.
3. **Speed may be bought in scratch** where it keeps `P0s`'s every line equal but the seconds (report 021, Notes:
   the solve table at 91,788 of `MEMO_CAP` 100,000 with 563k misses). Not a goal: at most an hour of it.
4. **The policies.** How each is built is yours; what each means is settled here. Interrupts (offerings, events,
   claim, bank) stay as they are in all of them. "First tier" = where `config.first` ranks today
   (`decide.ts:361-364`), among themselves by today's scores; with no such candidate, today's rule.
   - **`S30`, `S35`, `S40` — the spine.** While a character's combat is below N, what serves its combat road is
     first tier: the combat level step, the gear pieces and the consumables whose need's work is that road
     (`gear.ts` (a), `consumables.ts` (a)) and every link of their supply. All five characters.
   - **`C30`, `C35` — the crafters first.** The three gear-crafting role holders (`config.ts:27-32`:
     weaponcrafting Second, gearcrafting Third, jewelrycrafting Fourth) take their skill to N in the first tier,
     their materials' supply with it. Third is also the fleet's alchemist: say what the potions did meanwhile.
   - **`CS` — both, the leader's pattern**: the best `C` with the best `S` (the crafters' floor first for the
     three, the spine for all five).
   - **`D1` — the rule sees every gate.** Rule 3's level target scores the best over the lane's gates g of Σ
     points behind the gates up to g ÷ (the hours to g + their hours), not the nearest gate's bundle
     (`bundle.ts:128-129`); the solves this costs are yours to bound, say how.
   - **`D2` — a crafter's road is the fleet's.** Gear by need (a) is judged for the fleet: one G, the fighters' H0
     and H1 summed over those who would wear a piece of the set, so a crafting level's road is paid once
     (`gear.ts:127-133`, `:201-…`). Run as `D1+D2`.
   - **`F3` — three fighters.** The combat lane for three characters only; the two it frees are the ones whose
     roles carry the most supply and crafting hours in `P0s`'s run. On the best policy so far.
   - **`B` — consumables free** (the replay's row B config), on `P0s` and on the best policy: the bound of what
     buying consumables is worth.
   - **One of your own**, if sections 1–3 show a way the chat did not see (what the leaders did that none of the
     above does). Say what it is before its numbers.
   **A calendar is never sold for a level**: in `S`, `C` and `CS` a level road behind which an event achievement
   sits (the apparitions at mining and woodcutting 35) keeps its place while its calendar would otherwise stop
   fitting (`bundle.ts` `cal`); say how you kept that, and what the policy lost where it could not.
5. **Two stages, every policy in both.** A: every policy for 42 days (to 2027-01-03) — the early table, and the
   proof that each policy plays. B: **every policy to the deadline**, side by side as the rules allow, the dearest
   started first. A run past four hours is stopped and reported at its last whole week, said plainly. With the
   time the machine leaves, play the combinations the first results point to (the best `S` with `D1+D2`, `F3` and
   `B` on more than one policy, another floor) rather than fewer runs — say which and why.
6. **What a run reports** (one table a policy, one comparison table across them): the points on days 7, 14, 21,
   28, 42, 56, 70, 84 and at the deadline; the day 105 is passed and the day 158 is, if ever; each character's
   combat level on those days and the three crafters' skills; the fleet's hours by answer (level by lane, supply
   by what it is for, objective, filler, fallback) and the share of fighting, making and gathering; potions drunk;
   kill steps; the completions with their days; what the open points wait for at the deadline (`waitingOf`'s
   groups); seconds, solves.
7. **How far a number is believed** — for `P0s` and the two best policies, the points at the deadline split by
   what play has shown: gathering, crafting and tasks only; kills of monsters the fleet has fought in the journal
   or `logs/dev.log` with the plan's potions holding; kills never fought; event work; anything behind a toll. A
   policy that wins only in the last two groups is said to.
8. **The executor's known faults stay out of the comparison and in the report** (report 021: a train loop's drop
   hunt that adopts a brew set and never brews; an event member's `take` without the potion its set needs; a
   drained stack that does not re-solve; `eventMembers` booking one mask twice). They are 023's. Section 2 counts
   what they cost per day in play so far, so the report can say what any combat-first policy loses until they are
   repaired.
9. **Not in this task**: any change to the working tree's engine, checks or docs beyond the rules; the Lab;
   buying anything; the Grand Exchange beyond reading history; gems; group fights and raids as code (section 5
   only prices them); a restart.

## 1. Read-only: what the leaders did
The old reads are in `docs/design/snapshot/` (11-18: `leaderboard-accounts.json` — the leader `uaprsf` 59, the best
non-members `automode` 44, `Elemental`, `Wudagem`, `Big_Shark` 43; this account 15). Read again and compare:
- `/leaderboard/accounts` by achievement points (the first two pages): where this account stands, how many accounts
  are at or above 105 and 158, **the pace of each of the top thirty over the four days** (points on 11-18 → now),
  and from it what silver asks: the day a linear pace from today reaches 158;
- for the top ten, the five best non-members and the five accounts just above this one: `/accounts/{a}/characters`
  (levels, skills, what each wears) and `/accounts/{a}/achievements` (completed, with the dates if the API gives
  them). From it:
  - **the order**: for the leader and the two best non-members, every achievement with its day of the season, and
    the levels they must have had then where a gate tells (the map's gates); which achievements this fleet has and
    they took later, and the other way round;
  - **levels against points** across all of them: the combat levels and the three gear-crafting skills against the
    points — is there an account with many points and low combat, or high combat and few points;
  - **what they wear** at combat 30, 35, 40+: the pieces, the crafting level each needs, and which need an event,
    a boss, tasks coins or gold — the gear road a fleet actually takes;
  - **what they hold that this fleet does not make**: utility slots (which potions), runes, artifacts, bags;
  - how many characters fight: is any top account three fighters and two workers;
- `/grandexchange/history/{code}` for minor_health_potion, small_health_potion, health_potion, algae, nettle_leaf,
  sunflower (at most ten codes) beside `npm run market`: is a season's potion bill on sale, at what price, from
  whom.
Say plainly what the leaders' way is, in five lines, and which of the policies of settled point 4 is nearest to it.

## 2. Read-only: where this fleet's hours go, and what play says about the model
From the journal (`logs/journal/2026-11-21.jsonl`, `2026-11-22.jsonl` and later days; `npm run journal` for its
tables) and the raw log where the journal is silent:
- the chat's table above, checked and extended to the hour you read it: character-hours by answer and by what the
  work was for, the meter's groups, points and combat levels gained, per day;
- **every kill step and event trip**: kills planned and done, seconds a kill planned and measured, potions planned
  (the step's `take`) and drunk, lost fights; per monster the ratio measured ÷ planned for seconds and for potions;
  the hours of making behind an hour of fighting;
- **what the executor's known faults cost** (settled point 8): every pause, block, lost trip and refused offering
  of the journal's days, in character-hours and in the points their targets carry;
- the samples against their estimates by kind (gather, craft, level, kill): where the model is within a tenth and
  where it is not — the crafting levels above all (`lvl:gearcrafting:25@Third#1` on 11-22: planned 12,388 s, ran
  2,353 s): **what a gear-crafting level costs this fleet in play** against `craftK` 0.1 and `craftAbove40` 60
  (`config.ts:37-38`; the open question of `docs/rework.md`).

## 3. Read-only: what a combat level costs, and what gear buys
On the fixed World (the scratch tree, `P0s`), per fighter at its own level and at +5, +10 and +15 levels (the model
solves a level above the character's own):
- its XP pick and the three monsters with the most XP it could fight: seconds a kill, potions a kill, the hours a
  level — with **(i)** today's pool, **(ii)** every piece the three crafters can make today, **(iii)** with the
  crafters at 30, **(iv)** 35, **(v)** 40; pieces with event, boss, tasks-coin or gold materials counted in a
  column of their own; each at today's potion price and with potions free;
- so: **the road from today to combat 30, 35, 40 and 45 in fleet-hours and days**, split into fighting, making
  consumables, making gear and levelling the crafters, under (i)–(v); and where it stops (no XP source, a potion
  nobody brews, a piece nobody can make);
- the crafters' own roads by the model and by section 2's measure: weaponcrafting 20 → 30 → 35 → 40, gearcrafting
  23 → …, jewelrycrafting 21 → …, in hours and materials;
- **what the points behind combat are**: the open achievements by the combat level they need (the map's gates on
  today's account), cumulated: at combat 30, 35, 40, 45, 50 how many points are in reach, how many of them wait
  for an event's calendar, a group, a raid, a toll, `use`.
This section alone may answer the question; say so if it does.

## 4. The policies
Settled points 1–7. The order: the harness (`P0` to the digit) → `P0s` → stage A → stage B. The comparison table
first, then a table a policy, then for the two best where their roads first part from `P0s`'s (the day, the
character, the two steps and whys).

## 5. What the best policy leaves open
For the best policy's run:
- the open points at the deadline by `waitingOf`'s groups, and for each group what would open it and when the
  fleet meets its other gates in that run: the `use` objectives (10 points), the group bosses (9), the raids (8),
  the layers, the events that did not fit;
- **the consumables' bill of the season in gold**: every potion and food ingredient the run consumed, in units,
  at the prices section 1 and `logs/market/` show, against the bank's 169,966 gold and what the run earns; and
  the same for row `B`'s gain — what a point bought that way costs;
- gems: what the rewards at 50 and 105 points would add if spent on event spawns — a statement of what is known
  from the docs and the snapshot, no guess dressed as a number.

## 6. The recommendation
One page: the policy to build in 023 and why; what it expects at the deadline and how far that is believed
(settled point 7); the day silver would be passed, or the points short of it and what they hang on; what 023 has
to build beyond lifting the patch (the executor's faults that bite the chosen policy first, in order); and what
would make you change the recommendation.

## Out of scope
Everything of settled point 9; regenerating the atlas; moving or deleting anything under `logs/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `022: strategy experiment` on top of `Rework
   notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why the
   push failed); `git log main --oneline -1` → `edaaf23`.
2. `git diff --stat 2db1053 HEAD -- src scripts public docs/design docs/audit` → empty.
3. `docs/strategy/022/` holds `snapshot/` (the raw reads, at most 120), `policies/` (a patch a policy) and `runs/`
   (a `.jsonl` a run); the report's comparison table can be rebuilt from `runs/`.
4. The report's `P0` line equals report 021's road from the 11-22 file: 98 at the deadline, 36 completions, 9,014
   steps.
5. `logs/status.json` still carries run `0e2f` (or the Summary says otherwise) and every outlook record of the
   task's hours ended.

## Report
`tasks/022-strategy.report.md`, with these sections in this order:
- **Summary** — 6–10 lines: a restart or a failed outlook during the work; the leaders' way in two lines; the
  comparison's result (the best policy, its points at the deadline against `P0s`, the combat levels on day 42 and
  at the deadline); whether silver is in reach by the model and what it hangs on; how far the number is believed;
  the recommendation in one line.
- **Decisions for Alex** — numbered, only what is his: what the game is played for first (the policies that
  survived, with their numbers), what may be spent (gold for consumables), anything else of that kind. "None" if
  empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What the leaders did** — section 1.
- **Where the hours go** — section 2.
- **What a combat level costs and what gear buys** — section 3.
- **The policies** — section 4.
- **What stays open** — section 5.
- **The recommendation** — section 6.
- **What was done / files** — every command run, every request made (the path, the status).
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
