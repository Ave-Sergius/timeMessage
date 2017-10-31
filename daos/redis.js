'use strict';

const RedisConnection = require('../connections').Redis;
const config = require('config');

class RedisDao {
    constructor(options = {}) {
        this.redis = new RedisConnection();
        this.prefixName = options.prefixName || config.get('redis.prefixName')
    }

    init() {
        return this.redis.connect();
    }

    destroy() {
        return this.redis.disconnect();
    }

    initNewTimeMessage(key, message) {
        return this.redis.sadd(`${this.prefixName}:${key}`, message).then(() => {
            return this.redis.lpush(`${this.prefixName}:list`, key);
        }).then(() => {
            return this.redis.publish(`${this.prefixName}:event`, key);
        });
    }

    setNewTimeMessage(key) {
        let timeIso;
        return this.redis.lpop(`${this.prefixName}:list`, key).then(_timeIso => {
            timeIso = _timeIso;

            if (!timeIso) {
                return;
            }

            return this.redis.zadd(`${this.prefixName}:sortedSet`, (new Date(timeIso)).valueOf(), timeIso, { NX: true });
        }).then(() => {
            return timeIso;
        });
    }

    handleNewTimeMessage(key) {
        let members;
        return this.redis.smembers(`${this.prefixName}:${key}`).then(_members => {
            members = _members;
            return this.redis.del(`${this.prefixName}:${key}`);
        }).then(() => {
            return this.redis.zrem(`${this.prefixName}:sortedSet`, key);
        }).then(() => {
            return members;
        });
    }
}

module.exports = new RedisDao();
