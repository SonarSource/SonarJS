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
import { AST, Linter, SourceCode } from 'eslint';
import * as VueJS from 'vue-eslint-parser';
import * as tsEslintParser from '@typescript-eslint/parser';
import { getContext } from './context';
import { JsTsAnalysisInput, ParsingError } from './analyzer';
import { getProgramById } from './programManager';
// replace this with `yaml` when we deprecate node 12
import * as yaml from 'yaml-node12';
import { FileType, visit } from './utils';
import { Comment, Node } from 'estree';

type Lambda = {
  code: string;
  line: number;
  column: number;
  offset: number;
  lineStarts: number[];
  text: string;
};

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
): SourceCode | ParsingError {
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

export function parseYaml(filePath: string): Lambda[] | ParsingError {
  const src = getFileContent(filePath);
  const lineCounter = new yaml.LineCounter();
  const tokens = new yaml.Parser(lineCounter.addNewLine).parse(src);
  // YAML supports a marker that indicates the end of a document: a file may contain multiple documents
  const docs = new yaml.Composer({ keepSourceTokens: true }).compose(tokens);

  const lambdas: Lambda[] = [];
  for (const doc of docs) {
    // we only consider the first error
    if (doc.errors.length > 0) {
      const error = doc.errors[0];
      return {
        line: lineCounter.linePos(error.pos[0]).line,
        message: error.message,
        code: ParseExceptionCode.Parsing,
      };
    }

    yaml.visit(doc, {
      Pair(_, pair: any, ancestors: any) {
        if (
          (isInlineAwsLambda(pair, ancestors) || isInlineAwsServerless(pair, ancestors)) &&
          isSupportedFormat(pair)
        ) {
          const { value, srcToken } = pair;
          const code = srcToken.value.source;
          if (!code) {
            /* this should not happen */
            throw new Error('An extracted inline JavaScript snippet should not be undefined.');
          }
          const [offsetStart] = value.range;
          const { line, col: column } = lineCounter.linePos(offsetStart);
          const lineStarts = lineCounter.lineStarts;

          lambdas.push({
            code,
            line,
            column,
            offset: fixOffset(offsetStart, value.type),
            lineStarts,
            text: src,
          });
        }
      },
    });
  }

  // the offset value needs to be fixed depending on the type of string format in YAML
  function fixOffset(offset: number, format: string): number {
    if (format === 'BLOCK_FOLDED' || format === 'BLOCK_LITERAL') {
      return offset + 2;
    } else {
      return offset;
    }
  }

  return lambdas;
}

function isInlineAwsLambda(pair: any, ancestors: any[]) {
  return (
    isZipFile(pair) &&
    hasCode(ancestors) &&
    hasNodeJsRuntime(ancestors) &&
    hasType(ancestors, 'AWS::Lambda::Function')
  );
}

function isInlineAwsServerless(pair: any, ancestors: any[]) {
  return (
    isInlineCode(pair) &&
    hasNodeJsRuntime(ancestors, 1) &&
    hasType(ancestors, 'AWS::Serverless::Function', 3)
  );
}

function isSupportedFormat(pair: yaml.Pair<any, any>) {
  return ['PLAIN', 'BLOCK_FOLDED', 'BLOCK_LITERAL'].includes(pair.value?.type);
}

// we need to check the pair directly instead of ancestors, otherwise it will validate all siblings
function isInlineCode(pair: any) {
  return pair.key.value === 'InlineCode';
}

function isZipFile(pair: any) {
  return pair.key.value === 'ZipFile';
}

function hasCode(ancestors: any[], level = 2) {
  return ancestors[ancestors.length - level]?.key?.value === 'Code';
}

function hasNodeJsRuntime(ancestors: any[], level = 3) {
  return ancestors[ancestors.length - level]?.items?.some(
    (item: any) => item?.key.value === 'Runtime' && item?.value?.value.startsWith('nodejs'),
  );
}

function hasType(ancestors: any[], value: string, level = 5) {
  return ancestors[ancestors.length - level]?.items?.some(
    (item: any) => item?.key.value === 'Type' && item?.value.value === value,
  );
}

// If there is at least 1 error in any JS lambda, we return only the first errror
export function buildSourceCodesFromYaml(filePath: string): SourceCode[] | ParsingError {
  const lambdasOrError = parseYaml(filePath);

  const constainsError = !Array.isArray(lambdasOrError);
  if (constainsError) {
    return lambdasOrError;
  }
  const lambdas = lambdasOrError;

  const sourceCodes: SourceCode[] = [];
  for (const lambda of lambdas) {
    const { code } = lambda;
    /**
     * The file path is left empty as it is ignored by `buildSourceCode` if the file content is provided, which
     * happens to be the case here since we extract inline JavaScript code.
     */
    const input = { filePath: '', fileContent: code, fileType: FileType.MAIN, tsConfigs: [] };
    const sourceCodeOrError = buildSourceCode(input, 'js') as SourceCode;
    if (sourceCodeOrError instanceof SourceCode) {
      const patchedSourceCode = patchSourceCode(sourceCodeOrError, lambda);
      sourceCodes.push(patchedSourceCode);
    } else {
      return sourceCodeOrError; // FIXME patch parsing error location
    }
  }
  return sourceCodes;
}

function patchSourceCode(originalSourceCode: SourceCode, lambda: Lambda) {
  /* taken from eslint/lib/source-code/source-code.js#constructor */
  function computeLines() {
    const lineBreakPattern = /\r\n|[\r\n\u2028\u2029]/u;
    const lineEndingPattern = new RegExp(lineBreakPattern.source, 'gu');
    let match;
    const lines = [];

    let i = 0;
    while ((match = lineEndingPattern.exec(lambda.text))) {
      lines.push(lambda.text.slice(lambda.lineStarts[i], match.index));
      i++;
    }
    lines.push(lambda.text.slice(lambda.lineStarts[lambda.lineStarts.length - 1]));

    return lines;
  }

  function patchLocations(sourceCode: SourceCode, lambda: Lambda) {
    const { offset } = lambda;

    visit(sourceCode, node => {
      fixNodeLocation(node);
    });

    const { comments } = sourceCode.ast;
    for (const comment of comments) {
      fixNodeLocation(comment);
    }

    const { tokens } = sourceCode.ast;
    for (const token of tokens) {
      fixNodeLocation(token);
    }

    function fixNodeLocation(node: Node | Comment | AST.Token) {
      if (node.loc != null && node.range != null) {
        node.loc = {
          start: sourceCode.getLocFromIndex(node.range[0] + offset),
          end: sourceCode.getLocFromIndex(node.range[1] + offset),
        };
      }
      if (node.range) {
        const [sRange, eRange] = node.range;
        node.range = [sRange + offset, eRange + offset];
      }
    }
  }

  const lines = computeLines();
  const patchedSourceCode = Object.create(originalSourceCode, {
    lineStartIndices: { value: lambda.lineStarts },
    text: { value: lambda.text },
    lines: { value: lines },
  });

  patchLocations(patchedSourceCode, lambda);

  const patchedSourceCodeBis = new SourceCode({
    text: patchedSourceCode.text,
    ast: patchedSourceCode.ast,
    parserServices: patchedSourceCode.parserServices,
    scopeManager: patchedSourceCode.scopeManager,
    visitorKeys: patchedSourceCode.visitorKeys,
  });

  return patchedSourceCodeBis;
}
