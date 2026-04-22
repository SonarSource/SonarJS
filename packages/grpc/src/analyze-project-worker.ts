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
import {
  toAnalyzeProjectStreamResponse,
  toAnalyzeProjectUnaryResponse,
} from './analyze-project-convert.js';
import type {
  AnalyzeProjectWorkerInMessage,
  AnalyzeProjectWorkerOutMessage,
} from './analyze-project-worker/messages.js';
import type { AnalyzeProjectResponse, RequestResult } from './analyze-project-request.js';
import type { sonarjs } from './proto/analyze-project.js';

type AnalyzeProjectWorkerParentThread = {
  close: () => void;
  on: (
    event: 'message',
    listener: (message: AnalyzeProjectWorkerInMessage) => void | Promise<void>,
  ) => void;
  postMessage: (message: AnalyzeProjectWorkerOutMessage) => void;
};

type AnalyzeProjectUnaryResponse = sonarjs.analyzeproject.v1.IAnalyzeProjectUnaryResponse;

export function registerAnalyzeProjectWorkerMessageHandler(
  parentThread: AnalyzeProjectWorkerParentThread,
  data: WorkerData,
  handleRequest: typeof handleAnalyzeProjectRequest = handleAnalyzeProjectRequest,
) {
  parentThread.on('message', async (message: AnalyzeProjectWorkerInMessage) => {
    switch (message.type) {
      case 'close':
        parentThread.close();
        return;
      case 'cancel': {
        const result = toVoidResult(await handleRequest({ type: 'on-cancel-analysis' }, data));
        parentThread.postMessage({
          type: 'cancel-complete',
          requestId: message.requestId,
          result,
        } satisfies AnalyzeProjectWorkerOutMessage);
        return;
      }
      case 'analyze-unary': {
        // Convert inside the worker so the parent thread does not clone the full
        // analysis output plus path map before sending the unary gRPC response.
        const result = toUnaryResponseResult(
          await handleRequest({ type: 'on-analyze-project', data: message.request }, data),
        );
        parentThread.postMessage({
          type: 'unary-complete',
          requestId: message.requestId,
          result,
        } satisfies AnalyzeProjectWorkerOutMessage);
        return;
      }
      case 'analyze-stream': {
        // Stream responses are converted in the worker so request-scoped path maps
        // and the final accumulated project output stay local to this thread.
        const result = toVoidResult(
          await handleRequest({ type: 'on-analyze-project', data: message.request }, data, event =>
            parentThread.postMessage({
              type: 'event',
              requestId: message.requestId,
              response: toAnalyzeProjectStreamResponse(event.event, event.pathMap),
            } satisfies AnalyzeProjectWorkerOutMessage),
          ),
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

function toUnaryResponseResult(
  result: RequestResult<AnalyzeProjectResponse | void>,
): RequestResult<AnalyzeProjectUnaryResponse> {
  if (result.type === 'failure') {
    return result;
  }
  if (result.result == null) {
    throw new Error('Missing analyze-project result');
  }
  return {
    type: 'success',
    result: toAnalyzeProjectUnaryResponse(result.result.output, result.result.pathMap),
  };
}

function toVoidResult(result: RequestResult<AnalyzeProjectResponse | void>): RequestResult {
  if (result.type === 'failure') {
    return result;
  }
  return {
    type: 'success',
    result: undefined,
  };
}

if (parentPort) {
  registerAnalyzeProjectWorkerMessageHandler(parentPort, workerData as WorkerData);
}
