#!/usr/bin/env node

const http = require('http')
const port = process.argv[2]

const requestHandler = (request, response) => {
  response.end('Invalid response')
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
