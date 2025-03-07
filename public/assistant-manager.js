// 获取所有助手数据
async function fetchAssistants() {
    try {
        const response = await fetch('/api/assistants');
        const data = await response.json();
        renderAssistants(data.assistants);
    } catch (error) {
        console.error('获取助手列表失败:', error);
    }
}

// 渲染助手列表
function renderAssistants(assistants) {
    const container = document.getElementById('assistantList');
    container.innerHTML = '';

    Object.values(assistants).forEach(assistant => {
        const item = document.createElement('div');
        item.className = 'assistant-item';
        
        const info = document.createElement('div');
        info.className = 'assistant-info';
        info.innerHTML = `
            <h3>${assistant.name}</h3>
            <p>${assistant.prompt}</p>
        `;

        const actions = document.createElement('div');
        actions.className = 'assistant-actions';
        actions.innerHTML = `
            <button onclick="editAssistant('${assistant.id}')" class="icon-button edit-button" title="编辑">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteAssistant('${assistant.id}')" class="icon-button delete-button" title="删除">
                <i class="fas fa-trash"></i>
            </button>
        `;

        item.appendChild(info);
        item.appendChild(actions);
        container.appendChild(item);
    });
}

// 显示添加助手模态框
function showAddModal() {
    const modal = document.getElementById('assistantModal');
    modal.style.display = 'flex';  // 改为 flex 布局
    document.getElementById('modalTitle').textContent = '添加助手';
    document.getElementById('assistantId').value = '';
    document.getElementById('assistantName').value = '';
    document.getElementById('assistantPrompt').value = '';
    document.getElementById('markdownFormat').value = '';
    document.getElementById('jsonFormat').value = '';
}

// 显示编辑助手模态框
async function editAssistant(id) {
    try {
        const response = await fetch(`/api/assistants/${id}`);
        const assistant = await response.json();

        document.getElementById('modalTitle').textContent = '编辑助手';
        document.getElementById('assistantId').value = assistant.id;
        document.getElementById('assistantName').value = assistant.name;
        document.getElementById('assistantPrompt').value = assistant.prompt;
        document.getElementById('markdownFormat').value = assistant.markdownFormat || '';
        document.getElementById('jsonFormat').value = assistant.jsonFormat || '';
        document.getElementById('assistantModal').style.display = 'block';
    } catch (error) {
        console.error('获取助手信息失败:', error);
    }
}

// 关闭模态框
function closeModal() {
    document.getElementById('assistantModal').style.display = 'none';
}

// 删除助手
async function deleteAssistant(id) {
    if (!confirm('确定要删除这个助手吗？')) return;

    try {
        const response = await fetch(`/api/assistants/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            fetchAssistants();
        } else {
            const error = await response.json();
            alert(error.message);
        }
    } catch (error) {
        console.error('删除助手失败:', error);
        alert('删除助手失败');
    }
}

// 初始化加载
document.addEventListener('DOMContentLoaded', () => {
    fetchAssistants();

    // 表单提交处理
    document.getElementById('assistantForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('assistantId').value;
        const name = document.getElementById('assistantName').value;
        const prompt = document.getElementById('assistantPrompt').value;
        const markdownFormat = document.getElementById('markdownFormat').value;
        const jsonFormat = document.getElementById('jsonFormat').value;

        if (!name || !prompt) {
            alert('请填写所有必填字段');
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/assistants/${id}` : '/api/assistants';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    prompt,
                    markdownFormat,
                    jsonFormat
                })
            });

            if (response.ok) {
                closeModal();
                fetchAssistants();
            } else {
                const error = await response.json();
                alert(error.message);
            }
        } catch (error) {
            console.error('保存助手失败:', error);
            alert('保存助手失败');
        }
    });

    // 点击模态框外部关闭
    const modal = document.getElementById('assistantModal');
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }
});

// 将所有事件处理函数添加到window对象
window.showAddModal = showAddModal;
window.closeModal = closeModal;
window.editAssistant = editAssistant;
window.deleteAssistant = deleteAssistant;