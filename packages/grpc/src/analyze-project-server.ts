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

import * as grpc from '@grpc/grpc-js';
import type { Worker } from 'node:worker_threads';
import { sonarjs as analyzeProjectProto } from './proto/analyze-project.js';
import { debug, info } from '../../shared/src/helpers/logging.js';
import { handleAnalyzeProjectRequest, type WorkerData } from './analyze-project-handle-request.js';
import type {
  AnalyzeProjectWorkerInMessage,
  AnalyzeProjectWorkerOutMessage,
} from './analyze-project-worker/messages.js';
import {
  logMemoryConfiguration,
  logMemoryError,
  registerGarbageCollectionObserver,
} from './analyze-project-memory.js';
import type {
  AnalyzeProjectRuntimeRequest,
  RequestResult,
  WsIncrementalResult,
} from './analyze-project-request.js';

const ANALYZE_PROJECT_SERVICE_NAME = 'sonarjs.analyzeproject.v1.AnalyzeProjectService';
const WORKER_RESPONSE_TIMEOUT_MS = 15_000;
const GRPC_SERVER_OPTIONS: grpc.ServerOptions = {
  'grpc.max_receive_message_length': -1,
  'grpc.max_send_message_length': -1,
};

type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;
type AnalyzeProjectStreamResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectStreamResponse;
type AnalyzeProjectUnaryResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectUnaryResponse;
type CancelAnalysisRequest = analyzeProjectProto.analyzeproject.v1.ICancelAnalysisRequest;
type CancelAnalysisResponse = analyzeProjectProto.analyzeproject.v1.ICancelAnalysisResponse;
type LeaseRequest = analyzeProjectProto.analyzeproject.v1.ILeaseRequest;
type LeaseResponse = analyzeProjectProto.analyzeproject.v1.ILeaseResponse;
type UnaryCompleteMessage = Extract<AnalyzeProjectWorkerOutMessage, { type: 'unary-complete' }>;

type AnalyzeProjectServerResult = {
  server: grpc.Server;
  serverClosed: Promise<void>;
};

type HandleRequestInCurrentThread = (
  request: AnalyzeProjectRuntimeRequest,
  incrementalResultsChannel?: (result: WsIncrementalResult) => void,
) => Promise<RequestResult>;

type AnalyzeProjectServerState = {
  analysisInProgress: boolean;
  leaseCall: grpc.ServerDuplexStream<LeaseRequest, LeaseResponse> | null;
  nextWorkerRequestId: number;
  shuttingDown: boolean;
  startupShutdownTimeout: NodeJS.Timeout | null;
};

type AnalyzeProjectServerLifecycle = {
  armStartupShutdownTimeout: () => void;
  clearStartupShutdownTimeout: () => void;
  requestCancel: () => Promise<boolean>;
  shutdown: (reason: string) => Promise<void>;
};

type AnalyzeProjectServerDependencies = {
  handleRequestInCurrentThread: HandleRequestInCurrentThread;
  newWorkerRequestId: () => string;
  resolveClosed: () => void;
  server: grpc.Server;
  state: AnalyzeProjectServerState;
  timeout: number;
  unregisterGarbageCollectionObserver: () => void;
  worker?: Worker;
};

type AnalyzeProjectImplementationDependencies = {
  handleRequestInCurrentThread: HandleRequestInCurrentThread;
  lifecycle: AnalyzeProjectServerLifecycle;
  newWorkerRequestId: () => string;
  state: AnalyzeProjectServerState;
  worker?: Worker;
};

