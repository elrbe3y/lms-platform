@echo off
setlocal
cd /d "%~dp0"

set "NODE_BIN="
set "NPM_BIN="

if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE_BIN=%ProgramFiles%\nodejs\node.exe"
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  set "NODE_BIN=%ProgramFiles(x86)%\nodejs\node.exe"
)

if exist "%ProgramFiles%\nodejs\npm.cmd" (
  set "NPM_BIN=%ProgramFiles%\nodejs\npm.cmd"
)
if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" (
  set "NPM_BIN=%ProgramFiles(x86)%\nodejs\npm.cmd"
)

if not "%NODE_BIN%"=="" set "PATH=%PATH%;%~dp0;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs"

echo ========================================
echo LMS - Run Script
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  if not "%NODE_BIN%"=="" (
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs"
  ) else (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Install from: https://nodejs.org/
    pause
    exit /b 1
  )
)

where npm >nul 2>nul
if errorlevel 1 (
  if not "%NPM_BIN%"=="" (
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs"
  ) else (
    echo [ERROR] npm is not available in PATH.
    echo Reinstall Node.js LTS and reopen terminal.
    pause
    exit /b 1
  )
)

if not exist ".env" (
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [INFO] .env created from .env.example
    echo [WARNING] Edit .env with your DB settings, then run again.
    pause
    exit /b 0
  ) else (
    echo [ERROR] Missing .env and .env.example
    pause
    exit /b 1
  )
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo [INFO] Starting development server...
echo URL: http://localhost:3000
echo Stop: Ctrl+C
echo.
call npm run dev
