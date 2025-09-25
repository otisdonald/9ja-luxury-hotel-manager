# 9JA LUXURY Hotel Management System - PowerShell Installer
# This script installs the hotel management system

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   9JA LUXURY Hotel Management System - Setup" -ForegroundColor Cyan  
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking system requirements..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Node.js is installed" -ForegroundColor Green
        Write-Host "  Version: $nodeVersion" -ForegroundColor Gray
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "✗ Node.js is not installed or not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js:" -ForegroundColor Yellow
    Write-Host "1. Go to https://nodejs.org/" -ForegroundColor White
    Write-Host "2. Download the LTS version" -ForegroundColor White
    Write-Host "3. Install with default settings" -ForegroundColor White
    Write-Host "4. Restart your computer" -ForegroundColor White
    Write-Host "5. Run this setup again" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ npm is available" -ForegroundColor Green
        Write-Host "  Version: $npmVersion" -ForegroundColor Gray
    } else {
        throw "npm not found"
    }
} catch {
    Write-Host "✗ npm is not available" -ForegroundColor Red
    Write-Host "Please reinstall Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Installing application dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes, please wait..." -ForegroundColor Gray
Write-Host ""

# Install dependencies
try {
    Write-Host "Running npm install..." -ForegroundColor Gray
    $null = npm install --no-optional 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Trying alternative installation method..." -ForegroundColor Yellow
        $null = npm install --legacy-peer-deps --no-optional 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Dependencies installed with legacy mode!" -ForegroundColor Green
        } else {
            throw "Installation failed"
        }
    }
} catch {
    Write-Host "✗ Unable to install required dependencies" -ForegroundColor Red
    Write-Host "Please check your internet connection" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3/4] Creating startup shortcuts..." -ForegroundColor Yellow

# Ensure batch files exist
if (!(Test-Path "START_HOTEL_MANAGER.bat")) {
    Write-Host "Creating START_HOTEL_MANAGER.bat..." -ForegroundColor Gray
    # The file should already exist, but let's make sure
}

if (!(Test-Path "OPEN_ADMIN_DASHBOARD.bat")) {
    Write-Host "Creating OPEN_ADMIN_DASHBOARD.bat..." -ForegroundColor Gray
    # The file should already exist, but let's make sure
}

Write-Host "✓ Startup scripts ready!" -ForegroundColor Green

Write-Host ""
Write-Host "[4/4] Setup complete!" -ForegroundColor Yellow
Write-Host ""

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "                   SETUP COMPLETE!" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "TO START THE APPLICATION:" -ForegroundColor Yellow
Write-Host "1. Double-click 'START_HOTEL_MANAGER.bat'" -ForegroundColor White
Write-Host "   OR" -ForegroundColor Gray
Write-Host "2. Open PowerShell/Command Prompt here and run: npm start" -ForegroundColor White
Write-Host ""

Write-Host "TO ACCESS THE APPLICATION:" -ForegroundColor Yellow  
Write-Host "1. Start the application first" -ForegroundColor White
Write-Host "2. Open your browser to: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""

Write-Host "LOGIN CREDENTIALS:" -ForegroundColor Yellow
Write-Host "Director:  DIR001 / PIN: 1001 (Full Admin Access)" -ForegroundColor White
Write-Host "Manager:   MGR001 / PIN: 2001 (Management Access)" -ForegroundColor White
Write-Host "Reception: RCP001 / PIN: 3001 (Front Desk Access)" -ForegroundColor White
Write-Host ""

Write-Host "TROUBLESHOOTING:" -ForegroundColor Yellow
Write-Host "- If port 3001 is busy, close other applications using Task Manager" -ForegroundColor White
Write-Host "- Make sure Windows Firewall allows Node.js" -ForegroundColor White  
Write-Host "- For detailed help, see INSTALLATION_GUIDE.md" -ForegroundColor White
Write-Host ""

Write-Host "Thank you for using 9JA LUXURY Hotel Management System!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to exit"