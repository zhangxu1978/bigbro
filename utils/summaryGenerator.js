const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, '..', 'data', 'lifesim-config.json');

async function loadConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        return config;
    } catch (err) {
        console.error('读取配置失败:', err);
        return {
            apiUrl: 'http://localhost:3100/v1/chat/completions',
            model: 'moda-kimi2.5',
            apiKey: '',
            maxTokens: 50
        };
    }
}

async function generateSummary(gameState, messages) {
    try {
        const cfg = await loadConfig();
        
        const recentMessages = messages.slice(-5);
        const messagesText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
        
        const prompt = `请根据以下游戏状态和最近的对话，生成一个不超过50字的存档摘要：

游戏状态：
- 世界：${gameState.worldName || '未知'}
- 年龄：${gameState.age || 0}岁
- 回合：第${gameState.turn || 0}回合
- 状态：${gameState.characterStatus || '正常'}

最近对话：
${messagesText}
不要用破坏游戏体验的总结，比如游戏结束，玩家失败，玩家面临三个选项等。
请用简洁的语言描述当前进度，不超过50字。`;

        const headers = {
            'Content-Type': 'application/json',
        };
        if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

        const resp = await fetch(cfg.apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: cfg.model,
                messages: [
                    { role: 'system', content: '你是一个游戏存档摘要生成器。请根据游戏状态和对话历史，生成一个简短的存档摘要，不超过50字。' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!resp.ok) {
            const err = await resp.text();
            console.error('API 错误:', err);
            return null;
        }

        const data = await resp.json();
        let summary = data.choices?.[0]?.message?.content || '';
        summary = summary.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        
        // if (summary.length > 50) {
        //     summary = summary.substring(0, 50).trim();
        // }
        
        return summary || null;
    } catch (err) {
        console.error('生成摘要失败:', err);
        return null;
    }
}

module.exports = {
    generateSummary
};
