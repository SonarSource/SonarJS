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
import { normalizePath, normalizeToAbsolutePath } from '../../src/rules/helpers/files.js';
import {
  computeLibJson,
  createProgramOptions,
  createProgramOptionsFromJson,
  defaultCompilerOptions,
  esLibToYear,
  nodeVersionToEs,
  parseMaxNodeMajor,
} from '../../src/program/tsconfig/options.js';
import { clearProgramOptionsCache } from '../../src/program/cache/programOptionsCache.js';
import { clearTsConfigContentCache } from '../../src/program/cache/tsconfigCache.js';

const fixtures = normalizeToAbsolutePath(path.join(normalizePath(import.meta.dirname), 'fixtures'));

describe('createProgramOptions', () => {
  beforeEach(() => {
    clearProgramOptionsCache();
    clearTsConfigContentCache();
  });

  describe('tsconfig parsing', () => {
    it('should parse tsconfig and return program options', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      const result = createProgramOptions(tsConfig, undefined, true);

      expect(result).toBeDefined();
      expect(result.rootNames).toBeDefined();
      expect(result.options).toBeDefined();
      expect(result.missingTsConfig).toBe(false);
    });

    it('should include files from tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      const result = createProgramOptions(tsConfig, undefined, true);

      expect(result.rootNames).toContain(path.join(fixtures, 'file.ts'));
    });

    it('should apply compiler options from tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_found.json');

      const { options, missingTsConfig } = createProgramOptions(tsConfig, undefined, true);

      expect(missingTsConfig).toBe(false);
      expect(options).toBeDefined();
      expect(options.target).toBe(ts.ScriptTarget.ES2020);
      expect(options.module).toBe(ts.ModuleKind.CommonJS);
    });

    it('should include Vue files', () => {
      const tsConfig = path.join(fixtures, 'vue', 'tsconfig.json');

      const result = createProgramOptions(tsConfig, undefined, true);

      expect(result.rootNames).toContain(path.join(fixtures, 'vue', 'file.vue'));
    });
  });

  describe('tsconfig with provided contents', () => {
    it('should parse provided tsconfig contents', () => {
      const result = createProgramOptions('tsconfig.json', '{ "files": ["/foo/file.ts"] }', true);

      expect(result).toMatchObject({
        rootNames: ['/foo/file.ts'],
        projectReferences: undefined,
      });
    });

    it('should parse project references from contents', () => {
      const result = createProgramOptions(
        'tsconfig.json',
        '{ "files": [], "references": [{ "path": "foo" }] }',
        true,
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

      expect(() => createProgramOptions(tsConfig, undefined, true)).toThrow();
    });

    it('should throw on semantically incorrect tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.semantic.json');

      expect(() => createProgramOptions(tsConfig, undefined, true)).toThrow(
        /^Unknown compiler option 'targetSomething'./,
      );
    });

    it('should throw on empty files list', () => {
      expect(() => createProgramOptions('tsconfig.json', '{ "files": [] }', true)).toThrow(
        `The 'files' list in config file 'tsconfig.json' is empty.`,
      );
    });
  });

  describe('missing extended tsconfig', () => {
    it('should still create options when extended tsconfig does not exist', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_missing.json');

      const result = createProgramOptions(tsConfig, undefined, true);

      expect(result).toBeDefined();
      expect(result.rootNames).toContain(path.join(fixtures, 'file.ts'));
      expect(result.missingTsConfig).toBe(true);
    });

    it('should generate compilerOptions on missing extended tsconfig', () => {
      const tsConfig = path.join(fixtures, 'tsconfig_missing.json');

      const programOptions = createProgramOptions(tsConfig, undefined, true);

      expect(programOptions.options).toEqual({
        configFilePath: path.join(fixtures, 'tsconfig_missing.json'),
        noEmit: true,
        allowNonTsExtensions: true,
      });
      expect(programOptions.missingTsConfig).toBe(true);
    });
  });

  describe('lib enrichment', () => {
    const nodeSignalsBaseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures/node-signals'),
    );

    it('should enrich lib from node signals when tsconfig has no lib', () => {
      // tsconfig with target but no lib, no extends — node signal should be applied
      const { options } = createProgramOptions(
        'tsconfig.json',
        '{ "compilerOptions": { "target": "ES5" }, "files": ["/tmp/a.ts"] }',
        true,
        undefined,
        nodeSignalsBaseDir,
      );

      // @types/node ^18 → ES2022; target ES5 → ES2020; max = ES2022
      expect(options.lib).toBeDefined();
      expect(options.lib!.some(l => l.includes('es2022'))).toBe(true);
    });

    it('should respect lib inherited from extended tsconfig, not overwrite with computed value', () => {
      const tsConfig = path.join(fixtures, 'lib-inheritance', 'tsconfig.child.json');

      // node-signals would give ES2022, but parent sets ['esnext','dom','dom.iterable']
      const { options } = createProgramOptions(
        tsConfig,
        undefined,
        true,
        undefined,
        nodeSignalsBaseDir,
      );

      // Inherited lib must be preserved — esnext and dom.iterable must survive
      expect(options.lib!.some(l => l.includes('esnext'))).toBe(true);
      expect(options.lib!.some(l => l.includes('dom.iterable'))).toBe(true);
    });

    it('should not overwrite lib set directly in tsconfig', () => {
      // tsconfig with explicit lib: ['es5'] — node signal (ES2022) must not override it
      const { options } = createProgramOptions(
        'tsconfig.json',
        '{ "compilerOptions": { "lib": ["es5"] }, "files": ["/tmp/a.ts"] }',
        true,
        undefined,
        nodeSignalsBaseDir,
      );

      expect(options.lib!.some(l => l.includes('es5'))).toBe(true);
      expect(options.lib!.some(l => l.includes('es2022'))).toBe(false);
    });
  });

  describe('caching', () => {
    it('should cache program options', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');

      const result1 = createProgramOptions(tsConfig, undefined, true);
      const result2 = createProgramOptions(tsConfig, undefined, true);

      expect(result1).toBe(result2);
    });

    it('should use different cache entries for different tsconfig contents', () => {
      const result1 = createProgramOptions('tsconfig.json', '{ "files": ["/a.ts"] }', true);
      const result2 = createProgramOptions('tsconfig.json', '{ "files": ["/b.ts"] }', true);

      expect(result1).not.toBe(result2);
      expect(result1.rootNames).toEqual(['/a.ts']);
      expect(result2.rootNames).toEqual(['/b.ts']);
    });
  });
});

