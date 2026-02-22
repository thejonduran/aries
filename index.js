require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Aries = require('./src/Aries');
const CLI = require('./src/modules/CLI');
const TelegramBot = require('./src/modules/TelegramBot');
const Logger = require('./src/modules/Logger');
const ToolLoader = require('./src/utils/ToolLoader');

function loadSystemPrompts(logger) {
    let systemPrompt = '';
    const srcDir = path.join(__dirname, 'src');

    try {
        const corePath = path.join(srcDir, 'SYSTEMCORE.md');
        const personalityPath = path.join(srcDir, 'PERSONALITY.md');

        if (fs.existsSync(corePath)) {
            systemPrompt += '=== SYSTEM CORE ===\n';
            systemPrompt += fs.readFileSync(corePath, 'utf8').trim();
            systemPrompt += '\n\n';
        } else {
            logger.warn('SYSTEMCORE.md not found. Core instructions missing.');
        }

        if (fs.existsSync(personalityPath)) {
            systemPrompt += '=== PERSONALITY MODULE ===\n';
            systemPrompt += fs.readFileSync(personalityPath, 'utf8').trim();
        } else {
            logger.warn('PERSONALITY.md not found. Using default persona.');
        }

        if (!systemPrompt) {
            systemPrompt = 'You are Aries, a helpful and intelligent AI assistant.';
        }
    } catch (error) {
        logger.error('Failed to load system prompts', error);
        systemPrompt = 'You are Aries, a helpful and intelligent AI assistant.';
    }

    return systemPrompt.trim();
}

function main() {
    try {
        const logger = new Logger();

        // 1. Gather Dependencies (IoC)
        const systemPrompt = loadSystemPrompts(logger);

        // Define which tools this instance of Aries should have access to by auto-loading
        const toolsDir = path.join(__dirname, 'src', 'tools');
        const activeTools = ToolLoader.loadTools(toolsDir, logger);

        // 2. Instantiate core engine
        const aries = new Aries({
            systemPrompt: systemPrompt,
            tools: activeTools,
            logger: logger
        });

        // 3. Mount Interfaces based on environment
        // Always mount CLI by default for local execution
        const cli = new CLI(aries.sessionManager);
        cli.start();

        // If Telegram token exists, mount the bot in parallel
        if (process.env.TELEGRAM_BOT_TOKEN) {
            new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, aries.sessionManager);
        }

    } catch (error) {
        console.error('Failed to start Aries Engine:', error);
    }
}

main();
