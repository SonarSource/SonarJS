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
import { debug } from '../../../../shared/src/helpers/logging.js';
import ts from 'typescript';

/**
 * Global cache for source file contents
 * Lazily populated when CompilerHost needs files
 */
const sourceFileContentCache = new Map<string, string>();

/**
 * Global cache for parsed TypeScript SourceFile ASTs
 *
 * This cache stores parsed ASTs keyed by (fileName, scriptTarget, contentHash).
 * Multiple programs can share the same parsed AST if they have the same target.
 *
 * IMPLEMENTATION NOTE: We cache SourceFiles per ScriptTarget to preserve the
 * languageVersion metadata stored in the SourceFile object. While our testing shows
 * that the AST structure is identical across targets and type checking uses the
 * program's target (not the SourceFile's languageVersion), we keep target-specific
 * caching for these reasons:
 *
 * 1. Performance gain of target-agnostic caching may be marginal since most analysis
 *    runs use the same target configuration
 * 2. Preserves metadata integrity - SourceFile.languageVersion matches the intended target
 * 3. Future-proofing - allows filtering rules based on configured target if needed
 * 4. TypeScript API contract - creating SourceFiles with their intended target is the
 *    documented usage pattern
 *
 * If profiling shows that different targets are commonly used and parsing becomes a
 * bottleneck, we could simplify to target-agnostic caching (always use ESNext) with
 * minimal impact on functionality.
 */
const parsedSourceFileCache = new Map<
  string, // normalized file path
  Map<ts.ScriptTarget, { contentHash: string; sourceFile: ts.SourceFile }>
>();

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
 * Get a cached parsed SourceFile for a given file and target
 * @param fileName Normalized file path
 * @param scriptTarget TypeScript ScriptTarget (e.g., ES5, ES2020, ESNext)
 * @param contentHash Hash/version of the file content
 * @returns Cached SourceFile if available and content matches, undefined otherwise
 */
export function getCachedSourceFile(
  fileName: string,
  scriptTarget: ts.ScriptTarget,
  contentHash: string,
): ts.SourceFile | undefined {
  const targetCache = parsedSourceFileCache.get(fileName);
  if (!targetCache) {
    return undefined;
  }

  const cached = targetCache.get(scriptTarget);
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
 */
export function setCachedSourceFile(
  fileName: string,
  scriptTarget: ts.ScriptTarget,
  contentHash: string,
  sourceFile: ts.SourceFile,
): void {
  let targetCache = parsedSourceFileCache.get(fileName);
  if (!targetCache) {
    targetCache = new Map();
    parsedSourceFileCache.set(fileName, targetCache);
  }

  targetCache.set(scriptTarget, { contentHash, sourceFile });
}

/**
 * Invalidate cached SourceFile for a specific file (all targets)
 * Used when file content changes
 * @param fileName Normalized file path
 */
export function invalidateCachedSourceFile(fileName: string): void {
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
