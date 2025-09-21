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
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: isPackaged, // Enable webSecurity in packaged app, disable in development
            preload: path.join(__dirname, 'preload.js') // Add preload script
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add app icon
        title: 'Hotel Manager',
        show: false // Don't show until ready
    });

    // Start the Express server
    startServer();

    // Wait a moment for server to start, then load the app
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.show();
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
        // Import and use the full server.js application
        const serverApp = require('./server.js');
        
        // Start the server
        server = serverApp.listen(3000, () => {
            console.log('Hotel Manager server running on port 3000 (Electron embedded)');
        });
        
    } catch (err) {
        console.error('Failed to start embedded server:', err);
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