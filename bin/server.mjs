#!/usr/bin/env node

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

import * as server from '../lib/server.js';
import path from 'path';
import * as context from '../lib/shared/src/helpers/context.js';

const port = process.argv[2] ?? 60001;
const host = process.argv[3];
const workDir = process.argv[4];
const shouldUseTypeScriptParserForJS = process.argv[5] !== 'false';
const sonarlint = process.argv[6] === 'true';
const debugMemory = process.argv[7] === 'true';

let bundles = [];
if (process.argv[8]) {
  bundles = process.argv[8].split(path.delimiter);
}

context.setContext({ workDir, shouldUseTypeScriptParserForJS, sonarlint, debugMemory, bundles });
server.start(Number.parseInt(port), host, 11232132).catch(() => {});
