/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { File, NormalizedAbsolutePath } from '../files.js';
import { MinimatchCache } from '../find-up/find-minimatch.js';
import { dependenciesCache, moduleTypeCache } from './dependencies.js';
import { closestPatternCache } from '../find-up/closest.js';
import { patternInParentsCache } from '../find-up/all-in-parent-dirs.js';
import { basename } from 'node:path/posix';

export const PACKAGE_JSON = 'package.json';
export const DENO_JSON = 'deno.json';
export const DENO_JSONC = 'deno.jsonc';
export const DEPENDENCY_MANIFESTS = [DENO_JSON, DENO_JSONC, PACKAGE_JSON] as const;
type DependencyManifestName = (typeof DEPENDENCY_MANIFESTS)[number];

function isDependencyManifestName(fileName: string): fileName is DependencyManifestName {
  return (DEPENDENCY_MANIFESTS as readonly string[]).includes(fileName);
}

export function isDependencyManifestPath(path: NormalizedAbsolutePath): boolean {
  const normalizedBasename = basename(path).toLowerCase();
  return isDependencyManifestName(normalizedBasename);
}

/**
 * Preloads manifest lookup caches for a given manifest type (package.json/deno.json/deno.jsonc)
 * so later rules can resolve manifests without re-walking the file system.
 */
export function fillManifestCaches(
  manifestName: DependencyManifestName,
  manifests: Map<NormalizedAbsolutePath, File>,
  dirnameToParent: Map<NormalizedAbsolutePath, NormalizedAbsolutePath | undefined>,
  topDir: NormalizedAbsolutePath,
): void {
  const closestCache = closestPatternCache.get(manifestName).get(topDir);
  const manifestsInParentsCache = patternInParentsCache.get(manifestName).get(topDir);

  // We depend on the order of the paths, from parent-to-child paths (guaranteed by the use of a Map in the package-json store)
  for (const [dir, parent] of dirnameToParent) {
    const currentManifest = manifests.get(dir);
    closestCache.set(dir, currentManifest ?? (parent ? closestCache.get(parent) : undefined));
    const manifestsInParents: File[] = [];
    if (parent) {
      // Read the current dir cache to preserve closest-first manifest precedence.
      manifestsInParents.push(...manifestsInParentsCache.get(dir));
    }
    if (currentManifest) {
      manifestsInParents.push(currentManifest);
    }
    manifestsInParentsCache.set(dir, manifestsInParents);
  }
}

/**
 * In the case of SonarIDE, when a dependency manifest file changes, the cache can become obsolete.
 */
export function clearDependenciesCache(): void {
  dependenciesCache.clear();
  moduleTypeCache.clear();
  for (const manifestName of DEPENDENCY_MANIFESTS) {
    closestPatternCache.get(manifestName).clear();
    patternInParentsCache.get(manifestName).clear();
  }
  MinimatchCache.clear();
}

/**
 * Returns the dependency manifest filename if the path points to one.
 */
export function getDependencyManifestName(
  path: NormalizedAbsolutePath,
): DependencyManifestName | undefined {
  const normalizedBasename = basename(path).toLowerCase();
  if (isDependencyManifestName(normalizedBasename)) {
    return normalizedBasename;
  }
  return undefined;
}
