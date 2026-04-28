const { getDb } = require('./database');

function getWorld(worldId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.get('SELECT * FROM worlds WHERE id = ?', [worldId], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve(null);
            } else {
                resolve({
                    id: row.id,
                    name: row.name,
                    desc: row.desc,
                    type: row.type,
                    tags: row.tags ? JSON.parse(row.tags) : [],
                    storylines: row.storylines ? JSON.parse(row.storylines) : {},
                    importantCharacters: row.importantCharacters ? JSON.parse(row.importantCharacters) : {}
                });
            }
        });
    });
}

function getAllWorlds() {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.all('SELECT * FROM worlds ORDER BY createdAt DESC', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const worlds = rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    desc: row.desc,
                    type: row.type,
                    tags: row.tags ? JSON.parse(row.tags) : [],
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                }));
                resolve(worlds);
            }
        });
    });
}

function saveWorld(worldData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const now = Date.now();
        const { id, name, desc, type, tags, storylines, importantCharacters } = worldData;
        
        db.run(
            'INSERT OR REPLACE INTO worlds (id, name, desc, type, tags, storylines, importantCharacters, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT createdAt FROM worlds WHERE id = ?), ?), ?)',
            [
                id,
                name,
                desc,
                type,
                JSON.stringify(tags || []),
                JSON.stringify(storylines || {}),
                JSON.stringify(importantCharacters || {}),
                id,
                now,
                now
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, name });
                }
            }
        );
    });
}

function deleteWorld(worldId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.run('DELETE FROM worlds WHERE id = ?', [worldId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes });
            }
        });
    });
}

function createSave(worldId, turn, age, summary, gameState, messages) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const saveId = `save_${worldId}_${turn}_${Date.now()}`;
        
        db.run(
            'INSERT INTO saves (id, worldId, turn, age, summary, gameState, savedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [saveId, worldId, turn, age, summary || '', JSON.stringify(gameState), Date.now()],
            function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!messages || messages.length === 0) {
                    resolve({ saveId, turn, age });
                    return;
                }
                
                db.serialize(() => {
                    const insertMsg = db.prepare('INSERT INTO messages (saveId, role, content, createdAt) VALUES (?, ?, ?, ?)');
                    
                    function insertNext(index) {
                        if (index >= messages.length) {
                            insertMsg.finalize();
                            resolve({ saveId, turn, age });
                            return;
                        }
                        
                        const msg = messages[index];
                        insertMsg.run([saveId, msg.role, msg.content, Date.now()], function(err) {
                            if (err) {
                                insertMsg.finalize();
                                reject(err);
                                return;
                            }
                            insertNext(index + 1);
                        });
                    }
                    
                    insertNext(0);
                });
            }
        );
    });
}

function getSave(saveId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        
        db.get('SELECT * FROM saves WHERE id = ?', [saveId], (err, saveRow) => {
            if (err) {
                reject(err);
                return;
            }
            if (!saveRow) {
                resolve(null);
                return;
            }
            
            db.all('SELECT role, content FROM messages WHERE saveId = ? ORDER BY createdAt', [saveId], (err, messageRows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const messages = messageRows.map(row => ({
                    role: row.role,
                    content: row.content
                }));
                
                resolve({
                    id: saveRow.id,
                    worldId: saveRow.worldId,
                    turn: saveRow.turn,
                    age: saveRow.age,
                    summary: saveRow.summary,
                    gameState: JSON.parse(saveRow.gameState),
                    savedAt: saveRow.savedAt,
                    messages
                });
            });
        });
    });
}

function getSavesByWorld(worldId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.all(
            'SELECT id, turn, age, summary, savedAt FROM saves WHERE worldId = ? ORDER BY turn DESC',
            [worldId],
            (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const saves = rows.map(row => ({
                        id: row.id,
                        worldId,
                        turn: row.turn,
                        age: row.age,
                        summary: row.summary,
                        savedAt: row.savedAt
                    }));
                    resolve(saves);
                }
            }
        );
    });
}

function deleteSave(saveId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.run('DELETE FROM saves WHERE id = ?', [saveId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes });
            }
        });
    });
}

module.exports = {
    getWorld,
    getAllWorlds,
    saveWorld,
    deleteWorld,
    createSave,
    getSave,
    getSavesByWorld,
    deleteSave
};
