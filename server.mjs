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
   */

  const port = process.argv[2];
  const host = process.argv[3];
  const debugMemory = process.argv[4] === 'true';

  let bundles = [];
  if (process.argv[8]) {
    bundles = process.argv[8].split(path.delimiter).map(bundleDir => pathToFileURL(bundleDir).href);
  }

  server.start(Number.parseInt(port), host, debugMemory, createWorker(new URL(import.meta.url)));
}
