/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type express from 'express';
import { handleError } from '../../../shared/src/helpers/error.js';

/**
 * Express.js middleware for handling error while serving requests.
 *
 * The purpose of this middleware is to catch any error occurring within
 * the different layers of the bridge to centralize and customize error
 * information that is sent back.
 *
 * The fourth parameter is necessary to identify this as an error middleware.
 * @see https://expressjs.com/en/guide/error-handling.html
 */
export function errorMiddleware(
  err: unknown,
  _request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) {
  response.json(handleError(err));
}
