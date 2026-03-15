@echo off
echo ========================================
echo Mohamed Rabiei LMS - SETUP
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed
    echo.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js: 
node --version
echo.

:: Copy .env file
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Copying .env.example...
        copy .env.example .env
        echo [OK] .env file created
        echo.
    ) else (
        echo [WARNING] .env.example not found
        echo Creating default .env file...
        (
            echo # Mohamed Rabiei LMS - Environment Variables
            echo.
            echo # Database
            echo DATABASE_URL="postgresql://lms_user:password@localhost:5432/mohamed_rabiei_lms"
            echo.
            echo # JWT
            echo JWT_SECRET="change-this-to-random-string-in-production"
            echo VIDEO_SIGNING_SECRET="another-random-string-for-video-security"
            echo.
            echo # Application
            echo NEXT_PUBLIC_APP_URL="http://localhost:3000"
            echo NODE_ENV="development"
        ) > .env
        echo [OK] .env file created
        echo.
    )
    echo [WARNING] Please edit .env and add your configuration
    echo.
    pause
)

:: Install packages
echo [INFO] Installing packages...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Package installation failed
    pause
    exit /b 1
)
echo.
echo [OK] Packages installed successfully
echo.

:: Setup database
echo [INFO] Database setup...
echo.
echo Are you ready to setup the database? (Y/N)
echo Note: Make sure PostgreSQL is running first
set /p SETUP_DB=
if /i "%SETUP_DB%"=="Y" (
    echo.
    echo Applying Schema to database...
    call npm run db:push
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Database setup failed
        echo Make sure:
        echo   1. PostgreSQL is running
        echo   2. DATABASE_URL is correct in .env
        pause
        exit /b 1
    )
    echo.
    echo [OK] Database setup complete
    echo.
    
    :: Add seed data
    echo Do you want to add seed data? (Y/N)
    set /p SEED_DB=
    if /i "%SEED_DB%"=="Y" (
        echo.
        echo Adding seed data...
        call npm run db:seed
        echo.
        echo [OK] Seed data added
        echo.
        echo [INFO] Login credentials:
        echo    Admin: admin@mohamed-rabiei.com / admin123456
        echo    Student: student@example.com / student123
        echo.
    )
)

echo.
echo ========================================
echo [SUCCESS] Setup Complete!
echo ========================================
echo.
echo To start: Run start.bat
echo.
pause
