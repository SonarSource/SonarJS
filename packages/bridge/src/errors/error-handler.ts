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
import { ErrorCode } from '../../../shared/src/errors/error.js';
import { error } from '../../../shared/src/helpers/logging.js';

/**
 * Handles errors and converts them to the appropriate response format.
 *
 * This function is used to transform caught exceptions into a format
 * suitable for returning to the Java plugin.
 */
export function handleError(err: any) {
  const { code, message, stack } = err;
  switch (code) {
    case ErrorCode.Parsing:
    case ErrorCode.FailingTypeScript:
    case ErrorCode.LinterInitialization:
      return generateParsingError(err);
    default:
      error(stack);
      return { error: message };
  }
}

function generateParsingError(error: {
  message: string;
  code: ErrorCode;
  data?: { line: number };
}) {
  return {
    parsingError: {
      message: error.message,
      code: error.code,
      line: error.data?.line,
    },
  };
}
