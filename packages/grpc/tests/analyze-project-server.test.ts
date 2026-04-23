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
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { expect } from 'expect';
import * as grpc from '@grpc/grpc-js';
import type { Worker } from 'node:worker_threads';
import { normalizePath } from '../../shared/src/helpers/files.js';
import type { ProjectAnalysisOutput } from '../../analysis/src/projectAnalysis.js';
import { toAnalyzeProjectUnaryResponse } from '../src/analyze-project-convert.js';
import {
  analyzeProjectServerInternals,
  startAnalyzeProjectServer,
} from '../src/analyze-project-server.js';
import { createAnalyzeProjectWorker } from '../src/analyze-project-worker/create-worker.js';
import { sonarjs as analyzeProjectProto } from '../src/proto/analyze-project.js';
import type {
  AnalyzeProjectWorkerInMessage,
  AnalyzeProjectWorkerOutMessage,
} from '../src/analyze-project-worker/messages.js';

const SERVICE_NAME = 'sonarjs.analyzeproject.v1.AnalyzeProjectService';
const DEFAULT_GRPC_MESSAGE_LIMIT_BYTES = 4 * 1024 * 1024;
const UNLIMITED_GRPC_MESSAGE_OPTIONS = {
  'grpc.max_receive_message_length': -1,
  'grpc.max_send_message_length': -1,
} satisfies grpc.ChannelOptions;
const basicFixtureDir = normalizePath(
  fileURLToPath(new URL('../../analysis/tests/fixtures-sonarqube/basic', import.meta.url)),
);
const basicFixtureFile = normalizePath(
  fileURLToPath(new URL('../../analysis/tests/fixtures-sonarqube/basic/main.ts', import.meta.url)),
);
const analyzeProjectWorkerPath = fileURLToPath(new URL('../../../server.mjs', import.meta.url));

type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;
type AnalyzeProjectStreamResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectStreamResponse;
type AnalyzeProjectUnaryResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectUnaryResponse;
type CancelAnalysisRequest = analyzeProjectProto.analyzeproject.v1.ICancelAnalysisRequest;
type CancelAnalysisResponse = analyzeProjectProto.analyzeproject.v1.ICancelAnalysisResponse;
type LeaseRequest = analyzeProjectProto.analyzeproject.v1.ILeaseRequest;
type LeaseResponse = analyzeProjectProto.analyzeproject.v1.ILeaseResponse;
const { AnalysisMode, FileType, JsTsLanguage } = analyzeProjectProto.analyzeproject.v1;

