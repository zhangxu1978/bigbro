let currentPlot = null;
let plotSteps = [];
let plotCharacters = [];
let plotWeaverMessages = [];
let characterWeaverMessages = [];
let currentWorldId = null;
let isPlotWeaverGenerating = false;
let plotWeaverQuestionCount = 0;
const MAX_PLOT_WEAVER_QUESTIONS = 8;

const PLOT_DESIGNER_PROMPT = `你是一个富有创意的"剧情编织者"，你的任务是通过对话引导玩家构思一个引人入胜的剧情故事。

## 你的角色
- 你是一个热情的叙事引导者，帮助玩家梳理剧情的各个要素
- 你通过提问来了解玩家想要的剧情，逐步构建故事框架
- 你会巧妙地将玩家的想法串联起来，创造连贯有趣的剧情
- 你擅长各种类型的剧情：冒险、悬疑、爱情、成长、复仇等

## 对话流程
1. 首先友好地打招呼，询问玩家想要什么类型的剧情
2. 逐步提问关于剧情的核心要素：
   - 时间（人物年龄/人生阶段）
   - 地点（场景/世界设定）
   - 登场人物（关键角色）
   - 目标（主角的欲望和期待）
   - 阻碍（达成目标面临的障碍）
   - 奖励（克服阻碍后的收获）
   - 悬念（为后续留下的伏笔）
3. 在收集足够信息后，总结剧情设定供玩家确认
4. 玩家确认后，准备开始推演

## 重要规则
- **始终使用选项引导**：每次回复必须提供 3-4 个选项让玩家选择，不要只发问
- 选项要具体、有趣、风格多样
- 如果玩家回答模糊或简短，用追问来细化
- 始终保持热情、鼓励的语气
- 当玩家确认或选择"开始推演"时，生成最终剧情设定

## 回复格式（严格遵守）——必须是合法 JSON：
\`\`\`json
{
  "narrative": "对话内容（描述当前情境或问题）",
  "options": [
    {"id": 1, "text": "选项A"},
    {"id": 2, "text": "选项B"},
    {"id": 3, "text": "选项C"}
  ]
}
\`\`\`

当收集完信息，玩家选择"开始推演"或确认时，返回：
\`\`\`json
{
  "ready": true,
  "name": "剧情名称",
  "startAge": 起始年龄（数字）,
  "endAge": 结束年龄（数字）,
  "location": "场景地点",
  "target": "主角目标",
  "obstacle": "主要阻碍",
  "achievement": "预期达成",
  "reward": "完成后的收获",
  "suspense": "留下的悬念",
  "summary": "剧情一句话总结"
}
\`\`\`

记住：你是在帮助玩家"编织"剧情，尊重玩家的想法，用问题引导但不主导，让故事属于玩家。`;

function initPlotWeaver() {
    plotWeaverMessages = [];
    isPlotWeaverGenerating = false;
    plotWeaverQuestionCount = 0;
}

async function showPlotWeaverCreator() {
    initPlotWeaver();

    document.getElementById('plot-choice-panel').style.display = 'none';
    document.getElementById('plot-weaver-area').style.display = 'flex';
    document.getElementById('plot-weaver-area').style.flexDirection = 'column';
    document.getElementById('plot-weaver-area').style.height = 'calc(100vh - 60px)';

    const chat = document.getElementById('plot-weaver-chat');
    chat.innerHTML = '';

    const inputArea = document.getElementById('plot-weaver-input-area');
    inputArea.style.display = 'flex';

    const world = await getWorld(currentWorldId);
    const worldContext = buildWorldContext(world);

    const systemWithWorld = PLOT_DESIGNER_PROMPT + '\n\n## 当前世界设定\n' + worldContext;

    plotWeaverMessages = [
        { role: 'system', content: systemWithWorld }
    ];

    appendPlotWeaverMsg('assistant', `✨ 你好，冒险者！我是剧情编织者，很高兴与你相遇。\n\n我已了解这个世界的基本设定，现在让我来引导你构思一个与这个世界契合的剧情故事。`, null);

    document.getElementById('plot-weaver-input').focus();

    plotWeaverMessages.push({ role: 'user', content: '你好，我想在这个世界构思一个新剧情。请给我一些选项来选择。' });
    appendPlotWeaverMsg('user', '你好，我想在这个世界构思一个新剧情。请给我一些选项来选择。');

    await handlePlotWeaverAIResponse();
}

