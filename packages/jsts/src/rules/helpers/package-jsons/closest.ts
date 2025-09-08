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

import { toUnixPath } from '../files.js';
import { dirname } from 'node:path/posix';
import { ComputedCache } from '../../../../../shared/src/helpers/cache.js';
import { createFindUpFirstMatch, Filesystem } from '../find-up.js';
import fs from 'node:fs';
import { PACKAGE_JSON } from './index.js';

export const closestPackageJsonCache = new ComputedCache(
  (
    topDir: string | undefined,
    _cache: ComputedCache<any, any, Filesystem>,
    filesystem: Filesystem = fs,
  ) => {
    return createFindUpFirstMatch(PACKAGE_JSON, topDir, filesystem);
  },
);

export function getClosestPackageJSONDir(dir: string, topDir?: string) {
  const closestPackageJson = closestPackageJsonCache.get(topDir).get(toUnixPath(dir))?.path;
  if (closestPackageJson) {
    return dirname(closestPackageJson);
  }
  return undefined;
}
