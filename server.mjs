#!/usr/bin/env node
import { isMainThread } from 'node:worker_threads';
import * as server from './lib/bridge/src/server.js';
import path from 'path';
import { pathToFileURL } from 'node:url';
import { createWorker } from './lib/shared/src/helpers/worker.js';

// import containing code which is only executed if it's a child process
import './lib/bridge/src/worker.js';

if (isMainThread) {
  /**
   * This script expects following arguments
   *
   * port - port number on which server.mjs should listen
   * host - host address on which server.mjs should listen
   * debugMemory - print memory usage
   */

  const port = process.argv[2];
  const host = process.argv[3];
  const debugMemory = process.argv[4] === 'true';

  server.start(Number.parseInt(port), host, createWorker(new URL(import.meta.url)), debugMemory);
}
