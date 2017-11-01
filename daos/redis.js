'use strict';

const config = require('config');
const redis = require('redis');
const bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const errors = require('../errors');
const logger = require('../helpers').logger;

class RedisDao {
    constructor(options = {}) {
        this.client = null;
        this.logger = options.logger || logger;
        this.dbConnectionUrl = options.dbConnectionUrl || config.get('redis.connectionUrl');
        this.maxReconnectionTimes = options.maxReconnectionTimes || config.get('redis.maxReconnectionTimes');
        this.prefixName = options.prefixName || config.get('redis.prefixName');

        this.client = redis.createClient({
            url: this.dbConnectionUrl,
            retry_strategy: strategyOptions => {
                if (strategyOptions.error.code === 'ECONNREFUSED') {
                    return new errors.BaseError(options.error.message);
                }

                if (strategyOptions.times_connected > (this.maxReconnectionTimes || +Infinity)) {
                    const timesConnected = strategyOptions.times_connected;
                    return new errors.BaseError(`Redis connection error, Max time of reconnection ${timesConnected}`);
                }

                return Math.min(options.attempt * 100, 3000);
            }
        });

        this._setEvenHandlers();
    }

    _setEvenHandlers() {
        this.client.on('connect', () => {
            this.logger.info(`Redis ${this.dbConnectionUrl} - connected successfully`);
        });

        this.client.on('error', error => {
            this.logger.error(`Redis ${this.dbConnectionUrl} - connection error`, error);
        });

        this.client.on('end', () => {
            this.logger.info(`Redis ${this.dbConnectionUrl} - connection was closed`);
        });

        this.client.on('reconnecting', error => {
            this.logger.info(`Redis ${this.dbConnectionUrl} - connection it trying to reconnect ${error.attempt}`);
        });
    }

    disconnect() {
        return this.client.quitAsync();
    }

    subscribe(channelName, cb) {
        return this.client.subscribeAsync(channelName).then(() => {
            this.client.on('message', (channel, message) => {
                if (channel === channelName) {
                    cb(message);
                }
            });
        });
    }

    initNewTimeMessage(key, message) {
        return this.client.multi()
            .sadd(`${this.prefixName}:${key}`, message)
            .lpush(`${this.prefixName}:list`, key)
            .publish(`${this.prefixName}:event`, key)
            .execAsync();
    }

    setNewTimeMessage() {
        let timeIso;
        return this.client.lpopAsync(`${this.prefixName}:list`).then(_timeIso => {
            timeIso = _timeIso;

            if (!timeIso) {
                return;
            }

            return this.client.zaddAsync(`${this.prefixName}:sortedSet`, 'NX', (new Date(timeIso)).valueOf(), timeIso);
        }).then(() => {
            return timeIso;
        });
    }

    handleNewTimeMessage(key) {
        return this.client.multi()
            .smembers(`${this.prefixName}:${key}`)
            .del(`${this.prefixName}:${key}`)
            .zrem(`${this.prefixName}:sortedSet`, key)
            .execAsync()
            .then(results => {
                return results[0];
            });
    }

    getUnresolvedTimeMessages(borderScore) {
        let sortedKeys;
        return this.client.zrangebyscoreAsync(`${this.prefixName}:sortedSet`, 0, borderScore).then(_sortedKeys => {
            sortedKeys = _sortedKeys;
            if (!Array.isArray(sortedKeys) || !sortedKeys.length) {
                throw new errors.NotFoundError();
            }

            return Promise.all(sortedKeys.map(sortedKey => this.client.smembersAsync(`${this.prefixName}:${sortedKey}`)));
        }).then(results => {
            const members = results.reduce((accumulator, currentValue) => accumulator.concat(currentValue), []);

            const multi = this.client.multi();
            sortedKeys.forEach(sortedKey => multi.del(`${this.prefixName}:${sortedKey}`));
            multi.zremrangebyscore(`${this.prefixName}:sortedSet`, 0, borderScore);

            return multi.execAsync().then(() => members);
        }).catch(error => {
            if (error instanceof errors.NotFoundError) {
                return;
            }

            throw error;
        });
    }
}

module.exports = RedisDao;
