#!/usr/bin/env node
/**
 * Mock gRPC server that returns bad/invalid responses.
 * Used to test error handling when the bridge returns unexpected data.
 */
const { grpc, createMockGrpcServer, createDefaultBridgeHandlers } = require('./grpc-helper.cjs');

const port = process.argv[2];
const host = process.argv[3];

let server;

// Create handlers that return invalid responses for analysis methods
const bridgeHandlers = createDefaultBridgeHandlers({
  onClose: () => {
    server.forceShutdown();
  },
});

// Override analysis handlers to return an error via gRPC
bridgeHandlers.analyzeJsTs = (call, callback) => {
  // Return a gRPC INTERNAL error to simulate a bad response
  callback({
    code: grpc.status.INTERNAL,
    message: 'Invalid response',
  });
};

bridgeHandlers.analyzeCss = (call, callback) => {
  callback({
    code: grpc.status.INTERNAL,
    message: 'Invalid response',
  });
};

bridgeHandlers.analyzeYaml = (call, callback) => {
  callback({
    code: grpc.status.INTERNAL,
    message: 'Invalid response',
  });
};

bridgeHandlers.analyzeHtml = (call, callback) => {
  callback({
    code: grpc.status.INTERNAL,
    message: 'Invalid response',
  });
};

server = createMockGrpcServer({
  port,
  host,
  bridgeHandlers,
});
