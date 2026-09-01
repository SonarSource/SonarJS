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
import { filterPathAndGetFileType, isJsTsExcluded } from '../../src/common/filter/filter-path.js';
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

  describe('test-file heuristic fallback (no sonar.tests configured)', () => {
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
        const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
        expect(result).toBe('TEST');
      });
    }

    it('should classify a non-test filename as MAIN when no test config is set', () => {
      const filePath = normalizeToAbsolutePath('/project/src/regular.ts');
      const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should not be fooled by filenames that merely contain "test"', () => {
      const filePath = normalizeToAbsolutePath('/project/src/testimony.ts');
      const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
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
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
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
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
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
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
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
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('should classify .test.<customSuffix> as TEST when jsSuffixes is extended', () => {
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.dummy');
      const config = createConfiguration({
        baseDir: '/project',
        sources: ['src'],
        jsSuffixes: ['.js', '.dummy'],
      });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('should not classify .test.<unconfiguredSuffix> as TEST', () => {
      const filePath = normalizeToAbsolutePath('/project/src/foo.test.dummy');
      const config = createConfiguration({ baseDir: '/project', sources: ['src'] });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
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
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
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
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('TEST');
    });
  });

  // JS-2311: Angular per-environment config files (environments/environment.<env>.ts) match the
  // test-file heuristic by coincidence. In an Angular project they are production config, so the
  // classifier carves them out to MAIN (proved by a real on-disk package.json declaring
  // @angular/core); everywhere else they stay TEST.
  describe('Angular environment-config carve-out (no sonar.tests configured)', () => {
    const commonDir = normalizeToAbsolutePath(import.meta.dirname);
    const angularBaseDir = `${commonDir}/fixtures/angular-project`;
    const nonAngularBaseDir = `${commonDir}/fixtures/non-angular-project`;

    it('classifies an Angular environments/environment.test.ts as MAIN', () => {
      const filePath = normalizeToAbsolutePath(
        `${angularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: angularBaseDir });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('MAIN');
    });

    it('carves out the e2e / mock environment markers too', () => {
      const config = createConfiguration({ baseDir: angularBaseDir });
      for (const marker of ['spec', 'cy', 'e2e', 'mock']) {
        const filePath = normalizeToAbsolutePath(
          `${angularBaseDir}/src/environments/environment.${marker}.ts`,
        );
        const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
        expect(result).toBe('MAIN');
      }
    });

    it('keeps environments/environment.test.ts as TEST in a non-Angular project', () => {
      const filePath = normalizeToAbsolutePath(
        `${nonAngularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: nonAngularBaseDir });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('still classifies a real colocated test in an Angular project as TEST', () => {
      // The carve-out is scoped to the environments/ folder; ordinary test files stay TEST.
      const filePath = normalizeToAbsolutePath(`${angularBaseDir}/src/app/app.component.spec.ts`);
      const config = createConfiguration({ baseDir: angularBaseDir });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('TEST');
    });

    it('respects an explicit sonar.tests configuration over the Angular carve-out', () => {
      // When the user explicitly marks the path as a test via sonar.tests, we do not second-guess.
      const filePath = normalizeToAbsolutePath(
        `${angularBaseDir}/src/environments/environment.test.ts`,
      );
      const config = createConfiguration({ baseDir: angularBaseDir, tests: ['src'] });
      const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));
      expect(result).toBe('TEST');
    });
  });
});
