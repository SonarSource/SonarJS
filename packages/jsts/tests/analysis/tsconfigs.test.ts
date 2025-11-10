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
import { basename, join, relative } from 'node:path/posix';
import { toUnixPath } from '../../src/rules/helpers/index.js';
import { readFile } from 'node:fs/promises';
import {
  setGlobalConfiguration,
  setTsConfigPaths,
} from '../../../shared/src/helpers/configuration.js';
import { Cache } from '../../src/analysis/projectAnalysis/tsconfigCache.js';
import { UNINITIALIZED_ERROR } from '../../src/analysis/projectAnalysis/file-stores/tsconfigs.js';
import assert from 'node:assert';

const fixtures = join(toUnixPath(import.meta.dirname), 'fixtures');

describe('tsconfigs', () => {
  beforeEach(() => {
    tsConfigStore.clearTsConfigCache();
    sourceFileStore.clearCache();
  });
  it('should crash getting or querying tsconfig cache before initializing', async () => {
    expect(() => tsConfigStore.getTsConfigs()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(() => tsConfigStore.getCurrentCache()).toThrow(new Error(UNINITIALIZED_ERROR));
    await expect(
      async () => await tsConfigStore.getTsConfigForInputFile('anyfile'),
    ).rejects.toThrow(new Error(UNINITIALIZED_ERROR));
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

  it('when no tsconfigs, in SonarLint should generate tsconfig with wildcard', async () => {
    const baseDir = join(fixtures, 'module');
    setGlobalConfiguration({ sonarlint: true, baseDir });
    await initFileStores(baseDir);
    const tsconfig = await tsConfigStore.getTsConfigForInputFile(join(baseDir, 'file.ts'));
    assert.ok(tsconfig);
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
    const baseDir = join(fixtures, 'module');
    setGlobalConfiguration({ sonarlint: false, baseDir });
    await initFileStores(baseDir);
    const tsconfig = await tsConfigStore.getTsConfigForInputFile(join(baseDir, 'file.ts'));
    assert.ok(tsconfig);
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      files: expect.arrayContaining([`${baseDir}/file.ts`, `${baseDir}/string42.ts`]),
    });
    expect(tsConfigStore.getCacheOrigin()).toEqual('fallback');
  });

  it('should not generate tsconfig file when too many files', async () => {
    const baseDir = join(fixtures, 'module');
    setGlobalConfiguration({ sonarlint: true, maxFilesForTypeChecking: 1, baseDir });
    await initFileStores(baseDir);
    const tsconfig = await tsConfigStore.getTsConfigForInputFile(join(baseDir, 'file.ts'));
    expect(tsconfig).toEqual(null);
  });

  it('should not generate tsconfig file if there is already at least one', async () => {
    const baseDir = join(fixtures, 'paths');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    const tsconfig = await tsConfigStore.getTsConfigForInputFile(join(baseDir, 'file.ts'));
    expect(tsConfigStore.getTsConfigs()).toEqual([tsconfig]);
  });

  it('should use the cache', async ({ mock }) => {
    const baseDir = join(fixtures, 'paths');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    mock.method(tsConfigStore.getCurrentCache(), 'getTsConfigMapForInputFile');
    const findTsConfigMock = (
      tsConfigStore.getCurrentCache().getTsConfigMapForInputFile as Mock<
        Cache['getTsConfigMapForInputFile']
      >
    ).mock;
    expect(findTsConfigMock.callCount()).toEqual(0);
    await tsConfigStore.getTsConfigForInputFile(join(baseDir, 'file.ts'));
    expect(findTsConfigMock.callCount()).toEqual(1);
    await tsConfigStore.getTsConfigForInputFile(join(baseDir, 'file.ts'));
    expect(findTsConfigMock.callCount()).toEqual(1);
  });

  it('should clear file to tsconfig map', async ({ mock }) => {
    const baseDir = join(fixtures, 'paths');
    setGlobalConfiguration({ baseDir });
    const file = join(baseDir, 'file.ts');
    await initFileStores(baseDir);
    expect(await tsConfigStore.isInitialized(baseDir)).toEqual(true);

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
    await tsConfigStore.getTsConfigForInputFile(file);
    expect(findTsConfigMock.callCount()).toEqual(1);

    // we create a file event
    setGlobalConfiguration({
      baseDir,
      fsEvents: { [join(baseDir, 'file2.ts')]: 'CREATED' },
    });
    // clear map has not been called yet
    expect(clearTsConfigMapMock.callCount()).toEqual(0);
    tsConfigStore.dirtyCachesIfNeeded(baseDir);
    expect(clearTsConfigMapMock.callCount()).toEqual(1);
    // but we do not clear the whole cache
    expect(clearAll.callCount()).toEqual(0);
    await tsConfigStore.getTsConfigForInputFile(file);
    // the map has been cleared, so we have called find again
    expect(findTsConfigMock.callCount()).toEqual(2);
  });

  it('should clear tsconfig cache', async ({ mock }) => {
    const baseDir = join(fixtures, 'paths');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    expect(await tsConfigStore.isInitialized(baseDir)).toEqual(true);

    mock.method(tsConfigStore.getCurrentCache(), 'clearFileToTsConfigCache');
    const clearTsConfigMapMock = (
      tsConfigStore.getCurrentCache().clearFileToTsConfigCache as Mock<
        Cache['clearFileToTsConfigCache']
      >
    ).mock;
    mock.method(tsConfigStore.getCurrentCache(), 'clearAll');
    const clearAll = (tsConfigStore.getCurrentCache().clearAll as Mock<Cache['clearAll']>).mock;

    // we create a file event
    setGlobalConfiguration({ baseDir, fsEvents: { [tsConfigStore.getTsConfigs()[0]]: 'CREATED' } });
    // clear map has not been called yet
    expect(clearTsConfigMapMock.callCount()).toEqual(0);
    expect(clearAll.callCount()).toEqual(0);
    tsConfigStore.dirtyCachesIfNeeded(baseDir);
    expect(clearTsConfigMapMock.callCount()).toEqual(1);
    expect(clearAll.callCount()).toEqual(1);
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

  it('should add tsconfig referenced by name', async () => {
    const baseDir = join(fixtures, 'referenced-tsconfigs');

    setGlobalConfiguration({ baseDir, tsConfigPaths: ['tsconfig.json'] });
    await initFileStores(baseDir);
    expect(tsConfigStore.getTsConfigs().length).toEqual(1);
    expect(tsConfigStore.getCacheOrigin()).toEqual('property');

    const tsconfig = await tsConfigStore.getTsConfigForInputFile(
      toUnixPath(join(baseDir, 'dir', 'file.ts')),
    );
    expect(tsconfig).toEqual(join(baseDir, 'dir', 'tsconfig.json'));
  });

  it('should add tsconfig referenced by path]', async () => {
    const baseDir = join(fixtures, 'referenced-tsconfigs');

    setGlobalConfiguration({ baseDir, tsConfigPaths: ['tsconfig.pathref.json'] });
    await initFileStores(baseDir);
    expect(tsConfigStore.getTsConfigs().length).toEqual(1);
    expect(tsConfigStore.getCacheOrigin()).toEqual('property');

    const tsconfig = await tsConfigStore.getTsConfigForInputFile(
      toUnixPath(join(baseDir, 'dir', 'file.ts')),
    );
    expect(tsconfig).toEqual(join(baseDir, 'dir', 'tsconfig.json'));
  });

  it('should skip non-existent tsconfig referenced by path]', async () => {
    const baseDir = join(fixtures, 'referenced-tsconfigs');

    setGlobalConfiguration({ baseDir, tsConfigPaths: ['tsconfig.fake.pathref.json'] });
    await initFileStores(baseDir);
    expect(tsConfigStore.getTsConfigs().length).toEqual(1);
    expect(tsConfigStore.getCacheOrigin()).toEqual('property');

    const tsconfig = await tsConfigStore.getTsConfigForInputFile(
      toUnixPath(join(baseDir, 'dir', 'file.ts')),
    );
    expect(tsconfig).toEqual(null);
  });
});
