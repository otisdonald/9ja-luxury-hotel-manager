const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
            webSecurity: isPackaged, // Enable webSecurity in packaged app, disable in development
            preload: path.join(__dirname, 'preload.js'), // Add preload script
            cache: false, // Disable cache for development
            allowRunningInsecureContent: !isPackaged, // Allow in development
            experimentalFeatures: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add app icon
        title: '9JA LUXURY life hotel - Management System',
        show: false // Don't show until ready
    });

    // Disable security warnings in packaged app
    if (isPackaged) {
        process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
    }

    // Start the Express server
    startServer();

    // Wait a moment for server to start, then load the staff login page
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3001/staff-login.html');
        mainWindow.show();
        
        // Force reload after a short delay to ensure fresh content
        setTimeout(() => {
            mainWindow.webContents.session.clearCache().then(() => {
                mainWindow.reload();
            });
        }, 1000);
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
        
        // Focus on window
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });
}

function startServer() {
    try {
        console.log('Starting embedded server...');
        
        // Import the server app
        const serverApp = require('./server.js');
        
        // Check if the app is properly loaded
        if (!serverApp) {
            throw new Error('Failed to load server application');
        }
        
        // Start the server on a specific port
        const PORT = process.env.PORT || 3001;
        server = serverApp.listen(PORT, '127.0.0.1', () => {
            console.log(`🏨 Hotel Manager server running on http://127.0.0.1:${PORT} (Electron embedded)`);
        });
        
        // Handle server errors
        server.on('error', (err) => {
            console.error('Server error:', err);
            if (err.code === 'EADDRINUSE') {
                console.log('Port 3001 is already in use. Trying port 3002...');
                server = serverApp.listen(3002, '127.0.0.1', () => {
                    console.log('🏨 Hotel Manager server running on http://127.0.0.1:3002 (Electron embedded)');
                    // Update the URL in the window
                    setTimeout(() => {
                        mainWindow.loadURL('http://127.0.0.1:3002/staff-login.html');
                    }, 1000);
                });
            }
        });
        
    } catch (err) {
        console.error('Failed to start embedded server:', err);
        console.error('Error details:', err.stack);
        
        // Show error dialog to user
        const { dialog } = require('electron');
        dialog.showErrorBox('Server Error', 
            `Failed to start the hotel management server:\n\n${err.message}\n\nPlease check if the application files are complete and try again.`
        );
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