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
  createProgramOptionsFromJson,
  type ProgramOptions,
} from './tsconfig/options.js';
import { info } from '../../../shared/src/helpers/logging.js';
import { getProgramCacheManager } from './cache/programCache.js';
import { getCurrentFilesContext } from './cache/sourceFileCache.js';

function createBuilderProgramWithHost(
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
function createBuilderProgramAndHost(
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
  const programOptions = createProgramOptionsFromJson(compilerOptions, [fileName], process.cwd());

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
 * @param getProgramOptions Getter for program options to use for the program
 */
export function createOrGetCachedProgramForFile(
  baseDir: string,
  sourceFile: string,
  getProgramOptions: () => ProgramOptions | undefined,
) {
  const cacheManager = getProgramCacheManager();
  const fileContent = getCurrentFilesContext()?.[sourceFile]?.fileContent;

  // Try to find an existing program containing this file
  const cachedProgram = cacheManager.findProgramForFile(sourceFile);

  if (cachedProgram) {
    const { program, host, cacheKey } = cachedProgram;
    const tsProgram = program.getProgram();
    const totalFiles = tsProgram.getSourceFiles().length;

    // Found a match! Update host if file content changed
    // The host's updateFile() method compares content and returns whether it changed
    const wasUpdated = host.updateFile(sourceFile, fileContent);

    if (wasUpdated) {
      info(
        `Cache HIT: Recreating program with changes from ${sourceFile} (${totalFiles} files, no changes)`,
      );
      const programOptions = getProgramOptions();
      if (!programOptions) {
        return undefined;
      }
      // Recreate program with proper options to ensure lib files are included
      const updatedProgram = createBuilderProgramWithHost(programOptions, host, program);

      // Update cache with new program
      cacheManager.updateProgramInCache(cacheKey, updatedProgram);

      return updatedProgram.getProgram();
    } else {
      info(`Cache HIT: Reusing program for ${sourceFile} (${totalFiles} files, no changes)`);
      return program.getProgram();
    }
  }

  const programOptions = getProgramOptions();
  if (!programOptions) {
    return undefined;
  }
  info(
    `Cache MISS: Creating new program for ${sourceFile}` +
      (programOptions.rootNames.length > 1
        ? ` (+ ${programOptions.rootNames.length - 1} additional root files)`
        : ''),
  );

  const { builderProgram, host } = createBuilderProgramAndHost(programOptions, baseDir);

  // Store in cache
  cacheManager.storeProgram(programOptions, builderProgram, host);

  return builderProgram.getProgram();
}
