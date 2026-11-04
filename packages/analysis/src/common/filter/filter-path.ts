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
import type { Minimatch } from 'minimatch';
import { dirnamePath, type NormalizedAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { debug } from '../../../../shared/src/helpers/logging.js';
import type { FileType } from '../../contracts/file.js';
import { type FilterPathParams } from '../configuration.js';
import { canonicalFileName, isFileSystemCaseSensitive, pathIsUnder } from '../filesystem.js';

// Normalized configurations own their pattern arrays, so old caches can be garbage-collected.
const directoryExclusionCaches = new WeakMap<
  Minimatch[],
  {
    baseDir: string;
    caseSensitive: boolean;
    directories: Map<string, boolean>;
  }
>();

/**
 * Checks whether a given file path is excluded based on JavaScript/TypeScript exclusion
 * properties sonar.typescript.exclusions and sonar.javascript.exclusions wildcards.
 *
 * @param filePath The path of the file to be checked (must be normalized absolute path).
 * @param jsTsExclusions The JS/TS exclusion patterns from configuration.
 * @return Returns true if the file path matches any exclusion wildcard; otherwise, false.
 *
 * Callers need to pass: getJsTsExclusions() from configuration
 */
export function isJsTsExcluded(
  filePath: NormalizedAbsolutePath,
  jsTsExclusions: Minimatch[],
): boolean {
  if (jsTsExclusions.some(exclusion => exclusion.match(filePath))) {
    debug(`File ignored due to js/ts exclusions: ${filePath}`);
    return true;
  }
  return false;
}

/**
 * Filters a given file path based on inclusion and exclusion rules and determines its type.
 * This mimics the scanner engine implementation of "sources", "tests" and its inclusion/exclusion
 * properties. It is used during filesystem traversal and as a defensive file-type inference
 * fallback for explicit request files whose incoming type is not explicitly TEST.
 *
 * @param {NormalizedAbsolutePath} filePath - The file path to be evaluated (must be normalized absolute path).
 * @param {FilterPathParams} params - The path filtering parameters from configuration.
 * @return {FileType | undefined} Returns 'MAIN' if the file belongs to the main sources,
 * 'TEST' if it belongs to the test sources, or undefined if it is excluded from analysis.
 *
 * Callers need to pass: getSourcesPaths(), getTestPaths(), getInclusions(), getExclusions(),
 * getTestInclusions(), getTestExclusions() from configuration
 */
export function filterPathAndGetFileType(
  filePath: NormalizedAbsolutePath,
  params: FilterPathParams,
): FileType | undefined {
  if (matchesTestPath(filePath, params)) {
    return 'TEST';
  }

  if (matchesMainPath(filePath, params)) {
    return 'MAIN';
  }

  debug(`File ignored due to analysis scope filters: ${filePath}`);
}

export function isDirectoryExcluded(
  dir: NormalizedAbsolutePath,
  params: FilterPathParams,
): boolean {
  return !filterPathAndGetFileType(dir, {
    ...params,
    sourcesPaths: canContainFiles(dir, params.sourcesPaths) ? [dir] : [],
    testPaths: canContainFiles(dir, params.testPaths) ? [dir] : [],
    inclusions: [],
    testInclusions: [],
  });
}

function canContainFiles(dir: NormalizedAbsolutePath, roots: NormalizedAbsolutePath[]): boolean {
  return fileIsUnder(dir, roots) || roots.some(root => fileIsUnder(root, [dir]));
}

function fileIsUnder(filePath: NormalizedAbsolutePath, paths: NormalizedAbsolutePath[]): boolean {
  return paths.some(path => pathIsUnder(filePath, path));
}

function matchesExclusion(
  filePath: NormalizedAbsolutePath,
  exclusions: Minimatch[],
  baseDir: NormalizedAbsolutePath,
): boolean {
  if (!exclusions.length) {
    return false;
  }
  if (exclusions.some(exclusion => exclusion.match(filePath))) {
    return true;
  }

  const caseSensitive = isFileSystemCaseSensitive();
  const root = canonicalFileName(baseDir);
  let cache = directoryExclusionCaches.get(exclusions);
  if (cache?.baseDir !== root || cache.caseSensitive !== caseSensitive) {
    cache = { baseDir: root, caseSensitive, directories: new Map() };
    directoryExclusionCaches.set(exclusions, cache);
  }

  let path = dirnamePath(filePath);
  const parents: NormalizedAbsolutePath[] = [];
  let excluded = false;
  while (canonicalFileName(path) !== root && fileIsUnder(path, [baseDir])) {
    const cached = cache.directories.get(canonicalFileName(path));
    if (cached !== undefined) {
      excluded = cached;
      break;
    }
    parents.push(path);
    if (exclusions.some(exclusion => exclusion.match(path))) {
      excluded = true;
      break;
    }
    path = dirnamePath(path);
  }
  for (const parent of parents) {
    cache.directories.set(canonicalFileName(parent), excluded);
  }
  return excluded;
}

function matchesTestPath(filePath: NormalizedAbsolutePath, params: FilterPathParams): boolean {
  const { testPaths, testExclusions, testInclusions } = params;

  if (!fileIsUnder(filePath, testPaths)) {
    return false;
  }
  if (matchesExclusion(filePath, testExclusions, params.baseDir)) {
    return false;
  }
  if (testInclusions?.length) {
    return testInclusions.some(inclusion => inclusion.match(filePath));
  }
  return true;
}

function matchesMainPath(filePath: NormalizedAbsolutePath, params: FilterPathParams): boolean {
  const { sourcesPaths, exclusions, inclusions } = params;
  if (!fileIsUnder(filePath, sourcesPaths)) {
    return false;
  }

  if (matchesExclusion(filePath, exclusions, params.baseDir)) {
    return false;
  }

  if (inclusions?.length) {
    return inclusions.some(inclusion => inclusion.match(filePath));
  }
  return true;
}
