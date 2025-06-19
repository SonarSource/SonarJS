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

import { accept, shouldIgnoreFile } from '../../src/helpers/filter/filter.js';
import { setGlobalConfiguration } from '../../src/helpers/configuration.js';
import { describe, it, Mock } from 'node:test';
import { expect } from 'expect';
import { AnalysisInput } from '../../src/types/analysis.js';
import { join } from 'node:path/posix';
import { toUnixPath, readFile } from '../../src/helpers/files.js';
import fs from 'fs';

const BUNDLE_CONTENTS = '/* jQuery JavaScript Library v1.4.3*/(function(';
const baseDir = join(toUnixPath(import.meta.dirname), 'fixtures');

describe('filter.ts', () => {
  describe('accept', () => {
    it('should accept JS/TS file when all filters pass with bundle detection enabled', () => {
      const result = accept('file.js', 'content');

      expect(result).toBe(true);
    });

    it('should accept JS/TS file when bundle detection is disabled', () => {
      setGlobalConfiguration({ baseDir, detectBundles: false });
      const result = accept('/project/file.js', BUNDLE_CONTENTS);

      expect(result).toBe(true);
    });

    it('should reject JS/TS file when it fails bundle filter', () => {
      setGlobalConfiguration({ baseDir });
      const result = accept('/project/file.js', BUNDLE_CONTENTS);

      expect(result).toBe(false);
    });

    it('should reject JS/TS file when it fails minified filter', () => {
      setGlobalConfiguration({ baseDir });
      const result = accept('/project/file.min.js', 'contents');

      expect(result).toBe(false);
    });

    it('should reject JS/TS file when it fails size filter', () => {
      setGlobalConfiguration({ baseDir, maxFileSize: 0 });
      const result = accept('/project/file.js', 'content');

      expect(result).toBe(false);
    });

    it('should accept CSS file when all filters pass', () => {
      setGlobalConfiguration({ baseDir });
      const result = accept('/project/file.css', '{}');

      expect(result).toBe(true);
    });

    it('should reject CSS file when it fails minified filter', () => {
      setGlobalConfiguration({ baseDir, detectBundles: false });
      const result = accept('file.min.css', 'content');

      expect(result).toBe(false);
    });

    it('should accept file that is neither JS/TS nor CSS', () => {
      const result = accept('file.txt', 'content');

      expect(result).toBe(true);
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should ignore file when it is excluded by JS/TS exclusions', async () => {
      setGlobalConfiguration({ baseDir, jsTsExclusions: ['file.js'] });
      const file: AnalysisInput = { filePath: join(baseDir, 'file.js') };
      const result = await shouldIgnoreFile(file);

      expect(result).toBe(true);
    });

    it('should ignore file when it does not pass accept checks', async () => {
      setGlobalConfiguration({ baseDir });
      const file: AnalysisInput = {
        filePath: join(baseDir, 'file.min.js'),
        fileContent: 'content',
      };
      const result = await shouldIgnoreFile(file);

      expect(result).toBe(true);
    });

    it('should not ignore file when it passes all checks', async () => {
      setGlobalConfiguration({ baseDir });
      const file: AnalysisInput = { filePath: join(baseDir, 'file.js') };
      const result = await shouldIgnoreFile(file);

      expect(result).toBe(false);
    });

    it('should read file content when not provided', async ({ mock }) => {
      setGlobalConfiguration({ baseDir });
      const file: AnalysisInput = { filePath: join(baseDir, 'file.js') };
      const content = await readFile(file.filePath);
      fs.promises.readFile = mock.fn(fs.promises.readFile);
      const result = await shouldIgnoreFile(file);

      expect(result).toBe(false);
      expect(file.fileContent).toBe(content);
      expect((fs.promises.readFile as Mock<typeof fs.promises.readFile>).mock.callCount()).toBe(1);
    });

    it('should use provided file content', async ({ mock }) => {
      setGlobalConfiguration({ baseDir });
      fs.promises.readFile = mock.fn(fs.promises.readFile);

      const file: AnalysisInput = {
        filePath: join(baseDir, 'file.js'),
        fileContent: 'provided content',
      };

      const result = await shouldIgnoreFile(file);

      expect(result).toBe(false);
      expect((fs.promises.readFile as Mock<typeof fs.promises.readFile>).mock.callCount()).toBe(0);
    });
  });
});
