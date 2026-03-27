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
import { APIError, ErrorCode } from './error.js';
import { handleError } from '../../../shared/src/helpers/error.js';

export type ParsingErrorCode =
  | ErrorCode.Parsing
  | ErrorCode.FailingTypeScript
  | ErrorCode.LinterInitialization;

export type ParsingErrorLanguage = 'js' | 'ts' | 'css';

export type ParsingError = {
  message: string;
  code: ParsingErrorCode;
  line?: number;
  column?: number;
  language: ParsingErrorLanguage;
};

export type ProjectParsingResult = {
  issues: [];
  parsingErrors: ParsingError[];
};

export type ProjectFailureResult = ProjectParsingResult | { error: string };

function isParsingErrorCode(code: ErrorCode | undefined): code is ParsingErrorCode {
  return (
    code === ErrorCode.Parsing ||
    code === ErrorCode.FailingTypeScript ||
    code === ErrorCode.LinterInitialization
  );
}

export function toProjectFailureResult(
  failure: unknown,
  language: ParsingErrorLanguage,
): ProjectFailureResult {
  if (failure instanceof APIError) {
    if (isParsingErrorCode(failure.code)) {
      const { error } = handleError(failure);
      return {
        issues: [],
        parsingErrors: [
          {
            message: error,
            code: failure.code,
            line: failure.data?.line,
            column: failure.data?.column,
            language,
          },
        ],
      };
    }
    return handleError(failure);
  }

  if (failure instanceof Error) {
    return handleError(failure);
  }

  return { error: String(failure) };
}
