/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import http from 'http';
import express from 'express';
import router from './routing';
import { debug } from './helpers';
import { loadBundles } from './linting/eslint';

/**
 * The maximum request body size
 */
const MAX_REQUEST_SIZE = '50mb';

/**
 * Starts the bridge
 *
 * The bridge is an Express.js web server that exposes several services
 * through a REST API. Once started, the bridge first begins by loading
 * any provided rule bundles and then waits for incoming requests.
 *
 * Communication between two ends is entirely done with the JSON format.
 *
 * Altough a web server, the bridge is not exposed to the outside world
 * but rather exclusively communicate either with the JavaScript plugin
 * which embedds it or directly with SonarLint.
 *
 * @param port the port to listen to
 * @param host the host to listen to
 * @param bundles the rule bundles to load
 * @returns an http server
 */
export function start(port = 0, host = '127.0.0.1', bundles: string[] = []): Promise<http.Server> {
  loadBundles(bundles);

  return new Promise(resolve => {
    debug(`starting eslint-bridge server at port ${port}`);

    const app = express();
    let server: http.Server;

    app.use(express.json({ limit: MAX_REQUEST_SIZE }));
    app.use(router);
    app.post('/close', (_request: express.Request, response: express.Response) => {
      debug('eslint-bridge server will shutdown');
      response.end(() => {
        server.close();
      });
    });

    server = app.listen(port, host, () => {
      debug(`eslint-bridge server is running at port ${port}`);
      resolve(server);
    });
  });
}
