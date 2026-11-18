/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { hash } from 'node:crypto';
import { fileContentStore } from '../../common/file-content-store.js';
import { readDirectory } from './filesystem.js';
import { prepareFileRepresentation } from './file-representation.js';
import {
  getSourceFileContentCache,
  getProvidedSourceFile,
  hasProvidedSourceDirectory,
  getCachedSourceFile,
  setCachedSourceFile,
  invalidateParsedSourceFile,
} from './cache/sourceFileCache.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';
import {
  hasArchivedDirectory,
  hasArchivedFileContent,
} from '../../../../shared/src/fs-cache/hook.js';
import {
  canonicalFileName,
  isFileSystemCaseSensitive,
  FileSystemMap,
  FileSystemSet,
  pathIsUnder,
  pathsEqual,
} from '../../common/filesystem.js';

type FileState = { version?: number; representation: string };
// Share initial identities across hosts; only edited hosts need their own versioned state.
const representationStatesKey = Symbol('compiler representation states');
type RepresentationStates = Map<ts.JsxEmit | undefined, { rawHash: string; state: FileState }>;

/**
 * Custom CompilerHost that allows:
 * - Reading file contents from global cache (lazy loading)
 * - Parsing and caching TypeScript SourceFile ASTs globally (shared across programs)
 * - Incremental file updates for builder programs
 */
export class IncrementalCompilerHost implements ts.CompilerHost {
  // Map from normalized file path to version number (incremented on file changes).
  // Used by TypeScript's builder programs for change detection.
  private readonly fileStates = new FileSystemMap<string, FileState>();
  private readonly modifiedFiles = new FileSystemSet<string>();
  private readonly baseHost: ts.CompilerHost;
  private realBaseDir: NormalizedAbsolutePath | undefined;
  private readonly resolvedFileNames = new FileSystemMap<string, NormalizedAbsolutePath>();
  private readonly aliasesByResolvedFile = new FileSystemMap<string, FileSystemSet<string>>();

  constructor(
    private readonly compilerOptions: ts.CompilerOptions,
    private readonly baseDir: NormalizedAbsolutePath,
    private readonly skipNodeModuleLookupOutsideBaseDir = false,
  ) {
    this.baseHost = ts.createCompilerHost(compilerOptions, true);
  }

  /**
   * Update a single file (for incremental updates on cache hit)
   * Returns true if the file content actually changed
   */
  updateFile(filePath: NormalizedAbsolutePath, content: string | undefined): boolean {
    if (content === undefined) {
      return false;
    }
    const normalized = this.getResolvedFileName(filePath);
    const cache = getSourceFileContentCache();
    const previous = this.fileStates.get(normalized);
    const oldContent = cache.get(normalized);
    const previousIdentity =
      previous?.representation ??
      (oldContent === undefined
        ? undefined
        : this.representationIdentity(normalized, oldContent).representation);
    cache.set(normalized, content);
    const representation = this.representationIdentity(normalized, content);
    if (previousIdentity === representation.representation) {
      this.fileStates.set(normalized, previous ?? representation);
      return false;
    }
    this.fileStates.set(normalized, { ...representation, version: (previous?.version ?? 0) + 1 });
    this.modifiedFiles.add(normalized);

    // Invalidate global parsed SourceFile cache for this file (all targets)
    invalidateParsedSourceFile(normalized);

    return true; // File was updated
  }