function createAnalyzeProjectServiceDefinition(): grpc.ServiceDefinition {
  return {
    AnalyzeProject: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/AnalyzeProject`,
      requestStream: false,
      responseStream: true,
      requestSerialize: (value: AnalyzeProjectRequest) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
        ),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
      responseSerialize: (value: AnalyzeProjectStreamResponse) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.encode(value).finish(),
        ),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.decode(buffer),
    },
    AnalyzeProjectUnary: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/AnalyzeProjectUnary`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: AnalyzeProjectRequest) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
        ),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
      responseSerialize: (value: AnalyzeProjectUnaryResponse) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.encode(value).finish(),
        ),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.decode(buffer),
    },
    CancelAnalysis: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/CancelAnalysis`,
      requestStream: false,
      responseStream: false,
      requestSerialize: (value: CancelAnalysisRequest) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.CancelAnalysisRequest.encode(value).finish(),
        ),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.CancelAnalysisRequest.decode(buffer),
      responseSerialize: (value: CancelAnalysisResponse) =>
        Buffer.from(
          analyzeProjectProto.analyzeproject.v1.CancelAnalysisResponse.encode(value).finish(),
        ),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.CancelAnalysisResponse.decode(buffer),
    },
    Lease: {
      path: `/${ANALYZE_PROJECT_SERVICE_NAME}/Lease`,
      requestStream: true,
      responseStream: true,
      requestSerialize: (value: LeaseRequest) =>
        Buffer.from(analyzeProjectProto.analyzeproject.v1.LeaseRequest.encode(value).finish()),
      requestDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.LeaseRequest.decode(buffer),
      responseSerialize: (value: LeaseResponse) =>
        Buffer.from(analyzeProjectProto.analyzeproject.v1.LeaseResponse.encode(value).finish()),
      responseDeserialize: (buffer: Buffer) =>
        analyzeProjectProto.analyzeproject.v1.LeaseResponse.decode(buffer),
    },
  };
}

function errorEvent(error: unknown) {
  return JSON.stringify({
    messageType: 'error',
    error,
  });
}

function parseAnalyzeRequest(request: AnalyzeProjectRequest): unknown {
  if (!request.requestJson) {
    throw new Error('Missing request_json in AnalyzeProjectRequest');
  }
  return JSON.parse(request.requestJson);
}

function toGrpcError(message: string, code = grpc.status.INTERNAL): grpc.ServiceError {
  const error = new Error(message) as grpc.ServiceError;
  error.name = 'AnalyzeProjectServiceError';
  error.code = code;
  error.details = message;
  error.metadata = new grpc.Metadata();
  return error;
}

async function waitForWorkerCompletion(
  worker: Worker,
  expectedType: AnalyzeProjectWorkerOutMessage['type'],
  expectedRequestId: string,
  trigger: () => void,
  timeoutMs?: number,
): Promise<AnalyzeProjectWorkerOutMessage> {
  return new Promise((resolve, reject) => {
    const timeout =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for worker message '${expectedType}'`));
          }, timeoutMs);

    const onMessage = (message: AnalyzeProjectWorkerOutMessage) => {
      if (message.type !== expectedType || message.requestId !== expectedRequestId) {
        return;
      }
      cleanup();
      resolve(message);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onExit = (code: number) => {
      cleanup();
      reject(new Error(`Worker exited with code ${code}`));
    };

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
    };

    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.on('exit', onExit);
    trigger();
  });
}

function createServerState(): AnalyzeProjectServerState {
  return {
    analysisInProgress: false,
    leaseCall: null,
    nextWorkerRequestId: 0,
    shuttingDown: false,
    startupShutdownTimeout: null,
  };
}

function createHandleRequestInCurrentThread(workerData: WorkerData): HandleRequestInCurrentThread {
  return (request, incrementalResultsChannel) =>
    handleAnalyzeProjectRequest(request, workerData, incrementalResultsChannel);
}

function getNextWorkerRequestId(state: AnalyzeProjectServerState): string {
  state.nextWorkerRequestId += 1;
  return String(state.nextWorkerRequestId);
}

function clearStartupShutdownTimeout(state: AnalyzeProjectServerState) {
  if (state.startupShutdownTimeout) {
    clearTimeout(state.startupShutdownTimeout);
    state.startupShutdownTimeout = null;
  }
}

