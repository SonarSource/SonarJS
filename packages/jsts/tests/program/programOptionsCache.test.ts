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
import { clearProgramOptionsCache, getProgramOptionsCacheStats } from '../../src/program/index.js';
import {
  createProgramOptionsCacheKey,
  createParsedConfigCacheKey,
} from '../../src/program/cache/programOptionsCache.js';

describe('Program Options Cache', () => {
  beforeEach(() => {
    clearProgramOptionsCache();
  });

  it('should create unique cache keys for createProgramOptions', () => {
    const key1 = createProgramOptionsCacheKey('/path/to/tsconfig.json');
    const key2 = createProgramOptionsCacheKey('/path/to/tsconfig.json');
    const key3 = createProgramOptionsCacheKey('/path/to/other.json');
    const key4 = createProgramOptionsCacheKey('/path/to/tsconfig.json', '{"compilerOptions":{}}');
    const key5 = createProgramOptionsCacheKey(
      '/path/to/tsconfig.json',
      '{"compilerOptions":{"target":"ES2020"}}',
    );

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).not.toBe(key4);
    expect(key4).not.toBe(key5);
  });

  it('should create cache keys for createProgramOptionsFromParsedConfig', () => {
    const config1 = { compilerOptions: { target: 'ES2020' } };
    const config2 = { compilerOptions: { target: 'ES2020' } };
    const config3 = { compilerOptions: { target: 'ES5' } };

    const key1 = createParsedConfigCacheKey(config1, '/base', {});
    const key2 = createParsedConfigCacheKey(config2, '/base', {});
    const key3 = createParsedConfigCacheKey(config3, '/base', {});
    const key4 = createParsedConfigCacheKey(config1, '/other', {});
    const key5 = createParsedConfigCacheKey(config1, '/base', { noEmit: true });

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).not.toBe(key4);
    expect(key1).not.toBe(key5);
  });

  it('should track cache statistics', () => {
    const stats1 = getProgramOptionsCacheStats();
    expect(stats1.programOptionsCache.size).toBe(0);
    expect(stats1.parsedConfigCache.size).toBe(0);

    // Note: We can't easily test the cache being populated without
    // actually calling createProgramOptions or createProgramOptionsFromParsedConfig,
    // which require real file system access. This test just verifies the API works.
  });

  it('should clear caches', () => {
    clearProgramOptionsCache();
    const stats = getProgramOptionsCacheStats();
    expect(stats.programOptionsCache.size).toBe(0);
    expect(stats.parsedConfigCache.size).toBe(0);
  });
});
