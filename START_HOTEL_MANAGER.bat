@echo off
echo ===============================================
echo    9JA LUXURY Hotel Management System
echo ===============================================
echo.
echo Starting server...
echo.
echo The application will be available at:
echo http://localhost:3001
echo.
echo Login Credentials:
echo Director: DIR001 / PIN: 1001 (Full Access)
echo Manager:  MGR001 / PIN: 2001 (Management)
echo Reception: RCP001 / PIN: 3001 (Front Desk)
echo.
echo Press Ctrl+C to stop the server
echo ===============================================
echo.

:: Change to script directory
cd /d "%~dp0"

:: Start the Node.js server
npm start

:: Keep window open if server stops
pause