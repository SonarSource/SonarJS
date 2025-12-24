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
import { beforeEach, describe, it, Mock } from 'node:test';
import {
  tsConfigStore,
  sourceFileStore,
  initFileStores,
} from '../../src/analysis/projectAnalysis/file-stores/index.js';
import { expect } from 'expect';
import { join, relative } from 'node:path/posix';
import { toUnixPath } from '../../src/rules/helpers/index.js';
import {
  setGlobalConfiguration,
  setTsConfigPaths,
} from '../../../shared/src/helpers/configuration.js';

const fixtures = join(toUnixPath(import.meta.dirname), 'fixtures-tsconfigs');

describe('tsconfigs', () => {
  beforeEach(() => {
    tsConfigStore.clearCache();
    sourceFileStore.clearCache();
  });

  it('should return the TSconfig files via lookup', async () => {
    setGlobalConfiguration({ baseDir: fixtures });
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
  });

  it('should validate the provided TSconfig files', async () => {
    setGlobalConfiguration({ baseDir: fixtures });
    await initFileStores(fixtures);
    setTsConfigPaths(
      tsConfigStore
        .getTsConfigs()
        .map(tsconfig => relative(fixtures, tsconfig))
        .concat('fake_dir/tsconfig.json'),
    );
    tsConfigStore.clearCache();
    await initFileStores(fixtures);
    // Should find at least the provided tsconfigs (excluding the fake one)
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
  });

  it('should work with absolute paths', async () => {
    setGlobalConfiguration({ baseDir: fixtures });
    await initFileStores(fixtures);
    const foundTsconfigs = tsConfigStore.getTsConfigs();
    setTsConfigPaths(foundTsconfigs);
    tsConfigStore.clearCache();
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
  });

  it('should prioritize provided paths over lookup', async () => {
    setGlobalConfiguration({ baseDir: fixtures });
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    setTsConfigPaths([relative(fixtures, tsConfigStore.getTsConfigs()[0])]);
    tsConfigStore.clearCache();
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toEqual(1);
  });

  it('should log when no tsconfigs are found with the provided property', async ({ mock }) => {
    mock.method(console, 'error');

    setGlobalConfiguration({ baseDir: fixtures, tsConfigPaths: ['tsconfig.fake.json'] });
    await initFileStores(fixtures);
    // Should fall back to lookup when provided paths don't exist
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);

    expect(
      (console.error as Mock<typeof console.error>).mock.calls.map(call => call.arguments[0]),
    ).toContain(
      `Failed to find any of the provided tsconfig.json files: ${join(fixtures, 'tsconfig.fake.json')}`,
    );
  });
});
