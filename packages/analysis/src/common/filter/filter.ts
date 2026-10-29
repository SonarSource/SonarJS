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
import { filterBundle } from './filter-bundle.js';
import { filterMinified, hasExcessiveAverageLineLength } from './filter-minified.js';
import { filterSize } from './filter-size.js';
import { isCssFile, isJsTsFile, type FilterFileParams } from '../configuration.js';
import { isJsTsExcluded } from './filter-path.js';

import { type NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';

export type FileExclusionReason = 'configuration' | 'bundle' | 'minified' | 'size';

/**
 * Determines whether a given file should be accepted for further processing based on its content.
 *
 * @param {NormalizedAbsolutePath} filePath - The path of the file to be checked.
 * @param {string} fileContent - The content of the file to be checked.
 * @param {FilterFileParams} params - Configuration parameters for filtering.
 * @return {boolean} Returns true if the file meets the acceptance criteria, otherwise false.
 *
 * Callers need to pass: shouldDetectBundles() and getMaxFileSize() from configuration
 */
export function accept(
  filePath: NormalizedAbsolutePath,
  fileContent: string,
  params: FilterFileParams,
): boolean {
  return contentExclusionReason(filePath, fileContent, params) === undefined;
}

/**
 * Determines whether an embedded code snippet should be accepted for analysis.
 * Only uses minification detection (average line length) - bundle detection is
 * not applied to snippets as it can produce false positives on legitimate code
 * patterns like IIFEs with comments.
 */
export function acceptSnippet(content: string): boolean {
  return !hasExcessiveAverageLineLength(content);
}

/**
 * Determines whether a given file should be ignored based on its file path and content. This is
 * the equivalent to the JavaScriptExclusionsFileFilter.java which was used in Java:
 *       new PathAssessor(configuration), <- still in place in Java under JsTsExclusionsFilter.java
 *       new SizeAssessor(configuration),
 *       new MinificationAssessor(),
 *       new BundleAssessor()
 *
 * The input must be fully sanitized (all fields required) before calling this function.
 *
 * @param {filePath: string, fileContent: string} file - The file to analyze with filePath and fileContent already populated.
 * @param {FilterFileParams} params - Configuration parameters for filtering.
 * @return {Promise<boolean>} A promise that resolves to `true` if the file should be ignored otherwise `false`.
 *
 * Callers need to pass: getJsTsExclusions(), shouldDetectBundles(), and getMaxFileSize() from configuration
 */
export async function shouldIgnoreFile(
  file: {
    filePath: NormalizedAbsolutePath;
    fileContent: string;
  },
  params: FilterFileParams,
): Promise<boolean> {
  return fileExclusionReason(file, params) !== undefined;
}

export function fileExclusionReason(
  file: { filePath: NormalizedAbsolutePath; fileContent: string },
  params: FilterFileParams,
): FileExclusionReason | undefined {
  if (isJsTsExcluded(file.filePath, params.jsTsExclusions)) {
    return 'configuration';
  }
  return contentExclusionReason(file.filePath, file.fileContent, params);
}

function contentExclusionReason(
  filePath: NormalizedAbsolutePath,
  fileContent: string,
  params: FilterFileParams,
): FileExclusionReason | undefined {
  const { detectBundles, maxFileSize, jsSuffixes, tsSuffixes, cssSuffixes } = params;
  if (isJsTsFile(filePath, { jsSuffixes, tsSuffixes })) {
    if (detectBundles && !filterBundle(filePath, fileContent)) {
      return 'bundle';
    }
    if (!filterMinified(filePath, fileContent)) {
      return 'minified';
    }
    if (!filterSize(filePath, fileContent, maxFileSize)) {
      return 'size';
    }
  } else if (isCssFile(filePath, cssSuffixes) && !filterMinified(filePath, fileContent)) {
    return 'minified';
  }
  return undefined;
}
