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
  getTsConfigContentCache,
  clearTsConfigContentCache,
} from '../../src/program/cache/tsconfigCache.js';

describe('tsconfigCache', () => {
  beforeEach(() => {
    clearTsConfigContentCache();
  });

  describe('getTsConfigContentCache', () => {
    it('should return the same cache instance', () => {
      const cache1 = getTsConfigContentCache();
      const cache2 = getTsConfigContentCache();
      expect(cache1).toBe(cache2);
    });

    it('should allow storing and retrieving tsconfig contents', () => {
      const cache = getTsConfigContentCache();
      const tsconfigPath = '/project/tsconfig.json';
      const contents = '{ "compilerOptions": { "target": "ES2020" } }';

      cache.set(tsconfigPath, { contents, missing: false });

      const cached = cache.get(tsconfigPath);
      expect(cached).toBeDefined();
      expect(cached?.contents).toBe(contents);
      expect(cached?.missing).toBe(false);
    });

    it('should track missing tsconfig files', () => {
      const cache = getTsConfigContentCache();
      const tsconfigPath = '/project/node_modules/missing/tsconfig.json';

      cache.set(tsconfigPath, { contents: '{}', missing: true });

      const cached = cache.get(tsconfigPath);
      expect(cached?.missing).toBe(true);
    });

    it('should return undefined for uncached tsconfig', () => {
      const cache = getTsConfigContentCache();
      expect(cache.get('/project/uncached/tsconfig.json')).toBeUndefined();
    });
  });

  describe('clearTsConfigContentCache', () => {
    it('should clear all cached tsconfig contents', () => {
      const cache = getTsConfigContentCache();

      cache.set('/project/tsconfig.json', { contents: '{}', missing: false });
      cache.set('/project/packages/a/tsconfig.json', { contents: '{}', missing: false });

      expect(cache.size).toBe(2);

      clearTsConfigContentCache();

      expect(cache.size).toBe(0);
      expect(cache.get('/project/tsconfig.json')).toBeUndefined();
    });

    it('should handle clearing empty cache', () => {
      // Should not throw
      clearTsConfigContentCache();

      const cache = getTsConfigContentCache();
      expect(cache.size).toBe(0);
    });
  });
});
