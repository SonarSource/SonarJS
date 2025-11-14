/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { MinimatchCache } from '../find-up/find-minimatch.js';
import { dependenciesCache } from './dependencies.js';
import { closestPatternCache } from '../find-up/closest.js';
import { patternInParentsCache } from '../find-up/all-in-parent-dirs.js';
import { basename } from 'node:path/posix';

export const PACKAGE_JSON = 'package.json';

export function isPackageJson(path: string) {
  return basename(path).toLowerCase() === PACKAGE_JSON;
}

export function fillPackageJsonCaches(
  packageJsons: Map<string, File>,
  dirnameToParent: Map<string, string | undefined>,
  topDir: string,
) {
  const closestCache = closestPatternCache.get(PACKAGE_JSON).get(topDir);
  const allPackageJsonsCache = patternInParentsCache.get(PACKAGE_JSON).get(topDir);

  // We depend on the order of the paths, from parent-to-child paths (guaranteed by the use of a Map in the package-json store)
  for (const [dir, parent] of dirnameToParent) {
    const currentPackageJson = packageJsons.get(dir);
    closestCache.set(dir, currentPackageJson ?? (parent ? closestCache.get(parent) : undefined));
    const allPackageJsons = [];
    if (parent) {
      allPackageJsons.push(...allPackageJsonsCache.get(dir));
    }
    if (currentPackageJson) {
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
