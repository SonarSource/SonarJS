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

type CandidateClassification = 'MATCH' | 'EXCLUDED' | 'OUT_OF_SCOPE' | 'NO_MATCH';

type FilePathClassification =
  | { status: 'MAIN'; fileType: 'MAIN' }
  | { status: 'TEST'; fileType: 'TEST' }
  | { status: 'EXCLUDED' }
  | { status: 'OUT_OF_SCOPE' };

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
 * properties. This is only used when Node.js loops the whole project tree looking for files. This
 * only happens in ruling tests and in SonarLint during the first lookup to count files.
 * In SQS this will never be executed, as the request already contains the list of files as
 * digested by the scanner engine. The only path filter that we need to run in SQS is isJsTsExcluded.
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
  const classification = classifyFilePathInternal(filePath, params, true);
  if (classification.status === 'TEST' || classification.status === 'MAIN') {
    return classification.fileType;
  }
  debug(`File ignored due to analysis scope filters: ${filePath}`);
}

function fileIsUnder(filePath: NormalizedAbsolutePath, paths: NormalizedAbsolutePath[]): boolean {
  return paths.some(path => filePath === path || filePath.startsWith(`${path}/`));
}

function classifyFilePathInternal(
  filePath: NormalizedAbsolutePath,
  params: FilterPathParams,
  logHeuristicTestDetection: boolean,
): FilePathClassification {
  const testClassification = classifyTestPath(filePath, params, logHeuristicTestDetection);
  if (testClassification === 'MATCH') {
    return { status: 'TEST', fileType: 'TEST' };
  }

  const mainClassification = classifyMainPath(filePath, params);
  if (mainClassification === 'MATCH') {
    return { status: 'MAIN', fileType: 'MAIN' };
  }

  if (mainClassification === 'EXCLUDED' || testClassification === 'EXCLUDED') {
    return { status: 'EXCLUDED' };
  }

  return { status: 'OUT_OF_SCOPE' };
}

function classifyTestPath(
  filePath: NormalizedAbsolutePath,
  params: FilterPathParams,
  logHeuristicTestDetection: boolean,
): CandidateClassification {
  const {
    testPaths,
    testExclusions,
    testInclusions,
    inclusions,
    sourcesPaths,
    testFileExtensions,
  } = params;

  // If `sonar.tests` is not configured, fall back to the filename heuristic — unless the file
  // qualifies as MAIN via the user's `sonar.inclusions` (which narrows `sonar.sources`), in which
  // case the user has explicitly opted it into MAIN scope and we should not second-guess them.
  if (!testPaths.length) {
    if (
      inclusions.length > 0 &&
      fileIsUnder(filePath, sourcesPaths) &&
      inclusions.some(inclusion => inclusion.match(filePath))
    ) {
      return 'NO_MATCH';
    }
    const doesLookLikeTestFile = isTestRelatedFile(filePath, testFileExtensions);
    if (doesLookLikeTestFile && logHeuristicTestDetection) {
      debug(
        `Test file detected: ${filePath}. If this file should not be treated as a test, please configure sonar.tests or adjust your sonar.sources/sonar.inclusions to explicitly include it as MAIN.`,
      );
    }
    return doesLookLikeTestFile ? 'MATCH' : 'NO_MATCH';
  }

  if (!fileIsUnder(filePath, testPaths)) {
    return 'NO_MATCH';
  }
  if (testExclusions?.some(exclusion => exclusion.match(filePath))) {
    return 'EXCLUDED';
  }
  if (testInclusions?.length) {
    return testInclusions.some(inclusion => inclusion.match(filePath)) ? 'MATCH' : 'OUT_OF_SCOPE';
  }
  return 'MATCH';
}

function classifyMainPath(
  filePath: NormalizedAbsolutePath,
  params: FilterPathParams,
): CandidateClassification {
  const { sourcesPaths, exclusions, inclusions } = params;
  if (!fileIsUnder(filePath, sourcesPaths)) {
    return 'NO_MATCH';
  }

  if (exclusions?.some(exclusion => exclusion.match(filePath))) {
    return 'EXCLUDED';
  }

  if (inclusions?.length) {
    return inclusions.some(inclusion => inclusion.match(filePath)) ? 'MATCH' : 'OUT_OF_SCOPE';
  }
  return 'MATCH';
}
