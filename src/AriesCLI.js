require('dotenv').config();
const Aries = require('./Aries');
const CLI = require('./modules/CLI');

function main() {
    try {
        const aries = new Aries();
        const cli = new CLI(aries.chatClient);
        cli.start();
    } catch (error) {
        console.error('Failed to start Aries CLI:', error);
    }
}

main();