describe('createProgramOptionsFromJson', () => {
  it('should create program options from JSON', () => {
    const json = { target: 'ES2020', strict: true };
    const rootNames = [normalizeToAbsolutePath('/project/src/index.ts')];

    const result = createProgramOptionsFromJson(json, rootNames, '/project');

    expect(result.rootNames).toEqual(rootNames);
    expect(result.options.target).toBe(ts.ScriptTarget.ES2020);
    expect(result.options.strict).toBe(true);
    expect(result.missingTsConfig).toBe(false);
  });

  it('should resolve paths relative to baseDir', () => {
    const json = { outDir: './dist' };
    const rootNames = [normalizeToAbsolutePath('/project/src/index.ts')];

    const result = createProgramOptionsFromJson(json, rootNames, '/project');

    expect(result.options.outDir).toBe('/project/dist');
  });

  it('should handle empty options', () => {
    const rootNames = [normalizeToAbsolutePath('/project/src/index.ts')];

    const result = createProgramOptionsFromJson({}, rootNames, '/project');

    expect(result.rootNames).toEqual(rootNames);
    expect(result.missingTsConfig).toBe(false);
  });
});

describe('defaultCompilerOptions', () => {
  it('should have expected default values', () => {
    expect(defaultCompilerOptions.allowJs).toBe(true);
    expect(defaultCompilerOptions.noImplicitAny).toBe(true);
    expect(defaultCompilerOptions.lib).toBeUndefined();
  });
});

