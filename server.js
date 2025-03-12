const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { writeToLog } = require('./utils/logger');
const app = express();
const port = 3000;
const proxy = 'http://127.0.0.1:7890'; // 根据实际情况修改代理地址和端口
const agent = new HttpsProxyAgent(proxy);

// 导入搜索路由模块
const searchRouter = require('./api/searchserver');

// 中间件配置
app.use(bodyParser.json());
app.use(express.static('public'));

// 挂载搜索路由
app.use('/api', searchRouter);

// 读取配置文件
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'key.config'), 'utf8'));

// 导入助手管理路由模块
const assistantRouter = require('./api/assistantserver');

// 挂载助手管理路由
app.use('/api', assistantRouter);

// 确保data目录存在
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// 数据文件路径
const dataFile = path.join(dataDir, 'tree.json');

// 如果数据文件不存在，创建初始数据
if (!fs.existsSync(dataFile)) {
    const initialData = {
        id: 'root',
        text: '根节点',
        children: []
    };
    fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
}

// 导入节点管理路由模块
const nodeRouter = require('./api/nodeserver');

// 挂载节点管理路由
app.use('/api', nodeRouter);

// 配置文件路径
const modelConfigsFile = path.join(__dirname, 'data', 'model_configs.json');

// 读取模型配置文件
function readModelConfigs() {
    if (!fs.existsSync(modelConfigsFile)) {
        return { configs: {} };
    }
    return JSON.parse(fs.readFileSync(modelConfigsFile, 'utf8'));
}

// 保存模型配置
app.post('/api/model-configs', (req, res) => {
    const { name, config } = req.body;
    const modelConfigs = readModelConfigs();
    
    modelConfigs.configs[name] = config;
    fs.writeFileSync(modelConfigsFile, JSON.stringify(modelConfigs, null, 2));
    
    res.json({ message: '配置保存成功' });
});

// 获取所有保存的配置
app.get('/api/model-configs', (req, res) => {
    const modelConfigs = readModelConfigs();
    res.json(modelConfigs);
});

// 删除模型配置
app.delete('/api/model-configs/:name', (req, res) => {
    const configName = req.params.name;
    const modelConfigs = readModelConfigs();
    
    if (!modelConfigs.configs[configName]) {
        return res.status(404).json({ error: '配置不存在' });
    }
    
    delete modelConfigs.configs[configName];
    fs.writeFileSync(modelConfigsFile, JSON.stringify(modelConfigs, null, 2));
    
    res.json({ message: '配置删除成功' });
});

// 修改 API 配置路由
app.get('/api/config', (req, res) => {
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

// 修改聊天 API 路由
app.post('/api/chat', async (req, res) => {
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
                    httpsAgent: agent, // 添加代理支持
                });
                const aiResponse = response.data.candidates[0].content.parts[0].text;
                writeToLog(messages, aiResponse);
                res.json( {response: aiResponse} );
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
                res.json( {response: aiResponse1} );
                break;



            default:
                res.status(400).json({ error: '不支持的服务提供商' });
        }
    } catch (error) {
        console.error('AI API调用错误:', error);
        res.status(500).json({ error: 'AI服务调用失败' });
    }
});

