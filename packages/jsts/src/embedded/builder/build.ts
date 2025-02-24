/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { patchParsingError, patchSourceCode } from './patch.js';
import path from 'path';
import { EmbeddedJS } from '../analysis/embedded-js.js';
import { CompleteEmbeddedAnalysisInput } from '../analysis/analysis.js';
import { build as buildJsTs } from '../../builders/build.js';
import { ParseResult } from '../../parsers/parse.js';

export type ExtendedParseResult = ParseResult & {
  syntheticFilePath: string;
};
export type LanguageParser = (text: string) => EmbeddedJS[];

/**
 * Builds ESLint SourceCode instances for every embedded JavaScript.
 *
 * In the case of AWS functions in YAML,
 * the filepath is augmented with the AWS function name, returned as the syntheticFilePath property
 *
 * If there is at least one parsing error in any snippet, we return only the first error and
 * we don't even consider any parsing errors in the remaining snippets for simplicity.
 */
export function build(
  input: CompleteEmbeddedAnalysisInput,
  languageParser: LanguageParser,
): ExtendedParseResult[] {
  const embeddedJSs: EmbeddedJS[] = languageParser(input.fileContent);
  const extendedParseResults: ExtendedParseResult[] = [];
  for (const embeddedJS of embeddedJSs) {
    const { code } = embeddedJS;

    let syntheticFilePath: string = input.filePath;
    if (embeddedJS.extras.resourceName != null) {
      syntheticFilePath = composeSyntheticFilePath(input.filePath, embeddedJS.extras.resourceName);
    }

    /**
     * The file path is purposely left empty as it is ignored by `buildSourceCode` if
     * the file content is provided, which happens to be the case here since `code`
     * denotes an embedded JavaScript snippet extracted from the YAML file.
     */
    const jsTsAnalysisInput = {
      filePath: '',
      fileContent: code,
      fileType: 'MAIN',
      language: 'js',
    } as const;
    try {
      const parseResult = buildJsTs(jsTsAnalysisInput);
      extendedParseResults.push({
        sourceCode: patchSourceCode(parseResult.sourceCode, embeddedJS),
        parser: parseResult.parser,
        parserOptions: parseResult.parserOptions,
        syntheticFilePath,
      });
    } catch (error) {
      throw patchParsingError(error, embeddedJS);
    }
  }
  return extendedParseResults;
}

/**
 * Returns the filename composed as following:
 *
 * {filepath-without-extension}-{resourceName}{filepath-extension}
 */
export function composeSyntheticFilePath(filePath: string, resourceName: string): string {
  const { dir, name, ext } = path.parse(filePath);
  return path.format({
    dir,
    name: `${name}-${resourceName}`,
    ext,
  });
}
