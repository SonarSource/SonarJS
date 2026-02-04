/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import { filterPathAndGetFileType, isJsTsExcluded } from '../../src/helpers/filter/filter-path.js';
import { createConfiguration, type Configuration } from '../../src/helpers/configuration.js';
import { normalizeToAbsolutePath } from '../../../jsts/src/rules/helpers/index.js';

function getFilterPathParams(config: Configuration) {
  return {
    sourcesPaths: config.sources.length ? config.sources : [config.baseDir],
    testPaths: config.tests,
    inclusions: config.inclusions,
    exclusions: config.exclusions,
    testInclusions: config.testInclusions,
    testExclusions: config.testExclusions,
  };
}

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
});
