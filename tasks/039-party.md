# 039 — A boss fought by two or three

Read first: `docs/season-plan.md` (section 8, package 1), `CLAUDE.md` (the fight solver and its verdict, "The roles",
the runner, where a boss keeps its `group` gate), `docs/api/openapi.json` (`/my/{name}/action/fight`:
`FightRequestSchema.participants`, at most two more characters, bosses only; `CharacterFightSchema`: the logs and one
result a character), `docs/rework.md` decision 48 (what was parked for "the group-fight round").

## Where this starts
On top of `8d8d9ec` (`038: the fighters fight fed`), the top of `origin/rework`; if it is not there, say so and stop.
The working tree holds the planning chat's files: `docs/rework.md`, `docs/season-plan.md`, this file. Anything else
uncommitted: say so and stop.

## What is
- The game lets up to three characters of an account fight a boss together. The engine cannot: a boss sits behind a
  `group` gate and is never in reach.
- **43 of the season's 210 points stand behind it** (the catalog): 26 for boss kills — lich (level 30, 6,600 HP) 2,
  goblin priestess (35, 6,750) 2, rosenblood (40, 8,000) 3, duskworm (48, 25,000) 3, sandwhisper empress (55, 13,500)
  3, all five 5, the raid bosses pixie 3 and sonnengott 5 — and 17 for their drops: life_lover (24 life crystal
  shards, the lich) 4, elementary_book (rosenblood) 4, coin_collector and secrets_in_the_sand (the empress) 4 and 5.
- The board: the lich is taken by three at 40, 40, 44 (Trobyss) or two at 46 and 50 (hunter2); rosenblood is the
  most fought monster at 48–50 (best 15,464 XP an hour).
- Ours: First 36, Fifth 33, fighters; Second 29, a worker with weaponcrafting 30, due by Alex's word of 11-23 to
  become the third fighter. **When it changes role is decided by B's table**, not here.

## A. The rules of a group fight — read first, build nothing yet
1. From the game's public documentation (`docs.artifactsmmo.com` may be read; no call to the game's API) and from any
   fight with several characters in `logs/raw/` or `logs/journal/` (the client fought in groups before the rework):
   the turn order, whom the boss hits, whether its HP or damage change with the party, how its effects apply to
   several, what a loss costs each member, how XP, gold and drops are shared, each member's cooldown, where the
   members must stand and what the tile asks (the lich's tomb and its key: ten `lich_tomb_key` are in the bank).
2. What cannot be read is named, with the one live fight that would settle it (who, where, what the journal must
   keep). The task does not run it.

## B. The solver and the verdict for a party
1. The fight of one to three of ours against a boss by A's rules, each member in the set the solver would give it;
   the verdict as for a single fight (the rolled win rate against the floor), the turns, each member's HP lost.
2. **The table (into the report)**: for the lich, the goblin priestess, rosenblood and the duskworm — the pair First
   and Fifth, and the trio with Second — at today's levels and gear, and with all three at 35, 40 and 45 in the best
   sets the stage's lists allow: the win rate, the turns, the food a win burns. And for each boss **the lowest level
   of Second at which the trio passes the floor where the pair does not**.

## C. The party's step
1. A boss's kill that a listed achievement or a listed drop asks is a step for a party: the members are the fighters
   B admits, the smallest party that passes. Each member takes its share of food, walks to the tile (the key, the
   transition), and waits; when all stand there the leader fights with `participants`; every member's echo is taken
   (cooldown, HP, drops, a loss by today's rules for each); they eat or rest and go again until the count is done.
2. While it runs, a member is given nothing else; a member that cannot come (off, or lost) ends the step for all,
   with a block as a single fight's.
3. 035's guard and the stage hold for a party as for one fighter.
4. The journal keeps a party's step so that it can be read as one (who, the boss, each fight's result a member).

## D. Read-only, one paragraph each
1. What flips when Second's role becomes fighter: its lanes (who holds woodcutting), its craft (today a fighter
   trains none), and what it would take for a fighter to keep its craft and train it only as a whole batch from the
   bank, as the board's fighters do.
2. What `stage.json` should list for the bosses, stage by stage, given B's table.

## Proof
1. Checks, red first: the party's fight in the solver against a made-up boss (a pair wins where one loses; the
   floor); on the mock service three runners in one party — the request carries `participants`, each echo is handled,
   one member's loss ends the step for all; a member in a party is given no other step.
2. The newest live state on a zero-call service with `stage.json` as it is, and once more with `lich_please` and
   `life_lover` listed in the current stage: what each fighter is given, and from which levels the party goes.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory.
4. `CLAUDE.md`: a section "A party". Commits, staged by path, pushed to `origin/rework`: `Rework notes`
   (`docs/rework.md`, `docs/season-plan.md`) if they differ from `HEAD`, then `039: a boss fought by two or three`.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`; **no request to the game** (its public documentation may be read); nothing
  you run writes under `logs/`.
- No new dependencies. No role is changed. Do not edit `docs/rework.md`, `docs/season-plan.md` or `stage.json`.
- **If the whole is more than one task: build A and B with the table, commit them as `039`, and say that C is left —
  it becomes 039b.** The table is what the plan waits for.
- Everything you write is in English.

## Report
`tasks/039-party.report.md`, **at most 60 lines**: Summary (B's table first; what is built, what is left; what is
committed; the gate's line) · A's rules, with what is unread · D.1, D.2 · Decisions for Alex · How Alex verifies ·
Files.
