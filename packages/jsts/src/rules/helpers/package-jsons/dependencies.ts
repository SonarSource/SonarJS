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

import { ComputedCache } from '../cache.js';
import { Minimatch } from 'minimatch';
import fs from 'node:fs';
import { getDependenciesFromPackageJson } from './parse.js';
import { getClosestPackageJSONDir } from './closest.js';
import { getManifests } from './all-in-parent-dirs.js';

/**
 * Cache for the available dependencies by dirname. Exported for tests
 */
export const dependenciesCache = new ComputedCache((dir: string, topDir: string | undefined) => {
  const closestPackageJSONDirName = getClosestPackageJSONDir(dir, topDir);
  const result = new Set<string | Minimatch>();

  if (closestPackageJSONDirName) {
    getManifests(closestPackageJSONDirName, topDir, fs).forEach(manifest => {
      const manifestDependencies = getDependenciesFromPackageJson(manifest);

      manifestDependencies.forEach(dependency => {
        result.add(dependency.name);
      });
    });
  }
  return result;
});
/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param dir dirname of the context.filename
 * @param topDir working dir, will search up to that root
 * @returns Set with the dependency names
 */
export function getDependencies(dir: string, topDir: string) {
  const closestPackageJSONDirName = getClosestPackageJSONDir(dir, topDir);
  if (closestPackageJSONDirName) {
    return dependenciesCache.get(closestPackageJSONDirName, topDir);
  }
  return new Set<string | Minimatch>();
}
