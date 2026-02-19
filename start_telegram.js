require('dotenv').config();
const Aries = require('./src/Aries');
const TelegramBot = require('./src/modules/TelegramBot');

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
        const aries = new Aries();
        const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, aries.chatClient);

        console.log('Telegram Bot is running...');
    } catch (error) {
        console.error('Failed to start Telegram Bot:', error);
        process.exit(1);
    }
}

start();
