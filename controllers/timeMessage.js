'use strict';

const schedule = require('node-schedule');

const RedisDao = require('../daos').Redis;

class TimeMessageController {
    constructor(options = {}) {
        this.redisDao = options.redisDao || new RedisDao();
    }

    newTimeMessageHandler() {
        return this.redisDao.setNewTimeMessage().then(timeIso => {
            if (!timeIso) {
                return;
            }

            schedule.scheduleJob(new Date(timeIso), () => {
                return this.redisDao.handleNewTimeMessage(timeIso).then(messages => {
                    if (Array.isArray(messages)) {
                        messages.forEach(message => this.messageHandler(message));
                    }
                });
            });
        });
    }

    messageHandler(message) {
        console.log(message);
    }

    setTimeMessage(timeIso, message) {
        return this.redisDao.initNewTimeMessage(timeIso, message);
    }

    processUnresolvedTimeMessages(borderScore) {
        return this.redisDao.getUnresolvedTimeMessages(borderScore).then(messages => {
            if (Array.isArray(messages)) {
                messages.forEach(message => this.messageHandler(message));
            }
        });
    }
}

module.exports = new TimeMessageController();
