const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
const port = 3000;

// 中间件配置
app.use(bodyParser.json());
app.use(express.static('public'));

// 读取配置文件
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'key.config'), 'utf8'));

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
    if (parentNode.type !== '书籍' && nodeType !== '书籍') {
        return res.status(400).json({ error: '只有书籍节点才能添加其他类型的子节点' });
    }

    const newNode = {
        id: Date.now().toString(),
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
                // 检查节点是否有子节点
                if (node.children && node.children.length > 0 && nodeType !== '书籍') {
                    return { error: '只有书籍类型的节点才能包含子节点' };
                }
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

// 修改 API 配置路由
app.get('/api/config', (req, res) => {
    // 返回不包含敏感信息的配置
    const publicConfig = {
        models: config.models.map(model => ({
            id: model.id,
            name: model.name,
            provider: model.provider
        })),
        systemPrompts: config.systemPrompts
    };
    res.json(publicConfig);
});

// 修改聊天 API 路由
app.post('/api/chat', async (req, res) => {
    const { model: modelId, assistant, message } = req.body;
    
    try {
        const model = config.models.find(m => m.id === modelId);
        if (!model) {
            return res.status(400).json({ error: '不支持的模型类型' });
        }

        const systemPrompt = config.systemPrompts[assistant] || config.systemPrompts.default;
        let response;

        switch (model.provider) {
            case 'google':
                response = await axios.post(`${model.apiBase}/models/${model.model}:generateContent`, {
                    contents: [{
                        role: 'user',
                        parts: [{ text: `${systemPrompt}\n${message}` }]
                    }]
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${model.apiKey}`
                    }
                });
                res.json({ response: response.data.candidates[0].content.parts[0].text });
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
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ]
                }, {
                    headers: {
                        'Authorization': `Bearer ${model.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                res.json({ response: response.data.choices[0].message.content });
                break;



            default:
                res.status(400).json({ error: '不支持的服务提供商' });
        }
    } catch (error) {
        console.error('AI API调用错误:', error);
        res.status(500).json({ error: 'AI服务调用失败' });
    }
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
})