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
import { ErrorCode, APIError } from '@sonar/shared';
import * as express from 'express';
import { EMPTY_JSTS_ANALYSIS_OUTPUT, errorMiddleware } from '../../src/errors';

describe('errorMiddleware', () => {
  const mockRequest = {} as express.Request;
  const mockNext = {} as express.NextFunction;

  let mockResponse: Partial<express.Response>;
  beforeEach(() => {
    mockResponse = {
      json: jest.fn(),
      status: jest.fn(() => mockResponse as express.Response),
    };
  });

  it('should return empty JS/TS analysis properties and a complete parsingError for PARSING errors', () => {
    errorMiddleware(
      APIError.parsingError('Unexpected token "{"', { line: 42 }),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    expect(mockResponse.json).toBeCalledWith({
      parsingError: {
        message: 'Unexpected token "{"',
        line: 42,
        code: ErrorCode.Parsing,
      },
      ...EMPTY_JSTS_ANALYSIS_OUTPUT,
    });
  });

  it('should return a parsingError with properties "message" and "code" for FAILING_TYPESCRIPT errors', () => {
    errorMiddleware(
      APIError.failingTypeScriptError('TypeScript failed for some reason'),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    expect(mockResponse.json).toBeCalledWith({
      parsingError: {
        message: 'TypeScript failed for some reason',
        code: ErrorCode.FailingTypeScript,
      },
    });
  });

  it('should return a parsingError with properties "message" and "code" for LINTER_INITIALIZATION errors', () => {
    errorMiddleware(
      APIError.linterError('Uninitialized linter'),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    expect(mockResponse.json).toBeCalledWith({
      parsingError: {
        message: 'Uninitialized linter',
        code: ErrorCode.LinterInitialization,
      },
    });
  });

  it('should return a propery "error" containing the error message for any other error', () => {
    errorMiddleware(
      new Error('Something unexpected happened.'),
      mockRequest,
      mockResponse as express.Response,
      mockNext,
    );
    expect(mockResponse.json).toBeCalledWith({
      error: 'Something unexpected happened.',
    });
    expect(mockResponse.status).toBeCalledWith(500);
  });
});
