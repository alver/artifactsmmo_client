# 023 — The repairs: the island, the runner's four faults, what an offering may give away, the atlas

## Goal
Report 022 answered the question of decision 55: the order of work is not where the points are. Every policy
that only reorders the same work moves the deadline by −8 to +3 points; no first-tier policy is built (Alex,
2026-11-23, decision 56). What decides is **how the fleet fights** (in the model 57% of the season's hours make
potions; the leaders' fighters drink none: a rune, cooked fish, craft-30 gear with event and tasks-coin
materials) and **what the code cannot do yet** (group bosses, other layers, `use`). The order from here, agreed
with Alex: **023 the repairs** (this task), 024 the gear road (the planner aims at the set that needs no
potions), 025 group boss fights, then `use` and the layers.

This task repairs what is certain and costs every day, and prepares 024:
- the forward model no longer strands a character behind a paid transition (022's `P0s`), so the outlook and
  the Season card stop reading low;
- **a fight is admitted by the same verdict that chose it**: the check that picks a fight (a member check, a
  train loop's `canBeat`, an offering's dry run) and the gate that admits it see the same set and the same
  stacks. The runner's four known faults are four breaches of that one rule;
- an offering no longer gives away what the fleet's gear will be made of;
- the atlas is the repaired solver's, and the reference lines are pinned once more — they are 024's baseline;
- read-only: where the potion-free set of report 022 stands today, piece by piece.

**The service** runs report 021's code and stays undisturbed: run `0e2f`, commit `2db1053`, up since
2026-11-22 17:49:00 UTC. `logs/status.json` at 07:34 UTC on 11-23: 33 points; bank 104 codes of 130 slots,
gold 145,798, the next expansion 56,000; combat 23 / 26 / 24 / 24 / 24; weaponcrafting 20 (Second),
gearcrafting 23 (Third), jewelrycrafting 21 (Fourth); `lvl:gearcrafting:25` blocked for all five until
2026-11-24 00:00 UTC ("not a safe win vs Spider", three times running). `HEAD` is `7524933` (`022: strategy
experiment`) on `rework`, pushed.

**Read in the chat on 2026-11-23** (the journal of 11-22 and 11-23, the code at `7524933` — `src/` is
`2db1053`'s; check each against the files and say where one is wrong):
- **The offerings of 11-23 burned the lizard eyes.** The_new_bandit was completed at 21:07:58 UTC on 11-22 and
  Second claimed its reward at 21:19:09: 12 Lizard Eye and 12 Lizard Skin, banked. At 00:09–00:15 UTC on 11-23
  the combat offering asked 5 Lizard Eye: First, Second and Fourth each withdrew 5 from the bank and completed
  it (`int-end` records: `wd` `lizard_eye` 5; 2,800 / 3,650 / 2,800 combat XP); Third and Fifth were refused
  "no way to get 5× Lizard Eye". Fifteen eyes for 9,250 combat XP. The lizard eye is an
  event-only material (bandit lizard, the bandit camp) and is in the recipes of the gold tier the leaders wear
  at 40+ (gold platelegs, gold boots — report 022, "What they wear"). `canObtainOffering`
  (`src/state/queue.ts:1269-1294`) takes a requirement from the bank whenever the bank holds it, unless the
  offering is a craft.
- **The train loop's drop hunt, again, and dearer.** `lvl:gearcrafting:25@Third#1`, 02:13:07 → 04:42:25 UTC
  on 11-23 (planned 13,655 s): 8,958 s, of it **fight 2,824 s and rest 5,236 s** — 102 fights, 103 rests, one
  craft (5 Skeleton Helmet), 4 Minor Health Potion withdrawn — then "not a safe win vs Spider", the third
  strike, and the level is blocked for everyone until midnight. Report 021 named the class: `fightGear`
  (`queue.ts:694-698`) wears `desiredForJob`'s set, which may be `jobGear`'s brew set (`jobgear.ts:193-205`),
  and never calls `provisionPotions`; `canBeat` (`queue.ts:700-710`) judges by `ownedFightForecast` over bank ∪
  bag ∪ worn. What exactly happened in these two and a half hours is section 2's first read.
- **A drained stack does not re-solve**: `desiredForJob` (`src/state/exec.ts:246-254`) memoises the fight set
  on the bank array, the level and the monster (and the `take`); a worn stack running dry changes none of
  them. Report 022 counted 4.18 character-hours and 292 Minor Health Potions on 11-22 for it (four combat
  offerings refused after their wins).
- **An event member is counted for kills its stacks cannot buy, and its `take` is not what its set was solved
  on** (`src/plan/planner/events.ts eventMembers`, `:331`): a member's kills are `x.sec / s` — the spawn's
  seconds by the seconds a kill (`:390`); its `take` is `takeOf(perKill, n)` cut to the stock it may withdraw
  (`:402-405`: `available`, the bank's); the demand left goes down by the uncut `n` (`:407`), and the line
  says "≈47 kills … with 96 Minor Health Potion and 100 Small Health Potion". Report 022, section 2: the eight
  trips of 11-22 that fought were planned for about 289 kills and made 92, each drinking its whole minor take
  in 8–13 fights (12.4 potions a kill) and ending "ran dry"; so fewer members were sent than the demand
  needed. And the solve reads a pool that holds the member's bag stock (`World.bags`), which the reset banks
  and the `take` does not name: Third at 06:00 on 11-22 (the set needed its bag's 96 minor, the take held 100
  small; refused at the gate), Second at 13:15 (2 minor and 83 small taken, the first fight lost).
- **One piece for two members**: the trip of 06:00 UTC on 11-22 booked the bank's one Tromatising Mask for
  Third and for Second (`plan Second: the planned set needs Tromatising Mask, which the bank no longer
  holds`, 06:02:40), though each member is solved "on the pool less the earlier members' sets" (`withSet`,
  `events.ts:312`). Why is not read yet.
- **The stranding**: `docs/strategy/022/policies/P0s.patch` — `forward.ts advance` puts a tolled step's
  character at the bank its round trip starts from (`reach.ts homeBankOf`), behind the scratch key
  `config.home`. From `logs/world/2026-11-22.json` it gives 100 at the deadline, 37 completions, 8,916 steps
  (`docs/strategy/022/runs/P0s.jsonl`); the untouched tree 98, 36, 9,014.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 54, 55, 56, 57; "Open questions", the first six); report
022 (Summary, "Where the hours go", "What a combat level costs and what gear buys", "The recommendation",
Notes) and report 021 ("The first hours of 020's code", "The offerings of 11-22", Notes); then
`src/state/exec.ts`, `src/state/queue.ts` (the fight, gear and train cases, `runTrainCraft`, `sourceOne`,
`fightGear`, `canBeat`, `plannedSet`, the offering), `src/state/eventorders.ts`, `src/state/offerings.ts`,
`src/plan/jobgear.ts`, `src/plan/planner/events.ts`, `consumables.ts` (`useOf`, `takeOf`, `fightTake`,
`reservable`), `stock.ts`, `forward.ts`, `reach.ts`, `gear.ts`, `supply.ts`; `scripts/harness/`, the
`event-*`, `consumables-*` and offering scenarios; `docs/strategy/022/tools/README.md`; `docs/journal.md`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run assets` or the fetch scripts. Nothing opens `.ammo/storage.db` or `game.db`. Nothing you run writes
  under `logs/`; reading there is allowed. **`npm run atlas` is allowed once**, at the point settled point 6
  names (it writes `public/data/atlas.json` and its own `.ammo/atlas.db`).
- **The service's outlook child loads the working tree every three hours** (21 days, five to fifteen minutes,
  killed at thirty). Keep the tree loadable: no long stretch with a red typecheck; long experiments live in
  scratch copies of the tree, as in 021 and 022. Name every `failed` outlook record of your hours in the
  Summary, with its cause. If the journal or `logs/status.json` shows a restart or a new run id, say so first
  in the Summary.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **The machine may be used** (16 cores; Alex, 2026-11-22): as many long runs side by side as there are
  physical cores less four, each `--max-old-space-size=2048`; say which timings were taken alone. The
  characters' steps must go on through your runs (no gap beyond a cooldown).
- **What may change:** `src/plan/planner/forward.ts`, `reach.ts`, `types.ts` (the stranding);
  `src/state/exec.ts`, `src/state/queue.ts`, `src/state/eventorders.ts`, `src/state/offerings.ts`,
  `src/plan/jobgear.ts` (the runner's faults and the offering's rule); `src/plan/planner/events.ts` and, only
  where a member's kills and take need it, `consumables.ts` and `stock.ts`; `src/lib/journal.ts` if a record
  needs a field; `public/data/atlas.json` (by `npm run atlas` only); the scripts, the harness, the scenarios
  and the checks; `CLAUDE.md`, `docs/journal.md`. **What may not change:** what `decide` prefers, any price,
  score or constant of the core (`config.ts`: `craftK`, `KILL_LOG`, `NEED_RATIO`, `MARGIN` …); the fight
  solve (`src/plan/bis.ts`) and the simulator; `gear.ts`, `supply.ts`, `bundle.ts`, `decide.ts` beyond a
  call's new argument; `src/api/*`, `src/catalog/*`; the page; `docs/strategy/022/` (the reference, read
  only); anything under `logs/`, `docs/audit/`, `docs/design/`; `docs/rework.md` (the planning chat's).
- One task only. Don't write the next task. Everything you write is in **English**.
- For every claim about the code give `path:line`; for every number say where it comes from.
- **Every command you run is in the report's list**, git commands too.
- Gate: `npm run typecheck`; `npm run check`; `npm run check -- planner` (on the final tree, alone); a
  production build into a scratch folder: `npx vite build --outDir <temp dir>/ammo-023-dist --emptyOutDir`
  (never the project's `dist/`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed
  again by the end, commit it again the same way before the task commit. The report is written after the gate
  is green and before the task commit, and is part of it: `023: repairs` holds this task file, the report and
  what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't retry in a loop: say
  so under "How Alex verifies".

## What is settled
1. **The stranding, first and alone** (section 1). `P0s.patch` is lifted into the tree **without a key**: a
   tolled step's character always ends at the bank its round trip starts from. Before anything else of this
   task touches the core, the tree must give `P0s`'s road from `logs/world/2026-11-22.json` (SHA-256
   `14AA19CB…E940AA`, report 022): `npm run outlook -- --world logs/world/2026-11-22.json --json` against
   `docs/strategy/022/runs/P0s.jsonl` — every `day` line and the `done` line equal but the seconds (the
   driver's own `stats` line aside; `docs/strategy/022/tools/cmp.mjs`): 100 at the deadline, 37 completions,
   8,916 steps. If it does not, stop and say why before going on. No other policy of 022 is lifted; `config.home` does not
   enter `PlannerConfig`.
2. **One verdict** — the rule the four repairs serve, and the report's measure of them: for an owned
   character, whatever decides that a fight will be fought (a member check, `canBeat` and the train loop's
   recipe choice, an offering's dry run, a step's plan) and the gate that admits it (`exec.ts:507`) judge **the
   same set with the same stacks**; and a count of kills that a plan or a line states is one the stacks it
   takes can pay for. Nothing is brewed, cooked or gathered inside an owned character's fight outside what
   its step planned (task 014's rule stands). How each fault is repaired is yours; what each must be
   afterwards is here:
   - **(a) a drained stack re-solves.** The memoised fight set (`exec.ts:246-254`, and `forecastVs`,
     `queue.ts:700-710`, where it shares the fault) is answered again when a worn utility stack it named is
     gone. The new set is what the character holds and the bank may give by the item's own rule; a win goes
     on, no win ends the fight item as today. No set names a potion nobody has.
   - **(b) a train loop's drop hunt holds what its set names, or is not chosen.** For an owned character the
     hunt's set and `canBeat`'s verdict come from one solve on what the bank holds — no brew set — and the
     stacks that solve names are on the character at the gate. A recipe whose drop it cannot win that way is
     not `trainRecipe`'s pick (the ingredient is not winnable: the next recipe, as the picker already does
     for an ingredient nobody produces). A hunt drinks the bank's potions only as far as they are not
     reserved by a running step (`stock.ts`); say what you did about that and what it costs. The first read
     of section 2 (Third, 02:13–04:42 UTC on 11-23) decides whether (a) and (b) cover what happened; if
     something else did (103 rests for 102 fights), repair that too and say so first in the section.
   - **(c) an event member's set, kills and take come from one stock.** The stock a member's solve may count
     is the stock its `take` can draw after the reset — whichever side you move, they are equal, bag stock
     included or excluded on both. A member's kills are the lesser of what the spawn's time gives and what
     its take pays for by its own forecast (`useOf`), as a fight step's are (`consumables.ts fightTake`); the
     demand left goes down by that number, so the next member is sent when the first ones cannot bring the
     demand; the line states that number. A member whose take pays for fewer than `SLIVER` kills is not a
     member ("its stacks buy N kills"). **No second trip to the bank inside a spawn** — out of this task.
   - **(d) no piece is booked twice.** Over the members of one spawn, and over the members and the running
     steps' `wear`, no set names more copies of a piece than the pool holds. Find why 06:00 UTC on 11-22
     did (rebuild it from `logs/world/2026-11-22.json` and the journal's `event` record) before repairing.
3. **What an offering may give away.** An offering never takes from the bank — as the requirement or as a
   craft's ingredient, at any depth — a code that the fleet's gear is made of and cannot be had again at
   will: a code some recipe uses that is **event-only** (every field source carries an event gate, or it is
   only an achievement's reward), a **boss or raid drop**, **bought with tasks coins**, or **rare** by
   `xp.ts`'s existing rule (`RARE_ACTIONS`). With the bank closed to it `canObtainOffering` goes on as it
   does today (the favored target, a field source, the next lower bracket, else the category is skipped
   un-accepted for the day, with its reason). If the planner's own reservations (`stock.ts available`: what
   an open parent's bill or a running step holds) can be respected by the offering with a small change, do
   that as well and say so; the static rule above is the floor either way. The combat offering as the
   planner's own priced work stays the offerings round's.
4. **The checks.** A scenario or a check for each of (a)–(d) and for settled point 3, each reproducing the
   recorded case first (it must fail on `7524933`'s runner — show that once, in the report) and passing after:
   the drained stack of an offering's combat fights; the train loop's hunt with a brewable potion the bank
   does not hold (if the fake cannot play a train loop — it has no recycle action — say so and prove (b) on
   the pure functions instead); Third's trip of 06:00 UTC on 11-22 (bag stock, the take) and the mask; a
   spawn whose members' takes pay for fewer kills than the time gives; the combat offering of 11-23 with 12
   lizard eyes in the bank. `check-road`, `check-solve` and the others stay green as they are.
5. **What the repairs move in the model.** `events.ts` is the core's too. After the repairs, play the road
   from the 11-22 file again: if a line differs from settled point 1's, say where it first parts (the day,
   the character, the two steps and whys) and why that is right. The event shares of the forward model
   (`sharesOf`, `stretch`) follow the member's capped kills only if that falls out of the same function;
   don't build it — say which it is.
6. **The atlas, last.** When 1–5 are in the tree and the plain gate is green: `npm run atlas` once (CLAUDE.md:
   about five minutes; the repaired solver of 021 has never written it). Report what moved — per level the XP
   target and its seconds where they changed, the `craftTrain` hours of the three gear-crafting skills at 20–40
   beside the old ones, `check-atlas`'s pinned numbers old and new (update the pins, each named). Then **the
   new reference**, which is 024's baseline: the road from `logs/world/2026-11-22.json` to the deadline (the
   points on days 7, 14, 21, 28, 42, 56, 70, 84 and at the deadline; the completions with their days; the
   steps; the share of the fleet's hours that is consumables' supply; potions drunk; what the open points wait
   for at the deadline — `docs/strategy/022/tools/drive.mts` and `tab.mjs` print all of it) beside `P0s`'s,
   with where it first parts; and the replay's line (`npm run check -- planner`) beside report 021's `88 /
   121 / 108 / 86 / 81`. If the new atlas costs the road more than five points at the deadline, say so first
   in the Summary with the cause; the atlas stays.
7. **The docs.** `CLAUDE.md`: the forward model's tolled steps; the one-verdict rule and what each of the four
   paths does now; what an offering may not take; an event member's kills and take; the replay's new line and
   the road's reference; the atlas's date. `docs/journal.md` if a record changed.
8. **Not in this task:** any policy of 022 (`S`, `C`, `D1`, `D2`, `F3`); tasks coins earned on purpose, runes,
   a gear target for the fleet (024 — section 5 only reads); a price or constant of the core (`craftK`,
   `KILL_LOG`); the offerings round (the cheapest completable bracket, one hunter for the fleet, the combat
   offering as planned work); a second take inside a spawn; group fights; `use` objectives; the Lab; the
   service's own checkout; buying anything; a restart.

## 1. The stranding
Settled point 1. Then the made-up case the replay check lacks: a character with gold for one way only is
never left behind a paid transition by `advance` (a case in `check-planner` or `check-road`, yours to place).

## 2. The runner: one verdict
Settled points 2 and 4. First the reads, before any edit:
- **Third's level step of 02:13–04:42 UTC on 11-23**, from the journal and `logs/raw/2026-11-23/02.log`–
  `04.log`: which recipe `trainRecipe` chose and why, which drop sent it to the spider, the set at each gate
  (the equip lines), the potions held and drunk, why 103 rests, what the forecast said for the worn set at
  the first fight and at the refusal, and what the three strikes of the day were;
- **the trip of 06:00 UTC on 11-22**: the pool each of Second's and Third's solves read (the mask), and
  Third's stock (bag against bank);
- **every fight path of an owned character** in `queue.ts` and `exec.ts`, in one table: the path (a `pl:`
  fight step, an event trip, an offering's combat, a train loop's hunt, a task's fight, a `prepare`), what
  chooses the fight, what solves the set, what the stacks come from, what the gate reads, whether anything
  is brewed or cooked inside — today, and after this task. A path the four faults do not name that breaks
  the rule is repaired the same way if it is small, else reported under Notes.
Then the repairs, one at a time, each with its reproducing check red first.

## 3. What an offering may give away
Settled point 3. Read first, from the journal's `int-end` records of 11-21, 11-22 and 11-23 and the raw log:
everything an offering withdrew from the bank (the code, the quantity, the category), and which of it the
new rule would have kept. Print the rule's list for today's catalog (the codes it protects that some recipe
uses, by reason), so the planning chat can read what it covers.

## 4. The atlas and the new reference
Settled points 5, 6, 7.

## 5. Read-only: the potion-free set, today
Report 022 (`docs/strategy/022/sec3.json`, pool `iii` with the special pieces, a fighter at 30–40) found the
set that needs no potion up to combat 40: **obsidian battleaxe, gold shield, gold helm, obsidian armor,
conjurer skirt (or gold platelegs), flying boots (or lizard boots, gold boots), two royal skeleton rings,
topaz amulet** — and at 26–29 skull wand, slime shield, piggy helmet, snakeskin armor, piggy pants, emerald
amulet. On the newest snapshot (`logs/world/`, named by its date) and the final tree, changing nothing:
- per piece: its recipe opened to the leaves (`supply.ts billOf` for one copy and for five): what the bank
  holds, each leaf's source and seconds, the crafter and the levels short with their road by the model, the
  event-only materials with their event, the quantity for five fighters and the calendar (`materialCal`),
  the tasks coins (the bank's, `COIN_FLOOR`, what five copies ask), a boss drop, another layer;
- per fighter and piece: is it a candidate of `gear.ts candidatesOf` today; if not, the reject reason; if
  it is, why no need holds (H0, H1, G against `NEED_RATIO`, the ten-level window, `PER_SLOT`'s cut);
- the whole set for five fighters as one bill: the fleet-hours by kind (gathering, kills, crafts, the three
  crafters' levels by the model and by report 022's measured cost, tasks for coins at `TASK_SEC` ÷
  `COINS_PER_TASK`), the calendar days of each event behind it and whether anyone can be its member today
  (the portal demon above all), and what cannot be had at all yet;
- what the bank holds today of: lizard eye, lizard skin, demon horn, magical cure, jasper crystal, tasks
  coins, gold bar, obsidian, strange ore, king slimeball;
- the healing rune: where the planner's and the executor's sets would have to learn it (`decide.ts:161-162`
  `WEAR_SLOTS`, `gear.ts candidatesOf`'s type filter, `jobgear.ts:30`), and `docs/strategy/022/tools/
  runecheck.mts`'s result for today's fighters against their XP picks and the bandit lizard.
End with the shortest order in which this set could be made from today's bank, as you read it — a proposal
for the planning chat. Nothing is built here.

## Out of scope
Everything of settled point 8; moving or deleting anything under `logs/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `023: repairs` on top of `Rework notes`;
   `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why the push
   failed); `git log main --oneline -1` → `edaaf23`.
2. `npm run typecheck` passes; `npm run check` → every check ok, exit 0, with the report's count against
   report 021's and the new ones named; the scratch build succeeded.
3. `npm run check -- planner` → ends with the report's new line, in the report's time.
4. `npm run outlook -- --world logs/world/2026-11-22.json` → the report's road and points at the deadline;
   run twice, the same road.
5. `git diff --stat 7524933 HEAD -- src/plan/bis.ts src/sim src/api src/catalog src/plan/planner/decide.ts
   src/plan/planner/config.ts src/plan/planner/gear.ts src/plan/planner/supply.ts docs/strategy` → empty, or
   only what the report names with its reason.
6. **After the restart** (the planning chat says when): at the next 00:05 UTC no offering withdraws a lizard
   eye or skin (the `int-end` records' `wd`); a train step's drop hunt either fights with what its set names
   or its recipe is another one — no "not a safe win" pause of a `lvl:` step; an `event` record's member
   line states kills its take pays for; the first outlook's expected points follow the report's road.

## Report
`tasks/023-repairs.report.md`, with these sections in this order:
- **Summary** — 6–9 lines: a restart or a failed outlook during the work; the stranding lifted and proven
  against `P0s`; each of the four faults in a line (what it was, what it is now, its check); what an offering
  may no longer take; the atlas's effect; the new reference (the road's points at the deadline against 100,
  the replay's line against report 021's); the gate's numbers; the one-line state of the potion-free set
  today.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The stranding** — section 1.
- **The runner: one verdict** — section 2, the table of fight paths first.
- **What an offering may give away** — section 3.
- **The atlas and the new reference** — section 4.
- **The potion-free set, today** — section 5.
- **What was done / files** — every command run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
