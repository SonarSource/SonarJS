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
import fs from 'node:fs';
import {
  stripBOM,
  dirnamePath,
  basenamePath,
  type NormalizedAbsolutePath,
} from '../../../jsts/src/rules/helpers/index.js';
export * from '../../../jsts/src/rules/helpers/index.js';

/**
 * The type of input file
 *
 * The scanner indexes input files based on the project configuration,
 * if any. It determines wheter an input file denotes a `MAIN` file,
 * i.e., a source file, or a `TEST` file.
 *
 * The type of input file is then used by the linter to select which
 * rule configurations to apply, that is, which rules the linter should
 * use to analyze the file.
 */
export type FileType = 'MAIN' | 'TEST';

/**
 * Asynchronous read of file contents from a file path
 *
 * The function gets rid of any Byte Order Marker (BOM)
 * present in the file's header.
 *
 * @param filePath the path of a file
 * @returns Promise which resolves with the content of the file
 */
export async function readFile(filePath: NormalizedAbsolutePath) {
  const fileContent = await fs.promises.readFile(filePath, { encoding: 'utf8' });
  return stripBOM(fileContent);
}

/**
 * A data structure for efficient directory-to-files lookup.
 * Supports both incremental building (via addFile) and batch building (via buildFromFiles).
 */
export class DirectoryIndex {
  private index = new Map<NormalizedAbsolutePath, Set<string>>();

  /**
   * Adds a single file to the directory index.
   * @param filePath the absolute path of the file to add
   */
  addFile(filePath: NormalizedAbsolutePath) {
    const dir = dirnamePath(filePath);
    let files = this.index.get(dir);
    if (!files) {
      files = new Set();
      this.index.set(dir, files);
    }
    files.add(basenamePath(filePath));
  }

  /**
   * Builds the index from a list of file paths.
   * @param filePaths array of absolute file paths
   */
  buildFromFiles(filePaths: NormalizedAbsolutePath[]) {
    for (const filePath of filePaths) {
      this.addFile(filePath);
    }
  }

  /**
   * Gets all filenames in a directory.
   * @param dir the directory to look up
   * @returns array of filenames (not full paths) in the directory
   */
  getFilesInDirectory(dir: NormalizedAbsolutePath): Set<string> | undefined {
    return this.index.get(dir);
  }

  /**
   * Clears the directory index.
   */
  clear() {
    this.index = new Map<NormalizedAbsolutePath, Set<string>>();
  }
}
