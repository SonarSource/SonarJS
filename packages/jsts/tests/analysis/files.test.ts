/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { beforeEach, describe, it } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import { loadFiles } from '../../src/analysis/projectAnalysis/files-finder.js';
import {
  clearFilesCache,
  getFilenames,
  getFiles,
  getFilesCount,
  UNINITIALIZED_ERROR,
} from '../../src/analysis/projectAnalysis/files.js';
import { setGlobalConfiguration } from '../../../shared/src/helpers/configuration.js';
import { toUnixPath } from '../../../shared/src/helpers/files.js';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('files', () => {
  beforeEach(() => {
    clearFilesCache();
  });
  it('should crash getting files before initializing', async () => {
    expect(getFilenames).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(getFilesCount).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(getFiles).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the files', async () => {
    await loadFiles(join(fixtures, 'paths'));
    expect(getFilesCount()).toEqual(2);
  });

  it('should properly classify files as MAIN or TEST', async () => {
    const file1 = toUnixPath(join(fixtures, 'paths', 'file.ts'));
    const file2 = toUnixPath(join(fixtures, 'paths', 'subfolder', 'index.ts'));
    setGlobalConfiguration({
      tests: ['subfolder'],
    });
    await loadFiles(join(fixtures, 'paths'));
    expect(getFiles()).toMatchObject({
      [file1]: {
        fileType: 'MAIN',
      },
      [file2]: {
        fileType: 'TEST',
      },
    });
  });
});
