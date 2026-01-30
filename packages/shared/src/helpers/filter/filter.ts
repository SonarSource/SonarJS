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
import { filterBundle } from './filter-bundle.js';
import { filterMinified } from './filter-minified.js';
import { filterSize } from './filter-size.js';
import {
  getBaseDir,
  getMaxFileSize,
  isCssFile,
  isJsTsFile,
  shouldDetectBundles,
} from '../configuration.js';
import { isJsTsExcluded } from './filter-path.js';
import { type NormalizedAbsolutePath, normalizeToAbsolutePath, readFile } from '../files.js';
import { AnalysisInput } from '../../types/analysis.js';

/**
 * Determines whether a given file should be accepted for further processing based on its content.
 *
 * @param {NormalizedAbsolutePath} filePath - The path of the file to be checked.
 * @param {string} fileContent - The content of the file to be checked.
 * @return {boolean} Returns true if the file meets the acceptance criteria, otherwise false.
 */
export function accept(filePath: NormalizedAbsolutePath, fileContent: string): boolean {
  if (isJsTsFile(filePath)) {
    return (
      (!shouldDetectBundles() || filterBundle(filePath, fileContent)) &&
      filterMinified(filePath, fileContent) &&
      filterSize(filePath, fileContent, getMaxFileSize())
    );
  } else if (isCssFile(filePath)) {
    // We ignore the size limit for CSS files because analyzing large CSS files takes a reasonable amount of time
    return filterMinified(filePath, fileContent);
  }
  return true;
}

/**
 * Determines whether a given file should be ignored based on its file path and content. This is
 * the equivalent to the JavaScriptExclusionsFileFilter.java which was used in Java:
 *       new PathAssessor(configuration), <- still in place in Java under JsTsExclusionsFilter.java
 *       new SizeAssessor(configuration),
 *       new MinificationAssessor(),
 *       new BundleAssessor()
 *
 * @param {AnalysisInput} file - The file to analyze, including its filePath and optionally its fileContent.
 * @return {Promise<boolean>} A promise that resolves to `true` if the file should be ignored otherwise `false`.
 */
export async function shouldIgnoreFile(file: AnalysisInput): Promise<boolean> {
  const filename = normalizeToAbsolutePath(file.filePath, getBaseDir());
  file.filePath = filename;
  file.fileContent = file.fileContent ?? (await readFile(filename));
  if (isJsTsExcluded(filename) || !accept(filename, file.fileContent)) {
    return true;
  }
  return false;
}
