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
import { initFileStores, packageJsonStore } from '../src/file-stores/index.js';
import { readFile } from 'node:fs/promises';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { createConfiguration } from '../src/common/configuration.js';
import { UNINITIALIZED_ERROR } from '../src/file-stores/package-jsons.js';
import {
  dependenciesCache,
  getDependencies,
  getModuleType,
  moduleTypeCache,
} from '../src/jsts/rules/helpers/package-jsons/dependencies.js';
import { closestPatternCache } from '../src/jsts/rules/helpers/find-up/closest.js';
import { PACKAGE_JSON } from '../src/jsts/rules/helpers/package-jsons/index.js';
import { patternInParentsCache } from '../src/jsts/rules/helpers/find-up/all-in-parent-dirs.js';

const closestPackageJsonCache = closestPatternCache.get(PACKAGE_JSON);
const packageJsonsInParentsCache = patternInParentsCache.get(PACKAGE_JSON);

const fixtures = normalizeToAbsolutePath(join(import.meta.dirname, 'fixtures-package-jsons'));

describe('files', () => {
  beforeEach(() => {
    packageJsonStore.clearCache();
  });
  it('should crash getting files before initializing', async () => {
    expect(() => packageJsonStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the package.json files', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
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
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    expect(packageJsonsInParentsCache.has(baseDir)).toEqual(true);
    expect(packageJsonsInParentsCache.size).toEqual(1);
    expect(closestPackageJsonCache.has(baseDir)).toEqual(true);
    expect(closestPackageJsonCache.size).toEqual(1);

    //dependencies cache is filled on demand
    expect(dependenciesCache.size).toEqual(0);
    getDependencies(baseDir, baseDir);
    expect(dependenciesCache.size).toEqual(1);
    expect(dependenciesCache.has(baseDir)).toEqual(true);
    expect(moduleTypeCache.size).toEqual(0);
    getModuleType(normalizeToAbsolutePath(join(baseDir, 'index.js')), baseDir);
    expect(moduleTypeCache.size).toEqual(1);
    expect(moduleTypeCache.has(baseDir)).toEqual(true);
  });

  it('should extract module type from package.json', async () => {
    const moduleBaseDir = normalizeToAbsolutePath(join(fixtures, 'module-type-module'));
    const moduleConfiguration = createConfiguration({ baseDir: moduleBaseDir });
    await initFileStores(moduleConfiguration);
    expect(
      getModuleType(normalizeToAbsolutePath(join(moduleBaseDir, 'index.js')), moduleBaseDir),
    ).toEqual('module');

    packageJsonStore.clearCache();

    const commonJsBaseDir = normalizeToAbsolutePath(join(fixtures, 'module-type-commonjs'));
    const commonJsConfiguration = createConfiguration({ baseDir: commonJsBaseDir });
    await initFileStores(commonJsConfiguration);
    expect(
      getModuleType(normalizeToAbsolutePath(join(commonJsBaseDir, 'index.js')), commonJsBaseDir),
    ).toEqual('commonjs');

    packageJsonStore.clearCache();

    const unspecifiedBaseDir = normalizeToAbsolutePath(join(fixtures, 'module-type-unspecified'));
    const unspecifiedConfiguration = createConfiguration({ baseDir: unspecifiedBaseDir });
    await initFileStores(unspecifiedConfiguration);
    expect(
      getModuleType(
        normalizeToAbsolutePath(join(unspecifiedBaseDir, 'index.js')),
        unspecifiedBaseDir,
      ),
    ).toEqual('commonjs');
  });

  it('should use only the first manifest when extracting module type', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'module-type-first-manifest-only'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(
      getModuleType(normalizeToAbsolutePath(join(baseDir, 'subdir/index.js')), baseDir),
    ).toEqual('commonjs');
  });

  it('should extract module type from explicit file extension', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(getModuleType(normalizeToAbsolutePath(join(baseDir, 'index.mjs')), baseDir)).toEqual(
      'module',
    );
    expect(getModuleType(normalizeToAbsolutePath(join(baseDir, 'index.cjs')), baseDir)).toEqual(
      'commonjs',
    );
  });

  it('should ignore malformed package.json files', async ({ mock }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'package-json-malformed'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
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
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    let configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    expect(await packageJsonStore.isInitialized(configuration)).toEqual(true);
    expect(packageJsonStore.getPackageJsons().size).toEqual(1);
    getDependencies(baseDir, baseDir);
    expect(dependenciesCache.size).toEqual(1);

    packageJsonStore.dirtyCachesIfNeeded(configuration);
    expect(packageJsonStore.getPackageJsons().size).toEqual(1);

    // we create a file event
    configuration = createConfiguration({
      baseDir,
      fsEvents: { [join(baseDir, 'package.json')]: 'MODIFIED' },
    });
    packageJsonStore.dirtyCachesIfNeeded(configuration);
    expect(() => packageJsonStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(dependenciesCache.size).toEqual(0);
    expect(moduleTypeCache.size).toEqual(0);
  });
});
