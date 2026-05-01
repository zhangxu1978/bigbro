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

function createPlot(plotData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const now = Date.now();
        const { id, worldId, name, description, startAge, endAge, target, obstacle, achievement, reward, suspense, status } = plotData;
        
        db.run(
            'INSERT INTO plots (id, worldId, name, description, startAge, endAge, target, obstacle, achievement, reward, suspense, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                id,
                worldId,
                name,
                description || '',
                startAge,
                endAge,
                target || '',
                obstacle || '',
                achievement || '',
                reward || '',
                suspense || '',
                status || 'draft',
                now,
                now
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, worldId, name });
                }
            }
        );
    });
}

function checkPlotAgeConflict(worldId, startAge, endAge, excludePlotId = null) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        let query = 'SELECT id, startAge, endAge FROM plots WHERE worldId = ? AND (startAge < ? AND endAge > ?)';
        const params = [worldId, endAge, startAge];
        
        if (excludePlotId) {
            query += ' AND id != ?';
            params.push(excludePlotId);
        }
        
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? true : false);
            }
        });
    });
}

function getPlotsByWorld(worldId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.all('SELECT * FROM plots WHERE worldId = ? ORDER BY startAge ASC', [worldId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const plots = rows.map(row => ({
                    id: row.id,
                    worldId: row.worldId,
                    name: row.name,
                    description: row.description,
                    startAge: row.startAge,
                    endAge: row.endAge,
                    target: row.target,
                    obstacle: row.obstacle,
                    achievement: row.achievement,
                    reward: row.reward,
                    suspense: row.suspense,
                    status: row.status,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                }));
                resolve(plots);
            }
        });
    });
}

function getPlot(plotId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.get('SELECT * FROM plots WHERE id = ?', [plotId], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve(null);
            } else {
                resolve({
                    id: row.id,
                    worldId: row.worldId,
                    name: row.name,
                    description: row.description,
                    startAge: row.startAge,
                    endAge: row.endAge,
                    target: row.target,
                    obstacle: row.obstacle,
                    achievement: row.achievement,
                    reward: row.reward,
                    suspense: row.suspense,
                    status: row.status,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                });
            }
        });
    });
}

function updatePlot(plotId, plotData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const now = Date.now();
        const { name, description, startAge, endAge, target, obstacle, achievement, reward, suspense, status } = plotData;
        
        db.run(
            'UPDATE plots SET name = ?, description = ?, startAge = ?, endAge = ?, target = ?, obstacle = ?, achievement = ?, reward = ?, suspense = ?, status = ?, updatedAt = ? WHERE id = ?',
            [
                name,
                description || '',
                startAge,
                endAge,
                target || '',
                obstacle || '',
                achievement || '',
                reward || '',
                suspense || '',
                status || 'draft',
                now,
                plotId
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            }
        );
    });
}

function deletePlot(plotId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.run('DELETE FROM plots WHERE id = ?', [plotId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes });
            }
        });
    });
}

function createWorldCharacter(characterData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const now = Date.now();
        const { id, worldId, name, role, desire, stance, flaw, relationships, description } = characterData;
        
        db.run(
            'INSERT INTO world_characters (id, worldId, name, role, desire, stance, flaw, relationships, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                id,
                worldId,
                name,
                role || '',
                desire || '',
                stance || '',
                flaw || '',
                JSON.stringify(relationships || {}),
                description || '',
                now,
                now
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, worldId, name });
                }
            }
        );
    });
}

function getWorldCharacters(worldId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.all('SELECT * FROM world_characters WHERE worldId = ? ORDER BY createdAt DESC', [worldId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const characters = rows.map(row => ({
                    id: row.id,
                    worldId: row.worldId,
                    name: row.name,
                    role: row.role,
                    desire: row.desire,
                    stance: row.stance,
                    flaw: row.flaw,
                    relationships: row.relationships ? JSON.parse(row.relationships) : {},
                    description: row.description,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                }));
                resolve(characters);
            }
        });
    });
}

function getWorldCharacter(characterId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.get('SELECT * FROM world_characters WHERE id = ?', [characterId], (err, row) => {
            if (err) {
                reject(err);
            } else if (!row) {
                resolve(null);
            } else {
                resolve({
                    id: row.id,
                    worldId: row.worldId,
                    name: row.name,
                    role: row.role,
                    desire: row.desire,
                    stance: row.stance,
                    flaw: row.flaw,
                    relationships: row.relationships ? JSON.parse(row.relationships) : {},
                    description: row.description,
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                });
            }
        });
    });
}

function updateWorldCharacter(characterId, characterData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const now = Date.now();
        const { name, role, desire, stance, flaw, relationships, description } = characterData;
        
        db.run(
            'UPDATE world_characters SET name = ?, role = ?, desire = ?, stance = ?, flaw = ?, relationships = ?, description = ?, updatedAt = ? WHERE id = ?',
            [
                name,
                role || '',
                desire || '',
                stance || '',
                flaw || '',
                JSON.stringify(relationships || {}),
                description || '',
                now,
                characterId
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            }
        );
    });
}

