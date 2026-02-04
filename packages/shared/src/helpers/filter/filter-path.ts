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
import { FileType, type NormalizedAbsolutePath } from '../files.js';
import { debug } from '../logging.js';

/**
 * Parameters for filterPathAndGetFileType function.
 */
export interface FilterPathParams {
  /** sonar.sources - absolute paths to look for files */
  sourcesPaths: NormalizedAbsolutePath[];
  /** sonar.tests - absolute paths to look for test files */
  testPaths: NormalizedAbsolutePath[];
  /** sonar.inclusions - wildcards to narrow down sonar.sources */
  inclusions: Minimatch[];
  /** sonar.exclusions - wildcards to narrow down sonar.sources */
  exclusions: Minimatch[];
  /** sonar.test.inclusions - wildcards to narrow down sonar.tests */
  testInclusions: Minimatch[];
  /** sonar.test.exclusions - wildcards to narrow down sonar.tests */
  testExclusions: Minimatch[];
}

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
  if (jsTsExclusions?.some(exclusion => exclusion.match(filePath))) {
    debug(`File ignored due to js/ts exclusions: ${filePath}`);
    return true;
  }
  return false;
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
  if (fileIsTest(filePath, params)) {
    return 'TEST';
  }

  if (fileIsMain(filePath, params)) {
    return 'MAIN';
  }
  debug(`File ignored due to analysis scope filters: ${filePath}`);
}

function fileIsTest(filePath: NormalizedAbsolutePath, params: FilterPathParams): boolean {
  const { testPaths, testExclusions, testInclusions } = params;
  if (!testPaths?.some(testPath => filePath === testPath || filePath.startsWith(`${testPath}/`))) {
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

function fileIsMain(filePath: NormalizedAbsolutePath, params: FilterPathParams): boolean {
  const { sourcesPaths, exclusions, inclusions } = params;
  if (
    !sourcesPaths.some(
      sourcePath => filePath === sourcePath || filePath.startsWith(`${sourcePath}/`),
    )
  ) {
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
