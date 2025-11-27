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
import { describe, it, beforeEach } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import {
  setSourceFilesContext,
  getSourceFileContentCache,
  getCurrentFilesContext,
  getCachedSourceFile,
  setCachedSourceFile,
  invalidateCachedSourceFile,
  clearSourceFileContentCache,
} from '../../src/program/cache/sourceFileCache.js';

describe('sourceFileCache', () => {
  beforeEach(() => {
    clearSourceFileContentCache();
  });

  describe('sourceFileContentCache', () => {
    it('should store and retrieve file contents', () => {
      const cache = getSourceFileContentCache();
      const content = 'const x = 1;';

      cache.set('/project/src/index.ts', content);

      expect(cache.get('/project/src/index.ts')).toBe(content);
    });

    it('should return undefined for missing files', () => {
      const cache = getSourceFileContentCache();
      expect(cache.get('/project/src/missing.ts')).toBeUndefined();
    });

    it('should be cleared by clearSourceFileContentCache', () => {
      const cache = getSourceFileContentCache();
      cache.set('/project/src/index.ts', 'content');

      clearSourceFileContentCache();

      expect(cache.get('/project/src/index.ts')).toBeUndefined();
    });
  });

  describe('setSourceFilesContext / getCurrentFilesContext', () => {
    it('should set and retrieve files context', () => {
      const context = {
        '/project/src/index.ts': { fileContent: 'const x = 1;' },
        '/project/src/utils.ts': { fileContent: 'export const y = 2;' },
      };

      setSourceFilesContext(context);

      expect(getCurrentFilesContext()).toBe(context);
    });

    it('should return null when no context is set', () => {
      // clearSourceFileContentCache sets context to null
      expect(getCurrentFilesContext()).toBeNull();
    });

    it('should handle context with empty fileContent', () => {
      const context = {
        '/project/src/index.ts': { fileContent: '' },
        '/project/src/utils.ts': {},
      };

      setSourceFilesContext(context);

      const retrieved = getCurrentFilesContext();
      expect(retrieved?.['/project/src/index.ts'].fileContent).toBe('');
      expect(retrieved?.['/project/src/utils.ts'].fileContent).toBeUndefined();
    });
  });

  describe('parsedSourceFileCache', () => {
    const testFileName = '/project/src/test.ts';
    const testContent = 'const x: number = 1;';

    function createSourceFile(
      fileName: string,
      content: string,
      target: ts.ScriptTarget,
    ): ts.SourceFile {
      return ts.createSourceFile(fileName, content, target, true);
    }

    describe('getCachedSourceFile', () => {
      it('should return undefined for uncached file', () => {
        const result = getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '0');
        expect(result).toBeUndefined();
      });

      it('should return cached source file when content hash matches', () => {
        const sourceFile = createSourceFile(testFileName, testContent, ts.ScriptTarget.ESNext);
        const contentHash = '1';

        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, contentHash, sourceFile);

        const result = getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, contentHash);
        expect(result).toBe(sourceFile);
      });

      it('should return undefined when content hash does not match', () => {
        const sourceFile = createSourceFile(testFileName, testContent, ts.ScriptTarget.ESNext);

        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1', sourceFile);

        const result = getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '2');
        expect(result).toBeUndefined();
      });

      it('should return undefined when target does not match', () => {
        const sourceFile = createSourceFile(testFileName, testContent, ts.ScriptTarget.ESNext);

        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1', sourceFile);

        const result = getCachedSourceFile(testFileName, ts.ScriptTarget.ES2020, '1');
        expect(result).toBeUndefined();
      });
    });

    describe('setCachedSourceFile', () => {
      it('should cache source file for specific target', () => {
        const sourceFileESNext = createSourceFile(
          testFileName,
          testContent,
          ts.ScriptTarget.ESNext,
        );
        const sourceFileES2020 = createSourceFile(
          testFileName,
          testContent,
          ts.ScriptTarget.ES2020,
        );

        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1', sourceFileESNext);
        setCachedSourceFile(testFileName, ts.ScriptTarget.ES2020, '1', sourceFileES2020);

        expect(getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1')).toBe(
          sourceFileESNext,
        );
        expect(getCachedSourceFile(testFileName, ts.ScriptTarget.ES2020, '1')).toBe(
          sourceFileES2020,
        );
      });

      it('should overwrite cached source file when content hash changes', () => {
        const sourceFile1 = createSourceFile(testFileName, testContent, ts.ScriptTarget.ESNext);
        const sourceFile2 = createSourceFile(testFileName, 'const y = 2;', ts.ScriptTarget.ESNext);

        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1', sourceFile1);
        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '2', sourceFile2);

        expect(getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1')).toBeUndefined();
        expect(getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '2')).toBe(sourceFile2);
      });
    });

    describe('invalidateCachedSourceFile', () => {
      it('should remove all cached versions of a file', () => {
        const sourceFileESNext = createSourceFile(
          testFileName,
          testContent,
          ts.ScriptTarget.ESNext,
        );
        const sourceFileES2020 = createSourceFile(
          testFileName,
          testContent,
          ts.ScriptTarget.ES2020,
        );

        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1', sourceFileESNext);
        setCachedSourceFile(testFileName, ts.ScriptTarget.ES2020, '1', sourceFileES2020);

        invalidateCachedSourceFile(testFileName);

        expect(getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1')).toBeUndefined();
        expect(getCachedSourceFile(testFileName, ts.ScriptTarget.ES2020, '1')).toBeUndefined();
      });

      it('should not affect other files', () => {
        const otherFileName = '/project/src/other.ts';
        const sourceFile1 = createSourceFile(testFileName, testContent, ts.ScriptTarget.ESNext);
        const sourceFile2 = createSourceFile(otherFileName, 'const y = 2;', ts.ScriptTarget.ESNext);

        setCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1', sourceFile1);
        setCachedSourceFile(otherFileName, ts.ScriptTarget.ESNext, '1', sourceFile2);

        invalidateCachedSourceFile(testFileName);

        expect(getCachedSourceFile(testFileName, ts.ScriptTarget.ESNext, '1')).toBeUndefined();
        expect(getCachedSourceFile(otherFileName, ts.ScriptTarget.ESNext, '1')).toBe(sourceFile2);
      });

      it('should handle invalidating non-existent file', () => {
        // Should not throw
        invalidateCachedSourceFile('/project/src/nonexistent.ts');
      });
    });
  });

  describe('clearSourceFileContentCache', () => {
    it('should clear all caches and reset context', () => {
      const cache = getSourceFileContentCache();
      cache.set('/project/src/index.ts', 'content');

      const sourceFile = ts.createSourceFile(
        '/project/src/test.ts',
        'const x = 1;',
        ts.ScriptTarget.ESNext,
        true,
      );
      setCachedSourceFile('/project/src/test.ts', ts.ScriptTarget.ESNext, '1', sourceFile);

      setSourceFilesContext({ '/project/src/index.ts': { fileContent: 'content' } });

      clearSourceFileContentCache();

      expect(cache.get('/project/src/index.ts')).toBeUndefined();
      expect(
        getCachedSourceFile('/project/src/test.ts', ts.ScriptTarget.ESNext, '1'),
      ).toBeUndefined();
      expect(getCurrentFilesContext()).toBeNull();
    });
  });
});
