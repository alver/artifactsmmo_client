# 028 — One page: report

## Summary
- **One page.** The Roadmap is the only view of the fleet now. Top to bottom: the season strip, five hero cards, the plan in
  levels with who supplies whom, Blocked, then two folds (the achievements with their knobs and priorities; the fleet's
  skills). The Fleet and Character tabs are gone; an old `#/fleet` or `#/char` opens the page.
- **No manual play.** Nothing in the tab makes a character act. `act`, `move`, `loadOfferings`, `queuePrepare` and
  `queueOfferings` are no longer exposed; the `prepare` item is deleted. Left: 🧭 a hero, the knobs, the floor, the two ↻,
  Refresh, Sign out.
- **The data (A).** `Step.reason` gives the why in parts. The road's lines carry levels, the gear made, pick changes and
  crafters. The outlook has a new `needs` line, and a synced `last24` signal reads the journal.
- **The planner is unchanged.** All 84 whys on three fixture Worlds match 027g's byte for byte (`check-onepage`).
  `npm run check -- planner`: `OK (646022 invariant checks, 97 made-up cases; deadline points 102 / 120 / 87 / 89 / 84)`,
  027g's line to the letter, in 2,428.5 s (beside the plain run and the mock service).
- **The gate.** `npm run typecheck` passes. `npm run check`: 111/111 in 313.8 s (beside the replay). The build into
  `D:\Temp\ammo-028-build` passes (371.92 kB).
- **Seen** on a mock-API service: a scratch copy on port 5199, zero game calls, the live service untouched.

## Decisions for Alex
1. **Group fights by hand are gone.** The Group fight fold and its `prepare` item went with the manual play. Nothing plans a boss
   fight yet (`group` is an interrupt class with no writer), so bosses wait for the group-fight round.
2. **"Instead of" ranks by today's scoring.** It shows the role's three best other candidates (fit, then points per hour), not
   in the role's order of rules: a fighter's card can show a level candidate above the forging step that took it. Option: list
   them in the order of rules.
3. **A hero switched off stands still.** It has no buttons left, so 🧭 off means idle until it is switched on again.
4. **The 24 hours count a step whole, at its end.** A step begun 25 h ago counts in full; one still running counts nothing yet.
   The window moves with each record (no timer).
5. **A need's "materials short"** is its bill on the bank, shared from the best parent down (`supplyNeeds`' order). The others'
   running steps are not subtracted; the "Now" column names them.

## How Alex verifies (after the restart)
- **Season.** As before, plus: the fighters' and gear crafts' levels now → at the road's end ("no road with levels yet" until
  this commit's first run ends); bank slots, gold and the next expansion's price; the service's run, commit and start; the live
  events, each with the planner's verdict.
- **A hero card.**
  - Head: role, 🧭, combat and lane bars, HP, where, task, bag; the worn icons show the item card on hover.
  - **Now**: the head item's text and its pill.
  - **Why**: the role's numbered order with ◀ on the rule that took the step; goal, for, why, limits; "instead of" folded.
  - **Next**: three outlook steps (the why on hover).
  - **The last 24 h**: a bar (hover a segment), XP an hour, levels, wins and losses, the last 8 steps (folded). Only steps
    decided after the restart show their text and answer; older ones show their target.
- **The plan.** One line per fighter and per gear craft; squares mark pieces made, diamonds pick changes; hover a mark or a
  day's column. Below: the day table, then Who supplies whom (unworked rows first; a red craft level is a crafter short of it).
- **Map.** A drawer has no button. Bank, Items and Monsters never had any.
- **Seen on the mock service** (the 11-25 fixture, the real journal, the outlook at 4 days in the copy):
  - no page error; every tab renders; `#/fleet` and `#/char` open the page;
  - five cards in a row at 1,600 px (a 1,300 px page), four at 1,280 px; nothing past the edge at either width;
  - the rule marked; real 24-hour bars (First: fight 6.8 h, rest 12 h, 1,785 combat XP an hour);
  - the chart's five lines and marks; the tools' needs: "4 Ogre Eye · ⚔ kill by …", Fifth on them now, made on 11-27/28.
- **Only Alex's eyes:** the cards on live steps (the mock refuses every action, so steps end at once), and a 21-day chart.

