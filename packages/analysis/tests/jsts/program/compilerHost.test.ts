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
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { IncrementalCompilerHost } from '../../../src/jsts/program/compilerHost.js';
import {
  setSourceFilesContext,
  getSourceFileContentCache,
  clearSourceFileContentCache,
  getCachedSourceFile,
} from '../../../src/jsts/program/cache/sourceFileCache.js';
import { joinPaths, normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';

describe('IncrementalCompilerHost', () => {
  const baseDir = normalizeToAbsolutePath('/project');
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

      const result = host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), undefined);

      expect(result).toBe(false);
    });

    it('should return false when content has not changed', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      // First update
      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), content);
      // Second update with same content
      const result = host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), content);

      expect(result).toBe(false);
    });

    it('should return true when content has changed', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), 'const x = 1;');
      const result = host.updateFile(
        normalizeToAbsolutePath('/project/src/index.ts'),
        'const x = 2;',
      );

      expect(result).toBe(true);
    });

    it('should update global cache when content changes', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();
      const newContent = 'const y = 2;';

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), newContent);

      expect(cache.get(normalizeToAbsolutePath('/project/src/index.ts'))).toBe(newContent);
    });

    it('should increment file version when content changes', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      expect(host.getFileVersion(normalizeToAbsolutePath('/project/src/index.ts'))).toBe('0');

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), 'const x = 1;');
      expect(host.getFileVersion(normalizeToAbsolutePath('/project/src/index.ts'))).toBe('1');

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), 'const x = 2;');
      expect(host.getFileVersion(normalizeToAbsolutePath('/project/src/index.ts'))).toBe('2');
    });

    it('should invalidate parsed source file cache when content changes', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const fileName = normalizeToAbsolutePath('/project/src/index.ts');

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

      expect(host.getFileVersion(normalizeToAbsolutePath('/project/src/new.ts'))).toBe('0');
    });
  });

  describe('readFile', () => {
    it('should read from global cache first', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();
      const content = 'cached content';

      cache.set(normalizeToAbsolutePath('/project/src/index.ts'), content);

      const result = host.readFile(normalizeToAbsolutePath('/project/src/index.ts'));

      expect(result).toBe(content);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'readFile-cache')).toBe(true);
    });

    it('should read from files context when not in cache', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'context content';

      setSourceFilesContext({
        [normalizeToAbsolutePath('/project/src/index.ts')]: { fileContent: content },
      });

      const result = host.readFile(normalizeToAbsolutePath('/project/src/index.ts'));

      expect(result).toBe(content);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'readFile-context')).toBe(true);
    });

    it('should cache content read from context', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();
      const content = 'context content';

      setSourceFilesContext({
        [normalizeToAbsolutePath('/project/src/index.ts')]: { fileContent: content },
      });

      host.readFile(normalizeToAbsolutePath('/project/src/index.ts'));

      expect(cache.get(normalizeToAbsolutePath('/project/src/index.ts'))).toBe(content);
    });
  });

  describe('fileExists', () => {
    it('should return true for files in global cache', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();

      cache.set(normalizeToAbsolutePath('/project/src/index.ts'), 'content');

      expect(host.fileExists(normalizeToAbsolutePath('/project/src/index.ts'))).toBe(true);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'fileExists-cache')).toBe(true);
    });

    it('should return true for files in context', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      setSourceFilesContext({
        [normalizeToAbsolutePath('/project/src/index.ts')]: { fileContent: 'content' },
      });

      expect(host.fileExists(normalizeToAbsolutePath('/project/src/index.ts'))).toBe(true);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'fileExists-context')).toBe(true);
    });

    it('should query node_modules lookups outside baseDir', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const outsideNodeModulesFile = normalizeToAbsolutePath(
        '/external/node_modules/pkg/index.d.ts',
      );

      expect(host.fileExists(outsideNodeModulesFile)).toBe(false);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'fileExists-disk')).toBe(true);
    });
  });

  describe('readDirectory', () => {
    const extensions = ['.ts', '.d.ts'];
    const includes = ['**/*'];

    it('should query disk for node_modules lookups outside baseDir by default', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.readDirectory('/external/node_modules/pkg', extensions, undefined, includes);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'readDirectory-node_modules-skip')).toBe(false);
      expect(calls.some(c => c.op === 'readDirectory-disk')).toBe(true);
    });

    it('should skip node_modules lookups outside baseDir', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir, true);

      const files = host.readDirectory(
        '/external/node_modules/pkg',
        extensions,
        undefined,
        includes,
      );

      expect(files).toEqual([]);
      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'readDirectory-node_modules-skip')).toBe(true);
      expect(calls.some(c => c.op === 'readDirectory-disk')).toBe(false);
    });

    it('should not skip node_modules lookups under baseDir', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const nodeModulesUnderBaseDir = joinPaths(baseDir, 'node_modules');

      host.readDirectory(nodeModulesUnderBaseDir, extensions, undefined, includes);

      const calls = host.getTrackedFsCalls();
      expect(calls.some(c => c.op === 'readDirectory-node_modules-skip')).toBe(false);
      expect(calls.some(c => c.op === 'readDirectory-disk')).toBe(true);
    });
  });

  describe('getSourceFile', () => {
    it('should return cached source file when available', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      // First call - creates and caches source file
      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), content);
      const sf1 = host.getSourceFile(
        normalizeToAbsolutePath('/project/src/index.ts'),
        ts.ScriptTarget.ESNext,
      );

      // Second call - should return cached
      const sf2 = host.getSourceFile(
        normalizeToAbsolutePath('/project/src/index.ts'),
        ts.ScriptTarget.ESNext,
      );

      expect(sf1).toBe(sf2);
    });

    it('should create new source file when forced', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), content);
      const sf1 = host.getSourceFile(
        normalizeToAbsolutePath('/project/src/index.ts'),
        ts.ScriptTarget.ESNext,
      );

      // Force new source file creation
      const sf2 = host.getSourceFile(
        normalizeToAbsolutePath('/project/src/index.ts'),
        ts.ScriptTarget.ESNext,
        undefined,
        true,
      );

      expect(sf1).not.toBe(sf2);
    });

    it('should set version property on source file', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), 'const x = 1;');
      const sf = host.getSourceFile(
        normalizeToAbsolutePath('/project/src/index.ts'),
        ts.ScriptTarget.ESNext,
      ) as ts.SourceFile & { version?: string };

      expect(sf?.version).toBe('1');
    });

    it('should parse source file with correct target', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), 'const x = 1;');
      const sf = host.getSourceFile(
        normalizeToAbsolutePath('/project/src/index.ts'),
        ts.ScriptTarget.ES2020,
      );

      expect(sf?.languageVersion).toBe(ts.ScriptTarget.ES2020);
    });
  });

  describe('getSourceFileByPath', () => {
    it('should delegate to getSourceFile', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const content = 'const x = 1;';

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), content);

      const filePath = normalizeToAbsolutePath('/project/src/index.ts');
      const sf = host.getSourceFileByPath(
        filePath,
        filePath as unknown as ts.Path,
        ts.ScriptTarget.ESNext,
      );

      expect(sf).toBeDefined();
      expect(sf?.fileName).toBe(normalizeToAbsolutePath('/project/src/index.ts'));
    });
  });

  describe('createHash', () => {
    it('should return file version as hash', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);

      host.updateFile(normalizeToAbsolutePath('/project/src/index.ts'), 'content');

      // createHash uses the data as fileName to get version
      expect(host.createHash(normalizeToAbsolutePath('/project/src/index.ts'))).toBe('1');
    });
  });

  describe('FS call tracking', () => {
    it('should track filesystem calls', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();

      cache.set(normalizeToAbsolutePath('/project/src/index.ts'), 'content');

      host.readFile(normalizeToAbsolutePath('/project/src/index.ts'));
      host.fileExists(normalizeToAbsolutePath('/project/src/index.ts'));

      const calls = host.getTrackedFsCalls();
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls.every(c => c.timestamp > 0)).toBe(true);
    });

    it('should clear tracking', () => {
      const host = new IncrementalCompilerHost(compilerOptions, baseDir);
      const cache = getSourceFileContentCache();

      cache.set(normalizeToAbsolutePath('/project/src/index.ts'), 'content');
      host.readFile(normalizeToAbsolutePath('/project/src/index.ts'));

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

      const canonical = host.getCanonicalFileName(normalizeToAbsolutePath('/Project/Src/Index.ts'));

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
      host.writeFile(normalizeToAbsolutePath('/project/dist/index.js'), 'content', false);
    });
  });

  describe('cross-program SourceFile cache with different jsx options (JS-1505)', () => {
    // Fixture: server.ts (jsx:preserve tsconfig) imports Component.tsx, which is also
    // included in a jsx:react-jsx tsconfig. This reproduces the cross-batch crash scenario:
    //
    // Batch 1: server.ts is in the analysis context. Program A (jsx:preserve) is created.
    //   TypeScript follows the import and calls getSourceFile(Component.tsx). Component.tsx
    //   is NOT in the context → read from disk → SourceFile cached without synthesized import.
    //
    // Batch 2: Component.tsx is in the analysis context (same content as on disk).
    //   Program B (jsx:react-jsx) is created. getSourceFile(Component.tsx) is called.
    //   updateFile is a no-op (same content → same contentHash) → cache HIT → stale SourceFile.
    //   getSuggestionDiagnostics on the stale SourceFile triggers TypeScript's internal assertion:
    //   "Expected sourceFile.imports[0] to be the synthesized JSX runtime import"
    //
    // The fix: jsx is now part of the cache key, so Program B gets a cache miss and a fresh
    // SourceFile with the correct synthesized import at file.imports[0].
    const fixtureDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures', 'tsx-cache-collision'),
    );
    const serverFile = path.join(fixtureDir, 'server.ts') as ReturnType<
      typeof normalizeToAbsolutePath
    >;
    const componentFile = path.join(fixtureDir, 'Component.tsx') as ReturnType<
      typeof normalizeToAbsolutePath
    >;

    it('should not serve a stale SourceFile to a jsx:react-jsx program when Component.tsx was first read from disk by a jsx:preserve program', () => {
      // Read the actual file content so the "same content" invariant holds.
      const serverContent = readFileSync(serverFile, 'utf-8');
      const componentContent = readFileSync(componentFile, 'utf-8');

      // --- Batch 1: only server.ts is in the analysis context ---
      // Component.tsx is NOT in the context → getSourceFile reads it from disk.
      setSourceFilesContext({ [serverFile]: { fileContent: serverContent } });

      const noJsxConfig = ts.readConfigFile(
        path.join(fixtureDir, 'tsconfig-no-jsx.json'),
        ts.sys.readFile,
      );
      const noJsxOptions = ts.parseJsonConfigFileContent(
        noJsxConfig.config,
        ts.sys,
        fixtureDir,
      ).options;
      const hostA = new IncrementalCompilerHost(noJsxOptions, fixtureDir);
      // Creating Program A causes TypeScript to call getSourceFile(Component.tsx) transitively.
      ts.createProgram({ rootNames: [serverFile], options: noJsxOptions, host: hostA });

      // --- Batch 2: Component.tsx is now in the analysis context ---
      // Same content as on disk → updateFile is a no-op → contentHash unchanged.
      // Without the fix, Program B would receive Program A's stale SourceFile (wrong imports).
      setSourceFilesContext({ [componentFile]: { fileContent: componentContent } });

      const jsxConfig = ts.readConfigFile(
        path.join(fixtureDir, 'tsconfig-jsx.json'),
        ts.sys.readFile,
      );
      const jsxOptions = ts.parseJsonConfigFileContent(
        jsxConfig.config,
        ts.sys,
        fixtureDir,
      ).options;
      const hostB = new IncrementalCompilerHost(jsxOptions, fixtureDir);
      const programB = ts.createProgram({
        rootNames: [componentFile],
        options: jsxOptions,
        host: hostB,
      });
      const checker = programB.getTypeChecker();
      const sourceFile = programB.getSourceFile(componentFile);

      // getSuggestionDiagnostics is the non-public API called by rule S1874.
      // Without the fix it throws:
      //   "Debug Failure. False expression: Expected sourceFile.imports[0] to be
      //    the synthesized JSX runtime import"
      expect(() => {
        // @ts-ignore: TypeChecker#getSuggestionDiagnostics is not publicly exposed
        checker.getSuggestionDiagnostics(sourceFile);
      }).not.toThrow();
    });
  });
});