function buildWorldContext(world) {
    if (!world) return '未知世界';

    const gs = world.gameState || {};
    const context = [];
    context.push(`**世界名称**：${gs.worldName || world.name || '未知'}`);
    context.push(`**世界类型**：${gs.worldType || world.type || '未知'}`);
    if (gs.worldDesc || world.desc) context.push(`**世界描述**：${gs.worldDesc || world.desc}`);
    if (gs.atmosphere) context.push(`**世界氛围**：${gs.atmosphere}`);
    if (gs.powerSystem) context.push(`**力量体系**：${gs.powerSystem}`);
    if (gs.societyStructure) context.push(`**社会结构**：${gs.societyStructure}`);
    if (gs.storylines || world.storylines) {
        const sl = gs.storylines || world.storylines;
        if (sl.main) context.push(`**明线故事**：${sl.main}`);
        if (sl.hidden) context.push(`**暗线故事**：${sl.hidden}`);
        if (sl.romance) context.push(`**感情线**：${sl.romance}`);
    }
    if (gs.importantCharacters || world.importantCharacters) {
        const ic = gs.importantCharacters || world.importantCharacters;
        const chars = [];
        if (ic.heroine) chars.push(`女主：${ic.heroine}`);
        if (ic.mentor) chars.push(`良师：${ic.mentor}`);
        if (ic.friend) chars.push(`益友：${ic.friend}`);
        if (ic.enemy) chars.push(`仇敌：${ic.enemy}`);
        if (chars.length > 0) context.push(`**重要角色**：\n${chars.join('\n')}`);
    }

    return context.join('\n');
}

function buildPlotContextForCharacter() {
    if (!currentPlot) return '暂无剧情设定';

    const context = [];
    context.push(`**剧情名称**：${currentPlot.name || '未命名剧情'}`);
    if (currentPlot.startAge && currentPlot.endAge) {
        context.push(`**年龄范围**：${currentPlot.startAge} - ${currentPlot.endAge}`);
    }
    if (currentPlot.location) context.push(`**场景**：${currentPlot.location}`);
    if (currentPlot.target) context.push(`**目标**：${currentPlot.target}`);
    if (currentPlot.obstacle) context.push(`**阻碍**：${currentPlot.obstacle}`);
    if (currentPlot.achievement) context.push(`**达成**：${currentPlot.achievement}`);
    if (currentPlot.reward) context.push(`**奖励**：${currentPlot.reward}`);
    if (currentPlot.suspense) context.push(`**悬念**：${currentPlot.suspense}`);

    if (plotCharacters && plotCharacters.length > 0) {
        context.push(`**已有角色**：`);
        plotCharacters.forEach(char => {
            context.push(`  - ${char.name}（${char.role}）`);
        });
    }

    return context.join('\n');
}

function exitPlotWeaver() {
    document.getElementById('plot-weaver-area').style.display = 'none';
    document.getElementById('plot-choice-panel').style.display = 'block';
    initPlotWeaver();
}

