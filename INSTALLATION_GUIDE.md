# 9JA LUXURY Hotel Management System - Installation Guide

## System Requirements
- **Operating System**: Windows 10/11 (64-bit)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: At least 1GB free space
- **Internet**: Required for MongoDB Atlas connection
- **Administrator Access**: Required for initial installation

## Quick Installation (Recommended)

### Option 1: Automated Installation
1. Copy the entire `9JA-LUXURY-Hotel-Manager` folder to the desired location (e.g., `C:\Hotels\`)
2. Right-click on `INSTALL.bat` and select "Run as Administrator"
3. Follow the on-screen prompts
4. Launch the application using the desktop shortcut created

### Option 2: Manual Installation

#### Step 1: Install Node.js
1. Download Node.js from: https://nodejs.org/
2. Choose "LTS" version (Long Term Support)
3. Run the installer and follow the setup wizard
4. **Important**: Check "Add to PATH" during installation
5. Restart your computer after installation

#### Step 2: Verify Installation
1. Press `Win + R`, type `cmd`, press Enter
2. Type `node --version` and press Enter
3. Type `npm --version` and press Enter
4. Both commands should show version numbers

#### Step 3: Install Hotel Management System
1. Copy the `9JA-LUXURY-Hotel-Manager` folder to your desired location
2. Open Command Prompt as Administrator
3. Navigate to the hotel manager folder:
   ```cmd
   cd "C:\path\to\9JA-LUXURY-Hotel-Manager"
   ```
4. Install dependencies:
   ```cmd
   npm install
   ```

#### Step 4: Start the Application
1. In the same command prompt, run:
   ```cmd
   npm start
   ```
2. Open your web browser and go to: http://localhost:3001
3. Use these credentials to log in:
   - **Director**: DIR001 / PIN: 1001 (Full Admin Access)
   - **Manager**: MGR001 / PIN: 2001 (Management Access)
   - **Reception**: RCP001 / PIN: 3001 (Front Desk Access)

## Creating Desktop Shortcuts

### Application Shortcut
1. Right-click on Desktop → New → Shortcut
2. Location: `C:\path\to\9JA-LUXURY-Hotel-Manager\START_HOTEL_MANAGER.bat`
3. Name: "9JA LUXURY Hotel Manager"

### Admin Dashboard Shortcut
1. Right-click on Desktop → New → Shortcut
2. Location: `http://localhost:3001/admin.html`
3. Name: "Hotel Admin Dashboard"

## Auto-Start on Windows Boot (Optional)

### Method 1: Startup Folder
1. Press `Win + R`, type `shell:startup`, press Enter
2. Copy `START_HOTEL_MANAGER.bat` to this folder
3. The application will start automatically when Windows boots

### Method 2: Windows Service (Advanced)
1. Install PM2 globally: `npm install -g pm2`
2. Install PM2 Windows Service: `npm install -g pm2-windows-service`
3. Setup service: `pm2-service-install`
4. Start your app: `pm2 start server.js --name "hotel-manager"`
5. Save configuration: `pm2 save`

## Troubleshooting

### Port Already in Use Error
```bash
Error: listen EADDRINUSE: address already in use :::3001
```
**Solution**:
1. Open Task Manager (Ctrl + Shift + Esc)
2. Find any "node.exe" or "electron.exe" processes
3. End these processes
4. Restart the application

### Node.js Not Found
```bash
'node' is not recognized as an internal or external command
```
**Solution**:
1. Reinstall Node.js from https://nodejs.org/
2. Ensure "Add to PATH" is checked during installation
3. Restart your computer
4. Try again

### Database Connection Issues
```bash
MongoDB connection failed
```
**Solution**:
1. Check internet connection
2. Verify MongoDB Atlas credentials in `.env` file
3. The system has fallback data, so it will work offline with limited features

### Browser Won't Open
**Solution**:
1. Manually open your browser
2. Go to: http://localhost:3001
3. Bookmark this page for easy access

### Permission Denied Error
**Solution**:
1. Right-click Command Prompt → "Run as Administrator"
2. Navigate to the hotel folder
3. Try the installation again

## Configuration

### Changing the Port
1. Open the `.env` file in the installation folder
2. Change `PORT=3001` to your desired port (e.g., `PORT=8080`)
3. Restart the application
4. Access via the new port: http://localhost:8080

### Adding Staff Members
1. Log in as Director (DIR001/1001)
2. Go to Staff Management
3. Add new staff with personal IDs and PINs

## Backup and Data

### Database Backup
- Data is stored in MongoDB Atlas (cloud)
- Automatic backups are handled by Atlas
- Local fallback data ensures operation during connectivity issues

### Application Updates
1. Stop the current application
2. Replace files with new version (keep `.env` file)
3. Run `npm install` to update dependencies
4. Restart the application

## Security Notes

- **Default Credentials**: Change default PINs after installation
- **Network Access**: Application runs on local network by default
- **Admin Access**: Only DIR001 has full administrative privileges
- **Data Encryption**: All sensitive data is encrypted in transit

## Support and Maintenance

### Regular Maintenance
- **Daily**: Check logs for any errors
- **Weekly**: Verify database connectivity
- **Monthly**: Update Node.js and dependencies if needed

### Getting Help
- Check the troubleshooting section above
- Review application logs in the command prompt window
- Contact your system administrator for technical issues

---

## Quick Start Summary
1. Install Node.js from https://nodejs.org/
2. Copy hotel manager folder to desired location
3. Open Command Prompt as Administrator
4. Run: `cd "path\to\hotel\folder"`
5. Run: `npm install`
6. Run: `npm start`
7. Open browser: http://localhost:3001
8. Login: DIR001 / 1001

**The system is now ready to use!**