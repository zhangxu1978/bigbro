async function startNewGame() {
  window.LifeSimulator.gameState = window.LifeSimulator.initNewGameState();
  window.LifeSimulator.gameMessages = [];

  window.LifeSimulator.showScreen('game');
  document.getElementById('game-world-name').textContent = '世界构建中...';
  document.getElementById('footer-world-type').textContent = '新世界 · 构建中';

  const storyArea = document.getElementById('story-area');
  storyArea.innerHTML = '';

  const cfg = await window.LifeSimulator.loadConfig();
  window.LifeSimulator.gameState.builder = cfg.model || '未知模型';

  window.LifeSimulator.appendSystemMsg('命运之书正在为你构建一个全新的世界...');
  window.LifeSimulator.showLoadingInOptions();
  window.LifeSimulator.setInputDisabled(true);

  const systemPrompt = window.LifeSimulator.buildSystemPrompt(true);
  const userMsg = '开始游戏。请构建世界并安排我的出生，开始我的人生冒险。';

  window.LifeSimulator.gameMessages.push({ role: 'system', content: systemPrompt });
  window.LifeSimulator.gameMessages.push({ role: 'user', content: userMsg });

  try {
    const rawResp = await window.LifeSimulator.callAI(window.LifeSimulator.gameMessages);
    window.LifeSimulator.gameMessages.push({ role: 'assistant', content: rawResp });

    const parsed = window.LifeSimulator.parseAIResponse(rawResp);
    window.LifeSimulator.applyAIResponse(parsed, true);
  } catch (err) {
    window.LifeSimulator.handleAIError(err);
  }
}

async function loadGameById(worldId) {
  const world = await window.LifeSimulator.getWorld(worldId);
  if (!world) {
    window.LifeSimulator.showToast('加载存档失败');
    return;
  }
  await loadGame(world);
}

async function loadGame(world) {
  window.LifeSimulator.gameState = { ...world.gameState };
  window.LifeSimulator.gameMessages = [...(world.messages || [])];

  window.LifeSimulator.showScreen('game');
  document.getElementById('game-world-name').textContent = window.LifeSimulator.gameState.worldName || '未知世界';

  const isThirdPerson = window.LifeSimulator.gameState.narrativeMode === 'third_person';
  const playerName = window.LifeSimulator.gameState.playerName || '';
  const modeText = isThirdPerson ? '第三人称' : '第二人称';
  const nameText = playerName ? ` · ${playerName}` : '';
  document.getElementById('footer-world-type').textContent = `${window.LifeSimulator.gameState.worldName} · ${modeText}${nameText} · ${window.LifeSimulator.gameState.builder || ''}`;

  const storyArea = document.getElementById('story-area');
  storyArea.innerHTML = '';

  window.LifeSimulator.appendSystemMsg(`继续冒险：${window.LifeSimulator.gameState.worldName}`);

  const narrativeMessages = window.LifeSimulator.gameMessages.filter(m => m.role === 'assistant');
  const lastN = narrativeMessages.slice(-2);
  lastN.forEach(m => {
    try {
      const parsed = window.LifeSimulator.parseAIResponse(m.content);
      if (parsed.narrative) {
        if (parsed.timeSkip) window.LifeSimulator.appendSystemMsg(parsed.timeSkip);
        window.LifeSimulator.appendNarrative(parsed.narrative);
      }
    } catch (e) {}
  });

  window.LifeSimulator.appendSystemMsg('命运之书正在回忆剧情走向...');
  window.LifeSimulator.showLoadingInOptions();
  window.LifeSimulator.setInputDisabled(true);

  const systemPrompt = window.LifeSimulator.buildSystemPrompt(false);
  if (window.LifeSimulator.gameMessages.length > 0 && window.LifeSimulator.gameMessages[0].role === 'system') {
    window.LifeSimulator.gameMessages[0].content = systemPrompt;
  }

  window.LifeSimulator.gameMessages.push({ role: 'user', content: '（玩家重新进入游戏）请简短描述当前状态，并给出接下来的选项，继续冒险。' });

  try {
    const rawResp = await window.LifeSimulator.callAI(window.LifeSimulator.gameMessages);
    window.LifeSimulator.gameMessages.push({ role: 'assistant', content: rawResp });
    const parsed = window.LifeSimulator.parseAIResponse(rawResp);
    window.LifeSimulator.applyAIResponse(parsed, false);
  } catch (err) {
    window.LifeSimulator.handleAIError(err);
  }
}

