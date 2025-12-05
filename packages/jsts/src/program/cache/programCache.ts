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
import ts from 'typescript';
import path from 'node:path/posix';
import { IncrementalCompilerHost } from '../compilerHost.js';
import { info } from '../../../../shared/src/helpers/logging.js';
import { ProgramOptions } from '../tsconfig/options.js';

interface CacheEntry {
  keyObj: object; // Unique object for WeakMap key
  metadata: {
    // Store ALL files in the program (discovered by TypeScript)
    filesInProgram: Set<string>;
    rootNames: string[]; // Original files used to create the program
    createdAt: number;
    lastUsedAt: number;
    hitCount: number;
  };
}

interface ProgramWithHost {
  program: ts.SemanticDiagnosticsBuilderProgram;
  host: IncrementalCompilerHost;
}

/**
 * Program cache manager using LRU + WeakMap hybrid approach:
 * - LRU Map: Keeps strong references to metadata (small, always in memory)
 * - WeakMap: Keeps weak references to program+host (large, can be garbage collected under memory pressure)
 *
 * Key feature: Find a cached program that contains a single source file.
 * This allows smaller, more focused programs to coexist in the cache.
 */
export class ProgramCacheManager {
  // Strong references: LRU keeps track of cache entries
  private readonly lruCache: Map<string, CacheEntry> = new Map();

  // Weak references: Program and host can garbage collected together when memory is needed
  private readonly cache: WeakMap<object, ProgramWithHost> = new WeakMap();

  private readonly maxSize: number;
  private cacheKeyCounter = 0; // Simple counter for unique cache keys

  constructor(maxSize = 10) {
    this.maxSize = maxSize;
  }

  /**
   * Find a cached program that contains the requested source file and update it if content changed
   */
  findProgramForFile(sourceFile: string) {
    // Check each cached entry to find one containing this file
    for (const [cacheKey, entry] of this.lruCache.entries()) {
      // Check if this program contains the file
      if (!entry.metadata.filesInProgram.has(sourceFile)) {
        continue;
      }

      // Try to get program + host from WeakMap
      const cached = this.cache.get(entry.keyObj);

      if (!cached) {
        // Program and host were garbage collected, remove stale entry
        this.lruCache.delete(cacheKey);
        continue;
      }

      const { program, host } = cached;

      // Update LRU
      this.touchEntry(cacheKey, entry);

      return {
        program,
        host,
        cacheKey,
      };
    }
  }

  /**
   * Store a newly created program
   * Discovers ALL files in the program (not just root files)
   */
  storeProgram(
    programOptions: ProgramOptions,
    program: ts.SemanticDiagnosticsBuilderProgram,
    host: IncrementalCompilerHost,
  ): void {
    const tsProgram = program.getProgram();
    const filesInProgram = new Set<string>();

    // Discover all files in program
    for (const sourceFile of tsProgram.getSourceFiles()) {
      const normalized = path.normalize(sourceFile.fileName);
      filesInProgram.add(normalized);
    }

    const cacheKey = `program-${this.cacheKeyCounter++}`;

    // Evict LRU if at capacity
    if (this.lruCache.size >= this.maxSize) {
      const oldestKey = this.lruCache.keys().next().value;
      if (oldestKey) {
        info(`Evicting oldest program from cache (key: ${oldestKey})`);
        this.lruCache.delete(oldestKey);
      }
    }

    // Create unique key object for WeakMap
    const keyObj = {};

    const entry: CacheEntry = {
      keyObj,
      metadata: {
        filesInProgram,
        rootNames: programOptions.rootNames.map(f => path.normalize(f)),
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        hitCount: 0,
      },
    };

    // Store in both caches
    this.lruCache.set(cacheKey, entry);
    this.cache.set(keyObj, { program, host });

    info(
      `Cached program: ${programOptions.rootNames.length} root file(s) → ${filesInProgram.size} total files in program`,
    );
  }

  /**
   * Update an existing cache entry with a new program (after incremental rebuild)
   */
  updateProgramInCache(cacheKey: string, newProgram: ts.SemanticDiagnosticsBuilderProgram): void {
    const entry = this.lruCache.get(cacheKey);
    if (!entry) {
      return;
    }

    // Get existing host and update with new program (using same keyObj)
    const cached = this.cache.get(entry.keyObj);
    if (cached) {
      this.cache.set(entry.keyObj, { program: newProgram, host: cached.host });
    }
  }

  private touchEntry(cacheKey: string, entry: CacheEntry): void {
    // Move to end of LRU (most recently used)
    this.lruCache.delete(cacheKey);
    this.lruCache.set(cacheKey, entry);

    entry.metadata.lastUsedAt = Date.now();
    entry.metadata.hitCount++;
  }

  getCacheStats() {
    const entries = Array.from(this.lruCache.values());

    return {
      size: this.lruCache.size,
      maxSize: this.maxSize,
      entries: entries.map(e => ({
        rootFileCount: e.metadata.rootNames.length,
        totalFileCount: e.metadata.filesInProgram.size,
        hitCount: e.metadata.hitCount,
        ageMs: Date.now() - e.metadata.createdAt,
        lastUsedMs: Date.now() - e.metadata.lastUsedAt,
      })),
      totalFilesAcrossPrograms: entries.reduce((sum, e) => sum + e.metadata.filesInProgram.size, 0),
    };
  }

  clear(): void {
    this.lruCache.clear();
  }
}

// Singleton instance
let instance: ProgramCacheManager | null = null;

export function getProgramCacheManager(): ProgramCacheManager {
  instance ??= new ProgramCacheManager();
  return instance;
}
