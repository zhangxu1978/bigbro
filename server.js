const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// 导入路由模块
const searchRouter = require('./api/searchserver');
const assistantRouter = require('./api/assistantserver');
const aiModelRouter = require('./api/aimodelserver');

// 中间件配置
app.use(bodyParser.json());
app.use(express.static('public'));

// 挂载路由
app.use('/api', searchRouter);
app.use('/api', assistantRouter);
app.use('/api', aiModelRouter);

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