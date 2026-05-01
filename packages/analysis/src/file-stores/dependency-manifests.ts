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
  DENO_JSON,
  DENO_JSONC,
  getDependencyManifestName,
  isDependencyManifestPath,
  PACKAGE_JSON,
  fillManifestCaches,
  PNPM_WORKSPACE_YAML,
} from '../jsts/rules/helpers/dependency-manifests/index.js';
import { basename } from 'node:path/posix';

export const UNINITIALIZED_ERROR =
  'dependency manifest cache has not been initialized. Call loadFiles() first.';

export class DependencyManifestStore implements FileStore {
  private readonly packageJsons: Map<NormalizedAbsolutePath, File> = new Map();
  private readonly denoManifestsByName: Record<
    typeof DENO_JSON | typeof DENO_JSONC,
    Map<NormalizedAbsolutePath, File>
  > = {
    [DENO_JSON]: new Map(),
    [DENO_JSONC]: new Map(),
  };
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private readonly dirnameToParent: Map<
    NormalizedAbsolutePath,
    NormalizedAbsolutePath | undefined
  > = new Map();

  async isInitialized(configuration: Configuration) {
    this.dirtyCachesIfNeeded(configuration);
    return this.baseDir !== undefined;
  }

  getPackageJsons() {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.packageJsons;
  }

  dirtyCachesIfNeeded(configuration: Configuration) {
    const { baseDir, fsEvents } = configuration;
    if (baseDir !== this.baseDir) {
      this.clearCache();
      return;
    }
    for (const filename of fsEvents) {
      if (
        isDependencyManifestPath(filename) ||
        basename(filename).toLowerCase() === PNPM_WORKSPACE_YAML
      ) {
        this.clearCache();
        return;
      }
    }
  }

  clearCache() {
    this.baseDir = undefined;
    this.packageJsons.clear();
    this.denoManifestsByName[DENO_JSON].clear();
    this.denoManifestsByName[DENO_JSONC].clear();
    this.dirnameToParent.clear();
    debug('Clearing dependencies cache');
    clearDependenciesCache();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.dirnameToParent.set(configuration.baseDir, undefined);
  }

  async processFile(filename: NormalizedAbsolutePath) {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    if (!isDependencyManifestPath(filename)) {
      return;
    }
    try {
      const content = await readFile(filename, 'utf-8');
      const file = { content, path: filename };
      const manifestName = getDependencyManifestName(filename);
      if (manifestName === PACKAGE_JSON) {
        this.packageJsons.set(dirnamePath(filename), file);
      } else if (manifestName) {
        this.denoManifestsByName[manifestName].set(dirnamePath(filename), file);
      }
    } catch (e) {
      warn(`Error reading dependency manifest ${filename}: ${e}`);
    }
  }

  processDirectory(dir: NormalizedAbsolutePath) {
    this.dirnameToParent.set(dir, dirnamePath(dir));
  }

  async postProcess() {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    fillManifestCaches(PACKAGE_JSON, this.packageJsons, this.dirnameToParent, this.baseDir);
    fillManifestCaches(
      DENO_JSON,
      this.denoManifestsByName[DENO_JSON],
      this.dirnameToParent,
      this.baseDir,
    );
    fillManifestCaches(
      DENO_JSONC,
      this.denoManifestsByName[DENO_JSONC],
      this.dirnameToParent,
      this.baseDir,
    );
  }
}
