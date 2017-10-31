'use strict';

const redisDao = require('../daos').redis;
const utils = require('../helpers').utils;
const schedule = require('node-schedule');

class TimeMessageController {
    constructor() {}

    newTimeMessageHandler() {
        return redisDao.handleNewTimeMessage().then(timeIso => {
            if (!timeIso) {
                return;
            }

            schedule.scheduleJob(new Date(timeIso), () => {
                return redisDao.smembers(timeIso).then(messages => {
                    console.log(messages);

                    messages.forEach(message => this.messageHandler(message));
                });
            });
        });
    }

    messageHandler(message) {
        console.log(message);
    }

    setTimeMessage(timeIso, message) {
        return redisDao.initNewTimeMessage(timeIso, message);
    }
}

module.exports = new TimeMessageController();