## The data (A)
- **A.1 `Step.reason`** (`types.ts Reason`; built in `decide.ts rank`):
  - `role`; `rule` from `ORDER` (first, forging, need-kill, xp-pick, free / need, short, craft-ahead, today, fallback / tidy);
  - `goal`, `for`, `because`; `limits` (`fightTake`'s note in clauses, the toll, the task visit);
  - `next`: `decide` holds every candidate where it makes the step, so the next ones are all there.

  The why is untouched: `scripts/whys.mts` recorded `scripts/fixtures/whys-027g.json` on c03bff4 (12 h of the 11-25 road, the
  11-24 decisions, 11-21 with the fighters unarmed), and the check replays it. It also tests each rule against its why's head,
  the XP pick (`combat 25 → 50`, the rate, "wins N% …"), a worker's need, craft ahead (`weaponcrafting 20 → 30`), the limits.
- **A.2 the road.** `day.levels` and `done.byDay[].levels`: per character combat and the eight skills (`LEVEL_KEYS`); `done`
  adds `start`, `made` (at, code, n, for, by), `picks`, `crafters`. A midnight passes at a step's end, so the points by day are
  unchanged. Two cold runs in two processes give the same lines (12 h from 11-24 20:00 Z: one day line, Piggy Pants made).
- **A.3 `needs`** (`needs.ts needsOf`, after `waiting`; on a throw `needs: []` with `error`): gear work (a), the tools (c), the
  road's consumables. Check: the 11-25 World with Second at weaponcrafting 15 shows "weaponcrafting 15 of 20 (Second)" on the
  tools, and the Steel Axe's 4 Ogre Eyes by kill.
- **A.4 `last24`** (`state/last24.ts`): `journal.ts onRecord` + `journalDay` (`Disk.read`), `hydrateLast24()` in `main.ts` after
  the sinks; the step record gains `text` (`road.ts stepText`). Check on made-up records: the seconds add up (eat → eating;
  trade, task, other → other), XP an hour, levels, wins and losses, the text; a 25-h-old record is out; a restart gives the same.
- **`service`** (`store.ts`, synced): run, commit, branch, start, dev.

## The page as it is drawn (B)
- `RoadmapTab.tsx`: Season (`Levels`, bank, service, `Events`), `Heroes`, `Plan`, `Blocked`, a `Fold` with `Road`,
  `OpenAchievements` and `Priorities`, a `Fold` with `SkillGrid`.
- `HeroCard.tsx`: Head, Wears, Now, Why, Next, Day. `PlanChart.tsx`: the SVG, its legend, the day table, the needs table.
- Colours: the dataviz skill's dark categorical order, validated on `--panel`; wait and other are gray. `.heroes`: `auto-fit
  minmax(220px)`. New CSS only for the new classes.

## What was deleted (C)
- the Fleet tab (`ui/FleetView.tsx`): Needs you, the Characters table, the 🛐 and ⚔ folds; its events, skills grid, `Fold` and
  avatar moved to the page
- the Character tab (`ui/CharacterPanel.tsx`): switcher, summary, queue, forecast, equipment, skills, and the inventory with
  Equip, Use, Deposit, Recycle, Delete
- `ui/QueuePanel.tsx` (`PlannerSwitch` moved to `HeroCard`, `monsterList` to the Sim tab), `ui/useAction.ts`
- `ui/ActionBar.tsx` (the action bar, 🚶 Walk), `ui/GearSlots.tsx` (unequip), `ui/CombatForecast.tsx`
- `ui/GroupFight.tsx` (🛡 Prepare, ⚔ Fight); `ui/OfferingsPanel.tsx` (＋ Queue, ＋ Queue for all, the altar's accept and complete)
- the walk mode: `moveMode` and its effect, `MapPickOverlay`, click-to-move with its Escape and hint
- the Map drawer's buttons: 🚶 Send, gold in and out, Buy expansion, Withdraw, Craft, Recycle, Buy, Sell, and the tasks
  master's Accept, Complete, Cancel (`cancelTaskWithFee`), Exchange, Trade; `NumInput`
- "Claim with …" (the planner's `claim` interrupt claims after every completion it reads)
- `store.ts`: `offeringsOpen`, `groupFightOpen`; `openCharacter` now shows the hero's card
- `queue.ts`: `queuePrepare`, `queueOfferings`, the `setOwnedOfferings` hook (and its registration in `planner.ts`), the
  `prepare` item (now in `GONE_KINDS`; in `plan/queue.ts` its variant, text, icon)
- `api/actions.ts` and `offerings.ts`: the exposure of `act`, `move` and `loadOfferings`, and their tab path (`act` throws in a
  tab)
- CSS: 87 rules only the deleted UI used, and the spinner keyframes
- scenario `planner-takes-over`: the `queuePrepare` refusal

## What was done / files
- Core: `types.ts`, `decide.ts`, `road.ts`, `needs.ts`.
- Service: `lib/journal.ts`, `state/last24.ts`, `outlook.ts`, `synced.ts`, `store.ts`, `server/main.ts`, `planner.ts`.
- UI: `RoadmapTab.tsx`, `HeroCard.tsx`, `PlanChart.tsx`, `text.ts`, `CatalogPanel.tsx`, `PendingRewardsPanel.tsx`,
  `MapView.tsx`, `app.tsx`, `SimPlayground.tsx`, `styles.css`.
- Checks: `check-onepage.mts` (19 cases, 48.6 s), `whys.mts`, `fixtures/whys-027g.json`, the harness's `Disk.read`.
- Docs: `CLAUDE.md`, `docs/journal.md`, `.claude/skills/verify/SKILL.md` (the page's selectors, a mock run from a scratch copy).

## Notes
- `tasks/026b-board-reading.md` appeared untracked while I worked: not mine, left alone, not committed (nor 029).
- `actions.fight`'s `participants` parameter stays, unused. `needsOf` adds about 4 s to an outlook run.
- The mock run wrote only under `D:\Temp\ammo-028-run\` (its cwd, a scratch copy with `HORIZON_DAYS` 4 there only).
