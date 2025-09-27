const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');

// Keep a global reference of the window object
let mainWindow;
let server;

function createWindow() {
    // Detect if running in packaged app
    const isPackaged = app.isPackaged;
    
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: isPackaged, // Enable webSecurity in packaged app, disable in development
            preload: path.join(__dirname, 'preload.js'), // Add preload script
            cache: false, // Disable cache completely
            allowRunningInsecureContent: !isPackaged, // Allow in development
            experimentalFeatures: true,
            // Additional cache-busting options
            partition: 'persist:hotel-manager', // Use a specific partition
            session: require('electron').session.fromPartition('persist:hotel-manager')
        },
        icon: path.join(__dirname, 'public', 'icons', 'logo.png'), // Use hotel logo
        title: '9JA LUXURY life hotel - Management System',
        show: false // Don't show until ready
    });

    // Disable security warnings in packaged app
    if (isPackaged) {
        process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
    }

    // Start the Express server - Use port 3000 to match development server
    startServer();

    // Wait for server to be ready, then load the staff login page
    setTimeout(async () => {
        try {
            // Clear all caches first
            mainWindow.webContents.session.clearCache();
            mainWindow.webContents.session.clearStorageData({
                storages: ['appcache', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
            });
            
            // Test server connectivity first
            const serverUrl = 'http://localhost:3001/staff-login.html';
            console.log('Testing server connectivity at:', serverUrl);
            
            // Wait for server to be ready
            let serverReady = false;
            let attempts = 0;
            const maxAttempts = 10;
            
            while (!serverReady && attempts < maxAttempts) {
                try {
                    await new Promise((resolve, reject) => {
                        const req = http.get('http://localhost:3001/', (res) => {
                            if (res.statusCode === 200) {
                                serverReady = true;
                                console.log('✅ Server is ready!');
                                resolve();
                            } else {
                                reject(new Error(`Server returned ${res.statusCode}`));
                            }
                        });
                        req.on('error', reject);
                        req.setTimeout(2000, () => reject(new Error('Timeout')));
                    });
                } catch (error) {
                    attempts++;
                    console.log(`⏳ Waiting for server... (${attempts}/${maxAttempts})`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (serverReady) {
                console.log('Loading URL:', serverUrl);
                mainWindow.loadURL(serverUrl);
                mainWindow.show();
                
                // Force hard refresh after cache clear
                setTimeout(() => {
                    console.log('Performing hard refresh to load latest updates...');
                    mainWindow.webContents.reloadIgnoringCache();
                }, 1500);
            } else {
                console.error('❌ Server not ready after', maxAttempts, 'attempts');
                // Load local error page instead of data URL
                const errorPath = path.join(__dirname, 'public', 'server-error.html');
                console.log('Loading error page:', errorPath);
                mainWindow.loadFile(errorPath);
                mainWindow.show();
            }
        } catch (error) {
            console.error('Error loading application:', error);
            mainWindow.show();
        }
    }, 2000);

    // Open DevTools only in development
    if (!isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle window ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Clear all possible caches aggressively
        const session = mainWindow.webContents.session;
        session.clearCache();
        session.clearStorageData({
            storages: ['appcache', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
            quotas: ['temporary', 'persistent', 'syncable']
        });
        
        // Focus on window
        if (process.platform === 'darwin') {
            app.dock.show();
        }
        
        console.log('✅ All caches cleared, window ready with latest content');
    });

    // Create application menu with refresh options
    const template = [
        {
            label: 'View',
            submenu: [
                {
                    label: 'Refresh (Clear Cache)',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        console.log('🔄 Manual refresh requested - clearing all caches...');
                        const session = mainWindow.webContents.session;
                        session.clearCache();
                        session.clearStorageData({
                            storages: ['appcache', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
                            quotas: ['temporary', 'persistent', 'syncable']
                        }).then(() => {
                            mainWindow.webContents.reloadIgnoringCache();
                        });
                    }
                },
                {
                    label: 'Force Reload',
                    accelerator: 'CmdOrCtrl+Shift+R',
                    click: () => {
                        mainWindow.webContents.reloadIgnoringCache();
                    }
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function startServer() {
    try {
        console.log('Checking if server is already running...');
        
        // Don't start embedded server if the main one is already running
        // The task shows server is running on port 3001, so connect to that
        console.log('Connecting to existing server on port 3001...');
        server = null; // Use existing external server
        
    } catch (err) {
        console.error('Server connection issue:', err);
        console.log('Will connect to external server...');
        server = null; // Use existing external server
    }
}

function stopServer() {
    if (server) {
        server.close();
        server = null;
    }
}

// App event listeners
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    // Stop the server when all windows are closed
    stopServer();
    
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers for native dialogs
ipcMain.handle('show-input-dialog', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['OK', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        title: options.title || 'Input Required',
        message: options.message || 'Please enter a value:',
        detail: options.detail || '',
        checkboxLabel: undefined,
        checkboxChecked: false,
    });
    
    if (result.response === 0) {
        // For now, return a placeholder - in a real implementation,
        // you'd need a custom dialog with input field
        return { confirmed: true, value: '' };
    } else {
        return { confirmed: false, value: null };
    }
});

ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure?',
        detail: options.detail || ''
    });
    
    return result.response === 0;
});

// Handle app restart
ipcMain.handle('restart-app', async () => {
    app.relaunch();
    app.exit();
});

app.on('before-quit', () => {
    // Stop the server before quitting
    stopServer();
});

// Handle app certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (url.startsWith('http://localhost')) {
        // Ignore certificate errors for localhost
        event.preventDefault();
        callback(true);
    } else {
        callback(false);
    }
});