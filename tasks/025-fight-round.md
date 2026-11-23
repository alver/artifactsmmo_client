# 025 — The fight round: who strikes first, a risk that is priced, sustain at its true price, the leaders read daily

## Goal
Report 024 set this fleet against the first 25 accounts and ran their characters through this fleet's own
simulator. Its verdict (decision 60): **the forecast is not too dark, the rule is.** The simulator expects a win
in 59 of the 60 solo fights the leaders stood in and its stat arithmetic agrees with the API's on every stat but
initiative; the safe rule refuses 16 of the 27 XP-giving fights they farm, fights that win 98.4% of rolled
fights by this fleet's own simulator (99.9% with the API's initiative). And the planner's own set drinks one to
three potions a fight where a set of the same bank wins safely with none, because a potion in stock costs
nothing — while 36 of 40 leaders' fight sets wear a rune, 27 carry cooked food and 2 a restore potion.

**Alex, 2026-11-23 (decision 61):**
- **Risk is part of the game.** The fleet has to level, and rare materials have to come from somewhere. Small
  failures are no reason to stop; he would go into fights at a 75–80% chance of winning. Don't over-insure.
- **The leaders are read once a day on a schedule**; the trends are looked at in a week.
- What he said before stands: nothing is spent on potions or their ingredients; **healing runes may be bought,
  up to 50,000 gold**; no first-tier policy — the planner picks every step, he only moves priorities; nothing
  is queued by hand.

So this task changes **what a fight costs and when it is admitted**, everywhere a fight is decided, and
nothing about what the planner prefers: the player's initiative is the API's; a fight is admitted by its win
rate and chosen by its expected seconds a win, a loss priced in; a potion costs what making it costs; the
rune is worn by the plan and bought; food is made for fights; the leaders are read daily by the service.
The gear road (the crafters, coins earned on purpose) is 026 and group bosses 027 — both are decided on this
task's report.

**The service** runs report 023's code and stays undisturbed: run `0yfi`, commit `7daf5e1`, up since
2026-11-23 11:48:01 UTC. `logs/status.json` at 12:58 UTC: 33 points; bank 106 codes of 130 slots, gold
146,798, the next expansion 56,000; combat 23 / 26 / 24 / 24 / 24, all five on gathering steps;
`lvl:gearcrafting:25` blocked for all five until 2026-11-24 00:00 UTC ("not a safe win vs Spider (three times
running)"); the outlook of 11:50 UTC expects 46 by 12-14. `HEAD` is `0f94809` (`024: leaders`) on `rework`,
pushed; `main` at `edaaf23`.

**Read in the chat on 2026-11-23** (report 024 and the files it names; check each against the code and say
where one is wrong):
- **Initiative.** The API's `initiative` is the worn items' + 100 on 40 of 40 fight sets (report 024, table
  3a). `src/sim/stats.ts:49-65` (`currentStats`) copies no initiative, `:74-76` drops it from the solve's
  base, `:109` adds the items'; `src/sim/combat.ts:394` lets the higher initiative strike first. In the 65
  fights of table 3b the model's monster strikes first in 31, wrongly in 27.
- **The rule.** `src/plan/planner/reach.ts:475` `safeWin` asks the full solve (`fightRec`, `:450`) to be
  `safe`: the expected fight won without a timeout and the pessimistic pass won too — the player never crits,
  the monster crits every hit (`src/plan/bis.ts:330`, `reach.ts:468-469` `wins`; `config.risk` "win" takes any
  expected win). On this fleet's own pool: no safe XP monster from combat 33, with or without potions; "a win
  is enough" with a healing rune and no potion gives rat or vampire at 11–25 h a level through 35 (table 3e).
  Report 023, section 5: the owlbear (hair, claw) and the cyclops (eye) are behind five of the nine pieces of
  the potion-free set — "every fighter wins them, none safely".
