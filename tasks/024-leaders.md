# 024 — The leaders' base: the top 25 fleets read once, kept on disk, and where this fleet stands apart

## Goal
Report 023 left the model's road at 82 points for the whole season. Alex, 2026-11-23 (decision 59): that cannot be
the whole truth — the leader has 81 today with fighters near 50, the accounts behind it are not far, and they
were where this fleet is now three weeks ago. **Before anything else is repaired or built, read the top 25
accounts with their whole fleets once, keep every answer on disk so that every statistic can be rebuilt without
asking the game again, and say where this fleet's numbers stand apart from theirs.**

Nothing in the engine changes; there is no restart. This task writes a data base, the tools that read it, and
a report. What is repaired next is decided on that report.

**What is known, and the contradiction this task is to open** (report 022, "What the leaders did": 17 accounts
read at 19:24 UTC on 11-22, `docs/strategy/022/snapshot/`):
- combat 25 on season day 15 for the leaders, 40–42 by day 26, 43–49 on day 30; this fleet: 25 on day 28, 23–26
  today. The account's top combat level ranks the points (Spearman 0.96).
- 21 of 21 fighters at 35+ wear a rune, 16 carry cooked food, one a restore potion. This fleet has no rune and,
  in the model, spends 65% of the season's hours making potions (report 023).
- At 40+ the crafted gear is craft level 30, half of it with event or tasks-coin materials. **But at 30–34 the
  three fighters in a fight set wore craft-20/25 gear much like this fleet's** (battlestaff, iron shield, magic
  wizard hat, steel and snakeskin pieces; a rune; food) — and those fleets went 25 → 40 in eleven days. This
  fleet's model says a character like that pays 7–24 potions a kill at 30–35 or has no safe win at all (report
  022, "What a combat level costs", pools i and ii).
- Bosses fell 5–20 levels below the levels this fleet's map gives them. The Character tab says "sim check: 200
  fights · 44 win/loss mispredicted". A leader's character carries `initiative` 550 in the public read
  (`acc-uaprsf-characters.json`); the simulator starts the player at 0 (`docs/rework.md`, "Who strikes first?").
- So one of two things is true and this task says which, with numbers: **this fleet's fight forecast and its
  safe-win rule are too dark**, or **the leaders do something the one read of 11-22 did not show** (other
  monsters, losses accepted, groups, another way to heal).

