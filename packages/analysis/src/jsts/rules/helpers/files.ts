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
  join as joinPosix,
  parse as parsePosix,
} from 'node:path/posix';
import { parse as parseWin32 } from 'node:path/win32';
import {
  normalizeToAbsolutePath,
  ROOT_PATH,
  type NormalizedAbsolutePath,
  type NormalizedPath,
} from './path-normalization.js';
export {
  isAbsolutePath,
  normalizePath,
  normalizeToAbsolutePath,
  ROOT_PATH,
} from './path-normalization.js';
export type { NormalizedAbsolutePath, NormalizedPath } from './path-normalization.js';
export type File = {
  readonly filePath: NormalizedAbsolutePath;
  readonly fileContent: string;
};

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
export function stripBOM(str: string) {
  if (str.codePointAt(0) === BOM_BYTE) {
    return str.slice(1);
  }
  return str;
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
    return normalizeToAbsolutePath(winRoot);
  }
  return ROOT_PATH;
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

export function relativeToAncestorPath(
  filePath: NormalizedAbsolutePath,
  topDir: NormalizedAbsolutePath,
) {
  const topDirPrefix = topDir.endsWith('/') ? topDir : `${topDir}/`;
  if (filePath === topDir) {
    return '';
  }

  return filePath.startsWith(topDirPrefix) ? filePath.slice(topDirPrefix.length) : undefined;
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
