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

/**
 * Global Filesystem Cache Module
 *
 * This module provides a caching layer for filesystem operations that intercepts
 * ALL fs operations, including those from dependencies like TypeScript and ESLint.
 *
 * Features:
 * - Unified tree structure where each node represents a checked path
 * - Per-project caches with separate data isolation
 * - Disk persistence using protobuf serialization
 * - No eviction - data is flushed to disk when memory threshold is reached
 * - Negative caching - caches "file doesn't exist" results
 * - Silent statistics tracking
 *
 * Usage:
 * ```typescript
 * import { initFsCache, setActiveProject, saveProjectCache } from './fs-cache/index.js';
 *
 * // Initialize at application startup (patches fs module)
 * initFsCache({ memoryThreshold: 500 * 1024 * 1024 });
 *
 * // Before analyzing a project
 * setActiveProject('my-project', '/path/to/project', '/path/to/cache');
 *
 * // ... analysis runs, all fs operations are cached ...
 *
 * // Save cache to disk (optional, also auto-saves on memory threshold)
 * await saveProjectCache('my-project');
 * ```
 */

// Re-export types
export type {
  FsCacheConfig,
  ProjectCacheInfo,
  CacheStats,
  FsNode,
  FsNodeStat,
  FsChildEntry,
  CacheOperationType,
} from './cache-types.js';
export { DEFAULT_CONFIG, createEmptyStats } from './cache-types.js';

// Re-export classes
export { FsCacheManager, getFsCacheManager, resetFsCacheManager } from './cache-manager.js';
export { ProjectFsCache, CacheLookupResult } from './project-cache.js';

// Re-export patching functions
export { patchFs, unpatchFs, getOriginalFs, isFsPatched } from './fs-patch.js';

// Import for internal use
import type { FsCacheConfig, CacheStats } from './cache-types.js';
import { getFsCacheManager, resetFsCacheManager } from './cache-manager.js';
import { patchFs, unpatchFs, isFsPatched } from './fs-patch.js';
import type { ProjectFsCache } from './project-cache.js';

let initialized = false;

/**
 * Initializes the global filesystem cache.
 * This patches the fs module to intercept all filesystem operations.
 *
 * @param config Optional configuration overrides
 */
export function initFsCache(config?: Partial<FsCacheConfig>): void {
  if (initialized) {
    return;
  }

  getFsCacheManager().configure(config);
  patchFs();
  initialized = true;
}

/**
 * Disables the filesystem cache and restores original fs functions.
 */
export function disableFsCache(): void {
  if (!initialized) {
    return;
  }

  unpatchFs();
  initialized = false;
}

/**
 * Returns whether the filesystem cache is initialized.
 */
export function isFsCacheInitialized(): boolean {
  return initialized && isFsPatched();
}

/**
 * Sets the active project for caching.
 * Creates a new cache if one doesn't exist for the project.
 *
 * @param projectId Unique identifier for the project
 * @param baseDir The project's base directory
 * @param cacheDir Optional directory for cache files
 * @returns The project's cache instance
 */
export function setActiveProject(
  projectId: string,
  baseDir: string,
  cacheDir?: string,
): ProjectFsCache {
  return getFsCacheManager().setActiveProject(projectId, baseDir, cacheDir);
}

/**
 * Loads a project cache from disk.
 *
 * @param projectId The project identifier
 * @param cachePath Path to the cache file or directory
 * @returns True if cache was loaded successfully
 */
export function loadProjectCache(projectId: string, cachePath: string): Promise<boolean> {
  return getFsCacheManager().loadProjectCache(projectId, cachePath);
}

/**
 * Saves a project cache to disk.
 *
 * @param projectId The project identifier
 * @param cachePath Optional path to save to
 */
export function saveProjectCache(projectId: string, cachePath?: string): Promise<void> {
  return getFsCacheManager().saveProjectCache(projectId, cachePath);
}

/**
 * Clears a specific project's cache (both memory and disk).
 *
 * @param projectId The project identifier
 */
export function clearProjectCache(projectId: string): Promise<void> {
  return getFsCacheManager().clearProjectCache(projectId);
}

/**
 * Clears all project caches.
 */
export function clearAllCaches(): Promise<void> {
  return getFsCacheManager().clearAll();
}

/**
 * Gets cache statistics for a project or the active project.
 *
 * @param projectId Optional project identifier (uses active project if not provided)
 * @returns Cache statistics or null if no cache found
 */
export function getFsCacheStats(projectId?: string): CacheStats | null {
  const cache = projectId
    ? getFsCacheManager().getProjectCache(projectId)
    : getFsCacheManager().getActiveCache();
  return cache?.getStats() ?? null;
}

/**
 * Invalidates a specific path in the active cache.
 *
 * @param filePath The path to invalidate
 */
export function invalidatePath(filePath: string): void {
  getFsCacheManager().invalidatePath(filePath);
}

/**
 * Invalidates all paths under a directory in the active cache.
 *
 * @param dirPath The directory path to invalidate
 */
export function invalidateDirectory(dirPath: string): void {
  getFsCacheManager().invalidateDirectory(dirPath);
}

/**
 * Resets the entire filesystem cache system.
 * This disables caching, clears all data, and resets the singleton.
 * Primarily used for testing.
 */
export async function resetFsCache(): Promise<void> {
  if (initialized) {
    await getFsCacheManager().clearAll();
    unpatchFs();
    initialized = false;
  }
  resetFsCacheManager();
}