**The service** runs report 023's code and stays undisturbed: run `0yfi`, commit `7daf5e1`, up since
2026-11-23 11:48:03 UTC; 33 points at 11:58 UTC. `HEAD` is `7daf5e1` (`023: repairs`) on `rework`, pushed.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 56, 58, 59; "Open questions", the first four); report 022,
"What the leaders did" whole (its tables are this task's starting shape) and "What a combat level costs and what
gear buys"; report 023, "The potion-free set, today"; `docs/strategy/022/tools/get.mjs`, `sec1-analyze.mjs`,
`README.md`; `docs/api/openapi.json` (the public paths and their schemas); `src/sim/combat.ts`,
`src/state/exec.ts` (`currentFighter`, `fightRound`), `src/plan/bis.ts`, `src/plan/planner/reach.ts` (`safeWin`,
`winLevel`, `fightRec`, `potionRec`), `src/plan/xp.ts` (`fightXp`), `public/data/` (items, monsters, maps,
resources, achievements, `atlas.json`).

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The requests** (Alex allowed them, 2026-11-23): public `GET`s to `https://api.artifactsmmo.com` only, **no
  token, no `Authorization` header; don't read `.env`**. At least 1.2 s apart, one at a time. **150 in all, and
  not one more** — the tool counts them in its log and stops. A 4xx or 5xx is logged and not retried; a 429
  stops the read for good (say so first in the Summary). No request is repeated to "refresh" a file that
  already lies on disk.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run assets`, `npm run atlas` or the project's own fetch scripts. Nothing opens `.ammo/storage.db` or
  `game.db`. Nothing you run writes under `logs/`; reading there is allowed.
- **Nothing under `src/` changes, nor `public/`, nor the scenarios and checks.** The outlook child loads the
  working tree every three hours; it must not notice this task. If a tool needs a function that `src/` does not
  export, import the module and say under Notes what you had to copy, with `path:line`.
- **Dependencies:** none new.
- **What may change:** `docs/strategy/024/` (new: `snapshot/`, `base/`, `tools/`, `README.md`, `requests.log`);
  `CLAUDE.md` (one paragraph naming the base and its tools); `package.json` only for one script entry if you
  add one (`leaders`). **What may not change:** everything else; `docs/strategy/022/` is read only;
  `docs/rework.md` is the planning chat's.
- One task only. Don't write the next task. Everything you write is in **English**.
- For every claim about the code give `path:line`; for every number say which file of the base it comes from.
- **Every command you run is in the report's list**, git commands too.
- Gate: `npm run typecheck`; `npm run check` (plain; the planner replay is not needed, `src/` is untouched —
  say so); the tools run from a clean checkout of the base: delete `docs/strategy/024/base/`, run the build
  tool, the same files come back (compare by hash), **with the network off or without a single request** (the
  tools must not be able to ask the game: only the fetch tool imports `fetch`).
- **The branch and the commits** (never `main`): you are on `rework`. `docs/rework.md` was changed by the
  planning chat and is uncommitted: commit it first, as it is, on its own: `Rework notes`. If it changed again
  by the end, commit it again the same way before the task commit. The report is written after the gate is
  green and before the task commit, and is part of it: `024: leaders` holds this task file, the report and what
  the task changed. Then `git push` (to `origin/rework`). If the push fails, don't retry in a loop: say so
  under "How Alex verifies".

## What is settled
1. **The read, once.** `/leaderboard/accounts?sort=achievements_points&page=1&size=100` (one request); **the
   first 25 accounts of that page are the base**, whoever they are, plus **this account (`alverus`)** read the
   same way, so that it stands in every table by the same measure. For each of the 26:
   `/accounts/{a}/characters` (one request, the whole fleet — report 022's read showed the full character
   objects: levels and XP of every skill, the stats, every slot, the inventory, the position, the task, the
   cooldown) and **the account's achievements with their progress, complete and open** (`/accounts/{a}/
   achievements`, `size=100`, as many pages as `pages` says — check the schema in `docs/api/openapi.json`
   first; report 022 read only `completed=true`). Expected: 1 + 26 × (1 + 3) = 105 requests. If the open
   achievements carry no progress in the public read, read `completed=true` only (one page each) and say so.
   What is left of the 150 stays unused unless a page failed; it is not spent on more accounts.
2. **Every answer is kept as it came**: `docs/strategy/024/snapshot/<UTC stamp of the read's start,
   YYYY-MM-DDTHHMMZ>/` — the body byte for byte under a name that says what it is (`leaderboard-1.json`,
   `acc-<account>-characters.json`, `acc-<account>-achievements-<page>.json`), and
   `docs/strategy/024/requests.log` with one line a request (`<path> <status> <bytes> <iso time>`), in the
   repository (022's log lay in scratch). The snapshot is committed.
3. **The fetch tool reads again without a change**: `docs/strategy/024/tools/fetch.mjs` takes the list of
   accounts from the leaderboard file it has just written (or `--accounts a,b,c`), `--only characters` for a
   light read (27 requests), writes a new stamped folder, never overwrites one, and counts every request ever
   made in `requests.log` against a cap it is given (`--cap 150`, the default). A second read on another day
   is the planning chat's to ask for; **this task makes one**.
4. **The base**: `docs/strategy/024/base/` built from the snapshot folders by `tools/build.mjs`, no request:
   - `characters.jsonl` — one line a character and snapshot: account, the account's rank and points, name,
     combat level and XP (`xp`, `max_xp`), every skill's level and XP, the stats as the API gives them, every
     slot (the utilities with their quantities), the inventory, gold, position (`x`, `y`, `layer`) **and what
     stands on that tile by `public/data`** (a monster with its level, a resource with its skill and level, a
     workshop, a bank, an NPC, an event's place — say which file names it), the task, the cooldown's end and
     the seconds between it and the read (active or idle at the read);
   - `accounts.jsonl` — one line an account and snapshot: rank, points, the member mark if the reads carry one,
     the five characters' names, the shape (how many within 3 combat levels of the top, how many 10 or more
     below), who holds each of the three gear-crafting skills;
   - `achievements.jsonl` — one line an account and achievement: points, `completed_at` with its season day
     (day 1 = 2026-10-24, as report 022), the progress of each objective if the read carries it.
   **022's snapshot enters the base as an earlier snapshot** (`docs/strategy/022/snapshot/`, 19:24 UTC on
   11-22, 17 accounts; read in place, not copied), so that every character in both has two lines.
5. **The statistics** — `tools/stats.mjs` prints every table of the report from `base/` alone; the tables are
   also written to `docs/strategy/024/tables/` as Markdown, one file a table, so the planning chat can read
   them without running anything. This fleet stands in each table as a marked row and with its place among
   the 26 (rank or percentile). At least:
   - **(a) The fleets**: per account its points, rank, the five characters with combat level, the best
     gathering and crafting skills, what each character is by what it wears and where it stands (fighter,
     gatherer, crafter — say the rule), and the shape. How many fleets fight with five, with three, with one.
   - **(b) Levels**: the spread of combat levels over the 130 characters; per account the top and the median;
     the gathering lanes (how many accounts hold a 30, 40, 50 in each); the three gear-crafting skills (the
     best of each, on how many characters they sit); cooking and alchemy.
   - **(c) What they wear, by combat band** (20–24, 25–29, 30–34, 35–39, 40–44, 45+; fight sets only — the
     rule that tells a fight set from a gathering set as `sec1-analyze.mjs` had it): per slot the pieces with
     their counts, each with its craft skill and level and the marks of its recipe tree (event, tasks coins,
     boss, raid, achievement — 022's rule). **The bands 25–29 and 30–34 are the point of this table**: with
     25 accounts there should be more than 022's three characters. Beside it this fleet's five sets today
     (`logs/world/` newest snapshot, or its own read).
   - **(d) Sustain**: the rune by kind and band; the utility slots (code, quantity); food and potions in the
     inventories; the bag; the artifacts. How many fighters at each band carry a restore potion at all.
   - **(e) Where they stand**: for every character active at the read (define it: the cooldown ended less
     than N minutes before the read — pick N and say why), the tile's content. For a character on a monster's
     tile: the monster, its level, **the character's level less the monster's**, the set it wears. The
     distribution of that gap by band is the answer to "what do they fight to level". For a character on a
     resource: the skill, the node's level against the skill's.
   - **(f) The pace**: for every character in two snapshots (022's and this one) the combat XP and the skill
     XP gained between them, as levels and as XP an hour of the interval, by band; per account the points
     gained. Beside it what this fleet's model asks for the same level: the atlas's hours a level
     (`public/data/atlas.json`, `path[L]`, the three tiers) and report 022's table. Where a leader's
     character gains a level in less time than this fleet's model says the level costs with every piece free
     ("+special", potions free), say so by name.
   - **(g) The achievements**: per achievement how many of the 25 have it and the median season day; **the
     list of those that N of 25 have and this account has not**, ordered by N, with points and what this
     fleet's planner says of each today (the newest outlook record's "what the open points wait for" if it
     names it, else "not read"); the same the other way (this account has, few of them have). If progress is
     in the read: the kills and gathers the leaders carry on open achievements this fleet has not touched.
   - **(h) This fleet against the 25, one page**: every number above where this account is outside the
     middle half of the 25 (below the first quartile or above the third), ordered by how far.
6. **The leaders' characters through this fleet's model** — no request, nothing built in `src/`:
   - **The stats first.** For every character in a fight set: this fleet's own stat arithmetic (the fighter
     `exec.ts currentFighter` builds from a character; and the items' effects summed by `public/data/items.json`
     the way the solve does) against the stats the API gives for the same character (`max_hp`, `attack_*`,
     `dmg*`, `res_*`, `critical_strike`, `haste`, `initiative`, `wisdom`). Every stat that does not agree is
     named with both numbers: that is a hole in this fleet's model of a character (an effect of an item, a
     rune, an artifact or a level it does not know).
   - **Then the fights.** For every character standing on a monster's tile and active at the read: this
     fleet's simulator on that character as it is (its worn set, its utilities, its rune) against that
     monster — win or loss, turns, HP left, and this fleet's verdict by its own rule (`reach.ts safeWin`:
     say in one paragraph what "safe" asks, with `path:line`, and what a lost fight costs a character by the
     game's documents in `docs/`). **Count the cases where a leader is farming a monster this fleet's rule
     would refuse** and name the three clearest.
   - **Then the same characters under this fleet's planner**: for each fighter at 25–39, what this fleet's
     XP pick would be for it with its own worn set as the pool (`reach.ts` / `xp.ts`, as report 022's section
     3 priced a level) — the monster, the seconds a kill, the potions a kill, the hours a level — beside the
     monster it actually stands on and the pace table (f) measured for it.
   - **This fleet's fighters the other way**: First to Fifth as they are today against the monsters the
     leaders' fighters of the same band stand on: the simulator's verdict with today's worn set, and with a
     healing rune added.
7. **The verdict the report must reach**, in the Summary and with the numbers behind it: which of the two
   readings of the Goal holds (the forecast and the safe-win rule too dark; the leaders doing something
   else; both — and how much each), and **the five largest distances between this fleet and the leaders at
   its own stage**, most costly first, each with what the base shows and what in this fleet's code or plan
   makes it so (`path:line`). No repair is made; the order of repairs is the planning chat's and Alex's.
8. **The docs.** `docs/strategy/024/README.md`: how to read again, how to rebuild the base, how to print the
   tables, what each file of the base holds. `CLAUDE.md`: one paragraph that the base exists.
9. **Not in this task:** any change of the engine, a rune bought, the needs' rule of report 023, the gear
   road, a second read, more than 26 accounts, the Grand Exchange, a restart.

## 1. The read and the base
Settled points 1–4. Say in the report how many requests were made, their times, every status that was not
200, and the size of the snapshot on disk.

## 2. The statistics
Settled point 5, (a)–(h). The tables are in the report in this order, each with one or two sentences of what
it says — the numbers first, no essay.

## 3. The leaders through this fleet's model
Settled point 6.

## 4. The verdict
Settled point 7.

## Out of scope
Everything of settled point 9; moving or deleting anything under `logs/` or `docs/strategy/022/`.

## Acceptance (Alex checks)
1. `git branch --show-current` → `rework`; `git log --oneline -2` → `024: leaders` on top of `Rework notes`;
   `git status` clean; `git log origin/rework --oneline -1` → the same commit (or the report says why the push
   failed); `git log main --oneline -1` → `edaaf23`.
2. `docs/strategy/024/requests.log` has at most 150 lines, every path a public one, the times at least 1.2 s
   apart; `docs/strategy/024/snapshot/<stamp>/` holds a file for every 200 line.
3. `git diff --stat 7daf5e1 HEAD -- src public scripts` → empty.
4. `node docs/strategy/024/tools/build.mjs` then `node docs/strategy/024/tools/stats.mjs` → the report's
   tables again, without a request (the report says how to see that).
5. `npm run typecheck` passes; `npm run check` → every check ok, the count of report 023 (91).
6. `logs/status.json` still carries run `0yfi` (or the report's Summary says first that it does not).

## Report
`tasks/024-leaders.report.md`, with these sections in this order:
- **Summary** — 6–9 lines: a restart or a failed outlook during the work; the read (requests, accounts,
  anything that failed); the verdict of settled point 7 in two lines; the five distances in a line each; the
  one number that surprised you most.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The read and the base** — section 1.
- **The statistics** — section 2, tables (a)–(h).
- **The leaders through this fleet's model** — section 3.
- **The verdict** — section 4.
- **What was done / files** — every command run.
- **Notes** — defects noticed and not touched; guesses, most doubtful first; what one read at one moment
  cannot show and a second read would.
- **To delete (Alex)** — or "Nothing".
