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

import { EventEmitter } from 'node:events';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import type { WorkerData } from '../src/analyze-project-handle-request.js';
import {
  toAnalyzeProjectStreamResponse,
  toAnalyzeProjectUnaryResponse,
} from '../src/analyze-project-convert.js';
import { registerAnalyzeProjectWorkerMessageHandler } from '../src/analyze-project-worker.js';
import type {
  AnalyzeProjectWorkerInMessage,
  AnalyzeProjectWorkerOutMessage,
} from '../src/analyze-project-worker/messages.js';
import type {
  AnalyzeProjectIncrementalEvent,
  AnalyzeProjectResponse,
  RequestResult,
  WsIncrementalResult,
} from '../src/analyze-project-request.js';
import { sonarjs as analyzeProjectProto } from '../src/proto/analyze-project.js';
import type { ProjectAnalysisOutput } from '../../analysis/src/projectAnalysis.js';

class FakeParentThread {
  private readonly events = new EventEmitter();
  closed = false;
  postedMessages: AnalyzeProjectWorkerOutMessage[] = [];

  close() {
    this.closed = true;
  }

  emitMessage(message: AnalyzeProjectWorkerInMessage) {
    this.events.emit('message', message);
  }

  on(event: 'message', listener: (message: AnalyzeProjectWorkerInMessage) => void | Promise<void>) {
    this.events.on(event, listener);
  }

  postMessage(message: AnalyzeProjectWorkerOutMessage) {
    this.postedMessages.push(message);
  }
}

const workerData: WorkerData = { debugMemory: false };
type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;

function createAnalyzeProjectRequest(): AnalyzeProjectRequest {
  return {
    configuration: {
      baseDir: '/project',
    },
    files: {},
    rules: [],
    cssRules: [],
    bundles: [],
  };
}

function createProjectAnalysisOutput(): ProjectAnalysisOutput {
  return {
    files: {
      '/project/main.ts': {
        issues: [],
      },
    } as unknown as ProjectAnalysisOutput['files'],
    meta: {
      warnings: [],
    },
  };
}

function createAnalyzeProjectResponse(
  output: ProjectAnalysisOutput = createProjectAnalysisOutput(),
): AnalyzeProjectResponse {
  return {
    output,
    pathMap: new Map(),
  };
}

function createIncrementalEvent(event: WsIncrementalResult): AnalyzeProjectIncrementalEvent {
  return {
    event,
    pathMap: new Map(),
  };
}

describe('analyze-project worker', () => {
  it('should close the parent thread on close messages', async () => {
    const parentThread = new FakeParentThread();

    registerAnalyzeProjectWorkerMessageHandler(parentThread, workerData, async () => ({
      result: undefined,
      type: 'success',
    }));

    parentThread.emitMessage({ type: 'close' });
    await waitForImmediate();

    expect(parentThread.closed).toBe(true);
    expect(parentThread.postedMessages).toEqual([]);
  });

  it('should forward cancel messages to the request handler', async () => {
    const handledRequests: unknown[] = [];
    const result: RequestResult = { result: undefined, type: 'success' };
    const parentThread = new FakeParentThread();

    registerAnalyzeProjectWorkerMessageHandler(parentThread, workerData, async request => {
      handledRequests.push(request);
      return result;
    });

    parentThread.emitMessage({ requestId: 'cancel-1', type: 'cancel' });
    await waitForImmediate();

    expect(handledRequests).toEqual([{ type: 'on-cancel-analysis' }]);
    expect(parentThread.postedMessages).toEqual([
      {
        requestId: 'cancel-1',
        result,
        type: 'cancel-complete',
      },
    ]);
  });

  it('should forward unary analysis messages to the request handler', async () => {
    const handledRequests: unknown[] = [];
    const result: RequestResult<AnalyzeProjectResponse | void> = {
      result: createAnalyzeProjectResponse(),
      type: 'success',
    };
    const parentThread = new FakeParentThread();
    const request = createAnalyzeProjectRequest();

    registerAnalyzeProjectWorkerMessageHandler(parentThread, workerData, async runtimeRequest => {
      handledRequests.push(runtimeRequest);
      return result;
    });

    parentThread.emitMessage({ request, requestId: 'unary-1', type: 'analyze-unary' });
    await waitForImmediate();

    expect(handledRequests).toEqual([{ data: request, type: 'on-analyze-project' }]);
    expect(parentThread.postedMessages).toEqual([
      {
        requestId: 'unary-1',
        result: {
          result: toAnalyzeProjectUnaryResponse(result.result!.output, result.result!.pathMap),
          type: 'success',
        },
        type: 'unary-complete',
      },
    ]);
  });

  it('should stream incremental events and completion messages', async () => {
    const handledRequests: unknown[] = [];
    const incrementalEvents: AnalyzeProjectIncrementalEvent[] = [
      createIncrementalEvent({ messageType: 'cancelled' }),
    ];
    const result: RequestResult<AnalyzeProjectResponse | void> = {
      result: createAnalyzeProjectResponse(),
      type: 'success',
    };
    const parentThread = new FakeParentThread();
    const request = createAnalyzeProjectRequest();

    registerAnalyzeProjectWorkerMessageHandler(
      parentThread,
      workerData,
      async (runtimeRequest, _, incrementalResultsChannel) => {
        handledRequests.push(runtimeRequest);
        incrementalResultsChannel?.(incrementalEvents[0]);
        return result;
      },
    );

    parentThread.emitMessage({ request, requestId: 'stream-1', type: 'analyze-stream' });
    await waitForImmediate();

    expect(handledRequests).toEqual([{ data: request, type: 'on-analyze-project' }]);
    expect(parentThread.postedMessages).toEqual([
      {
        requestId: 'stream-1',
        response: toAnalyzeProjectStreamResponse(
          incrementalEvents[0].event,
          incrementalEvents[0].pathMap,
        ),
        type: 'event',
      },
      {
        requestId: 'stream-1',
        result: { result: undefined, type: 'success' },
        type: 'stream-complete',
      },
    ]);
  });
});
