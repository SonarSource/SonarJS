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
/**
 * This file provides an API to take control over TypeScript's Program instances
 * in the context of program-based analysis for JavaScript / TypeScript.
 *
 * A TypeScript's Program instance is used by TypeScript ESLint parser
 * to make available TypeScript's type checker for rules willing to use type
 * information for the sake of precision. It works similarly as using TSConfigs
 * except it gives the control over the lifecycle of this internal data structure
 * used by the parser and improves performance.
 */

import path from 'node:path';
import ts from 'typescript';
import { error, info, warn, debug } from '../../../shared/src/helpers/logging.js';
import { toUnixPath, addTsConfigIfDirectory } from '../../../shared/src/helpers/files.js';
import { IncrementalCompilerHost } from './incrementalCompilerHost.js';
import { getProgramCacheManager } from './programCacheManager.js';

type ProgramResult = {
  projectReferences: string[];
  missingTsConfig: boolean;
  program: ts.SemanticDiagnosticsBuilderProgram;
};

export type ProgramOptions = ts.CreateProgramOptions & { missingTsConfig: boolean };

export const defaultCompilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  lib: ['esnext', 'DOM'],
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  allowSyntheticDefaultImports: true,
  allowJs: true,
  checkJs: true,
};

/**
 * Global cache for tsconfig file contents to avoid repeated disk reads
 * Persists across analysis runs (especially useful for SonarLint)
 */
const tsconfigContentCache = new Map<string, string>();

/**
 * Clear the tsconfig content cache (called when tsconfig files change)
 */
export function clearTsConfigContentCache(): void {
  tsconfigContentCache.clear();
  debug('Cleared tsconfig content cache');
}

/**
 * Global cache for source file contents
 * Lazily populated when CompilerHost needs files
 */
const sourceFileContentCache = new Map<string, string>();

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
 * Clear the source file content cache
 */
export function clearSourceFileContentCache(): void {
  sourceFileContentCache.clear();
  currentFilesContext = null;
  debug('Cleared source file content cache');
}

/**
 * Sanitize project references by resolving directories to tsconfig.json paths
 * Warns about and filters out missing references
 */
export function sanitizeProjectReferences(references: readonly ts.ProjectReference[]): string[] {
  const sanitized: string[] = [];

  for (const reference of references) {
    const sanitizedPath = addTsConfigIfDirectory(reference.path);
    if (sanitizedPath) {
      sanitized.push(sanitizedPath);
    } else {
      warn(`Skipping missing referenced tsconfig.json: ${reference.path}`);
    }
  }

  return sanitized;
}

/**
 * Create a safe ParseConfigHost that handles missing extended tsconfig files gracefully.
 * When TypeScript looks for extended configs in root node_modules and doesn't find them,
 * returns an empty configuration instead of crashing.
 *
 * @param tsConfig Optional specific tsconfig file path
 * @param tsconfigContents Optional content to use for the specific tsconfig
 * @returns ParseConfigHost and a flag indicating if any tsconfig was missing
 */
function createSafeParseConfigHost(
  tsConfig?: string,
  tsconfigContents?: string,
): { parseConfigHost: ts.ParseConfigHost; getMissingTsConfig: () => boolean } {
  let missingTsConfig = false;

  const parseConfigHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: ts.sys.readDirectory,
    fileExists: file => {
      // When TypeScript checks for the very last tsconfig.json, we will always return true,
      // If the file does not exist in FS, we will return an empty configuration
      if (isLastTsConfigCheck(file)) {
        return true;
      }
      return ts.sys.fileExists(file);
    },
    readFile: file => {
      // 1. Check if we have specific content provided for this file
      if (tsConfig && file === tsConfig && tsconfigContents) {
        return tsconfigContents;
      }

      // 2. Check cache first
      if (tsconfigContentCache.has(file)) {
        return tsconfigContentCache.get(file);
      }

      // 3. Read from disk
      const fileContents = ts.sys.readFile(file);

      // 4. Handle missing extended tsconfig (return empty config)
      if (!fileContents && isLastTsConfigCheck(file)) {
        missingTsConfig = true;
        console.log(
          `WARN Could not find tsconfig.json: ${file}; falling back to an empty configuration.`,
        );
        const emptyConfig = '{}';
        tsconfigContentCache.set(file, emptyConfig);
        return emptyConfig;
      }

      // 5. Cache the content if found
      if (fileContents) {
        tsconfigContentCache.set(file, fileContents);
      }

      return fileContents;
    },
  };

  return {
    parseConfigHost,
    getMissingTsConfig: () => missingTsConfig,
  };
}

/**
 * Gets the files resolved by a TSConfig
 *
 * The resolving of the files for a given TSConfig file is done
 * by invoking the TypeScript compiler.
 *
 * @param tsConfig TSConfig to parse
 * @param tsconfigContents TSConfig contents that we want to provide to TSConfig
 * @returns the resolved TSConfig files
 */
