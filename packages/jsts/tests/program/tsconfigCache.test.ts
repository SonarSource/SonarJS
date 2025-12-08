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
import {
  getCachedTsConfigContent,
  hasCachedTsConfig,
  setCachedTsConfigContent,
  clearTsConfigContentCache,
} from '../../src/program/cache/tsconfigCache.js';
import { clearFsCache } from '../../../shared/src/helpers/fs-cache.js';

describe('tsconfigCache', () => {
  beforeEach(() => {
    clearTsConfigContentCache();
    clearFsCache();
  });

  describe('getCachedTsConfigContent', () => {
    it('should allow storing and retrieving tsconfig contents', () => {
      const tsconfigPath = '/project/tsconfig.json';
      const contents = '{ "compilerOptions": { "target": "ES2020" } }';

      setCachedTsConfigContent(tsconfigPath, contents, false);

      const cached = getCachedTsConfigContent(tsconfigPath);
      expect(cached).toBeDefined();
      expect(cached?.contents).toBe(contents);
      expect(cached?.missing).toBe(false);
    });

    it('should track missing tsconfig files', () => {
      const tsconfigPath = '/project/node_modules/missing/tsconfig.json';

      setCachedTsConfigContent(tsconfigPath, '{}', true);

      const cached = getCachedTsConfigContent(tsconfigPath);
      expect(cached?.contents).toBe('{}');
      expect(cached?.missing).toBe(true);
    });

    it('should return undefined for uncached tsconfig', () => {
      expect(getCachedTsConfigContent('/project/uncached/tsconfig.json')).toBeUndefined();
    });
  });

  describe('hasCachedTsConfig', () => {
    it('should return true for cached tsconfig', () => {
      const tsconfigPath = '/project/tsconfig.json';
      setCachedTsConfigContent(tsconfigPath, '{}', false);

      expect(hasCachedTsConfig(tsconfigPath)).toBe(true);
    });

    it('should return true for missing-but-tracked tsconfig', () => {
      const tsconfigPath = '/project/missing/tsconfig.json';
      setCachedTsConfigContent(tsconfigPath, '{}', true);

      expect(hasCachedTsConfig(tsconfigPath)).toBe(true);
    });

    it('should return false for unknown tsconfig', () => {
      expect(hasCachedTsConfig('/project/unknown/tsconfig.json')).toBe(false);
    });
  });

  describe('clearTsConfigContentCache', () => {
    it('should clear all cached tsconfig contents', () => {
      setCachedTsConfigContent('/project/tsconfig.json', '{}', false);
      setCachedTsConfigContent('/project/packages/a/tsconfig.json', '{}', true);

      expect(getCachedTsConfigContent('/project/tsconfig.json')).toBeDefined();
      expect(getCachedTsConfigContent('/project/packages/a/tsconfig.json')).toBeDefined();

      clearTsConfigContentCache();
      clearFsCache(); // Also clear FsCache since content is stored there

      expect(getCachedTsConfigContent('/project/tsconfig.json')).toBeUndefined();
      expect(getCachedTsConfigContent('/project/packages/a/tsconfig.json')).toBeUndefined();
    });

    it('should handle clearing empty cache', () => {
      // Should not throw
      clearTsConfigContentCache();

      expect(getCachedTsConfigContent('/project/tsconfig.json')).toBeUndefined();
    });
  });
});
