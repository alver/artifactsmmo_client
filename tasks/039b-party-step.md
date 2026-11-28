# 039b — The party's step, and Second as the third fighter

Read first: `tasks/039-party.report.md` (the table, A's rules and what is unread, D.1, D.2), `docs/season-plan.md`
(section 8, package 1), `CLAUDE.md` ("A party", "The roles", "The stage", "The crafts' training"), `stage.json` (the
lich's pieces and achievements are listed in stages 1 and 2 since 039).

## Where this starts
On top of 039 (`039: a boss fought by two or three`), the top of `origin/rework`; if it is not there, say so and stop.
The live service still runs `8d8d9ec` (038); 039 changed no decision. The working tree holds the planning chat's
files: `docs/rework.md`, `docs/season-plan.md`, `stage.json`, this file, `tasks/040-gold.md` and, if task 040 is
running or done in its own session, `tasks/040-gold.report.md` and `docs/strategy/gold/` — **those two are another
session's: do not touch them; commit them only if the report exists.** Anything else uncommitted: say so and stop.

## What 039 settled
- **No boss falls to First and Fifth at any level up to 45; a trio takes the lich** — at 40 for sure, and already with
  First 36, Fifth 34 and Second at combat 30 (99%) once the party's pieces exist: 2 Greater Dreadful Staffs, 2
  Conjurer Cloaks, 2 Flying Boots, an Obsidian Helmet, 4 Emerald Rings — all level 30 at craft level 30, none in the
  bank. The bank holds 267 lich tomb keys.
- **So Second becomes the third fighter now** (Alex's word of 11-23, weaponcrafting 30 reached on 11-28; his word of
  11-28: the third fighter is for the group fights).

## A. Second is a fighter and keeps its craft
1. Second's role is fighter. Its lane goes as `rolesOf` gives it (woodcutting to Fourth).
2. **A fighter that holds a gear craft keeps training it, as the board's fighters do** (039's D.1): the training
   takes a fighter holder; its materials stay needs of the workers; and the fighter's order gets "a batch from the
   bank" — only when the bank covers a whole batch, never gathering or hunting for it — after forging by need and
   before the XP pick. The stage's number bounds it as for a worker.
3. 035's guard, the stage's lists and 038's food hold for Second as for the other two.

## B. The party's needs
1. **The party's pieces are needs of their own**: for a boss a listed achievement asks, the pieces of the party's
   winning set that are on the stage's list and not in the bank are asked — for the member the solver gives each to —
   as a fighter's stage piece is (the bill, who crafts, the market's side as today). Cheapest chain first.
2. Nothing is asked for a boss the party cannot pass with every listed piece made (rosenblood, the duskworm today).

## C. The party's step (039's C)
1. When the smallest party of fighters passes the floor against a boss a listed achievement asks, its kill is a step
   for that party: each member takes its food share and a key where the tile asks one (one a character each entry),
   walks to the tile, and waits; when all stand there the leader fights with `participants`; every member's echo is
   taken (cooldown, HP, XP, gold, drops; a loss by today's rules for each); they eat or rest and go again.
2. **How long it stays**: the first kill of a boss a listed achievement asks is taken as soon as the party passes.
   After it the boss is a candidate of each member's XP pick, at the party's XP a second for that member, with a
   listed achievement's bonus as a kill achievement has; the party fights on only while the boss is the pick of
   **every** member. Say in the report what that gives today for the lich (each member's XP an hour there against
   its own pick, and the hours 24 life crystal shards would take at 1 in 50 for one roll a win and for a roll a
   member).
3. While it runs a member is given nothing else; a member that cannot come (off, lost, no key) ends the step for all,
   with a block as a single fight's.
4. **The journal settles 039's unread rules from the first real fights**: one `party` record a fight — the boss, the
   forecast (win rate, turns), each member's xp, gold, drops, final HP, cooldown and where it stands after; and a
   line in `docs/journal.md`. Nothing is rehearsed at the King Slime.

## Proof
1. Checks, red first: a fighter holder trains a whole batch from the bank and never sources for it; the party's
   missing listed pieces are needs and an unlisted one is not; on the mock service three runners in one party — the
   request carries `participants`, a key is spent a member an entry, each echo is handled, one member's loss ends the
   step for all, a member in a party is given no other step; after the first kill the party stays only while the boss
   is every member's pick.
2. The newest live state on a zero-call service with `stage.json`: the first three steps of each of the five, one
   after another; what the workers are asked for the party's pieces and the chain's hours a piece; from what state
   the party goes.
3. One road of two days from that state: the three fighters' combat XP and levels a day, the three crafts, the day
   the lich first falls (or what it still waits for), the points.
4. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
5. `CLAUDE.md` follows ("A party", "The roles"). Commits, staged by path, pushed to `origin/rework`: `Rework notes`
   (`docs/rework.md`, `docs/season-plan.md`) if they differ from `HEAD`; `040: gold, read-only` (040's report and
   tables, unchanged) if the report exists; then `039b: the party's step, Second the third fighter` (yours,
   `stage.json`, this file).

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; no request to the game; nothing you run writes under `logs/`.
- No new dependencies, no new constants. Do not edit `docs/rework.md`, `docs/season-plan.md` or `stage.json` (name what
  should change in it).
- If the whole is more than one task: **A and B first, committed as `039b`, and say that C is left.**
- Everything you write is in English.

## Report
`tasks/039b-party-step.report.md`, **at most 50 lines**: Summary (Proof 2 and 3 first; C.2's numbers; what is built,
what is left; what is committed; the gate's line) · Decisions for Alex · How Alex verifies · Files.
