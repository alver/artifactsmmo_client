# 014 — The consumables round: potions and food by need, made through the bank

## Goal
Since about 09:50 UTC on 2026-11-20 the service runs report 013's code (run `[wj59]`, first seen at 09:54:09 UTC;
`[yewz]` wrote its last line seen at 09:44:09). Report 013's replay ends at 77 points by default and at 85 with
potions free, and what separates the two rows is not 8 points: the fighters reach combat 40 on days 56–81 by
default and on days 12–16 with free potions, and 73 points wait behind layers that want combat 44–55. **87% of
row A's fight hours are potion making.** The first fight members of an event come about day 15 (the gold set,
combat 28–30), and an event's hour cannot be spent on sunflowers.

Three things are wrong with consumables today, and they are one thing — nobody plans them:

1. **The price is a fiction on both sides.** The core prices a potion at "what making another takes" in the
   field by the fighter itself, with no tool, at the surest node (`src/plan/xp.ts`, `fieldSec`, `potionSec`,
   `potionPriceOf`), and plans a potion only while the pool holds one. In play a fight item brews by itself
   only when the potion has no supply anywhere **and** the fighter's own alchemy meets the recipe
   (`src/state/exec.ts`, `provisionPotions`, `brewKeep`); the fighters stand at alchemy 16–19 and the minor
   health potion is a level-20 recipe, so for them nobody brews at all. The forward model bridges the gap with
   a shortcut: a brewed stack is drunk down to one unit and the rest is taken from the ingredients as if
   somebody had brewed them (`src/plan/planner/forward.ts`, `drinksOf`). Rows A and B of every replay since
   report 012 lean on it.
2. **Food is not in the plan.** A kill's healing is priced as rest (`src/plan/bis.ts`, `killSeconds`) times
   `KILL_LOG` 0.88, "below 1 because most steps eat". In play a fight item feeds itself: bank, else cook, else
   gather and cook (`provisionFood`, `src/plan/consumables.ts` `foodPlan`, `gatherPays`), inside the fight
   item, by the fighter, whatever its step is for. Report 012: healing with food costs 19–33 s a fight against
   the 33–64 s of rest the price assumes; food is 9–21% of a fighter's time.
3. **Nobody decides who drinks first.** Row A of report 012 spent 35% of all hours on a road that fits no
   deadline, nine tenths of it potion making, drinking the stock the combat road wanted and stock that supply
   had banked for an open parent. The executor takes a potion stack whole and banks most of it at the next
   reset.

This task makes a fight's consumables its materials: needed by the rule gear is needed by, made through the
bank by whoever is placed best, reserved for the fights they were made for, and taken at the step's reset. It
also says, with numbers, what the potion wall is made of and which lever moves it.

Read first: `CLAUDE.md`; `docs/rework.md` (decisions 27–34; "Known and parked", the blocks of reports 010–013);
reports 012 and 013 (all of both); `docs/design/planner.md` A.3, B.3, C.1, C.4, D.1; the game's docs on
consumables, the `use` action and rest in `docs/`; `src/plan/xp.ts`, `src/plan/bis.ts`, `src/plan/consumables.ts`,
`src/plan/jobgear.ts`, `src/sim/cost.ts`, `src/sim/validate.ts`; `src/state/exec.ts` and `src/state/queue.ts`
(the fight item, the gear swap, `provisionFood`, `provisionPotions`, `produceOnce`, `brewKeep`, `foodKeep`, what
pauses an item); `src/state/planner.ts`, `src/state/eventorders.ts`; `src/plan/planner/*` (all of it; `gear.ts`,
`supply.ts`, `stock.ts`, `reach.ts`, `cost.ts`, `decide.ts`, `compile.ts`, `forward.ts`, `events.ts` closely);
`scripts/check-planner.mts`, `scripts/harness/*`, the scenarios `event-fleet-monster` and every `planner-*` one.

