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
import { normalizePath, normalizeToAbsolutePath } from '../../src/rules/helpers/index.js';
import {
  createProgramOptions,
  createProgramOptionsFromJson,
  defaultCompilerOptions,
  detectLibFromSignals,
  enrichProgramLib,
  esYearToLib,
  nodeVersionToEs,
  parseMaxNodeMajor,
  tsTargetToEsYear,
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

describe('tsTargetToEsYear', () => {
  it('should map ES3 and ES5 to 2020 (matches TypeScript lib.d.ts effective coverage)', () => {
    expect(tsTargetToEsYear(ts.ScriptTarget.ES3)).toBe(2020);
    expect(tsTargetToEsYear(ts.ScriptTarget.ES5)).toBe(2020);
  });

  it('should map ES2015–ES2023 to the corresponding year', () => {
    expect(tsTargetToEsYear(ts.ScriptTarget.ES2015)).toBe(2015);
    expect(tsTargetToEsYear(ts.ScriptTarget.ES2017)).toBe(2017);
    expect(tsTargetToEsYear(ts.ScriptTarget.ES2022)).toBe(2022);
    expect(tsTargetToEsYear(ts.ScriptTarget.ES2023)).toBe(2023);
  });

  it('should return null for ESNext (handled as esnext fallback)', () => {
    expect(tsTargetToEsYear(ts.ScriptTarget.ESNext)).toBeNull();
  });
});

describe('enrichProgramLib', () => {
  const baseDir = normalizeToAbsolutePath('/tmp');

  it('should leave lib unchanged when already set by tsconfig', () => {
    const programOptions = createProgramOptionsFromJson(
      { lib: ['es2020'] },
      [normalizeToAbsolutePath('/tmp/a.ts')],
      '/tmp',
    );
    const source = enrichProgramLib(programOptions, undefined, baseDir);
    expect(source).toBe('tsconfig.lib');
    // lib is still the tsconfig-set value (normalized by TypeScript)
    expect(programOptions.options.lib).toContain('lib.es2020.d.ts');
  });

  it('should use ecmaScriptVersion override when set, ignoring other signals', () => {
    // target=ES2023 would give ES2023, but ecmaScriptVersion=ES2022 wins
    const programOptions = createProgramOptionsFromJson(
      { target: 'ES2023' },
      [normalizeToAbsolutePath('/tmp/a.ts')],
      '/tmp',
    );
    const source = enrichProgramLib(programOptions, 'ES2022', baseDir);
    expect(source).toBe('sonar.javascript.ecmaScriptVersion');
    expect(programOptions.options.lib).toEqual(['lib.es2022.d.ts', 'lib.dom.d.ts']);
  });

  it('should use tsconfig target when it is the only signal', () => {
    const programOptions = createProgramOptionsFromJson(
      { target: 'ES2022' },
      [normalizeToAbsolutePath('/tmp/a.ts')],
      '/tmp',
    );
    const source = enrichProgramLib(programOptions, undefined, baseDir);
    expect(source).toBe('tsconfig.target');
    expect(programOptions.options.lib).toEqual(['lib.es2022.d.ts', 'lib.dom.d.ts']);
  });

  it('should map ES5 target to ES2020 (matching TypeScript lib.d.ts coverage)', () => {
    const programOptions = createProgramOptionsFromJson(
      { target: 'ES5' },
      [normalizeToAbsolutePath('/tmp/a.ts')],
      '/tmp',
    );
    const source = enrichProgramLib(programOptions, undefined, baseDir);
    expect(source).toBe('tsconfig.target');
    expect(programOptions.options.lib).toEqual(['lib.es2020.d.ts', 'lib.dom.d.ts']);
  });

  it('should take the maximum of target and node signals', () => {
    // target=ES2022 (2022) vs no node signal in /tmp → tsconfig.target wins
    const programOptions = createProgramOptionsFromJson(
      { target: 'ES2022' },
      [normalizeToAbsolutePath('/tmp/a.ts')],
      '/tmp',
    );
    const source = enrichProgramLib(programOptions, undefined, baseDir);
    expect(source).toBe('tsconfig.target');
    expect(programOptions.options.lib).toEqual(['lib.es2022.d.ts', 'lib.dom.d.ts']);
  });

  it('should fall back to esnext when no signals at all', () => {
    const programOptions = createProgramOptionsFromJson(
      {},
      [normalizeToAbsolutePath('/tmp/a.ts')],
      '/tmp',
    );
    const source = enrichProgramLib(programOptions, undefined, baseDir);
    expect(source).toBe('default');
    expect(programOptions.options.lib).toEqual(['lib.esnext.d.ts', 'lib.dom.d.ts']);
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

describe('esYearToLib', () => {
  it('should return normalized lib file names for an ES year', () => {
    expect(esYearToLib(2022)).toEqual(['lib.es2022.d.ts', 'lib.dom.d.ts']);
  });
});

describe('detectLibFromSignals', () => {
  it('should return lib from @types/node ^22', () => {
    expect(detectLibFromSignals(undefined, '^22.0.0')).toEqual(['lib.es2024.d.ts', 'lib.dom.d.ts']);
  });

  it('should return lib from engines.node >=18', () => {
    expect(detectLibFromSignals(undefined, '>=18')).toEqual(['lib.es2022.d.ts', 'lib.dom.d.ts']);
  });

  it('should use ecmaScriptVersion override over node signal', () => {
    expect(detectLibFromSignals('ES2023', '^18.0.0')).toEqual(['lib.es2023.d.ts', 'lib.dom.d.ts']);
  });

  it('should return null when @types/node is latest', () => {
    expect(detectLibFromSignals(undefined, 'latest')).toBeNull();
  });

  it('should return null when both signals are absent', () => {
    expect(detectLibFromSignals(undefined, null)).toBeNull();
  });

  it('should be case-insensitive for ecmaScriptVersion', () => {
    expect(detectLibFromSignals('es2022', null)).toEqual(['lib.es2022.d.ts', 'lib.dom.d.ts']);
  });

  it('should return null for invalid ecmaScriptVersion with no node signal', () => {
    expect(detectLibFromSignals('INVALID', null)).toBeNull();
  });
});
