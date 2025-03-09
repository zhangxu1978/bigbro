const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const app = express();
const port = 3000;
const proxy = 'http://127.0.0.1:7890'; // 根据实际情况修改代理地址和端口
const agent = new HttpsProxyAgent(proxy);
// 中间件配置
app.use(bodyParser.json());
app.use(express.static('public'));

// 读取配置文件
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'key.config'), 'utf8'));

// 读取助手配置文件
const assistantsFile = path.join(__dirname, 'data', 'assistants.json');
let assistantsConfig = JSON.parse(fs.readFileSync(assistantsFile, 'utf8'));

// 助手管理API
app.get('/api/assistants', (req, res) => {
    res.json(assistantsConfig);
});

app.get('/api/assistants/:id', (req, res) => {
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

app.post('/api/assistants', (req, res) => {
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

app.put('/api/assistants/:id', (req, res) => {
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

app.delete('/api/assistants/:id', (req, res) => {
    const id = req.params.id;
    
    if (!assistantsConfig.assistants[id]) {
        return res.status(404).json({ error: '助手不存在' });
    }
    
    delete assistantsConfig.assistants[id];
    fs.writeFileSync(assistantsFile, JSON.stringify(assistantsConfig, null, 4));
    res.json({ message: '删除成功' });
});

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

// API路由
// 获取树形数据
app.get('/api/tree', (req, res) => {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    res.json(data);
});

// 添加新节点
app.post('/api/node', (req, res) => {
    const { parentId, nodeType, text, description } = req.body;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 验证根节点只能添加书籍
    if (parentId === 'root' && nodeType !== '书籍') {
        return res.status(400).json({ error: '根节点只能添加书籍类型的子节点' });
    }

    // 查找父节点并验证类型
    function findParentNode(node) {
        if (node.id === parentId) {
            return node;
        }
        for (let child of node.children) {
            const found = findParentNode(child);
            if (found) return found;
        }
        return null;
    }

    const parentNode = findParentNode(data);
    if (!parentNode) {
        return res.status(404).json({ error: '父节点未找到' });
    }

    // 验证父节点为书籍类型时才能添加其他类型节点
    if (parentNode.id!="root"&& parentNode.type !== '书籍' && nodeType!== parentNode.type) {
        return res.status(400).json({ error:parentNode.type+ '只有书籍节点才能添加其他类型的子节点' });
    }

    // 生成新的节点ID
    function generateNodeId(parentNode) {
        if (parentNode.id === 'root') {
            // 获取所有一级节点
            const firstLevelNodes = data.children;
            let maxId = 0;
            firstLevelNodes.forEach(node => {
                const id = parseInt(node.id);
                if (!isNaN(id) && id > maxId) maxId = id;
            });
            const newId = maxId + 1;
            return newId.toString().padStart(3, '0');
        } else {
            // 获取同级节点
            const siblings = parentNode.children;
            let maxId = 0;
            const parentIdLength = parentNode.id.length;
            siblings.forEach(node => {
                const idSuffix = node.id.substring(parentIdLength);
                const id = parseInt(idSuffix);
                if (!isNaN(id) && id > maxId) maxId = id;
            });
            const newId = maxId + 1;
            return parentNode.id + newId.toString().padStart(3, '0');
        }
    }

    const newNode = {
        id: generateNodeId(parentNode),
        type: nodeType,
        text: text,
        description: description || '',
        children: []
    };

    function addNode(node) {
        if (node.id === parentId) {
            node.children.push(newNode);
            return true;
        }
        for (let child of node.children) {
            if (addNode(child)) return true;
        }
        return false;
    }

    if (addNode(data)) {
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.json(newNode);
    } else {
        res.status(404).json({ error: '父节点未找到' });
    }
});

// 删除节点
app.delete('/api/node/:id', (req, res) => {
    const nodeId = req.params.id;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 不允许删除根节点
    if (nodeId === 'root') {
        return res.status(400).json({ error: '不能删除根节点' });
    }

    function deleteNode(node) {
        const index = node.children.findIndex(child => child.id === nodeId);
        if (index !== -1) {
            // 找到节点并删除
            node.children.splice(index, 1);
            return true;
        }
        // 递归查找子节点
        for (let child of node.children) {
            if (deleteNode(child)) return true;
        }
        return false;
    }

    if (deleteNode(data)) {
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.json({ message: '节点删除成功' });
    } else {
        res.status(404).json({ error: '节点未找到' });
    }
});

// 修改节点
app.put('/api/node/:id', (req, res) => {
    const nodeId = req.params.id;
    const { text, nodeType, description } = req.body;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 不允许修改根节点类型
    if (nodeId === 'root' && nodeType) {
        return res.status(400).json({ error: '不能修改根节点的类型' });
    }

    function updateNode(node) {
        if (node.id === nodeId) {
            // 如果提供了新的文本，则更新文本
            if (text !== undefined) {
                node.text = text;
            }
            // 如果提供了新的节点类型，则更新类型
            if (nodeType !== undefined) {
                node.type = nodeType;
            }
            // 如果提供了新的描述，则更新描述
            if (description !== undefined) {
                node.description = description;
            }
            return { success: true, node };
        }
        // 递归查找子节点
        for (let child of node.children) {
            const result = updateNode(child);
            if (result) return result;
        }
        return null;
    }

    const result = updateNode(data);
    if (!result) {
        return res.status(404).json({ error: '节点未找到' });
    }
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }

    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    res.json(result.node);
});

// 获取单个节点信息
app.get('/api/node/:id', (req, res) => {
    const nodeId = req.params.id;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    function findNode(node) {
        if (node.id === nodeId) {
            return node;
        }
        for (let child of node.children) {
            const found = findNode(child);
            if (found) return found;
        }
        return null;
    }

    const node = findNode(data);
    if (!node) {
        return res.status(404).json({ error: '节点未找到' });
    }

    res.json(node);
});

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
app.post('/api/auto-generate-children', (req, res) => {
    const { parentId, text } = req.body;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 查找父节点
    function findParentNode(node) {
        if (node.id === parentId) {
            return node;
        }
        for (let child of node.children) {
            const found = findParentNode(child);
            if (found) return found;
        }
        return null;
    }

    const parentNode = findParentNode(data);
    if (!parentNode) {
        return res.status(404).json({ error: '父节点未找到' });
    }

    // 提取文本中的{}内容并解析JSON
    const matches = text.match(/\{([^}]+)\}/g);
    if (!matches) {
        return res.status(400).json({ error: '未找到有效的{}格式内容' });
    }

    const newNodes = matches.map(match => {
        try {
            const jsonContent = JSON.parse(match);
            if (!jsonContent.type || !jsonContent.text) {
                throw new Error('缺少必要的字段');
            }
            return {
                id: generateNodeId(parentNode),
                type: jsonContent.type,
                text: jsonContent.text,
                description: jsonContent.description || '',
                children: []
            };
        } catch (error) {
            throw new Error('JSON格式不正确或缺少必要字段');
        }
    });

    parentNode.children.push(...newNodes);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    res.json(newNodes);
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
})


// 日志写入函数
function writeToLog(userMessage, aiResponse) {
    try {
        const now = new Date();
        const fileName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.log`;
        const logPath = path.join(logsDir, fileName);
        
        const logContent = `时间: ${now.toISOString()}\n` +
                          `字数: ${JSON.stringify(userMessage, null, 2).length}\n` +
                          `用户发送:\n${JSON.stringify(userMessage, null, 2)}\n\n` +
                          `AI回复字数: ${aiResponse.length}:\n${JSON.stringify(aiResponse, null, 2)}\n` +
                          `----------------------------------------\n`;
        
        fs.appendFileSync(logPath, logContent, 'utf8');
    } catch (error) {
        console.error('写入日志失败:', error);
    }
}
//通过接口写入日志
app.post('/api/write-log', (req, res) => {
    const { userMessage, aiResponse } = req.body;
    writeToLog(userMessage, aiResponse);
    res.json({ success: true, message: '日志写入成功' });
});
// 创建日志目录
const logsDir = path.join(__dirname, 'logs');
try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
} catch (error) {
    console.error('创建logs目录失败:', error);
}