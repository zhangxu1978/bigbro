// ════════════════════════════════════════
//  API 基础配置
// ════════════════════════════════════════
const API_BASE = '/api/lifesim';

// ════════════════════════════════════════
//  配置管理（后端存储）
// ════════════════════════════════════════
const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:3100/v1/chat/completions',
  model: 'moda-kimi2.5',
  apiKey: '',
  maxTokens: 2000
};

let cachedConfig = null;

async function loadModels() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
    const data = await response.json();
    const select = document.getElementById('cfg-model');
    select.innerHTML = '';
    if (!data.models || data.models.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '暂无可用模型';
      select.appendChild(option);
      return;
    }
    data.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id || 'unknown';
      option.textContent = `${model.name} (${model.provider})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('加载模型列表失败:', error);
    const select = document.getElementById('cfg-model');
    select.innerHTML = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '加载模型失败';
    select.appendChild(option);
  }
}

async function loadConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const resp = await fetch(`${API_BASE}/config`);
    if (!resp.ok) throw new Error('加载配置失败');
    cachedConfig = await resp.json();
    if (cachedConfig.apiUrl && cachedConfig.apiUrl.includes('localhost')) {
      cachedConfig.apiUrl = cachedConfig.apiUrl.replace('localhost', window.location.hostname);
    }
    return cachedConfig;
  } catch (err) {
    console.error('加载配置失败，使用默认配置:', err);
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig() {
  let apiUrl = document.getElementById('cfg-api-url').value || DEFAULT_CONFIG.apiUrl;
  if (apiUrl.includes('localhost')) {
    apiUrl = apiUrl.replace('localhost', window.location.hostname);
  }
  const cfg = {
    apiUrl: apiUrl,
    model: document.getElementById('cfg-model').value || DEFAULT_CONFIG.model,
    apiKey: document.getElementById('cfg-key').value || '',
    maxTokens: parseInt(document.getElementById('cfg-tokens').value) || DEFAULT_CONFIG.maxTokens,
  };
  try {
    const resp = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    if (!resp.ok) throw new Error('保存失败');
    cachedConfig = cfg;
    showToast('设置已保存');
    showScreen('menu');
  } catch (err) {
    showToast('保存失败: ' + err.message);
  }
}

async function initConfigScreen() {
  await loadModels();
  const cfg = await loadConfig();
  document.getElementById('cfg-api-url').value = cfg.apiUrl;
  const modelSelect = document.getElementById('cfg-model');
  if (cfg.model) {
    const existingOption = Array.from(modelSelect.options).find(opt => opt.value === cfg.model);
    if (!existingOption) {
      const option = document.createElement('option');
      option.value = cfg.model;
      option.textContent = cfg.model;
      modelSelect.insertBefore(option, modelSelect.firstChild);
    }
    modelSelect.value = cfg.model;
  }
  document.getElementById('cfg-key').value = cfg.apiKey;
  document.getElementById('cfg-tokens').value = cfg.maxTokens;
}

// ════════════════════════════════════════
//  世界存档管理（后端存储）
// ════════════════════════════════════════
async function getWorlds() {
  try {
    const resp = await fetch(`${API_BASE}/worlds`);
    if (!resp.ok) throw new Error('加载世界列表失败');
    return await resp.json();
  } catch (err) {
    console.error('加载世界列表失败:', err);
    return [];
  }
}

async function getWorld(id) {
  try {
    const resp = await fetch(`${API_BASE}/worlds/${id}`);
    if (!resp.ok) throw new Error('加载世界失败');
    return await resp.json();
  } catch (err) {
    console.error('加载世界失败:', err);
    return null;
  }
}

async function saveWorlds(worlds) {
  // 批量保存，实际使用时建议逐个调用 saveWorld
  for (const world of worlds) {
    await saveWorld(world);
  }
}

async function saveWorld(worldData) {
  try {
    const resp = await fetch(`${API_BASE}/worlds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(worldData)
    });
    if (!resp.ok) throw new Error('保存世界失败');
    return await resp.json();
  } catch (err) {
    console.error('保存世界失败:', err);
    throw err;
  }
}