export function createProgramOptions(tsConfig: string, tsconfigContents?: string): ProgramOptions {
  const { parseConfigHost, getMissingTsConfig } = createSafeParseConfigHost(
    tsConfig,
    tsconfigContents,
  );
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  if (config.error) {
    error(`Failed to parse tsconfig: ${tsConfig} (${diagnosticToString(config.error)})`);
    throw new Error(diagnosticToString(config.error));
  }

  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config.config,
    parseConfigHost,
    path.resolve(path.dirname(tsConfig)),
    {
      noEmit: true,
    },
    path.resolve(tsConfig),
    undefined,
    [
      {
        extension: 'vue',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],
  );

  if (parsedConfigFile.errors.length > 0) {
    const message = parsedConfigFile.errors.map(diagnosticToString).join('; ');
    throw new Error(message);
  }

  return {
    rootNames: parsedConfigFile.fileNames,
    options: { ...parsedConfigFile.options, allowNonTsExtensions: true },
    projectReferences: parsedConfigFile.projectReferences,
    missingTsConfig: getMissingTsConfig(),
  };
}

/**
 * Creates a TypeScript's SemanticDiagnosticsBuilderProgram instance
 *
 * TypeScript creates a Program instance per TSConfig file. This function creates
 * a builder program using the provided program options and an IncrementalCompilerHost
 * for lazy file loading from cache.
 *
 * @param programOptions the parsed program options from createProgramOptions
 * @param baseDir the base directory for the compiler host
 * @returns the created TypeScript's SemanticDiagnosticsBuilderProgram along with
 *          the resolved project references and a boolean 'missingTsConfig' which is
 *          true when an extended tsconfig.json path was not found
 */
export function createProgram(programOptions: ProgramOptions, baseDir: string): ProgramResult {
  const host = new IncrementalCompilerHost(programOptions.options, baseDir);
  const builderProgram = ts.createSemanticDiagnosticsBuilderProgram(
    programOptions.rootNames,
    programOptions.options,
    host,
  );

  const tsProgram = builderProgram.getProgram();
  const inputProjectReferences = tsProgram.getProjectReferences() ?? [];
  const projectReferences = sanitizeProjectReferences(inputProjectReferences);

  return {
    projectReferences,
    missingTsConfig: programOptions.missingTsConfig,
    program: builderProgram,
  };
}

export function createProgramFromSingleFile(
  fileName: string,
  contents: string,
  compilerOptions: ts.CompilerOptions = defaultCompilerOptions,
) {
  const compilerHost = ts.createCompilerHost(compilerOptions);
  const target = compilerOptions.target ?? ts.ScriptTarget.ESNext;

  // Create a virtual file system with our source code
  const sourceFile = ts.createSourceFile(fileName, contents, target, true);

  // Create program
  return ts.createProgram({
    rootNames: [fileName],
    options: compilerOptions,
    host: {
      ...compilerHost,
      getSourceFile: (name: string) => {
        if (name === fileName) {
          return sourceFile;
        }
        return compilerHost.getSourceFile(name, target);
      },
      fileExists: (name: string) => name === fileName || ts.sys.fileExists(name),
      readFile: (name: string) => (name === fileName ? contents : ts.sys.readFile(name)),
    },
  });
}

function diagnosticToString(diagnostic: ts.Diagnostic): string {
  const text =
    typeof diagnostic.messageText === 'string'
      ? diagnostic.messageText
      : diagnostic.messageText.messageText;
  if (diagnostic.file) {
    return `${text}  ${diagnostic.file?.fileName}:${diagnostic.start}`;
  } else {
    return text;
  }
}

/**
 * Typescript resolution will always start searching by first looking for package.json files
 * starting in $TSCONFIG_PATH/package.json and on each parent until root folder.
 * 1 - $TSCONFIG_PATH/package.json
 * 2 - $TSCONFIG_PATH/../package.json
 * 3 - $TSCONFIG_PATH/../../package.json
 * ...
 * N - /package.json
 *
 * Then, Typescript resolution will always search for extended tsconfigs in these 5 paths (in order):
 *
 * 1 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/package.json
 * 2 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/../package.json
 * 3 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE
 * 4 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE.json
 * 5 - $TSCONFIG_PATH/node_modules/$EXTENDED_TSCONFIG_VALUE/tsconfig.json
 *
 * If not found in all 4, $TSCONFIG_PATH will be assigned to its parent and the same search will be performed,
 * until $TSCONFIG_PATH is the system root. Meaning, the very last search Typescript will perform is (5) when
 * TSCONFIG_PATH === '/':
 *
 * /node_modules/$EXTENDED_TSCONFIG_VALUE/tsconfig.json
 *
 * @param file
 */
function isLastTsConfigCheck(file: string) {
  return path.basename(file) === 'tsconfig.json' && isRootNodeModules(file);
}

export function isRootNodeModules(file: string) {
  const root = process.platform === 'win32' ? file.slice(0, file.indexOf(':') + 1) : '/';
  const normalizedFile = toUnixPath(file);
  const topNodeModules = toUnixPath(path.resolve(path.join(root, 'node_modules')));
  return normalizedFile.startsWith(topNodeModules);
}

