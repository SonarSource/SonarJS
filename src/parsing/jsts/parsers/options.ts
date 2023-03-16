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
import { Linter } from 'eslint';
import { getProgramById, getProgramForFile } from 'services/program';
import { JsTsAnalysisInput } from 'services/analysis';

/**
 * Builds ESLint parser options
 *
 * ESLint parser options allows for customizing the behaviour of
 * the ESLint-based parser used to parse JavaScript or TypeScript
 * code. It configures the ECMAscript version, specific syntax or
 * features to consider as valid during parsing, and additional
 * contents in the abstract syntax tree, among other things.
 *
 * @param input the analysis input to parse
 * @param usingBabel a flag to indicate if we intend to parse with Babel
 * @param parser a parser dependency to use
 * @param sourceType the type of the source code
 * @returns the parser options for the input
 */
export function buildParserOptions(
  input: JsTsAnalysisInput,
  usingBabel = false,
  parser?: string,
  sourceType: 'script' | 'module' = 'module',
) {
  const project = 'tsConfigs' in input ? input.tsConfigs : undefined;
  const programs =
    'programId' in input
      ? [getProgramById(input.programId)]
      : project
      ? [getProgramForFile(input.filePath, project)]
      : undefined;

  const options: Linter.ParserOptions = {
    tokens: true,
    comment: true,
    loc: true,
    range: true,
    ecmaVersion: 2018,
    sourceType,
    codeFrame: false,
    ecmaFeatures: {
      jsx: true,
      globalReturn: false,
      legacyDecorators: true,
    },

    // for Vue parser
    extraFileExtensions: ['.vue'],
    parser,

    // for TS parser
    filePath: input.filePath,
    project,
    programs,
    // enable logs for @typescripteslint
    // debugLevel: true,
  };

  if (usingBabel) {
    return babelParserOptions(options);
  }

  return options;
}

/**
 * Extends parser options with Babel's specific options
 *
 * Babel's parser is able to parse non-standard syntaxes and features.
 * However, the support of such constructs are extracted into dedicated
 * plugins, which need to be explictly included in the parser options,
 * among other things.
 *
 * @param options the parser options to extend
 * @returns the extend parser options
 */
function babelParserOptions(options: Linter.ParserOptions) {
  const pluginPath = `${__dirname}/../../../../node_modules`;
  const babelOptions = {
    presets: [
      `${pluginPath}/@babel/preset-react`,
      `${pluginPath}/@babel/preset-flow`,
      `${pluginPath}/@babel/preset-env`,
    ],
    plugins: [[`${pluginPath}/@babel/plugin-proposal-decorators`, { version: '2022-03' }]],
    babelrc: false,
    configFile: false,
    parserOpts: {
      allowReturnOutsideFunction: true,
    },
  };
  return { ...options, requireConfigFile: false, babelOptions };
}
