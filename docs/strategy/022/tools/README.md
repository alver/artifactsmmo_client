# docs/strategy/022/tools — task 022's scratch tools, kept so the tables can be rebuilt

Run from the repository root (`G:\alex\projects\artifactsmmo`), Node 24:
- `node docs/strategy/022/tools/tab.mjs docs/strategy/022/runs <run>...` — the comparison table (points on days 7–84 and the
  deadline, the days 105/158 are passed, completions, combat on day 42 and at the end, the crafters, the shares, potions,
  kills, kill steps, seconds, solves); `DETAIL=1` adds a table a policy. Reads only the `.jsonl` files.
- `node docs/strategy/022/tools/bill.mjs docs/strategy/022/runs <run>...` — section 5's consumables bill in gold.
- `node docs/strategy/022/tools/cal.mjs <run>...` — the event achievements' completion days.
- `node docs/strategy/022/tools/cmp.mjs <a.jsonl> <b.jsonl>` — every road line equal but the seconds.
- `drive.mts` (the driver every policy run used: `road()`'s body with read-only hooks, then a `stats` line), `believe.mts`
  (settled point 7), `sec3.mts` + `sec3tab.mjs` (section 3), `runecheck.mts`, `part.mjs` (where two runs' decisions part —
  it reads the decision files, which stayed in scratch and were deleted: too large to keep), `get.mjs` (the 42 public reads;
  its log and output paths are the task's scratch), `measure.mjs` (wall seconds and peak RSS at exit). The `.mts` tools need
  a tree with a policy patch applied (`git apply docs/strategy/022/policies/all.patch` in a scratch copy) and `--tree`.
- `runs/measure.txt`: each run's wall seconds and peak RSS (beside eleven other runs; none alone).
- `sec1-analyze.mjs` (section 1's tables, from `snapshot/` and `public/data`) and `sec2/` (`lib.mjs`, `an.mjs`, `an2.mjs`,
  `an3.mjs`: section 2's tables from `logs/journal/` and `logs/raw/`, read-only) — written by the two background agents of the
  task; their output paths were the task's scratch.
