const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 导入数据库操作模块
const {
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
    createPlotStep,
    getPlotSteps,
    updatePlotStep,
    deletePlotStep,
    getPlotByAge,
    createPlotCharacter,
    getPlotCharacters
} = require('../utils/dbOperations');

// 导入摘要生成模块
const { generateSummary } = require('../utils/summaryGenerator');

// 数据存储路径（保留配置文件）
const dataDir = path.join(__dirname, '..', 'data');
const configFile = path.join(dataDir, 'lifesim-config.json');

// 确保数据文件存在
function ensureConfigFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(configFile)) {
        const defaultConfig = {
            apiUrl: 'http://localhost:3100/v1/chat/completions',
            model: 'moda-kimi2.5',
            hostModel: '',
            apiKey: '',
            maxTokens: 2000
        };
        fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    }
}

ensureConfigFile();

// ════════════════════════════════════
//  配置管理 API
// ════════════════════════════════════

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
        const { apiUrl, model, hostModel, apiKey, maxTokens } = req.body;
        const config = {
            apiUrl: apiUrl || 'http://localhost:3100/v1/chat/completions',
            model: model || 'moda-kimi2.5',
            hostModel: hostModel || '',
            apiKey: apiKey || '',
            maxTokens: parseInt(maxTokens) || 2000
        };
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        res.json({ success: true, config });
    } catch (err) {
        res.status(500).json({ error: '保存配置失败', message: err.message });
    }
});

// ════════════════════════════════════
//  世界存档管理 API
// ════════════════════════════════════

// 获取所有世界存档
router.get('/lifesim/worlds', async (req, res) => {
    try {
        const worlds = await getAllWorlds();
        res.json(worlds);
    } catch (err) {
        res.status(500).json({ error: '读取世界列表失败', message: err.message });
    }
});

// 获取单个世界存档（完整数据）
router.get('/lifesim/worlds/:id', async (req, res) => {
    try {
        const world = await getWorld(req.params.id);
        if (!world) {
            return res.status(404).json({ error: '世界不存在' });
        }
        res.json(world);
    } catch (err) {
        res.status(500).json({ error: '读取世界失败', message: err.message });
    }
});

// 创建/更新世界存档
router.post('/lifesim/worlds', async (req, res) => {
    try {
        const worldData = req.body;

        if (!worldData.id) {
            return res.status(400).json({ error: '缺少世界ID' });
        }

        const result = await saveWorld(worldData);
        res.json({ success: true, world: result });
    } catch (err) {
        res.status(500).json({ error: '保存世界失败', message: err.message });
    }
});

// 删除世界存档
router.delete('/lifesim/worlds/:id', async (req, res) => {
    try {
        const result = await deleteWorld(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: '世界不存在' });
        }
        res.json({ success: true, message: '世界已删除' });
    } catch (err) {
        res.status(500).json({ error: '删除世界失败', message: err.message });
    }
});

// ════════════════════════════════════
//  存档管理 API（每回合独立存档）
// ════════════════════════════════════

// 获取世界的所有存档列表
router.get('/lifesim/worlds/:worldId/saves', async (req, res) => {
    try {
        const saves = await getSavesByWorld(req.params.worldId);
        res.json(saves);
    } catch (err) {
        res.status(500).json({ error: '读取存档列表失败', message: err.message });
    }
});

// 获取单个存档（完整数据）
router.get('/lifesim/saves/:id', async (req, res) => {
    try {
        const save = await getSave(req.params.id);
        if (!save) {
            return res.status(404).json({ error: '存档不存在' });
        }
        res.json(save);
    } catch (err) {
        res.status(500).json({ error: '读取存档失败', message: err.message });
    }
});

// 创建新存档（每回合调用）
router.post('/lifesim/saves', async (req, res) => {
    try {
        const { worldId, turn, age, gameState, messages } = req.body;

        if (!worldId || !gameState) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        // 生成存档摘要
        let summary = null;
        try {
            summary = await generateSummary(gameState, messages || []);
        } catch (err) {
            console.error('生成摘要失败:', err);
        }

        // 创建存档
        const result = await createSave(worldId, turn || 0, age || 0, summary, gameState, messages || []);
        res.json({ success: true, save: result });
    } catch (err) {
        res.status(500).json({ error: '创建存档失败', message: err.message });
    }
});

// 删除存档
router.delete('/lifesim/saves/:id', async (req, res) => {
    try {
        const result = await deleteSave(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: '存档不存在' });
        }
        res.json({ success: true, message: '存档已删除' });
    } catch (err) {
        res.status(500).json({ error: '删除存档失败', message: err.message });
    }
});

