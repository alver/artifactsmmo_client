# Board watch (task 026)

A raw snapshot of the leading accounts, every two hours, kept on disk. Nothing here analyses: it collects for the
planning chat (how other fleets develop, an account like this one to learn from). Standalone: nothing of `src/`, no
dependency, no token.

| File | What it is |
|---|---|
| `watch.mjs` | One read, then exit. `node scripts/board/watch.mjs [--no-guard]` |
| `run.vbs` | The scheduled task's wrapper: starts `watch.mjs` with its console hidden (no window on the screen) |
| `register.ps1` | Registers, re-registers (`-NoGuard` for a one-off test) or removes (`-Remove`) the scheduled task |
| `derive.mjs` | Task 034: the reads taken apart — one small file a read, the page's data, the planning chat's summary |
| `verify.mjs` | Task 034: replays the derived files and compares them field by field with every raw read |
| `view/` | Task 034: the page's sources (`index.html`, `app.js`) and `build.mjs`, which puts the page beside its data |

## A read
1. `GET /leaderboard/accounts?sort=achievements_points&size=100&page=N`, every page the first answer names (the whole
   ladder: 448 accounts on 5 pages on 2026-11-24).
2. The accounts to read: positions 1–50, every account within 10 positions of `alverus`, and `alverus`.
3. Each one's `GET /accounts/{a}/characters` — all of them first, so the characters are one moment — then
   `GET /accounts/{a}/achievements?size=100&page=N`, every page its first answer names.

Public GETs to `https://api.artifactsmmo.com` only: no `Authorization` header, `.env` is never read. All of it is the
`data` bucket (200 a minute, 2,000 an hour per IP). One request at a time, at least 1.3 s from start to start, at most
150 a read, 30 s each; a 429, a 5xx or no answer ends the read (not retried); any other non-200 is noted in the line
and skipped; after 12 minutes no request is started. About 105 requests and 2¼ minutes.

## On disk (`logs/`, gitignored)
- `logs/board/<YYYY-MM-DD>/<HHMM>Z/` — the read's UTC start. Every 200 body byte for byte, gzipped:
  `leaderboard-<page>.json.gz`, `acc-<account>-characters.json.gz`, `acc-<account>-achievements-<page>.json.gz`
  (report 024's file names + `.gz`; `zcat`, or `zlib.gunzipSync` in Node, gives the API's bytes back). A read that got
  no 200 leaves no folder.
- `logs/board/reads.jsonl` — one line a run:
  - a read: `start`, `end` (ISO), `skipped: null`, `guard` (false under `--no-guard`), `dir`, `requests`, `files`,
    `raw` and `gz` (bytes of the 200 bodies before and after gzip), `ladder` (accounts on the board), `picked`
    (accounts chosen), `accounts` (accounts whose characters came back), `me` (`alverus`'s `position`, `points`),
    `first` (the first non-200 status, 0 = no answer, else null), `stopped` (why it ended early, else null), `non200`
    (`path`, `status`, `at`, `error`), `error` (only after a crash);
  - nothing done: `start`, `end`, `skipped` (the reason), `last` (the start of the read it found).
- **The guard**: a run that finds a read started less than 90 minutes ago — the newest `start` of a read line, or the
  newest read folder (made before the first request, so a read still running counts) — writes a `skipped` line and
  exits. A manual run, a missed start caught up or two triggers never double the data. `--no-guard` lifts it.
- Exit code: 0 a whole read or a skip, 2 a read that ended early (429 / 5xx / no answer / cap / 12 minutes), 1 a crash.
  The scheduler shows it as the task's last result.

About 490 KB a read gzipped (2.46 MB raw; 620 KB on disk with 4 KB clusters), 12 reads a day: about 7.5 MB a day on
disk, about 0.75 GB for 100 days (report 026).

## The schedule
The task `ArtifactsMMO board watch`, for the current user: every 2 hours from the next even UTC hour (written as local
time with its UTC offset, so it stays on even UTC hours through a daylight-saving change), indefinitely; run as soon
as possible after a missed start; starts and keeps running on battery; stopped after 15 minutes; a second instance is
not started while one runs. Its action: `C:\WINDOWS\System32\wscript.exe //B //NoLogo
"<project>\scripts\board\run.vbs" "<node.exe>"`, working directory the project root, node.exe's full path resolved at
registration. **It runs only while the user is logged on** (Interactive, not elevated; a locked screen is fine, a
sleeping PC is not — it catches up on wake, and the guard keeps the catch-up and the next start from both reading).

Register (or re-register, e.g. after a reinstall or after node moves to another folder), from the project root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\board\register.ps1
```

Remove:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\board\register.ps1 -Remove
# or: schtasks /Delete /TN "ArtifactsMMO board watch" /F
```

Look at it, run it now (the guard still applies), see its last result:

```powershell
schtasks /Query /TN "ArtifactsMMO board watch" /V /FO LIST
schtasks /Run /TN "ArtifactsMMO board watch"
```

What `register.ps1` runs (the values resolved when it runs):

```powershell
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\wscript.exe" `
  -Argument '//B //NoLogo "<project>\scripts\board\run.vbs" "<node.exe>"' -WorkingDirectory '<project>'
$trigger = New-ScheduledTaskTrigger -Once -At <the next even UTC hour, local> -RepetitionInterval (New-TimeSpan -Hours 2)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId <DOMAIN\user> -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'ArtifactsMMO board watch' -Description '…' -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force
```

`run.vbs` is VBScript (Windows Script Host). Windows 11 24H2 made VBScript an optional feature that Microsoft plans to
remove; on Windows 10 it is part of the system. If it ever goes, the action can be `conhost.exe --headless "<node.exe>"
"<project>\scripts\board\watch.mjs"` instead.

## The dataset and the page (task 034)
`npm run board:view` = `node scripts/board/derive.mjs` then `node scripts/board/view/build.mjs`. Offline, no request; the raw
reads are only read. Everything it writes is under `logs/` (gitignored):
- `logs/board/derived/reads/<day>-<HHMM>Z.json` — one file a whole read (whole.mjs's rule; 024's reads of 11-22 and 11-23 first):
  what changed since the read before, codes through a dictionary (the format: `derive.mjs`'s header). A read already derived is
  not opened again; a missing or older-format file makes it and every later one derived again (`--all`: all of them).
- `logs/board/derived/data.js` — the page's data (the files in order and the catalog's names for their codes), a script.
- `logs/board/derived/summary.json` — for the planning chat: a day a row for every account and character (levels, XP gained,
  hours by monster, the set worn longest, points), at most 1 MB (the oldest days are left out first; `from` says where it starts).
- `logs/board/view/index.html` — the page: double-click it (Chrome, `file://`, no network). Four views: everyone, an account,
  a level, two accounts side by side; the state is in the URL's `#…`.

`run.vbs` starts the same two steps after each read without waiting for them, so a failure there changes neither the read nor
its exit code.
