/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { debug } from '../../../shared/src/helpers/logging.js';
import { JsTsAnalysisInput } from '../analysis/analysis.js';
import { buildParserOptions } from '../parsers/options.js';
import { parseForESLint } from '../parsers/parse.js';
import { parsers } from '../parsers/eslint.js';
import { getProgramById } from '../program/program.js';
import { Linter } from 'eslint';
import { JsTsLanguage } from '../../../shared/src/helpers/language.js';
import { getContext } from '../../../shared/src/helpers/context.js';

/**
 * Builds an ESLint SourceCode for JavaScript / TypeScript
 *
 * This functions routes the parsing of the input based on the input language,
 * the file extension, and some contextual information.
 *
 * @param input the JavaScript / TypeScript analysis input
 * @param language the language of the input
 * @returns the parsed source code
 */
export function buildSourceCode(input: JsTsAnalysisInput, language: JsTsLanguage) {
  const vueFile = isVueFile(input.filePath);

  if (shouldUseTypescriptParser(language)) {
    const options: Linter.ParserOptions = {
      // enable logs for @typescript-eslint
      // debugLevel: true,
      filePath: input.filePath,
      parser: vueFile ? parsers.typescript.parser : undefined,
    };
    const parser = vueFile ? parsers.vuejs : parsers.typescript;
    if (!vueFile) {
      options.programs = input.programId && [getProgramById(input.programId)];
      options.project = input.tsConfigs;
    }
    try {
      debug(`Parsing ${input.filePath} with ${parser.parser}`);
      return parseForESLint(input.fileContent, parser.parse, buildParserOptions(options, false));
    } catch (error) {
      debug(`Failed to parse ${input.filePath} with TypeScript parser: ${error.message}`);
      if (language === 'ts') {
        throw error;
      }
    }
  }

  let moduleError;
  try {
    const parser = vueFile ? parsers.vuejs : parsers.javascript;
    debug(`Parsing ${input.filePath} with ${parser.parser}`);
    return parseForESLint(
      input.fileContent,
      parser.parse,
      buildParserOptions({ parser: vueFile ? parsers.javascript.parser : undefined }, true),
    );
  } catch (error) {
    debug(`Failed to parse ${input.filePath} with Javascript parser: ${error.message}`);
    if (vueFile) {
      throw error;
    }
    moduleError = error;
  }

  try {
    debug(`Parsing ${input.filePath} with Javascript parser in 'script' mode`);
    return parseForESLint(
      input.fileContent,
      parsers.javascript.parse,
      buildParserOptions({ sourceType: 'script' }, true),
    );
  } catch (error) {
    debug(
      `Failed to parse ${input.filePath} with Javascript parser in 'script' mode: ${error.message}`,
    );
    /**
     * We prefer displaying parsing error as module if parsing as script also failed,
     * as it is more likely that the expected source type is module.
     */
    throw moduleError;
  }
}

function shouldUseTypescriptParser(language: JsTsLanguage): boolean {
  return getContext()?.shouldUseTypeScriptParserForJS !== false || language === 'ts';
}

function isVueFile(file: string) {
  return file.toLowerCase().endsWith('.vue');
}