function deleteWorldCharacter(characterId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.run('DELETE FROM world_characters WHERE id = ?', [characterId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes });
            }
        });
    });
}

function createPlotCharacter(characterData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const now = Date.now();
        const { id, plotId, worldCharacterId, name, role, desire, stance, flaw, relationships, description, scope } = characterData;
        
        db.run(
            'INSERT INTO plot_characters (id, plotId, worldCharacterId, name, role, desire, stance, flaw, relationships, description, scope, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                id,
                plotId,
                worldCharacterId || null,
                name,
                role || '',
                desire || '',
                stance || '',
                flaw || '',
                JSON.stringify(relationships || {}),
                description || '',
                scope || 'plot_only',
                now
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id, plotId, name });
                }
            }
        );
    });
}

function getPlotCharacters(plotId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.all('SELECT * FROM plot_characters WHERE plotId = ?', [plotId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const characters = rows.map(row => ({
                    id: row.id,
                    plotId: row.plotId,
                    worldCharacterId: row.worldCharacterId,
                    name: row.name,
                    role: row.role,
                    desire: row.desire,
                    stance: row.stance,
                    flaw: row.flaw,
                    relationships: row.relationships ? JSON.parse(row.relationships) : {},
                    description: row.description,
                    scope: row.scope,
                    createdAt: row.createdAt
                }));
                resolve(characters);
            }
        });
    });
}

function createPlotStep(stepData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const { plotId, stepNumber, purpose, emotion, characters, summary, obstacle, achievement, narrative, status } = stepData;

        db.run(
            'INSERT INTO plot_steps (plotId, stepNumber, purpose, emotion, characters, summary, obstacle, achievement, narrative, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                plotId,
                stepNumber,
                purpose || '',
                emotion || '',
                characters || '[]',
                summary || '',
                obstacle || '',
                achievement || '',
                narrative || '',
                status || 'pending',
                Date.now()
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, plotId, stepNumber });
                }
            }
        );
    });
}

function getPlotSteps(plotId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.all('SELECT * FROM plot_steps WHERE plotId = ? ORDER BY stepNumber ASC', [plotId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                const steps = rows.map(row => ({
                    id: row.id,
                    plotId: row.plotId,
                    stepNumber: row.stepNumber,
                    purpose: row.purpose,
                    emotion: row.emotion,
                    characters: row.characters ? JSON.parse(row.characters) : [],
                    summary: row.summary,
                    obstacle: row.obstacle,
                    achievement: row.achievement,
                    narrative: row.narrative,
                    status: row.status,
                    createdAt: row.createdAt
                }));
                resolve(steps);
            }
        });
    });
}

function updatePlotStep(stepId, stepData) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        const { purpose, emotion, characters, summary, obstacle, achievement, narrative, status } = stepData;

        db.run(
            'UPDATE plot_steps SET purpose = ?, emotion = ?, characters = ?, summary = ?, obstacle = ?, achievement = ?, narrative = ?, status = ? WHERE id = ?',
            [
                purpose || '',
                emotion || '',
                characters || '[]',
                summary || '',
                obstacle || '',
                achievement || '',
                narrative || '',
                status || 'pending',
                stepId
            ],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            }
        );
    });
}

function deletePlotStep(stepId) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.run('DELETE FROM plot_steps WHERE id = ?', [stepId], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, changes: this.changes });
            }
        });
    });
}

function getPlotByAge(worldId, age) {
    return new Promise((resolve, reject) => {
        const db = getDb();
        db.get(
            'SELECT * FROM plots WHERE worldId = ? AND startAge <= ? AND endAge >= ? AND status = ?',
            [worldId, age, age, 'completed'],
            (err, row) => {
                if (err) {
                    reject(err);
                } else if (!row) {
                    resolve(null);
                } else {
                    resolve({
                        id: row.id,
                        worldId: row.worldId,
                        name: row.name,
                        description: row.description,
                        startAge: row.startAge,
                        endAge: row.endAge,
                        target: row.target,
                        obstacle: row.obstacle,
                        achievement: row.achievement,
                        reward: row.reward,
                        suspense: row.suspense,
                        status: row.status,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt
                    });
                }
            }
        );
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
    deleteSave,
    createPlot,
    checkPlotAgeConflict,
    getPlotsByWorld,
    getPlot,
    updatePlot,
    deletePlot,
    createWorldCharacter,
    getWorldCharacters,
    getWorldCharacter,
    updateWorldCharacter,
    deleteWorldCharacter,
    createPlotCharacter,
    getPlotCharacters,
    createPlotStep,
    getPlotSteps,
    updatePlotStep,
    deletePlotStep,
    getPlotByAge
};
