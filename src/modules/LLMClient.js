const OpenAI = require('openai');

class LLMClient {
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.API_KEY;
        this.baseURL = config.baseURL || process.env.HOST;
        this.model = config.model || process.env.MODEL;
        // Handle boolean conversion for streaming
        this.streaming = config.streaming !== undefined
            ? config.streaming
            : (process.env.STREAMING === 'true');

        if (!this.apiKey) {
            console.warn('LLMClient Warning: API_KEY is missing.');
        }

        this.client = new OpenAI({
            apiKey: this.apiKey,
            baseURL: this.baseURL,
        });
    }

    async sendChatCompletion(messages, options = {}) {
        const model = options.model || this.model;
        const stream = options.streaming !== undefined ? options.streaming : this.streaming;
        const tools = options.tools; // Extract tools

        const requestBody = {
            model: model,
            messages: messages,
            stream: stream,
        };

        if (tools) {
            requestBody.tools = tools;
            requestBody.tool_choice = 'auto';
        }

        try {
            const response = await this.client.chat.completions.create(requestBody);

            return response;
        } catch (error) {
            console.error('LLMClient Error:', error);
            throw error;
        }
    }
}

module.exports = LLMClient;
