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
import fs from 'node:fs';
import { toUnixPath } from './files.js';
import { debug } from './logging.js';

/**
 * Byte Order Marker
 */
const BOM_BYTE = 0xfeff;

/**
 * Removes any Byte Order Marker (BOM) from a string's head
 */
function stripBOM(str: string): string {
  if (str.codePointAt(0) === BOM_BYTE) {
    return str.slice(1);
  }
  return str;
}

/**
 * Represents a file that may or may not exist on disk.
 * The `missing` flag indicates if the file was not found.
 */
export type CachedFile = {
  content: string;
  missing: boolean;
};

/**
 * Centralized filesystem cache layer.
 *
 * This class provides a single source of truth for all filesystem access,
 * caching file contents to avoid repeated disk reads. It supports:
 *
 * - File content caching with BOM stripping
 * - Directory listing caching
 * - File existence caching
 * - Invalidation via fsEvents or baseDir changes
 * - Pre-population from request data (files sent via HTTP)
 *
 * Usage:
 *   const cache = getFsCache();
 *   cache.setBaseDir('/project');
 *   const content = await cache.readFile('/project/src/index.ts');
 */
class FsCache {
  private baseDir: string | undefined;

  /**
   * Cache for file contents.
   * Key: normalized file path
   * Value: { content, missing } where missing=true means file doesn't exist
   */
  private readonly fileContents = new Map<string, CachedFile>();

  /**
   * Cache for directory listings.
   * Key: normalized directory path
   * Value: array of entry names (not full paths)
   */
  private readonly dirListings = new Map<string, string[]>();

  /**
   * Cache for file/directory existence and type.
   * Key: normalized path
   * Value: 'file' | 'directory' | 'missing'
   */
  private readonly pathTypes = new Map<string, 'file' | 'directory' | 'missing'>();

  /**
   * Set the base directory for the cache.
   * If the base directory changes, the cache is cleared.
   */
  setBaseDir(baseDir: string): void {
    const normalized = toUnixPath(baseDir);
    if (this.baseDir !== normalized) {
      this.clear();
      this.baseDir = normalized;
      debug(`FsCache: baseDir set to ${normalized}`);
    }
  }

  getBaseDir(): string | undefined {
    return this.baseDir;
  }

  /**
   * Pre-populate the cache with file contents from request data.
   * This is used when files are sent via HTTP request and we don't need to read from disk.
   */
  preloadFiles(files: Record<string, { fileContent?: string }>): void {
    for (const [filePath, file] of Object.entries(files)) {
      if (file.fileContent !== undefined) {
        const normalized = toUnixPath(filePath);
        this.fileContents.set(normalized, {
          content: stripBOM(file.fileContent),
          missing: false,
        });
        this.pathTypes.set(normalized, 'file');
      }
    }
    debug(`FsCache: preloaded ${Object.keys(files).length} files from request`);
  }

  /**
   * Read a file's content, using cache if available.
   * Returns undefined if the file doesn't exist.
   */
  async readFile(filePath: string): Promise<string | undefined> {
    const normalized = toUnixPath(filePath);

    // Check cache first
    const cached = this.fileContents.get(normalized);
    if (cached !== undefined) {
      return cached.missing ? undefined : cached.content;
    }

    // Read from disk
    try {
      const content = await fs.promises.readFile(filePath, { encoding: 'utf8' });
      const stripped = stripBOM(content);
      this.fileContents.set(normalized, { content: stripped, missing: false });
      this.pathTypes.set(normalized, 'file');
      return stripped;
    } catch {
      this.fileContents.set(normalized, { content: '', missing: true });
      this.pathTypes.set(normalized, 'missing');
      return undefined;
    }
  }

  /**
   * Read a file's content synchronously, using cache if available.
   * Returns undefined if the file doesn't exist.
   */
  readFileSync(filePath: string): string | undefined {
    const normalized = toUnixPath(filePath);

    // Check cache first
    const cached = this.fileContents.get(normalized);
    if (cached !== undefined) {
      return cached.missing ? undefined : cached.content;
    }

    // Read from disk
    try {
      const content = fs.readFileSync(filePath, { encoding: 'utf8' });
      const stripped = stripBOM(content);
      this.fileContents.set(normalized, { content: stripped, missing: false });
      this.pathTypes.set(normalized, 'file');
      return stripped;
    } catch {
      this.fileContents.set(normalized, { content: '', missing: true });
      this.pathTypes.set(normalized, 'missing');
      return undefined;
    }
  }

