'use strict';

const logger = require('../../helpers').logger;

module.exports = (err, req, res, next) => {
    logger.error(err.stack);
    const status = err.status || 500;
    const message = err.message || 'Server error';
    res.status(status).send({
        status,
        message
    });
};
