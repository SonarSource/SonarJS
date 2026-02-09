const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(session({secret: process.env.SESSION_SECRET}));
//      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^> {{Session middleware declared here.}}
app.use(express.static(path.join(__dirname, 'app/assets')));  // Noncompliant {{Move this static middleware before the session middleware.}}
