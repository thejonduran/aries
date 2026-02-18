const LLMClient = require('./modules/LLMClient');
const ChatClient = require('./modules/ChatClient');
const ToolRegistry = require('./modules/ToolRegistry');
const ShellExecutor = require('./tools/ShellExecutor'); // Import
const Logger = require('./modules/Logger');

const fs = require('fs');
const path = require('path');

class Aries {
    constructor() {
        this.logger = new Logger();
        this.llmClient = new LLMClient();
        this.toolRegistry = new ToolRegistry();

        // Register default tools
        this.toolRegistry.register(ShellExecutor); // Register

        this.chatClient = new ChatClient(this.llmClient, this.toolRegistry, this.logger);

        // Load system persona
        try {
            const personaPath = path.join(__dirname, 'Agent.md');
            const persona = fs.readFileSync(personaPath, 'utf8').trim();
            this.chatClient.setSystemMessage(persona);
        } catch (error) {
            this.logger.error('Failed to load Agent.md', error);
            // Fallback
            this.chatClient.setSystemMessage('You are Aries, a helpful and intelligent AI assistant.');
        }
    }
}

module.exports = Aries;
