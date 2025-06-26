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

import type { PackageJson } from 'type-fest';
import { getFsEvents } from '../../../../../shared/src/helpers/configuration.js';
import { basename, dirname } from 'node:path/posix';
import {
  clearDependenciesCache,
  fillCacheWithNewPath,
  PACKAGE_JSON,
} from '../../../rules/index.js';
import type { Dirent } from 'node:fs';
import { warn, debug } from '../../../../../shared/src/helpers/logging.js';
import { FileStore } from './store-type.js';
import { readFile } from '../../../../../shared/src/helpers/files.js';

export const UNINITIALIZED_ERROR =
  'package.json cache has not been initialized. Call loadFiles() first.';

type PackageJsonWithPath = {
  filePath: string;
  fileContent: PackageJson;
};

export class PackageJsonStore implements FileStore {
  private packageJsons: PackageJsonWithPath[] | undefined = undefined;
  private baseDir: string | undefined = undefined;
  private readonly paths = new Set<string>();

  async isInitialized(baseDir: string) {
    this.dirtyCachesIfNeeded(baseDir);
    return typeof this.packageJsons !== 'undefined';
  }

  getPackageJsons() {
    if (!this.packageJsons) {
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
      const filenameLower = basename(filename).toLowerCase();
      if (filenameLower === PACKAGE_JSON) {
        this.clearCache();
      }
    }
  }

  clearCache() {
    this.packageJsons = undefined;
    this.baseDir = undefined;
    this.paths.clear();
    debug('Clearing dependencies cache');
    clearDependenciesCache();
  }

  setup(baseDir: string) {
    this.baseDir = baseDir;
    this.paths.add(baseDir);
    this.packageJsons = [];
  }

  async processFile(file: Dirent, filePath: string) {
    if (!this.packageJsons) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    if (file.name === PACKAGE_JSON) {
      try {
        const fileContent = JSON.parse(await readFile(filePath));
        this.packageJsons.push({ filePath, fileContent });
      } catch (e) {
        warn(`Error parsing package.json ${filePath}: ${e}`);
      }
    }
  }

  processDirectory(dir: string) {
    this.paths.add(dir);
  }

  async postProcess() {
    if (!this.packageJsons) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    for (const projectPath of this.paths) {
      fillCacheWithNewPath(
        projectPath,
        this.packageJsons
          .filter(({ filePath }) => projectPath.startsWith(dirname(filePath)))
          .map(({ fileContent }) => fileContent),
      );
    }
  }
}
