require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Aries = require('./src/Aries');
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
        }

        if (fs.existsSync(personalityPath)) {
            systemPrompt += '=== PERSONALITY MODULE ===\n';
            systemPrompt += fs.readFileSync(personalityPath, 'utf8').trim();
        }

        if (!systemPrompt) {
            systemPrompt = 'You are Aries, a helpful and intelligent AI assistant.';
        }
    } catch (error) {
        if (logger) logger.error('Failed to load system prompts', error);
        systemPrompt = 'You are Aries, a helpful and intelligent AI assistant.';
    }

    return systemPrompt.trim();
}

async function start() {
    console.log('--- Starting Aries Telegram Bot ---');

    console.log('Environment Check:', {
        OS: process.env.OS,
        MODEL: process.env.MODEL,
        DEBUG: process.env.DEBUG,
        TOOL_CALL_LIMIT: process.env.TOOL_CALL_LIMIT,
        TELEGRAM_TOKEN_SET: !!process.env.TELEGRAM_TOKEN
    });

    if (!process.env.TELEGRAM_TOKEN) {
        console.error('ERROR: TELEGRAM_TOKEN is not set in .env');
        process.exit(1);
    }

    try {
        const logger = new Logger();

        // 1. Gather Dependencies (IoC)
        const systemPrompt = loadSystemPrompts(logger);

        // Auto-load tools
        const toolsDir = path.join(__dirname, 'src', 'tools');
        const activeTools = ToolLoader.loadTools(toolsDir, logger);

        const aries = new Aries({
            systemPrompt: systemPrompt,
            tools: activeTools,
            logger: logger
        });

        // 2. Mount Telegram Bot
        // NOTE: `.env` seems to be using TELEGRAM_TOKEN, while index.js was using TELEGRAM_BOT_TOKEN
        // We'll support both for backward compatibility.
        const token = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
        const bot = new TelegramBot(token, aries.sessionManager);

        console.log('Telegram Bot is running...');
    } catch (error) {
        console.error('Failed to start Telegram Bot:', error);
        process.exit(1);
    }
}

start();
