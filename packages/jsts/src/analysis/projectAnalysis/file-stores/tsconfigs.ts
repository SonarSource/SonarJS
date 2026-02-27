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
import { debug, error, info } from '../../../../../shared/src/helpers/logging.js';
import { basename } from 'node:path/posix';
import { Minimatch } from 'minimatch';
import type { FileStore } from './store-type.js';
import type { NormalizedAbsolutePath } from '../../../rules/helpers/index.js';
import type { Configuration } from '../../../../../shared/src/helpers/configuration.js';
import { clearTsConfigContentCache } from '../../../program/cache/tsconfigCache.js';
import { clearProgramOptionsCache } from '../../../program/cache/programOptionsCache.js';
import { getProgramCacheManager } from '../../../program/cache/programCache.js';

const TSCONFIG_JSON = 'tsconfig.json';

type ProvidedTsConfig = {
  path: NormalizedAbsolutePath;
  pattern: Minimatch;
};

export class TsConfigStore implements FileStore {
  // tsconfig.json files in the project tree
  private foundLookupTsConfigs: NormalizedAbsolutePath[] = [];
  // tsconfig.json files specified in sonar.typescript.tsconfigPaths
  private foundPropertyTsConfigs: NormalizedAbsolutePath[] = [];
  private providedPropertyTsConfigs: ProvidedTsConfig[] | undefined = undefined;
  private propertyTsConfigsHash: string | undefined = undefined;
  private baseDir: NormalizedAbsolutePath | undefined = undefined;

  /**
   * Checks if the store is initialized for the given base directory.
   */
  async isInitialized(configuration: Configuration) {
    this.dirtyCachesIfNeeded(configuration);
    return this.baseDir !== undefined;
  }

  getTsConfigs() {
    if (this.foundPropertyTsConfigs.length) {
      return this.foundPropertyTsConfigs;
    } else if (this.foundLookupTsConfigs.length) {
      return this.foundLookupTsConfigs;
    }
    return [];
  }

  usingPropertyTsConfigs() {
    return this.getTsConfigs() === this.foundPropertyTsConfigs;
  }

  usingLookupTsConfigs() {
    return this.getTsConfigs() === this.foundLookupTsConfigs;
  }

  addDiscoveredTsConfig(tsconfig: NormalizedAbsolutePath) {
    // Add to the appropriate list based on the current mode
    if (this.usingPropertyTsConfigs() && !this.foundPropertyTsConfigs.includes(tsconfig)) {
      info(`Discovered referenced tsconfig: ${tsconfig}`);
      this.foundPropertyTsConfigs.push(tsconfig);
    } else if (this.usingLookupTsConfigs() && !this.foundLookupTsConfigs.includes(tsconfig)) {
      info(`Discovered referenced tsconfig: ${tsconfig}`);
      this.foundLookupTsConfigs.push(tsconfig);
    }
  }

  dirtyCachesIfNeeded(configuration: Configuration) {
    const { baseDir, tsConfigPaths, fsEvents, clearTsConfigCache } = configuration;
    if (
      this.baseDir !== baseDir ||
      this.propertyTsConfigsHash !== this.computeTsConfigsHash(tsConfigPaths)
    ) {
      this.clearCache();
      return;
    }
    let shouldClear = clearTsConfigCache;
    for (const filename of fsEvents) {
      if (
        this.getTsConfigs().includes(filename) ||
        (this.usingLookupTsConfigs() && this.filenameMatchesTsConfig(filename)) ||
        (this.usingPropertyTsConfigs() && this.filenameMatchesProvidedTsConfig(filename))
      ) {
        shouldClear = true;
        break;
      }
    }
    if (shouldClear) {
      this.clearCache();
    }
  }

  clearCache() {
    debug(`Resetting the TsConfigCache`);
    this.baseDir = undefined;
    this.foundLookupTsConfigs = [];
    this.foundPropertyTsConfigs = [];
    this.providedPropertyTsConfigs = undefined;
    clearTsConfigContentCache();
    clearProgramOptionsCache();
    getProgramCacheManager().clear();
  }

  /**
   * Sets up the store for processing files.
   */
  setup(configuration: Configuration) {
    const { baseDir, tsConfigPaths } = configuration;
    this.baseDir = baseDir;
    const newHash = this.computeTsConfigsHash(tsConfigPaths);
    if (newHash !== this.propertyTsConfigsHash) {
      this.propertyTsConfigsHash = newHash;
      this.providedPropertyTsConfigs = tsConfigPaths.map(tsConfig => {
        return {
          path: tsConfig,
          pattern: new Minimatch(tsConfig, { nocase: true, matchBase: true, dot: true }),
        };
      });
      if (this.providedPropertyTsConfigs.length) {
        info(`Resolving provided TSConfig files using '${tsConfigPaths.join(',')}'`);
      }
    }
  }

  /**
   * Computes a hash string from the tsConfigPaths array for cache invalidation.
   */
  private computeTsConfigsHash(tsConfigPaths: NormalizedAbsolutePath[]) {
    return tsConfigPaths.join(',');
  }

  async processFile(filename: NormalizedAbsolutePath, _configuration: Configuration) {
    if (this.filenameMatchesProvidedTsConfig(filename)) {
      this.foundPropertyTsConfigs.push(filename);
    }
    if (this.filenameMatchesTsConfig(filename)) {
      this.foundLookupTsConfigs.push(filename);
    }
  }

  filenameMatchesTsConfig(filename: NormalizedAbsolutePath) {
    return basename(filename) === TSCONFIG_JSON;
  }

  filenameMatchesProvidedTsConfig(filename: NormalizedAbsolutePath) {
    return this.providedPropertyTsConfigs?.some(
      providedTsConfig =>
        providedTsConfig.path === filename || providedTsConfig.pattern.match(filename),
    );
  }

  /**
   * Performs post-processing after all files have been processed.
   */
  async postProcess(configuration: Configuration) {
    const { tsConfigPaths } = configuration;
    if (tsConfigPaths.length && !this.foundPropertyTsConfigs.length) {
      error(`Failed to find any of the provided tsconfig.json files: ${tsConfigPaths.join(', ')}`);
    }
    // Sort lookup tsconfigs alphabetically to ensure deterministic analysis order
    // regardless of filesystem traversal order.
    this.foundLookupTsConfigs.sort();
    // Sort property tsconfigs by their position in the user-provided list to preserve
    // the intentional ordering from sonar.typescript.tsconfigPaths.
    const providedOrder = this.providedPropertyTsConfigs?.map(p => p.path) ?? [];
    this.foundPropertyTsConfigs.sort((a, b) => providedOrder.indexOf(a) - providedOrder.indexOf(b));
    info(
      `Found ${this.getTsConfigs().length} tsconfig.json file(s): [${this.getTsConfigs().join(', ')}]`,
    );
  }
}
