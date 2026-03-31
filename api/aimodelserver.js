const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { writeToLog } = require('../utils/logger');

// 本地代理地址
const PROXY_BASE_URL = 'http://127.0.0.1:3100';

// 读取助手配置文件
const assistantsFile = path.join(__dirname, '..', 'data', 'assistants.json');
let assistantsConfig = JSON.parse(fs.readFileSync(assistantsFile, 'utf8'));

// 配置文件路径
const modelConfigsFile = path.join(__dirname, '..', 'data', 'model_configs.json');

// 读取模型配置文件
function readModelConfigs() {
    if (!fs.existsSync(modelConfigsFile)) {
        return { configs: {} };
    }
    return JSON.parse(fs.readFileSync(modelConfigsFile, 'utf8'));
}

// 保存模型配置
router.post('/model-configs', (req, res) => {
    const { name, config } = req.body;
    const modelConfigs = readModelConfigs();

    modelConfigs.configs[name] = config;
    fs.writeFileSync(modelConfigsFile, JSON.stringify(modelConfigs, null, 2));

    res.json({ message: '配置保存成功' });
});

// 获取所有保存的配置
router.get('/model-configs', (req, res) => {
    const modelConfigs = readModelConfigs();
    res.json(modelConfigs);
});

// 删除模型配置
router.delete('/model-configs/:name', (req, res) => {
    const configName = req.params.name;
    const modelConfigs = readModelConfigs();

    if (!modelConfigs.configs[configName]) {
        return res.status(404).json({ error: '配置不存在' });
    }

    delete modelConfigs.configs[configName];
    fs.writeFileSync(modelConfigsFile, JSON.stringify(modelConfigs, null, 2));

    res.json({ message: '配置删除成功' });
});

// 获取 API 配置（从本地代理获取模型列表）
router.get('/config', async (req, res) => {
    try {
        // 从本地代理获取模型列表
        const response = await axios.get(`${PROXY_BASE_URL}/api/models/list`);
        const models = response.data.models || [];

        // 转换为前端需要的格式
        const publicConfig = {
            models: models.map(model => ({
                id: model.id,
                name: model.name || model.id,
                provider: 'local-proxy',
                model: model.id
            })),
            systemPrompts: {}
        };

        res.json(publicConfig);
    } catch (error) {
        console.error('获取模型列表失败:', error.message);
        res.status(500).json({ error: '获取模型列表失败: ' + error.message });
    }
});

// 聊天 API（调用本地代理）
router.post('/chat', async (req, res) => {
    const { model: modelId, assistant, message, systemPrompt, conversationHistory = [] } = req.body;

    try {
        // 优先使用传入的系统提示词，如果没有则使用助手默认的提示词
        const defaultSystemPrompt = assistantsConfig.assistants[assistant]?.prompt || assistantsConfig.assistants.default.prompt;
        const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

        // 构建完整的对话历史
        const messages = [
            { role: 'system', content: finalSystemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        // 调用本地代理的 chat/completions 接口
        const response = await axios.post(`${PROXY_BASE_URL}/v1/chat/completions`, {
            model: modelId,
            messages: messages,
            max_tokens: 8000,
            temperature: 0.7
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Model-ID': modelId
            }
        });

        // 解析 OpenAI 兼容格式的响应
        const aiResponse = response.data.choices[0]?.message?.content || '';

        // 记录日志
        writeToLog(messages, aiResponse);

        res.json({ response: aiResponse });
    } catch (error) {
        console.error('AI API调用错误:', error.message);
        if (error.response) {
            console.error('错误响应:', error.response.data);
        }
        res.status(500).json({ error: 'AI服务调用失败: ' + (error.response?.data?.error?.message || error.message) });
    }
});

module.exports = router;
