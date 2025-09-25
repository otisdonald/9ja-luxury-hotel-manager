# Manual Installation Steps for 9JA LUXURY Hotel Management System

## If automated installers don't work, follow these manual steps:

### Step 1: Verify Node.js Installation
Open Command Prompt or PowerShell and run:
```
node --version
npm --version
```
Both should return version numbers. If not, install Node.js from https://nodejs.org/

### Step 2: Install Dependencies
In the hotel manager folder, run:
```
npm install
```

If that fails, try:
```
npm install --no-optional
```

If still failing, try:
```
npm install --legacy-peer-deps --no-optional
```

### Step 3: Start the Application
Run one of these commands:
```
npm start
```
OR
```
node server.js
```

### Step 4: Access the Application
Open your browser and go to:
```
http://localhost:3001
```

### Step 5: Login
Use these credentials:
- Director: DIR001 / PIN: 1001
- Manager: MGR001 / PIN: 2001  
- Reception: RCP001 / PIN: 3001

## Alternative: Manual Dependency Installation

If npm install keeps failing, you can try installing key dependencies individually:

```
npm install express --save
npm install body-parser --save
npm install cors --save
npm install dotenv --save
npm install mongodb --save
npm install mongoose --save
npm install jsonwebtoken --save
npm install bcryptjs --save
```

## Common Issues and Solutions:

### Issue: "Port 3001 already in use"
**Solution**: 
1. Open Task Manager
2. End any node.exe or electron.exe processes
3. Try starting again

### Issue: "Cannot find module"
**Solution**:
1. Delete node_modules folder
2. Delete package-lock.json file  
3. Run `npm install` again

### Issue: "Permission denied"
**Solution**:
1. Run Command Prompt as Administrator
2. Or move the hotel folder to a location you have full access to (like Desktop)

### Issue: "Network error during install" 
**Solution**:
1. Check internet connection
2. Try: `npm install --registry https://registry.npmjs.org/`
3. Or try: `npm cache clean --force` then `npm install`

## Verify Installation Success:

1. You should see: "🏨 Hotel Manager Server running on port 3001"
2. Browser should load the hotel management interface
3. You can login with the provided credentials
4. All tabs (Rooms, Customers, Bar, Kitchen) should be accessible

If you're still having issues, the problem might be:
- Antivirus blocking Node.js
- Corporate firewall blocking npm
- Windows permissions issues
- Corrupted Node.js installation

Try running the application on a different computer to confirm the files are working correctly.