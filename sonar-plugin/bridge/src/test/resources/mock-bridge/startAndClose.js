#!/usr/bin/env node
/**
 * Mock gRPC server that shuts down immediately after health check.
 * Used to test server failure scenarios.
 */
const { createMockGrpcServer, createHealthCheckHandler, SERVING } = require('./grpc-helper.cjs');

const port = process.argv[2];
const host = process.argv[3];

let server;
let healthCheckReceived = false;

// Custom health handler that shuts down the server after first health check
const healthHandler = (call, callback) => {
  const serviceName = call.request.service || '';
  const isKnownService =
    serviceName === '' ||
    serviceName === 'bridge.BridgeService' ||
    serviceName === 'analyzer.LanguageAnalyzerService';

  if (!isKnownService) {
    const grpc = require('@grpc/grpc-js');
    callback({
      code: grpc.status.NOT_FOUND,
      message: `Service "${serviceName}" not found`,
    });
    return;
  }

  callback(null, { status: SERVING });

  // Shutdown server after first successful health check
  if (!healthCheckReceived) {
    healthCheckReceived = true;
    setImmediate(() => {
      server.forceShutdown();
    });
  }
};

server = createMockGrpcServer({
  port,
  host,
  healthHandler,
});