async function loadGameFromSave(save) {
  window.LifeSimulator.gameState = { ...save.gameState };
  window.LifeSimulator.gameMessages = [...(save.messages || [])];

  window.LifeSimulator.showScreen('game');
  document.getElementById('game-world-name').textContent = window.LifeSimulator.gameState.worldName || '未知世界';

  const isThirdPerson = window.LifeSimulator.gameState.narrativeMode === 'third_person';
  const playerName = window.LifeSimulator.gameState.playerName || '';
  const modeText = isThirdPerson ? '第三人称' : '第二人称';
  const nameText = playerName ? ` · ${playerName}` : '';
  document.getElementById('footer-world-type').textContent = `${window.LifeSimulator.gameState.worldName} · ${modeText}${nameText} · ${window.LifeSimulator.gameState.builder || ''}`;
  document.getElementById('game-turn').textContent = window.LifeSimulator.gameState.turn || 0;
  document.getElementById('stat-age').textContent = window.LifeSimulator.gameState.age || 0;

  const storyArea = document.getElementById('story-area');
  storyArea.innerHTML = '';

  window.LifeSimulator.appendSystemMsg(`从存档继续冒险：${window.LifeSimulator.gameState.worldName}`);
  window.LifeSimulator.appendSystemMsg(`当前进度：第 ${window.LifeSimulator.gameState.turn || 0} 回合，${window.LifeSimulator.gameState.age || 0} 岁`);

  const narrativeMessages = window.LifeSimulator.gameMessages.filter(m => m.role === 'assistant');
  const lastN = narrativeMessages.slice(-2);
  lastN.forEach(m => {
    try {
      const parsed = window.LifeSimulator.parseAIResponse(m.content);
      if (parsed.narrative) {
        if (parsed.timeSkip) window.LifeSimulator.appendSystemMsg(parsed.timeSkip);
        window.LifeSimulator.appendNarrative(parsed.narrative);
      }
    } catch (e) {}
  });

  window.LifeSimulator.appendSystemMsg('命运之书正在推演新的剧情走向...');
  window.LifeSimulator.showLoadingInOptions();
  window.LifeSimulator.setInputDisabled(true);

  const systemPrompt = window.LifeSimulator.buildSystemPrompt(false);
  if (window.LifeSimulator.gameMessages.length > 0 && window.LifeSimulator.gameMessages[0].role === 'system') {
    window.LifeSimulator.gameMessages[0].content = systemPrompt;
  }

  window.LifeSimulator.gameMessages.push({ role: 'user', content: '（玩家从存档重新开始）请基于当前状态继续推演剧情，给出新的选项。' });

  try {
    const rawResp = await window.LifeSimulator.callAI(window.LifeSimulator.gameMessages);
    window.LifeSimulator.gameMessages.push({ role: 'assistant', content: rawResp });
    const parsed = window.LifeSimulator.parseAIResponse(rawResp);
    window.LifeSimulator.applyAIResponse(parsed, false);
  } catch (err) {
    window.LifeSimulator.handleAIError(err);
  }
}

async function selectOption(text) {
  if (window.LifeSimulator.isGenerating) return;

  window.LifeSimulator.appendPlayerMsg(text);
  window.LifeSimulator.isGenerating = true;
  window.LifeSimulator.setInputDisabled(true);
  window.LifeSimulator.showLoadingInOptions();

  window.LifeSimulator.gameMessages.push({ role: 'user', content: `我的选择：${text}` });
  window.LifeSimulator.gameState.turn++;
  document.getElementById('game-turn').textContent = window.LifeSimulator.gameState.turn;
  document.getElementById('game-gold').textContent = window.LifeSimulator.gameState.gold || 0;

  try {
    const rawResp = await window.LifeSimulator.callAI(window.LifeSimulator.gameMessages);
    window.LifeSimulator.gameMessages.push({ role: 'assistant', content: rawResp });
    const parsed = window.LifeSimulator.parseAIResponse(rawResp);
    window.LifeSimulator.applyAIResponse(parsed, false);
  } catch (err) {
    window.LifeSimulator.handleAIError(err);
  }
}

