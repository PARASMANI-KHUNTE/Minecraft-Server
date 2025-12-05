const { ipcMain } = require('electron');
const eventBus = require('./eventBus');
const processManager = require('./processManager');
const fs = require('fs');
const path = require('path');

let mainWindow = null;

function registerIpc(ipcMainInstance, win) {
    mainWindow = win;

    // Load config
    const configPath = path.join(__dirname, '../../config.json');
    let config = {};

    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
        console.error('[IPC] Error loading config:', err);
    }

    // Inbound: Renderer → Agent
    ipcMainInstance.on('server:start', () => {
        console.log('[IPC] Received server:start');
        processManager.startServer(config.defaultServer);
    });

    ipcMainInstance.on('server:stop', () => {
        console.log('[IPC] Received server:stop');
        processManager.stopServer();
    });

    ipcMainInstance.on('server:restart', () => {
        console.log('[IPC] Received server:restart');
        processManager.stopServer();
        // Wait for server to stop, then start
        const checkAndStart = setInterval(() => {
            const status = processManager.getStatus();
            if (status.status === 'OFFLINE') {
                clearInterval(checkAndStart);
                setTimeout(() => {
                    processManager.startServer(config.defaultServer);
                }, 1000);
            }
        }, 500);
    });

    ipcMainInstance.handle('server:getStatus', () => {
        return processManager.getStatus();
    });

    ipcMainInstance.on('server:sendCommand', (event, cmd) => {
        console.log('[IPC] Received command:', cmd);
        processManager.sendCommand(cmd);
    });

    // Outbound: Agent → Renderer (via eventBus)
    eventBus.on('server:statusChanged', (status) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server:statusChanged', status);
        }
    });

    eventBus.on('player:join', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server:playerJoined', data);
        }
    });

    eventBus.on('player:leave', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server:playerLeft', data);
        }
    });

    eventBus.on('log:line', (line) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server:log', line);
        }
    });

    eventBus.on('console:output', (line) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('server:log', line);
        }
    });

    console.log('[IPC] Handlers registered');
}

module.exports = { registerIpc };
