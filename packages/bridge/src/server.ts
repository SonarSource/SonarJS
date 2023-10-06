/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
/**
 * `module-alias` must be imported first for module aliasing to work.
 */
import 'module-alias/register';

import express from 'express';
import http from 'http';
import path from 'path';
import router from './router';
import { errorMiddleware } from './errors';
import { debug, getContext } from '@sonar/shared/helpers';
import { timeoutMiddleware } from './timeout';
import { AddressInfo } from 'net';
import { Worker } from 'worker_threads';

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
 */
const SHUTDOWN_TIMEOUT = 15_000;

/**
 * A pool of a single worker thread
 *
 * The main thread of the bridge delegates CPU-intensive operations to
 * a worker thread. These include all HTTP requests sent by the plugin
 * that require maintaining a state across requests, namely initialized
 * linters, created programs, and whatever information TypeScript ESLint
 * and TypeScript keep at runtime.
 */
let worker: Worker;

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
 * @param host only for usage from outside of NodeJS - Java plugin, SonarLint, ...
 * @param timeout timeout in ms to shut down the server if unresponsive
 * @returns an http server
 */
export function start(
  port = 0,
  host = '127.0.0.1',
  timeout = SHUTDOWN_TIMEOUT,
): Promise<http.Server> {
  return new Promise(resolve => {
    debug(`starting the bridge server at port ${port}`);

    worker = new Worker(path.resolve(__dirname, 'worker.js'), {
      workerData: { context: getContext() },
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

    const app = express();
    const server = http.createServer(app);

    /**
     * Builds a timeout middleware to shut down the server
     * in case the process becomes orphan.
     */
    const orphanTimeout = timeoutMiddleware(() => {
      if (server.listening) {
        server.close();
      }
    }, timeout);

    /**
     * The order of the middlewares registration is important, as the
     * error handling one should be last.
     */
    app.use(express.json({ limit: MAX_REQUEST_SIZE }));
    app.use(orphanTimeout.middleware);
    app.use(router);
    app.use(errorMiddleware);

    app.post('/close', (_request: express.Request, response: express.Response) => {
      debug('the bridge server will shutdown');
      response.end(() => {
        worker.terminate();
        server.close();
      });
    });

    server.on('close', () => {
      debug('the bridge server closed');
      orphanTimeout.stop();
    });

    server.on('error', (err: Error) => {
      debug(`the bridge server error: ${err}`);
    });

    server.on('listening', () => {
      /**
       * Since we use 0 as the default port, Node.js assigns a random port to the server,
       * which we get using server.address().
       */
      debug(`the bridge server is running at port ${(server.address() as AddressInfo)?.port}`);
      resolve(server);
    });

    server.listen(port, host);
  });
}
