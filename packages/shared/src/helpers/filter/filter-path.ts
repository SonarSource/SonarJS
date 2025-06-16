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
import { dirname } from 'node:path/posix';
import {
  getExclusions,
  getInclusions,
  getJsTsExclusions,
  getSourcesPaths,
  getTestExclusions,
  getTestInclusions,
  getTestPaths,
} from '../configuration.js';

export function filterPathAndGetFileType(filePath: string): FileType | undefined {
  if (getJsTsExclusions()?.some(exclusion => exclusion.match(filePath))) {
    return undefined;
  }
  const parent = dirname(filePath);
  const testPaths = getTestPaths();
  if (testPaths?.length && testPaths.some(testPath => parent.startsWith(testPath))) {
    if (getTestExclusions()?.some(exclusion => exclusion.match(filePath))) {
      return undefined;
    }
    const testInclusions = getTestInclusions();
    if (testInclusions?.length) {
      if (testInclusions.some(inclusion => inclusion.match(filePath))) {
        return 'TEST';
      }
      return undefined;
    }
    return 'TEST';
  }

  if (getExclusions()?.some(exclusion => exclusion.match(filePath))) {
    return undefined;
  }

  const inclusions = getInclusions();
  if (inclusions?.length) {
    if (inclusions.some(inclusion => inclusion.match(filePath))) {
      return 'MAIN';
    }
    return undefined;
  }

  if (getSourcesPaths().some(sourcePath => parent.startsWith(sourcePath))) {
    return 'MAIN';
  } else {
    return undefined;
  }
}
