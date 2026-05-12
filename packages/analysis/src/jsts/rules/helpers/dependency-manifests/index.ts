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
import { clearParsedDependencyFileCache } from './parsed-dependency-files.js';

export const PACKAGE_JSON = 'package.json';
export const DENO_JSON = 'deno.json';
export const DENO_JSONC = 'deno.jsonc';
export const PNPM_WORKSPACE_YAML = 'pnpm-workspace.yaml';
export const DEPENDENCY_MANIFESTS = [DENO_JSON, DENO_JSONC, PACKAGE_JSON] as const;
export const PRELOADABLE_DEPENDENCY_MANIFESTS = [
  ...DEPENDENCY_MANIFESTS,
  PNPM_WORKSPACE_YAML,
] as const;
export type PreloadableDependencyManifestName = (typeof PRELOADABLE_DEPENDENCY_MANIFESTS)[number];

function isPreloadableDependencyManifestName(
  fileName: string,
): fileName is PreloadableDependencyManifestName {
  return (PRELOADABLE_DEPENDENCY_MANIFESTS as readonly string[]).includes(fileName);
}

export function isPreloadableDependencyManifestPath(path: NormalizedAbsolutePath): boolean {
  const normalizedBasename = basename(path).toLowerCase();
  return isPreloadableDependencyManifestName(normalizedBasename);
}

/**
 * Preloads manifest lookup caches so later rules can resolve manifests
 * without re-walking the file system.
 */
export function fillManifestCaches(
  manifestName: PreloadableDependencyManifestName,
  manifests: Map<NormalizedAbsolutePath, File>,
  dirnameToParent: Map<NormalizedAbsolutePath, NormalizedAbsolutePath | undefined>,
  topDir: NormalizedAbsolutePath,
): void {
  const closestCache = closestPatternCache.get(manifestName).get(topDir);
  const manifestsInParentsCache =
    manifestName === PNPM_WORKSPACE_YAML
      ? undefined
      : patternInParentsCache.get(manifestName).get(topDir);

  const sortedDirs = Array.from(dirnameToParent.entries()).sort(
    ([leftDir], [rightDir]) =>
      leftDir.split('/').length - rightDir.split('/').length || leftDir.localeCompare(rightDir),
  );

  for (const [dir, parent] of sortedDirs) {
    const currentManifest = manifests.get(dir);
    const inheritedClosestManifest = parent ? closestCache.get(parent) : undefined;
    closestCache.set(dir, currentManifest ?? inheritedClosestManifest);
    if (!manifestsInParentsCache) {
      continue;
    }
    const manifestsInParents = parent ? [...manifestsInParentsCache.get(parent)] : [];
    if (currentManifest) {
      manifestsInParents.unshift(currentManifest);
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
  clearParsedDependencyFileCache();
  for (const manifestName of PRELOADABLE_DEPENDENCY_MANIFESTS) {
    closestPatternCache.get(manifestName).clear();
    if (manifestName !== PNPM_WORKSPACE_YAML) {
      patternInParentsCache.get(manifestName).clear();
    }
  }
  MinimatchCache.clear();
}

/**
 * Returns the preloadable dependency manifest filename if the path points to one.
 */
export function getPreloadableDependencyManifestName(
  path: NormalizedAbsolutePath,
): PreloadableDependencyManifestName | undefined {
  const normalizedBasename = basename(path).toLowerCase();
  if (isPreloadableDependencyManifestName(normalizedBasename)) {
    return normalizedBasename;
  }
  return undefined;
}