async function saveCurrentGame() {
  if (!gameState.worldId) return;
  try {
    const worldData = {
      id: gameState.worldId,
      name: gameState.worldName,
      desc: gameState.worldDesc,
      type: gameState.worldType,
      tags: gameState.worldTags || [],
      savedAt: Date.now(),
      gameState: { ...gameState },
      messages: [...gameMessages]
    };
    const resp = await fetch(`${API_BASE}/worlds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(worldData)
    });
    if (!resp.ok) throw new Error('存档失败');
    showToast('存档成功');
  } catch (err) {
    showToast('存档失败: ' + err.message);
  }
}

async function deleteWorld(id, e) {
  e.stopPropagation();
  if (!confirm('确定删除这个世界的存档？')) return;
  try {
    const resp = await fetch(`${API_BASE}/worlds/${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('删除失败');
    renderWorldsGrid();
  } catch (err) {
    showToast('删除失败: ' + err.message);
  }
}

async function renderWorldsGrid() {
  const worlds = await getWorlds();
  const grid = document.getElementById('worlds-grid');
  grid.innerHTML = '';

  // 已有世界存档
  if (worlds.length === 0) {
    grid.innerHTML = '<div style="color:var(--text2);font-size:0.88rem;text-align:center;padding:40px 20px">暂无存档，开始新冒险吧！</div>';
    return;
  }

  worlds.forEach(world => {
    const card = document.createElement('div');
    card.className = 'world-card';
    const tagsHtml = (world.tags || []).map(t => `<span class="wc-tag">${t}</span>`).join('');
    const date = new Date(world.savedAt).toLocaleDateString('zh-CN');
    card.innerHTML = `
      <button class="del-btn" onclick="deleteWorld('${world.id}', event)">✕</button>
      <div class="wc-icon">🌍</div>
      <div class="wc-name">${world.name || '未知世界'}</div>
      <div class="wc-desc">${world.desc || '一个充满神秘的世界...'}</div>
      <div class="wc-meta">
        ${tagsHtml}
        <span class="wc-tag">上次: ${date}</span>
        <span class="wc-tag">回合 ${world.turn || 0}</span>
      </div>
    `;
    card.onclick = () => loadGameById(world.id);
    grid.appendChild(card);
  });
}

// ════════════════════════════════════════
//  游戏状态
// ════════════════════════════════════════
let gameState = {};
let gameMessages = [];
let isGenerating = false;

// ════════════════════════════════════════
//  对话式世界观创建器状态
// ════════════════════════════════════════
let creatorMessages = [];
let creatorState = {
  worldName: '',
  worldType: '',
  worldTags: [],
  worldDesc: '',
  atmosphere: '',
  powerSystem: '',
  societyStructure: '',
  specialElement: '',
  playerBackground: ''
};
let isCreatorGenerating = false;
let creatorQuestionCount = 0;
const MAX_CREATOR_QUESTIONS = 8;

const WORLD_CREATOR_PROMPT = `你是一个富有想象力的"世界守护者"，你的任务是与其他玩家对话，共同创造一个独特的文字冒险游戏世界。

## 你的角色
- 你是一个温柔而富有创意的声音，引导对话但不主导
- 你通过提问来了解玩家的喜好，逐步构建世界
- 你会巧妙地将玩家的回答串联起来，创造连贯有趣的世界
- 你对各种世界观设定（修仙、科幻、奇幻、末日等）都有深入了解

## 对话流程
1. 首先友好地打招呼，并给出选项让玩家选择
2. 根据玩家的选择，逐步提问关于世界的各方面
3. 在收集到足够信息后，给出世界构想供玩家确认
4. 最后确认玩家背景设定，准备开始游戏

## 重要规则
- **始终使用选项引导**：每次回复必须提供 3-4 个选项让玩家选择，不要只发问
- 选项要具体、有趣、风格多样
- 如果玩家回答模糊或简短，用追问来细化
- 始终保持友好、鼓励的语气
- 当玩家确认或选择"开始游戏"时，生成最终世界设定

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

当收集完信息，玩家选择"开始游戏"或确认时，返回：
\`\`\`json
{
  "ready": true,
  "worldName": "世界名称",
  "worldType": "世界类型（如修仙、赛博朋克等）",
  "worldDesc": "世界一句话描述",
  "worldTags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "atmosphere": "世界氛围描述",
  "powerSystem": "力量体系描述",
  "societyStructure": "社会结构描述",
  "specialElement": "特殊元素描述",
  "playerBackground": "为玩家安排的出生背景描述（要积极正面，有生存可能）"
}
\`\`\`

记住：你是在"共创"，不是"指导"。尊重玩家的想法，适当引导，让世界属于玩家。`;

function initWorldCreator() {
  creatorMessages = [];
  creatorState = {
    worldName: '',
    worldType: '',
    worldTags: [],
    worldDesc: '',
    atmosphere: '',
    powerSystem: '',
    societyStructure: '',
    specialElement: '',
    playerBackground: ''
  };
  creatorQuestionCount = 0;
  isCreatorGenerating = false;
}

async function startWorldCreation() {
  initWorldCreator();
  
  const chat = document.getElementById('creator-chat');
  chat.innerHTML = '';
  
  const inputArea = document.getElementById('creator-input-area');
  inputArea.style.display = 'flex';
  
  creatorMessages = [
    { role: 'system', content: WORLD_CREATOR_PROMPT }
  ];
  
  appendCreatorMsg('assistant', '✨ 你好，冒险者！我是世界守护者，很高兴与你相遇。\n\n在我们踏上旅程之前，让我来引导你构建一个专属的世界。', null);
  
  document.getElementById('creator-input').focus();
  
  creatorMessages.push({ role: 'user', content: '你好，我想创造一个新世界。请给我一些选项来选择。' });
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
        btn.onclick = () => selectCreatorOption(opt.text);
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
  if (isCreatorGenerating) return;
  appendCreatorMsg('user', text);
  creatorMessages.push({ role: 'user', content: text });
  creatorQuestionCount++;
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
      submitCreatorAnswer();
    };
    container.appendChild(btn);
  });
}

