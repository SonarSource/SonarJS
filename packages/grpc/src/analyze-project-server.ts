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
import { debug, info } from '../../shared/src/helpers/logging.js';
import type {
  AnalyzeProjectWorkerInMessage,
  AnalyzeProjectWorkerOutMessage,
} from './analyze-project-worker/messages.js';
import {
  logMemoryConfiguration,
  registerGarbageCollectionObserver,
} from './analyze-project-memory.js';
import {
  toAnalyzeProjectStreamResponse,
  toAnalyzeProjectUnaryResponse,
} from './analyze-project-convert.js';
import {
  createAnalyzeProjectServiceDefinition,
  failStreamingCall,
  GRPC_SERVER_OPTIONS,
  toGrpcError,
  toGrpcErrorFromFailure,
  type AnalyzeProjectRequest,
  type AnalyzeProjectStreamResponse,
  type AnalyzeProjectUnaryResponse,
  type CancelAnalysisRequest,
  type CancelAnalysisResponse,
  type LeaseRequest,
  type LeaseResponse,
} from './analyze-project-server-grpc.js';
import {
  attachWorkerLifecycleHandlers,
  createHandleRequestInCurrentThread,
  createLifecycle,
  createServerState,
  getNextWorkerRequestId,
  waitForWorkerCompletion,
  type AnalyzeProjectImplementationDependencies,
} from './analyze-project-server-lifecycle.js';
import {
  AnalysisQueueClosedError,
  AnalysisTransportCancelledError,
  type AnalysisQueueSubmission,
} from './analyze-project-server-queue.js';
type UnaryCompleteMessage = Extract<AnalyzeProjectWorkerOutMessage, { type: 'unary-complete' }>;
type StreamCompleteMessage = Extract<AnalyzeProjectWorkerOutMessage, { type: 'stream-complete' }>;

type AnalyzeProjectServerResult = {
  server: grpc.Server;
  serverClosed: Promise<void>;
};

function toAnalysisServiceError(error: unknown): grpc.ServiceError {
  if (error instanceof AnalysisQueueClosedError) {
    return toGrpcError(error.message, grpc.status.UNAVAILABLE);
  }
  if (error instanceof AnalysisTransportCancelledError) {
    return toGrpcError(error.message, grpc.status.CANCELLED);
  }
  if (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'number' &&
    'details' in error
  ) {
    return error as grpc.ServiceError;
  }
  return toGrpcError(error instanceof Error ? error.message : String(error));
}

function queueAdmissionError(reason: 'closed' | 'full') {
  return reason === 'full'
    ? toGrpcError('Analyze-project request queue is full', grpc.status.RESOURCE_EXHAUSTED)
    : toGrpcError('Analyze-project request queue is closed', grpc.status.UNAVAILABLE);
}

function cancelSubmissionForTransportCall<T>(submission: AnalysisQueueSubmission<T>) {
  const cancellation = submission.cancelTransportCall();
  if (cancellation.active) {
    void cancellation.result.catch(error => {
      debug(`Failed to propagate analyze-project transport cancellation: ${error}`);
    });
  }
}

function createAnalyzeProjectStreamHandler({
  handleRequestInCurrentThread,
  lifecycle,
  newWorkerRequestId,
  state,
  worker,
}: AnalyzeProjectImplementationDependencies) {
  return async (
    call: grpc.ServerWritableStream<AnalyzeProjectRequest, AnalyzeProjectStreamResponse>,
  ) => {
    let transportCancelled = Boolean(call.cancelled);
    let submission: AnalysisQueueSubmission<void> | undefined;

    call.on('cancelled', () => {
      transportCancelled = true;
      if (submission) {
        cancelSubmissionForTransportCall(submission);
      }
    });
    if (transportCancelled) {
      return;
    }

    const writeResponse = (response: AnalyzeProjectStreamResponse) => {
      if (transportCancelled) {
        return;
      }
      try {
        call.write(response);
      } catch (e) {
        debug(`Failed to write analyze-project stream response: ${e}`);
      }
    };

    const failResponse = (error: grpc.ServiceError) => {
      if (transportCancelled) {
        return;
      }
      try {
        failStreamingCall(call, error);
      } catch (emitError) {
        debug(`Failed to fail analyze-project stream response: ${emitError}`);
      }
    };

    const endResponse = () => {
      if (transportCancelled) {
        return;
      }
      try {
        call.end();
      } catch (e) {
        debug(`Failed to end analyze-project stream response: ${e}`);
      }
    };

    const admission = state.analysisQueue.enqueue(
      async () => {
        if (worker) {
          const requestId = newWorkerRequestId();
          const onWorkerMessage = (message: AnalyzeProjectWorkerOutMessage) => {
            if (message.type === 'event' && message.requestId === requestId) {
              writeResponse(message.response);
            }
          };
          worker.on('message', onWorkerMessage);
          try {
            const completion = (await waitForWorkerCompletion(
              worker,
              'stream-complete',
              requestId,
              () =>
                // Structured clone strips protobufjs Long helpers (for example int64
                // maxFileSize), so worker normalization also accepts plain Long-shaped values.
                worker.postMessage({
                  type: 'analyze-stream',
                  requestId,
                  request: call.request,
                } satisfies AnalyzeProjectWorkerInMessage),
            )) as StreamCompleteMessage;
            if (completion.result.type === 'failure') {
              throw toGrpcErrorFromFailure(completion.result);
            }
            return;
          } finally {
            worker.off('message', onWorkerMessage);
          }
        }

        const result = await handleRequestInCurrentThread(
          { type: 'on-analyze-project', data: call.request },
          event => writeResponse(toAnalyzeProjectStreamResponse(event.event, event.pathMap)),
        );
        if (result.type === 'failure') {
          throw toGrpcErrorFromFailure(result);
        }
      },
      () => lifecycle.requestCancel(),
    );
    if (!admission.accepted) {
      if (!transportCancelled) {
        failResponse(queueAdmissionError(admission.reason));
      }
      return;
    }

    submission = admission.submission;
    if (transportCancelled) {
      cancelSubmissionForTransportCall(submission);
    }
    try {
      await submission.result;
      endResponse();
    } catch (error) {
      if (!transportCancelled) {
        failResponse(toAnalysisServiceError(error));
      }
    }
  };
}

