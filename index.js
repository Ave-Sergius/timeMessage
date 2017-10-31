'use strict';

const RedisDao = require('./daos').Redis;
const logger = require('./helpers').logger;
const timeMessageController = require('./controllers').timeMessage;
const config = require('config');

const redisListener = new RedisDao();

process.on('SIGINT', () => {
    Promise.all([redisListener.disconnect(), timeMessageController.redisDao.destroy()]).then(() => {
        logger.error('SIGINT', () => {
            process.exit(1);
        });
    });
});

process.on('SIGTERM', () => {
    Promise.all([redisListener.disconnect(), timeMessageController.redisDao.destroy()]).then(() => {
        logger.error('SIGTERM', () => {
            process.exit(1);
        });
    });
});

Promise.resolve().then(() => {
    return redisListener.subscribe(`${config.get('redis.prefixName')}:event`,
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