async function submitGameInput() {
  const input = document.getElementById('game-input');
  const text = input.value.trim();
  if (!text || window.LifeSimulator.isGenerating) return;
  input.value = '';
  await selectOption(text);
}

async function applyAIResponse(parsed, isFirst) {
  window.LifeSimulator.isGenerating = false;

  if (isFirst && parsed.worldName) {
    window.LifeSimulator.gameState.worldName = parsed.worldName;
    window.LifeSimulator.gameState.worldDesc = parsed.worldDesc || '';
    window.LifeSimulator.gameState.worldTags = parsed.worldTags || [];
    document.getElementById('game-world-name').textContent = parsed.worldName;
    document.getElementById('footer-world-type').textContent = `${parsed.worldName} · 冒险中`;
  }

  const previousAge = window.LifeSimulator.gameState.age || 0;
  
  if (parsed.age !== undefined) {
    window.LifeSimulator.gameState.age = parsed.age;
    document.getElementById('stat-age').textContent = parsed.age;
  }
  if (parsed.status) window.LifeSimulator.gameState.characterStatus = parsed.status;

  if (parsed.timeSkip) window.LifeSimulator.appendSystemMsg(`— ${parsed.timeSkip} —`);

  if (parsed.narrative) window.LifeSimulator.appendNarrative(parsed.narrative);

  if (parsed.isDead) {
    handleDeath(parsed);
    return;
  }

  const currentAge = window.LifeSimulator.gameState.age || 0;
  if (currentAge > previousAge) {
    await checkPlotTrigger(previousAge, currentAge);
  }

  window.LifeSimulator.renderOptions(parsed.options || []);
  window.LifeSimulator.setInputDisabled(false);

  window.LifeSimulator.scrollStoryToBottom();

  window.LifeSimulator.saveCurrentGame();
}

function handleDeath(parsed) {
  if (window.LifeSimulator.isGameHosting) {
    window.LifeSimulator.stopGameHosting();
  }

  const storyArea = document.getElementById('story-area');
  const deathMsg = document.createElement('div');
  deathMsg.className = 'msg msg-death';
  deathMsg.innerHTML = `
    <div style="font-size:1.5rem;margin-bottom:12px">⚰</div>
    <div>${parsed.narrative || '你的故事就此落幕...'}</div>
    ${parsed.deathSummary ? `<div style="margin-top:16px;font-size:0.9rem;font-weight:normal;color:var(--text2);border-top:1px solid rgba(248,113,113,0.2);padding-top:12px">${parsed.deathSummary}</div>` : ''}
  `;
  storyArea.appendChild(deathMsg);
  window.LifeSimulator.scrollStoryToBottom();

  document.getElementById('options-list').innerHTML = '';
  window.LifeSimulator.setInputDisabled(true);

  setTimeout(() => {
    window.LifeSimulator.gameState.isDead = true;
    window.LifeSimulator.saveCurrentGame();
    showGameOver(parsed);
  }, 3000);
}

function showGameOver(parsed) {
  const isThirdPerson = window.LifeSimulator.gameState.narrativeMode === 'third_person';
  const playerName = window.LifeSimulator.gameState.playerName || '';
  const protagonist = isThirdPerson && playerName ? playerName : '你';
  const summary = document.getElementById('gameover-summary');
  summary.innerHTML = `
    <strong>世界：${window.LifeSimulator.gameState.worldName}</strong><br>
    ${window.LifeSimulator.gameState.builder ? `<strong>构建者：${window.LifeSimulator.gameState.builder}</strong><br>` : ''}
    ${playerName ? `<strong>主角：${playerName}</strong><br>` : ''}
    <strong>视角：${isThirdPerson ? '第三人称' : '第二人称'}</strong><br>
    <strong>享年：${window.LifeSimulator.gameState.age} 岁</strong><br>
    <strong>历经：${window.LifeSimulator.gameState.turn} 个人生节点</strong><br><br>
    ${parsed.deathSummary || `${protagonist}在这个世界留下了自己的印记。`}
  `;
  window.LifeSimulator.showScreen('gameover');
}

