'use strict';

const express = require('express');

const middlewares = require('../middlewares');
const timeMessageController = require('../../controllers').timeMessage;

const router = express.Router();

router.post('/echoAtTime', middlewares.validation.timeMessage, (req, res, next) => {
    timeMessageController.setTimeMessage(req.body.time, req.body.message).then(() => {
        res.send({
            time: req.body.time,
            message: req.body.message
        });
    }).catch(next);
});

module.exports = router;
