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

import { AnalysisError, AnalysisErrorCode } from './errors';

/**
 * An analysis function
 *
 * Every analysis consumes an input and produces an output regardless of whether
 * the analysis denotes a CSS analysis, a JavaScript one or another kind.
 *
 * _The return type is a JavaScript Promise to have a common API between all
 * types of analysis, especially because of CSS analyses which uses Stylelint._
 */
export type Analysis = (input: AnalysisInput) => Promise<AnalysisOutput>;

/**
 * An analysis input
 *
 * An analysis always operates on a file, be it from its path
 * or its content for any type of analysis.
 *
 * @param filePath the path of the file to analyze
 * @param fileContent the content of the file to analyze
 */
export interface AnalysisInput {
  filePath: string;
  fileContent: string | undefined;
}

/**
 * An analysis output
 *
 * An analysis outputs a result that depends on the kind of analysis.
 * Still, any analysis is subject to errors (which was initially named
 * `parsingError` and cannot be changed without breaking the protocol of
 * the bridge with any other components, e.g. SonarLint).
 *
 * @param parsingError an analysis error, if any
 */
export interface AnalysisOutput {
  parsingError?: AnalysisError;
}

/**
 * Returns an error analysis output containing the given empty output and a parsing error.
 */
export function createError<T extends AnalysisOutput>(
  emptyOutput: T,
  parsingError: AnalysisError,
): T {
  return {
    ...emptyOutput,
    parsingError,
  };
}

/**
 * Returns an error analysis output containing the given empty output and a linter initialization parsing error.
 */
export function createLinterInitializationError<T extends AnalysisOutput>(emptyOutput: T): T {
  return createError(emptyOutput, {
    code: AnalysisErrorCode.LinterInitialization,
    message: 'Linter is undefined. Did you call /init-linter?',
  });
}
