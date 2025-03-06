// 更新滑块值显示
function updateSliderValue(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);
    valueSpan.textContent = slider.value;
    slider.oninput = function() {
        valueSpan.textContent = this.value;
    }
}

// 初始化所有滑块
updateSliderValue('temperature', 'temperature-value');
updateSliderValue('top-p', 'top-p-value');
updateSliderValue('top-k', 'top-k-value');
updateSliderValue('frequency-penalty', 'frequency-penalty-value');
updateSliderValue('max-tokens', 'max-tokens-value');

// 获取当前配置
function getCurrentConfig() {
    return {
        model: document.getElementById('model-select').value,
        assistant: document.getElementById('assistant-select').value,
        outputFormat: document.getElementById('output-format').value,
        temperature: document.getElementById('temperature').value,
        topP: document.getElementById('top-p').value,
        topK: document.getElementById('top-k').value,
        frequencyPenalty: document.getElementById('frequency-penalty').value,
        maxTokens: document.getElementById('max-tokens').value
    };
}

// 加载模型配置
async function loadModelConfigs() {
    try {
        const response = await fetch('/api/model-configs');
        const data = await response.json();
        const select = document.getElementById('load-config-select');
        
        // 清除现有选项
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '选择已保存的配置...';
        select.appendChild(defaultOption);
        
        // 添加保存的配置
        for (const name in data.configs) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
    } catch (error) {
        console.error('加载模型配置失败:', error);
    }
}

// 加载配置
async function loadConfig() {
    const select = document.getElementById('load-config-select');
    const configName = select.value;
    
    if (!configName) return;
    
    try {
        const response = await fetch('/api/model-configs');
        const data = await response.json();
        const config = data.configs[configName];
        
        if (config) {
            document.getElementById('model-select').value = config.model || '';
            document.getElementById('assistant-select').value = config.assistant || '';
            document.getElementById('output-format').value = config.outputFormat || 'text';
            document.getElementById('temperature').value = config.temperature || 0.8;
            document.getElementById('top-p').value = config.topP || 0.8;
            document.getElementById('top-k').value = config.topK || 50;
            document.getElementById('frequency-penalty').value = config.frequencyPenalty || 0;
            document.getElementById('max-tokens').value = config.maxTokens || 2048;
            
            // 更新滑块显示值
            updateSliderValue('temperature', 'temperature-value');
            updateSliderValue('top-p', 'top-p-value');
            updateSliderValue('top-k', 'top-k-value');
            updateSliderValue('frequency-penalty', 'frequency-penalty-value');
            updateSliderValue('max-tokens', 'max-tokens-value');
        }
    } catch (error) {
        console.error('加载配置失败:', error);
    }
}

// 保存配置
async function saveConfig() {
    const configName = prompt('请输入配置名称：');
    if (!configName) return;
    
    const config = getCurrentConfig();
    
    try {
        const response = await fetch('/api/model-configs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: configName,
                config: config
            })
        });
        
        if (response.ok) {
            alert('配置保存成功！');
            loadModelConfigs(); // 重新加载配置列表
        } else {
            alert('配置保存失败！');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        alert('配置保存失败！');
    }
}

// 加载模型列表
async function loadModels() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        const select = document.getElementById('model-select');
        
        data.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${model.provider})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载模型列表失败:', error);
    }
}

// 加载助手列表
async function loadAssistants() {
    try {
        const response = await fetch('/api/assistants');
        const data = await response.json();
        const select = document.getElementById('assistant-select');
        
        for (const id in data.assistants) {
            const assistant = data.assistants[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = assistant.name;
            select.appendChild(option);
        }
    } catch (error) {
        console.error('加载助手列表失败:', error);
    }
}

// 初始化页面
async function initializePage() {
    await Promise.all([
        loadModels(),
        loadAssistants(),
        loadModelConfigs()
    ]);
}

// 发送消息
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // 禁用发送按钮并开始倒计时
    sendButton.disabled = true;
    let countdown = 10;
    const originalText = sendButton.textContent;
    const countdownInterval = setInterval(() => {
        sendButton.textContent = `${countdown}秒`;
        countdown--;
        if (countdown < 0) {
            clearInterval(countdownInterval);
            sendButton.disabled = false;
            sendButton.textContent = originalText;
        }
    }, 1000);

    // 添加用户消息到界面
    addMessage('user', message);
    userInput.value = '';
    
    const config = getCurrentConfig();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model,
                assistant: config.assistant,
                message: message,
                conversationHistory: getConversationHistory()
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            addMessage('assistant', data.response);
        } else {
            const error = await response.json();
            addMessage('assistant', `错误: ${error.error}`);
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        addMessage('assistant', '发送消息失败，请检查网络连接。');
    }
}

// 获取对话历史
function getConversationHistory() {
    const container = document.getElementById('response-container');
    const messages = [];
    
    for (const element of container.children) {
        const role = element.getAttribute('role');
        const contentSpan = element.querySelector('span');
        const content = contentSpan ? contentSpan.textContent : '';
        if (role && content) {
            messages.push({ role, content });
        }
    }
    
    return messages;
}

// 添加消息到界面
function addMessage(role, content) {
    const container = document.getElementById('response-container');
    const messageDiv = document.createElement('div');
    messageDiv.setAttribute('role', role);
    
    // 创建消息内容的span元素
    const contentSpan = document.createElement('span');
    contentSpan.textContent = content;
    messageDiv.appendChild(contentSpan);
    
    // 添加删除按钮
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.textContent = 'x';
    deleteButton.onclick = () => messageDiv.remove();
    messageDiv.appendChild(deleteButton);
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// 下载对话历史
function downloadConversation() {
    const history = getConversationHistory();
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'conversation.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 加载对话文件
function loadFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const history = JSON.parse(e.target.result);
            const container = document.getElementById('response-container');
            container.innerHTML = '';
            history.forEach(msg => addMessage(msg.role, msg.content));
        } catch (error) {
            console.error('加载对话失败:', error);
            alert('加载对话失败！');
        }
    };
    reader.readAsText(file);
}

// 清空对话
function clearConversation() {
    if (confirm('确定要清空所有对话吗？')) {
        document.getElementById('response-container').innerHTML = '';
    }
}

// 事件监听器
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    
    // 配置模态框
    const modal = document.getElementById('config-modal');
    const configButton = document.getElementById('config-button');
    const closeButton = document.querySelector('.close');
    
    configButton.onclick = () => modal.style.display = 'block';
    closeButton.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // 配置相关事件
    document.getElementById('load-config-select').onchange = loadConfig;
    document.getElementById('save-config-btn').onclick = saveConfig;
    
    // 发送消息相关事件
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    
    userInput.onkeydown = (event) => {
        if (event.key === 'Enter' && event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    };
    
    sendButton.onclick = sendMessage;
    
    // 其他功能按钮事件
    document.getElementById('download-button').onclick = downloadConversation;
    document.getElementById('clear-button').onclick = clearConversation;
});