const TelegramBotAPI = require('node-telegram-bot-api');
const CommandHandler = require('./CommandHandler');

class TelegramBot {
    constructor(token, chatClient) {
        if (!token) {
            throw new Error('TelegramBot requires a valid token.');
        }
        if (!chatClient) {
            throw new Error('TelegramBot requires a ChatClient instance.');
        }

        this.chatClient = chatClient;
        this.commandHandler = new CommandHandler(chatClient);
        this.bot = new TelegramBotAPI(token, { polling: true });

        // Track debug state per chat. Map<chatId, boolean>
        this.debugStates = new Map();

        this.initialize();
    }

    initialize() {
        console.log('--- Aries Telegram Bot Initialized ---');

        // Handle text messages
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;

            if (!text) return; // Ignore non-text messages for now

            console.log(`[Telegram] Received from ${chatId}: ${text}`);

            if (text.startsWith('/')) {
                await this.handleCommand(chatId, text);
            } else {
                await this.handleChat(chatId, text);
            }
        });

        // Subscribe to logger events to push debug logs to Telegram
        if (this.chatClient.logger && typeof this.chatClient.logger.onLog === 'function') {
            this.chatClient.logger.onLog((log) => {
                // We need to know WHICH chat to send logs to.
                // For simplicity in this v1, checking if ANY chat has debug enabled might be noisy if there are multiple users.
                // But typically this is a single-user personal bot.
                // We will iterate over all active debug sessions.

                this.debugStates.forEach((isDebug, chatId) => {
                    if (!isDebug) return;

                    // Filter: Only show Debug logs if enabled (which is checked above), 
                    // but we also want INFO/WARN/ERROR? 
                    // CLI logic: "Always show INFO, WARN, ERROR. Show DEBUG only if enabled."
                    // Let's replicate this.

                    if (log.level === 'DEBUG' && !isDebug) return;

                    let logMsg = `[${log.level}] ${log.message}`;
                    if (log.data) {
                        if (log.data instanceof Error) {
                            logMsg += `\n${log.data.message}`;
                        } else {
                            // Truncate large objects for Telegram
                            const json = JSON.stringify(log.data, null, 2);
                            logMsg += `\n${json.length > 500 ? json.substring(0, 500) + '...' : json}`;
                        }
                    }

                    // Send as code block
                    this.bot.sendMessage(chatId, `\`${logMsg}\``, { parse_mode: 'Markdown' })
                        .catch(err => console.error(`Failed to send log to ${chatId}:`, err.message));
                });
            });
        }

        // Error handling
        this.bot.on('polling_error', (error) => {
            console.error(`[Telegram Error] ${error.code}: ${error.message}`);
        });
    }

    async handleCommand(chatId, command) {
        const context = {
            reply: (msg) => this.bot.sendMessage(chatId, msg),
            toggleDebug: () => {
                const currentState = this.debugStates.get(chatId) || false;
                const newState = !currentState;
                this.debugStates.set(chatId, newState);
                return newState;
            },
            exit: () => {
                this.bot.sendMessage(chatId, "Stopping the bot is not supported via command. Please use server console.");
            }
        };

        await this.commandHandler.handle(command, context);
    }

    async handleChat(chatId, input) {
        // Send a temporary "Scanning..." or "Thinking..." message
        let sentMethod;
        try {
            sentMethod = await this.bot.sendMessage(chatId, "Thinking...");
        } catch (e) {
            console.error("Failed to send initial message:", e);
            return;
        }

        const messageId = sentMethod.message_id;
        let lastText = "";
        let lastUpdateTime = 0;

        try {
            const stream = this.chatClient.chat(input);

            for await (const chunk of stream) {
                lastText += chunk;

                // Rate limit updates: Edit at most once every 1.5 seconds
                const now = Date.now();
                if (now - lastUpdateTime > 1500) {
                    await this.bot.editMessageText(lastText, {
                        chat_id: chatId,
                        message_id: messageId
                    }).catch(e => {
                        // Ignore "message is not modified" errors
                        if (!e.message.includes('message is not modified')) {
                            console.error("Failed to edit message:", e.message);
                        }
                    });
                    lastUpdateTime = now;
                }
            }

            // Final update to ensure complete message
            await this.bot.editMessageText(lastText, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown' // Try markdown for final result? Might break if LLM uses bad markdown. Let's be safe and avoid unless we accept risk.
                // Actually, LLM produces Markdown. Let's try to support it.
            }).catch(async (e) => {
                // If Markdown parsing fails, fallback to plain text
                await this.bot.editMessageText(lastText, {
                    chat_id: chatId,
                    message_id: messageId
                });
            });

        } catch (error) {
            this.bot.sendMessage(chatId, `Error: ${error.message}`);
        }
    }
}

module.exports = TelegramBot;
