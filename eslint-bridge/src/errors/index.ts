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

/**
 * The possible codes of analysis errors
 *
 * The `GeneralError` value denotes a runtime error which is either
 * unpredictable or occurs rarely to deserve its own category.
 *
 * Still, any analysis is subject to errors (which was initially named
 * `parsingError` and cannot be changed without breaking the protocol of
 * the bridge with any other components, e.g. SonarLint).
 */
export enum ErrorCode {
  Parsing = 'PARSING',
  FailingTypeScript = 'FAILING_TYPESCRIPT',
  UnexpectedError = 'UNEXPECTED_ERROR',
  LinterInitialization = 'LINTER_INITIALIZATION',
}

type ErrorData = {
  line?: number;
};

export function buildFailingTypeScriptError(message: string, data: ErrorData = {}) {
  const error = new APIError(ErrorCode.FailingTypeScript, message, data);
  return error;
}

export function buildParsingError(message: string, data: ErrorData = {}) {
  const error = new APIError(ErrorCode.Parsing, message, data);
  return error;
}
export function buildLinterError(message: string) {
  return new APIError(ErrorCode.LinterInitialization, message);
}

export class APIError extends Error {
  code: ErrorCode;
  data: ErrorData;
  constructor(code: ErrorCode, message: string, data: ErrorData = {}) {
    super(message);
    this.code = code;
    this.data = data;
  }
}
