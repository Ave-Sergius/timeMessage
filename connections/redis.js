'use strict';

const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const BaseError = require('../errors').BaseError;
const config = require('config');
const logger = require('../helpers').logger;

class RedisConnection {
    constructor(options = {}) {
        this.client = null;
        this.logger = options.logger || logger;
        this.dbConnectionUrl = options.dbConnectionUrl || config.get('redis.connectionUrl');
        this.maxReconnectionTimes = options.maxReconnectionTimes || config.get('redis.maxReconnectionTimes');
        this.maxIntervalCount = options.maxIntervalCountToCheckConnection ||
            config.get('redis.maxIntervalCountToCheckConnection');
        this.intervalTimeToCheckConnection = options.intervalTimeToCheckConnection ||
            config.get('redis.intervalTimeToCheckConnection');
        this.subscribes = [];
    }

    connect() {
        this.client = redis.createClient({
            url: this.dbConnectionUrl,
            retry_strategy: options => {
                if (options.error.code === 'ECONNREFUSED') {
                    return new BaseError(options.error.message);
                }

                if (options.times_connected > (this.maxReconnectionTimes || +Infinity)) {
                    return new BaseError(`Redis connection error, Max time of reconnection ${options.times_connected}`);
                }

                return Math.min(options.attempt * 100, 3000);
            }
        });

        this._setEvenHandlers(this.client);

        let intervalsCount = 0;
        return new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                if (this.client.connected) {
                    clearInterval(interval);
                    return resolve();
                } else if (intervalsCount > this.maxIntervalCount) {
                    clearInterval(interval);
                    return reject({ message: 'maxIntervalCount'});
                }

                intervalsCount++;
            }, this.intervalTimeToCheckConnection);
        });
    }

    disconnect() {
        return this.client.quitAsync();
    }

    // general
    del(key) {
        return this.client.delAsync(key);
    }

    // set
    sadd(key, member) {
        return this.client.saddAsync(key, member);
    }

    srem(key, member) {
        return this.client.sremAsync(key, member);
    }

    smembers(key) {
        return this.client.smembersAsync(key);
    }

    // sorted set
    zadd(key, score, member, options = {}) {
        const args = [key];

        if (options.NX) {
            args.push('NX');
        }
        args.push(score);
        args.push(member);

        return this.client.zaddAsync(args);
    }

    zrem(key, member) {
        return this.client.zremAsync(key, member);
    }

    zrangebyscore(key, minScore, maxScore) {
        return this.client.zrangebyscoreAsync(key, minScore, maxScore);
    }

    zremrangebyscore(key, minScore, maxScore) {
        return this.client.zremrangebyscore(key, minScore, maxScore);
    }

    // list
    lpush(key, value) {
        return this.client.lpushAsync(key, value);
    }

    lpop(key) {
        return this.client.lpopAsync(key);
    }

    // publishing
    subscribe(channelName, cb) {
        return this.client.subscribeAsync(channelName).then(() => {
            this.client.on('message', (channel, message) => {
                if (channel === channelName) {
                    cb(message);
                }
            });
        });
    }

    publish(channelName, message) {
        return this.client.publishAsync(channelName, message);
    }

    // transactions

    multi(...functions) {
        return Promise.resolve();
    }

    _setEvenHandlers(client) {
        client.on('connect', () => {
            this.logger.info(`Redis ${this.dbConnectionUrl} - connected successfully`);
        });

        client.on('error', error => {
            this.logger.error(`Redis ${this.dbConnectionUrl} - connection error`, error);
        });

        client.on('end', () => {
            this.logger.info(`Redis ${this.dbConnectionUrl} - connection was closed`);
        });

        client.on('reconnecting', error => {
            this.logger.info(`Redis ${this.dbConnectionUrl} - connection it trying to reconnect ${error.attempt}`);
        });
    }
}

module.exports = RedisConnection;
