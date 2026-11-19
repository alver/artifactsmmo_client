# 011 — The calibration round: what a fight drinks, filler before a road that does not fit, an objective is the fleet's work, the next hours read

## Goal
Since 2026-11-19 16:22:33 UTC the service runs report 010's code. Its replay ends at 49 / 49 / 49 / 52 against
56 / 56 / 56 / 59 and puts the fighters at combat 35 on days 86–96 instead of 23–31. Keys and tolls (012) and events
(013) are ordered by those numbers, so before anything is built on them this task makes the replay believable again,
and takes the one thing of real play that costs hours now:

1. **Rule 4 lets a road that fits no deadline outrank filler that fits** (`src/plan/planner/decide.ts`, the end of
   `rank()`: `pick(firsts) ?? pick(real)`, and `pick` falls through from `fit` to `any` inside the real candidates
   before a filler is looked at). With honest potions the road to `grand_master` runs all season and the 7 filler
   points of report 009's row A are never reached.
2. **The forecast drinks about twice what the log shows**: 6 small health potions a pig fight against about 3.2
   (report 010, "Against the log"). Every potion fight is priced by that count, and so is the day the fighters
   reach 30 and 35. Nobody knows yet whether the count, the model of a proc or the sets are off.
3. **A shared objective is counted whole for each fighter** (`src/plan/planner/gear.ts`, work (b): `H0` is the
   fighter's own hours for all that is left, ∞ when it does not win safely, and "a flip always qualifies" — per
   fighter). Live: at 18:39:34 UTC Fifth started `src:skeleton_bone@Fifth#2`, "62 actions short for Steel
   Battleaxe for Fourth (i_want_bacon (pig)) (+2 pts, chain ~22 h)", while Second wins pigs; at 15:47–15:59 UTC
   five steel battleaxes, five hard leather pants and four helmets were asked for The Reaper.
