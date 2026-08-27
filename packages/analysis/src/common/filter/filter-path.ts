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
import type { Minimatch } from 'minimatch';
import { type NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { debug } from '../../../../shared/src/helpers/logging.js';
import type { FileType } from '../../contracts/file.js';
import { type FilterPathParams } from '../configuration.js';
import { isTestRelatedFile } from '../../jsts/rules/helpers/test-file-pattern.js';

/**
 * Checks whether a given file path is excluded based on JavaScript/TypeScript exclusion
 * properties sonar.typescript.exclusions and sonar.javascript.exclusions wildcards.
 *
 * @param filePath The path of the file to be checked (must be normalized absolute path).
 * @param jsTsExclusions The JS/TS exclusion patterns from configuration.
 * @return Returns true if the file path matches any exclusion wildcard; otherwise, false.
 *
 * Callers need to pass: getJsTsExclusions() from configuration
 */
export function isJsTsExcluded(
  filePath: NormalizedAbsolutePath,
  jsTsExclusions: Minimatch[],
): boolean {
  if (matchesJsTsExclusion(filePath, jsTsExclusions)) {
    debug(`File ignored due to js/ts exclusions: ${filePath}`);
    return true;
  }
  return false;
}

export function matchesJsTsExclusion(
  filePath: NormalizedAbsolutePath,
  jsTsExclusions: Minimatch[],
): boolean {
  return jsTsExclusions?.some(exclusion => exclusion.match(filePath)) ?? false;
}

/**
 * Filters a given file path based on inclusion and exclusion rules and determines its type.
 * This mimics the scanner engine implementation of "sources", "tests" and its inclusion/exclusion
 * properties. It is used during filesystem traversal and as a defensive file-type inference
 * fallback for explicit request files whose incoming type is not explicitly TEST.
 *
 * @param {NormalizedAbsolutePath} filePath - The file path to be evaluated (must be normalized absolute path).
 * @param {FilterPathParams} params - The path filtering parameters from configuration.
 * @return {FileType | undefined} Returns 'MAIN' if the file belongs to the main sources,
 * 'TEST' if it belongs to the test sources, or undefined if it is excluded from analysis.
 *
 * Callers need to pass: getSourcesPaths(), getTestPaths(), getInclusions(), getExclusions(),
 * getTestInclusions(), getTestExclusions() from configuration
 */
export function filterPathAndGetFileType(
  filePath: NormalizedAbsolutePath,
  params: FilterPathParams,
): FileType | undefined {
  if (matchesTestPath(filePath, params)) {
    return 'TEST';
  }

  if (matchesMainPath(filePath, params)) {
    return 'MAIN';
  }

  debug(`File ignored due to analysis scope filters: ${filePath}`);
}

/**
 * Returns the file type used for rule selection. The filename heuristic deliberately affects only
 * this classification: metrics and other file artifacts continue to use the scanner/path-derived
 * file type.
 */
export function getFileTypeForRules(
  filePath: NormalizedAbsolutePath,
  fileType: FileType,
  params: FilterPathParams,
): FileType {
  if (fileType === 'TEST' || !matchesTestFileHeuristic(filePath, params)) {
    return fileType;
  }

  debug(
    `Test file detected: ${filePath}. If this file should not use test rules, please configure sonar.tests or adjust your sonar.sources/sonar.inclusions to explicitly include it as MAIN.`,
  );
  return 'TEST';
}

function fileIsUnder(filePath: NormalizedAbsolutePath, paths: NormalizedAbsolutePath[]): boolean {
  return paths.some(path => filePath === path || filePath.startsWith(`${path}/`));
}

function matchesTestPath(filePath: NormalizedAbsolutePath, params: FilterPathParams): boolean {
  const { testPaths, testExclusions, testInclusions } = params;

  if (!fileIsUnder(filePath, testPaths)) {
    return false;
  }
  if (testExclusions?.some(exclusion => exclusion.match(filePath))) {
    return false;
  }
  if (testInclusions?.length) {
    return testInclusions.some(inclusion => inclusion.match(filePath));
  }
  return true;
}

function matchesTestFileHeuristic(
  filePath: NormalizedAbsolutePath,
  params: FilterPathParams,
): boolean {
  const { testPaths, inclusions, sourcesPaths, testFileExtensions } = params;
  if (testPaths.length) {
    return false;
  }

  // `sonar.inclusions` narrows `sonar.sources`, so a matching file has been explicitly opted into
  // MAIN rule selection and should not be second-guessed by the filename heuristic.
  if (
    inclusions.length > 0 &&
    fileIsUnder(filePath, sourcesPaths) &&
    inclusions.some(inclusion => inclusion.match(filePath))
  ) {
    return false;
  }
  return isTestRelatedFile(filePath, testFileExtensions);
}

function matchesMainPath(filePath: NormalizedAbsolutePath, params: FilterPathParams): boolean {
  const { sourcesPaths, exclusions, inclusions } = params;
  if (!fileIsUnder(filePath, sourcesPaths)) {
    return false;
  }

  if (exclusions?.some(exclusion => exclusion.match(filePath))) {
    return false;
  }

  if (inclusions?.length) {
    return inclusions.some(inclusion => inclusion.match(filePath));
  }
  return true;
}
