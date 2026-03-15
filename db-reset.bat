@echo off
echo ========================================
echo DATABASE RESET - WARNING
echo ========================================
echo.

echo *** DANGEROUS WARNING! ***
echo.
echo This command will:
echo   1. Delete ALL data
echo   2. Drop ALL tables
echo   3. Recreate database from scratch
echo.
echo Are you sure? (Type YES in uppercase to continue)
set /p CONFIRM=

if not "%CONFIRM%"=="YES" (
    echo.
    echo [CANCELLED] Operation cancelled
    pause
    exit /b 0
)

echo.
echo [INFO] Resetting database...
echo.

call npx prisma migrate reset --force
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Reset failed
    pause
    exit /b 1
)

echo.
echo [OK] Database reset complete
echo.

echo Do you want to add seed data? (Y/N)
set /p SEED=
if /i "%SEED%"=="Y" (
    echo.
    call npm run db:seed
    echo.
    echo [OK] Seed data added
)

echo.
pause
