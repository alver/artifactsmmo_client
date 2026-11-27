# 032b — The slime shield: a boss is a source of its drops, the market the other one

Read first: `tasks/032-market.md` and its report (what B built, its rules 1–5, C.1's table), `CLAUDE.md` (the market's
paragraphs as 032 left them; "Bosses keep their `group` gate"; the fight verdict and its floor), `src/plan/planner/
supply.ts`, `targets.ts`, `gear.ts` (`candidatesOf`, `billOf`, `PER_SLOT`), `reach.ts`.

## Where this starts
On top of `032: the market`, the top of `origin/rework`. If 032 stopped, or its commit is not there, say so and stop.
The working tree holds at most two changes from the planning chat (`docs/rework.md`, this file — 032's commit may
already hold an earlier text of this file; this one stands); anything else uncommitted: say so and stop. The live
service runs `fd3a9cb` (run `szqp`, since 11:50:00 UTC on 11-27): 032 is not restarted on yet.

**What is.**
- **The accounts around this one wear a slime shield.** The board's 10:00 UTC read of 11-27, three accounts at 39–46
  points (this one: 42): a `slime_shield` (20) on 13 of 15 characters — all of Everywon's and Zetark's, three of
  sqidking's. First and Fifth wear an `iron_shield` (10). All three hold `the_reaper`; here it stands at 40 / 250 Death
  Knights and the kill is blocked ("forecast 0% / 22% at the gate, below the floor 75%"). Everywon took it on 11-27 with
  characters at combat 32–33 wearing a gold_sword (30), a slime_shield, steel armour.
- **Only one material is missing.** `slime_shield`: gearcrafting 20 (Third: 30) — 6 hardwood planks (bank 87), 3 cloth
  (bank 1; the tailor sells it for wool), 6 `king_slimeball` (bank 0). `dreadful_amulet` (2) and `steel_legs_armor` (3)
  ask the same material.
