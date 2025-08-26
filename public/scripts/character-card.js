// 全局变量
let characters = [];
let isEditing = false;

// 页面加载时获取人物卡列表
document.addEventListener('DOMContentLoaded', () => {
    fetchCharacters();
});

// 获取人物卡列表
async function fetchCharacters() {
    try {
        const response = await fetch('/api/characters');
        if (!response.ok) {
            throw new Error('获取人物卡列表失败');
        }
        characters = await response.json();
        renderCharacterList();
    } catch (error) {
        console.error('获取人物卡列表出错:', error);
        alert('获取人物卡列表失败，请刷新页面重试');
    }
}

// 渲染人物卡列表
function renderCharacterList() {
    const characterListElement = document.getElementById('characterList');
    characterListElement.innerHTML = '';

    if (characters.length === 0) {
        characterListElement.innerHTML = '<p class="no-data">暂无人物卡，请添加</p>';
        return;
    }

    characters.forEach(character => {
        const characterCard = document.createElement('div');
        characterCard.className = 'character-card';
        characterCard.innerHTML = `
            <h3>${character.name}</h3>
            <div class="basic-info">
                <span><i class="fas fa-user"></i> ${character.gender || '未设置'}</span>
                <span><i class="fas fa-birthday-cake"></i> ${character.age || '未设置'}</span>
            </div>
            <p class="description">${character.appearance ? character.appearance.substring(0, 100) + (character.appearance.length > 100 ? '...' : '') : '暂无外貌描述'}</p>
            <div class="card-actions">
                <button onclick="viewCharacter('${character.id}')" class="action-button view">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="editCharacter('${character.id}')" class="action-button edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCharacter('${character.id}')" class="action-button delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        characterListElement.appendChild(characterCard);
    });
}

// 显示添加人物卡模态框
function showAddModal() {
    isEditing = false;
    document.getElementById('modalTitle').textContent = '添加人物卡';
    document.getElementById('characterForm').reset();
    document.getElementById('characterId').value = '';
    document.getElementById('characterModal').classList.add('show');
}

// 显示编辑人物卡模态框
function editCharacter(id) {
    isEditing = true;
    const character = characters.find(c => c.id === id);
    if (!character) return;

    document.getElementById('modalTitle').textContent = '编辑人物卡';
    document.getElementById('characterId').value = character.id;
    document.getElementById('characterName').value = character.name;
    document.getElementById('characterAge').value = character.age || '';
    document.getElementById('characterGender').value = character.gender || '男';
    document.getElementById('characterAppearance').value = character.appearance || '';
    document.getElementById('characterBackground').value = character.background || '';
    document.getElementById('characterPersonality').value = character.personality || '';
    document.getElementById('characterAbilities').value = character.abilities || '';
    document.getElementById('characterRelationships').value = character.relationships || '';
    document.getElementById('characterGrowth').value = character.growth || '';
    document.getElementById('characterConflicts').value = character.conflicts || '';
    
    document.getElementById('characterModal').classList.add('show');
}

// 查看人物卡详情
function viewCharacter(id) {
    const character = characters.find(c => c.id === id);
    if (!character) return;

    document.getElementById('viewModalTitle').textContent = `${character.name} 的人物卡`;
    
    const detailsElement = document.getElementById('characterDetails');
    detailsElement.innerHTML = `
        <div class="detail-section">
            <h4>基本信息</h4>
            <div class="basic-info">
                <span><i class="fas fa-user"></i> 性别：${character.gender || '未设置'}</span>
                <span><i class="fas fa-birthday-cake"></i> 年龄：${character.age || '未设置'}</span>
            </div>
            <div class="detail-content">${character.appearance || '暂无外貌描述'}</div>
        </div>
        
        <div class="detail-section">
            <h4>背景故事</h4>
            <div class="detail-content">${character.background || '暂无背景故事'}</div>
        </div>
        
        <div class="detail-section">
            <h4>性格特点</h4>
            <div class="detail-content">${character.personality || '暂无性格描述'}</div>
        </div>
        
        <div class="detail-section">
            <h4>能力特长</h4>
            <div class="detail-content">${character.abilities || '暂无能力描述'}</div>
        </div>
        
        <div class="detail-section">
            <h4>关系网络</h4>
            <div class="detail-content">${character.relationships || '暂无关系描述'}</div>
        </div>
        
        <div class="detail-section">
            <h4>成长轨迹</h4>
            <div class="detail-content">${character.growth || '暂无成长描述'}</div>
        </div>
        
        <div class="detail-section">
            <h4>内心冲突</h4>
            <div class="detail-content">${character.conflicts || '暂无冲突描述'}</div>
        </div>
    `;
    
    document.getElementById('viewCharacterModal').classList.add('show');
}

// 关闭编辑模态框
function closeModal() {
    document.getElementById('characterModal').classList.remove('show');
}

// 关闭查看模态框
function closeViewModal() {
    document.getElementById('viewCharacterModal').classList.remove('show');
}

// 删除人物卡
async function deleteCharacter(id) {
    if (!confirm('确定要删除这个人物卡吗？')) return;

    try {
        const response = await fetch(`/api/characters/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除人物卡失败');
        }

        // 从列表中移除已删除的人物卡
        characters = characters.filter(character => character.id !== id);
        renderCharacterList();
        alert('人物卡删除成功');
    } catch (error) {
        console.error('删除人物卡出错:', error);
        alert('删除人物卡失败，请重试');
    }
}

