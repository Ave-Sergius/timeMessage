'use strict';

const redisDao = require('../daos').redis;
const schedule = require('node-schedule');

class TimeMessageController {
    constructor() {}

    newTimeMessageHandler() {
        return redisDao.setNewTimeMessage().then(timeIso => {
            if (!timeIso) {
                return;
            }

            schedule.scheduleJob(new Date(timeIso), () => {
                return redisDao.handleNewTimeMessage(timeIso).then(messages => {
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
        return redisDao.initNewTimeMessage(timeIso, message);
    }
}

module.exports = new TimeMessageController();