## Rules for this task
- **Only `G:\alex\projects\artifactsmmo\` is changed.** Scratch files go to `D:\Temp` or your session scratch
  directory; delete them at the end.
- **The real service is running with all five characters on the planner and stays undisturbed.** Don't start,
  stop or restart a service; don't call the local one; don't run `npm start`, `npm run dev`, `npm run build`,
  `npm run atlas`, `npm run assets` or the fetch scripts. Nothing opens `.ammo/*` or `game.db`; nothing writes to
  `logs/dev.log`. **Reading `logs/dev.log` is part of the task** (section 1): read it as a stream, don't copy it
  into the project.
- **The service runs the engine from `src/`, so a restart loads the working tree.** Alex restarts only when the
  report exists. Write the report last, after the gate is green and the task commit is made; don't wait for more
  log after that. If the log shows a restart during your work, say in the Summary what code it loaded.
- **No request to the game.** Don't read `.env`.
- **Dependencies:** none new.
- **What may change:** `src/plan/planner/*` (a new `consumables.ts` there if it helps); `src/plan/xp.ts` (the
  potion's price); `src/plan/bis.ts` only for the healing term of `killSeconds`; `src/plan/consumables.ts`;
  `src/plan/jobgear.ts` only for the quantity a utility slot takes and for what an owned character's solve may
  count as a potion; `src/plan/queue.ts` only for an optional field on the fight item (settled point 4);
  `src/state/exec.ts` and `src/state/queue.ts` only for settled points 1, 4 and 5 — an owned character's fight
  item, nothing a character the planner does not own does may change; `src/state/planner.ts` only for `worldOf`
  (settled point 9), the log lines and what calls the new functions; `src/state/eventorders.ts` only for the
  trip of settled point 7; `scripts/check-planner.mts`; new scenarios with what the harness needs for them;
  `CLAUDE.md` (the planner's section, the gear-model and food paragraphs). **Not** `src/sim/*` (a healing time
  that belongs there is added in `src/plan/`), not the UI, not the hive. No new queue item kind.
- The core still does not import `src/plan/hive/*`, `src/plan/roadmap.ts` or anything of `src/state/`.
- One task only. Don't fix other things you notice; list them under "Notes". Don't write the next task.
- Everything you write is in **English**.
- For every claim about the code give `path:line`; for every claim about the log give the UTC time of a line.
- **No random numbers in the replay, no fitted factor per monster, potion or food.** A number that is measured
  is one number for its whole kind, with the samples printed.
- The executor has a history of bank livelocks (the comments of `brewKeep`, `foodKeep`, `gearSwapStep`). Every
  change to what a reset withdraws or keeps gets a scenario that runs the step twice in a row and shows no
  bounce.
- Gate: `npm run typecheck`, `npm run check`, `npm run check -- planner`, and a production build into a scratch
  folder: `npx vite build --outDir <temp dir>/ammo-014-dist --emptyOutDir` (never the project's `dist/`).
- Commits, no push:
  1. `docs/rework.md` was changed by the planning chat and is uncommitted. Commit it first, as it is, on its own:
     `Rework notes`. If it changed again by the end, commit it again the same way before the task commit.
  2. At the end, `014: consumables`: this task file, the report and what the task changed.

## What is settled
1. **Consumables have one writer for a character the planner owns: the plan.** Its fight items never brew,
   cook or gather an ingredient (`provisionPotions`, the cook and gather tiers of `provisionFood`, a brewable
   potion as a candidate of the executor's solve). They fight with what the step took from the bank. A
   character the planner does not own keeps every one of today's behaviours, untouched.
2. **A fight's consumables are its materials, needed by the rule gear is needed by.** For a run of fights —
   gear by need's works: a fighter's road to its next combat gate, an open kill objective as the fleet's work,
   the hunt of an open parent's `src:` leaf — a potion or a food is needed when "make them, then fight with
   them" takes at most `NEED_RATIO` of the hours of fighting with what the pool holds now (∞ when that is no
   safe win). The candidates: every utility potion and every healing food with a recipe (the foods of
   `consumables.ts healingFoods`, with its feedstock and gear-material rules). What a kill drinks is the
   forecast's `used` of the set solved with the potion in the pool; what it eats is the HP missing at its end.
   A recipe nobody meets yet is a need all the same: its level is a candidate of the lane's role holders
   through `gateRoad`, as a gated craft of any chain is.
3. **Made through the bank, for a horizon, by whoever is placed best.** A need is a parent of supply like a
   gear piece: `mat:<potion>` or `mat:<food>` by whoever may craft it (`mayCraft`: a potion by anyone at the
   level, a food by the cook), `src:<ingredient>` by whoever reaches it, each a candidate with the score of the
   work the fights are for — the same number on every link. **The demand is what the next two chunks of that
   work drink and eat for each character on it, plus a fifth, less the stock and what is in flight**: the bank
   is a buffer, nothing is brewed for kills a month away. Stock is shared from the best-scoring parent down
   (`supplyNeeds`), so a road that fits no deadline takes nothing a fitting work is short of.
4. **A fight step takes what it planned, and is as long as that covers.** A kill step that is planned with
   consumables carries them in `withdraw` (its reservation, `stock.ts`): the expected potions and food of its
   kills plus a fifth. Its kills are the chunk or what the reservable stock covers, whichever is less; with
   nothing covered that set is no candidate, and a set that wins without them stays one at its own price. The
   compiled fight item carries the quantities (an optional field, no new item kind); the step's reset puts
   exactly those potions into the utility slots and that food into the bag — not the stack — and the next
   reset banks what is left.
5. **Running dry is the end of the step, not a failure.** An owned character's fight item whose potions or food
   are gone and whose fresh forecast is no longer a win ends there: the step is sampled with the kills it did,
   nothing is blocked, and the next decision plans what the stock covers. With food gone it rests.
6. **One price, the chain's.** Everywhere a kill is priced (the solver's objective, the planner's unit costs,
   the level roads, gear by need) a potion or a unit of food costs what one more costs the fleet: nothing for
   what the stock the character may plan with covers, else its bill (`billOf`) by the best-placed maker with
   its tools — not the fighter's own field seconds. **Healing is priced as what it is**: eating when food is
   in the plan (the `use` action's seconds, by the docs and the log), rest by the docs otherwise.
   `KILL_LOG` is measured again for that reading, as one number, with its samples; `gatherPays` and the
   5 HP/s reading leave the owned characters' path.
7. **An event's fights are stocked for one spawn.** An event with open demand that can still pay is a work
   like the others for the characters that are its members today: the potions and food of one spawn's fights
   (usable seconds ÷ the kill's seconds, per member) are a need, and that stock is a reserve no other bill
   takes (the kind of thing `stock.ts floor` is). `eventMembers` solves on the pool with it; the trip's reset
   takes what the hour drinks (settled point 4's field on the trip's fight item); nothing is brewed on a trip.
8. **The forward model brews, cooks, drinks and eats through the bank.** `drinksOf`'s two shortcuts go (the
   one-unit stack, the ingredients drunk as if brewed): a step's consumables leave the bank with its
   `withdraw`, and they are there because a `mat:` step put them there. A config number `consumables` (1; 0 =
   report 013's model whole — its prices, its `KILL_LOG`, its `drinksOf` — for the replay's anchor row only;
   default 1, not in the UI, never written as a patch), with the rules of `potionK`.
9. **Riding along: what lies in a bag is stock on its way.** Every step starts with a bank reset, so what a
   character holds beyond its own step's inputs is in the bank within one step. The bills count it as stock
   (what is short is not gathered a second time); what a craft can withdraw now (`feedable`, a step's
   `withdraw`) stays the bank's. Evidence: at 02:19:24 UTC on 11-20 Fourth planned 210 more gathers for a
   diamond stone 34 minutes after the last one lay in Third's bag (report 013). In the runtime's World
   (`worldOf`); the forward model banks at a step's end already.
10. **Not in this task:** buying a potion, a food or an ingredient for gold, tasks coins or gems (section 2
    prints what could be bought; nothing is); keys, tolls and what is spent (the next task); the merchants;
    group fights; a `mat:` step that gathers its own inputs; a made piece in every fighter's pool; a drop
    objective chunked in actions; a restart repeating one action; `initiative`; work (c); `SPAWN_LOG` (section 1
    prints the new ratio, the constant stays unless the ratio left 1.3–2.0).

## 1. Read-only: the hours since 08:06 UTC, the events, and where the time goes
From `2026-11-20T08:06:13Z` (where report 013 stopped) to the end of `logs/dev.log`; name every restart inside
(run id, time, what re-attached; `[wj59]`, between 09:44 and 09:54 UTC, is report 013's code). The same reader
and caps as report 013; **nothing found here is fixed in this task** except what the settled points name.
- Per character, the steps in order (time, key, answer, units planned and done, hours planned and taken; a
  `supply` step's parent), and every sample against its estimate — report 012's kill and craft prices have
  their first samples here. Achievements completed, with the time.
- Every `blocked`, `flapping`, `no step`, `defect`, `queue found stopped`, `interrupt removed`, every lost fight:
  a defect, or as designed.
- **Report 013's acceptance step 7**: the `api GET /events/active` lines' spacing after the restart; every
  `plan: event` line, word for word, with what the fleet stood at; any `interrupt event` and how its trip went
  (the reset, the work, the end, what the step under it resumed in). Every spawn since 08:06 with the table of
  report 013, and the whole log's spawn count against the docs' expectation: the ratio now, beside 1.64.
- **Where the time goes**, per character, over the whole window, as report 010 had it: fighting, resting,
  eating, the bank, walking, gathering and crafting for the step, and — named apart — every second a fight
  item spent making its own consumables (the `restock`, `craft`, `withdraw` and `gather` notes of
  `provisionFood` and `provisionPotions`, with the item they ran inside). Fights that ate against fights that
  rested; potions drunk a fight where any were; what `validate.ts` recorded for potion fights (turns, potions,
  who struck first), if there were any.
- Third's `lvl:alchemy:20` (the step running at 09:54 UTC stood at fight 460 of 503 against green slimes at
  +0 XP): what the level cost in hours against its estimate, and what the hunt was for.
- In at most six lines: what the log says about consumables that the model below must not get wrong.

## 2. What consumables cost today, and which lever moves the wall
Printed by `scripts/check-planner.mts` on the fleet at the log's latest levels and on the same fleet a week on
(report 013's "combat 28, role holders at 30"); no code of the engine changes in this section.
- **Every utility potion and every healing food with a recipe**: the level, the ingredients and each one's
  source (node or monster, its skill and level, the drop rate), who may craft it today and who gathers each
  ingredient today; then the seconds one unit costs (a) by today's price (`potionSec`, and for a food what
  `gatherPays` reads), (b) through the chain by the best-placed maker with its tools, the stock ignored, (c)
  with the stock the bank holds now. For a potion the HP it restores a second of making; for a food the HP it
  heals a second of making and eating, beside rest's HP a second at 500 and at 700 max HP.
- **Every fighter on its road**: at its level now, at 28, 30, 33, 35 and 40 with the pool it has — the XP
  monster `pickMonster` gives it, the set, the potions a kill drinks by code, the HP missing at its end, and
  the kill's seconds split into the fight, the healing and the potions, under (a), (b) and (c). The same for
  the event monsters of report 013 (lizard, demon, vampire, corrupted ogre and owlbear, cultist emperor) at
  the level each is first won.
- **The levers, each as hours a combat level from 28 to 40 for one fighter**: a potion of a higher tier; the
  alchemist's tools and level on the ingredients; an ingredient that is another work's by-product (algae from
  the fishing objectives, a drop of the road's own monster); food in place of rest; a gear piece in place of
  the potion (what gear by need already asks for when potions cost the chain's price); a second and a third
  character that holds the alchemy role. One line each: what it saves and what it needs first.
- **What gold would buy**: every NPC that sells a potion, a food or one of their ingredients, with the price and
  the currency, and what a day of the fleet's fights at 30 would cost there. A print for the next task;
  nothing is bought.
- In at most eight lines: **what is the potion wall made of, and which lever moves it most?**

## 3. Consumables by need, through the bank
- **The need** (settled point 2): where it lives beside `gear.ts`'s (one function for both if that is the
  smaller change), what a work's `H0`, `H1` and the making hours are for a consumable, and the parent it
  becomes (settled point 3): its demand, its horizon, its score. The why of every supply step it causes names
  the work, the character and the kills it is for ("Minor Health Potion ×84 for Second's road to combat 30
  (wolves, 2 chunks) …").
- **The fight step** (settled point 4): where the kills are capped by the reservable stock, what `withdraw`
  holds, the step's why ("… 70 now with 84 Minor Health Potion and 16 Cooked Trout from the bank"), and what
  the others' pools and bills see while it runs.
- **The price** (settled point 6): the one function, every caller with `path:line` (the solver's objective, the
  executor's solves, `actionSec`, `fleetSec`, `roadRate`, gear by need), and what became of `potionSec`,
  `potionPriceOf`, `COVER_RUNS` and `gatherPays` — each kept for whom, or gone. The healing term of
  `killSeconds`: the `use` action's seconds with the docs' words and the log's samples. `KILL_LOG`: the samples
  and the new number.
- **The event reserve** (settled point 7): where the need is made, where the reserve is held out of the other
  bills, and what `eventMembers` and `tripOf` do with it.
- **Bag stock** (settled point 9): the change in `worldOf` and in what the bills read, with the diamond case
  replayed as a made-up case: the stone in a bag, no further gather planned, the craft waits for the bank.
- Made-up cases in `scripts/check-planner.mts`: a fighter with no safe win without a potion — the potion is
  needed, its `mat:` and `src:` candidates carry the road's score, the fight is no candidate until the stock
  covers it and is one for exactly the covered kills afterwards; a recipe above every alchemist's level — the
  level is the role holder's candidate with the road's score; two works short of the same potion — the better
  score is served first, a work that fits no deadline last; a potion that saves less than `NEED_RATIO` asks for
  — no need; food from a by-product in the bank — needed and cooked by the cook, and never from an open
  parent's own material; no cook at the level — the fights rest and say so; the horizon — demand stops at two
  chunks; the event reserve — another work's bill does not take it.

## 4. The executor
For a character the planner owns only (settled points 1, 4 and 5); say for each change how a non-owned
character's path is told apart (by the item, not by a new global), with `path:line`.
- The fight item's field and what `itemsOf` (`compile.ts`) and `tripOf` put into it; what the reset and the
  gear swap do with it (the quantity a utility slot takes, the food taken into the bag, what `keep` protects
  while the item runs, what the next reset banks).
- What an owned fight item no longer does (the three provisioning paths), and what it does when the food is
  gone (rest) or the potions are (settled point 5): the item's end, the step's sample, no `blocked` line.
- **Scenarios**: `consumables-fight-takes` (a fight step with 40 potions and 10 food planned of a bank that
  holds 100 and 60: the reset takes 40 and 10, the fights drink and eat, the next step's reset banks the rest;
  run twice in a row, no bounce); `consumables-no-field-brew` (an owned fighter at the recipe's level, the bank
  empty of the potion: no gather, no brew inside the fight item — the planner's supply steps make them, then the
  fight step runs); `consumables-run-dry` (the potions end at kill 30 of 50: the item ends, 30 units sampled,
  nothing blocked, the next decision is made); `consumables-supply-chain` (two characters: one gathers and
  brews, the other's road waits on other work and then fights with the stock, each step's why naming the
  work); `consumables-not-owned` (a character the planner does not own brews and cooks as today);
  `consumables-event-trip` (a member takes its potions at the trip's reset and resumes its step in its own
  set; with the reserve empty and no win without it, it is no member). Say what the fake and the harness had
  to learn.

## 5. The forward model, and the replay
- **The model** (settled point 8), in `forward.ts`: where a step's consumables leave the bank, what `drinksOf`
  is now, how a `mat:` step's potions and food arrive, and what `consumables: 0` switches back. Invariants stay
  green on every decision; add two: no step drinks or eats what the bank did not hold when it started; no
  potion or food is made beyond its parent's horizon.
- Rows: **A** the default; **B** consumables free (every potion and food a fight wants is in the bank: the
  ceiling); **C** `consumables: 0` — report 013's row A, and it must still end at 77: if it does not, say which
  other change of this task moved it; **D** a win is enough; **E** no events; **F** all five hold the alchemy
  role (gathering and its level roads): what self-supply by the fighters would be worth.
- Per row, as report 013: the points on days 7, 14, 30, 60 and at the deadline; the day each fighter reaches
  combat 25 / 30 / 35 / 40; a gathering role at 35 and at 40, alchemy and cooking named; the hours by answer,
  with **the consumable hours as their own lines** (ingredients gathered or hunted, brewing, cooking) and the
  event hours; gear made in eight days and to the deadline; the open points by what they wait for.
- For row A: per potion and per food — made, drunk or eaten, by whom made and for which works, the stock at the
  deadline; the share of all fight hours that is consumable making (it was 87%); per fighter the hours its
  road waited for stock while it did other work, and what that work was; every work that was refused stock
  for a better one.
- **What the round paid**: A against C on days 7, 14, 30 and 60 and at the deadline. If A is below C on any of
  them, name what took the hours.
- In at most ten lines: **who brews and cooks for whom, what does a combat level between 28 and 40 cost now,
  and what is the next wall?** Say what rows B and F leave on the table, and whether the fighters' combat 40
  comes early enough for the layers behind tolls and keys to pay this season (report 013: 73 points).

## Out of scope
Everything of settled point 10; any purchase; `src/sim/*`; the Roadmap, the outlook's layout and every UI;
deleting anything of the hive or of a non-owned character's provisioning; regenerating the atlas; a comparison
of an event with the step it interrupts; everything parked in `docs/rework.md`.

## Acceptance (Alex checks)
1. `git log --oneline -2` → `014: consumables` on top of `Rework notes`; `git status` clean.
2. `npm run check` → the 60 checks of report 013 plus the new scenarios, all ok except `repeat-spin`; exit 0.
3. `npm run check -- planner` → ends with `OK (… invariant checks, … made-up cases; deadline points a / b / c / d / e / f)`
   for the rows A default / B consumables free / C report 013's model / D a win is enough / E no events / F
   alchemy for all, with C at 77, and prints the tables of sections 2, 3 and 5.
4. `npm run typecheck` passes; the scratch build succeeded.
5. `git grep -nE "from \"(\.\./)+(hive|roadmap|state)[/\"]" -- src/plan/planner` → nothing.
6. `git show --stat HEAD` → only files the rules allow. Anything else is explained in the report.
7. **After the restart** (the planning chat says when): a fight step's `plan` line names the potions and the
   food it takes; its reset withdraws those quantities; no `gather` or `craft` note for a consumable appears
   inside an owned character's fight item; `mat:` and `src:` steps for potions, food and their ingredients name
   the work they are for; a fight item that runs dry ends without a `blocked` line.

## Report
`tasks/014-consumables.report.md`, with these sections in this order:
- **Summary** — 4–8 lines: where the fleet's time went since 08:06 UTC; the six deadline numbers against
  report 013's 77 / 85 / 63 / 86 / 63; then the answers of section 2's and section 5's last points.
- **Decisions for Alex** — numbered, only what is his (what the game is played for, what is spent, what is
  deleted for good). "None" if empty.
- **How Alex verifies** — numbered steps with the expected result; mark the ones you could not check yourself.
- **The hours and the events** — section 1.
- **What consumables cost** — section 2.
- **By need, through the bank** — section 3.
- **The executor** — section 4.
- **The replay** — section 5.
- **What was done / files** — per section 3–5: what, where (`path:line`); every command run.
- **Notes** — defects noticed and not touched; guesses in the numbers, most doubtful first.
- **To delete (Alex)** — or "Nothing".
