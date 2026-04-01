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
import { debug } from '../../../../../shared/src/helpers/logging.js';
import type ts from 'typescript';

/**
 * Global cache for source file contents
 * Lazily populated when CompilerHost needs files
 */
const sourceFileContentCache = new Map<string, string>();

/**
 * Global cache for parsed TypeScript SourceFile ASTs
 *
 * This cache stores parsed ASTs keyed by (fileName, scriptTarget, jsx, importHelpers).
 * The contentHash is stored as a value to validate cache freshness.
 * Multiple programs can share the same parsed AST if they have the same options.
 *
 * IMPLEMENTATION NOTE: We key on scriptTarget, jsx, and importHelpers because all
 * three affect the structure of SourceFile.imports (the synthesized JSX runtime import
 * prepended by TypeScript when jsx=react-jsx, and tslib helpers when importHelpers=true).
 * Sharing a SourceFile between programs with different values for these options causes
 * internal TypeScript assertion failures (e.g. in getSuggestionDiagnostics).
 */
const parsedSourceFileCache = new Map<
  string, // normalized file path
  Map<string, { contentHash: string; sourceFile: ts.SourceFile }> // compound key → entry
>();

/**
 * Build a compound cache key from the options that affect SourceFile.imports structure.
 */
function makeParsedSourceFileCacheKey(
  scriptTarget: ts.ScriptTarget,
  jsx: ts.JsxEmit | undefined,
  importHelpers = false,
): string {
  return `${scriptTarget}:${jsx ?? -1}:${importHelpers ? 1 : 0}`;
}

/**
 * Current files context for lazy loading
 */
let currentFilesContext: Record<string, { fileContent?: string }> | null = null;

/**
 * Set the current files context for lazy loading
 */
export function setSourceFilesContext(files: Record<string, { fileContent?: string }>): void {
  currentFilesContext = files;
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

/**
 * Get a cached parsed SourceFile for a given file and compiler options
 * @param fileName Normalized file path
 * @param scriptTarget TypeScript ScriptTarget (e.g., ES5, ES2020, ESNext)
 * @param contentHash Hash/version of the file content
 * @param jsx The jsx compiler option (affects SourceFile.imports structure)
 * @param importHelpers The importHelpers compiler option (affects SourceFile.imports structure)
 * @returns Cached SourceFile if available and content matches, undefined otherwise
 */
export function getCachedSourceFile(
  fileName: string,
  scriptTarget: ts.ScriptTarget,
  contentHash: string,
  jsx?: ts.JsxEmit,
  importHelpers = false,
): ts.SourceFile | undefined {
  const fileCache = parsedSourceFileCache.get(fileName);
  if (!fileCache) {
    return undefined;
  }

  const key = makeParsedSourceFileCacheKey(scriptTarget, jsx, importHelpers);
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
 * @param scriptTarget TypeScript ScriptTarget used to parse the file
 * @param contentHash Hash/version of the file content
 * @param sourceFile The parsed TypeScript SourceFile
 * @param jsx The jsx compiler option (affects SourceFile.imports structure)
 * @param importHelpers The importHelpers compiler option (affects SourceFile.imports structure)
 */
export function setCachedSourceFile(
  fileName: string,
  scriptTarget: ts.ScriptTarget,
  contentHash: string,
  sourceFile: ts.SourceFile,
  jsx?: ts.JsxEmit,
  importHelpers = false,
): void {
  let fileCache = parsedSourceFileCache.get(fileName);
  if (!fileCache) {
    fileCache = new Map();
    parsedSourceFileCache.set(fileName, fileCache);
  }

  const key = makeParsedSourceFileCacheKey(scriptTarget, jsx, importHelpers);
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
  sourceFileContentCache.clear();
  parsedSourceFileCache.clear();
  currentFilesContext = null;
  debug('Cleared source file content cache and parsed SourceFile cache');
}