// ════════════════════════════════════
//  游戏状态管理 API（保持向后兼容）
// ════════════════════════════════════

// 快速保存当前游戏状态（保持兼容，实际调用新的存档 API）
router.post('/lifesim/save', async (req, res) => {
    try {
        const { gameState, messages } = req.body;

        if (!gameState || !gameState.worldId) {
            return res.status(400).json({ error: '缺少游戏状态' });
        }

        // 保存世界信息
        const worldData = {
            id: gameState.worldId,
            name: gameState.worldName,
            desc: gameState.worldDesc,
            type: gameState.worldType,
            tags: gameState.worldTags || [],
            storylines: gameState.storylines || {},
            importantCharacters: gameState.importantCharacters || {}
        };
        await saveWorld(worldData);

        // 生成存档摘要
        let summary = null;
        try {
            summary = await generateSummary(gameState, messages || []);
        } catch (err) {
            console.error('生成摘要失败:', err);
        }

        // 创建新存档
        const result = await createSave(
            gameState.worldId,
            gameState.turn || 0,
            gameState.age || 0,
            summary,
            gameState,
            messages || []
        );

        res.json({ success: true, savedAt: Date.now(), saveId: result.saveId });
    } catch (err) {
        res.status(500).json({ error: '保存游戏失败', message: err.message });
    }
});

// 加载游戏状态（保持兼容）
router.get('/lifesim/load/:id', async (req, res) => {
    try {
        const save = await getSave(req.params.id);
        if (!save) {
            return res.status(404).json({ error: '存档不存在' });
        }
        res.json({
            gameState: save.gameState,
            messages: save.messages || []
        });
    } catch (err) {
        res.status(500).json({ error: '加载游戏失败', message: err.message });
    }
});

// ════════════════════════════════════
//  剧情管理 API
// ════════════════════════════════════

router.post('/lifesim/plots', async (req, res) => {
    try {
        const { worldId, name, description, startAge, endAge, target, obstacle, achievement, reward, suspense } = req.body;

        if (!worldId || !name || startAge === undefined || endAge === undefined) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        if (startAge >= endAge) {
            return res.status(400).json({ error: '开始年龄必须小于结束年龄' });
        }

        const hasConflict = await checkPlotAgeConflict(worldId, startAge, endAge);
        if (hasConflict) {
            return res.status(400).json({ error: '年龄范围与已有剧情冲突' });
        }

        const plotId = `plot_${worldId}_${Date.now()}`;
        const result = await createPlot({
            id: plotId,
            worldId,
            name,
            description,
            startAge,
            endAge,
            target,
            obstacle,
            achievement,
            reward,
            suspense,
            status: 'draft'
        });

        res.json({ success: true, plot: result });
    } catch (err) {
        res.status(500).json({ error: '创建剧情失败', message: err.message });
    }
});

router.get('/lifesim/plots/:worldId', async (req, res) => {
    try {
        const plots = await getPlotsByWorld(req.params.worldId);
        res.json(plots);
    } catch (err) {
        res.status(500).json({ error: '获取剧情列表失败', message: err.message });
    }
});

router.get('/lifesim/plot/:plotId', async (req, res) => {
    try {
        const plot = await getPlot(req.params.plotId);
        if (!plot) {
            return res.status(404).json({ error: '剧情不存在' });
        }
        res.json(plot);
    } catch (err) {
        res.status(500).json({ error: '获取剧情失败', message: err.message });
    }
});

router.put('/lifesim/plot/:plotId', async (req, res) => {
    try {
        const { name, description, startAge, endAge, target, obstacle, achievement, reward, suspense, status } = req.body;
        const plotId = req.params.plotId;

        const existingPlot = await getPlot(plotId);
        if (!existingPlot) {
            return res.status(404).json({ error: '剧情不存在' });
        }

        if (startAge !== undefined && endAge !== undefined) {
            if (startAge >= endAge) {
                return res.status(400).json({ error: '开始年龄必须小于结束年龄' });
            }

            const hasConflict = await checkPlotAgeConflict(existingPlot.worldId, startAge, endAge, plotId);
            if (hasConflict) {
                return res.status(400).json({ error: '年龄范围与已有剧情冲突' });
            }
        }

        const result = await updatePlot(plotId, {
            name: name !== undefined ? name : existingPlot.name,
            description: description !== undefined ? description : existingPlot.description,
            startAge: startAge !== undefined ? startAge : existingPlot.startAge,
            endAge: endAge !== undefined ? endAge : existingPlot.endAge,
            target: target !== undefined ? target : existingPlot.target,
            obstacle: obstacle !== undefined ? obstacle : existingPlot.obstacle,
            achievement: achievement !== undefined ? achievement : existingPlot.achievement,
            reward: reward !== undefined ? reward : existingPlot.reward,
            suspense: suspense !== undefined ? suspense : existingPlot.suspense,
            status: status !== undefined ? status : existingPlot.status
        });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: '更新剧情失败', message: err.message });
    }
});

