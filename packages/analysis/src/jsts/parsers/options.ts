/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { Linter } from 'eslint';
import babelPresetReact from '@babel/preset-react';
import babelPresetFlow from '@babel/preset-flow';
import babelPresetEnv from '@babel/preset-env';
import babelPluginDecorators from '@babel/plugin-proposal-decorators';
import { parsersMap } from './eslint.js';
import type { JsTsLanguage } from '../../common/configuration.js';

/**
 * Options that are meaningful to every ESLint-based parser SonarJS uses
 * (@babel/eslint-parser, @typescript-eslint/parser, vue-eslint-parser):
 * AST shape, default language level, and shared ecmaFeatures.
 */
function commonParserOptions(): Linter.ParserOptions {
  return {
    tokens: true,
    comment: true,
    loc: true,
    range: true,
    ecmaVersion: 2018,
    sourceType: 'module',
    codeFrame: false,
    ecmaFeatures: {
      jsx: true,
      globalReturn: false,
      legacyDecorators: true,
    },
  };
}

/**
 * Overlay for @typescript-eslint/parser.
 */
function typescriptParserOverlay(): Linter.ParserOptions {
  return {
    // The single run makes that typescript-eslint uses normal programs instead of use watch programs
    // In CI this automatic detection sets singleRun to true
    // https://github.com/typescript-eslint/typescript-eslint/blob/d24a82854d06089cbd2a8801f2982fd4781f3701/packages/typescript-estree/src/parseSettings/inferSingleRun.ts#L44
    // We need watch programs for replace contents of the files (for example in Vue files)
    disallowAutomaticSingleRunInference: true,
    extraFileExtensions: ['.vue'],
  };
}

/**
 * Overlay for @babel/eslint-parser. Babel's parser is plugin-driven, so each
 * non-standard syntax (Flow, React/JSX, decorators) must be enabled here.
 */
function babelParserOverlay(): Linter.ParserOptions {
  return {
    requireConfigFile: false,
    babelOptions: {
      targets: 'defaults',
      presets: [babelPresetReact, babelPresetFlow, babelPresetEnv],
      plugins: [[babelPluginDecorators, { version: '2022-03' }]],
      babelrc: false,
      configFile: false,
      parserOpts: {
        allowReturnOutsideFunction: true,
      },
    },
  };
}

/**
 * Options for @typescript-eslint/parser when used directly (non-Vue files).
 */
export function buildTsParserOptions(overrides: Linter.ParserOptions = {}): Linter.ParserOptions {
  return {
    ...commonParserOptions(),
    ...typescriptParserOverlay(),
    ...overrides,
  };
}

/**
 * Options for @babel/eslint-parser when used directly (non-Vue files, JS).
 */
export function buildBabelParserOptions(
  overrides: Linter.ParserOptions = {},
): Linter.ParserOptions {
  return {
    ...commonParserOptions(),
    ...babelParserOverlay(),
    ...overrides,
  };
}

/**
 * Options for vue-eslint-parser. The script-block sub-parser is wired in
 * here based on `scriptLang`; the matching overlay (TS or Babel) is also
 * applied since vue-eslint-parser forwards these options to the sub-parser.
 */
export function buildVueParserOptions(
  scriptLang: JsTsLanguage,
  overrides: Linter.ParserOptions = {},
): Linter.ParserOptions {
  if (scriptLang === 'ts') {
    return {
      ...commonParserOptions(),
      ...typescriptParserOverlay(),
      parser: parsersMap.typescript,
      ...overrides,
    };
  }
  return {
    ...commonParserOptions(),
    ...babelParserOverlay(),
    parser: parsersMap.javascript,
    ...overrides,
  };
}
