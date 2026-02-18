const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const CodeExecutor = {
    name: 'run_script',
    description: 'Execute a code snippet in a specified language (javascript or python). Returns the standard output and standard error.',
    parameters: {
        type: 'object',
        properties: {
            language: {
                type: 'string',
                enum: ['javascript', 'python'],
                description: 'The programming language of the code snippet.',
                default: 'javascript'
            },
            code: {
                type: 'string',
                description: 'The code to execute.'
            }
        },
        required: ['code']
    },
    execute: async ({ language = 'javascript', code }) => {
        return new Promise((resolve, reject) => {
            const tempDir = path.join(__dirname, '../../temp');
            // Ensure temp directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const ext = language === 'python' ? '.py' : '.js';
            const filename = `script_${uuidv4()}${ext}`;
            const filepath = path.join(tempDir, filename);

            fs.writeFileSync(filepath, code);

            const command = language === 'python' ? 'python' : 'node';

            // Spawn child process
            const child = spawn(command, [filepath]);

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                // Cleanup
                try {
                    fs.unlinkSync(filepath);
                } catch (e) {
                    console.error('Failed to delete temp file:', e);
                }

                if (code !== 0) {
                    resolve(`Process exited with code ${code}\nStderr: ${stderr}\nStdout: ${stdout}`);
                } else {
                    resolve(stdout || stderr || 'No output.');
                }
            });

            child.on('error', (err) => {
                // Cleanup
                try {
                    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
                } catch (e) { }
                resolve(`Execution failed: ${err.message}`);
            });
        });
    }
};

module.exports = CodeExecutor;
