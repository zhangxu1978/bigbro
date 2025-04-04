let currentParentId = null;
let currentNodeId = null;
let isEditing = false;
let originalContent = '';
let currentSearchHighlights = [];

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
    nodeElement.setAttribute('data-id', node.id || '');
   // console.log('渲染节点:', node.text, '节点ID:', node.id); // 添加调试日志
    nodeElement.style.marginLeft = `${level}px`;
    // 添加拖拽功能
    nodeElement.draggable = true;
    nodeElement.addEventListener('dragstart', handleDragStart);
    nodeElement.addEventListener('dragover', handleDragOver);
    nodeElement.addEventListener('dragenter', handleDragEnter);
    nodeElement.addEventListener('dragleave', handleDragLeave);
    nodeElement.addEventListener('drop', handleDrop);
    nodeElement.addEventListener('dragend', handleDragEnd);

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
        const menuHeight = menu.offsetHeight || 200; // 预估菜单高度
        const windowHeight = window.innerHeight;
        const spaceBelow = windowHeight - rect.bottom;
        
        menu.style.display = 'block';
        menu.style.left = rect.right + 'px';
        
        // 如果下方空间不足以显示菜单，则向上弹出
        if (spaceBelow < menuHeight && rect.top > menuHeight) {
            menu.style.top = (rect.top - menuHeight) + 'px';
        } else {
            menu.style.top = rect.top + 'px';
        }
    };

    nodeElement.appendChild(contentDiv);
    container.appendChild(nodeElement);

    if (node.children && node.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'children-container';
        childrenContainer.style.display = 'none';
        nodeElement.appendChild(childrenContainer);
        node.children.forEach(child => {
            const childElement = renderTree(child, level + 1);
            childrenContainer.appendChild(childElement);
        });
        collapseButton.textContent = '+';
    }

    return nodeElement;
}

// 声明全局变量来存储被拖动的节点
let draggedNode = null;

// 处理拖动开始
function handleDragStart(e) {
    e.stopPropagation(); // 阻止事件冒泡
    
    // 存储被拖动的节点引用
    draggedNode = this;
    const nodeId = this.getAttribute('data-id');
    console.log('拖动开始，节点ID:', nodeId);
    
    // 设置可移动数据
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);
    
    // 添加拖动样式
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);
}

// 处理拖动经过目标节点
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // 允许放置
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// 处理拖动进入目标节点
function handleDragEnter(e) {
    this.classList.add('drag-over');
}

// 处理拖动离开目标节点
function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

// 处理放置
function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    
    // 如果拖动节点放到自己上面，什么都不做
    if (draggedNode === this) {
        return false;
    }
    
    // 不允许将节点拖放到其子节点中（防止循环引用）
    // if (isDescendant(draggedNode, this)) {
    //     alert('不能将节点移动到其子节点下');
    //     return false;
    // }
    
    // 获取被拖动节点和目标节点的ID
    const draggedNodeId = draggedNode.getAttribute('data-id');
    const targetNodeId = this.getAttribute('data-id');
    
    console.log('拖动节点ID:', draggedNodeId); // 添加调试日志
    console.log('目标节点ID:', targetNodeId); // 添加调试日志
    
    // 检查是否为根节点
    if (draggedNodeId === 'root') {
        alert('不能移动根节点');
        return false;
    }
    
    // 调用API更新节点关系
    updateNodeParent(draggedNodeId, targetNodeId);
    
    return false;
}

// 判断一个节点是否是另一个节点的后代
function isDescendant(draggedNode, targetNode) {
    // 获取节点的ID
    const draggedId = draggedNode.getAttribute('data-id');
    const targetId = targetNode.getAttribute('data-id');
    
    // 递归检查目标节点的所有子节点容器
    function checkChildren(node) {
        const childrenContainer = node.querySelector('.children-container');
        if (!childrenContainer) return false;
        
        const children = childrenContainer.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.getAttribute('data-id') === draggedId) {
                return true;
            }
            if (checkChildren(child)) {
                return true;
            }
        }
        return false;
    }
    
    // 如果拖动的节点是目标节点本身，返回true
    if (draggedId === targetId) {
        return true;
    }
    
    // 检查目标节点的所有子节点
    return checkChildren(targetNode);
}

