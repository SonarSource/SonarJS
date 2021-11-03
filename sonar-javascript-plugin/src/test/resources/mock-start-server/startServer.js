#!/usr/bin/env node

const http = require('http');
const port = process.argv[2];

const requestHandler = (request, response) => {
  let data = [];
  request.on('data', chunk => {
    data.push(chunk);
  });
  request.on('end', () => {
    let fileName = null;
    let fileContent = null;
    if (data.length > 0) {
      const analysisRequest = JSON.parse(data.join());
      fileName = analysisRequest.filePath.replace(/.*[\/\\]/g,"");
      fileContent = analysisRequest.fileContent;
    }
    if (request.url === '/status') {
      response.writeHead(200, { 'Content-Type': 'text/plain' });
      response.end('OK!');
    } else {
      switch (fileName) {
        case "file.css":
        case "file.web":
        case "file.php":
        case "file.vue":
        case "file.js": // to test that we will not save this issue even if it's provided by response
          response.end(JSON.stringify([
            {line: 2, rule: "block-no-empty", text: "Unexpected empty block"}
          ]));
          break;
        case "file-with-rule-id-message.css":
          response.end(JSON.stringify([
            {line: 2, rule: "color-no-invalid-hex", text: "some message (color-no-invalid-hex)"}
          ]));
          break;
        case "empty.css":
          response.end(JSON.stringify([]));
          break;
        case "syntax-error.css":
        case "syntax-error.web":
          response.end(JSON.stringify([
            {line: 2, rule: "CssSyntaxError", text: "Missed semicolon (CssSyntaxError)"}
          ]));
          break;
        case "unknown-rule.css":
          response.end(JSON.stringify([
            {line: 2, rule: "unknown-rule-key", text: "some message"}
          ]));
          break;
        case "invalid-json-response.css":
          response.end("[");
          break;
        case "copy-file-content-into-issue-message.css":
          response.end(JSON.stringify([
            {line: 1, rule: "block-no-empty", text: "" + fileContent}
          ]));
          break;
        default:
          throw "Unexpected fileName: " + fileName;
      }
    }
  });
};

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
});
