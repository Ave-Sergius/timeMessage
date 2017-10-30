'use strict';

const winston = require('winston');

class Logger {
    constructor() {
        this.logger = new winston.Logger({
            transports: [
                new winston.transports.Console()
            ]
        });
    }

    info(...args) {
        this.logger.info(...args);
    }

    error(...args) {
        this.logger.error(...args);
    }

    warn(...args) {
        this.logger.warn(...args);
    }
}

module.exports = new Logger();