function appendPlotWeaverMsg(role, content, options) {
    const chat = document.getElementById('plot-weaver-chat');
    const div = document.createElement('div');
    div.className = 'creator-msg ' + role;

    if (role === 'assistant') {
        div.innerHTML = `<div class="msg-label">🎭 剧情编织者</div><div>${content.replace(/\n/g, '<br>')}</div>`;
        if (options && options.length > 0) {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'creator-options';
            optionsDiv.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'creator-opt-btn';
                btn.textContent = opt.text;
                btn.onclick = () => selectPlotWeaverOption(opt.text);

                const editBtn = document.createElement('button');
                editBtn.className = 'creator-opt-edit-btn';
                editBtn.innerHTML = '✎';
                editBtn.title = '发送到输入框';
                editBtn.onclick = (e) => {
                    e.stopPropagation();
                    document.getElementById('plot-weaver-input').value = opt.text;
                };

                btn.appendChild(editBtn);
                optionsDiv.appendChild(btn);
            });
            div.appendChild(optionsDiv);
        }
    } else if (role === 'user') {
        div.innerHTML = `<div style="font-size:0.75rem;color:var(--accent);margin-bottom:4px">你</div><div>${content}</div>`;
    } else {
        div.innerHTML = content;
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

function selectPlotWeaverOption(text) {
    if (isPlotWeaverGenerating) return;
    appendPlotWeaverMsg('user', text);
    plotWeaverMessages.push({ role: 'user', content: text });
    plotWeaverQuestionCount++;
    handlePlotWeaverAIResponse();
}

function renderPlotWeaverHints(options) {
    const container = document.getElementById('plot-weaver-hints');
    container.innerHTML = '';

    const hints = [
        '让我想想...', '随便什么都行', '有挑战性的', '轻松一些',
        '神秘一点', '黑暗风格', '光明磊落', '更多探索', '更多战斗'
    ];

    if (plotWeaverQuestionCount >= 4) {
        hints.push('💡 我觉得可以了');
        hints.push('🚀 开始推演');
    }

    hints.forEach(hint => {
        const btn = document.createElement('button');
        btn.className = 'creator-hint-btn';
        btn.textContent = hint;
        btn.onclick = () => {
            document.getElementById('plot-weaver-input').value = hint;
            submitPlotWeaverAnswer();
        };
        container.appendChild(btn);
    });
}

async function submitPlotWeaverAnswer() {
    if (isPlotWeaverGenerating) return;

    const input = document.getElementById('plot-weaver-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    appendPlotWeaverMsg('user', text);
    plotWeaverMessages.push({ role: 'user', content: text });
    plotWeaverQuestionCount++;

    await handlePlotWeaverAIResponse();
}

async function handlePlotWeaverAIResponse() {
    isPlotWeaverGenerating = true;

    const progress = document.createElement('div');
    progress.className = 'creator-msg system';
    progress.id = 'plot-weaver-progress';
    progress.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> 剧情编织者正在构思...';
    document.getElementById('plot-weaver-chat').appendChild(progress);
    scrollPlotWeaverChat();

    try {
        const rawResp = await window.LifeSimulator.callAI(plotWeaverMessages);
        plotWeaverMessages.push({ role: 'assistant', content: rawResp });

        const progressEl = document.getElementById('plot-weaver-progress');
        if (progressEl) progressEl.remove();

        if (rawResp.includes('"ready": true') || rawResp.includes('"ready":true')) {
            const jsonMatch = rawResp.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    applyPlotWeaverReady(parsed);
                } catch (e) {
                    const start = rawResp.indexOf('{');
                    const end = rawResp.lastIndexOf('}');
                    if (start >= 0 && end > start) {
                        const parsed = JSON.parse(rawResp.slice(start, end + 1));
                        applyPlotWeaverReady(parsed);
                    }
                }
            }
        } else {
            const parsed = parsePlotWeaverResponse(rawResp);
            if (parsed.narrative && parsed.options) {
                appendPlotWeaverMsg('assistant', parsed.narrative, parsed.options);
                renderPlotWeaverHints(parsed.options);
            } else {
                appendPlotWeaverMsg('assistant', rawResp, null);
                renderPlotWeaverHints([]);
            }
        }
    } catch (err) {
        const progressEl = document.getElementById('plot-weaver-progress');
        if (progressEl) progressEl.remove();
        appendPlotWeaverMsg('assistant', `⚠ 剧情编织者暂时失联（${err.message}）。请稍后重试，或返回重新开始。`);
    }

    isPlotWeaverGenerating = false;
    scrollPlotWeaverChat();
}