function createAnalyzeProjectClient(port: number) {
  const analyzeProjectMethodDefinition: grpc.MethodDefinition<
    AnalyzeProjectRequest,
    AnalyzeProjectStreamResponse
  > = {
    path: `/${SERVICE_NAME}/AnalyzeProject`,
    requestStream: false,
    responseStream: true,
    requestSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
      ),
    requestDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
    responseSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.encode(value).finish(),
      ),
    responseDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.decode(buffer),
  };

  const analyzeProjectUnaryMethodDefinition: grpc.MethodDefinition<
    AnalyzeProjectRequest,
    AnalyzeProjectUnaryResponse
  > = {
    path: `/${SERVICE_NAME}/AnalyzeProjectUnary`,
    requestStream: false,
    responseStream: false,
    requestSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
      ),
    requestDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
    responseSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.encode(value).finish(),
      ),
    responseDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.decode(buffer),
  };

  const cancelAnalysisMethodDefinition: grpc.MethodDefinition<
    CancelAnalysisRequest,
    CancelAnalysisResponse
  > = {
    path: `/${SERVICE_NAME}/CancelAnalysis`,
    requestStream: false,
    responseStream: false,
    requestSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.CancelAnalysisRequest.encode(value).finish(),
      ),
    requestDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.CancelAnalysisRequest.decode(buffer),
    responseSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.CancelAnalysisResponse.encode(value).finish(),
      ),
    responseDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.CancelAnalysisResponse.decode(buffer),
  };

  const leaseMethodDefinition: grpc.MethodDefinition<LeaseRequest, LeaseResponse> = {
    path: `/${SERVICE_NAME}/Lease`,
    requestStream: true,
    responseStream: true,
    requestSerialize: value =>
      Buffer.from(analyzeProjectProto.analyzeproject.v1.LeaseRequest.encode(value).finish()),
    requestDeserialize: buffer => analyzeProjectProto.analyzeproject.v1.LeaseRequest.decode(buffer),
    responseSerialize: value =>
      Buffer.from(analyzeProjectProto.analyzeproject.v1.LeaseResponse.encode(value).finish()),
    responseDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.LeaseResponse.decode(buffer),
  };

  const serviceDefinition = {
    AnalyzeProject: analyzeProjectMethodDefinition,
    AnalyzeProjectUnary: analyzeProjectUnaryMethodDefinition,
    CancelAnalysis: cancelAnalysisMethodDefinition,
    Lease: leaseMethodDefinition,
  } as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;

  const Client = grpc.makeGenericClientConstructor(serviceDefinition, 'AnalyzeProjectService');
  const client = new Client(
    `127.0.0.1:${port}`,
    grpc.credentials.createInsecure(),
    UNLIMITED_GRPC_MESSAGE_OPTIONS,
  ) as grpc.Client;

  return {
    startAnalyzeProject: (request: AnalyzeProjectRequest) =>
      client.makeServerStreamRequest(
        analyzeProjectMethodDefinition.path,
        analyzeProjectMethodDefinition.requestSerialize,
        analyzeProjectMethodDefinition.responseDeserialize,
        request,
      ),
    readAnalyzeProject: (call: grpc.ClientReadableStream<AnalyzeProjectStreamResponse>) =>
      new Promise<AnalyzeProjectStreamResponse[]>((resolve, reject) => {
        const responses: AnalyzeProjectStreamResponse[] = [];
        call.on('data', response => {
          responses.push(response);
        });
        call.on('end', () => resolve(responses));
        call.on('error', reject);
      }),
    analyzeProject: (request: AnalyzeProjectRequest) =>
      (() => {
        const call = client.makeServerStreamRequest(
          analyzeProjectMethodDefinition.path,
          analyzeProjectMethodDefinition.requestSerialize,
          analyzeProjectMethodDefinition.responseDeserialize,
          request,
        );
        return new Promise<AnalyzeProjectStreamResponse[]>((resolve, reject) => {
          const responses: AnalyzeProjectStreamResponse[] = [];
          call.on('data', response => {
            responses.push(response);
          });
          call.on('end', () => resolve(responses));
          call.on('error', reject);
        });
      })(),
    analyzeProjectUnary: (request: AnalyzeProjectRequest) =>
      new Promise<AnalyzeProjectUnaryResponse>((resolve, reject) => {
        client.makeUnaryRequest(
          analyzeProjectUnaryMethodDefinition.path,
          analyzeProjectUnaryMethodDefinition.requestSerialize,
          analyzeProjectUnaryMethodDefinition.responseDeserialize,
          request,
          (error: grpc.ServiceError | null, response?: AnalyzeProjectUnaryResponse) => {
            if (error) {
              reject(error);
            } else {
              resolve(response!);
            }
          },
        );
      }),
    cancelAnalysis: (request: CancelAnalysisRequest = {}) =>
      new Promise<CancelAnalysisResponse>((resolve, reject) => {
        client.makeUnaryRequest(
          cancelAnalysisMethodDefinition.path,
          cancelAnalysisMethodDefinition.requestSerialize,
          cancelAnalysisMethodDefinition.responseDeserialize,
          request,
          (error: grpc.ServiceError | null, response?: CancelAnalysisResponse) => {
            if (error) {
              reject(error);
            } else {
              resolve(response!);
            }
          },
        );
      }),
    lease: () =>
      client.makeBidiStreamRequest(
        leaseMethodDefinition.path,
        leaseMethodDefinition.requestSerialize,
        leaseMethodDefinition.responseDeserialize,
      ),
    close: () => client.close(),
  };
}

async function findOpenPort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to resolve a free port'));
        return;
      }
      probe.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

function createAnalyzeProjectRequest({
  fileContent,
  configuration,
  files = {
    [basicFixtureFile]: {
      fileType: FileType.FILE_TYPE_MAIN,
      ...(fileContent === undefined ? {} : { fileContent }),
    },
  },
}: {
  fileContent?: string;
  configuration?: AnalyzeProjectRequest['configuration'];
  files?: AnalyzeProjectRequest['files'];
} = {}) {
  return {
    configuration: {
      baseDir: basicFixtureDir,
      ...configuration,
    },
    files,
    rules: [
      {
        key: 'S1116',
        configurations: [],
        fileTypeTargets: [FileType.FILE_TYPE_MAIN],
        language: JsTsLanguage.JS_TS_LANGUAGE_TS,
        analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
      },
    ],
    bundles: [],
  } satisfies AnalyzeProjectRequest;
}

