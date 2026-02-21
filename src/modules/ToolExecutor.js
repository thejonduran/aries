class ToolExecutor {
    constructor(toolRegistry, logger) {
        this.toolRegistry = toolRegistry;
        this.logger = logger;
    }

    /**
     * Executes a list of tool calls and returns the history-ready result messages.
     * @param {Array} toolCalls - Array of tool call objects from the LLM
     * @returns {Promise<Array>} Array of message objects to append to history
     */
    async executeAll(toolCalls) {
        const results = [];

        for (const call of toolCalls) {
            // Parse arguments loosely since LLMs can sometimes output malformed JSON
            let args;
            try {
                args = JSON.parse(call.function.arguments);
            } catch (e) {
                if (this.logger) {
                    this.logger.error("Failed to parse tool arguments", { error: e, rawArgs: call.function.arguments });
                }
                args = {};
            }

            if (this.logger) {
                this.logger.info(`Executing tool: ${call.function.name}`, args);
            }

            // Execute via registry
            let resultContent;
            try {
                resultContent = await this.toolRegistry.execute(call.function.name, args);
                if (this.logger) {
                    this.logger.debug(`Tool execution result:`, resultContent);
                }
            } catch (err) {
                resultContent = JSON.stringify({ error: err.message });
                if (this.logger) {
                    this.logger.error(`Tool execution failed : ${call.function.name}`, err);
                }
            }

            // Format result for LLM history
            results.push({
                role: 'tool',
                tool_call_id: call.id,
                name: call.function.name,
                content: resultContent
            });
        }

        return results;
    }
}

module.exports = ToolExecutor;
