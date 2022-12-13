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

import {AST, SourceCode} from 'eslint';
import { debug } from 'helpers';
import { JsTsAnalysisInput } from 'services/analysis';
import { buildParserOptions, parsers } from 'parsing/jsts';
import {ESLintHtmlParseResult, HTMLSyntaxTree, parseForESLint} from 'eslint-html-parser';
import {APIError} from "errors";

function isAST(result: HTMLSyntaxTree | AST.Program): result is AST.Program {
  return 'body' in result;
}

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
export function buildHtml(input: JsTsAnalysisInput, tryTypeScriptESLintParser: boolean): SourceCode {
  let result: ESLintHtmlParseResult;
  if (tryTypeScriptESLintParser) {
    try {
      const options = buildParserOptions(input, false);
      options.parser = parsers.typescript.parser;
      result = parseForESLint(input.fileContent, options);
    } catch (error) {
      debug(`Failed to parse ${input.filePath} with TypeScript parser: ${error.message}`);
    }
  }

  let moduleError;
  try {
    const options = buildParserOptions(input, true);
    options.parser = parsers.javascript.parser;
    result = parseForESLint(input.fileContent, options);
  } catch (error) {
    moduleError = error;
  }

  try {
    const options = buildParserOptions(input, true, undefined, 'script');
    options.parser = parsers.javascript.parser;
    result = parseForESLint(input.fileContent, options);
  } catch (_) {
    /**
     * We prefer displaying parsing error as module if parsing as script also failed,
     * as it is more likely that the expected source type is module.
     */
    throw moduleError;
  }
  if (result) {
    const { ast, services: parserServices, scopeManager, visitorKeys} = result;
    if (isAST(ast)) {
      return new SourceCode({ast, parserServices, scopeManager, visitorKeys, text: input.fileContent});
    }
  }
  throw APIError.unexpectedError('No JavaScript found in file');
}
