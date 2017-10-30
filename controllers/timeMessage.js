'use strict';

const redisConnection = require('../connections').redis;
const schedule = require('node-schedule');

class TimeMessageController {
    constructor() {

    }

    addTimeHandler(timeISO) {
        schedule.scheduleJob(new Date(timeISO), () => {
            return redisConnection.smembers(timeISO).then(messages => {
                console.log(messages);

                messages.forEach(message => this.messageHandler(message));
            });
        });
    }

    messageHandler(message) {
        console.log(message);
    }

    setTimeMessage(timeISO, message, channelName) {
        return redisConnection.sadd(timeISO, message).then(() => {
            return redisConnection.zadd(channelName, (new Date(timeISO)).valueOf(), timeISO, { NX: true });
        }).then(() => {
            return redisConnection.publish(channelName, timeISO);
        }).then(() => {
            return redisConnection.srem(timeISO, message).then(result => {
                console.log(result);
            });
        });
    }

    subscribe(channelName) {
        return redisConnection.subscribe(channelName, this.addTimeHandler.bind(this))
    }
}

module.exports = new TimeMessageController();