// 自动生成下级节点
app.post('/api/auto-generate-children', async (req, res) => {
    const { parentId, text } = req.body;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 改进的查找父节点函数
    function findParentNode(node, targetId) {
        // 直接检查当前节点
        if (node.id === targetId) {
            return node;
        }
        
        // 如果当前节点没有子节点，返回null
        if (!node.children || node.children.length === 0) {
            return null;
        }
        
        // 检查所有子节点
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            // 检查当前子节点
            if (child.id === targetId) {
                return child;
            }
            
            // 递归检查子节点的子节点
            const found = findParentNode(child, targetId);
            if (found) {
                return found;
            }
        }
        
        // 如果没有找到，返回null
        return null;
    }

    // 使用改进的查找函数
    const parentNode = findParentNode(data, parentId);
    
    // 调试信息
    console.log(`查找父节点: ${parentId}`);
    console.log(`查找结果: ${parentNode ? '找到' : '未找到'}`);
    
    if (!parentNode) {
        return res.status(404).json({ error: `父节点未找到: ${parentId}` });
    }

    // 生成新的节点ID - 修改后的函数
    function generateNodeId(parentNode, index) {
        if (parentNode.id === 'root') {
            // 获取所有一级节点
            const firstLevelNodes = data.children;
            let maxId = 0;
            firstLevelNodes.forEach(node => {
                const id = parseInt(node.id);
                if (!isNaN(id) && id > maxId) maxId = id;
            });
            // 加上索引确保唯一性
            const newId = maxId + 1 + index;
            return newId.toString().padStart(3, '0');
        } else {
            // 获取同级节点
            const siblings = parentNode.children;
            let maxId = 0;
            
            siblings.forEach(node => {
                // 只考虑直接子节点
                if (node.id.startsWith(parentNode.id) && node.id.length === parentNode.id.length + 3) {
                    const idSuffix = node.id.substring(parentNode.id.length);
                    const id = parseInt(idSuffix);
                    if (!isNaN(id) && id > maxId) maxId = id;
                }
            });
            
            // 加上索引确保唯一性
            const newId = maxId + 1 + index;
            return parentNode.id + newId.toString().padStart(3, '0');
        }
    }

    // 提取文本中的JSON内容
    try {
        // 尝试从文本中提取JSON对象
        let jsonObjects = [];
        
        // 方法1：尝试从{}中提取
        const matches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (matches) {
            for (const match of matches) {
                try {
                    const jsonContent = JSON.parse(match);
                    if (jsonContent.type && jsonContent.text) {
                        jsonObjects.push(jsonContent);
                    }
                } catch (e) {
                    // 解析失败，继续尝试下一个
                    console.error('JSON解析错误:', e);
                }
            }
        }
        
        // 方法2：如果上面方法没有找到有效的JSON，尝试从HTML中提取
        if (jsonObjects.length === 0 && text.includes('<pre')) {
            const preMatches = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/g);
            if (preMatches) {
                for (const preMatch of preMatches) {
                    // 提取pre标签中的内容
                    const content = preMatch.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/, '$1');
                    try {
                        // 尝试解析整个内容
                        const parsedContent = JSON.parse(content);
                        if (Array.isArray(parsedContent)) {
                            jsonObjects = parsedContent;
                        } else if (parsedContent.type && parsedContent.text) {
                            jsonObjects.push(parsedContent);
                        }
                    } catch (e) {
                        // 如果整体解析失败，尝试提取内部的JSON对象
                        const innerMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                        if (innerMatches) {
                            for (const innerMatch of innerMatches) {
                                try {
                                    const jsonContent = JSON.parse(innerMatch);
                                    if (jsonContent.type && jsonContent.text) {
                                        jsonObjects.push(jsonContent);
                                    }
                                } catch (innerE) {
                                    // 内部解析失败，继续
                                }
                            }
                        }
                    }
                }
            }
        }

        if (jsonObjects.length === 0) {
            return res.status(400).json({ error: '未找到有效的JSON格式内容' });
        }

        // 修改这里，传入索引以确保ID唯一
        const newNodes = jsonObjects.map((jsonContent, index) => {
            return {
                id: generateNodeId(parentNode, index),
                type: jsonContent.type,
                text: jsonContent.text,
                description: jsonContent.description || '',
                children: []
            };
        });

        parentNode.children.push(...newNodes);
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.json(newNodes);
    } catch (error) {
        console.error('处理JSON内容时出错:', error);
        res.status(400).json({ error: '处理内容时出错: ' + error.message });
    }
});



// 导入关键字管理路由模块
const keywordRouter = require('./api/keywordserver');

// 挂载关键字管理路由
app.use('/api', keywordRouter);

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
})