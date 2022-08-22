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
import express from 'express';
import { APIError, ErrorCode } from 'errors';
import { JsTsAnalysisOutput } from 'services/analysis';

/**
 * ExpressJs error handling middleware
 * https://expressjs.com/en/guide/error-handling.html
 */
export function errorMiddleware(
  error: Error,
  _request: express.Request,
  response: express.Response,
  // the fourth parameter is necessary to identify this as an error middleware
  _next: express.NextFunction,
) {
  console.error(error.stack);

  let errorCode: ErrorCode;
  if (error instanceof APIError) {
    errorCode = error.code;
  } else {
    errorCode = ErrorCode.Unexpected;
  }

  if (errorCode === ErrorCode.Unexpected) {
    response.json({
      error: error.message,
      // sadly tests aren't ready for a proper format
      /* error: {
        code: errorCode,
        message: error.message,
      }, */
    });

    /*
     * `ParsingError` and cannot be changed without breaking the protocol of
     * the bridge with any other components, e.g. SonarLint).
     */
  } else if ([ErrorCode.Parsing, ErrorCode.FailingTypeScript].includes(errorCode)) {
    response.json({
      parsingError: {
        message: error.message,
        code: errorCode,
      },
      ...EMPTY_JSTS_ANALYSIS_OUTPUT,
    });
  } else if (errorCode === ErrorCode.LinterInitialization) {
    response.json({
      parsingError: {
        message: error.message,
        code: errorCode,
      },
    });
  }
}

/**
 * An empty JavaScript / TypeScript analysis output
 */
export const EMPTY_JSTS_ANALYSIS_OUTPUT: JsTsAnalysisOutput = {
  issues: [],
  highlights: [],
  highlightedSymbols: [],
  metrics: {
    ncloc: [],
    commentLines: [],
    nosonarLines: [],
    executableLines: [],
    functions: 0,
    statements: 0,
    classes: 0,
    complexity: 0,
    cognitiveComplexity: 0,
  },
  cpdTokens: [],
  perf: {
    parseTime: 0,
    analysisTime: 0,
  },
};
