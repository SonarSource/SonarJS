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
import { dirname, join } from 'node:path/posix';
import {
  getMaxFileSize,
  getTestPaths,
  isAnalyzableFile,
  isJsTsFile,
  isSonarLint,
} from '../../../../../shared/src/helpers/configuration.js';
import { readFile } from 'node:fs/promises';
import { accept } from '../filter/filter.js';
import { Dirent } from 'node:fs';
import { FileType } from '../../../../../shared/src/helpers/files.js';
import { FileStore } from './store-type.js';
import { JsTsAnalysisInput } from '../../analysis.js';

export const UNINITIALIZED_ERROR = 'Files cache has not been initialized. Call loadFiles() first.';

export class SourceFileStore implements FileStore {
  private baseDir: string | undefined = undefined;
  private files: JsTsFiles | undefined = undefined;
  private newFiles: JsTsAnalysisInput[] = [];
  private filenames: string[] | undefined = undefined;
  private paths: Set<string> | undefined = undefined;
  private testPaths: string[] | undefined = undefined;
  private requestFiles: JsTsFiles | undefined = undefined;
  private requestFilenames: string[] | undefined = undefined;

  isInitialized(baseDir: string, files?: JsTsFiles) {
    this.setRequestFiles(Object.values(files || {}));
    if (!isSonarLint() && files) {
      //if we are in SQS files will contain already all found files
      this.setup(baseDir);
      this.setFoundFiles(Object.values(files || {}));
      return true;
    }
    this.dirtyCachesIfNeeded(baseDir);

    // in sonarlint we just need the found file cache to know how many are there to enable or disable type-checking
    return typeof files !== 'undefined';
  }

  getFoundFilesCount() {
    if (!this.filenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.filenames.length;
  }

  getFoundFiles() {
    if (!this.files) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.files;
  }

  getFoundFilenames() {
    if (!this.filenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.filenames;
  }

  getRequestFilesCount() {
    if (!this.requestFilenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.requestFilenames.length;
  }

  getRequestFiles() {
    if (!this.requestFiles) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.requestFiles;
  }

  getRequestFilenames() {
    if (!this.filenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.requestFilenames;
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
    this.files = undefined;
    this.filenames = undefined;
    this.paths = undefined;
  }

  setup(baseDir: string) {
    this.baseDir = baseDir;
    this.files = {};
    this.newFiles = [];
    this.filenames = [];
    this.paths = new Set<string>();
    this.testPaths = getTestPaths()?.map(test => toUnixPath(join(baseDir, test)));
  }

  async process(file: Dirent, filePath: string) {
    if (isAnalyzableFile(file.name)) {
      const fileType = this.getFiletype(filePath, this.testPaths);
      if (isJsTsFile(file.name)) {
        const fileContent = await this.getFileContent(filePath);
        if (accept(filePath, fileContent, getMaxFileSize())) {
          this.newFiles.push({ fileType, filePath, fileContent });
        }
      } else {
        this.newFiles.push({ fileType, filePath });
      }
    }
  }

  // we check if we already have the contents in the HTTP request before reading FS
  async getFileContent(filePath: string) {
    return this.requestFiles?.[filePath]?.fileContent ?? (await readFile(filePath, 'utf8'));
  }

  getFiletype(filePath: string, testPaths?: string[]): FileType {
    if (testPaths?.length) {
      const parent = dirname(filePath);
      if (testPaths?.some(testPath => parent.startsWith(testPath))) {
        return 'TEST';
      }
    }
    return 'MAIN';
  }

  async postProcess() {
    this.setFoundFiles(this.newFiles);
  }

  setFoundFiles(newFiles: JsTsAnalysisInput[]) {
    for (const file of newFiles) {
      const filename = toUnixPath(file.filePath);
      this.paths!.add(dirname(filename));
      this.filenames!.push(filename);
      file.filePath = filename;
      this.files![filename] = file;
    }
  }

  setRequestFiles(newFiles: JsTsAnalysisInput[]) {
    this.requestFilenames = [];
    this.requestFiles = {};
    for (const file of newFiles) {
      const filename = toUnixPath(file.filePath);
      file.filePath = filename;
      this.requestFilenames.push(filename);
      this.requestFiles[filename] = file;
    }
  }
}
