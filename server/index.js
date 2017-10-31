'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const config = require('config');
const errors = require('../errors');
const timeMessageController = require('../controllers').timeMessage;
const validationMiddleware = require('./middlewares').validation;

const app = express();
app.use(bodyParser.json());

app.post('/echoAtTime', validationMiddleware.timeMessage, (req, res, next) => {
    timeMessageController.setTimeMessage(req.body.time, req.body.message).then(() => {
        res.send({
            time: req.body.time,
            message: req.body.message
        })
    }).catch(next);
});

app.use((req, res, next) => {
    next(new errors.NotFoundError());
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    const message = err.message || 'Server error';
    res.status(status).send({ status, message})
});

app.listen(config.get('server.port'), function () {
    console.log(`App listening on port ${config.get('server.port')}`)
});

module.exports = app;
