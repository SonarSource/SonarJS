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
import {
  basename as basenamePosix,
  dirname as dirnamePosix,
  isAbsolute as isUnixAbsolute,
  join as joinPosix,
  parse as parsePosix,
  resolve as resolvePosix,
} from 'node:path/posix';
import {
  isAbsolute as isWinAbsolute,
  parse as parseWin32,
  resolve as resolveWin32,
} from 'node:path/win32';

export type NormalizedPath = string & { readonly __normalizedPathBrand: 'NormalizedPath' };
export type NormalizedAbsolutePath = string & {
  readonly __normalizedAbsolutePathBrand: 'NormalizedAbsolutePath';
};
export type File = {
  readonly path: NormalizedAbsolutePath;
  readonly content: Buffer | string;
};

/**
 * Root path constant for Unix filesystem
 */
export const ROOT_PATH = '/' as NormalizedAbsolutePath;

/**
 * Byte Order Marker
 */
const BOM_BYTE = 0xfeff;
const isWindows = process.platform === 'win32';

/**
 * Removes any Byte Order Marker (BOM) from a string's head
 *
 * A string's head is nothing else but its first character.
 *
 * @param str the input string
 * @returns the stripped string
 */
export function stripBOM(str: string) {
  if (str.codePointAt(0) === BOM_BYTE) {
    return str.slice(1);
  }
  return str;
}

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

function isParseResultRoot(result: { root: string; base: string; dir: string }) {
  // A path is a root if it has a non-empty root and no base (filename)
  // and dir is either empty or equals the root itself
  return (
    result.root !== '' && result.base === '' && (result.dir === '' || result.dir === result.root)
  );
}

export function isRoot(file: string) {
  return isParseResultRoot(parseWin32(file)) || isParseResultRoot(parsePosix(file));
}

export function assertNestedPath(from: NormalizedAbsolutePath, topDir: NormalizedAbsolutePath) {
  const fromSanitized = from.endsWith('/') ? from : from + '/';
  const topDirSanitized = topDir.endsWith('/') ? topDir : topDir + '/';
  if (!fromSanitized.startsWith(topDirSanitized)) {
    throw new Error(`"${from}" is not nested under topDir "${topDir}"`);
  }
}

/**
 * Returns the filesystem root that contains the given absolute path.
 * Examples: '/a/b' -> '/', 'C:/a/b' -> 'C:/', 'D:/foo' -> 'D:/'.
 * Used as a cross-platform "no upper bound" sentinel for find-up callers.
 */
export function getPathRoot(filePath: NormalizedAbsolutePath): NormalizedAbsolutePath {
  const winRoot = parseWin32(filePath).root;
  if (winRoot) {
    return toUnixPath(winRoot) as NormalizedAbsolutePath;
  }
  return ROOT_PATH;
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
export function dirnamePath(filePath: NormalizedAbsolutePath): NormalizedAbsolutePath {
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
export function basenamePath(filePath: NormalizedPath | NormalizedAbsolutePath): string {
  return basenamePosix(filePath);
}
