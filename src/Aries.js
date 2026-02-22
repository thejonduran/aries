const LLMClient = require('./modules/LLMClient');
const ToolRegistry = require('./modules/ToolRegistry');
const Logger = require('./modules/Logger');
const SessionManager = require('./modules/SessionManager'); // New import

class Aries {
    constructor(config = {}) {
        this.logger = config.logger || new Logger();
        this.llmClient = new LLMClient();
        this.toolRegistry = new ToolRegistry();

        // Register tools provided in config
        if (config.tools && Array.isArray(config.tools)) {
            config.tools.forEach(tool => this.toolRegistry.register(tool));
        }

        // Load system persona from config or fallback
        const systemPrompt = config.systemPrompt || 'You are Aries, a helpful and intelligent AI assistant.';

        // Initialize SessionManager instead of a single ChatClient
        this.sessionManager = new SessionManager(
            this.llmClient,
            this.toolRegistry,
            this.logger,
            systemPrompt // Pass system prompt to SessionManager
        );
    }
}

module.exports = Aries;
