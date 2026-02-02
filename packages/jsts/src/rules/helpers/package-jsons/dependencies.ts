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
import type { Rule } from 'eslint';
import { ComputedCache } from '../cache.js';
import { Minimatch } from 'minimatch';
import fs from 'node:fs';
import { minVersion } from 'semver';
import { type NormalizedAbsolutePath, normalizeToAbsolutePath, dirnamePath } from '../files.js';
import { getDependenciesFromPackageJson } from './parse.js';
import { getClosestPackageJSONDir } from './closest.js';
import { getManifests } from './all-in-parent-dirs.js';

/**
 * Cache for the available dependencies by dirname. Exported for tests
 */
export const dependenciesCache = new ComputedCache(
  (dir: NormalizedAbsolutePath, topDir?: NormalizedAbsolutePath) => {
    const closestPackageJSONDirName = getClosestPackageJSONDir(dir, topDir);
    const result = new Set<string | Minimatch>();

    if (closestPackageJSONDirName) {
      for (const manifest of getManifests(closestPackageJSONDirName, topDir, fs)) {
        const manifestDependencies = getDependenciesFromPackageJson(manifest);

        for (const dependency of manifestDependencies) {
          result.add(dependency.name);
        }
      }
    }
    return result;
  },
);
/**
 * Retrieve the dependencies of all the package.json files available for the given file.
 *
 * @param dir dirname of the context.filename
 * @param topDir working dir, will search up to that root
 * @returns Set with the dependency names
 */
export function getDependencies(dir: NormalizedAbsolutePath, topDir: NormalizedAbsolutePath) {
  const closestPackageJSONDirName = getClosestPackageJSONDir(dir, topDir);
  if (closestPackageJSONDirName) {
    return dependenciesCache.get(closestPackageJSONDirName, topDir);
  }
  return new Set<string | Minimatch>();
}

export function getDependenciesSanitizePaths(context: Rule.RuleContext) {
  return getDependencies(
    dirnamePath(normalizeToAbsolutePath(context.filename)),
    normalizeToAbsolutePath(context.cwd),
  );
}

/**
 * Gets the React version from the closest package.json.
 *
 * @param context ESLint rule context
 * @returns React version string (coerced from range) or null if not found
 */
export function getReactVersion(context: Rule.RuleContext): string | null {
  const dir = dirnamePath(normalizeToAbsolutePath(context.filename));
  for (const packageJson of getManifests(dir, normalizeToAbsolutePath(context.cwd), fs)) {
    const reactVersion = packageJson.dependencies?.react ?? packageJson.devDependencies?.react;
    if (reactVersion) {
      // Coerce version ranges (e.g., "^18.0.0") to valid semver versions
      return minVersion(reactVersion)?.version ?? null;
    }
  }
  return null;
}
