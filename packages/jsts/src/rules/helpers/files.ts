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
import { isAbsolute as isUnixAbsolute, parse as parsePosix } from 'node:path/posix';
import {
  isAbsolute as isWinAbsolute,
  parse as parseWin32,
  resolve as resolveWin32,
} from 'node:path/win32';

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
 * Converts a path to Unix format.
 * For absolute paths on Windows, resolves them to ensure they have a drive letter.
 * For relative paths, only converts slashes without resolving.
 * Cross-platform behavior:
 * - On Windows: all absolute paths are resolved with win32 to add drive letter
 * - On Linux: paths are only converted (slashes), no resolution needed
 * @param filePath the path to convert
 * @returns the converted path
 */
export function toUnixPath(filePath: string) {
  if (isWindows && isAbsolutePath(filePath)) {
    // On Windows, resolve to add drive letter if missing
    filePath = resolveWin32(filePath);
  }
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
  return isUnixAbsolute(path) || isWinAbsolute(path.replaceAll(/[\\/]+/g, '\\'));
}
