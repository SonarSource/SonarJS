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

import { parentPort, workerData } from 'worker_threads';
import { setContext } from '../../shared/src/helpers/context.js';
import { handleRequest } from './handle-request.js';
import { BridgeRequest } from './request.js';

/**
 * Code executed by the worker thread
 */
if (parentPort) {
  setContext(workerData.context);
  const parentThread = parentPort;
  parentThread.on('message', async (message: BridgeRequest | { type: 'close' }) => {
    const { type } = message;
    if (type === 'close') {
      parentThread.close();
    } else {
      parentThread.postMessage(await handleRequest(message));
    }
  });
}
