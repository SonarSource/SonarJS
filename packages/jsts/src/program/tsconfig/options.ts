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
import { error, warn } from '../../../../shared/src/helpers/logging.js';
import { dirname } from 'node:path/posix';
import { getTsConfigContentCache } from '../cache/tsconfigCache.js';
import { isLastTsConfigCheck } from './utils.js';
import { getCachedProgramOptions, setCachedProgramOptions } from '../cache/programOptionsCache.js';
import { sourceFileStore } from '../../analysis/projectAnalysis/file-stores/index.js';
import { normalizeToAbsolutePath, type NormalizedAbsolutePath } from '../../rules/helpers/index.js';

/**
 * Unique symbol to brand ProgramOptions, ensuring they can only be created
 * by createProgramOptions() and not manually constructed.
 */
const PROGRAM_OPTIONS_BRAND: unique symbol = Symbol('ProgramOptions');

export const MISSING_EXTENDED_TSCONFIG =
  "At least one referenced/extended tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.";

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
 * Node.js major version to ES year mapping (descending order for lookup).
 */
const NODE_TO_ES: [number, number][] = [
  [22, 2024],
  [20, 2023],
  [18, 2022],
  [16, 2021],
  [14, 2020],
  [12, 2019],
  [10, 2018],
  [8, 2017],
];

/**
 * Parses a version string and returns the highest Node.js major version found.
 * Handles ranges like ">=16 || >=18", "^18.0.0", "14.x", etc.
 * Exported for testing purposes.
 *
 * @param versionStr version string to parse
 * @returns highest major version number >= 8 and < 100, or null if none found
 */
export function parseMaxNodeMajor(versionStr: string): number | null {
  if (!versionStr || versionStr === '*' || versionStr === 'latest') {
    return null;
  }
  const nums = [...versionStr.matchAll(/(\d+)(?:\.\d+)*/g)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n >= 8 && n < 100);
  if (!nums.length) {
    return null;
  }
  return Math.max(...nums);
}

/**
 * Maps a Node.js major version to the corresponding ES year.
 *
 * @param major Node.js major version number
 * @returns ES year supported by that Node.js version
 */
export function nodeVersionToEs(major: number): number {
  for (const [nodeMajor, esYear] of NODE_TO_ES) {
    if (major >= nodeMajor) {
      return esYear;
    }
  }
  return 2017; // fallback for very old Node versions
}

/**
 * Converts an ES year to normalized TypeScript lib file names.
 *
 * @param year ES year (e.g., 2022)
 * @returns array of normalized lib file names for TypeScript compiler options
 */
export function esYearToLib(year: number): string[] {
  return [`lib.es${year}.d.ts`, 'lib.dom.d.ts'];
}

function esYearFromEsPrefix(ecmaScriptVersion: string): number | null {
  const match = ecmaScriptVersion.match(/^ES(\d{4})$/i);
  if (!match) {
    return null;
  }
  const year = parseInt(match[1], 10);
  return year >= 2015 && year <= 2030 ? year : null;
}

/**
 * Detects the appropriate TypeScript lib files from available signals.
 * Priority: ecmaScriptVersion override > @types/node / engines.node version signal.
 *
 * @param ecmaScriptVersion explicit ES version override (e.g., 'ES2022')
 * @param nodeVersionSignal raw version string from @types/node or engines.node
 * @returns normalized lib file names or null if no signal available
 */
export function detectLibFromSignals(
  ecmaScriptVersion: string | undefined,
  nodeVersionSignal: string | null,
): string[] | null {
  if (ecmaScriptVersion) {
    const year = esYearFromEsPrefix(ecmaScriptVersion);
    if (year) {
      return esYearToLib(year);
    }
  }
  if (nodeVersionSignal) {
    const major = parseMaxNodeMajor(nodeVersionSignal);
    if (major !== null) {
      return esYearToLib(nodeVersionToEs(major));
    }
  }
  return null;
}

/**
 * Creates a ParseConfigHost that uses either TypeScript's file system APIs
 * or the sourceFileStore based on the canAccessFileSystem parameter.
 *
 * @param canAccessFileSystem - Whether file system access is available
 * @returns A CustomParseConfigHost configured for the appropriate access mode
 */
