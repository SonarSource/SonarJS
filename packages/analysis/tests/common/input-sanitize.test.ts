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
import fs from 'node:fs';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { DEFAULT_IO_CONCURRENCY } from '../../../shared/src/helpers/concurrency.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { sanitizeInputFiles } from '../../src/common/input-sanitize.js';
import { createConfiguration } from '../../src/common/configuration.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';

function buildInput(absolutePath: string, fileType?: 'MAIN' | 'TEST') {
  return {
    [absolutePath]: {
      filePath: absolutePath,
      fileContent: '// empty',
      fileType,
    },
  };
}

async function resolveFileTypes(
  absolutePath: string,
  configurationInput: Parameters<typeof createConfiguration>[0],
  inputFileType?: 'MAIN' | 'TEST',
) {
  const configuration = createConfiguration(configurationInput);
  const { files } = await sanitizeInputFiles(
    buildInput(absolutePath, inputFileType),
    configuration,
  );
  const normalized = normalizeToAbsolutePath(absolutePath, configuration.baseDir);
  const file = files[normalized];
  return file && { fileType: file.fileType, ruleFileType: file.ruleFileType };
}

describe('sanitizeInputFiles fileType resolution', () => {
  it('strips a BOM from explicitly supplied file content', async () => {
    const filePath = '/project/src/file.js';
    const configuration = createConfiguration({ baseDir: '/project', sources: ['src'] });
    const { files } = await sanitizeInputFiles(
      {
        [filePath]: {
          filePath,
          fileContent: '\uFEFFconst answer = 42;',
        },
      },
      configuration,
    );

    expect(files[normalizeToAbsolutePath(filePath)].fileContent).toBe('const answer = 42;');
  });

  describe('No sonar.tests configured', () => {
    it('uses TEST rules but preserves MAIN metrics when filename matches heuristic', async () => {
      const result = await resolveFileTypes(
        '/project/src/login.test.ts',
        { baseDir: '/project', sources: ['src'] },
        'MAIN',
      );
      expect(result).toEqual({ fileType: 'MAIN', ruleFileType: 'TEST' });
    });

    it('uses TEST rules but infers MAIN metrics for a test-like source file', async () => {
      const result = await resolveFileTypes('/project/src/login.spec.js', {
        baseDir: '/project',
        sources: ['src'],
      });
      expect(result).toEqual({ fileType: 'MAIN', ruleFileType: 'TEST' });
    });

    it('keeps MAIN for a non-test filename', async () => {
      const result = await resolveFileTypes(
        '/project/src/auth.ts',
        { baseDir: '/project', sources: ['src'] },
        'MAIN',
      );
      expect(result).toEqual({ fileType: 'MAIN', ruleFileType: 'MAIN' });
    });
  });

  describe('explicit classification is authoritative', () => {
    it('preserves explicit TEST regardless of filename', async () => {
      const result = await resolveFileTypes(
        '/project/src/auth.ts',
        { baseDir: '/project', sources: ['src'] },
        'TEST',
      );
      expect(result).toEqual({ fileType: 'TEST', ruleFileType: 'TEST' });
    });

    it('preserves explicit MAIN for a test-named file when sonar.tests is configured', async () => {
      const result = await resolveFileTypes(
        '/project/src/login.test.ts',
        { baseDir: '/project', sources: ['src'], tests: ['test'] },
        'MAIN',
      );
      expect(result).toEqual({ fileType: 'MAIN', ruleFileType: 'MAIN' });
    });

    it('preserves explicit MAIN for a test-named file when sonar.inclusions is configured', async () => {
      const result = await resolveFileTypes(
        '/project/src/login.test.ts',
        {
          baseDir: '/project',
          sources: ['src'],
          inclusions: ['**/*.test.ts'],
        },
        'MAIN',
      );
      expect(result).toEqual({ fileType: 'MAIN', ruleFileType: 'MAIN' });
    });
  });

  describe('path-based resolution still works', () => {
    it('upgrades undefined fileType to TEST when file lives under sonar.tests', async () => {
      const result = await resolveFileTypes('/project/test/login.ts', {
        baseDir: '/project',
        sources: ['src'],
        tests: ['test'],
      });
      expect(result).toEqual({ fileType: 'TEST', ruleFileType: 'TEST' });
    });

    it('resolves to MAIN via sourcesPaths when no explicit fileType is provided', async () => {
      const result = await resolveFileTypes('/project/src/auth.ts', {
        baseDir: '/project',
        sources: ['src'],
      });
      expect(result).toEqual({ fileType: 'MAIN', ruleFileType: 'MAIN' });
    });

    it('falls back to JSTS_ANALYSIS_DEFAULTS.fileType when nothing else resolves the type', async () => {
      const result = await resolveFileTypes('/project/orphan/file.ts', {
        baseDir: '/project',
        sources: ['src'],
      });
      expect(result).toEqual({ fileType: 'MAIN', ruleFileType: 'MAIN' });
    });
  });
});

describe('sanitizeInputFiles bounded I/O', () => {
  it('limits disk reads even for a large input and consumes results in input order', async ({
    mock,
  }) => {
    let active = 0;
    let peak = 0;
    mock.method(fs.promises, 'readFile', async () => {
      active++;
      peak = Math.max(peak, active);
      try {
        if (active > DEFAULT_IO_CONCURRENCY) {
          throw Object.assign(new Error('too many open files'), { code: 'EMFILE' });
        }
        await nextTurn();
        return 'export const value = 1;';
      } finally {
        active--;
      }
    });
    const input = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`key-${i}`, { filePath: `/project/file-${i}.ts` }]),
    );
    const { files, pathMap } = await sanitizeInputFiles(
      input,
      createConfiguration({ baseDir: '/project' }),
    );
    expect(Object.keys(files)).toHaveLength(100);
    expect([...pathMap.values()]).toEqual(Object.keys(input));
    expect(peak).toBe(DEFAULT_IO_CONCURRENCY);
    expect(active).toBe(0);
  });

  it('preserves the last duplicate normalized path even when its read finishes first', async ({
    mock,
  }) => {
    let reads = 0;
    mock.method(fs.promises, 'readFile', async () => {
      const read = reads++;
      if (read === 0) {
        await nextTurn();
      }
      return read === 0 ? '\uFEFFconst first = 1;' : 'const last = 2;';
    });
    const configuration = createConfiguration({ baseDir: '/project' });
    const { files, pathMap } = await sanitizeInputFiles(
      {
        first: { filePath: 'file.js' },
        last: { filePath: './file.js', fileType: 'TEST', fileStatus: 'SAME' },
      },
      configuration,
    );
    const filePath = normalizeToAbsolutePath('file.js', configuration.baseDir);
    expect(files[filePath]).toEqual(
      expect.objectContaining({
        fileContent: 'const last = 2;',
        fileType: 'TEST',
        fileStatus: 'SAME',
      }),
    );
    expect(pathMap.get(filePath)).toBe('last');
  });
});
