/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import * as fs from 'fs';
import * as babel from '@babel/eslint-parser';
import { Linter, SourceCode } from 'eslint';
import * as VueJS from 'vue-eslint-parser';
import * as tsEslintParser from '@typescript-eslint/parser';
import { getContext } from './context';
import { AnalysisInput } from './analyzer';

const babelParser = { parse: babel.parseForESLint, parser: '@babel/eslint-parser' };
const vueParser = { parse: VueJS.parseForESLint, parser: 'vue-eslint-parser' };
const tsParser = { parse: tsEslintParser.parseForESLint, parser: '@typescript-eslint/parser' };

export type ParseException = {
  lineNumber?: number;
  message: string;
  code: string;
};

export enum ParseExceptionCode {
  Parsing = 'PARSING',
  MissingTypeScript = 'MISSING_TYPESCRIPT',
  UnsupportedTypeScript = 'UNSUPPORTED_TYPESCRIPT',
  FailingTypeScript = 'FAILING_TYPESCRIPT',
  GeneralError = 'GENERAL_ERROR',
}

function shouldTryTsParser() {
  const context = getContext();
  return context ? context.shouldUseTypeScriptParserForJS : true;
}

export function buildSourceCode(input: AnalysisInput, language: 'ts' | 'js') {
  const vue = input.filePath.endsWith('.vue');
  let options, result;

  // ts (including .vue)
  if (language === 'ts') {
    options = buildParsingOptions(input, false, vue ? tsParser.parser : undefined);
    const parse = vue ? vueParser.parse : tsParser.parse;
    return parseForEslint(input, parse, options);
  }

  const tryTsParser = shouldTryTsParser();

  // .vue
  if (vue) {
    if (tryTsParser) {
      options = buildParsingOptions(input, false, tsParser.parser);
      result = parseForEslint(input, vueParser.parse, options);
      if (result instanceof SourceCode) {
        return result;
      }
      console.log(
        `DEBUG Failed to parse ${input.filePath} with TypeScript compiler: ${result.message}`,
      );
    }
    options = buildParsingOptions(input, true, babelParser.parser);
    return parseForEslint(input, vueParser.parse, options);
  }

  // js
  if (tryTsParser) {
    result = parseForEslint(input, tsParser.parse, buildParsingOptions(input, false));
    if (result instanceof SourceCode) {
      return result;
    }
    console.log(
      `DEBUG Failed to parse ${input.filePath} with TypeScript compiler: ${result.message}`,
    );
  }
  const resultAsModule = parseForEslint(input, babelParser.parse, buildParsingOptions(input, true));
  if (resultAsModule instanceof SourceCode) {
    return resultAsModule;
  }
  const resultAsScript = parseForEslint(
    input,
    babelParser.parse,
    buildParsingOptions(input, true, undefined, 'script'),
  );
  // prefer displaying parsing error as module if parsing as script also failed
  return resultAsScript instanceof SourceCode ? resultAsScript : resultAsModule;
}

function parseForEslint(
  { fileContent, filePath }: AnalysisInput,
  parse: (code: string, options: {}) => any,
  options: {},
) {
  try {
    const text = fileContent || getFileContent(filePath);
    const result = parse(text, options);
    return new SourceCode({
      ...result,
      text,
      parserServices: result.services,
    });
  } catch ({ lineNumber, message }) {
    return {
      line: lineNumber,
      message,
      code: parseExceptionCodeOf(message),
    };
  }
}

export function buildParsingOptions(
  { filePath, tsConfigs }: AnalysisInput,
  usingBabel = false,
  parserOption?: string,
  sourceType: 'script' | 'module' = 'module',
) {
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
    parser: parserOption,

    // for TS parser
    filePath,
    project: tsConfigs,
  };

  if (usingBabel) {
    return babelConfig(options);
  }

  return options;
}

function babelConfig(config: Linter.ParserOptions) {
  const pluginPath = `${__dirname}/../node_modules`;
  const babelOptions = {
    presets: [`${pluginPath}/@babel/preset-react`, `${pluginPath}/@babel/preset-flow`],
    babelrc: false,
    configFile: false,
  };
  return { ...config, requireConfigFile: false, babelOptions };
}

function getFileContent(filePath: string) {
  const fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
  return stripBom(fileContent);
}

function stripBom(s: string) {
  if (s.charCodeAt(0) === 0xfeff) {
    return s.slice(1);
  }
  return s;
}

export function unloadTypeScriptEslint() {
  tsEslintParser.clearCaches();
}

// exported for testing
export function parseExceptionCodeOf(exceptionMsg: string): ParseExceptionCode {
  if (exceptionMsg.startsWith("Cannot find module 'typescript'")) {
    return ParseExceptionCode.MissingTypeScript;
  } else if (exceptionMsg.startsWith('You are using version of TypeScript')) {
    return ParseExceptionCode.UnsupportedTypeScript;
  } else if (exceptionMsg.startsWith('Debug Failure')) {
    return ParseExceptionCode.FailingTypeScript;
  } else {
    return ParseExceptionCode.Parsing;
  }
}
