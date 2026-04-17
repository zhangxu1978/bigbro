const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 数据存储路径
const dataDir = path.join(__dirname, '..', 'data');
const worldsFile = path.join(dataDir, 'lifesim-worlds.json');
const configFile = path.join(dataDir, 'lifesim-config.json');

// 确保数据文件存在
function ensureDataFiles() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(worldsFile)) {
        fs.writeFileSync(worldsFile, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(configFile)) {
        const defaultConfig = {
            apiUrl: 'http://localhost:3100/v1/chat/completions',
            model: 'moda-kimi2.5',
            apiKey: '',
            maxTokens: 2000
        };
        fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    }
}

ensureDataFiles();

// ════════════════════════════════════════
//  配置管理 API
// ════════════════════════════════════════

// 获取配置
router.get('/lifesim/config', (req, res) => {
    try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: '读取配置失败', message: err.message });
    }
});

// 保存配置
router.post('/lifesim/config', (req, res) => {
    try {
        const { apiUrl, model, apiKey, maxTokens } = req.body;
        const config = {
            apiUrl: apiUrl || 'http://localhost:3100/v1/chat/completions',
            model: model || 'moda-kimi2.5',
            apiKey: apiKey || '',
            maxTokens: parseInt(maxTokens) || 2000
        };
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: '保存配置失败', message: err.message });
    }
});

// ════════════════════════════════════════
//  世界存档管理 API
// ════════════════════════════════════════

// 获取所有世界存档
router.get('/lifesim/worlds', (req, res) => {
    try {
        const worlds = JSON.parse(fs.readFileSync(worldsFile, 'utf8'));
        // 返回简化信息，不包含完整的游戏消息历史
        const summary = worlds.map(w => ({
            id: w.id,
            name: w.name,
            desc: w.desc,
            type: w.type,
            tags: w.tags || [],
            savedAt: w.savedAt,
            turn: w.gameState?.turn || 0,
            age: w.gameState?.age || 0,
            isDead: w.gameState?.isDead || false
        }));
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: '读取世界列表失败', message: err.message });
    }
});

// 获取单个世界存档（完整数据）
router.get('/lifesim/worlds/:id', (req, res) => {
    try {
        const worlds = JSON.parse(fs.readFileSync(worldsFile, 'utf8'));
        const world = worlds.find(w => w.id === req.params.id);
        if (!world) {
            return res.status(404).json({ error: '世界不存在' });
        }
        res.json(world);
    } catch (err) {
        res.status(500).json({ error: '读取世界失败', message: err.message });
    }
});

// 创建/更新世界存档
router.post('/lifesim/worlds', (req, res) => {
    try {
        const worlds = JSON.parse(fs.readFileSync(worldsFile, 'utf8'));
        const worldData = req.body;

        if (!worldData.id) {
            return res.status(400).json({ error: '缺少世界ID' });
        }

        // 添加保存时间
        worldData.savedAt = Date.now();

        const idx = worlds.findIndex(w => w.id === worldData.id);
        if (idx >= 0) {
            worlds[idx] = worldData;
        } else {
            worlds.push(worldData);
        }

        fs.writeFileSync(worldsFile, JSON.stringify(worlds, null, 2));
        res.json({ success: true, world: worldData });
    } catch (err) {
        res.status(500).json({ error: '保存世界失败', message: err.message });
    }
});

// 删除世界存档
router.delete('/lifesim/worlds/:id', (req, res) => {
    try {
        let worlds = JSON.parse(fs.readFileSync(worldsFile, 'utf8'));
        worlds = worlds.filter(w => w.id !== req.params.id);
        fs.writeFileSync(worldsFile, JSON.stringify(worlds, null, 2));
        res.json({ success: true, message: '世界已删除' });
    } catch (err) {
        res.status(500).json({ error: '删除世界失败', message: err.message });
    }
});

// ════════════════════════════════════════
//  游戏状态管理 API
// ════════════════════════════════════════

// 快速保存当前游戏状态
router.post('/lifesim/save', (req, res) => {
    try {
        const { gameState, messages } = req.body;

        if (!gameState || !gameState.worldId) {
            return res.status(400).json({ error: '缺少游戏状态' });
        }

        const worlds = JSON.parse(fs.readFileSync(worldsFile, 'utf8'));
        const worldData = {
            id: gameState.worldId,
            name: gameState.worldName,
            desc: gameState.worldDesc,
            type: gameState.worldType,
            tags: gameState.worldTags || [],
            savedAt: Date.now(),
            gameState: { ...gameState },
            messages: messages || []
        };

        const idx = worlds.findIndex(w => w.id === gameState.worldId);
        if (idx >= 0) {
            worlds[idx] = worldData;
        } else {
            worlds.push(worldData);
        }

        fs.writeFileSync(worldsFile, JSON.stringify(worlds, null, 2));
        res.json({ success: true, savedAt: worldData.savedAt });
    } catch (err) {
        res.status(500).json({ error: '保存游戏失败', message: err.message });
    }
});

// 加载游戏状态
router.get('/lifesim/load/:id', (req, res) => {
    try {
        const worlds = JSON.parse(fs.readFileSync(worldsFile, 'utf8'));
        const world = worlds.find(w => w.id === req.params.id);
        if (!world) {
            return res.status(404).json({ error: '存档不存在' });
        }
        res.json({
            gameState: world.gameState,
            messages: world.messages || []
        });
    } catch (err) {
        res.status(500).json({ error: '加载游戏失败', message: err.message });
    }
});

module.exports = router;
