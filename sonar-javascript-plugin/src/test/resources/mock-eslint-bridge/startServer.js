#!/usr/bin/env node

const http = require("http");
const port = process.argv[2];
const host = process.argv[3];

console.log(`allowTsParserJsFiles: ${process.argv[5]}`);
console.log(`sonarlint: ${process.argv[6]}`);
console.log(`additional rules: [${process.argv[7]}]`);

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
  } else if (request.url === "/close") {
    response.end();
    server.close();
  } else {
    response.end("{ issues: [] }");
  }
};

const server = http.createServer(requestHandler);

server.listen(port, host, (err) => {
  if (err) {
    return console.log("something bad happened", err);
  }

  console.log(`server is listening on ${host} ${port}`);
});
