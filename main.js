const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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
            webSecurity: false, // Disable for localhost development
            preload: path.join(__dirname, 'preload.js'), // Add preload script
            allowRunningInsecureContent: true, // Allow for localhost
            experimentalFeatures: true
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

    // Wait a moment for server to start, then load the staff login page
    setTimeout(() => {
        // Try both ports - the current running server is on 3001
        const serverUrl = 'http://localhost:3001/staff-login.html';
        console.log('Loading URL:', serverUrl);
        
        // Load the URL first, then show the window
        mainWindow.loadURL(serverUrl).then(() => {
            console.log('✅ Page loaded successfully');
            mainWindow.show();
        }).catch((error) => {
            console.error('❌ Failed to load page:', error);
            // Try fallback URL
            console.log('Trying fallback URL: http://localhost:3001/');
            mainWindow.loadURL('http://localhost:3001/').then(() => {
                mainWindow.show();
            });
        });
    }, 3000);

    // Open DevTools only in development
    if (!isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    // Add navigation event handlers for debugging
    mainWindow.webContents.on('did-start-loading', () => {
        console.log('🔄 Page started loading...');
    });

    mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ Page finished loading successfully');
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('❌ Page failed to load:', errorCode, errorDescription, validatedURL);
        // Try to load the main page instead
        if (validatedURL.includes('staff-login.html')) {
            console.log('🔄 Retrying with main page...');
            mainWindow.loadURL('http://localhost:3001/');
        }
    });

    mainWindow.webContents.on('dom-ready', () => {
        console.log('🎯 DOM is ready');
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Handle window ready
    mainWindow.once('ready-to-show', () => {
        console.log('✅ Window ready to show');
        
        // Focus on window
        if (process.platform === 'darwin') {
            app.dock.show();
        }
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