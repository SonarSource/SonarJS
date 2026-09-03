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
export const DEFAULT_TEST_FILE_EXTENSIONS = [
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.vue',
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
];

/**
 * Canonical filename markers denoting a test-related file. Every pattern recognising these markers
 * derives its alternation from this list, so the set cannot drift between helpers.
 */
export const TEST_RELATED_MARKERS = ['test', 'spec', 'cy', 'e2e', 'mock'] as const;

const TEST_RELATED_MARKER_ALTERNATION = TEST_RELATED_MARKERS.join('|');

/**
 * Angular per-environment config files follow the `environments/environment.<env>.ts` convention.
 * When the environment is named after a test-related marker, the path is indistinguishable by shape
 * from a real colocated test.
 */
const ANGULAR_ENVIRONMENT_CONFIG_PATTERN = new RegExp(
  String.raw`(?:^|/)environments?/environment\.(?:${TEST_RELATED_MARKER_ALTERNATION})\.[^/]+$`,
);

function suffixAlternation(extensions?: string[]): string {
  const effective = extensions?.length ? extensions : DEFAULT_TEST_FILE_EXTENSIONS;
  return effective.map(ext => (ext.startsWith('.') ? ext.slice(1) : ext)).join('|');
}

function testFilePattern(extensions?: string[]): RegExp {
  return new RegExp(String.raw`\.(?:test|spec|cy)\.(?:${suffixAlternation(extensions)})$`);
}

function testRelatedFilePattern(extensions?: string[]): RegExp {
  return new RegExp(
    String.raw`\.(?:${TEST_RELATED_MARKER_ALTERNATION})\.(?:${suffixAlternation(extensions)})$|(?:^|[\\/])(?:__tests__|__mocks__)[\\/]`,
  );
}

/**
 * Checks whether a file path matches a test file pattern.
 *
 * @param filePath the file path to test.
 * @param extensions the allowed test file extensions.
 * @returns true when the path looks like a test file.
 */
export function isTestFile(filePath: string, extensions?: string[]): boolean {
  return testFilePattern(extensions).test(filePath);
}

/**
 * Checks whether a file path looks test-related.
 *
 * @param filePath the file path to test.
 * @param extensions the allowed test file extensions.
 * @returns true when the path looks test-related.
 */
export function isTestRelatedFile(filePath: string, extensions?: string[]): boolean {
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
export function isAngularEnvironmentConfigFileCandidate(filePath: string): boolean {
  return ANGULAR_ENVIRONMENT_CONFIG_PATTERN.test(filePath);
}
