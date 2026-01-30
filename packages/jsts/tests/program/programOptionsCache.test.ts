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
import { normalizePath } from '../../src/rules/helpers/index.js';
import {
  getCachedProgramOptions,
  setCachedProgramOptions,
  clearProgramOptionsCache,
} from '../../src/program/cache/programOptionsCache.js';
import { createProgramOptions } from '../../src/program/tsconfig/options.js';
import { clearTsConfigContentCache } from '../../src/program/cache/tsconfigCache.js';

const fixtures = path.join(normalizePath(import.meta.dirname), 'fixtures');

describe('programOptionsCache', () => {
  beforeEach(() => {
    clearProgramOptionsCache();
    clearTsConfigContentCache();
  });

  describe('getCachedProgramOptions', () => {
    it('should return undefined for cache miss', () => {
      const result = getCachedProgramOptions('/project/tsconfig.json');
      expect(result).toBeUndefined();
    });

    it('should return cached options for cache hit', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const options = createProgramOptions(tsConfig);

      setCachedProgramOptions(tsConfig, options, 'custom');
      const result = getCachedProgramOptions(tsConfig, 'custom');

      expect(result).toBe(options);
    });
  });

  describe('setCachedProgramOptions', () => {
    it('should store options in cache', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const options = createProgramOptions(tsConfig);

      setCachedProgramOptions(tsConfig, options, 'custom');

      expect(getCachedProgramOptions(tsConfig, 'custom')).toBe(options);
    });

    it('should handle different cache keys for same tsconfig with different contents', () => {
      const tsConfig = path.join(fixtures, 'tsconfig.json');
      const options1 = createProgramOptions(tsConfig);

      clearProgramOptionsCache();
      clearTsConfigContentCache();

      const options2 = createProgramOptions(tsConfig);

      setCachedProgramOptions(tsConfig, options1, 'content1');
      setCachedProgramOptions(tsConfig, options2, 'content2');

      expect(getCachedProgramOptions(tsConfig, 'content1')).toBe(options1);
      expect(getCachedProgramOptions(tsConfig, 'content2')).toBe(options2);
    });

    it('should overwrite existing cache entry', () => {
      const tsConfig1 = path.join(fixtures, 'tsconfig.json');
      const tsConfig2 = path.join(fixtures, 'tsconfig_found.json');
      const options1 = createProgramOptions(tsConfig1);

      clearProgramOptionsCache();
      clearTsConfigContentCache();

      const options2 = createProgramOptions(tsConfig2);

      setCachedProgramOptions('shared-key', options1);
      setCachedProgramOptions('shared-key', options2);

      expect(getCachedProgramOptions('shared-key')).toBe(options2);
    });
  });

  describe('clearProgramOptionsCache', () => {
    it('should clear all cached options', () => {
      const tsConfig1 = path.join(fixtures, 'tsconfig.json');
      const tsConfig2 = path.join(fixtures, 'tsconfig_found.json');
      const options1 = createProgramOptions(tsConfig1);

      clearProgramOptionsCache();
      clearTsConfigContentCache();

      const options2 = createProgramOptions(tsConfig2);

      setCachedProgramOptions('key1', options1);
      setCachedProgramOptions('key2', options2);

      expect(getCachedProgramOptions('key1')).toBeDefined();
      expect(getCachedProgramOptions('key2')).toBeDefined();

      clearProgramOptionsCache();

      expect(getCachedProgramOptions('key1')).toBeUndefined();
      expect(getCachedProgramOptions('key2')).toBeUndefined();
    });

    it('should handle clearing empty cache', () => {
      // Should not throw
      clearProgramOptionsCache();
      expect(getCachedProgramOptions('any-key')).toBeUndefined();
    });
  });
});
