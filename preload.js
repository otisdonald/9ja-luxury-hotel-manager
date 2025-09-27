const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    showInputDialog: (options) => ipcRenderer.invoke('show-input-dialog', options),
    showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
    restartApp: () => ipcRenderer.invoke('restart-app')
});