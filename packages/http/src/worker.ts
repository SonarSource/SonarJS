/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { parentPort, workerData } from 'node:worker_threads';
import { handleRequest } from './handle-request.js';
import type { BridgeRequest, WsIncrementalResult } from './request.js';

/**
 * Code executed by the worker thread
 */
if (parentPort) {
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
