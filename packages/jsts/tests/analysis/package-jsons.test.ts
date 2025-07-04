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
import { beforeEach, describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import {
  initFileStores,
  packageJsonStore,
} from '../../src/analysis/projectAnalysis/file-stores/index.js';
import { readFile } from 'node:fs/promises';
import { PackageJson } from 'type-fest';
import { toUnixPath } from '../../../shared/src/helpers/files.js';
import { cache } from '../../src/rules/helpers/index.js';
import { setGlobalConfiguration } from '../../../shared/src/helpers/configuration.js';
import { UNINITIALIZED_ERROR } from '../../src/analysis/projectAnalysis/file-stores/package-jsons.js';

const fixtures = toUnixPath(join(import.meta.dirname, 'fixtures'));

describe('files', () => {
  beforeEach(() => {
    packageJsonStore.clearCache();
  });
  it('should crash getting files before initializing', async () => {
    expect(() => packageJsonStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the package.json files', async () => {
    const baseDir = join(fixtures, 'dependencies');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    const filePath = join(fixtures, 'dependencies', 'package.json');
    const fileContent = JSON.parse(await readFile(filePath, 'utf-8')) as PackageJson;
    expect(packageJsonStore.getPackageJsons()).toEqual([
      {
        filePath,
        fileContent,
      },
    ]);
  });

  it('should fill the package.json cache used for rules', async () => {
    const baseDir = join(fixtures, 'dependencies');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    expect(cache.size).toEqual(1);
    expect(cache.has(baseDir)).toEqual(true);
  });

  it('should ignore malformed the package.json files', async ({ mock }) => {
    mock.method(console, 'log');
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;
    const baseDir = join(fixtures, 'package-json-malformed');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    const filePath = join(baseDir, 'package.json');
    expect(packageJsonStore.getPackageJsons()).toHaveLength(0);

    expect(
      consoleLogMock.calls
        .map(call => call.arguments[0])
        .some(log => log.match(`Error parsing package.json ${filePath}: SyntaxError`)),
    ).toEqual(true);
  });

  it('should clear the package.json cache', async () => {
    const baseDir = join(fixtures, 'dependencies');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    expect(await packageJsonStore.isInitialized(baseDir)).toEqual(true);
    expect(packageJsonStore.getPackageJsons()).toHaveLength(1);
    expect(cache.size).toEqual(1);

    packageJsonStore.dirtyCachesIfNeeded(baseDir);
    expect(packageJsonStore.getPackageJsons()).toHaveLength(1);

    // we create a file event
    setGlobalConfiguration({ baseDir, fsEvents: { [join(baseDir, 'package.json')]: 'MODIFIED' } });
    packageJsonStore.dirtyCachesIfNeeded(baseDir);
    expect(() => packageJsonStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(cache.size).toEqual(0);
  });
});
