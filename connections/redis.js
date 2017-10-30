'use strict';

const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const BaseError = require('../errors').BaseError;
const config = require('config');
const logger = require('../helpers').logger;

class RedisConnection {
    constructor(logger, dbConnectionUrl, maxReconnectionTimes, maxIntervalCountToCheckConnection,
                intervalTimeToCheckConnection) {
        this.client = null;
        this.logger = logger;
        this.dbConnectionUrl = dbConnectionUrl;
        this.maxReconnectionTimes = maxReconnectionTimes;
        this.maxIntervalCount = maxIntervalCountToCheckConnection;
        this.intervalTimeToCheckConnection = intervalTimeToCheckConnection;
    }

    connect() {
        this.client = redis.createClient({
            url: this.dbConnectionUrl,
            retry_strategy: options => {
                if (options.error.code === 'ECONNREFUSED') {
                    // End reconnecting on a specific error and flush all commands with a individual error
                    return new BaseError(options.error.message);
                }

                if (options.times_connected > (this.maxReconnectionTimes || +Infinity)) {
                    // End reconnecting with built in error
                    return new BaseError(`Redis connection error, Max time of reconnection ${options.times_connected}`);
                }

                // reconnect after
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

    getClient() {
        if (this.client.connected) {
            return this.client;
        } else {
            return null;
        }
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

module.exports = new RedisConnection(logger, config.get('redis.connectionUrl'),
    config.get('redis.maxReconnectionTimes'), config.get('redis.maxIntervalCountToCheckConnection'),
    config.get('redis.intervalTimeToCheckConnection'));
