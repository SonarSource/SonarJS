#!/usr/bin/env node

const http = require('http');
const port = process.argv[2];

console.log(`DEBUG testing debug log`)
console.log(`WARN testing warn log`)
console.log(`testing info log`)
console.error(`testing error log`)


const server = http.createServer(() => {});

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
});
