@echo off
echo ========================================
echo Mohamed Rabiei LMS Platform
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

echo [OK] Node.js installed: 
node --version
echo.

:: Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found
    echo.
    if exist ".env.example" (
        echo Do you want to copy .env.example to .env? (Y/N)
        set /p COPY_ENV=
        if /i "%COPY_ENV%"=="Y" (
            copy .env.example .env
            echo [OK] .env.example copied
            echo.
            echo [WARNING] Please edit .env and add your configuration
            pause
            exit /b 0
        )
    ) else (
        echo [ERROR] .env.example not found
        pause
        exit /b 1
    )
)

:: Check node_modules
if not exist "node_modules" (
    echo [INFO] Installing packages...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Installation failed
        pause
        exit /b 1
    )
    echo.
    echo [OK] Packages installed successfully
    echo.
)

:: Start the project
echo [INFO] Starting Mohamed Rabiei LMS Platform...
echo.
echo Open browser at: http://localhost:3000
echo.
echo To stop: Press Ctrl+C
echo ========================================
echo.

npm run dev
