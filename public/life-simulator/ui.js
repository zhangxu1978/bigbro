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
    btn.innerHTML = `<span class="opt-num">${i + 1}.</span><span class="opt-text">${opt.text}</span>`;
    btn.onclick = () => window.LifeSimulator.selectOption(opt.text);

    const editBtn = document.createElement('button');
    editBtn.className = 'opt-edit-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = '发送到输入框';
    editBtn.onclick = (e) => {
      e.stopPropagation();
      sendOptionToInput(opt.text);
    };

    btn.appendChild(editBtn);
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
  const input = document.getElementById('game-input');
  const btn = document.getElementById('game-send-btn');
  const optBtns = document.querySelectorAll('.opt-btn');
  if (input) input.disabled = disabled;
  if (btn) btn.disabled = disabled;
  optBtns.forEach(b => b.disabled = disabled);
}

function scrollStoryToBottom() {
  const area = document.getElementById('story-area');
  requestAnimationFrame(() => {
    area.scrollTop = area.scrollHeight;
  });
}

function sendOptionToInput(text) {
  const input = document.getElementById('game-input');
  if (input) {
    input.value = text;
    input.focus();
  }
}

function sendCreatorOptionToInput(text) {
  const input = document.getElementById('creator-input');
  if (input) {
    input.value = text;
    input.focus();
  }
}

function showStatus() {
  const isThirdPerson = window.LifeSimulator.gameState.narrativeMode === 'third_person';
  const playerName = window.LifeSimulator.gameState.playerName || '';
  const content = document.getElementById('status-content');
  content.textContent = `世界：${window.LifeSimulator.gameState.worldName || '未知'}
主角：${playerName || '未命名'}
视角：${isThirdPerson ? '第三人称' : '第二人称'}
描述：${window.LifeSimulator.gameState.worldDesc || ''}
年龄：${window.LifeSimulator.gameState.age || 0} 岁
经历节点：${window.LifeSimulator.gameState.turn || 0}
当前状态：${window.LifeSimulator.gameState.characterStatus || '未知'}
标签：${(window.LifeSimulator.gameState.worldTags || []).join(' · ')}`;
  document.getElementById('status-modal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function confirmExit() {
  document.getElementById('exit-modal').classList.add('active');
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');

  if (name === 'worlds') window.LifeSimulator.renderWorldsGrid();
  if (name === 'config') window.LifeSimulator.initConfigScreen();
  if (name === 'world-creator') window.LifeSimulator.startWorldCreation();
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.appendNarrative = appendNarrative;
window.LifeSimulator.appendSystemMsg = appendSystemMsg;
window.LifeSimulator.appendPlayerMsg = appendPlayerMsg;
window.LifeSimulator.renderOptions = renderOptions;
window.LifeSimulator.showLoadingInOptions = showLoadingInOptions;
window.LifeSimulator.setInputDisabled = setInputDisabled;
window.LifeSimulator.scrollStoryToBottom = scrollStoryToBottom;
window.LifeSimulator.sendOptionToInput = sendOptionToInput;
window.LifeSimulator.sendCreatorOptionToInput = sendCreatorOptionToInput;
window.LifeSimulator.showStatus = showStatus;
window.LifeSimulator.closeModal = closeModal;
window.LifeSimulator.confirmExit = confirmExit;
window.LifeSimulator.showScreen = showScreen;
