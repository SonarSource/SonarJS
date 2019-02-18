#!/usr/bin/env node

const http = require('http')
const port = process.argv[2]

console.log(`DEBUG testing debug log`)
console.log(`testing info log`)

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('OK!');
})

server.listen(port, () => {
  console.log(`server is listening on ${port}`)
})
