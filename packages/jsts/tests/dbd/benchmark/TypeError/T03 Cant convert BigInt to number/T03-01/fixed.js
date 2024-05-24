// const express = require("express");
// const app = express();

// Mocking Express.js' app object
const app = {
    all: (path, validateAccessToken, callback) => {
        callback({ query: { expire: 42 } }, { send: () => {} });
    }
}
const Config = { Debug: false }

const MAX_EXPIRATION_SECONDS = 2147483647n; // (68 years)

function validateAccessToken(req, res, next) {
    // const accessToken = req.headers['x-access-token'] || req.query.token;

    // if (Config.APIToken === accessToken) {
    //     next();
    // } else {
    //     res.status(401).json({ error: 'Invalid access token' });
    // }
}

app.all('/set', validateAccessToken, async (req, res, next) => {
    const expire = req.query.expire !== undefined ? Math.min(req.query.expire, 2147483647) : 0;
    if (Config.Debug) console.log(`SET | Key: ${req.query.key} | Value: ${req.query.value} | Expire: ${expire}`);

    // Cache.put(req.query.key, {
    //     expire: expire,
    //     value: btoa(req.query.value)
    // }, expire * 1000);

    return res.send({ success: true });
});
