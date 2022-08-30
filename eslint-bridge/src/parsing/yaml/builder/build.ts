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
import { SourceCode } from 'eslint';
import { JsTsAnalysisInput } from 'services/analysis';
import { buildSourceCode } from 'parsing/jsts';
import { parseAwsFromYaml } from 'parsing/yaml';
import { patchParsingError, patchSourceCode } from './patch';

export type FilePathToSourceCode = {
  [filePath: string]: SourceCode;
};

/**
 * Builds ESLint SourceCode instances for every embedded JavaScript snippet in the YAML file.
 *
 * Returns an object { filePath -> SourceCode }
 * The filepath is augmented with the AWS function name
 *
 * If there is at least one parsing error in any snippet, we return only the first error and
 * we don't even consider any parsing errors in the remaining snippets for simplicity.
 */
export function buildSourceCodesMap(filePath: string): FilePathToSourceCode {
  const embeddedJSs = parseAwsFromYaml(filePath);

  const sourceCodes: FilePathToSourceCode = {};
  for (const embeddedJS of embeddedJSs) {
    const { code } = embeddedJS;

    let sourceCodeFilePath = filePath;
    if (embeddedJS.extras.functionName != null) {
      sourceCodeFilePath = composeSourceCodeFilename(filePath, embeddedJS.extras.functionName);
    }

    /**
     * The file path is purposely left empty as it is ignored by `buildSourceCode` if
     * the file content is provided, which happens to be the case here since `code`
     * denotes an embedded JavaScript snippet extracted from the YAML file.
     */
    const input = {
      filePath: '',
      fileContent: code,
      fileType: 'MAIN',
    } as JsTsAnalysisInput;
    try {
      const sourceCode = buildSourceCode(input, 'js');
      const patchedSourceCode = patchSourceCode(sourceCode, embeddedJS);
      sourceCodes[sourceCodeFilePath] = patchedSourceCode;
    } catch (error) {
      throw patchParsingError(error, embeddedJS);
    }
  }
  return sourceCodes;
}

/**
 * Returns the filename composed as following:
 *
 * @param filePath
 * @param functionName
 * @returns
 */
export function composeSourceCodeFilename(filePath: string, functionName: string): string {
  const extensionStart = filePath.lastIndexOf('.');
  const filePathWithoutExtension = filePath.substring(0, extensionStart);
  const filePathExtension = filePath.substring(extensionStart);
  return `${filePathWithoutExtension}-${functionName}${filePathExtension}`;
}

/**
 * Similar to buildSourceCodesMap(), but extracts only the values
 */
export function buildSourceCodes(filePath: string): SourceCode[] {
  return Object.values(buildSourceCodesMap(filePath));
}
