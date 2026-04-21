/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { initFileStores, dependencyManifestStore } from '../src/file-stores/index.js';
import { readFile } from 'node:fs/promises';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { createConfiguration } from '../src/common/configuration.js';
import { UNINITIALIZED_ERROR } from '../src/file-stores/dependency-manifests.js';
import {
  dependenciesCache,
  getDependencies,
  getModuleType,
  moduleTypeCache,
} from '../src/jsts/rules/helpers/dependency-manifests/dependencies.js';
import { getDependencyManifests } from '../src/jsts/rules/helpers/dependency-manifests/all-in-parent-dirs.js';
import { closestPatternCache } from '../src/jsts/rules/helpers/find-up/closest.js';
import {
  DENO_JSON,
  DENO_JSONC,
  PACKAGE_JSON,
} from '../src/jsts/rules/helpers/dependency-manifests/index.js';
import { patternInParentsCache } from '../src/jsts/rules/helpers/find-up/all-in-parent-dirs.js';

const closestPackageJsonCache = closestPatternCache.get(PACKAGE_JSON);
const packageJsonsInParentsCache = patternInParentsCache.get(PACKAGE_JSON);
const closestDenoJsonCache = closestPatternCache.get(DENO_JSON);
const denoJsonsInParentsCache = patternInParentsCache.get(DENO_JSON);
const closestDenoJsoncCache = closestPatternCache.get(DENO_JSONC);
const denoJsoncsInParentsCache = patternInParentsCache.get(DENO_JSONC);

const fixtures = normalizeToAbsolutePath(join(import.meta.dirname, 'fixtures-package-jsons'));

