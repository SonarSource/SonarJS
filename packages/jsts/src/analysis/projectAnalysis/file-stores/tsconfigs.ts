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
import { TsConfigJson } from 'type-fest';
import { writeFile } from 'node:fs/promises';
import { debug, error, info } from '../../../../../shared/src/helpers/logging.js';
import { Cache } from '../tsconfigCache.js';
import {
  getFsEvents,
  getTsConfigPaths,
  isJsTsFile,
  isSonarLint,
  maxFilesForTypeChecking,
  noFs,
  setClearFileToTsConfigCache,
  setClearTsConfigCache,
  shouldClearFileToTsConfigCache,
  shouldClearTsConfigCache,
} from '../../../../../shared/src/helpers/configuration.js';
import { basename, normalize } from 'node:path/posix';
import { Minimatch } from 'minimatch';
import type { Dirent } from 'node:fs';
import { FileStore } from './store-type.js';
import { SourceFileStore } from './source-files.js';
/**
 * Any temporary file created with the `tmp` library will be removed once the Node.js process terminates.
 */
import tmp from 'tmp';

tmp.setGracefulCleanup();

export const UNINITIALIZED_ERROR =
  'TSConfig cache has not been initialized. Call loadFiles() first.';
const TSCONFIG_JSON = 'tsconfig.json';

type ProvidedTsConfig = {
  path: string;
  pattern: Minimatch;
};
type TsConfigOrigin = 'property' | 'lookup' | 'fallback';

export class TsConfigStore implements FileStore {
  // tsconfig.json files in the project tree
  private foundLookupTsConfigs: string[] = [];
  // tsconfig.json files specified in sonar.typescript.tsconfigPaths
  private foundPropertyTsConfigs: string[] = [];
  private providedPropertyTsConfigs: ProvidedTsConfig[] | undefined = undefined;
  private origin: TsConfigOrigin | undefined = undefined;
  private readonly cacheMap: { [type in TsConfigOrigin]: Cache } = {
    property: new Cache(),
    lookup: new Cache(),
    fallback: new Cache(),
  };

  constructor(private readonly filesStore: SourceFileStore) {}

  getCacheOrigin() {
    return this.origin;
  }

  getCurrentCache() {
    if (!this.origin) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.cacheMap[this.origin];
  }

  async isInitialized(baseDir: string) {
    this.dirtyCachesIfNeeded(baseDir);
    return this.origin !== undefined && this.cacheMap[this.origin].initialized;
  }

  getTsConfigs() {
    if (!this.origin) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return this.cacheMap[this.origin].originalTsConfigFiles;
  }

  async getTsConfigForInputFile(inputFile: string) {
    if (!this.origin) {
      throw new Error(UNINITIALIZED_ERROR);
    }
    return await this.cacheMap[this.origin].getTsConfigForInputFile(inputFile);
  }

  async initializeTsConfigs(baseDir: string) {
    debug(`Resetting the TsConfigCache`);
    const cacheKeys = this.getCacheKeys(baseDir);
    this.cacheMap.lookup.initializeOriginalTsConfigs(this.foundLookupTsConfigs);
    this.cacheMap.lookup.key = cacheKeys.lookup;
    this.cacheMap.property.initializeOriginalTsConfigs(this.foundPropertyTsConfigs);
    this.cacheMap.property.key = cacheKeys.property;
    if (this.foundPropertyTsConfigs.length) {
      this.origin = 'property';
    } else if (this.foundLookupTsConfigs.length) {
      this.origin = 'lookup';
    } else {
      this.cacheMap.fallback.initializeOriginalTsConfigs(await this.getFallbackTsConfig(baseDir));
      this.origin = 'fallback';
    }
    info(
      `Found ${this.getTsConfigs().length} tsconfig.json file(s): [${this.getTsConfigs().join(', ')}]`,
    );
    debug(`TsConfigCache files' origin is "${this.origin}"`);
  }

  async getFallbackTsConfig(baseDir: string): Promise<string | undefined> {
    if (noFs()) {
      return undefined;
    }
    if (isSonarLint()) {
      if (this.filesStore.getFoundFilesCount() < maxFilesForTypeChecking()) {
        const { filename } = await this.writeTSConfigFile(
          this.createTSConfigObject(undefined, [normalize(baseDir) + '/**/*']),
        );
        info(`Using generated tsconfig.json file ${filename}`);
        return filename;
      }
    } else {
      const { filename } = await this.writeTSConfigFile(
        this.createTSConfigObject(
          this.filesStore.getFoundFilenames().filter(filename => isJsTsFile(filename)),
        ),
      );
      info(`Using generated tsconfig.json file using wildcards ${filename}`);
      return filename;
    }
  }

