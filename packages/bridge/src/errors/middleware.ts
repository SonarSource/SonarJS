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
import { ErrorCode } from '../../../shared/src/errors/error.js';
import { error } from '../../../shared/src/helpers/logging.js';

export type ParsingErrorLanguage = 'js' | 'ts' | 'css';

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
  request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) {
  response.json(handleError(err, inferParsingErrorLanguage(request, err)));
}

export function handleError(err: any, language?: ParsingErrorLanguage) {
  const { code, message, stack } = err;
  switch (code) {
    case ErrorCode.Parsing:
    case ErrorCode.FailingTypeScript:
    case ErrorCode.LinterInitialization:
      return generateParsingError(err, resolveParsingErrorLanguage(code, language));
    default:
      error(stack);
      return { error: message };
  }
}

function resolveParsingErrorLanguage(
  code: ErrorCode,
  language?: ParsingErrorLanguage,
): ParsingErrorLanguage {
  if (language !== undefined) {
    return language;
  }
  return code === ErrorCode.FailingTypeScript ? 'ts' : 'js';
}

function inferParsingErrorLanguage(request: express.Request, err: any): ParsingErrorLanguage {
  const fromRequest = inferLanguageFromFilePath(request.body?.filePath);
  return resolveParsingErrorLanguage(err?.code, fromRequest);
}

function inferLanguageFromFilePath(filePath: unknown): ParsingErrorLanguage | undefined {
  if (typeof filePath !== 'string') {
    return undefined;
  }
  const path = filePath.toLowerCase();
  if (
    path.endsWith('.css') ||
    path.endsWith('.scss') ||
    path.endsWith('.sass') ||
    path.endsWith('.less')
  ) {
    return 'css';
  }
  if (
    path.endsWith('.ts') ||
    path.endsWith('.tsx') ||
    path.endsWith('.cts') ||
    path.endsWith('.mts')
  ) {
    return 'ts';
  }
  return 'js';
}

function generateParsingError(
  error: {
    message: string;
    code: ErrorCode;
    data?: { line: number };
  },
  language: ParsingErrorLanguage,
) {
  const parsingError: {
    message: string;
    code: ErrorCode;
    line: number | undefined;
    language: ParsingErrorLanguage;
  } = {
    message: error.message,
    code: error.code,
    line: error.data?.line,
    language,
  };
  return {
    parsingError,
  };
}
