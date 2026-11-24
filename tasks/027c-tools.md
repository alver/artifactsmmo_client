# 027c — Gathering tools: made when they pay over the lane's whole work

Read first: `src/plan/planner/gear.ts` (work (c)), `docs/rework.md` decision 22 (gear by need),
`tasks/027b-roles-weapons.report.md`.

## Where this starts
On top of `027: roles` (`00151c3`, 027b's commit). The working tree holds two changes from the planning chat and
nothing else: `docs/rework.md` (edited) and this file. If anything else is uncommitted, say so and stop.

**The defect.** Work (c) asks `G + H1 ≤ NEED_RATIO × H0` with `H1 = H0 × (1 − cut) / (1 − cut0)`. From an iron tool
(−20%) to a steel one (−30%) that ratio is 0.875, above `NEED_RATIO` 0.85: the need can never hold, whatever the tool
costs (steel → gold: 0.857, the same). So the fleet gathers with iron tools at combat 24–26 while Second holds
weaponcrafting 20 and the bank (snapshot of 11-24 00:00 UTC) holds 28 steel bars, 114 pig skin, 31 spider legs, 9 ogre
eyes, 5 flying wings, 1 ogre skin, 9 green cloth and 192 tasks coins (an astralyte crystal is 12 coins at the tasks
trader; a steel tool takes 2). `NEED_RATIO` is right for a fight set and wrong for a tool; H0 to the *next* gate is
also too short a work for a thing that speeds every later gather.

Alex's decision (2026-11-24): the steel tools are to be made, **one of each** — a copy a lane holder, not a copy a
character. Small and direct: no new constant, no retuning.

## A. The engine
1. **A tool's rule.** In work (c) a tool is needed when it pays for itself over the lane's known work:
   `G ≤ H0 − H1`, where H0 is the holder's hours for **all** that is left of the lane — the road to the lane's last
   open gate (every gate, not the next one) plus the open gathering objectives of the lane — and H1 the same with
   the tool. `NEED_RATIO` stays for (a) and (b) only. One need a lane, not one a gate and one an objective.
2. **One copy a lane holder.** The holder is `rolesFor` as 027 left it (one owner a gathering skill; an event lane's
   second and third gatherers are not holders for this). A lane that changes hands (Second's woodcutting → Fourth)
   takes the tool from the bank, no second copy. Alchemy's gloves follow the same rule (one steel pair is banked).
3. **The candidate.** As today: the best tool the holder can equip whose bill is in reach; a crystal bought with
   tasks coins is in reach as for any needed gear (down to `COIN_FLOOR`). If today's candidate filter rejects a steel
   tool for a reason other than the ratio, print the reason in the report and fix it only if it is one line.
4. **The score.** The lane bundle's score as today (`bundleScore` over `G + H1`), nothing new. If with that score the
   tool still does not come up within a day of the road (B.2), say so and stop — do not invent a boost.
5. The why of the step names the tool, the holder, the lane's hours left, the hours saved and the hours to make.
6. `CLAUDE.md`, the gear-by-need paragraph: the tool's rule in two lines.

## B. Proof
1. A check, red first on the starting tree: a holder with an iron tool, the steel one craftable and its materials
   banked → the need holds and the crafter makes it; the tool dearer than what it saves → no need; a fighter (no
   lane) → no tool; two workers pinned to one lane → one copy; the next gather step of the holder wears it.
2. One road from `logs/world/2026-11-24.json` (025's `drive.mts`, roles on): the day each of the three steel tools and
   any later tool is made, who made it, the coins spent; points and the five combat levels at days 7, 14, 28 and the
   deadline beside 027b's roles-on row. No tuning after the table.
3. The gate: `npm run typecheck`, `npm run check`, the build into a temp directory, `npm run check -- planner` once.
4. Commit `docs/rework.md` as `Rework notes` (the planning chat's edits, as it stands), then everything else as
   `027c: tools`; push to `origin/rework`. If the push fails, say so.

## C. The fallback, read-only (no change to the engine)
Report 027b: the gather fallback takes 1,718 character-hours with roles on and 3,052 with roles off, against 229 on
`a394ae1`; with roles off the characters reach combat 45 by day 28 and stand there to the deadline. Nobody knows why.
From B.2's road (roles on, with the tools) and 027b's decision files in `D:\Temp\ammo-027b\` if they are still there
(else play roles off once more):
- the fallback hours by week and by character, and the combat level at which each character's fallback starts;
- for the first fallback step of each character and one in the middle of its longest run: the five best candidates
  `rank` refused and why (no admitted fight: which monsters, at what rolled win rate; a gate; a material; no score);
- what differs from `a394ae1` there: which of 027's riding changes (the restore potions in the simulator, the egg's
  source, the atlas) or which rule takes the work away. One paragraph, with `path:line`.
Say what you found and what you did not; fix nothing.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed; scratch in `D:\Temp`. The live service keeps running: no start,
  stop or restart, no build into `dist/`, no request to the game.
- No new dependencies. Do not edit `docs/rework.md` (it is committed as it stands).
- The machine is strong: run the road and the gate side by side.
- Everything you write is in English.

## Report
`tasks/027c-tools.report.md`, **at most about 120 lines**: Summary · Decisions for Alex · How Alex verifies · The road
(the one table) · The fallback · What was done / files · Notes. No placeholders left in it.
