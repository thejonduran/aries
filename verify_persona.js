require('dotenv').config();
const Aries = require('./src/Aries');

function verifyPersonaLoading() {
    console.log('--- Verifying Persona Loading ---');

    // Mock logger to suppress errors during test if needed, but we want to see them
    const aries = new Aries();

    // Access the chat client directly to inspect the system message
    const messages = aries.chatClient.getHistory();
    const systemMsg = messages.find(m => m.role === 'system');

    if (!systemMsg) {
        console.error('FAIL: No system message found.');
        return;
    }

    console.log('System Message Found. Checking content...');

    const content = systemMsg.content;
    const hasCore = content.includes('=== SYSTEM CORE ===');
    const hasPersona = content.includes('=== PERSONALITY MODULE ===');

    if (hasCore) console.log('PASS: SYSTEMCORE instructions present.');
    else console.error('FAIL: SYSTEMCORE instructions missing.');

    if (hasPersona) console.log('PASS: PERSONALITY module present.');
    else console.error('FAIL: PERSONALITY module missing.');

    if (content.includes('You are Aries, a helpful AI assistant built for Jonat.')) {
        console.log('PASS: Specific persona text found.');
    }

    // Print a snippet
    console.log('\n--- Content Snippet ---');
    console.log(content.substring(0, 200) + '...');
}

verifyPersonaLoading();
