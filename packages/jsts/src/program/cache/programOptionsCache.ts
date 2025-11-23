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
import type { ProgramOptions } from '../tsconfig/options.js';
import ts from 'typescript';

/**
 * Cache for createProgramOptions() results
 * Key: tsConfig path + hash of tsconfigContents (if provided)
 */
const programOptionsCache = new Map<string, ProgramOptions>();

/**
 * Cache for createProgramOptionsFromParsedConfig() results
 * Key: hash of all parameters (config, basePath, existingOptions, configFileName)
 */
const parsedConfigCache = new Map<string, ProgramOptions>();

/**
 * Create cache key for createProgramOptions()
 * Most calls don't provide tsconfigContents, so we can just use the path.
 */
export function createProgramOptionsCacheKey(tsConfig: string, tsconfigContents?: string): string {
  // Common case: no custom contents, just use the path
  if (tsconfigContents === undefined) {
    return tsConfig;
  }
  // Rare case: custom contents provided, hash only the contents
  return `${tsConfig}:${fastHash(tsconfigContents)}`;
}

/**
 * Create cache key for createProgramOptionsFromParsedConfig()
 * Uses configFileName + basePath as primary key, with a simple hash for options.
 * This is much faster than JSON.stringify on large objects.
 */
export function createParsedConfigCacheKey(
  config: any,
  basePath: string,
  existingOptions: ts.CompilerOptions,
  configFileName?: string,
  extraFileExtensions?: readonly ts.FileExtensionInfo[],
): string {
  // If we have a configFileName, use it as the primary key
  // Most of the time, same configFileName = same result
  if (configFileName) {
    // Create a simple hash of just the important option keys
    const optionsKey = getCompilerOptionsKey(existingOptions);
    const extKey = extraFileExtensions?.length ? extraFileExtensions.length.toString() : '';
    return `${configFileName}:${basePath}:${optionsKey}:${extKey}`;
  }

  // Fallback: No configFileName, create a composite key from important values
  // This is rare (usually called from createProgramOptions which provides configFileName)
  const configKey = getConfigKey(config);
  const optionsKey = getCompilerOptionsKey(existingOptions);
  const extKey = extraFileExtensions?.length ? extraFileExtensions.length.toString() : '';
  return `${basePath}:${configKey}:${optionsKey}:${extKey}`;
}

/**
 * Fast hash function - FNV-1a (faster than DJB2 for short strings)
 */
function fastHash(str: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return (hash >>> 0).toString(36);
}

/**
 * Extract key information from compiler options without JSON.stringify
 * Only looks at the options that actually affect parsing results
 */
function getCompilerOptionsKey(options: ts.CompilerOptions): string {
  // Only include options that affect file resolution and parsing
  const parts: string[] = [
    String(options.target ?? ''),
    String(options.module ?? ''),
    String(options.moduleResolution ?? ''),
    options.allowJs ? '1' : '0',
    options.checkJs ? '1' : '0',
    options.jsx ? String(options.jsx) : '',
    options.resolveJsonModule ? '1' : '0',
    options.noEmit ? '1' : '0',
  ];
  return parts.join(',');
}

/**
 * Extract key information from config object
 * Avoids JSON.stringify on the entire object
 */
function getConfigKey(config: any): string {
  if (!config || typeof config !== 'object') {
    return '';
  }
  // Just use a few key properties that are likely to differ
  const co = config.compilerOptions || {};
  return `${co.target || ''},${co.module || ''},${co.allowJs || ''}`;
}

/**
 * Get cached ProgramOptions from createProgramOptions()
 */
export function getCachedProgramOptions(cacheKey: string): ProgramOptions | undefined {
  return programOptionsCache.get(cacheKey);
}

/**
 * Store ProgramOptions in cache for createProgramOptions()
 */
export function setCachedProgramOptions(cacheKey: string, options: ProgramOptions): void {
  programOptionsCache.set(cacheKey, options);
}

/**
 * Get cached ProgramOptions from createProgramOptionsFromParsedConfig()
 */
export function getCachedParsedConfig(cacheKey: string): ProgramOptions | undefined {
  return parsedConfigCache.get(cacheKey);
}

/**
 * Store ProgramOptions in cache for createProgramOptionsFromParsedConfig()
 */
export function setCachedParsedConfig(cacheKey: string, options: ProgramOptions): void {
  parsedConfigCache.set(cacheKey, options);
}

/**
 * Clear both program options caches
 */
export function clearProgramOptionsCache(): void {
  programOptionsCache.clear();
  parsedConfigCache.clear();
  debug('Cleared program options caches');
}

/**
 * Get cache statistics
 */
export function getProgramOptionsCacheStats() {
  return {
    programOptionsCache: {
      size: programOptionsCache.size,
    },
    parsedConfigCache: {
      size: parsedConfigCache.size,
    },
  };
}
