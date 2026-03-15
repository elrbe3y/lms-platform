#!/bin/bash

# Student Attendance System Launcher
# نظام إدارة حضور الطلاب

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║    نظام إدارة حضور الطلاب - Student Attendance     ║"
echo "║                  System v1.0                       ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Get application directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[*] Installing dependencies..."
    npm install
    echo ""
fi

# Kill any existing processes
echo "[*] Clearing previous instances..."
pkill -f "electron" 2>/dev/null
pkill -f "node" 2>/dev/null
sleep 2

# Start the application
echo "[*] Starting Student Attendance System..."
echo ""

npx electron .

if [ $? -eq 0 ]; then
    echo ""
    echo "[✓] Application closed successfully"
else
    echo ""
    echo "[!] Error: Failed to start the application"
    echo "[!] Please check the console output above"
fi
