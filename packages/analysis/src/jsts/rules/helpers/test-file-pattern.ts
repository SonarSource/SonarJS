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

function suffixAlternation(extensions?: string[]): string {
  const effective = extensions?.length ? extensions : DEFAULT_TEST_FILE_EXTENSIONS;
  return effective.map(ext => (ext.startsWith('.') ? ext.slice(1) : ext)).join('|');
}

function testFilePattern(extensions?: string[]): RegExp {
  return new RegExp(String.raw`\.(?:test|spec|cy)\.(?:${suffixAlternation(extensions)})$`);
}

function testRelatedFilePattern(extensions?: string[]): RegExp {
  const alternation = suffixAlternation(extensions);
  return new RegExp(
    String.raw`\.(?:test|spec|cy)\.(?:${alternation})$|\.(?:e2e|mock)\.(?:${alternation})$|(?:^|[\\/])(?:__tests__|__mocks__)[\\/]`,
  );
}

const ENVIRONMENT_CONFIG_FILE_PATTERN =
  /(?:^|[\\/])environments?[\\/]environment\.(?:test|spec|cy)\.[^\\/]+$/;

const TEST_DIRECTORY_PATTERN = /(?:^|[\\/])(?:__tests__|__mocks__)[\\/]/;

function isEnvironmentConfigFile(filePath: string): boolean {
  return ENVIRONMENT_CONFIG_FILE_PATTERN.test(filePath) && !TEST_DIRECTORY_PATTERN.test(filePath);
}

/**
 * Checks whether a file path matches a test file pattern.
 *
 * In Angular projects only, Angular-style per-environment config files (e.g.
 * `environments/environment.test.ts`) are not considered test files: their path
 * coincidentally matches the pattern but they follow the Angular
 * `environment.<env>.ts` convention. The `isAngularProject` signal is passed in
 * by the caller so this predicate stays a pure function of the path; outside
 * Angular projects the same path may well be a real colocated test.
 *
 * `isAngularProject` is a lazy provider: it is only invoked once the path is
 * known to match the environment-config shape, so callers whose signal is
 * expensive to compute (a dependency-manifest lookup) don't pay for it on the
 * overwhelming majority of paths that can never trigger the carve-out.
 *
 * @param filePath the file path to test.
 * @param extensions the allowed test file extensions.
 * @param isAngularProject lazily reports whether the file belongs to an Angular project.
 * @returns true when the path looks like a test file.
 */
export function isTestFile(
  filePath: string,
  extensions?: string[],
  isAngularProject: () => boolean = () => false,
): boolean {
  return (
    testFilePattern(extensions).test(filePath) &&
    !(isEnvironmentConfigFile(filePath) && isAngularProject())
  );
}

/**
 * Checks whether a file path looks test-related.
 *
 * In Angular projects only, Angular-style per-environment config files (e.g.
 * `environments/environment.test.ts`) are not considered test-related, for the
 * same reason as {@link isTestFile}. The `isAngularProject` signal is passed in
 * by the caller so this predicate stays a pure function of the path, and is a
 * lazy provider only invoked once the path matches the environment-config shape.
 *
 * @param filePath the file path to test.
 * @param extensions the allowed test file extensions.
 * @param isAngularProject lazily reports whether the file belongs to an Angular project.
 * @returns true when the path looks test-related.
 */
export function isTestRelatedFile(
  filePath: string,
  extensions?: string[],
  isAngularProject: () => boolean = () => false,
): boolean {
  return (
    testRelatedFilePattern(extensions).test(filePath) &&
    !(isEnvironmentConfigFile(filePath) && isAngularProject())
  );
}
