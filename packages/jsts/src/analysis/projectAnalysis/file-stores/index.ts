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

import { SourceFileStore } from './source-files.js';
import { PackageJsonStore } from './package-jsons.js';
import { TsConfigStore } from './tsconfigs.js';
import type { JsTsFiles } from '../projectAnalysis.js';
import { findFiles } from '../../../../../shared/src/helpers/find-files.js';
import type { FileStore } from './store-type.js';
import { canAccessFileSystem } from '../../../../../shared/src/helpers/configuration.js';

export const sourceFileStore = new SourceFileStore();
export const packageJsonStore = new PackageJsonStore();
export const tsConfigStore = new TsConfigStore(sourceFileStore);

export async function initFileStores(baseDir: string, inputFiles?: JsTsFiles) {
  const pendingStores: FileStore[] = [];

  for (const store of [sourceFileStore, packageJsonStore, tsConfigStore]) {
    if (!(await store.isInitialized(baseDir, inputFiles))) {
      pendingStores.push(store);
    }
  }

  if (!pendingStores.length) {
    return;
  }

  for (const store of pendingStores) {
    store.setup(baseDir);
  }

  if (!canAccessFileSystem()) {
    await findFiles(baseDir, async (file, filePath) => {
      for (const store of pendingStores) {
        if (file.isFile()) {
          await store.processFile(file, filePath);
        }
        if (file.isDirectory()) {
          store.processDirectory?.(filePath);
        }
      }
    });
  }

  for (const store of pendingStores) {
    await store.postProcess(baseDir);
  }
}

export async function getFilesToAnalyze(baseDir: string, inputFiles?: JsTsFiles) {
  await initFileStores(baseDir, inputFiles);

  if (sourceFileStore.getRequestFilesCount() > 0) {
    // if the request had input files, we use them
    return {
      filesToAnalyze: sourceFileStore.getRequestFiles(),
      pendingFiles: new Set(sourceFileStore.getRequestFilenames()),
    };
  } else {
    // otherwise, we analyze all found files in baseDir
    return {
      filesToAnalyze: sourceFileStore.getFoundFiles(),
      pendingFiles: new Set(sourceFileStore.getFoundFilenames()),
    };
  }
}
