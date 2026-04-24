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
import { debug } from '../../shared/src/helpers/logging.js';
import { handleAnalyzeProjectRequest, type WorkerData } from './analyze-project-handle-request.js';
import type { LeaseRequest, LeaseResponse } from './analyze-project-server-grpc.js';
import { logMemoryError } from './analyze-project-memory.js';
import type {
  AnalyzeProjectIncrementalEvent,
  AnalyzeProjectResponse,
  AnalyzeProjectRuntimeRequest,
  RequestResult,
} from './analyze-project-request.js';
import type {
  AnalyzeProjectWorkerInMessage,
  AnalyzeProjectWorkerOutMessage,
} from './analyze-project-worker/messages.js';

const WORKER_RESPONSE_TIMEOUT_MS = 15_000;

export type HandleRequestInCurrentThread = (
  request: AnalyzeProjectRuntimeRequest,
  incrementalResultsChannel?: (result: AnalyzeProjectIncrementalEvent) => void,
) => Promise<RequestResult<AnalyzeProjectResponse | void>>;

export type AnalyzeProjectServerState = {
  analysisInProgress: boolean;
  leaseCall: grpc.ServerDuplexStream<LeaseRequest, LeaseResponse> | null;
  nextWorkerRequestId: number;
  shuttingDown: boolean;
  startupShutdownTimeout: NodeJS.Timeout | null;
};

export type AnalyzeProjectServerLifecycle = {
  scheduleStartupShutdownTimeout: () => void;
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

export type AnalyzeProjectImplementationDependencies = {
  handleRequestInCurrentThread: HandleRequestInCurrentThread;
  lifecycle: AnalyzeProjectServerLifecycle;
  newWorkerRequestId: () => string;
  state: AnalyzeProjectServerState;
  worker?: Worker;
};

export async function waitForWorkerCompletion(
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

export function createServerState(): AnalyzeProjectServerState {
  return {
    analysisInProgress: false,
    leaseCall: null,
    nextWorkerRequestId: 0,
    shuttingDown: false,
    startupShutdownTimeout: null,
  };
}

export function createHandleRequestInCurrentThread(
  workerData: WorkerData,
): HandleRequestInCurrentThread {
  return (request, incrementalResultsChannel) =>
    handleAnalyzeProjectRequest(request, workerData, incrementalResultsChannel);
}

export function getNextWorkerRequestId(state: AnalyzeProjectServerState): string {
  state.nextWorkerRequestId += 1;
  return String(state.nextWorkerRequestId);
}

function clearStartupShutdownTimeout(state: AnalyzeProjectServerState) {
  if (state.startupShutdownTimeout) {
    clearTimeout(state.startupShutdownTimeout);
    state.startupShutdownTimeout = null;
  }
}

async function cancelAnalysisOnShutdown(
  handleRequestInCurrentThread: HandleRequestInCurrentThread,
  newWorkerRequestId: () => string,
  state: AnalyzeProjectServerState,
  worker?: Worker,
) {
  if (!state.analysisInProgress) {
    return;
  }

  if (worker) {
    try {
      worker.postMessage({
        type: 'cancel',
        requestId: newWorkerRequestId(),
      } satisfies AnalyzeProjectWorkerInMessage);
    } catch (e) {
      debug(`Failed to post cancel to worker: ${e}`);
    }
    return;
  }

  try {
    await handleRequestInCurrentThread({ type: 'on-cancel-analysis' });
  } catch (e) {
    debug(`Failed to cancel in-process analysis: ${e}`);
  }
}

async function closeWorker(worker?: Worker) {
  if (!worker) {
    return;
  }

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

export function createLifecycle({
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
    await cancelAnalysisOnShutdown(handleRequestInCurrentThread, newWorkerRequestId, state, worker);
    await closeWorker(worker);

    server.forceShutdown();
    resolveClosed();
  };

  const scheduleStartupShutdownTimeout = () => {
    if (timeout <= 0) {
      return;
    }
    clearStartupShutdownTimeout(state);
    state.startupShutdownTimeout = setTimeout(() => {
      void shutdown('lease acquisition timeout');
    }, timeout);
  };

  return {
    scheduleStartupShutdownTimeout,
    clearStartupShutdownTimeout: () => clearStartupShutdownTimeout(state),
    requestCancel,
    shutdown,
  };
}

export function attachWorkerLifecycleHandlers(
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
