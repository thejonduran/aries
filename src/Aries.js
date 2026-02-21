const LLMClient = require('./modules/LLMClient');
const ChatClient = require('./modules/ChatClient');
const ToolRegistry = require('./modules/ToolRegistry');
const Logger = require('./modules/Logger');

class Aries {
    constructor(config = {}) {
        this.logger = config.logger || new Logger();
        this.llmClient = new LLMClient();
        this.toolRegistry = new ToolRegistry();

        // Register tools provided in config
        if (config.tools && Array.isArray(config.tools)) {
            config.tools.forEach(tool => this.toolRegistry.register(tool));
        }

        this.chatClient = new ChatClient(this.llmClient, this.toolRegistry, this.logger);

        // Load system persona from config or fallback
        const systemPrompt = config.systemPrompt || 'You are Aries, a helpful and intelligent AI assistant.';
        this.chatClient.setSystemMessage(systemPrompt);
    }
}

module.exports = Aries;
