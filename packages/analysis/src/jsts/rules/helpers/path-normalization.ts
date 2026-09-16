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
import { isAbsolute as isUnixAbsolute, resolve as resolvePosix } from 'node:path/posix';
import { isAbsolute as isWinAbsolute, resolve as resolveWin32 } from 'node:path/win32';

export type NormalizedPath = string & { readonly __normalizedPathBrand: 'NormalizedPath' };
export type NormalizedAbsolutePath = string & {
  readonly __normalizedAbsolutePathBrand: 'NormalizedAbsolutePath';
};

/**
 * Root path constant for Unix filesystem
 */
export const ROOT_PATH = '/' as NormalizedAbsolutePath;

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

export function isAbsolutePath(path: string) {
  // Check for Windows drive letter (e.g., 'c:', 'C:', 'D:')
  // Node's isAbsolute considers 'c:' as relative (drive-relative), but we treat it as absolute
  if (/^[a-zA-Z]:/.test(path)) {
    return true;
  }
  return isUnixAbsolute(path) || isWinAbsolute(path);
}

export function toUnixPath(filePath: string) {
  return filePath.replaceAll(/[\\/]+/g, '/');
}
