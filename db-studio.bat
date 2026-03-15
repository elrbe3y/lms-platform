@echo off
echo ========================================
echo Prisma Studio - Database Management
echo ========================================
echo.

:: Check .env
if not exist ".env" (
    echo [ERROR] .env file not found
    echo Please run setup.bat first
    pause
    exit /b 1
)

echo [INFO] Opening Prisma Studio...
echo.
echo Available at: http://localhost:5555
echo.
echo To close: Press Ctrl+C
echo ========================================
echo.

call npm run db:studio