function createLifecycle({
  handleRequestInCurrentThread,
  newWorkerRequestId,
  resolveClosed,
  server,
  state,
  timeout,
  unregisterGarbageCollectionObserver,
  worker,
}: AnalyzeProjectServerDependencies): AnalyzeProjectServerLifecycle {
  const requestCancel = async () => {
    if (!worker) {
      const result = await handleRequestInCurrentThread({ type: 'on-cancel-analysis' });
      return result.type === 'success';
    }

    const requestId = newWorkerRequestId();
    const completion = await waitForWorkerCompletion(
      worker,
      'cancel-complete',
      requestId,
      () =>
        worker.postMessage({ type: 'cancel', requestId } satisfies AnalyzeProjectWorkerInMessage),
      WORKER_RESPONSE_TIMEOUT_MS,
    );
    return completion.type === 'cancel-complete' && completion.result.type === 'success';
  };

  const closeLeaseCall = () => {
    if (!state.leaseCall) {
      return;
    }
    const currentLeaseCall = state.leaseCall;
    state.leaseCall = null;
    try {
      currentLeaseCall.end();
    } catch (e) {
      debug(`Failed to end lease stream: ${e}`);
    }
  };

  const shutdown = async (reason: string) => {
    if (state.shuttingDown) {
      return;
    }
    state.shuttingDown = true;
    debug(`Shutting down gRPC analyze-project server: ${reason}`);
    clearStartupShutdownTimeout(state);
    closeLeaseCall();
    unregisterGarbageCollectionObserver();

    if (state.analysisInProgress) {
      if (worker) {
        try {
          worker.postMessage({
            type: 'cancel',
            requestId: newWorkerRequestId(),
          } satisfies AnalyzeProjectWorkerInMessage);
        } catch (e) {
          debug(`Failed to post cancel to worker: ${e}`);
        }
      } else {
        try {
          await handleRequestInCurrentThread({ type: 'on-cancel-analysis' });
        } catch (e) {
          debug(`Failed to cancel in-process analysis: ${e}`);
        }
      }
    }

    if (worker) {
      try {
        worker.postMessage({ type: 'close' } satisfies AnalyzeProjectWorkerInMessage);
      } catch (e) {
        debug(`Failed to post close to worker: ${e}`);
      }

      try {
        await worker.terminate();
      } catch (e) {
        debug(`Failed to terminate worker: ${e}`);
      }
    }

    server.forceShutdown();
    resolveClosed();
  };

  const armStartupShutdownTimeout = () => {
    if (timeout <= 0) {
      return;
    }
    clearStartupShutdownTimeout(state);
    state.startupShutdownTimeout = setTimeout(() => {
      void shutdown('lease acquisition timeout');
    }, timeout);
  };

  return {
    armStartupShutdownTimeout,
    clearStartupShutdownTimeout: () => clearStartupShutdownTimeout(state),
    requestCancel,
    shutdown,
  };
}

