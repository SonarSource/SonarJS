#!/usr/bin/env node
import { startServer } from './lib/grpc/src/server.js';
import { info, error as logError } from './lib/shared/src/helpers/logging.js';

const DEFAULT_PORT = 3000;

(async () => {
  const port = Number.parseInt(process.argv[2], 10) || DEFAULT_PORT;

  try {
    await startServer(port);
    info('SonarJS gRPC LanguageAnalyzerService started');
  } catch (error) {
    logError(`Failed to start gRPC server: ${error}`);
    process.exit(1);
  }
})();
