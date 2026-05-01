const express = require('express');
const router = express.Router();

const {
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
} = require('../utils/dbOperations');

router.post('/plots', async (req, res) => {
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

router.get('/plots/:worldId', async (req, res) => {
    try {
        const plots = await getPlotsByWorld(req.params.worldId);
        res.json(plots);
    } catch (err) {
        res.status(500).json({ error: '获取剧情列表失败', message: err.message });
    }
});

router.get('/plot/:plotId', async (req, res) => {
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

router.put('/plot/:plotId', async (req, res) => {
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

router.delete('/plot/:plotId', async (req, res) => {
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

router.post('/world-characters', async (req, res) => {
    try {
        const { worldId, name, role, desire, stance, flaw, relationships, description } = req.body;
        
        if (!worldId || !name) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        const characterId = `wc_${worldId}_${Date.now()}`;
        const result = await createWorldCharacter({
            id: characterId,
            worldId,
            name,
            role,
            desire,
            stance,
            flaw,
            relationships,
            description
        });
        
        res.json({ success: true, character: result });
    } catch (err) {
        res.status(500).json({ error: '创建世界角色失败', message: err.message });
    }
});

router.get('/world-characters/:worldId', async (req, res) => {
    try {
        const characters = await getWorldCharacters(req.params.worldId);
        res.json(characters);
    } catch (err) {
        res.status(500).json({ error: '获取世界角色列表失败', message: err.message });
    }
});

router.get('/world-character/:characterId', async (req, res) => {
    try {
        const character = await getWorldCharacter(req.params.characterId);
        if (!character) {
            return res.status(404).json({ error: '角色不存在' });
        }
        res.json(character);
    } catch (err) {
        res.status(500).json({ error: '获取角色失败', message: err.message });
    }
});

router.put('/world-character/:characterId', async (req, res) => {
    try {
        const { name, role, desire, stance, flaw, relationships, description } = req.body;
        
        const result = await updateWorldCharacter(req.params.characterId, {
            name,
            role,
            desire,
            stance,
            flaw,
            relationships,
            description
        });
        
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: '更新角色失败', message: err.message });
    }
});

router.delete('/world-character/:characterId', async (req, res) => {
    try {
        const result = await deleteWorldCharacter(req.params.characterId);
        if (result.changes === 0) {
            return res.status(404).json({ error: '角色不存在' });
        }
        res.json({ success: true, message: '角色已删除' });
    } catch (err) {
        res.status(500).json({ error: '删除角色失败', message: err.message });
    }
});

router.post('/plot-characters', async (req, res) => {
    try {
        const { plotId, worldCharacterId, name, role, desire, stance, flaw, relationships, description, scope } = req.body;
        
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
            desire,
            stance,
            flaw,
            relationships,
            description,
            scope: scope || 'plot_only'
        });
        
        res.json({ success: true, character: result });
    } catch (err) {
        res.status(500).json({ error: '创建剧情角色失败', message: err.message });
    }
});

router.get('/plot-characters/:plotId', async (req, res) => {
    try {
        const characters = await getPlotCharacters(req.params.plotId);
        res.json(characters);
    } catch (err) {
        res.status(500).json({ error: '获取剧情角色列表失败', message: err.message });
    }
});

router.post('/plot-characters/from-world', async (req, res) => {
    try {
        const { plotId, worldCharacterId } = req.body;
        
        if (!plotId || !worldCharacterId) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        const worldCharacter = await getWorldCharacter(worldCharacterId);
        if (!worldCharacter) {
            return res.status(404).json({ error: '世界角色不存在' });
        }
        
        const characterId = `pc_${plotId}_${Date.now()}`;
        const result = await createPlotCharacter({
            id: characterId,
            plotId,
            worldCharacterId,
            name: worldCharacter.name,
            role: worldCharacter.role,
            desire: worldCharacter.desire,
            stance: worldCharacter.stance,
            flaw: worldCharacter.flaw,
            relationships: worldCharacter.relationships,
            description: worldCharacter.description,
            scope: 'persistent'
        });
        
        res.json({ success: true, character: result });
    } catch (err) {
        res.status(500).json({ error: '从世界角色创建剧情角色失败', message: err.message });
    }
});

router.post('/plot-characters/b带出', async (req, res) => {
    try {
        const { plotId } = req.body;
        
        if (!plotId) {
            return res.status(400).json({ error: '缺少必要参数' });
        }
        
        const plotCharacters = await getPlotCharacters(plotId);
        const results = [];
        
        for (const pc of plotCharacters) {
            if (pc.scope === 'persistent') {
                if (pc.worldCharacterId) {
                    await updateWorldCharacter(pc.worldCharacterId, {
                        name: pc.name,
                        role: pc.role,
                        desire: pc.desire,
                        stance: pc.stance,
                        flaw: pc.flaw,
                        relationships: pc.relationships,
                        description: pc.description
                    });
                    results.push({ type: 'updated', worldCharacterId: pc.worldCharacterId });
                } else {
                    const plot = await getPlot(plotId);
                    const wcId = `wc_${plot.worldId}_${Date.now()}`;
                    await createWorldCharacter({
                        id: wcId,
                        worldId: plot.worldId,
                        name: pc.name,
                        role: pc.role,
                        desire: pc.desire,
                        stance: pc.stance,
                        flaw: pc.flaw,
                        relationships: pc.relationships,
                        description: pc.description
                    });
                    results.push({ type: 'created', worldCharacterId: wcId });
                }
            }
        }
        
        res.json({ success: true, results });
    } catch (err) {
        res.status(500).json({ error: '带出角色失败', message: err.message });
    }
});

router.post('/plot-steps', async (req, res) => {
    try {
        const { plotId, stepNumber, purpose, emotion, characters, summary, obstacle, achievement, narrative, status } = req.body;

        if (!plotId || stepNumber === undefined || !purpose) {
            return res.status(400).json({ error: '缺少必要参数' });
        }

        const result = await createPlotStep({
            plotId,
            stepNumber,
            purpose,
            emotion: emotion || '',
            characters: characters || '[]',
            summary: summary || '',
            obstacle: obstacle || '',
            achievement: achievement || '',
            narrative: narrative || '',
            status: status || 'pending'
        });

        res.json({ success: true, step: result });
    } catch (err) {
        res.status(500).json({ error: '创建剧情步骤失败', message: err.message });
    }
});

router.get('/plot-steps/:plotId', async (req, res) => {
    try {
        const steps = await getPlotSteps(req.params.plotId);
        res.json(steps);
    } catch (err) {
        res.status(500).json({ error: '获取剧情步骤失败', message: err.message });
    }
});

router.put('/plot-step/:stepId', async (req, res) => {
    try {
        const { purpose, emotion, characters, summary, obstacle, achievement, narrative, status } = req.body;

        const result = await updatePlotStep(req.params.stepId, {
            purpose,
            emotion: emotion || '',
            characters: characters || '[]',
            summary: summary || '',
            obstacle: obstacle || '',
            achievement: achievement || '',
            narrative: narrative || '',
            status: status || 'pending'
        });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: '更新剧情步骤失败', message: err.message });
    }
});

router.delete('/plot-step/:stepId', async (req, res) => {
    try {
        const result = await deletePlotStep(req.params.stepId);
        if (result.changes === 0) {
            return res.status(404).json({ error: '剧情步骤不存在' });
        }
        res.json({ success: true, message: '剧情步骤已删除' });
    } catch (err) {
        res.status(500).json({ error: '删除剧情步骤失败', message: err.message });
    }
});

router.get('/plot-by-age/:worldId/:age', async (req, res) => {
    try {
        const plot = await getPlotByAge(req.params.worldId, parseInt(req.params.age));
        res.json(plot);
    } catch (err) {
        res.status(500).json({ error: '获取剧情失败', message: err.message });
    }
});

module.exports = router;
