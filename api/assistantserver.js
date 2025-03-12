const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 读取助手配置文件
const assistantsFile = path.join(__dirname, '..', 'data', 'assistants.json');
let assistantsConfig = JSON.parse(fs.readFileSync(assistantsFile, 'utf8'));

// 获取所有助手
router.get('/assistants', (req, res) => {
    res.json(assistantsConfig);
});

// 获取单个助手
router.get('/assistants/:id', (req, res) => {
    const freshConfig = JSON.parse(fs.readFileSync(assistantsFile, 'utf8'));
    const assistant = freshConfig.assistants[req.params.id];
    if (!assistant) {
        return res.status(404).json({ error: '助手不存在' });
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.json(assistant);
});

// 创建新助手
router.post('/assistants', (req, res) => {
    const { name, prompt, markdownFormat, jsonFormat } = req.body;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    
    if (assistantsConfig.assistants[id]) {
        return res.status(400).json({ error: '助手ID已存在' });
    }
    
    assistantsConfig.assistants[id] = {
        id,
        name,
        prompt,
        markdownFormat: markdownFormat || '',
        jsonFormat: jsonFormat || ''
    };
    
    fs.writeFileSync(assistantsFile, JSON.stringify(assistantsConfig, null, 4));
    res.json(assistantsConfig.assistants[id]);
});

// 更新助手
router.put('/assistants/:id', (req, res) => {
    const { name, prompt, markdownFormat, jsonFormat } = req.body;
    const id = req.params.id;
    
    if (!assistantsConfig.assistants[id]) {
        return res.status(404).json({ error: '助手不存在' });
    }
    
    assistantsConfig.assistants[id] = {
        id,
        name,
        prompt,
        markdownFormat: markdownFormat || assistantsConfig.assistants[id].markdownFormat || '',
        jsonFormat: jsonFormat || assistantsConfig.assistants[id].jsonFormat || ''
    };
    
    fs.writeFileSync(assistantsFile, JSON.stringify(assistantsConfig, null, 4));
    res.json(assistantsConfig.assistants[id]);
});

// 删除助手
router.delete('/assistants/:id', (req, res) => {
    const id = req.params.id;
    
    if (!assistantsConfig.assistants[id]) {
        return res.status(404).json({ error: '助手不存在' });
    }
    
    delete assistantsConfig.assistants[id];
    fs.writeFileSync(assistantsFile, JSON.stringify(assistantsConfig, null, 4));
    res.json({ message: '删除成功' });
});

module.exports = router;