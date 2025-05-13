/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
 * Any temporary file created with the `tmp` library will be removed once the Node.js process terminates.
 */
import tmp from 'tmp';
import { TsConfigJson } from 'type-fest';
import fs from 'node:fs/promises';
import { debug } from '../../../../shared/src/helpers/logging.js';
import { Cache } from './tsconfigCache.js';
import { getFilenames, getFilesCount } from './files.js';
import {
  getFsEvents,
  getTsConfigPaths,
  isJsTsFile,
  isSonarLint,
  maxFilesForTypeChecking,
  setClearDependenciesCache,
  setClearFileToTsConfigCache,
  setClearTsConfigCache,
  shouldClearFileToTsConfigCache,
  shouldClearTsConfigCache,
} from '../../../../shared/src/helpers/configuration.js';
import { basename } from 'node:path';
import { PACKAGE_JSON } from '../../rules/index.js';

tmp.setGracefulCleanup();
export const UNINITIALIZED_ERROR =
  'TSConfig cache has not been initialized. Call loadFiles() first';
export const TSCONFIG_JSON = 'tsconfig.json';

enum TsConfigOrigin {
  PROPERTY = 'property',
  LOOKUP = 'lookup',
  FALLBACK = 'fallback',
}

const cacheMap: Map<TsConfigOrigin, Cache> = new Map();

cacheMap.set(TsConfigOrigin.PROPERTY, new Cache());
cacheMap.set(TsConfigOrigin.LOOKUP, new Cache());
cacheMap.set(TsConfigOrigin.FALLBACK, new Cache());

let origin: TsConfigOrigin | undefined;

export function getCacheOrigin() {
  return origin;
}

export function getCurrentCache() {
  if (!origin) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return cacheMap.get(origin)!;
}

export function tsConfigCacheInitialized(baseDir: string) {
  dirtyCachesIfNeeded(baseDir);
  return origin !== undefined && cacheMap.get(origin)!.initialized;
}

export function getTsConfigs() {
  if (!origin) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return cacheMap.get(origin)!.originalTsConfigFiles;
}

export function getTsConfigForInputFile(inputFile: string) {
  if (!origin) {
    throw new Error(UNINITIALIZED_ERROR);
  }
  return cacheMap.get(origin)!.getTsConfigForInputFile(inputFile);
}

export async function initializeTsConfigs(
  baseDir: string,
  foundTsConfigPaths: string[],
  propertyTsConfigPaths: string[],
) {
  debug(`Resetting the TsConfigCache`);
  const cacheKeys = getCacheKeys(baseDir);
  cacheMap.get(TsConfigOrigin.LOOKUP)!.initializeOriginalTsConfigs(foundTsConfigPaths);
  cacheMap.get(TsConfigOrigin.LOOKUP)!.key = cacheKeys[TsConfigOrigin.LOOKUP];
  cacheMap.get(TsConfigOrigin.PROPERTY)!.initializeOriginalTsConfigs(propertyTsConfigPaths);
  cacheMap.get(TsConfigOrigin.PROPERTY)!.key = cacheKeys[TsConfigOrigin.PROPERTY];
  if (propertyTsConfigPaths.length) {
    origin = TsConfigOrigin.PROPERTY;
  } else if (foundTsConfigPaths.length) {
    origin = TsConfigOrigin.LOOKUP;
  } else {
    const fallbackTsConfigs = [];
    if (isSonarLint()) {
      if (getFilesCount() < maxFilesForTypeChecking()) {
        const { filename } = await writeTSConfigFile(
          createTSConfigFile(undefined, [baseDir + '/**/*']),
        );
        fallbackTsConfigs.push(filename);
      }
    } else {
      const { filename } = await writeTSConfigFile(
        createTSConfigFile(getFilenames().filter(filename => isJsTsFile(filename))),
      );
      fallbackTsConfigs.push(filename);
    }
    cacheMap.get(TsConfigOrigin.FALLBACK)!.initializeOriginalTsConfigs(fallbackTsConfigs);
    origin = TsConfigOrigin.FALLBACK;
  }
}

export function clearTsConfigCache(filenames: string[] = []) {
  debug('Clearing lookup tsconfig cache');
  cacheMap.get(TsConfigOrigin.LOOKUP)!.clearAll();
  if (
    filenames.some(tsconfig =>
      cacheMap.get(TsConfigOrigin.PROPERTY)!.discoveredTsConfigFiles.has(tsconfig),
    )
  ) {
    debug('Clearing property tsconfig cache');
    cacheMap.get(TsConfigOrigin.PROPERTY)!.clearAll();
  }
}

export function clearFileToTsConfigCache() {
  // When a new sourcecode file is created, the file to tsconfig cache is cleared, as potentially the
  // tsconfig file that would cover this new file has already been processed, and we would not be aware of it.
  // By clearing the cache, we guarantee correctness.
  debug('Clearing input file to tsconfig cache');
  cacheMap.forEach(cache => cache.clearFileToTsConfigCache());
}

export function dirtyCachesIfNeeded(baseDir: string) {
  const newCacheKeys = getCacheKeys(baseDir);
  for (const [cacheOrigin, cache] of cacheMap.entries()) {
    if (cache.initialized && cache.key !== newCacheKeys[cacheOrigin]) {
      cache.clearAll();
      origin = undefined;
    }
  }
  const changedTsConfigs: string[] = [];
  for (const fileEvent of getFsEvents()) {
    const [filename, event] = fileEvent;
    const filenameLower = basename(filename).toLowerCase();
    if (filenameLower.endsWith('.json') && filenameLower.includes('tsconfig')) {
      changedTsConfigs.push(filename);
      setClearTsConfigCache(true);
    } else if (filenameLower === PACKAGE_JSON) {
      setClearDependenciesCache(true);
    } else if (isJsTsFile(filename) && event === 'CREATED') {
      setClearFileToTsConfigCache(true);
    }
  }
  if (shouldClearTsConfigCache()) {
    clearTsConfigCache(changedTsConfigs);
  }
  if (shouldClearFileToTsConfigCache()) {
    clearFileToTsConfigCache();
  }
}

function getCacheKeys(baseDir: string) {
  return {
    [TsConfigOrigin.PROPERTY]: JSON.stringify([baseDir, getTsConfigPaths()]),
    [TsConfigOrigin.LOOKUP]: baseDir,
    [TsConfigOrigin.FALLBACK]: baseDir,
  };
}

/**
 * Create the TSConfig file and returns its path.
 *
 * The file is written in a temporary location in the file system
 * and is marked to be removed after the Node.js process terminates.
 *
 * @param tsConfig TSConfig to write
 * @returns the resolved TSConfig file path
 */
export async function writeTSConfigFile(tsConfig: TsConfigJson): Promise<{ filename: string }> {
  const filename = await new Promise<string>((resolve, reject) => {
    tmp.file({ template: 'tsconfig-XXXXXX.json' }, (err, path) => {
      if (err) reject(err);
      else resolve(path);
    });
  });
  await fs.writeFile(filename, JSON.stringify(tsConfig), 'utf-8');
  return { filename };
}

/**
 * Create and return a TSConfig object.
 *
 * @param files array of files included in the TS program
 * @param include inclusion paths of the TS Program
 * @returns the TSConfig object
 */
export function createTSConfigFile(files?: string[], include?: string[]): TsConfigJson {
  return {
    compilerOptions: {
      allowJs: true,
      noImplicitAny: true,
    },
    include,
    files,
  } as TsConfigJson;
}
