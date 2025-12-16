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
  return path.join(cacheDir, `${safeProjectId}.fscache.pb`);
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
