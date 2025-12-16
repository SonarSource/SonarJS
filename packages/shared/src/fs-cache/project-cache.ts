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

import fs from 'node:fs';
import path from 'node:path';
import type {
  CacheStats,
  CacheOperationType,
  FsNode,
  FsNodeStat,
  FsChildEntry,
  ProjectCacheInfo,
} from './cache-types.js';
import { createEmptyStats } from './cache-types.js';
import { normalizeCachePath, getCacheFilePath, getContentSize } from './cache-utils.js';
import { fscache } from './proto/fs-cache.js';

/**
 * Result types for cache lookups.
 * - undefined: not in cache, need to fetch from disk
 * - { exists: false }: cached negative result (path doesn't exist)
 * - { exists: true, value }: cached positive result with data
 * - { exists: true, value: undefined }: path exists but specific data not cached
 */
export interface CacheLookupResult<T> {
  exists: boolean;
  value?: T;
}

/**
 * Cache for a single project's filesystem operations.
 * Uses a unified tree structure where each node represents a checked path.
 */
export class ProjectFsCache {
  readonly projectId: string;
  readonly baseDir: string;
  readonly cacheDir: string;
  private readonly memoryThreshold: number;

  // Unified tree: normalized path → node
  private nodes = new Map<string, FsNode>();

  // Disk-loaded nodes (kept separate until merged)
  private diskNodes = new Map<string, FsNode>();

  // Statistics
  private stats: CacheStats = createEmptyStats();

  private lastAccess: number = Date.now();
  private createdAt: number = Date.now();

  constructor(projectId: string, baseDir: string, cacheDir: string, memoryThreshold: number) {
    this.projectId = projectId;
    this.baseDir = baseDir;
    this.cacheDir = cacheDir;
    this.memoryThreshold = memoryThreshold;
  }

  /**
   * Gets a node for a path, checking memory then disk cache.
   */
  private getNode(filePath: string): FsNode | undefined {
    const key = normalizeCachePath(filePath);
    return this.nodes.get(key) ?? this.diskNodes.get(key);
  }

  /**
   * Gets or creates a node for a path in memory cache.
   */
  private getOrCreateNode(filePath: string, exists: boolean): FsNode {
    const key = normalizeCachePath(filePath);
    let node = this.nodes.get(key);
    if (!node) {
      // Check disk cache and promote to memory if found
      const diskNode = this.diskNodes.get(key);
      if (diskNode) {
        node = { ...diskNode };
        this.nodes.set(key, node);
      } else {
        node = { exists, timestamp: Date.now() };
        this.nodes.set(key, node);
      }
    }
    node.timestamp = Date.now();
    return node;
  }

  /**
   * Checks if a path exists (cached).
   * Returns undefined if not in cache.
   */
  getExists(filePath: string): boolean | undefined {
    this.lastAccess = Date.now();
    const node = this.getNode(filePath);
    if (!node) {
      return undefined; // Not in cache
    }
    this.recordHit('exists');
    return node.exists;
  }

  /**
   * Sets existence for a path.
   */
  setExists(filePath: string, exists: boolean): void {
    this.lastAccess = Date.now();
    const node = this.getOrCreateNode(filePath, exists);
    node.exists = exists;
    this.checkMemoryThreshold();
  }

  /**
   * Gets file content from cache.
   * Returns undefined if not in cache or if path doesn't exist.
   * Throws if path is cached as non-existent.
   */
  getFileContent(
    filePath: string,
  ): CacheLookupResult<{ content: string | Buffer; encoding?: BufferEncoding }> | undefined {
    this.lastAccess = Date.now();
    const node = this.getNode(filePath);
    if (!node) {
      return undefined; // Not in cache
    }
    if (!node.exists) {
      this.recordHit('readFile');
      return { exists: false }; // Cached: doesn't exist
    }
    if (node.content === undefined) {
      return undefined; // Exists but content not cached
    }
    this.recordHit('readFile');
    return { exists: true, value: { content: node.content, encoding: node.encoding } };
  }

