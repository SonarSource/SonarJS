/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { debug } from '../../../shared/src/helpers/logging.js';
import { CompleteJsTsAnalysisInput, JsTsAnalysisInput } from '../analysis/analysis.js';
import { buildParserOptions } from '../parsers/options.js';
import { parse } from '../parsers/parse.js';
import { Parser, parsersMap } from '../parsers/eslint.js';
import { Linter } from 'eslint';

/**
 * Builds an ESLint SourceCode for JavaScript / TypeScript
 *
 * This functions routes the parsing of the input based on the input language,
 * the file extension, and some contextual information.
 *
 * @param input the JavaScript / TypeScript analysis input
 * @returns the parsed source code
 */
export function build(input: CompleteJsTsAnalysisInput) {
  const vueFile = isVueFile(input.filePath);

  let parser: Parser = vueFile ? parsersMap.vuejs : parsersMap.typescript;
  if (shouldUseTypescriptParser(input)) {
    const options: Linter.ParserOptions = {
      // enable logs for @typescript-eslint
      // debugLevel: true,
      filePath: input.filePath,
      parser: vueFile ? parsersMap.typescript : undefined,
    };
    if (!vueFile) {
      options.programs = input.program ? [input.program] : undefined;
      options.project = input.tsConfigs;
    }
    try {
      debug(`Parsing ${input.filePath} with ${parser.meta.name}`);
      return parse(input.fileContent, parser, buildParserOptions(options, false));
    } catch (error) {
      debug(`Failed to parse ${input.filePath} with ${parser.meta.name}: ${error.message}`);
      if (input.language === 'ts') {
        throw error;
      }
    }
  }

  let moduleError;
  parser = vueFile ? parsersMap.vuejs : parsersMap.javascript;
  try {
    debug(`Parsing ${input.filePath} with ${parser.meta?.name}`);
    return parse(
      input.fileContent,
      parser,
      buildParserOptions({ parser: vueFile ? parsersMap.javascript : undefined }, true),
    );
  } catch (error) {
    debug(`Failed to parse ${input.filePath} with ${parser.meta?.name}: ${error.message}`);
    if (vueFile) {
      throw error;
    }
    moduleError = error;
  }

  try {
    debug(`Parsing ${input.filePath} with ${parsersMap.javascript.meta?.name} in 'script' mode`);
    return parse(
      input.fileContent,
      parsersMap.javascript,
      buildParserOptions({ sourceType: 'script' }, true),
    );
  } catch (error) {
    debug(
      `Failed to parse ${input.filePath} with ${parsersMap.javascript.meta?.name} in 'script' mode: ${error.message}`,
    );
    /**
     * We prefer displaying parsing error as module if parsing as script also failed,
     * as it is more likely that the expected source type is module.
     */
    throw moduleError;
  }
}

function shouldUseTypescriptParser({ allowTsParserJsFiles, language }: JsTsAnalysisInput): boolean {
  return allowTsParserJsFiles !== false || language === 'ts';
}

function isVueFile(file: string) {
  return file.toLowerCase().endsWith('.vue');
}
