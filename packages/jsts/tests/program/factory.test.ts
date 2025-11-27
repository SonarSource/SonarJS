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
import {
  createStandardProgram,
  createProgramFromSingleFile,
  createOrGetCachedProgramForFile,
} from '../../src/program/factory.js';
import {
  createProgramOptions,
  createProgramOptionsFromJson,
  defaultCompilerOptions,
} from '../../src/program/tsconfig/options.js';
import { getProgramCacheManager } from '../../src/program/cache/programCache.js';
import {
  clearSourceFileContentCache,
  setSourceFilesContext,
} from '../../src/program/cache/sourceFileCache.js';
import { clearProgramOptionsCache } from '../../src/program/cache/programOptionsCache.js';

const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');

describe('factory', () => {
  beforeEach(() => {
    getProgramCacheManager().clear();
    clearSourceFileContentCache();
    clearProgramOptionsCache();
  });

  describe('createStandardProgram', () => {
    it('should create a TypeScript program from program options', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const programOptions = createProgramOptions(tsConfig);

      const program = createStandardProgram(programOptions);

      expect(program).toBeDefined();
      expect(program.getSourceFiles().length).toBeGreaterThan(0);
    });

    it('should include files specified in tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const programOptions = createProgramOptions(tsConfig);

      const program = createStandardProgram(programOptions);
      const fileNames = program.getSourceFiles().map(sf => sf.fileName);

      expect(fileNames).toContain(path.join(fixtures, 'file.ts'));
    });

    it('should apply compiler options from tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_found.json');
      const programOptions = createProgramOptions(tsConfig);

      const program = createStandardProgram(programOptions);
      const options = program.getCompilerOptions();

      expect(options.target).toBe(ts.ScriptTarget.ES2020);
    });
  });

  describe('createProgramFromSingleFile', () => {
    it('should create a program for a single file', () => {
      const fileName = '/virtual/test.ts';
      const contents = 'const x: number = 1;';

      const program = createProgramFromSingleFile(fileName, contents);

      expect(program).toBeDefined();
      const sourceFile = program.getSourceFile(fileName);
      expect(sourceFile).toBeDefined();
    });

    it('should use provided compiler options', () => {
      const fileName = '/virtual/test.ts';
      const contents = 'const x = 1;';
      const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES5,
        strict: true,
      };

      const program = createProgramFromSingleFile(fileName, contents, options);
      const compilerOptions = program.getCompilerOptions();

      expect(compilerOptions.strict).toBe(true);
    });

    it('should use default compiler options when not specified', () => {
      const fileName = '/virtual/test.ts';
      const contents = 'const x = 1;';

      const program = createProgramFromSingleFile(fileName, contents);
      const options = program.getCompilerOptions();

      expect(options.allowJs).toBe(defaultCompilerOptions.allowJs);
    });

    it('should handle TypeScript syntax correctly', () => {
      const fileName = '/virtual/test.ts';
      const contents = `
        interface User {
          name: string;
          age: number;
        }
        const user: User = { name: 'Test', age: 30 };
      `;

      const program = createProgramFromSingleFile(fileName, contents);
      const sourceFile = program.getSourceFile(fileName);

      expect(sourceFile).toBeDefined();
      // No syntax errors
      expect(program.getSyntacticDiagnostics(sourceFile).length).toBe(0);
    });
  });

  describe('createOrGetCachedProgramForFile', () => {
    it('should create new program on cache miss', () => {
      const sourceFile = path.join(fixtures, 'file.ts');
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      setSourceFilesContext({
        [sourceFile]: { fileContent: 'const x = 1;' },
      });

      const program = createOrGetCachedProgramForFile(fixtures, sourceFile, () =>
        createProgramOptions(tsConfig),
      );

      expect(program).toBeDefined();

      const stats = getProgramCacheManager().getCacheStats();
      expect(stats.size).toBe(1);
    });

    it('should return cached program on cache hit', () => {
      const sourceFile = path.join(fixtures, 'file.ts');
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      setSourceFilesContext({
        [sourceFile]: { fileContent: 'const x = 1;' },
      });

      const program1 = createOrGetCachedProgramForFile(fixtures, sourceFile, () =>
        createProgramOptions(tsConfig),
      );

      const program2 = createOrGetCachedProgramForFile(fixtures, sourceFile, () =>
        createProgramOptions(tsConfig),
      );

      // Should be the same program instance (cache hit)
      expect(program1).toBe(program2);

      const stats = getProgramCacheManager().getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].hitCount).toBe(1);
    });

    it('should return undefined when getProgramOptions returns undefined', () => {
      const sourceFile = '/project/src/index.ts';

      const program = createOrGetCachedProgramForFile(fixtures, sourceFile, () => undefined);

      expect(program).toBeUndefined();
    });

    it('should update program when file content changes', () => {
      const sourceFile = path.join(fixtures, 'file.ts');
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      // First request with initial content
      setSourceFilesContext({
        [sourceFile]: { fileContent: 'const x = 1;' },
      });

      const program1 = createOrGetCachedProgramForFile(fixtures, sourceFile, () =>
        createProgramOptions(tsConfig),
      );

      // Update file content
      setSourceFilesContext({
        [sourceFile]: { fileContent: 'const x = 2; const y = 3;' },
      });

      const program2 = createOrGetCachedProgramForFile(fixtures, sourceFile, () =>
        createProgramOptions(tsConfig),
      );

      // Program should be different (recreated due to content change)
      expect(program1).toBeDefined();
      expect(program2).toBeDefined();
      expect(program1).not.toBe(program2);
      // Cache should still have 1 entry (updated, not added)
      expect(getProgramCacheManager().getCacheStats().size).toBe(1);
    });
  });

  describe('createProgramOptionsFromJson', () => {
    it('should create program options from JSON compiler options', () => {
      const json = { target: 'ES2020', strict: true };
      const rootNames = ['/project/src/index.ts'];

      const options = createProgramOptionsFromJson(json, rootNames, '/project');

      expect(options.rootNames).toEqual(rootNames);
      expect(options.options.target).toBe(ts.ScriptTarget.ES2020);
      expect(options.options.strict).toBe(true);
      expect(options.missingTsConfig).toBe(false);
    });

    it('should resolve relative paths in options', () => {
      const json = { outDir: './dist', rootDir: './src' };
      const rootNames = ['/project/src/index.ts'];

      const options = createProgramOptionsFromJson(json, rootNames, '/project');

      expect(options.options.outDir).toBe('/project/dist');
      expect(options.options.rootDir).toBe('/project/src');
    });
  });
});
