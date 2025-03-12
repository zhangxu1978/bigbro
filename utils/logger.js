const fs = require('fs');
const path = require('path');

// 确保日志目录存在
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

/**
 * 写入日志文件
 * @param {object} userMessage - 用户发送的消息
 * @param {string} aiResponse - AI的回复
 */
function writeToLog(userMessage, aiResponse) {
    try {
        const now = new Date();
        const fileName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.log`;
        const logPath = path.join(logsDir, fileName);
        
        const logContent = `时间: ${now.toISOString()}\n` +
                          `字数: ${JSON.stringify(userMessage, null, 2).length}\n` +
                          `用户发送:\n${JSON.stringify(userMessage, null, 2)}\n\n` +
                          `AI回复字数: ${aiResponse.length}:\n${JSON.stringify(aiResponse, null, 2)}\n` +
                          `----------------------------------------\n`;
        
        fs.appendFileSync(logPath, logContent, 'utf8');
    } catch (error) {
        console.error('写入日志失败:', error);
    }
}

module.exports = {
    writeToLog
};