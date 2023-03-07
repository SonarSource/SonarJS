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
import * as babelESLintParser from '@babel/eslint-parser';
import * as vueESLintParser from 'vue-eslint-parser';
import * as typescriptESLintParser from '@typescript-eslint/parser';

/**
 * An ESLint-based parsing function
 *
 * ESLint-based parsing functions takes as inputs a code to parse
 * as well as options to configure the parser and returns either
 * an instance of ESLint SourceCode or a parsing error.
 */
export type ParseFunction = (code: string, options: {}) => any;

/**
 * An ESLint-based parser container
 *
 * The purpose of this type is to group together an ESLint parser
 * dependency along with its parsing function. When building the
 * parsing options of a parser, it happens sometime that we need
 * the parser dependency rather than the actual parsing function,
 * and vice versa.
 *
 * @param parser the parser dependency
 * @param parse the parsing function
 */
export type ESLintParser = {
  parser: string;
  parse: ParseFunction;
};

/**
 * The ESLint-based parsers used to parse JavaScript, TypeScript, and Vue.js code.
 */
export const parsers: { javascript: ESLintParser; typescript: ESLintParser; vuejs: ESLintParser } =
  {
    javascript: { parser: '@babel/eslint-parser', parse: babelESLintParser.parseForESLint },
    typescript: {
      parser: '@typescript-eslint/parser',
      parse: typescriptESLintParser.parseForESLint,
    },
    vuejs: { parser: 'vue-eslint-parser', parse: vueESLintParser.parseForESLint },
  };

/**
 * Empty AST to be sent to Vue parser, as we just use it to provide us with the JS/TS code,
 * no need for it to make further actions with the AST result.
 */
export const emptySourceCode = parsers.javascript.parse('', { requireConfigFile: false });

/**
 * Clears TypeScript ESLint parser's caches
 *
 * While analyzing multiple files that used TypeScript ESLint parser to
 * parse their respective code, raised issues may differ depending on
 * clearing or not TypeScript ESLint parser's caches. To address that,
 * the sensor requests clearing the caches for each considered TSConfig.
 */
export function clearTypeScriptESLintParserCaches() {
  typescriptESLintParser.clearCaches();
}
