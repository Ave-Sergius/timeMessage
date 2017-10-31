'use strict';

const ValidationError = require('../../errors').ValidationError;
const utils = require('../../helpers').utils;

module.exports = {
    timeMessage(req, res, next) {
        if (!req.body) {
            return next(new ValidationError());
        }

        if (!req.body.time || !utils.isStringIsoDate(req.body.time) || (new Date(req.body.time) < new Date())) {
            return next(new ValidationError('Time is not correct'));
        }

        if (!req.body.message || !req.body.message.length) {
            return next(new ValidationError('Message is not correct'));
        }

        next();
    }
};
