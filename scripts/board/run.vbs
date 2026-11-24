' Task 026: starts watch.mjs with no window. The scheduled task's action (register.ps1 writes it):
'   wscript.exe //B //NoLogo "<project>\scripts\board\run.vbs" "<full path of node.exe>" [--no-guard]
' wscript.exe is a GUI program (no console of its own); WScript.Shell.Run with window style 0 starts node with its console
' hidden, and True waits for it, so the task's 15-minute limit and its last result follow the run. //B: no error dialog.
Option Explicit
Dim sh, fso, here, root, cmd, i, rc
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
If WScript.Arguments.Count < 1 Then WScript.Quit 64
here = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(fso.GetParentFolderName(here))
sh.CurrentDirectory = root
cmd = """" & WScript.Arguments(0) & """ """ & here & "\watch.mjs"""
For i = 1 To WScript.Arguments.Count - 1
  cmd = cmd & " " & WScript.Arguments(i)
Next
On Error Resume Next
rc = sh.Run(cmd, 0, True)
If Err.Number <> 0 Then WScript.Quit 65
WScript.Quit rc
