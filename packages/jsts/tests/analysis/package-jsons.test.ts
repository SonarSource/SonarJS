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
import { beforeEach, describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { join, dirname } from 'node:path/posix';
import {
  initFileStores,
  packageJsonStore,
} from '../../src/analysis/projectAnalysis/file-stores/index.js';
import { readFile } from 'node:fs/promises';
import { toUnixPath } from '../../../shared/src/helpers/files.js';
import { setGlobalConfiguration } from '../../../shared/src/helpers/configuration.js';
import { UNINITIALIZED_ERROR } from '../../src/analysis/projectAnalysis/file-stores/package-jsons.js';
import {
  dependenciesCache,
  getDependencies,
} from '../../src/rules/helpers/package-jsons/dependencies.js';
import { closestPatternCache } from '../../src/rules/helpers/find-up/closest.js';
import { PACKAGE_JSON } from '../../src/rules/helpers/package-jsons/index.js';
import { patternInParentsCache } from '../../src/rules/helpers/find-up/all-in-parent-dirs.js';

const closestPackageJsonCache = closestPatternCache.get(PACKAGE_JSON);
const packageJsonsInParentsCache = patternInParentsCache.get(PACKAGE_JSON);

const fixtures = toUnixPath(join(import.meta.dirname, 'fixtures-package-jsons'));

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
    const path = join(fixtures, 'dependencies', 'package.json');
    const content = await readFile(path, 'utf-8');
    expect(packageJsonStore.getPackageJsons()).toEqual(
      new Map([
        [
          dirname(path),
          {
            path,
            content,
          },
        ],
      ]),
    );
  });

  it('should fill the package.json cache used for rules', async () => {
    const baseDir = join(fixtures, 'dependencies');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    expect(packageJsonsInParentsCache.has(baseDir)).toEqual(true);
    expect(packageJsonsInParentsCache.size).toEqual(1);
    expect(closestPackageJsonCache.has(baseDir)).toEqual(true);
    expect(closestPackageJsonCache.size).toEqual(1);

    //dependencies cache is filled on demand
    expect(dependenciesCache.size).toEqual(0);
    getDependencies(baseDir, baseDir);
    expect(dependenciesCache.size).toEqual(1);
    expect(dependenciesCache.has(baseDir)).toEqual(true);
  });

  it('should ignore malformed package.json files', async ({ mock }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = join(fixtures, 'package-json-malformed');
    setGlobalConfiguration({ baseDir });
    await initFileStores(baseDir);
    const filePath = join(baseDir, 'package.json');
    expect(packageJsonStore.getPackageJsons().size).toEqual(1);
    getDependencies(baseDir, baseDir);
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
    expect(packageJsonStore.getPackageJsons().size).toEqual(1);
    getDependencies(baseDir, baseDir);
    expect(dependenciesCache.size).toEqual(1);

    packageJsonStore.dirtyCachesIfNeeded(baseDir);
    expect(packageJsonStore.getPackageJsons().size).toEqual(1);

    // we create a file event
    setGlobalConfiguration({ baseDir, fsEvents: { [join(baseDir, 'package.json')]: 'MODIFIED' } });
    packageJsonStore.dirtyCachesIfNeeded(baseDir);
    expect(() => packageJsonStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(dependenciesCache.size).toEqual(0);
  });
});