function parsePlotWeaverResponse(text) {
    const jsonData = window.LifeSimulator.extractJSON(text);
    if (jsonData) {
        return jsonData;
    }
    return { narrative: text, options: null };
}

function applyPlotWeaverReady(data) {
    currentPlot = {
        id: `plot_${currentWorldId}_${Date.now()}`,
        worldId: currentWorldId,
        name: data.name || '未命名剧情',
        startAge: data.startAge || 18,
        endAge: data.endAge || 30,
        location: data.location || '',
        target: data.target || '',
        obstacle: data.obstacle || '',
        achievement: data.achievement || '',
        reward: data.reward || '',
        suspense: data.suspense || '',
        summary: data.summary || ''
    };

    plotSteps = [];
    plotCharacters = [];

    document.getElementById('plot-weaver-area').style.display = 'none';
    document.getElementById('plot-setup-panel').style.display = 'none';
    document.getElementById('plot-split-container').style.display = 'grid';
    document.getElementById('plot-save-btn').style.display = 'block';

    document.getElementById('plot-name').value = currentPlot.name;
    document.getElementById('plot-start-age').value = currentPlot.startAge;
    document.getElementById('plot-end-age').value = currentPlot.endAge;
    document.getElementById('plot-location').value = currentPlot.location;
    document.getElementById('plot-target').value = currentPlot.target;
    document.getElementById('plot-obstacle').value = currentPlot.obstacle;
    document.getElementById('plot-achievement').value = currentPlot.achievement;
    document.getElementById('plot-reward').value = currentPlot.reward;
    document.getElementById('plot-suspense').value = currentPlot.suspense;

    startPlotFromWeaver();
}

async function startPlotFromWeaver() {
    const world = await getWorld(currentWorldId);
    const worldContext = buildWorldContext(world);
    const systemWithWorld = PLOT_DESIGNER_PROMPT + '\n\n## 当前世界设定\n' + worldContext;

    plotWeaverMessages = [
        { role: 'system', content: systemWithWorld },
        { role: 'user', content: `剧情设定已确认：
名称：${currentPlot.name}
年龄范围：${currentPlot.startAge} - ${currentPlot.endAge}
场景：${currentPlot.location}
目标：${currentPlot.target}
阻碍：${currentPlot.obstacle}
达成：${currentPlot.achievement}
奖励：${currentPlot.reward}
悬念：${currentPlot.suspense}
请输出第一步剧情。` }
    ];

    generateNextStep();
}

function scrollPlotWeaverChat() {
    const chat = document.getElementById('plot-weaver-chat');
    requestAnimationFrame(() => {
        chat.scrollTop = chat.scrollHeight;
    });
}

function showPlotDriver(worldId) {
    currentWorldId = worldId;
    window.LifeSimulator.showScreen('plot-driver');
    document.getElementById('plot-choice-panel').style.display = 'block';
    document.getElementById('plot-weaver-area').style.display = 'none';
    document.getElementById('plot-setup-panel').style.display = 'none';
    document.getElementById('plot-split-container').style.display = 'none';
    document.getElementById('plot-save-btn').style.display = 'none';

    loadExistingPlots(worldId);
}

