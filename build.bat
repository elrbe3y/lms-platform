@echo off
echo ========================================
echo Mohamed Rabiei LMS - BUILD
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    pause
    exit /b 1
)

:: Check .env
if not exist ".env" (
    echo [ERROR] .env file not found
    echo Please run setup.bat first
    pause
    exit /b 1
)

:: Generate Prisma Client
echo [INFO] Generating Prisma Client...
call npm run db:generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Prisma Client generation failed
    pause
    exit /b 1
)
echo [OK] Prisma Client generated
echo.

:: Build
echo [INFO] Building project...
echo.
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo [SUCCESS] Build complete!
echo ========================================
echo.
echo To run in production mode:
echo   npm start
echo.
pause
