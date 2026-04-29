let currentPlot = null;
let plotSteps = [];
let plotCharacters = [];
let plotWeaverMessages = [];
let characterWeaverMessages = [];
let currentWorldId = null;

function showPlotDriver(worldId) {
    currentWorldId = worldId;
    window.LifeSimulator.showScreen('plot-driver');
    document.getElementById('plot-setup-panel').style.display = 'block';
    document.getElementById('plot-split-container').style.display = 'none';
    document.getElementById('plot-save-btn').style.display = 'none';
}

function startPlotWeaving() {
    const name = document.getElementById('plot-name').value.trim();
    const startAge = parseInt(document.getElementById('plot-start-age').value);
    const endAge = parseInt(document.getElementById('plot-end-age').value);
    const location = document.getElementById('plot-location').value.trim();
    const target = document.getElementById('plot-target').value.trim();
    const obstacle = document.getElementById('plot-obstacle').value.trim();
    const achievement = document.getElementById('plot-achievement').value.trim();
    const reward = document.getElementById('plot-reward').value.trim();
    const suspense = document.getElementById('plot-suspense').value.trim();

    if (!name) {
        alert('请输入剧情名称');
        return;
    }
    if (!startAge || !endAge) {
        alert('请输入年龄范围');
        return;
    }
    if (startAge >= endAge) {
        alert('开始年龄必须小于结束年龄');
        return;
    }

    currentPlot = {
        id: `plot_${currentWorldId}_${Date.now()}`,
        worldId: currentWorldId,
        name,
        startAge,
        endAge,
        location,
        target,
        obstacle,
        achievement,
        reward,
        suspense,
        steps: []
    };

    plotSteps = [];
    plotCharacters = [];

    document.getElementById('plot-setup-panel').style.display = 'none';
    document.getElementById('plot-split-container').style.display = 'grid';
    document.getElementById('plot-save-btn').style.display = 'block';

    plotWeaverMessages = [
        { role: 'system', content: window.LifeSimulator.PLOT_WEAVER_PROMPT },
        { role: 'user', content: `开始构建剧情：\n名称：${name}\n场景：${location}\n目标：${target}\n阻碍：${obstacle}\n预期达成：${achievement}\n请输出第一步剧情。` }
    ];

    generateNextStep();
}

async function generateNextStep() {
    const stepsArea = document.getElementById('plot-steps-area');
    const loading = document.createElement('div');
    loading.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> 世界编织者正在推演...';
    loading.style.padding = '16px';
    loading.style.textAlign = 'center';
    stepsArea.appendChild(loading);

    try {
        const rawResp = await window.LifeSimulator.callAI(plotWeaverMessages);
        plotWeaverMessages.push({ role: 'assistant', content: rawResp });

        const parsed = window.LifeSimulator.extractJSON(rawResp) || {
            step: plotSteps.length + 1,
            purpose: '',
            obstacle: '',
            achievement: '',
            narrative: rawResp
        };

        parsed.step = plotSteps.length + 1;
        plotSteps.push(parsed);
        renderPlotSteps();

        loading.remove();
    } catch (err) {
        loading.remove();
        alert('推演失败：' + err.message);
    }
}

function renderPlotSteps() {
    const stepsArea = document.getElementById('plot-steps-area');
    stepsArea.innerHTML = '';

    plotSteps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'plot-step';
        stepDiv.innerHTML = `
            <div class="plot-step-header">
                <span class="step-number">${step.step}</span>
                <div class="step-actions">
                    <button class="step-action-btn" onclick="editStep(${index})" title="编辑">✎</button>
                    <button class="step-action-btn" onclick="removeStep(${index})" title="删除">✕</button>
                </div>
            </div>
            <div class="step-content">
                <div class="step-item">
                    <span class="step-label">目的</span>
                    <span class="step-value">${step.purpose || '-'}</span>
                </div>
                <div class="step-item">
                    <span class="step-label">阻碍</span>
                    <span class="step-value">${step.obstacle || '-'}</span>
                </div>
                <div class="step-item">
                    <span class="step-label">达成</span>
                    <span class="step-value">${step.achievement || '-'}</span>
                </div>
                ${step.narrative ? `<div class="step-narrative">${step.narrative}</div>` : ''}
            </div>
        `;
        stepsArea.appendChild(stepDiv);
    });
}

