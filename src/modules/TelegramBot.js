const TelegramBotAPI = require('node-telegram-bot-api');
const InterfaceAdapter = require('./InterfaceAdapter');

class TelegramBot extends InterfaceAdapter {
    constructor(token, chatClient) {
        if (!token) {
            throw new Error('TelegramBot requires a valid token.');
        }

        super(chatClient, 'TelegramBot');

        this.bot = new TelegramBotAPI(token, { polling: true });

        // We assume a single primary user/admin for debug logs for simplicity
        this.primaryAdminChatId = null;

        this.start();
    }

    /**
     * Required implementation from InterfaceAdapter
     */
    start() {
        console.log('--- Aries Telegram Bot Initialized ---');

        // Handle text messages
        this.bot.on('message', async (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text;

            if (!text) return; // Ignore non-text messages for now

            // Keep track of the last user to interact so we know where to send logs
            this.primaryAdminChatId = chatId;

            console.log(`[Telegram] Received from ${chatId}: ${text}`);

            if (text.startsWith('/')) {
                // To keep signature matched with InterfaceAdapter framework, we need to bind the chatId somehow or override handleCommand
                // Since this interface is multi-user theoretically but practically single-user, we'll override it manually or handle it directly here:
                const context = {
                    reply: (m) => this.bot.sendMessage(chatId, m),
                    toggleDebug: () => {
                        this.showDebug = !this.showDebug; // Global state from Base
                        return this.showDebug;
                    },
                    exit: () => {
                        this.bot.sendMessage(chatId, "Stopping the bot is not supported via command. Please use server console.");
                    }
                };
                await this.commandHandler.handle(text, context);
            } else {
                await this.handleChat(chatId, text);
            }
        });

        // Error handling
        this.bot.on('polling_error', (error) => {
            console.error(`[Telegram Error] ${error.code}: ${error.message}`);
        });
    }

    /**
     * Required implementation from InterfaceAdapter
     */
    onLogReceived(log) {
        // If no one has interacted yet, skip pushing logs to telegram
        if (!this.primaryAdminChatId) return;

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
        this.bot.sendMessage(this.primaryAdminChatId, `\`${logMsg}\``, { parse_mode: 'Markdown' })
            .catch(err => console.error(`Failed to send log to ${this.primaryAdminChatId}:`, err.message));
    }

    /**
     * Stubs for InterfaceAdapter signature compliance
     */
    reply(msg) {
        if (this.primaryAdminChatId) {
            this.bot.sendMessage(this.primaryAdminChatId, msg);
        }
    }

    exit() {
        if (this.primaryAdminChatId) {
            this.bot.sendMessage(this.primaryAdminChatId, "Stopping the bot is not supported via command. Please use server console.");
        }
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

            // Log the final response for visibility (server logs + debug stream)
            if (this.chatClient.logger) {
                this.chatClient.logger.info(`Response sent to ${chatId}:`, lastText);
            }

        } catch (error) {
            this.bot.sendMessage(chatId, `Error: ${error.message}`);
        }
    }
}

module.exports = TelegramBot;
