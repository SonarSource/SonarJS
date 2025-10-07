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

// Detect runtime environment
const isDeno = typeof (globalThis as any).Deno !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions?.node;

export async function createWorker(url: string, workerData?: WorkerData): Promise<any> {
  console.log('creating worker with url: ' + url + ' and workerData: ' + workerData + '');
  if (isDeno) {
    // Use Deno's Web Worker API
    return new Promise<any>((resolve, reject) => {
      try {
        const worker = new Worker(url, {
          type: 'module',
        } as any);

        // Send workerData as the first message
        if (workerData) {
          worker.postMessage({ type: 'init', data: workerData });
        }

        worker.onmessage = event => {
          if (event.data.type === 'ready') {
            debug('The worker thread is running');
            resolve(worker);
          }
        };

        worker.onerror = err => {
          debug(`The worker thread failed: ${err}`);
          reject(err);
        };

        worker.onmessageerror = err => {
          debug(`The worker thread message error: ${err}`);
          reject(err);
        };
      } catch (err) {
        debug(`Failed to create worker: ${err}`);
        reject(err);
      }
    });
  } else if (isNode) {
    // Use Node.js worker threads
    const { SHARE_ENV, Worker } = await import('node:worker_threads');
    return new Promise<any>((resolve, reject) => {
      const worker = new Worker(url, {
        workerData,
        env: SHARE_ENV as any,
      });

      worker.on('online', () => {
        debug('The worker thread is running');
        resolve(worker);
      });

      worker.on('exit', code => {
        debug(`The worker thread exited with code ${code}`);
      });

      worker.on('error', err => {
        debug(`The worker thread failed: ${err}`);
        reject(err);
      });
    });
  } else {
    throw new Error('Unsupported runtime environment');
  }
}

export type WorkerData = {
  debugMemory: boolean;
};
