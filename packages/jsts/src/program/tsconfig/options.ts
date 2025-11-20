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
import { error } from '../../../../shared/src/helpers/logging.js';
import { dirname } from 'node:path/posix';
import { getTsConfigContentCache } from '../cache/tsconfigCache.js';
import { isLastTsConfigCheck } from './utils.js';

/**
 * Unique symbol to brand ProgramOptions, ensuring they can only be created
 * by createProgramOptions() and not manually constructed.
 */
const PROGRAM_OPTIONS_BRAND: unique symbol = Symbol('ProgramOptions');

/**
 * Program options that must be created via createProgramOptions().
 * The brand ensures compile-time type safety, preventing raw compiler options
 * from being used where properly processed ProgramOptions are required.
 */
export type ProgramOptions = ts.CreateProgramOptions & {
  missingTsConfig: boolean;
  [PROGRAM_OPTIONS_BRAND]: true;
};

type CustomParseConfigHost = {
  missingTsConfig: () => boolean;
} & ts.ParseConfigHost;

/**
 * Default compiler options used when tsconfig doesn't specify them.
 * Note: We don't set 'lib' here - TypeScript will automatically infer
 * the correct lib files based on 'target'. Explicitly setting 'lib' breaks
 * TypeScript's internal lib file resolution mechanism.
 */
export const defaultCompilerOptions: ts.CompilerOptions = {
  allowJs: true,
  noImplicitAny: true,
  lib: ['esnext', 'dom'],
};

/**
 * Default ParseConfigHost that uses TypeScript's file system APIs directly.
 * No caching or special handling - suitable for simple single-file analysis.
 */
const defaultParseConfigHost: CustomParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory: ts.sys.readDirectory,
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  missingTsConfig: () => false,
};

/**
 * Parses and sanitizes compiler options using TypeScript's parseJsonConfigFileContent.
 * This is the ONLY function that should brand ProgramOptions, as it ensures all
 * compiler options are properly processed (lib resolution, enum conversion, etc.).
 *
 * @param config Raw config object (from tsconfig.json or empty object for single-file analysis)
 * @param basePath Base path for resolving relative paths
 * @param existingOptions Existing compiler options to use as base/override
 * @param configFileName Optional config file name (for error messages)
 * @param extraFileExtensions Optional extra file extensions (e.g., .vue)
 * @param parseConfigHost Optional custom ParseConfigHost (uses default if not provided)
 * @returns Branded ProgramOptions ready for program creation
 */
export function createProgramOptionsFromParsedConfig(
  config: any,
  basePath: string,
  existingOptions: ts.CompilerOptions = {},
  configFileName?: string,
  extraFileExtensions?: readonly ts.FileExtensionInfo[],
  parseConfigHost: CustomParseConfigHost = defaultParseConfigHost,
): ProgramOptions {
  // Call TypeScript's parser to sanitize all options
  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config,
    parseConfigHost,
    basePath,
    existingOptions,
    configFileName,
    undefined,
    extraFileExtensions,
  );

  // Filter diagnostics by severity
  const errors = parsedConfigFile.errors.filter(d => d.category === ts.DiagnosticCategory.Error);

  // Throw on fatal errors, but preserve warnings/messages for the program to report
  if (errors.length > 0) {
    const message = errors.map(diagnosticToString).join('; ');
    throw new Error(message);
  }

  return {
    rootNames: parsedConfigFile.fileNames,
    options: { ...parsedConfigFile.options, allowNonTsExtensions: true },
    projectReferences: parsedConfigFile.projectReferences,
    configFileParsingDiagnostics: parsedConfigFile.errors, // Include all diagnostics (errors + warnings)
    missingTsConfig: parseConfigHost.missingTsConfig(),
    [PROGRAM_OPTIONS_BRAND]: true,
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
  let missingTsConfig = false;
  const tsconfigContentCache = getTsConfigContentCache();

  // Set up parseConfigHost with tsconfig-specific logic (caching, missing file handling)
  const parseConfigHost: CustomParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: ts.sys.readDirectory,
    fileExists: file => {
      // When TypeScript checks for the very last tsconfig.json, we will always return true,
      // If the file does not exist in FS, we will return an empty configuration
      if (tsconfigContentCache.has(file) || isLastTsConfigCheck(file)) {
        return true;
      }
      return ts.sys.fileExists(file);
    },
    readFile: file => {
      // 1. Check if we have specific content provided for this file
      if (tsConfig && file === tsConfig && typeof tsconfigContents === 'string') {
        return tsconfigContents;
      }

      // 2. Check cache first
      if (tsconfigContentCache.has(file)) {
        const cachedTsConfig = tsconfigContentCache.get(file)!;
        missingTsConfig = cachedTsConfig.missing;
        return cachedTsConfig.contents;
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
        tsconfigContentCache.set(file, { contents: emptyConfig, missing: true });
        return emptyConfig;
      }

      // 5. Cache the content if found
      if (fileContents) {
        tsconfigContentCache.set(file, { contents: fileContents, missing: false });
      }

      return fileContents;
    },
    missingTsConfig: () => missingTsConfig,
  };

  // Read the tsconfig file
  const config = ts.readConfigFile(tsConfig, parseConfigHost.readFile);

  if (config.error) {
    error(`Failed to parse tsconfig: ${tsConfig} (${diagnosticToString(config.error)})`);
    throw new Error(diagnosticToString(config.error));
  }

  // Parse and brand through the centralized function
  return createProgramOptionsFromParsedConfig(
    config.config,
    dirname(tsConfig),
    {
      noEmit: true, // Override: we're analyzing, not emitting
    },
    tsConfig,
    [
      {
        extension: 'vue',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],
    parseConfigHost, // Custom host with caching and missing file handling
  );
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
    const { options, missingTsConfig } = createProgramOptions(tsconfig);
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
