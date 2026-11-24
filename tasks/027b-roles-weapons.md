# 027b — Roles, finished: weapons by need, a fighter at the wall, the board read

Read first: `tasks/027-roles.md`, `tasks/027-roles.report.md` (all of it), `docs/rework.md` decision 68.

## Where this starts
Task 027 stopped before its commit (84 against 96 at the deadline). **Its whole change is in the working tree,
uncommitted, and stays.** This task works on top of it and commits both together. Alex's decisions on the report:

- **Weapons are made as they are needed.** Second turns fighter at weaponcrafting 30 as settled, and goes on forging.
- **The change is committed whatever the road says.** The wall is at combat 39–41, weeks away; until then the fleet
  levels its characters, and the achievements come second. There is no stop condition in this task.

Small and direct, as 027: no new scoring terms, no retuning, no variants played.

## A. The engine
1. **A fighter that holds a gear craft forges by need.** (Today that is Second after its switch; write it for the
   role, not the name.) Besides its fight work it takes, for its own craft only:
   - the craft of a piece a fighter needs (`gear:` by need), when the materials are in the bank or on their way;
   - the craft level a needed piece asks for (the `train` item, as a worker's level step, whatever that step does
     inside itself today);
   - the recycle of an outdated piece of its craft (report 027, Notes: `tidyVerdicts` names Second and nobody takes
     it).

   These come **before** its fights: one weapon speeds three fighters. The materials are a worker's tier 1 as written
   in 027 (`mat:`, a gather `src:`); a kill `src:` is a fighter's. Nothing else changes for it: no gathering lane, no
   filler, no craft objective for points. The craft does not rise past what a needed piece asks.
2. **A fighter with no admitted fight works by today's rule**, not by the gather fallback: `today()` over the whole
   candidate list (report 027, decision 1 (b)). The moment a fight is admitted again it fights. The why says
   "fighter, no fight admitted: …".
3. `CLAUDE.md`, "The roles": both points.

## B. Proof
1. `check-roles`, red first on the working tree as 027 left it: Second a fighter at weaponcrafting 30 with a fighter's
   weapon open and its materials banked → crafts it; the piece asks weaponcrafting 35 → trains; no need → fights; the
   materials missing → a worker gathers them and Second fights meanwhile; a fighter with no admitted fight and an open
   gathering objective takes the objective, and fights again once a monster is admitted; First (no craft) never
   crafts.
2. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, `npm run check -- planner` once.
3. **Three roads from `logs/world/2026-11-24.json`**, side by side while the gate runs:
   - `a394ae1`: 96, already played — take report 027's row, do not replay;
   - the final tree, **roles off** (`drive.mts --cfg`, every character as before 027): what the restore potions and
     the egg alone cost;
   - the final tree, roles on.

   One table: points on days 7, 14, 28 and at the deadline; the five combat levels and the three gear crafts on the
   same days; the weapon each fighter holds on those days (name, level); the day Second turns fighter; fallback
   hours; the completions that slip more than a week against `a394ae1`. **The combat levels are the first line to
   read, the points the second.** No tuning after the table; if something in it looks wrong, say what and stop
   touching.
4. Commit: `docs/rework.md` as `Rework notes` (the planning chat's edits), then everything else as `027: roles`; push
   to `origin/rework`. If the push fails, say so.

## C. The board read (read-only, offline — no request to the game)
`logs/board/` holds the watch's reads: two proof reads of 09:17 and 09:21 UTC on 11-24 (one moment), and one every
even UTC hour from 12:00 on. Build a small reader and write the first reading. Nothing of `scripts/board/` changes.

- **The tool**: `docs/strategy/board/tools/read.mjs` (plain Node, `zlib`; borrow from `docs/strategy/024/tools/lib.mjs`
  and `stats.mjs` what fits). `node …/read.mjs` reads the newest read; `--from <dir> --to <dir>` compares two. It
  prints the tables below as markdown, so the same command gives the trends in a week.
- **One read, 50 accounts** (024 had 25):
  1. The fleets' shapes: for each account its five characters' combat levels, and how many stand within 5 levels of
     its best. Counted over the 50: how many fleets are even, how many 1 / 2 / 3 fighters and the rest workers.
  2. **Who holds the gear crafts**: for weaponcrafting, gearcrafting and jewelrycrafting — is the account's best
     crafter one of its fighters or a low-combat character; its craft level against the fleet's top combat level.
  3. The weapon a fighter wears: its level against the character's combat level, by band (20–29, 30–39, 40+).
  4. **The neighbours**: the accounts within 10 positions of `alverus` and `alverus` itself, one row a character
     (combat, the eight skills, the weapon and its level), and the three accounts whose shape is nearest to this
     fleet's roles (two or three fighters, crafts on the others).
- **Two reads, if two at least 2 hours apart exist when you get here** (else say so in one line and skip):
  for the first 50 and the neighbours, what each character gained between them — combat XP, XP by skill, the
  account's points — and from that what it was doing (fighting / gathering which skill / crafting which craft). The
  ten accounts that gained most combat levels and the ten that gained most points, with their shapes.
- **The reading**: `docs/strategy/board/2026-11-24.md`, at most about 120 lines: the tables, and under them five
  lines at most — what the leaders and the neighbours do that the roles of 027 do not.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game.
- Do not touch `scripts/board/`, the files under `logs/board/` or the scheduled task.
- No new dependencies. Do not edit `docs/rework.md` (it is committed as it stands).
- The machine is strong: run the roads, the gate and part C side by side.
- Everything you write is in English.

## Report
`tasks/027b-roles-weapons.report.md`, **at most about 200 lines**: Summary · Decisions for Alex · How Alex verifies ·
The roads (the one table) · The board (the five lines and a pointer to the reading) · What was done / files · Notes.
