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

import type { File } from '../files.js';
import { PathTree } from '../../../analysis/projectAnalysis/file-stores/package-jsons.js';
import { MinimatchCache } from '../find-up/find-minimatch.js';
import { dependenciesCache } from './dependencies.js';
import { closestPatternCache } from '../find-up/closest.js';
import { patternInParentsCache } from '../find-up/all-in-parent-dirs.js';

export const PACKAGE_JSON = 'package.json';

export function fillPackageJsonCaches(
  packageJsons: Map<string, File>,
  allPaths: PathTree,
  topDir: string,
) {
  const closestCache = closestPatternCache.get(PACKAGE_JSON).get(topDir);
  const allPackageJsonsCache = patternInParentsCache.get(PACKAGE_JSON).get(topDir);

  for (const [dir, { parent }] of allPaths) {
    const currentPackageJson = packageJsons.get(dir);
    const allPackageJsons = [];
    if (parent) {
      closestCache.set(dir, closestCache.get(parent));
      allPackageJsons.push(...allPackageJsonsCache.get(dir));
    }
    if (currentPackageJson) {
      closestCache.set(dir, currentPackageJson);
      allPackageJsons.push(currentPackageJson);
    }
    allPackageJsonsCache.set(dir, allPackageJsons);
  }
}
/**
 * In the case of SonarIDE, when a package.json file changes, the cache can become obsolete.
 */
export function clearDependenciesCache() {
  dependenciesCache.clear();
  closestPatternCache.get(PACKAGE_JSON).clear();
  patternInParentsCache.get(PACKAGE_JSON).clear();
  MinimatchCache.clear();
}
