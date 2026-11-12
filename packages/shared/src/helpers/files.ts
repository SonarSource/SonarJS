/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
  FileSystemMap,
  FileSystemSet,
} from '../../../analysis/src/jsts/rules/helpers/filesystem.js';
import {
  basenamePath,
  dirnamePath,
  stripBOM,
} from '../../../analysis/src/jsts/rules/helpers/files.js';
export { stripBOM };
import type { NormalizedAbsolutePath } from '../../../analysis/src/jsts/rules/helpers/files.js';

// Accepted layer inversion: shared re-exports rules-side path helpers so non-rules code can
// import only from shared while keeping eslint-plugin-sonarjs binary generation scoped to rules.
export {
  dirnamePath,
  isAbsolutePath,
  isWindowsProjectPath,
  isRoot,
  getPathRoot,
  joinPaths,
  normalizePath,
  normalizeToAbsolutePath,
} from '../../../analysis/src/jsts/rules/helpers/files.js';
export type {
  File,
  NormalizedAbsolutePath,
} from '../../../analysis/src/jsts/rules/helpers/files.js';

const UTF16_BOM_HIGH_BYTE = 0xfe;
const UTF16_BOM_LOW_BYTE = 0xff;

/**
 * Asynchronous read of file contents from a file path
 *
 * Detects UTF-8 and UTF-16 byte order marks, matching TypeScript's file reader.
 * The returned text does not include the BOM.
 *
 * @param filePath the path of a file
 * @returns Promise which resolves with the content of the file
 */
export async function readFile(filePath: NormalizedAbsolutePath) {
  return decodeFileContent(await fs.promises.readFile(filePath));
}

/** Decode without modifying the bytes retained by filesystem recording or replay. */
export function decodeFileContent(content: Buffer): string {
  if (content[0] === UTF16_BOM_HIGH_BYTE && content[1] === UTF16_BOM_LOW_BYTE) {
    // As in TypeScript, ignore an incomplete trailing UTF-16 code unit.
    return Buffer.from(content.subarray(2, content.length & ~1))
      .swap16()
      .toString('utf16le');
  }
  if (content[0] === UTF16_BOM_LOW_BYTE && content[1] === UTF16_BOM_HIGH_BYTE) {
    return content.toString('utf16le', 2);
  }
  return stripBOM(content.toString('utf8'));
}

/**
 * A data structure for efficient directory-to-files lookup.
 * Supports both incremental building (via addFile) and batch building (via buildFromFiles).
 */
export class DirectoryIndex {
  private index = new FileSystemMap<NormalizedAbsolutePath, Set<string>>();

  /**
   * Adds a single file to the directory index.
   * @param filePath the absolute path of the file to add
   */
  addFile(filePath: NormalizedAbsolutePath) {
    const dir = dirnamePath(filePath);
    let files = this.index.get(dir);
    if (!files) {
      files = new FileSystemSet();
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
    this.index = new FileSystemMap<NormalizedAbsolutePath, Set<string>>();
  }
}
