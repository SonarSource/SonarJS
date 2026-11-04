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
import { testFileSuffixAlternation } from '../../jsts/rules/helpers/test-file-pattern.js';
import { isAngularProject } from '../../jsts/rules/helpers/dependency-manifests/dependencies.js';
import { canonicalFileName, isFileSystemCaseSensitive, pathIsUnder } from '../filesystem.js';

/**
 * Canonical filename markers denoting a test-related file. Every pattern recognising these markers
 * derives its alternation from this list, so the set cannot drift between patterns.
 */
const TEST_RELATED_MARKERS = ['test', 'spec', 'cy', 'e2e', 'mock'] as const;

const TEST_RELATED_MARKER_ALTERNATION = TEST_RELATED_MARKERS.join('|');

/**
 * Angular per-environment config files follow the `environments/environment.<env>.ts` convention.
 * When the environment is named after a test-related marker, the path is indistinguishable by shape
 * from a real colocated test.
 */
const ANGULAR_ENVIRONMENT_CONFIG_PATTERN = new RegExp(
  String.raw`(?:^|/)environments?/environment\.(?:${TEST_RELATED_MARKER_ALTERNATION})\.[^/]+$`,
);

function testRelatedFilePattern(extensions?: string[]): RegExp {
  return new RegExp(
    String.raw`\.(?:${TEST_RELATED_MARKER_ALTERNATION})\.(?:${testFileSuffixAlternation(extensions)})$|(?:^|[\\/])(?:__tests__|__mocks__)[\\/]`,
  );
}

/**
 * Checks whether a file path looks test-related. This is the filename heuristic used for rule
 * selection only, which is why it stays private to this module.
 *
 * @param filePath the file path to test.
 * @param extensions the allowed test file extensions.
 * @returns true when the path looks test-related.
 */
function isTestRelatedFile(filePath: string, extensions?: string[]): boolean {
  return testRelatedFilePattern(extensions).test(filePath);
}

/**
 * Checks whether a file path has the shape of an Angular per-environment config file named after a
 * test-related marker, e.g. `src/environments/environment.test.ts`. This is a pure filename check:
 * such a path is only a *candidate*, since nothing here tells whether the project is Angular.
 *
 * @param filePath the file path to test.
 * @returns true when the path looks like an Angular environment-config file.
 */
function isAngularEnvironmentConfigFileCandidate(filePath: string): boolean {
  return ANGULAR_ENVIRONMENT_CONFIG_PATTERN.test(filePath);
}

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

/**
 * Returns the file type used for rule selection. The filename heuristic deliberately affects only
 * this classification: metrics and other file artifacts continue to use the scanner/path-derived
 * file type.
 *
 * Precedence, from highest to lowest:
 * 1. An explicit TEST file type (from the request or from `sonar.tests`) is kept.
 * 2. A file under `sonar.tests` that `sonar.test.inclusions`/`sonar.test.exclusions` rejected was
 *    explicitly scoped out of tests and keeps its file type.
 * 3. A file under `sonar.sources` matching a non-empty `sonar.inclusions` was explicitly opted into
 *    MAIN and keeps its file type.
 * 4. An Angular environment-config file in an Angular project keeps its file type.
 * 5. A test-related filename (see `isTestRelatedFile`) is classified as TEST.
 * 6. Any other file keeps its file type.
 *
 * Configuring `sonar.tests` does not disable the filename heuristic for files outside the test
 * paths, so colocated tests missed by a partial test configuration still select test rules.
 */
export function getFileTypeForRules(
  filePath: NormalizedAbsolutePath,
  fileType: FileType,
  params: FilterPathParams,
): FileType {
  if (fileType === 'TEST' || !matchesTestFileHeuristic(filePath, params)) {
    return fileType;
  }

  debug(
    `Test file detected: ${filePath}. If this file should not use test rules, please adjust your sonar.sources/sonar.inclusions to explicitly include it as MAIN.`,
  );
  return 'TEST';
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

function matchesTestFileHeuristic(
  filePath: NormalizedAbsolutePath,
  params: FilterPathParams,
): boolean {
  const { baseDir, testPaths, inclusions, sourcesPaths, testFileExtensions } = params;
  // Non-TEST files under `sonar.tests` were rejected by `sonar.test.inclusions` or
  // `sonar.test.exclusions`, which is an explicit decision that should not be second-guessed.
  if (fileIsUnder(filePath, testPaths)) {
    return false;
  }

  // `sonar.inclusions` narrows `sonar.sources`, so a matching file has been explicitly opted into
  // MAIN rule selection and should not be second-guessed by the filename heuristic.
  if (
    inclusions.length > 0 &&
    fileIsUnder(filePath, sourcesPaths) &&
    inclusions.some(inclusion => inclusion.match(filePath))
  ) {
    return false;
  }

  if (!isTestRelatedFile(filePath, testFileExtensions)) {
    return false;
  }

  // Angular environment-config candidates can match the filename heuristic by coincidence.
  // When `@angular/core` is visible to the file, keep them MAIN for rule selection so test-scoped
  // rules do not run. This affects only rule selection; the scanner/path-derived file type used
  // for metrics is unchanged. The Angular check is gated by the cheap path predicate, and the
  // underlying manifest lookup is cached.
  return !(
    isAngularEnvironmentConfigFileCandidate(filePath) &&
    fileIsUnder(filePath, [baseDir]) &&
    isAngularProject(filePath, baseDir)
  );
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