describe('files', () => {
  beforeEach(() => {
    dependencyManifestStore.clearCache();
  });
  it('should crash getting files before initializing', async () => {
    expect(() => dependencyManifestStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
  });

  it('should return the package.json files', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    const path = join(fixtures, 'dependencies', 'package.json');
    const content = await readFile(path, 'utf-8');
    expect(dependencyManifestStore.getPackageJsons()).toEqual(
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

  it('should reuse dependency cache entries for subdirectories sharing the same manifest', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    const subDir = normalizeToAbsolutePath(join(baseDir, 'src'));
    const nestedSubDir = normalizeToAbsolutePath(join(subDir, 'nested'));

    expect(getDependencies(subDir, baseDir)).toEqual(new Set(['test-module', 'pkg1', 'pkg2']));
    expect(dependenciesCache.size).toEqual(1);

    expect(getDependencies(nestedSubDir, baseDir)).toEqual(
      new Set(['test-module', 'pkg1', 'pkg2']),
    );
    expect(dependenciesCache.size).toEqual(1);
    expect(dependenciesCache.has(baseDir)).toEqual(true);
  });

  it('should fill deno manifest caches used for dependency lookup', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(denoJsonsInParentsCache.has(baseDir)).toEqual(true);
    expect(closestDenoJsonCache.has(baseDir)).toEqual(true);
    expect(denoJsoncsInParentsCache.has(baseDir)).toEqual(true);
    expect(closestDenoJsoncCache.has(baseDir)).toEqual(true);
    expect(getDependencies(baseDir, baseDir)).toEqual(new Set(['react', '@scope/pkg', 'pkgAlias']));
  });

  it('should include package.json dependencies when deno.json is present in the same directory', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-precedence'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(getDependencies(baseDir, baseDir)).toEqual(
      new Set(['deno-only', 'react', 'package-only']),
    );
  });

  it('should use deno manifest before package.json in the same directory', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-precedence'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['deno', 'npm']);
    expect(manifests[0].manifest).toMatchObject({
      imports: {
        'deno-only': 'npm:deno-only@1.2.3',
        react: 'npm:react@^19.0.0',
      },
    });
  });

  it('should include react when package.json and deno.json define it at the same level', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'same-level-version-conflict'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['deno', 'npm']);
    expect(getDependencies(baseDir, baseDir)).toEqual(new Set(['react', 'reactAlias']));
  });

  it('should log when a dependency is defined in multiple manifests', async ({ mock }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'same-level-version-conflict'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(getDependencies(baseDir, baseDir)).toEqual(new Set(['react', 'reactAlias']));
    expect(
      consoleLogMock.calls
        .map(call => call.arguments[0])
        .some(
          log =>
            log.includes('Dependency "react" is defined in multiple manifests') &&
            log.includes('^19.1.0') &&
            log.includes('19.0.0'),
        ),
    ).toEqual(true);
  });

  it('should not log when a dependency is shared between child and parent manifests', async ({
    mock,
  }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'child-parent-merge'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    const subDir = normalizeToAbsolutePath(join(baseDir, 'subdir'));

    expect(getDependencies(subDir, baseDir)).toEqual(
      new Set(['child-only', 'shared', 'parent-only']),
    );
    expect(
      consoleLogMock.calls
        .map(call => call.arguments[0])
        .some(log => log.includes('Dependency "shared" is defined in multiple manifests')),
    ).toEqual(false);
  });

  it('should extract module type from package.json', async () => {
    const moduleBaseDir = normalizeToAbsolutePath(join(fixtures, 'module-type-module'));
    const moduleConfiguration = createConfiguration({ baseDir: moduleBaseDir });
    await initFileStores(moduleConfiguration);
    expect(
      getModuleType(normalizeToAbsolutePath(join(moduleBaseDir, 'index.js')), moduleBaseDir),
    ).toEqual('module');

    dependencyManifestStore.clearCache();

    const commonJsBaseDir = normalizeToAbsolutePath(join(fixtures, 'module-type-commonjs'));
    const commonJsConfiguration = createConfiguration({ baseDir: commonJsBaseDir });
    await initFileStores(commonJsConfiguration);
    expect(
      getModuleType(normalizeToAbsolutePath(join(commonJsBaseDir, 'index.js')), commonJsBaseDir),
    ).toEqual('commonjs');

    dependencyManifestStore.clearCache();

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
    expect(dependencyManifestStore.getPackageJsons().size).toEqual(1);
    getDependencies(baseDir, baseDir);
    expect(
      consoleLogMock.calls
        .map(call => call.arguments[0])
        .some(log => log.match(`Error parsing package.json ${filePath}: SyntaxError`)),
    ).toEqual(true);
  });

  it('should ignore malformed deno.jsonc files', async ({ mock }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-jsonc-malformed'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    const filePath = join(baseDir, 'deno.jsonc');
    expect(getDependencies(baseDir, baseDir)).toEqual(new Set());
    expect(
      consoleLogMock.calls
        .map(call => call.arguments[0])
        .some(log => log.startsWith(`Error parsing deno manifest ${filePath}:`)),
    ).toEqual(true);
  });

  it('should clear the package.json cache', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    let configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    expect(await dependencyManifestStore.isInitialized(configuration)).toEqual(true);
    expect(dependencyManifestStore.getPackageJsons().size).toEqual(1);
    getDependencies(baseDir, baseDir);
    expect(dependenciesCache.size).toEqual(1);

    dependencyManifestStore.dirtyCachesIfNeeded(configuration);
    expect(dependencyManifestStore.getPackageJsons().size).toEqual(1);

    // we create a file event
    configuration = createConfiguration({
      baseDir,
      fsEvents: { [join(baseDir, 'package.json')]: 'MODIFIED' },
    });
    dependencyManifestStore.dirtyCachesIfNeeded(configuration);
    expect(() => dependencyManifestStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(dependenciesCache.size).toEqual(0);
    expect(moduleTypeCache.size).toEqual(0);
  });

  it('should clear caches when deno manifests are updated', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-dependencies'));
    let configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    expect(await dependencyManifestStore.isInitialized(configuration)).toEqual(true);
    getDependencies(baseDir, baseDir);
    expect(dependenciesCache.size).toEqual(1);

    configuration = createConfiguration({
      baseDir,
      fsEvents: { [join(baseDir, 'deno.json')]: 'MODIFIED' },
    });
    dependencyManifestStore.dirtyCachesIfNeeded(configuration);
    expect(() => dependencyManifestStore.getPackageJsons()).toThrow(new Error(UNINITIALIZED_ERROR));
    expect(dependenciesCache.size).toEqual(0);
    expect(moduleTypeCache.size).toEqual(0);
  });
});
