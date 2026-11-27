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
    // The clear version of serialized.proto is `packages/analysis/tests/jsts/parsers/fixtures/ast/base.js`.
    res.ast = fs
      .readFileSync(path.join(__dirname, '..', 'files', 'serialized.proto'))
      .toString('base64');
  }
  return res;
}

startAnalyzeProjectGrpcServer(port, host, {
  AnalyzeProject: call => {
    const request = call.request;
    const files = request.files || {};
    const skipAst = request.configuration?.skipAst;

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
  AnalyzeProjectUnary: (call, callback) => {
    const request = call.request;
    const skipAst = request.configuration?.skipAst;
    const files = {};
    Object.keys(request.files || {}).forEach(key => {
      files[key] = getFakeAnalysisResponse(skipAst);
    });
    callback(null, {
      files,
      meta: {},
    });
  },
});

process.on('exit', () => {
  console.log(`
Rule                                 | Time (ms) | Relative
:------------------------------------|----------:|--------:
no-commented-code                    |   633.226 |    16.8%
arguments-order                      |   398.175 |    10.6%
deprecation                          |   335.577 |     8.9%
  `);
});
