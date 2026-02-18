const { v4: uuidv4 } = require('uuid'); // Optional, but good for message IDs if needed, otherwise just simple objects. I'll stick to simple objects for now as per user request.

class ChatClient {
    constructor(llmClient, toolRegistry, logger) {
        if (!llmClient) {
            throw new Error('ChatClient requires an LLMClient instance.');
        }
        this.llmClient = llmClient;
        this.toolRegistry = toolRegistry;
        this.logger = logger;
        this.messages = [];
    }

    setSystemMessage(content) {
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
    }

    /**
     * Sends a message and returns an async iterator yielding response chunks.
     * Handles both streaming and non-streaming LLM configurations transparently.
     * @param {string} content - User message content
     */
    async *chat(content) {
        // If content is provided, add it as a user message
        if (content) {
            this.addMessage('user', content);
            if (this.logger) this.logger.info(`User message received: ${content.substring(0, 50)}...`);
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
            response = await this.llmClient.sendChatCompletion(this.messages, options);
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

                // Execute tools
                for (const call of toolCalls) {
                    // Parse arguments
                    let args;
                    try {
                        args = JSON.parse(call.function.arguments);
                    } catch (e) {
                        console.error("Failed to parse tool arguments:", call.function.arguments);
                        if (this.logger) this.logger.error("Failed to parse tool arguments", e);
                        args = {};
                    }

                    if (this.logger) this.logger.info(`Executing tool: ${call.function.name}`, args);

                    // Execute
                    let result;
                    try {
                        result = await this.toolRegistry.execute(call.function.name, args);
                        if (this.logger) this.logger.debug(`Tool execution result:`, result);
                    } catch (err) {
                        result = JSON.stringify({ error: err.message });
                        if (this.logger) this.logger.error(`Tool execution failed : ${call.function.name}`, err);
                    }

                    // Add result to history
                    this.messages.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        name: call.function.name,
                        content: result
                    });
                }

                // RECURSIVE CALL: Get the next response from LLM (without new user input)
                yield* this.chat(null);

            } else {
                // Normal response
                this.addMessage('assistant', fullResponse);
            }

        } else {
            // Non-streaming logic (simplified for parity, but we mainly use streaming)
            const msg = response.choices[0]?.message;
            this.messages.push(msg);

            if (msg.tool_calls && msg.tool_calls.length > 0) {
                for (const call of msg.tool_calls) {
                    const args = JSON.parse(call.function.arguments);
                    const result = await this.toolRegistry.execute(call.function.name, args);
                    this.messages.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        name: call.function.name,
                        content: result
                    });
                }
                yield* this.chat(null);
            } else {
                yield msg.content;
            }
        }
    }
}

module.exports = ChatClient;
