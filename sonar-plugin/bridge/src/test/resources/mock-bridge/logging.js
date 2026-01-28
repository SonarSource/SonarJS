#!/usr/bin/env node
/**
 * Mock gRPC server that logs various messages.
 * Used to test log forwarding from the bridge.
 */
const { createMockGrpcServer, createDefaultBridgeHandlers } = require('./grpc-helper.cjs');

const port = process.argv[2];
const host = process.argv[3];

// Log test messages before server starts
console.log(`DEBUG testing debug log`);
console.log(`WARN testing warn log`);
console.log(`testing info log`);

if (process.env.BROWSERSLIST_IGNORE_OLD_DATA) {
  console.log('BROWSERSLIST_IGNORE_OLD_DATA is set to true');
}

let server;

const bridgeHandlers = createDefaultBridgeHandlers({
  onClose: () => {
    server.forceShutdown();
  },
});

server = createMockGrpcServer({
  port,
  host,
  bridgeHandlers,
});
