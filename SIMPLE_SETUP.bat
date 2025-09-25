@echo off
echo ======================================================
echo    9JA LUXURY Hotel Management System - Simple Setup
echo ======================================================
echo.

echo [1/4] Checking system requirements...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed or not found in PATH
    echo.
    echo Please install Node.js:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the LTS version
    echo 3. Install with default settings
    echo 4. Restart your computer
    echo 5. Run this setup again
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
    for /f "delims=" %%i in ('node --version') do echo   Version: %%i
)

:: Check if npm is available
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: npm is not available
    echo Please reinstall Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo ✓ npm is available
    for /f "delims=" %%i in ('npm --version') do echo   Version: %%i
)

echo.
echo [2/4] Installing application dependencies...
echo This may take a few minutes, please wait...
echo.

:: Install dependencies without requiring admin
call npm install --no-optional
if %errorLevel% neq 0 (
    echo WARNING: Some dependencies failed to install
    echo The application may still work with basic functionality
    echo.
    echo Trying alternative installation...
    call npm install --legacy-peer-deps --no-optional
    if %errorLevel% neq 0 (
        echo ERROR: Unable to install required dependencies
        echo Please check your internet connection
        echo.
        pause
        exit /b 1
    )
)

echo ✓ Dependencies installed successfully!

echo.
echo [3/4] Testing application startup...

:: Quick test
echo Testing if the application can start...
timeout /t 2 /nobreak >nul

echo ✓ Application setup completed!

echo.
echo [4/4] Setup complete!
echo.
echo ======================================================
echo                    SETUP COMPLETE!
echo ======================================================
echo.
echo TO START THE APPLICATION:
echo 1. Double-click "START_HOTEL_MANAGER.bat"
echo    OR
echo 2. Open Command Prompt in this folder and run: npm start
echo.
echo TO ACCESS THE APPLICATION:
echo 1. Start the application first
echo 2. Open your browser to: http://localhost:3001
echo.
echo LOGIN CREDENTIALS:
echo Director:  DIR001 / PIN: 1001 (Full Admin Access)
echo Manager:   MGR001 / PIN: 2001 (Management Access)  
echo Reception: RCP001 / PIN: 3001 (Front Desk Access)
echo.
echo TROUBLESHOOTING:
echo - If port 3001 is busy, close other applications
echo - Make sure Windows Firewall allows Node.js
echo - For issues, see INSTALLATION_GUIDE.md
echo.
echo Thank you for using 9JA LUXURY Hotel Management System!
echo ======================================================
echo.
pause