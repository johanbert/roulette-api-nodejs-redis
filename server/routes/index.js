const express = require('express');
const app = express();
app.use(require('./roulette'));
module.exports = app;