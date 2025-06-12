/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { basename, join, relative } from 'node:path/posix';
import { toUnixPath } from '../../src/rules/index.js';
import { readFile } from 'node:fs/promises';
import {
  setGlobalConfiguration,
  setTsConfigPaths,
} from '../../../shared/src/helpers/configuration.js';
import { Cache } from '../../src/analysis/projectAnalysis/tsconfigCache.js';
import { UNINITIALIZED_ERROR } from '../../src/analysis/projectAnalysis/file-stores/tsconfigs.js';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('tsconfigs', () => {
  beforeEach(() => {
    tsConfigStore.clearTsConfigCache();
    sourceFileStore.clearCache();
  });
  it('should crash getting or querying tsconfig cache before initializing', async () => {
    expect(() => tsConfigStore.getTsConfigs()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(() => tsConfigStore.getCurrentCache()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(() => tsConfigStore.getTsConfigForInputFile('anyfile')).toThrow(
      new Error(UNINITIALIZED_ERROR),
    );
  });

  it('should return the TSconfig files', async () => {
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    expect(tsConfigStore.getCacheOrigin()).toEqual('lookup');
  });

  it('should validate the provided TSconfig files', async () => {
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

  it('when no tsconfigs, in SonarLint should generate tsconfig with wildcard', async () => {
    setGlobalConfiguration({ sonarlint: true });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await initFileStores(baseDir);
    const tsconfig = tsConfigStore.getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      include: [`${baseDir}/**/*`],
    });
    expect(tsConfigStore.getCacheOrigin()).toEqual('fallback');
  });

  it('when no tsconfigs, in SonarQube should generate tsconfig with all files', async () => {
    setGlobalConfiguration({ sonarlint: false });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await initFileStores(baseDir);
    const tsconfig = tsConfigStore.getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      files: [`${baseDir}/file.ts`, `${baseDir}/string42.ts`],
    });
    expect(tsConfigStore.getCacheOrigin()).toEqual('fallback');
  });

  it('should not generate tsconfig file when too many files', async () => {
    setGlobalConfiguration({ sonarlint: true, maxFilesForTypeChecking: 1 });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await initFileStores(baseDir);
    const tsconfig = tsConfigStore.getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(tsconfig).toEqual(null);
  });

  it('should not generate tsconfig file if there is already at least one', async () => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    await initFileStores(baseDir);
    const tsconfig = tsConfigStore.getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(tsConfigStore.getTsConfigs()).toEqual([tsconfig]);
  });

  it('should use the cache', async ({ mock }) => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    await initFileStores(baseDir);
    mock.method(tsConfigStore.getCurrentCache(), 'getTsConfigMapForInputFile');
    const findTsConfigMock = (
      tsConfigStore.getCurrentCache().getTsConfigMapForInputFile as Mock<
        Cache['getTsConfigMapForInputFile']
      >
    ).mock;
    expect(findTsConfigMock.callCount()).toEqual(0);
    tsConfigStore.getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(findTsConfigMock.callCount()).toEqual(1);
    tsConfigStore.getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(findTsConfigMock.callCount()).toEqual(1);
  });

  it('should clear file to tsconfig map', async ({ mock }) => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    const file = toUnixPath(join(baseDir, 'file.ts'));
    await initFileStores(baseDir);
    expect(tsConfigStore.isInitialized(baseDir)).toEqual(true);

    mock.method(tsConfigStore.getCurrentCache(), 'getTsConfigMapForInputFile');
    const findTsConfigMock = (
      tsConfigStore.getCurrentCache().getTsConfigMapForInputFile as Mock<
        Cache['getTsConfigMapForInputFile']
      >
    ).mock;
    mock.method(tsConfigStore.getCurrentCache(), 'clearFileToTsConfigCache');
    const clearTsConfigMapMock = (
      tsConfigStore.getCurrentCache().clearFileToTsConfigCache as Mock<
        Cache['clearFileToTsConfigCache']
      >
    ).mock;
    mock.method(tsConfigStore.getCurrentCache(), 'clearAll');
    const clearAll = (tsConfigStore.getCurrentCache().clearAll as Mock<Cache['clearAll']>).mock;

    expect(findTsConfigMock.callCount()).toEqual(0);
    tsConfigStore.getTsConfigForInputFile(file);
    expect(findTsConfigMock.callCount()).toEqual(1);

    // we create a file event
    setGlobalConfiguration({ fsEvents: { [toUnixPath(join(baseDir, 'file2.ts'))]: 'CREATED' } });
    // clear map has not been called yet
    expect(clearTsConfigMapMock.callCount()).toEqual(0);
    tsConfigStore.dirtyCachesIfNeeded(baseDir);
    expect(clearTsConfigMapMock.callCount()).toEqual(1);
    // but we do not clear the whole cache
    expect(clearAll.callCount()).toEqual(0);
    tsConfigStore.getTsConfigForInputFile(file);
    // the map has been cleared, so we have called find again
    expect(findTsConfigMock.callCount()).toEqual(2);
  });

  it('should clear tsconfig cache', async ({ mock }) => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    await initFileStores(baseDir);
    expect(tsConfigStore.isInitialized(baseDir)).toEqual(true);

    mock.method(tsConfigStore.getCurrentCache(), 'clearFileToTsConfigCache');
    const clearTsConfigMapMock = (
      tsConfigStore.getCurrentCache().clearFileToTsConfigCache as Mock<
        Cache['clearFileToTsConfigCache']
      >
    ).mock;
    mock.method(tsConfigStore.getCurrentCache(), 'clearAll');
    const clearAll = (tsConfigStore.getCurrentCache().clearAll as Mock<Cache['clearAll']>).mock;

    // we create a file event
    setGlobalConfiguration({ fsEvents: { [tsConfigStore.getTsConfigs()[0]]: 'CREATED' } });
    // clear map has not been called yet
    expect(clearTsConfigMapMock.callCount()).toEqual(0);
    expect(clearAll.callCount()).toEqual(0);
    tsConfigStore.dirtyCachesIfNeeded(baseDir);
    expect(clearTsConfigMapMock.callCount()).toEqual(1);
    expect(clearAll.callCount()).toEqual(1);
  });

  it('should change to property of TsConfig files when provided', async () => {
    await initFileStores(fixtures);
    expect(tsConfigStore.getCacheOrigin()).toEqual('lookup');
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    setTsConfigPaths([relative(fixtures, tsConfigStore.getTsConfigs()[0])]);
    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toEqual(1);
    expect(tsConfigStore.getCacheOrigin()).toEqual('property');
  });

  it('should log when no tsconfigs are found with the provided property', async ({ mock }) => {
    setTsConfigPaths(['tsconfig.fake.json']);
    mock.method(console, 'error');

    await initFileStores(fixtures);
    expect(tsConfigStore.getTsConfigs().length).toBeGreaterThanOrEqual(3);
    expect(tsConfigStore.getCacheOrigin()).toEqual('lookup');

    expect(
      (console.error as Mock<typeof console.error>).mock.calls.map(call => call.arguments[0]),
    ).toContain('Failed to find any of the provided tsconfig.json files: tsconfig.fake.json');
  });
});
