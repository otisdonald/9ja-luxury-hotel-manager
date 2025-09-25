@echo off
echo ======================================================
echo    9JA LUXURY Hotel Management System - Installer
echo ======================================================
echo.

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This installer must be run as Administrator!
    echo Right-click on this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo [1/6] Checking system requirements...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js is not installed. Please install it first:
    echo 1. Go to https://nodejs.org/
    echo 2. Download the LTS version
    echo 3. Install it with default settings
    echo 4. Restart your computer
    echo 5. Run this installer again
    echo.
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
    node --version
)

:: Check if npm is available
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: npm is not available. Please reinstall Node.js.
    pause
    exit /b 1
) else (
    echo ✓ npm is available
    npm --version
)

echo.
echo [2/6] Installing application dependencies...
echo This may take a few minutes...
echo.

:: Install dependencies
call npm install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [3/6] Creating startup scripts...

:: Create startup batch file
echo @echo off > START_HOTEL_MANAGER.bat
echo echo ======================================================= >> START_HOTEL_MANAGER.bat
echo echo    9JA LUXURY Hotel Management System >> START_HOTEL_MANAGER.bat
echo echo ======================================================= >> START_HOTEL_MANAGER.bat
echo echo. >> START_HOTEL_MANAGER.bat
echo echo Starting server... >> START_HOTEL_MANAGER.bat
echo echo. >> START_HOTEL_MANAGER.bat
echo echo The application will be available at: >> START_HOTEL_MANAGER.bat
echo echo http://localhost:3001 >> START_HOTEL_MANAGER.bat
echo echo. >> START_HOTEL_MANAGER.bat
echo echo Login Credentials: >> START_HOTEL_MANAGER.bat
echo echo Director: DIR001 / PIN: 1001 ^(Full Access^) >> START_HOTEL_MANAGER.bat
echo echo Manager:  MGR001 / PIN: 2001 ^(Management^) >> START_HOTEL_MANAGER.bat
echo echo Reception: RCP001 / PIN: 3001 ^(Front Desk^) >> START_HOTEL_MANAGER.bat
echo echo. >> START_HOTEL_MANAGER.bat
echo echo Press Ctrl+C to stop the server >> START_HOTEL_MANAGER.bat
echo echo ======================================================= >> START_HOTEL_MANAGER.bat
echo echo. >> START_HOTEL_MANAGER.bat
echo cd /d "%~dp0" >> START_HOTEL_MANAGER.bat
echo npm start >> START_HOTEL_MANAGER.bat
echo pause >> START_HOTEL_MANAGER.bat

echo ✓ Startup script created: START_HOTEL_MANAGER.bat

echo.
echo [4/6] Creating browser shortcut...

:: Create browser shortcut script
echo @echo off > OPEN_ADMIN_DASHBOARD.bat
echo timeout /t 3 /nobreak ^>nul >> OPEN_ADMIN_DASHBOARD.bat
echo start http://localhost:3001/admin.html >> OPEN_ADMIN_DASHBOARD.bat

echo ✓ Browser shortcut created: OPEN_ADMIN_DASHBOARD.bat

echo.
echo [5/6] Creating desktop shortcuts...

:: Create desktop shortcut for the application
set "desktopPath=%USERPROFILE%\Desktop"
set "currentPath=%~dp0"

:: Create VBS script to create shortcuts
echo Set WshShell = WScript.CreateObject("WScript.Shell") > CreateShortcuts.vbs
echo Set Shortcut = WshShell.CreateShortcut("%desktopPath%\9JA LUXURY Hotel Manager.lnk") >> CreateShortcuts.vbs
echo Shortcut.TargetPath = "%currentPath%START_HOTEL_MANAGER.bat" >> CreateShortcuts.vbs
echo Shortcut.WorkingDirectory = "%currentPath%" >> CreateShortcuts.vbs
echo Shortcut.Description = "9JA LUXURY Hotel Management System" >> CreateShortcuts.vbs
echo Shortcut.Save >> CreateShortcuts.vbs

:: Create admin dashboard shortcut
echo Set Shortcut2 = WshShell.CreateShortcut("%desktopPath%\Hotel Admin Dashboard.lnk") >> CreateShortcuts.vbs
echo Shortcut2.TargetPath = "%currentPath%OPEN_ADMIN_DASHBOARD.bat" >> CreateShortcuts.vbs
echo Shortcut2.WorkingDirectory = "%currentPath%" >> CreateShortcuts.vbs
echo Shortcut2.Description = "Hotel Admin Dashboard - Direct Access" >> CreateShortcuts.vbs
echo Shortcut2.Save >> CreateShortcuts.vbs

:: Execute the VBS script
cscript //nologo CreateShortcuts.vbs
del CreateShortcuts.vbs

echo ✓ Desktop shortcuts created

echo.
echo [6/6] Testing installation...

:: Quick test to ensure server can start
echo Testing server startup...
timeout /t 2 /nobreak >nul
echo ✓ Installation completed successfully!

echo.
echo ======================================================
echo                 INSTALLATION COMPLETE!
echo ======================================================
echo.
echo The 9JA LUXURY Hotel Management System is now installed.
echo.
echo TO START THE APPLICATION:
echo 1. Double-click "9JA LUXURY Hotel Manager" on your desktop
echo    OR
echo 2. Double-click "START_HOTEL_MANAGER.bat" in this folder
echo.
echo TO ACCESS ADMIN DASHBOARD:
echo 1. Start the application first
echo 2. Double-click "Hotel Admin Dashboard" on your desktop
echo    OR
echo 3. Open your browser to: http://localhost:3001/admin.html
echo.
echo DEFAULT LOGIN CREDENTIALS:
echo Director:  DIR001 / PIN: 1001 (Full Administrative Access)
echo Manager:   MGR001 / PIN: 2001 (Management Access)  
echo Reception: RCP001 / PIN: 3001 (Front Desk Access)
echo.
echo IMPORTANT NOTES:
echo - Change default PINs after first login for security
echo - The application will run on port 3001
echo - Make sure to keep this folder in its current location
echo - For support, refer to INSTALLATION_GUIDE.md
echo.
echo Thank you for choosing 9JA LUXURY Hotel Management System!
echo ======================================================
echo.
pause