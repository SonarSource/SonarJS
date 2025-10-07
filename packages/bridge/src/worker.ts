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
import { handleRequest } from './handle-request.js';
import { BridgeRequest, WsIncrementalResult } from './request.js';

// Detect runtime environment
const isDeno = typeof (globalThis as any).Deno !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;

let workerData: any = null;

/**
 * Code executed by the worker thread
 */
if (isDeno) {
  // Deno Web Worker implementation
  self.onmessage = async (event: MessageEvent) => {
    const message = event.data;

    if (message.type === 'init') {
      workerData = message.data;
      self.postMessage({ type: 'ready' });
      return;
    }

    const { type, ws } = message;
    if (type === 'close') {
      self.close();
    } else if (ws) {
      await handleRequest(message, workerData, (results: WsIncrementalResult) =>
        self.postMessage({ ws: true, results }),
      );
    } else {
      self.postMessage(await handleRequest(message, workerData));
    }
  };
} else if (isNode) {
  // Node.js worker threads implementation
  const { parentPort, workerData: nodeWorkerData } = await import('node:worker_threads');

  if (parentPort) {
    workerData = nodeWorkerData;
    const parentThread = parentPort;
    parentThread.on(
      'message',
      async (message: (BridgeRequest | { type: 'close' }) & { ws?: boolean }) => {
        const { type, ws } = message;
        if (type === 'close') {
          parentThread.close();
        } else if (ws) {
          await handleRequest(message, workerData, (results: WsIncrementalResult) =>
            parentThread.postMessage({ ws: true, results }),
          );
        } else {
          parentThread.postMessage(await handleRequest(message, workerData));
        }
      },
    );
  }
}
