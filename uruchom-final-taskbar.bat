@echo off
title Visionary Lab - TASKBAR FINAL
cd /d "C:\Users\kamil\Desktop\visionary-media-lab-main"
echo ========================================
echo  Uruchamiam z PASKA ZADAN
echo  %date% %time%
echo  Katalog: %CD%
echo ========================================

if not exist "node_modules" (
  echo Instaluje node_modules...
  call npm i
)

:: Znajdz Chrome
set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=chrome"

echo Chrome: %CHROME%
echo.

:: Backend - zostaje otwarte okno
echo [1/2] Backend :3001...
start "BACKEND :3001" cmd /k "cd /d C:\Users\kamil\Desktop\visionary-media-lab-main && echo Backend w %CD% && npx tsx server.ts || (echo BLAD BACKENDU & pause)"

:: Chrome jako karta
echo [2/2] Frontend :8080 + Chrome karta...
start /B cmd /C "timeout /t 4 /nobreak >nul && echo Otwieram Chrome... && start """" "%CHROME%" http://localhost:8080"

:: Frontend - TO okno musi zostac otwarte
call npm run dev

echo.
echo ===== ZAKONCZONO Z BLEDEM =====
echo Sprawdz log wyzej
pause
