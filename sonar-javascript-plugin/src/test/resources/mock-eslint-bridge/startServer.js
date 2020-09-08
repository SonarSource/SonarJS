#!/usr/bin/env node

/**
 * Note that any edits in this file have to be repackaged to the mock-eslint-bundle.tar.xz to be effective for tests
 */

const http = require("http");
const port = process.argv[2];


console.log(`additional rules: [${process.argv[3]}]`);

const requestHandler = (request, response) => {
  let data = "";
  request.on("data", (chunk) => (data += chunk));
  request.on("end", () => console.log(data));
  if (request.url === "/status" || request.url === "/new-tsconfig") {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("OK!");
  } else if (request.url === "/tsconfig-files") {
    response.end(
      "{files: ['abs/path/file1', 'abs/path/file2', 'abs/path/file3']}"
    );
  } else if (request.url === "/init-linter") {
    response.end("OK!");
  } else if (request.url === "/load-rule-bundles") {
    response.end("OK!");
  } else {
    response.end("{ issues: [] }");
  }
};

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log("something bad happened", err);
  }

  console.log(`server is listening on ${port}`);
});
