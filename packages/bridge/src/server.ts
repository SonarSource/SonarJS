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
/**
 * `module-alias` must be imported first for module aliasing to work.
 */

import express from 'express';
import * as http from 'http';
import router from './router.js';
import { errorMiddleware } from './errors/index.js';
import { debug } from '../../shared/src/helpers/logging.js';
import { timeoutMiddleware } from './timeout/index.js';
import { AddressInfo } from 'net';
import type { Worker } from 'worker_threads';
import {
  registerGarbageCollectionObserver,
  logMemoryConfiguration,
  logMemoryError,
} from './memory.js';
import { WebSocketServer } from 'ws';

/**
 * The maximum request body size
 */
const MAX_REQUEST_SIZE = '50mb';

/**
 * The default timeout to shut down server if no request is received
 *
 * Normally, the Java plugin sends keepalive requests to the bridge
 * If the Java plugin crashes, this timeout will run out and shut down
 * the bridge to prevent it from becoming an orphan process.
 *
 * If provided TIMEOUT is 0, then no timeout will be enforced.
 */
const SHUTDOWN_TIMEOUT = 15_000;

/**
 * Starts the bridge
 *
 * The bridge is an Express.js web server that exposes several services
 * through a REST API. Once started, the bridge first begins by loading
 * any provided rule bundles and then waits for incoming requests.
 *
 * Communication between two ends is entirely done with the JSON format.
 *
 * Although a web server, the bridge is not exposed to the outside world
 * but rather exclusively communicate either with the JavaScript plugin
 * which embeds it or directly with SonarLint.
 *
 * @param port the port to listen to
 * @param host only for usage from outside of Node.js - Java plugin, SonarLint, ...
 * @param worker Worker thread to handle analysis requests
 * @param debugMemory print memory usage for debugging purposes
 * @param timeout timeout in ms to shut down the server if unresponsive
 * @returns an http server
 */
export function start(
  port = 0,
  host = '127.0.0.1',
  worker?: Worker,
  debugMemory = false,
  timeout = SHUTDOWN_TIMEOUT,
): Promise<{ server: http.Server; serverClosed: Promise<void> }> {
  let unregisterGarbageCollectionObserver = () => {};
  const pendingCloseRequests: express.Response[] = [];
  let resolveClosed: () => void;
  const serverClosed: Promise<void> = new Promise(resolve => {
    resolveClosed = resolve;
  });

  logMemoryConfiguration();
  if (debugMemory) {
    unregisterGarbageCollectionObserver = registerGarbageCollectionObserver();
  }
  return new Promise(resolve => {
    debug('Starting the bridge server');

    if (worker) {
      worker.on('exit', () => {
        closeServer();
      });

      worker.on('error', err => {
        logMemoryError(err);
      });
    }

    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      // Only handle upgrade requests for /ws
      if (request.headers.upgrade?.toLowerCase() === 'websocket' && request.url === '/ws') {
        wss.handleUpgrade(request, socket, head, ws => {
          wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    /**
     * The order of the middlewares registration is important, as the
     * error handling one should be last.
     */
    app.use(express.json({ limit: MAX_REQUEST_SIZE }));

    let orphanTimeout: { middleware: any; cancel: any } | undefined;
    if (timeout !== 0) {
      /**
       * Builds a timeout middleware to shut down the server
       * in case the process becomes orphan.
       */
      orphanTimeout = timeoutMiddleware(close, timeout);
      app.use(orphanTimeout.middleware);
    }

    app.use(router(worker, { debugMemory }, wss));
    app.use(errorMiddleware);

    app.post('/close', (_: express.Request, response: express.Response) => {
      pendingCloseRequests.push(response);
      close();
    });

    server.on('close', () => {
      debug('The bridge server shut down');
      orphanTimeout?.cancel();
      resolveClosed();
    });

    server.on('error', err => {
      debug(`The bridge server failed: ${err}`);
    });

    server.on('listening', () => {
      /**
       * Since we use 0 as the default port, Node.js assigns a random port to the server,
       * which we get using server.address().
       */
      debug(`The bridge server is listening on port ${(server.address() as AddressInfo)?.port}`);
      resolve({ server, serverClosed });
    });

    server.listen(port, host);

    /**
     * Shutdown the server and the worker thread
     */
    function close() {
      if (worker) {
        debug('Shutting down the worker');
        worker.postMessage({ type: 'close' });
      } else {
        closeServer();
      }
    }

    /**
     * Shutdown the server and the worker thread
     */
    function closeServer() {
      debug('Closing server');
      wss.clients.forEach(client => {
        client.terminate(); // Immediately destroys the connection
      });
      wss.close(() => {
        debug('Closed WebSocket connection');
        unregisterGarbageCollectionObserver();
        if (server.listening) {
          while (pendingCloseRequests.length) {
            pendingCloseRequests.pop()?.end();
          }
          /**
           * At this point, the worker thread can no longer respond to any request from the plugin.
           * If we reached this due to worker failure, existing requests are stalled until they time out.
           * Since the bridge server is about to be shut down in an unexpected manner anyway, we can
           * close all connections and avoid waiting unnecessarily for them to eventually close.
           */
          server.closeAllConnections();
          server.close();
        }
      });
    }
  });
}
