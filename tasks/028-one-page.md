# 028 — One page: the fleet, each hero's step and its reason, the plan in levels; no manual play

Read first: `CLAUDE.md` (the UI layout, the outlook, the journal); `src/app.tsx`; `src/ui/RoadmapTab.tsx`, `FleetView.tsx`,
`CharacterPanel.tsx`, `QueuePanel.tsx` (the 🧭 switch, `PlannerLine`); `src/state/outlook.ts`, `synced.ts`;
`src/plan/planner/road.ts`, `decide.ts` (where a step's `why` is put together), `gear.ts` and `consumables.ts` (the
needs); `src/lib/journal.ts` (the `end` record's meter); `tasks/019-roadmap-home.md` (settled points 4, 9 — the rules
the page keeps).

## Where this starts
On top of `027g: the fighter's seconds` — the top of `origin/rework` when you start. If it is not the last commit, or
its report says it stopped, say so and stop. The working tree holds at most three changes from the planning chat
(`docs/rework.md`, this file, and `tasks/029-fleet-levels-crafts.md` — the next task: leave it alone, do not commit
it) unless 027g's commit already took them; anything else uncommitted: say so and stop. **One exception: a parallel
session reads the board (`tasks/026b-board-reading.md`)** — its task file, its report and new files under
`docs/strategy/board/` may be there or appear while you work: not yours, never edited; committing them with your
commit is fine.

**What is.** Three tabs show the fleet: Roadmap (season, a Now table with the step's why as one long sentence, a road
that is a list of achievement dates), Fleet (queues, bag, task, the skills grid, manual offerings and group fights)
and Character (gear, skills, inventory, the queue editor, manual actions).

**Alex (2026-11-25):** the Roadmap shows the fleet's steps, plans and how decisions are made too modestly — one big
page instead of Roadmap, Fleet and Character. Every manual action goes: the fleet is steered through the planning chat,
and next season nothing is to be done by hand. Since decision 71 the plan is levels first (the fighters' combat, the
workers' gear crafts), and the page is built around that, the achievements below it.

**Nothing in what the planner decides or in what the runner does changes.** `npm run check -- planner` ends with the
line of 027g's report.

## A. What the page needs from the service (data only)
1. **A step's reason in parts**, built where its `why` is built and carried on the step beside it (the `why` string
   stays as it is, to the letter): the role; the rule of the role's order that took it (first, forging, a need's
   kill, the XP pick, a need, a short objective, the craft ahead, today's rule, the fallback, the free pass); the
   goal ("combat 27 → 50", "Skull Wand for Fifth"); for whom; why this one (the rate, the win rate, the seconds a
   win, what it saves); the limits (rests and why, a bag cap, a potion); and up to three candidates that ranked
   next, each with its one-line text and score. If `decide` does not hold the next candidates where the step is
   made, leave them out and say so.
2. **The road in levels**: `road.ts`'s day line and `done` carry, per character, the combat level and the eight
   skills' levels at each day's end; `done` also the gear pieces and tools made (when, what, for whom) and the day
   each fighter's XP pick changes monster. `OutlookRoad` keeps them.
3. **The needs**, one more line of the outlook's child at the start World (as `waiting` and `next` are): every open
   need of the fighters' road and every tool — what, for whom, what it gives (the figures its score was made of,
   as the why says them), what is missing (the craft level: skill, the crafter, its level against the one asked;
   the materials short, each with its source — kill, gather, buy, craft — and who may do it), who works on it now.
   Only what `gear.ts`, `consumables.ts` and `supply.ts` already compute.
4. **The last 24 hours a hero**, a synced signal kept by the service from the journal's `end`, `level` and `loss`
   records (hydrated at boot from the last two daily files, then fed as records are written; the harness feeds its
   own): seconds by activity (fight, rest, eating, gather, craft, bank, walk, gear, wait), XP by skill, levels
   gained, fights won and lost, combat XP an hour, and the last eight steps (when, its text, the answer, how it
   ended, hours against plan).

## B. The page (`roadmap`, the home; English; nothing computes in the tab — 019's rule)
Top to bottom:
1. **Season strip**, one card: today's Season card, plus the fighters' and the gear crafts' levels now → at the
   road's end; the bank (slots used, gold, the next expansion's price); the service (run, commit, up since); the
   live events, each with the planner's verdict (Fleet's "Needs you" without its buttons).
