'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const config = require('config');
const errors = require('../errors');
const timeMessageController = require('../controllers').timeMessage;

const app = express();
app.use(bodyParser.json());

app.post('/time-message', (req, res) => {
    const reg = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/i;
    if (!req.body) {
        return res.sendStatus(400);
    }

    if (!req.body.time || !reg.test(req.body.time) || (new Date(req.body.time) < new Date())) {
        return res.status(400).send({ message: 'Time is not correct'});
    }

    if (!req.body.message || !req.body.message.length) {
        return res.status(400).send({ message: 'Message is not correct'});
    }

    // async
    timeMessageController.setTimeMessage(req.body);

    res.send({
        time: req.body.time,
        message: req.body.message
    })
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