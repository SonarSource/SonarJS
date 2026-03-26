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
  basename as basenamePosix,
  dirname as dirnamePosix,
  isAbsolute as isUnixAbsolute,
  join as joinPosix,
  resolve as resolvePosix,
} from 'node:path/posix';
import { isAbsolute as isWinAbsolute, resolve as resolveWin32 } from 'node:path/win32';

type NormalizedPath = string & { readonly __normalizedPathBrand: 'NormalizedPath' };
export type NormalizedAbsolutePath = string & {
  readonly __normalizedAbsolutePathBrand: 'NormalizedAbsolutePath';
};

/**
 * Root path constant for Unix filesystem
 */
export const ROOT_PATH = '/' as NormalizedAbsolutePath;

/**
 * Byte Order Marker
 */
const BOM_BYTE = 0xfeff;

/**
 * Removes any Byte Order Marker (BOM) from a string's head
 *
 * A string's head is nothing else but its first character.
 *
 * @param str the input string
 * @returns the stripped string
 */
function stripBOM(str: string) {
  if (str.codePointAt(0) === BOM_BYTE) {
    return str.slice(1);
  }
  return str;
}

const isWindows = process.platform === 'win32';

/**
 * Normalizes a path to Unix format (forward slashes).
 * For absolute paths on Windows, resolves them to ensure they have a drive letter.
 * For relative paths, only converts slashes without resolving.
 * Cross-platform behavior:
 * - On Windows: all absolute paths are resolved with win32 to add drive letter
 * - On Linux: paths are only converted (slashes), no resolution needed
 * @param filePath the path to normalize
 * @returns the normalized path as a branded UnixPath type
 */
export function normalizePath(filePath: string): NormalizedPath {
  if (isWindows && isAbsolutePath(filePath)) {
    // On Windows, resolve to add drive letter if missing
    filePath = resolveWin32(filePath);
  }
  return toUnixPath(filePath) as NormalizedPath;
}

/**
 * Normalizes a path to an absolute Unix format.
 * Guarantees the returned path is absolute.
 * @param filePath the path to normalize
 * @param baseDir base directory to resolve relative paths against
 * @returns the normalized path as a branded AbsoluteUnixPath type
 */
export function normalizeToAbsolutePath(
  filePath: string,
  baseDir = ROOT_PATH,
): NormalizedAbsolutePath {
  if (isAbsolutePath(filePath)) {
    // On Windows, resolve to add drive letter if missing
    filePath = resolveWin32(filePath);
  } else {
    filePath = isWindows ? resolveWin32(baseDir, filePath) : resolvePosix(baseDir, filePath);
  }
  return toUnixPath(filePath) as NormalizedAbsolutePath;
}

function toUnixPath(filePath: string) {
  return filePath.replaceAll(/[\\/]+/g, '/');
}

export function isAbsolutePath(path: string) {
  // Check for Windows drive letter (e.g., 'c:', 'C:', 'D:')
  // Node's isAbsolute considers 'c:' as relative (drive-relative), but we treat it as absolute
  if (/^[a-zA-Z]:/.test(path)) {
    return true;
  }
  return isUnixAbsolute(path) || isWinAbsolute(path);
}

/**
 * Type-safe dirname that preserves the NormalizedAbsolutePath brand.
 * The dirname of an absolute path is always absolute.
 * @param filePath the absolute path to get the directory of
 * @returns the parent directory as a branded NormalizedAbsolutePath
 */
function dirnamePath(filePath: NormalizedAbsolutePath): NormalizedAbsolutePath {
  return dirnamePosix(filePath) as NormalizedAbsolutePath;
}

/**
 * Type-safe path join that preserves the NormalizedAbsolutePath brand.
 * Joins path segments using posix separators.
 * @param base the base absolute path
 * @param segments additional path segments to join
 * @returns the joined path as a branded NormalizedAbsolutePath
 */
export function joinPaths(
  base: NormalizedAbsolutePath,
  ...segments: string[]
): NormalizedAbsolutePath {
  return joinPosix(base, ...segments) as NormalizedAbsolutePath;
}

/**
 * Type-safe basename that extracts the filename from a path.
 * @param filePath the path to extract the basename from
 * @returns the filename (last segment of the path)
 */
function basenamePath(filePath: NormalizedPath | NormalizedAbsolutePath): string {
  return basenamePosix(filePath);
}

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
