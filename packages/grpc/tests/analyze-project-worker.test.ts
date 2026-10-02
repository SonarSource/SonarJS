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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
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
import { FsCacheArchive } from '../../shared/src/fs-cache/archive.js';

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
  it('records project Stylelint lookups independently of process cwd and replays edited HTML', async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-css-root-'));
    const root = path.join(temporary, 'record');
    const replayRoot = path.join(temporary, 'replay');
    const workdir = path.join(temporary, 'work');
    for (const directory of [root, replayRoot, workdir]) fs.mkdirSync(directory);
    const original =
      '<script>if (foo()) bar(); else baz();</script>\n<style>a { color: red; }</style>';
    fs.writeFileSync(path.join(root, 'input.html'), original);
    const worker = new Worker(
      path.resolve(import.meta.dirname, '../../../lib/grpc/src/analyze-project-worker.js'),
      { workerData },
    );
    const { FileType, JsTsLanguage, AnalysisMode, FilesystemCacheMode } =
      analyzeProjectProto.analyzeproject.v1;
    let sequence = 0;
    const analyze = (baseDir: string, mode: number, content?: string) =>
      new Promise<AnalyzeProjectWorkerOutMessage>((resolve, reject) => {
        const requestId = String(++sequence);
        const timer = setTimeout(() => finish(new Error('CSS replay worker timed out')), 30_000);
        const onMessage = (message: AnalyzeProjectWorkerOutMessage) => {
          if (
            'requestId' in message &&
            message.requestId === requestId &&
            message.type === 'unary-complete'
          )
            finish(undefined, message);
        };
        const onError = (error: Error) => finish(error);
        function finish(error?: Error, result?: AnalyzeProjectWorkerOutMessage) {
          clearTimeout(timer);
          worker.off('message', onMessage);
          worker.off('error', onError);
          if (error) reject(error);
          else resolve(result!);
        }
        worker.on('message', onMessage);
        worker.once('error', onError);
        worker.postMessage({
          type: 'analyze-unary',
          requestId,
          request: {
            configuration: { baseDir },
            files: {
              [path.join(baseDir, 'input.html')]: {
                fileType: FileType.FILE_TYPE_MAIN,
                fileContent: content,
              },
            },
            rules: [
              {
                key: 'S3923',
                configurations: [],
                fileTypeTargets: [FileType.FILE_TYPE_MAIN],
                language: JsTsLanguage.JS_TS_LANGUAGE_JS,
                analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
              },
            ],
            cssRules: [{ key: '@stylistic/no-extra-semicolons', configurations: [] }],
            bundles: [],
            rulesWorkdir: workdir,
            filesystemCache: {
              mode,
              archivePath: path.join(workdir, 'filesystem.pb.gz'),
              analysisMetadataPath: path.join(workdir, 'analysis-metadata.pb.gz'),
            },
          },
        });
      });
    try {
      const recorded = await analyze(root, FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD);
      expect(recorded).toMatchObject({
        type: 'unary-complete',
        result: {
          type: 'success',
          result: { files: { [path.join(root, 'input.html')]: { issues: [] } } },
        },
      });
      const archive = new FsCacheArchive({
        rootDir: root,
        archivePath: path.join(workdir, 'filesystem.pb.gz'),
      });
      archive.load();
      const ignorePath = archive.keyFor(path.join(root, '.stylelintignore'));
      expect(ignorePath).toBeDefined();
      expect(archive.getExists(ignorePath!)).toBe(false);
      const replayed = await analyze(
        replayRoot,
        FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
        original.replace('else baz()', 'else bar()').replace('red;', 'red;;'),
      );
      expect(replayed).toMatchObject({
        type: 'unary-complete',
        result: {
          type: 'success',
          result: {
            files: {
              [path.join(replayRoot, 'input.html')]: {
                issues: expect.arrayContaining([
                  expect.objectContaining({ ruleId: 'S3923' }),
                  expect.objectContaining({ ruleId: '@stylistic/no-extra-semicolons' }),
                ]),
              },
            },
          },
        },
      });
    } finally {
      await worker.terminate();
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });

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
