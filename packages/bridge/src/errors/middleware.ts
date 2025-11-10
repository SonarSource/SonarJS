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
import express from 'express';
import { ErrorCode } from '../../../shared/src/errors/error.js';
import { error } from '../../../shared/src/helpers/logging.js';

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
  err: any,
  _request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) {
  response.json(handleError(err));
}

export function handleError(err: any) {
  const { code, message, stack } = err;
  switch (code) {
    case ErrorCode.Parsing:
    case ErrorCode.FailingTypeScript:
    case ErrorCode.LinterInitialization:
      return generateParsingError(err);
    default:
      error(stack);
      return { error: message };
  }
}

function generateParsingError(error: {
  message: string;
  code: ErrorCode;
  data?: { line: number };
}) {
  return {
    parsingError: {
      message: error.message,
      code: error.code,
      line: error.data?.line,
    },
  };
}
