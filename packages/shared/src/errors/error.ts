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
import { unicodeEscape } from '../helpers/escape.js';

/**
 * The possible codes of analysis errors
 *
 * The `Unexpected` value denotes a runtime error which is either
 * unpredictable or occurs rarely to deserve its own category.
 */
export enum ErrorCode {
  Parsing = 'PARSING',
  FailingTypeScript = 'FAILING_TYPESCRIPT',
  // We are stuck with this name because of possible external dependents
  Unexpected = 'GENERAL_ERROR',
  LinterInitialization = 'LINTER_INITIALIZATION',
}

export interface ErrorData {
  line: number;
}

export class APIError extends Error {
  code: ErrorCode;
  data?: ErrorData;

  private constructor(code: ErrorCode, message: string, data?: ErrorData) {
    super(unicodeEscape(message));
    this.code = code;
    this.data = data;
  }

  /**
   * Builds a failing TypeScript error.
   */
  static failingTypeScriptError(message: string) {
    return new APIError(ErrorCode.FailingTypeScript, message);
  }

  /**
   * Builds a linter initialization error.
   */
  static linterError(message: string) {
    return new APIError(ErrorCode.LinterInitialization, message);
  }

  /**
   * Builds a parsing error.
   */
  static parsingError(message: string, data: ErrorData) {
    return new APIError(ErrorCode.Parsing, message, data);
  }

  /**
   * Builds an unexpected runtime error.
   */
  static unexpectedError(message: string) {
    return new APIError(ErrorCode.Unexpected, message);
  }
}
