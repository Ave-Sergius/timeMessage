'use strict';

const RedisConnection = require('./connections').Redis;
const logger = require('./helpers').logger;
const timeMessageController = require('./controllers').timeMessage;
const redisDao = require('./daos').redis;
const config = require('config');

const redisConnection = new RedisConnection();

process.on('SIGINT', () => {
    Promise.all([redisConnection.disconnect(), redisDao.destroy()]).then(() => {
        logger.error('SIGINT', () => {
            process.exit(1);
        });
    });
});

process.on('SIGTERM', () => {
    Promise.all([redisConnection.disconnect(), redisDao.destroy()]).then(() => {
        logger.error('SIGTERM', () => {
            process.exit(1);
        });
    });
});

Promise.resolve().then(() => {
    return Promise.all([redisConnection.connect(), redisDao.init()]);
}).then(() => {
    return redisConnection.subscribe(`${config.get('redis.prefixName')}:event`,
        timeMessageController.newTimeMessageHandler.bind(timeMessageController));
}).then(() => {
    return timeMessageController.processUnresolvedTimeMessages((new Date()).valueOf());
}).then(() => {
    require('./server');
}).catch(error => {
    logger.error(error.message, () => {
        process.exit(1);
    });
});
