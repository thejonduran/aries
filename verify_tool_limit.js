const ChatClient = require('./src/modules/ChatClient');
const Logger = require('./src/modules/Logger');

// Mock Tool Registry
const mockToolRegistry = {
    getTools: () => [{ function: { name: 'test_tool' } }],
    execute: async (name, args) => {
        return `Result of ${name}`;
    }
};

// Mock LLM Client that simulates a loop
// It returns a tool call for the first 6 requests.
// On the 7th request (which shouldn't happen if logic works, or should be the summary), it returns text.
class MockLLMLoop {
    constructor() {
        this.streaming = true;
        this.requestCount = 0;
    }

    async sendChatCompletion(messages) {
        this.requestCount++;
        console.log(`[MockLLM] Request #${this.requestCount} received.`);

        // Debug: print the last message to see if it's the system warning
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'system' && lastMsg.content.includes('limit')) {
            console.log('[MockLLM] RECEIVED STOP COMMAND from System!');
            return this.generateText("Okay, I will stop and summarize.");
        }

        if (this.requestCount > 10) {
            return this.generateText("Failsafe stop.");
        }

        // Return a tool call
        return this.generateToolCall();
    }

    async *generateToolCall() {
        // Yield a tool call chunk
        yield {
            choices: [{
                delta: {
                    tool_calls: [{
                        index: 0,
                        id: 'call_' + this.requestCount,
                        function: { name: 'test_tool', arguments: '{}' }
                    }]
                }
            }]
        };
    }

    async *generateText(text) {
        yield {
            choices: [{
                delta: { content: text }
            }]
        };
    }
}

async function testToolLimit() {
    process.env.TOOL_CALL_LIMIT = '3'; // Set low limit for testing
    console.log(`Testing with Limit = ${process.env.TOOL_CALL_LIMIT}`);

    const logger = new Logger();
    // logger.onLog(l => console.log(`[Log] ${l.message}`)); // Uncomment to see all logs

    const llm = new MockLLMLoop();
    const client = new ChatClient(llm, mockToolRegistry, logger);

    console.log('--- Starting Chat ---');
    const stream = client.chat("Start the loop");

    for await (const chunk of stream) {
        console.log(`[Output] ${chunk}`);
    }

    console.log('--- Chat Finished ---');

    // Verify history
    const history = client.getHistory();
    const systemWarnings = history.filter(m => m.role === 'system' && m.content.includes('limit'));

    if (systemWarnings.length > 0) {
        console.log('PASS: System warning found in history.');
    } else {
        console.log('FAIL: No system warning found.');
    }
}

testToolLimit();
