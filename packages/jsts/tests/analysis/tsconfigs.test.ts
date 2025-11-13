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
import { readFile } from 'node:fs/promises';
import {
  setGlobalConfiguration,
  setTsConfigPaths,
} from '../../../shared/src/helpers/configuration.js';
import { UNINITIALIZED_ERROR } from '../../src/analysis/projectAnalysis/file-stores/tsconfigs.js';

const fixtures = join(toUnixPath(import.meta.dirname), 'fixtures');

describe('tsconfigs', () => {
  beforeEach(() => {
    tsConfigStore.clearTsConfigCache();
    sourceFileStore.clearCache();
  });
  it('should crash getting or querying tsconfig cache before initializing', async () => {
    expect(() => tsConfigStore.getTsConfigs()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(() => tsConfigStore.getCurrentCache()).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the TSconfig files', async () => {
    setGlobalConfiguration({ baseDir: fixtures });
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    expect(tsConfigStore.getCacheOrigin()).toEqual('lookup');
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
    tsConfigStore.clearTsConfigCache();
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    expect(tsConfigStore.getCacheOrigin()).toEqual('property');
  });

  it('should work with absolute paths', async () => {
    setGlobalConfiguration({ baseDir: fixtures });
    await initFileStores(fixtures);
    setTsConfigPaths(tsConfigStore.getTsConfigs());
    tsConfigStore.clearTsConfigCache();
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    expect(tsConfigStore.getCacheOrigin()).toEqual('property');
  });

  it('should write tsconfig file', async () => {
    const { filename } = await tsConfigStore.writeTSConfigFile({
      compilerOptions: { allowJs: true, noImplicitAny: true },
      include: ['/path/to/project/**/*'],
    });
    const content = await readFile(filename, { encoding: 'utf-8' });
    expect(content).toBe(
      '{"compilerOptions":{"allowJs":true,"noImplicitAny":true},"include":["/path/to/project/**/*"]}',
    );
  });

  it('should change to property of TsConfig files when provided', async () => {
    setGlobalConfiguration({ baseDir: fixtures });
    await initFileStores(fixtures);
    expect(tsConfigStore.getCacheOrigin()).toEqual('lookup');
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    setTsConfigPaths([relative(fixtures, tsConfigStore.getTsConfigs()[0])]);
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toEqual(1);
    expect(tsConfigStore.getCacheOrigin()).toEqual('property');
  });

  it('should log when no tsconfigs are found with the provided property', async ({ mock }) => {
    mock.method(console, 'error');

    setGlobalConfiguration({ baseDir: fixtures, tsConfigPaths: ['tsconfig.fake.json'] });
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    expect(tsConfigStore.getCacheOrigin()).toEqual('lookup');

    expect(
      (console.error as Mock<typeof console.error>).mock.calls.map(call => call.arguments[0]),
    ).toContain(
      `Failed to find any of the provided tsconfig.json files: ${join(fixtures, 'tsconfig.fake.json')}`,
    );
  });
});
