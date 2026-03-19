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
import {
  createConfiguration,
  isCssFile,
  isJsFile,
  isTsFile,
} from '../../../shared/src/helpers/configuration.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';
import type {
  ParsingError,
  ParsingErrorLanguage,
} from '../../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';

type RequestWithConfig = {
  filePath: string;
  fileContent?: string;
  configuration: unknown;
};

type ErrorWithCode = {
  code?: ErrorCode;
  message?: string;
  stack?: string;
  data?: { line?: number };
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
  request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) {
  const normalizedError = normalizeError(err);
  const language = isParsingErrorCode(normalizedError.code)
    ? inferParsingErrorLanguage(request)
    : undefined;
  response.json(handleError(normalizedError, language));
}

export function handleError(err: unknown, language?: ParsingErrorLanguage) {
  const normalizedError = normalizeError(err);
  const { code, message, stack } = normalizedError;
  switch (code) {
    case ErrorCode.Parsing:
    case ErrorCode.FailingTypeScript:
    case ErrorCode.LinterInitialization:
      return generateParsingError(normalizedError, resolveParsingErrorLanguage(code, language));
    default:
      if (stack) {
        error(stack);
      }
      return { error: message ?? 'Unexpected error' };
  }
}

function resolveParsingErrorLanguage(
  code: ErrorCode,
  language?: ParsingErrorLanguage,
): ParsingErrorLanguage {
  if (language) {
    return language;
  }
  if (code === ErrorCode.FailingTypeScript) {
    return 'ts';
  }
  throw new Error(`Missing parsing error language for ${code}`);
}

function inferParsingErrorLanguage(request: express.Request): ParsingErrorLanguage {
  const parsedRequest = asRequestWithConfig(request.body);
  const filePath = normalizeToAbsolutePath(parsedRequest.filePath);
  const configuration = createConfiguration(parsedRequest.configuration);
  if (isCssFile(filePath, configuration.cssSuffixes)) {
    return 'css';
  }
  if (isTsFile(filePath, parsedRequest.fileContent ?? '', configuration.tsSuffixes)) {
    return 'ts';
  }
  if (isJsFile(filePath, configuration.jsSuffixes)) {
    return 'js';
  }
  throw new Error(`Unable to infer parsing error language for file '${parsedRequest.filePath}'`);
}

function asRequestWithConfig(value: unknown): RequestWithConfig {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Cannot infer parsing error language: request body is missing');
  }
  const request = value as Record<string, unknown>;
  if (typeof request.filePath !== 'string') {
    throw new Error('Cannot infer parsing error language: request.filePath is missing');
  }
  if (typeof request.configuration !== 'object' || request.configuration === null) {
    throw new Error('Cannot infer parsing error language: request.configuration is missing');
  }
  return {
    filePath: request.filePath,
    fileContent: typeof request.fileContent === 'string' ? request.fileContent : undefined,
    configuration: request.configuration,
  };
}

function generateParsingError(err: ErrorWithCode, language: ParsingErrorLanguage) {
  const parsingError: ParsingError = {
    message: err.message ?? 'Parsing failed',
    code: err.code as ErrorCode,
    line: err.data?.line,
    language,
  };
  return {
    parsingError,
  };
}

function isParsingErrorCode(
  code: ErrorCode | undefined,
): code is ErrorCode.Parsing | ErrorCode.FailingTypeScript | ErrorCode.LinterInitialization {
  return (
    code === ErrorCode.Parsing ||
    code === ErrorCode.FailingTypeScript ||
    code === ErrorCode.LinterInitialization
  );
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