- **What a loss costs**, by the project's own notes: the character wakes at (0, 0) with 1 HP, nothing is
  dropped (`docs/design/planner.md:704`, `docs/design/achievement-map.md:807`). Not checked against play.
- **An older record that says the forecast was too bright**: decision 28 — "a predicted win that was lost: 44
  of 159 skeleton fights on 11-18". An expected win is not a high chance of winning; nobody has measured the
  rolled win rate against play.
- **A stocked potion is free.** `src/plan/planner/consumables.ts:126` `consPrice`, through
  `reach.ts:413-432` `potionPrice` into `bis.ts:107` `killSeconds`: any potion the pool holds that saves a
  turn of rest is worn. Table 3d: against every monster the leaders' fighters of 20–34 stood on, the
  planner's best set of the bank drinks 1–3 potions a fight and the same solve with every potion taken out
  is safe too (30 of 30 pairs). Table 3e: Second at 26 picks the rat at 5.7 h a level with **12 potions a
  kill** against the skeleton at 9.6 h with none. Report 023: 65% of the model's hours make consumables.
- **The rune and the food.** A step's set plans no rune, artifact, utility or bag
  (`src/plan/planner/decide.ts:161-162` `WEAR_SLOTS`); the solve wears a rune when the pool has one (report
  023). Food enters a plan only when the pool holds some (`consumables.ts:129` `poolFood`); nobody cooks for
  fighting (the fleet's best cooking is 31, fishing 23; the 25's medians 50 and 42).
- **One achievement one sale short**: `turning_treasures_to_gold` (2 points; 23 of the 25 have it) — sell 5
  Golden Eggs and 5 Golden Shrimps to an NPC; this account stands at 4 / 5 and 5 / 5. The outlook of 11:56 UTC
  does not name it among the completions it expects by 12-14.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 57, 58, 60, 61; "Open questions", the first five); report