router.delete('/lifesim/plot/:plotId', async (req, res) => {
    try {
        const result = await deletePlot(req.params.plotId);
        if (result.changes === 0) {
            return res.status(404).json({ error: '剧情不存在' });
        }
        res.json({ success: true, message: '剧情已删除' });
    } catch (err) {
        res.status(500).json({ error: '删除剧情失败', message: err.message });
    }
});

router.post('/lifesim/plot-steps', async (req, res) => {
    try {
        const { plotId, stepOrder, age, content, result: stepResult, choices } = req.body;

        if (!plotId || stepOrder === undefined || !content) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const stepId = `step_${plotId}_${Date.now()}`;
        const result = await createPlotStep({
            id: stepId,
            plotId,
            stepOrder,
            age,
            content,
            result: stepResult,
            choices
        });

        res.json({ success: true, step: result });
    } catch (err) {
        res.status(500).json({ error: '创建步骤失败', message: err.message });
    }
});

router.get('/lifesim/plot-steps/:plotId', async (req, res) => {
    try {
        const steps = await getPlotSteps(req.params.plotId);
        res.json(steps);
    } catch (err) {
        res.status(500).json({ error: '获取步骤列表失败', message: err.message });
    }
});

router.put('/lifesim/plot-step/:stepId', async (req, res) => {
    try {
        const { stepOrder, age, content, result: stepResult, choices } = req.body;
        const stepId = req.params.stepId;

        const result = await updatePlotStep(stepId, {
            stepOrder: stepOrder !== undefined ? stepOrder : undefined,
            age: age !== undefined ? age : undefined,
            content: content !== undefined ? content : undefined,
            result: stepResult !== undefined ? stepResult : undefined,
            choices: choices !== undefined ? choices : undefined
        });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: '更新步骤失败', message: err.message });
    }
});

router.delete('/lifesim/plot-step/:stepId', async (req, res) => {
    try {
        const result = await deletePlotStep(req.params.stepId);
        if (result.changes === 0) {
            return res.status(404).json({ error: '步骤不存在' });
        }
        res.json({ success: true, message: '步骤已删除' });
    } catch (err) {
        res.status(500).json({ error: '删除步骤失败', message: err.message });
    }
});

router.get('/lifesim/plot-by-age/:worldId/:age', async (req, res) => {
    try {
        const plot = await getPlotByAge(req.params.worldId, parseInt(req.params.age));
        if (!plot) {
            return res.status(404).json({ error: '该年龄段没有剧情' });
        }
        res.json(plot);
    } catch (err) {
        res.status(500).json({ error: '获取剧情失败', message: err.message });
    }
});

router.post('/lifesim/plot-characters', async (req, res) => {
    try {
        const { plotId, worldCharacterId, name, role, description, desire, stance, flaw, relationships } = req.body;

        if (!plotId || !name) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const characterId = `pc_${plotId}_${Date.now()}`;
        const result = await createPlotCharacter({
            id: characterId,
            plotId,
            worldCharacterId,
            name,
            role,
            description,
            desire,
            stance,
            flaw,
            relationships
        });

        res.json({ success: true, character: result });
    } catch (err) {
        res.status(500).json({ error: '创建剧情角色失败', message: err.message });
    }
});

router.get('/lifesim/plot-characters/:plotId', async (req, res) => {
    try {
        const characters = await getPlotCharacters(req.params.plotId);
        res.json(characters);
    } catch (err) {
        res.status(500).json({ error: '获取剧情角色列表失败', message: err.message });
    }
});

router.post('/lifesim/plot-characters/b带出', async (req, res) => {
    try {
        const { plotId, worldCharacterId, name, role, description, desire, stance, flaw, relationships } = req.body;

        if (!plotId || !name) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const characterId = `pc_${plotId}_${Date.now()}`;
        const result = await createPlotCharacter({
            id: characterId,
            plotId,
            worldCharacterId,
            name,
            role,
            description,
            desire,
            stance,
            flaw,
            relationships
        });

        res.json({ success: true, character: result });
    } catch (err) {
        res.status(500).json({ error: '带出角色失败', message: err.message });
    }
});

module.exports = router;
