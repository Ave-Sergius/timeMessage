'use strict';

const errors = require('../../errors');

module.exports = (req, res, next) => {
    next(new errors.NotFoundError());
};
