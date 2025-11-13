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
import { createHash } from 'crypto';
import path from 'path';
import { IncrementalCompilerHost } from './incrementalCompilerHost.js';
import { info, debug } from '../../../shared/src/helpers/logging.js';

interface CacheEntry {
  keyObj: object; // Unique object for WeakMap key
  metadata: {
    // Store ALL files in the program (discovered by TypeScript)
    filesInProgram: Set<string>;
    rootFiles: string[]; // Original files used to create the program
    fileContentHashes: Map<string, string>; // Track content hashes for change detection
    compilerOptionsHash: string;
    createdAt: number;
    lastUsedAt: number;
    hitCount: number;
  };
  compilerOptions: ts.CompilerOptions;
}

/**
 * Program cache manager using LRU + WeakMap hybrid approach:
 * - LRU Map: Keeps strong references to metadata (small, always in memory)
 * - WeakMap: Keeps weak references to programs (large, can be GC'd under memory pressure)
 *
 * Key feature: Find a cached program that contains a single source file.
 * This allows smaller, more focused programs to coexist in the cache.
 */
export class ProgramCacheManager {
  // Strong references: LRU keeps track of cache entries
  private lruCache: Map<string, CacheEntry> = new Map();

  // Weak references: Programs can be GC'd when memory is needed
  private programCache: WeakMap<object, ts.SemanticDiagnosticsBuilderProgram> = new WeakMap();
  private compilerHostCache: WeakMap<object, IncrementalCompilerHost> = new WeakMap();

  private maxSize = 10; // Max entries in LRU (configurable)

  /**
   * Find a cached program that contains the requested source file, and update it if content changed
   */
  findProgramForFile(
    sourceFile: string,
    fileContent: string,
    compilerOptionsHash: string,
  ): {
    program: ts.SemanticDiagnosticsBuilderProgram | null;
    host: IncrementalCompilerHost | null;
    cacheKey: string | null;
    wasUpdated: boolean;
  } {
    const normalizedFile = path.normalize(sourceFile);
    const currentHash = this.hashFileContent(fileContent);

    // Check each cached entry to find one containing this file
    for (const [cacheKey, entry] of this.lruCache.entries()) {
      // Must have same compiler options
      if (entry.metadata.compilerOptionsHash !== compilerOptionsHash) {
        continue;
      }

      // Check if this program contains the file
      if (!entry.metadata.filesInProgram.has(normalizedFile)) {
        continue;
      }

      // Try to get program from WeakMap
      const program = this.programCache.get(entry.keyObj);
      const host = this.compilerHostCache.get(entry.keyObj);

      if (!program || !host) {
        // Program was GC'd, remove stale entry
        this.lruCache.delete(cacheKey);
        continue;
      }

      // Found a match! Check if file content changed
      const cachedHash = entry.metadata.fileContentHashes.get(normalizedFile);
      let wasUpdated = false;

      if (currentHash !== cachedHash) {
        // File content changed - update host
        debug(`File ${sourceFile} changed, updating in cached program`);
        host.updateFile(normalizedFile, fileContent);
        entry.metadata.fileContentHashes.set(normalizedFile, currentHash);
        wasUpdated = true;
      }

      // Update LRU
      this.touchEntry(cacheKey, entry);

      return {
        program,
        host,
        cacheKey,
        wasUpdated,
      };
    }

    return {
      program: null,
      host: null,
      cacheKey: null,
      wasUpdated: false,
    };
  }

  /**
   * Store a newly created program with content hashes
   * Discovers ALL files in the program (not just root files)
   */
  storeProgram(
    rootFiles: string[],
    fileContents: Map<string, string>,
    program: ts.SemanticDiagnosticsBuilderProgram,
    host: IncrementalCompilerHost,
    compilerOptions: ts.CompilerOptions,
  ): void {
    const tsProgram = program.getProgram();
    const filesInProgram = new Set<string>();
    const fileContentHashes = new Map<string, string>();

    // Discover all files in program
    for (const sourceFile of tsProgram.getSourceFiles()) {
      const normalized = path.normalize(sourceFile.fileName);
      filesInProgram.add(normalized);

      // Hash the content (either from our map or from the source file text)
      const content = fileContents.get(sourceFile.fileName) || sourceFile.text;
      fileContentHashes.set(normalized, this.hashFileContent(content));
    }

    const compilerOptionsHash = this.hashCompilerOptions(compilerOptions);
    const cacheKey = this.generateCacheKey(rootFiles, compilerOptionsHash);

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
        rootFiles: rootFiles.map(f => path.normalize(f)),
        fileContentHashes,
        compilerOptionsHash,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        hitCount: 0,
      },
      compilerOptions,
    };

    // Store in both caches
    this.lruCache.set(cacheKey, entry);
    this.programCache.set(keyObj, program);
    this.compilerHostCache.set(keyObj, host);

    info(
      `Cached program: ${rootFiles.length} root file(s) → ${filesInProgram.size} total files in program`,
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

    // Replace program in WeakMap (using same keyObj)
    this.programCache.set(entry.keyObj, newProgram);
  }

  private touchEntry(cacheKey: string, entry: CacheEntry): void {
    // Move to end of LRU (most recently used)
    this.lruCache.delete(cacheKey);
    this.lruCache.set(cacheKey, entry);

    entry.metadata.lastUsedAt = Date.now();
    entry.metadata.hitCount++;
  }

  private generateCacheKey(rootFiles: string[], optionsHash: string): string {
    const filesHash = this.hashFiles(rootFiles);
    return `${filesHash}:${optionsHash}`;
  }

  private hashFiles(files: string[]): string {
    const sorted = [...files].sort();
    const content = sorted.join('|');
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  hashCompilerOptions(options: ts.CompilerOptions): string {
    // Hash relevant compiler options that affect type checking
    const relevant = {
      target: options.target,
      module: options.module,
      jsx: options.jsx,
      moduleResolution: options.moduleResolution,
      strict: options.strict,
      esModuleInterop: options.esModuleInterop,
      allowSyntheticDefaultImports: options.allowSyntheticDefaultImports,
      skipLibCheck: options.skipLibCheck,
      lib: options.lib,
      types: options.types,
      paths: options.paths,
      baseUrl: options.baseUrl,
      allowJs: options.allowJs,
      checkJs: options.checkJs,
    };
    return createHash('sha256').update(JSON.stringify(relevant)).digest('hex').substring(0, 16);
  }

  private hashFileContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  getCacheStats() {
    const entries = Array.from(this.lruCache.values());

    return {
      size: this.lruCache.size,
      maxSize: this.maxSize,
      entries: entries.map(e => ({
        rootFileCount: e.metadata.rootFiles.length,
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
  if (!instance) {
    instance = new ProgramCacheManager();
  }
  return instance;
}
