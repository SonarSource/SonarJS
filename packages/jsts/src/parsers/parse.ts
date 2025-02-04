/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { APIError } from '../../../shared/src/errors/error.js';
import { SourceCode } from 'eslint';
import type { Parser } from './eslint.js';

export type ParseResult = {
  sourceCode: SourceCode;
  parser?: Parser;
  parserOptions?: any;
};

/**
 * Parses a JavaScript / TypeScript analysis input with an ESLint-based parser
 * @param code the JavaScript / TypeScript code to parse
 * @param parser the ESLint parser to use
 * @param parserOptions the ESLint parser options
 * @returns the parsed source code
 */
export function parse(code: string, parser: Parser, parserOptions: {}): ParseResult {
  try {
    const result = parser.parseForESLint(code, parserOptions);
    const parserServices = 'services' in result ? result.services : {};
    return {
      parser,
      parserOptions,
      sourceCode: new SourceCode({
        ...result,
        text: code,
        parserServices,
      } as SourceCode.Config),
    };
  } catch ({ lineNumber, message }) {
    if (message.startsWith('Debug Failure')) {
      throw APIError.failingTypeScriptError(message);
    } else {
      throw APIError.parsingError(message, { line: lineNumber });
    }
  }
}
