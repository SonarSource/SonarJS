#!/usr/bin/env node

const http = require("http");
const port = process.argv[2];
const host = process.argv[3];

const requestHandler = (request, response) => {
  if (request.url === "/status") {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("OK!");
    server.close();
  }
};

const server = http.createServer(requestHandler);
server.keepAliveTimeout = 100  // this is used so server disconnects faster

server.listen(port, host, (err) => {
  if (err) {
    return console.log("something bad happened", err);
  }

  console.log(`server is listening on ${host} ${port}`);
});
