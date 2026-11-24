# Task 026: registers (or replaces) the scheduled task "ArtifactsMMO board watch" for the current user, or removes it.
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\board\register.ps1            # register / re-register
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\board\register.ps1 -Remove    # remove it
#   ... register.ps1 -NoGuard   the same task with --no-guard: every run reads. For a one-off test only - register
#                               again without it right after.
# Every 2 hours from the next even UTC hour (given as local time with its offset); run as soon as possible after a
# missed start; starts and keeps running on battery; stopped after 15 minutes; a second instance is not started while
# one runs. Runs as the logged-on user (Interactive: only while that user is logged on), not elevated. The action is
# wscript.exe running run.vbs (no window), the working directory the project root, node.exe's full path resolved now -
# so re-register after node moves (a new node version in another folder).
param([switch]$Remove, [switch]$NoGuard)
$ErrorActionPreference = 'Stop'
$Name = 'ArtifactsMMO board watch'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $Name -Confirm:$false
  "removed: $Name"
  return
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$vbs = Join-Path $PSScriptRoot 'run.vbs'
$node = (Get-Command node.exe -CommandType Application | Select-Object -First 1).Source
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
$utc = [DateTime]::UtcNow
$at = $utc.Date.AddHours(2 * [Math]::Floor($utc.Hour / 2) + 2).ToLocalTime()   # the next even UTC hour, local
$arg = "//B //NoLogo `"$vbs`" `"$node`""
if ($NoGuard) { $arg += ' --no-guard' }

$action = New-ScheduledTaskAction -Execute $wscript -Argument $arg -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Once -At $at -RepetitionInterval (New-TimeSpan -Hours 2)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType Interactive -RunLevel Limited
$description = 'Task 026: a public read of the ArtifactsMMO leaderboard and its leading accounts every 2 hours ' +
  '(scripts/board/watch.mjs; gzipped bodies under logs/board/). Re-register with scripts/board/register.ps1.'
Register-ScheduledTask -TaskName $Name -Description $description -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

$t = Get-ScheduledTask -TaskName $Name
"registered: $Name"
"  action:    $($t.Actions[0].Execute) $($t.Actions[0].Arguments)"
"  directory: $($t.Actions[0].WorkingDirectory)"
"  first run: $($t.Triggers[0].StartBoundary) (local; $($at.ToUniversalTime().ToString('yyyy-MM-dd HH:mm')) UTC), every $($t.Triggers[0].Repetition.Interval)"
