#!/usr/bin/env node

const http = require("http");
const port = process.argv[2];

let server;

const requestHandler = async (request, response) => {
  if (request.url === "/status") {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("OK!");
  } else if (request.url === "/close") {
    response.end();
    server.close();
  } else {
    await sleep(5000);
  }
};

server = http.createServer(requestHandler);

server.listen(port, err => {
  if (err) {
    return console.log("something bad happened", err);
  }

  console.log(`server is listening on ${port}`);
});

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
