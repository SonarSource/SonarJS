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
import { toUnixPath } from '../../../rules/index.js';
import { dirname } from 'node:path/posix';
import { isAnalyzableFile, isSonarLint } from '../../../../../shared/src/helpers/configuration.js';
import { Dirent } from 'node:fs';
import { FileStore } from './store-type.js';
import { JsTsAnalysisInput } from '../../analysis.js';
import { accept } from '../../../../../shared/src/helpers/filter/filter.js';
import { FileType, readFile } from '../../../../../shared/src/helpers/files.js';
import { isJsTsExcluded } from '../../../../../shared/src/helpers/filter/filter-path.js';

export const UNINITIALIZED_ERROR = 'Files cache has not been initialized. Call loadFiles() first.';

type SourceFilesData = {
  files: JsTsFiles | undefined;
  filenames: string[] | undefined;
};

export class SourceFileStore implements FileStore {
  private baseDir: string | undefined = undefined;
  private newFiles: JsTsAnalysisInput[] = [];
  private paths: Set<string> | undefined = undefined;
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
    if (isSonarLint()) {
      await this.setFiles('request', Object.values(inputFiles || {}));
    } else if (inputFiles) {
      //if we are in SQS, the files in the request will already contain all found files
      this.setup(baseDir);
      await this.setFiles('found', Object.values(inputFiles));
      return true;
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

  getPaths() {
    if (!this.paths) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.paths;
  }

  dirtyCachesIfNeeded(currentBaseDir: string) {
    if (currentBaseDir !== this.baseDir) {
      this.clearCache();
    }
  }

  clearCache() {
    this.store.found.files = undefined;
    this.store.found.filenames = undefined;
    this.paths = undefined;
  }

  setup(baseDir: string) {
    this.baseDir = baseDir;
    this.newFiles = [];
  }

  async process(file: Dirent, filePath: string, fileType: FileType) {
    if (isAnalyzableFile(file.name)) {
      const fileContent = await this.getFileContent(filePath);
      if (accept(filePath, fileContent)) {
        this.newFiles.push({ fileType, filePath, fileContent });
      }
    }
  }

  // we check if we already have the contents in the HTTP request before reading FS
  async getFileContent(filePath: string) {
    return this.store.request.files?.[filePath]?.fileContent ?? (await readFile(filePath));
  }

  async postProcess() {
    await this.setFiles('found', this.newFiles, false);
  }

  async setFiles(
    store: keyof typeof SourceFileStore.prototype.store,
    files: JsTsAnalysisInput[],
    filter = true,
  ) {
    this.store[store].files = {};
    this.store[store].filenames = [];
    if (store === 'found') {
      // in sonarlint we don't want the request files to reset paths
      this.paths = new Set<string>();
    }
    for (const file of files) {
      if (filter) {
        // We need to apply filters if the files come from the request
        const filename = toUnixPath(file.filePath);
        file.filePath = filename;
        if (
          isJsTsExcluded(filename) ||
          !accept(filename, file.fileContent ?? (await readFile(filename)))
        ) {
          continue;
        }
      }
      if (store === 'found') {
        this.paths!.add(dirname(file.filePath));
      }
      this.store[store].filenames.push(file.filePath);
      this.store[store].files[file.filePath] = file;
    }
  }
}
