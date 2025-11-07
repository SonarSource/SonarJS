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
import * as express from 'express';
import { Worker } from 'node:worker_threads';
import { createDelegator, createWsDelegator } from './delegate.js';
import { WorkerData } from '../../shared/src/helpers/worker.js';
import { StatusCodes } from 'http-status-codes';
import { WebSocketServer } from 'ws';

export type WorkerMessageListeners = {
  permanent: ((message: any) => void)[];
  oneTimers: ((message: any) => void)[];
};

export default function router(
  worker: Worker | undefined,
  workerData: WorkerData,
  wss: WebSocketServer,
): express.Router {
  const workerMessageListeners: WorkerMessageListeners = { permanent: [], oneTimers: [] };
  if (worker) {
    worker.on('message', message => {
      for (const listener of workerMessageListeners.permanent) {
        listener(message);
      }
      for (const listener of workerMessageListeners.oneTimers) {
        listener(message);
      }
      workerMessageListeners.oneTimers = [];
    });
  }

  const router = express.Router();
  const delegate = createDelegator(worker, workerData, workerMessageListeners);
  const wsDelegate = createWsDelegator(worker, workerData, workerMessageListeners);
  /** Endpoints running on the worker thread */
  router.post('/analyze-project', delegate('on-analyze-project'));
  router.post('/cancel-analysis', delegate('on-cancel-analysis'));
  router.post('/analyze-css', delegate('on-analyze-css'));
  router.post('/analyze-jsts', delegate('on-analyze-jsts'));
  router.post('/analyze-html', delegate('on-analyze-html'));
  router.post('/analyze-yaml', delegate('on-analyze-yaml'));
  router.post('/init-linter', delegate('on-init-linter'));

  wss.on('connection', wsDelegate);

  /** Endpoints running on the main thread */
  router.get('/status', (_, response) => {
    response.sendStatus(StatusCodes.OK);
  });

  return router;
}
