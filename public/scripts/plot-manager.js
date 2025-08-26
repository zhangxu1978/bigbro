// 全局变量
let plots = [];
let isEditing = false;

// 页面加载时获取情节列表
document.addEventListener('DOMContentLoaded', () => {
    fetchPlots();
});

// 获取情节列表
async function fetchPlots() {
    try {
        const response = await fetch('/api/plots');
        if (!response.ok) {
            throw new Error('获取情节列表失败');
        }
        plots = await response.json();
        renderPlotList();
    } catch (error) {
        console.error('获取情节列表出错:', error);
        alert('获取情节列表失败，请刷新页面重试');
    }
}

// 渲染情节列表
function renderPlotList() {
    const plotListElement = document.getElementById('plotList');
    plotListElement.innerHTML = '';

    if (plots.length === 0) {
        plotListElement.innerHTML = '<p class="no-data">暂无情节，请添加</p>';
        return;
    }

    plots.forEach(plot => {
        const plotCard = document.createElement('div');
        plotCard.className = 'plot-card';
        plotCard.innerHTML = `
            <h3>${plot.name}</h3>
            <p class="description">${plot.description.substring(0, 100)}${plot.description.length > 100 ? '...' : ''}</p>
            ${plot.category ? `<p class="category"><strong>分类:</strong> ${plot.category}</p>` : ''}
            ${plot.tags && plot.tags.length > 0 ? `<p class="tags"><strong>标签:</strong> ${plot.tags.join(', ')}</p>` : ''}
            <div class="card-actions">
                <button onclick="editPlot('${plot.id}')" class="action-button edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deletePlot('${plot.id}')" class="action-button delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        plotListElement.appendChild(plotCard);
    });
}

// 显示添加情节模态框
function showAddModal() {
    isEditing = false;
    document.getElementById('modalTitle').textContent = '添加情节';
    document.getElementById('plotForm').reset();
    document.getElementById('plotId').value = '';
    document.getElementById('plotModal').classList.add('show');
}

// 显示编辑情节模态框
function editPlot(id) {
    isEditing = true;
    const plot = plots.find(p => p.id === id);
    if (!plot) return;

    document.getElementById('modalTitle').textContent = '编辑情节';
    document.getElementById('plotId').value = plot.id;
    document.getElementById('plotName').value = plot.name;
    document.getElementById('plotDescription').value = plot.description;
    document.getElementById('plotCategory').value = plot.category || '';
    document.getElementById('plotTags').value = plot.tags ? plot.tags.join(', ') : '';
    
    document.getElementById('plotModal').classList.add('show');
}

// 关闭模态框
function closeModal() {
    document.getElementById('plotModal').classList.remove('show');
}

// 删除情节
async function deletePlot(id) {
    if (!confirm('确定要删除这个情节吗？')) return;

    try {
        const response = await fetch(`/api/plots/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除情节失败');
        }

        // 从列表中移除已删除的情节
        plots = plots.filter(plot => plot.id !== id);
        renderPlotList();
        alert('情节删除成功');
    } catch (error) {
        console.error('删除情节出错:', error);
        alert('删除情节失败，请重试');
    }
}

// 提交表单
document.getElementById('plotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const plotId = document.getElementById('plotId').value;
    const name = document.getElementById('plotName').value.trim();
    const description = document.getElementById('plotDescription').value.trim();
    const category = document.getElementById('plotCategory').value.trim();
    const tagsInput = document.getElementById('plotTags').value.trim();
    
    // 处理标签，将逗号分隔的字符串转为数组
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    const plotData = {
        name,
        description,
        category: category || null,
        tags
    };
    
    // 如果是编辑模式，添加ID
    if (isEditing) {
        plotData.id = plotId;
    }
    
    try {
        const url = isEditing ? `/api/plots/${plotId}` : '/api/plots';
        const method = isEditing ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(plotData)
        });
        
        if (!response.ok) {
            throw new Error(isEditing ? '更新情节失败' : '添加情节失败');
        }
        
        // 刷新情节列表
        await fetchPlots();
        closeModal();
        alert(isEditing ? '情节更新成功' : '情节添加成功');
    } catch (error) {
        console.error('保存情节出错:', error);
        alert('保存情节失败，请重试');
    }
});

// 点击模态框外部关闭模态框
window.onclick = function(event) {
    const modal = document.getElementById('plotModal');
    if (event.target === modal) {
        closeModal();
    }
};