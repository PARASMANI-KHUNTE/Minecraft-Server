const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Server control
    startServer: () => ipcRenderer.send('server:start'),
    stopServer: () => ipcRenderer.send('server:stop'),
    restartServer: () => ipcRenderer.send('server:restart'),
    getStatus: () => ipcRenderer.invoke('server:getStatus'),
    sendCommand: (cmd) => ipcRenderer.send('server:sendCommand', cmd),

    // Event listeners
    onStatusChanged: (callback) => {
        ipcRenderer.on('server:statusChanged', (_event, data) => callback(data));
    },
    onPlayerJoined: (callback) => {
        ipcRenderer.on('server:playerJoined', (_event, data) => callback(data));
    },
    onPlayerLeft: (callback) => {
        ipcRenderer.on('server:playerLeft', (_event, data) => callback(data));
    },
    onLog: (callback) => {
        ipcRenderer.on('server:log', (_event, line) => callback(line));
    }
});
