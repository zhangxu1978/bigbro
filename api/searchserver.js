const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// 从数据文件中读取树形结构数据
function readTreeData() {
    const dataPath = path.join(__dirname, '..', 'data', 'tree.json');
    try {
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading tree data:', error);
        return null;
    }
}

// 递归搜索节点
function searchNodes(node, searchText, results = []) {
    // 转换为小写以进行不区分大小写的比较
    const lowerSearchText = searchText.toLowerCase();
    const nodeText = (node.text || '').toLowerCase();
    const nodeDescription = (node.description || '').toLowerCase();

    // 检查节点的text和description是否包含搜索文本
    if (nodeText.includes(lowerSearchText) || nodeDescription.includes(lowerSearchText)) {
        results.push(node.id);
    }

    // 递归搜索子节点
    if (node.children && node.children.length > 0) {
        for (let child of node.children) {
            searchNodes(child, searchText, results);
        }
    }

    return results;
}

// 在指定节点及其子节点中搜索文本
function findNodeAndSearch(node, nodeId, searchText, results = []) {
    if (node.id === nodeId) {
        // 找到指定节点，开始搜索
        return searchNodes(node, searchText);
    }

    // 递归查找指定节点
    if (node.children && node.children.length > 0) {
        for (let child of node.children) {
            const found = findNodeAndSearch(child, nodeId, searchText, results);
            if (found.length > 0) {
                return found;
            }
        }
    }

    return results;
}

// 搜索API路由
router.get('/search', (req, res) => {
    const { nodeId, searchText } = req.query;

    if (!searchText) {
        return res.status(400).json({ error: '搜索文本不能为空' });
    }

    const treeData = readTreeData();
    if (!treeData) {
        return res.status(500).json({ error: '无法读取树形数据' });
    }

    // 如果没有指定节点ID，从根节点开始搜索
    const startNode = nodeId ? findNodeAndSearch(treeData, nodeId, searchText) : searchNodes(treeData, searchText);

    res.json(startNode);
});

module.exports = router;