  /**
   * Get version string for a file (used by builder programs for change detection)
   */
  getFileVersion(fileName: string): string {
    const normalized = this.getResolvedFileName(fileName);
    return (this.fileStates.get(normalized)?.version ?? 0).toString();
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

  /** Reuse only symlink identities already observed by TypeScript, without probing extra files. */
  getResolvedFileName(fileName: string): NormalizedAbsolutePath {
    const normalized = normalizeToAbsolutePath(fileName, this.baseDir);
    return this.resolvedFileNames.get(normalized) ?? normalized;
  }

  private getProvidedFile(fileName: string): { fileContent?: string } | undefined {
    const resolved = this.getResolvedFileName(fileName);
    let provided = getProvidedSourceFile(resolved);
    if (provided?.fileContent !== undefined) {
      return provided;
    }
    for (const alias of this.aliasesByResolvedFile.get(resolved) ?? []) {
      const candidate = getProvidedSourceFile(alias);
      if (candidate?.fileContent !== undefined) {
        return candidate;
      }
      provided ??= candidate;
    }
    return provided;
  }

  readFile(fileName: string): string | undefined {
    const normalized = this.getResolvedFileName(fileName);
    if (this.shouldSkipNodeModulesOutsideBaseDir(normalized)) {
      return;
    }

    const cache = getSourceFileContentCache();
    const providedFile = this.getProvidedFile(fileName);

    // 1. For files in the current request context, always prefer request content.
    // This avoids serving stale contents from the global cache across requests.
    if (typeof providedFile?.fileContent === 'string') {
      const content = providedFile.fileContent;
      if (cache.get(normalized) !== content) {
        cache.set(normalized, content);
      }
      return content;
    }

    // 2. For files outside the request context, use the global cache.
    if (cache.has(normalized)) {
      return cache.get(normalized);
    }

    // 3. Fallback to real filesystem (and cache it)
    const content = this.baseHost.readFile(fileName);
    if (content !== undefined) {
      cache.set(normalized, content);

      // Update files object if entry already exists (keep cache and files in sync).
      // We only update existing entries - we don't create new ones as the request context
      // represents files explicitly provided by the caller.
      if (providedFile) {
        providedFile.fileContent = content;
      }
    }
    return content;
  }

  fileExists(fileName: string): boolean {
    const normalized = this.getResolvedFileName(fileName);
    if (this.shouldSkipNodeModulesOutsideBaseDir(normalized)) {
      return false;
    }

    const cache = getSourceFileContentCache();

    // 1. Check global cache
    if (cache.has(normalized)) {
      return true;
    }

    // 2. Check files context
    const providedFile = this.getProvidedFile(fileName);
    if (providedFile) {
      return true;
    }

    // TypeScript resolves imports through fileExists before readFile. CI may supply
    // a source from the request context without ever making a stat call, while its
    // content is still present in the replay archive.
    if (hasArchivedFileContent(fileName)) {
      return true;
    }

    // 3. Fallback to filesystem
    // TODO: Consider caching negative results to avoid repeated filesystem checks for missing files
    return this.baseHost.fileExists(fileName);
  }

  getSourceFile(
    fileName: string,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    onError?: (message: string) => void,
    shouldCreateNewSourceFile?: boolean,
  ): ts.SourceFile | undefined {
    const normalized = this.getResolvedFileName(fileName);
    if (this.shouldSkipNodeModulesOutsideBaseDir(normalized)) {
      return;
    }

    // For files explicitly present in the current analysis context, make the
    // request content authoritative before looking up cached parsed ASTs.
    const contextContent = this.getProvidedFile(fileName)?.fileContent;
    if (contextContent !== undefined) {
      this.updateFile(normalized, contextContent);
    }

    const currentVersion = this.fileStates.get(normalized)?.version ?? 0;
    const contentHash = currentVersion.toString();
    const content = this.readFile(fileName);
    let sourceFile: (ts.SourceFile & { version?: string }) | undefined;
    if (content === undefined) {
      sourceFile = this.baseHost.getSourceFile(
        fileName,
        languageVersionOrOptions,
        onError,
        shouldCreateNewSourceFile,
      );
    } else {
      const identity = this.representationIdentity(normalized, content);
      const previous = this.fileStates.get(normalized);
      if (previous?.representation !== identity.representation) {
        this.fileStates.set(
          normalized,
          currentVersion === 0 ? identity : { ...identity, version: currentVersion },
        );
      }
      sourceFile = this.getParsedSourceFile(
        fileName,
        content,
        languageVersionOrOptions,
        contentHash,
        shouldCreateNewSourceFile,
      );
    }
    if (sourceFile) {
      sourceFile.version = contentHash;
    }
    return sourceFile;
  }

  /** Each host retains only its last representation identity, independently of shared updates. */
  private representationIdentity(file: string, content: string): FileState {
    const rawHash = fileContentStore.contentHash(file, content);
    let states = fileContentStore.getData<RepresentationStates>(file, representationStatesKey);
    if (!states) {
      states = new Map();
      fileContentStore.setData(file, representationStatesKey, states);
    }
    const key = this.compilerOptions.jsx;
    const cached = states.get(key);
    if (cached?.rawHash === rawHash) {
      return cached.state;
    }
    const representation = prepareFileRepresentation(file, content, this.compilerOptions);
    // Invalid projections must remain non-reusable, even when their generated text is empty.
    const state = {
      representation: `${representation.scriptKind ?? -1}:${hash('sha256', representation.text)}:${representation.reusable ? '' : rawHash}`,
    };
    states.set(key, { rawHash, state });
    return state;
  }

  /** Reuse a parsed representation only when both its options and text match. */
  private getParsedSourceFile(
    fileName: string,
    content: string,
    languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    contentHash: string,
    shouldCreateNewSourceFile?: boolean,
  ): ts.SourceFile {
    const normalized = this.getResolvedFileName(fileName);
    const { jsx, importHelpers } = this.compilerOptions;
    const representation = prepareFileRepresentation(normalized, content, this.compilerOptions);
    const cacheOptions = { ...this.compilerOptions, scriptKind: representation.scriptKind };

    // Check global cache (unless forced to create new)
    if (!shouldCreateNewSourceFile) {
      const cached = getCachedSourceFile(
        normalized,
        languageVersionOrOptions,
        contentHash,
        jsx,
        importHelpers,
        cacheOptions,
      );
      if (cached?.text === representation.text) {
        return representation.createSourceFile(fileName, languageVersionOrOptions, cached);
      }
    }

    const sourceFile = representation.createSourceFile(fileName, languageVersionOrOptions);

    setCachedSourceFile(
      normalized,
      languageVersionOrOptions,
      contentHash,
      sourceFile,
      jsx,
      importHelpers,
      cacheOptions,
    );
    return sourceFile;
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

  directoryExists(directory: string): boolean {
    const normalized = normalizeToAbsolutePath(directory, this.baseDir);
    if (this.shouldSkipNodeModulesOutsideBaseDir(normalized)) {
      return false;
    }
    return (
      (this.baseHost.directoryExists?.(normalized) ?? false) ||
      hasProvidedSourceDirectory(normalized) ||
      hasArchivedDirectory(normalized)
    );
  }

  getDirectories(directory: string): string[] {
    const normalized = normalizeToAbsolutePath(directory, this.baseDir);
    if (this.shouldSkipNodeModulesOutsideBaseDir(normalized)) {
      return [];
    }
    return this.baseHost.getDirectories?.(normalized) ?? [];
  }

  realpath(fileName: string): string {
    const resolved = this.baseHost.realpath?.(fileName) ?? fileName;
    const normalized = normalizeToAbsolutePath(fileName, this.baseDir);
    const normalizedResolved = normalizeToAbsolutePath(resolved, this.baseDir);
    if (!pathsEqual(normalized, normalizedResolved)) {
      this.resolvedFileNames.set(normalized, normalizedResolved);
      let aliases = this.aliasesByResolvedFile.get(normalizedResolved);
      if (!aliases) {
        aliases = new FileSystemSet();
        this.aliasesByResolvedFile.set(normalizedResolved, aliases);
      }
      aliases.add(normalized);
    }
    return resolved;
  }

  readDirectory(
    rootDir: string,
    extensions: readonly string[],
    excludes: readonly string[] | undefined,
    includes: readonly string[],
    depth?: number,
  ): string[] {
    const normalizedRootDir = normalizeToAbsolutePath(rootDir, this.baseDir);
    if (this.shouldSkipNodeModulesOutsideBaseDir(normalizedRootDir)) {
      return [];
    }

    return readDirectory(rootDir, extensions, excludes, includes, depth);
  }

  getCanonicalFileName(fileName: string): string {
    return canonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return isFileSystemCaseSensitive();
  }

  getNewLine(): string {
    return this.baseHost.getNewLine();
  }

  private shouldSkipNodeModulesOutsideBaseDir(fileName: string): boolean {
    if (!this.skipNodeModuleLookupOutsideBaseDir) {
      return false;
    }
    if (pathIsUnder(fileName, this.getDefaultLibLocation())) {
      return false;
    }
    const canonical = canonicalFileName(fileName);
    if (
      !(canonical.includes('/node_modules/') || canonical.endsWith('/node_modules')) ||
      pathIsUnder(fileName, this.baseDir)
    ) {
      return false;
    }
    this.realBaseDir ??= normalizeToAbsolutePath(this.realpath(this.baseDir));
    return !pathIsUnder(fileName, this.realBaseDir);
  }
}
