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
import { handleAnalyzeProjectRequest, type WorkerData } from './analyze-project-handle-request.js';
import type {
  AnalyzeProjectWorkerInMessage,
  AnalyzeProjectWorkerOutMessage,
} from './analyze-project-worker/messages.js';

if (parentPort) {
  const parentThread = parentPort;
  parentThread.on('message', async (message: AnalyzeProjectWorkerInMessage) => {
    switch (message.type) {
      case 'close':
        parentThread.close();
        return;
      case 'cancel': {
        const result = await handleAnalyzeProjectRequest(
          { type: 'on-cancel-analysis' },
          workerData as WorkerData,
        );
        parentThread.postMessage({
          type: 'cancel-complete',
          requestId: message.requestId,
          result,
        } satisfies AnalyzeProjectWorkerOutMessage);
        return;
      }
      case 'analyze-unary': {
        const result = await handleAnalyzeProjectRequest(
          { type: 'on-analyze-project', data: message.request },
          workerData as WorkerData,
        );
        parentThread.postMessage({
          type: 'unary-complete',
          requestId: message.requestId,
          result,
        } satisfies AnalyzeProjectWorkerOutMessage);
        return;
      }
      case 'analyze-stream': {
        const result = await handleAnalyzeProjectRequest(
          { type: 'on-analyze-project', data: message.request },
          workerData as WorkerData,
          event =>
            parentThread.postMessage({
              type: 'event',
              requestId: message.requestId,
              result: event,
            } satisfies AnalyzeProjectWorkerOutMessage),
        );
        parentThread.postMessage({
          type: 'stream-complete',
          requestId: message.requestId,
          result,
        } satisfies AnalyzeProjectWorkerOutMessage);
      }
    }
  });
}
