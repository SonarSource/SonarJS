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
import { fileContentStore } from '../../../common/file-content-store.js';
import { SourceFilesContext } from '../../../common/source-files-context.js';
import { debug } from '../../../../../shared/src/helpers/logging.js';
import type ts from 'typescript';

type ParsedSourceFiles = Map<string, { contentHash: string; sourceFile: ts.SourceFile }>;
/**
 * Parsed TypeScript SourceFile ASTs owned by each shared file-content entry
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
const parsedSourcesKey = Symbol('parsed source files');

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

let currentContext: SourceFilesContext | undefined;
let sourceFilesContextVersion = 0;

/** Reuse the source store's index in production; standalone callers can supply a record. */
export function setSourceFilesContext(
  files: SourceFilesContext | Record<string, { fileContent?: string }>,
): void {
  if (files instanceof SourceFilesContext) {
    currentContext = files;
  } else {
    currentContext = new SourceFilesContext();
    currentContext.setFiles(files);
  }
  sourceFilesContextVersion++;
}

export function hasProvidedSourceDirectory(directory: string): boolean {
  return currentContext?.hasDirectory(directory) ?? false;
}

export function getSourceFilesContextVersion(): number {
  return sourceFilesContextVersion;
}

export function getSourceFileContentCache(): typeof fileContentStore {
  return fileContentStore;
}

export function getCurrentFilesContext(): Record<string, { fileContent?: string }> | null {
  return currentContext?.files ?? null;
}

export function getProvidedSourceFile(file: string): { fileContent?: string } | undefined {
  return currentContext?.getFile(file);
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
  const fileCache = fileContentStore.getData<ParsedSourceFiles>(fileName, parsedSourcesKey);
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
  let fileCache = fileContentStore.getData<ParsedSourceFiles>(fileName, parsedSourcesKey);
  if (!fileCache) {
    fileCache = new Map();
    fileContentStore.setData(fileName, parsedSourcesKey, fileCache);
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
  fileContentStore.deleteData(fileName, parsedSourcesKey);
}

/**
 * Clear the source file content cache and parsed SourceFile cache
 */
export function clearSourceFileContentCache(): void {
  fileContentStore.clear();
  currentContext = undefined;
  sourceFilesContextVersion++;
  debug('Cleared source file content cache and parsed SourceFile cache');
}
