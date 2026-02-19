class Logger {
    constructor() {
        this.debugMode = process.env.DEBUG === 'true';
        this.listeners = [];
    }

    onLog(callback) {
        this.listeners.push(callback);
    }

    _emitLog(level, message, data) {
        // Filter debug logs early if debugMode is off? 
        // Actually, the requirement is to push to ChatClient ALWAYS (as debug messages),
        // and toggle visibility in CLI.
        // So we should emit everything, and let the listeners decide.
        // Wait, if debugMode is off in .env, maybe we shouldn't even generate them?
        // "We will toggle debug visibility right within the chat client using /Debug command."
        // This implies run-time toggling. So .env DEBUG might just be a default.
        // Let's emit everything.

        const timestamp = new Date().toISOString();
        const logEvent = {
            timestamp,
            level,
            message,
            data
        };

        this.listeners.forEach(callback => callback(logEvent));
    }

    info(message, data) {
        this._emitLog('INFO', message, data);
    }

    warn(message, data) {
        this._emitLog('WARN', message, data);
    }

    error(message, error) {
        this._emitLog('ERROR', message, error);
    }

    debug(message, data) {
        // We emit debug logs regardless of process.env.DEBUG 
        // to allow runtime toggling in the CLI/Chat.
        this._emitLog('DEBUG', message, data);
    }
}

module.exports = Logger;
