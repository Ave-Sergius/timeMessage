'use strict';

const utils = require('../../helpers').utils;
const ValidationError = require('../../errors').ValidationError;

module.exports = {
    timeMessage(req, res, next) {
        if (!req.body) {
            next(new ValidationError());
            return;
        }

        if (!req.body.time || !utils.isStringIsoDate(req.body.time) || (new Date(req.body.time) < new Date())) {
            next(new ValidationError('Time is not correct'));
            return;
        }

        if (!req.body.message || !req.body.message.length) {
            next(new ValidationError('Message is not correct'));
            return;
        }

        next();
    }
};
