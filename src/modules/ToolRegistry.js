class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    /**
     * Register a new tool.
     * @param {Object} toolDefinition - The tool definition object.
     * @param {string} toolDefinition.name - Unique name of the tool.
     * @param {string} toolDefinition.description - Description for the LLM.
     * @param {Object} toolDefinition.parameters - JSON Schema for parameters.
     * @param {Function} toolDefinition.execute - The function to execute.
     */
    register(toolDefinition) {
        if (!toolDefinition.name || !toolDefinition.execute) {
            throw new Error('Tool must have a name and an execute function.');
        }
        this.tools.set(toolDefinition.name, toolDefinition);
    }

    /**
     * Get tool definitions formatted for OpenAI API.
     * @returns {Array} Array of tool objects.
     */
    getTools() {
        return Array.from(this.tools.values()).map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));
    }

    /**
     * Execute a tool by name.
     * @param {string} name - Tool name.
     * @param {Object} args - Arguments for the tool.
     * @returns {Promise<string>} The result of the tool execution.
     */
    async execute(name, args) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool not found: ${name}`);
        }
        try {
            const result = await tool.execute(args);
            return JSON.stringify(result);
        } catch (error) {
            return JSON.stringify({ error: error.message });
        }
    }
}

module.exports = ToolRegistry;