// 处理拖动结束
function handleDragEnd(e) {
    // 移除所有拖动相关的样式
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(node => {
        node.classList.remove('drag-over');
    });
}

// 调用API更新节点父节点关系
async function updateNodeParent(nodeId, newParentId) {
    try {
        const response = await fetch(`/api/node/${nodeId}/parent`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                newParentId: newParentId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新节点关系失败');
        }

        // 更新成功后刷新树形结构
        fetchTreeData();
    } catch (error) {
        console.error('Error:', error);
        alert('移动节点失败: ' + error.message);
    }
}

// 显示添加节点模态框
function showAddModal(parentId) {
    currentParentId = parentId;
    const modal = document.getElementById('addNodeModal');
    //清除节点描述和节点类型
    document.getElementById('nodeType').value = '';
    document.getElementById('nodeDescription').value = '';
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
        // 移除之前的current类
        const previousCurrent = document.querySelector('.tree-node.current');
        if (previousCurrent) {
            previousCurrent.classList.remove('current');
        }

        // 为当前节点添加current类
        const currentNode = document.querySelector(`.tree-node[data-id="${nodeId}"]`);
        if (currentNode) {
            currentNode.classList.add('current');
        }

        const response = await fetch(`/api/node/${nodeId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '获取节点信息失败');
        }
        
        const node = await response.json();
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
        ${node.description || ''}
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
function showSearchModal(nodeId) {
    const modal = document.getElementById('searchModal');
    modal.style.display = 'block';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // 清除之前的高亮
    clearSearchHighlights();
    
    // 隐藏菜单和遮罩层
    document.getElementById('nodeContextMenu').style.display = 'none';
    const overlay = document.querySelector('.menu-overlay');
    if (overlay) overlay.remove();
}

function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    document.getElementById('searchText').value = '';
}

function clearSearchHighlights() {
    currentSearchHighlights.forEach(nodeId => {
        const element = document.querySelector(`.tree-node[data-id="${nodeId}"]`);
        if (element) {
            element.classList.remove('search-highlight');
        }
    });
    currentSearchHighlights = [];
}

async function searchNodes() {
    const searchText = document.getElementById('searchText').value.trim();
    if (!searchText) {
        alert('请输入要查找的文本');
        return;
    }
    
    clearSearchHighlights();
    
    try {
        const response = await fetch(`/api/search?nodeId=${currentNodeId}&searchText=${encodeURIComponent(searchText)}`);
        if (!response.ok) {
            throw new Error('搜索失败');
        }
        
        const matchedNodes = await response.json();
        matchedNodes.forEach(nodeId => {
            const element = document.querySelector(`.tree-node[data-id="${nodeId}"]`);
            if (element) {
                element.classList.add('search-highlight');
                currentSearchHighlights.push(nodeId);
                // 展开父节点以显示匹配的节点
                let parent = element.parentElement.closest('.tree-node');
                while (parent) {
                    const toggle = parent.querySelector('.toggle');
                    if (toggle && toggle.textContent === '►') {
                        toggle.click();
                    }
                    parent = parent.parentElement.closest('.tree-node');
                }
            }
        });
        
        if (matchedNodes.length === 0) {
            alert('未找到匹配的节点');
        }
        
        closeSearchModal();
    } catch (error) {
        console.error('Error:', error);
        alert('搜索失败：' + error.message);
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
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
    const model = document.getElementById('model-select').value;
    const assistant = document.getElementById('assistant-select').value;
    const message = userInput.value.trim();
    const responseArea = document.getElementById('responseArea');
    const systemPrompt = document.getElementById('system-prompt').value;
    
    if (!message.trim()) {
        alert('请输入内容');
        return;
    }
        // 添加用户消息到界面
        addMessage('user', message);
        userInput.value = '';
    try {

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                assistant,
                systemPrompt,
                message,
                conversationHistory: getConversationHistory()
            })
        });
        
      //  const data = await response.json();
       // responseArea.textContent = data.response;
        
        if (response.ok) {
            const data = await response.json();
            addMessage('assistant', data.response);
        } else {
            const error = await response.json();
            addMessage('assistant', `错误: ${error.error}`);
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        responseArea.textContent = '发送失败，请重试';
    }
}

// 初始化加载
document.addEventListener('DOMContentLoaded', () => {
    fetchTreeData();
    initializePage();
    
    const configButton = document.getElementById('config-button');
    const configButton1 = document.getElementById('config-button1');
    const configModal = document.getElementById('config-modal');
    const closeButton = configModal.querySelector('.close');

    configButton1.onclick = () => configModal.style.display = 'block';
    configButton.onclick = () => configModal.style.display = 'block';
    closeButton.onclick = () => configModal.style.display = 'none';
    
    // 添加关键字按钮事件监听
    document.getElementById('prompt-button').addEventListener('click', openPromptModal);
    
    window.onclick = (event) => {
        if (event.target === configModal) {
            configModal.style.display = 'none';
        }
        if (event.target === document.getElementById('prompt-modal')) {
            closePromptModal();
        }
    };

    // 添加控制面板按钮事件监听
    document.getElementById('control-panel-button').addEventListener('click', openControlPanel);
    document.getElementById('node-auto-add-button').addEventListener('click', nodeAutoAdd2);
});
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
    
    // 计算字数统计值
    const textContent = contentElement.textContent;
    const charCount = textContent.replace(/\s/g, '').length;
    
    // 添加字数统计值
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
    const contentElement = document.getElementById('selectedNodesContent');
    // 创建一个临时的div来处理HTML内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentElement.innerHTML;
    
    // 获取纯文本内容，保留换行
    const textContent = Array.from(tempDiv.childNodes)
        .map(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent.trim();
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // 对于元素节点，获取其文本内容并添加换行
                return node.textContent.trim() + '\n';
            }
            return '';
        })
        .filter(text => text) // 移除空字符串
        .join('\n'); // 用换行符连接
    
    try {
        await navigator.clipboard.writeText(textContent);
        alert('内容已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    }
}

// 更新滑块值显示
function updateSliderValue(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);
    valueSpan.textContent = slider.value;
    slider.oninput = function() {
        valueSpan.textContent = this.value;
    }
}

// 初始化所有滑块
updateSliderValue('temperature', 'temperature-value');
updateSliderValue('top-p', 'top-p-value');
updateSliderValue('top-k', 'top-k-value');
updateSliderValue('frequency-penalty', 'frequency-penalty-value');
updateSliderValue('max-tokens', 'max-tokens-value');

// 获取当前配置
function getCurrentConfig() {
    return {
        model: document.getElementById('model-select').value,
        assistant: document.getElementById('assistant-select').value,
        outputFormat: document.getElementById('output-format').value,
        systemPrompt: document.getElementById('system-prompt').value,
        temperature: document.getElementById('temperature').value,
        topP: document.getElementById('top-p').value,
        topK: document.getElementById('top-k').value,
        frequencyPenalty: document.getElementById('frequency-penalty').value,
        maxTokens: document.getElementById('max-tokens').value
    };
}

// 加载模型配置
async function loadModelConfigs() {
    try {
        const response = await fetch('/api/model-configs');
        const data = await response.json();
        const select = document.getElementById('load-config-select');
        
        // 清除现有选项
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '选择已保存的配置...';
        select.appendChild(defaultOption);
        
        // 添加保存的配置
        for (const name in data.configs) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    } catch (error) {
        console.error('加载模型配置失败:', error);
    }
}

// 加载配置
async function loadConfig() {
    const select = document.getElementById('load-config-select');
    const configName = select.value;
    
    if (!configName) return;
    
    try {
        const response = await fetch('/api/model-configs');
        const data = await response.json();
        const config = data.configs[configName];
        
        if (config) {
            document.getElementById('model-select').value = config.model || '';
            document.getElementById('assistant-select').value = config.assistant || '';
            document.getElementById('output-format').value = config.outputFormat || 'text';
            document.getElementById('system-prompt').value = config.systemPrompt || '';
            document.getElementById('temperature').value = config.temperature || 0.8;
            document.getElementById('top-p').value = config.topP || 0.8;
            document.getElementById('top-k').value = config.topK || 50;
            document.getElementById('frequency-penalty').value = config.frequencyPenalty || 0;
            document.getElementById('max-tokens').value = config.maxTokens || 2048;
            
            // 更新滑块显示值
            updateSliderValue('temperature', 'temperature-value');
            updateSliderValue('top-p', 'top-p-value');
            updateSliderValue('top-k', 'top-k-value');
            updateSliderValue('frequency-penalty', 'frequency-penalty-value');
            updateSliderValue('max-tokens', 'max-tokens-value');
        }
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

// 保存配置
async function saveConfig() {
    const select = document.getElementById('load-config-select');
    const selectedConfig = select.value;
    let configName;
    
    if (selectedConfig) {
        // 如果已选择配置，询问是否覆盖
        if (!confirm(`是否要覆盖配置"${selectedConfig}"？`)) {
            // 如果不覆盖，询问新的配置名称
            configName = prompt('请输入新的配置名称：');
            if (!configName) return;
        } else {
            configName = selectedConfig;
        }
    } else {
        // 如果没有选择配置，直接询问新的配置名称
        configName = prompt('请输入配置名称：');
        if (!configName) return;
    }
    
    const config = {
        model: document.getElementById('model-select').value,
        assistant: document.getElementById('assistant-select').value,
        outputFormat: document.getElementById('output-format').value,
        systemPrompt: document.getElementById('system-prompt').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        topP: parseFloat(document.getElementById('top-p').value),
        topK: parseInt(document.getElementById('top-k').value),
        frequencyPenalty: parseFloat(document.getElementById('frequency-penalty').value),
        maxTokens: parseInt(document.getElementById('max-tokens').value)
    };
    
    try {
        const response = await fetch('/api/model-configs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: configName,
                config: config
            })
        });
        
        if (response.ok) {
            alert('配置保存成功！');
            // 重新加载配置列表
            await loadModelConfigs();
            // 选中新保存/更新的配置
            document.getElementById('load-config-select').value = configName;
        } else {
            const error = await response.json();
            alert(`配置保存失败：${error.message || '未知错误'}`);
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        alert('配置保存失败！');
    }
}

// 加载模型列表
async function loadModels() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        const select = document.getElementById('model-select');
        
        data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.provider})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载模型列表失败:', error);
    }
}

// 加载助手列表
async function loadAssistants() {
    try {
        const response = await fetch('/api/assistants');
        const data = await response.json();
        const select = document.getElementById('assistant-select');
        
        for (const id in data.assistants) {
            const assistant = data.assistants[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = assistant.name;
            select.appendChild(option);
        }

        // 添加助手选择变化事件
        select.addEventListener('change', updateSystemPrompt);
        
        // 初始加载默认助手的系统提示词
        if (select.value) {
            updateSystemPrompt();
        }
    } catch (error) {
        console.error('加载助手列表失败:', error);
    }
}

// 更新系统提示词
async function updateSystemPrompt() {
    try {
        const assistantId = document.getElementById('assistant-select').value;
        if (!assistantId) return;
        
        const response = await fetch(`/api/assistants/${assistantId}`);
        const assistant = await response.json();
        
        const systemPromptTextarea = document.getElementById('system-prompt');
        systemPromptTextarea.value = assistant.prompt || '';
        
        // 根据当前输出格式更新系统提示词
        updateOutputFormat();
    } catch (error) {
        console.error('获取助手系统提示词失败:', error);
    }
}

// 更新输出格式
function updateOutputFormat() {
    const outputFormat = document.getElementById('output-format').value;
    const assistantId = document.getElementById('assistant-select').value;
    const systemPromptTextarea = document.getElementById('system-prompt');
    
    // 获取基础提示词（不包含格式说明）
    let basePrompt = systemPromptTextarea.value;
    
    // 移除可能已存在的格式说明
    const formatMarker = '\n\n--- 输出格式 ---';
    if (basePrompt.includes(formatMarker)) {
        basePrompt = basePrompt.substring(0, basePrompt.indexOf(formatMarker));
    }
    
    // 根据选择的格式添加对应的格式说明
    if (outputFormat !== 'text' && assistantId) {
        fetch(`/api/assistants/${assistantId}`)
            .then(response => response.json())
            .then(assistant => {
                let formatInstruction = '';
                
                if (outputFormat === 'markdown' && assistant.markdownFormat) {
                    formatInstruction = assistant.markdownFormat;
                } else if (outputFormat === 'json' && assistant.jsonFormat) {
                    formatInstruction = assistant.jsonFormat;
                }
                
                if (formatInstruction) {
                    systemPromptTextarea.value = basePrompt + formatMarker + '\n' + formatInstruction;
                } else {
                    systemPromptTextarea.value = basePrompt;
                }
            })
            .catch(error => console.error('获取格式说明失败:', error));
    } else {
        systemPromptTextarea.value = basePrompt;
    }
}

// 初始化页面
async function initializePage() {
    await Promise.all([
        loadModels(),
        loadAssistants(),
        loadModelConfigs(),
        loadKeywordTypes()
    ]);

    // 添加配置选择的change事件监听
    document.getElementById('load-config-select').addEventListener('change', loadConfig);
    
    // 添加保存配置按钮事件监听
    document.getElementById('save-config-btn').addEventListener('click', saveConfig);
    
    // 添加删除配置按钮事件监听
    document.getElementById('delete-config-btn').addEventListener('click', deleteConfig);
    
    // 添加输出格式变化事件监听
    document.getElementById('output-format').addEventListener('change', updateOutputFormat);
}

function openControlPanel() {
    document.getElementById('control-panel-modal').style.display = 'block';
}

function closeControlPanel() {
    document.getElementById('control-panel-modal').style.display = 'none';
}

// 删除配置
async function deleteConfig() {
    const select = document.getElementById('load-config-select');
    const configName = select.value;
    
    if (!configName) {
        alert('请先选择要删除的配置');
        return;
    }
    
    if (!confirm(`确定要删除配置"${configName}"吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/model-configs/${encodeURIComponent(configName)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('配置删除成功！');
            // 重新加载配置列表
            await loadModelConfigs();
            // 清空选择
            select.value = '';
        } else {
            const error = await response.json();
            alert(`配置删除失败：${error.message || '未知错误'}`);
        }
    } catch (error) {
        console.error('删除配置失败:', error);
        alert('配置删除失败！');
    }
}

