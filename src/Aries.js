const LLMClient = require('./modules/LLMClient');
const ChatClient = require('./modules/ChatClient');
const ToolRegistry = require('./modules/ToolRegistry');
const FileSystemTools = require('./tools/FileSystemTools'); // Import
const Logger = require('./modules/Logger');

const fs = require('fs');
const path = require('path');

class Aries {
    constructor() {
        this.logger = new Logger();
        this.llmClient = new LLMClient();
        this.toolRegistry = new ToolRegistry();

        // Register default tools
        this.toolRegistry.register(FileSystemTools); // Register

        this.chatClient = new ChatClient(this.llmClient, this.toolRegistry, this.logger);

        // Load system persona
        // Load system prompts
        try {
            const corePath = path.join(__dirname, 'SYSTEMCORE.md');
            const personalityPath = path.join(__dirname, 'PERSONALITY.md');

            let systemPrompt = '';

            // 1. Core System Instructions
            if (fs.existsSync(corePath)) {
                systemPrompt += '=== SYSTEM CORE ===\n';
                systemPrompt += fs.readFileSync(corePath, 'utf8').trim();
                systemPrompt += '\n\n';
            } else {
                this.logger.warn('SYSTEMCORE.md not found. Core instructions missing.');
            }

            // 2. Personality/Persona
            if (fs.existsSync(personalityPath)) {
                systemPrompt += '=== PERSONALITY MODULE ===\n';
                systemPrompt += fs.readFileSync(personalityPath, 'utf8').trim();
            } else {
                this.logger.warn('PERSONALITY.md not found. Using default persona.');
            }

            if (!systemPrompt) {
                systemPrompt = 'You are Aries, a helpful and intelligent AI assistant.';
            }

            this.chatClient.setSystemMessage(systemPrompt.trim());
        } catch (error) {
            this.logger.error('Failed to load system prompts', error);
            // Fallback
            this.chatClient.setSystemMessage('You are Aries, a helpful and intelligent AI assistant.');
        }
    }
}

module.exports = Aries;
