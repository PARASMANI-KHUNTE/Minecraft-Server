const { spawn } = require('child_process');
const path = require('path');
const eventBus = require('./eventBus');
const logReader = require('./logReader');
const { db } = require('./database');

let serverProcess = null;
let serverState = {
    status: 'OFFLINE',  // 'OFFLINE' | 'STARTING' | 'ONLINE' | 'STOPPING'
    pid: null,
    startTime: null,
    players: []
};

let stopTimeout = null;

// Listen to log events and update state
eventBus.on('server:ready', () => {
    console.log('[ProcessManager] Server is ready');
    serverState.status = 'ONLINE';
    serverState.startTime = new Date().toISOString();

    // Log to database
    logEvent('server_started', {});

    // Emit status change
    eventBus.emit('server:statusChanged', getStatus());
});

eventBus.on('player:join', ({ name }) => {
    console.log(`[ProcessManager] Player joined: ${name}`);
    if (!serverState.players.includes(name)) {
        serverState.players.push(name);
    }

    logEvent('player_join', { player: name });
    eventBus.emit('server:statusChanged', getStatus());
});

eventBus.on('player:leave', ({ name }) => {
    console.log(`[ProcessManager] Player left: ${name}`);
    serverState.players = serverState.players.filter(p => p !== name);

    logEvent('player_leave', { player: name });
    eventBus.emit('server:statusChanged', getStatus());
});

eventBus.on('server:crash', () => {
    console.log('[ProcessManager] Server crashed');
    serverState.status = 'OFFLINE';
    serverState.pid = null;
    serverState.startTime = null;
    serverState.players = [];

    logEvent('server_crashed', {});
    eventBus.emit('server:statusChanged', getStatus());
});

function startServer(config) {
    if (serverState.status !== 'OFFLINE') {
        console.log('[ProcessManager] Server is not offline, cannot start');
        return;
    }

    console.log('[ProcessManager] Starting server...');
    serverState.status = 'STARTING';
    serverState.startTime = null;
    serverState.players = [];

    eventBus.emit('server:statusChanged', getStatus());

    const { javaPath, ramMin, ramMax, path: serverPath } = config;
    const args = [`-Xms${ramMin}M`, `-Xmx${ramMax}M`, '-jar', 'server.jar', 'nogui'];

    serverProcess = spawn(javaPath || 'java', args, {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    serverState.pid = serverProcess.pid;
    console.log(`[ProcessManager] Server process started with PID: ${serverState.pid}`);

    // Start log reader
    logReader.start(serverPath);

    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                eventBus.emit('console:output', line);
            }
        });
    });

    serverProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                eventBus.emit('console:output', `[ERROR] ${line}`);
            }
        });
    });

    serverProcess.on('close', (code, signal) => {
        console.log(`[ProcessManager] Server process exited with code ${code}, signal ${signal}`);

        // Stop log reader
        logReader.stop();

        // Clear timeout if exists
        if (stopTimeout) {
            clearTimeout(stopTimeout);
            stopTimeout = null;
        }

        serverState.status = 'OFFLINE';
        serverState.pid = null;
        serverState.startTime = null;
        serverState.players = [];
        serverProcess = null;

        logEvent('server_stopped', { code, signal });
        eventBus.emit('server:exit', { code, signal });
        eventBus.emit('server:statusChanged', getStatus());
    });
}

function stopServer() {
    if (serverState.status !== 'ONLINE' && serverState.status !== 'STARTING') {
        console.log('[ProcessManager] Server is not running, cannot stop');
        return;
    }

    console.log('[ProcessManager] Stopping server...');
    serverState.status = 'STOPPING';
    eventBus.emit('server:statusChanged', getStatus());

    // Send stop command
    if (serverProcess && serverProcess.stdin && !serverProcess.stdin.destroyed) {
        serverProcess.stdin.write('stop\n');
    }

    // Set timeout to force kill after 15 seconds
    stopTimeout = setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
            console.log('[ProcessManager] Force killing server after timeout');
            serverProcess.kill('SIGKILL');
        }
    }, 15000);
}

function sendCommand(command) {
    if (serverState.status !== 'ONLINE') {
        console.log('[ProcessManager] Server is not online, cannot send command');
        return false;
    }

    if (serverProcess && serverProcess.stdin && !serverProcess.stdin.destroyed) {
        serverProcess.stdin.write(command + '\n');
        console.log(`[ProcessManager] Sent command: ${command}`);
        return true;
    }

    return false;
}

function getStatus() {
    return {
        ...serverState,
        uptime: serverState.startTime ? Date.now() - new Date(serverState.startTime).getTime() : 0
    };
}

function logEvent(eventType, details) {
    if (!db) return;

    const timestamp = new Date().toISOString();
    const detailsJson = JSON.stringify(details);

    db.run(
        'INSERT INTO events (timestamp, event_type, details) VALUES (?, ?, ?)',
        [timestamp, eventType, detailsJson],
        (err) => {
            if (err) console.error('[ProcessManager] Error logging event:', err);
        }
    );
}

module.exports = { startServer, stopServer, sendCommand, getStatus };
