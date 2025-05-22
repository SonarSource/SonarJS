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
import {
  getExclusions,
  getMaxFileSize,
  getTestPaths,
  getTsConfigPaths,
  isAnalyzableFile,
  isJsTsFile,
  isSonarLint,
} from '../../../../shared/src/helpers/configuration.js';
import { dirname, join } from 'node:path/posix';
import { JsTsFiles } from './projectAnalysis.js';
import { findFiles } from '../../../../shared/src/helpers/find-files.js';
import { FileType, toUnixPath } from '../../../../shared/src/helpers/files.js';
import { readFile } from 'node:fs/promises';
import { accept } from './filter/filter.js';
import { initializeTsConfigs, TSCONFIG_JSON, tsConfigCacheInitialized } from './tsconfigs.js';
import { fileCacheInitialized, setFiles } from './files.js';
import { error, info, warn } from '../../../../shared/src/helpers/logging.js';
import { Minimatch } from 'minimatch';
import {
  packageJsonsCacheInitialized,
  PackageJsonWithPath,
  setPackageJsons,
} from './package-jsons.js';
import { PACKAGE_JSON, stripBOM } from '../../rules/index.js';

type FilterSearch = {
  files: boolean;
  tsconfigs: boolean;
  packageJsons: boolean;
};

type ProvidedTsConfig = {
  path: string;
  pattern: Minimatch;
};

export async function loadFiles(baseDir: string, inputFiles?: JsTsFiles) {
  const filterSearch: FilterSearch = {
    files: shouldSearchInputFiles(baseDir, inputFiles),
    tsconfigs: !tsConfigCacheInitialized(baseDir),
    packageJsons: !packageJsonsCacheInitialized(baseDir),
  };
  // if all filters are off, skip search
  if (Object.values(filterSearch).every(value => !value)) {
    return;
  }

  const providedTsConfigs: ProvidedTsConfig[] = getTsConfigPaths().map(tsConfigPath => {
    const tsConfig = toUnixPath(join(baseDir, tsConfigPath.trim()));
    return {
      path: tsConfig,
      pattern: new Minimatch(tsConfig.trim(), { nocase: true, matchBase: true, dot: true }),
    };
  });
  if (providedTsConfigs.length) {
    info(`Resolving provided TSConfig files using '${getTsConfigPaths().join(',')}'`);
  }

  const testPaths = getTestPaths()?.map(test => toUnixPath(join(baseDir, test)));

  const files: JsTsFiles = {};
  const foundPackageJsons: PackageJsonWithPath[] = [];
  // tsconfig.json files in the project tree
  const foundLookupTsConfigs: string[] = [];
  // tsconfig.json files specified in sonar.typescript.tsconfigPaths
  const foundPropertyTsConfigs: string[] = [];

  await findFiles(
    baseDir,
    async (file, filePath) => {
      if (filterSearch.files && isAnalyzableFile(file.name)) {
        const fileType = getFiletype(filePath, testPaths);
        if (isJsTsFile(file.name)) {
          const fileContent = await readFile(filePath, 'utf8');
          if (accept(filePath, fileContent, getMaxFileSize())) {
            files[filePath] = { fileType, filePath, fileContent };
          }
        } else {
          files[filePath] = { fileType, filePath };
        }
      }

      if (filterSearch.tsconfigs) {
        const matches = providedTsConfigs.some(
          providedTsConfig =>
            providedTsConfig.path === filePath || providedTsConfig.pattern.match(filePath),
        );
        if (matches) {
          foundPropertyTsConfigs.push(filePath);
        }
        if (file.name === TSCONFIG_JSON) {
          foundLookupTsConfigs.push(filePath);
        }
      }

      if (filterSearch.packageJsons && file.name === PACKAGE_JSON) {
        try {
          const fileContent = JSON.parse(stripBOM(await readFile(filePath, 'utf8')));
          foundPackageJsons.push({ filePath, fileContent });
        } catch (e) {
          warn(`Error parsing package.json ${filePath}: ${e}`);
        }
      }
    },
    getExclusions(),
  );
  if (filterSearch.files) {
    setFiles(baseDir, files);
  }
  if (filterSearch.packageJsons) {
    setPackageJsons(baseDir, foundPackageJsons);
  }
  if (filterSearch.tsconfigs) {
    if (getTsConfigPaths().length && !foundPropertyTsConfigs.length) {
      error(
        `Failed to find any of the provided tsconfig.json files: ${getTsConfigPaths().join(', ')}`,
      );
    }
    await initializeTsConfigs(baseDir, foundLookupTsConfigs, foundPropertyTsConfigs);
  }
}

function getFiletype(filePath: string, testPaths?: string[]): FileType {
  if (testPaths?.length) {
    const parent = dirname(filePath);
    if (testPaths?.some(testPath => parent.startsWith(testPath))) {
      return 'TEST';
    }
  }
  return 'MAIN';
}

function shouldSearchInputFiles(baseDir: string, files?: JsTsFiles) {
  if (!isSonarLint() && files) {
    setFiles(baseDir, files);
    return false;
  }
  // in sonarlint we just need the file cache to know how many are there to enable or disable type-checking
  return !fileCacheInitialized(baseDir);
}
