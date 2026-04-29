async function startWorldCreation() {
  window.LifeSimulator.initWorldCreator();

  const chat = document.getElementById('creator-chat');
  chat.innerHTML = '';

  const inputArea = document.getElementById('creator-input-area');
  inputArea.style.display = 'flex';

  window.LifeSimulator.creatorMessages = [
    { role: 'system', content: window.LifeSimulator.WORLD_CREATOR_PROMPT }
  ];

  appendCreatorMsg('assistant', '✨ 你好，冒险者！我是世界守护者，很高兴与你相遇。\n\n在我们踏上旅程之前，让我来引导你构建一个专属的世界。', null);

  document.getElementById('creator-input').focus();

  window.LifeSimulator.creatorMessages.push({ role: 'user', content: '你好，我想创造一个新世界。请给我一些选项来选择。' });
  appendCreatorMsg('user', '你好，我想创造一个新世界。请给我一些选项来选择。');

  await handleCreatorAIResponse();
}

function appendCreatorMsg(role, content, options) {
  const chat = document.getElementById('creator-chat');
  const div = document.createElement('div');
  div.className = 'creator-msg ' + role;

  if (role === 'assistant') {
    div.innerHTML = `<div class="msg-label">🌍 世界守护者</div><div>${content.replace(/\n/g, '<br>')}</div>`;
    if (options && options.length > 0) {
      const optionsDiv = document.createElement('div');
      optionsDiv.className = 'creator-options';
      optionsDiv.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:12px';
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'creator-opt-btn';
        btn.textContent = opt.text;
        btn.onclick = () => window.LifeSimulator.selectCreatorOption(opt.text);

        const editBtn = document.createElement('button');
        editBtn.className = 'creator-opt-edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.title = '发送到输入框';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          window.LifeSimulator.sendCreatorOptionToInput(opt.text);
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

function selectCreatorOption(text) {
  if (window.LifeSimulator.isCreatorGenerating) return;
  appendCreatorMsg('user', text);
  window.LifeSimulator.creatorMessages.push({ role: 'user', content: text });
  window.LifeSimulator.creatorQuestionCount++;
  handleCreatorAIResponse();
}

function renderCreatorHints(hints) {
  const container = document.getElementById('creator-hints');
  container.innerHTML = '';

  hints.forEach(hint => {
    const btn = document.createElement('button');
    btn.className = 'creator-hint-btn';
    btn.textContent = hint;
    btn.onclick = () => {
      document.getElementById('creator-input').value = hint;
      window.LifeSimulator.submitCreatorAnswer();
    };
    container.appendChild(btn);
  });
}

async function handleCreatorAIResponse() {
  window.LifeSimulator.isCreatorGenerating = true;

  const progress = document.createElement('div');
  progress.className = 'creator-msg system';
  progress.id = 'creator-progress';
  progress.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> 世界守护者正在思考...';
  document.getElementById('creator-chat').appendChild(progress);
  scrollCreatorChat();

  try {
    const rawResp = await window.LifeSimulator.callAI(window.LifeSimulator.creatorMessages);
    window.LifeSimulator.creatorMessages.push({ role: 'assistant', content: rawResp });

    const progressEl = document.getElementById('creator-progress');
    if (progressEl) progressEl.remove();

    if (rawResp.includes('"ready": true') || rawResp.includes('"ready":true')) {
      const jsonMatch = rawResp.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          applyCreatorReady(parsed);
        } catch (e) {
          const start = rawResp.indexOf('{');
          const end = rawResp.lastIndexOf('}');
          if (start >= 0 && end > start) {
            const parsed = JSON.parse(rawResp.slice(start, end + 1));
            applyCreatorReady(parsed);
          }
        }
      }
    } else {
      const parsed = window.LifeSimulator.parseCreatorResponse(rawResp);
      if (parsed.narrative && parsed.options) {
        appendCreatorMsg('assistant', parsed.narrative, parsed.options);
        updateCreatorHints(parsed.options);
      } else {
        appendCreatorMsg('assistant', rawResp, null);
      }
    }
  } catch (err) {
    const progressEl = document.getElementById('creator-progress');
    if (progressEl) progressEl.remove();
    appendCreatorMsg('assistant', `⚠ 世界守护者暂时失联（${err.message}）。请稍后重试，或返回重新开始。`);
  }

  window.LifeSimulator.isCreatorGenerating = false;
  scrollCreatorChat();
}

async function submitCreatorAnswer() {
  if (window.LifeSimulator.isCreatorGenerating) return;

  const input = document.getElementById('creator-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  appendCreatorMsg('user', text);
  window.LifeSimulator.creatorMessages.push({ role: 'user', content: text });
  window.LifeSimulator.creatorQuestionCount++;

  await handleCreatorAIResponse();
}

function scrollCreatorChat() {
  const chat = document.getElementById('creator-chat');
  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

function updateCreatorHints(options) {
  const hints = [
    '让我想想...', '随便什么都行', '有挑战性的', '轻松一些',
    '神秘一点', '黑暗风格', '光明磊落', '更多探索', '更多战斗'
  ];

  if (window.LifeSimulator.creatorQuestionCount >= 3) {
    hints.push('💡 我觉得可以了');
    hints.push('🚀 开始冒险');
  }

  renderCreatorHints(hints);
}

function applyCreatorReady(parsed) {
  window.LifeSimulator.creatorState.playerName = parsed.playerName || '';
  window.LifeSimulator.creatorState.narrativeMode = parsed.narrativeMode || 'second_person';
  window.LifeSimulator.creatorState.worldName = parsed.worldName || '未知世界';
  window.LifeSimulator.creatorState.worldType = parsed.worldType || '';
  window.LifeSimulator.creatorState.worldTags = parsed.worldTags || [];
  window.LifeSimulator.creatorState.worldDesc = parsed.worldDesc || '';
  window.LifeSimulator.creatorState.atmosphere = parsed.atmosphere || '';
  window.LifeSimulator.creatorState.powerSystem = parsed.powerSystem || '';
  window.LifeSimulator.creatorState.societyStructure = parsed.societyStructure || '';
  window.LifeSimulator.creatorState.specialElement = parsed.specialElement || '';
  window.LifeSimulator.creatorState.playerBackground = parsed.playerBackground || '';
  window.LifeSimulator.creatorState.storylines = parsed.storylines || { main: '', hidden: '', romance: '' };
  window.LifeSimulator.creatorState.importantCharacters = parsed.importantCharacters || { heroine: '', mentor: '', friend: '', enemy: '', rival: '' };

  const chat = document.getElementById('creator-chat');
  const isThirdPerson = window.LifeSimulator.creatorState.narrativeMode === 'third_person';

  const summary = document.createElement('div');
  summary.className = 'creator-summary';
  summary.innerHTML = `
    <h3>✨ 世界构建完成！</h3>
    <div class="creator-summary-item"><strong>叙事视角：</strong>${isThirdPerson ? '第三人称（旁观者视角）' : '第二人称（沉浸视角）'}</div>
    ${window.LifeSimulator.creatorState.playerName ? `<div class="creator-summary-item"><strong>主角名字：</strong>${window.LifeSimulator.creatorState.playerName}</div>` : ''}
    <div class="creator-summary-item"><strong>世界名称：</strong>${window.LifeSimulator.creatorState.worldName}</div>
    <div class="creator-summary-item"><strong>世界类型：</strong>${window.LifeSimulator.creatorState.worldType}</div>
    <div class="creator-summary-item"><strong>氛围：</strong>${window.LifeSimulator.creatorState.atmosphere}</div>
    <div class="creator-summary-item"><strong>力量体系：</strong>${window.LifeSimulator.creatorState.powerSystem}</div>
    <div class="creator-summary-item"><strong>社会结构：</strong>${window.LifeSimulator.creatorState.societyStructure}</div>
    ${window.LifeSimulator.creatorState.specialElement ? `<div class="creator-summary-item"><strong>特殊元素：</strong>${window.LifeSimulator.creatorState.specialElement}</div>` : ''}
    <div class="creator-summary-item"><strong>${isThirdPerson ? '主角' : '你'}出身：</strong>${window.LifeSimulator.creatorState.playerBackground}</div>
    
    <h4 style="margin-top:20px;margin-bottom:10px">📜 故事线</h4>
    ${window.LifeSimulator.creatorState.storylines.main ? `<div class="creator-summary-item"><strong>明线：</strong>${window.LifeSimulator.creatorState.storylines.main}</div>` : ''}
    ${window.LifeSimulator.creatorState.storylines.hidden ? `<div class="creator-summary-item"><strong>暗线：</strong>${window.LifeSimulator.creatorState.storylines.hidden}</div>` : ''}
    ${window.LifeSimulator.creatorState.storylines.romance ? `<div class="creator-summary-item"><strong>感情线：</strong>${window.LifeSimulator.creatorState.storylines.romance}</div>` : ''}
    
    <h4 style="margin-top:20px;margin-bottom:10px">👥 重要角色</h4>
    ${window.LifeSimulator.creatorState.importantCharacters.heroine ? `<div class="creator-summary-item"><strong>女主：</strong>${window.LifeSimulator.creatorState.importantCharacters.heroine}</div>` : ''}
    ${window.LifeSimulator.creatorState.importantCharacters.mentor ? `<div class="creator-summary-item"><strong>良师：</strong>${window.LifeSimulator.creatorState.importantCharacters.mentor}</div>` : ''}
    ${window.LifeSimulator.creatorState.importantCharacters.friend ? `<div class="creator-summary-item"><strong>益友：</strong>${window.LifeSimulator.creatorState.importantCharacters.friend}</div>` : ''}
    ${window.LifeSimulator.creatorState.importantCharacters.enemy ? `<div class="creator-summary-item"><strong>仇敌：</strong>${window.LifeSimulator.creatorState.importantCharacters.enemy}</div>` : ''}
    ${window.LifeSimulator.creatorState.importantCharacters.rival ? `<div class="creator-summary-item"><strong>对手：</strong>${window.LifeSimulator.creatorState.importantCharacters.rival}</div>` : ''}
    
    <button class="creator-start-btn" onclick="window.LifeSimulator.startGameFromCreator()">🚀 开始冒险</button>
  `;
  chat.appendChild(summary);

  document.getElementById('creator-input-area').style.display = 'none';
  chat.scrollTop = chat.scrollHeight;
}

async function startGameFromCreator() {
  const chat = document.getElementById('creator-chat');

  const loading = document.createElement('div');
  loading.className = 'creator-msg system';
  loading.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> 命运之书正在书写序章...';
  chat.appendChild(loading);
  chat.scrollTop = chat.scrollHeight;

  const cfg = await window.LifeSimulator.loadConfig();
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

  const lastAssistantMsg = window.LifeSimulator.creatorMessages.filter(m => m.role === 'assistant').pop();
  const systemPrompt = lastAssistantMsg ? lastAssistantMsg.content : '';

  const jsonMatch = systemPrompt.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let finalWorldData = window.LifeSimulator.creatorState;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      finalWorldData = { ...window.LifeSimulator.creatorState, ...parsed };
    } catch (e) {}
  }

  window.LifeSimulator.gameState = window.LifeSimulator.initNewGameState();
  window.LifeSimulator.gameState.playerName = finalWorldData.playerName || '';
  window.LifeSimulator.gameState.narrativeMode = finalWorldData.narrativeMode || 'second_person';
  window.LifeSimulator.gameState.worldName = finalWorldData.worldName;
  window.LifeSimulator.gameState.worldDesc = finalWorldData.worldDesc;
  window.LifeSimulator.gameState.worldType = 'custom';
  window.LifeSimulator.gameState.worldTags = finalWorldData.worldTags || [];
  window.LifeSimulator.gameState.storylines = finalWorldData.storylines || { main: '', hidden: '', romance: '' };
  window.LifeSimulator.gameState.importantCharacters = finalWorldData.importantCharacters || { heroine: '', mentor: '', friend: '', enemy: '', rival: '' };
  window.LifeSimulator.gameState.builder = cfg.model || '未知模型';

  const isThirdPerson = window.LifeSimulator.gameState.narrativeMode === 'third_person';
  const playerName = window.LifeSimulator.gameState.playerName || '主角';

  const customSystemPrompt = `你是一个沉浸式文字冒险游戏的叙事引擎。你要扮演"命运之书"——一个全知全能的叙事者。

## 叙事模式
- 视角模式：${isThirdPerson ? '第三人称旁观视角' : '第二人称沉浸视角'}
- 主角名字：${playerName}
- 叙事人称：${isThirdPerson ? '使用"' + playerName + '"来指代主角，用旁观者视角描述' : '使用"你"来指代主角'}

## 世界设定（由玩家与世界守护者共同构建）

**世界名称：${finalWorldData.worldName}**
**世界类型：${finalWorldData.worldType}**
**世界描述：${finalWorldData.worldDesc}**
**世界氛围：${finalWorldData.atmosphere}**
**力量体系：${finalWorldData.powerSystem}**
**社会结构：${finalWorldData.societyStructure}**
${finalWorldData.specialElement ? `**特殊元素：${finalWorldData.specialElement}**\n` : ''}
**玩家出身：${finalWorldData.playerBackground}**

${finalWorldData.storylines ? `## 故事线
**明线：${finalWorldData.storylines.main || '未知'}**
**暗线：${finalWorldData.storylines.hidden || '未知'}**
**感情线：${finalWorldData.storylines.romance || '未知'}**
` : ''}

${finalWorldData.importantCharacters ? `## 重要角色
**女主：${finalWorldData.importantCharacters.heroine || '未知'}**
**良师：${finalWorldData.importantCharacters.mentor || '未知'}**
**益友：${finalWorldData.importantCharacters.friend || '未知'}**
**仇敌：${finalWorldData.importantCharacters.enemy || '未知'}**
**对手：${finalWorldData.importantCharacters.rival || '未知'}**
` : ''}

请严格遵循以上设定推演剧情，保持世界观一致性。

## 游戏规则
1. ${isThirdPerson ? '使用第三人称，用"' + playerName + '"指代主角，以旁观者视角描述主角的经历和选择' : '使用第二人称，用"你"指代主角，让玩家沉浸其中'}
2. 玩家初始背景是上述设定的出身，请围绕这个背景展开
3. 每次回复推进剧情，时间跨度自然流逝
4. 保持张力、悬念和情感起伏
5. 死亡应该是有意义的，不是随机的惩罚

## 回复格式（严格遵守）——必须是合法 JSON：
\`\`\`json
{
  "narrative": "叙事内容（300-600字）",
  "age": 当前年龄（数字）,
  "timeSkip": "时间跳跃描述",
  "status": "角色当前状态（50字以内）",
  "worldName": "${finalWorldData.worldName}",
  "worldDesc": "${finalWorldData.worldDesc}",
  "worldTags": ${JSON.stringify(finalWorldData.worldTags || [])},
  "options": [
    {"id": 1, "text": "选项1"},
    {"id": 2, "text": "选项2"},
    {"id": 3, "text": "选项3"}
  ],
  "isDead": false,
  "deathSummary": null
}
\`\`\`

死亡时：\`\`\`json{"narrative":"...","age":N,"isDead":true,"deathSummary":"...","options":[],"status":""}\`\`\`

记住：你就是这个世界的神。让冒险值得被记住。`;

  window.LifeSimulator.gameMessages = [
    { role: 'system', content: customSystemPrompt },
    { role: 'user', content: `请开始我的冒险。${finalWorldData.playerBackground}` }
  ];

  window.LifeSimulator.showScreen('game');
  document.getElementById('game-world-name').textContent = window.LifeSimulator.gameState.worldName;
  document.getElementById('footer-world-type').textContent = `${window.LifeSimulator.gameState.worldName} · ${isThirdPerson ? '第三人称' : '第二人称'} · ${window.LifeSimulator.gameState.builder}`;

  const storyArea = document.getElementById('story-area');
  storyArea.innerHTML = '';
  window.LifeSimulator.appendSystemMsg(`世界「${window.LifeSimulator.gameState.worldName}」构建完成，${isThirdPerson ? playerName + '的冒险即将开始...' : '你的冒险即将开始...'}`);
  window.LifeSimulator.showLoadingInOptions();
  window.LifeSimulator.setInputDisabled(true);

  try {
    const rawResp = await window.LifeSimulator.callAI(window.LifeSimulator.gameMessages);
    window.LifeSimulator.gameMessages.push({ role: 'assistant', content: rawResp });
    const parsed = window.LifeSimulator.parseAIResponse(rawResp);
    window.LifeSimulator.applyAIResponse(parsed, true);
  } catch (err) {
    window.LifeSimulator.handleAIError(err);
  }
}

function confirmExitCreator() {
  if (window.LifeSimulator.creatorQuestionCount === 0 || window.LifeSimulator.isCreatorGenerating) {
    window.LifeSimulator.exitCreator();
    return;
  }
  document.getElementById('exit-creator-modal').classList.add('active');
}

function exitCreator() {
  if (window.LifeSimulator.isCreatorHosting) {
    window.LifeSimulator.stopCreatorHosting();
  }
  window.LifeSimulator.closeModal('exit-creator-modal');
  window.LifeSimulator.initWorldCreator();
  window.LifeSimulator.showScreen('worlds');
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.startWorldCreation = startWorldCreation;
window.LifeSimulator.appendCreatorMsg = appendCreatorMsg;
window.LifeSimulator.selectCreatorOption = selectCreatorOption;
window.LifeSimulator.renderCreatorHints = renderCreatorHints;
window.LifeSimulator.handleCreatorAIResponse = handleCreatorAIResponse;
window.LifeSimulator.submitCreatorAnswer = submitCreatorAnswer;
window.LifeSimulator.scrollCreatorChat = scrollCreatorChat;
window.LifeSimulator.updateCreatorHints = updateCreatorHints;
window.LifeSimulator.applyCreatorReady = applyCreatorReady;
window.LifeSimulator.startGameFromCreator = startGameFromCreator;
window.LifeSimulator.confirmExitCreator = confirmExitCreator;
window.LifeSimulator.exitCreator = exitCreator;
