/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { SHARE_ENV, Worker } from 'node:worker_threads';
import { Context } from './context.js';
import { debug } from './logging.js';

export function createWorker(url: string, context: Context) {
  const worker = new Worker(url, {
    workerData: { context },
    env: SHARE_ENV,
  });

  worker.on('online', () => {
    debug('The worker thread is running');
  });

  worker.on('exit', code => {
    debug(`The worker thread exited with code ${code}`);
  });

  worker.on('error', err => {
    debug(`The worker thread failed: ${err}`);
  });
  return worker;
}
