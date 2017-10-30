'use strict';

const redisConnection = require('../connections').redis;

class TimeMessage {
    constructor() {

    }

    messageHandler(message) {
        console.log(message);
    }

    setTimeMessage({ time, message }) {
        // add to times set
        // add "time" ordered set NX
        // push notification in chanel

        return Promise.resolve();
    }
}

module.exports = new TimeMessage();