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
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installFsCache } from '../../../shared/src/fs-cache/hook.js';
import { setArchivedFileSystemCaseSensitivity } from '../../src/jsts/rules/helpers/filesystem-case.js';
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

  it('should keep a test-like source file MAIN for metrics', () => {
    const filePath = normalizeToAbsolutePath('/project/src/file.test.js');
    const config = createConfiguration({ baseDir: '/project', sources: ['src'] });

    const result = filterPathAndGetFileType(filePath, getFilterPathParams(config));

    expect(result).toBe('MAIN');
  });

  for (const excludedParent of [false, true]) {
    it(`reuses ${excludedParent ? 'excluded' : 'accepted'} parent results across sibling files`, ({
      mock,
    }) => {
      const config = createConfiguration({
        baseDir: '/project',
        exclusions: ['**/blocked', '**/skip.ts'],
      });
      const matcher = mock.method(config.exclusions[0], 'match');
      const directory = normalizeToAbsolutePath(
        `/project/src/${excludedParent ? 'blocked/' : ''}nested`,
      );
      for (const filename of ['first.ts', 'skip.ts', 'last.ts']) {
        const filePath = normalizeToAbsolutePath(`${directory}/${filename}`);
        expect(filterPathAndGetFileType(filePath, getFilterPathParams(config))).toBe(
          excludedParent || filename === 'skip.ts' ? undefined : 'MAIN',
        );
      }

      expect(matcher.mock.calls.filter(call => call.arguments[0] === directory)).toHaveLength(1);
    });
  }

  it('isolates parent exclusion results by analysis root and exclusion configuration', () => {
    const config = createConfiguration({ baseDir: '/project', exclusions: ['**/blocked'] });
    const params = getFilterPathParams(config);
    const filePath = normalizeToAbsolutePath('/project/blocked/nested/file.ts');
    expect(filterPathAndGetFileType(filePath, params)).toBeUndefined();

    // Reusing the patterns with a deeper root must not reuse exclusions above that root.
    expect(
      filterPathAndGetFileType(filePath, {
        ...params,
        baseDir: normalizeToAbsolutePath('/project/blocked'),
      }),
    ).toBe('MAIN');
    expect(filterPathAndGetFileType(filePath, params)).toBeUndefined();

    const newConfig = createConfiguration({ baseDir: '/project', exclusions: ['**/other'] });
    expect(filterPathAndGetFileType(filePath, getFilterPathParams(newConfig))).toBe('MAIN');
  });

  it('stops ancestor exclusions at the analysis root using filesystem case semantics', () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'exclusion-root-case-'));
    const root = normalizeToAbsolutePath(temporary);
    const analysisRoot = normalizeToAbsolutePath('project/blocked', root);
    const config = createConfiguration({
      baseDir: analysisRoot,
      exclusions: ['file:**/blocked'],
    });
    // Reuse the same patterns across modes to exercise cache invalidation as well.
    const params = getFilterPathParams(config);
    try {
      for (const caseSensitivePaths of [true, false, true]) {
        const session = installFsCache().beginAnalysis({
          archivePath: path.join(temporary, 'fs.pb.gz'),
          rootDir: root,
          mode: 'record',
          caseSensitivePaths,
        });
        try {
          // Simulate the producer filesystem independently of the test host.
          setArchivedFileSystemCaseSensitivity(caseSensitivePaths);
          expect(
            filterPathAndGetFileType(
              normalizeToAbsolutePath('PROJECT/blocked/nested/main.ts', root),
              params,
            ),
          ).toBe(caseSensitivePaths ? undefined : 'MAIN');
          expect(
            filterPathAndGetFileType(
              normalizeToAbsolutePath('nested/main.ts', analysisRoot),
              params,
            ),
          ).toBe('MAIN');
        } finally {
          session.end();
        }
      }
    } finally {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  });
});
