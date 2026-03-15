#!/usr/bin/env powershell
# Student Attendance System Launcher
# نظام إدارة حضور الطلاب

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    نظام إدارة حضور الطلاب - Student Attendance     ║" -ForegroundColor Cyan
Write-Host "║                  System v1.0                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get application directory
$appPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $appPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Kill any existing processes
Write-Host "[*] Clearing previous instances..." -ForegroundColor Yellow
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start the application
Write-Host "[*] Starting Student Attendance System..." -ForegroundColor Green
Write-Host ""

try {
    npx electron .
    Write-Host ""
    Write-Host "[✓] Application closed successfully" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "[!] Error: Failed to start the application" -ForegroundColor Red
    Write-Host "[!] Error Details: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
