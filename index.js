'use strict';

const config = require('config');

const server = require('./server');
const RedisDao = require('./daos').Redis;
const logger = require('./helpers').logger;
const timeMessageController = require('./controllers').timeMessage;

const redisListener = new RedisDao();

process.on('SIGINT', () => {
    Promise.all([redisListener.disconnect(), timeMessageController.redisDao.disconnect()]).then(() => {
        logger.error('SIGINT', () => {
            process.exit(1);
        });
    });
});

process.on('SIGTERM', () => {
    Promise.all([redisListener.disconnect(), timeMessageController.redisDao.disconnect()]).then(() => {
        logger.error('SIGTERM', () => {
            process.exit(1);
        });
    });
});

Promise.resolve().then(() => {
    const subscribeHandler = timeMessageController.newTimeMessageHandler.bind(timeMessageController);
    return redisListener.subscribe(`${config.get('redis.prefixName')}:event`, subscribeHandler);
}).then(() => {
    return timeMessageController.processUnresolvedTimeMessages((new Date()).valueOf());
}).then(() => {
    server.listen(process.env.PORT || config.get('server.port'), () => {
        logger.info(`App listening on port ${config.get('server.port')}`);
    });
}).catch(error => {
    logger.error(error.message, () => {
        process.exit(1);
    });
});
