let cachedWorldsForExport = [];

async function getWorlds() {
  try {
    const resp = await fetch(`${window.LifeSimulator.API_BASE}/worlds`);
    if (!resp.ok) throw new Error('加载世界列表失败');
    return await resp.json();
  } catch (err) {
    console.error('加载世界列表失败:', err);
    return [];
  }
}

async function getSaves(worldId) {
  try {
    const resp = await fetch(`${window.LifeSimulator.API_BASE}/worlds/${worldId}/saves`);
    if (!resp.ok) throw new Error('加载存档列表失败');
    return await resp.json();
  } catch (err) {
    console.error('加载存档列表失败:', err);
    return [];
  }
}

async function loadSaveById(saveId) {
  try {
    const resp = await fetch(`${window.LifeSimulator.API_BASE}/saves/${saveId}`);
    if (!resp.ok) throw new Error('加载存档失败');
    const save = await resp.json();
    await window.LifeSimulator.loadGameFromSave(save);
    window.LifeSimulator.closeModal('saves-modal');
  } catch (err) {
    console.error('加载存档失败:', err);
    window.LifeSimulator.showToast('加载存档失败: ' + err.message);
  }
}

async function showSavesModal(worldId, worldName) {
  const saves = await getSaves(worldId);
  const modalTitle = document.querySelector('#saves-modal h2');
  modalTitle.textContent = `选择存档 - ${worldName}`;

  const savesList = document.getElementById('saves-list');

  if (saves.length === 0) {
    savesList.innerHTML = '<div style="text-align:center;color:var(--text2);padding:40px">暂无存档</div>';
    document.getElementById('saves-modal').classList.add('active');
    return;
  }

  savesList.innerHTML = saves.map(save => {
    const date = new Date(save.savedAt).toLocaleString('zh-CN');
    return `
      <div class="save-item" onclick="window.LifeSimulator.loadSaveById('${save.id}')">
        <div class="save-header">
          <span class="save-turn">回合 ${save.turn}</span>
          <span class="save-age">${save.age}岁</span>
          <span class="save-date">${date}</span>
        </div>
        <div class="save-summary">${save.summary || '暂无摘要'}</div>
      </div>
    `;
  }).join('');

  document.getElementById('saves-modal').classList.add('active');
}

async function getWorld(id) {
  try {
    const resp = await fetch(`${window.LifeSimulator.API_BASE}/worlds/${id}`);
    if (!resp.ok) throw new Error('加载世界失败');
    return await resp.json();
  } catch (err) {
    console.error('加载世界失败:', err);
    return null;
  }
}

async function saveWorlds(worlds) {
  for (const world of worlds) {
    await saveWorld(world);
  }
}

