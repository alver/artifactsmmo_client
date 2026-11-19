# 009 — The planner's core, second round: gear by need, supply through the bank, honest gates

## Goal
Report 007 played the rule to the deadline and got 54 points, with half of all hours on the fallback gather from
day 20. The rule was not the cause. Nobody makes gear, so combat stops at 25; a material that another craft makes
is "unhandled"; alchemy cannot level at 12–19; a combat gate is priced with gear nobody owns; roles wander. This
task gives the core those abilities and plays the season again. **The replay is as much the deliverable as the
code**: points at the deadline with gear, where the hours go, what stops the fleet next, and the answers to three
open questions of `docs/rework.md` — does the rule behave as a spine, is "safe" a wall or a price, what may gear
crafting cost.

Since report 008 the service runs the planner's runtime with one character on (Fifth). It keeps the code it was
started with: nothing of this task goes live until a restart, and no restart is part of it. But from this task's
commit on, any restart brings this core live for whoever is on — so with Fifth alone on it must answer sensibly
(section 7), and the runtime's scenarios must stay green.

Read first: `CLAUDE.md`; `docs/rework.md` (the goal; decisions 11, 17–23; "Known and parked"); `docs/design/planner.md`
A.2, A.3, A.5, B.3, B.4, C.1, D.1, E, I.3 (task 4), I.4; report 007 (all of it); report 008 (Notes); all of
`src/plan/planner/*`; `src/state/planner.ts` (how the runtime calls the core: `worldOf`, `start`, `measure`,
`stepSample`, `blockStep`, the brake); `src/plan/bis.ts` (`bestInSlot`, `BisOptions.extraCandidates`, the safe
tier, `canEquip`, `killSeconds`); `src/plan/jobgear.ts` (`ownedFightRec`, `ownedQtyOf`, `jobGear`);
`src/sim/combat.ts` (`simulate`, the pessimistic pass); `src/plan/xp.ts`; `src/plan/queue.ts` (the items);
`src/state/queue.ts` (the `craft` handler: it takes its materials from bag and bank and fails by name when they
are missing; the `gather`, `fight`, `withdraw`, `deposit-all` handlers); `src/plan/hive/gear.ts`,
`src/plan/hive/ctx.ts` (`fleetBis`) and `src/plan/hive/acquire.ts` (how the hive found craftable upgrades and
resolved a bill of materials — to read, not to import); `scripts/check-planner.mts`; `scripts/atlas/econ.mts`
(craft XP).

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running, with Fifth on the planner, and stays undisturbed.** Don't start, stop or restart
  a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`, `npm run atlas`,
  `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to `logs/dev.log`
  (reading it is fine).
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **What may change:** `src/plan/planner/*`; `scripts/check-planner.mts`; `CLAUDE.md` (the planner's section);
  in `src/state/planner.ts` only what section 9 names; one new scenario with what the harness needs for it.
  **No new queue item kind and nothing in `src/state/queue.ts`**: a step compiles to today's items or it is not
  built — then it goes under "Notes" with the item it would need.
- **The core does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.** The hive is
  deleted in the clean-up; what the planner needs from it is restated in the core (say what, with both places).
  `bis.ts`, `jobgear.ts`, `xp.ts`, `route.ts`, `events.ts` (the floors) and the catalog are fine.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-009-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`.
  2. At the end, `009: planner core, second round`: this task file, the report and what the task changed.

## What is settled
1. **Safe stays the rule.** A planned fight is a safe win (`bestInSlot`'s pessimistic pass wins too). Gear by need
   is the planner's answer to "wins, but not safely". Whether an unsafe win should be priced instead is decided
   after this task, from what section 10 prints: the replay row in which a win is enough, and the table of
   unsafe wins. For that row only there is a knob, `config.risk: "safe" | "win"`, default `"safe"`.
2. **One rule for gear** (section 4): a craftable piece is needed when "make it, then do the work with it" takes
   at most 85% of the hours of doing the work without it. A win that is not there counts as ∞ hours, so a flip
   always qualifies; a speed-up must pay for itself.
3. **The bank is the buffer** (section 3). A material that is short is a target of its own; what a step produces
   for another step is in the bank when the step ends. Supply is made for open demand only, never ahead.
4. **No spending.** No gold and no tasks coins are spent on gear or materials; `npc_buy` with an item currency
   stays as it is. A piece or an objective that needs a bought material is listed with what it would cost.
5. **Crafting stays with its crafter.** The craft of a gear piece is done by the holder of the recipe's skill
   (section 1). Bars, planks and potions (recipes of a gathering skill) are made by anyone who has the level.
6. **Nothing is recycled or sold for materials**, and no gear is taken off a character for another: a piece worn
   by a character's current step is that character's (section 6).
7. **Utilities, bags, runes and artifacts are not planned.** Gear here is what `SLOTS_FOR_TYPE` equips, without
   `utility` and `bag`, and only what has a recipe.
8. **Steps stay small**: at most four items, none infinite, and no step longer than 2 × `CHUNK_SEC` except one
   level of `train` and a single unit that cannot be split (one task).
9. **A character that is not on plans nothing and is planned for by nobody.** It keeps its roles, but a chain
   that ends in its hands is not offered to the others (section 7). The check and the replay run with all five on.

## 1. Roles hold still
- `DEFAULTS.roles` pins every role, so `rolesOf` computes nothing for this fleet: the crafters as today (First
  cooking, Second weaponcrafting, Third gearcrafting, Fourth jewelrycrafting); the gathering specialists of design
  B.3 (First fishing, Second woodcutting, Third alchemy, Fourth and Fifth mining); and, for mining and
  woodcutting, as many more as make three per lane — chosen once from the snapshot by the rule `rolesOf` has
  today (level, then fewer lanes, then account order) and written out as pins. A pinned lane gets no computed
  extra. Print the table; say who carries how many lanes.
- The rule stays for a fleet without pins (the made-up worlds use it).
- Work does not move a role, because roles no longer follow levels. The recycling filler trains the character's
  own crafting role; a character without one of the three gear crafting roles has no recycling filler.
- The check asserts that the roles are the same at every decision of a replay.

## 2. A level gate is priced by what the character can do
- **Combat.** The hours from level L to a gate are, per level, the XP that level needs over the XP per hour of
  the monster `pickMonster` gives this character at that level with the pool it has now (section 6); a measured
  `level:combat:<L>` comes first, as today. A level with no safe XP monster makes the gate ∞: it is no candidate
  for this character, and `waitingOf` says it waits for gear. The atlas's `path` is no longer read for this.
  (Report 007: First spent 96 hours on pigs toward 32, which pigs cannot reach.)
- **The level a kill waits behind** is the first level, up to ten above, at which this character wins the monster
  safely with the pool it has now (a level-up is +5 max HP, as the forward model has it, and opens gear the level
  allows) — solved, not the atlas's safe level. None within ten: the kill waits for gear, not for a level.
- **A gathering lane** keeps the atlas's hours, and is ∞ at a level where no reachable node gives XP and
  section 5 has no recipe either.
- **A crafting lane** is unchanged (`craftTrain` × `craftK`, `craftAbove40`, measured levels first).
- The runtime reads `levelHoursEstimate(lane, level, world)` for the estimate of a level sample
  (`src/state/planner.ts`, `observe`). Keep that export meaningful, or change that one call and say so.

## 3. Supply: the bank is the buffer
Today a craft or a buy takes each input from the bank or sources it in the field inside the same step, one level
deep; anything else is unhandled (report 007: 18 points on 6 achievements), and one diamond is a 71-hour step.

- **Demand.** Every open target that consumes items — a craft or buy objective, a gear piece (section 4), a
  material — has a bill of materials: its recipe opened until each leaf is bank stock, a field source (a gather
  or a kill, with its gates), or out of reach for now (an event that is not live, a boss, a raid, gold, tasks
  coins). Out of reach: the parent waits, with that reason and, where there is one, the price.
- **A code that is short** (what open demand needs, less what this character may plan with in the bank, less what
  others have in flight) is a target:
  - `src:<code>` — its field source. Units are actions (gathers, kills), so a rare drop is a run of ordinary
    chunks. Items: `[gear reset, the field item, deposit-all]`.
  - `mat:<code>` — its craft, in reach when the bank feeds at least one run and the character has the recipe's
    level. Its own inputs are demand in turn, as deep as the recipes go. Items: `[gear reset, craft, deposit-all]`;
    the `craft` item takes its materials from the bank itself.
- **The parent** is in reach when the bank feeds at least one unit. A craft or buy objective still sources inside
  its own step when one unit's shortfall is all field work and fits 2 × `CHUNK_SEC` (Tanner's Exchange: the cows,
  then the tailor); everything bigger or deeper goes through supply targets.
- **Score.** A supply target scores what it is for: the best of its parents' `points × fit ÷ hours`, where the
  hours are the parent's whole remaining chain — every supply hour, its own work, and for a gear piece the hours
  of section 4. The same number on every link, so a chain is worked in whatever order reach allows. The +10% for
  the last target and the units in flight count as for objectives. `Step.as` is `"supply"`; the `why` names the
  code, the parent and the points behind it.
- **Reservations** (`stock.ts`): what a planned craft will withdraw is reserved, so two crafts do not plan with
  the same bars; what a supply step will deposit is not counted before it is in the bank.
- **Never ahead.** When the parent closes, its supply targets are gone; what is in the bank stays there.
- The nine unhandled objectives of report 007: say for each what it is now — a chain (print it), or still
  unhandled, with the reason.

## 4. Gear by need
- **The work a piece can serve**, per character: (a) its road to its next combat gate — the XP monster; (b) an
  open kill or drop objective whose other gates it meets; (c) for a character with a gathering role, its road to
  that lane's next gate or an open gathering objective of the lane — a tool.
- **The need.** H0 = the hours of that work with the pool the character has (∞ where there is no safe win, or no
  XP source). For a set that adds craftable pieces: H1 = the hours with it, G = the hours to make the pieces —
  supply (section 3), the crafts, and the crafter's levels where its skill is short (`hoursToLevel`). The pieces
  are needed when `G + H1 ≤ 0.85 × H0`.
- **Candidates**: pieces with a recipe that the character can equip now, not in its pool, whose bill of materials
  is in reach (settled points 4 and 7). For a fight, `bestInSlot` with them as `extraCandidates`; then the
  cheapest set that still qualifies — drop the dearest new piece while the need holds. For a tool, the best
  `<skill>_gathering` effect against the best one in the pool (`gatherCut`).
- **The target** is `gear:<code>`, with as many copies as characters need less what the fleet has free. Its work
  is the craft, by the crafter (settled point 5); its inputs are demand (section 3); a crafter short of the
  recipe's level makes `lvl:<lane>:<level>` a level target for the crafter that carries this piece's points.
  Items: `[gear reset, craft, deposit-all]`; `Step.as` is `"supply"` here too. The fighter picks the piece up at
  its next reset, or at once: a `fight` item with `gear: true` solves again each round.
- **Score**: the points behind the work — the objective's, or the bundle behind the combat (or gathering) gate,
  as rule 3 counts it — `× fit ÷ (G + H1 + the bundle's own hours)`, on every link of the chain. This is rule 3
  with more kinds of gate; say in the report exactly how a bundle is formed now and where a point could be
  counted twice.
- **Meanwhile** the character that waits for a piece does whatever scores best without it.
- **Rejected candidates** are printed once per character and work: the piece, and why (a material from an event,
  a boss, a raid; gold; tasks coins, with the amount; no crafter).
- **Cost.** The solves are the expensive part and the service has one thread. Bound them — a shortlist of
  monsters for (a), a cap on the drop pass, planning-grade solver caps as `fleetBis` used — and say what you
  bounded and what it can miss.

## 5. A lane that only a craft can level
Alchemy 12–19: sunflowers give no XP, nettle needs 20, and the `train` item does not brew. When no reachable node
gives XP at the lane's level, `planLevel` takes the recipe of that skill with the best XP per hour that the
character can feed — from the bank it may plan with, else by gathering inside the step — and the step is a craft
step with today's items. Print what it picks for Third at alchemy 17 and the hours per level against the atlas.
Do not change mining or woodcutting; print, for the specialists at their levels, the XP per hour of the best node
against the best recipe (bars, planks), so the next round can see whether smelting is the better road.

## 6. The pool: nobody plans with a piece another wears
- The pool a character plans with — for `fightRec`, `gatherCut`, section 2 and section 4 — is the bank plus what
  it holds, less the pieces in the bank that another character's current step wears and does not hold yet.
  `reserved()` counts a piece a character already wears against the bank today; that is wrong in both directions.
- The forward model wears gear: when a fight or a gather step starts, its set leaves the bank and the set the
  character wore before returns to it. A second fighter then really lacks the single piece and section 4 asks for
  a second copy.
- **The memo tables.** `fightMemo` and `cutMemo` (`reach.ts`) are keyed on the bank's gear as a string. In real
  play the bank's gear changes with every reset of any character, so the tables miss all day and grow without
  end in a service that runs for weeks. Key the solves on something that holds still when gear only changes
  hands, and bound every table (say the cap and what is dropped).

## 7. The fallback, and who is on
- `fallback()` honours `world.blocked`: a blocked `fallback:<skill>` is passed over for the next skill; when all
  are blocked, the one whose block ends first. (Report 008: a fallback chunk that ends empty is decided again at
  once, and the brake does not end it.)
- Settled point 9: with `config.on` naming one character, gear targets, their supply and the crafter's level
  targets are offered only when the piece's crafter is on. Print Fifth's first four decisions on the snapshot
  with Fifth alone on, next to report 008's ("Tanner's Exchange, then 47-highwayman chunks"), and say what
  differs and why.

## 8. The forward model
- Deposits: what a step gathers, drops and crafts is in the bank when it ends (fractions as they are). A craft
  takes its materials from the bank. Gear is worn (section 6) and a crafted piece is bank stock.
- The three notes of `outlook()` change with it; events are still not simulated, offerings' XP still not counted.
- Say what a full run to the deadline costs now. The outlook of task 010 must not run it on the service's thread
  as it is; say what you would cut.

## 9. The runtime: two edits and one scenario
- `measure` (`src/state/planner.ts`) reads a step's units from its last item; a trailing `deposit-all` has none,
  and the step would be blocked as "ended empty". Read them from the step's last item that counts.
- The brake blocks every candidate `rank()` returns; supply and gear candidates are candidates.
- Whatever the changed types force, and no more. The twelve `planner-*` scenarios stay green and unchanged.
- One new scenario, `planner-supply-step`: an owned character with an open demand takes a `src:` step; it runs;
  the bank holds the produce when it ends; the step is sampled, not blocked; the next step is decided.

## 10. The check: invariants, made-up worlds, the replay
**Invariants**, on every decision (the ten of report 007 stay; number 3 follows the row's `risk`):
11. the roles are the same as at the start;
12. no piece is in two characters' sets at once, and no step plans with stock another step reserved;
13. no step longer than 2 × `CHUNK_SEC` but a `train` level or a single task;
14. a supply or gear step has an open parent, and its crafter is on;
15. bank stock never falls below zero or below a floor;
16. a gear piece that was made is worn by the character it was made for within a day of reaching the bank, or
    printed with the reason.

**Made-up worlds**, small enough to read, each with the steps it gives:
- a fighter with no safe XP monster and one craftable piece that flips one: the crafter and the others work the
  chain, the fighter does something else, and with the piece in the bank its pick is the new monster;
- the same with the crafter two levels short: the crafter's level target carries the piece's points;
- two fighters and one piece in the bank: a second copy is asked for, never the same piece twice;
- a material two crafts deep: source, material, final craft, across two characters through the bank;
- a miner and a better pickaxe within reach: asked for only when it pays (show one case each way);
- alchemy at 17 with nothing in the bank: the brewing step;
- the fallback blocked: the next skill;
- the crafter not on: no chain work offered.

**The replay**, from the snapshot to 2027-02-24, all five on, every invariant on every decision:

| row | `craftK` | `risk` |
|---|---|---|
| A (default) | 0.1 | safe |
| B | 0.25 | safe |
| C | 1 | safe |
| D | 0.1 | win |

For each row: points on day 7, 14, 30, 60 and at the deadline; the day each achievement completes; the share of
character-hours by answer (objective, level per lane, supply split into `src:`, `mat:` and `gear:`, filler,
fallback); the levels at the
deadline; per fighter the day it reaches combat 25, 30, 35, 40 and what it waits for at the end; every piece made
(for whom, for which work, the day asked, the day in the bank, the day worn, the hours of its chain by part:
supply, crafts, the crafter's levels); the open points by what they wait for. For row D also the hours fought on
wins that are not safe.

**Safe: a wall or a price.** Per fighter on the snapshot, and again at the level where row A leaves it: the
monsters up to ten levels above that give XP, each with win, safe, kill seconds and XP per hour from the pool,
how the pessimistic pass ends for a win that is not safe (turns, HP short), and what section 4 would make for it
and in how many hours. Under "Notes": what is random in a fight as `simulate` models it, and what a loss
probability would cost to compute.

**Budget.** Say the numbers; if one is missed, say what dominates — don't meet it by planning less.
- The planner's check inside `npm run check` (the first week): under 40 s.
- `npm run check -- planner` (the four rows): under 10 minutes; the time and the solves per row.
- One `decide` on the snapshot with all five on (a scratch probe): cold, under 5 s; after a reset has moved gear
  between the bank and a character, under 1 s; warm, under 20 ms.

## Out of scope
The Roadmap, the outlook in the runtime and every UI (task 010); turning anyone on or off by default; a spending
rule (gold, tasks coins, event currency); pricing risk (only the knob and row D); utilities, potions as fight
gear, bags, runes, artifacts; recycling or selling for materials; five characters on one objective; the `use`
objectives; events in the forward model; the fleet on events; group fights; keys, tolls, `has_item`; mining and
woodcutting levelled by crafting (printed only); deleting anything of the hive; regenerating the atlas; a new
queue item kind; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `009: planner core, second round` on top of `Rework notes`; `git status` clean.
2. `npm run check` → the 49 checks of report 008 plus `planner-supply-step`, all ok except `repeat-spin`; exit 0.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points a / b / c / d)`
   and prints what section 10 lists.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git diff HEAD~1 --stat -- src/state` → `planner.ts` only, a few lines; `src/state/queue.ts` untouched.
7. `git show --stat HEAD` → `src/plan/planner/*`, `src/state/planner.ts`, `scripts/check-planner.mts`, the new
   scenario and what the harness needed for it, `CLAUDE.md`, this task file and the report. Anything else is
   explained in the report.

## Report
`tasks/009-planner-gear-and-chains.report.md`, with these sections in this order:
- **Summary** — 3–6 lines: the four deadline numbers first.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). If the rejected candidates of section 4 would change the result, the spending question is
  his: the options (A / B), the points each is worth by the replay, your recommendation, the default. "None" if
  empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **What the planner would do now** — the first step of each character and the first week, next to report 007's
  (15 → 31): what changed and why. Fifth alone on (section 7).
- **The replay** — the four rows as section 10 lists them, then **what it says**: spine or greedy (how often a
  crafting level is the step taken, and how rows A–C differ); what stops combat now, per fighter; what "safe"
  costs (row D against row A, and the table); the first wall after gear (a layer, an event, a group, spending);
  the silly things it did, as report 007 listed its own.
- **What was done / files** — per section 1–10: what, where (`path:line`); how a bundle is formed; the memo keys
  and caps; what was restated from the hive; every command run.
- **Notes** — what 010 (all five on, the Roadmap, the outlook) will meet; what still cannot be compiled to
  today's items; defects noticed and not touched; guesses in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
