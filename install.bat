@echo off
cls
echo.
echo    ================================================
echo    ===                                          ===
echo    ===   Mohamed Rabiei LMS Platform          ===
echo    ===                                          ===
echo    ===        Quick Installation Wizard        ===
echo    ===                                          ===
echo    ================================================
echo.
echo.

timeout /t 2 >nul

:: Step 1: Check Node.js
echo [1/5] Checking system requirements...
echo.
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Recommended: LTS version (v18 or newer)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%
echo.
timeout /t 1 >nul

:: Step 2: Install packages
echo [2/5] Installing required packages...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installation failed
    pause
    exit /b 1
)
echo [OK] Packages installed
echo.
timeout /t 1 >nul

:: Step 3: Setup environment file
echo [3/5] Setting up environment file (.env)...
echo.
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
    ) else (
        (
            echo DATABASE_URL="postgresql://lms_user:password@localhost:5432/mohamed_rabiei_lms"
            echo JWT_SECRET="change-this-to-random-string"
            echo VIDEO_SIGNING_SECRET="another-random-string"
            echo NEXT_PUBLIC_APP_URL="http://localhost:3000"
        ) > .env
    )
    echo [OK] .env file created
    echo [WARNING] Please edit it after installation
) else (
    echo [INFO] .env file already exists
)
echo.
timeout /t 1 >nul

:: Step 4: Database setup
echo [4/5] Database setup...
echo.
echo Do you want to setup the database now? (Y/N)
echo (Make sure PostgreSQL is running first)
set /p SETUP_DB=
if /i "%SETUP_DB%"=="Y" (
    echo.
    echo Applying Schema...
    call npm run db:push
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Database setup complete
        echo.
        echo Do you want to add seed data? (Y/N)
        set /p SEED=
        if /i "!SEED!"=="Y" (
            call npm run db:seed
            echo [OK] Seed data added
        )
    ) else (
        echo [WARNING] Database setup failed
        echo You can setup it later by running: npm run db:push
    )
) else (
    echo [SKIPPED] Database setup skipped
)
echo.
timeout /t 1 >nul

:: Step 5: Complete
echo [5/5] Installation complete!
echo.
echo    ================================================
echo    ===         Installation Successful!         ===
echo    ================================================
echo.
echo [INFO] Next steps:
echo.
echo   1. Edit .env and add your configuration
echo   2. Run the project: start.bat
echo   3. Open http://localhost:3000
echo.
echo [INFO] Useful documentation:
echo   - Admin Guide: ADMIN_GUIDE.md
echo   - Security: SECURITY.md
echo   - Quick Start: QUICKSTART.md
echo.
echo [INFO] Quick commands:
echo   start.bat      - Run the project
echo   db-studio.bat  - Database management
echo   build.bat      - Build for production
echo.
pause
