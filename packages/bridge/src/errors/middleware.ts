/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { ErrorCode, error } from '@sonar/shared';
import { JsTsAnalysisOutput } from '@sonar/jsts';

/**
 * Express.js middleware for handling error while serving requests.
 *
 * The purpose of this middleware is to catch any error occuring within
 * the different layers of the bridge to centralize and customize error
 * information that is sent back.
 *
 * The fourth parameter is necessary to identify this as an error middleware.
 * @see https://expressjs.com/en/guide/error-handling.html
 */
export function errorMiddleware(
  err: any,
  _request: express.Request,
  response: express.Response,
  _next: express.NextFunction,
) {
  const { code, message, stack } = err;
  switch (code) {
    case ErrorCode.Parsing:
      response.json(parseParsingError(err));
      break;
    case ErrorCode.FailingTypeScript:
    case ErrorCode.LinterInitialization:
      response.json({
        parsingError: {
          message,
          code,
        },
      });
      break;
    default:
      error(stack);
      response.json({ error: message });
      break;
  }
}

export function parseParsingError(error: {
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
    ...EMPTY_JSTS_ANALYSIS_OUTPUT,
  };
}

/**
 * An empty JavaScript / TypeScript analysis output sent back on paring errors.
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
