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

class Timeout {
  private timeout: NodeJS.Timeout | null = null;
  constructor(private readonly f: () => void, private readonly ms: number) {}
  init() {
    this.cancel();
    this.timeout = setTimeout(this.f, this.ms);
  }
  cancel() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

function timeoutTimeoutMiddleware(server: http.Server, shutdownTimeout: number) {
  let closed = false;
  const timeout = new Timeout(() => {
    server.close();
  }, shutdownTimeout);
  timeout.init();
  return {
    middleware(_request: express.Request, res: express.Response, next: express.NextFunction) {
      if (!closed) {
        timeout.cancel();
        res.on('finish', function () {
          timeout.init();
        });
      }
      next();
    },
    heartBeatHandler(_req: express.Request, res: express.Response) {
      if (!closed) {
        timeout.init();
      }
      res.end();
    },
    close() {
      closed = true;
      timeout.cancel();
    },
  };
}

export { timeoutTimeoutMiddleware };
