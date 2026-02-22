const fs = require('fs');
const path = require('path');

class ToolLoader {
    /**
     * Scans the given directory for JavaScript files, requires them, 
     * and attempts to load them as Aries Engine tools.
     * 
     * @param {string} toolsDirectory - Absolute path to the tools folder
     * @param {Object} logger - (Optional) Logger instance for warnings
     * @returns {Array} Array of valid tool modules
     */
    static loadTools(toolsDirectory, logger = console) {
        const loadedTools = [];

        if (!fs.existsSync(toolsDirectory)) {
            if (logger.warn) logger.warn(`Tool loader: Directory ${toolsDirectory} does not exist.`);
            return loadedTools;
        }

        const files = fs.readdirSync(toolsDirectory);

        for (const file of files) {
            // Only attempt to load Javascript files
            if (path.extname(file) !== '.js') continue;

            const fullPath = path.join(toolsDirectory, file);
            let toolModule;

            try {
                // Ignore Node's module caching if we eventually want hot-reloading
                toolModule = require(fullPath);
            } catch (err) {
                if (logger.error) logger.error(`Tool loader: Failed to require ${file}`, err);
                continue;
            }

            // Validation: The tool module must export an object containing an array of tool objects
            // Or a single tool object. We'll support both for flexibility.

            const toolsToRegister = Array.isArray(toolModule) ? toolModule : [toolModule];

            for (const tool of toolsToRegister) {
                if (this._isValidTool(tool)) {
                    loadedTools.push(tool);
                } else {
                    if (logger.warn) logger.warn(`Tool loader: Tool in ${file} failed schema validation. Requires name, description, parameters, and execute().`);
                }
            }
        }

        if (logger.info) logger.info(`Tool loader: Successfully loaded ${loadedTools.length} tools.`);

        return loadedTools;
    }

    /**
     * Validates that the loaded object conforms to the expected Tool schema interface.
     * @param {Object} tool 
     * @returns {boolean}
     */
    static _isValidTool(tool) {
        return (
            tool &&
            typeof tool === 'object' &&
            typeof tool.name === 'string' &&
            typeof tool.description === 'string' &&
            typeof tool.parameters === 'object' &&
            typeof tool.execute === 'function'
        );
    }
}

module.exports = ToolLoader;
