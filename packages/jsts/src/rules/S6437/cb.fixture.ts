const cookieParser = require('cookie-parser')
const app = require('express')()

app.use(cookieParser('kekse'))
