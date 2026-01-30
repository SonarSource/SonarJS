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
import {
  getFsEvents,
  getTsConfigPaths,
  setClearTsConfigCache,
  shouldClearTsConfigCache,
} from '../../../../../shared/src/helpers/configuration.js';
import { basename } from 'node:path/posix';
import { Minimatch } from 'minimatch';
import { FileStore } from './store-type.js';
import {
  type NormalizedAbsolutePath,
  normalizeToAbsolutePath,
} from '../../../rules/helpers/index.js';
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

  async isInitialized(baseDir: NormalizedAbsolutePath) {
    this.dirtyCachesIfNeeded(baseDir);
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

  dirtyCachesIfNeeded(baseDir: NormalizedAbsolutePath) {
    if (
      this.baseDir !== baseDir ||
      this.propertyTsConfigsHash !== this.getPropertyTsConfigsHash()
    ) {
      this.clearCache();
      return;
    }
    for (const fileEvent of Object.entries(getFsEvents())) {
      const [filename] = fileEvent;
      const normalizedFilename = normalizeToAbsolutePath(filename);
      if (
        this.getTsConfigs().includes(normalizedFilename) ||
        (this.usingLookupTsConfigs() && this.filenameMatchesTsConfig(normalizedFilename)) ||
        (this.usingPropertyTsConfigs() && this.filenameMatchesProvidedTsConfig(normalizedFilename))
      ) {
        setClearTsConfigCache(true);
        break;
      }
    }
    if (shouldClearTsConfigCache()) {
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

  setup(baseDir: NormalizedAbsolutePath) {
    this.baseDir = baseDir;
    if (this.getPropertyTsConfigsHash() !== this.propertyTsConfigsHash) {
      this.propertyTsConfigsHash = this.getPropertyTsConfigsHash();
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
  }

  getPropertyTsConfigsHash() {
    return getTsConfigPaths().join(',');
  }

  async processFile(filename: NormalizedAbsolutePath) {
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

  async postProcess() {
    if (getTsConfigPaths().length && !this.foundPropertyTsConfigs.length) {
      error(
        `Failed to find any of the provided tsconfig.json files: ${getTsConfigPaths().join(', ')}`,
      );
    }
    info(
      `Found ${this.getTsConfigs().length} tsconfig.json file(s): [${this.getTsConfigs().join(', ')}]`,
    );
  }
}
