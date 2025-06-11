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
import { parentPort, workerData } from 'worker_threads';
import { handleRequest } from './handle-request.js';
import { BridgeRequest, WsIncrementalResult } from './request.js';

/**
 * Code executed by the worker thread
 */
if (parentPort) {
  const parentThread = parentPort;
  parentThread.on(
    'message',
    async (message: (BridgeRequest | { type: 'close' }) & { ws?: boolean }) => {
      const { type, ws } = message;
      console.log('worker thread received: ', message, type, ws);
      if (type === 'close') {
        parentThread.close();
      } else if (ws) {
        await handleRequest(message, workerData, (results: WsIncrementalResult) =>
          parentThread.postMessage({ ws: true, results }),
        );
      } else {
        console.log('Will handle request', message, workerData);
        parentThread.postMessage(await handleRequest(message, workerData));
      }
    },
  );
}