/**
 * Extract compiler options from a tsconfig file without creating a program
 * Handles 'extends' field and path resolution properly
 * Uses safe parsing that handles missing extended tsconfig files gracefully
 */
export function extractCompilerOptions(tsConfig: string): {
  options: ts.CompilerOptions | null;
  missingTsConfig: boolean;
} {
  try {
    const { parseConfigHost, getMissingTsConfig } = createSafeParseConfigHost();

    const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);
    if (config.error) {
      warn(`Failed to parse tsconfig: ${tsConfig}`);
      return { options: null, missingTsConfig: getMissingTsConfig() };
    }

    const parsedConfigFile = ts.parseJsonConfigFileContent(
      config.config,
      parseConfigHost,
      path.resolve(path.dirname(tsConfig)),
      { noEmit: true },
      path.resolve(tsConfig),
    );

    return { options: parsedConfigFile.options, missingTsConfig: getMissingTsConfig() };
  } catch (e) {
    warn(`Failed to extract compiler options from ${tsConfig}: ${e}`);
    return { options: null, missingTsConfig: false };
  }
}

/**
 * Merge compiler options from all discovered tsconfig files
 * Ignores files/include/exclude fields - only extracts and merges compilerOptions
 */
export function mergeCompilerOptions(tsconfigs: string[]): {
  options: ts.CompilerOptions;
  missingTsConfig: boolean;
} {
  const allOptions: ts.CompilerOptions[] = [];
  let anyMissing = false;

  for (const tsconfig of tsconfigs) {
    const { options, missingTsConfig } = extractCompilerOptions(tsconfig);
    if (options) {
      allOptions.push(options);
    }
    if (missingTsConfig) {
      anyMissing = true;
    }
  }

  // Merge all options - later configs override earlier ones
  const merged = allOptions.reduce((acc, options) => ({ ...acc, ...options }), {
    ...defaultCompilerOptions,
  });

  return {
    options: merged,
    missingTsConfig: anyMissing,
  };
}

/**
 * Create or get a cached SemanticDiagnosticsBuilderProgram for a source file
 * Uses program cache to reuse existing programs that already contain the file
 * Files are read lazily from the global cache via IncrementalCompilerHost
 *
 * @param baseDir The base directory for resolving module paths
 * @param sourceFile The source file to create or find a program for
 * @param compilerOptions TypeScript compiler options to use
 * @param rootFiles All root files to include in the program (defaults to just sourceFile)
 */
export function createOrGetCachedProgramForFile(
  baseDir: string,
  sourceFile: string,
  compilerOptions: ts.CompilerOptions,
  rootFiles: string[] = [sourceFile],
): {
  program: ts.SemanticDiagnosticsBuilderProgram;
  host: IncrementalCompilerHost;
  fromCache: boolean;
  wasUpdated: boolean;
} {
  const cacheManager = getProgramCacheManager();
  const cache = getSourceFileContentCache();
  const fileContent = cache.get(sourceFile)!;

  // Try to find existing program containing this file
  const cached = cacheManager.findProgramForFile(sourceFile, fileContent);

  if (cached.program && cached.host) {
    const tsProgram = cached.program.getProgram();
    const totalFiles = tsProgram.getSourceFiles().length;

    if (cached.wasUpdated) {
      // File content changed, need to recreate program for incremental update
      info(
        `♻️  Cache HIT (updated): Recreating program incrementally for ${sourceFile} (${totalFiles} files)`,
      );

      const host = cached.host;

      const updatedProgram = ts.createSemanticDiagnosticsBuilderProgram(
        [sourceFile],
        compilerOptions,
        host,
        cached.program, // Old program for incremental reuse
      );

      // Update cache with new program
      if (cached.cacheKey) {
        cacheManager.updateProgramInCache(cached.cacheKey, updatedProgram);
      }

      return {
        program: updatedProgram,
        host,
        fromCache: true,
        wasUpdated: true,
      };
    } else {
      info(`♻️  Cache HIT: Reusing program for ${sourceFile} (${totalFiles} files, no changes)`);

      return {
        program: cached.program,
        host: cached.host,
        fromCache: true,
        wasUpdated: false,
      };
    }
  }

  info(
    `⚙️  Cache MISS: Creating new program for ${sourceFile}` +
      (rootFiles.length > 1 ? ` (+ ${rootFiles.length - 1} additional root files)` : ''),
  );

  // Host will read files lazily from global cache
  const host = new IncrementalCompilerHost(compilerOptions, baseDir);

  const program = ts.createSemanticDiagnosticsBuilderProgram(
    rootFiles, // TypeScript will discover dependencies lazily
    compilerOptions,
    host,
  );

  // Store in cache
  cacheManager.storeProgram(rootFiles, program, host, compilerOptions);

  const tsProgram = program.getProgram();
  const totalFiles = tsProgram.getSourceFiles().length;

  info(`✅ Program created: 1 root file → ${totalFiles} total files (dependencies discovered)`);

  return {
    program,
    host,
    fromCache: false,
    wasUpdated: false,
  };
}