async function handleCreatorAIResponse() {
  isCreatorGenerating = true;
  
  const progress = document.createElement('div');
  progress.className = 'creator-msg system';
  progress.id = 'creator-progress';
  progress.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> 世界守护者正在思考...';
  document.getElementById('creator-chat').appendChild(progress);
  scrollCreatorChat();
  
  try {
    const rawResp = await callAI(creatorMessages);
    creatorMessages.push({ role: 'assistant', content: rawResp });
    
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
      const parsed = parseCreatorResponse(rawResp);
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
  
  isCreatorGenerating = false;
  scrollCreatorChat();
}

function parseCreatorResponse(text) {
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  else {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) jsonStr = text.slice(start, end + 1);
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    return { narrative: text, options: null };
  }
}

async function submitCreatorAnswer() {
  if (isCreatorGenerating) return;
  
  const input = document.getElementById('creator-input');
  const text = input.value.trim();
  if (!text) return;
  
  input.value = '';
  
  appendCreatorMsg('user', text);
  creatorMessages.push({ role: 'user', content: text });
  creatorQuestionCount++;
  
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
  
  if (creatorQuestionCount >= 3) {
    hints.push('💡 我觉得可以了');
    hints.push('🚀 开始冒险');
  }
  
  renderCreatorHints(hints);
}

