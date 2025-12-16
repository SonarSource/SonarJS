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

import os from 'node:os';
import path from 'node:path';
import type { FsCacheConfig, ProjectCacheInfo } from './cache-types.js';
import { DEFAULT_CONFIG } from './cache-types.js';
import { ProjectFsCache } from './project-cache.js';

/**
 * Singleton manager for all project filesystem caches.
 * Routes filesystem operations to the active project's cache.
 */
export class FsCacheManager {
  private projectCaches = new Map<string, ProjectFsCache>();
  private activeProjectId: string | null = null;
  private config: FsCacheConfig;

  constructor(config?: Partial<FsCacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Updates the configuration.
   */
  configure(config?: Partial<FsCacheConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Gets the current configuration.
   */
  getConfig(): FsCacheConfig {
    return { ...this.config };
  }

  /**
   * Sets the active project and creates/returns its cache.
   * @param projectId Unique identifier for the project
   * @param baseDir The project's base directory
   * @param cacheDir Optional directory for cache files (defaults to system temp)
   */
  setActiveProject(projectId: string, baseDir: string, cacheDir?: string): ProjectFsCache {
    this.activeProjectId = projectId;

    let cache = this.projectCaches.get(projectId);
    if (!cache) {
      const resolvedCacheDir =
        cacheDir || this.config.cacheDir || path.join(os.tmpdir(), 'sonar-fs-cache');
      cache = new ProjectFsCache(projectId, baseDir, resolvedCacheDir, this.config.memoryThreshold);
      this.projectCaches.set(projectId, cache);
    }

    return cache;
  }

  /**
   * Gets the currently active cache, or null if none is active.
   */
  getActiveCache(): ProjectFsCache | null {
    if (!this.activeProjectId) {
      return null;
    }
    return this.projectCaches.get(this.activeProjectId) || null;
  }

  /**
   * Gets a specific project's cache.
   */
  getProjectCache(projectId: string): ProjectFsCache | undefined {
    return this.projectCaches.get(projectId);
  }

  /**
   * Loads a project cache from disk.
   * @param projectId The project identifier
   * @param cachePath Path to the cache file (or directory containing it)
   */
  async loadProjectCache(projectId: string, cachePath: string): Promise<boolean> {
    // Determine if cachePath is a file or directory
    const cacheDir = cachePath.endsWith('.pb') ? path.dirname(cachePath) : cachePath;

    let cache = this.projectCaches.get(projectId);
    if (!cache) {
      cache = new ProjectFsCache(
        projectId,
        '', // baseDir will be populated from disk if available
        cacheDir,
        this.config.memoryThreshold,
      );
      this.projectCaches.set(projectId, cache);
    }

    return cache.loadFromDisk();
  }

  /**
   * Saves a project cache to disk.
   * @param projectId The project identifier
   * @param cachePath Optional path to save to (uses default if not provided)
   */
  async saveProjectCache(projectId: string, _cachePath?: string): Promise<void> {
    const cache = this.projectCaches.get(projectId);
    if (!cache) {
      throw new Error(`No cache found for project: ${projectId}`);
    }

    await cache.flushToDisk();
  }

  /**
   * Lists all project caches with their info.
   */
  listProjectCaches(): ProjectCacheInfo[] {
    const result: ProjectCacheInfo[] = [];
    for (const cache of this.projectCaches.values()) {
      result.push(cache.getInfo());
    }
    return result;
  }

  /**
   * Clears a specific project's cache.
   */
  async clearProjectCache(projectId: string): Promise<void> {
    const cache = this.projectCaches.get(projectId);
    if (cache) {
      await cache.clear();
      this.projectCaches.delete(projectId);

      if (this.activeProjectId === projectId) {
        this.activeProjectId = null;
      }
    }
  }

  /**
   * Clears all project caches.
   */
  async clearAll(): Promise<void> {
    const clearPromises: Promise<void>[] = [];
    for (const cache of this.projectCaches.values()) {
      clearPromises.push(cache.clear());
    }
    await Promise.all(clearPromises);

    this.projectCaches.clear();
    this.activeProjectId = null;
  }

  /**
   * Invalidates a specific path in the active cache.
   */
  invalidatePath(filePath: string): void {
    const cache = this.getActiveCache();
    if (cache) {
      cache.invalidatePath(filePath);
    }
  }

  /**
   * Invalidates all paths under a directory in the active cache.
   */
  invalidateDirectory(dirPath: string): void {
    const cache = this.getActiveCache();
    if (cache) {
      cache.invalidateDirectory(dirPath);
    }
  }
}

// Singleton instance
let instance: FsCacheManager | null = null;

/**
 * Gets the singleton FsCacheManager instance.
 */
export function getFsCacheManager(): FsCacheManager {
  if (!instance) {
    instance = new FsCacheManager();
  }
  return instance;
}

/**
 * Resets the singleton instance (for testing).
 */
export function resetFsCacheManager(): void {
  instance = null;
}
