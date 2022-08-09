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
 * An analysis error
 *
 * An analysis error denotes any kind of failure (or error) that can
 * occur during the analysis of an analysis request.
 *
 * @param code a code that describes the error type
 * @param line a line number in case an error concerns a file
 * @param message a description of the error
 */
export type AnalysisError = {
  code: AnalysisErrorCode;
  line?: number;
  message: string;
};

/**
 * The possible codes of analysis errors
 *
 * The `GeneralError` value denotes a runtime error which is either
 * unpredicatble or occurs rarely to deserve its own category.
 */
export enum AnalysisErrorCode {
  Parsing = 'PARSING',
  MissingTypeScript = 'MISSING_TYPESCRIPT',
  UnsupportedTypeScript = 'UNSUPPORTED_TYPESCRIPT',
  FailingTypeScript = 'FAILING_TYPESCRIPT',
  GeneralError = 'GENERAL_ERROR',
  UnsupportedYaml = 'UNSUPPORTED_YAML',
}

/**
 * Infers the code of an analysis error based on the error message
 *
 * By default, any error which doesn't denotes a set of well-identified
 * runtime errors is always classified as a parsing error.
 *
 * @param error an error message
 * @returns the corresponding analysis error code
 */
export function parseAnalysisErrorCode(error: string): AnalysisErrorCode {
  if (error.startsWith("Cannot find module 'typescript'")) {
    return AnalysisErrorCode.MissingTypeScript;
  } else if (error.startsWith('You are using version of TypeScript')) {
    return AnalysisErrorCode.UnsupportedTypeScript;
  } else if (error.startsWith('Debug Failure')) {
    return AnalysisErrorCode.FailingTypeScript;
  } else {
    return AnalysisErrorCode.Parsing;
  }
}

/**
 * A type guard for potential analysis errors
 * @param maybeError the potential error to type guard
 * @returns true if it is an actual error
 */
export function isAnalysisError<T>(maybeError: T | AnalysisError): maybeError is AnalysisError {
  return 'code' in maybeError;
}
