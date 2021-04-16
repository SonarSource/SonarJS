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
import * as babel from '@babel/eslint-parser';
import { Linter, SourceCode } from 'eslint';
import { ParsingError } from './analyzer';
import * as VueJS from 'vue-eslint-parser';
import * as tsParser from '@typescript-eslint/parser';
import { getContext } from './context';

export const PARSER_CONFIG_MODULE: tsParser.ParserOptions = {
  tokens: true,
  comment: true,
  loc: true,
  range: true,
  ecmaVersion: 2018,
  sourceType: 'module',
  // codeFrame: false,
  ecmaFeatures: {
    jsx: true,
    globalReturn: false,
    // legacyDecorators: true,
  },
};

// 'script' source type forces not strict
export const PARSER_CONFIG_SCRIPT: tsParser.ParserOptions = {
  ...PARSER_CONFIG_MODULE,
  sourceType: 'script',
};

export type Parse = (
  fileContent: string,
  filePath: string,
  tsConfigs?: string[],
) => SourceCode | ParsingError;

export function parseJavaScriptSourceFile(
  fileContent: string,
  filePath: string,
  tsConfigs?: string[],
): SourceCode | ParsingError {
  const context = getContext();
  const shouldUseTypeScriptParserForJS = context ? context.shouldUseTypeScriptParserForJS : true;
  if (shouldUseTypeScriptParserForJS) {
    const parsed = parseTypeScriptSourceFile(fileContent, filePath, tsConfigs);
    if (parsed instanceof SourceCode) {
      return parsed;
    }
    console.log(`DEBUG Failed to parse ${filePath} with TypeScript compiler: ${parsed.message}`);
  }

  let exceptionToReport: ParseException | null = null;
  for (const config of [PARSER_CONFIG_MODULE, PARSER_CONFIG_SCRIPT]) {
    const result = parse(babel.parseForESLint, babelConfig(config), fileContent);
    if (result instanceof SourceCode) {
      return result;
    } else if (!exceptionToReport) {
      exceptionToReport = result;
    }
  }

  // if we reach this point, we are sure that "exceptionToReport" is defined
  return {
    line: exceptionToReport!.lineNumber,
    message: exceptionToReport!.message,
    code: ParseExceptionCode.Parsing,
  };
}

export function parseTypeScriptSourceFile(
  fileContent: string,
  filePath: string,
  tsConfigs?: string[],
): SourceCode | ParsingError {
  try {
    const result = tsParser.parseForESLint(fileContent, {
      ...PARSER_CONFIG_MODULE,
      filePath,
      project: tsConfigs,
    });
    return new SourceCode(({
      ...result,
      parserServices: result.services,
      text: fileContent,
    } as unknown) as SourceCode.Config);
  } catch (exception) {
    return {
      line: exception.lineNumber,
      message: exception.message,
      code: parseExceptionCodeOf(exception.message),
    };
  }
}

export function unloadTypeScriptEslint() {
  tsParser.clearCaches();
}

export function parseVueSourceFile(
  fileContent: string,
  filePath: string,
  tsConfigs?: string[],
): SourceCode | ParsingError {
  let exception: ParseException | null = null;
  const parserOptions = {
    filePath,
    project: tsConfigs,
    extraFileExtensions: ['.vue'],
    ...PARSER_CONFIG_MODULE,
  };
  const parsers = [
    { parser: '@typescript-eslint/parser', parserOptions },
    { parser: '@babel/eslint-parser', parserOptions: babelConfig(parserOptions) },
  ];
  for (const { parser, parserOptions } of parsers) {
    try {
      const result = VueJS.parseForESLint(fileContent, { parser, ...parserOptions });
      return new SourceCode(({
        ...result,
        parserServices: result.services,
        text: fileContent,
      } as unknown) as SourceCode.Config);
    } catch (err) {
      exception = err as ParseException;
    }
  }
  return {
    line: exception!.lineNumber,
    message: exception!.message,
    code: parseExceptionCodeOf(exception!.message),
  };
}

export function parse(
  parse: Function,
  config: Linter.ParserOptions,
  fileContent: string,
): SourceCode | ParseException {
  try {
    const result = parse(fileContent, config);
    if (result.ast) {
      return new SourceCode({ text: fileContent, ...result });
    } else {
      return new SourceCode(fileContent, result);
    }
  } catch (exception) {
    return exception;
  }
}

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

export function babelConfig(config: Linter.ParserOptions) {
  const pluginPath = `${__dirname}/../node_modules`;
  const babelOptions = {
    presets: [`${pluginPath}/@babel/preset-react`, `${pluginPath}/@babel/preset-flow`],
    babelrc: false,
  };
  return { ...config, requireConfigFile: false, babelOptions };
}
