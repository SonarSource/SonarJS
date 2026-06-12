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
import { readFile } from 'node:fs/promises';
import { warn, debug } from '../../../shared/src/helpers/logging.js';
import type { FileStore } from './store-type.js';
import {
  type File,
  type NormalizedAbsolutePath,
  dirnamePath,
} from '../../../shared/src/helpers/files.js';
import type { Configuration } from '../common/configuration.js';
import {
  clearDependenciesCache,
  getPreloadableDependencyManifestName,
  PACKAGE_JSON,
  fillManifestCaches,
  PRELOADABLE_DEPENDENCY_MANIFESTS,
  type PreloadableDependencyManifestName,
  isPreloadableDependencyManifestPath,
} from '../jsts/rules/helpers/dependency-manifests/index.js';
import { getProjectFileDiscoveryConfigKey } from '../common/configuration.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';

export const UNINITIALIZED_ERROR =
  'dependency manifest cache has not been initialized. Call loadFiles() first.';

type ManifestFilesByName = Record<
  PreloadableDependencyManifestName,
  Map<NormalizedAbsolutePath, File>
>;

function createManifestFilesByName(): ManifestFilesByName {
  return Object.fromEntries(
    PRELOADABLE_DEPENDENCY_MANIFESTS.map(manifestName => [manifestName, new Map()]),
  ) as ManifestFilesByName;
}

class DependencyManifestStore implements FileStore {
  private readonly manifestsByName = createManifestFilesByName();
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private canAccessFileSystem: boolean | undefined = undefined;
  private projectFileDiscoveryConfigKey: string | undefined = undefined;
  private readonly dirnameToParent: Map<
    NormalizedAbsolutePath,
    NormalizedAbsolutePath | undefined
  > = new Map();

  async isInitialized(configuration: Configuration, _inputFiles?: AnalyzableFiles) {
    this.dirtyCachesIfNeeded(configuration);
    return this.baseDir !== undefined;
  }

  getPackageJsons() {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.manifestsByName[PACKAGE_JSON];
  }

  dirtyCachesIfNeeded(configuration: Configuration) {
    const { baseDir, canAccessFileSystem, fsEvents } = configuration;
    if (
      baseDir !== this.baseDir ||
      canAccessFileSystem !== this.canAccessFileSystem ||
      getProjectFileDiscoveryConfigKey(configuration) !== this.projectFileDiscoveryConfigKey
    ) {
      this.clearCache();
      return;
    }
    for (const filename of fsEvents) {
      if (isPreloadableDependencyManifestPath(filename)) {
        this.clearCache();
        return;
      }
    }
  }

  clearCache() {
    this.baseDir = undefined;
    this.canAccessFileSystem = undefined;
    this.projectFileDiscoveryConfigKey = undefined;
    for (const manifestFiles of Object.values(this.manifestsByName)) {
      manifestFiles.clear();
    }
    this.dirnameToParent.clear();
    debug('Clearing dependencies cache');
    clearDependenciesCache();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.canAccessFileSystem = configuration.canAccessFileSystem;
    this.projectFileDiscoveryConfigKey = getProjectFileDiscoveryConfigKey(configuration);
    this.dirnameToParent.set(configuration.baseDir, undefined);
  }

  async processFile(filename: NormalizedAbsolutePath) {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    if (!isPreloadableDependencyManifestPath(filename)) {
      return;
    }
    try {
      const content = await readFile(filename, 'utf-8');
      const file = { content, path: filename };
      const manifestName = getPreloadableDependencyManifestName(filename);
      if (manifestName) {
        this.manifestsByName[manifestName].set(dirnamePath(filename), file);
      }
    } catch (e) {
      warn(`Error reading dependency manifest ${filename}: ${e}`);
    }
  }

  processDirectory(dir: NormalizedAbsolutePath) {
    this.dirnameToParent.set(dir, dirnamePath(dir));
  }

  async postProcess(_configuration: Configuration, _inputFiles?: AnalyzableFiles) {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    for (const manifestName of PRELOADABLE_DEPENDENCY_MANIFESTS) {
      fillManifestCaches(
        manifestName,
        this.manifestsByName[manifestName],
        this.dirnameToParent,
        this.baseDir,
      );
    }
  }
}

export const dependencyManifestStore = new DependencyManifestStore();
