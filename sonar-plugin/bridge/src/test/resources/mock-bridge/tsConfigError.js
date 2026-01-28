#!/usr/bin/env node
/**
 * Mock gRPC server that returns errors for tsconfig-related operations.
 * Used to test error handling for TypeScript configuration issues.
 */
const { grpc, createMockGrpcServer, createDefaultBridgeHandlers } = require('./grpc-helper.cjs');

const port = process.argv[2];
const host = process.argv[3];

let server;

const bridgeHandlers = createDefaultBridgeHandlers({
  onClose: () => {
    server.forceShutdown();
  },
});

// Override analyzeJsTs to return a parsing error
bridgeHandlers.analyzeJsTs = (call, callback) => {
  callback(null, {
    parsingError: {
      message: 'Other error',
      line: 0,
      code: 'GENERAL_ERROR',
    },
    issues: [],
  });
};

server = createMockGrpcServer({
  port,
  host,
  bridgeHandlers,
});