function applyCreatorReady(parsed) {
  creatorState.worldName = parsed.worldName || '未知世界';
  creatorState.worldType = parsed.worldType || '';
  creatorState.worldTags = parsed.worldTags || [];
  creatorState.worldDesc = parsed.worldDesc || '';
  creatorState.atmosphere = parsed.atmosphere || '';
  creatorState.powerSystem = parsed.powerSystem || '';
  creatorState.societyStructure = parsed.societyStructure || '';
  creatorState.specialElement = parsed.specialElement || '';
  creatorState.playerBackground = parsed.playerBackground || '';
  
  const chat = document.getElementById('creator-chat');
  
  const summary = document.createElement('div');
  summary.className = 'creator-summary';
  summary.innerHTML = `
    <h3>✨ 世界构建完成！</h3>
    <div class="creator-summary-item"><strong>世界名称：</strong>${creatorState.worldName}</div>
    <div class="creator-summary-item"><strong>世界类型：</strong>${creatorState.worldType}</div>
    <div class="creator-summary-item"><strong>氛围：</strong>${creatorState.atmosphere}</div>
    <div class="creator-summary-item"><strong>力量体系：</strong>${creatorState.powerSystem}</div>
    <div class="creator-summary-item"><strong>社会结构：</strong>${creatorState.societyStructure}</div>
    ${creatorState.specialElement ? `<div class="creator-summary-item"><strong>特殊元素：</strong>${creatorState.specialElement}</div>` : ''}
    <div class="creator-summary-item"><strong>你的出身：</strong>${creatorState.playerBackground}</div>
    <button class="creator-start-btn" onclick="startGameFromCreator()">🚀 开始冒险</button>
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
  
  const cfg = await loadConfig();
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  
  const lastAssistantMsg = creatorMessages.filter(m => m.role === 'assistant').pop();
  const systemPrompt = lastAssistantMsg ? lastAssistantMsg.content : '';
  
  const jsonMatch = systemPrompt.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  let finalWorldData = creatorState;
  
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      finalWorldData = { ...creatorState, ...parsed };
    } catch (e) {}
  }
  
  gameState = initNewGameState();
  gameState.worldName = finalWorldData.worldName;
  gameState.worldDesc = finalWorldData.worldDesc;
  gameState.worldType = 'custom';
  gameState.worldTags = finalWorldData.worldTags || [];
  
  const customSystemPrompt = `你是一个沉浸式文字冒险游戏的叙事引擎。你要扮演"命运之书"——一个全知全能的叙事者。

## 世界设定（由玩家与世界守护者共同构建）

**世界名称：${finalWorldData.worldName}**
**世界类型：${finalWorldData.worldType}**
**世界描述：${finalWorldData.worldDesc}**
**世界氛围：${finalWorldData.atmosphere}**
**力量体系：${finalWorldData.powerSystem}**
**社会结构：${finalWorldData.societyStructure}**
${finalWorldData.specialElement ? `**特殊元素：${finalWorldData.specialElement}**\n` : ''}
**玩家出身：${finalWorldData.playerBackground}**

请严格遵循以上设定推演剧情，保持世界观一致性。

## 游戏规则
1. 玩家初始背景是上述设定的出身，请围绕这个背景展开
2. 每次回复推进剧情，时间跨度自然流逝
3. 保持张力、悬念和情感起伏
4. 死亡应有意义，不随机惩罚

## 回复格式（严格遵守）——必须是合法 JSON：
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

死亡时：{"narrative":"...","age":N,"isDead":true,"deathSummary":"...","options":[],"status":""}

记住：你就是这个世界的神。让冒险值得被记住。`;
  
  gameMessages = [
    { role: 'system', content: customSystemPrompt },
    { role: 'user', content: `请开始我的冒险。${finalWorldData.playerBackground}` }
  ];
  
  showScreen('game');
  document.getElementById('game-world-name').textContent = gameState.worldName;
  document.getElementById('footer-world-type').textContent = `${gameState.worldName} · 构建完成`;
  
  const storyArea = document.getElementById('story-area');
  storyArea.innerHTML = '';
  appendSystemMsg(`世界「${gameState.worldName}」构建完成，冒险即将开始...`);
  showLoadingInOptions();
  setInputDisabled(true);
  
  try {
    const rawResp = await callAI(gameMessages);
    gameMessages.push({ role: 'assistant', content: rawResp });
    const parsed = parseAIResponse(rawResp);
    applyAIResponse(parsed, true);
  } catch (err) {
    handleAIError(err);
  }
}

function confirmExitCreator() {
  if (creatorQuestionCount === 0 || isCreatorGenerating) {
    exitCreator();
    return;
  }
  document.getElementById('exit-creator-modal').classList.add('active');
}

function exitCreator() {
  closeModal('exit-creator-modal');
  initWorldCreator();
  showScreen('worlds');
}

function initNewGameState() {
  return {
    worldId: 'world_' + Date.now(),
    worldName: '未知世界',
    worldDesc: '',
    worldType: 'new',
    worldTags: [],
    turn: 0,
    age: 0,
    isDead: false,
    characterStatus: '',
    worldRules: '', // AI 秘密生成，玩家不可见
  };
}

// ════════════════════════════════════════
//  AI 调用核心
// ════════════════════════════════════════
async function callAI(messages) {
  const cfg = await loadConfig();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

  const resp = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: cfg.model,
      messages,
      max_tokens: cfg.maxTokens,
      temperature: 0.9,
      stream: false
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API 错误 ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

// ════════════════════════════════════════
//  系统提示词
// ════════════════════════════════════════
function buildSystemPrompt(isNew) {
  if (isNew) {
    return `你是一个沉浸式文字冒险游戏的叙事引擎。你要扮演"命运之书"——一个全知全能的叙事者。

## 核心职责

1. **构建世界（仅第一次，秘密进行）**
   首次开始时，在内心构建一个完整的世界，包含：
   - 世界类型（修仙、魔法、科幻、末世、古代、架空历史、原始部落、赛博朋克等随机选一种）
   - 世界法则（能量体系、力量等级、特殊规则）
   - 社会结构（文明程度、势力分布、阶级制度）
   - 资源系统（稀缺资源、货币、生存要素）
   - 危险与机遇（常见威胁、奇遇来源）
   这些世界设定对玩家完全隐藏，但你要严格遵守它们推演剧情。

2. **角色出生设定**
   为玩家安排一个出生背景，遵循以下原则：
   - **绝对禁止**安排必死的开局（如被遗弃在沙漠、出生即重病、生于战场中央等）
   - 哪怕是艰苦的出生环境，也要有生存的可能和希望（被老虎抚养、贫民窟的顽强孩子、孤儿院等）
   - 出生背景要和世界类型匹配，充满探索潜力

3. **剧情推演规则**
   - 每次回复都要推进剧情，时间跨度根据情节自然流逝（可以是数小时、数天、数年）
   - 剧情要有张力、悬念、情感起伏
   - 根据玩家选择的累积效果影响后续走向
   - 保持世界内部逻辑一致性
   - 死亡应该是有意义的，不是随机的惩罚

4. **回复格式（严格遵守）**
   每次回复必须是合法 JSON，格式如下：
   \`\`\`json
   {
     "narrative": "叙事内容（300-600字，生动描述当前场景、事件、情感）",
     "age": 当前年龄（数字）,
     "timeSkip": "时间跳跃描述（如：三年后、翌日清晨）",
     "status": "角色当前状态简述（50字以内）",
     "worldName": "世界名称（仅第一次返回，之后不变）",
     "worldDesc": "世界一句话描述（仅第一次返回）",
     "worldTags": ["标签1", "标签2", "标签3"],
     "options": [
       {"id": 1, "text": "选项描述（具体行动，20-40字）"},
       {"id": 2, "text": "选项描述"},
       {"id": 3, "text": "选项描述"}
     ],
     "isDead": false,
     "deathSummary": null
   }
   \`\`\`
   
   死亡时：
   \`\`\`json
   {
     "narrative": "死亡场景描述",
     "age": 死亡时年龄,
     "isDead": true,
     "deathSummary": "这一生的总结（200字以内，有温度、有回味）",
     "options": [],
     "status": ""
   }
   \`\`\`

5. **叙事风格**
   - 第二人称叙事（"你"）
   - 充满画面感和代入感
   - 情节推进要有节奏感，不要拖沓
   - 世界要有神秘感，让玩家想要探索
   - 选项要有意义，不同选择应导向不同走向

记住：你就是这个世界的神，玩家只是其中一个探索者。让冒险值得被记住。`;
  } else {
    return `你是一个沉浸式文字冒险游戏的叙事引擎，继续之前的冒险故事。
请根据之前的对话历史继续推演剧情，保持世界观、人物关系和剧情逻辑的一致性。

回复格式（严格遵守）——必须是合法 JSON：
{
  "narrative": "叙事内容（300-600字）",
  "age": 当前年龄（数字）,
  "timeSkip": "时间描述",
  "status": "角色当前状态（50字）",
  "worldName": "${gameState.worldName}",
  "worldDesc": "${gameState.worldDesc}",
  "worldTags": ${JSON.stringify(gameState.worldTags || [])},
  "options": [
    {"id": 1, "text": "选项1"},
    {"id": 2, "text": "选项2"},
    {"id": 3, "text": "选项3"}
  ],
  "isDead": false,
  "deathSummary": null
}

死亡时：{"narrative":"...","age":N,"isDead":true,"deathSummary":"...","options":[],"status":""}`;
  }
}