  clearTsConfigCache(filenames: string[] = []) {
    debug('Clearing lookup tsconfig cache');
    this.cacheMap.lookup.clearAll();
    if (filenames.some(tsconfig => this.cacheMap.property.discoveredTsConfigFiles.has(tsconfig))) {
      debug('Clearing property tsconfig cache');
      this.cacheMap.property.clearAll();
    }
  }

  clearFileToTsConfigCache() {
    // When a new sourcecode file is created, the file to tsconfig cache is cleared, as potentially the
    // tsconfig file that would cover this new file has already been processed, and we would not be aware of it.
    // By clearing the cache, we guarantee correctness.
    debug('Clearing input file to tsconfig cache');
    Object.values(this.cacheMap).forEach(cache => cache.clearFileToTsConfigCache());
  }

  dirtyCachesIfNeeded(baseDir: string) {
    const newCacheKeys = this.getCacheKeys(baseDir);
    for (const [cacheOrigin, cache] of Object.entries(this.cacheMap)) {
      if (
        cache.initialized &&
        cache.key !== newCacheKeys[cacheOrigin as keyof typeof this.cacheMap]
      ) {
        cache.clearAll();
        this.origin = undefined;
      }
    }
    const changedTsConfigs: string[] = [];
    for (const fileEvent of Object.entries(getFsEvents())) {
      const [filename, event] = fileEvent;
      const filenameLower = basename(filename).toLowerCase();
      if (filenameLower.endsWith('.json') && filenameLower.includes('tsconfig')) {
        changedTsConfigs.push(filename);
        setClearTsConfigCache(true);
      } else if (isJsTsFile(filename) && event === 'CREATED') {
        setClearFileToTsConfigCache(true);
      }
    }
    if (shouldClearTsConfigCache()) {
      this.clearTsConfigCache(changedTsConfigs);
    }
    if (shouldClearFileToTsConfigCache()) {
      this.clearFileToTsConfigCache();
    }
  }

  getCacheKeys(baseDir: string): { [type in TsConfigOrigin]: string } {
    return {
      property: JSON.stringify([baseDir, getTsConfigPaths()]),
      lookup: baseDir,
      fallback: baseDir,
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
  async writeTSConfigFile(tsConfig: TsConfigJson): Promise<{ filename: string }> {
    const filename = await new Promise<string>((resolve, reject) => {
      tmp.file({ template: 'tsconfig-XXXXXX.json' }, (err, path) => {
        if (err) {
          reject(err);
        } else {
          resolve(path);
        }
      });
    });
    await writeFile(filename, JSON.stringify(tsConfig), 'utf-8');
    return { filename };
  }

  /**
   * Create and return a TSConfig object.
   *
   * @param files array of files included in the TS program
   * @param include inclusion paths of the TS Program
   * @returns the TSConfig object
   */
  createTSConfigObject(files?: string[], include?: string[]): TsConfigJson {
    return {
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      include,
      files,
    } as TsConfigJson;
  }

  setup() {
    this.foundPropertyTsConfigs = [];
    this.foundLookupTsConfigs = [];
    this.providedPropertyTsConfigs = getTsConfigPaths().map(tsConfig => {
      return {
        path: tsConfig,
        pattern: new Minimatch(tsConfig, { nocase: true, matchBase: true, dot: true }),
      };
    });
    if (this.providedPropertyTsConfigs.length) {
      info(`Resolving provided TSConfig files using '${getTsConfigPaths().join(',')}'`);
    }
  }

  async processFile(file: Dirent, filePath: string) {
    const matches = this.providedPropertyTsConfigs?.some(
      providedTsConfig =>
        providedTsConfig.path === filePath || providedTsConfig.pattern.match(filePath),
    );
    if (matches) {
      this.foundPropertyTsConfigs.push(filePath);
    }
    if (file.name === TSCONFIG_JSON) {
      this.foundLookupTsConfigs.push(filePath);
    }
  }

  async postProcess(baseDir: string) {
    if (getTsConfigPaths().length && !this.foundPropertyTsConfigs.length) {
      error(
        `Failed to find any of the provided tsconfig.json files: ${getTsConfigPaths().join(', ')}`,
      );
    }
    await this.initializeTsConfigs(baseDir);
  }
}
