/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import express from 'express';
import { handleRequest } from './handle-request.js';
import { info, debug, error } from '../../shared/src/helpers/logging.js';
import type { Worker } from 'node:worker_threads';
import type { BridgeRequest, RequestResult, RequestType, WsIncrementalResult } from './request.js';
import type { WorkerData } from '../../shared/src/helpers/worker.js';
import type { RawData, WebSocket } from 'ws';
import type { WorkerMessageListeners } from './router.js';

/**
 * Returns a delegate function to handle an HTTP request
 */
export function createDelegator(
  worker: Worker | undefined,
  workerData: WorkerData,
  listeners: WorkerMessageListeners,
) {
  return worker
    ? (type: RequestType) => createWorkerHandler(worker, type, listeners)
    : (type: RequestType) => createHandler(type, workerData);
}

/**
 * Handler to analyze in the same thread as HTTP server. Used for testing purposes
 * @param type the request type, i.e. endpoint
 * @param workerData print memory usage for debugging purposes
 */
function createHandler(type: RequestType, workerData: WorkerData) {
  return async (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    handleResult(await handleRequest({ type, data: request.body }, workerData), response, next);
  };
}

function createWorkerHandler(worker: Worker, type: RequestType, listeners: WorkerMessageListeners) {
  return async (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    listeners.oneTimers.push(message => {
      if (!message.ws) {
        handleResult(message, response, next);
      }
    });
    worker.postMessage({ type, data: request.body });
  };
}

function handleResult(
  message: RequestResult,
  response: express.Response,
  next: express.NextFunction,
) {
  switch (message.type) {
    case 'success':
      response.send(message.result);
      break;

    case 'failure':
      next(message.error);
      break;
  }
}

/**
 * Returns a delegate function to handle a web socket message
 */
export function createWsDelegator(
  worker: Worker | undefined,
  workerData: WorkerData,
  listeners: WorkerMessageListeners,
) {
  return (ws: WebSocket) => {
    info('WebSocket client connected on /ws');
    if (worker) {
      listeners.permanent.push(message => {
        if (message.ws) {
          handleWsResult(ws, message.results);
        }
      });
    }

    ws.on('message', async message => {
      const data: BridgeRequest = decodeMessage(message);
      if (worker) {
        worker.postMessage({ ws: true, ...data });
      } else {
        await handleRequest(data, workerData, message => handleWsResult(ws, message));
      }
    });

    ws.on('close', (code, reason) => {
      debug(`WebSocket client disconnected: ${reason} with code ${code}`);
    });

    ws.on('error', err => {
      error(`WebSocket client error: ${err}`);
    });
  };
}

function handleWsResult(ws: WebSocket, message: WsIncrementalResult) {
  ws.send(JSON.stringify(message));
}

function decodeMessage(message: RawData) {
  let jsonString = '';
  if (Buffer.isBuffer(message)) {
    jsonString = message.toString('utf8');
  } else if (Array.isArray(message)) {
    jsonString = Buffer.concat(message).toString('utf8');
  }
  return JSON.parse(jsonString);
}
