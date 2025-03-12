const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { writeToLog } = require('../utils/logger');

// 代理配置
const proxy = 'http://127.0.0.1:7890';
const agent = new HttpsProxyAgent(proxy);

// 读取配置文件
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'key.config'), 'utf8'));

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

// 获取 API 配置
router.get('/config', (req, res) => {
    // 返回不包含敏感信息的配置
    const publicConfig = {
        models: config.models.map(model => ({
            id: model.id,
            name: model.name,
            provider: model.provider,
            model: model.model
        })),
        systemPrompts: config.systemPrompts
    };
    res.json(publicConfig);
});

// 聊天 API
router.post('/chat', async (req, res) => {
    const { model: modelId, assistant, message, systemPrompt, conversationHistory = [] } = req.body;
    
    try {
        const model = config.models.find(m => m.id === modelId);
        if (!model) {
            return res.status(400).json({ error: '不支持的模型类型' });
        }

        // 优先使用传入的系统提示词，如果没有则使用助手默认的提示词
        const defaultSystemPrompt = assistantsConfig.assistants[assistant]?.prompt || assistantsConfig.assistants.default.prompt;
        const finalSystemPrompt = systemPrompt || defaultSystemPrompt;
        
        let response;
        
        // 构建完整的对话历史
        const messages = [
            { role: 'system', content: finalSystemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ];
        // 构建完整的对话历史
        const messagesGoogle = [
            { role: 'system', content: finalSystemPrompt },
            ...conversationHistory
        ];
        switch (model.provider) {
            case 'google':
                // 转换对话历史为Google API格式
                const contents = messagesGoogle.map(msg => ({
                    role: msg.role === 'system' ? 'user' : msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                }));
                
                if (message) {
                    contents.push({
                        role: 'user',
                        parts: [{ text: message }]
                    });
                }
                
                response = await axios.post(`${model.apiBase}/models/${model.model}:generateContent?key=${model.apiKey}`, {
                    contents
                }, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    httpsAgent: agent
                });
                const aiResponse = response.data.candidates[0].content.parts[0].text;
                writeToLog(messages, aiResponse);
                res.json({ response: aiResponse });
                break;
            case 'tianyi':
            case 'huawei':
            case 'yingweida':
            case 'baidu':
            case 'aliyun':
            case 'yidong':
            case 'DeepSeek':
            case 'doubao':
            case 'doubao-r1':
            case 'siliconflowDeepSeek-R1':
            case 'siliconflowDeepSeek-V3':
            case 'siliconflowQVQ-72B-Preview':
                response = await axios.post(`${model.apiBase}/chat/completions`, {
                    model: model.model,
                    messages: messages
                }, {
                    headers: {
                        'Authorization': `Bearer ${model.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                const aiResponse1 = response.data.choices[0].message.content;
                writeToLog(messages, aiResponse1);
                res.json({ response: aiResponse1 });
                break;

            default:
                res.status(400).json({ error: '不支持的服务提供商' });
        }
    } catch (error) {
        console.error('AI API调用错误:', error);
        res.status(500).json({ error: 'AI服务调用失败' });
    }
});

module.exports = router;