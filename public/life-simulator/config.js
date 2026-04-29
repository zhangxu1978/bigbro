// API 基础配置
const API_BASE = '/api/lifesim';

const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:3100/v1/chat/completions',
  model: 'moda-kimi2.5',
  hostModel: '',
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

    const hostSelect = document.getElementById('cfg-host-model');
    hostSelect.innerHTML = '';

    if (!data.models || data.models.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '暂无可用模型';
      select.appendChild(option);

      const hostOption = document.createElement('option');
      hostOption.value = '';
      hostOption.textContent = '暂无可用模型';
      hostSelect.appendChild(hostOption);
      return;
    }

    const noHostOption = document.createElement('option');
    noHostOption.value = '';
    noHostOption.textContent = '不使用AI托管';
    hostSelect.appendChild(noHostOption);

    data.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id || 'unknown';
      option.textContent = `${model.name} (${model.provider})`;
      select.appendChild(option);

      const hostOption = document.createElement('option');
      hostOption.value = model.id || 'unknown';
      hostOption.textContent = `${model.name} (${model.provider})`;
      hostSelect.appendChild(hostOption);
    });
  } catch (error) {
    console.error('加载模型列表失败:', error);

    const select = document.getElementById('cfg-model');
    select.innerHTML = '';
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '加载模型失败';
    select.appendChild(option);

    const hostSelect = document.getElementById('cfg-host-model');
    hostSelect.innerHTML = '';
    const hostOption = document.createElement('option');
    hostOption.value = '';
    hostOption.textContent = '加载模型失败';
    hostSelect.appendChild(hostOption);
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
    hostModel: document.getElementById('cfg-host-model').value || '',
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
    window.LifeSimulator.showToast('设置已保存');
    window.LifeSimulator.showScreen('menu');
  } catch (err) {
    window.LifeSimulator.showToast('保存失败: ' + err.message);
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

  const hostModelSelect = document.getElementById('cfg-host-model');
  if (cfg.hostModel) {
    const existingHostOption = Array.from(hostModelSelect.options).find(opt => opt.value === cfg.hostModel);
    if (!existingHostOption) {
      const option = document.createElement('option');
      option.value = cfg.hostModel;
      option.textContent = cfg.hostModel;
      hostModelSelect.insertBefore(option, hostModelSelect.firstChild);
    }
    hostModelSelect.value = cfg.hostModel;
  }

  document.getElementById('cfg-key').value = cfg.apiKey;
  document.getElementById('cfg-tokens').value = cfg.maxTokens;
}

window.LifeSimulator = window.LifeSimulator || {};
window.LifeSimulator.API_BASE = API_BASE;
window.LifeSimulator.DEFAULT_CONFIG = DEFAULT_CONFIG;
window.LifeSimulator.loadModels = loadModels;
window.LifeSimulator.loadConfig = loadConfig;
window.LifeSimulator.saveConfig = saveConfig;
window.LifeSimulator.initConfigScreen = initConfigScreen;
