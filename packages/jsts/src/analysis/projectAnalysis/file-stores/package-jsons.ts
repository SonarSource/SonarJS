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
import { readFile } from 'node:fs/promises';
import { warn, debug } from '../../../../../shared/src/helpers/logging.js';
import { FileStore } from './store-type.js';
import {
  type File,
  type NormalizedAbsolutePath,
  dirnamePath,
} from '../../../rules/helpers/files.js';
import type { Configuration } from '../../../../../shared/src/helpers/configuration.js';
import {
  clearDependenciesCache,
  fillPackageJsonCaches,
  isPackageJson,
} from '../../../rules/helpers/package-jsons/index.js';

export const UNINITIALIZED_ERROR =
  'package.json cache has not been initialized. Call loadFiles() first.';

export class PackageJsonStore implements FileStore {
  private readonly packageJsons: Map<NormalizedAbsolutePath, File> = new Map();
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
    for (const filename of Object.keys(fsEvents)) {
      if (isPackageJson(filename as NormalizedAbsolutePath)) {
        this.clearCache();
        return;
      }
    }
  }

  clearCache() {
    this.baseDir = undefined;
    this.packageJsons.clear();
    this.dirnameToParent.clear();
    debug('Clearing dependencies cache');
    clearDependenciesCache();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.dirnameToParent.set(configuration.baseDir, undefined);
  }

  async processFile(filename: NormalizedAbsolutePath, _configuration: Configuration) {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    if (isPackageJson(filename)) {
      try {
        const content = await readFile(filename, 'utf-8');
        this.packageJsons.set(dirnamePath(filename), {
          content,
          path: filename,
        });
      } catch (e) {
        warn(`Error reading package.json ${filename}: ${e}`);
      }
    }
  }

  processDirectory(dir: NormalizedAbsolutePath) {
    this.dirnameToParent.set(dir, dirnamePath(dir));
  }

  async postProcess(_configuration: Configuration) {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    fillPackageJsonCaches(this.packageJsons, this.dirnameToParent, this.baseDir);
  }
}