function createAnalyzeProjectUnaryHandler({
  handleRequestInCurrentThread,
  lifecycle,
  newWorkerRequestId,
  state,
  worker,
}: AnalyzeProjectImplementationDependencies) {
  return async (
    call: grpc.ServerUnaryCall<AnalyzeProjectRequest, AnalyzeProjectUnaryResponse>,
    callback: grpc.sendUnaryData<AnalyzeProjectUnaryResponse>,
  ) => {
    let transportCancelled = Boolean(call.cancelled);
    let submission: AnalysisQueueSubmission<AnalyzeProjectUnaryResponse> | undefined;

    call.on('cancelled', () => {
      transportCancelled = true;
      if (submission) {
        cancelSubmissionForTransportCall(submission);
      }
    });
    if (transportCancelled) {
      return;
    }

    const admission = state.analysisQueue.enqueue(
      async () => {
        if (!worker) {
          const result = await handleRequestInCurrentThread({
            type: 'on-analyze-project',
            data: call.request,
          });
          if (result.type === 'failure') {
            throw toGrpcErrorFromFailure(result);
          }
          if (result.result == null) {
            throw toGrpcError('Missing analyze-project unary result');
          }
          return toAnalyzeProjectUnaryResponse(result.result.output, result.result.pathMap);
        }

        const result = (
          await (() => {
            const requestId = newWorkerRequestId();
            return waitForWorkerCompletion(worker, 'unary-complete', requestId, () =>
              worker.postMessage({
                type: 'analyze-unary',
                requestId,
                request: call.request,
              } satisfies AnalyzeProjectWorkerInMessage),
            ) as Promise<UnaryCompleteMessage>;
          })()
        ).result;
        if (result.type === 'failure') {
          throw toGrpcErrorFromFailure(result);
        }
        if (result.result == null) {
          throw toGrpcError('Missing analyze-project unary result');
        }
        return result.result;
      },
      () => lifecycle.requestCancel(),
    );
    if (!admission.accepted) {
      if (!transportCancelled) {
        callback(queueAdmissionError(admission.reason));
      }
      return;
    }

    submission = admission.submission;
    if (transportCancelled) {
      cancelSubmissionForTransportCall(submission);
    }
    try {
      const result = await submission.result;
      if (!transportCancelled) {
        callback(null, result);
      }
    } catch (error) {
      if (!transportCancelled) {
        callback(toAnalysisServiceError(error));
      }
    }
  };
}

function createCancelAnalysisHandler({ state }: AnalyzeProjectImplementationDependencies) {
  return async (
    _: grpc.ServerUnaryCall<CancelAnalysisRequest, CancelAnalysisResponse>,
    callback: grpc.sendUnaryData<CancelAnalysisResponse>,
  ) => {
    const cancellation = state.analysisQueue.cancelActiveAnalysis();
    if (!cancellation.active) {
      callback(null, { cancelled: false });
      return;
    }
    try {
      callback(null, { cancelled: await cancellation.result });
    } catch (e) {
      callback(toGrpcError(e instanceof Error ? e.message : String(e)));
    }
  };
}

function createLeaseHandler({ lifecycle, state }: AnalyzeProjectImplementationDependencies) {
  return (call: grpc.ServerDuplexStream<LeaseRequest, LeaseResponse>) => {
    if (state.leaseCall) {
      failStreamingCall(
        call,
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

export const analyzeProjectServerInternals = {
  createAnalyzeProjectStreamHandler,
  createAnalyzeProjectUnaryHandler,
  createLifecycle,
  waitForWorkerCompletion,
};

export async function startAnalyzeProjectServer(
  port = 0,
  host = '127.0.0.1',
  worker?: Worker,
  debugMemory = false,
  timeout = 0,
): Promise<AnalyzeProjectServerResult> {
  await logMemoryConfiguration();
  const workerData = { debugMemory };
  const unregisterGarbageCollectionObserver = debugMemory
    ? registerGarbageCollectionObserver()
    : () => {};

  let resolveClosed = () => {};
  const serverClosed = new Promise<void>(resolve => {
    resolveClosed = resolve;
  });
  const server = new grpc.Server(GRPC_SERVER_OPTIONS);
  let handleCancellationFailure = () => {};
  const state = createServerState({
    onCancellationFailure: () => handleCancellationFailure(),
  });
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
  handleCancellationFailure = () => {
    void lifecycle.shutdown('analysis cancellation failed');
  };

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
        lifecycle.scheduleStartupShutdownTimeout();
        resolve({
          server,
          serverClosed,
        });
      },
    );
  });
}
