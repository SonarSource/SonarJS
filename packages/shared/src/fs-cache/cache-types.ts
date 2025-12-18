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

import type { Stats } from 'node:fs';

/**
 * Configuration options for the filesystem cache
 */
export interface FsCacheConfig {
  /** Flush to disk when this memory size is reached (default: 500MB) */
  memoryThreshold: number;
  /** Directory to store cache files */
  cacheDir?: string;
  /** Track statistics (default: true) */
  enableStats: boolean;
}

/**
 * Stat data extracted from fs.Stats for caching.
 * Uses Pick to reuse types from @types/node.
 */
export type FsNodeStat = Pick<Stats, 'size' | 'mtimeMs' | 'mode'> & {
  isFile: boolean;
  isDirectory: boolean;
  isSymbolicLink: boolean;
};

/**
 * Directory child entry with optional type info.
 * Type is present when readdir({withFileTypes}) or opendir was used.
 */
export interface FsChildEntry {
  name: string;
  type?: 'file' | 'directory' | 'symlink';
}

/**
 * Unified filesystem node representing a cached path.
 *
 * States:
 * - Node not in map: path hasn't been checked yet
 * - exists=false: path confirmed to not exist
 * - exists=true: path exists, with optional cached data
 *
 * For each optional field:
 * - undefined: not fetched yet
 * - value: fetched (including empty values like [] or '')
 */
export interface FsNode {
  /** Whether this path exists (always set when node is created) */
  exists: boolean;

  /** When this node was last updated */
  timestamp: number;

  /** File type (when known) */
  type?: 'file' | 'directory' | 'symlink';

  /** File content (only for files) */
  content?: string | Buffer;

  /** Encoding used when content was read */
  encoding?: BufferEncoding;

  /** Stat information */
  stat?: FsNodeStat;

  /** Directory children (only for directories) */
  children?: FsChildEntry[];

  /** Resolved realpath */
  resolvedPath?: string;

  /** Resolved native realpath (realpathSync.native) */
  resolvedPathNative?: string;

  /** Access check results by mode (F_OK=0, R_OK=4, W_OK=2, X_OK=1) */
  accessModes?: Record<number, boolean>;
}

/**
 * Information about a project's cache state
 */
export interface ProjectCacheInfo {
  projectId: string;
  baseDir: string;
  memorySize: number;
  diskSize: number;
  nodeCount: number;
  diskNodeCount: number;
  lastAccess: number;
  lastFlushTiming?: { build: number; encode: number; gzip: number; total: number };
  lastLoadTiming?: { gunzip: number; decode: number; total: number };
}

/**
 * Caller statistics - tracks which packages make fs calls
 */
export interface CallerStats {
  /** Total calls from this caller */
  calls: number;
  /** Calls by operation (all fs methods, dynamically tracked) */
  operations: Map<string, number>;
}

/**
 * Stats for a cached operation (has hits and misses)
 */
export interface CachedOpStats {
  hits: number;
  misses: number;
}

/**
 * Cache statistics for monitoring performance
 */
export interface CacheStats {
  hits: number;
  misses: number;
  diskReads: number;
  diskWrites: number;
  /** Cached operations (can have hits) */
  operations: {
    readFile: CachedOpStats;
    readdir: CachedOpStats;
    opendir: CachedOpStats;
    stat: CachedOpStats;
    exists: CachedOpStats;
    realpath: CachedOpStats;
    access: CachedOpStats;
  };
  /** Uncached/passthrough operations (dynamically discovered) */
  uncached: Map<string, number>;
  /** Calls grouped by caller package/module */
  callers?: Map<string, CallerStats>;
}

/**
 * Cached operation types (can have cache hits)
 */
export type CacheOperationType =
  | 'readFile'
  | 'readdir'
  | 'opendir'
  | 'stat'
  | 'exists'
  | 'realpath'
  | 'access';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: FsCacheConfig = {
  memoryThreshold: 500 * 1024 * 1024, // 500MB
  enableStats: true,
};

/**
 * Creates empty cache statistics
 */
export function createEmptyStats(): CacheStats {
  return {
    hits: 0,
    misses: 0,
    diskReads: 0,
    diskWrites: 0,
    operations: {
      readFile: { hits: 0, misses: 0 },
      readdir: { hits: 0, misses: 0 },
      opendir: { hits: 0, misses: 0 },
      stat: { hits: 0, misses: 0 },
      exists: { hits: 0, misses: 0 },
      realpath: { hits: 0, misses: 0 },
      access: { hits: 0, misses: 0 },
    },
    uncached: new Map(),
  };
}
