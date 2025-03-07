let currentParentId = null;
let currentNodeId = null;
let isEditing = false;
let originalContent = '';

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
        const isChecked = e.target.checked;
        
        // 更新所有子节点的复选框状态
        const childrenContainer = nodeElement.querySelector('.children-container');
        if (childrenContainer) {
            const childCheckboxes = childrenContainer.querySelectorAll('.checkbox');
            childCheckboxes.forEach(childCheckbox => {
                childCheckbox.checked = isChecked;
            });
        }

        // 更新父节点的复选框状态
        // updateParentCheckboxState(nodeElement.parentElement.closest('.tree-node'));
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
        const [configResponse, assistantsResponse] = await Promise.all([
            fetch('/api/config'),
            fetch('/api/assistants')
        ]);
        const config = await configResponse.json();
        const assistantsData = await assistantsResponse.json();
        
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
        Object.values(assistantsData.assistants).forEach(assistant => {
            const option = document.createElement('option');
            option.value = assistant.id;
            option.textContent = assistant.name;
            assistantSelect.appendChild(option);
        });
    } catch (error) {
        console.error('初始化控制面板失败:', error);
    }
}

// 显示添加节点模态框
function showAddModal(parentId) {
    currentParentId = parentId;
    const modal = document.getElementById('addNodeModal');
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    // 隐藏菜单和遮罩层
    document.getElementById('nodeContextMenu').style.display = 'none';
    const overlay = document.querySelector('.menu-overlay');
    if (overlay) overlay.remove();
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('addNodeModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('nodeName').value = '';
    }, 300);
}

// 添加新节点
async function addNode() {
    const nodeType = document.getElementById('nodeType').value;
    const nodeName = document.getElementById('nodeName').value;
    const nodeDescription = document.getElementById('nodeDescription').value;

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
                text: nodeName,
                description: nodeDescription
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
    const modal = document.getElementById('editNodeModal');
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // 隐藏菜单和遮罩层
    document.getElementById('nodeContextMenu').style.display = 'none';
    const overlay = document.querySelector('.menu-overlay');
    if (overlay) overlay.remove();
    
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
                // 获取节点描述
                fetch(`/api/node/${nodeId}`)
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('editNodeDescription').value = data.description || '';
                    })
                    .catch(error => console.error('获取节点描述失败:', error));
            }
        }
    }
}

