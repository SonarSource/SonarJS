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

import path from 'node:path';
import { toUnixPath } from '../helpers/files.js';

/**
 * Normalizes a path for use as a cache key.
 * Converts to Unix-style path and ensures consistency.
 */
export function normalizeCachePath(filePath: string): string {
  return toUnixPath(filePath);
}

/**
 * Gets the path to the cache file for a project.
 * @param cacheDir The directory where cache files are stored
 * @param projectId The project identifier
 * @returns The full path to the cache file
 */
export function getCacheFilePath(cacheDir: string, projectId: string): string {
  // Sanitize project ID for use as filename
  const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(cacheDir, `${safeProjectId}.fscache.pb.gz`);
}

/**
 * Calculates the approximate memory size of a string or Buffer.
 */
export function getContentSize(content: string | Buffer): number {
  if (Buffer.isBuffer(content)) {
    return content.length;
  }
  // Approximate: 2 bytes per character for strings (UTF-16 internal representation)
  return content.length * 2;
}

/**
 * Checks if a path is under the given base directory.
 * Both paths are normalized to Unix-style for comparison.
 */
export function isUnderBaseDir(filePath: string, baseDir: string): boolean {
  const normalizedPath = toUnixPath(path.resolve(filePath));
  const normalizedBase = toUnixPath(path.resolve(baseDir));

  // Ensure baseDir ends with / for proper prefix matching
  const basePrefix = normalizedBase.endsWith('/') ? normalizedBase : normalizedBase + '/';

  return normalizedPath.startsWith(basePrefix) || normalizedPath === normalizedBase;
}

/**
 * Converts an absolute path to a relative path from baseDir.
 * Returns the path as-is if it's not under baseDir.
 */
export function toRelativeCachePath(filePath: string, baseDir: string): string {
  const normalizedPath = toUnixPath(path.resolve(filePath));
  const normalizedBase = toUnixPath(path.resolve(baseDir));

  const basePrefix = normalizedBase.endsWith('/') ? normalizedBase : normalizedBase + '/';

  if (normalizedPath.startsWith(basePrefix)) {
    return normalizedPath.slice(basePrefix.length);
  }

  if (normalizedPath === normalizedBase) {
    return '';
  }

  // Not under baseDir - return normalized absolute path
  return normalizedPath;
}

/**
 * Converts a relative cache path back to an absolute path.
 */
export function toAbsolutePath(relativePath: string, baseDir: string): string {
  if (path.isAbsolute(relativePath)) {
    return relativePath;
  }
  return path.join(baseDir, relativePath);
}
