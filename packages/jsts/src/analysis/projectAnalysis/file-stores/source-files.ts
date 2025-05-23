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
  private foundFiles: JsTsFiles | undefined = undefined;
  private newFiles: JsTsAnalysisInput[] = [];
  private foundFilenames: string[] | undefined = undefined;
  private paths: Set<string> | undefined = undefined;
  private testPaths: string[] | undefined = undefined;
  private requestFiles: JsTsFiles | undefined = undefined;
  private requestFilenames: string[] | undefined = undefined;

  isInitialized(baseDir: string, inputFiles?: JsTsFiles) {
    this.dirtyCachesIfNeeded(baseDir);
    if (isSonarLint()) {
      this.setRequestFiles(Object.values(inputFiles || {}));
      // in sonarlint we just need the found file cache to know how many are there to enable or disable type-checking
      return typeof this.foundFiles !== 'undefined';
    } else {
      if (inputFiles) {
        //if we are in SQS files will contain already all found files
        this.setup(baseDir);
        this.setFoundFiles(Object.values(inputFiles));
        return true;
      }
      return typeof this.foundFiles !== 'undefined';
    }
  }

  getFoundFilesCount() {
    if (!this.foundFilenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.foundFilenames.length;
  }

  getFoundFiles() {
    if (!this.foundFiles) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.foundFiles;
  }

  getFoundFilenames() {
    if (!this.foundFilenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.foundFilenames;
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
    if (!this.foundFilenames) {
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
    this.foundFiles = undefined;
    this.foundFilenames = undefined;
    this.paths = undefined;
  }

  setup(baseDir: string) {
    this.baseDir = baseDir;
    this.foundFiles = {};
    this.newFiles = [];
    this.foundFilenames = [];
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
      this.foundFilenames!.push(filename);
      file.filePath = filename;
      this.foundFiles![filename] = file;
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
