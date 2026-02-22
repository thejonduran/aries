const ChatClient = require('./ChatClient');

/**
 * Manages multiple active chat sessions to ensure different interfaces
 * (or multiple users on Telegram) don't bleed conversation histories together.
 */
class SessionManager {
    constructor(llmClient, toolRegistry, logger, systemPrompt) {
        this.llmClient = llmClient;
        this.toolRegistry = toolRegistry;
        this.logger = logger;
        this.systemPrompt = systemPrompt;

        // Map<sessionId, ChatClient>
        this.sessions = new Map();
    }

    /**
     * Retrieves an existing ChatClient for the given sessionId, or instantiates
     * a new one if it doesn't exist.
     * 
     * @param {string} sessionId A unique identifier for the session (e.g., 'cli-local' or telegram chatId)
     * @returns {ChatClient}
     */
    getSession(sessionId) {
        if (!this.sessions.has(sessionId)) {
            if (this.logger) {
                this.logger.info(`Creating new chat session: ${sessionId}`);
            }

            const newClient = new ChatClient(this.llmClient, this.toolRegistry, this.logger);

            // Inject the system prompt on creation
            if (this.systemPrompt) {
                newClient.setSystemMessage(this.systemPrompt);
            }

            this.sessions.set(sessionId, newClient);
        }

        return this.sessions.get(sessionId);
    }

    /**
     * Optional utility to completely clear a session from memory.
     * @param {string} sessionId 
     */
    deleteSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            this.sessions.delete(sessionId);
            if (this.logger) {
                this.logger.info(`Deleted chat session: ${sessionId}`);
            }
        }
    }
}

module.exports = SessionManager;
