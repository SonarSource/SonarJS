/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

type ParsingErrorCode =
  ErrorCode.Parsing | ErrorCode.FailingTypeScript | ErrorCode.LinterInitialization;

export type ParsingErrorLanguage = 'js' | 'ts' | 'css';

export type ParsingError = {
  message: string;
  code: ParsingErrorCode;
  line?: number;
  column?: number;
  language: ParsingErrorLanguage;
};

type ProjectParsingResult = {
  issues: [];
  parsingErrors: ParsingError[];
};

export type ProjectFailureResult = ProjectParsingResult | { error: string };

export function toProjectFailureResult(
  failure: unknown,
  language: ParsingErrorLanguage,
): ProjectFailureResult {
  if (failure instanceof APIError) {
    const { code } = failure;
    let message: string;
    switch (code) {
      case ErrorCode.Parsing:
        message = failure.message;
        break;
      case ErrorCode.FailingTypeScript:
      case ErrorCode.LinterInitialization:
        message = handleError(failure).error;
        break;
      default:
        return handleError(failure);
    }
    return {
      issues: [],
      parsingErrors: [
        {
          message,
          code,
          line: failure.data?.line,
          column: failure.data?.column,
          language,
        },
      ],
    };
  }

  if (failure instanceof Error) {
    return handleError(failure);
  }

  return { error: String(failure) };
}
