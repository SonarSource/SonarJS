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
import * as express from 'express';
import { Worker } from 'worker_threads';
import { createDelegator } from './delegate.js';
import { WorkerData } from '../../shared/src/helpers/worker.js';
import { StatusCodes } from 'http-status-codes';
import { RawData, WebSocketServer } from 'ws';

export default function (
  worker: Worker | undefined,
  workerData: WorkerData,
  wss: WebSocketServer,
): express.Router {
  const router = express.Router();
  const delegate = createDelegator(worker, workerData);

  /** Endpoints running on the worker thread */
  router.post('/analyze-project', delegate('on-analyze-project'));
  router.post('/analyze-css', delegate('on-analyze-css'));
  router.post('/analyze-jsts', delegate('on-analyze-jsts'));
  router.post('/analyze-html', delegate('on-analyze-html'));
  router.post('/analyze-yaml', delegate('on-analyze-yaml'));
  router.post('/create-program', delegate('on-create-program'));
  router.post('/create-tsconfig-file', delegate('on-create-tsconfig-file'));
  router.post('/delete-program', delegate('on-delete-program'));
  router.post('/init-linter', delegate('on-init-linter'));
  router.post('/new-tsconfig', delegate('on-new-tsconfig'));
  router.post('/tsconfig-files', delegate('on-tsconfig-files'));
  router.get('/get-telemetry', delegate('on-get-telemetry'));

  wss.on('connection', ws => {
    console.log('WebSocket client connected on /ws');

    ws.on('message', message => {
      // Example: echo back
      if (worker) {
        worker.on('message', message => {
          ws.send(message);
        });

        console.log('Sending message to worker');
        const data = decodeMessage(message);
        worker.postMessage({ type: 'on-analyze-project', data, ws: true });
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  /** Endpoints running on the main thread */
  router.get('/status', (_, response) => {
    response.sendStatus(StatusCodes.OK);
  });

  return router;
}

function decodeMessage(message: RawData) {
  // Handle Buffer or string
  let jsonString: string = '';
  console.log(message);
  if (Buffer.isBuffer(message)) {
    jsonString = message.toString('utf8');
  } else if (Array.isArray(message)) {
    // Rare, but possible: concatenate all buffers
    jsonString = Buffer.concat(message).toString('utf8');
  }
  return JSON.parse(jsonString);
}
