let currentParentId = null;
let currentNodeId = null;

// 获取树形数据
async function fetchTreeData() {
    const response = await fetch('/api/tree');
    const data = await response.json();
    renderTree(data);
}

// 渲染树形结构
function renderTree(node, level = 0) {
    const container = document.getElementById('treeContainer');
    if (level === 0) container.innerHTML = '';

    const nodeElement = document.createElement('div');
    nodeElement.className = 'tree-node';
    nodeElement.setAttribute('data-id', node.id);
    nodeElement.style.marginLeft = `${level}px`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'tree-node-content';

    // 添加折叠按钮
    const collapseButton = document.createElement('span');
    collapseButton.className = 'collapse-button';
    collapseButton.textContent = node.children && node.children.length > 0 ? '-' : '+';
    collapseButton.onclick = (e) => {
        e.stopPropagation();
        const childrenContainer = nodeElement.querySelector('.children-container');
        if (childrenContainer) {
            const isCollapsed = childrenContainer.style.display === 'none';
            childrenContainer.style.display = isCollapsed ? 'block' : 'none';
            collapseButton.textContent = isCollapsed ? '-' : '+';
        }
    };

    // 添加复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox';
    checkbox.onclick = (e) => {
        e.stopPropagation();
    };

    const textSpan = document.createElement('span');
    textSpan.textContent = `${node.text} ${node.type ? `(${node.type})` : ''}`;

    contentDiv.appendChild(collapseButton);
    contentDiv.appendChild(checkbox);
    contentDiv.appendChild(textSpan);

    textSpan.onclick = (e) => {
        e.stopPropagation();
        currentNodeId = node.id;
        const menu = document.getElementById('nodeContextMenu');
        
        const oldOverlay = document.querySelector('.menu-overlay');
        if (oldOverlay) oldOverlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        overlay.onclick = () => {
            menu.style.display = 'none';
            overlay.remove();
        };
        document.body.appendChild(overlay);

        const rect = textSpan.getBoundingClientRect();
        menu.style.display = 'block';
        menu.style.left = rect.right + 'px';
        menu.style.top = rect.top + 'px';
    };

    nodeElement.appendChild(contentDiv);
    container.appendChild(nodeElement);

    if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'children-container';
        nodeElement.appendChild(childrenContainer);
        node.children.forEach(child => {
            const childElement = renderTree(child, level + 1);
            childrenContainer.appendChild(childElement);
        });
    }

    return nodeElement;
}

// 初始化控制面板
async function initializeControlPanel() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        const modelSelect = document.getElementById('modelSelect');
        const assistantSelect = document.getElementById('assistantSelect');
        
        // 清空现有选项
        modelSelect.innerHTML = '';
        assistantSelect.innerHTML = '';
        
        // 填充模型选项
        config.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name}`;
            modelSelect.appendChild(option);
        });
        
        // 填充助手选项
        Object.entries(config.systemPrompts).forEach(([id, prompt]) => {
            const option = document.createElement('option');
            option.value = id;
            const displayName = {
                'default': '通用助手',
                'novel': '小说策划师',
                'novel-character': '人物策划师',
                'novel-timeline': '章节策划师',
                'editor': '编辑助手',
                'writer': '写作助手',
                'reconstructor': '重构助手',
                'summarizer': '总结助手'
            }[id] || id;
            
            option.textContent = displayName;
            assistantSelect.appendChild(option);
        });
    } catch (error) {
        console.error('初始化控制面板失败:', error);
    }
}

// 显示添加节点模态框
function showAddModal(parentId) {
    currentParentId = parentId;
    document.getElementById('addNodeModal').style.display = 'block';
}

// 关闭模态框
function closeModal() {
    document.getElementById('addNodeModal').style.display = 'none';
    document.getElementById('nodeName').value = '';
}

// 添加新节点
async function addNode() {
    const nodeType = document.getElementById('nodeType').value;
    const nodeName = document.getElementById('nodeName').value;

    if (!nodeName) {
        alert('请输入节点名称');
        return;
    }

    try {
        const response = await fetch('/api/node', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parentId: currentParentId,
                nodeType: nodeType,
                text: nodeName
            })
        });

        if (response.ok) {
            closeModal();
            fetchTreeData();
        } else {
            const error = await response.json();
            alert(error.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('添加节点失败');
    }
}

// 切换面板显示/隐藏
function togglePanel(side) {
    if (side === 'right') {
        const container = document.querySelector('.right-panel-container');
        const button = container.querySelector('.right-toggle');
        const isCollapsed = container.classList.contains('panel-collapsed');

        if (isCollapsed) {
            // 展开面板
            container.classList.remove('panel-collapsed');
            button.textContent = '▶';
        } else {
            // 收起面板
            container.classList.add('panel-collapsed');
            button.textContent = '◀';
        }
    }
}

// 修改节点
function editNode(nodeId) {
    document.getElementById('editNodeModal').style.display = 'block';
    
    // 直接通过 nodeId 找到对应的节点元素
    const nodeElement = document.querySelector(`.tree-node[data-id="${nodeId}"]`);
    if (nodeElement) {
        // 获取文本内容时，需要找到 span 元素中的文本
        const textSpan = nodeElement.querySelector('.tree-node-content span:last-child');
        if (textSpan) {
            const textContent = textSpan.textContent;
            // 分离节点文本和类型
            const match = textContent.match(/(.*?)\s*(?:\((.*?)\))?$/);
            if (match) {
                const [, text, type] = match;
                document.getElementById('editNodeType').value = type || '书籍';
                document.getElementById('editNodeName').value = text.trim();
            }
        }
    }
}

// 提交修改节点
async function submitEditNode() {
    const nodeType = document.getElementById('editNodeType').value;
    const nodeName = document.getElementById('editNodeName').value;

    if (!nodeName) {
        alert('请输入节点名称');
        return;
    }

    try {
        const response = await fetch(`/api/node/${currentNodeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nodeType: nodeType,
                text: nodeName
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '修改节点失败');
        }

        closeEditModal();
        fetchTreeData();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// 关闭编辑模态框
function closeEditModal() {
    document.getElementById('editNodeModal').style.display = 'none';
    document.getElementById('editNodeName').value = '';
}

// 删除节点
async function deleteNode(nodeId) {
    if (!confirm('确定要删除此节点吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/node/${nodeId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '删除节点失败');
        }

        document.getElementById('nodeContextMenu').style.display = 'none';
        const overlay = document.querySelector('.menu-overlay');
        if (overlay) overlay.remove();
        
        fetchTreeData();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// 发送消息到AI
async function sendMessage() {
    const model = document.getElementById('modelSelect').value;
    const assistant = document.getElementById('assistantSelect').value;
    const message = document.getElementById('userInput').value;
    const responseArea = document.getElementById('responseArea');
    
    if (!message.trim()) {
        alert('请输入内容');
        return;
    }
    
    try {
        responseArea.textContent = '正在思考...';
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                assistant,
                message
            })
        });
        
        const data = await response.json();
        responseArea.textContent = data.response;
    } catch (error) {
        console.error('发送消息失败:', error);
        responseArea.textContent = '发送失败，请重试';
    }
}

// 初始化加载
document.addEventListener('DOMContentLoaded', () => {
    fetchTreeData();
    initializeControlPanel();
}); 