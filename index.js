'use strict';

const redisConnection = require('./connections').redis;
const logger = require('./helpers').logger;
const config = require('config');

process.on('SIGINT', () => {
    redisConnection.disconnect().then(() => {
        logger.error('SIGINT', () => {
            process.exit(1);
        });
    });
});

process.on('SIGTERM', () => {
    redisConnection.disconnect().then(() => {
        logger.error('SIGTERM', () => {
            process.exit(1);
        });
    });
});

Promise.resolve().then(() => {
    return redisConnection.connect();
}).then(() => {




}).then(() => {
    require('./server');
}).catch(error => {
    logger.error(error.message, () => {
        process.exit(1);
    });
});