// ════════════════════════════════════════
//  解析 AI 回复
// ════════════════════════════════════════
function parseAIResponse(text) {
  // 提取 JSON（可能被 markdown 代码块包裹）
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  else {
    // 尝试找到第一个 { 到最后一个 }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) jsonStr = text.slice(start, end + 1);
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('JSON 解析失败:', e, '\n原始文本:', text);
    // 容错：返回原始文本作为叙事
    return {
      narrative: text,
      age: gameState.age || 0,
      timeSkip: '',
      status: '',
      options: [
        { id: 1, text: '继续...' },
        { id: 2, text: '思考当前处境' },
        { id: 3, text: '探索周围环境' }
      ],
      isDead: false,
      deathSummary: null
    };
  }
}

// ════════════════════════════════════════
//  开始新游戏
// ════════════════════════════════════════
async function startNewGame() {
  gameState = initNewGameState();
  gameMessages = [];
  
  showScreen('game');
  document.getElementById('game-world-name').textContent = '世界构建中...';
  document.getElementById('footer-world-type').textContent = '新世界 · 构建中';
  
  const storyArea = document.getElementById('story-area');
  storyArea.innerHTML = '';
  
  appendSystemMsg('命运之书正在为你构建一个全新的世界...');
  showLoadingInOptions();
  setInputDisabled(true);

  const systemPrompt = buildSystemPrompt(true);
  const userMsg = '开始游戏。请构建世界并安排我的出生，开始我的人生冒险。';
  
  gameMessages.push({ role: 'system', content: systemPrompt });
  gameMessages.push({ role: 'user', content: userMsg });

  try {
    const rawResp = await callAI(gameMessages);
    gameMessages.push({ role: 'assistant', content: rawResp });
    
    const parsed = parseAIResponse(rawResp);
    applyAIResponse(parsed, true);
  } catch (err) {
    handleAIError(err);
  }
}

