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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import {
  isTestFile,
  isTestRelatedFile,
} from '../../../../src/jsts/rules/helpers/test-file-pattern.js';

describe('isTestFile', () => {
  it('matches the built-in JS/TS extensions when no extensions are given', () => {
    for (const filename of [
      'foo.test.js',
      'foo.test.mjs',
      'foo.test.cjs',
      'foo.test.jsx',
      'foo.test.vue',
      'foo.spec.ts',
      'foo.test.mts',
      'foo.spec.cts',
      'foo.cy.tsx',
      'foo.test.vue',
    ]) {
      expect(isTestFile(filename)).toBe(true);
    }
  });

  it('rejects suffixes that are not in the default list', () => {
    expect(isTestFile('foo.test.dummy')).toBe(false);
    expect(isTestFile('foo.spec.bar')).toBe(false);
  });

  it('matches suffixes that are provided', () => {
    expect(isTestFile('foo.test.dummy', ['.dummy', '.bar'])).toBe(true);
    expect(isTestFile('foo.spec.bar', ['.dummy', '.bar'])).toBe(true);
    expect(isTestFile('foo.test.js', ['.dummy'])).toBe(false);
  });

  it('does not match files with different extensions', () => {
    expect(isTestFile('foo.test.js', ['.dummy'])).toBe(false);
  });

  it('ignores leading dots in suffix entries', () => {
    expect(isTestFile('foo.test.dummy', ['.dummy'])).toBe(true);
  });

  it('does not match filenames that merely contain "test"', () => {
    expect(isTestFile('testimony.ts')).toBe(false);
  });

  it('does not match Angular-style per-environment config files', () => {
    expect(isTestFile('environment.test.ts')).toBe(false);
    expect(isTestFile('environment.spec.ts')).toBe(false);
    expect(isTestFile('environment.cy.ts')).toBe(false);
    expect(isTestFile('src/environments/environment.test.ts')).toBe(false);
    expect(isTestFile('src\\environments\\environment.test.ts')).toBe(false);
  });

  it('excludes environment config files across every default test extension', () => {
    for (const ext of ['.js', '.mjs', '.cjs', '.jsx', '.vue', '.ts', '.mts', '.cts', '.tsx']) {
      for (const marker of ['test', 'spec', 'cy']) {
        expect(isTestFile(`environment.${marker}${ext}`)).toBe(false);
      }
    }
  });

  it('excludes environment config files under absolute POSIX and Windows paths', () => {
    expect(isTestFile('/home/user/project/src/environments/environment.test.ts')).toBe(false);
    expect(isTestFile('C:\\project\\src\\environments\\environment.spec.ts')).toBe(false);
  });

  it('excludes environment config files with custom extensions too', () => {
    expect(isTestFile('environment.test.dummy', ['.dummy'])).toBe(false);
  });

  it('is case-sensitive: a differently-cased "Environment" file is not excluded', () => {
    expect(isTestFile('Environment.test.ts')).toBe(true);
  });

  it('still excludes a double-suffix environment file (matches on the trailing suffix)', () => {
    expect(isTestFile('environment.test.spec.ts')).toBe(false);
  });

  it('still matches filenames that only resemble the environment config shape', () => {
    expect(isTestFile('myenvironment.test.ts')).toBe(true);
    expect(isTestFile('environment.util.test.ts')).toBe(true);
    expect(isTestFile('environments.test.ts')).toBe(true);
  });
});

describe('isTestRelatedFile', () => {
  it('matches common test-relatedfile patterns', () => {
    expect(isTestRelatedFile('foo.test.ts')).toBe(true);
    expect(isTestRelatedFile('foo.spec.js')).toBe(true);
    expect(isTestRelatedFile('foo.e2e.ts')).toBe(true);
    expect(isTestRelatedFile('data.mock.js')).toBe(true);
    expect(isTestRelatedFile('__tests__/foo.ts')).toBe(true);
    expect(isTestRelatedFile('__mocks__/foo.ts')).toBe(true);
  });

  it('matches files with custom extensions', () => {
    expect(isTestRelatedFile('foo.test.dummy', ['.dummy'])).toBe(true);
    expect(isTestRelatedFile('foo.e2e.bar', ['.bar'])).toBe(true);
  });

  it('does not match files with different extensions', () => {
    expect(isTestRelatedFile('foo.ts')).toBe(false);
    expect(isTestRelatedFile('foo.test.js', ['.dummy'])).toBe(false);
    expect(isTestRelatedFile('data.mock.js', ['.dummy'])).toBe(false);
  });

  it('matches files under __tests__ / __mocks__ regardless of the configured extensions', () => {
    expect(isTestRelatedFile('__tests__/foo.ts', ['.dummy'])).toBe(true);
    expect(isTestRelatedFile('src/__mocks__/style.css', ['.dummy'])).toBe(true);
  });
});
