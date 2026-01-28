#!/usr/bin/env node
const path = require('node:path');
const fs = require('node:fs');
const {
  createMockGrpcServer,
  createDefaultBridgeHandlers,
  getFakeJsTsAnalysisResponse,
} = require('./grpc-helper.cjs');

const port = process.argv[2];
const host = process.argv[3];

console.log(`debugMemory: ${process.argv[4]}`);
console.log(`nodeTimeout: ${process.argv[5]}`);

let server;

// Create custom bridge handlers with close functionality
const bridgeHandlers = createDefaultBridgeHandlers({
  onClose: () => {
    server.forceShutdown();
  },
});

// Customize the initLinter handler to log the full request as JSON
bridgeHandlers.initLinter = (call, callback) => {
  const request = call.request;
  const logData = JSON.stringify({
    rules: (request.rules || []).map(r => ({
      key: r.key,
      fileTypeTargets: r.fileTypeTargets,
      configurations: r.configurations,
      analysisModes: r.analysisModes,
      blacklistedExtensions: r.blacklistedExtensions,
      language: r.language,
    })),
    environments: request.environments || [],
    globals: request.globals || [],
    baseDir: request.baseDir || '',
    sonarlint: request.sonarlint || false,
    bundles: request.bundles || [],
  });
  console.log(logData);
  callback(null, { success: true });
};

// Customize analyzeProject to match HTTP test expectations
bridgeHandlers.analyzeProject = call => {
  const request = call.request;
  const files = request.files || {};
  const skipAst = request.configuration?.skipAst || false;

  // Send a file result for each file
  Object.keys(files).forEach(filePath => {
    call.write({
      fileResult: {
        filename: filePath,
        analysis: getFakeJsTsAnalysisResponse(skipAst),
      },
    });
  });

  // Send final meta with empty warnings
  call.write({
    meta: { warnings: [] },
  });

  call.end();
};

server = createMockGrpcServer({
  port,
  host,
  bridgeHandlers,
  onClose: () => {
    server.forceShutdown();
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
