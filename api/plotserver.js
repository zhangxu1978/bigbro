const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 确保data目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// 情节数据文件路径
const plotsFilePath = path.join(dataDir, 'plots.json');

// 初始化情节文件
if (!fs.existsSync(plotsFilePath)) {
    fs.writeFileSync(plotsFilePath, JSON.stringify([]));
}

// 获取所有情节
router.get('/plots', (req, res) => {
    try {
        const plots = JSON.parse(fs.readFileSync(plotsFilePath, 'utf8'));
        res.json(plots);
    } catch (error) {
        console.error('读取情节文件出错:', error);
        res.status(500).json({ error: '获取情节失败' });
    }
});

// 添加新情节
router.post('/plots', (req, res) => {
    try {
        const plots = JSON.parse(fs.readFileSync(plotsFilePath, 'utf8'));
        const newPlot = req.body;
        
        // 生成唯一ID
        newPlot.id = Date.now().toString();
        
        // 添加到数组
        plots.push(newPlot);
        
        // 保存到文件
        fs.writeFileSync(plotsFilePath, JSON.stringify(plots, null, 2));
        
        res.status(201).json(newPlot);
    } catch (error) {
        console.error('添加情节出错:', error);
        res.status(500).json({ error: '添加情节失败' });
    }
});

// 更新情节
router.put('/plots/:id', (req, res) => {
    try {
        const plotId = req.params.id;
        const updatedPlot = req.body;
        
        let plots = JSON.parse(fs.readFileSync(plotsFilePath, 'utf8'));
        
        // 查找并更新情节
        const index = plots.findIndex(p => p.id === plotId);
        if (index === -1) {
            return res.status(404).json({ error: '情节不存在' });
        }
        
        // 保留ID
        updatedPlot.id = plotId;
        plots[index] = updatedPlot;
        
        // 保存到文件
        fs.writeFileSync(plotsFilePath, JSON.stringify(plots, null, 2));
        
        res.json(updatedPlot);
    } catch (error) {
        console.error('更新情节出错:', error);
        res.status(500).json({ error: '更新情节失败' });
    }
});

// 删除情节
router.delete('/plots/:id', (req, res) => {
    try {
        const plotId = req.params.id;
        
        let plots = JSON.parse(fs.readFileSync(plotsFilePath, 'utf8'));
        
        // 过滤掉要删除的情节
        const filteredPlots = plots.filter(p => p.id !== plotId);
        
        if (filteredPlots.length === plots.length) {
            return res.status(404).json({ error: '情节不存在' });
        }
        
        // 保存到文件
        fs.writeFileSync(plotsFilePath, JSON.stringify(filteredPlots, null, 2));
        
        res.json({ message: '情节删除成功' });
    } catch (error) {
        console.error('删除情节出错:', error);
        res.status(500).json({ error: '删除情节失败' });
    }
});

module.exports = router;