// 使用人物卡作为模板
async function useCharacterTemplate() {
    // 获取当前查看的人物卡ID
    const characterName = document.getElementById('viewModalTitle').textContent.replace(' 的人物卡', '');
    const character = characters.find(c => c.name === characterName);
    
    if (!character) {
        alert('无法获取人物卡信息');
        return;
    }
    
    // 构建模板文本
    const template = `\n\n【人物卡：${character.name}】\n` +
        `基本信息：${character.gender || '未设置'}，${character.age || '未设置'}岁\n` +
        `外貌特征：${character.appearance || '暂无'}\n` +
        `背景故事：${character.background || '暂无'}\n` +
        `性格特点：${character.personality || '暂无'}\n` +
        `能力特长：${character.abilities || '暂无'}\n` +
        `关系网络：${character.relationships || '暂无'}\n` +
        `成长轨迹：${character.growth || '暂无'}\n` +
        `内心冲突：${character.conflicts || '暂无'}\n`;
    
    // 将模板添加到用户输入框
    try {
        await navigator.clipboard.writeText(textContent);
        // 尝试获取主页面的用户输入框
        // const userInput = window.opener.document.getElementById('user-input');
        // if (userInput) {
        //     userInput.value += template;
            
        //     // 自动调整文本框高度
        //     userInput.style.height = 'auto';
        //     userInput.style.height = (userInput.scrollHeight) + 'px';
            
        //     // 关闭查看模态框
        //     closeViewModal();
            
        //     // 可选：关闭当前窗口
        //     // window.close();
            
        //     return;
        // }
    } catch (e) {
        console.error('无法访问父窗口:', e);
    }
    
    // 如果无法直接添加到父窗口，则提供复制功能
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = template;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);
    
    alert('人物卡模板已复制到剪贴板，请粘贴到需要的地方。');
}

// 提交表单
document.getElementById('characterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const characterId = document.getElementById('characterId').value;
    const name = document.getElementById('characterName').value.trim();
    const age = document.getElementById('characterAge').value.trim();
    const gender = document.getElementById('characterGender').value;
    const appearance = document.getElementById('characterAppearance').value.trim();
    const background = document.getElementById('characterBackground').value.trim();
    const personality = document.getElementById('characterPersonality').value.trim();
    const abilities = document.getElementById('characterAbilities').value.trim();
    const relationships = document.getElementById('characterRelationships').value.trim();
    const growth = document.getElementById('characterGrowth').value.trim();
    const conflicts = document.getElementById('characterConflicts').value.trim();
    
    const characterData = {
        name,
        age,
        gender,
        appearance,
        background,
        personality,
        abilities,
        relationships,
        growth,
        conflicts
    };
    
    // 如果是编辑模式，添加ID
    if (isEditing) {
        characterData.id = characterId;
    }
    
    try {
        const url = isEditing ? `/api/characters/${characterId}` : '/api/characters';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(characterData)
        });
        
        if (!response.ok) {
            throw new Error(isEditing ? '更新人物卡失败' : '添加人物卡失败');
        }
        
        // 刷新人物卡列表
        await fetchCharacters();
        closeModal();
        alert(isEditing ? '人物卡更新成功' : '人物卡添加成功');
    } catch (error) {
        console.error('保存人物卡出错:', error);
        alert('保存人物卡失败，请重试');
    }
});

// 点击模态框外部关闭模态框
window.onclick = function(event) {
    const modal = document.getElementById('characterModal');
    const viewModal = document.getElementById('viewCharacterModal');
    
    if (event.target === modal) {
        closeModal();
    }
    
    if (event.target === viewModal) {
        closeViewModal();
    }
};