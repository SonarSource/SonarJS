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
import { APIError } from '../../../shared/src/errors/error.js';
import { SourceCode } from 'eslint';
import { ParseFunction } from './eslint.js';

/**
 * Parses a JavaScript / TypeScript analysis input with an ESLint-based parser
 * @param code the JavaScript / TypeScript code to parse
 * @param parse the ESLint parsing function to use for parsing
 * @param options the ESLint parser options
 * @returns the parsed source code
 */
export function parseForESLint(code: string, parse: ParseFunction, options: {}): SourceCode {
  try {
    const result = parse(code, options);
    const parserServices = result.services || {};
    return new SourceCode({
      ...result,
      text: code,
      parserServices,
    });
  } catch ({ lineNumber, message }) {
    if (message.startsWith('Debug Failure')) {
      throw APIError.failingTypeScriptError(message);
    } else {
      throw APIError.parsingError(message, { line: lineNumber });
    }
  }
}
