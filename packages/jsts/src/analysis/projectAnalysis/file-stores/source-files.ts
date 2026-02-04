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
import { type JsTsFiles, type StoredJsTsFile, createJsTsFiles } from '../projectAnalysis.js';
import { JSTS_ANALYSIS_DEFAULTS } from '../../../analysis/analysis.js';
import {
  isAnalyzableFile,
  type Configuration,
  getShouldIgnoreParams,
  getFilterPathParams,
} from '../../../../../shared/src/helpers/configuration.js';
import { FileStore, type RawInputFiles } from './store-type.js';
import { accept, shouldIgnoreFile } from '../../../../../shared/src/helpers/filter/filter.js';
import {
  readFile,
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../../shared/src/helpers/files.js';
import { filterPathAndGetFileType } from '../../../../../shared/src/helpers/filter/filter-path.js';
import { dirname } from 'node:path/posix';

export const UNINITIALIZED_ERROR = 'Files cache has not been initialized. Call loadFiles() first.';

type SourceFilesData = {
  files: JsTsFiles | undefined;
  filenames: NormalizedAbsolutePath[] | undefined;
};

export class SourceFileStore implements FileStore {
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private newFiles: StoredJsTsFile[] = [];
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
      files: createJsTsFiles(),
      filenames: [],
    },
  };

  /**
   * Checks if the file store is initialized for the given base directory.
   */
  async isInitialized(configuration: Configuration, inputFiles?: RawInputFiles) {
    const { baseDir, sonarlint } = configuration;
    this.dirtyCachesIfNeeded(baseDir);
    if (sonarlint) {
      await this.sanitizeAndFilterRawFiles('request', inputFiles, configuration);
    } else if (inputFiles) {
      //if we are in SQS, the files in the request will already contain all found files
      this.setup(configuration);
      await this.sanitizeAndFilterRawFiles('found', inputFiles, configuration);
      return true;
    }
    // in sonarlint we just need the found file cache to know how many are there to enable or disable type-checking
    return this.store.found.files !== undefined;
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

  dirtyCachesIfNeeded(currentBaseDir: NormalizedAbsolutePath) {
    if (currentBaseDir !== this.baseDir) {
      this.clearCache();
    }
  }

  clearCache() {
    this.store.found.files = undefined;
    this.store.found.filenames = undefined;
    this.ignoredPaths.clear();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.newFiles = [];
  }

  async processFile(filename: NormalizedAbsolutePath, configuration: Configuration) {
    const shouldIgnoreParams = getShouldIgnoreParams(configuration);
    if (isAnalyzableFile(filename, shouldIgnoreParams) && !this.anyParentIsIgnored(filename)) {
      const fileContent = await this.getFileContent(filename);
      const fileType = filterPathAndGetFileType(filename, getFilterPathParams(configuration));
      // we don't call shouldIgnoreFile because the isJsTsExcluded method has already been
      // called while walking the project tree
      if (fileType && accept(filename, fileContent, shouldIgnoreParams)) {
        // Files discovered from filesystem (not from request) default to 'SAME' status
        this.newFiles.push({
          fileType,
          filePath: filename,
          fileContent,
          fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
        });
      }
    }
  }

  processDirectory(dir: NormalizedAbsolutePath, configuration: Configuration) {
    const isExcludedPath = !filterPathAndGetFileType(dir, getFilterPathParams(configuration!));
    if (this.anyParentIsIgnored(dir) || isExcludedPath) {
      this.ignoredPaths.add(dir);
    }
  }

  // we check if we already have the contents in the HTTP request before reading FS
  async getFileContent(filePath: NormalizedAbsolutePath) {
    return this.store.request.files?.[filePath]?.fileContent ?? (await readFile(filePath));
  }

  async postProcess(_configuration: Configuration) {
    await this.setFiles('found', this.newFiles);
  }

  private async setFiles(
    store: keyof typeof SourceFileStore.prototype.store,
    files: StoredJsTsFile[],
  ) {
    this.resetStore(store);
    for (const file of files) {
      this.saveFileInStore(store, file);
    }
  }

  /**
   * Sanitizes raw input files and filters them before storing.
   * This handles the conversion from RawInputFiles (HTTP input) to StoredJsTsFile,
   * applying path normalization, default values, and file filtering in one pass.
   */
  private async sanitizeAndFilterRawFiles(
    store: keyof typeof SourceFileStore.prototype.store,
    rawFiles: RawInputFiles | undefined,
    configuration: Configuration,
  ) {
    const { baseDir } = configuration;
    const shouldIgnoreParams = getShouldIgnoreParams(configuration);
    this.resetStore(store);
    if (!rawFiles) {
      return;
    }
    for (const rawFile of Object.values(rawFiles)) {
      const rawFilePath = rawFile.filePath as string;
      const rawFileContent = rawFile.fileContent as string | undefined;
      const rawFileType = rawFile.fileType as string | undefined;
      const rawFileStatus = rawFile.fileStatus as string | undefined;

      const filePath = normalizeToAbsolutePath(rawFilePath, baseDir);
      const fileContent = rawFileContent ?? (await readFile(filePath));
      // We need to apply filters if the files come from the request
      if (await shouldIgnoreFile({ filePath, fileContent }, shouldIgnoreParams)) {
        continue;
      }
      this.saveFileInStore(store, {
        filePath,
        fileContent,
        fileType: (rawFileType as StoredJsTsFile['fileType']) ?? JSTS_ANALYSIS_DEFAULTS.fileType,
        fileStatus:
          (rawFileStatus as StoredJsTsFile['fileStatus']) ?? JSTS_ANALYSIS_DEFAULTS.fileStatus,
      });
    }
  }

  private saveFileInStore(
    store: keyof typeof SourceFileStore.prototype.store,
    file: StoredJsTsFile,
  ) {
    // file.filePath is already a NormalizedAbsolutePath from sanitization
    this.store[store].filenames!.push(file.filePath);
    this.store[store].files![file.filePath] = file;
  }

  private resetStore(store: keyof typeof SourceFileStore.prototype.store) {
    this.store[store].files = createJsTsFiles();
    this.store[store].filenames = [];
  }

  private anyParentIsIgnored(filePath: NormalizedAbsolutePath) {
    return this.ignoredPaths.has(dirname(filePath));
  }
}
