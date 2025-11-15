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
import { getSourceFileContentCache, getCurrentFilesContext } from './program.js';

interface FsCall {
  op: string;
  file: string;
  timestamp: number;
}

/**
 * Custom CompilerHost that allows:
 * - Reading file contents from global cache (lazy loading)
 * - Tracking filesystem calls from TypeScript
 * - Incremental file updates for builder programs
 */
export class IncrementalCompilerHost implements ts.CompilerHost {
  private readonly fileVersions = new Map<string, number>();
  private readonly sourceFileCache = new Map<
    string,
    { version: number; sourceFile: ts.SourceFile }
  >();
  private readonly modifiedFiles = new Set<string>();
  private fsCallTracker: FsCall[] = [];
  private readonly baseHost: ts.CompilerHost;

  constructor(
    compilerOptions: ts.CompilerOptions,
    private readonly baseDir: string,
  ) {
    this.baseHost = ts.createCompilerHost(compilerOptions);
  }

  /**
   * Update a single file (for incremental updates on cache hit)
   * Returns true if the file content actually changed
   */
  updateFile(filePath: string, content: string): boolean {
    const normalized = path.normalize(filePath);
    const cache = getSourceFileContentCache();
    const oldContent = cache.get(normalized);

    if (oldContent === content) {
      return false; // No change
    }

    cache.set(normalized, content);
    this.fileVersions.set(normalized, (this.fileVersions.get(normalized) || 0) + 1);
    this.modifiedFiles.add(normalized);

    // Invalidate source file cache for this file
    this.sourceFileCache.delete(normalized);

    return true; // File was updated
  }

  /**
   * Get a list of files that were modified since the last check
   */
  getModifiedFiles(): string[] {
    return Array.from(this.modifiedFiles);
  }

  /**
   * Clear the modified files tracking
   */
  clearModifiedTracking(): void {
    this.modifiedFiles.clear();
  }

  /**
   * Get version string for a file (used by builder programs for change detection)
   */
  getFileVersion(fileName: string): string {
    const normalized = path.normalize(fileName);
    return (this.fileVersions.get(normalized) || 0).toString();
  }

  // CompilerHost implementation - intercept file reads

  readFile(fileName: string): string | undefined {
    const normalized = path.normalize(fileName);
    const cache = getSourceFileContentCache();

    // 1. Check global cache
    if (cache.has(normalized)) {
      this.trackFsCall('readFile-cache', fileName);
      return cache.get(normalized);
    }

    // 2. Try to get from current files context (if content is already available)
    const filesContext = getCurrentFilesContext();
    if (filesContext?.[fileName]?.fileContent) {
      this.trackFsCall('readFile-context', fileName);
      const content = filesContext[fileName].fileContent!;
      cache.set(normalized, content);
      return content;
    }

    // 3. Fallback to real filesystem (and cache it)
    this.trackFsCall('readFile-disk', fileName);
    const content = this.baseHost.readFile(fileName);
    if (content) {
      cache.set(normalized, content);

      // Update files object if entry exists (keep cache and files in sync)
      if (filesContext?.[fileName]) {
        filesContext[fileName].fileContent = content;
      }
    }
    return content;
  }

  fileExists(fileName: string): boolean {
    const normalized = path.normalize(fileName);
    const cache = getSourceFileContentCache();

    // 1. Check global cache
    if (cache.has(normalized)) {
      this.trackFsCall('fileExists-cache', fileName);
      return true;
    }

    // 2. Check files context
    const filesContext = getCurrentFilesContext();
    if (filesContext?.[fileName]) {
      this.trackFsCall('fileExists-context', fileName);
      return true;
    }

    // 3. Fallback to filesystem
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

    // Check cache (unless forced to create new)
    if (!shouldCreateNewSourceFile) {
      const cached = this.sourceFileCache.get(normalized);
      if (cached?.version === currentVersion) {
        return cached.sourceFile;
      }
    }

    // Try to read content (will use global cache or lazy load)
    const content = this.readFile(fileName);
    if (content) {
      this.trackFsCall('getSourceFile', fileName);
      const scriptTarget =
        typeof languageVersionOrOptions === 'number'
          ? languageVersionOrOptions
          : languageVersionOrOptions.languageVersion;

      const sourceFile = ts.createSourceFile(fileName, content, scriptTarget, true);

      // Cache it
      this.sourceFileCache.set(normalized, { version: currentVersion, sourceFile });

      return sourceFile;
    }

    // Fallback to base host for files we don't have
    this.trackFsCall('getSourceFile-disk-fallback', fileName);
    const sourceFile = this.baseHost.getSourceFile(fileName, languageVersionOrOptions, onError);

    if (sourceFile && !shouldCreateNewSourceFile) {
      this.sourceFileCache.set(normalized, { version: currentVersion, sourceFile });
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

  getCanonicalFileName(fileName: string): string {
    return this.baseHost.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this.baseHost.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this.baseHost.getNewLine();
  }

  // Optional methods that might be called

  resolveModuleNames?: (
    moduleNames: string[],
    containingFile: string,
    reusedNames: string[] | undefined,
    redirectedReference: ts.ResolvedProjectReference | undefined,
    options: ts.CompilerOptions,
    containingSourceFile?: ts.SourceFile,
  ) => (ts.ResolvedModule | undefined)[];

  resolveModuleNameLiterals?: (
    moduleLiterals: readonly ts.StringLiteralLike[],
    containingFile: string,
    redirectedReference: ts.ResolvedProjectReference | undefined,
    options: ts.CompilerOptions,
    containingSourceFile: ts.SourceFile,
    reusedNames: readonly ts.StringLiteralLike[] | undefined,
  ) => readonly ts.ResolvedModuleWithFailedLookupLocations[];

  getDirectories?: (path: string) => string[];
  directoryExists?: (directoryName: string) => boolean;
  realpath?: (path: string) => string;
  trace?: (s: string) => void;
}
