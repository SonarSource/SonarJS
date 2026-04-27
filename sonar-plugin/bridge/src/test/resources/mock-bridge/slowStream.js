#!/usr/bin/env node
const path = require('node:path');
const fs = require('node:fs');
const { startAnalyzeProjectGrpcServer } = require('./analyzeProjectGrpcServer');

const port = process.argv[2];
const host = process.argv[3];

console.log(`debugMemory: ${process.argv[4]}`);
console.log(`nodeTimeout: ${process.argv[5]}`);

function getFakeAnalysisResponse(skipAst) {
  const res = {
    issues: [
      {
        line: 0,
        column: 0,
        endLine: 0,
        endColumn: 0,
        quickFixes: [
          {
            edits: [
              {
                loc: {},
              },
            ],
          },
        ],
      },
    ],
    highlights: [{ location: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 } }],
    metrics: {},
    highlightedSymbols: [{}],
    cpdTokens: [{}],
  };

  if (!skipAst) {
    res.ast = fs
      .readFileSync(path.join(__dirname, '..', 'files', 'serialized.proto'))
      .toString('base64');
  }
  return res;
}

startAnalyzeProjectGrpcServer(port, host, {
  AnalyzeProject: async call => {
    const request = call.request;
    const files = request.files || {};
    const skipAst = request.configuration?.skipAst;

    await sleep(1_500);

    for (const filePath of Object.keys(files)) {
      call.write({
        fileResult: {
          filePath,
          result: getFakeAnalysisResponse(skipAst),
        },
      });
    }

    call.write({
      meta: {
        warnings: [],
      },
    });
    call.end();
  },
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
