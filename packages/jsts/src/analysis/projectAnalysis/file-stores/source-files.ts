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

import type { JsTsFiles } from '../projectAnalysis.js';
import {
  isAnalyzableFile,
  isSonarLint,
  noFs,
} from '../../../../../shared/src/helpers/configuration.js';
import { Dirent } from 'node:fs';
import { FileStore } from './store-type.js';
import { JsTsAnalysisInput } from '../../analysis.js';
import { accept, shouldIgnoreFile } from '../../../../../shared/src/helpers/filter/filter.js';
import { readFile, toUnixPath } from '../../../../../shared/src/helpers/files.js';
import { filterPathAndGetFileType } from '../../../../../shared/src/helpers/filter/filter-path.js';
import { dirname } from 'node:path/posix';

export const UNINITIALIZED_ERROR = 'Files cache has not been initialized. Call loadFiles() first.';

type SourceFilesData = {
  files: JsTsFiles | undefined;
  filenames: string[] | undefined;
};

export class SourceFileStore implements FileStore {
  private baseDir: string | undefined = undefined;
  private newFiles: JsTsAnalysisInput[] = [];
  private readonly ignoredPaths = new Set<string>();
  private readonly store: {
    found: SourceFilesData;
    request: SourceFilesData;
  } = {
    found: {
      files: undefined,
      filenames: undefined,
    },
    request: {
      files: {},
      filenames: [],
    },
  };

  async isInitialized(baseDir: string, inputFiles?: JsTsFiles) {
    this.dirtyCachesIfNeeded(baseDir);
    if (inputFiles && (!isSonarLint() || noFs())) {
      //if we are in SQS or if no FS is allowed, the files in the request will already contain all found files
      this.setup(baseDir);
      await this.filterAndSetFiles('found', Object.values(inputFiles));
      return true;
    } else if (isSonarLint()) {
      await this.filterAndSetFiles('request', Object.values(inputFiles || {}));
    }
    // in sonarlint we just need the found file cache to know how many are there to enable or disable type-checking
    return typeof this.store.found.files !== 'undefined';
  }

  getFoundFiles() {
    if (!this.store.found.files) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.store.found.files;
  }

  getFoundFilenames() {
    if (!this.store.found.filenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.store.found.filenames;
  }

  getFoundFilesCount() {
    if (!this.store.found.filenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.store.found.filenames.length;
  }

  getRequestFilesCount() {
    return this.store.request.filenames!.length;
  }

  getRequestFiles() {
    return this.store.request.files!;
  }

  getRequestFilenames() {
    return this.store.request.filenames!;
  }

  dirtyCachesIfNeeded(currentBaseDir: string) {
    if (currentBaseDir !== this.baseDir) {
      this.clearCache();
    }
  }

  clearCache() {
    this.store.found.files = undefined;
    this.store.found.filenames = undefined;
    this.ignoredPaths.clear();
  }

  setup(baseDir: string) {
    this.baseDir = baseDir;
    this.newFiles = [];
  }

  async processFile(file: Dirent, filePath: string) {
    if (isAnalyzableFile(file.name) && !this.anyParentIsIgnored(filePath)) {
      const fileContent = await this.getFileContent(filePath);
      const fileType = filterPathAndGetFileType(filePath);
      // we don't call shouldIgnoreFile because the isJsTsExcluded method has already been
      // called while walking the project tree
      if (fileType && accept(filePath, fileContent)) {
        this.newFiles.push({ fileType, filePath, fileContent });
      }
    }
  }

  processDirectory(dir: string) {
    if (this.anyParentIsIgnored(dir) || !filterPathAndGetFileType(dir)) {
      this.ignoredPaths.add(dir);
    }
  }

  // we check if we already have the contents in the HTTP request before reading FS
  async getFileContent(filePath: string) {
    return this.store.request.files?.[filePath]?.fileContent ?? (await readFile(filePath));
  }

  async postProcess() {
    await this.setFiles('found', this.newFiles);
  }

  private async setFiles(
    store: keyof typeof SourceFileStore.prototype.store,
    files: JsTsAnalysisInput[],
  ) {
    this.resetStore(store);
    for (const file of files) {
      this.saveFileInStore(store, file);
    }
  }

  private async filterAndSetFiles(
    store: keyof typeof SourceFileStore.prototype.store,
    files: JsTsAnalysisInput[],
  ) {
    this.resetStore(store);
    for (const file of files) {
      // We need to apply filters if the files come from the request
      if (await shouldIgnoreFile(file)) {
        continue;
      }
      this.saveFileInStore(store, file);
    }
  }

  private saveFileInStore(
    store: keyof typeof SourceFileStore.prototype.store,
    file: JsTsAnalysisInput,
  ) {
    file.filePath = toUnixPath(file.filePath);
    this.store[store].filenames!.push(file.filePath);
    this.store[store].files![file.filePath] = file;
  }

  private resetStore(store: keyof typeof SourceFileStore.prototype.store) {
    this.store[store].files = {};
    this.store[store].filenames = [];
  }

  private anyParentIsIgnored(filePath: string) {
    return this.ignoredPaths.has(dirname(filePath));
  }
}
