const { exec } = require('child_process');

const ShellExecutor = {
    name: 'run_command',
    description: `Execute a shell command on a ${process.env.OS || 'Unknown OS'} system. Use this to list files, check git status, or run system utilities. Do NOT use this for interactive commands that require user input (like "npm start" or "node"), as they will hang. CONSTRAINT: You MUST use relative paths (e.g., "./src/file.js"). Absolute paths and directory traversal ("..") are FORBIDDEN.`,
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The shell command to execute.'
            }
        },
        required: ['command']
    },
    execute: async ({ command }) => {
        return new Promise((resolve, reject) => {
            const path = require('path');
            const projectRoot = path.resolve(__dirname, '../../');

            // Basic security checks
            const forbiddenPatterns = [
                '..',       // Parent directory traversal
                ':\\',      // Windows absolute path with drive letter
                ':/',       // Windows absolute path with forward slash
                '/^\\s*\\//', // Unix absolute path at start
                '/^\\s*\\\\/', // Windows absolute path at start
            ];

            // Normalize command for checking
            // We want to block usage of absolute paths or traveling up
            // Checks:
            // 1. ".."
            // 2. Drive letters "C:" or "D:"
            // 3. Root paths "\" or "/"

            const isTraversal = command.includes('..');
            const isDriveLetter = /[a-zA-Z]:/.test(command);
            const isRootPath = command.includes(' \\') || command.includes(' /') || command.startsWith('\\') || command.startsWith('/');

            if (isTraversal || isDriveLetter || isRootPath) {
                resolve('Error: Command blocked for security reasons. You are restricted to the current project directory and cannot use absolute paths, drive letters, or directory traversal (..).');
                return;
            }

            // timeout after 30 seconds to prevent hanging
            exec(command, { timeout: 30000, cwd: projectRoot }, (error, stdout, stderr) => {
                if (error) {
                    // Distinguish between timeout and other errors if possible, 
                    // generally error.killed is true on timeout
                    if (error.killed) {
                        resolve(`Command timed out after 30 seconds.`);
                    } else {
                        resolve(`Command failed: ${error.message}\nStderr: ${stderr}`);
                    }
                    return;
                }
                resolve(stdout || stderr || 'Command executed with no output.');
            });
        });
    }
};

module.exports = ShellExecutor;