// 提交修改节点
async function submitEditNode() {
    const nodeType = document.getElementById('editNodeType').value;
    const nodeName = document.getElementById('editNodeName').value;
    const nodeDescription = document.getElementById('editNodeDescription').value;

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
                text: nodeName,
                description: nodeDescription
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
    const modal = document.getElementById('editNodeModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('editNodeName').value = '';
    }, 300);
}
// 查看节点
async function viewNode(nodeId) {
    try {
        const response = await fetch(`/api/node/${nodeId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '获取节点信息失败');
        }
        
        const node = await response.json();
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <h3>${node.text} ${node.type ? `(${node.type})` : ''}</h3>
            <p>${node.description || '暂无描述'}</p>
        `;
        // 隐藏菜单和遮罩层
        document.getElementById('nodeContextMenu').style.display = 'none';
        const overlay = document.querySelector('.menu-overlay');
        if (overlay) overlay.remove();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
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
// // 添加更新父节点复选框状态的函数
// function updateParentCheckboxState(parentNode) {
//     if (!parentNode) return;

//     const parentCheckbox = parentNode.querySelector('.checkbox');
//     const childrenContainer = parentNode.querySelector('.children-container');
    
//     if (childrenContainer) {
//         const childCheckboxes = Array.from(childrenContainer.querySelectorAll('.checkbox'));
//         const allChecked = childCheckboxes.every(checkbox => checkbox.checked);
//         const allUnchecked = childCheckboxes.every(checkbox => !checkbox.checked);
        
//         if (allChecked) {
//             parentCheckbox.checked = true;
//         } else if (allUnchecked) {
//             parentCheckbox.checked = false;
//         }

//         // 递归更新上层父节点
//         updateParentCheckboxState(parentNode.parentElement.closest('.tree-node'));
//     }
// }
document.getElementById('editContentBtn').addEventListener('click', function() {
    isEditing = true;
    originalContent = document.getElementById('contentArea').innerHTML;
    document.getElementById('contentArea').contentEditable = true;
    document.getElementById('contentArea').style.border = '1px solid #ccc';
    document.getElementById('contentArea').style.padding = '10px';
    document.getElementById('editContentBtn').style.display = 'none';
    document.getElementById('saveContentBtn').style.display = 'block';
    document.getElementById('cancelContentBtn').style.display = 'block';
});

document.getElementById('saveContentBtn').addEventListener('click', async function() {
    isEditing = false;
    const contentArea = document.getElementById('contentArea');
    const content = contentArea.innerHTML;
    
    try {
        const response = await fetch(`/api/node/${currentNodeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: content
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '保存内容失败');
        }

        contentArea.contentEditable = false;
        contentArea.style.border = 'none';
        contentArea.style.padding = '0';
        document.getElementById('editContentBtn').style.display = 'block';
        document.getElementById('saveContentBtn').style.display = 'none';
        document.getElementById('cancelContentBtn').style.display = 'none';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
});
document.getElementById('cancelContentBtn').addEventListener('click', function() {
    isEditing = false;
    document.getElementById('contentArea').innerHTML = originalContent;
    document.getElementById('contentArea').contentEditable = false;
    document.getElementById('contentArea').style.border = 'none';
    document.getElementById('contentArea').style.padding = '0';
    document.getElementById('editContentBtn').style.display = 'block';
    document.getElementById('saveContentBtn').style.display = 'none';
    document.getElementById('cancelContentBtn').style.display = 'none';
});

// 查看选中节点
document.getElementById('viewSelectedBtn').addEventListener('click', function() {
    showSelectedNodes();
});

// 显示选中节点的内容
async function showSelectedNodes() {
    const selectedNodes = [];
    const checkboxes = document.querySelectorAll('.checkbox:checked');
    
    // 如果没有选中任何节点，提示用户
    if (checkboxes.length === 0) {
        alert('请先选择要查看的节点');
        return;
    }
    
    // 收集所有选中节点的ID
    for (const checkbox of checkboxes) {
        const nodeElement = checkbox.closest('.tree-node');
        const nodeId = nodeElement.getAttribute('data-id');
        
        try {
            // 获取节点详细信息
            const response = await fetch(`/api/node/${nodeId}`);
            if (!response.ok) {
                console.error(`获取节点 ${nodeId} 失败`);
                continue;
            }
            
            const nodeData = await response.json();
            selectedNodes.push(nodeData);
        } catch (error) {
            console.error(`获取节点 ${nodeId} 时出错:`, error);
        }
    }
    
    // 按照ID排序，确保层级关系正确
    selectedNodes.sort((a, b) => a.id.localeCompare(b.id));
    
    // 生成Markdown内容
    const markdownContent = generateMarkdownContent(selectedNodes);
    
    // 显示模态窗口
    const modal = document.getElementById('viewSelectedModal');
    const contentElement = document.getElementById('selectedNodesContent');
    contentElement.innerHTML = markdownContent;
    
    // 计算字数
    const textContent = contentElement.textContent;
    const charCount = textContent.replace(/\s/g, '').length;
    
    // 添加字数统计
    const countElement = document.createElement('div');
    countElement.className = 'char-count';
    countElement.textContent = `字数统计：${charCount} 字`;
    contentElement.insertAdjacentElement('afterend', countElement);
    
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// 生成Markdown内容
function generateMarkdownContent(nodes) {
    let markdown = '';
    
    // 创建节点ID到层级的映射
    const idToLevel = {};
    nodes.forEach(node => {
        // 根据ID长度和格式确定层级
        const level = calculateNodeLevel(node.id);
        idToLevel[node.id] = level;
    });
    
    // 按层级生成Markdown
    nodes.forEach(node => {
        const level = idToLevel[node.id];
        const headingLevel = Math.min(level + 1, 6); // 最大支持h6
        
        // 添加标题
        markdown += `${'#'.repeat(headingLevel)} ${node.text} ${node.type ? `(${node.type})` : ''}\n\n`;
        
        // 添加描述
        if (node.description && node.description.trim()) {
            markdown += `${node.description}\n\n`;
        } else {
            markdown += `暂无描述\n\n`;
        }
    });
    
    return markdown;
}

// 计算节点层级
function calculateNodeLevel(nodeId) {
    if (nodeId === 'root') return 0;
    
    // 根据ID的长度和格式确定层级
    // 假设一级节点ID是3位数字，每一级子节点在父节点ID后添加3位数字
    return Math.ceil(nodeId.length / 3);
}

// 关闭查看选中节点的模态窗口
function closeViewSelectedModal() {
    const modal = document.getElementById('viewSelectedModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        // 清除字数统计元素
        const countElement = modal.querySelector('.char-count');
        if (countElement) {
            countElement.remove();
        }
    }, 300);
}

// 复制选中节点内容到剪贴板
async function copySelectedContent() {
    const content = document.getElementById('selectedNodesContent').innerHTML;
    try {
        await navigator.clipboard.writeText(content);
        alert('内容已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    }
}