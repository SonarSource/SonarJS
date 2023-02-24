/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { JsTsAnalysisInput } from 'services/analysis';
import { buildParserOptions, parsers, parseForESLint } from 'parsing/jsts';

/**
 * Builds an instance of ESLint SourceCode for TypeScript
 *
 * Building an ESLint SourceCode for TypeScript implies parsing TypeScript code with
 * TypeScript ESLint parser. However, if the source code denotes TypeScript code in
 * Vue.js Single File Components, Vue.js ESLint parser is used instead to parse the
 * whole file. Furthermore, it is configured to use TypeScript ESLint parser to parse
 * the contents of the 'script' section of the component.
 *
 * @param input the TypeScript analysis input
 * @param isVueFile a flag to indicate if the input denotes Vue.js TypeScript code
 * @returns the parsed TypeScript code
 */
export function buildTs(input: JsTsAnalysisInput, isVueFile: boolean) {
  const options = buildParserOptions(
    input,
    false,
    isVueFile ? parsers.typescript.parser : undefined,
  );
  const parse = isVueFile ? parsers.vuejs.parse : parsers.typescript.parse;
  return parseForESLint(input.fileContent, parse, options);
}
