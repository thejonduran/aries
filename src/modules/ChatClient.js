const { v4: uuidv4 } = require('uuid'); // Optional, but good for message IDs if needed, otherwise just simple objects. I'll stick to simple objects for now as per user request.
const ToolExecutor = require('./ToolExecutor');

class ChatClient {
    constructor(llmClient, toolRegistry, logger) {
        if (!llmClient) {
            throw new Error('ChatClient requires an LLMClient instance.');
        }
        this.llmClient = llmClient;
        this.toolRegistry = toolRegistry;
        this.logger = logger;
        this.toolExecutor = new ToolExecutor(toolRegistry, logger);
        this.messages = [];

        // Subscribe to logger events
        if (this.logger && typeof this.logger.onLog === 'function') {
            this.logger.onLog((logEvent) => {
                this.messages.push({
                    role: 'debug',
                    content: `[${logEvent.level}] ${logEvent.message}`,
                    timestamp: logEvent.timestamp,
                    data: logEvent.data
                });
            });
        }

        // Tool Loop Safety
        this.consecutiveToolCalls = 0;
        this.toolLimit = parseInt(process.env.TOOL_CALL_LIMIT) || 5;
    }

    setSystemMessage(content) {
        this.systemMessageContent = content;
        // Remove existing system message if present (usually the first one)
        if (this.messages.length > 0 && this.messages[0].role === 'system') {
            this.messages[0].content = content;
        } else {
            this.messages.unshift({ role: 'system', content });
        }
    }

    addMessage(role, content) {
        this.messages.push({ role, content });
    }

    getHistory() {
        return this.messages;
    }

    clearHistory() {
        this.messages = [];
        if (this.systemMessageContent) {
            this.messages.push({ role: 'system', content: this.systemMessageContent });
        }
        this.consecutiveToolCalls = 0;
    }

    /**
     * Sends a message and returns an async iterator yielding response chunks.
     * Handles both streaming and non-streaming LLM configurations transparently.
     * @param {string} content - User message content
     */
    async *chat(content) {
        // If content is provided (user message), reset the tool counter
        if (content) {
            this.addMessage('user', content);
            if (this.logger) this.logger.info(`User message received: ${content.substring(0, 50)}...`);
            this.consecutiveToolCalls = 0;
        }

        // Prepare options
        const options = {};
        if (this.toolRegistry) {
            const tools = this.toolRegistry.getTools();
            if (tools.length > 0) {
                options.tools = tools;
                if (this.logger) this.logger.debug('Tools provided to LLM', tools.map(t => t.function.name));
            }
        }

        let response;
        try {
            if (this.logger) this.logger.debug('Sending request to LLM...');

            // Filter out debug messages before sending to LLM
            const messagesToSend = this.messages.filter(m => m.role !== 'debug');

            response = await this.llmClient.sendChatCompletion(messagesToSend, options);
        } catch (error) {
            console.error("ChatClient Error calling LLM:", error);
            if (this.logger) this.logger.error("Error calling LLM", error);
            throw error;
        }

        if (this.llmClient.streaming) {
            let fullResponse = '';
            let toolCalls = [];
            let currentToolCall = null;

            for await (const chunk of response) {
                const delta = chunk.choices[0]?.delta;

                // Handle content
                if (delta?.content) {
                    fullResponse += delta.content;
                    yield delta.content;
                }

                // Handle tool calls (accumulate chunks)
                if (delta?.tool_calls) {
                    for (const tcChunk of delta.tool_calls) {
                        if (tcChunk.index !== undefined) {
                            if (!toolCalls[tcChunk.index]) {
                                toolCalls[tcChunk.index] = {
                                    id: tcChunk.id || '',
                                    type: 'function',
                                    function: { name: tcChunk.function?.name || '', arguments: tcChunk.function?.arguments || '' }
                                };
                            } else {
                                // Append arguments
                                if (tcChunk.function?.arguments) {
                                    toolCalls[tcChunk.index].function.arguments += tcChunk.function.arguments;
                                }
                            }
                        }
                    }
                }
            }

            // If we have tool calls, we don't yield the final assistant message immediately to history
            // until we process them. BUT the user expects streaming.
            // Actually, in streaming mode with tools, the LLM usually *doesn't* send content AND tools.
            // It sends one or the other.

            if (toolCalls.length > 0) {
                // Add the assistant's request to history
                this.messages.push({
                    role: 'assistant',
                    content: fullResponse || null,
                    tool_calls: toolCalls
                });

                // Execute tools via the dedicated service
                const toolResults = await this.toolExecutor.executeAll(toolCalls);

                // Add results to history
                this.messages.push(...toolResults);

                // Track consecutive tool calls
                this.consecutiveToolCalls++;

                // Check limit
                if (this.consecutiveToolCalls >= this.toolLimit) {
                    const limitMsg = `[System] You have reached the consecutive tool call limit of ${this.toolLimit}. Stop executing tools. Summarize your progress so far and ask the user if you should proceed.`;
                    this.messages.push({ role: 'system', content: limitMsg });

                    if (this.logger) this.logger.warn(`Tool limit reached (${this.toolLimit}). Injecting stop command.`);

                    // Recursive call to let the LLM see the system message and respond (generate summary)
                    yield* this.chat(null);
                } else {
                    // RECURSIVE CALL: Get the next response from LLM (without new user input)
                    yield* this.chat(null);
                }

            } else {
                // Normal response (no tools)
                this.addMessage('assistant', fullResponse);
            }
        } else {
            throw new Error('ChatClient only supports streaming mode. Please enable streaming in configuration.');
        }
    }
}

module.exports = ChatClient;