// 获取对话历史
function getConversationHistory() {
    const container = document.getElementById('response-container');
    const messages = [];
    
    for (const element of container.children) {
        const role = element.getAttribute('role');
        const contentSpan = element.querySelector('span');
        const content = contentSpan ? contentSpan.textContent : '';
        if (role && content) {
            messages.push({ role, content });
        }
    }
    
    return messages;
}
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('代码已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败', err);
    });
}
function nodeAutoAdd(text){
   fetch('/api/auto-generate-children', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ parentId: currentNodeId, text: text })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || '自动生成节点失败');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('节点生成成功:', data);
        alert('成功生成' + data.length + '个节点');
        fetchTreeData(); // 刷新树形结构
    })
    .catch(error => {
        console.error('自动生成节点失败:', error);
        alert('自动生成节点失败: ' + error.message);
    });
}

function nodeAutoAdd2(){
    if (!currentNodeId) {
        alert('请先选择一个节点');
        return;
    }
    
    const text = document.getElementById('contentArea').innerHTML;
    console.log('当前节点ID:', currentNodeId);
    console.log('要处理的文本:', text);
    
    fetch('/api/auto-generate-children', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ parentId: currentNodeId, text: text })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || '自动生成节点失败');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('节点生成成功:', data);
        alert('成功生成' + data.length + '个节点');
        fetchTreeData(); // 刷新树形结构
    })
    .catch(error => {
        console.error('自动生成节点失败:', error);
        alert('自动生成节点失败: ' + error.message);
    });
}