function exitGame() {
  if (window.LifeSimulator.isGameHosting) {
    window.LifeSimulator.stopGameHosting();
  }
  window.LifeSimulator.closeModal('exit-modal');
  window.LifeSimulator.showScreen('menu');
}

function restartGame() {
  startNewGame();
}

function handleAIError(err) {
  window.LifeSimulator.isGenerating = false;
  window.LifeSimulator.setInputDisabled(false);
  const storyArea = document.getElementById('story-area');
  if (!storyArea) {
    console.error('story-area not found, error:', err);
    return;
  }
  const div = document.createElement('div');
  div.className = 'msg msg-system';
  div.style.color = 'var(--danger)';
  div.textContent = `⚠ 命运之书暂时失联（${err.message}）。请检查 AI 设置或网络连接。`;
  storyArea.appendChild(div);

  window.LifeSimulator.renderOptions([
    { id: 1, text: '等待，耐心休息' },
    { id: 2, text: '再试一次' },
  ]);
}

async function checkPlotTrigger(fromAge, toAge) {
    const worldId = window.LifeSimulator.gameState.worldId;
    if (!worldId) return;

    for (let age = fromAge + 1; age <= toAge; age++) {
        try {
            const resp = await fetch(`${window.LifeSimulator.API_BASE}/plot-by-age/${worldId}/${age}`);
            if (!resp.ok) continue;
            
            const plot = await resp.json();
            if (plot && !window.LifeSimulator.gameState.activePlot) {
                await triggerPlot(plot);
                return;
            }
        } catch (err) {
            console.error('检查剧情触发失败:', err);
        }
    }
}

async function triggerPlot(plot) {
    window.LifeSimulator.gameState.activePlot = plot.id;
    
    window.LifeSimulator.appendSystemMsg('📖 命运之书翻开了新的篇章...');
    
    const narrative = `【${plot.name}】\n${plot.description || ''}`;
    window.LifeSimulator.appendNarrative(narrative);
    
    const steps = await fetch(`${window.LifeSimulator.API_BASE}/plot-steps/${plot.id}`);
    const stepsData = await steps.json();
    
    if (stepsData && stepsData.length > 0) {
        const firstStep = stepsData[0];
        window.LifeSimulator.appendNarrative(`**目的**：${firstStep.purpose}\n**阻碍**：${firstStep.obstacle}\n**达成**：${firstStep.achievement}`);
        if (firstStep.narrative) {
            window.LifeSimulator.appendNarrative(firstStep.narrative);
        }
    }
    
    const characters = await fetch(`${window.LifeSimulator.API_BASE}/plot-characters/${plot.id}`);
    const charactersData = await characters.json();
    
    if (charactersData && charactersData.length > 0) {
        window.LifeSimulator.appendSystemMsg('👥 登场角色：');
        charactersData.forEach(char => {
            window.LifeSimulator.appendNarrative(`- ${char.name}（${char.role}）`);
        });
    }
    
    window.LifeSimulator.renderOptions([
        { id: 1, text: '遵循命运的指引...' },
        { id: 2, text: '尝试反抗命运...' },
        { id: 3, text: '静观其变...' }
    ]);
    
    window.LifeSimulator.setInputDisabled(false);
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.startNewGame = startNewGame;
window.LifeSimulator.loadGameById = loadGameById;
window.LifeSimulator.loadGame = loadGame;
window.LifeSimulator.loadGameFromSave = loadGameFromSave;
window.LifeSimulator.selectOption = selectOption;
window.LifeSimulator.submitGameInput = submitGameInput;
window.LifeSimulator.applyAIResponse = applyAIResponse;
window.LifeSimulator.handleDeath = handleDeath;
window.LifeSimulator.showGameOver = showGameOver;
window.LifeSimulator.exitGame = exitGame;
window.LifeSimulator.restartGame = restartGame;
window.LifeSimulator.handleAIError = handleAIError;
window.LifeSimulator.checkPlotTrigger = checkPlotTrigger;
window.LifeSimulator.triggerPlot = triggerPlot;