// ════════════════════════════════════════
//  加载已有存档
// ════════════════════════════════════════
async function loadGameById(worldId) {
  const world = await getWorld(worldId);
  if (!world) {
    showToast('加载存档失败');
    return;
  }
  await loadGame(world);
}

async function loadGame(world) {
  gameState = { ...world.gameState };
  gameMessages = [...(world.messages || [])];

  showScreen('game');
  document.getElementById('game-world-name').textContent = gameState.worldName || '未知世界';
  document.getElementById('footer-world-type').textContent = `${gameState.worldName} · 继续冒险`;

  // 重建剧情区（只显示最后几条叙事）
  const storyArea = document.getElementById('story-area');
  storyArea.innerHTML = '';

  appendSystemMsg(`继续冒险：${gameState.worldName}`);

  // 找最近的叙事显示
  const narrativeMessages = gameMessages.filter(m => m.role === 'assistant');
  const lastN = narrativeMessages.slice(-2);
  lastN.forEach(m => {
    try {
      const parsed = parseAIResponse(m.content);
      if (parsed.narrative) {
        if (parsed.timeSkip) appendSystemMsg(parsed.timeSkip);
        appendNarrative(parsed.narrative);
      }
    } catch (e) {}
  });

  // 发一个继续请求
  appendSystemMsg('命运之书正在回忆剧情走向...');
  showLoadingInOptions();
  setInputDisabled(true);

  const systemPrompt = buildSystemPrompt(false);
  // 更新系统提示（第一条）
  if (gameMessages.length > 0 && gameMessages[0].role === 'system') {
    gameMessages[0].content = systemPrompt;
  }

  gameMessages.push({ role: 'user', content: '（玩家重新进入游戏）请简短描述当前状态，并给出接下来的选项，继续冒险。' });

  try {
    const rawResp = await callAI(gameMessages);
    gameMessages.push({ role: 'assistant', content: rawResp });
    const parsed = parseAIResponse(rawResp);
    applyAIResponse(parsed, false);
  } catch (err) {
    handleAIError(err);
  }
}

