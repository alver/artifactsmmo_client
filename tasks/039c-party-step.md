# 039c — The party's step

Read first: `tasks/039-party.report.md` (A's rules and what is unread), `tasks/039b-party-step.report.md` (the
party's pieces, C.2's numbers), `CLAUDE.md` ("A party", "The roles", the runner and its interrupts),
`docs/api/openapi.json` (`/my/{name}/action/fight`, `participants`).

## Where this starts
The top of `origin/rework`: 039b's commit `d412c0a`, or task 041's if it ran first — say which. The live service
runs `d412c0a` since 14:28:37 UTC on 11-28 (run `21vz`): Second is a fighter in play. The working tree may hold the
planning chats' files (`docs/rework.md`, `docs/season-plan.md`, `stage.json`, this file, `tasks/041-gold-in.md`).
Anything else uncommitted: say so and stop.

## What 039 and 039b settled
- Only a trio takes the lich; with Second at combat 30 and the party's pieces it passes (99–100%, 67 turns, a cycle
  of 184 s). The pieces are needs since 039b, and `stage.json` lists all of them in stage 1 since the chat's edit of
  11-28 (the lich's five and conjurer_skirt, gold_shield, gold_helm, greater_dreadful_amulet).
- **The lich is the best XP the three can have**: an hour there gives First 12,449 against 3,625 at its own pick,
  Fifth 13,783 against 5,134, Second 13,783 against 5,546. So the party will stay, and the 24 life crystal shards of
  life_lover (20 h at a roll a member, 61 h at one roll a win) come with the XP.
- **What is left is the step itself**: nothing decides with a party yet, the lich "waits for a group".

## A. The step
1. When the smallest party of fighters passes the floor against a boss a listed achievement asks, its kill is a step
   for that party. Each member wears the set the party's solver gives it, takes its food share (038) and a key where
   the tile asks one (one a character each entry), walks to the tile, and waits; when all stand there the leader
   fights with `participants`; every member's echo is taken (cooldown, HP, XP, gold, drops; a loss by today's rules
   for each); they eat or rest and go again.
2. A step is a chunk like any kill step's; at its end the members bank and the next decision is free.
3. While it runs a member is given nothing else. A member that cannot come (off, no key, not admitted any more), a
   lost fight, or a member that does not stand on the tile after a fight ends the step for all, with a block as a
   single fight's.
4. 035's guard, the stage and 038's food hold for a party as for one fighter.

## B. How long the party stays
1. The first kill of a boss a listed achievement asks is taken as soon as the party passes.
2. After it the boss is a candidate of each member's XP pick, at the party's XP a second for that member (the take
   and the rest counted as 038 counts them), with a listed achievement's bonus as a kill achievement has. **The party
   goes only while the boss is the pick of every member**; else each fights alone.

## C. The journal settles the unread rules
One `party` record a fight: the boss, the forecast (win rate, turns), the turns it took, and for each member its xp,
gold, drops, final HP, the cooldown and where it stands after. A line in `docs/journal.md`. From the first real
fights the planning chat reads: whether each member rolls the drops, what a member that falls in a won fight gets,
the forecast against the turns.

## Proof
1. Checks, red first, on the mock service: three runners in one party — the request carries `participants`, a key is
   spent a member an entry, each echo is handled; one member's loss ends the step for all; a member in a party is
   given no other step; after the first kill the party stays only while the boss is every member's pick; a `party`
   record a fight.
2. The newest live state on a zero-call service with `stage.json`: the first three steps of each of the five; which
   of the party's pieces are still missing and their hours; and the same state with Second at 30 and the pieces in
   the bank — the party's step as it is written into the three queues.
3. One road of two days from the live state: the three fighters' combat XP and levels a day, the hour the lich first
   falls, the shards a day at one roll a win, the crafts, the points.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
5. `CLAUDE.md` follows ("A party"). Commits, staged by path, pushed to `origin/rework`: `Rework notes`
   (`docs/rework.md`, `docs/season-plan.md`) if they differ from `HEAD`, then `039c: the party's step` (yours, this
   file). Another task's files are not yours: leave them.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/`.
- No new dependencies, no new constants. Do not edit `docs/rework.md`, `docs/season-plan.md` or `stage.json`.
- Everything you write is in English.

## Report
`tasks/039c-party-step.report.md`, **at most 40 lines**: Summary (Proof 2 and 3 first; what is committed; the gate's
line) · Decisions for Alex · How Alex verifies · Files.
