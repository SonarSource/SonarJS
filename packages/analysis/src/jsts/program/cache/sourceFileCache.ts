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
import { FileSystemMap } from '../../../common/filesystem.js';
import { debug } from '../../../../../shared/src/helpers/logging.js';
import type ts from 'typescript';
import { clearFileRepresentationCaches } from '../file-representation.js';

/**
 * Global cache for source file contents
 * Lazily populated when CompilerHost needs files
 */
const sourceFileContentCache = new FileSystemMap<string, string>();

/**
 * Global cache for parsed TypeScript SourceFile ASTs
 *
 * This cache stores parsed ASTs keyed by fileName, scalar parse options, jsx, jsxImportSource,
 * importHelpers and scriptKind.
 * Content freshness is checked on the cached value; module detection uses scalar compiler options.
 * Multiple programs can share the same parsed AST if they have the same options.
 *
 * IMPLEMENTATION NOTE: Parse options control Node module format and JSDoc/module detection.
 * jsx, jsxImportSource and importHelpers also affect SourceFile.imports (the synthesized JSX runtime import
 * prepended by TypeScript when jsx=react-jsx, and tslib helpers when importHelpers=true).
 * Sharing a SourceFile between programs with different values for these options causes
 * internal TypeScript assertion failures (e.g. in getSuggestionDiagnostics).
 */
const parsedSourceFileCache = new FileSystemMap<
  string, // normalized file path
  Map<string, { contentHash: string; sourceFile: ts.SourceFile }> // compound key → entry
>();

type ParsedSourceFileOptions = Pick<
  ts.CompilerOptions,
  'moduleDetection' | 'module' | 'jsxImportSource'
> & {
  scriptKind?: ts.ScriptKind;
};

/**
 * Build a compound cache key from the options that affect SourceFile.imports structure.
 */
function parsedSourceFileCacheIdentity(
  languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
  jsx: ts.JsxEmit | undefined,
  importHelpers = false,
  compilerOptions?: ParsedSourceFileOptions,
) {
  const options =
    typeof languageVersionOrOptions === 'number'
      ? { languageVersion: languageVersionOrOptions }
      : languageVersionOrOptions;
  return `${options.languageVersion}:${options.impliedNodeFormat ?? -1}:${options.jsDocParsingMode ?? -1}:${jsx ?? -1}:${importHelpers ? 1 : 0}:${compilerOptions?.moduleDetection ?? -1}:${compilerOptions?.module ?? -1}:${compilerOptions?.scriptKind ?? -1}:${compilerOptions?.jsxImportSource ?? ''}`;
}

/**
 * Current files context for lazy loading
 */
let currentFilesByPath = new FileSystemMap<string, { fileContent?: string }>();
let currentFilesContext: Record<string, { fileContent?: string }> | null = null;
let sourceFilesContextVersion = 0;

/**
 * Set the current files context for lazy loading
 */
export function setSourceFilesContext(files: Record<string, { fileContent?: string }>): void {
  currentFilesContext = files;
  currentFilesByPath = new FileSystemMap(Object.entries(files));
  sourceFilesContextVersion++;
}

/** A new request can reuse the same files object with edited contents. */
export function getSourceFilesContextVersion(): number {
  return sourceFilesContextVersion;
}

/**
 * Get the source file content cache (for CompilerHost access)
 */
export function getSourceFileContentCache(): Map<string, string> {
  return sourceFileContentCache;
}

/**
 * Get the current files context (for CompilerHost access)
 */
export function getCurrentFilesContext(): Record<string, { fileContent?: string }> | null {
  return currentFilesContext;
}

export function getProvidedSourceFile(file: string): { fileContent?: string } | undefined {
  return currentFilesByPath.get(file);
}

/**
 * Get a cached parsed SourceFile for a given file and compiler options
 * @param fileName Normalized file path
 * @param languageVersionOrOptions TypeScript target and semantic source-file parsing options
 * @param contentHash Hash/version of the file content
 * @param jsx The jsx compiler option (affects SourceFile.imports structure)
 * @param importHelpers The importHelpers compiler option (affects SourceFile.imports structure)
 * @param compilerOptions Module settings, JSX import source and the representation script kind
 * @returns Cached SourceFile if available and content matches, undefined otherwise
 */
export function getCachedSourceFile(
  fileName: string,
  languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
  contentHash: string,
  jsx?: ts.JsxEmit,
  importHelpers = false,
  compilerOptions?: ParsedSourceFileOptions,
): ts.SourceFile | undefined {
  const fileCache = parsedSourceFileCache.get(fileName);
  if (!fileCache) {
    return undefined;
  }

  const key = parsedSourceFileCacheIdentity(
    languageVersionOrOptions,
    jsx,
    importHelpers,
    compilerOptions,
  );
  const cached = fileCache.get(key);
  // If hash doesn't match, return undefined (cache miss). The caller will parse
  // the file and call setCachedSourceFile, which overwrites the stale entry.
  // This makes the cache self-healing - stale entries cause one miss, then get fixed.
  if (cached?.contentHash === contentHash) {
    return cached.sourceFile;
  }

  return undefined;
}

/**
 * Store a parsed SourceFile in the global cache
 * @param fileName Normalized file path
 * @param languageVersionOrOptions TypeScript target and semantic source-file parsing options
 * @param contentHash Hash/version of the file content
 * @param sourceFile The parsed TypeScript SourceFile
 * @param jsx The jsx compiler option (affects SourceFile.imports structure)
 * @param importHelpers The importHelpers compiler option (affects SourceFile.imports structure)
 * @param compilerOptions Module settings, JSX import source and the representation script kind
 */
export function setCachedSourceFile(
  fileName: string,
  languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
  contentHash: string,
  sourceFile: ts.SourceFile,
  jsx?: ts.JsxEmit,
  importHelpers = false,
  compilerOptions?: ParsedSourceFileOptions,
): void {
  let fileCache = parsedSourceFileCache.get(fileName);
  if (!fileCache) {
    fileCache = new Map();
    parsedSourceFileCache.set(fileName, fileCache);
  }

  const key = parsedSourceFileCacheIdentity(
    languageVersionOrOptions,
    jsx,
    importHelpers,
    compilerOptions,
  );
  // TypeScript creates fresh module-indicator callbacks for equivalent programs. Key on
  // their compiler options, including module (which changes the default moduleDetection).
  fileCache.set(key, { contentHash, sourceFile });
}

/**
 * Invalidate parsed SourceFile AST cache for a specific file (all targets)
 * Used when file content changes
 * @param fileName Normalized file path
 */
export function invalidateParsedSourceFile(fileName: string): void {
  parsedSourceFileCache.delete(fileName);
}

/**
 * Clear the source file content cache and parsed SourceFile cache
 */
export function clearSourceFileContentCache(): void {
  clearFileRepresentationCaches();
  sourceFileContentCache.clear();
  parsedSourceFileCache.clear();
  currentFilesContext = null;
  currentFilesByPath.clear();
  sourceFilesContextVersion++;
  debug('Cleared source file content cache and parsed SourceFile cache');
}
