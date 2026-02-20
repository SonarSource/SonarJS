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
import { patchParsingError, patchSourceCode } from './patch.js';
import path from 'node:path/posix';
import type { EmbeddedJS } from '../analysis/embedded-js.js';
import type { EmbeddedAnalysisInput } from '../analysis/analysis.js';
import { build as buildJsTs } from '../../builders/build.js';
import { type JsTsAnalysisInput, JSTS_ANALYSIS_DEFAULTS } from '../../analysis/analysis.js';
import type { ParseResult } from '../../parsers/parse.js';
import type { NormalizedAbsolutePath } from '../../rules/helpers/index.js';
import { acceptSnippet } from '../../../../shared/src/helpers/filter/filter.js';
import { debug } from '../../../../shared/src/helpers/logging.js';

export type ExtendedParseResult = ParseResult & {
  syntheticFilePath: NormalizedAbsolutePath;
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
  input: EmbeddedAnalysisInput,
  languageParser: LanguageParser,
): ExtendedParseResult[] {
  const embeddedJSs: EmbeddedJS[] = languageParser(input.fileContent);
  const extendedParseResults: ExtendedParseResult[] = [];
  for (const embeddedJS of embeddedJSs) {
    const { code } = embeddedJS;

    if (!acceptSnippet(code)) {
      debug(`Code snippet in ${input.filePath}:${embeddedJS.line} was skipped.`);
      continue;
    }

    let syntheticFilePath: NormalizedAbsolutePath = input.filePath;
    if (embeddedJS.extras.resourceName != null) {
      syntheticFilePath = composeSyntheticFilePath(input.filePath, embeddedJS.extras.resourceName);
    }

    /**
     * The file path is purposely left empty as it is ignored by `buildSourceCode` if
     * the file content is provided, which happens to be the case here since `code`
     * denotes an embedded JavaScript snippet extracted from the YAML file.
     */
    const jsTsAnalysisInput: JsTsAnalysisInput = {
      ...JSTS_ANALYSIS_DEFAULTS,
      filePath: '' as NormalizedAbsolutePath,
      fileContent: code,
      language: 'js',
      tsConfigs: [],
      sonarlint: input.sonarlint,
    };
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
 *
 * Since the input filePath is already normalized (NormalizedAbsolutePath),
 * and we only modify the filename portion using posix path operations,
 * the result is also a valid NormalizedAbsolutePath.
 */
export function composeSyntheticFilePath(
  filePath: NormalizedAbsolutePath,
  resourceName: string,
): NormalizedAbsolutePath {
  const { dir, name, ext } = path.parse(filePath);
  return path.format({
    dir,
    name: `${name}-${resourceName}`,
    ext,
  }) as NormalizedAbsolutePath;
}
