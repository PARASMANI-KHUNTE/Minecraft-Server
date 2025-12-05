const { Tail } = require('tail');
const path = require('path');
const fs = require('fs');
const eventBus = require('./eventBus');

let tail = null;

function start(serverPath) {
    const logPath = path.join(serverPath, 'logs', 'latest.log');

    // Check if log file exists
    if (!fs.existsSync(logPath)) {
        console.log(`Log file not found: ${logPath}`);
        // Watch for file creation
        const logDir = path.join(serverPath, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const watcher = fs.watch(logDir, (eventType, filename) => {
            if (filename === 'latest.log' && fs.existsSync(logPath)) {
                watcher.close();
                startTailing(logPath);
            }
        });

        return;
    }

    startTailing(logPath);
}

function startTailing(logPath) {
    tail = new Tail(logPath, {
        follow: true,
        useWatchFile: true
    });

    tail.on('line', (line) => {
        // Emit raw log line
        eventBus.emit('log:line', line);

        // Parse and emit specific events
        parseLogLine(line);
    });

    tail.on('error', (error) => {
        console.error('Log reader error:', error);
    });

    console.log(`Started tailing log: ${logPath}`);
}

function parseLogLine(line) {
    // Server ready
    if (/Done \(\d+(\.\d+)?s\)!/i.test(line)) {
        eventBus.emit('server:ready');
        return;
    }

    // Player join
    const joinMatch = line.match(/^(?:\[.*?\]: )?(.+?) joined the game/);
    if (joinMatch) {
        eventBus.emit('player:join', { name: joinMatch[1] });
        return;
    }

    // Player leave
    const leaveMatch = line.match(/^(?:\[.*?\]: )?(.+?) left the game/);
    if (leaveMatch) {
        eventBus.emit('player:leave', { name: leaveMatch[1] });
        return;
    }

    // Server stopping
    if (/Stopping server/i.test(line)) {
        eventBus.emit('server:stopping');
        return;
    }

    // Crash detection
    if (/Exception in thread|ServerWatchdog|Fatal|Crash/i.test(line)) {
        eventBus.emit('server:crash');
        return;
    }
}

function stop() {
    if (tail) {
        tail.unwatch();
        tail = null;
        console.log('Stopped log reader');
    }
}

module.exports = { start, stop };
