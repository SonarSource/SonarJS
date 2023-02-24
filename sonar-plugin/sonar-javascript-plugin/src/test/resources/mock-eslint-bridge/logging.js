#!/usr/bin/env node

const http = require('http')
const port = process.argv[2]
const host = process.argv[3]

console.log(`DEBUG testing debug log`)
console.log(`WARN testing warn log`)
console.log(`testing info log`)

if (process.env.BROWSERSLIST_IGNORE_OLD_DATA) {
  console.log("BROWSERSLIST_IGNORE_OLD_DATA is set to true");
}

const server = http.createServer((req, res) => {
  if (req.url === "/close") {
    res.end();
    server.close();
  } else {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('OK!');
  }
})
server.keepAliveTimeout = 100  // this is used so server disconnects faster

server.listen(port, host, () => {
  console.log(`server is listening on ${host} ${port}`);
})
