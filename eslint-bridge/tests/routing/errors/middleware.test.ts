/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import {
  buildFailingTypeScriptError,
  buildLinterError,
  buildParsingError,
  ErrorCode,
} from 'errors';
import { Response } from 'express';
import { EMPTY_JSTS_ANALYSIS_OUTPUT, errorMiddleware } from 'routing/errors';

describe('errorMiddleware', () => {
  const message = 'hello';
  const line = 12;

  let mockResponse: Partial<Response>;
  beforeEach(() => {
    mockResponse = {
      json: jest.fn(),
    };
  });

  it('should return empty JS/TS analysis properties and a complete parsingError for PARSING errors', () => {
    errorMiddleware(buildParsingError(message, { line }), null, mockResponse as Response, null);
    expect(mockResponse.json).toBeCalledWith({
      parsingError: {
        message,
        line,
        code: ErrorCode.Parsing,
      },
      ...EMPTY_JSTS_ANALYSIS_OUTPUT,
    });
  });
  it('should return a parsingError with properties "message" and "code" for FAILING_TYPESCRIPT errors', () => {
    errorMiddleware(
      buildFailingTypeScriptError(message),
      null,
      mockResponse as Response,
      null,
    );
    expect(mockResponse.json).toBeCalledWith({
      parsingError: {
        message,
        code: ErrorCode.FailingTypeScript,
      },
    });
  });
  it('should return a parsingError with properties "message" and "code" for LINTER_INITIALIZATION errors', () => {
    errorMiddleware(buildLinterError(message), null, mockResponse as Response, null);
    expect(mockResponse.json).toBeCalledWith({
      parsingError: {
        message,
        code: ErrorCode.LinterInitialization,
      },
    });
  });
  it('should return a propery "error" containing the error message for any other error', () => {
    errorMiddleware(new Error(message), null, mockResponse as Response, null);
    expect(mockResponse.json).toBeCalledWith({
      error: message,
    });
  });
});
