/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { debug, getContext, getWildcardTSConfig, JsTsLanguage } from 'helpers';
import { JsTsAnalysisInput } from 'services/analysis';
import { buildParserOptions, parseForESLint, parsers } from 'parsing/jsts';
import { getDefaultTSConfigs, getProgramForFile } from 'services/program';
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
export function buildSourceCode(input: JsTsAnalysisInput) {
  const vueFile = isVueFile(input.filePath);

  if (shouldUseTypescriptParser(input.language)) {
    const options: Linter.ParserOptions = {
      // enable logs for @typescript-eslint
      // debugLevel: true,
      filePath: input.filePath,
      parser: vueFile ? parsers.typescript.parser : undefined,
    };
    if (shouldCreateProgram(input)) {
      try {
        const program = getProgramForFile(input);
        options.programs = [program];
      } catch (error) {
        debug(`Failed to create program for ${input.filePath}: ${error.message}`);
      }
    } else {
      options.project = input.tsConfigs ? [...input.tsConfigs] : [];
      if (input.useFoundTSConfigs === true) {
        options.project.push(...getDefaultTSConfigs(input.baseDir).db.keys());
      }
      if (input.createWildcardTSConfig === true) {
        options.project.push(getWildcardTSConfig(input.baseDir));
      }
    }

    try {
      return parseForESLint(
        input.fileContent,
        vueFile ? parsers.vuejs.parse : parsers.typescript.parse,
        buildParserOptions(options, false),
      );
    } catch (error) {
      debug(`Failed to parse ${input.filePath} with TypeScript parser: ${error.message}`);
      if (input.language === 'ts' && !options.project) {
        throw error;
      }
    }

    if (options.project) {
      //try without any project
      delete options.project;
      try {
        return parseForESLint(
          input.fileContent,
          vueFile ? parsers.vuejs.parse : parsers.typescript.parse,
          buildParserOptions(options, false),
        );
      } catch (error) {
        debug(`Failed to parse ${input.filePath} with TypeScript parser: ${error.message}`);
        if (input.language === 'ts') {
          throw error;
        }
      }
    }
  }

  let moduleError;
  try {
    return parseForESLint(
      input.fileContent,
      vueFile ? parsers.vuejs.parse : parsers.javascript.parse,
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

function shouldCreateProgram(input: JsTsAnalysisInput): boolean {
  return !getContext()?.sonarlint && !isVueFile(input.filePath) && input.createProgram === true;
}

function shouldUseTypescriptParser(language: JsTsLanguage): boolean {
  return getContext()?.shouldUseTypeScriptParserForJS !== false || language === 'ts';
}

function isVueFile(file: string) {
  return file.toLowerCase().endsWith('.vue');
}