  /**
   * Sets file content in cache.
   */
  setFileContent(filePath: string, content: string | Buffer, encoding?: BufferEncoding): void {
    this.lastAccess = Date.now();
    const node = this.getOrCreateNode(filePath, true);
    node.exists = true;
    node.type = 'file';
    node.content = content;
    node.encoding = encoding;
    // Infer stat size from content
    if (!node.stat) {
      node.stat = {
        size: getContentSize(content),
        mtimeMs: Date.now(),
        mode: 0o644,
        isFile: true,
        isDirectory: false,
        isSymbolicLink: false,
      };
    } else {
      node.stat.size = getContentSize(content);
    }
    this.checkMemoryThreshold();
  }

  /**
   * Sets that a file doesn't exist (cache ENOENT).
   */
  setFileNotExists(filePath: string): void {
    this.lastAccess = Date.now();
    const node = this.getOrCreateNode(filePath, false);
    node.exists = false;
    this.checkMemoryThreshold();
  }

  /**
   * Gets directory entries from cache.
   */
  getDirEntries(
    filePath: string,
    withFileTypes: boolean,
  ): CacheLookupResult<FsChildEntry[]> | undefined {
    this.lastAccess = Date.now();
    const node = this.getNode(filePath);
    if (!node) {
      return undefined; // Not in cache
    }
    if (!node.exists) {
      this.recordHit('readdir');
      return { exists: false }; // Cached: doesn't exist
    }
    if (node.children === undefined) {
      return undefined; // Exists but children not cached
    }
    // If withFileTypes requested, check that we have type info
    if (withFileTypes && node.children.length > 0 && node.children[0].type === undefined) {
      return undefined; // Have names but not types, need to refetch
    }
    this.recordHit('readdir');
    return { exists: true, value: node.children };
  }

  /**
   * Sets directory entries in cache.
   */
  setDirEntries(filePath: string, entries: FsChildEntry[]): void {
    this.lastAccess = Date.now();
    const node = this.getOrCreateNode(filePath, true);
    node.exists = true;
    node.type = 'directory';
    node.children = entries;
    this.checkMemoryThreshold();
  }

  /**
   * Gets stat info from cache.
   */
  getStatEntry(filePath: string): CacheLookupResult<FsNodeStat> | undefined {
    this.lastAccess = Date.now();
    const node = this.getNode(filePath);
    if (!node) {
      return undefined; // Not in cache
    }
    if (!node.exists) {
      this.recordHit('stat');
      return { exists: false }; // Cached: doesn't exist
    }
    if (!node.stat) {
      return undefined; // Exists but stat not cached
    }
    this.recordHit('stat');
    return { exists: true, value: node.stat };
  }

  /**
   * Sets stat info in cache.
   */
  setStatEntry(filePath: string, stat: FsNodeStat): void {
    this.lastAccess = Date.now();
    const node = this.getOrCreateNode(filePath, true);
    node.exists = true;
    node.stat = stat;
    // Infer type from stat
    if (stat.isFile) {
      node.type = 'file';
    } else if (stat.isDirectory) {
      node.type = 'directory';
    } else if (stat.isSymbolicLink) {
      node.type = 'symlink';
    }
    this.checkMemoryThreshold();
  }

  /**
   * Gets realpath from cache.
   */
  getRealpath(filePath: string, native: boolean = false): CacheLookupResult<string> | undefined {
    this.lastAccess = Date.now();
    const node = this.getNode(filePath);
    if (!node) {
      return undefined; // Not in cache
    }
    if (!node.exists) {
      this.recordHit('realpath');
      return { exists: false }; // Cached: doesn't exist
    }
    const resolved = native ? node.resolvedPathNative : node.resolvedPath;
    if (resolved === undefined) {
      return undefined; // Exists but realpath not cached
    }
    this.recordHit('realpath');
    return { exists: true, value: resolved };
  }

  /**
   * Sets realpath in cache.
   */
  setRealpath(filePath: string, resolvedPath: string, native: boolean = false): void {
    this.lastAccess = Date.now();
    const node = this.getOrCreateNode(filePath, true);
    node.exists = true;
    if (native) {
      node.resolvedPathNative = resolvedPath;
    } else {
      node.resolvedPath = resolvedPath;
    }
    this.checkMemoryThreshold();
  }

