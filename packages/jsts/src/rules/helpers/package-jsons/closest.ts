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

import { dirname } from 'node:path/posix';
import { toUnixPath } from '../files.js';
import { PACKAGE_JSON } from './index.js';
import { closestPatternCache } from '../find-up/closest.js';

export function getClosestPackageJSONDir(dir: string, topDir?: string) {
  const closestPackageJSONDir = closestPatternCache
    .get(PACKAGE_JSON)
    .get(topDir ? toUnixPath(topDir) : '/')
    .get(toUnixPath(dir))?.path;
  if (closestPackageJSONDir) {
    return dirname(closestPackageJSONDir);
  }
}
