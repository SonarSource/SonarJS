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
import { parsersMap } from './eslint.js';
import type { JsTsLanguage } from '../../common/configuration.js';

/** Fallback ECMAScript version when none is detected. */
export const DEFAULT_ECMA_VERSION = 2018;

export interface ParserContext {
  detectedEsYear?: number;
  errorRecovery?: boolean;
  jsx?: boolean;
}

type BabelParserPlugin = string | [string, Record<string, boolean>];

/**
 * Get common ESLint parser options.
 * @param context Parser context
 * @returns Common ESLint parser options
 */
function commonParserOptions(context: ParserContext = {}): Linter.ParserOptions {
  return {
    tokens: true,
    comment: true,
    loc: true,
    range: true,
    ecmaVersion: (context.detectedEsYear ??
      DEFAULT_ECMA_VERSION) as Linter.ParserOptions['ecmaVersion'],
    sourceType: 'module',
    codeFrame: false,
    ecmaFeatures: {
      jsx: context.jsx ?? true,
      globalReturn: false,
      legacyDecorators: true,
    },
  };
}

/** Overlay for @typescript-eslint/parser. */
function typescriptParserOverlay(): Linter.ParserOptions {
  return {
    // Keep watch programs alive so file content replacement works for .vue files.
    disallowAutomaticSingleRunInference: true,
    extraFileExtensions: ['.vue'],
  };
}

function babelParserPlugins(context: ParserContext = {}): BabelParserPlugin[] {
  const plugins: BabelParserPlugin[] = ['flow', ['decorators', { allowCallParenthesized: false }]];

  if (context.jsx ?? true) {
    plugins.unshift('jsx');
  }

  return plugins;
}

/** Overlay for @babel/eslint-parser; non-standard syntaxes are plugin-driven. */
function babelParserOverlay(context: ParserContext = {}): Linter.ParserOptions {
  return {
    requireConfigFile: false,
    babelOptions: {
      babelrc: false,
      configFile: false,
      parserOpts: {
        allowReturnOutsideFunction: true,
        errorRecovery: context.errorRecovery ?? false,
        plugins: babelParserPlugins(context),
      },
    },
  };
}

/** Options for @typescript-eslint/parser. */
export function buildTsParserOptions(
  overrides: Linter.ParserOptions = {},
  context: ParserContext = {},
): Linter.ParserOptions {
  return {
    ...commonParserOptions(context),
    ...typescriptParserOverlay(),
    ...overrides,
  };
}

/** Options for @babel/eslint-parser. */
export function buildBabelParserOptions(
  overrides: Linter.ParserOptions = {},
  context: ParserContext = {},
): Linter.ParserOptions {
  return {
    ...commonParserOptions(context),
    ...babelParserOverlay(context),
    ...overrides,
  };
}

/** Options for vue-eslint-parser. */
export function buildVueParserOptions(
  scriptLang: JsTsLanguage,
  overrides: Linter.ParserOptions = {},
  context: ParserContext = {},
): Linter.ParserOptions {
  if (scriptLang === 'ts') {
    return {
      ...commonParserOptions(context),
      ...typescriptParserOverlay(),
      parser: parsersMap.typescript,
      ...overrides,
    };
  }
  return {
    ...commonParserOptions(context),
    ...babelParserOverlay(context),
    parser: parsersMap.javascript,
    ...overrides,
  };
}
