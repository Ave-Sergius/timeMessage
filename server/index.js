'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const router = require('./router');
const middlewares = require('./middlewares');

const app = express();

app.use(bodyParser.json());
app.use(router);
app.use(middlewares.notFoundHandler);
app.use(middlewares.errorHandler);

module.exports = app;
