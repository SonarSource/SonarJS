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
import { debug } from '../../../../shared/src/helpers/logging.js';
import { getFsCache } from '../../../../shared/src/helpers/fs-cache.js';
import { toUnixPath } from '../../../../shared/src/helpers/files.js';

/**
 * Tracks tsconfig files that were not found on disk but have been given a fallback empty config.
 * This is separate from FsCache because we need to return '{}' for missing tsconfigs.
 */
const missingTsConfigFiles = new Set<string>();

/**
 * Get the tsconfig file content, using FsCache
 * @param file Path to the tsconfig file
 * @returns Object with contents and missing flag, or undefined if not cached
 */
export function getCachedTsConfigContent(
  file: string,
): { contents: string; missing: boolean } | undefined {
  const normalized = toUnixPath(file);
  const fsCache = getFsCache();

  // Check if we've marked this file as missing
  if (missingTsConfigFiles.has(normalized)) {
    return { contents: '{}', missing: true };
  }

  // Check FsCache for content
  const content = fsCache.readFileSync(file);
  if (content !== undefined) {
    return { contents: content, missing: false };
  }

  return undefined;
}

/**
 * Check if a tsconfig file exists (in FsCache or marked as missing-with-fallback)
 */
export function hasCachedTsConfig(file: string): boolean {
  const normalized = toUnixPath(file);
  return missingTsConfigFiles.has(normalized) || getFsCache().fileExists(file);
}

/**
 * Cache a tsconfig file content
 * @param file Path to the tsconfig file
 * @param contents File contents
 * @param missing Whether the file was missing and this is a fallback
 */
export function setCachedTsConfigContent(file: string, contents: string, missing: boolean): void {
  const normalized = toUnixPath(file);
  if (missing) {
    missingTsConfigFiles.add(normalized);
  } else {
    // Store in FsCache
    getFsCache().preloadFiles({ [normalized]: { fileContent: contents } });
  }
}

/**
 * Clear the tsconfig content cache (called when tsconfig files change)
 */
export function clearTsConfigContentCache(): void {
  missingTsConfigFiles.clear();
  // Note: FsCache itself is cleared separately via TsConfigStore.clearCache()
  debug('Cleared tsconfig content cache');
}
