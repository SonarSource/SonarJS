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
  PNPM_WORKSPACE_YAML,
} from '../src/jsts/rules/helpers/dependency-manifests/index.js';
import { patternInParentsCache } from '../src/jsts/rules/helpers/find-up/all-in-parent-dirs.js';

const closestPackageJsonCache = closestPatternCache.get(PACKAGE_JSON);
const packageJsonsInParentsCache = patternInParentsCache.get(PACKAGE_JSON);
const closestDenoJsonCache = closestPatternCache.get(DENO_JSON);
const denoJsonsInParentsCache = patternInParentsCache.get(DENO_JSON);
const closestDenoJsoncCache = closestPatternCache.get(DENO_JSONC);
const denoJsoncsInParentsCache = patternInParentsCache.get(DENO_JSONC);
const closestPnpmWorkspaceCache = closestPatternCache.get(PNPM_WORKSPACE_YAML);

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

  it('should resolve pnpm catalog references from pnpm-workspace.yaml for same-level-directory package.json', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-catalog'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['npm']);
    expect(manifests[0].manifest).toMatchObject({
      dependencies: {
        react: '^19.1.1',
        'react-dom': '^19.1.1',
        vue: '^3.5.0',
      },
      peerDependencies: {
        typescript: '^5.8.0',
      },
      optionalDependencies: {
        rollup: '^4.40.0',
      },
    });
  });

  it('should resolve pnpm catalog references from pnpm-workspace.yaml for lower-level-directory package.json', async () => {
    const topDirectory = normalizeToAbsolutePath(
      join(fixtures, 'pnpm-workspace-catalog-different-level'),
    );
    const currentDirectory = normalizeToAbsolutePath(
      join(fixtures, 'pnpm-workspace-catalog-different-level/packages/app/'),
    );
    const configuration = createConfiguration({ baseDir: topDirectory });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(currentDirectory, topDirectory);
    expect(manifests.map(manifest => manifest.type)).toEqual(['npm', 'npm']);
    expect(manifests[0].manifest).toMatchObject({
      dependencies: {
        react: '^19.1.1',
        'react-dom': '^19.1.1',
      },
      devDependencies: {
        vue: '^3.5.0',
      },
    });
  });

  it('should inject pnpm workspace packages into manifest workspaces', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-packages'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['npm']);
    expect(manifests[0].manifest).toMatchObject({
      workspaces: ['packages/*', 'apps/*'],
      dependencies: { react: '^19.0.0' },
    });
  });

  it('should inject workspace packages alongside catalog reference resolution', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-packages-and-catalog'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['npm']);
    expect(manifests[0].manifest).toMatchObject({
      workspaces: ['packages/*'],
      dependencies: { react: '^19.1.1' },
    });
  });

  it('should not set workspaces when pnpm-workspace.yaml has no packages field', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-catalog'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    const [manifest] = manifests;
    expect(manifest.type).toEqual('npm');
    if (manifest.type === 'npm') {
      expect(manifest.manifest.workspaces).toBeUndefined();
    }
  });

  it('should not overwrite existing workspaces when pnpm-workspace.yaml also defines packages', async () => {
    const baseDir = normalizeToAbsolutePath(
      join(fixtures, 'pnpm-workspace-packages-existing-workspaces'),
    );
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['npm']);
    expect(manifests[0].manifest).toMatchObject({
      workspaces: ['existing/*'],
    });
    const [manifest] = manifests;
    if (manifest.type === 'npm') {
      expect(manifest.manifest.workspaces).not.toContain('new-packages/*');
    }
  });

  it('should resolve dependencies across a mixed pnpm, npm, and deno monorepo', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'mixed-manifest-monorepo'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const npmAppDir = normalizeToAbsolutePath(join(baseDir, 'packages/npm-app'));
    const npmAppSrcDir = normalizeToAbsolutePath(join(npmAppDir, 'src'));
    const npmAppNestedDir = normalizeToAbsolutePath(join(npmAppSrcDir, 'nested'));
    const npmLibDir = normalizeToAbsolutePath(join(baseDir, 'packages/npm-lib'));
    const denoAppDir = normalizeToAbsolutePath(join(baseDir, 'packages/deno-app'));

    const npmAppManifests = getDependencyManifests(npmAppDir, baseDir);
    expect(npmAppManifests.map(manifest => manifest.type)).toEqual(['npm', 'npm']);
    expect(npmAppManifests[0].manifest).toMatchObject({
      dependencies: {
        'npm-only': '^3.0.0',
        'shared-lib': '^2.3.4',
      },
      type: 'module',
    });
    expect(npmAppManifests[1].manifest).toMatchObject({
      dependencies: {
        'root-only': '^1.0.0',
      },
      workspaces: ['packages/*'],
    });

    const denoAppManifests = getDependencyManifests(denoAppDir, baseDir);
    expect(denoAppManifests.map(manifest => manifest.type)).toEqual(['deno', 'npm']);
    expect(denoAppManifests[0].manifest).toMatchObject({
      imports: {
        'deno-only': 'npm:deno-only@^5.0.0',
        sharedAlias: 'npm:shared-lib@^2.3.4',
      },
    });
    expect(denoAppManifests[1].manifest).toMatchObject({
      dependencies: {
        'root-only': '^1.0.0',
      },
      workspaces: ['packages/*'],
    });

    expect(dependenciesCache.size).toEqual(0);
    const npmAppDependencies = getDependencies(npmAppSrcDir, baseDir);
    expect(getStringDependencies(npmAppDependencies)).toEqual([
      'npm-only',
      'root-only',
      'shared-lib',
    ]);
    expect(getWorkspacePatterns(npmAppDependencies)).toEqual(['packages/*', 'packages/*']);
    expect(dependenciesCache.size).toEqual(1);
    expect(dependenciesCache.has(npmAppDir)).toEqual(true);

    expect(getDependencies(npmAppNestedDir, baseDir)).toBe(npmAppDependencies);
    expect(dependenciesCache.size).toEqual(1);

    const npmLibDependencies = getDependencies(npmLibDir, baseDir);
    expect(getStringDependencies(npmLibDependencies)).toEqual([
      'lib-only',
      'root-only',
      'shared-lib',
    ]);
    expect(getWorkspacePatterns(npmLibDependencies)).toEqual(['packages/*', 'packages/*']);
    expect(dependenciesCache.size).toEqual(2);
    expect(dependenciesCache.has(npmLibDir)).toEqual(true);

    const denoDependencies = getDependencies(denoAppDir, baseDir);
    expect(getStringDependencies(denoDependencies)).toEqual([
      'deno-only',
      'root-only',
      'shared-lib',
      'sharedAlias',
    ]);
    expect(getWorkspacePatterns(denoDependencies)).toEqual(['packages/*']);
    expect(dependenciesCache.size).toEqual(3);
    expect(dependenciesCache.has(denoAppDir)).toEqual(true);

    expect(moduleTypeCache.size).toEqual(0);
    const npmAppEntry = normalizeToAbsolutePath(join(npmAppSrcDir, 'index.js'));
    expect(getModuleType(npmAppEntry, baseDir)).toEqual('module');
    expect(moduleTypeCache.size).toEqual(1);
    expect(getModuleType(npmAppEntry, baseDir)).toEqual('module');
    expect(moduleTypeCache.size).toEqual(1);

    expect(
      getModuleType(normalizeToAbsolutePath(join(npmLibDir, 'src/index.js')), baseDir),
    ).toEqual('commonjs');
    expect(moduleTypeCache.size).toEqual(2);

    expect(getModuleType(normalizeToAbsolutePath(join(denoAppDir, 'src/mod.ts')), baseDir)).toEqual(
      'module',
    );
    expect(moduleTypeCache.size).toEqual(3);
  });

  it('should cache pnpm workspace lookups across sibling packages', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'mixed-manifest-monorepo'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const npmAppDir = normalizeToAbsolutePath(join(baseDir, 'packages/npm-app'));
    const npmLibDir = normalizeToAbsolutePath(join(baseDir, 'packages/npm-lib'));
    const denoAppDir = normalizeToAbsolutePath(join(baseDir, 'packages/deno-app'));
    const packagesDir = normalizeToAbsolutePath(join(baseDir, 'packages'));
    const pnpmWorkspaceCache = closestPnpmWorkspaceCache.get(baseDir);

    expect(pnpmWorkspaceCache.size).toEqual(0);

    getDependencyManifests(npmAppDir, baseDir);
    expect(pnpmWorkspaceCache.size).toEqual(3);
    expect(pnpmWorkspaceCache.has(npmAppDir)).toEqual(true);
    expect(pnpmWorkspaceCache.has(packagesDir)).toEqual(true);
    expect(pnpmWorkspaceCache.has(baseDir)).toEqual(true);
    const cachedPnpmWorkspace = pnpmWorkspaceCache.get(npmAppDir);
    expect(cachedPnpmWorkspace?.path).toEqual(
      normalizeToAbsolutePath(join(baseDir, 'pnpm-workspace.yaml')),
    );

    getDependencyManifests(npmAppDir, baseDir);
    expect(pnpmWorkspaceCache.size).toEqual(3);
    expect(pnpmWorkspaceCache.get(npmAppDir)).toBe(cachedPnpmWorkspace);

    getDependencyManifests(npmLibDir, baseDir);
    expect(pnpmWorkspaceCache.size).toEqual(4);
    expect(pnpmWorkspaceCache.has(npmLibDir)).toEqual(true);
    expect(pnpmWorkspaceCache.get(npmLibDir)).toBe(cachedPnpmWorkspace);

    getDependencyManifests(denoAppDir, baseDir);
    expect(pnpmWorkspaceCache.size).toEqual(4);
  });

  it('should not resolve the dependency when pnpm catalog references are not found', async ({
    mock,
  }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-catalog-unresolved'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['npm']);
    expect(manifests[0].manifest).toMatchObject({
      dependencies: {
        react: 'catalog:',
      },
    });
    expect(consoleLogMock.calls[0].arguments[0]).toEqual(
      'Dependency "react" could not be resolved for catalog "default"',
    );
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

  it('should parse deno.jsonc with comments and trailing commas', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-jsonc-with-comments'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['deno']);
    expect(manifests[0].manifest).toMatchObject({
      imports: {
        reactAlias: 'npm:react@^19.1.0',
      },
    });
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

function getStringDependencies(dependencies: Set<unknown>): string[] {
  return [...dependencies]
    .filter((dependency): dependency is string => typeof dependency === 'string')
    .sort();
}

function getWorkspacePatterns(dependencies: Set<unknown>): string[] {
  return [...dependencies]
    .filter((dependency): dependency is { pattern: string } => typeof dependency !== 'string')
    .map(dependency => dependency.pattern)
    .sort();
}
