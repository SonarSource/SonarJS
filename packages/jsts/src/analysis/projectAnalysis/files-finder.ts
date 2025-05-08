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
} from '../../../../shared/src/helpers/configuration.js';
import { dirname, join } from 'node:path/posix';
import { JsTsFiles } from './projectAnalysis.js';
import { findFiles } from '../../../../shared/src/helpers/find-files.js';
import { FileType, toUnixPath } from '../../../../shared/src/helpers/files.js';
import { readFile } from 'node:fs/promises';
import { accept } from './filter/filter.js';
import { initializeTsConfigs, TSCONFIG_JSON, tsConfigsInitialized } from './tsconfigs.js';
import { filesInitialized, setFiles } from './files.js';
import { error } from '../../../../shared/src/helpers/logging.js';
import { Minimatch } from 'minimatch';

type filterSearch = {
  jsts: boolean;
  tsconfigs: boolean;
  //we can add package.json search to the same search
};

type ProvidedTsConfig = {
  path: string;
  pattern: Minimatch;
};

export async function loadFiles(
  baseDir: string,
  filterSearch: filterSearch = { jsts: true, tsconfigs: true },
) {
  if (tsConfigsInitialized()) {
    filterSearch.tsconfigs = false;
  }

  if (filesInitialized()) {
    filterSearch.jsts = false;
  }

  // if all filters are off, skip search
  if (Object.values(filterSearch).every(value => !value)) return;

  const providedTsConfigs: ProvidedTsConfig[] = getTsConfigPaths().map(tsConfigPath => {
    const tsConfig = toUnixPath(join(baseDir, tsConfigPath.trim()));
    return {
      path: tsConfig,
      pattern: new Minimatch(tsConfig.trim(), { nocase: true, matchBase: true, dot: true }),
    };
  });

  const tests = getTestPaths();
  const testPaths = tests ? tests.map(test => join(baseDir, test)) : null;

  const files: JsTsFiles = {};
  const foundLookupTsConfigs: string[] = [];
  const foundPropertyTsConfigs: string[] = [];

  await findFiles(
    baseDir,
    async (file, filePath) => {
      if (filterSearch.jsts && isAnalyzableFile(file.name)) {
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
        if (providedTsConfigs.length) {
          for (const providedTsConfig of providedTsConfigs) {
            if (providedTsConfig.path === filePath || providedTsConfig.pattern.match(filePath)) {
              foundPropertyTsConfigs.push(filePath);
              break;
            }
          }
        }
        if (file.name === TSCONFIG_JSON) {
          foundLookupTsConfigs.push(filePath);
        }
      }
    },
    getExclusions(),
  );
  if (!filesInitialized()) {
    setFiles(files);
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

function getFiletype(filePath: string, testPaths: string[] | null): FileType {
  if (testPaths?.length) {
    const parent = dirname(filePath);
    if (testPaths?.some(testPath => parent.startsWith(testPath))) {
      return 'TEST';
    }
  }
  return 'MAIN';
}
