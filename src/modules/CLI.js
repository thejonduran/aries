const readline = require('readline');
const InterfaceAdapter = require('./InterfaceAdapter');

class CLI extends InterfaceAdapter {
    constructor(sessionManager) {
        super(sessionManager, 'CLI');

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });
    }

    onLogReceived(log) {
        const timestamp = log.timestamp;
        let logMsg = `[${timestamp}] [${log.level}] ${log.message}`;

        if (log.data) {
            if (log.data instanceof Error) {
                logMsg += `\n${log.data.stack || log.data.message}`;
            } else {
                logMsg += `\n${JSON.stringify(log.data, null, 2)}`;
            }
        }

        if (log.level === 'ERROR') {
            console.error(logMsg);
        } else if (log.level === 'WARN') {
            console.warn(logMsg);
        } else {
            console.log(logMsg);
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
                await this.handleCommand('cli-local', input);
            } else if (input) {
                await this.handleChat('cli-local', input);
            }

            this.rl.prompt();
        }).on('close', () => {
            console.log('Goodbye!');
            process.exit(0);
        });
    }
    reply(msg) {
        console.log(msg);
    }

    exit() {
        this.rl.close();
    }

    async handleChat(sessionId, input) {
        try {
            process.stdout.write('Aries: ');

            const session = this.getSession(sessionId);
            const stream = session.chat(input);

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