// 添加消息到界面
function addMessage(role, content) {
    const container = document.getElementById('response-container');
    const messageDiv = document.createElement('div');
    messageDiv.setAttribute('role', role);
    
    // 处理代码块和普通文本
    const codeRegex = /```([\s\S]*?)```/g;
    const parts = content.split(codeRegex);
    parts.forEach((part, index) => {
        if (index % 2 === 0) {
            // Regular text
            messageDiv.appendChild(document.createTextNode(part));
        } else {
            // Code block
            const codePre = document.createElement('pre');
            codePre.textContent = part;
            const copyButton = document.createElement('button');
            copyButton.textContent = '复制';
            copyButton.classList.add('copy-button');
            copyButton.addEventListener('click', () => copyToClipboard(part));
            codePre.appendChild(copyButton);
            messageDiv.appendChild(codePre);
            if(part.includes("json")){
               //自动生成下级节点按钮
               const nodeButton = document.createElement('button'); 
               nodeButton.textContent = '生成节点';
               nodeButton.classList.add('copy-button');
               nodeButton.addEventListener('click', () => {
                   if (!currentNodeId) {
                       alert('请先选择一个节点，然后再点击生成节点按钮');
                       return;
                   }
                   nodeAutoAdd(part);
               });
               
               codePre.appendChild(nodeButton);
            }
        }
    });

    // 添加删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'x';
    deleteButton.onclick = () => messageDiv.remove();
    messageDiv.appendChild(deleteButton);
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 添加自动调整文本框高度的功能
document.getElementById('user-input').addEventListener('input', function(e) {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// 初始化时设置文本框的初始高度
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('user-input');
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
});

// 打开关键字弹出框
function openPromptModal() {
    document.getElementById('prompt-modal').style.display = 'block';
    setTimeout(() => {
        document.getElementById('prompt-modal').classList.add('show');
    }, 10);
}

// 关闭关键字弹出框
function closePromptModal() {
    const modal = document.getElementById('prompt-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// 更新提示词模板
function updatePromptTemplate() {
    const novelType = document.getElementById('novel-type').value;
    const startType = document.getElementById('start-type').value;
    const endType = document.getElementById('end-type').value;
    const promptType = document.getElementById('prompt-type').value;
    const templateTextarea = document.getElementById('prompt-template');
    
    if (!novelType || !promptType) {
        templateTextarea.value = '';
        return;
    }
    
    // 从keywords.json获取对应的模板
    fetch('/api/keywords')
        .then(response => response.json())
        .then(data => {
            // 查找对应类型的模板
            if (data[promptType] && data[promptType].description) {
                // 替换模板中的小说类型占位符
                let template = data[promptType].description.replace(/\${novelType}/g, novelType);
                template=template.replace(/\${startType}/g, startType);
                template=template.replace(/\${endType}/g, endType);
                templateTextarea.value = template;
            } else {
                templateTextarea.value = '';
                console.error('未找到对应的模板');
            }
        })
        .catch(error => {
            console.error('获取关键字模板失败:', error);
            templateTextarea.value = '';
        });
}

// 加载关键字类型
function loadKeywordTypes() {
    fetch('/api/keywords')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('prompt-type');
            
            // 清除现有选项
            while (select.firstChild) {
                select.removeChild(select.firstChild);
            }
            
            // 添加默认选项
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '请选择关键字类型...';
            select.appendChild(defaultOption);
            
            // 添加从keywords.json获取的选项
            for (const type in data) {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = data[type].name || type;
                select.appendChild(option);
            }
        })
        .catch(error => {
            console.error('加载关键字类型失败:', error);
        });
}

// 复制提示词模板
async function copyPromptTemplate() {
    const template = document.getElementById('prompt-template').value;
    if (!template) {
        alert('请先选择小说类型和关键字类型');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(template);
        alert('提示词模板已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    }
}

// 使用提示词模板
function usePromptTemplate() {
    const template = document.getElementById('prompt-template').value;
    if (!template) {
        alert('请先选择小说类型和关键字类型');
        return;
    }
    
    document.getElementById('user-input').value = template;
    closePromptModal();
    
    // 自动调整文本框高度
    const textarea = document.getElementById('user-input');
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
}