# Report 026 — board watch

## Built
- `scripts/board/watch.mjs` — one read, then exit (`node scripts/board/watch.mjs [--no-guard]`). Plain Node 24 (built-in
  `fetch`, `fs`, `zlib`), nothing of `src/`, no dependency, no token, no `Authorization` header, `.env` never read. The
  whole ladder (every page), then positions 1–50 + everything within 10 positions of `alverus` + `alverus`: all their
  `/characters` first, then their `/achievements` (every page). One request at a time, ≥ 1.3 s start to start, a hard
  cap of 150, 30 s a request; a 429, a 5xx or no answer ends the read (not retried), any other non-200 is noted in the
  line and skipped; no request is started after 12 minutes. Every 200 body gzipped byte for byte into
  `logs/board/<YYYY-MM-DD>/<HHMM>Z/` with report 024's file names + `.gz`; one line a run in `logs/board/reads.jsonl`.
  The guard: a read started less than 90 minutes ago (the newest `start` of a read line, or the newest read folder —
  made before the first request, so a read still running counts) → a `skipped` line and exit. `--no-guard` lifts it
  and the line says `guard: false`. Exit 0 = a whole read or a skip, 2 = a read ended early, 1 = a crash.
- `scripts/board/run.vbs` — the task's wrapper: `wscript.exe` (a GUI program, no console) starts node with
  `WScript.Shell.Run(cmd, 0, True)` — window style 0, the console created hidden — waits for it and passes its exit
  code back to the scheduler; `//B` suppresses any script error dialog.
- `scripts/board/register.ps1` — registers / re-registers the task (`-NoGuard`: the same with `--no-guard`, for a
  one-off test), `-Remove` removes it.
- `scripts/board/README.md` — what a read does, the files and the line's fields, the commands to register, remove,
  query and run the task.

## Proof
1. **By hand** (`node scripts/board/watch.mjs`, 09:17:44.500 → 09:20:00.715 UTC on 11-24): **105 requests** (5 ladder
   pages, 50 characters, 50 achievement pages), every one 200, **136.2 s**; **2,456,339 bytes raw, 489,800 gzipped**
   (19.9%); 105 files in `logs/board/2026-11-24/0917Z/`; the ladder holds 448 accounts, `alverus` stands 32nd with 37
   points (so the ±10 window, 22–42, lies inside the first 50); exit 0. Its line:
   `{"start":"2026-11-24T09:17:44.500Z","end":"2026-11-24T09:20:00.715Z","skipped":null,"guard":true,"dir":"2026-11-24/0917Z","requests":105,"files":105,"raw":2456339,"gz":489800,"ladder":448,"picked":50,"accounts":50,"me":{"position":32,"points":37},"first":null,"stopped":null,"non200":[]}`
2. **Again at once** (09:20:10): no request, no folder, exit 0, 0.07 s:
   `{"start":"2026-11-24T09:20:10.035Z","end":"2026-11-24T09:20:10.037Z","skipped":"a read started 2 min ago","last":"2026-11-24T09:17:44.500Z"}`
3. **The scheduled task, triggered**: registered (`register.ps1`), then registered with `-NoGuard` (the guard moved
   out of the way by the argument, recorded as `guard: false`), `schtasks /Run` at 09:21:09, then `register.ps1`
   again without it. The read landed: 09:21:09.633 → 09:23:25.825, **105 requests, 136.2 s, 2,457,069 raw, 489,870
   gzipped**, `logs/board/2026-11-24/0921Z/` (105 files), `guard: false`, `first: null`; the task's Last Result 0.
   **No window appeared — how I know**, two ways:
   - The process tree during the run: `wscript.exe` (pid 28908) → `node.exe … watch.mjs --no-guard` (29092) →
     `conhost.exe` (12244). The only console window of the tree (`ConsoleWindowClass`, owner node) had
     `IsWindowVisible = False`; the other windows of the tree are `WSH-Timer` and `IME` message windows, hidden.
   - A WinEvent hook (`EVENT_OBJECT_SHOW`, every top-level window shown on the desktop) running from before
     `schtasks /Run` until the line landed. Its control first: a `cmd` console started minimized was caught at
     +0.1 s (`SHOWN pid 31568 cmd class=ConsoleWindowClass`). Then, over the task's 136 s, 23 windows were shown and
     every one belonged to `explorer` (5: taskbar thumbnails, Alt-Tab) or `chrome` (18) — **none to wscript, node
     or conhost**. The helpers are scratch, not committed (`D:\Temp\claude\…\scratchpad\winwatch.ps1`, `tree.ps1`).
4. `schtasks /Query /TN "ArtifactsMMO board watch" /V /FO LIST` after the final registration: **Next Run Time
   24/11/2026 11:00:00** (local = 10:00 UTC), Status Ready, Logon Mode Interactive only, Task To Run
   `C:\WINDOWS\System32\wscript.exe //B //NoLogo "G:\alex\projects\artifactsmmo\scripts\board\run.vbs"
   "c:\nodejs\v24.14.0\node.exe"`, Start In `G:\alex\projects\artifactsmmo`, Stop Task If Runs 00:15:00, Repeat
   every 2 Hour(s), Until: Time None, Duration Disabled (indefinitely), Power Management empty (no battery
   condition), Last Result 0. `Get-ScheduledTask`: StartWhenAvailable True, DisallowStartIfOnBatteries False,
   StopIfGoingOnBatteries False, ExecutionTimeLimit PT15M, MultipleInstances IgnoreNew, StartBoundary
   `2026-11-24T11:00:00+01:00`.
