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

  isInitialized(baseDir: string, files?: JsTsFiles) {
    if (!isSonarLint() && files) {
      this.setup(baseDir);
      this.setFiles(Object.values(files));
      return true;
    }
    // in sonarlint we just need the file cache to know how many are there to enable or disable type-checking
    this.dirtyCachesIfNeeded(baseDir);
    return typeof files !== 'undefined';
  }

  getFilesCount() {
    if (!this.filenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.filenames.length;
  }

  getFiles() {
    if (!this.files) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.files;
  }

  getFilenames() {
    if (!this.filenames) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.filenames;
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
        const fileContent = await readFile(filePath, 'utf8');
        if (accept(filePath, fileContent, getMaxFileSize())) {
          this.newFiles.push({ fileType, filePath, fileContent });
        }
      } else {
        this.newFiles.push({ fileType, filePath });
      }
    }
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

  postProcess() {
    this.setFiles(this.newFiles);
  }

  setFiles(newFiles: JsTsAnalysisInput[]) {
    newFiles.forEach(file => {
      const filename = toUnixPath(file.filePath);
      this.paths!.add(dirname(filename));
      this.filenames!.push(filename);
      file.filePath = filename;
      this.files![filename] = file;
    });
  }
}