2. **The five heroes**, five cards in a row (five columns from about 1,500 px, wrapping below). A card, top to
   bottom:
   - the head: avatar with the cooldown ring, name, the role (and "→ fighter at weaponcrafting 30" where the config
     says so), the 🧭 switch; combat level with its XP bar; the levels of its role (a worker: its craft and its
     lanes) with bars; HP; where it stands; its task with progress; the bag's fill;
   - what it wears: the slots as icons with the item pop-up (no action), the utility slots with counts;
   - **Now**: the step in plain words (the queue head's text), the answer's pill, the live note ("fighting 38/45",
     "healing"), units done of planned, hours run of planned as a bar; a paused head's error in red;
   - **Why**, from A.1: the role's order as a short numbered list with the rule that took the step marked; then the
     goal, for whom, why this one, the limits; "instead of" — the next candidates, folded;
   - **Next**: the outlook's next three steps with their start times, the why in the title;
   - **The last 24 h**, from A.4: one stacked bar of the seconds by activity with a legend, combat XP an hour (a
     fighter) or the craft's XP (a worker), levels gained, fights won and lost; the last eight steps, folded.
3. **The plan**, one card:
   - a chart (inline SVG, no library): the days of the road on x, levels on y; a line a fighter's combat level and
     a line a gear craft (the crafter's), today's values labelled at the left, the road's end at the right; faint
     guides at 30, 35, 40, 45; a mark where a gear piece or a tool is made and where a fighter's monster changes,
     with a title text. Under it, the same as a small table (the days 1, 3, 7, 14, 21);
   - **Who supplies whom**, from A.3: a row a need — what, for whom, what it gives, the craft level it waits for
     (crafter, now → asked), the materials short and who brings them, who works on it now, the day the road makes
     it. The needs nobody works on first.
4. **Blocked**, as today (only when something is).
5. **Achievements**, folded: today's road table, the open achievements with their knobs, the priorities.
6. **The fleet's skills**, folded: Fleet's grid.
Dark theme and the page's own classes (`ws-card`, `DataTable`, `Bar`, `pill`, `Fold`); CSS added only where no class
fits. A long text wraps inside its card; nothing scrolls sideways at 1,280 px.

## C. No manual play
1. The Fleet and Character tabs go (`TABS`, the routes — an old `#/fleet` or `#/char` opens the page). What other
   files import from them moves to where it is used.
2. Every control that makes a character act goes, with the code only it used: the action bar, the queue editor,
   the inventory's buttons, the manual offerings and group-fight sections, the walk mode and its map pop-up, the
   buy, sell, craft, recycle, deposit and withdraw buttons of the Map's drawers and of the Bank, Items and Monsters
   tables, the claim of a reward if the planner claims by itself (if it does not, keep that one and say so). The
   tab-facing functions nothing else calls go too; the executor's and the planner's use of `src/api` stays.
3. What stays: the 🧭 switch a hero, the knobs of the open achievements and the priorities, the fight floor, the
   two ↻, Sign out. Bank, Items, Monsters, Achievements, Map and Sim stay as read-only tabs; the activity log stays.
4. List in the report what was deleted, a line a thing.

## D. Proof
1. Checks: the reason's parts for a fighter's pick, a worker's need and a craft-ahead step (the rule named, the goal,
   the limits), and the `why` unchanged; the road's lines carry the levels and the gear made, two cold runs the same;
   the needs line on a made-up world (a piece that waits for a craft level, one that waits for a material); the
   24-hour signal from made-up records (the seconds add up, a restart keeps it).
2. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, `npm run check -- planner` once
   (027g's line). If the verify skill gives a way to see the page without the game and without touching the live
   service, use it and say what you saw; otherwise say what only Alex's eyes can check.
3. `CLAUDE.md`: the UI layout, the outlook's new lines, the journal's signal. Commit `docs/rework.md` as `Rework notes`
   if it differs from `HEAD`, then everything else as `028: one page`; push to `origin/rework`. If the push fails,
   say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game; nothing you run writes under `logs/`.
- No new dependencies. Do not edit `docs/rework.md`.
- No decision, score, constant or rule of the planner or the runner changes; if A needs one, say so and stop.
- A failing outlook or an empty 24-hour signal never breaks the page: each card says what it waits for.
- Everything you write is in English, the page's texts too.

## Report
`tasks/028-one-page.report.md`, **at most about 110 lines**: Summary · Decisions for Alex · How Alex verifies (what to
look at on the page after the restart, card by card) · The data (A) · The page as it is drawn (B) · What was deleted
(C) · What was done / files · Notes. No placeholders left in it.