function createBaseParseConfigHost(canAccessFileSystem: boolean): CustomParseConfigHost {
  return {
    useCaseSensitiveFileNames: true,
    readDirectory(
      rootDir: string,
      extensions: readonly string[],
      excludes: readonly string[] | undefined,
      includes: readonly string[],
      depth?: number,
    ): readonly string[] {
      if (canAccessFileSystem) {
        return ts.sys.readDirectory(rootDir, extensions, excludes, includes, depth);
      } else {
        const normalizedDir = normalizeToAbsolutePath(rootDir);
        const entries = sourceFileStore.getFilesInDirectory(normalizedDir) ?? [];
        return [...entries].filter(f => extensions.some(ext => f.endsWith(ext)));
      }
    },
    fileExists(path: string): boolean {
      if (canAccessFileSystem) {
        return ts.sys.fileExists(path);
      } else {
        const normalizedPath = normalizeToAbsolutePath(path);
        return normalizedPath in sourceFileStore.getFiles();
      }
    },
    readFile(path: string): string | undefined {
      if (canAccessFileSystem) {
        return ts.sys.readFile(path);
      } else {
        const normalizedPath = normalizeToAbsolutePath(path);
        return sourceFileStore.getFiles()[normalizedPath]?.fileContent;
      }
    },
    missingTsConfig: () => false,
  };
}

export function createProgramOptionsFromJson(
  json: any,
  rootNames: NormalizedAbsolutePath[],
  baseDir: string,
): ProgramOptions {
  return {
    ...ts.convertCompilerOptionsFromJson(json, baseDir),
    rootNames,
    missingTsConfig: false,
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
 * @param canAccessFileSystem Whether file system access is available.
 *        Callers should pass the result of canAccessFileSystem() from shared/src/helpers/configuration.js
 * @returns the resolved TSConfig files
 */
export function createProgramOptions(
  tsConfig: string,
  tsconfigContents: string | undefined,
  canAccessFileSystem: boolean,
): ProgramOptions {
  // Check cache first
  const cached = getCachedProgramOptions(tsConfig, tsconfigContents);
  if (cached) {
    return cached;
  }

  let missingTsConfig = false;
  const tsconfigContentCache = getTsConfigContentCache();
  const baseParseConfigHost = createBaseParseConfigHost(canAccessFileSystem);

  // Set up parseConfigHost with tsconfig-specific logic (caching, missing file handling)
  const parseConfigHost: CustomParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: baseParseConfigHost.readDirectory,
    fileExists: file => {
      // When TypeScript checks for the very last tsconfig.json, we will always return true,
      // If the file does not exist in FS, we will return an empty configuration
      if (tsconfigContentCache.has(file) || isLastTsConfigCheck(file)) {
        return true;
      }
      return baseParseConfigHost.fileExists(file);
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

      // 3. Read from filesystem or sourceFileStore (depending on canAccessFileSystem)
      const fileContents = baseParseConfigHost.readFile(file);

      // 4. Handle missing extended tsconfig (return empty config)
      if (!fileContents && isLastTsConfigCheck(file)) {
        missingTsConfig = true;
        warn(`Could not find tsconfig.json: ${file}; falling back to an empty configuration.`);
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

  const parsedConfigFile = ts.parseJsonConfigFileContent(
    config.config,
    parseConfigHost,
    dirname(tsConfig),
    {
      noEmit: true,
      allowNonTsExtensions: true,
    },
    tsConfig,
    undefined,
    [
      {
        extension: 'vue',
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
      },
    ],
  );

  // Filter diagnostics by severity
  const errors = parsedConfigFile.errors.filter(d => d.category === ts.DiagnosticCategory.Error);

  // Throw on fatal errors but preserve warnings/messages for the program to report
  if (errors.length > 0) {
    const message = errors.map(diagnosticToString).join('; ');
    throw new Error(message);
  }

  const result = {
    rootNames: parsedConfigFile.fileNames,
    options: parsedConfigFile.options,
    projectReferences: parsedConfigFile.projectReferences,
    configFileParsingDiagnostics: parsedConfigFile.errors, // Include all diagnostics (errors and warnings)
    missingTsConfig: parseConfigHost.missingTsConfig(),
    [PROGRAM_OPTIONS_BRAND]: true,
  } as const;

  setCachedProgramOptions(tsConfig, result, tsconfigContents);

  return result;
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