024 (Summary, "The leaders through this fleet's model", "The verdict", Notes); report 023 ("The runner: one
verdict" with its table of fight paths, "The potion-free set, today", Notes); `docs/journal.md`; then
`src/sim/stats.ts`, `combat.ts`, `monte.ts`, `validate.ts`; `src/plan/bis.ts`; `src/plan/planner/reach.ts`,
`pick.ts`, `cost.ts`, `consumables.ts`, `stock.ts`, `decide.ts`, `gear.ts`, `events.ts`, `forward.ts`,
`config.ts`, `types.ts`; `src/state/exec.ts` (`fightSetFor`, `currentFighter`, the gate), `queue.ts` (every
fight path, the offering, the train loop's hunt), `planner.ts` (the interrupts, the merchant purchase, blocks
and strikes), the standing read of the Grand Exchange (task 017) as the pattern for a scheduled read;
`scripts/atlas/`; `scripts/harness/` and the fight, event, offering and consumables scenarios;
`docs/strategy/022/tools/README.md` (`drive.mts`, `tab.mjs`, `cmp.mjs`); `docs/strategy/024/README.md` and
`tools/`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run assets` or the fetch scripts (`docs/strategy/024/tools/fetch.mjs` among them). Nothing opens
  `.ammo/storage.db` or `game.db`. Nothing you run writes under `logs/`; reading there is allowed. **`npm run
  atlas` is allowed once**, at the point settled point 7 names.
- **No request to the game — not one, public ones included.** The daily read of settled point 8 is the
  service's, after Alex's restart; this task proves it against the fake. Don't read `.env`.
- **The service's outlook child loads the working tree every three hours** (21 days, about six minutes, killed
  at thirty). Keep the tree loadable: no long stretch with a red typecheck; long experiments live in scratch
  copies of the tree, as in 021–023. Name every `failed` outlook record of your hours in the Summary, with its
  cause. If the journal or `logs/status.json` shows a restart or a new run id, say so first in the Summary.
- **Dependencies:** none new.
- **The machine may be used** (16 cores; Alex, 2026-11-22): as many long runs side by side as there are
  physical cores less four, each `--max-old-space-size=2048`; say which timings were taken alone. The
  characters' steps must go on through your runs (no gap beyond a cooldown).
- **What may change:** `src/sim/*` (the initiative, the rolled win rate); `src/plan/bis.ts`;
  `src/plan/planner/reach.ts`, `pick.ts`, `cost.ts`, `consumables.ts`, `stock.ts`, `events.ts`, `forward.ts`,
  `config.ts` (the risk key only), `types.ts`; `decide.ts` and `gear.ts` only for the rune's slot and for the
  verdict they read; `src/plan/jobgear.ts`; `src/state/exec.ts`, `queue.ts`, `planner.ts`, `eventorders.ts`,
  `offerings.ts` (the verdict, a loss, the brake, the rune, its purchase); a new module for the daily read and
  its start in the service; `src/lib/journal.ts`; the page only for the words of a step's why and, if it is a
  few lines, one knob (settled point 2); the scripts, the harness, the fake, the scenarios and the checks;
  `docs/strategy/024/tools/build.mjs`, `stats.mjs`, `lib.mjs`, `README.md` (settled point 8);
  `docs/strategy/025/` (new: the runs, a README); `public/data/atlas.json` (by `npm run atlas` only);
  `CLAUDE.md`, `docs/journal.md`. **What may not change:** what `decide` prefers — its score, its candidates'
  kinds, `levelCand`'s rule, the filler, any first-tier order; the needs' rule and the core's constants
  (`NEED_RATIO`, `MARGIN`, `HORIZON`, `craftK`, `KILL_LOG` …); gear by need beyond the verdict and the rune
  (no look above a fighter's level, no fleet set, no crafter's road: 026); `supply.ts`, `bundle.ts`;
  `src/api/*` beyond a public path the daily read needs; `src/catalog/*`; `docs/strategy/022/`;
  `docs/strategy/024/snapshot/`, `base/`, `tables/`, `requests.log` (the committed read stays as it is);
  anything under `logs/`, `docs/audit/`, `docs/design/`; `docs/rework.md` (the planning chat's).
- One task only. Don't write the next task. Everything you write is in **English**.
- For every claim about the code give `path:line`; for every number say where it comes from.
- **Every command you run is in the report's list**, git commands too.
- Gate: `npm run typecheck`; `npm run check`; `npm run check -- planner` (on the final tree, alone); a
  production build into a scratch folder: `npx vite build --outDir <temp dir>/ammo-025-dist --emptyOutDir`
  (never the project's `dist/`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed
  again by the end, commit it again the same way before the task commit. The report is written after the gate
  is green and before the task commit, and is part of it: `025: fight round` holds this task file, the report
  and what the task changed. Then `git push` (to `origin/rework`). If the push fails, don't retry in a loop:
  say so under "How Alex verifies".

## What is settled
1. **Initiative, first and alone.** The player's initiative is the API's: `currentStats` copies the
   character's `initiative`, the solve's base and the atlas's hypothetical character start at 100, the worn
   items' add to it as today. Read from the game's documents in `docs/` who strikes first on a tie and say
   what the simulator does. A check on 024's committed base (`docs/strategy/024/base/characters.jsonl`): this
   fleet's arithmetic against the API's stats on the 40 fight sets — no stat differs. Before anything else of
   this task touches the core: the road from `logs/world/2026-11-22.json` beside report 023's reference (82
   at the deadline, 30 completions, 9,138 steps) — where it first parts and why.
2. **The verdict is a win rate, and a loss has its price.** One function answers every fight this fleet
   decides; how it is built is yours, what it must be is here:
   - **`p`** — the share of wins over N fights of the final set against the monster with the crits rolled
     (`src/sim/monte.ts`'s method), seeded by what the fight is, so that the same question gives the same
     answer in every process and a road played twice is the same road. N is yours: say what it costs in the
     planner's seconds and what error it leaves at p = 0.75.
   - **Admitted when `p ≥ config.risk.minWin`, 0.75** (Alex). The floor guards against the model's error; it
     does not choose. If the Roadmap's Priorities take one more knob in a few lines, the floor is a knob
     there (0.5–0.99); if not, it lives in the config patch only — say which.
   - **The price chooses**: a kill costs its *expected seconds a win* — (p × the seconds of a won attempt +
     (1 − p) × the seconds of a lost one) ÷ p. A won attempt is the fight and getting ready again as today
     (rest, food, the potions' price). A lost attempt is the fight, **the way back** from where a beaten
     character wakes to the monster, and **the recovery** from the HP it wakes with, by the cheapest sustain
     the set carries; what it drank is drunk; it brings no XP and no drop. XP an hour, drops an hour, an
     objective's kills, a member's kills and every "N h" a why states follow that price.
   - **What a loss is, read from play first**: every lost fight the journal and the raw logs hold since
     11-19 (Fifth's second ogre fight of 11-20 22:41 UTC, the bandit camp trips of 11-22, the offerings): the
     tile and the layer the character woke on, its HP, the cooldown, whether gold, items, XP or a task's
     progress were lost, what the runner did next. The price uses what the log shows where it differs from
     `docs/design/`; name the difference.
   - **A paid way back**: where the way back crosses a toll or a key (decisions 45, 46), the fare is part of
     the price, and a fight is not admitted when the fare budget cannot pay the returns its losses are
     expected to ask, or when a loss could strand the character (023's rule for the forward model holds for
     a loss too).
   - **The pessimistic pass decides nothing any more** (`bis.ts:330`); `"safe"` and `"win"` as values of
     `config.risk` end — say what the replay's rows become.
   - **One verdict, everywhere** (decisions 57, 58): the XP pick, a kill objective, a kill source inside a
     craft or supply step, a gear piece's drop (where `gear.ts` rejected a piece because no fighter won its
     source safely), an event member, a task's fight, an offering's combat, a train loop's hunt and the
     executor's gate read this one answer for the same set and the same stacks. Report 023's table of fight
     paths again, with two new columns: what admits the fight now, what a loss does there.
   - **In the executor a lost fight is an outcome, not a fault.** The step goes on — back, recover, fight —
     without a new decide and without a strike. The journal gets a `loss` record (the character, the
     monster, the set, the forecast's p, the HP at the start, the turns if the answer carries them, what was
     drunk), and a fight step's end record carries fights, wins, losses, the forecast's p and seconds a win
     beside the measured ones.
   - **The brake is play against the forecast**, not a count of losses: a step ends early, and that monster
     is blocked for that character until its set or level changes or 24 hours pass, when it has lost at
     least three fights and that many losses or more in that many fights had a chance below 5% at the
     forecast's p (the binomial tail). The old strikes ("not a safe win", three times running) are restated
     to this one rule on every path; the block's why names forecast and observed ("forecast 82%, won 3 of
     9").
   - **The forward model throws no dice**: it plays expected seconds, expected potions and food, and the
     fares its expected losses ask.
3. **The forecast against play — read before the floor is trusted.** For every fight of this fleet the
   journal and the raw logs hold with the set, the level and the monster known (from 016's journal on, and
   earlier where the log allows): the rolled win rate of the repaired simulator against the outcome. By
   monster and by band of p (below 0.75, 0.75–0.9, 0.9–0.99, above): the fights, the wins forecast, the wins
   observed; the turns and the HP left, forecast against observed, where the log holds them. If the log cannot
   tell a win from a loss, or a set, say exactly what is missing and what settled point 2's records add from
   the restart on. If a band of at least 30 fights wins more than ten points below its forecast, say so
   **first in the Summary**, look for the cause (a stat, an effect, a monster's line, the HP a fight starts
   with) and repair it if it is small; the floor stays Alex's. Explain decision 28's 44 of 159 with today's
   simulator if the log of 11-18 still shows those fights.
4. **A potion costs what making it costs.** A restore or boost potion is priced at its chain's seconds (the
   price `cost.ts` already gives a potion the pool lacks) whether the pool holds it or not: for these codes
   decision 32's "stock is free" ends, in the solve, in the pick and in the forward model alike. A set is
   solved with no potion first; a potion enters only where it lowers the expected seconds a win at that
   price, or lifts p over the floor for a fight that is still the best at that price. What the bank holds
   today stays where it is — not sold, not recycled, no need restocks it for its own sake; say how many of
   each code there are and which fights of the new road drink them. **Nothing is bought** (Alex). The needs'
   rule itself is not touched: what the new prices do to the needs is measured in settled point 6.
5. **The rune and the food.**
   - **The plan wears the rune.** The rune's slot is part of a step's `wear`; a reset does not strip it; a
     gathering step keeps it on. Only the healing rune is planned. Read-only, in a few lines: what the burn
     rune (8 of the leaders' 36) would do on the same fights.
   - **The planner buys healing runes, up to 50,000 gold in all** (Alex; read the vendor, where it stands,
     whether it is always there and its price from the catalog — the chat knows "10,000 each" only by
     report 022). One for a character when that character's fight work on the road — its XP pick or a kill
     step — costs at least 5% fewer expected seconds a win with it, or crosses the floor with it; through
     the purchase path the Lost World Maps took (the merchant interrupt, a `spend` record), and only while
     the gold left still covers the fare budget and the bank expansion's rule as they stand. Say when the
     road buys each of them.
   - **Food is made for fights.** Cooked food is a consumable a need can ask for as a potion is (task 014's
     machinery, the bag rules of 015), from the fleet's own fish, at its chain's price; what the fishing and
     the cooking bring by the way (levels, an objective's units) counts as the planner already counts work
     in flight. The solve chooses among rest alone, the rune, food and a potion by the expected seconds a
     win. If a part of this does not fit the task (the take, the bag, the forward model), build what does,
     say first in the section what is left and why, and leave `poolFood`'s rule for the rest.
6. **What it does to the road** — on 022's harness, in scratch copies, from `logs/world/2026-11-22.json`
   (the reference, 82) **and** from the newest file of `logs/world/`; the runs kept under
   `docs/strategy/025/runs/` with a README. One row a change and the whole together: I the initiative; R the
   verdict at 0.75 on top; P the potion's price on top; U the rune on top; F the food on top; and the whole
   tree at floors 0.6, 0.9 and 0.98 beside 0.75, so that the floor's worth can be read. Per row: the points on
   days 7, 14, 21, 28, 42, 56, 70, 84 and at the deadline; the completions with their days; the steps; **the
   five characters' combat levels on those days**; the share of the fleet's hours that is consumables'
   supply; potions and food consumed; runes bought and gold spent; fights and expected losses; what the open
   points wait for at the deadline; where the row first parts from the one above. Then, in a few lines each:
   - the supply hours that still go to works which do not complete by the deadline (decision 58's defect) —
     the number only;
   - the owlbear's hair and claw and the cyclops's eye for today's five: p, the set, the expected seconds a
     drop — report 023's section 5 again where it said "none safely";
   - what the five do in the first 48 hours of the newest World's road, step by step, against what they did
     in the 48 hours before it (the journal).
   **If the top combat level on day 14 of the newest World's road is below 30, say so first in the Summary**
   with what holds it (the price of a level, `levelCand`, the gear): Alex wants the fleet to level, and 026
   is decided on that line.
7. **The atlas, last, and the new reference.** When 1–6 are in the tree and the plain gate is green: `npm
   run atlas` once. Report what moved (per level the XP target and its hours a level by tier, old and new;
   `check-atlas`'s pins, each named), then the new reference from `logs/world/2026-11-22.json` beside 82 and
   the replay's line beside `92 / 121 / 102 / 84 / 89`. **The speed is part of the gate**: the outlook's 21
   days from the newest World (361.6 s on 023's tree), the season's road alone, `npm run check` and the
   replay, each beside 023's seconds; if the outlook passes ten minutes or the replay 75 minutes, lower N or
   cache the verdict until they do not, and say what that cost in p's error.
8. **The leaders, once a day** (Alex). The service makes 024's read by itself:
   - once a UTC day at 12:22 UTC — a day after 024's read, so that every interval is a whole day — or, if the
     service was down then, in the first minutes it is up after it; never twice for one UTC day (the newest
     folder's stamp decides, so a restart does not read again);
   - `/leaderboard/accounts?sort=achievements_points&page=1&size=100`, then for the first 25 accounts of the
     page and for this account `/accounts/{a}/characters` and `/accounts/{a}/achievements` (`size=100`, one
     page): 53 requests, **public, without the token and without an `Authorization` header**, one at a time,
     at least 1.3 s apart, behind the characters' actions (say which rate limit of `docs/api/` such a read
     counts against and how the client keeps the actions first); a hard cap of 60 a day in the code; a 429 or
     a 5xx ends the day's read, is logged and is not retried before the next day;
   - every body byte for byte under `logs/leaders/<stamp>/` with 024's file names, one line a request in
     `logs/leaders/requests.log` (024's format), a `leaders` record in the journal (the stamp, requests,
     bytes, seconds, the first status that was not 200); off in the harness and for a `dev` service; one
     config key switches it off;
   - **the tools read both places**: `build.mjs` and `stats.mjs` take a snapshots directory and an output
     directory; without arguments they give 024's committed `base/` and `tables/` byte for byte (prove it by
     hash, as 024 did); with `logs/leaders` they build the base of every day beside 024's two reads into
     `logs/leaders/base/` and the tables into `logs/leaders/tables/`, and print one new table, **(i) the
     days**: per account and day its points and completed achievements, the top and the median combat level,
     the fleet's combat XP an hour since the day before, how many of its characters stood on a monster, how
     many woke at (0, 0) below a fifth of their HP (a loss seen), each fighter's weapon and rune where they
     changed; per band the fighters' median hours a level; this account's row marked. `npm run leaders` runs
     it. In this task it runs only on a made-up second day in scratch (a copy of 024's snapshot under a
     later stamp, some numbers moved) — the planning chat runs it on the real days in a week;
   - a scenario or a check: the fake serves the three public paths (from 024's snapshot), the virtual clock
     passes 12:22 UTC twice and a restart between: one folder a day, 53 requests each, none with a token, the
     actions' cooldowns untouched; a 429 on the tenth request ends that day and the next day reads.
9. **One sale short.** `turning_treasures_to_gold`: read what the planner says of it today (its candidate,
   its reject reason or its place in the order; what gives a Golden Egg and at what chance; where it is
   sold; how the account came to 4 and 5) and why the road does not complete it. If it is a fault within
   what this task may change and small, repair it with a check; if it is the planner's honest answer (the
   drop's expected hours against 2 points), say the number. Nothing is bought for it.
10. **The checks.** Each red first on `0f94809` where it can be (show it once): the stats of 024's 40 fight
    sets; a fight admitted at p 0.8 and refused at 0.7; the price of a kill with a loss in it, by hand
    against the function; a lost fight in a `pl:` fight step, in an event trip, in an offering and in a train
    loop's hunt — the step goes on, the `loss` record is there; the brake (a fake that loses more than the
    forecast: the block with its why; one that loses as forecast: no block); a loss behind a toll; a set that
    drinks no stocked potion where rest is cheaper at the chain's price, and drinks one where it lifts p over
    the floor; the rune kept through a reset and on a gathering step; the rune bought once, inside the cap,
    not below the gold the fares need; food asked by a need and taken by the step; the daily read (point 8).
    Scenarios and checks of 014, 017, 021 and 023 that pinned the old rule are restated, each named with the
    old and the new count; the solver's three guarantees of 021 hold or are restated with the reason.
11. **The docs.** `CLAUDE.md`: the verdict (p, the floor, the price of a loss, the brake), who strikes first,
    a potion's price, the rune and its purchase, food by need, the daily read and its tools, the replay's
    new line, the reference, the atlas's date. `docs/journal.md`: the `loss` and `leaders` records, the fight
    step's new fields.
12. **Not in this task:** the gear road — a look above a fighter's level, a set for the fleet, the three
    gear crafts on one character, the crafters' levels, tasks coins earned on purpose, a task taken for the
    monster that is farmed (026); group fights and King Slime (027); the needs' rule; a first-tier policy or
    any new term in the score; the rest rule (what HP a fight starts with) beyond what a loss needs; other
    runes; buying or selling potions, food or ingredients; selling the potion stock; `use` objectives; the
    layers; the offerings round; the Lab; the service's own checkout; a restart.

## 1. Who strikes first
Settled point 1.

## 2. The verdict and the loss
Settled points 2 and 10. First the reads, before any edit: the losses play recorded (what a loss is), and
report 023's table of fight paths as the code stands. Then the function, then the paths one at a time.

## 3. The forecast against play
Settled point 3.

## 4. Sustain
Settled points 4 and 5: the potion's price, the rune, its purchase, the food.

## 5. The road
Settled points 6 and 7.

## 6. The leaders, daily
Settled point 8.

## 7. One sale short
Settled point 9.

## Out of scope
Everything of settled point 12; moving or deleting anything under `logs/`, `docs/strategy/022/` or 024's
committed read.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `025: fight round` on top of `Rework
   notes`; `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why
   the push failed); `git log main --oneline -1` → `edaaf23`.
2. `npm run typecheck` passes; `npm run check` → every check ok, exit 0, with the report's count against
   report 023's 91 and the new ones named; the scratch build succeeded.
3. `npm run check -- planner` → ends with the report's new line, in the report's time.
4. `npm run outlook -- --world logs/world/2026-11-22.json` → the report's road and points at the deadline;
   run twice, the same road.
5. `node docs/strategy/024/tools/build.mjs` and `node docs/strategy/024/tools/stats.mjs` → `git status`
   still clean (024's committed base and tables, the same bytes).
6. `git diff --stat 0f94809 HEAD -- src/plan/planner/supply.ts src/plan/planner/bundle.ts src/catalog
   docs/strategy/022 docs/strategy/024/snapshot docs/strategy/024/base docs/strategy/024/tables` → empty, or
   only what the report names with its reason.
7. **After the restart** (the planning chat says when): the journal's `boot` carries the new commit; the
   first outlook's expected points follow the report's road; a fight step's why states its win rate; a lost
   fight leaves a `loss` record and the step goes on; no block reads "not a safe win"; a `spend` record for
   a healing rune when the road says one is bought; after the next 12:22 UTC `logs/leaders/<stamp>/` holds
   53 files and the journal a `leaders` record.

## Report
`tasks/025-fight-round.report.md`, with these sections in this order:
- **Summary** — 7–10 lines: a restart or a failed outlook during the work; the forecast against play (the one
  line that says whether p can be trusted, first if it cannot); what a loss turned out to be; the road before
  and after (the points at the deadline against 82, the top combat level on day 14 and day 28, the
  consumables' share of the hours against 65%); what the floor is worth (0.6 / 0.75 / 0.9 / 0.98); the runes
  bought; the food; the daily read; the gate's numbers and the speed; the one number that surprised you most.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **Who strikes first** — section 1.
- **The verdict and the loss** — section 2, the losses play recorded and the table of fight paths first.
- **The forecast against play** — section 3.
- **Sustain** — section 4.
- **The road** — section 5, the table of rows first.
- **The leaders, daily** — section 6.
- **One sale short** — section 7.
- **What was done / files** — every command run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first.
- **To delete (Alex)** — or "Nothing".
