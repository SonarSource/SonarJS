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

export const ROOT_PATH = '/' as NormalizedAbsolutePath;

const isWindows = process.platform === 'win32';

/**
 * Normalizes a path to Unix format. On Windows, absolute paths are first resolved so they include
 * a drive letter; relative paths are not resolved.
 */
export function normalizePath(filePath: string): NormalizedPath {
  if (isWindows && isAbsolutePath(filePath)) {
    filePath = resolveWin32(filePath);
  }
  return toUnixPath(filePath) as NormalizedPath;
}

/** Normalizes a path to an absolute Unix format. */
export function normalizeToAbsolutePath(
  filePath: string,
  baseDir = ROOT_PATH,
): NormalizedAbsolutePath {
  if (isAbsolutePath(filePath)) {
    filePath = resolveWin32(filePath);
  } else {
    filePath = isWindows ? resolveWin32(baseDir, filePath) : resolvePosix(baseDir, filePath);
  }
  return toUnixPath(filePath) as NormalizedAbsolutePath;
}

/** Recognizes Unix, Windows drive-letter, and UNC absolute paths on every platform. */
export function isAbsolutePath(filePath: string) {
  if (/^[a-zA-Z]:/.test(filePath)) {
    return true;
  }
  return isUnixAbsolute(filePath) || isWinAbsolute(filePath);
}

function toUnixPath(filePath: string) {
  return filePath.replaceAll(/[\\/]+/g, '/');
}
