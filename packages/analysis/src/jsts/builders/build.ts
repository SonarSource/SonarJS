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
  getJavaScriptSourceType,
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
  const context: ParserContext = {
    ...parserContext,
    jsx: parserContext.jsx ?? jsxEnabledFor(input.program),
  };

  if (shouldUseTypescriptParser(input)) {
    const result = parseAsTypescript(input, vueFile, context);
    if (result) {
      return result;
    }
  }

  return parseAsJavascript(input, vueFile, context);
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
  const parser: Parser = vueFile ? parsersMap.vuejs : parsersMap.javascript;
  const initialSourceType = getJavaScriptSourceType(context);
  let moduleError;
  try {
    debug(`Parsing ${input.filePath} with ${parser.meta?.name}`);
    return parse(
      input.fileContent,
      parser,
      vueFile
        ? buildVueParserOptions('js', { sourceType: initialSourceType }, context)
        : buildBabelParserOptions({ sourceType: initialSourceType }, context),
    );
  } catch (error) {
    debug(`Failed to parse ${input.filePath} with ${parser.meta?.name}: ${error.message}`);
    if (vueFile) {
      throw error;
    }
    moduleError = error;
  }

  const fallbackSourceType = initialSourceType === 'module' ? 'script' : 'module';
  try {
    debug(
      `Parsing ${input.filePath} with ${parsersMap.javascript.meta?.name} in '${fallbackSourceType}' mode`,
    );
    return parse(
      input.fileContent,
      parsersMap.javascript,
      buildBabelParserOptions({ sourceType: fallbackSourceType }, context),
    );
  } catch (error) {
    debug(
      `Failed to parse ${input.filePath} with ${parsersMap.javascript.meta?.name} in '${fallbackSourceType}' mode: ${error.message}`,
    );
    /**
     * Report the error from the preferred module type after also trying the opposite mode.
     */
    throw moduleError;
  }
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
  return jsx !== undefined && jsx !== ts.JsxEmit.None;
}
