const CommandHandler = require('./CommandHandler');

/**
 * Base abstract class for Aries interfaces (e.g., CLI, Telegram).
 * Unifies debug state, logger subscriptions, and command handling logic.
 */
class InterfaceAdapter {
    constructor(chatClient, interfaceName = 'Interface') {
        if (!chatClient) {
            throw new Error(`${interfaceName} requires a ChatClient instance.`);
        }

        this.chatClient = chatClient;
        this.commandHandler = new CommandHandler(chatClient);
        this.interfaceName = interfaceName;

        // Global debug state for this interface
        this.showDebug = process.env.DEBUG === 'true';

        // Bind the logger automatically
        this._subscribeToLogger();
    }

    /**
     * Internal method to handle logger events.
     * Routes logs through the abstract `onLogReceived` method.
     */
    _subscribeToLogger() {
        if (this.chatClient.logger && typeof this.chatClient.logger.onLog === 'function') {
            this.chatClient.logger.onLog((log) => {
                // Ignore DEBUG traces if debug is disabled
                if (log.level === 'DEBUG' && !this.showDebug) return;

                // Route to implementation-specific log handler
                this.onLogReceived(log);
            });
        }
    }

    /**
     * Base implementation for command handling. 
     * Implementations can override this if they need specific contexts.
     * @param {string} command 
     */
    async handleCommand(command) {
        const context = {
            reply: (msg) => this.reply(msg),
            toggleDebug: () => {
                this.showDebug = !this.showDebug;
                return this.showDebug;
            },
            exit: () => this.exit()
        };

        await this.commandHandler.handle(command, context);
    }

    // --- Abstract Methods to be implemented by child classes ---

    /**
     * Start the interface (e.g., attach listeners, prompt user).
     */
    start() {
        throw new Error("Method 'start()' must be implemented.");
    }

    /**
     * Handle incoming text chatter and stream output back.
     * @param {string} input 
     */
    async handleChat(input) {
        throw new Error("Method 'handleChat(input)' must be implemented.");
    }

    /**
     * Send a plain text message/reply to the interface.
     * @param {string} msg 
     */
    reply(msg) {
        throw new Error("Method 'reply(msg)' must be implemented.");
    }

    /**
     * Shut down the interface.
     */
    exit() {
        throw new Error("Method 'exit()' must be implemented.");
    }

    /**
     * Process a log entry formatter for this specific interface.
     * @param {Object} log 
     */
    onLogReceived(log) {
        throw new Error("Method 'onLogReceived(log)' must be implemented.");
    }
}

module.exports = InterfaceAdapter;
