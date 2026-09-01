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
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import {
  filterPathAndGetFileType,
  getFileTypeForRules,
  isJsTsExcluded,
} from '../../src/common/filter/filter-path.js';
import { createConfiguration, getFilterPathParams } from '../../src/common/configuration.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';

function logsContain(message: string) {
  return expect(
    (console.log as Mock<typeof console.log>).mock.calls.flatMap(call => {
      return call.arguments;
    }),
  ).toContain(message);
}

describe('filter path', () => {
  it('should return undefined if file is excluded by JS/TS exclusions', ({ mock }) => {
    console.log = mock.fn(console.log);

    const filePath = normalizeToAbsolutePath('/project/src/excluded/file.js');
    const config = createConfiguration({
      baseDir: '/project/',
      jsTsExclusions: ['**/excluded/**'],
    });

    const result = isJsTsExcluded(filePath, config.jsTsExclusions);

    expect(result).toBe(true);
    logsContain(`DEBUG File ignored due to js/ts exclusions: ${filePath}`);
  });

  it('should return TEST if file is in test paths and not excluded', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/test/file.js');
    const config = createConfiguration({ baseDir: '/project', tests: ['test'] });
    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBe('TEST');
  });

  it('should return undefined if file is in test paths but excluded by test exclusions', ({
    mock,
  }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/test/excluded/file.js');
    const config = createConfiguration({
      baseDir: '/project',
      tests: ['test'],
      testExclusions: ['**/test/excluded/**'],
      exclusions: ['**/test/**'],
    });
    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));

    expect(result).toBeUndefined();
    logsContain(`DEBUG File ignored due to analysis scope filters: ${filePath}`);
  });

  it('should return TEST if file is in test paths and included by test inclusions', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/test/included/file.js');
    const config = createConfiguration({
      baseDir: '/project',
      tests: ['test'],
      testInclusions: ['**/included/**'],
    });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBe('TEST');
  });

  it('should return undefined if file is in test paths but not included by test inclusions', ({
    mock,
  }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/test/not-included/file.js');
    const config = createConfiguration({
      baseDir: '/project',
      tests: ['test'],
      testInclusions: ['**/included/**'],
      exclusions: ['**/test/**'],
    });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBeUndefined();
    logsContain(`DEBUG File ignored due to analysis scope filters: ${filePath}`);
  });

  it('should return undefined if file is excluded by general exclusions', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/src/excluded/file.js');
    const config = createConfiguration({
      baseDir: '/project',
      sources: ['src'],
      exclusions: ['**/excluded/**'],
    });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));

    expect(result).toBeUndefined();
    logsContain(`DEBUG File ignored due to analysis scope filters: ${filePath}`);
  });

  it('should return MAIN if file is included by source inclusions', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/src/included/file.js');
    const config = createConfiguration({
      baseDir: '/project',
      sources: ['src'],
      inclusions: ['**/included/**'],
    });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));

    expect(result).toBe('MAIN');
  });

  it('should return undefined if file is not included by source inclusions', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/src/not-included/file.js');
    const config = createConfiguration({
      baseDir: '/project',
      sources: ['src'],
      inclusions: ['**/included/**'],
    });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBeUndefined();
    logsContain(`DEBUG File ignored due to analysis scope filters: ${filePath}`);
  });

  it('should return MAIN if file is in source paths', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/src/file.js');
    const config = createConfiguration({ baseDir: '/project', sources: ['src'] });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBe('MAIN');
  });

  it('should return MAIN if file is in source paths using dot', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/src/file.js');
    const config = createConfiguration({ baseDir: '/project', sources: ['.'] });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBe('MAIN');
  });

  it('should return undefined if file is not in source paths', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/other/file.js');
    const config = createConfiguration({ baseDir: '/project', sources: ['src'] });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBeUndefined();
    logsContain(`DEBUG File ignored due to analysis scope filters: ${filePath}`);
  });

  it('should handle empty test paths array', ({ mock }) => {
    console.log = mock.fn(console.log);
    const filePath = normalizeToAbsolutePath('/project/src/file.js');
    const config = createConfiguration({
      baseDir: '/project',
      jsTsExclusions: ['**/excluded/**'],
      sources: ['src'],
    });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
    expect(result).toBe('MAIN');
  });

  it('should keep a test-like source file MAIN for metrics', () => {
    const filePath = normalizeToAbsolutePath('/project/src/file.test.js');
    const config = createConfiguration({ baseDir: '/project', sources: ['src'] });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));

    expect(result).toBe('MAIN');
  });

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

    it('should not be fooled by filenames that merely contain "test"', () => {
      const filePath = normalizeToAbsolutePath('/project/src/testimony.ts');
      const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should NOT apply heuristic when testPaths is configured', ({ mock }) => {
      console.log = mock.fn(console.log);
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.ts');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        tests: ['test'],
      });
      const result = getFileTypeForRules(filePath, 'MAIN', getFilterPathParams(config));
      expect(result).toBe('MAIN');
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

  // JS-2311: Angular per-environment config files (environments/environment.<env>.ts) match the
  // filename heuristic by coincidence. In an Angular project they are production config, so the
  // heuristic used for rule selection carves them out (proved by a real on-disk package.json
  // declaring @angular/core) — keeping them MAIN so Test-scoped rules do not run on them, while
  // the scanner/path-derived file type used for metrics is untouched. Everywhere else they stay
  // TEST for rule selection.
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

    it('respects an explicit TEST classification (sonar.tests) over the Angular carve-out', () => {
      // When the scanner already typed the file as TEST, rule selection keeps it TEST.
      const filePath = normalizeToAbsolutePath(
        `${angularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: angularBaseDir });
      const result = getFileTypeForRules(filePath, 'TEST', getFilterPathParams(config));
      expect(result).toBe('TEST');
    });
  });
});