function editStep(index) {
    const step = plotSteps[index];
    const newPurpose = prompt('修改目的', step.purpose);
    if (newPurpose !== null) step.purpose = newPurpose;
    const newObstacle = prompt('修改阻碍', step.obstacle);
    if (newObstacle !== null) step.obstacle = newObstacle;
    const newAchievement = prompt('修改达成', step.achievement);
    if (newAchievement !== null) step.achievement = newAchievement;
    const newNarrative = prompt('修改描述', step.narrative);
    if (newNarrative !== null) step.narrative = newNarrative;
    renderPlotSteps();
}

function removeStep(index) {
    if (confirm('确定要删除这一步吗？')) {
        plotSteps.splice(index, 1);
        plotSteps.forEach((step, i) => {
            step.step = i + 1;
        });
        renderPlotSteps();
    }
}

function showCharacterCreator() {
    document.getElementById('char-name').value = '';
    document.getElementById('char-role').value = '';
    document.getElementById('char-desire').value = '';
    document.getElementById('char-stance').value = '';
    document.getElementById('char-flaw').value = '';
    document.getElementById('char-relationships').value = '';
    document.getElementById('char-description').value = '';
    document.getElementById('char-scope').value = 'plot_only';
    document.getElementById('character-creator-modal').classList.add('active');
}

async function generateCharacter() {
    const role = document.getElementById('char-role').value.trim();
    if (!role) {
        alert('请先输入角色定位');
        return;
    }

    characterWeaverMessages = [
        { role: 'system', content: window.LifeSimulator.CHARACTER_WEAVER_PROMPT },
        { role: 'user', content: `请为我创建一个角色：${role}` }
    ];

    const resp = await window.LifeSimulator.callAI(characterWeaverMessages);
    characterWeaverMessages.push({ role: 'assistant', content: resp });

    const parsed = window.LifeSimulator.extractJSON(resp) || {};

    document.getElementById('char-name').value = parsed.name || '';
    document.getElementById('char-desire').value = parsed.desire || '';
    document.getElementById('char-stance').value = parsed.stance || '';
    document.getElementById('char-flaw').value = parsed.flaw || '';
    document.getElementById('char-relationships').value = parsed.relationships ? JSON.stringify(parsed.relationships, null, 2) : '';
    document.getElementById('char-description').value = parsed.description || '';
}

async function regenerateCharacter() {
    const role = document.getElementById('char-role').value.trim();
    const currentName = document.getElementById('char-name').value.trim();
    
    if (!role) {
        alert('请先输入角色定位');
        return;
    }

    let prompt = `请重新生成一个${role}角色`;
    if (currentName) {
        prompt += `，名称保持为${currentName}`;
    }

    characterWeaverMessages.push({ role: 'user', content: prompt });
    const resp = await window.LifeSimulator.callAI(characterWeaverMessages);
    characterWeaverMessages.push({ role: 'assistant', content: resp });

    const parsed = window.LifeSimulator.extractJSON(resp) || {};

    if (!currentName && parsed.name) {
        document.getElementById('char-name').value = parsed.name;
    }
    document.getElementById('char-desire').value = parsed.desire || '';
    document.getElementById('char-stance').value = parsed.stance || '';
    document.getElementById('char-flaw').value = parsed.flaw || '';
    document.getElementById('char-relationships').value = parsed.relationships ? JSON.stringify(parsed.relationships, null, 2) : '';
    document.getElementById('char-description').value = parsed.description || '';
}

