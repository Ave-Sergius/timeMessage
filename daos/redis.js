'use strict';

const config = require('config');
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const BaseError = require('../errors').BaseError;
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
        return this.client.saddAsync(`${this.prefixName}:${key}`, message).then(() => {
            return this.client.lpushAsync(`${this.prefixName}:list`, key);
        }).then(() => {
            return this.client.publishAsync(`${this.prefixName}:event`, key);
        });
    }

    setNewTimeMessage(key) {
        let timeIso;
        return this.client.lpopAsync(`${this.prefixName}:list`, key).then(_timeIso => {
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
        let members;
        return this.client.smembersAsync(`${this.prefixName}:${key}`).then(_members => {
            members = _members;
            return this.client.delAsync(`${this.prefixName}:${key}`);
        }).then(() => {
            return this.client.zremAsync(`${this.prefixName}:sortedSet`, key);
        }).then(() => {
            return members;
        });
    }

    getUnresolvedTimeMessages(borderScore) {
        let sortedKeys;
        return this.client.zrangebyscoreAsync(`${this.prefixName}:sortedSet`, 0, borderScore).then(_sortedKeys => {
            sortedKeys = _sortedKeys;
            if (!Array.isArray(sortedKeys) || !sortedKeys.length) {
                return;
            }

            // async
            this.client.zremrangebyscoreAsync(`${this.prefixName}:sortedSet`, 0, borderScore);

            const promises = sortedKeys.map(sortedKey => this.client.smembersAsync(sortedKey).then(members => {
                return this.client.delAsync(sortedKey).then(() => members);
            }));

            return Promise.all(promises)
                .then(results => results.reduce((accumulator, currentValue) => accumulator.concat(currentValue), []));
        });
    }
}

module.exports = RedisDao;
