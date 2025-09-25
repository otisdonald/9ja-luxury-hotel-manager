@echo off
echo Opening Hotel Staff Login...
echo Please wait while the application loads...

:: Wait a moment for server to be ready  
timeout /t 3 /nobreak >nul

:: Open the staff login in default browser
start http://localhost:3001/staff-login.html