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
import { isDeepStrictEqual } from 'node:util';
import { Cache } from './tsconfigCache.js';
import { getFilenames, getFilesCount } from './files.js';
import {
  isSonarLint,
  maxFilesForTypeChecking,
} from '../../../../shared/src/helpers/configuration.js';

tmp.setGracefulCleanup();
const UNINITIALIZED_ERROR = 'TSconfig cache have not been initialized';
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

export function tsConfigsInitialized() {
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
  if (
    !isDeepStrictEqual(
      cacheMap.get(TsConfigOrigin.LOOKUP)!.originalTsConfigFiles,
      foundTsConfigPaths,
    )
  ) {
    debug(`Resetting the TsConfigCache for TSConfig files lookup`);
    cacheMap.get(TsConfigOrigin.LOOKUP)!.initializeOriginalTsConfigs(propertyTsConfigPaths);
  }
  if (
    !isDeepStrictEqual(
      cacheMap.get(TsConfigOrigin.PROPERTY)!.originalTsConfigFiles,
      propertyTsConfigPaths,
    )
  ) {
    debug(`Resetting the TsConfigCache from Sonar property`);
    cacheMap.get(TsConfigOrigin.PROPERTY)!.initializeOriginalTsConfigs(propertyTsConfigPaths);
  }
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
      const { filename } = await writeTSConfigFile(createTSConfigFile(getFilenames()));
      fallbackTsConfigs.push(filename);
    }
    cacheMap.get(TsConfigOrigin.FALLBACK)!.initializeOriginalTsConfigs(fallbackTsConfigs);
    origin = TsConfigOrigin.FALLBACK;
  }
}

export function clearTsConfigCache(filenames: string[]) {
  debug('Clearing tsconfig cache');
  cacheMap.get(TsConfigOrigin.LOOKUP)!.clearAll();
  if (
    filenames.some(tsconfig =>
      cacheMap.get(TsConfigOrigin.PROPERTY)!.discoveredTsConfigFiles.has(tsconfig),
    )
  ) {
    cacheMap.get(TsConfigOrigin.PROPERTY)!.clearAll();
  }
}

export function clearFileToTsConfigCache() {
  // The file to tsconfig cache is cleared, as potentially the tsconfig file that would cover this new file
  // has already been processed, and we would not be aware of it. By clearing the cache, we guarantee correctness.
  debug('Clearing input file to tsconfig cache');
  cacheMap.forEach(cache => cache.clearFileToTsConfigCache());
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
