const { initDatabase } = require('./database');
const { registerIpc } = require('./ipcHandlers');

function initAgent(ipcMain, mainWindow) {
    console.log('[Agent] Initializing...');

    // Initialize Database
    initDatabase();

    // Register IPC handlers
    registerIpc(ipcMain, mainWindow);

    console.log('[Agent] Initialized successfully');
}

module.exports = { initAgent };
