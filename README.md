# Aries Engine

Aries is a modular, AI-powered CLI agent designed to interact with OpenAI-compatible LLM services. It features a robust engine capable of tool execution (calculations, code execution, shell commands) and maintains conversation history with streaming responses.

## Features

- **LLM Integration**: Connects to any OpenAI-compatible provider (e.g., OpenRouter).
- **Interactive CLI**: A command-line interface with streaming responses.
- **Tool Support**:
  - **Filesystem Tools**: Safe file management (read, write, list, search).
- **Persona Management**: Configurable system persona via `src/SYSTEMCORE.md` and `src/PERSONALITY.md`.
- **Project Structure**:
## Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root directory (copy from `.env.example` if available, or use the template below):

```env
HOST=https://openrouter.ai/api/v1
API_KEY=your_api_key_here
MODEL=qwen/qwen3-coder-next
STREAMING=true
DEBUG=true
```

## Usage

Start the CLI application:

```bash
npm start
```

### CLI Commands

- `/exit` or `/quit`: Exit the application.
- `/clear`: Clear the conversation history.
- `/history`: View the conversation history (including hidden tool calls).

## Project Structure

- `src/Aries.js`: Main engine entry point.
- `src/modules/`: Core modules (LLMClient, ChatClient, ToolRegistry, Logger).
- `src/tools/`: Tool implementations (FileSystemTools).
- `src/AriesCLI.js`: CLI runner script.
- `src/SYSTEMCORE.md`: System prompt definition.

## Architecture

Aries is built with a focus on modularity:
- **LLMClient**: Handles low-level API communication.
- **ChatClient**: Manages state, conversation history, and the tool execution loop.
- **ToolRegistry**: Registry for available tools.
- **filesystem_tools**: Provides safe file system access (read/write/search) to the LLM.
