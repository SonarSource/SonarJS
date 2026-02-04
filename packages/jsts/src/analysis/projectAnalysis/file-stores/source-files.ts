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
import { type JsTsFiles, createJsTsFiles } from '../projectAnalysis.js';
import { JSTS_ANALYSIS_DEFAULTS } from '../../../analysis/analysis.js';
import {
  isAnalyzableFile,
  type Configuration,
  getShouldIgnoreParams,
  getFilterPathParams,
} from '../../../../../shared/src/helpers/configuration.js';
import { FileStore } from './store-type.js';
import { accept } from '../../../../../shared/src/helpers/filter/filter.js';
import {
  readFile,
  DirectoryIndex,
  type NormalizedAbsolutePath,
} from '../../../../../shared/src/helpers/files.js';
import { filterPathAndGetFileType } from '../../../../../shared/src/helpers/filter/filter-path.js';
import { dirname } from 'node:path/posix';

export const UNINITIALIZED_ERROR = 'Files cache has not been initialized. Call loadFiles() first.';

export class SourceFileStore implements FileStore {
  private baseDir: NormalizedAbsolutePath | undefined = undefined;
  private readonly ignoredPaths = new Set<string>();
  private files: JsTsFiles | undefined = undefined;
  private readonly directoryIndex = new DirectoryIndex();

  /**
   * Checks if the file store is initialized for the given base directory.
   */
  async isInitialized(configuration: Configuration, inputFiles?: JsTsFiles) {
    const { baseDir } = configuration;
    this.dirtyCachesIfNeeded(baseDir);
    if (inputFiles) {
      this.setup(configuration);
      this.files = inputFiles;
      this.directoryIndex.buildFromFiles(Object.keys(inputFiles) as NormalizedAbsolutePath[]);
      return true;
    }
    return this.files !== undefined;
  }

  getFiles() {
    if (!this.files) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.files;
  }

  /**
   * Gets all filenames in a directory (O(1) lookup).
   * @param dir the directory to look up
   * @returns array of filenames (not full paths) in the directory
   */
  getFilesInDirectory(dir: NormalizedAbsolutePath): string[] {
    return this.directoryIndex.getFilesInDirectory(dir);
  }

  dirtyCachesIfNeeded(currentBaseDir: NormalizedAbsolutePath) {
    if (currentBaseDir !== this.baseDir) {
      this.clearCache();
    }
  }

  clearCache() {
    this.files = undefined;
    this.ignoredPaths.clear();
    this.directoryIndex.clear();
  }

  setup(configuration: Configuration) {
    this.baseDir = configuration.baseDir;
    this.files = createJsTsFiles();
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
        this.files![filename] = {
          fileType,
          filePath: filename,
          fileContent,
          fileStatus: JSTS_ANALYSIS_DEFAULTS.fileStatus,
        };
        this.directoryIndex.addFile(filename);
      }
    }
  }

  processDirectory(dir: NormalizedAbsolutePath, configuration: Configuration) {
    const isExcludedPath = !filterPathAndGetFileType(dir, getFilterPathParams(configuration));
    if (this.anyParentIsIgnored(dir) || isExcludedPath) {
      this.ignoredPaths.add(dir);
    }
  }

  // we check if we already have the contents in the files cache before reading FS
  async getFileContent(filePath: NormalizedAbsolutePath) {
    return this.files?.[filePath]?.fileContent ?? (await readFile(filePath));
  }

  async postProcess(_configuration: Configuration) {
    // No-op: files are added directly in processFile()
  }

  private anyParentIsIgnored(filePath: NormalizedAbsolutePath) {
    return this.ignoredPaths.has(dirname(filePath));
  }
}
