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
import { errorMiddleware, handleError } from '../../src/errors/middleware.js';
import assert from 'node:assert';

import { describe, it, beforeEach, afterEach, mock, type Mock } from 'node:test';
import { APIError, ErrorCode } from '../../../shared/src/errors/error.js';

describe('errorMiddleware', () => {
  const mockNext = {} as express.NextFunction;
  const mockRequest = (filePath: string) =>
    ({
      body: {
        filePath,
        configuration: {
          baseDir: '/project',
          jsSuffixes: ['.js', '.jsx', '.cjs', '.mjs'],
          tsSuffixes: ['.ts', '.tsx', '.cts', '.mts'],
          cssSuffixes: ['.css', '.scss', '.sass', '.less'],
        },
      },
    }) as express.Request;

  let mockResponse: Partial<express.Response> & { json: Mock<express.Response['json']> };
  beforeEach(() => {
    mockResponse = {
      json: mock.fn<express.Response['json']>(),
    } as Partial<express.Response> & { json: Mock<express.Response['json']> };
  });
  afterEach(() => {
    mock.reset();
  });

  it('should return empty JS/TS analysis properties and a complete parsingError for PARSING errors', () => {
    errorMiddleware(
      APIError.parsingError('Unexpected token "{"', { line: 42 }),
      mockRequest('/project/src/file.js'),
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(mockResponse.json.mock.calls[0].arguments[0], {
      parsingError: {
        message: 'Unexpected token "{"',
        line: 42,
        code: ErrorCode.Parsing,
        language: 'js',
      },
    });
  });

  it('should return a parsingError with properties "message" and "code" for FAILING_TYPESCRIPT errors', () => {
    errorMiddleware(
      APIError.failingTypeScriptError('TypeScript failed for some reason'),
      mockRequest('/project/src/file.ts'),
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        parsingError: {
          message: 'TypeScript failed for some reason',
          line: undefined,
          code: ErrorCode.FailingTypeScript,
          language: 'ts',
        },
      },
    );
  });

  it('should return a parsingError with properties "message" and "code" for LINTER_INITIALIZATION errors', () => {
    errorMiddleware(
      APIError.linterError('Uninitialized linter'),
      mockRequest('/project/src/file.js'),
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        parsingError: {
          message: 'Uninitialized linter',
          line: undefined,
          code: ErrorCode.LinterInitialization,
          language: 'js',
        },
      },
    );
  });

  it('should return a property "error" containing the error message for any other error', () => {
    errorMiddleware(
      new Error('Something unexpected happened.'),
      mockRequest('/project/src/file.js'),
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

  it('should include parsing error language and column when provided', () => {
    assert.deepEqual(
      handleError(APIError.parsingError('Unexpected token "{"', { line: 42, column: 7 }), 'css'),
      {
        parsingError: {
          message: 'Unexpected token "{"',
          line: 42,
          column: 7,
          code: ErrorCode.Parsing,
          language: 'css',
        },
      },
    );
  });

  it('should infer css parsing error language from configured suffixes', () => {
    errorMiddleware(
      APIError.parsingError('Unclosed block', { line: 2 }),
      mockRequest('/project/src/style.scss'),
      mockResponse as express.Response,
      mockNext,
    );

    assert.deepEqual(mockResponse.json.mock.calls[0].arguments[0], {
      parsingError: {
        message: 'Unclosed block',
        line: 2,
        code: ErrorCode.Parsing,
        language: 'css',
      },
    });
  });

  it('should infer ts parsing error language from configured suffixes', () => {
    errorMiddleware(
      APIError.parsingError('Unexpected token', { line: 3 }),
      mockRequest('/project/src/file.mts'),
      mockResponse as express.Response,
      mockNext,
    );

    assert.deepEqual(mockResponse.json.mock.calls[0].arguments[0], {
      parsingError: {
        message: 'Unexpected token',
        line: 3,
        code: ErrorCode.Parsing,
        language: 'ts',
      },
    });
  });

  it('should fallback to js parsing error language when request body is missing', () => {
    errorMiddleware(
      APIError.parsingError('Unexpected token', { line: 3 }),
      {} as express.Request,
      mockResponse as express.Response,
      mockNext,
    );

    assert.deepEqual(mockResponse.json.mock.calls[0].arguments[0], {
      parsingError: {
        message: 'Unexpected token',
        line: 3,
        code: ErrorCode.Parsing,
        language: 'js',
      },
    });
  });

  it('should fallback to js parsing error language for unknown file extensions', () => {
    errorMiddleware(
      APIError.parsingError('Unexpected token', { line: 3 }),
      mockRequest('/project/src/file.unknown'),
      mockResponse as express.Response,
      mockNext,
    );

    assert.deepEqual(mockResponse.json.mock.calls[0].arguments[0], {
      parsingError: {
        message: 'Unexpected token',
        line: 3,
        code: ErrorCode.Parsing,
        language: 'js',
      },
    });
  });

  it('should fallback to ts parsing error language for FAILING_TYPESCRIPT errors', () => {
    errorMiddleware(
      APIError.failingTypeScriptError('TypeScript failed'),
      {} as express.Request,
      mockResponse as express.Response,
      mockNext,
    );

    assert.deepEqual(mockResponse.json.mock.calls[0].arguments[0], {
      parsingError: {
        message: 'TypeScript failed',
        line: undefined,
        code: ErrorCode.FailingTypeScript,
        language: 'ts',
      },
    });
  });
});
