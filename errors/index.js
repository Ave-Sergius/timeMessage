'use strict';

const BaseError = require('./baseError');
const NotFoundError = require('./notFoundError');
const ValidationError = require('./validationError');

module.exports = {
    NotFoundError,
    ValidationError,
    BaseError
};
