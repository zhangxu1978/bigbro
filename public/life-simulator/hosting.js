async function callHostingAI(context, options) {
  const cfg = await window.LifeSimulator.loadConfig();
  if (!cfg.hostModel) {
    throw new Error('未设置托管模型，请在AI设置中配置');
  }

  const headers = {
    'Content-Type': 'application/json',
  };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

  const prompt = `你正在玩一个文字冒险游戏。根据以下情境，选择最合适的行动：

当前情境：
${context}

可选行动：
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

请只返回你选择的选项编号（1-${options.length}），不要有任何其他内容。`;

  const resp = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: cfg.hostModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0.7,
      stream: false
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`托管AI调用失败 ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';

  const match = content.match(/\d+/);
  if (match) {
    const choice = parseInt(match[0]);
    if (choice >= 1 && choice <= options.length) {
      return choice - 1;
    }
  }

  return Math.floor(Math.random() * options.length);
}

async function toggleGameHosting() {
  if (window.LifeSimulator.isGameHosting) {
    stopGameHosting();
    return;
  }

  const cfg = await window.LifeSimulator.loadConfig();
  if (!cfg.hostModel) {
    window.LifeSimulator.showToast('请先设置托管模型');
    window.LifeSimulator.showScreen('config');
    return;
  }

  if (window.LifeSimulator.gameState.isDead) {
    window.LifeSimulator.showToast('游戏已结束，无法托管');
    return;
  }

  window.LifeSimulator.isGameHosting = true;
  const btn = document.getElementById('game-host-btn');
  btn.classList.add('active');
  btn.textContent = '⏹ 停止';

  const footerInfo = document.getElementById('footer-info');
  footerInfo.innerHTML = 'AI托管中<span class="hosting-status"><span class="loading-dots"><span></span><span></span><span></span></span></span>';

  window.LifeSimulator.showToast('AI托管已启动');

  runGameHostingLoop();
}

function stopGameHosting() {
  window.LifeSimulator.isGameHosting = false;
  const btn = document.getElementById('game-host-btn');
  btn.classList.remove('active');
  btn.textContent = '🤖 托管';

  const footerInfo = document.getElementById('footer-info');
  footerInfo.textContent = 'AI托管已停止';

  if (window.LifeSimulator.hostingController) {
    window.LifeSimulator.hostingController.abort();
    window.LifeSimulator.hostingController = null;
  }

  window.LifeSimulator.showToast('AI托管已停止');
}

async function runGameHostingLoop() {
  while (window.LifeSimulator.isGameHosting) {
    try {
      if (window.LifeSimulator.isGenerating) {
        await sleep(1000);
        continue;
      }

      const optBtns = document.querySelectorAll('.opt-btn');
      if (optBtns.length === 0) {
        await sleep(1000);
        continue;
      }

      const lastNarrative = getLastNarrative();
      const options = Array.from(optBtns).map(btn => {
        const textSpan = btn.querySelector('.opt-text');
        return textSpan ? textSpan.textContent : btn.textContent;
      });

      window.LifeSimulator.hostingController = new AbortController();

      const choiceIndex = await callHostingAI(lastNarrative, options);

      if (!window.LifeSimulator.isGameHosting) break;

      if (optBtns[choiceIndex]) {
        optBtns[choiceIndex].click();
      }

      await sleep(3000 + Math.random() * 2000);
    } catch (err) {
      console.error('托管出错:', err);
      if (window.LifeSimulator.isGameHosting) {
        window.LifeSimulator.showToast('托管出错: ' + err.message);
        stopGameHosting();
      }
      break;
    }
  }
}

function getLastNarrative() {
  const storyArea = document.getElementById('story-area');
  const narratives = storyArea.querySelectorAll('.msg-narrator');
  if (narratives.length > 0) {
    return narratives[narratives.length - 1].textContent;
  }
  return '游戏刚开始';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function toggleCreatorHosting() {
  if (window.LifeSimulator.isCreatorHosting) {
    stopCreatorHosting();
    return;
  }

  const cfg = await window.LifeSimulator.loadConfig();
  if (!cfg.hostModel) {
    window.LifeSimulator.showToast('请先设置托管模型');
    window.LifeSimulator.showScreen('config');
    return;
  }

  if (window.LifeSimulator.isCreatorGenerating) {
    window.LifeSimulator.showToast('请等待当前回复完成');
    return;
  }

  window.LifeSimulator.isCreatorHosting = true;
  const btn = document.getElementById('creator-host-btn');
  btn.classList.add('active');
  btn.textContent = '⏹ 停止托管';

  window.LifeSimulator.showToast('AI托管已启动');

  runCreatorHostingLoop();
}

function stopCreatorHosting() {
  window.LifeSimulator.isCreatorHosting = false;
  const btn = document.getElementById('creator-host-btn');
  btn.classList.remove('active');
  btn.textContent = '🤖 AI托管';

  if (window.LifeSimulator.hostingController) {
    window.LifeSimulator.hostingController.abort();
    window.LifeSimulator.hostingController = null;
  }

  window.LifeSimulator.showToast('AI托管已停止');
}

async function runCreatorHostingLoop() {
  while (window.LifeSimulator.isCreatorHosting) {
    try {
      if (window.LifeSimulator.isCreatorGenerating) {
        await sleep(1000);
        continue;
      }

      const optBtns = document.querySelectorAll('.creator-opt-btn');
      if (optBtns.length === 0) {
        const startBtn = document.querySelector('.creator-start-btn');
        if (startBtn) {
          window.LifeSimulator.showToast('世界构建完成！');
          stopCreatorHosting();
          break;
        }
        await sleep(1000);
        continue;
      }

      const chat = document.getElementById('creator-chat');
      const msgs = chat.querySelectorAll('.creator-msg');
      let context = '开始创造新世界';
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        context = lastMsg.textContent || '继续对话';
      }

      const options = Array.from(optBtns).map(btn => btn.textContent.replace('✎', '').trim());

      window.LifeSimulator.hostingController = new AbortController();

      const choiceIndex = await callHostingAI(context, options);

      if (!window.LifeSimulator.isCreatorHosting) break;

      if (optBtns[choiceIndex]) {
        optBtns[choiceIndex].click();
      }

      await sleep(3000 + Math.random() * 2000);
    } catch (err) {
      console.error('托管出错:', err);
      if (window.LifeSimulator.isCreatorHosting) {
        window.LifeSimulator.showToast('托管出错: ' + err.message);
        stopCreatorHosting();
      }
      break;
    }
  }
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.callHostingAI = callHostingAI;
window.LifeSimulator.toggleGameHosting = toggleGameHosting;
window.LifeSimulator.stopGameHosting = stopGameHosting;
window.LifeSimulator.runGameHostingLoop = runGameHostingLoop;
window.LifeSimulator.getLastNarrative = getLastNarrative;
window.LifeSimulator.sleep = sleep;
window.LifeSimulator.toggleCreatorHosting = toggleCreatorHosting;
window.LifeSimulator.stopCreatorHosting = stopCreatorHosting;
window.LifeSimulator.runCreatorHostingLoop = runCreatorHostingLoop;
