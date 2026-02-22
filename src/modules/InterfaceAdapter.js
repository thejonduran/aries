const CommandHandler = require('./CommandHandler');

/**
 * Base abstract class for Aries interfaces (e.g., CLI, Telegram).
 * Unifies debug state, logger subscriptions, and command handling logic.
 */
class InterfaceAdapter {
    constructor(sessionManager, interfaceName = 'Interface') {
        if (!sessionManager) {
            throw new Error(`${interfaceName} requires a SessionManager instance.`);
        }

        this.sessionManager = sessionManager;
        this.interfaceName = interfaceName;

        // Global debug state for this interface
        this.showDebug = process.env.DEBUG === 'true';

        // Bind the logger automatically
        this._subscribeToLogger();
    }

    /**
     * Get or create a session for a specific user/interface ID.
     * @param {string} sessionId 
     * @returns {ChatClient}
     */
    getSession(sessionId) {
        return this.sessionManager.getSession(sessionId);
    }

    /**
     * Helper to get the command handler for a specific session.
     * Instantiates a new CommandHandler bound to that session's ChatClient.
     * @param {string} sessionId 
     * @returns {CommandHandler}
     */
    getCommandHandler(sessionId) {
        const session = this.getSession(sessionId);
        return new CommandHandler(session);
    }

    /**
     * Internal method to handle logger events globally across the engine,
     * so interfaces can still push generic debug logs.
     */
    _subscribeToLogger() {
        if (this.sessionManager.logger && typeof this.sessionManager.logger.onLog === 'function') {
            this.sessionManager.logger.onLog((log) => {
                // Ignore DEBUG traces if debug is disabled
                if (log.level === 'DEBUG' && !this.showDebug) return;

                // Route to implementation-specific log handler
                this.onLogReceived(log);
            });
        }
    }

    /**
     * @param {string} sessionId The session context to run the command against
     * @param {string} command 
     */
    async handleCommand(sessionId, command) {
        const context = {
            reply: (msg) => this.reply(msg),
            toggleDebug: () => {
                this.showDebug = !this.showDebug;
                return this.showDebug;
            },
            exit: () => this.exit()
        };
        const handler = this.getCommandHandler(sessionId);
        await handler.handle(command, context);
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
