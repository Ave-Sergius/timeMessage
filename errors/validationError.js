'use strict';

const BaseError = require('./baseError');

class ValidationError extends BaseError {
    constructor(message) {
        super(message);
        this.message = message || 'Data validation error';
        this.status = 400;
    }
}

module.exports = ValidationError;
