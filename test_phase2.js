require('dotenv').config();
const Aries = require('./src/Aries');
const Logger = require('./src/modules/Logger');
const ToolLoader = require('./src/utils/ToolLoader');
const path = require('path');

async function runTests() {
    console.log('--- Starting Aries Phase 2 E2E Tests ---\n');

    // Setup Engine exactly like index.js
    const logger = new Logger();
    const systemPrompt = "You are a test assistant. Keep your answers extremely short (1 sentence max).";

    // Test 1: Dynamic Tool Loading
    console.log('Test 1: Dynamic Tool Loading');
    const toolsDir = path.join(__dirname, 'src', 'tools');
    const activeTools = ToolLoader.loadTools(toolsDir, logger);
    if (activeTools.length > 0) {
        console.log(`✅ Passed: Successfully loaded ${activeTools.length} tools.\n`);
    } else {
        console.error(`❌ Failed: No tools loaded.\n`);
    }

    const aries = new Aries({ systemPrompt, tools: activeTools, logger });

    // Test 2: Multi-Session Isolation
    console.log('Test 2: Multi-Session Isolation');
    const session1 = aries.sessionManager.getSession('user-alice');
    const session2 = aries.sessionManager.getSession('user-bob');

    // Simulate chat
    await streamToString(session1.chat("Hi, my name is Alice."));
    await streamToString(session2.chat("Hi, my name is Bob."));

    const ans1 = await streamToString(session1.chat("What is my name?"));
    const ans2 = await streamToString(session2.chat("What is my name?"));

    let isolationPassed = true;
    if (!ans1.includes("Alice")) { isolationPassed = false; console.error("❌ Session 1 failed to remember Alice."); }
    if (!ans2.includes("Bob")) { isolationPassed = false; console.error("❌ Session 2 failed to remember Bob."); }
    if (ans1.includes("Bob") || ans2.includes("Alice")) { isolationPassed = false; console.error("❌ Sessions bled into each other."); }

    if (isolationPassed) console.log('✅ Passed: Sessions are fully isolated.\n');

    // Test 3: Context Window Truncation
    console.log('Test 3: Context Window Truncation');
    console.log('Spamming session 1 to trigger maxHistoryLength...');

    // Force a low history limit for testing
    session1.maxHistoryLength = 4; // Keep only system, last 2 msgs, etc (rough cut)

    for (let i = 1; i <= 10; i++) {
        await streamToString(session1.chat(`This is spam message number ${i}. Just acknowledge it.`));
    }

    const history = session1.getHistory();
    // Expected: System prompt + the last few messages we just sent
    const hasSystem = history[0].role === 'system';
    const isTruncated = history.length <= (session1.maxHistoryLength + 5);

    if (hasSystem && isTruncated) {
        console.log(`✅ Passed: History truncated successfully to ${history.length} items while retaining the System Prompt.\n`);
    } else {
        console.error(`❌ Failed: Truncation logic error. HasSystem: ${hasSystem}, Length: ${history.length}\n`);
    }

    console.log('--- Tests Complete ---');
    process.exit(0);
}

// Helper to collapse stream into a single string
async function streamToString(stream) {
    let result = '';
    for await (const chunk of stream) {
        result += chunk;
    }
    return result;
}

runTests();
