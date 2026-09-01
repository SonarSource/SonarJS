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
