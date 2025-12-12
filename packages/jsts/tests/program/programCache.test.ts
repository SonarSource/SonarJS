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
import path from 'node:path/posix';
import { describe, it, beforeEach } from 'node:test';
import { expect } from 'expect';
import ts from 'typescript';
import { toUnixPath } from '../../src/rules/helpers/index.js';
import { ProgramCacheManager } from '../../src/program/cache/programCache.js';
import { IncrementalCompilerHost } from '../../src/program/compilerHost.js';
import { createProgramOptions, type ProgramOptions } from '../../src/program/tsconfig/options.js';
import { clearProgramOptionsCache } from '../../src/program/cache/programOptionsCache.js';
import { clearTsConfigContentCache } from '../../src/program/cache/tsconfigCache.js';

const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');

describe('ProgramCacheManager', () => {
  let cacheManager: ProgramCacheManager;

  beforeEach(() => {
    cacheManager = new ProgramCacheManager();
    clearProgramOptionsCache();
    clearTsConfigContentCache();
  });

  function createBuilderProgram(programOptions: ProgramOptions): {
    program: ts.SemanticDiagnosticsBuilderProgram;
    host: IncrementalCompilerHost;
  } {
    const host = new IncrementalCompilerHost(programOptions.options, fixtures);
    const program = ts.createSemanticDiagnosticsBuilderProgram(
      programOptions.rootNames,
      programOptions.options,
      host,
    );
    return { program, host };
  }

  describe('storeProgram', () => {
    it('should store a program in cache', () => {
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program, host } = createBuilderProgram(programOptions);

      cacheManager.storeProgram(programOptions, program, host);

      const stats = cacheManager.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].rootFileCount).toBeGreaterThan(0);
      expect(stats.entries[0].totalFileCount).toBeGreaterThan(0);
    });

    it('should evict oldest entry when cache is full', () => {
      const smallCacheManager = new ProgramCacheManager(2);
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));

      // Store 3 programs (max is 2)
      for (let i = 0; i < 3; i++) {
        const { program, host } = createBuilderProgram(programOptions);
        smallCacheManager.storeProgram(programOptions, program, host);
      }

      const stats = smallCacheManager.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(2);
    });
  });

  describe('findProgramForFile', () => {
    it('should find a cached program containing the file', () => {
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program, host } = createBuilderProgram(programOptions);

      cacheManager.storeProgram(programOptions, program, host);

      const fileInProgram = path.join(fixtures, 'file.ts');
      const result = cacheManager.findProgramForFile(fileInProgram);

      expect(result).toBeDefined();
      expect(result?.program).toBe(program);
      expect(result?.host).toBe(host);
    });

    it('should return undefined for file not in any cached program', () => {
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program, host } = createBuilderProgram(programOptions);

      cacheManager.storeProgram(programOptions, program, host);

      const result = cacheManager.findProgramForFile('/nonexistent/file.ts');

      expect(result).toBeUndefined();
    });

    it('should update hit count and lastUsedAt on cache hit', () => {
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program, host } = createBuilderProgram(programOptions);

      cacheManager.storeProgram(programOptions, program, host);

      const fileInProgram = path.join(fixtures, 'file.ts');

      // First access
      cacheManager.findProgramForFile(fileInProgram);
      let stats = cacheManager.getCacheStats();
      expect(stats.entries[0].hitCount).toBe(1);

      // Second access
      cacheManager.findProgramForFile(fileInProgram);
      stats = cacheManager.getCacheStats();
      expect(stats.entries[0].hitCount).toBe(2);
    });

    it('should return undefined when cache is empty', () => {
      const result = cacheManager.findProgramForFile('/project/src/index.ts');
      expect(result).toBeUndefined();
    });
  });

  describe('updateProgramInCache', () => {
    it('should update program for existing cache key', () => {
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program: oldProgram, host } = createBuilderProgram(programOptions);

      cacheManager.storeProgram(programOptions, oldProgram, host);

      const fileInProgram = path.join(fixtures, 'file.ts');
      const cached = cacheManager.findProgramForFile(fileInProgram);
      expect(cached?.program).toBe(oldProgram);

      // Create a new program
      const { program: newProgram } = createBuilderProgram(programOptions);

      cacheManager.updateProgramInCache(cached!.cacheKey, newProgram);

      const updated = cacheManager.findProgramForFile(fileInProgram);
      expect(updated?.program).toBe(newProgram);
    });

    it('should do nothing for non-existent cache key', () => {
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program } = createBuilderProgram(programOptions);

      // Should not throw
      cacheManager.updateProgramInCache('non-existent-key', program);

      const stats = cacheManager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return correct stats for empty cache', () => {
      const stats = cacheManager.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(10);
      expect(stats.entries).toHaveLength(0);
      expect(stats.totalFilesAcrossPrograms).toBe(0);
    });

    it('should return correct stats for populated cache', () => {
      const programOptions1 = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program: program1, host: host1 } = createBuilderProgram(programOptions1);

      const programOptions2 = createProgramOptions(path.join(fixtures, 'tsconfig_found.json'));
      const { program: program2, host: host2 } = createBuilderProgram(programOptions2);

      cacheManager.storeProgram(programOptions1, program1, host1);
      cacheManager.storeProgram(programOptions2, program2, host2);

      const stats = cacheManager.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.totalFilesAcrossPrograms).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should clear all cached programs', () => {
      const programOptions = createProgramOptions(path.join(fixtures, 'tsconfig.json'));
      const { program, host } = createBuilderProgram(programOptions);

      cacheManager.storeProgram(programOptions, program, host);
      expect(cacheManager.getCacheStats().size).toBe(1);

      cacheManager.clear();

      expect(cacheManager.getCacheStats().size).toBe(0);
      const fileInProgram = path.join(fixtures, 'file.ts');
      expect(cacheManager.findProgramForFile(fileInProgram)).toBeUndefined();
    });
  });
});