5. **Disk for 100 days**: a read is 489,870 bytes gzipped (achievements 388,101, characters 95,739, ladder 6,030), and
   **634,880 bytes on disk** with G:'s 4 KB clusters (55 of the 105 files are under 4 KB). 12 reads a day × 100 days =
   1,200 reads: **about 590 MB of data, about 760 MB on disk**; `reads.jsonl` about 0.5 MB. The ladder grew 435 → 448
   in 21 hours; at that pace it is about 1,750 accounts (18 pages, about 118 requests a read, under the cap of 150)
   in 100 days, which adds requests but only some 16 KB a read. Call it **0.8 GB**; G: has 230 GB free.

## The scheduler command
`register.ps1`, run as `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\board\register.ps1` (remove:
the same with `-Remove`, or `schtasks /Delete /TN "ArtifactsMMO board watch" /F`). With today's values it ran:

```powershell
$action = New-ScheduledTaskAction -Execute 'C:\WINDOWS\System32\wscript.exe' `
  -Argument '//B //NoLogo "G:\alex\projects\artifactsmmo\scripts\board\run.vbs" "c:\nodejs\v24.14.0\node.exe"' `
  -WorkingDirectory 'G:\alex\projects\artifactsmmo'
$trigger = New-ScheduledTaskTrigger -Once -At '2026-11-24 11:00 (local; 10:00 UTC)' -RepetitionInterval (New-TimeSpan -Hours 2)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId 'DESKTOP-01F7OS5\Alver' -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'ArtifactsMMO board watch' -Description '…' -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force
```

## What Alex has to know
- **It runs only while you are logged on** (Interactive, not elevated, no password stored). A locked screen is fine;
  a sleeping or shut-down PC misses starts and catches up once on wake, and the guard keeps that catch-up and the next
  start from both reading (a catch-up at 11:10 skips the 12:00 start: the next read is 14:00).
- **The first scheduled start, 10:00 UTC today, will write a `skipped` line** (the proof read of 09:21 is 39 minutes
  old); the first scheduled read is at 12:00 UTC (13:00 local), then every even UTC hour.
- The start is stored with its offset (`+01:00`), Task Scheduler's "synchronize across time zones": the reads stay
  on even UTC hours through daylight saving (local 13:00 becomes 14:00 in summer).
- node.exe's path is fixed at registration and it is a versioned folder (`c:\nodejs\v24.14.0\`): after a node
  upgrade into a new folder, re-run `register.ps1`, else every start fails (Last Result 65 from `run.vbs`).
- The service's daily leaders read (12:22 UTC, 53 requests) shares the data bucket; the 12:00 watch read ends about
  12:02:15, and even overlapping the two stay far under 200 a minute.
- `run.vbs` is VBScript: part of Windows 10; Windows 11 24H2 made it optional and Microsoft plans to remove it. If
  it goes, the README names the replacement (`conhost.exe --headless`).
- To check on it: `reads.jsonl`'s last lines, and `schtasks /Query … /V /FO LIST` (Last Result: 0 a read or a skip,
  2 a read ended early — the line's `stopped` says why —, 1 a crash). `node scripts/board/watch.mjs` by hand obeys the
  guard; `--no-guard` reads anyway.

## Commands run
- Reading: `ls`, `cat`, `head` of `docs/strategy/024/tools/fetch.mjs`, `lib.mjs`, its snapshot (`node -e` on the
  response shapes), `tasks/024-leaders.report.md`; `git status`, `git log -4`; `node --version`, `Get-Command node.exe`,
  the time zone, `Get-ExecutionPolicy -List`, G:'s drive type, cluster size and free space; `logs/status.json` (the
  service up since 07:39 UTC, not touched).
- Writing: the four files above; `sed` to make `register.ps1` ASCII and give `run.vbs` and `register.ps1` CRLF.
- `node --check scripts/board/watch.mjs` → OK.
- `node scripts/board/watch.mjs` (proof 1), then again (proof 2).
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\board\register.ps1`; `Get-ScheduledTask` settings.
- `… register.ps1 -NoGuard`; scratch `winwatch.ps1` (the hook, the control console, `schtasks /Run /TN "ArtifactsMMO
  board watch"`) in the background; scratch `tree.ps1` (Win32_Process + EnumWindows) during the run.
- `schtasks /Query /TN "ArtifactsMMO board watch" /FO LIST /V` (Last Result 0); `… register.ps1`;
  `schtasks /Query /TN "ArtifactsMMO board watch" /V /FO LIST` (proof 4).
- `node -e` over `logs/board/2026-11-24/0921Z/` (sizes by kind), `Win32_Volume` / `Win32_LogicalDisk` (proof 5).
- `git add tasks/026-board-watch.md tasks/026-board-watch.report.md scripts/board`, `git commit -m "026: board watch"`,
  `git push`.