// ════════════════════════════════════════
//  处理玩家选择
// ════════════════════════════════════════
async function selectOption(text) {
  if (isGenerating) return;
  
  appendPlayerMsg(text);
  isGenerating = true;
  setInputDisabled(true);
  showLoadingInOptions();

  gameMessages.push({ role: 'user', content: `我的选择：${text}` });
  gameState.turn++;
  document.getElementById('stat-turn').textContent = gameState.turn;

  try {
    const rawResp = await callAI(gameMessages);
    gameMessages.push({ role: 'assistant', content: rawResp });
    const parsed = parseAIResponse(rawResp);
    applyAIResponse(parsed, false);
  } catch (err) {
    handleAIError(err);
  }
}

async function submitCustom() {
  const input = document.getElementById('custom-input');
  const text = input.value.trim();
  if (!text || isGenerating) return;
  input.value = '';
  await selectOption(text);
}

// ════════════════════════════════════════
//  应用 AI 回复到游戏界面
// ════════════════════════════════════════
function applyAIResponse(parsed, isFirst) {
  isGenerating = false;
  
  // 更新世界信息（仅第一次）
  if (isFirst && parsed.worldName) {
    gameState.worldName = parsed.worldName;
    gameState.worldDesc = parsed.worldDesc || '';
    gameState.worldTags = parsed.worldTags || [];
    document.getElementById('game-world-name').textContent = parsed.worldName;
    document.getElementById('footer-world-type').textContent = `${parsed.worldName} · 冒险中`;
  }
  
  // 更新角色状态
  if (parsed.age !== undefined) {
    gameState.age = parsed.age;
    document.getElementById('stat-age').textContent = parsed.age;
  }
  if (parsed.status) gameState.characterStatus = parsed.status;

  // 显示时间跳跃
  if (parsed.timeSkip) appendSystemMsg(`— ${parsed.timeSkip} —`);

  // 显示叙事
  if (parsed.narrative) appendNarrative(parsed.narrative);

  // 死亡处理
  if (parsed.isDead) {
    handleDeath(parsed);
    return;
  }

  // 显示选项
  renderOptions(parsed.options || []);
  setInputDisabled(false);

  // 自动滚动
  scrollStoryToBottom();
  
  // 自动存档
  saveCurrentGame();
}

// ════════════════════════════════════════
//  死亡处理
// ════════════════════════════════════════
function handleDeath(parsed) {
  const storyArea = document.getElementById('story-area');
  const deathMsg = document.createElement('div');
  deathMsg.className = 'msg msg-death';
  deathMsg.innerHTML = `
    <div style="font-size:1.5rem;margin-bottom:12px">⚰</div>
    <div>${parsed.narrative || '你的故事就此落幕...'}</div>
    ${parsed.deathSummary ? `<div style="margin-top:16px;font-size:0.9rem;font-weight:normal;color:var(--text2);border-top:1px solid rgba(248,113,113,0.2);padding-top:12px">${parsed.deathSummary}</div>` : ''}
  `;
  storyArea.appendChild(deathMsg);
  scrollStoryToBottom();
  
  // 清除选项
  document.getElementById('options-list').innerHTML = '';
  setInputDisabled(true);
  
  // 显示游戏结束界面
  setTimeout(() => {
    gameState.isDead = true;
    saveCurrentGame();
    showGameOver(parsed);
  }, 3000);
}

function showGameOver(parsed) {
  const summary = document.getElementById('gameover-summary');
  summary.innerHTML = `
    <strong>世界：${gameState.worldName}</strong><br>
    <strong>享年：${gameState.age} 岁</strong><br>
    <strong>历经：${gameState.turn} 个人生节点</strong><br><br>
    ${parsed.deathSummary || '你在这个世界留下了自己的印记。'}
  `;
  showScreen('gameover');
}

