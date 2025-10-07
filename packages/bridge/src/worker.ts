/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// worker.js (Web Worker version)
import { handleRequest } from './handle-request.js';
import { WsIncrementalResult } from './request.js';

let workerData = {
  debugMemory: false,
};

async function isWorkerContext() {
  // Node.js detection
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const { isMainThread } = await import('node:worker_threads');
      return !isMainThread;
    } catch {
      // If import fails, assume not a worker
      return false;
    }
  }

  // Browser / Deno Web Worker detection
  return typeof self !== 'undefined' && self.constructor?.name === 'DedicatedWorkerGlobalScope';
}

if (await isWorkerContext()) {
  console.log('Worker added message handler');
  self.addEventListener('message', async event => {
    const message = event.data;

    const { type, ws } = message;

    if (type === 'close') {
      self.close(); // Terminates the worker
    } else if (ws) {
      await handleRequest(message, workerData, (results: WsIncrementalResult) => {
        self.postMessage({ ws: true, results });
      });
    } else {
      self.postMessage(await handleRequest(message, workerData));
    }
  });
} else {
  console.log('In main thread, doing nothing');
}
