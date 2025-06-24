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

import { FileType } from '../files.js';
import {
  getExclusions,
  getInclusions,
  getJsTsExclusions,
  getSourcesPaths,
  getTestExclusions,
  getTestInclusions,
  getTestPaths,
} from '../configuration.js';
import { debug } from '../logging.js';

/**
 * Checks whether a given file path is excluded based on JavaScript/TypeScript exclusion
 * properties sonar.typescript.exclusions and sonar.javascript.exclusions wildcards.
 *
 * @param filePath The path of the file to be checked.
 * @return Returns true if the file path matches any exclusion wildcard; otherwise, false.
 */
export function isJsTsExcluded(filePath: string) {
  if (getJsTsExclusions()?.some(exclusion => exclusion.match(filePath))) {
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
 * @param {string} filePath - The file path to be evaluated.
 * @return {FileType | undefined} Returns 'MAIN' if the file belongs to the main sources,
 * 'TEST' if it belongs to the test sources, or undefined if it is excluded from analysis.
 */
export function filterPathAndGetFileType(filePath: string): FileType | undefined {
  if (isJsTsExcluded(filePath)) {
    return undefined;
  }

  if (fileIsTest(filePath)) {
    return 'TEST';
  }

  if (fileIsMain(filePath)) {
    return 'MAIN';
  }
  debug(`File ignored due to analysis scope filters: ${filePath}`);
}

function fileIsTest(filePath: string): boolean {
  const testPaths = getTestPaths();
  if (!testPaths?.some(testPath => filePath.startsWith(testPath))) {
    return false;
  }
  if (getTestExclusions()?.some(exclusion => exclusion.match(filePath))) {
    return false;
  }
  const testInclusions = getTestInclusions();
  if (testInclusions?.length) {
    return testInclusions.some(inclusion => inclusion.match(filePath));
  }
  return true;
}

function fileIsMain(filePath: string): boolean {
  if (!getSourcesPaths().some(sourcePath => filePath.startsWith(sourcePath))) {
    return false;
  }

  if (getExclusions()?.some(exclusion => exclusion.match(filePath))) {
    return false;
  }

  const inclusions = getInclusions();
  if (inclusions?.length) {
    return inclusions.some(inclusion => inclusion.match(filePath));
  }
  return true;
}