  /**
   * Gets access check result from cache.
   */
  getAccess(filePath: string, mode: number): CacheLookupResult<boolean> | undefined {
    this.lastAccess = Date.now();
    const node = this.getNode(filePath);
    if (!node) {
      return undefined; // Not in cache
    }
    if (!node.exists) {
      this.recordHit('access');
      return { exists: false }; // Cached: doesn't exist
    }
    if (!node.accessModes || node.accessModes[mode] === undefined) {
      return undefined; // Exists but access not checked for this mode
    }
    this.recordHit('access');
    return { exists: true, value: node.accessModes[mode] };
  }

  /**
   * Sets access check result in cache.
   */
  setAccess(filePath: string, mode: number, accessible: boolean): void {
    this.lastAccess = Date.now();
    const node = this.getOrCreateNode(filePath, true);
    node.exists = true;
    if (!node.accessModes) {
      node.accessModes = {};
    }
    node.accessModes[mode] = accessible;
    this.checkMemoryThreshold();
  }

  /**
   * Records a cache hit for statistics.
   */
  recordHit(operation: CacheOperationType): void {
    this.stats.hits++;
    this.stats.operations[operation].hits++;
  }

  /**
   * Records a cache miss for statistics.
   */
  recordMiss(operation: CacheOperationType): void {
    this.stats.misses++;
    this.stats.operations[operation].misses++;
  }

  /**
   * Gets the current memory size of the cache (approximate).
   */
  getMemorySize(): number {
    let size = 0;

    for (const node of this.nodes.values()) {
      // Base node overhead
      size += 100;

      // Content size
      if (node.content !== undefined) {
        size += getContentSize(node.content);
      }

      // Children
      if (node.children) {
        size += node.children.reduce((sum, c) => sum + c.name.length * 2 + 20, 0);
      }

      // Resolved paths
      if (node.resolvedPath) {
        size += node.resolvedPath.length * 2;
      }
      if (node.resolvedPathNative) {
        size += node.resolvedPathNative.length * 2;
      }
    }

    return size;
  }

  /**
   * Checks if memory threshold is exceeded and flushes to disk if so.
   */
  private checkMemoryThreshold(): void {
    if (this.getMemorySize() > this.memoryThreshold) {
      this.flushToDisk().catch(err => {
        console.error(`[fs-cache] Failed to flush cache to disk: ${err.message}`);
      });
    }
  }

  /**
   * Flushes all memory cache data to disk.
   */
  async flushToDisk(): Promise<void> {
    const cacheFilePath = getCacheFilePath(this.cacheDir, this.projectId);

    // Merge memory nodes into disk nodes
    for (const [key, node] of this.nodes) {
      this.diskNodes.set(key, node);
    }

    // Build protobuf message
    const nodeEntries: fscache.IFsNodeEntry[] = [];
    for (const [nodePath, node] of this.diskNodes) {
      const entry: fscache.IFsNodeEntry = {
        path: nodePath,
        exists: node.exists,
        timestamp: node.timestamp,
        type: node.type,
        encoding: node.encoding,
      };

      if (node.content !== undefined) {
        entry.content = Buffer.isBuffer(node.content)
          ? node.content
          : Buffer.from(node.content, node.encoding || 'utf8');
      }

      if (node.stat) {
        entry.stat = {
          size: node.stat.size,
          mtimeMs: node.stat.mtimeMs,
          mode: node.stat.mode,
          isFile: node.stat.isFile,
          isDirectory: node.stat.isDirectory,
          isSymbolicLink: node.stat.isSymbolicLink,
        };
      }

      if (node.children) {
        entry.children = node.children.map(c => ({
          name: c.name,
          type: c.type,
        }));
      }

      if (node.resolvedPath !== undefined) {
        entry.resolvedPath = node.resolvedPath;
      }

      if (node.resolvedPathNative !== undefined) {
        entry.resolvedPathNative = node.resolvedPathNative;
      }

      if (node.accessModes) {
        entry.accessModes = Object.entries(node.accessModes).map(([mode, accessible]) => ({
          mode: parseInt(mode, 10),
          accessible,
        }));
      }

      nodeEntries.push(entry);
    }

    const cacheData: fscache.IFsCacheData = {
      projectId: this.projectId,
      createdAt: this.createdAt,
      lastModified: Date.now(),
      nodes: nodeEntries,
    };

    // Serialize and write to disk
    const buffer = fscache.FsCacheData.encode(cacheData).finish();

    // Ensure cache directory exists
    await fs.promises.mkdir(path.dirname(cacheFilePath), { recursive: true });
    await fs.promises.writeFile(cacheFilePath, buffer);

    this.stats.diskWrites++;

    // Clear memory cache (data is now on disk)
    this.nodes.clear();
  }

