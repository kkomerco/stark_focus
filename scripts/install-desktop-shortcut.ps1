param(
    [string]$DesktopDirectory = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot 'start-stark-focus.ps1'
$shortcutPath = Join-Path $DesktopDirectory 'Stark Focus.lnk'
$powershell = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'

if (-not (Test-Path -LiteralPath $DesktopDirectory -PathType Container)) {
    throw "Nie znaleziono pulpitu: $DesktopDirectory"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
if ((Test-Path -LiteralPath $shortcutPath) -and -not $shortcut.Arguments.Contains($launcher)) {
    throw 'Skrot Stark Focus juz istnieje i wskazuje inna aplikacje. Nie zostal zmieniony.'
}
$shortcut.TargetPath = $powershell
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcher`""
$shortcut.WorkingDirectory = $projectDirectory
$shortcut.Description = 'Uruchom lokalne studio Stark Focus'
$shortcut.WindowStyle = 7
$shortcut.IconLocation = (Join-Path $projectDirectory 'public/brand/stark-focus.ico') + ',0'
$shortcut.Save()
Write-Output "Utworzono skrot: $shortcutPath"
