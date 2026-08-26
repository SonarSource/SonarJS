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
type UnaryCompleteMessage = Extract<AnalyzeProjectWorkerOutMessage, { type: 'unary-complete' }>;

type AnalyzeProjectServerResult = {
  server: grpc.Server;
  serverClosed: Promise<void>;
};

type AnalyzeProjectServerState = AnalyzeProjectImplementationDependencies['state'];

/** Waits for cancellation handoff, but rejects genuine concurrent analysis. */
async function acquireAnalysisSlot(
  state: AnalyzeProjectServerState,
  onAcquired: () => void = () => {},
): Promise<boolean> {
  while (state.analysisInProgress) {
    if (!state.analysisCancellationRequested || !state.analysisCompletion) {
      return false;
    }
    await state.analysisCompletion.promise;
  }

  state.analysisInProgress = true;
  state.analysisCancellationRequested = false;
  let resolveAnalysisCompletion!: () => void;
  const analysisCompletion = new Promise<void>(resolve => {
    resolveAnalysisCompletion = resolve;
  });
  state.analysisCompletion = { promise: analysisCompletion, resolve: resolveAnalysisCompletion };
  onAcquired();
  return true;
}

function requestAnalysisCancellation(state: AnalyzeProjectServerState) {
  if (state.analysisInProgress) {
    state.analysisCancellationRequested = true;
  }
}

function releaseAnalysisSlot(state: AnalyzeProjectServerState) {
  const analysisCompletion = state.analysisCompletion;
  state.analysisCancellationRequested = false;
  state.analysisCompletion = null;
  state.analysisInProgress = false;
  analysisCompletion?.resolve();
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
    let completed = false;
    let cancelled = false;
    let ownsAnalysisSlot = false;
    let onWorkerMessage: ((message: AnalyzeProjectWorkerOutMessage) => void) | undefined;

    call.on('cancelled', () => {
      cancelled = true;
      if (!ownsAnalysisSlot || completed) {
        return;
      }
      requestAnalysisCancellation(state);
      void lifecycle.requestCancel().catch(error => {
        debug(`Failed to cancel analyze-project request: ${error}`);
      });
    });

    if (!(await acquireAnalysisSlot(state, () => (ownsAnalysisSlot = true)))) {
      if (cancelled) {
        return;
      }
      failStreamingCall(
        call,
        toGrpcError('Another analysis is already running', grpc.status.RESOURCE_EXHAUSTED),
      );
      return;
    }

    if (cancelled) {
      releaseAnalysisSlot(state);
      return;
    }

    const requestId = newWorkerRequestId();

    const complete = () => {
      if (completed) {
        return;
      }
      completed = true;
      if (worker && onWorkerMessage) {
        worker.off('message', onWorkerMessage);
      }
      releaseAnalysisSlot(state);
    };

    const finish = (error?: grpc.ServiceError) => {
      // Release the single-analysis slot before ending the gRPC call. The Java client can
      // observe end-of-stream and immediately start the next module analysis before this
      // event-loop turn finishes, so ending first can transiently expose a false overlap.
      complete();
      if (error) {
        failResponse(error);
      } else {
        endResponse();
      }
    };

    const writeResponse = (response: AnalyzeProjectStreamResponse) => {
      if (cancelled) {
        return;
      }
      try {
        call.write(response);
      } catch (e) {
        debug(`Failed to write analyze-project stream response: ${e}`);
      }
    };

    const failResponse = (error: grpc.ServiceError) => {
      if (cancelled) {
        return;
      }
      try {
        failStreamingCall(call, error);
      } catch (emitError) {
        debug(`Failed to fail analyze-project stream response: ${emitError}`);
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

    if (worker) {
      onWorkerMessage = (message: AnalyzeProjectWorkerOutMessage) => {
        if (message.requestId !== requestId) {
          return;
        }
        switch (message.type) {
          case 'event':
            writeResponse(message.response);
            return;
          case 'stream-complete':
            if (message.result.type === 'failure') {
              finish(toGrpcErrorFromFailure(message.result));
              return;
            }
            finish();
            return;
          default:
            return;
        }
      };

      worker.on('message', onWorkerMessage);
      // Structured clone strips protobufjs Long helpers (for example int64 maxFileSize), so
      // request normalization in the worker must also accept plain { low, high, unsigned } values.
      worker.postMessage({
        type: 'analyze-stream',
        requestId,
        request: call.request,
      } satisfies AnalyzeProjectWorkerInMessage);
      return;
    }

    void handleRequestInCurrentThread({ type: 'on-analyze-project', data: call.request }, event =>
      writeResponse(toAnalyzeProjectStreamResponse(event.event, event.pathMap)),
    )
      .then(result => {
        if (result.type === 'failure') {
          finish(toGrpcErrorFromFailure(result));
        } else {
          finish();
        }
      })
      .catch(error => {
        finish(toGrpcError(error instanceof Error ? error.message : String(error)));
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
    if (!(await acquireAnalysisSlot(state))) {
      callback(toGrpcError('Another analysis is already running', grpc.status.RESOURCE_EXHAUSTED));
      return;
    }

    if (call.cancelled) {
      releaseAnalysisSlot(state);
      return;
    }

    try {
      if (worker) {
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
          callback(toGrpcErrorFromFailure(result));
          return;
        }

        if (result.result == null) {
          callback(toGrpcError('Missing analyze-project unary result'));
          return;
        }

        callback(null, result.result);
        return;
      }

      const result = await handleRequestInCurrentThread({
        type: 'on-analyze-project',
        data: call.request,
      });
      if (result.type === 'failure') {
        callback(toGrpcErrorFromFailure(result));
        return;
      }

      if (result.result == null) {
        callback(toGrpcError('Missing analyze-project unary result'));
        return;
      }

      callback(null, toAnalyzeProjectUnaryResponse(result.result.output, result.result.pathMap));
    } catch (e) {
      callback(toGrpcError(e instanceof Error ? e.message : String(e)));
    } finally {
      releaseAnalysisSlot(state);
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
    requestAnalysisCancellation(state);
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
        lifecycle.scheduleStartupShutdownTimeout();
        resolve({
          server,
          serverClosed,
        });
      },
    );
  });
}
