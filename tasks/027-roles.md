# 027 — Roles: two fighters, three workers

Read first: `docs/rework.md` decisions 63–66, `tasks/025-fight-round.report.md` (Summary, Notes), `CLAUDE.md`
("The planner", "The fight round").

## Goal
Alex's direction (decisions 63, 64): the fleet stops being five even characters. **First and Fifth fight for good.
Second, Third and Fourth are workers: one gathering lane and one gear craft each, the crafts to 30.** Second becomes
the third fighter once its weaponcrafting is 30.

This task is deliberately small and direct. It adds a role to each character and makes `decide` respect it. It does
not retune prices, it does not add a policy layer, and the model is used once, to show the result — not to choose
between variants (report 025: its rows differ by less than the road's own spread).

## Settled (do not reopen)
| | role | lanes |
|---|---|---|
| First | fighter | none |
| Fifth | fighter | none |
| Second | worker; fighter from weaponcrafting 30 | woodcutting, weaponcrafting |
| Third | worker | alchemy, gearcrafting, fishing, cooking |
| Fourth | worker | mining, jewelrycrafting; woodcutting from the moment Second is a fighter |

One owner a gathering skill; no craft changes hands. The levels First and Fifth hold in mining, fishing and cooking
are left where they are.

**A fighter's steps** are fight work only: a kill objective, a `src:` kill (a drop for gear, a bill or the sale
below), a combat level at its XP pick. Among these today's ranking decides; when nothing ranks, the XP pick — a
fighter always has a fight. It takes no gathering, crafting, supply-gather or filler step. Interrupts are as today
(offering, event, merchant, rune, claim, bank).

**A worker's steps**, in this order:
1. a step for a fighter's gear by need or consumable need (`gear:`, `mat:`, a gather `src:`, the craft level a
   needed piece asks for) — today's scoring among them;
2. an objective step whose achievement completes within 6 hours of this character's work (cheap points first);
3. its gear craft to 30 (`lvl:<craft>:30`, the `train` item, as today's level step);
4. everything else of today's rule, inside its lanes.

A worker takes no combat level step and no kill objective. A `src:` kill goes to a fighter; to a worker only when no
fighter that is on is admitted for it. The hunts inside a worker's `train` loop stay as they are.

**Each fighter gets its own set.** `reach.ts openOf`'s shortcut (another character's worn piece counts as the
bank's above a fighter's level) hides a twin fighter's need (report 025, Notes; `check-planner` "two fighters, one
piece" was restated for it). Repair it for fighters: a piece First wears is not Fifth's. Put the check back to its
old reading.

## What to build
1. **The config**: `DEFAULTS.roles` as the table above, with `fighter: true` and, for Second,
   `fighterFrom: { skill: "weaponcrafting", level: 30 }` (or the shape that fits `types.ts` best — one field, read in
   one place). The hand-over of woodcutting to Fourth follows from the same condition; no second switch.
2. **`decide`** (and so the forward model, which plays it): the two lists above. Where the old rule would have picked
   a step the role now forbids, nothing else changes — no new scoring terms.
3. **The steps in flight at the restart** end as they are (a step is at most 90 minutes); the role acts from the next
   decision. No queue is emptied.
4. **The Roadmap's Now card** shows each character's role beside its name (fighter / worker, and for Second
   "worker → fighter at weaponcrafting 30"). Nothing else in the UI.
5. **The why** of a step says the role where the role decided it ("fighter: …", "worker, craft to 30: …").

## Riding along (agreed with Alex, report 025)
- **Restore potions in the simulator** — the repair written out in report 025's Notes, first item: one restore entry
  per potion in slot order, the second fires only if HP is still under half after the first; a worn stack has a
  quantity and stops when it is spent, so the executor's gate sees a short stack (the planner's solves pass none).
  `check-effects` pins the new mechanics. If a pin of `check-atlas` or the forecast tool
  (`docs/strategy/025/tools/forecast.mts`) moves, say by how much; regenerate the atlas at the end.
- **The golden egg** (report 025, "One sale short"): the `sell` target of `turning_treasures_to_gold` gets its
  source (the chicken, 1 in 1,000), so somebody hunts until one egg is in the bank; the merchant standing order
  already sells it. A hard stop at 3,000 kills for this target (95%); the forward model credits the sale on the
  Nomadic Merchant's calendar; `waitingOf` names it honestly. `targets.ts` and `supply.ts` may change for this.

## Proof
1. Scenarios, red first: a fighter with an open gathering objective and an admitted XP monster fights; a worker with
   an admitted monster and an open craft level trains the craft; a worker takes a 3-hour objective before its craft
   and not a 10-hour one; a kill `src:` goes to the fighter, to the worker only when no fighter is admitted; Second
   at weaponcrafting 29 works and at 30 fights, and Fourth then holds woodcutting; two fighters, one piece — the
   second asks for its own.
2. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, and `npm run check -- planner`
   once on the final tree (its pinned line restated with the old numbers beside the new).
3. **One road, once**: `npm run outlook -- --world <the newest logs/world file>` on the final tree and on `a394ae1`
   from the same file. Report both: points on days 7, 14, 28 and at the deadline; the five combat levels and the
   three gear crafts on the same days; the day each craft reaches 30 and the day Second turns fighter. No variants,
   no tuning. If the role road is more than 10 points below `a394ae1` at the deadline, stop and say why before
   committing — that is a decision for Alex, not a knob to turn.
4. Read-only, from the journal since the restart of 2026-11-24 07:39 UTC (run `13i6`): the runes bought, the fights
   by character with p forecast and won, every `loss` record, the points gained. A short table.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game.
- Do not touch `scripts/board/`, `logs/board/` or the scheduled task of 026 (board watch).
- No new dependencies. Commit `027: roles` on `rework` and push to `origin/rework`; if the push fails, say so.
- The machine is strong: run the long things side by side.
- Update `CLAUDE.md` where it describes roles and the restore potions. Do not edit `docs/rework.md`.
- Everything you write is in English.

## Report
`tasks/027-roles.report.md`, **at most about 300 lines**: Summary · Decisions for Alex · How Alex verifies · What was
done / files · Notes · To delete (Alex). Numbers in small tables; no per-run listings of completions — point to the
files instead.