describe('computeLibJson', () => {
  const baseDir = normalizeToAbsolutePath('/tmp');

  it('should use ecmaScriptVersion override, ignoring other signals', () => {
    // target=ES2023 would give ES2023, but ecmaScriptVersion=ES2022 wins
    expect(computeLibJson('ES2022', 'ES2023', baseDir)).toEqual(['es2022', 'dom']);
  });

  it('should be case-insensitive for ecmaScriptVersion', () => {
    expect(computeLibJson('es2022', undefined, baseDir)).toEqual(['es2022', 'dom']);
  });

  it('should use tsconfig target string when it is the only signal', () => {
    expect(computeLibJson(undefined, 'ES2022', baseDir)).toEqual(['es2022', 'dom']);
  });

  it('should map ES3 and ES5 targets to ES2020', () => {
    expect(computeLibJson(undefined, 'ES3', baseDir)).toEqual(['es2020', 'dom']);
    expect(computeLibJson(undefined, 'ES5', baseDir)).toEqual(['es2020', 'dom']);
  });

  it('should return esnext for ESNext target with no node signals', () => {
    expect(computeLibJson(undefined, 'ESNext', baseDir)).toEqual(['esnext', 'dom']);
  });

  it('should fall back to esnext when no signals at all', () => {
    expect(computeLibJson(undefined, undefined, baseDir)).toEqual(['esnext', 'dom']);
  });

  it('should take the maximum of target and node signals', () => {
    // target=ES2020, node signal from package.json gives ES2022 → ES2022 wins
    // We use the fixtures dir which has a package.json with @types/node ^18 → ES2022
    const fixturesBaseDir = normalizeToAbsolutePath(
      path.join(import.meta.dirname, 'fixtures/node-signals'),
    );
    expect(computeLibJson(undefined, 'ES2020', fixturesBaseDir)).toEqual(['es2022', 'dom']);
  });
});

describe('parseMaxNodeMajor', () => {
  it('should return the highest major from a simple version', () => {
    expect(parseMaxNodeMajor('18.0.0')).toBe(18);
  });

  it('should handle caret ranges', () => {
    expect(parseMaxNodeMajor('^18')).toBe(18);
    expect(parseMaxNodeMajor('^18.0.0')).toBe(18);
  });

  it('should handle >= ranges', () => {
    expect(parseMaxNodeMajor('>=16.0.0')).toBe(16);
  });

  it('should handle x-ranges', () => {
    expect(parseMaxNodeMajor('14.x')).toBe(14);
  });

  it('should return the highest version from OR ranges', () => {
    expect(parseMaxNodeMajor('>=16 || >=18')).toBe(18);
    expect(parseMaxNodeMajor('>=16 || >=18 || 22')).toBe(22);
  });

  it('should return null for wildcard', () => {
    expect(parseMaxNodeMajor('*')).toBeNull();
  });

  it('should return null for latest', () => {
    expect(parseMaxNodeMajor('latest')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseMaxNodeMajor('')).toBeNull();
  });

  it('should ignore versions below 8', () => {
    expect(parseMaxNodeMajor('6.0.0')).toBeNull();
  });
});

describe('nodeVersionToEs', () => {
  it('should map Node 22 to ES2024', () => {
    expect(nodeVersionToEs(22)).toBe(2024);
  });

  it('should map Node 18 to ES2022', () => {
    expect(nodeVersionToEs(18)).toBe(2022);
  });

  it('should map Node 16 to ES2021', () => {
    expect(nodeVersionToEs(16)).toBe(2021);
  });

  it('should map unknown high version to most recent ES year', () => {
    expect(nodeVersionToEs(99)).toBe(2024);
  });

  it('should map Node 8 to ES2017', () => {
    expect(nodeVersionToEs(8)).toBe(2017);
  });
});

describe('esLibToYear', () => {
  it('should extract the year from a normalized lib array', () => {
    expect(esLibToYear(['lib.es2022.d.ts', 'lib.dom.d.ts'])).toBe(2022);
    expect(esLibToYear(['lib.es2015.d.ts', 'lib.dom.d.ts'])).toBe(2015);
  });

  it('should return the maximum year when multiple year libs are present', () => {
    // e.g. a tsconfig with lib: ['es2015', 'es2017', 'es2019'] — max is 2019
    expect(esLibToYear(['lib.es2015.d.ts', 'lib.es2017.d.ts', 'lib.es2019.d.ts'])).toBe(2019);
  });

  it('should return null for esnext lib (no restriction)', () => {
    expect(esLibToYear(['lib.esnext.d.ts', 'lib.dom.d.ts'])).toBeNull();
  });

  it('should return null when esnext is mixed with year libs', () => {
    // esnext wins — merged programs can combine e.g. [es2020, esnext]
    expect(esLibToYear(['lib.es2020.d.ts', 'lib.dom.d.ts', 'lib.esnext.d.ts'])).toBeNull();
  });

  it('should return null for undefined lib', () => {
    expect(esLibToYear(undefined)).toBeNull();
  });

  it('should return null for empty lib array', () => {
    expect(esLibToYear([])).toBeNull();
  });
});
