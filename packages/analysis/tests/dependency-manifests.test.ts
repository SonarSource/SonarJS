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
import yaml from 'yaml';
import { initFileStores, dependencyManifestStore } from '../src/file-stores/index.js';
import { readFile } from 'node:fs/promises';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { createConfiguration } from '../src/common/configuration.js';
import { UNINITIALIZED_ERROR } from '../src/file-stores/dependency-manifests.js';
import {
  dependenciesCache,
  getDependencies,
  getModuleType,
  getTypeScriptVersionSignal,
  moduleTypeCache,
} from '../src/jsts/rules/helpers/dependency-manifests/dependencies.js';
import {
  getDependencyManifests,
  getPackageJsonManifests,
} from '../src/jsts/rules/helpers/dependency-manifests/all-in-parent-dirs.js';
import { closestPatternCache } from '../src/jsts/rules/helpers/find-up/closest.js';
import {
  DENO_JSON,
  DENO_JSONC,
  PACKAGE_JSON,
  PNPM_WORKSPACE_YAML,
} from '../src/jsts/rules/helpers/dependency-manifests/index.js';
import { patternInParentsCache } from '../src/jsts/rules/helpers/find-up/all-in-parent-dirs.js';
import { Minimatch } from 'minimatch';

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

  it('should fill the pnpm workspace cache used for rules', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-catalog'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(closestPnpmWorkspaceCache.has(baseDir)).toEqual(true);
    expect(closestPnpmWorkspaceCache.get(baseDir).get(baseDir)?.path).toEqual(
      join(baseDir, PNPM_WORKSPACE_YAML),
    );
  });

  it('should reuse parsed package.json and pnpm workspace manifests after warmup', async ({
    mock,
  }) => {
    mock.method(JSON, 'parse');
    mock.method(yaml, 'parse');
    const jsonParseMock = (JSON.parse as Mock<typeof JSON.parse>).mock;
    const yamlParseMock = (yaml.parse as Mock<typeof yaml.parse>).mock;

    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-catalog'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(getDependencyManifests(baseDir, baseDir)[0].dependencies).toEqual(
      new Map([
        ['react', '^19.1.1'],
        ['react-dom', '^19.1.1'],
        ['vue', '^3.5.0'],
        ['typescript', '^5.8.0'],
        ['rollup', '^4.40.0'],
      ]),
    );
    expect(jsonParseMock.calls.length).toBeGreaterThan(0);
    expect(yamlParseMock.calls.length).toBeGreaterThan(0);

    jsonParseMock.resetCalls();
    yamlParseMock.resetCalls();

    expect(getDependencyManifests(baseDir, baseDir)[0].dependencies).toEqual(
      new Map([
        ['react', '^19.1.1'],
        ['react-dom', '^19.1.1'],
        ['vue', '^3.5.0'],
        ['typescript', '^5.8.0'],
        ['rollup', '^4.40.0'],
      ]),
    );
    expect(getPackageJsonManifests(baseDir, baseDir)).toHaveLength(1);
    expect(getTypeScriptVersionSignal(baseDir)).toEqual('^5.8.0');
    expect(jsonParseMock.calls).toHaveLength(0);
    expect(yamlParseMock.calls).toHaveLength(0);
  });

  it('should reuse failed deno manifest parses after warmup', async ({ mock }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-jsonc-malformed'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    const filePath = join(baseDir, 'deno.jsonc');

    expect(getDependencyManifests(baseDir, baseDir)[0].dependencies).toEqual(new Map());
    expect(
      consoleLogMock.calls
        .map(call => call.arguments[0])
        .some(log => log.startsWith(`Error parsing deno manifest ${filePath}:`)),
    ).toEqual(true);

    consoleLogMock.resetCalls();

    expect(getDependencyManifests(baseDir, baseDir)[0].dependencies).toEqual(new Map());
    expect(consoleLogMock.calls).toHaveLength(0);
  });

  it('should reuse dependency cache entries for subdirectories sharing the same manifest', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);
    const subDir = normalizeToAbsolutePath(join(baseDir, 'src'));
    const nestedSubDir = normalizeToAbsolutePath(join(subDir, 'nested'));

    expect(getDependencies(subDir, baseDir)).toEqual(
      new Map([
        ['test-module', '*'],
        ['pkg1', '1.0.7'],
        ['pkg2', '2.0.0'],
      ]),
    );
    expect(dependenciesCache.size).toEqual(1);

    expect(getDependencies(nestedSubDir, baseDir)).toEqual(
      new Map([
        ['test-module', '*'],
        ['pkg1', '1.0.7'],
        ['pkg2', '2.0.0'],
      ]),
    );
    expect(dependenciesCache.size).toEqual(1);
    expect(dependenciesCache.has(baseDir)).toEqual(true);
  });

  it('should resolve pnpm catalog references from pnpm-workspace.yaml for same-level-directory package.json', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-catalog'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['react', '^19.1.1'],
        ['react-dom', '^19.1.1'],
        ['vue', '^3.5.0'],
        ['typescript', '^5.8.0'],
        ['rollup', '^4.40.0'],
      ]),
    );
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
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json', 'package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['react', '^19.1.1'],
        ['react-dom', '^19.1.1'],
        ['vue', '^3.5.0'],
      ]),
    );
  });

  it('should inject pnpm workspace packages into manifest workspaces', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-packages'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map<string | Minimatch, string | undefined>([
        ['react', '^19.0.0'],
        ['root', '*'],
        [new Minimatch('packages/*', { nocase: true, matchBase: true }), undefined],
        [new Minimatch('apps/*', { nocase: true, matchBase: true }), undefined],
      ]),
    );
  });

  it('should inject workspace packages alongside catalog reference resolution', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'pnpm-workspace-packages-and-catalog'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map<string | Minimatch, string | undefined>([
        ['react', '^19.1.1'],
        [new Minimatch('packages/*', { nocase: true, matchBase: true }), undefined],
      ]),
    );
  });

  it('should not overwrite existing workspaces when pnpm-workspace.yaml also defines packages', async () => {
    const baseDir = normalizeToAbsolutePath(
      join(fixtures, 'pnpm-workspace-packages-existing-workspaces'),
    );
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([[new Minimatch('existing/*', { nocase: true, matchBase: true }), undefined]]),
    );
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
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json']);
    expect(manifests[0].dependencies).toEqual(new Map([['react', 'catalog:']]));
    expect(consoleLogMock.calls[0].arguments[0]).toEqual(
      'Dependency "react" could not be resolved for catalog "default"',
    );
  });

  for (const fixture of ['bun-workspace-default-catalog', 'bun-workspace-default-root-catalog']) {
    it(`should resolve bun catalog default references (${fixture})`, async () => {
      const baseDir = normalizeToAbsolutePath(join(fixtures, fixture));
      const appBaseDir = normalizeToAbsolutePath(join(fixtures, `${fixture}/packages/my-app`));
      const configuration = createConfiguration({ baseDir });
      await initFileStores(configuration);

      const manifests = getDependencyManifests(appBaseDir, baseDir);
      expect(manifests.map(manifest => manifest.type)).toEqual(['package-json', 'package-json']);
      expect(manifests[0].dependencies).toEqual(
        new Map([
          ['my-app', '*'],
          ['react', '^18.0.0'],
          ['react-dom', '^19.0.0'],
        ]),
      );
    });
  }

  for (const fixture of ['bun-workspace-named-catalog', 'bun-workspace-named-root-catalog']) {
    it(`should resolve bun catalog named references (${fixture})`, async () => {
      const baseDir = normalizeToAbsolutePath(join(fixtures, fixture));
      const appBaseDir = normalizeToAbsolutePath(join(fixtures, `${fixture}/packages/my-app`));
      const configuration = createConfiguration({ baseDir });
      await initFileStores(configuration);

      const manifests = getDependencyManifests(appBaseDir, baseDir);
      expect(manifests.map(manifest => manifest.type)).toEqual(['package-json', 'package-json']);
      expect(manifests[0].dependencies).toEqual(
        new Map([
          ['my-app', '*'],
          ['react', '^18.0.0'],
          ['react-dom', '^19.0.0'],
          ['jest', '30.0.0'],
          ['testing-library', '14.0.0'],
          ['webpack', '5.0.0'],
        ]),
      );
    });
  }

  it('should not resolve bun named catalog references when catalog is missing', async ({
    mock,
  }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(
      join(fixtures, 'bun-workspace-unresolved-named-catalog'),
    );
    const appBaseDir = normalizeToAbsolutePath(join(baseDir, 'packages/my-app'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(appBaseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json', 'package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['my-app', '*'],
        ['react', '^18.0.0'],
        ['react-dom', '^19.0.0'],
        ['jest', '30.0.0'],
        ['testing-library', '14.0.0'],
        ['webpack', 'catalog:unknown'],
      ]),
    );
    expect(consoleLogMock.calls.map(call => call.arguments)).toEqual([
      ['Dependency "webpack" could not be resolved for catalog "unknown"'],
    ]);
  });

  it('should not resolve bun default catalog references when catalog is missing', async ({
    mock,
  }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(
      join(fixtures, 'bun-workspace-unresolved-default-catalog'),
    );
    const appBaseDir = normalizeToAbsolutePath(join(baseDir, 'packages/my-app'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(appBaseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json', 'package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['my-app', '*'],
        ['react', 'catalog:'],
        ['react-dom', 'catalog:'],
      ]),
    );
    expect(consoleLogMock.calls.map(call => call.arguments)).toEqual([
      ['Dependency "react" could not be resolved for catalog "default"'],
      ['Dependency "react-dom" could not be resolved for catalog "default"'],
    ]);
  });

  it('should not resolve bun catalog references when the dependency missing is not in the catalog', async ({
    mock,
  }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(
      join(fixtures, 'bun-workspace-catalog-missing-dependency'),
    );
    const appBaseDir = normalizeToAbsolutePath(join(baseDir, 'packages/my-app'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(appBaseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json', 'package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['my-app', '*'],
        ['react', '^18.0.0'],
        ['react-dom', 'catalog:'],
        ['jest', 'catalog:testing'],
        ['testing-library', '14.0.0'],
      ]),
    );
    expect(consoleLogMock.calls.map(call => call.arguments)).toEqual([
      ['Dependency "react-dom" could not be resolved for catalog "default"'],
      ['Dependency "jest" could not be resolved for catalog "testing"'],
    ]);
  });

  it('should resolve bun catalog references when the workspace root is not the scan root', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'bun-nested-workspace'));
    const appBaseDir = normalizeToAbsolutePath(join(baseDir, 'bun-app/packages/my-app'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(appBaseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['package-json', 'package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['my-app', '*'],
        ['react', '^18.0.0'],
        ['react-dom', '^19.0.0'],
      ]),
    );
  });

  it('should skip intermediate package.json without catalogs and resolve from a higher ancestor', async () => {
    const baseDir = normalizeToAbsolutePath(
      join(fixtures, 'bun-workspace-intermediate-no-catalog'),
    );
    const appBaseDir = normalizeToAbsolutePath(join(baseDir, 'packages/my-app'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(appBaseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual([
      'package-json',
      'package-json',
      'package-json',
    ]);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['my-app', '*'],
        ['react', '^18.0.0'],
        ['react-dom', '^19.0.0'],
      ]),
    );
  });

  it('should reuse cache for multiple calls on the same bun workspace package', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'bun-workspace-named-catalog'));
    const appBaseDir = normalizeToAbsolutePath(join(baseDir, 'packages/my-app'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    getDependencies(appBaseDir, baseDir);
    const sizeAfterFirst = dependenciesCache.size;

    getDependencies(appBaseDir, baseDir);
    expect(dependenciesCache.size).toEqual(sizeAfterFirst);
  });

  it('should fill deno manifest caches used for dependency lookup', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-dependencies'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(denoJsonsInParentsCache.has(baseDir)).toEqual(true);
    expect(closestDenoJsonCache.has(baseDir)).toEqual(true);
    expect(denoJsoncsInParentsCache.has(baseDir)).toEqual(true);
    expect(closestDenoJsoncCache.has(baseDir)).toEqual(true);
    expect(getDependencies(baseDir, baseDir)).toEqual(
      new Map([
        ['react', '^19.1.0'],
        ['@scope/pkg', '~2.0.0'],
        ['pkgAlias', '~2.0.0'],
      ]),
    );
  });

  it('should parse deno.jsonc with comments and trailing commas', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-jsonc-with-comments'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['deno']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['reactAlias', '^19.1.0'],
        ['react', '^19.1.0'],
      ]),
    );
  });

  it('should include package.json dependencies when deno.json is present in the same directory', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-precedence'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(getDependencies(baseDir, baseDir)).toEqual(
      new Map([
        ['deno-only', '1.2.3'],
        ['react', '^19.0.0'],
        ['package-only', '1.0.0'],
      ]),
    );
  });

  it('should use deno manifest before package.json in the same directory', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'deno-precedence'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['deno', 'package-json']);
    expect(manifests[0].dependencies).toEqual(
      new Map([
        ['deno-only', '1.2.3'],
        ['react', '^19.0.0'],
      ]),
    );
  });

  it('should include react when package.json and deno.json define it at the same level', async () => {
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'same-level-version-conflict'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    const manifests = getDependencyManifests(baseDir, baseDir);
    expect(manifests.map(manifest => manifest.type)).toEqual(['deno', 'package-json']);
    expect(getDependencies(baseDir, baseDir)).toEqual(
      new Map([
        ['react', '^19.1.0'],
        ['reactAlias', '^19.1.0'],
      ]),
    );
  });

  it('should log when a dependency is defined in multiple manifests', async ({ mock }) => {
    mock.method(console, 'debug');
    const consoleLogMock = (console.debug as Mock<typeof console.debug>).mock;
    const baseDir = normalizeToAbsolutePath(join(fixtures, 'same-level-version-conflict'));
    const configuration = createConfiguration({ baseDir });
    await initFileStores(configuration);

    expect(getDependencies(baseDir, baseDir)).toEqual(
      new Map([
        ['react', '^19.1.0'],
        ['reactAlias', '^19.1.0'],
      ]),
    );
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
      new Map([
        ['child-only', '1.0.0'],
        ['shared', '2.0.0'],
        ['parent-only', '1.0.0'],
      ]),
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
    expect(getDependencies(baseDir, baseDir)).toEqual(new Map());
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
