class Logger {
    constructor() {
        this.debugMode = process.env.DEBUG === 'true';
    }

    _formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        let log = `[${timestamp}] [${level}] ${message}`;
        if (data) {
            if (data instanceof Error) {
                log += `\n${data.stack || data.message}`;
            } else {
                log += `\n${JSON.stringify(data, null, 2)}`;
            }
        }
        return log;
    }

    info(message, data) {
        console.log(this._formatMessage('INFO', message, data));
    }

    warn(message, data) {
        console.warn(this._formatMessage('WARN', message, data));
    }

    error(message, error) {
        console.error(this._formatMessage('ERROR', message, error));
    }

    debug(message, data) {
        if (this.debugMode) {
            console.log(this._formatMessage('DEBUG', message, data));
        }
    }
}

module.exports = Logger;
