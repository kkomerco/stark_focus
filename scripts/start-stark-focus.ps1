param(
    [ValidateRange(1, 65535)]
    [int]$Port = 3000,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
# Keep the address used by the existing Windows launcher: browser data belongs to this origin.
$appUrl = "http://localhost:$Port"
$probeUrl = "http://127.0.0.1:$Port"
$logDirectory = Join-Path $projectDirectory 'logs'
$mutex = New-Object System.Threading.Mutex($false, "Local\StarkFocusLauncher-$Port")
$ownsMutex = $false
$previousHost = $env:HOST
$previousPort = $env:PORT

function Test-StarkFocusReady {
    try {
        $health = Invoke-RestMethod -Uri "$probeUrl/api/health" -TimeoutSec 2
        if ($health.status -ne 'ok') { return $false }
        $page = Invoke-WebRequest -Uri $probeUrl -UseBasicParsing -TimeoutSec 2
        return $page.Content.Contains('<title>Stark Focus OS</title>')
    } catch {
        return $false
    }
}

try {
    try {
        $ownsMutex = $mutex.WaitOne(60000)
    } catch [System.Threading.AbandonedMutexException] {
        $ownsMutex = $true
    }
    if (-not $ownsMutex) {
        throw 'Poprzednie uruchomienie jeszcze trwa. Sprobuj ponownie za chwile.'
    }

    if (-not (Test-StarkFocusReady)) {
        $connection = New-Object System.Net.Sockets.TcpClient
        try {
            $portInUse = $connection.ConnectAsync('127.0.0.1', $Port).Wait(500)
        } catch {
            $portInUse = $false
        } finally {
            $connection.Dispose()
        }
        if ($portInUse) {
            throw "Port $Port jest zajety przez inny serwer. Zamknij go i kliknij skrot ponownie."
        }

        $node = Get-Command node.exe -ErrorAction SilentlyContinue
        if (-not $node) { throw 'Nie znaleziono Node.js. Zainstaluj Node.js i sprobuj ponownie.' }
        $tsx = Join-Path $projectDirectory 'node_modules/tsx/dist/cli.mjs'
        if (-not (Test-Path -LiteralPath $tsx)) {
            throw "Brak zaleznosci. Uruchom npm install w katalogu $projectDirectory."
        }

        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $env:HOST = '127.0.0.1'
        $env:PORT = "$Port"
        $server = Start-Process -FilePath $node.Source -ArgumentList @('"' + $tsx + '"', 'server.ts') `
            -WorkingDirectory $projectDirectory -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $logDirectory 'stark-focus.stdout.log') `
            -RedirectStandardError (Join-Path $logDirectory 'stark-focus.stderr.log')

        $deadline = [DateTime]::UtcNow.AddSeconds(45)
        $ready = $false
        do {
            if ($server.HasExited) {
                throw "Serwer nie wystartowal. Szczegoly: $logDirectory\stark-focus.stderr.log"
            }
            $ready = Test-StarkFocusReady
            if ($ready) { break }
            Start-Sleep -Milliseconds 300
        } while ([DateTime]::UtcNow -lt $deadline)

        if (-not $ready) {
            throw "Serwer nie jest jeszcze gotowy. Sprawdz logi w $logDirectory i kliknij skrot ponownie."
        }
    }

    if (-not $NoBrowser) { Start-Process $appUrl }
    Write-Output "Stark Focus jest gotowy: $appUrl"
} catch {
    $message = $_.Exception.Message
    Write-Output "Nie udalo sie uruchomic Stark Focus: $message"
    if (-not $NoBrowser) {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show($message, 'Stark Focus', 'OK', 'Error') | Out-Null
    }
    exit 1
} finally {
    $env:HOST = $previousHost
    $env:PORT = $previousPort
    if ($ownsMutex) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
