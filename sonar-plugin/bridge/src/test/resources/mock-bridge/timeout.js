#!/usr/bin/env node
/**
 * Mock gRPC server that times out on analysis requests.
 * Used to test timeout handling.
 */
const { createMockGrpcServer, createDefaultBridgeHandlers } = require('./grpc-helper.cjs');

const port = process.argv[2];
const host = process.argv[3];

let server;

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

const bridgeHandlers = createDefaultBridgeHandlers({
  onClose: () => {
    server.forceShutdown();
  },
});

// Override analysis handlers to delay/timeout (2 seconds > 1 second test timeout)
bridgeHandlers.analyzeJsTs = async (call, callback) => {
  await sleep(2000);
  callback(null, { issues: [] });
};

bridgeHandlers.analyzeCss = async (call, callback) => {
  await sleep(2000);
  callback(null, { issues: [] });
};

bridgeHandlers.analyzeYaml = async (call, callback) => {
  await sleep(2000);
  callback(null, { issues: [] });
};

bridgeHandlers.analyzeHtml = async (call, callback) => {
  await sleep(2000);
  callback(null, { issues: [] });
};

bridgeHandlers.analyzeProject = async call => {
  await sleep(2000);
  call.end();
};

server = createMockGrpcServer({
  port,
  host,
  bridgeHandlers,
});
