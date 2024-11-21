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
import { EMPTY_JSTS_ANALYSIS_OUTPUT, errorMiddleware } from '../../src/errors/index.js';
import assert from 'assert';

import { describe, it, beforeEach, mock, Mock } from 'node:test';
import { APIError, ErrorCode } from '../../../shared/src/errors/error.js';

describe('errorMiddleware', () => {
  const mockRequest = {} as express.Request;
  const mockNext = {} as express.NextFunction;

  let mockResponse: Partial<express.Response>;
  beforeEach(() => {
    mockResponse = {
      json: mock.fn(),
    };
  });

  it('should return empty JS/TS analysis properties and a complete parsingError for PARSING errors', () => {
    errorMiddleware(
      APIError.parsingError('Unexpected token "{"', { line: 42 }),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        parsingError: {
          message: 'Unexpected token "{"',
          line: 42,
          code: ErrorCode.Parsing,
        },
        ...EMPTY_JSTS_ANALYSIS_OUTPUT,
      },
    );
  });

  it('should return a parsingError with properties "message" and "code" for FAILING_TYPESCRIPT errors', () => {
    errorMiddleware(
      APIError.failingTypeScriptError('TypeScript failed for some reason'),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        parsingError: {
          message: 'TypeScript failed for some reason',
          code: ErrorCode.FailingTypeScript,
        },
      },
    );
  });

  it('should return a parsingError with properties "message" and "code" for LINTER_INITIALIZATION errors', () => {
    errorMiddleware(
      APIError.linterError('Uninitialized linter'),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        parsingError: {
          message: 'Uninitialized linter',
          code: ErrorCode.LinterInitialization,
        },
      },
    );
  });

  it('should return a property "error" containing the error message for any other error', () => {
    errorMiddleware(
      new Error('Something unexpected happened.'),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        error: 'Something unexpected happened.',
      },
    );
  });
});