function createSparseAnalyzeProjectRequest(): AnalyzeProjectRequest {
  return {
    configuration: {
      baseDir: basicFixtureDir,
      canAccessFileSystem: false,
    },
    files: {},
    rules: [],
    cssRules: [],
    bundles: [],
  };
}

function createAnalyzeProjectRequestWithOmittedFiles(): AnalyzeProjectRequest {
  const { files: _files, ...request } = createAnalyzeProjectRequest();
  return request;
}

function createInvalidAnalyzeProjectRequestWithFiles(): AnalyzeProjectRequest {
  return {
    configuration: {
      baseDir: basicFixtureDir,
    },
    files: {
      [basicFixtureFile]: {
        fileType: FileType.FILE_TYPE_MAIN,
      },
    },
    rules: [
      {
        key: 'S1116',
        configurations: [],
        fileTypeTargets: [FileType.FILE_TYPE_MAIN],
        analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
      },
    ],
    bundles: [],
  };
}

function createAnalyzeProjectRequestWithoutFiles({
  canAccessFileSystem,
}: {
  canAccessFileSystem?: boolean;
} = {}): AnalyzeProjectRequest {
  return {
    configuration: {
      baseDir: basicFixtureDir,
      ...(canAccessFileSystem === undefined ? {} : { canAccessFileSystem }),
    },
    rules: [],
    cssRules: [],
    bundles: [],
  };
}

function createPathKeyVariant(filePath: string) {
  if (filePath.startsWith('/')) {
    return `/${filePath.slice(1).replaceAll('/', '\\')}`;
  }
  return filePath.replaceAll('/', '\\');
}

function createProjectAnalysisOutput(
  filePath = basicFixtureFile,
  ast?: string,
): ProjectAnalysisOutput {
  return {
    files: {
      [filePath]: {
        issues: [],
        ...(ast === undefined ? {} : { ast }),
      },
    } as unknown as ProjectAnalysisOutput['files'],
    meta: { warnings: [] },
  };
}

