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
import { debug, getContext, info, warn } from '@sonar/shared/helpers';
import { timeoutMiddleware } from './timeout';
import { AddressInfo } from 'net';
import * as v8 from 'v8';
import * as os from 'os';
import { Worker } from 'worker_threads';
import fs from 'fs';

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

const MB = 1024 * 1024;

function logMemoryConfiguration() {
  const osMem = Math.floor(os.totalmem() / MB);
  const heapSize = Math.floor(v8.getHeapStatistics().heap_size_limit / MB);
  const dockerMemLimit = readDockerMemoryLimit();
  const dockerMem = dockerMemLimit ? `Docker mem: ${dockerMemLimit} MB. ` : '';
  info(`OS memory ${osMem} MB. ${dockerMem}Node.js heap size limit: ${heapSize} MB.`);
  if (heapSize > osMem) {
    warn(
      `Node.js heap size limit ${heapSize} is higher than available memory ${osMem}. Check your configuration of sonar.javascript.node.maxspace`,
    );
  }
}

function readDockerMemoryLimit() {
  return (
    readDockerMemoryLimitFrom('/sys/fs/cgroup/memory.max') ||
    readDockerMemoryLimitFrom('/sys/fs/cgroup/memory.limit_in_bytes')
  );
}

function readDockerMemoryLimitFrom(cgroupPath: string) {
  try {
    const mem = Number.parseInt(fs.readFileSync(cgroupPath, { encoding: 'utf8' }));
    if (Number.isInteger(mem)) {
      return mem / MB;
    }
  } catch (e) {
    // probably not a docker env
  }
  return undefined;
}

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
  logMemoryConfiguration();
  return new Promise(resolve => {
    debug('Starting the bridge server');

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
        shutdown();
      }
    }, timeout);

    /**
     * The order of the middlewares registration is important, as the
     * error handling one should be last.
     */
    app.use(express.json({ limit: MAX_REQUEST_SIZE }));
    app.use(orphanTimeout.middleware);
    app.use(router(worker));
    app.use(errorMiddleware);

    app.post('/close', (_: express.Request, response: express.Response) => {
      debug('Shutting down the bridge server');
      response.end(() => {
        shutdown();
      });
    });

    server.on('close', () => {
      debug('The bridge server shutted down');
      orphanTimeout.stop();
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
      resolve(server);
    });

    server.listen(port, host);

    /**
     * Shutdown the server and the worker thread
     */
    function shutdown() {
      worker.terminate().catch(reason => debug(`Failed to terminate the worker thread: ${reason}`));
      server.close();
    }
  });
}