function createAnalyzeProjectStreamHandler({
  handleRequestInCurrentThread,
  lifecycle,
  newWorkerRequestId,
  state,
  worker,
}: AnalyzeProjectImplementationDependencies) {
  return (call: grpc.ServerWritableStream<AnalyzeProjectRequest, AnalyzeProjectStreamResponse>) => {
    if (state.analysisInProgress) {
      call.write({
        messageJson: errorEvent({
          code: 'GENERAL_ERROR',
          message: 'Another analysis is already running',
        }),
      });
      call.end();
      return;
    }

    let request: unknown;
    try {
      request = parseAnalyzeRequest(call.request);
    } catch (e) {
      call.write({
        messageJson: errorEvent({
          code: 'GENERAL_ERROR',
          message: e instanceof Error ? e.message : String(e),
        }),
      });
      call.end();
      return;
    }

    state.analysisInProgress = true;
    const requestId = newWorkerRequestId();
    let completed = false;
    let cancelled = false;
    let onWorkerMessage: ((message: AnalyzeProjectWorkerOutMessage) => void) | undefined;

    const complete = () => {
      if (completed) {
        return;
      }
      completed = true;
      state.analysisInProgress = false;
      if (worker && onWorkerMessage) {
        worker.off('message', onWorkerMessage);
      }
    };

    const writeResponse = (messageJson: string) => {
      if (cancelled) {
        return;
      }
      try {
        call.write({ messageJson });
      } catch (e) {
        debug(`Failed to write analyze-project stream response: ${e}`);
      }
    };

    const endResponse = () => {
      if (cancelled) {
        return;
      }
      try {
        call.end();
      } catch (e) {
        debug(`Failed to end analyze-project stream response: ${e}`);
      }
    };

    call.on('cancelled', () => {
      cancelled = true;
      if (completed) {
        return;
      }
      void lifecycle.requestCancel().catch(error => {
        debug(`Failed to cancel analyze-project request: ${error}`);
      });
    });

    if (worker) {
      onWorkerMessage = (message: AnalyzeProjectWorkerOutMessage) => {
        if (message.requestId !== requestId) {
          return;
        }
        switch (message.type) {
          case 'event':
            writeResponse(JSON.stringify(message.result));
            return;
          case 'stream-complete':
            if (message.result.type === 'failure') {
              writeResponse(errorEvent(message.result.error));
            }
            endResponse();
            complete();
            return;
          default:
            return;
        }
      };

      worker.on('message', onWorkerMessage);
      worker.postMessage({
        type: 'analyze-stream',
        requestId,
        request,
      } satisfies AnalyzeProjectWorkerInMessage);
      return;
    }

    void handleRequestInCurrentThread({ type: 'on-analyze-project', data: request }, event =>
      writeResponse(JSON.stringify(event)),
    )
      .then(result => {
        if (result.type === 'failure') {
          writeResponse(errorEvent(result.error));
        }
        endResponse();
      })
      .catch(error => {
        writeResponse(
          errorEvent({
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        endResponse();
      })
      .finally(complete);
  };
}

function createAnalyzeProjectUnaryHandler({
  handleRequestInCurrentThread,
  newWorkerRequestId,
  state,
  worker,
}: AnalyzeProjectImplementationDependencies) {
  return async (
    call: grpc.ServerUnaryCall<AnalyzeProjectRequest, AnalyzeProjectUnaryResponse>,
    callback: grpc.sendUnaryData<AnalyzeProjectUnaryResponse>,
  ) => {
    if (state.analysisInProgress) {
      callback(toGrpcError('Another analysis is already running', grpc.status.RESOURCE_EXHAUSTED));
      return;
    }

    let request: unknown;
    try {
      request = parseAnalyzeRequest(call.request);
    } catch (e) {
      callback(
        toGrpcError(e instanceof Error ? e.message : String(e), grpc.status.INVALID_ARGUMENT),
      );
      return;
    }

    state.analysisInProgress = true;
    try {
      const result = worker
        ? (
            await (() => {
              const requestId = newWorkerRequestId();
              return waitForWorkerCompletion(worker, 'unary-complete', requestId, () =>
                worker.postMessage({
                  type: 'analyze-unary',
                  requestId,
                  request,
                } satisfies AnalyzeProjectWorkerInMessage),
              ) as Promise<UnaryCompleteMessage>;
            })()
          ).result
        : await handleRequestInCurrentThread({ type: 'on-analyze-project', data: request });
      if (result.type === 'failure') {
        callback(toGrpcError((result.error.message as string) ?? 'Analysis failed'));
        return;
      }

      callback(null, {
        responseJson: JSON.stringify(result.result),
      });
    } catch (e) {
      callback(toGrpcError(e instanceof Error ? e.message : String(e)));
    } finally {
      state.analysisInProgress = false;
    }
  };
}

function createCancelAnalysisHandler({
  lifecycle,
  state,
}: AnalyzeProjectImplementationDependencies) {
  return async (
    _: grpc.ServerUnaryCall<CancelAnalysisRequest, CancelAnalysisResponse>,
    callback: grpc.sendUnaryData<CancelAnalysisResponse>,
  ) => {
    const hadActiveAnalysis = state.analysisInProgress;
    try {
      const cancelled = await lifecycle.requestCancel();
      callback(null, {
        cancelled: hadActiveAnalysis && cancelled,
      });
    } catch (e) {
      callback(toGrpcError(e instanceof Error ? e.message : String(e)));
    }
  };
}

function createLeaseHandler({ lifecycle, state }: AnalyzeProjectImplementationDependencies) {
  return (call: grpc.ServerDuplexStream<LeaseRequest, LeaseResponse>) => {
    if (state.leaseCall) {
      call.destroy(
        toGrpcError('Analyze-project lease already acquired', grpc.status.RESOURCE_EXHAUSTED),
      );
      return;
    }

    state.leaseCall = call;
    lifecycle.clearStartupShutdownTimeout();

    const shutdownOnLeaseLoss = (reason: string) => {
      if (state.leaseCall !== call) {
        return;
      }
      state.leaseCall = null;
      if (!state.shuttingDown) {
        setImmediate(() => {
          void lifecycle.shutdown(reason);
        });
      }
    };

    call.on('data', () => {});
    call.on('cancelled', () => {
      shutdownOnLeaseLoss('lease cancelled');
    });
    call.on('end', () => {
      try {
        call.end();
      } catch (e) {
        debug(`Failed to complete lease stream: ${e}`);
      }
      shutdownOnLeaseLoss('lease completed');
    });
    call.on('error', error => {
      debug(`Lease stream error: ${error}`);
      shutdownOnLeaseLoss('lease error');
    });
  };
}

function createAnalyzeProjectImplementation(
  dependencies: AnalyzeProjectImplementationDependencies,
): grpc.UntypedServiceImplementation {
  return {
    AnalyzeProject: createAnalyzeProjectStreamHandler(dependencies),
    AnalyzeProjectUnary: createAnalyzeProjectUnaryHandler(dependencies),
    CancelAnalysis: createCancelAnalysisHandler(dependencies),
    Lease: createLeaseHandler(dependencies),
  };
}

function attachWorkerLifecycleHandlers(
  worker: Worker | undefined,
  lifecycle: AnalyzeProjectServerLifecycle,
  state: AnalyzeProjectServerState,
) {
  if (!worker) {
    return;
  }

  worker.on('error', error => {
    logMemoryError(error);
    void lifecycle.shutdown('worker error');
  });
  worker.on('exit', code => {
    debug(`The worker thread exited with code ${code}`);
    if (!state.shuttingDown) {
      void lifecycle.shutdown('worker exit');
    }
  });
}

export async function startAnalyzeProjectServer(
  port = 0,
  host = '127.0.0.1',
  worker?: Worker,
  debugMemory = false,
  timeout = 0,
): Promise<AnalyzeProjectServerResult> {
  await logMemoryConfiguration();
  const workerData: WorkerData = { debugMemory };
  const unregisterGarbageCollectionObserver = debugMemory
    ? registerGarbageCollectionObserver()
    : () => {};

  let resolveClosed = () => {};
  const serverClosed = new Promise<void>(resolve => {
    resolveClosed = resolve;
  });
  const server = new grpc.Server(GRPC_SERVER_OPTIONS);
  const state = createServerState();
  const handleRequestInCurrentThread = createHandleRequestInCurrentThread(workerData);
  const newWorkerRequestId = () => getNextWorkerRequestId(state);
  const lifecycle = createLifecycle({
    handleRequestInCurrentThread,
    newWorkerRequestId,
    resolveClosed,
    server,
    state,
    timeout,
    unregisterGarbageCollectionObserver,
    worker,
  });

  attachWorkerLifecycleHandlers(worker, lifecycle, state);
  server.addService(
    createAnalyzeProjectServiceDefinition(),
    createAnalyzeProjectImplementation({
      handleRequestInCurrentThread,
      lifecycle,
      newWorkerRequestId,
      state,
      worker,
    }),
  );

  return await new Promise((resolve, reject) => {
    server.bindAsync(
      `${host}:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          reject(error);
          return;
        }

        info(`gRPC analyze-project server listening on ${host}:${boundPort}`);
        lifecycle.armStartupShutdownTimeout();
        resolve({
          server,
          serverClosed,
        });
      },
    );
  });
}
