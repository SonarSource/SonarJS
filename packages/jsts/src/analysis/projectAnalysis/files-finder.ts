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
  isAnalyzableFile,
  isJsTsFile,
} from '../../../../shared/src/helpers/configuration.js';
import { dirname, join } from 'node:path/posix';
import { JsTsFiles } from './projectAnalysis.js';
import { findFiles } from '../../../../shared/src/helpers/find-files.js';
import { FileType, toUnixPath } from '../../../../shared/src/helpers/files.js';
import { readFile } from 'node:fs/promises';
import { accept } from './filter/filter.js';
import { setTSConfigs, TSCONFIG_JSON, tsConfigsInitialized } from './tsconfigs.js';
import { filesInitialized, setFiles } from './files.js';

type filterSearch = {
  jsts: boolean;
  tsconfigs: boolean;
  //we can add package.json search to the same search
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

  const tests = getTestPaths();
  const testPaths = tests ? tests.map(test => join(baseDir, test)) : null;

  const files: JsTsFiles = {};
  const foundTsConfigs: string[] = [];

  await findFiles(
    baseDir,
    async file => {
      if (filterSearch.jsts && isAnalyzableFile(file.name)) {
        const filePath = toUnixPath(join(file.parentPath, file.name));
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
      if (filterSearch.tsconfigs && file.name === TSCONFIG_JSON) {
        foundTsConfigs.push(toUnixPath(join(file.parentPath, file.name)));
      }
    },
    getExclusions(),
  );
  if (!tsConfigsInitialized()) {
    setTSConfigs(foundTsConfigs);
  }
  if (!filesInitialized()) {
    setFiles(files);
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
