'use strict';

class BaseError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.message = message || 'Server error';
        this.status = 500;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = BaseError;
