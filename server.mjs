#!/usr/bin/env node
import { isMainThread } from 'node:worker_threads';
import { startServer } from './lib/grpc/src/server.js';

// import containing code which is only executed if it's a child process
import './lib/bridge/src/worker.js';

if (isMainThread) {
  /**
   * This script expects following arguments
   *
   * port - port number on which the gRPC server should listen (default: 0 for random port)
   *
   * Environment variables:
   * GRPC_PORT - alternative way to specify the port
   */

  const port = Number.parseInt(process.argv[2] || process.env.GRPC_PORT || '0', 10);

  Promise.resolve()
    .then(async () => {
      const server = await startServer(port);

      // Handle graceful shutdown
      process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully...');
        server.tryShutdown(() => {
          console.log('gRPC server shut down');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully...');
        server.tryShutdown(() => {
          console.log('gRPC server shut down');
          process.exit(0);
        });
      });
    })
    .catch(error => {
      console.error('Failed to start gRPC server:', error);
      process.exit(1);
    });
}