async function saveWorld(worldData) {
  try {
    const resp = await fetch(`${window.LifeSimulator.API_BASE}/worlds`, {
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
  if (!window.LifeSimulator.gameState.worldId) return;
  try {
    const resp = await fetch(`${window.LifeSimulator.API_BASE}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameState: { ...window.LifeSimulator.gameState },
        messages: [...window.LifeSimulator.gameMessages]
      })
    });
    if (!resp.ok) throw new Error('存档失败');
    const result = await resp.json();
    window.LifeSimulator.showToast('存档成功');
  } catch (err) {
    window.LifeSimulator.showToast('存档失败: ' + err.message);
  }
}

function confirmExitGame() {
  document.getElementById('exit-modal').classList.add('active');
}

async function deleteWorld(id, e) {
  e.stopPropagation();
  if (!confirm('确定要删除这个世界的存档吗？')) return;
  try {
    const resp = await fetch(`${window.LifeSimulator.API_BASE}/worlds/${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('删除失败');
    renderWorldsGrid();
  } catch (err) {
    window.LifeSimulator.showToast('删除失败: ' + err.message);
  }
}

async function showExportModal() {
  const worlds = await getWorldsCache();
  const list = document.getElementById('export-worlds-list');
  if (!worlds || worlds.length === 0) {
    list.innerHTML = '<div style="text-align:center;color:var(--text2);padding:40px">暂无世界可导出</div>';
  } else {
    list.innerHTML = worlds.map(world => `
      <div class="save-item" onclick="window.LifeSimulator.exportWorldAsMd('${world.id}')" style="cursor:pointer">
        <div class="save-header">
          <span class="save-name">${world.name || '未知世界'}</span>
          <span class="save-date">${new Date(world.savedAt).toLocaleDateString('zh-CN')}</span>
        </div>
        <div class="save-summary">${world.desc || '暂无描述'}</div>
      </div>
    `).join('');
  }
  document.getElementById('export-modal').classList.add('active');
}

async function getWorldsCache() {
  if (cachedWorldsForExport.length === 0) {
    cachedWorldsForExport = await getWorlds();
  }
  return cachedWorldsForExport;
}

async function exportWorldAsMd(worldId) {
  const world = await getWorld(worldId);
  if (!world) {
    window.LifeSimulator.showToast('获取世界信息失败');
    return;
  }
  const saves = await getSaves(worldId);
  let gameState = {};
  let turn = world.turn || 0;
  let savedAt = world.savedAt || Date.now();
  if (saves && saves.length > 0) {
    const latestSave = saves[0];
    gameState = latestSave.gameState || {};
    turn = latestSave.turn || turn;
    savedAt = latestSave.savedAt || savedAt;
  }
  world.turn = turn;
  world.savedAt = savedAt;
  const md = generateWorldMarkdown(world, gameState);
  downloadMarkdown(md, world.name || '未知世界');
  window.LifeSimulator.closeModal('export-modal');
}

function generateWorldMarkdown(world, gameState) {
  const isThirdPerson = gameState.narrativeMode === 'third_person';
  const playerName = gameState.playerName || '';
  const modeText = isThirdPerson ? '第三人称' : '第二人称';
  const nameText = playerName ? ` · ${playerName}` : '';
  const tags = (world.tags || []).join('、');
  const storylines = world.storylines || {};
  const importantChars = world.importantCharacters || {};
  return `# ${world.name || '未知世界'}

> ${world.desc || '暂无描述'}

## 基本信息

- **世界类型**: ${world.type || '未知'}
- **标签**: ${tags || '无'}
- **叙事模式**: ${modeText}${nameText}
- **回合**: ${world.turn || 0}
- **存档时间**: ${new Date(world.savedAt).toLocaleString('zh-CN')}

## 世界设定

${gameState.atmosphere ? `- **世界氛围**: ${gameState.atmosphere}` : ''}
${gameState.powerSystem ? `- **力量体系**: ${gameState.powerSystem}` : ''}
${gameState.societyStructure ? `- **社会结构**: ${gameState.societyStructure}` : ''}
${gameState.specialElement ? `- **特殊元素**: ${gameState.specialElement}` : ''}

## 故事线

${storylines.main ? `- **明线**: ${storylines.main}` : ''}
${storylines.hidden ? `- **暗线**: ${storylines.hidden}` : ''}
${storylines.romance ? `- **感情线**: ${storylines.romance}` : ''}

## 重要角色

${importantChars.heroine ? `- **女主**: ${importantChars.heroine}` : ''}
${importantChars.mentor ? `- **良师**: ${importantChars.mentor}` : ''}
${importantChars.friend ? `- **益友**: ${importantChars.friend}` : ''}
${importantChars.enemy ? `- **仇敌**: ${importantChars.enemy}` : ''}
${importantChars.rival ? `- **对手**: ${importantChars.rival}` : ''}

## 玩家出身

${gameState.playerBackground || '未知'}

---
*由人生模拟器生成*
`;
}

function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_世界观.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function renderWorldsGrid() {
  const worlds = await getWorlds();
  cachedWorldsForExport = worlds;
  const grid = document.getElementById('worlds-grid');
  const exportBtn = document.getElementById('export-world-btn');
  grid.innerHTML = '';

  if (worlds.length === 0) {
    grid.innerHTML = '<div style="color:var(--text2);font-size:0.88rem;text-align:center;padding:40px 20px">暂无存档，开始新冒险吧！</div>';
    exportBtn.style.display = 'none';
    return;
  }

  exportBtn.style.display = 'block';
  worlds.forEach(world => {
    const card = document.createElement('div');
    card.className = 'world-card';
    const tagsHtml = (world.tags || []).map(t => `<span class="wc-tag">${t}</span>`).join('');
    const date = new Date(world.savedAt).toLocaleDateString('zh-CN');
    const isThirdPerson = world.gameState?.narrativeMode === 'third_person';
    const playerName = world.gameState?.playerName || '';
    const modeText = isThirdPerson ? '第三人称' : '第二人称';
    const nameText = playerName ? ` · ${playerName}` : '';
    card.innerHTML = `
      <button class="del-btn" onclick="window.LifeSimulator.deleteWorld('${world.id}', event)">✕</button>
      <div class="wc-icon">🌍</div>
      <div class="wc-name">${world.name || '未知世界'}</div>
      <div class="wc-desc">${world.desc || '一个充满神秘的世界...'}</div>
      <div class="wc-meta">
        ${tagsHtml}
        <span class="wc-tag">${modeText}${nameText}</span>
        <span class="wc-tag">上次: ${date}</span>
        <span class="wc-tag">回合 ${world.turn || 0}</span>
      </div>
    `;
    card.onclick = () => window.LifeSimulator.showSavesModal(world.id, world.name || '未知世界');
    grid.appendChild(card);
  });
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.getWorlds = getWorlds;
window.LifeSimulator.getSaves = getSaves;
window.LifeSimulator.loadSaveById = loadSaveById;
window.LifeSimulator.showSavesModal = showSavesModal;
window.LifeSimulator.getWorld = getWorld;
window.LifeSimulator.saveWorlds = saveWorlds;
window.LifeSimulator.saveWorld = saveWorld;
window.LifeSimulator.saveCurrentGame = saveCurrentGame;
window.LifeSimulator.confirmExitGame = confirmExitGame;
window.LifeSimulator.deleteWorld = deleteWorld;
window.LifeSimulator.showExportModal = showExportModal;
window.LifeSimulator.getWorldsCache = getWorldsCache;
window.LifeSimulator.exportWorldAsMd = exportWorldAsMd;
window.LifeSimulator.generateWorldMarkdown = generateWorldMarkdown;
window.LifeSimulator.downloadMarkdown = downloadMarkdown;
window.LifeSimulator.renderWorldsGrid = renderWorldsGrid;
