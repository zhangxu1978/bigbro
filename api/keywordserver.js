const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 确保data目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// 关键字数据文件路径
const keywordsFilePath = path.join(dataDir, 'keywords.json');

// 初始化关键字文件
if (!fs.existsSync(keywordsFilePath)) {
    fs.writeFileSync(keywordsFilePath, JSON.stringify([]));
}

// 获取所有关键字
router.get('/keywords', (req, res) => {
    try {
        const keywords = JSON.parse(fs.readFileSync(keywordsFilePath, 'utf8'));
        res.json(keywords);
    } catch (error) {
        console.error('读取关键字文件出错:', error);
        res.status(500).json({ error: '获取关键字失败' });
    }
});

// 添加新关键字
router.post('/keywords', (req, res) => {
    try {
        const keywords = JSON.parse(fs.readFileSync(keywordsFilePath, 'utf8'));
        const newKeyword = req.body;
        
        // 生成唯一ID
        newKeyword.id = Date.now().toString();
        
        // 添加到数组
        keywords.push(newKeyword);
        
        // 保存到文件
        fs.writeFileSync(keywordsFilePath, JSON.stringify(keywords, null, 2));
        
        res.status(201).json(newKeyword);
    } catch (error) {
        console.error('添加关键字出错:', error);
        res.status(500).json({ error: '添加关键字失败' });
    }
});

// 更新关键字
router.put('/keywords/:id', (req, res) => {
    try {
        const keywordId = req.params.id;
        const updatedKeyword = req.body;
        
        let keywords = JSON.parse(fs.readFileSync(keywordsFilePath, 'utf8'));
        
        // 查找并更新关键字
        const index = keywords.findIndex(k => k.id === keywordId);
        if (index === -1) {
            return res.status(404).json({ error: '关键字不存在' });
        }
        
        // 保留ID
        updatedKeyword.id = keywordId;
        keywords[index] = updatedKeyword;
        
        // 保存到文件
        fs.writeFileSync(keywordsFilePath, JSON.stringify(keywords, null, 2));
        
        res.json(updatedKeyword);
    } catch (error) {
        console.error('更新关键字出错:', error);
        res.status(500).json({ error: '更新关键字失败' });
    }
});

// 删除关键字
router.delete('/keywords/:id', (req, res) => {
    try {
        const keywordId = req.params.id;
        
        let keywords = JSON.parse(fs.readFileSync(keywordsFilePath, 'utf8'));
        
        // 过滤掉要删除的关键字
        const filteredKeywords = keywords.filter(k => k.id !== keywordId);
        
        if (filteredKeywords.length === keywords.length) {
            return res.status(404).json({ error: '关键字不存在' });
        }
        
        // 保存到文件
        fs.writeFileSync(keywordsFilePath, JSON.stringify(filteredKeywords, null, 2));
        
        res.json({ message: '关键字删除成功' });
    } catch (error) {
        console.error('删除关键字出错:', error);
        res.status(500).json({ error: '删除关键字失败' });
    }
});

module.exports = router;