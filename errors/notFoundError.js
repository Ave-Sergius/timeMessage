'use strict';

const BaseError = require('./baseError');

class NotFoundError extends BaseError {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.message = message || 'Not found';
        this.status = 404;
    }
}

module.exports = NotFoundError;