async function loadExistingPlots(worldId) {
    const container = document.getElementById('existing-plots-list');
    container.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> 加载中...';

    try {
        const resp = await fetch(`${window.LifeSimulator.API_BASE}/plots/${worldId}`);
        if (!resp.ok) throw new Error('获取剧情列表失败');
        const plots = await resp.json();

        if (plots.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text2);padding:20px">暂无旧剧情</div>';
            return;
        }

        container.innerHTML = '';
        plots.forEach(plot => {
            const card = document.createElement('div');
            card.className = 'existing-plot-card';
            card.innerHTML = `
                <div class="existing-plot-name">${plot.name}</div>
                <div class="existing-plot-info">年龄 ${plot.startAge} - ${plot.endAge}</div>
                ${plot.description ? `<div class="existing-plot-desc">${plot.description.substring(0, 50)}...</div>` : ''}
                <button class="existing-plot-btn" onclick="continuePlot('${plot.id}')">继续推演</button>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;color:var(--error);padding:20px">加载失败：${err.message}</div>`;
    }
}

async function continuePlot(plotId) {
    try {
        console.log('continuePlot 开始, plotId:', plotId);
        const resp = await fetch(`${window.LifeSimulator.API_BASE}/plot/${plotId}`);
        if (!resp.ok) throw new Error('获取剧情失败');
        const plot = await resp.json();
        console.log('获取到的剧情:', plot);

        currentPlot = {
            id: plot.id,
            worldId: plot.worldId,
            name: plot.name,
            startAge: plot.startAge,
            endAge: plot.endAge,
            location: plot.description || '',
            target: plot.target || '',
            obstacle: plot.obstacle || '',
            achievement: plot.achievement || '',
            reward: plot.reward || '',
            suspense: plot.suspense || ''
        };

        const stepsResp = await fetch(`${window.LifeSimulator.API_BASE}/plot-steps/${plotId}`);
        if (stepsResp.ok) {
            const steps = await stepsResp.json();
            plotSteps = steps.map((s, i) => ({
                step: i + 1,
                purpose: s.purpose || '',
                obstacle: s.obstacle || '',
                achievement: s.achievement || '',
                narrative: s.content || ''
            }));
        } else {
            plotSteps = [];
        }

        const charsResp = await fetch(`${window.LifeSimulator.API_BASE}/plot-characters/${plotId}`);
        console.log('角色API响应状态:', charsResp.status, 'plotId:', plotId);
        if (charsResp.ok) {
            const chars = await charsResp.json();
            console.log('加载的角色数量:', chars.length, chars);
            plotCharacters = chars.map(c => ({
                id: c.id,
                plotId: c.plotId,
                name: c.name,
                role: c.role,
                desire: c.desire,
                stance: c.stance,
                flaw: c.flaw,
                relationships: c.relationships,
                description: c.description,
                scope: c.scope
            }));
        } else {
            plotCharacters = [];
        }

        currentWorldId = plot.worldId;
        const world = await getWorld(currentWorldId);
        const worldContext = buildWorldContext(world);
        const systemWithWorld = PLOT_DESIGNER_PROMPT + '\n\n## 当前世界设定\n' + worldContext;

        const lastStep = plotSteps.length > 0 ? plotSteps[plotSteps.length - 1] : null;
        const continuePrompt = lastStep
            ? `继续之前的剧情。上一步是：${lastStep.narrative}。请继续推演下一步。`
            : `剧情"${plot.name}"已加载。场景：${plot.location}，目标：${plot.target}。请开始推演第一步。`;

        plotWeaverMessages = [
            { role: 'system', content: systemWithWorld },
            { role: 'user', content: continuePrompt }
        ];

        document.getElementById('plot-choice-panel').style.display = 'none';
        document.getElementById('plot-setup-panel').style.display = 'none';
        document.getElementById('plot-split-container').style.display = 'grid';
        document.getElementById('plot-save-btn').style.display = 'block';

        document.getElementById('plot-name').value = currentPlot.name;
        document.getElementById('plot-start-age').value = currentPlot.startAge;
        document.getElementById('plot-end-age').value = currentPlot.endAge;
        document.getElementById('plot-location').value = currentPlot.location;
        document.getElementById('plot-target').value = currentPlot.target;
        document.getElementById('plot-obstacle').value = currentPlot.obstacle;
        document.getElementById('plot-achievement').value = currentPlot.achievement;
        document.getElementById('plot-reward').value = currentPlot.reward;
        document.getElementById('plot-suspense').value = currentPlot.suspense;

        renderPlotSteps();
        renderCharacters();
    } catch (err) {
        alert('加载剧情失败：' + err.message);
    }
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

    if (!currentPlot) {
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
    }

    const world =  getWorld(currentWorldId);
    const worldContext = buildWorldContext(world);
    const systemWithWorld = PLOT_DESIGNER_PROMPT + '\n\n## 当前世界设定\n' + worldContext;

    plotWeaverMessages = [
        { role: 'system', content: systemWithWorld },
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

        await savePlotStep(parsed);

        loading.remove();
    } catch (err) {
        loading.remove();
        alert('推演失败：' + err.message);
    }
}

async function savePlotStep(step) {
    if (!currentPlot || !currentPlot.id) return;

    try {
        await fetch(`${window.LifeSimulator.API_BASE}/plot-steps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plotId: currentPlot.id,
                stepOrder: step.step,
                age: currentPlot.startAge + step.step - 1,
                content: step.narrative || '',
                result: step.achievement || '',
                choices: null
            })
        });
    } catch (err) {
        console.error('保存步骤失败：', err);
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
                <span class="step-number">第 ${step.step} 步</span>
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

async function removeStep(index) {
    if (confirm('确定要删除这一步吗？')) {
        const step = plotSteps[index];
        plotSteps.splice(index, 1);
        plotSteps.forEach((s, i) => {
            s.step = i + 1;
        });
        renderPlotSteps();

        if (step.dbId) {
            try {
                await fetch(`${window.LifeSimulator.API_BASE}/plot-step/${step.dbId}`, {
                    method: 'DELETE'
                });
            } catch (err) {
                console.error('删除步骤失败：', err);
            }
        }
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

    const world = await getWorld(currentWorldId);
    const worldContext = buildWorldContext(world);
    const plotContext = buildPlotContextForCharacter();

    const systemWithContext = window.LifeSimulator.CHARACTER_WEAVER_PROMPT + '\n\n## 当前世界设定\n' + worldContext + '\n\n## 当前剧情设定\n' + plotContext;

    characterWeaverMessages = [
        { role: 'system', content: systemWithContext },
        { role: 'user', content: `请为我创建一个角色：${role}。请确保角色符合上述世界观的设定，并与当前剧情相契合。` }
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
    const currentDesire = document.getElementById('char-desire').value.trim();
    const currentStance = document.getElementById('char-stance').value.trim();
    const currentFlaw = document.getElementById('char-flaw').value.trim();
    const currentRelationships = document.getElementById('char-relationships').value.trim();
    const currentDescription = document.getElementById('char-description').value.trim();

    if (!role) {
        alert('请先输入角色定位');
        return;
    }

    const world = await getWorld(currentWorldId);
    const worldContext = buildWorldContext(world);
    const plotContext = buildPlotContextForCharacter();

    const filledFields = [];
    const emptyFields = [];

    if (currentName) filledFields.push(`名称：${currentName}`);
    else emptyFields.push('名称');

    if (currentDesire) filledFields.push(`欲望：${currentDesire}`);
    else emptyFields.push('欲望');

    if (currentStance) filledFields.push(`立场：${currentStance}`);
    else emptyFields.push('立场');

    if (currentFlaw) filledFields.push(`缺陷：${currentFlaw}`);
    else emptyFields.push('缺陷');

    if (currentRelationships) filledFields.push(`关系：${currentRelationships}`);
    else emptyFields.push('关系');

    if (currentDescription) filledFields.push(`描述：${currentDescription}`);
    else emptyFields.push('描述');

    const systemWithContext = window.LifeSimulator.CHARACTER_WEAVER_PROMPT + '\n\n## 当前世界设定\n' + worldContext + '\n\n## 当前剧情设定\n' + plotContext;

    const prompt = `请重新生成一个${role}角色。
【重要】用户已填写的字段请勿修改，直接保留：
${filledFields.map(f => `  - ${f}`).join('\n')}
【重要】请只生成以下未填写的字段：
${emptyFields.map(f => `  - ${f}`).join('\n')}
请确保生成的角色符合上述世界观的设定，并与当前剧情相契合。`;

    characterWeaverMessages.push({ role: 'system', content: systemWithContext });
    characterWeaverMessages.push({ role: 'user', content: prompt });

    const resp = await window.LifeSimulator.callAI(characterWeaverMessages);
    characterWeaverMessages.push({ role: 'assistant', content: resp });

    const parsed = window.LifeSimulator.extractJSON(resp) || {};

    if (!currentName && parsed.name) document.getElementById('char-name').value = parsed.name;
    if (!currentDesire && parsed.desire) document.getElementById('char-desire').value = parsed.desire;
    if (!currentStance && parsed.stance) document.getElementById('char-stance').value = parsed.stance;
    if (!currentFlaw && parsed.flaw) document.getElementById('char-flaw').value = parsed.flaw;
    if (!currentRelationships && parsed.relationships) document.getElementById('char-relationships').value = JSON.stringify(parsed.relationships, null, 2);
    if (!currentDescription && parsed.description) document.getElementById('char-description').value = parsed.description;
}

async function saveCharacter() {
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

    const editingIndex = window.LifeSimulator.currentEditingCharIndex;
    const existingIndex = plotCharacters.findIndex(c => c.name === name && c.role === role && c.id !== (editingIndex !== undefined ? plotCharacters[editingIndex]?.id : null));

    let character;
    let isNew = false;

    if (existingIndex !== -1) {
        character = {
            ...plotCharacters[existingIndex],
            desire,
            stance,
            flaw,
            relationships,
            description,
            scope
        };
        plotCharacters[existingIndex] = character;
    } else if (editingIndex !== undefined && editingIndex !== null) {
        character = {
            ...plotCharacters[editingIndex],
            name,
            role,
            desire,
            stance,
            flaw,
            relationships,
            description,
            scope
        };
        plotCharacters[editingIndex] = character;
    } else {
        character = {
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
        isNew = true;
    }

    renderCharacters();
    window.LifeSimulator.closeModal('character-creator-modal');
    window.LifeSimulator.currentEditingCharIndex = null;

    const modal = document.getElementById('character-creator-modal');
    const titleEl = modal.querySelector('.modal-title') || modal.querySelector('h2');
    if (titleEl) titleEl.textContent = '创建角色';

    if (currentPlot && currentPlot.id) {
        try {
            if (character.dbId) {
                await fetch(`${window.LifeSimulator.API_BASE}/plot-characters/${character.dbId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plotId: currentPlot.id,
                        name: character.name,
                        role: character.role,
                        description: character.description,
                        desire: character.desire,
                        stance: character.stance,
                        flaw: character.flaw,
                        relationships: character.relationships
                    })
                });
            } else if (isNew) {
                await fetch(`${window.LifeSimulator.API_BASE}/plot-characters`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plotId: currentPlot.id,
                        name: character.name,
                        role: character.role,
                        description: character.description,
                        desire: character.desire,
                        stance: character.stance,
                        flaw: character.flaw,
                        relationships: character.relationships
                    })
                });
            }
        } catch (err) {
            console.error('保存角色失败：', err);
        }
    }
}

