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
import { SHARE_ENV, Worker } from 'node:worker_threads';
import { debug } from './logging.js';

export function createWorker(url: string, context: any) {
  let worker = new Worker(url, {
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
