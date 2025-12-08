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
import { getFsCache } from '../../../shared/src/helpers/fs-cache.js';
import {
  getCachedSourceFile,
  setCachedSourceFile,
  invalidateCachedSourceFile,
} from './cache/sourceFileCache.js';

interface FsCall {
  op: string;
  file: string;
  timestamp: number;
}

/**
 * Custom CompilerHost that allows:
 * - Reading file contents from FsCache (lazy loading with caching)
 * - Parsing and caching TypeScript SourceFile ASTs globally (shared across programs)
 * - Tracking filesystem calls from TypeScript
 * - Incremental file updates for builder programs
 */
export class IncrementalCompilerHost implements ts.CompilerHost {
  private readonly fileVersions = new Map<string, number>();
  private readonly modifiedFiles = new Set<string>();
  // Track the content this host has seen for each file (for change detection)
  private readonly knownContent = new Map<string, string>();
  private fsCallTracker: FsCall[] = [];
  private readonly baseHost: ts.CompilerHost;
  private readonly fsCache = getFsCache();

  constructor(
    compilerOptions: ts.CompilerOptions,
    private readonly baseDir: string,
  ) {
    this.baseHost = ts.createCompilerHost(compilerOptions, true);
  }

  /**
   * Update a single file (for incremental updates on cache hit)
   * Returns true if the file content actually changed
   */
  updateFile(filePath: string, content: string | undefined): boolean {
    if (!content) {
      return false;
    }
    const normalized = path.normalize(filePath);
    // Compare against what this host has seen, not what's in FsCache
    const oldContent = this.knownContent.get(normalized);

    if (oldContent === content) {
      return false; // No change
    }

    // Track the new content for future comparisons
    this.knownContent.set(normalized, content);
    // Update FsCache with new content
    this.fsCache.preloadFiles({ [normalized]: { fileContent: content } });
    this.fileVersions.set(normalized, (this.fileVersions.get(normalized) || 0) + 1);
    this.modifiedFiles.add(normalized);

    // Invalidate global parsed SourceFile cache for this file (all targets)
    invalidateCachedSourceFile(normalized);

    return true; // File was updated
  }

  /**
   * Get version string for a file (used by builder programs for change detection)
   */
  getFileVersion(fileName: string): string {
    const normalized = path.normalize(fileName);
    return (this.fileVersions.get(normalized) || 0).toString();
  }

  /**
   * Get source file by path (required for builder programs to track versions properly)
   * This method is called by TypeScript's builder infrastructure to get versioned source files
   */
  getSourceFileByPath(
    fileName: string,
    _path: ts.Path,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean,
  ): ts.SourceFile | undefined {
    // Delegate to getSourceFile with the original fileName
    return this.getSourceFile(
      fileName,
      languageVersionOrOptions,
      onError,
      shouldCreateNewSourceFile,
    );
  }

  /**
   * Create hash for a file (required for builder programs)
   * This helps TypeScript's builder detect file changes
   */
  createHash(data: string): string {
    // Simple hash implementation - builder programs use this to detect changes
    // For our use case, we rely on version numbers instead of content hashing
    return this.getFileVersion(data);
  }

  // CompilerHost implementation - intercept file reads

  readFile(fileName: string): string | undefined {
    const normalized = path.normalize(fileName);

    // Use FsCache for all file reads - it handles caching and BOM stripping
    const content = this.fsCache.readFileSync(fileName);
    if (content !== undefined) {
      this.trackFsCall('readFile-cache', fileName);
      // Track what content this host has seen for change detection
      if (!this.knownContent.has(normalized)) {
        this.knownContent.set(normalized, content);
      }
      return content;
    }

    // If FsCache doesn't have it (shouldn't happen often), fall back to base host
    this.trackFsCall('readFile-disk', fileName);
    const diskContent = this.baseHost.readFile(fileName);
    if (diskContent !== undefined && !this.knownContent.has(normalized)) {
      this.knownContent.set(normalized, diskContent);
    }
    return diskContent;
  }

  fileExists(fileName: string): boolean {
    // Use FsCache for file existence checks
    if (this.fsCache.fileExists(fileName)) {
      this.trackFsCall('fileExists-cache', fileName);
      return true;
    }

    // Fallback to base host for files not in cache
    this.trackFsCall('fileExists-disk', fileName);
    return this.baseHost.fileExists(fileName);
  }

  getSourceFile(
    fileName: string,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean,
  ): ts.SourceFile | undefined {
    const normalized = path.normalize(fileName);
    const currentVersion = this.fileVersions.get(normalized) || 0;
    const contentHash = currentVersion.toString();

    const scriptTarget =
      typeof languageVersionOrOptions === 'number'
        ? languageVersionOrOptions
        : languageVersionOrOptions.languageVersion;

    // Check global cache (unless forced to create new)
    if (!shouldCreateNewSourceFile) {
      const cached = getCachedSourceFile(normalized, scriptTarget, contentHash);
      if (cached) {
        // Set version for builder programs
        (cached as ts.SourceFile & { version?: string }).version = contentHash;
        return cached;
      }
    }

    // Try to read content from FsCache
    const content = this.readFile(fileName);
    let sourceFile: (ts.SourceFile & { version?: string }) | undefined;
    if (content) {
      this.trackFsCall('getSourceFile', fileName);

      // Parse the file
      sourceFile = ts.createSourceFile(
        fileName,
        content,
        scriptTarget,
        true, // setNodeParents
      );

      // Store in global cache for reuse across programs
      setCachedSourceFile(normalized, scriptTarget, contentHash, sourceFile);
    } else {
      // Fallback to base host for files we don't have
      this.trackFsCall('getSourceFile-disk-fallback', fileName);
      sourceFile = this.baseHost.getSourceFile(
        fileName,
        languageVersionOrOptions,
        onError,
        shouldCreateNewSourceFile,
      );
    }

    if (sourceFile) {
      sourceFile.version = contentHash;
    }
    return sourceFile;
  }

  private trackFsCall(op: string, file: string): void {
    this.fsCallTracker.push({ op, file, timestamp: Date.now() });
  }

  /**
   * Get all tracked filesystem calls (for debugging/monitoring)
   */
  getTrackedFsCalls(): FsCall[] {
    return this.fsCallTracker;
  }

  /**
   * Clear filesystem call tracking
   */
  clearTracking(): void {
    this.fsCallTracker = [];
  }

  getDefaultLibLocation(): string {
    return this.baseHost.getDefaultLibLocation!();
  }

  // Delegate remaining CompilerHost methods to base host

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return this.baseHost.getDefaultLibFileName(options);
  }

  writeFile: ts.WriteFileCallback = () => {
    // No-op for analysis - we don't write output files
  };

  getCurrentDirectory(): string {
    return this.baseDir;
  }

  readDirectory(
    rootDir: string,
    extensions: readonly string[],
    excludes: readonly string[] | undefined,
    includes: readonly string[],
    depth?: number,
  ): string[] {
    return this.baseHost.readDirectory!(rootDir, extensions, excludes, includes, depth);
  }

  getCanonicalFileName(fileName: string): string {
    return this.baseHost.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this.baseHost.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this.baseHost.getNewLine();
  }
}
