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
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path/posix';
import { expect } from 'expect';
import { Minimatch } from 'minimatch';
import { findFiles } from '../../src/common/find-files.js';
import { normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';

describe('findFiles', () => {
  let baseDir: string;
  let blockedDir: string;
  let sourceFile: string;

  beforeEach(async () => {
    baseDir = normalizeToAbsolutePath(await fs.promises.mkdtemp(join(tmpdir(), 'sonarjs-find-')));
    blockedDir = join(baseDir, 'out', 'subdirectory');
    sourceFile = join(baseDir, 'src', 'index.ts');
    await fs.promises.mkdir(blockedDir, { recursive: true });
    await fs.promises.mkdir(join(baseDir, 'src'));
    await fs.promises.writeFile(sourceFile, 'export const answer = 42;');
  });

  afterEach(async () => {
    mock.restoreAll();
    syncBuiltinESMExports();
    await fs.promises.rm(baseDir, { recursive: true, force: true });
  });

  function failToOpen(directory: string, code: string) {
    const originalOpen = fs.promises.opendir;
    const error = Object.assign(new Error('Cannot open directory'), { code });
    mock.method(fs.promises, 'opendir', async (path, options) => {
      if (path === directory) {
        throw error;
      }
      return originalOpen(path, options);
    });
    syncBuiltinESMExports();
    return error;
  }

  for (const code of ['EACCES', 'EPERM']) {
    it(`should skip descendant directories denied with ${code} and discover readable files`, async () => {
      failToOpen(blockedDir, code);
      const log = mock.method(console, 'log', () => {});
      const files: string[] = [];

      await findFiles(baseDir, [], async (entry, filePath) => {
        if (entry.isFile()) {
          files.push(filePath);
        }
      });

      expect(files).toEqual([sourceFile]);
      expect(log.mock.calls.map(call => call.arguments[0])).toContain(
        `WARN Skipping directory '${blockedDir}' because it cannot be read (${code}).`,
      );
    });
  }

  it('should not open excluded descendant directories', async () => {
    failToOpen(blockedDir, 'EACCES');
    const log = mock.method(console, 'log', () => {});

    await findFiles(baseDir, [new Minimatch(`${baseDir}/out/**`)], async () => {});

    expect(log.mock.calls.some(call => call.arguments[0].startsWith('WARN'))).toBe(false);
  });

  it('should fail when the project root cannot be opened', async () => {
    const error = failToOpen(baseDir, 'EACCES');

    await expect(findFiles(baseDir, [], async () => {})).rejects.toBe(error);
  });

  it('should propagate unexpected errors opening descendant directories', async () => {
    const error = failToOpen(blockedDir, 'EIO');

    await expect(findFiles(baseDir, [], async () => {})).rejects.toBe(error);
  });

  it('should propagate permission errors from entry processing', async () => {
    const error = Object.assign(new Error('Cannot process entry'), { code: 'EACCES' });

    await expect(
      findFiles(baseDir, [], async entry => {
        if (entry.isFile()) {
          throw error;
        }
      }),
    ).rejects.toBe(error);
  });
});
