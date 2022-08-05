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
import { debug } from 'helpers';
import { JsTsAnalysisInput } from 'services/analysis';
import { buildParserOptions, parsers, parseForESLint } from 'parsing/jsts';

/**
 * Builds an instance of ESLint SourceCode for JavaScript
 *
 * Building an ESLint SourceCode for JavaScript implies parsing JavaScript code with
 * ESLint-based parsers. For the particular case of JavaScript code, we first try to
 * parse the code with TypeScript ESLint parser. If the input includes TSConfigs, the
 * resulting ESLint SourceCode would include a reference to TypeScript's type checker
 * in its parser services, if configured properly. Rules implemented internally could
 * then benefit from type information. If parsing fails at this point, we fallback to
 * Babel's parser and make two other attempts to parse the code by considering the two
 * possible source types: 'module' vs. 'script'.
 *
 * @param input the JavaScript analysis input
 * @param tryTypeScriptESLintParser a flag for parsing with TypeScript ESLint parser
 * @returns the parsed JavaScript code
 */
export function buildJs(input: JsTsAnalysisInput, tryTypeScriptESLintParser: boolean) {
  if (tryTypeScriptESLintParser) {
    const parsed = parseForESLint(
      input,
      parsers.typescript.parse,
      buildParserOptions(input, false),
    );
    if (parsed instanceof SourceCode) {
      return parsed;
    }
    debug(`Failed to parse ${input.filePath} with TypeScript parser: ${parsed.message}`);
  }

  const parsedAsModule = parseForESLint(
    input,
    parsers.javascript.parse,
    buildParserOptions(input, true),
  );
  if (parsedAsModule instanceof SourceCode) {
    return parsedAsModule;
  }

  const parsedAsScript = parseForESLint(
    input,
    parsers.javascript.parse,
    buildParserOptions(input, true, undefined, 'script'),
  );

  /**
   * We prefer displaying parsing error as module if parsing as script also failed,
   * as it is more likely that the expected source type is module.
   */
  return parsedAsScript instanceof SourceCode ? parsedAsScript : parsedAsModule;
}
