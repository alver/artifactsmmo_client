# 026b — The board's days, read whole: what the others do that this fleet can copy

Read first: `tasks/026-board-watch.report.md` (what a read holds), `docs/strategy/board/tools/read.mjs` and `day.mjs`
(the offline readers), `docs/strategy/board/2026-11-25.md` (the first day, characters only), `tasks/029-fleet-levels-crafts.md`
(its "What is" and part A — the next engine task, which this reading feeds).

## Where this starts — a parallel session
**Another Claude Code session works in this tree at the same time** (028, then 029). So, for this task:
- no git command that writes: no `add`, `commit`, `push`, `stash`, `checkout`, `restore`, `worktree`; the next task commits
  your files;
- you write only new files under `docs/strategy/board/` (tools in `tools/`, never an edit of `read.mjs` or `day.mjs` —
  import from them) and your report; nothing under `src/`, `scripts/`, `logs/`, no edit of `CLAUDE.md` or `docs/rework.md`;
- nothing is run from `src/` or `scripts/` (they are mid-edit): no `npm`, no `tsx`, no simulator — plain `node` on your own
  `.mjs` files, the catalog read from the committed data files as `read.mjs` does;
- no request to the game or to the local service; scratch in `D:\Temp`.

**The data.** `logs/board/<day>/<HHMM>Z/`, every even UTC hour since 11-24 12:00 (`reads.jsonl`; the 14:00 read of 11-24
is partial): 50 accounts a read, each with `acc-<name>-characters.json.gz` (five characters: levels and XP of every skill,
the tile, every gear slot, the bag, the task and its progress, `cooldown_expiration`) and `acc-<name>-achievements-1.json.gz`
(91 achievements, **every objective's counter** — `combat_kill` by monster, `gathering` and `crafting` by item,
`recycling`, `favor`, `task`, `use`, `npc_buy`, `combat_drop` — and `completed_at` for the whole season). 027g's part D
read the characters only. The counters between two reads say what an account did in those two hours.

**Alex (2026-11-25):** can more be drawn from the other players' logs? His fleet (`alverus`, 39 points, place 33) is
behind in weapons and armour; its crafts gained 17,674 / 10,699 / 1,424 XP (weapon / gear / jewelry) in the first day
where uaprsf's weaponcrafting gained 154,578 and Wudagem's gearcrafting 167,000.

Every full read from the first to the newest when you start. Each part ends with **the lines this fleet can act on**.

## A. How a craft is levelled fast (the first question; it feeds 029)
1. Every account-interval of 24 h or less in which one gear craft gained 30,000 XP or more (uaprsf, Wudagem, _zero_,
   Elaus_, krolov, Turbofish, automode, Elemental were there on the first day). For each, read by read: the crafter — the
   craft's XP an hour, where it stands, its bag, the `crafting` and `recycling` counters that moved (what it made, how
   many, whether it recycles); the other four — where each stands, what it kills and gathers (XP by skill, the counters,
   the bag), and whether that is the crafter's recipe's material.
2. The answer in a table, an account a row: the recipe by craft level; craft XP an hour while training; who brought the
   materials (the crafter itself, gatherers, fighters on monsters that give them no XP); how long the others were on it.
3. `alverus` in the same table (Second's weaponcrafting, Third's gearcrafting).
4. Five lines: how they level a craft, and what of 029's part A the data supports, contradicts or does not show.

## B. What they fight, level by level
1. Every character-interval with combat XP gained: the monster (the tile; a `combat_kill` counter where one moved), the
   level, XP an hour, the whole worn set, food and potions in the bag or the utility slots.
2. A table by combat level 25–50: the monsters fought (character-intervals each), the median and the best XP an hour a
   monster, the weapon and its level in the best quarter. `alverus`'s First and Fifth beside it (the Vampire at 27–28).
3. Where a kill counter and the tiles isolate one character at one monster: its seconds a kill, with its set — a list
   the planning chat can hold against this fleet's forecast later.

## C. What they wear, by band
For the fighters of the best quarter by XP an hour in the bands 28–32, 33–37, 38–42, 43–47, 48–50: the most worn item in
every slot (weapon, shield, helmet, body, legs, boots, rings, amulet, rune, artifacts, utilities), with the item's level,
the craft and craft level that make it, and its ingredients that are drops (which monster). Beside it what First and
Fifth wear now. One list at the end: the pieces of the 28–32 and 33–37 bands, by the craft level they ask.

## D. Which achievements come next
From `completed_at` in the newest read: for every account now above 39 points, the achievements it completed after it
passed 39 points, in order, up to 60 points, with the days between. The fifteen most common among them and their median
position in the order; for each, `alverus`'s counters now. The same for 60 → 80 in five lines.

## E. Rates the model guesses
A day, an account a row, the median and the best quarter at the end: favors at the altar (`favor`); tasks finished
(`task`) and the share of monsters tasks among the held ones; kills of event monsters; what was used (`use` counters and
what left the bags); the share of reads in which a character's `cooldown_expiration` lies more than ten minutes before
the read (it stands idle). `alverus` in the same table.

## F. The twin
The three accounts whose top combat stood at 28–36 at the first read and that gained the most combat levels since
(Zetark is likely one). A page each: its five characters read by read — the level, what each fights, gathers and crafts,
what it wears, when a piece of gear changed (which piece, who could make it) — and ten lines: what it did in these days
that `alverus` did not.

## Proof
- Every table is made by a tool under `docs/strategy/board/tools/` from the kept reads; a second run gives the same bytes.
- Say for every part what the data cannot show (a bank is not public; a counter of a completed achievement stops).

## Output
- `docs/strategy/board/whole-1.md` — the tables in full, part by part.
- `tasks/026b-board-reading.report.md`, **at most about 110 lines**: Summary — the ten things this fleet should copy, the
  most valuable first, each with its evidence in a line · For task 029 (A.4) · A to F, the lines to act on · How Alex
  verifies (the commands) · Notes. No placeholders left in it. Everything you write is in English.
