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
