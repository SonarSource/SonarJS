/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import formData from 'form-data';
import express from 'express';
import { Worker } from 'node:worker_threads';
import { JsTsAnalysisOutput } from '../../jsts/src/analysis/analysis.js';
import { handleRequest } from './handle-request.js';

/**
 * Returns a delegate function to handle an HTTP request
 */
export function createDelegator(worker: Worker | undefined) {
  return function (type: string) {
    return worker ? createWorkerHandler(worker, type) : createHandler(type);
  };
}

function handleResult(message: any, response: express.Response, next: express.NextFunction) {
  switch (message.type) {
    case 'success':
      if (message.format === 'multipart') {
        sendFormData(message.result, response);
      } else {
        response.send(message.result);
      }
      break;

    case 'failure':
      next(message.error);
      break;
  }
}

function createHandler(type: string) {
  return async (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    handleResult(await handleRequest({ type, data: request.body }), response, next);
  };
}

function createWorkerHandler(worker: Worker, type: string) {
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

function sendFormData(result: JsTsAnalysisOutput, response: express.Response) {
  const fd = new formData();
  fd.append('ast', Buffer.from(result.ast!), { filename: 'ast' });
  delete result.ast;
  fd.append('json', JSON.stringify(result));
  // this adds the boundary string that will be used to separate the parts
  response.set('Content-Type', fd.getHeaders()['content-type']);
  response.set('Content-Length', `${fd.getLengthSync()}`);
  fd.pipe(response);
}
