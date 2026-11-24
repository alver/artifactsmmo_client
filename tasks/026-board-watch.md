# 026 — Board watch: a raw snapshot of the leading accounts every two hours

## Goal
Collect raw data about the players around and above this account, every two hours, and keep it on disk. Nothing is
analysed in this task — it only has to collect reliably, cheaply and for the rest of the season, so that the planning
chat can later see how other fleets develop (levels, skills, XP, gear, where they stand, what they work on) and find an
account similar to this one to learn from.

This is a small, standalone task. It does not touch the engine, the planner or the service.

## What to build
One standalone Node script, `scripts/board/watch.mjs`, plain JavaScript, no imports from `src/`, no new dependencies.
One run = one read, then it exits.

A read:
1. `GET /leaderboard/accounts?sort=achievements_points&size=100&page=N` for every page (`pages` in the first answer;
   about 5 today, 435 accounts). The whole ladder, every time.
2. The accounts to read in detail: the first 50 positions, plus every account within 10 positions of `alverus`, plus
   `alverus` itself (it stands at 38 today, so usually this is just the first 50).
3. For each of them: `GET /accounts/{a}/characters`, then `GET /accounts/{a}/achievements?size=100&page=N` for every
   page its answer names. Read all the characters first, then the achievements, so the characters are one moment.

Rules for the requests:
- Public GETs to `https://api.artifactsmmo.com` only. **No token, no `Authorization` header; don't read `.env`.**
- All these paths are in the `data` bucket (docs.artifactsmmo.com/api_guide/rate_limits: 200 a minute, 2,000 an hour
  per IP; the characters' actions are in the separate `action` bucket). One request at a time, at least 1.3 s from
  start to start. A read is about 107 requests (about 2.5 min).
- A 429 or a 5xx ends this read (logged, not retried). Other non-200s are logged and skipped.
- A hard cap of 150 requests per read in the code.

Storage (under `logs/`, which is gitignored):
- `logs/board/<YYYY-MM-DD>/<HHMM>Z/` — the UTC start of the read. Every 200 body **gzipped** (Node's `zlib`), byte for
  byte inside: `leaderboard-<page>.json.gz`, `acc-<account>-characters.json.gz`,
  `acc-<account>-achievements-<page>.json.gz` (the file names of report 024's snapshot, plus `.gz`).
- `logs/board/reads.jsonl` — one line a read: start, end, requests, bytes raw and gzipped, accounts read, the first
  non-200 status (or null), and `skipped` with a reason when the run did nothing.
- A run that finds a read started less than 90 minutes ago does nothing but write a `skipped` line — so a manual run,
  a missed and caught-up schedule or two triggers never double the data.

## The schedule
Register a Windows Task Scheduler task, `ArtifactsMMO board watch`, for the current user:
- every 2 hours, starting at the next even UTC hour (expressed in local time); "run as soon as possible after a missed
  start" on; no stop on battery; a run that takes over 15 minutes is stopped;
- **no console window may pop up on Alex's screen** (e.g. `conhost.exe --headless`, or a small `.vbs`/`wscript`
  wrapper kept in `scripts/board/`); pick one and prove it;
- the working directory is the project root; the full path of `node.exe` is resolved at registration.

Keep the exact registration command (and the one to remove the task) in `scripts/board/README.md`, and a
`scripts/board/register.ps1` (or `.cmd`) that does it, so it can be repeated after a reinstall.

Registering this scheduled task is a system change outside the project folder: it is allowed for this task, and it is
the only one.

## Proof
1. Run the script once by hand: a full read lands, `reads.jsonl` has its line; say how many requests, how long, the raw
   and the gzipped size.
2. Run it again at once: nothing is read, a `skipped` line is written.
3. Register the task and trigger it once with `schtasks /Run`, with the 90-minute guard moved out of the way the
   simplest honest way (e.g. an env var or an argument for the guard; don't fake a read folder); show that the second
   read landed and that no window appeared (say how you know).
4. `schtasks /Query /TN "ArtifactsMMO board watch" /V /FO LIST` — the next run time.
5. Estimate the disk use for 100 days.

## Rules
- Only `G:\alex\projects\artifactsmmo\` is changed (plus the scheduled task above). Scratch goes to `D:\Temp`.
- The live service keeps running: don't start, stop or restart it; don't touch `src/`, `.ammo/`, `game.db`, `logs/`
  outside `logs/board/`, `package.json`, `docs/rework.md`.
- **The working tree may hold uncommitted work of task 025. Leave it exactly as it is.** Commit only this task's files
  with explicit paths (`git add tasks/026-board-watch.md tasks/026-board-watch.report.md scripts/board`), never
  `git add -A` or `git add .`; commit `026: board watch` on the current branch (`rework`) and `git push`. If the push
  fails, say so; don't retry in a loop.
- No typecheck or check gate is needed (the script lives outside `src/`), but run `node --check` on it.
- Everything you write is in English.

## Report
`tasks/026-board-watch.report.md`, short: what was built (the files), the proof (the five points above, with numbers),
the exact scheduler command, anything Alex has to know (e.g. whether the task runs only while he is logged on), every
command run.
