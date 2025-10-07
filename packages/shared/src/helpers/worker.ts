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

import { debug } from './logging.js';

export type WorkerData = {
  debugMemory: boolean;
};

/**
 * Creates a Deno Worker and sends initial data via postMessage.
 * @param url Path or URL to the worker script
 * @param workerData Initial data to send to the worker
 */
export async function createWorker(url: string | URL, workerData?: WorkerData): Promise<Worker> {
  return new Promise<Worker>((resolve, reject) => {
    const worker = new Worker(
      typeof url === 'string' ? new URL(url, import.meta.url).href : url.href,
      {
        type: 'module',
        name: 'sonarqube-worker',
        deno: {
          namespace: true, // allow Deno APIs in worker
          permissions: 'inherit', // inherit permissions from main thread
        },
      },
    );

    // Send initial data to worker
    if (workerData) {
      worker.postMessage(workerData);
    }

    // Simulate "online" event: first message from worker
    worker.onmessage = event => {
      if (event.data === '__ready__') {
        debug('The worker thread is running');
        resolve(worker);
      } else {
        debug(`Main received message from worker: ${JSON.stringify(event.data)}`);
      }
    };

    worker.onerror = err => {
      debug(`The worker thread failed: ${err.message ?? err}`);
      reject(err);
    };

    // Deno workers don't have "exit" event — you can listen for close
    worker.onmessageerror = err => {
      debug(`Message error in worker: ${err}`);
    };
  });
}
