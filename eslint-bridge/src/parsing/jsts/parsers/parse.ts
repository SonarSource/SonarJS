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

import { SourceCode } from 'eslint';
import { readFile } from 'helpers';
import { parseAnalysisErrorCode, AnalysisError, JsTsAnalysisInput } from 'services/analysis';
import { ParseFunction } from './eslint';

/**
 * Parses a JavaScript / TypeScript analysis input with an ESLint-based parser
 * @param input the JavaScript / TypeScript input to parse
 * @param parse the ESLint parsing function to use for parsing
 * @param options the ESLint parser options
 * @returns the parsed source code
 */
export function parseForESLint(
  input: JsTsAnalysisInput,
  parse: ParseFunction,
  options: {},
): SourceCode | AnalysisError {
  const { fileContent, filePath } = input;
  try {
    const code = fileContent || readFile(filePath);
    const result = parse(code, options);
    return new SourceCode({
      ...result,
      text: code,
      parserServices: result.services,
    });
  } catch ({ lineNumber, message }) {
    return {
      line: lineNumber,
      message,
      code: parseAnalysisErrorCode(message),
    };
  }
}
