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
import type { NormalizedAbsolutePath } from '../../../shared/src/helpers/files.js';
import { debug } from '../../../shared/src/helpers/logging.js';
import type { FileType } from '../contracts/file.js';
import {
  DEFAULT_JS_EXTENSIONS,
  DEFAULT_TS_EXTENSIONS,
  type FilterPathParams,
} from './configuration.js';
import { pathIsUnder } from './filesystem.js';
import { isAngularProject } from '../jsts/rules/helpers/dependency-manifests/dependencies.js';

type RuleFileTypeParams = Pick<
  FilterPathParams,
  'baseDir' | 'testPaths' | 'inclusions' | 'sourcesPaths' | 'testFileExtensions'
>;

/**
 * Canonical filename markers denoting a file that declares test cases, e.g. `foo.test.ts`.
 */
const TEST_CASE_MARKERS = ['test', 'spec', 'cy'] as const;

/**
 * Canonical filename markers denoting a test-related file: test-case files plus end-to-end and mock
 * files. Every pattern recognising these markers derives its alternation from these lists, so the
 * sets cannot drift between patterns.
 */
const TEST_RELATED_MARKERS = [...TEST_CASE_MARKERS, 'e2e', 'mock'] as const;

const TEST_CASE_MARKER_ALTERNATION = TEST_CASE_MARKERS.join('|');
const TEST_RELATED_MARKER_ALTERNATION = TEST_RELATED_MARKERS.join('|');

/**
 * Builds the regex alternation of the configured JS/TS suffixes, without leading dots, falling back
 * to the default JS/TS suffixes.
 */
function suffixAlternation(extensions?: string[]): string {
  const effective = extensions?.length
    ? extensions
    : [...DEFAULT_JS_EXTENSIONS, ...DEFAULT_TS_EXTENSIONS];
  return effective.map(ext => (ext.startsWith('.') ? ext.slice(1) : ext)).join('|');
}

/**
 * Angular per-environment config files follow the `environments/environment.<env>.ts` convention.
 * When the environment is named after a test-related marker, the path is indistinguishable by shape
 * from a real colocated test.
 */
const ANGULAR_ENVIRONMENT_CONFIG_PATTERN = new RegExp(
  String.raw`(?:^|/)environments?/environment\.(?:${TEST_RELATED_MARKER_ALTERNATION})\.[^/]+$`,
);

function testCaseFilePattern(extensions?: string[]): RegExp {
  return new RegExp(
    String.raw`\.(?:${TEST_CASE_MARKER_ALTERNATION})\.(?:${suffixAlternation(extensions)})$`,
  );
}

function testRelatedFilePattern(extensions?: string[]): RegExp {
  return new RegExp(
    String.raw`\.(?:${TEST_RELATED_MARKER_ALTERNATION})\.(?:${suffixAlternation(extensions)})$|(?:^|[\\/])(?:__tests__|__mocks__)[\\/]`,
  );
}

/**
 * Checks whether a file path declares test cases by name (`.test`, `.spec` or `.cy` before a
 * configured JS/TS suffix). This is narrower than the test-related heuristic: helpers under
 * `__tests__/`, mocks and `.e2e` files are test-related but do not have to declare test cases.
 * Rule selection uses it for rules whose metadata sets `requiredTestCaseFile`.
 *
 * @param filePath the file path to test.
 * @param extensions the configured JS/TS suffixes.
 * @returns true when the path declares test cases by name.
 */
export function isTestCaseFile(filePath: string, extensions?: string[]): boolean {
  return testCaseFilePattern(extensions).test(filePath);
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
  params: RuleFileTypeParams,
): FileType {
  if (fileType === 'TEST' || !matchesTestFileHeuristic(filePath, params)) {
    return fileType;
  }

  debug(
    `Test file detected: ${filePath}. If this file should not use test rules, please adjust your sonar.sources/sonar.inclusions to explicitly include it as MAIN.`,
  );
  return 'TEST';
}

function matchesTestFileHeuristic(
  filePath: NormalizedAbsolutePath,
  params: RuleFileTypeParams,
): boolean {
  const { baseDir, testPaths, inclusions, sourcesPaths, testFileExtensions } = params;
  // Non-TEST files under `sonar.tests` were rejected by `sonar.test.inclusions` or
  // `sonar.test.exclusions`, which is an explicit decision that should not be second-guessed.
  if (testPaths.some(path => pathIsUnder(filePath, path))) {
    return false;
  }

  // `sonar.inclusions` narrows `sonar.sources`, so a matching file has been explicitly opted into
  // MAIN rule selection and should not be second-guessed by the filename heuristic.
  if (
    inclusions.length > 0 &&
    sourcesPaths.some(path => pathIsUnder(filePath, path)) &&
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
    pathIsUnder(filePath, baseDir) &&
    isAngularProject(filePath, baseDir)
  );
}
