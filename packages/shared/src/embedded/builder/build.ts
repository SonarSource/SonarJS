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
import { SourceCode } from 'eslint';
import { buildSourceCode, JsTsAnalysisInput } from '@sonar/jsts';
import { EmbeddedJS, EmbeddedAnalysisInput } from '@sonar/shared/embedded';
import { patchParsingError, patchSourceCode } from './patch';
import clone from 'lodash.clone';
import path from 'path';

export type ExtendedSourceCode = SourceCode & { syntheticFilePath: string };
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
export function buildSourceCodes(
  input: EmbeddedAnalysisInput,
  languageParser: LanguageParser,
): ExtendedSourceCode[] {
  const embeddedJSs: EmbeddedJS[] = languageParser(input.fileContent);
  const extendedSourceCodes: ExtendedSourceCode[] = [];
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
    } as JsTsAnalysisInput;
    try {
      const sourceCode = buildSourceCode(jsTsAnalysisInput, 'js');
      const patchedSourceCode: SourceCode = patchSourceCode(sourceCode, embeddedJS);
      // We use lodash.clone here to remove the effects of Object.preventExtensions()
      const extendedSourceCode: ExtendedSourceCode = Object.assign(clone(patchedSourceCode), {
        syntheticFilePath,
      });
      extendedSourceCodes.push(extendedSourceCode);
    } catch (error) {
      throw patchParsingError(error, embeddedJS);
    }
  }
  return extendedSourceCodes;
}

/**
 * Returns the filename composed as following:
 *
 * {filepath-without-extention}-{resourceName}{filepath-extension}
 */
export function composeSyntheticFilePath(filePath: string, resourceName: string): string {
  const { dir, name, ext } = path.parse(filePath);
  return path.format({
    dir,
    name: `${name}-${resourceName}`,
    ext,
  });
}
