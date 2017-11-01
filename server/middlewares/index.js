'use strict';

const validation = require('./validation');
const errorHandler = require('./errorHandler');
const notFoundHandler = require('./notFoundHandler');

module.exports = {
    validation,
    errorHandler,
    notFoundHandler
};
