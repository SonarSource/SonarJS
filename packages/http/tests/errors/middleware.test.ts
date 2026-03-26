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
import { APIError } from '../../../analysis/src/contracts/error.js';

describe('errorMiddleware', () => {
  const mockNext = {} as express.NextFunction;

  let mockResponse: Partial<express.Response> & { json: Mock<express.Response['json']> };
  beforeEach(() => {
    mockResponse = {
      json: mock.fn<express.Response['json']>(),
    } as Partial<express.Response> & { json: Mock<express.Response['json']> };
  });
  afterEach(() => {
    mock.reset();
  });

  it('should return an error property for PARSING errors', () => {
    errorMiddleware(
      APIError.parsingError('Unexpected token "{"', { line: 42 }),
      {} as express.Request,
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(mockResponse.json.mock.calls[0].arguments[0], {
      error: 'Unexpected token "{"',
    });
  });

  it('should return an error property for FAILING_TYPESCRIPT errors', () => {
    errorMiddleware(
      APIError.failingTypeScriptError('TypeScript failed for some reason'),
      {} as express.Request,
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        error: 'TypeScript failed for some reason',
      },
    );
  });

  it('should return an error property for LINTER_INITIALIZATION errors', () => {
    errorMiddleware(
      APIError.linterError('Uninitialized linter'),
      {} as express.Request,
      mockResponse as express.Response,
      mockNext,
    );
    assert.deepEqual(
      (mockResponse.json as Mock<typeof mockResponse.json>).mock.calls[0].arguments[0],
      {
        error: 'Uninitialized linter',
      },
    );
  });

  it('should return a property "error" containing the error message for any other error', () => {
    errorMiddleware(
      new Error('Something unexpected happened.'),
      {} as express.Request,
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

  it('should return an error property in handleError for parsing errors', () => {
    assert.deepEqual(
      handleError(APIError.parsingError('Unexpected token "{"', { line: 42, column: 7 })),
      {
        error: 'Unexpected token "{"',
      },
    );
  });
});
