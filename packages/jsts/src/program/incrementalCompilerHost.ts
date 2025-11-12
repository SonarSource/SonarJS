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
import path from 'path';

interface FsCall {
  op: string;
  file: string;
  timestamp: number;
}

/**
 * Custom CompilerHost that allows:
 * - Injecting file contents without disk writes
 * - Tracking filesystem calls from TypeScript
 * - Incremental file updates for builder programs
 */
export class IncrementalCompilerHost implements ts.CompilerHost {
  private fileContentsMap = new Map<string, string>();
  private fileVersions = new Map<string, number>();
  private sourceFileCache = new Map<string, { version: number; sourceFile: ts.SourceFile }>();
  private modifiedFiles = new Set<string>();
  private fsCallTracker: FsCall[] = [];
  private baseHost: ts.CompilerHost;

  constructor(
    compilerOptions: ts.CompilerOptions,
    private baseDir: string,
  ) {
    this.baseHost = ts.createCompilerHost(compilerOptions);
  }

  /**
   * Set file contents for multiple files (typically on initial program creation)
   */
  setFileContents(files: Map<string, string>): void {
    for (const [filePath, content] of files.entries()) {
      const normalizedPath = path.normalize(filePath);
      this.fileContentsMap.set(normalizedPath, content);
      this.fileVersions.set(normalizedPath, (this.fileVersions.get(normalizedPath) || 0) + 1);
    }
  }

  /**
   * Update a single file (for incremental updates on cache hit)
   * Returns true if the file content actually changed
   */
  updateFile(filePath: string, content: string): boolean {
    const normalized = path.normalize(filePath);
    const oldContent = this.fileContentsMap.get(normalized);

    if (oldContent === content) {
      return false; // No change
    }

    this.fileContentsMap.set(normalized, content);
    this.fileVersions.set(normalized, (this.fileVersions.get(normalized) || 0) + 1);
    this.modifiedFiles.add(normalized);

    // Invalidate source file cache for this file
    this.sourceFileCache.delete(normalized);

    return true; // File was updated
  }

  /**
   * Get list of files that were modified since last check
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

    // Check in-memory overlay first
    if (this.fileContentsMap.has(normalized)) {
      this.trackFsCall('readFile', fileName);
      return this.fileContentsMap.get(normalized);
    }

    // Fallback to real filesystem
    this.trackFsCall('readFile-disk', fileName);
    return this.baseHost.readFile!(fileName);
  }

  fileExists(fileName: string): boolean {
    const normalized = path.normalize(fileName);

    if (this.fileContentsMap.has(normalized)) {
      this.trackFsCall('fileExists', fileName);
      return true;
    }

    this.trackFsCall('fileExists-disk', fileName);
    return this.baseHost.fileExists!(fileName);
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
      if (cached && cached.version === currentVersion) {
        return cached.sourceFile;
      }
    }

    // If we have this file in memory, create source file from our content
    if (this.fileContentsMap.has(normalized)) {
      this.trackFsCall('getSourceFile', fileName);
      const content = this.fileContentsMap.get(normalized)!;
      const scriptTarget =
        typeof languageVersionOrOptions === 'number'
          ? languageVersionOrOptions
          : languageVersionOrOptions.languageVersion;

      const sourceFile = ts.createSourceFile(fileName, content, scriptTarget, true);

      // Cache it
      this.sourceFileCache.set(normalized, { version: currentVersion, sourceFile });

      return sourceFile;
    }

    // Fallback to base host
    this.trackFsCall('getSourceFile-disk', fileName);
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