  /**
   * Loads cache data from disk.
   */
  async loadFromDisk(): Promise<boolean> {
    const cacheFilePath = getCacheFilePath(this.cacheDir, this.projectId);

    try {
      const buffer = await fs.promises.readFile(cacheFilePath);
      const cacheData = fscache.FsCacheData.decode(buffer);

      // Load nodes
      for (const entry of cacheData.nodes || []) {
        if (!entry.path) continue;

        const node: FsNode = {
          exists: entry.exists ?? false,
          timestamp: Number(entry.timestamp || 0),
          type: entry.type as FsNode['type'],
          encoding: entry.encoding as BufferEncoding | undefined,
        };

        if (entry.content && entry.content.length > 0) {
          node.content = entry.encoding
            ? Buffer.from(entry.content).toString(entry.encoding as BufferEncoding)
            : Buffer.from(entry.content);
        }

        if (entry.stat) {
          node.stat = {
            size: Number(entry.stat.size || 0),
            mtimeMs: Number(entry.stat.mtimeMs || 0),
            mode: entry.stat.mode || 0,
            isFile: entry.stat.isFile || false,
            isDirectory: entry.stat.isDirectory || false,
            isSymbolicLink: entry.stat.isSymbolicLink || false,
          };
        }

        if (entry.children && entry.children.length > 0) {
          node.children = entry.children.map(c => ({
            name: c.name || '',
            type: c.type as FsChildEntry['type'],
          }));
        }

        if (entry.resolvedPath) {
          node.resolvedPath = entry.resolvedPath;
        }

        if (entry.resolvedPathNative) {
          node.resolvedPathNative = entry.resolvedPathNative;
        }

        if (entry.accessModes && entry.accessModes.length > 0) {
          node.accessModes = {};
          for (const am of entry.accessModes) {
            if (am.mode !== undefined && am.mode !== null) {
              node.accessModes[am.mode] = am.accessible || false;
            }
          }
        }

        this.diskNodes.set(entry.path, node);
      }

      this.createdAt = Number(cacheData.createdAt || Date.now());
      this.stats.diskReads++;

      return true;
    } catch {
      // File doesn't exist or is invalid
      return false;
    }
  }

  /**
   * Clears all cache data (memory and disk).
   */
  async clear(): Promise<void> {
    // Clear memory
    this.nodes.clear();
    this.diskNodes.clear();

    // Delete disk file
    const cacheFilePath = getCacheFilePath(this.cacheDir, this.projectId);
    try {
      await fs.promises.unlink(cacheFilePath);
    } catch {
      // File might not exist
    }

    // Reset stats
    this.stats = createEmptyStats();
  }

  /**
   * Gets information about the cache.
   */
  getInfo(): ProjectCacheInfo {
    const cacheFilePath = getCacheFilePath(this.cacheDir, this.projectId);
    let diskSize = 0;

    try {
      const stat = fs.statSync(cacheFilePath);
      diskSize = stat.size;
    } catch {
      // File doesn't exist
    }

    return {
      projectId: this.projectId,
      baseDir: this.baseDir,
      memorySize: this.getMemorySize(),
      diskSize,
      nodeCount: this.nodes.size + this.diskNodes.size,
      lastAccess: this.lastAccess,
    };
  }

  /**
   * Gets cache statistics.
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Invalidates a specific path in the cache.
   */
  invalidatePath(filePath: string): void {
    const key = normalizeCachePath(filePath);
    this.nodes.delete(key);
    this.diskNodes.delete(key);
  }

  /**
   * Invalidates all paths under a directory.
   */
  invalidateDirectory(dirPath: string): void {
    const prefix = normalizeCachePath(dirPath);

    for (const key of this.nodes.keys()) {
      if (key.startsWith(prefix)) {
        this.nodes.delete(key);
      }
    }

    for (const key of this.diskNodes.keys()) {
      if (key.startsWith(prefix)) {
        this.diskNodes.delete(key);
      }
    }
  }
}
