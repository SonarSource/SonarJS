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
import { IncrementalCompilerHost } from './compilerHost.js';
import {
  defaultCompilerOptions,
  createProgramOptionsFromParsedConfig,
  type ProgramOptions,
} from './tsconfig/options.js';
import { info } from '../../../shared/src/helpers/logging.js';
import { getProgramCacheManager } from './cache/programCache.js';
import { getSourceFileContentCache } from './cache/sourceFileCache.js';

export function createBuilderProgramWithHost(
  programOptions: ProgramOptions,
  host: ts.CompilerHost,
  oldProgram?: ts.SemanticDiagnosticsBuilderProgram,
) {
  return ts.createSemanticDiagnosticsBuilderProgram(
    programOptions.rootNames,
    programOptions.options,
    host,
    oldProgram,
  );
}
/**
 * Creates a TypeScript's SemanticDiagnosticsBuilderProgram instance
 *
 * TypeScript creates a Program instance per TSConfig file. This function creates
 * a builder program using the provided program options and an IncrementalCompilerHost
 * for lazy file loading from cache.
 *
 * @param programOptions the parsed program options from createProgramOptions()
 * @param baseDir the base directory for the compiler host
 * @param oldProgram previous program if we want incremental update
 * @returns the created TypeScript's SemanticDiagnosticsBuilderProgram along with
 *          the resolved project references and a boolean 'missingTsConfig' which is
 *          true when an extended tsconfig.json path was not found
 */
export function createBuilderProgramAndHost(
  programOptions: ProgramOptions,
  baseDir: string,
  oldProgram?: ts.SemanticDiagnosticsBuilderProgram,
) {
  const host = new IncrementalCompilerHost(programOptions.options, baseDir);

  const builderProgram = createBuilderProgramWithHost(programOptions, host, oldProgram);

  const program = builderProgram.getProgram();
  return {
    program,
    builderProgram,
    host,
  };
}

/**
 * Creates a standard TypeScript Program (not a builder program)
 * This is a centralized wrapper around ts.createProgram to ensure consistent program creation.
 *
 * Standard programs:
 * - Support reusing ASTs from oldProgram
 * - Do NOT cache diagnostics (always re-type-check all files)
 * - Do NOT track affected files
 *
 * For incremental compilation with diagnostic caching, use createSemanticDiagnosticsBuilderProgram instead.
 *
 * IMPORTANT: programOptions must come from createProgramOptions() to ensure proper processing
 * of tsconfig options (lib resolution, enum conversions, etc.). The branded ProgramOptions type
 * enforces this at compile time.
 *
 * @param programOptions - Program options from createProgramOptions()
 * @returns Standard TypeScript Program
 */
export function createStandardProgram(programOptions: ProgramOptions): ts.Program {
  return ts.createProgram(programOptions);
}

/**
 * Creates a simple TypeScript program from a single file (for quick analysis)
 * Does not use caching or incremental compilation
 *
 * Even though there's no tsconfig.json, the compiler options are still processed through
 * ts.parseJsonConfigFileContent to ensure proper sanitization (lib resolution, enum conversion, etc.)
 *
 * For project-based analysis with tsconfig, use createProgramOptions() + createStandardProgram().
 */
export function createProgramFromSingleFile(
  fileName: string,
  contents: string,
  compilerOptions: ts.CompilerOptions = defaultCompilerOptions,
) {
  const target = compilerOptions.target ?? ts.ScriptTarget.ESNext;

  // Create a virtual file system with our source code
  const sourceFile = ts.createSourceFile(fileName, contents, target, true);

  // Parse and brand through the centralized function (uses default parseConfigHost)
  const programOptions = createProgramOptionsFromParsedConfig(
    {}, // Empty config object (no tsconfig.json)
    process.cwd(),
    compilerOptions, // Use provided compiler options as base
  );

  // Override with a custom host for the single file
  const compilerHost = ts.createCompilerHost(programOptions.options);
  const programOptionsWithCustomHost: ProgramOptions = {
    ...programOptions,
    rootNames: [fileName],
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
  };

  return createStandardProgram(programOptionsWithCustomHost);
}

/**
 * Create or get a cached SemanticDiagnosticsBuilderProgram for a source file
 * Uses program cache to reuse existing programs that already contain the file
 * Files are read lazily from the global cache via IncrementalCompilerHost
 *
 * @param baseDir The base directory for resolving module paths
 * @param sourceFile The source file to create or find a program for
 * @param programOptions program options to use for the program
 */
export function createOrGetCachedProgramForFile(
  baseDir: string,
  sourceFile: string,
  programOptions: ProgramOptions,
): {
  program: ts.SemanticDiagnosticsBuilderProgram;
  host: IncrementalCompilerHost;
  fromCache: boolean;
  wasUpdated: boolean;
} {
  const cacheManager = getProgramCacheManager();
  const cache = getSourceFileContentCache();
  const fileContent = cache.get(sourceFile);

  // Try to find an existing program containing this file
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

      // Recreate program with proper options to ensure lib files are included
      const updatedProgram = createBuilderProgramWithHost(programOptions, host, cached.program);

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
      (programOptions.rootNames.length > 1
        ? ` (+ ${programOptions.rootNames.length - 1} additional root files)`
        : ''),
  );

  const { builderProgram, host } = createBuilderProgramAndHost(programOptions, baseDir);

  // Store in cache
  cacheManager.storeProgram(programOptions, builderProgram, host);

  const tsProgram = builderProgram.getProgram();
  const totalFiles = tsProgram.getSourceFiles().length;

  info(`✅ Program created: 1 root file → ${totalFiles} total files (dependencies discovered)`);

  return {
    program: builderProgram,
    host,
    fromCache: false,
    wasUpdated: false,
  };
}
