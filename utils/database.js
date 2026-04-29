const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'lifesim.db');

let db = null;

function initDatabase(callback) {
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('数据库连接失败:', err.message);
            callback(err);
            return;
        }
        console.log('数据库连接成功');
        createTables(callback);
    });
}

function createTables(callback) {
    const createWorldsTable = `
        CREATE TABLE IF NOT EXISTS worlds (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            desc TEXT,
            type TEXT,
            tags TEXT,
            storylines TEXT,
            importantCharacters TEXT,
            createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createSavesTable = `
        CREATE TABLE IF NOT EXISTS saves (
            id TEXT PRIMARY KEY,
            worldId TEXT NOT NULL,
            turn INTEGER NOT NULL,
            age INTEGER DEFAULT 0,
            summary TEXT,
            gameState TEXT NOT NULL,
            savedAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (worldId) REFERENCES worlds(id) ON DELETE CASCADE
        )
    `;

    const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saveId TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (saveId) REFERENCES saves(id) ON DELETE CASCADE
        )
    `;

    const createPlotsTable = `
        CREATE TABLE IF NOT EXISTS plots (
            id TEXT PRIMARY KEY,
            worldId TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            startAge INTEGER NOT NULL,
            endAge INTEGER NOT NULL,
            target TEXT,
            obstacle TEXT,
            achievement TEXT,
            reward TEXT,
            suspense TEXT,
            status TEXT DEFAULT 'draft',
            createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (worldId) REFERENCES worlds(id) ON DELETE CASCADE
        )
    `;

    const createWorldCharactersTable = `
        CREATE TABLE IF NOT EXISTS world_characters (
            id TEXT PRIMARY KEY,
            worldId TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT,
            desire TEXT,
            stance TEXT,
            flaw TEXT,
            relationships TEXT,
            description TEXT,
            createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            updatedAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (worldId) REFERENCES worlds(id) ON DELETE CASCADE
        )
    `;

    const createPlotCharactersTable = `
        CREATE TABLE IF NOT EXISTS plot_characters (
            id TEXT PRIMARY KEY,
            plotId TEXT NOT NULL,
            worldCharacterId TEXT,
            name TEXT NOT NULL,
            role TEXT,
            desire TEXT,
            stance TEXT,
            flaw TEXT,
            relationships TEXT,
            description TEXT,
            scope TEXT DEFAULT 'plot_only',
            createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plotId) REFERENCES plots(id) ON DELETE CASCADE,
            FOREIGN KEY (worldCharacterId) REFERENCES world_characters(id) ON DELETE SET NULL
        )
    `;

    const createPlotStepsTable = `
        CREATE TABLE IF NOT EXISTS plot_steps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plotId TEXT NOT NULL,
            stepNumber INTEGER NOT NULL,
            purpose TEXT NOT NULL,
            obstacle TEXT NOT NULL,
            achievement TEXT NOT NULL,
            narrative TEXT,
            status TEXT DEFAULT 'pending',
            createdAt INTEGER DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (plotId) REFERENCES plots(id) ON DELETE CASCADE
        )
    `;

    db.serialize(() => {
        db.run(createWorldsTable, (err) => {
            if (err) {
                console.error('创建 worlds 表失败:', err.message);
                callback(err);
                return;
            }
            db.run(createSavesTable, (err) => {
                if (err) {
                    console.error('创建 saves 表失败:', err.message);
                    callback(err);
                    return;
                }
                db.run(createMessagesTable, (err) => {
                    if (err) {
                        console.error('创建 messages 表失败:', err.message);
                        callback(err);
                        return;
                    }
                    db.run(createPlotsTable, (err) => {
                        if (err) {
                            console.error('创建 plots 表失败:', err.message);
                            callback(err);
                            return;
                        }
                        db.run(createWorldCharactersTable, (err) => {
                            if (err) {
                                console.error('创建 world_characters 表失败:', err.message);
                                callback(err);
                                return;
                            }
                            db.run(createPlotCharactersTable, (err) => {
                                if (err) {
                                    console.error('创建 plot_characters 表失败:', err.message);
                                    callback(err);
                                    return;
                                }
                                db.run(createPlotStepsTable, (err) => {
                                    if (err) {
                                        console.error('创建 plot_steps 表失败:', err.message);
                                        callback(err);
                                        return;
                                    }
                                    console.log('所有表创建成功');
                                    callback(null);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}

function getDb() {
    return db;
}

module.exports = {
    initDatabase,
    getDb
};