  /**
   * Check if a file exists, using cache if available.
   */
  fileExists(filePath: string): boolean {
    const normalized = toUnixPath(filePath);

    // Check cache first
    const cached = this.pathTypes.get(normalized);
    if (cached !== undefined) {
      return cached === 'file';
    }

    // Check disk
    try {
      const stats = fs.statSync(filePath);
      const type = stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'missing';
      this.pathTypes.set(normalized, type);
      return type === 'file';
    } catch {
      this.pathTypes.set(normalized, 'missing');
      return false;
    }
  }

  /**
   * Check if a directory exists, using cache if available.
   */
  directoryExists(dirPath: string): boolean {
    const normalized = toUnixPath(dirPath);

    // Check cache first
    const cached = this.pathTypes.get(normalized);
    if (cached !== undefined) {
      return cached === 'directory';
    }

    // Check disk
    try {
      const stats = fs.statSync(dirPath);
      const type = stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'missing';
      this.pathTypes.set(normalized, type);
      return type === 'directory';
    } catch {
      this.pathTypes.set(normalized, 'missing');
      return false;
    }
  }

  /**
   * Read a directory's contents, using cache if available.
   * Returns an empty array if the directory doesn't exist.
   */
  readDir(dirPath: string): string[] {
    const normalized = toUnixPath(dirPath);

    // Check cache first
    const cached = this.dirListings.get(normalized);
    if (cached !== undefined) {
      return cached;
    }

    // Read from disk
    try {
      const entries = fs.readdirSync(dirPath).map(entry => entry.toString());
      this.dirListings.set(normalized, entries);
      this.pathTypes.set(normalized, 'directory');
      return entries;
    } catch {
      this.dirListings.set(normalized, []);
      this.pathTypes.set(normalized, 'missing');
      return [];
    }
  }

  /**
   * Invalidate a specific file in the cache.
   * Call this when you know a file has changed.
   */
  invalidateFile(filePath: string): void {
    const normalized = toUnixPath(filePath);
    this.fileContents.delete(normalized);
    this.pathTypes.delete(normalized);
  }

  /**
   * Invalidate a specific directory in the cache.
   * Call this when you know a directory's contents have changed.
   */
  invalidateDir(dirPath: string): void {
    const normalized = toUnixPath(dirPath);
    this.dirListings.delete(normalized);
    this.pathTypes.delete(normalized);
  }

  /**
   * Invalidate files matching a predicate.
   * Useful for invalidating based on fsEvents.
   */
  invalidateMatching(predicate: (path: string) => boolean): void {
    for (const path of this.fileContents.keys()) {
      if (predicate(path)) {
        this.fileContents.delete(path);
        this.pathTypes.delete(path);
      }
    }
    for (const path of this.dirListings.keys()) {
      if (predicate(path)) {
        this.dirListings.delete(path);
        this.pathTypes.delete(path);
      }
    }
  }

  /**
   * Clear all caches.
   */
  clear(): void {
    this.fileContents.clear();
    this.dirListings.clear();
    this.pathTypes.clear();
    debug('FsCache: cleared all caches');
  }

  /**
   * Get cache statistics for debugging.
   */
  getStats(): { fileCount: number; dirCount: number; pathTypeCount: number } {
    return {
      fileCount: this.fileContents.size,
      dirCount: this.dirListings.size,
      pathTypeCount: this.pathTypes.size,
    };
  }
}

// Singleton instance
let instance: FsCache | null = null;

/**
 * Get the singleton FsCache instance.
 */
export function getFsCache(): FsCache {
  instance ??= new FsCache();
  return instance;
}

/**
 * Clear the singleton FsCache instance.
 * Primarily used for testing.
 */
export function clearFsCache(): void {
  instance?.clear();
}
