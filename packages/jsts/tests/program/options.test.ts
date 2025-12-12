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
  createProgramOptions,
  createProgramOptionsFromJson,
  defaultCompilerOptions,
} from '../../src/program/tsconfig/options.js';
import { clearProgramOptionsCache } from '../../src/program/cache/programOptionsCache.js';
import { clearTsConfigContentCache } from '../../src/program/cache/tsconfigCache.js';

const fixtures = path.join(toUnixPath(import.meta.dirname), 'fixtures');

describe('createProgramOptions', () => {
  beforeEach(() => {
    clearProgramOptionsCache();
    clearTsConfigContentCache();
  });

  describe('tsconfig parsing', () => {
    it('should parse tsconfig and return program options', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      const result = createProgramOptions(tsConfig);

      expect(result).toBeDefined();
      expect(result.rootNames).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.missingTsConfig).toBe(false);
    });

    it('should include files from tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      const result = createProgramOptions(tsConfig);

      expect(result.rootNames).toContain(path.join(fixtures, 'file.ts'));
    });

    it('should apply compiler options from tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_found.json');

      const { options, missingTsConfig } = createProgramOptions(tsConfig);

      expect(missingTsConfig).toBe(false);
      expect(options).toBeDefined();
      expect(options.target).toBe(ts.ScriptTarget.ES2020);
      expect(options.module).toBe(ts.ModuleKind.CommonJS);
    });

    it('should include Vue files', () => {
      const tsConfig = path.join(fixtures, 'vue', 'tsconfig.json');

      const result = createProgramOptions(tsConfig);

      expect(result.rootNames).toContain(path.join(fixtures, 'vue', 'file.vue'));
    });
  });

  describe('tsconfig with provided contents', () => {
    it('should parse provided tsconfig contents', () => {
      const result = createProgramOptions('tsconfig.json', '{ "files": ["/foo/file.ts"] }');

      expect(result).toMatchObject({
        rootNames: ['/foo/file.ts'],
        projectReferences: undefined,
      });
    });

    it('should parse project references from contents', () => {
      const result = createProgramOptions(
        'tsconfig.json',
        '{ "files": [], "references": [{ "path": "foo" }] }',
      );

      expect(result).toMatchObject({
        rootNames: [],
        projectReferences: [expect.objectContaining({ path: 'foo' })],
      });
    });
  });

  describe('error handling', () => {
    it('should throw on syntactically incorrect tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.syntax.json');

      expect(() => createProgramOptions(tsConfig)).toThrow();
    });

    it('should throw on semantically incorrect tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.semantic.json');

      expect(() => createProgramOptions(tsConfig)).toThrow(
        /^Unknown compiler option 'targetSomething'./,
      );
    });

    it('should throw on empty files list', () => {
      expect(() => createProgramOptions('tsconfig.json', '{ "files": [] }')).toThrow(
        `The 'files' list in config file 'tsconfig.json' is empty.`,
      );
    });
  });

  describe('missing extended tsconfig', () => {
    it('should still create options when extended tsconfig does not exist', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_missing.json');

      const result = createProgramOptions(tsConfig);

      expect(result).toBeDefined();
      expect(result.rootNames).toContain(path.join(fixtures, 'file.ts'));
      expect(result.missingTsConfig).toBe(true);
    });

    it('should generate compilerOptions on missing extended tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_missing.json');

      const programOptions = createProgramOptions(tsConfig);

      expect(programOptions.options).toEqual({
        configFilePath: path.join(fixtures, 'tsconfig_missing.json'),
        noEmit: true,
        allowNonTsExtensions: true,
      });
      expect(programOptions.missingTsConfig).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache program options', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      const result1 = createProgramOptions(tsConfig);
      const result2 = createProgramOptions(tsConfig);

      expect(result1).toBe(result2);
    });

    it('should use different cache entries for different tsconfig contents', () => {
      const result1 = createProgramOptions('tsconfig.json', '{ "files": ["/a.ts"] }');
      const result2 = createProgramOptions('tsconfig.json', '{ "files": ["/b.ts"] }');

      expect(result1).not.toBe(result2);
      expect(result1.rootNames).toEqual(['/a.ts']);
      expect(result2.rootNames).toEqual(['/b.ts']);
    });
  });
});

describe('createProgramOptionsFromJson', () => {
  it('should create program options from JSON', () => {
    const json = { target: 'ES2020', strict: true };
    const rootNames = ['/project/src/index.ts'];

    const result = createProgramOptionsFromJson(json, rootNames, '/project');

    expect(result.rootNames).toEqual(rootNames);
    expect(result.options.target).toBe(ts.ScriptTarget.ES2020);
    expect(result.options.strict).toBe(true);
    expect(result.missingTsConfig).toBe(false);
  });

  it('should resolve paths relative to baseDir', () => {
    const json = { outDir: './dist' };
    const rootNames = ['/project/src/index.ts'];

    const result = createProgramOptionsFromJson(json, rootNames, '/project');

    expect(result.options.outDir).toBe('/project/dist');
  });

  it('should handle empty options', () => {
    const rootNames = ['/project/src/index.ts'];

    const result = createProgramOptionsFromJson({}, rootNames, '/project');

    expect(result.rootNames).toEqual(rootNames);
    expect(result.missingTsConfig).toBe(false);
  });
});

describe('defaultCompilerOptions', () => {
  it('should have expected default values', () => {
    expect(defaultCompilerOptions.allowJs).toBe(true);
    expect(defaultCompilerOptions.noImplicitAny).toBe(true);
    expect(defaultCompilerOptions.lib).toEqual(['esnext', 'dom']);
  });
});