function saveCharacter() {
    const name = document.getElementById('char-name').value.trim();
    const role = document.getElementById('char-role').value.trim();
    const desire = document.getElementById('char-desire').value.trim();
    const stance = document.getElementById('char-stance').value.trim();
    const flaw = document.getElementById('char-flaw').value.trim();
    const relationshipsStr = document.getElementById('char-relationships').value.trim();
    const description = document.getElementById('char-description').value.trim();
    const scope = document.getElementById('char-scope').value;

    if (!name || !role) {
        alert('请填写角色名称和定位');
        return;
    }

    let relationships = {};
    if (relationshipsStr) {
        try {
            relationships = JSON.parse(relationshipsStr);
        } catch (e) {
            alert('关系字段格式不正确');
            return;
        }
    }

    const character = {
        id: `char_${Date.now()}`,
        plotId: currentPlot.id,
        name,
        role,
        desire,
        stance,
        flaw,
        relationships,
        description,
        scope
    };

    plotCharacters.push(character);
    renderCharacters();
    window.LifeSimulator.closeModal('character-creator-modal');
}

function renderCharacters() {
    const list = document.getElementById('characters-list');
    list.innerHTML = '';

    if (plotCharacters.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--text2);padding:40px">暂无角色</div>';
        return;
    }

    plotCharacters.forEach((char) => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <div class="character-name">${char.name}</div>
            <div class="character-role">${char.role}</div>
            ${char.desire ? `<div class="character-attr"><span class="character-attr-label">欲望</span><span class="character-attr-value">${char.desire}</span></div>` : ''}
            ${char.stance ? `<div class="character-attr"><span class="character-attr-label">立场</span><span class="character-attr-value">${char.stance}</span></div>` : ''}
            ${char.flaw ? `<div class="character-attr"><span class="character-attr-label">缺陷</span><span class="character-attr-value">${char.flaw}</span></div>` : ''}
            ${char.description ? `<div class="character-attr"><span class="character-attr-label">描述</span><span class="character-attr-value">${char.description}</span></div>` : ''}
            <span class="character-scope">${char.scope === 'persistent' ? '一直生效' : '本剧情内生效'}</span>
        `;
        list.appendChild(card);
    });
}

async function saveCurrentPlot() {
    if (!currentPlot) {
        alert('没有可保存的剧情');
        return;
    }

    try {
        const plotData = {
            id: currentPlot.id,
            worldId: currentPlot.worldId,
            name: currentPlot.name,
            description: currentPlot.location,
            startAge: currentPlot.startAge,
            endAge: currentPlot.endAge,
            target: currentPlot.target,
            obstacle: currentPlot.obstacle,
            achievement: currentPlot.achievement,
            reward: currentPlot.reward,
            suspense: currentPlot.suspense,
            status: 'completed'
        };

        const resp = await fetch(`${window.LifeSimulator.API_BASE}/plots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(plotData)
        });

        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.error || '保存失败');
        }

        for (const step of plotSteps) {
            await fetch(`${window.LifeSimulator.API_BASE}/plot-steps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plotId: currentPlot.id,
                    stepNumber: step.step,
                    purpose: step.purpose,
                    obstacle: step.obstacle,
                    achievement: step.achievement,
                    narrative: step.narrative,
                    status: 'completed'
                })
            });
        }

        for (const char of plotCharacters) {
            await fetch(`${window.LifeSimulator.API_BASE}/plot-characters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plotId: currentPlot.id,
                    name: char.name,
                    role: char.role,
                    desire: char.desire,
                    stance: char.stance,
                    flaw: char.flaw,
                    relationships: char.relationships,
                    description: char.description,
                    scope: char.scope
                })
            });
        }

        await fetch(`${window.LifeSimulator.API_BASE}/plot-characters/b带出`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plotId: currentPlot.id })
        });

        alert('剧情保存成功！');
        window.LifeSimulator.showScreen('worlds');
    } catch (err) {
        alert('保存失败：' + err.message);
    }
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.showPlotDriver = showPlotDriver;
window.LifeSimulator.startPlotWeaving = startPlotWeaving;
window.LifeSimulator.generateNextStep = generateNextStep;
window.LifeSimulator.showCharacterCreator = showCharacterCreator;
window.LifeSimulator.generateCharacter = generateCharacter;
window.LifeSimulator.regenerateCharacter = regenerateCharacter;
window.LifeSimulator.saveCharacter = saveCharacter;
window.LifeSimulator.saveCurrentPlot = saveCurrentPlot;
