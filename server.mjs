#!/usr/bin/env node
import { isMainThread } from 'node:worker_threads';
import * as server from './lib/bridge/src/server.js';
import path from 'path';
import * as context from './lib/shared/src/helpers/context.js';
import { pathToFileURL } from 'node:url';
import { createWorker } from './lib/shared/src/helpers/worker.js';
import { getContext } from './lib/shared/src/helpers/context.js';

// import containing code which is only executed if it's a child process
import './lib/bridge/src/worker.js';

if (isMainThread) {
  /**
   * This script expects following arguments
   *
   * port - port number on which server.mjs should listen
   * host - host address on which server.mjs should listen
   * workDir - working directory from SonarQube API
   * shouldUseTypeScriptParserForJS - whether TypeScript parser should be used for JS code (default true, can be set to false in case of perf issues)
   * sonarlint - when running in SonarLint (used to not compute metrics, highlighting, etc)
   * bundles - ; or : delimited paths to additional rule bundles
   */

  const port = process.argv[2];
  const host = process.argv[3];
  const workDir = process.argv[4];
  const shouldUseTypeScriptParserForJS = process.argv[5] !== 'false';
  const sonarlint = process.argv[6] === 'true';
  const debugMemory = process.argv[7] === 'true';

  let bundles = [];
  if (process.argv[8]) {
    bundles = process.argv[8].split(path.delimiter).map(bundleDir => pathToFileURL(bundleDir).href);
  }

  context.setContext({ workDir, shouldUseTypeScriptParserForJS, sonarlint, debugMemory, bundles });
  server.start(
    Number.parseInt(port),
    host,
    createWorker(new URL(import.meta.url), getContext()),
    6000000,
  );
}
