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
import {
  isAbsolute as isUnixAbsolute,
  parse as parsePosix,
  resolve as resolvePosix,
} from 'node:path/posix';
import {
  isAbsolute as isWinAbsolute,
  parse as parseWin32,
  resolve as resolveWin32,
} from 'node:path/win32';

/**
 * Branded types for Unix-style paths (forward slashes, normalized).
 *
 * We use phantom branding here (declare const + type intersection) rather than
 * runtime branding (like in tsconfig/options.ts with actual Symbol properties).
 * This is because:
 * - Paths are primitive strings, not objects that can hold extra properties
 * - We only need compile-time safety, not runtime verification
 * - No runtime overhead - branded paths are just regular strings at runtime
 *
 * @see tsconfig/options.ts for runtime branding of objects via Symbol properties
 */
declare const NormalizedPathBrand: unique symbol;
declare const NormalizedAbsolutePathBrand: unique symbol;

export type NormalizedPath = string & { readonly [NormalizedPathBrand]: never };
export type NormalizedAbsolutePath = string & { readonly [NormalizedAbsolutePathBrand]: never };

/**
 * Root path constant for Unix filesystem
 */
export const ROOT_PATH = '/' as NormalizedAbsolutePath;

/**
 * Byte Order Marker
 */
const BOM_BYTE = 0xfeff;

export type File = {
  readonly path: string;
  readonly content: Buffer | string;
};

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
  filePath = toUnixPath(filePath);
  if (!isAbsolutePath(filePath)) {
    filePath = resolvePosix(baseDir, filePath);
  }
  if (isWindows) {
    // On Windows, resolve to add drive letter if missing
    filePath = resolveWin32(filePath);
  }
  return toUnixPath(filePath) as NormalizedAbsolutePath;
}

export function toUnixPath(filePath: string) {
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

export function isAbsolutePath(path: string) {
  // Check for Windows drive letter (e.g., 'c:', 'C:', 'D:')
  // Node's isAbsolute considers 'c:' as relative (drive-relative), but we treat it as absolute
  if (/^[a-zA-Z]:/.test(path)) {
    return true;
  }
  return isUnixAbsolute(path) || isWinAbsolute(path);
}
