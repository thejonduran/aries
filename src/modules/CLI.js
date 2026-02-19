const readline = require('readline');

class CLI {
    constructor(chatClient) {
        if (!chatClient) {
            throw new Error('CLI requires a ChatClient instance.');
        }
        this.chatClient = chatClient;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });

        this.showDebug = process.env.DEBUG === 'true';

        // Subscribe to logger events for real-time output
        if (this.chatClient.logger && typeof this.chatClient.logger.onLog === 'function') {
            this.chatClient.logger.onLog((log) => {
                // Always show INFO, WARN, ERROR. Show DEBUG only if enabled.
                if (log.level === 'DEBUG' && !this.showDebug) return;

                const timestamp = log.timestamp; // Use timestamp from event
                let logMsg = `[${timestamp}] [${log.level}] ${log.message}`;

                if (log.data) {
                    if (log.data instanceof Error) {
                        logMsg += `\n${log.data.stack || log.data.message}`;
                    } else {
                        logMsg += `\n${JSON.stringify(log.data, null, 2)}`;
                    }
                }

                // Use console methods to distinguish output streams/colors if needed, 
                // but for now simple console.log/error matches previous behavior.
                if (log.level === 'ERROR') {
                    console.error(logMsg);
                } else if (log.level === 'WARN') {
                    console.warn(logMsg);
                } else {
                    console.log(logMsg);
                }
            });
        }
    }

    start() {
        console.log('--- Aries Engine CLI ---');
        console.log('Type your message or /exit to quit.');
        console.log(`Debug mode is ${this.showDebug ? 'ON' : 'OFF'} (toggle with /debug)`);

        this.rl.prompt();

        this.rl.on('line', async (line) => {
            const input = line.trim();

            if (input.startsWith('/')) {
                this.handleCommand(input);
            } else if (input) {
                await this.handleChat(input);
            }

            this.rl.prompt();
        }).on('close', () => {
            console.log('Goodbye!');
            process.exit(0);
        });
    }

    handleCommand(command) {
        switch (command.toLowerCase()) {
            case '/exit':
            case '/quit':
                this.rl.close();
                break;
            case '/debug':
                this.showDebug = !this.showDebug;
                console.log(`Debug mode ${this.showDebug ? 'ENABLED' : 'DISABLED'}`);
                break;
            case '/clear':
                this.chatClient.clearHistory();
                console.log('Conversation history cleared.');
                break;
            case '/history':
                const history = this.chatClient.getHistory();
                history.forEach((msg, idx) => {
                    let contentPreview = '';
                    if (msg.content) {
                        contentPreview = msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '');
                    }

                    if (msg.tool_calls) {
                        contentPreview += ` [Tool Calls: ${msg.tool_calls.map(tc => tc.function.name).join(', ')}]`;
                    }

                    if (msg.role === 'tool') {
                        contentPreview = `[Result for ${msg.name}] ${contentPreview}`;
                    }

                    console.log(`[${idx}] ${msg.role}: ${contentPreview}`);
                });
                break;
            default:
                console.log(`Unknown command: ${command}`);
        }
    }

    async handleChat(input) {
        try {
            process.stdout.write('Aries: ');
            const stream = this.chatClient.chat(input);

            for await (const chunk of stream) {
                process.stdout.write(chunk);
            }
            process.stdout.write('\n');
        } catch (error) {
            console.error('\nError:', error.message);
        }
    }
}

module.exports = CLI;
