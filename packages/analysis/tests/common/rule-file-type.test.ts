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
import { getFileTypeForRules, isTestCaseFile } from '../../src/common/rule-file-type.js';
import { filterPathAndGetFileType } from '../../src/common/filter/filter-path.js';
import { createConfiguration, getFilterPathParams } from '../../src/common/configuration.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';

describe('rule file type', () => {
  describe('test-file rule heuristic fallback (no sonar.tests configured)', () => {
    const testLikeFilenames = [
      '/project/src/foo.test.ts',
      '/project/src/bar.spec.js',
      '/project/src/baz.cy.ts',
      '/project/src/qux.e2e.tsx',
      '/project/src/data.mock.js',
      '/project/src/foo.test.mjs',
      '/project/src/foo.spec.cjs',
      '/project/src/__tests__/anything.ts',
      '/project/src/__mocks__/api.js',
    ];

    for (const path of testLikeFilenames) {
      it(`should classify ${path} as TEST via heuristic when no test config is set`, () => {
        const filePath = normalizeToAbsolutePath(path);
        const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
        const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
        expect(result).toBe('TEST');
      });
    }

    it('should classify a non-test filename as MAIN when no test config is set', () => {
      const filePath = normalizeToAbsolutePath('/project/src/regular.ts');
      const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should only apply the filename markers before the configured suffixes', () => {
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        jsSuffixes: ['.dummy'],
        tsSuffixes: ['.bar'],
      });
      const params = getFilterPathParams(config);
      const fileTypeForRules = (path: string) =>
        getFileTypeForRules(normalizeToAbsolutePath(path), 'MAIN', params);

      expect(fileTypeForRules('/project/src/foo.test.dummy')).toBe('TEST');
      expect(fileTypeForRules('/project/src/foo.e2e.bar')).toBe('TEST');
      expect(fileTypeForRules('/project/src/foo.test.js')).toBe('MAIN');
      expect(fileTypeForRules('/project/src/data.mock.js')).toBe('MAIN');
    });

    it('should classify files under __tests__ / __mocks__ as TEST regardless of the configured suffixes', () => {
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        jsSuffixes: ['.dummy'],
        tsSuffixes: ['.bar'],
      });
      const params = getFilterPathParams(config);

      for (const path of ['/project/src/__tests__/foo.ts', '/project/src/__mocks__/style.css']) {
        expect(getFileTypeForRules(normalizeToAbsolutePath(path), 'MAIN', params)).toBe('TEST');
      }
    });

    it('should not be fooled by filenames that merely contain "test"', () => {
      const filePath = normalizeToAbsolutePath('/project/src/testimony.ts');
      const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should still apply heuristic outside a partially configured testPaths', ({ mock }) => {
      console.log = mock.fn(console.log);
      const filePath = normalizeToAbsolutePath('/project/src/component.test.tsx');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        tests: ['tests'],
      });
      const params = getFilterPathParams(config);
      expect(filterPathAndGetFileType(filePath, params)).toBe('MAIN');
      expect(getFileTypeForRules(filePath, 'MAIN', params)).toBe('TEST');
    });

    it('should keep an ordinary production file MAIN with a partial testPaths', () => {
      const filePath = normalizeToAbsolutePath('/project/src/component.tsx');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        tests: ['tests'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should keep an ordinary filename explicitly classified as TEST', () => {
      const filePath = normalizeToAbsolutePath('/project/tests/login.js');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        tests: ['tests'],
      });
      const params = getFilterPathParams(config);
      expect(filterPathAndGetFileType(filePath, params)).toBe('TEST');
      expect(getFileTypeForRules(filePath, 'TEST', params)).toBe('TEST');
    });

    it('should NOT apply heuristic to a test path file rejected by testExclusions', ({ mock }) => {
      console.log = mock.fn(console.log);
      const filePath = normalizeToAbsolutePath('/project/src/fixtures/foo.test.ts');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        tests: ['src'],
        testExclusions: ['**/fixtures/**'],
      });
      const params = getFilterPathParams(config);
      expect(filterPathAndGetFileType(filePath, params)).toBe('MAIN');
      expect(getFileTypeForRules(filePath, 'MAIN', params)).toBe('MAIN');
    });

    it('should NOT apply heuristic to a test path file rejected by testInclusions', ({ mock }) => {
      console.log = mock.fn(console.log);
      const filePath = normalizeToAbsolutePath('/project/src/foo.spec.ts');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        tests: ['src'],
        testInclusions: ['**/*.test.ts'],
      });
      const params = getFilterPathParams(config);
      expect(filterPathAndGetFileType(filePath, params)).toBe('MAIN');
      expect(getFileTypeForRules(filePath, 'MAIN', params)).toBe('MAIN');
    });

    it('should apply heuristic to normalized Windows paths', () => {
      const filePath = normalizeToAbsolutePath(String.raw`C:\project\src\__tests__\helpers.ts`);
      const config = createConfiguration({
        baseDir: String.raw`C:\project`,
        sources: ['src'],
        tests: ['tests'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('should still apply heuristic when only testInclusions is set (inert without testPaths)', ({
      mock,
    }) => {
      console.log = mock.fn(console.log);
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.ts');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        testInclusions: ['**/*IntegrationTest.ts'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('should still apply heuristic when only testExclusions is set (inert without testPaths)', ({
      mock,
    }) => {
      console.log = mock.fn(console.log);
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.ts');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        testExclusions: ['**/fixtures/**'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('should NOT apply heuristic when inclusions is configured', ({ mock }) => {
      console.log = mock.fn(console.log);
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.ts');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        inclusions: ['**/*.test.ts'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should classify .test.<customSuffix> as TEST when jsSuffixes is extended', () => {
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.dummy');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        jsSuffixes: ['.js', '.dummy'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('should not classify .test.<unconfiguredSuffix> as TEST', () => {
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.dummy');
      const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should fall back to default TS extensions when TS suffixes are empty', () => {
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.ts');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        jsSuffixes: ['.js'],
        tsSuffixes: [],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('should fall back to default JS extensions when JS suffixes are empty', () => {
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.js');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        jsSuffixes: [],
        tsSuffixes: ['.ts'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });
  });

  // JS-2311: When sonar.tests is not configured, Angular environment-config filenames can match
  // the test-file heuristic by coincidence. If `@angular/core` is visible to the file, keep these
  // candidates MAIN for rule selection. The scanner/path-derived file type used for metrics is
  // unchanged; non-Angular candidates continue through the normal test-file heuristic.
  describe('Angular environment-config carve-out (rule-selection heuristic)', () => {
    const commonDir = normalizeToAbsolutePath(import.meta.dirname);
    const angularBaseDir = `${commonDir}/fixtures/angular-project`;
    const nonAngularBaseDir = `${commonDir}/fixtures/non-angular-project`;

    it('keeps an Angular environments/environment.test.ts as MAIN for rule selection', () => {
      const filePath = normalizeToAbsolutePath(
        `${angularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: angularBaseDir });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('carves out the spec / cy / e2e / mock environment markers too', () => {
      const config = createConfiguration({ baseDir: angularBaseDir });
      for (const marker of ['spec', 'cy', 'e2e', 'mock']) {
        const filePath = normalizeToAbsolutePath(
          `${angularBaseDir}/src/environments/environment.${marker}.ts`,
        );
        const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
        expect(result).toBe('MAIN');
      }
    });

    it('carves out the singular environment/ directory and any extension', () => {
      const config = createConfiguration({ baseDir: angularBaseDir });
      for (const relativePath of [
        'src/environment/environment.test.ts',
        'environments/environment.test.ts',
        'src/environments/environment.test.js',
      ]) {
        const filePath = normalizeToAbsolutePath(`${angularBaseDir}/${relativePath}`);
        const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
        expect(result).toBe('MAIN');
      }
    });

    it('does not carve out test files that do not follow the environment-config shape', () => {
      const config = createConfiguration({ baseDir: angularBaseDir });
      for (const relativePath of [
        'environment.test.ts',
        'src/environment.test.ts',
        'src/myenvironments/environment.test.ts',
        'src/environments/sub/environment.test.ts',
        'src/environments/foo.test.ts',
      ]) {
        const filePath = normalizeToAbsolutePath(`${angularBaseDir}/${relativePath}`);
        const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
        expect(result).toBe('TEST');
      }
    });

    it('promotes environments/environment.test.ts to TEST in a non-Angular project', () => {
      const filePath = normalizeToAbsolutePath(
        `${nonAngularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: nonAngularBaseDir });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('still promotes a real colocated test in an Angular project to TEST', () => {
      // The carve-out is scoped to the environments/ folder; ordinary test files stay TEST.
      const filePath = normalizeToAbsolutePath(`${angularBaseDir}/src/app/app.component.spec.ts`);
      const config = createConfiguration({ baseDir: angularBaseDir });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('leaves the base/metrics file type of the Angular env config as MAIN', () => {
      // The carve-out lives in the rule-selection heuristic only; base classification is unchanged.
      const filePath = normalizeToAbsolutePath(
        `${angularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: angularBaseDir });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('preserves an existing TEST classification over the Angular carve-out', () => {
      // An upstream TEST classification takes precedence over the filename heuristic.
      const filePath = normalizeToAbsolutePath(
        `${angularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: angularBaseDir });
      const result = getFileTypeForRules(filePath, 'TEST', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });
  });
});

describe('isTestCaseFile', () => {
  it('matches test-case markers before the default JS/TS suffixes', () => {
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
    ]) {
      expect(isTestCaseFile(filename)).toBe(true);
    }
  });

  it('only matches the configured suffixes when provided', () => {
    expect(isTestCaseFile('foo.test.dummy')).toBe(false);
    expect(isTestCaseFile('foo.test.dummy', ['.dummy', '.bar'])).toBe(true);
    expect(isTestCaseFile('foo.spec.bar', ['bar'])).toBe(true);
    expect(isTestCaseFile('foo.test.js', ['.dummy'])).toBe(false);
  });

  it('does not match test-related files that need not declare test cases', () => {
    for (const filename of [
      '/project/src/__tests__/helpers.js',
      '/project/src/__mocks__/api.js',
      '/project/src/api.mock.js',
      '/project/src/login.e2e.js',
      '/project/tests/login.js',
      '/project/src/testimony.ts',
    ]) {
      expect(isTestCaseFile(filename)).toBe(false);
    }
  });

  it('distinguishes files sharing a directory and extension', () => {
    expect(isTestCaseFile('/project/src/__tests__/login.test.js')).toBe(true);
    expect(isTestCaseFile('/project/src/__tests__/helpers.js')).toBe(false);
  });
});
