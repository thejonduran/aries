class CommandHandler {
    constructor(chatClient) {
        this.chatClient = chatClient;
    }

    async handle(command, interfaceContext) {
        const cmd = command.trim().toLowerCase();

        switch (cmd) {
            case '/exit':
            case '/quit':
                if (interfaceContext.exit) {
                    interfaceContext.exit();
                }
                break;

            case '/debug':
                if (interfaceContext.toggleDebug) {
                    const isDebug = interfaceContext.toggleDebug();
                    interfaceContext.reply(`Debug mode ${isDebug ? 'ENABLED' : 'DISABLED'}`);
                } else {
                    interfaceContext.reply('Debug toggling not supported in this interface.');
                }
                break;

            case '/clear':
                this.chatClient.clearHistory();
                interfaceContext.reply('Conversation history cleared.');
                break;

            case '/history':
                const history = this.chatClient.getHistory();
                if (history.length === 0) {
                    interfaceContext.reply('No history.');
                    return;
                }

                let historyMsg = '--- Conversation History ---\n';
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

                    historyMsg += `[${idx}] ${msg.role}: ${contentPreview}\n`;
                });
                interfaceContext.reply(historyMsg);
                break;

            case '/help':
                const helpText = `Available Commands:
/clear - Clear conversation history context.
/debug - Toggle real-time debug and tool logs.
/history - View recent conversation history.
/help - Show this help message.
${interfaceContext.exit ? '/exit - Quit the application.' : ''}`;
                interfaceContext.reply(helpText);
                break;

            default:
                interfaceContext.reply(`Unknown command: ${command}`);
        }
    }
}

module.exports = CommandHandler;
