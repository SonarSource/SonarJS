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
import { error } from '../../../shared/src/helpers/logging.js';

type ErrorWithCode = {
  message?: string;
  stack?: string;
};

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
  const normalizedError = normalizeError(err);
  response.json(handleError(normalizedError));
}

export function handleError(err: unknown) {
  const normalizedError = normalizeError(err);
  const { message, stack } = normalizedError;
  if (stack) {
    error(stack);
  }
  return { error: message ?? 'Unexpected error' };
}

function normalizeError(err: unknown): ErrorWithCode {
  if (typeof err === 'object' && err !== null) {
    return err as ErrorWithCode;
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  return { message: 'Unexpected error' };
}
