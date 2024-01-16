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
import express from 'express';
import Timeout from './timeout';

/**
 * Express.js middleware that timeouts after a lapse of time and triggers a function.
 * @param f the timeout function
 * @param delay the timeout delay
 * @returns the timeout middleware with capability to stop the internal timeout
 */
export function timeoutMiddleware(f: () => void, delay: number) {
  const timeout = new Timeout(f, delay);
  timeout.start();

  return {
    middleware(_request: express.Request, response: express.Response, next: express.NextFunction) {
      timeout.stop();

      response.on('finish', function () {
        timeout.start();
      });
      next();
    },
    stop() {
      timeout.stop();
    },
  };
}