4. **The hours since 16:43 UTC are unread** (the log is too large for the planning chat): acceptance step 7 of
   task 010, the offerings of 00:05 UTC, who wears what was made. Section 1 reads them. **Nothing found there is
   fixed in this task.**

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 23, 25–29; "Known and parked", the blocks of reports 009 and
010); report 010 ("What a potion costs", "The replay", "Notes"); `src/plan/planner/decide.ts` (all of it);
`src/plan/planner/gear.ts` (all of it); `bundle.ts`, `cost.ts`, `reach.ts`, `supply.ts` (`objectiveParents`,
`fleetSec`, how a `src:` gather picks its node), `stock.ts`, `forward.ts`, `config.ts`, `types.ts`;
`src/plan/bis.ts` (the header, `killSeconds`, `BisOptions`); `src/plan/xp.ts` (`fieldSec`, `potionSec`);
`src/sim/combat.ts` (`simulate`, `used`, the restore proc, `monteCarlo`), `src/sim/types.ts`, `src/sim/stats.ts`;
`src/sim/validate.ts` and its caller in `src/state/apply.ts`; `scripts/check-planner.mts`.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to
  `logs/dev.log`. **Reading `logs/dev.log` is part of the task** (sections 1 and 2): read it as a stream, don't
  copy it into the project.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Alex restarts only when the
  report exists. Write the report last, after the gate is green and the task commit is made; don't wait for more
  log after that. If the log shows a restart during your work, say in the Summary what code it loaded.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **What may change:** `src/plan/planner/*`; `src/sim/combat.ts`, `src/sim/types.ts` and `src/plan/bis.ts` only
  for what section 2's verdict needs; `src/sim/validate.ts` and the one call in `src/state/apply.ts` (section 2,
  the record); `scripts/check-planner.mts`; new scenarios with what the harness needs for them; `CLAUDE.md` (the
  planner's section, and the gear-model paragraph report 010 found stale). **Not** `src/state/exec.ts`,
  `src/state/queue.ts`, `src/state/planner.ts`, the UI. No new queue item kind.
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about the log give the UTC time of a line.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-011-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`. If it changed again by the end, commit it again the same way before the task commit.
  2. At the end, `011: calibration round`: this task file, the report and what the task changed.

## What is settled
1. **Filler that fits goes before a road that does not.** The order at the end of `rank()` becomes: Alex's
   `first` list as today; the real candidates (objectives, levels, supply) that fit the deadline; the fillers
   that fit; the real candidates by points per hour; the fillers by points per hour; the fallback. A road that
   fits nothing thereby takes the hours the fallback gather had (47% of all hours from day 33 in report 009),
   not the filler's.
2. **The forecast must say what a real fight drinks.** One count, used by `killSeconds` everywhere, as report
   010 left it; this task finds out why it is twice the log's and repairs the cause, not the symptom: no factor
   fitted to one monster.
3. **A potion's price stays what making another costs** (`potionSec`). Its doubtful part — a by-product priced
   as if it were gathered for itself (an algae at 300 s) — is not changed here; the replay shows how much hangs
   on it (settled point 6) and the planning chat decides from that.
4. **An objective is the fleet's work, not each fighter's.** For gear by need, an open kill objective is one
   work: what is left of it, less what is in flight, done by whoever is best placed. A piece is needed for it
   when making the piece and doing the work with it beats **the fleet's** hours without it — and one fighter
   gets it. A fighter's own road to its combat gate (work (a)) stays per fighter.
5. **The offering's hunt is not changed.** Report 010 lists the three skeleton fights lost on 11-19 (16:35–16:38
   UTC, 41 fights) as a defect. It is the right trade: about ten minutes of walks against 2,550 XP an offering
   and the favor (× 1.5) for the day; "only a safe win" would have skipped the combat offering for all five.
   Section 1 reports each day's hunt so it can be looked at again if a hunt loses more than one fight in five.
6. **The replay's rows change.** The three crafting prices gave the same number in reports 007, 009 and 010.
   The rows become: A the default; B potions at half their price; C potions free; D a win is enough. C is the
   anchor: it is report 009's model plus settled points 1 and 4.
7. Still parked, not touched: a made piece in every fighter's pool (whoever starts first wears it); the tiny
   supply steps; brew batches at a step's tail; `waitingOf`'s reasons; potions as supply through the bank;
   favor drops.

## 1. Read-only: the hours since 16:43 UTC
From `2026-11-19T16:43:42Z` (where report 010 stopped) to the end of `logs/dev.log`; name every restart inside
(run id, time). Shorter than report 010's section — the same reader, the same caps. Print in the report:
- **Per character, the steps in order**: time, key, answer, units planned and done, hours planned and taken;
  runs of one target condensed. For every `supply` step: the parent it names.
- **Every sample** against its estimate, sorted by measured ÷ estimate; every `slower than expected`.
- **Every** `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`,
  `offering interrupt issued again`, `comes back at`, with the lines that explain it: a defect, or as designed.
- **Task 010's acceptance step 7**: every potion expedition under a `Fight` head (`gather Sunflower n/m`, a
  potion withdrawn or brewed) with the step's `why` — is the monster one the character wins safely only with the
  potion? Every `flapping` line: does it name one target?
- **Offerings**: the rest of 11-19's (who completed what, when; fights and losses of each hunt; how long each
  character was inside the interrupt), and **every 00:05 UTC since**: the five `interrupt offering` lines, what
  each item accepted, completed or skipped and why, fights and losses of its hunt, minutes inside. Which favors
  were active and whether the picks used them (a step's `why`, the XP per fight).
- **Gear**: every piece crafted (time, crafter, copies, the `for` and the work the step names); who equipped
  each first and who wears it at the end of the log (equip lines are cut at 200 characters: say what cannot be
  seen); per code, copies made against fighters that the needs named. Every `gear:`, `src:` or `mat:` step whose
  parent is a kill objective that another character was on, or could win safely, at that time — with the hours
  the step took. That is the bill of settled point 4.
- **Fights**: per character and monster — fights, losses (each with its time), XP an hour of each fight step
  against the estimate in its `why`.
- **Where the time went**, per character, as in report 010: fighting and resting; food; potions; walking and
  bank resets; crafting; gathering as the step's own work; standing.
- **Diamond Stone at the copper rocks.** At 18:44:37 UTC Fourth started `src:diamond_stone@Fourth#1` ("5788
  actions short for diamond_in_the_sky (+3 pts, chain ~42 h)", 212 gathers) and mines copper ore. Print: the
  diamond's drop rate at every node that drops it and which of them Fourth and the mining specialists reach;
  where the node is chosen (`path:line`) and by what rule; and what the same 42 hours would give at the node
  that gives the miner XP, or at a rock whose ore the open chains are short of (diamonds, mining XP, ore). Who
  else is on that target. Read-only: the planning chat decides whether by-products should count.
- **Network errors** an hour, and whether a step was lost to one.
- Then, in at most ten lines: **what the log says the next task should fix first.**

## 2. What a fight drinks
- **The evidence.** For the pig steps of 2026-11-19 13:43–16:22 UTC (Second, Third, Fifth; First without
  potions as the control): per character and step — fights, potions brewed and withdrawn, potions left when the
  step ended (deposits), so the potions drunk a fight; the level, max HP and the set worn (equip and withdraw
  lines; say what the 200-character cut hides). If the log carries a fight's turns or final HP anywhere, use
  them.
- **The model, on those fighters.** `simulate` against a pig with that set as far as it is known: the units of
  each potion a fight uses in the expected mode (what `killSeconds` prices today), in the pessimistic pass, and
  as the mean and spread of `monteCarlo` over at least 2,000 fights. One table: log / expected / Monte Carlo /
  pessimistic, per fighter.
- **The verdict**, one of these, with the numbers that show it:
  (a) the expected mode miscounts procs (a proc is a threshold on HP; folding crits and misses into mean damage
      moves the turns spent under half HP) — then the count that prices a fight comes from something that
      matches the Monte Carlo mean. The solver's inner loop may keep a cheap count only if you show, on the
      cases the check prints, that it orders sets the same way; the price the planner compares monsters by
      (`actionSec`, `killSec`, `roadRate`, `fleetSec`) must use the repaired one. Say what it costs in solve time
      (the first week inside `npm run check` is the measure);
  (b) the model of a proc differs from the game (when it fires, what it restores, two potions at once, the
      monster's turn order) — say what the docs in `docs/` and the log say, and repair the model;
  (c) the real sets differ from the ones report 010's table solved (the snapshot bank against what the fighters
      wore) — then the simulator stays, and the table is printed again on the real sets.
  If the log cannot decide between them, say exactly what is missing and choose nothing: the record below then
  decides at the next potion fights.
- **The record.** `src/sim/validate.ts` already re-runs every real fight. Add to each `Deviation` the potions
  the forecast used and the potions the fight really used (the utility slots' quantities before and after, from
  what the fight's echo already carries — no request), and to `SimAccuracy` the fights with a potion and the
  median error. No UI. Old stored entries without the fields must still load.
- **The two traps of `bis.ts`'s header** (the fire staff against the iron sword on a cow; body armor stripped
  under a potion) stay right: print both before and after, as report 010 did.
- **By-products, read-only.** For every potion in report 010's price table whose price is half or more one
  ingredient that is a by-product of other work (an algae from fishing, a slimeball from slimes): the price if
  that ingredient were free, how many of it the snapshot's bank holds, and which open objective or level road
  of the replay produces it on the way.
- **Print**, as report 010's "Per fighter, before and after": on the 2026-11-18 snapshot and on the fleet at the
  log's latest levels — the XP monsters with kill seconds and the potions a fight drinks, before and after this
  section, and the pick.

## 3. Filler before a road that does not fit
- In `rank()` (`src/plan/planner/decide.ts`), the order of settled point 1. A filler chosen while a real
  candidate still has points per hour says so in its `why` ("filler: nothing else fits the deadline"); the
  header's rules 4 and 5 are rewritten to say what the code does.
- If `forward.ts` or the check script restate the order anywhere, they follow; say where.
- Made-up cases in `scripts/check-planner.mts`: a filler that fits next to a level road that does not → the
  filler; the filler blocked or done → the road, with "(nothing fits the deadline: points per hour)"; a `first`
  achievement that fits nothing still goes first, as today.
- Print for the replay's row A the hours by answer (objective / level / supply / filler / fallback) against
  report 009's and report 010's, and "filler not reached" in points.

## 4. An objective is the fleet's work
In `gearNeeds` (`src/plan/planner/gear.ts`), work (b):
- **What is left** is the objective's `left` less the units of the other characters' running steps on that
  target (`world.current`, as `rank()`'s `inFlight` counts them).
- **`H0`** is the least hours among the characters that are on, meet the objective's other gates and win the
  monster as `config.risk` asks with what their own pool holds: what is left × that character's seconds a unit.
  ∞ only when none of them does.
- **A need** of character X holds when `G + H1(X) ≤ NEED_RATIO × H0` with that `H0`. So a fighter that cannot
  win pigs gets nothing "for i_want_bacon" while another finishes it in an hour; a fighter that would do the
  work much faster with a piece than the best-placed one does without still gets it.
- **At most one need per objective**: the character with the least `G + H1`, ties to the name. Its score is as
  today.
- Work (a) — the road to the next combat gate — is untouched and stays per fighter: a piece that pays on a
  fighter's own road is still asked for each fighter it pays for.
- Work (c): say whether the tool for an open gathering objective has the same fault (the same objective, a tool
  per role holder), with the replay's count. Fix it the same way only if it is the same three lines; otherwise
  under "Notes".
- `supply.ts` (`objectiveParents`, the bill of an objective's own materials): say whether an objective's
  materials are counted once or once per character there, with `path:line`. No change unless it is the same
  fault and as small.
- Made-up cases: two fighters and a kill objective — one wins safely: no need for the other; nobody wins: one
  need, for the one with the least `G + H1`; the other's step in flight covers what is left: no need at all.
- Print, on the snapshot and on the fleet at the log's latest levels: every need before and after (for whom,
  the work, the pieces, `H0`, `H1`, `G`). For the replay: pieces made in the first eight days and to the
  deadline against report 009's 67, and the supply hours.

## 5. The replay
- Rows as settled point 6. The potion's price factor reaches every `killSeconds` call of the core's solves by
  the smallest seam there is (`BisOptions.potionPrice` exists). If that seam is a config number, its default is
  1, the UI does not show it and the executor keeps 1; say so in `config.ts`.
- **Row C against report 009.** It should land near 56 plus what sections 3 and 4 give. If it does not, find out
  why before the report is written; the explanation is part of the Summary.
- Per row: the points on days 7, 14, 30, 60 and at the deadline; the day each fighter reaches combat 25 / 30 /
  35 / 40; the share of all fight hours that is potion making; the hours by answer; the open points by what
  they wait for (the list of report 009: another layer, an event, gear, `use`, unhandled, a raid, filler, a
  group).
- For row A, per fighter at combat 25, 28, 30 and 35 (or the highest it reaches): the XP monster picked, kill
  seconds, the potions a fight drinks and their share of the kill; the next monster it does not win safely and
  what flips it (`piecesFor`), or "nothing craftable".
- In at most ten lines: **does combat stall near 28–30 for want of cheap potions, or was that the count?** And
  what that means for when the fleet reaches a layer (the gathering specialists at 40) and an event (the
  fighters at 30).

## Out of scope
Everything of settled point 7; the offering's hunt (settled point 5) and anything else of `src/state/queue.ts`;
`potionSec` and `fieldSec` themselves; keys, tolls and `has_item` transitions; spending of any kind; the `use`
objectives; events; the Roadmap, the outlook and every UI; deleting anything of the hive; `initiative` in the
simulator unless section 2's verdict is (b) and names it; food; regenerating the atlas; everything parked in
`docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `011: calibration round` on top of `Rework notes`; `git status` clean.
2. `npm run check` → the 52 checks of report 010 plus any new scenario, all ok except `repeat-spin`; exit 0.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points a / b / c / d)`
   for the rows A default / B potions half / C potions free / D a win is enough, and prints the tables of
   sections 2, 4 and 5.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. **After the restart** (the planning chat says when): a `gear:` step whose `why` names a kill objective names
   one character; no `supply` step is started for a piece "for X (<objective> (<monster>))" while another
   character's step on that objective runs and covers what is left.

## Report
`tasks/011-calibration.report.md`, with these sections in this order:
- **Summary** — 3–6 lines: section 2's verdict first, then the four deadline numbers against 49 / 49 / 49 / 52
  and report 009's 56 / 59, then the answer of section 5's last point.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The hours since 16:43** — section 1, in its order, ending with the ten lines on what to fix first.
- **What a fight drinks** — section 2: the evidence, the table, the verdict, what changed in the picks, the two
  traps, the by-products.
- **The replay** — section 5, with section 3's hours by answer and section 4's pieces.
- **What was done / files** — per section 2–5: what, where (`path:line`); every command run.
- **Notes** — defects noticed and not touched; guesses in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
