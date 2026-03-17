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
import type { Minimatch } from 'minimatch';
import fs from 'node:fs';
import { minVersion } from 'semver';
import type { PackageJson } from 'type-fest';
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
      const parsed = parseReactVersion(reactVersion);
      if (parsed) {
        return parsed;
      }
      // Continue searching in parent package.json files if parsing fails
    }
  }
  return null;
}

/**
 * Parses a React version string and returns a valid semver version.
 * Exported for testing purposes.
 *
 * @param reactVersion Version string from package.json (e.g., "^18.0.0", "19.0", "catalog:frontend")
 * @returns Valid semver version string or null if parsing fails
 */
export function parseReactVersion(reactVersion: string): string | null {
  try {
    // Coerce version ranges (e.g., "^18.0.0") to valid semver versions
    return minVersion(reactVersion)?.version ?? null;
  } catch {
    // Handle non-semver strings like pnpm catalog references (e.g., "catalog:frontend")
    return null;
  }
}

function getAllDependencySignals(packageJson: {
  dependencies?: PackageJson.Dependency;
  devDependencies?: PackageJson.Dependency;
  peerDependencies?: PackageJson.Dependency;
  optionalDependencies?: PackageJson.Dependency;
}) {
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies,
  };
}

function getDependencyVersionSignal(
  packageJson: PackageJson,
  dependencyName: string,
): string | null {
  const dependencyVersion = getAllDependencySignals(packageJson)[dependencyName];
  return typeof dependencyVersion === 'string' ? dependencyVersion : null;
}

function isValidDependencySignal(versionSignal: string | null): versionSignal is string {
  return versionSignal !== null && versionSignal !== 'latest' && versionSignal !== '*';
}

export function hasTypeScriptNativePreviewSignal(packageJson: PackageJson): boolean {
  return isValidDependencySignal(
    getDependencyVersionSignal(packageJson, '@typescript/native-preview'),
  );
}

export function getTypeScriptVersionSignalsFromPackageJson(packageJson: PackageJson): string[] {
  const result: string[] = [];
  const nativePreviewVersion = getDependencyVersionSignal(
    packageJson,
    '@typescript/native-preview',
  );
  if (isValidDependencySignal(nativePreviewVersion)) {
    result.push(nativePreviewVersion);
  }
  const typeScriptVersion = getDependencyVersionSignal(packageJson, 'typescript');
  if (isValidDependencySignal(typeScriptVersion)) {
    result.push(typeScriptVersion);
  }
  return result;
}

/**
 * Gets a Node.js version signal from the package.json at baseDir.
 * Checks @types/node in all dependency fields first, then engines.node.
 * Returns the raw version string for further parsing.
 *
 * @param baseDir project base directory containing package.json
 * @returns raw version string from @types/node or engines.node, or null if not found
 */
export function getNodeVersionSignal(baseDir: NormalizedAbsolutePath): string | null {
  for (const packageJson of getManifests(baseDir, baseDir, fs)) {
    const typesNode = getDependencyVersionSignal(packageJson, '@types/node');
    if (typeof typesNode === 'string' && typesNode !== 'latest' && typesNode !== '*') {
      return typesNode;
    }
    const enginesNode = packageJson.engines?.['node'];
    if (typeof enginesNode === 'string') {
      return enginesNode;
    }
  }
  return null;
}
