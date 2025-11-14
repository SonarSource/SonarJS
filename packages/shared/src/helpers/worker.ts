/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { SHARE_ENV, Worker } from 'node:worker_threads';
import { debug } from './logging.js';

export async function createWorker(url: string, workerData?: WorkerData) {
  return new Promise<Worker>((resolve, reject) => {
    const worker = new Worker(url, {
      workerData,
      env: SHARE_ENV,
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
}

export type WorkerData = {
  debugMemory: boolean;
};
