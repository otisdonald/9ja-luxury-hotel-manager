@echo off
echo Opening Hotel Admin Dashboard...
echo Please wait while the application loads...

:: Wait a moment for server to be ready
timeout /t 3 /nobreak >nul

:: Open the admin dashboard in default browser
start http://localhost:3001/admin.html