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
import { Linter } from 'eslint';
import babelPresetReact from '@babel/preset-react';
import babelPresetFlow from '@babel/preset-flow';
import babelPresetEnv from '@babel/preset-env';
import babelPluginDecorators from '@babel/plugin-proposal-decorators';

/**
 * Builds ESLint parser options
 *
 * ESLint parser options allows for customizing the behaviour of
 * the ESLint-based parser used to parse JavaScript or TypeScript
 * code. It configures the ECMAScript version, specific syntax or
 * features to consider as valid during parsing, and additional
 * contents in the abstract syntax tree, among other things.
 *
 * @param initialOptions the analysis options to use
 * @param usingBabel a flag to indicate if we intend to parse with Babel
 * @returns the parser options for the input
 */
export function buildParserOptions(initialOptions: Linter.ParserOptions, usingBabel = false) {
  const options: Linter.ParserOptions = {
    tokens: true,
    comment: true,
    loc: true,
    range: true,
    ecmaVersion: 2018,
    sourceType: 'module',
    // The single run makes that typescript-eslint uses normal programs instead of use watch programs
    // In CI this automatic detection sets singleRun to true
    // https://github.com/typescript-eslint/typescript-eslint/blob/d24a82854d06089cbd2a8801f2982fd4781f3701/packages/typescript-estree/src/parseSettings/inferSingleRun.ts#L44
    // We need watch programs for replace contents of the files (for example in Vue files)
    disallowAutomaticSingleRunInference: true,
    codeFrame: false,
    ecmaFeatures: {
      jsx: true,
      globalReturn: false,
      legacyDecorators: true,
    },
    // for Vue parser
    extraFileExtensions: ['.vue'],
    ...initialOptions,
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
 * plugins, which need to be explicitly included in the parser options,
 * among other things.
 *
 * @param options the parser options to extend
 * @returns the extend parser options
 */
function babelParserOptions(options: Linter.ParserOptions) {
  const babelOptions = {
    targets: 'defaults',
    presets: [babelPresetReact, babelPresetFlow, babelPresetEnv],
    plugins: [[babelPluginDecorators, { version: '2022-03' }]],
    babelrc: false,
    configFile: false,
    parserOpts: {
      allowReturnOutsideFunction: true,
    },
  };
  return { ...options, requireConfigFile: false, babelOptions };
}
