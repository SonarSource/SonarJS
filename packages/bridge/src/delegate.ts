/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { Worker } from 'node:worker_threads';
import { JsTsAnalysisOutputWithAst } from '../../jsts/src/analysis/analysis.js';
import { handleRequest } from './handle-request.js';
import { AnalysisOutput } from '../../shared/src/types/analysis.js';
import { RequestResult, RequestType } from './request.js';
import { WorkerData } from '../../shared/src/helpers/worker.js';

/**
 * Returns a delegate function to handle an HTTP request
 */
export function createDelegator(worker: Worker | undefined, workerData: WorkerData) {
  return function (type: RequestType) {
    return worker ? createWorkerHandler(worker, type) : createHandler(type, workerData);
  };
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

function createWorkerHandler(worker: Worker, type: RequestType) {
  return async (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    worker.once('message', message => {
      handleResult(message, response, next);
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

export function outputContainsAst(result: AnalysisOutput): result is JsTsAnalysisOutputWithAst {
  return 'ast' in result;
}
