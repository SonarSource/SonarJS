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

export function isJsTsExcluded(filePath: string) {
  if (getJsTsExclusions()?.some(exclusion => exclusion.match(filePath))) {
    debug(`File ignored due to js/ts exclusions: ${filePath}`);
    return true;
  }
  return false;
}

export function filterPathAndGetFileType(filePath: string): FileType | undefined {
  if (isJsTsExcluded(filePath)) {
    return undefined;
  }

  const testPaths = getTestPaths();
  if (testPaths?.length && testPaths.some(testPath => filePath.startsWith(testPath))) {
    if (getTestExclusions()?.some(exclusion => exclusion.match(filePath))) {
      debug(`File ignored due to test exclusions: ${filePath}`);
      return undefined;
    }
    const testInclusions = getTestInclusions();
    if (testInclusions?.length) {
      if (testInclusions.some(inclusion => inclusion.match(filePath))) {
        return 'TEST';
      }
      debug(`File ignored as it's not in test inclusions paths: ${filePath}`);
      return undefined;
    }
    return 'TEST';
  }

  if (getExclusions()?.some(exclusion => exclusion.match(filePath))) {
    debug(`File ignored due to exclusions: ${filePath}`);
    return undefined;
  }

  const inclusions = getInclusions();
  if (inclusions?.length) {
    if (inclusions.some(inclusion => inclusion.match(filePath))) {
      return 'MAIN';
    }
    debug(`File ignored as it's not in sources inclusions paths: ${filePath}`);
    return undefined;
  }

  if (getSourcesPaths().some(sourcePath => filePath.startsWith(sourcePath))) {
    return 'MAIN';
  } else {
    debug(`File ignored as it's not in sources paths: ${filePath}`);
    return undefined;
  }
}