function createAnalyzeProjectUnaryResponse(
  output: ProjectAnalysisOutput = createProjectAnalysisOutput(),
) {
  return toAnalyzeProjectUnaryResponse(output, new Map());
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

class FakeWorker extends EventEmitter {
  private terminated = false;

  constructor(private readonly handleMessage: (message: AnalyzeProjectWorkerInMessage) => void) {
    super();
  }

  postMessage(message: AnalyzeProjectWorkerInMessage) {
    this.handleMessage(message);
  }

  emitMessage(message: AnalyzeProjectWorkerOutMessage) {
    this.emit('message', message);
  }

  emitFailure(error: Error) {
    this.emit('error', error);
  }

  exit(code: number) {
    this.emit('exit', code);
  }

  async terminate() {
    if (!this.terminated) {
      this.terminated = true;
      this.emit('exit', 0);
    }
    return 0;
  }
}

class FakeAnalyzeProjectStreamCall extends EventEmitter {
  public ended = false;
  public error: grpc.ServiceError | undefined;
  public readonly responses: AnalyzeProjectStreamResponse[] = [];

  constructor(
    public readonly request: AnalyzeProjectRequest,
    private readonly onEnd?: () => void,
  ) {
    super();
    this.on('error', error => {
      this.error = error as grpc.ServiceError;
    });
  }

  write(response: AnalyzeProjectStreamResponse) {
    this.responses.push(response);
  }

  end() {
    this.onEnd?.();
    this.ended = true;
  }
}

function createUnitServerState({
  analysisInProgress = false,
  leaseCall = null,
  startupShutdownTimeout = null,
}: {
  analysisInProgress?: boolean;
  leaseCall?: { end: () => void } | null;
  startupShutdownTimeout?: NodeJS.Timeout | null;
} = {}) {
  return {
    analysisInProgress,
    leaseCall: leaseCall as unknown as grpc.ServerDuplexStream<LeaseRequest, LeaseResponse> | null,
    nextWorkerRequestId: 0,
    shuttingDown: false,
    startupShutdownTimeout,
  };
}

type ServerMode = {
  label: string;
  createWorker: () => Promise<Worker | undefined>;
};

const serverModes: ServerMode[] = [
  {
    label: 'with worker',
    createWorker: async () =>
      createAnalyzeProjectWorker(analyzeProjectWorkerPath, { debugMemory: false }),
  },
  {
    label: 'without worker',
    createWorker: async () => undefined,
  },
];

async function withAnalyzeProjectServer(
  worker: Worker | undefined,
  run: (client: ReturnType<typeof createAnalyzeProjectClient>) => Promise<void>,
) {
  const port = await findOpenPort();
  const { server, serverClosed } = await startAnalyzeProjectServer(port, '127.0.0.1', worker);
  const client = createAnalyzeProjectClient(port);

  try {
    await run(client);
  } finally {
    if (worker) {
      await worker.terminate();
      await serverClosed;
      client.close();
    } else {
      client.close();
      await new Promise<void>((resolve, reject) => {
        server.tryShutdown(error => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

describe('analyze-project gRPC server', () => {
  it('should handle unary analyze-project requests', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const response = await client.analyzeProjectUnary(createAnalyzeProjectRequest());
          const fileResult = response.files?.[basicFixtureFile];

          expect(fileResult).toBeDefined();
          expect(fileResult?.issues?.length ?? 0).toBeGreaterThan(0);
          expect(response.meta).toBeDefined();
        });
      });
    }
  });

  it('should support sparse typed analyze-project requests', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const response = await client.analyzeProjectUnary(createSparseAnalyzeProjectRequest());
          expect(response.files).toEqual({});
          expect(response.meta?.warnings).toEqual(expect.any(Array));
        });
      });
    }
  });

  it('should preserve max_file_size across worker request cloning', async () => {
    const worker = await createAnalyzeProjectWorker(analyzeProjectWorkerPath, {
      debugMemory: false,
    });

    await withAnalyzeProjectServer(worker, async client => {
      const response = await client.analyzeProjectUnary(
        createAnalyzeProjectRequest({
          configuration: {
            maxFileSize: 5_000_000_000,
          },
        }),
      );
      const fileResult = response.files?.[basicFixtureFile];

      expect(fileResult).toBeDefined();
      expect(fileResult?.issues?.length ?? 0).toBeGreaterThan(0);
      expect(response.meta).toBeDefined();
    });
  });

  it('should stream incremental analyze-project results', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const responses = await client.analyzeProject(createAnalyzeProjectRequest());

          expect(
            responses.some(response => response.fileResult?.filePath === basicFixtureFile),
          ).toBe(true);
          expect(responses.some(response => response.meta != null)).toBe(true);
        });
      });
    }
  });

  it('should initialize files from disk when typed requests omit files', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const response = await client.analyzeProjectUnary(
            createAnalyzeProjectRequestWithOmittedFiles(),
          );
          const fileResult = response.files?.[basicFixtureFile];

          expect(fileResult).toBeDefined();
          expect(fileResult?.issues?.length ?? 0).toBeGreaterThan(0);
        });
      });
    }
  });

  it('should preserve original request paths in unary and streamed responses', async t => {
    const originalFilePath = createPathKeyVariant(basicFixtureFile);
    const request = createAnalyzeProjectRequest({
      files: {
        [originalFilePath]: {
          fileType: FileType.FILE_TYPE_MAIN,
        },
      },
    });

    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const unaryResponse = await client.analyzeProjectUnary(request);
          expect(Object.keys(unaryResponse.files ?? {})).toEqual([originalFilePath]);
          expect(unaryResponse.files?.[originalFilePath]?.issues?.[0]?.filePath).toBe(
            originalFilePath,
          );

          const streamResponses = await client.analyzeProject(request);
          const fileResult = streamResponses.find(
            response => response.fileResult?.filePath === originalFilePath,
          )?.fileResult;

          expect(fileResult).toBeDefined();
          expect(fileResult?.result?.issues?.[0]?.filePath).toBe(originalFilePath);
        });
      });
    }
  });

  it('should accept analyze-project requests larger than the default gRPC limit', async t => {
    const largeFileContent = `/*${'x'.repeat(DEFAULT_GRPC_MESSAGE_LIMIT_BYTES + 1_024)}*/\n`;

    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const responses = await client.analyzeProject(
            createAnalyzeProjectRequest({
              fileContent: largeFileContent,
            }),
          );

          expect(responses.some(response => response.meta != null)).toBe(true);
        });
      });
    }
  });

  it('should reject invalid analyze-project requests', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          await expect(client.analyzeProject({})).rejects.toMatchObject({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'configuration.base_dir is required',
          });
          await expect(client.analyzeProjectUnary({})).rejects.toMatchObject({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'configuration.base_dir is required',
          });
        });
      });
    }
  });

  it('should not reuse files from rejected requests when later requests omit files', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          await expect(
            client.analyzeProjectUnary(createInvalidAnalyzeProjectRequestWithFiles()),
          ).rejects.toMatchObject({
            code: grpc.status.INVALID_ARGUMENT,
            details: 'rules[0].language is required',
          });

          const response = await client.analyzeProjectUnary(
            createAnalyzeProjectRequestWithoutFiles({
              canAccessFileSystem: false,
            }),
          );

          expect(response.files).toEqual({});
        });
      });
    }
  });

  it('should reject concurrent unary requests while a stream is active', async () => {
    const streamRequestId = createDeferred<string>();
    const worker = new FakeWorker(message => {
      if (message.type === 'analyze-stream') {
        streamRequestId.resolve(message.requestId);
      }
    });

    await withAnalyzeProjectServer(worker as unknown as Worker, async client => {
      const streamCall = client.startAnalyzeProject(createAnalyzeProjectRequest());
      const responsesPromise = client.readAnalyzeProject(streamCall);
      const requestId = await streamRequestId.promise;

      await expect(client.analyzeProjectUnary(createAnalyzeProjectRequest())).rejects.toMatchObject(
        {
          code: grpc.status.RESOURCE_EXHAUSTED,
          details: 'Another analysis is already running',
        },
      );

      worker.emitMessage({
        requestId,
        result: { result: undefined, type: 'success' },
        type: 'stream-complete',
      });
      await responsesPromise;
    });
  });

  it('should reject concurrent stream requests while a stream is active', async () => {
    const streamRequestId = createDeferred<string>();
    const worker = new FakeWorker(message => {
      if (message.type === 'analyze-stream') {
        streamRequestId.resolve(message.requestId);
      }
    });

    await withAnalyzeProjectServer(worker as unknown as Worker, async client => {
      const streamCall = client.startAnalyzeProject(createAnalyzeProjectRequest());
      const activeResponsesPromise = client.readAnalyzeProject(streamCall);
      const requestId = await streamRequestId.promise;

      await expect(client.analyzeProject(createAnalyzeProjectRequest())).rejects.toMatchObject({
        code: grpc.status.RESOURCE_EXHAUSTED,
        details: 'Another analysis is already running',
      });

      worker.emitMessage({
        requestId,
        result: { result: undefined, type: 'success' },
        type: 'stream-complete',
      });
      await activeResponsesPromise;
    });
  });

  it('should release the analysis slot before ending a completed stream', async t => {
    const worker = new FakeWorker(message => {
      if (message.type === 'analyze-stream') {
        worker.emitMessage({
          requestId: message.requestId,
          result: { result: undefined, type: 'success' },
          type: 'stream-complete',
        });
      }
    });
    const testModes = [
      {
        handleRequestInCurrentThread: async () => {
          throw new Error('Unexpected in-process analyze-project request');
        },
        label: 'with worker',
        worker,
      },
      {
        handleRequestInCurrentThread: async () => ({
          result: undefined,
          type: 'success' as const,
        }),
        label: 'without worker',
        worker: undefined,
      },
    ] as const;

    for (const mode of testModes) {
      await t.test(mode.label, async () => {
        const state = createUnitServerState();
        const streamHandler = analyzeProjectServerInternals.createAnalyzeProjectStreamHandler({
          handleRequestInCurrentThread: mode.handleRequestInCurrentThread,
          lifecycle: {
            clearStartupShutdownTimeout: () => {},
            requestCancel: async () => true,
            scheduleStartupShutdownTimeout: () => {},
            shutdown: async () => {},
          },
          newWorkerRequestId: (() => {
            let requestId = 0;
            return () => String(++requestId);
          })(),
          state,
          worker: mode.worker as Worker | undefined,
        });

        const secondCall = new FakeAnalyzeProjectStreamCall(createAnalyzeProjectRequest());
        const firstCall = new FakeAnalyzeProjectStreamCall(createAnalyzeProjectRequest(), () => {
          streamHandler(
            secondCall as unknown as grpc.ServerWritableStream<
              AnalyzeProjectRequest,
              AnalyzeProjectStreamResponse
            >,
          );
        });

        streamHandler(
          firstCall as unknown as grpc.ServerWritableStream<
            AnalyzeProjectRequest,
            AnalyzeProjectStreamResponse
          >,
        );
        await delay(0);

        expect(firstCall.error).toBeUndefined();
        expect(firstCall.ended).toBe(true);
        expect(secondCall.error).toBeUndefined();
        expect(secondCall.ended).toBe(true);
        expect(state.analysisInProgress).toBe(false);
      });
    }
  });

  it('should cancel an active worker analysis through the cancel RPC', async () => {
    const streamRequestId = createDeferred<string>();
    const worker = new FakeWorker(message => {
      if (message.type === 'analyze-stream') {
        streamRequestId.resolve(message.requestId);
        return;
      }
      if (message.type === 'cancel') {
        worker.emitMessage({
          requestId: message.requestId,
          result: { result: undefined, type: 'success' },
          type: 'cancel-complete',
        });
        void streamRequestId.promise.then(activeRequestId => {
          worker.emitMessage({
            requestId: activeRequestId,
            result: { result: undefined, type: 'success' },
            type: 'stream-complete',
          });
        });
        return;
      }
      if (message.type === 'analyze-unary') {
        const ast = Buffer.from('typed-ast').toString('base64');
        worker.emitMessage({
          requestId: message.requestId,
          result: {
            result: createAnalyzeProjectUnaryResponse(
              createProjectAnalysisOutput(basicFixtureFile, ast),
            ),
            type: 'success',
          },
          type: 'unary-complete',
        });
      }
    });

    await withAnalyzeProjectServer(worker as unknown as Worker, async client => {
      const streamCall = client.startAnalyzeProject(createAnalyzeProjectRequest());
      const responsesPromise = client.readAnalyzeProject(streamCall);
      await streamRequestId.promise;

      const cancelResponse = await client.cancelAnalysis();
      expect(cancelResponse.cancelled).toBe(true);
      await responsesPromise;

      const unaryResponse = await client.analyzeProjectUnary(createAnalyzeProjectRequest());
      const fileResult = unaryResponse.files?.[basicFixtureFile];
      expect(fileResult?.issues).toEqual([]);
      expect(Buffer.from(fileResult?.ast ?? []).toString()).toBe('typed-ast');
    });
  });

  it('should shut down when the lease ends', async () => {
    const port = await findOpenPort();
    const { server, serverClosed } = await startAnalyzeProjectServer(port, '127.0.0.1');
    const client = createAnalyzeProjectClient(port);
    const leaseCall = client.lease();

    try {
      leaseCall.write({});
      await delay(20);
      leaseCall.end();
      await Promise.race([
        serverClosed,
        delay(2_000).then(() => {
          throw new Error('Timed out waiting for lease shutdown');
        }),
      ]);
    } finally {
      client.close();
      await new Promise<void>(resolve => {
        server.tryShutdown(() => resolve());
      });
    }
  });

  it('should shut down when the lease is never acquired', async () => {
    const port = await findOpenPort();
    const { server, serverClosed } = await startAnalyzeProjectServer(
      port,
      '127.0.0.1',
      undefined,
      false,
      25,
    );

    try {
      await Promise.race([
        serverClosed,
        delay(2_000).then(() => {
          throw new Error('Timed out waiting for startup shutdown timeout');
        }),
      ]);
    } finally {
      await new Promise<void>(resolve => {
        server.tryShutdown(() => resolve());
      });
    }
  });

  it('should fail unary requests when the worker exits before responding', async () => {
    const worker = new FakeWorker(message => {
      if (message.type === 'analyze-unary') {
        worker.exit(2);
      }
    });

    await withAnalyzeProjectServer(worker as unknown as Worker, async client => {
      await expect(client.analyzeProjectUnary(createAnalyzeProjectRequest())).rejects.toMatchObject(
        {
          code: grpc.status.CANCELLED,
          details: 'Call cancelled',
        },
      );
    });
  });

  it('should ignore unrelated worker messages while waiting for a completion message', async () => {
    const worker = new EventEmitter();

    await expect(
      analyzeProjectServerInternals.waitForWorkerCompletion(
        worker as unknown as Worker,
        'unary-complete',
        'expected-request',
        () => {
          worker.emit('message', {
            requestId: 'different-request',
            result: { result: createAnalyzeProjectUnaryResponse(), type: 'success' },
            type: 'unary-complete',
          } satisfies AnalyzeProjectWorkerOutMessage);
          worker.emit('message', {
            requestId: 'expected-request',
            result: { result: createAnalyzeProjectUnaryResponse(), type: 'success' },
            type: 'unary-complete',
          } satisfies AnalyzeProjectWorkerOutMessage);
        },
      ),
    ).resolves.toMatchObject({
      requestId: 'expected-request',
      type: 'unary-complete',
    });
  });

  it('should fail when the worker emits an error while waiting for completion', async () => {
    const worker = new EventEmitter();

    await expect(
      analyzeProjectServerInternals.waitForWorkerCompletion(
        worker as unknown as Worker,
        'unary-complete',
        'request-1',
        () => {
          worker.emit('error', new Error('worker failed'));
        },
      ),
    ).rejects.toThrow('worker failed');
  });

  it('should fail when the worker completion times out', async () => {
    const worker = new EventEmitter();

    await expect(
      analyzeProjectServerInternals.waitForWorkerCompletion(
        worker as unknown as Worker,
        'unary-complete',
        'request-1',
        () => {},
        10,
      ),
    ).rejects.toThrow("Timed out waiting for worker message 'unary-complete'");
  });

  it('should request in-process cancellation when no worker is configured', async () => {
    const handledRequests: string[] = [];
    const lifecycle = analyzeProjectServerInternals.createLifecycle({
      handleRequestInCurrentThread: async request => {
        handledRequests.push(request.type);
        return { result: undefined, type: 'success' };
      },
      newWorkerRequestId: () => 'request-1',
      resolveClosed: () => {},
      server: { forceShutdown: () => {} } as unknown as grpc.Server,
      state: createUnitServerState(),
      timeout: 0,
      unregisterGarbageCollectionObserver: () => {},
    });

    await expect(lifecycle.requestCancel()).resolves.toBe(true);
    expect(handledRequests).toEqual(['on-cancel-analysis']);
  });

  it('should tolerate in-process cancellation and lease closure failures during shutdown', async () => {
    let cancelCalls = 0;
    let forceShutdownCalls = 0;
    let resolveClosedCalls = 0;
    let unregisterCalls = 0;
    const startupShutdownTimeout = setTimeout(() => {}, 1_000);
    const state = createUnitServerState({
      analysisInProgress: true,
      leaseCall: {
        end: () => {
          throw new Error('lease end failed');
        },
      },
      startupShutdownTimeout,
    });
    const lifecycle = analyzeProjectServerInternals.createLifecycle({
      handleRequestInCurrentThread: async () => {
        cancelCalls += 1;
        throw new Error('cancel failed');
      },
      newWorkerRequestId: () => 'request-1',
      resolveClosed: () => {
        resolveClosedCalls += 1;
      },
      server: {
        forceShutdown: () => {
          forceShutdownCalls += 1;
        },
      } as unknown as grpc.Server,
      state,
      timeout: 0,
      unregisterGarbageCollectionObserver: () => {
        unregisterCalls += 1;
      },
    });

    await lifecycle.shutdown('first shutdown');
    await lifecycle.shutdown('second shutdown');

    expect(cancelCalls).toBe(1);
    expect(forceShutdownCalls).toBe(1);
    expect(resolveClosedCalls).toBe(1);
    expect(unregisterCalls).toBe(1);
    expect(state.leaseCall).toBeNull();
    expect(state.startupShutdownTimeout).toBeNull();
  });

  it('should tolerate worker shutdown failures', async () => {
    let forceShutdownCalls = 0;
    const lifecycle = analyzeProjectServerInternals.createLifecycle({
      handleRequestInCurrentThread: async () => ({ result: undefined, type: 'success' }),
      newWorkerRequestId: () => 'request-1',
      resolveClosed: () => {},
      server: {
        forceShutdown: () => {
          forceShutdownCalls += 1;
        },
      } as unknown as grpc.Server,
      state: createUnitServerState({ analysisInProgress: true }),
      timeout: 0,
      unregisterGarbageCollectionObserver: () => {},
      worker: {
        postMessage: () => {
          throw new Error('worker post failed');
        },
        terminate: async () => {
          throw new Error('worker terminate failed');
        },
      } as unknown as Worker,
    });

    await lifecycle.shutdown('worker shutdown');

    expect(forceShutdownCalls).toBe(1);
  });
});
