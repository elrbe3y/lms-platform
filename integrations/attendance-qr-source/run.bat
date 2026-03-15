@echo off
chcp 65001 >nul
cls
echo.
echo ╔════════════════════════════════════════════════════╗
echo ║    نظام إدارة حضور الطلاب - Student Attendance     ║
echo ║                  System v1.0                       ║
echo ╚════════════════════════════════════════════════════╝
echo.

REM Change to application directory
cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
    echo.
)

REM Kill any existing Node/Electron processes
echo [*] Clearing previous instances...
powershell -Command "Get-Process electron,node,chrome -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1
echo [*] Waiting for ports to be released (10 seconds)...
timeout /t 10 /nobreak >nul 2>&1

REM Start the server in background
echo [*] Starting WhatsApp Server...
start /B node server.js
echo [*] Waiting for server to initialize (7 seconds)...
timeout /t 7 /nobreak >nul 2>&1

REM Start the application
echo [*] Starting Student Attendance System...
echo.

npx electron .

REM Clean up server process on exit
echo [*] Stopping background server...
powershell -Command "Get-Process node,chrome -ErrorAction SilentlyContinue | Stop-Process -Force" >nul 2>&1

if errorlevel 1 (
    echo.
    echo [!] Error: Failed to start the application
    echo [!] Please check the console output above
    pause
) else (
    echo.
    echo [✓] Application closed successfully
)