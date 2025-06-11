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

import { PackageJson } from 'type-fest';
import { getFsEvents } from '../../../../../shared/src/helpers/configuration.js';
import { basename, dirname } from 'node:path/posix';
import {
  clearDependenciesCache,
  fillCacheWithNewPath,
  PACKAGE_JSON,
  stripBOM,
} from '../../../rules/index.js';
import { Dirent } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { warn, debug } from '../../../../../shared/src/helpers/logging.js';
import { FileStore } from './store-type.js';
import { SourceFileStore } from './source-files.js';

export const UNINITIALIZED_ERROR =
  'package.json cache has not been initialized. Call loadFiles() first.';

export type PackageJsonWithPath = {
  filePath: string;
  fileContent: PackageJson;
};

export class PackageJsonStore implements FileStore {
  private packageJsons: PackageJsonWithPath[] | undefined = undefined;
  private baseDir: string | undefined = undefined;

  constructor(private readonly filesStore: SourceFileStore) {}

  isInitialized(baseDir: string) {
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
    console.log(currentBaseDir, this.baseDir);
    if (currentBaseDir !== this.baseDir) {
      console.log('clear cache');
      this.clearCache();
      return;
    }
    console.log('have fs events', getFsEvents());
    for (const fileEvent of Object.entries(getFsEvents())) {
      const [filename] = fileEvent;
      console.log(fileEvent, filename);
      const filenameLower = basename(filename).toLowerCase();
      if (filenameLower === PACKAGE_JSON) {
        this.clearCache();
      }
    }
  }

  clearCache() {
    this.packageJsons = undefined;
    this.baseDir = undefined;
    debug('Clearing dependencies cache');
    clearDependenciesCache();
  }

  setup(baseDir: string) {
    this.baseDir = baseDir;
    this.packageJsons = [];
  }

  async process(file: Dirent, filePath: string) {
    if (!this.packageJsons) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    if (file.name === PACKAGE_JSON) {
      try {
        const fileContent = JSON.parse(stripBOM(await readFile(filePath, 'utf8')));
        this.packageJsons.push({ filePath, fileContent });
      } catch (e) {
        warn(`Error parsing package.json ${filePath}: ${e}`);
      }
    }
  }

  async postProcess() {
    if (!this.packageJsons) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    for (const projectPath of this.filesStore.getPaths()) {
      fillCacheWithNewPath(
        projectPath,
        this.packageJsons
          .filter(({ filePath }) => projectPath.startsWith(dirname(filePath)))
          .map(({ fileContent }) => fileContent),
      );
    }
  }
}
