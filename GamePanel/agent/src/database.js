const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../storage/database.sqlite');

let db;

function initDatabase() {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database', err);
        } else {
            console.log('Connected to SQLite database.');
            createTables();
        }
    });
}

function createTables() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS servers (
            id TEXT PRIMARY KEY,
            name TEXT,
            install_path TEXT,
            java_path TEXT,
            ram_min INTEGER,
            ram_max INTEGER,
            properties_path TEXT,
            last_started_at TEXT,
            last_status TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS worlds (
            id TEXT PRIMARY KEY,
            server_id TEXT,
            name TEXT,
            path TEXT,
            is_active INTEGER,
            created_at TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS backups (
            id TEXT PRIMARY KEY,
            world_id TEXT,
            file_path TEXT,
            size INTEGER,
            created_at TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS events (
            timestamp TEXT,
            event_type TEXT,
            details TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);
    });
}

module.exports = { initDatabase, db };
