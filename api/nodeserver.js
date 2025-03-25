const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 确保data目录存在
const dataDir = path.join(__dirname, '..', 'data');
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

// 获取树形数据
router.get('/tree', (req, res) => {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    res.json(data);
});

// 添加新节点
router.post('/node', (req, res) => {
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
    // if (parentNode.id!="root"&& parentNode.type !== '书籍' && nodeType!== parentNode.type) {
    //     return res.status(400).json({ error:parentNode.type+ '只有书籍节点才能添加其他类型的子节点' });
    // }

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
                // 只考虑直接子节点的ID后缀
                if (node.id.startsWith(parentNode.id) && node.id.length === parentNode.id.length + 3) {
                    const idSuffix = node.id.substring(parentIdLength);
                    const id = parseInt(idSuffix);
                    if (!isNaN(id) && id > maxId) maxId = id;
                }
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
router.delete('/node/:id', (req, res) => {
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
router.put('/node/:id', (req, res) => {
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
            return true;
        }
        // 递归查找子节点
        for (let child of node.children) {
            if (updateNode(child)) return true;
        }
        return false;
    }

    if (updateNode(data)) {
        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        res.json({ message: '节点更新成功' });
    } else {
        res.status(404).json({ error: '节点未找到' });
    }
});

// 获取单个节点
router.get('/node/:id', (req, res) => {
    const nodeId = req.params.id;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    function findNode(node) {
        if (node.id === nodeId) {
            return node;
        }
        if (node.children) {
            for (let child of node.children) {
                const found = findNode(child);
                if (found) return found;
            }
        }
        return null;
    }

    const node = findNode(data);
    if (node) {
        res.json(node);
    } else {
        res.status(404).json({ error: '节点未找到' });
    }
});

// 更新节点父节点
router.put('/node/:id/parent', (req, res) => {
    const nodeId = req.params.id;
    const { newParentId } = req.body;
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // 不允许移动根节点
    if (nodeId === 'root') {
        return res.status(400).json({ error: '不能移动根节点' });
    }

    let nodeToMove = null;
    let oldParent = null;

    // 查找要移动的节点和其父节点
    function findNodeAndParent(node, parent = null) {
        if (node.id === nodeId) {
            nodeToMove = node;
            oldParent = parent;
            return true;
        }
        if (node.children && node.children.length > 0) {
            for (let child of node.children) {
                if (findNodeAndParent(child, node)) {
                    return true;
                }
            }
        }
        return false;
    }

    // 查找新的父节点
    function findNewParent(node) {
        if (node.id === newParentId) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            for (let child of node.children) {
                const found = findNewParent(child);
                if (found) return found;
            }
        }
        return null;
    }

    // 检查是否会形成循环引用
    function isDescendant(parent, child) {
        if (parent.id === child.id) {
            return true;
        }
        if (child.children && child.children.length > 0) {
            for (let grandChild of child.children) {
                if (isDescendant(parent, grandChild)) {
                    return true;
                }
            }
        }
        return false;
    }

    findNodeAndParent(data);
    const newParent = findNewParent(data);

    if (!nodeToMove) {
        return res.status(404).json({ error: '要移动的节点未找到' });
    }

    if (!newParent) {
        return res.status(404).json({ error: '新的父节点未找到' });
    }

    // 检查是否会形成循环引用
    // if (isDescendant(nodeToMove, newParent)) {
    //     return res.status(400).json({ error: '不能将节点移动到其子节点下' });
    // }

    // 从原父节点中移除
    if (oldParent) {
        const index = oldParent.children.findIndex(child => child.id === nodeId);
        if (index !== -1) {
            oldParent.children.splice(index, 1);
        }
    }

    // 添加到新父节点
    newParent.children.push(nodeToMove);

    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    res.json({ message: '节点移动成功' });
});

module.exports = router;