- **The fleet has killed its boss.** `slimed_to_none` (kill the King Slime once) was completed at 00:28 UTC on 11-26 (the
  journal's `ach` record; `kill:king_slime` is a target the plan holds); its reward's 3 king slimeballs were claimed, and none is in the bank now. The King Slime
  (`monsters.json`): a boss, level 15, 1,000 HP, 14 attack of each element, 20% resistance to each, a 100-HP barrier at
  the start and every 5 turns; it drops 1–2 king slimeballs one kill in 12 — 48 kills a shield on average, no XP for a
  character past 25. Fourth at combat 24 is not admitted (blocked on 11-26, "forecast 0%").
- **The planner kills it for the achievement only**: as the source of a drop a boss is left out, so a piece that asks
  the king slimeball is no need. The 07:55 UTC market read of 11-27: 69 king slimeballs on sale, the lowest ask 274.

**Alex (2026-11-27):** would it not be better to go and kill the boss ourselves? And: the whole season's road is not
what counts now — what the fleet needs at 30–35, fast, and the other players' path as the guide. So this task asks for
no road past 3 days and no replay to the deadline.

## A. A boss is a source of its drops
1. **Alone, at the floor.** A boss a character that is on is admitted against alone (today's verdict: the rolled win
   rate at the floor, the expected seconds a win) is a source of its drops like any monster: its `src:` leaf is a kill
   step by today's rules for a need's kill (a worker where one is admitted, else a fighter), with today's food and rest.
   A boss nobody is admitted against alone stays out, as today; no group fight is planned by this task.
2. **The piece.** A gear piece whose bill asks such a drop is a candidate as any other (`candidatesOf`, inside
   `PER_SLOT`'s caps) and a need by today's rules — the fight solve prefers it on the fighter's XP pick, or it admits a
   blocked kill of an open objective.
3. **The forward model** kills the boss the same way (its drop by the catalog's rate).

## B. The market beside it
1. **With a source of ours**, 032's rules stand as they are: rule 2 compares the gold with the hours the kills take, and
   the cheaper way is taken (the why names both).
2. **With no source of ours** (nobody is admitted alone, and no event is its writer) the material is bought under
   032's rules 3 (the fair price), 4 (the purse) and 5 (the counter) while it stands in `world.market`; rule 2 has no
   chain to compare with and the why says "no source of ours". Refused, or not on sale: the piece is no need and no
   leaf waits — its would-be wearer's why says the market's answer once.
If A or B needs a change in the fight solve itself (not in its pool or in what counts as a source), say so and stop.

## C. Read-only, into the report: the neighbours' kit against today's plan
The pieces the three accounts' fighters wear at 30–41: `gold_sword`, `elderwood_staff`, `perfect_bow`,
`obsidian_battleaxe` (30); `slime_shield` (20); `steel_armor`, `steel_legs_armor`, `steel_boots` (20); `gold_helm`,
`gold_platelegs`, `gold_boots`, `obsidian_armor`, `obsidian_helmet`, `obsidian_legs_armor`, `royal_skeleton_armor`,
`royal_skeleton_pants`, `royal_skeleton_helmet`, `lizard_boots` (30); `topaz_amulet` (25), `dreadful_amulet` (20);
`gold_ring`, `royal_skeleton_ring` (30). On the newest live World and market read, one table, a row a piece: is it a
candidate and a need for First or Fifth today, and if not, the rule that stops it · what it changes on the wearer's XP
pick (seconds a win) · what its bill is short of and the hours that takes · its ask and reference if it or its missing
material is on sale. Then, in at most five lines each:
1. The King Slime today: who is admitted alone, the seconds a win, the hours 6 and 12 king slimeballs take, against
   their gold on the market — and which way B.1 takes.
2. The cheapest set of the pieces above with which First or Fifth is admitted against the Death Knight at the floor at
   combat 31, 33 and 35, and what of it the plan does today.
3. The other bosses of `around_the_world` (5 points; the King Slime's part is done): who of ours is admitted alone
   against the Lich, the Goblin Priestess, Rosenblood, the Duskworm and the Sandwhisper Empress today, or the level and
   set at which the verdict first admits one.

## D. Proof
1. Checks, red first on the starting tree:
   - a fighter admitted against the King Slime, a fighter whose solve prefers the slime shield → the shield is a need,
     `src:king_slimeball` a kill step, the planks and cloth by today's rules, Third's craft, the next fight step wears it;
   - the same with king slimeballs on sale at a fair ask for less than half the kills' hours → bought; for more → killed;
   - nobody admitted alone, on sale at a fair ask → bought under B.2; the ask above 1.25 × the reference, or no sell
     order → no need, no leaf, the why says it;
   - a boss nobody is admitted against, no market → the decisions of the starting tree.
2. The first 3 days of the newest road (029's driver) against the starting tree: what moved, in at most five lines
   (the day the first slime shield is worn among them). `npm run check -- planner` is not run.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory. `decide`'s seconds on the newest
   live World, before and after (the solves A adds), into the report.
4. `CLAUDE.md`: the bosses' line and the market's paragraph follow. Commit `docs/rework.md` as `Rework notes` if it
   differs from `HEAD`, then everything else (this file with it) as `032b: a boss is a source`; push to
   `origin/rework`. If the push fails, say so.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start, stop
  or restart, no build into `dist/`; no request to the game but public reads of `/grandexchange/orders` (one) and
  `/grandexchange/history/{code}` (at most 30) for C; nothing is bought by this task; nothing you run writes under `logs/`.
- No new dependencies, no new constants. Do not edit `docs/rework.md`.
- Everything you write is in English.

## Report
`tasks/032b-market-no-source.report.md`, **at most about 70 lines**: Summary · Decisions for Alex · How Alex verifies · C
(the table, C.1–C.3) · What was done / files · Notes. Say first in the Summary: what is committed; whether the slime
shield is a need for First and Fifth on today's World and which way its king slimeballs come (killed or bought, the
hours and the gold of each); C.2's lines on the Death Knight; the gate's lines. No placeholders left in it.
