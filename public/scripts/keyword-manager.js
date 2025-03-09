// 全局变量
let keywords = [];
let isEditing = false;

// 页面加载时获取关键字列表
document.addEventListener('DOMContentLoaded', () => {
    fetchKeywords();
});

// 获取关键字列表
async function fetchKeywords() {
    try {
        const response = await fetch('/api/keywords');
        if (!response.ok) {
            throw new Error('获取关键字列表失败');
        }
        keywords = await response.json();
        renderKeywordList();
    } catch (error) {
        console.error('获取关键字列表出错:', error);
        alert('获取关键字列表失败，请刷新页面重试');
    }
}

// 渲染关键字列表
function renderKeywordList() {
    const keywordListElement = document.getElementById('keywordList');
    keywordListElement.innerHTML = '';

    if (keywords.length === 0) {
        keywordListElement.innerHTML = '<p class="no-data">暂无关键字，请添加</p>';
        return;
    }

    keywords.forEach(keyword => {
        const keywordCard = document.createElement('div');
        keywordCard.className = 'keyword-card';
        keywordCard.innerHTML = `
            <h3>${keyword.name}</h3>
            <p class="description">${keyword.description.substring(0, 100)}${keyword.description.length > 100 ? '...' : ''}</p>
            ${keyword.category ? `<p class="category"><strong>分类:</strong> ${keyword.category}</p>` : ''}
            ${keyword.tags && keyword.tags.length > 0 ? `<p class="tags"><strong>标签:</strong> ${keyword.tags.join(', ')}</p>` : ''}
            <div class="card-actions">
                <button onclick="editKeyword('${keyword.id}')" class="action-button edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteKeyword('${keyword.id}')" class="action-button delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        keywordListElement.appendChild(keywordCard);
    });
}

// 显示添加关键字模态框
function showAddModal() {
    isEditing = false;
    document.getElementById('modalTitle').textContent = '添加关键字';
    document.getElementById('keywordForm').reset();
    document.getElementById('keywordId').value = '';
    document.getElementById('keywordModal').style.display = 'block';
}

// 显示编辑关键字模态框
function editKeyword(id) {
    isEditing = true;
    const keyword = keywords.find(k => k.id === id);
    if (!keyword) return;

    document.getElementById('modalTitle').textContent = '编辑关键字';
    document.getElementById('keywordId').value = keyword.id;
    document.getElementById('keywordName').value = keyword.name;
    document.getElementById('keywordDescription').value = keyword.description;
    document.getElementById('keywordCategory').value = keyword.category || '';
    document.getElementById('keywordTags').value = keyword.tags ? keyword.tags.join(', ') : '';
    
    document.getElementById('keywordModal').style.display = 'block';
}

// 关闭模态框
function closeModal() {
    document.getElementById('keywordModal').style.display = 'none';
}

// 删除关键字
async function deleteKeyword(id) {
    if (!confirm('确定要删除这个关键字吗？')) return;

    try {
        const response = await fetch(`/api/keywords/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除关键字失败');
        }

        // 从列表中移除已删除的关键字
        keywords = keywords.filter(keyword => keyword.id !== id);
        renderKeywordList();
        alert('关键字删除成功');
    } catch (error) {
        console.error('删除关键字出错:', error);
        alert('删除关键字失败，请重试');
    }
}

// 提交表单
document.getElementById('keywordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const keywordId = document.getElementById('keywordId').value;
    const name = document.getElementById('keywordName').value.trim();
    const description = document.getElementById('keywordDescription').value.trim();
    const category = document.getElementById('keywordCategory').value.trim();
    const tagsInput = document.getElementById('keywordTags').value.trim();
    
    // 处理标签，将逗号分隔的字符串转为数组
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const keywordData = {
        name,
        description,
        category: category || null,
        tags
    };
    
    // 如果是编辑模式，添加ID
    if (isEditing) {
        keywordData.id = keywordId;
    }
    
    try {
        const url = isEditing ? `/api/keywords/${keywordId}` : '/api/keywords';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(keywordData)
        });
        
        if (!response.ok) {
            throw new Error(isEditing ? '更新关键字失败' : '添加关键字失败');
        }
        
        // 刷新关键字列表
        await fetchKeywords();
        closeModal();
        alert(isEditing ? '关键字更新成功' : '关键字添加成功');
    } catch (error) {
        console.error('保存关键字出错:', error);
        alert('保存关键字失败，请重试');
    }
});

// 点击模态框外部关闭模态框
window.onclick = function(event) {
    const modal = document.getElementById('keywordModal');
    if (event.target === modal) {
        closeModal();
    }
}; 