const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 确保data目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// 人物卡数据文件路径
const charactersFilePath = path.join(dataDir, 'characters.json');

// 初始化人物卡文件
if (!fs.existsSync(charactersFilePath)) {
    fs.writeFileSync(charactersFilePath, JSON.stringify([]));
}

// 获取所有人物卡
router.get('/characters', (req, res) => {
    try {
        const characters = JSON.parse(fs.readFileSync(charactersFilePath, 'utf8'));
        res.json(characters);
    } catch (error) {
        console.error('读取人物卡文件出错:', error);
        res.status(500).json({ error: '获取人物卡失败' });
    }
});

// 获取单个人物卡
router.get('/characters/:id', (req, res) => {
    try {
        const characterId = req.params.id;
        const characters = JSON.parse(fs.readFileSync(charactersFilePath, 'utf8'));
        
        const character = characters.find(c => c.id === characterId);
        if (!character) {
            return res.status(404).json({ error: '人物卡不存在' });
        }
        
        res.json(character);
    } catch (error) {
        console.error('获取人物卡出错:', error);
        res.status(500).json({ error: '获取人物卡失败' });
    }
});

// 添加新人物卡
router.post('/characters', (req, res) => {
    try {
        const characters = JSON.parse(fs.readFileSync(charactersFilePath, 'utf8'));
        const newCharacter = req.body;
        
        // 生成唯一ID
        newCharacter.id = Date.now().toString();
        
        // 添加到数组
        characters.push(newCharacter);
        
        // 保存到文件
        fs.writeFileSync(charactersFilePath, JSON.stringify(characters, null, 2));
        
        res.status(201).json(newCharacter);
    } catch (error) {
        console.error('添加人物卡出错:', error);
        res.status(500).json({ error: '添加人物卡失败' });
    }
});

// 更新人物卡
router.put('/characters/:id', (req, res) => {
    try {
        const characterId = req.params.id;
        const updatedCharacter = req.body;
        
        let characters = JSON.parse(fs.readFileSync(charactersFilePath, 'utf8'));
        
        // 查找并更新人物卡
        const index = characters.findIndex(c => c.id === characterId);
        if (index === -1) {
            return res.status(404).json({ error: '人物卡不存在' });
        }
        
        // 保留ID
        updatedCharacter.id = characterId;
        characters[index] = updatedCharacter;
        
        // 保存到文件
        fs.writeFileSync(charactersFilePath, JSON.stringify(characters, null, 2));
        
        res.json(updatedCharacter);
    } catch (error) {
        console.error('更新人物卡出错:', error);
        res.status(500).json({ error: '更新人物卡失败' });
    }
});

// 删除人物卡
router.delete('/characters/:id', (req, res) => {
    try {
        const characterId = req.params.id;
        
        let characters = JSON.parse(fs.readFileSync(charactersFilePath, 'utf8'));
        
        // 过滤掉要删除的人物卡
        const filteredCharacters = characters.filter(c => c.id !== characterId);
        
        if (filteredCharacters.length === characters.length) {
            return res.status(404).json({ error: '人物卡不存在' });
        }
        
        // 保存到文件
        fs.writeFileSync(charactersFilePath, JSON.stringify(filteredCharacters, null, 2));
        
        res.json({ message: '人物卡删除成功' });
    } catch (error) {
        console.error('删除人物卡出错:', error);
        res.status(500).json({ error: '删除人物卡失败' });
    }
});

module.exports = router;