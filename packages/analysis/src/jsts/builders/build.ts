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
import ts from 'typescript';
import { debug } from '../../../../shared/src/helpers/logging.js';
import type { JsTsAnalysisInput } from '../analysis/analysis.js';
import {
  buildBabelParserOptions,
  buildTsParserOptions,
  buildVueParserOptions,
  type ParserContext,
} from '../parsers/options.js';
import { parse } from '../parsers/parse.js';
import { type Parser, parsersMap } from '../parsers/eslint.js';

/**
 * Builds an ESLint SourceCode for JavaScript / TypeScript
 *
 * This functions routes the parsing of the input based on the input language,
 * the file extension, and some contextual information.
 *
 * @param input the sanitized JavaScript / TypeScript analysis input (all fields required)
 * @returns the parsed source code
 */
export function build(input: JsTsAnalysisInput, parserContext: ParserContext = {}) {
  const vueFile = isVueFile(input.filePath);
  const typescriptContext: ParserContext = {
    ...parserContext,
    jsx: parserContext.jsx ?? jsxEnabledFor(input.program),
  };

  if (shouldUseTypescriptParser(input)) {
    const result = parseAsTypescript(input, vueFile, typescriptContext);
    if (result) {
      return result;
    }
  }

  return parseAsJavascript(input, vueFile, parserContext);
}

/**
 * Returns the parse result, or undefined to signal the caller should fall back to JS parsing.
 * Throws when the input is TS or a Vue+TS retry fails.
 */
function parseAsTypescript(input: JsTsAnalysisInput, vueFile: boolean, context: ParserContext) {
  const parser: Parser = vueFile ? parsersMap.vuejs : parsersMap.typescript;
  const parserOptions: Linter.ParserOptions = vueFile
    ? buildVueParserOptions('ts', { filePath: input.filePath }, context)
    : buildTsParserOptions(
        {
          filePath: input.filePath,
          programs: input.program ? [input.program] : undefined,
          project: input.tsConfigs,
        },
        context,
      );
  try {
    debug(`Parsing ${input.filePath} with ${parser.meta.name}`);
    return parse(input.fileContent, parser, parserOptions);
  } catch (error) {
    debug(`Failed to parse ${input.filePath} with ${parser.meta.name}: ${error.message}`);
    if (vueFile && input.language === 'ts') {
      return retryVueTsWithFlippedJsx(input, parser, context, error);
    }
    if (input.language === 'ts') {
      throw error;
    }
    return undefined;
  }
}

// Vue+TS: JSX-vs-TS ambiguity. Retry with the opposite jsx setting.
function retryVueTsWithFlippedJsx(
  input: JsTsAnalysisInput,
  parser: Parser,
  context: ParserContext,
  originalError: Error,
) {
  const retryJsx = !(context.jsx ?? true);
  try {
    debug(`Retrying ${input.filePath} with JSX ${retryJsx ? 'enabled' : 'disabled'}`);
    return parse(
      input.fileContent,
      parser,
      buildVueParserOptions('ts', { filePath: input.filePath }, { ...context, jsx: retryJsx }),
    );
  } catch (retryError) {
    debug(
      `JSX-${retryJsx ? 'enabled' : 'disabled'} retry failed for ${input.filePath}: ${retryError.message}`,
    );
    throw originalError;
  }
}

function parseAsJavascript(input: JsTsAnalysisInput, vueFile: boolean, context: ParserContext) {
  const attempts = javascriptParseAttempts(vueFile, context);
  let preferredError: Error | undefined;
  let lastError: Error | undefined;

  for (const attempt of attempts) {
    try {
      debug(`Parsing ${input.filePath} with ${attempt.description}`);
      return parse(input.fileContent, attempt.parser, attempt.parserOptions);
    } catch (error) {
      debug(`Failed to parse ${input.filePath} with ${attempt.description}: ${error.message}`);
      if (attempt.preferredError) {
        preferredError = error;
      }
      lastError = error;
    }
  }

  throw preferredError ?? lastError;
}

function shouldUseTypescriptParser({ allowTsParserJsFiles, language }: JsTsAnalysisInput): boolean {
  return allowTsParserJsFiles || language === 'ts';
}

function isVueFile(file: string) {
  return file.toLowerCase().endsWith('.vue');
}

/**
 * Whether JSX should be enabled based on the project's tsconfig. Undefined when unknown.
 * @param program the TypeScript Program instance
 * @return true if JSX is enabled, false if disabled, or undefined if unknown
 * */
function jsxEnabledFor(program?: ts.Program): boolean | undefined {
  if (!program) {
    return undefined;
  }
  const jsx = program.getCompilerOptions().jsx;
  return jsx === undefined ? undefined : jsx !== ts.JsxEmit.None;
}

type JavaScriptParseAttempt = {
  description: string;
  parser: Parser;
  parserOptions: Linter.ParserOptions;
  preferredError?: boolean;
};

function javascriptParseAttempts(
  vueFile: boolean,
  context: ParserContext,
): JavaScriptParseAttempt[] {
  const parser: Parser = vueFile ? parsersMap.vuejs : parsersMap.javascript;
  const attempts: JavaScriptParseAttempt[] = [
    {
      description: parser.meta?.name ?? 'parser',
      parser,
      parserOptions: buildJavascriptParserOptions(vueFile, context, false),
    },
  ];

  if (!vueFile) {
    attempts.push({
      description: `${parsersMap.javascript.meta?.name} in 'script' mode`,
      parser: parsersMap.javascript,
      parserOptions: buildJavascriptParserOptions(false, context, false, {
        sourceType: 'script',
      }),
    });
  }

  attempts.push({
    description: `${parser.meta?.name} error recovery`,
    parser,
    parserOptions: buildJavascriptParserOptions(vueFile, context, true),
    preferredError: true,
  });

  if (!vueFile) {
    attempts.push({
      description: `${parsersMap.javascript.meta?.name} in 'script' mode and error recovery`,
      parser: parsersMap.javascript,
      parserOptions: buildJavascriptParserOptions(false, context, true, {
        sourceType: 'script',
      }),
    });
  }

  return attempts;
}

function buildJavascriptParserOptions(
  vueFile: boolean,
  context: ParserContext,
  errorRecovery: boolean,
  overrides: Linter.ParserOptions = {},
): Linter.ParserOptions {
  const parserContext = { ...context, errorRecovery };

  return vueFile
    ? buildVueParserOptions('js', overrides, parserContext)
    : buildBabelParserOptions(overrides, parserContext);
}
