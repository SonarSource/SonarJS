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
import { IncrementalCompilerHost } from '../../src/program/compilerHost.js';
import {
  setSourceFilesContext,
  getSourceFileContentCache,
  clearSourceFileContentCache,
  getCachedSourceFile,
} from '../../src/program/cache/sourceFileCache.js';

describe('IncrementalCompilerHost', () => {
  const baseDir = '/project';
  const compilerOptions: ts.CompilerOptions = { target: ts.ScriptTarget.ESNext };

  beforeEach(() => {
    clearSourceFileContentCache();
  });

  describe('constructor', () => {
    it('should create host with compiler options and base directory', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      expect(host.getCurrentDirectory()).toBe(baseDir);
      expect(host.useCaseSensitiveFileNames()).toBeDefined();
    });
  });

  describe('updateFile', () => {
    it('should return false when content is undefined', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      const result = host.updateFile('/project/src/index.ts', undefined);

      expect(result).toBe(false);
    });

    it('should return false when content has not changed', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      // First update
      host.updateFile('/project/src/index.ts', content);
      // Second update with same content
      const result = host.updateFile('/project/src/index.ts', content);

      expect(result).toBe(false);
    });

    it('should return true when content has changed', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile('/project/src/index.ts', 'const x = 1;');
      const result = host.updateFile('/project/src/index.ts', 'const x = 2;');

      expect(result).toBe(true);
    });

    it('should update global cache when content changes', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();
      const newContent = 'const y = 2;';

      host.updateFile('/project/src/index.ts', newContent);

      expect(cache.get('/project/src/index.ts')).toBe(newContent);
    });

    it('should increment file version when content changes', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      expect(host.getFileVersion('/project/src/index.ts')).toBe('0');

      host.updateFile('/project/src/index.ts', 'const x = 1;');
      expect(host.getFileVersion('/project/src/index.ts')).toBe('1');

      host.updateFile('/project/src/index.ts', 'const x = 2;');
      expect(host.getFileVersion('/project/src/index.ts')).toBe('2');
    });

    it('should invalidate parsed source file cache when content changes', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const fileName = '/project/src/index.ts';

      // Get a source file to populate cache
      host.updateFile(fileName, 'const x = 1;');
      host.getSourceFile(fileName, ts.ScriptTarget.ESNext);

      // Source file should be cached
      expect(getCachedSourceFile(fileName, ts.ScriptTarget.ESNext, '1')).toBeDefined();

      // Update file content
      host.updateFile(fileName, 'const x = 2;');

      // Old cache entry should be invalidated
      expect(getCachedSourceFile(fileName, ts.ScriptTarget.ESNext, '1')).toBeUndefined();
    });
  });

  describe('getFileVersion', () => {
    it('should return "0" for files not yet updated', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      expect(host.getFileVersion('/project/src/new.ts')).toBe('0');
    });
  });

  describe('readFile', () => {
    it('should read from global cache first', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();
      const content = 'cached content';

      cache.set('/project/src/index.ts', content);

      const result = host.readFile('/project/src/index.ts');

      expect(result).toBe(content);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'readFile-cache')).toBe(true);
    });

    it('should read from files context when not in cache', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'context content';

      setSourceFilesContext({
        '/project/src/index.ts': { fileContent: content },
      });

      const result = host.readFile('/project/src/index.ts');

      expect(result).toBe(content);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'readFile-context')).toBe(true);
    });

    it('should cache content read from context', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();
      const content = 'context content';

      setSourceFilesContext({
        '/project/src/index.ts': { fileContent: content },
      });

      host.readFile('/project/src/index.ts');

      expect(cache.get('/project/src/index.ts')).toBe(content);
    });
  });

  describe('fileExists', () => {
    it('should return true for files in global cache', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();

      cache.set('/project/src/index.ts', 'content');

      expect(host.fileExists('/project/src/index.ts')).toBe(true);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'fileExists-cache')).toBe(true);
    });

    it('should return true for files in context', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      setSourceFilesContext({
        '/project/src/index.ts': { fileContent: 'content' },
      });

      expect(host.fileExists('/project/src/index.ts')).toBe(true);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'fileExists-context')).toBe(true);
    });
  });

  describe('getSourceFile', () => {
    it('should return cached source file when available', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      // First call - creates and caches source file
      host.updateFile('/project/src/index.ts', content);
      const sf1 = host.getSourceFile('/project/src/index.ts', ts.ScriptTarget.ESNext);

      // Second call - should return cached
      const sf2 = host.getSourceFile('/project/src/index.ts', ts.ScriptTarget.ESNext);

      expect(sf1).toBe(sf2);
    });

    it('should create new source file when forced', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      host.updateFile('/project/src/index.ts', content);
      const sf1 = host.getSourceFile('/project/src/index.ts', ts.ScriptTarget.ESNext);

      // Force new source file creation
      const sf2 = host.getSourceFile(
        '/project/src/index.ts',
        ts.ScriptTarget.ESNext,
        undefined,
        true,
      );

      expect(sf1).not.toBe(sf2);
    });

    it('should set version property on source file', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile('/project/src/index.ts', 'const x = 1;');
      const sf = host.getSourceFile(
        '/project/src/index.ts',
        ts.ScriptTarget.ESNext,
      ) as ts.SourceFile & { version?: string };

      expect(sf?.version).toBe('1');
    });

    it('should parse source file with correct target', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile('/project/src/index.ts', 'const x = 1;');
      const sf = host.getSourceFile('/project/src/index.ts', ts.ScriptTarget.ES2020);

      expect(sf?.languageVersion).toBe(ts.ScriptTarget.ES2020);
    });
  });

  describe('getSourceFileByPath', () => {
    it('should delegate to getSourceFile', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      host.updateFile('/project/src/index.ts', content);

      const sf = host.getSourceFileByPath(
        '/project/src/index.ts',
        '/project/src/index.ts' as ts.Path,
        ts.ScriptTarget.ESNext,
      );

      expect(sf).toBeDefined();
      expect(sf?.fileName).toBe('/project/src/index.ts');
    });
  });

  describe('createHash', () => {
    it('should return file version as hash', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile('/project/src/index.ts', 'content');

      // createHash uses the data as fileName to get version
      expect(host.createHash('/project/src/index.ts')).toBe('1');
    });
  });

  describe('FS call tracking', () => {
    it('should track filesystem calls', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();

      cache.set('/project/src/index.ts', 'content');

      host.readFile('/project/src/index.ts');
      host.fileExists('/project/src/index.ts');

      const calls = host.getTrackedFsCalls();
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls.every(c => c.timestamp > 0)).toBe(true);
    });

    it('should clear tracking', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();

      cache.set('/project/src/index.ts', 'content');
      host.readFile('/project/src/index.ts');

      expect(host.getTrackedFsCalls().length).toBeGreaterThan(0);

      host.clearTracking();

      expect(host.getTrackedFsCalls()).toHaveLength(0);
    });
  });

  describe('delegated methods', () => {
    it('should return default lib file name', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      const libFileName = host.getDefaultLibFileName(compilerOptions);

      expect(libFileName).toContain('lib');
    });

    it('should return canonical file name', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      const canonical = host.getCanonicalFileName('/Project/Src/Index.ts');

      expect(canonical).toBeDefined();
    });

    it('should return new line character', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      const newLine = host.getNewLine();

      expect(['\n', '\r\n']).toContain(newLine);
    });

    it('writeFile should be a no-op', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      // Should not throw
      host.writeFile('/project/dist/index.js', 'content', false);
    });
  });
});
