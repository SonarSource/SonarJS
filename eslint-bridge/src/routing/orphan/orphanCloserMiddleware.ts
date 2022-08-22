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
import Timeout from './Timeout';

/**
 * Express middleware that closes the server if no request is received in a laps of time
 */
export function orphanCloserMiddleware(server: http.Server, shutdownTimeout: number) {
  const timeout = new Timeout(() => {
    if (server.listening) {
      server.close();
    }
  }, shutdownTimeout);
  timeout.init();
  return {
    middleware(_request: express.Request, res: express.Response, next: express.NextFunction) {
      timeout.cancel();
      res.on('finish', function () {
        timeout.init();
      });
      next();
    },
    cancel() {
      timeout.cancel();
    },
  };
}