// ════════════════════════════════════════
//  UI 操作函数
// ════════════════════════════════════════
function appendNarrative(text) {
  const storyArea = document.getElementById('story-area');
  const div = document.createElement('div');
  div.className = 'msg msg-narrator';
  div.innerHTML = text.replace(/\n/g, '<br>');
  storyArea.appendChild(div);
  scrollStoryToBottom();
}

function appendSystemMsg(text) {
  const storyArea = document.getElementById('story-area');
  const div = document.createElement('div');
  div.className = 'msg msg-system';
  div.textContent = text;
  storyArea.appendChild(div);
  scrollStoryToBottom();
}

function appendPlayerMsg(text) {
  const storyArea = document.getElementById('story-area');
  const div = document.createElement('div');
  div.className = 'msg msg-player';
  div.textContent = `▶ ${text}`;
  storyArea.appendChild(div);
  scrollStoryToBottom();
}

function renderOptions(options) {
  const list = document.getElementById('options-list');
  list.innerHTML = '';
  if (!options || options.length === 0) return;
  options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerHTML = `<span class="opt-num">${i + 1}.</span><span>${opt.text}</span>`;
    btn.onclick = () => selectOption(opt.text);
    list.appendChild(btn);
  });
}

function showLoadingInOptions() {
  const list = document.getElementById('options-list');
  list.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;color:var(--text2);font-size:0.88rem">
      <div class="loading-dots"><span></span><span></span><span></span></div>
      命运之书正在书写剧情...
    </div>
  `;
}

function setInputDisabled(disabled) {
  const input = document.getElementById('custom-input');
  const btn = document.getElementById('send-btn');
  const optBtns = document.querySelectorAll('.opt-btn');
  input.disabled = disabled;
  btn.disabled = disabled;
  optBtns.forEach(b => b.disabled = disabled);
}

function scrollStoryToBottom() {
  const area = document.getElementById('story-area');
  requestAnimationFrame(() => {
    area.scrollTop = area.scrollHeight;
  });
}

function showStatus() {
  const content = document.getElementById('status-content');
  content.textContent = `世界：${gameState.worldName || '未知'}
描述：${gameState.worldDesc || ''}
年龄：${gameState.age || 0} 岁
经历节点：${gameState.turn || 0}
当前状态：${gameState.characterStatus || '未知'}
标签：${(gameState.worldTags || []).join(' · ')}`;
  document.getElementById('status-modal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function confirmExit() {
  document.getElementById('exit-modal').classList.add('active');
}

function exitGame() {
  saveCurrentGame();
  closeModal('exit-modal');
  showScreen('menu');
}

function restartGame() {
  startNewGame();
}

function handleAIError(err) {
  isGenerating = false;
  setInputDisabled(false);
  const storyArea = document.getElementById('story-area');
  const div = document.createElement('div');
  div.className = 'msg msg-system';
  div.style.color = 'var(--danger)';
  div.textContent = `⚠ 命运之书暂时失联（${err.message}）。请检查 AI 设置或网络连接。`;
  storyArea.appendChild(div);
  
  // 恢复基础选项
  renderOptions([
    { id: 1, text: '等待，耐心休息' },
    { id: 2, text: '再试一次' },
  ]);
}

// ════════════════════════════════════════
//  屏幕切换
// ════════════════════════════════════════
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  
  if (name === 'worlds') renderWorldsGrid();
  if (name === 'config') initConfigScreen();
  if (name === 'world-creator') startWorldCreation();
}

// ════════════════════════════════════════
//  Toast 提示
// ════════════════════════════════════════
function showToast(msg) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
    background:var(--bg3); border:1px solid var(--accent);
    color:var(--text); padding:10px 20px; border-radius:8px;
    font-size:0.85rem; z-index:9999; animation:fadeIn 0.3s ease;
    box-shadow: 0 4px 20px var(--glow);
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ════════════════════════════════════════
//  粒子背景
// ════════════════════════════════════════
function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 1;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      animation-duration:${Math.random() * 15 + 10}s;
      animation-delay:${Math.random() * 10}s;
    `;
    container.appendChild(p);
  }
}

// ════════════════════════════════════════
//  初始化
// ════════════════════════════════════════
initParticles();

