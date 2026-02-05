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
import { Minimatch } from 'minimatch';
import { filterBundle } from './filter-bundle.js';
import { filterMinified, hasExcessiveAverageLineLength } from './filter-minified.js';
import { filterSize } from './filter-size.js';
import { isCssFile, isJsTsFile, type FileSuffixes } from '../configuration.js';
import { isJsTsExcluded } from './filter-path.js';
import { type NormalizedAbsolutePath } from '../files.js';

/**
 * Minimal input required for shouldIgnoreFile.
 * All fields are required since the input should be sanitized before calling this function.
 */
interface ShouldIgnoreFileInput {
  filePath: NormalizedAbsolutePath;
  fileContent: string;
}

/**
 * Parameters for the accept function.
 */
export interface AcceptParams extends FileSuffixes {
  /** Whether to detect and skip bundled files */
  detectBundles: boolean;
  /** Maximum file size in KB (0 means no limit) */
  maxFileSize: number;
}

/**
 * Parameters for the shouldIgnoreFile function.
 */
export interface ShouldIgnoreFileParams extends AcceptParams {
  /** JS/TS exclusion patterns from sonar.typescript.exclusions and sonar.javascript.exclusions */
  jsTsExclusions: Minimatch[];
}

/**
 * Determines whether a given file should be accepted for further processing based on its content.
 *
 * @param {NormalizedAbsolutePath} filePath - The path of the file to be checked.
 * @param {string} fileContent - The content of the file to be checked.
 * @param {AcceptParams} params - Configuration parameters for filtering.
 * @return {boolean} Returns true if the file meets the acceptance criteria, otherwise false.
 *
 * Callers need to pass: shouldDetectBundles() and getMaxFileSize() from configuration
 */
export function accept(
  filePath: NormalizedAbsolutePath,
  fileContent: string,
  params: AcceptParams,
): boolean {
  const { detectBundles, maxFileSize, jsSuffixes, tsSuffixes, cssSuffixes } = params;
  const suffixes: FileSuffixes = { jsSuffixes, tsSuffixes, cssSuffixes };
  if (isJsTsFile(filePath, suffixes)) {
    return (
      (!detectBundles || filterBundle(filePath, fileContent)) &&
      filterMinified(filePath, fileContent) &&
      filterSize(filePath, fileContent, maxFileSize)
    );
  } else if (isCssFile(filePath, cssSuffixes)) {
    // We ignore the size limit for CSS files because analyzing large CSS files takes a reasonable amount of time
    return filterMinified(filePath, fileContent);
  }
  return true;
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
 * @param {ShouldIgnoreFileInput} file - The file to analyze with filePath and fileContent already populated.
 * @param {ShouldIgnoreFileParams} params - Configuration parameters for filtering.
 * @return {Promise<boolean>} A promise that resolves to `true` if the file should be ignored otherwise `false`.
 *
 * Callers need to pass: getJsTsExclusions(), shouldDetectBundles(), and getMaxFileSize() from configuration
 */
export async function shouldIgnoreFile(
  file: ShouldIgnoreFileInput,
  params: ShouldIgnoreFileParams,
): Promise<boolean> {
  const { filePath, fileContent } = file;
  const { jsTsExclusions, detectBundles, maxFileSize, jsSuffixes, tsSuffixes, cssSuffixes } =
    params;
  if (
    isJsTsExcluded(filePath, jsTsExclusions) ||
    !accept(filePath, fileContent, {
      detectBundles,
      maxFileSize,
      jsSuffixes,
      tsSuffixes,
      cssSuffixes,
    })
  ) {
    return true;
  }
  return false;
}
