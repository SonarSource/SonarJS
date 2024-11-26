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
import express from 'express';
import { Timeout } from './timeout.js';

/**
 * Express.js middleware that timeouts after a lapse of time and triggers a function.
 * @param f the timeout function
 * @param delay the timeout delay
 * @returns the timeout middleware with capability to stop the internal timeout
 */
export function timeoutMiddleware(f: () => void, delay: number) {
  const timeout = new Timeout(f, delay);
  timeout.start();
  let cancelled = false;

  return {
    middleware(_request: express.Request, response: express.Response, next: express.NextFunction) {
      if (!cancelled) {
        timeout.stop();

        response.on('finish', function () {
          timeout.start();
        });
      }
      next();
    },
    cancel() {
      cancelled = true;
      timeout.stop();
    },
  };
}