function renderCharacters() {
    const list = document.getElementById('characters-list');
    list.innerHTML = '';

    if (plotCharacters.length === 0) {
        list.innerHTML = '<div style="text-align:center;color:var(--text2);padding:40px">暂无角色</div>';
        return;
    }

    plotCharacters.forEach((char, index) => {
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
            <div class="character-actions">
                <button class="char-action-btn" onclick="editCharacter(${index})">编辑</button>
                <button class="char-action-btn" onclick="removeCharacter(${index})">删除</button>
            </div>
        `;
        list.appendChild(card);
    });
}

function editCharacter(index) {
    const char = plotCharacters[index];
    if (!char) return;

    document.getElementById('char-name').value = char.name || '';
    document.getElementById('char-role').value = char.role || '';
    document.getElementById('char-desire').value = char.desire || '';
    document.getElementById('char-stance').value = char.stance || '';
    document.getElementById('char-flaw').value = char.flaw || '';
    document.getElementById('char-relationships').value = char.relationships ? JSON.stringify(char.relationships, null, 2) : '';
    document.getElementById('char-description').value = char.description || '';
    document.getElementById('char-scope').value = char.scope || 'plot_only';

    window.LifeSimulator.currentEditingCharIndex = index;

    const modal = document.getElementById('character-creator-modal');
    const titleEl = modal.querySelector('.modal-title') || modal.querySelector('h2');
    if (titleEl) titleEl.textContent = '编辑角色';
    modal.classList.add('active');
}

function removeCharacter(index) {
    if (!confirm('确定要删除这个角色吗？')) return;

    const char = plotCharacters[index];
    plotCharacters.splice(index, 1);
    renderCharacters();

    if (char.dbId) {
        fetch(`${window.LifeSimulator.API_BASE}/plot-characters/${char.dbId}`, {
            method: 'DELETE'
        }).catch(err => console.error('删除角色失败：', err));
    }
}

async function saveCurrentPlot() {
    if (!currentPlot) {
        alert('没有可保存的剧情');
        return;
    }

    try {
        const plotData = {
            worldId: currentPlot.worldId,
            name: currentPlot.name,
            description: currentPlot.location,
            startAge: currentPlot.startAge,
            endAge: currentPlot.endAge,
            target: currentPlot.target,
            obstacle: currentPlot.obstacle,
            achievement: currentPlot.achievement,
            reward: currentPlot.reward,
            suspense: currentPlot.suspense
        };

        let plotId = currentPlot.id;
        if (!plotId.startsWith('plot_') || plotId.includes('temp')) {
            const resp = await fetch(`${window.LifeSimulator.API_BASE}/plots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plotData)
            });

            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || '保存失败');
            }

            const result = await resp.json();
            plotId = result.plot.id;
            currentPlot.id = plotId;
        } else {
            await fetch(`${window.LifeSimulator.API_BASE}/plot/${plotId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plotData)
            });
        }

        for (const char of plotCharacters) {
            if (!char.id || char.id.includes('temp')) {
                try {
                    await fetch(`${window.LifeSimulator.API_BASE}/plot-characters`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            plotId: plotId,
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
                } catch (err) {
                    console.error('保存角色失败：', err);
                }
            }
        }

        alert('剧情保存成功！');
        window.LifeSimulator.showScreen('worlds');
    } catch (err) {
        alert('保存失败：' + err.message);
    }
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.PLOT_DESIGNER_PROMPT = PLOT_DESIGNER_PROMPT;
window.LifeSimulator.showPlotDriver = showPlotDriver;
window.LifeSimulator.showPlotWeaverCreator = showPlotWeaverCreator;
window.LifeSimulator.exitPlotWeaver = exitPlotWeaver;
window.LifeSimulator.submitPlotWeaverAnswer = submitPlotWeaverAnswer;
window.LifeSimulator.continuePlot = continuePlot;
window.LifeSimulator.startPlotWeaving = startPlotWeaving;
window.LifeSimulator.generateNextStep = generateNextStep;
window.LifeSimulator.savePlotStep = savePlotStep;
window.LifeSimulator.showCharacterCreator = showCharacterCreator;
window.LifeSimulator.generateCharacter = generateCharacter;
window.LifeSimulator.regenerateCharacter = regenerateCharacter;
window.LifeSimulator.saveCharacter = saveCharacter;
window.LifeSimulator.saveCurrentPlot = saveCurrentPlot;