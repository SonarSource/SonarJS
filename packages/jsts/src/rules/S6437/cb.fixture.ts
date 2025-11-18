// Original test case
const cookieParser = require('cookie-parser');
const app = require('express')();

app.use(cookieParser('gaouàOran')); // Noncompliant
