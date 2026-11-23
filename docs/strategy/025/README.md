# docs/strategy/025 — task 025's runs and tools (the fight round)

Run from the repository root (`G:\alex\projects\artifactsmmo`), Node 24. Nothing here makes a request or writes under `logs/`.

## tools/
- `drive.mts --tree <dir> --world <file> [--days N] [--cfg '<json>'] [--dec <decisions.jsonl>]` — 022's driver
  (`docs/strategy/022/tools/drive.mts`, kept as it is) with the fight round's stats on its `stats` line: `fights` (a kill step's
  kills ÷ its verdict's p) and `losses` (kills × (1 − p) ÷ p: the forward model's expected losses), `runes` (each healing rune the
  road buys: who, when) and `runeGold`, `food` (the food drunk, apart from the potions). `road()`'s body line for line, the hooks
  only read. A tree is a copy of `src scripts public package.json tsconfig.json` (`git ls-files -co --exclude-standard … | tar`)
  with a `node_modules` junction: the rows were played on copies of the working tree taken as each change went in.
  `node --max-old-space-size=2048 --import tsx docs/strategy/025/tools/drive.mts --tree <tree> --world logs/world/2026-11-22.json --dec <f>`.
- `tab.mjs <runs dir> <run>...` — section 5's table: the points on days 7–84 and at the deadline, completions, steps, the
  consumables' share of the hours, drunk, food, runes and gold, fights and expected losses, seconds; the five combat levels on
  those days; what the open points wait for; when each rune is bought (`DETAIL=1`: the completions with their days).
- `waste.mjs <runs dir> <run>...` — decision 58's defect as a number: the supply hours spent making consumables for a work that
  does not complete by the deadline (an achievement not completed, a road to combat N not reached; an event's demand and a
  parent's material counted apart). Reads `<run>.dec.jsonl` too, so it runs where the decision files are.
- `part.mjs <a.dec.jsonl> <b.dec.jsonl> [day0]` — where two runs' decisions first part (by when, who, the step's key, its answer
  and units: a reworded why is no parting).
- `forecast.mts [--out <dir>] [--until <ISO>]` — settled point 3, the forecast against play: every solo fight the logs hold
  (since 2026-11-03), the set, the level and the monster rebuilt, against the working tree's simulator (the expected fight and
  the rolled p over 1,000 seeded fights); prints the tables by band of p and by monster, what the log cannot tell, the losses at
  p ≥ 0.9 and decision 28's skeleton fights (`node --max-old-space-size=2048 --import tsx docs/strategy/025/tools/forecast.mts
  --until 2026-11-23T13:45:00Z`, about 20 s; outputs in `<tmp>/ammo-025-forecast` unless `--out`).

## runs/
The result lines of every row of report 025's section 5 (`<row>.jsonl`: the road's `day` lines, `done` with the completions,
`stats` with the levels by day, the hours by answer, drunk, kills, runes, losses, what waits at the end). The decision files
(1–4 MB each) stayed in scratch and were deleted; `part.mjs` and `waste.mjs` read them, and a row is played again from its
tree to get them back.

| run | World | tree |
|---|---|---|
| `ref`, `ref23` | 2026-11-22, 2026-11-23 | 0f94809 (report 023's code: 024 changed no `src/`) |
| `I`, `I23` | 〃 | + the initiative (settled point 1) |
| `R`, `R23` | 〃 | + the verdict at 0.75 (settled point 2) |
| `P`, `P23` | 〃 | + a potion's chain price (settled point 4) |
| `U`, `U23` | 〃 | + the rune worn and bought (settled point 5) |
| `F`, `F23` | 〃 | + food at its chain (settled point 5): the whole tree at 0.75 |
| `F60`, `F90`, `F98`; `F6023`, `F9023`, `F9823` | 〃 | the whole tree at the floors 0.6, 0.9, 0.98 (`--cfg '{"risk":{"minWin":0.6}}'`) |
| `Z`, `Z23` | 2026-11-22, 2026-11-23 | the final tree on the new atlas (settled point 7), the step's verdict counting the worn pinned artifacts: the new reference |

`ref`, `ref23`, `I`, `I23` were played with 022's driver (no `fights`/`losses`/`runes` fields), the rest with 025's. Every row but
`Z` and `Z23` on the atlas of task 023 (2026-11-23T08:48:42Z); `F`'s tree differs from the final one in comments, the search's
exact pruning (the same answers: `check-solve`), an event member's use on its trip (the runtime's; the road has no trips) and
one waiting label. The rows before `Z` took a step's own verdict without the worn pinned artifacts (report 025, "The road"): it
moved none of the final tree's decisions (`Z` played both ways: 6,688 decisions equal, 100 points), only the expected losses of the
`stats` line (3,507 before, 1,217 after), so the `losses` of rows `R` to `F` and of the floors are overstated alike. (The new
reference is `Z`, not `REF`: Windows' file system does not tell `REF.jsonl` from `ref.jsonl`.)
