const { exec } = require('child_process');

const ShellExecutor = {
    name: 'run_command',
    description: 'Execute a shell command. Use this to list files, check git status, or run system utilities. Do NOT use this for interactive commands that require user input (like "npm start" or "node"), as they will hang.',
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
            // timeout after 30 seconds to prevent hanging
            exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
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
