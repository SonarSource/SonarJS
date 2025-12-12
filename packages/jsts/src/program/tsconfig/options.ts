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
import { basename, dirname } from 'node:path/posix';
import { getTsConfigContentCache } from '../cache/tsconfigCache.js';
import { isLastTsConfigCheck } from './utils.js';
import { getCachedProgramOptions, setCachedProgramOptions } from '../cache/programOptionsCache.js';
import { canAccessFileSystem } from '../../../../shared/src/helpers/configuration.js';
import { sourceFileStore } from '../../analysis/projectAnalysis/file-stores/index.js';

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
 * Default ParseConfigHost that uses TypeScript's file system APIs directly.
 * No caching or special handling - suitable for simple single-file analysis.
 */
const defaultParseConfigHost: CustomParseConfigHost = {
  useCaseSensitiveFileNames: true,
  readDirectory(
    rootDir: string,
    extensions: readonly string[],
    excludes: readonly string[] | undefined,
    includes: readonly string[],
    depth?: number,
  ): readonly string[] {
    if (canAccessFileSystem()) {
      return ts.sys.readDirectory(rootDir, extensions, excludes, includes, depth);
    } else {
      return sourceFileStore
        .getFoundFilenames()
        .filter(f => {
          return dirname(f) === rootDir && extensions.some(ext => f.endsWith(ext));
        })
        .map(f => basename(f));
    }
  },
  fileExists(path: string): boolean {
    if (canAccessFileSystem()) {
      return ts.sys.fileExists(path);
    } else {
      return sourceFileStore.getFoundFilenames().includes(path);
    }
  },
  readFile(path: string): string | undefined {
    if (canAccessFileSystem()) {
      return ts.sys.readFile(path);
    } else {
      return sourceFileStore.getFoundFiles()[path]?.fileContent;
    }
  },
  missingTsConfig: () => false,
};

export function createProgramOptionsFromJson(
  json: any,
  rootNames: string[],
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
 * @returns the resolved TSConfig files
 */
export function createProgramOptions(tsConfig: string, tsconfigContents?: string): ProgramOptions {
  // Check cache first
  const cached = getCachedProgramOptions(`${tsConfig}:${tsconfigContents}`);
  if (cached) {
    return cached;
  }

  let missingTsConfig = false;
  const tsconfigContentCache = getTsConfigContentCache();

  // Set up parseConfigHost with tsconfig-specific logic (caching, missing file handling)
  const parseConfigHost: CustomParseConfigHost = {
    useCaseSensitiveFileNames: true,
    readDirectory: defaultParseConfigHost.readDirectory,
    fileExists: file => {
      // When TypeScript checks for the very last tsconfig.json, we will always return true,
      // If the file does not exist in FS, we will return an empty configuration
      if (tsconfigContentCache.has(file) || isLastTsConfigCheck(file)) {
        return true;
      }
      return defaultParseConfigHost.fileExists(file);
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
      const fileContents = defaultParseConfigHost.readFile(file);

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

  setCachedProgramOptions(`${tsConfig}:${tsconfigContents}`, result);

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
