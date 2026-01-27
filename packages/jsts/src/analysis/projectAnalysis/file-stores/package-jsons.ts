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
import { getFsEvents } from '../../../../../shared/src/helpers/configuration.js';
import { dirname } from 'node:path/posix';
import { readFile } from 'node:fs/promises';
import { warn, debug } from '../../../../../shared/src/helpers/logging.js';
import { FileStore } from './store-type.js';
import type { File } from '../../../rules/helpers/files.js';
import {
  clearDependenciesCache,
  fillPackageJsonCaches,
  isPackageJson,
} from '../../../rules/helpers/package-jsons/index.js';

export const UNINITIALIZED_ERROR =
  'package.json cache has not been initialized. Call loadFiles() first.';

export class PackageJsonStore implements FileStore {
  private readonly packageJsons: Map<string, File> = new Map();
  private baseDir: string | undefined = undefined;
  private readonly dirnameToParent: Map<string, string | undefined> = new Map();

  async isInitialized(baseDir: string) {
    this.dirtyCachesIfNeeded(baseDir);
    return this.baseDir !== undefined;
  }

  getPackageJsons() {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.packageJsons;
  }

  dirtyCachesIfNeeded(currentBaseDir: string) {
    if (currentBaseDir !== this.baseDir) {
      this.clearCache();
      return;
    }
    for (const fileEvent of Object.entries(getFsEvents())) {
      const [filename] = fileEvent;
      if (isPackageJson(filename)) {
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

  setup(baseDir: string) {
    this.baseDir = baseDir;
    this.dirnameToParent.set(baseDir, undefined);
  }

  async processFile(filename: string) {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    if (isPackageJson(filename)) {
      try {
        const content = await readFile(filename, 'utf-8');
        this.packageJsons.set(dirname(filename), { content, path: filename });
      } catch (e) {
        warn(`Error reading package.json ${filename}: ${e}`);
      }
    }
  }

  processDirectory(dir: string) {
    const parent = dirname(dir);
    this.dirnameToParent.set(dir, parent);
  }

  async postProcess() {
    if (!this.baseDir) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    fillPackageJsonCaches(this.packageJsons, this.dirnameToParent, this.baseDir);
  }
}
