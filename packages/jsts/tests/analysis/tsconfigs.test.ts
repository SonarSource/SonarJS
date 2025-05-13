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
  clearTsConfigCache,
  getTsConfigForInputFile,
  getTsConfigs,
  writeTSConfigFile,
  UNINITIALIZED_ERROR,
  tsConfigCacheInitialized,
  dirtyCachesIfNeeded,
  getCurrentCache,
  getCacheOrigin,
} from '../../src/analysis/projectAnalysis/tsconfigs.js';
import { expect } from 'expect';
import { basename, join, relative } from 'node:path/posix';
import { toUnixPath } from '../../src/rules/index.js';
import { readFile } from 'node:fs/promises';
import { loadFiles } from '../../src/analysis/projectAnalysis/files-finder.js';
import {
  setGlobalConfiguration,
  setTsConfigPaths,
} from '../../../shared/src/helpers/configuration.js';
import { clearFilesCache } from '../../src/analysis/projectAnalysis/files.js';
import { Cache } from '../../src/analysis/projectAnalysis/tsconfigCache.js';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('tsconfigs', () => {
  beforeEach(() => {
    clearTsConfigCache();
    clearFilesCache();
  });
  it('should crash getting or querying tsconfig cache before initializing', async () => {
    expect(getTsConfigs).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(getCurrentCache).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(() => getTsConfigForInputFile('anyfile')).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the TSconfig files', async () => {
    await loadFiles(fixtures);
    expect(getTsConfigs().length).toEqual(3);
    expect(getCacheOrigin()).toEqual('lookup');
  });

  it('should validate the provided TSconfig files', async () => {
    await loadFiles(fixtures);
    setTsConfigPaths(
      getTsConfigs()
        .map(tsconfig => relative(fixtures, tsconfig))
        .concat('fake_dir/tsconfig.json'),
    );
    clearTsConfigCache();
    await loadFiles(fixtures);
    expect(getTsConfigs().length).toEqual(3);
    expect(getCacheOrigin()).toEqual('property');
  });

  it('should write tsconfig file', async () => {
    const { filename } = await writeTSConfigFile({
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
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      include: [`${baseDir}/**/*`],
    });
    expect(getCacheOrigin()).toEqual('fallback');
  });

  it('when no tsconfigs, in SonarQube should generate tsconfig with all files', async () => {
    setGlobalConfiguration({ sonarlint: false });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      files: [`${baseDir}/file.ts`, `${baseDir}/string42.ts`],
    });
    expect(getCacheOrigin()).toEqual('fallback');
  });

  it('should not generate tsconfig file when too many files', async () => {
    setGlobalConfiguration({ sonarlint: true, maxFilesForTypeChecking: 1 });
    const baseDir = toUnixPath(join(fixtures, 'module'));
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(tsconfig).toEqual(null);
  });

  it('should not generate tsconfig file if there is already at least one', async () => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    await loadFiles(baseDir);
    const tsconfig = getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(getTsConfigs()).toEqual([tsconfig]);
  });

  it('should use the cache', async ({ mock }) => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    await loadFiles(baseDir);
    mock.method(getCurrentCache(), 'getTsConfigMapForInputFile');
    const findTsConfigMock = (
      getCurrentCache().getTsConfigMapForInputFile as Mock<Cache['getTsConfigMapForInputFile']>
    ).mock;
    expect(findTsConfigMock.callCount()).toEqual(0);
    getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(findTsConfigMock.callCount()).toEqual(1);
    getTsConfigForInputFile(toUnixPath(join(baseDir, 'file.ts')));
    expect(findTsConfigMock.callCount()).toEqual(1);
  });

  it('should clear file to tsconfig map', async ({ mock }) => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    const file = toUnixPath(join(baseDir, 'file.ts'));
    await loadFiles(baseDir);
    expect(tsConfigCacheInitialized(baseDir)).toEqual(true);

    mock.method(getCurrentCache(), 'getTsConfigMapForInputFile');
    const findTsConfigMock = (
      getCurrentCache().getTsConfigMapForInputFile as Mock<Cache['getTsConfigMapForInputFile']>
    ).mock;
    mock.method(getCurrentCache(), 'clearFileToTsConfigCache');
    const clearTsConfigMapMock = (
      getCurrentCache().clearFileToTsConfigCache as Mock<Cache['clearFileToTsConfigCache']>
    ).mock;
    mock.method(getCurrentCache(), 'clearAll');
    const clearAll = (getCurrentCache().clearAll as Mock<Cache['clearAll']>).mock;

    expect(findTsConfigMock.callCount()).toEqual(0);
    getTsConfigForInputFile(file);
    expect(findTsConfigMock.callCount()).toEqual(1);

    // we create a file event
    setGlobalConfiguration({ fsEvents: [[toUnixPath(join(baseDir, 'file2.ts')), 'CREATED']] });
    // clear map has not been called yet
    expect(clearTsConfigMapMock.callCount()).toEqual(0);
    dirtyCachesIfNeeded(baseDir);
    expect(clearTsConfigMapMock.callCount()).toEqual(1);
    // but we do not clear the whole cache
    expect(clearAll.callCount()).toEqual(0);
    getTsConfigForInputFile(file);
    // the map has been cleared, so we have called find again
    expect(findTsConfigMock.callCount()).toEqual(2);
  });

  it('should clear tsconfig cache', async ({ mock }) => {
    setGlobalConfiguration();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    await loadFiles(baseDir);
    expect(tsConfigCacheInitialized(baseDir)).toEqual(true);

    mock.method(getCurrentCache(), 'clearFileToTsConfigCache');
    const clearTsConfigMapMock = (
      getCurrentCache().clearFileToTsConfigCache as Mock<Cache['clearFileToTsConfigCache']>
    ).mock;
    mock.method(getCurrentCache(), 'clearAll');
    const clearAll = (getCurrentCache().clearAll as Mock<Cache['clearAll']>).mock;

    // we create a file event
    setGlobalConfiguration({ fsEvents: [[getTsConfigs()[0], 'CREATED']] });
    // clear map has not been called yet
    expect(clearTsConfigMapMock.callCount()).toEqual(0);
    expect(clearAll.callCount()).toEqual(0);
    dirtyCachesIfNeeded(baseDir);
    expect(clearTsConfigMapMock.callCount()).toEqual(1);
    expect(clearAll.callCount()).toEqual(1);
  });

  it('should change to property of TsConfig files when provided', async () => {
    await loadFiles(fixtures);
    expect(getCacheOrigin()).toEqual('lookup');
    expect(getTsConfigs().length).toEqual(3);
    setTsConfigPaths([relative(fixtures, getTsConfigs()[0])]);
    await loadFiles(fixtures);
    expect(getTsConfigs().length).toEqual(1);
    expect(getCacheOrigin()).toEqual('property');
  });

  it('should log when no tsconfigs are found with the provided property', async ({ mock }) => {
    setTsConfigPaths(['tsconfig.fake.json']);
    mock.method(console, 'error');

    await loadFiles(fixtures);
    expect(getTsConfigs().length).toEqual(3);
    expect(getCacheOrigin()).toEqual('lookup');

    expect(
      (console.error as Mock<typeof console.error>).mock.calls.map(call => call.arguments[0]),
    ).toContain('Failed to find any of the provided tsconfig.json files: tsconfig.fake.json');
  });
});
