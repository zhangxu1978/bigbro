module.exports = {
    models: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'claude-2', name: 'Claude-2' }
    ],
    assistants: [
        { id: 'creative', name: '创意助手' },
        { id: 'editor', name: '编辑助手' },
        { id: 'researcher', name: '研究助手' }
    ],
    apiKeys: {
        openai: 'your-openai-key',
        anthropic: 'your-anthropic-key'
    }
}; 