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
import * as fs from 'fs';
import * as babel from '@babel/eslint-parser';
import { Linter, SourceCode } from 'eslint';
import * as VueJS from 'vue-eslint-parser';
import * as tsEslintParser from '@typescript-eslint/parser';
import { getContext } from './context';
import { JsTsAnalysisInput } from './analyzer';
import { getProgramById } from './programManager';
import * as yaml from 'yaml';

const babelParser = { parse: babel.parseForESLint, parser: '@babel/eslint-parser' };
const vueParser = { parse: VueJS.parseForESLint, parser: 'vue-eslint-parser' };
const tsParser = { parse: tsEslintParser.parseForESLint, parser: '@typescript-eslint/parser' };

function shouldTryTsParser() {
  const context = getContext();
  return context ? context.shouldUseTypeScriptParserForJS : true;
}

export function buildSourceCode(input: JsTsAnalysisInput, language: 'ts' | 'js') {
  const isVue = input.filePath.endsWith('.vue');
  let options, result;

  // ts (including .vue)
  if (language === 'ts') {
    options = buildParsingOptions(input, false, isVue ? tsParser.parser : undefined);
    const parse = isVue ? vueParser.parse : tsParser.parse;
    return parseForEslint(input, parse, options);
  }

  const tryTsParser = shouldTryTsParser();

  // .vue
  if (isVue) {
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
  return buildSourceCodeForJs(input, tryTsParser);
}

function buildSourceCodeForJs(input: JsTsAnalysisInput, tryTsParser: boolean) {
  if (tryTsParser) {
    const result = parseForEslint(input, tsParser.parse, buildParsingOptions(input, false));
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
  { fileContent, filePath }: JsTsAnalysisInput,
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
  input: JsTsAnalysisInput,
  usingBabel = false,
  parserOption?: string,
  sourceType: 'script' | 'module' = 'module',
) {
  const project = 'tsConfigs' in input ? input.tsConfigs : undefined;
  const programs = 'programId' in input ? [getProgramById(input.programId)] : undefined;

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
    filePath: input.filePath,
    project,
    programs,
    // enable logs for @typescripteslint
    // debugLevel: true,
  };

  if (usingBabel) {
    return babelConfig(options);
  }

  return options;
}

export function getFileContent(filePath: string) {
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

function babelConfig(config: Linter.ParserOptions) {
  const pluginPath = `${__dirname}/../node_modules`;
  const babelOptions = {
    presets: [
      `${pluginPath}/@babel/preset-react`,
      `${pluginPath}/@babel/preset-flow`,
      `${pluginPath}/@babel/preset-env`,
    ],
    babelrc: false,
    configFile: false,
  };
  return { ...config, requireConfigFile: false, babelOptions };
}

export function parseYaml(filePath: string) {
  const src = getFileContent(filePath);
  const lineCounter = new yaml.LineCounter();
  const tokens = new yaml.Parser(lineCounter.addNewLine).parse(src);
  const docs = new yaml.Composer().compose(tokens);
  const lambdas: { code: string; line: number; column: number }[] = [];
  for (const doc of docs) {
    yaml.visit(doc, {
      Pair(_, pair: any, ancestors: any) {
        if (isInlineAwsLambda(ancestors)) {
          const [offset] = pair.value.range;
          const { line, col: column } = lineCounter.linePos(offset);
          lambdas.push({ code: pair.value.value, line, column });
        }
      },
    });
  }
  return lambdas;
}

function isInlineAwsLambda(ancestors: any[]) {
  return (
    hasZipFile(ancestors) &&
    hasCode(ancestors) &&
    hasNodeJsRuntime(ancestors) &&
    hasAwsLambdaFunction(ancestors)
  );
}

function hasZipFile(ancestors: any[]) {
  return ancestors[ancestors.length - 1]?.items.some((item: any) => item.key.value === 'ZipFile');
}

function hasCode(ancestors: any[]) {
  return ancestors[ancestors.length - 2]?.key?.value === 'Code';
}

function hasNodeJsRuntime(ancestors: any[]) {
  return ancestors[ancestors.length - 3]?.items.some(
    (item: any) => item?.key.value === 'Runtime' && item?.value?.value.startsWith('nodejs'),
  );
}

function hasAwsLambdaFunction(ancestors: any[]) {
  return ancestors[ancestors.length - 5]?.items.some(
    (item: any) => item?.key.value === 'Type' && item?.value.value === 'AWS::Lambda::Function',
  );
}
