require('./config/config')
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(require('./routes/index'));
app.listen(process.env.PORT, () => console.log(`Listening PORT:${process.env.PORT}`));
