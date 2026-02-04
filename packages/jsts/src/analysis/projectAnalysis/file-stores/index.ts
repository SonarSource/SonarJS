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
import { SourceFileStore } from './source-files.js';
import { PackageJsonStore } from './package-jsons.js';
import { TsConfigStore } from './tsconfigs.js';
import { findFiles } from '../../../../../shared/src/helpers/find-files.js';
import type { FileStore } from './store-type.js';
import type { Configuration } from '../../../../../shared/src/helpers/configuration.js';
import { isRoot, type NormalizedAbsolutePath, dirnamePath } from '../../../rules/helpers/index.js';
import type { JsTsFiles } from '../projectAnalysis.js';

export const sourceFileStore = new SourceFileStore();
export const packageJsonStore = new PackageJsonStore();
export const tsConfigStore = new TsConfigStore();

export async function initFileStores(configuration: Configuration, inputFiles?: JsTsFiles) {
  const { baseDir, canAccessFileSystem, jsTsExclusions } = configuration;
  const pendingStores: FileStore[] = [];

  for (const store of [sourceFileStore, packageJsonStore, tsConfigStore]) {
    if (!(await store.isInitialized(configuration, inputFiles))) {
      pendingStores.push(store);
    }
  }

  if (!pendingStores.length) {
    return;
  }

  for (const store of pendingStores) {
    store.setup(configuration);
  }

  if (canAccessFileSystem) {
    await findFiles(baseDir, jsTsExclusions, async (file, filePath) => {
      for (const store of pendingStores) {
        if (file.isFile()) {
          await store.processFile(filePath, configuration);
        }
        if (file.isDirectory()) {
          store.processDirectory?.(filePath, configuration);
        }
      }
    });
  } else if (inputFiles) {
    await simulateFromInputFiles(inputFiles, configuration, pendingStores);
  }

  for (const store of pendingStores) {
    await store.postProcess(configuration);
  }
}

export async function simulateFromInputFiles(
  inputFiles: JsTsFiles,
  configuration: Configuration,
  pendingStores: FileStore[],
) {
  const { baseDir } = configuration;
  // simulate file system traversal from baseDir to each given input file
  // Keys in JsTsFiles are already normalized absolute paths
  const filePaths = Object.keys(inputFiles) as NormalizedAbsolutePath[];

  const allDirs = new Set<NormalizedAbsolutePath>();
  // add all parent directories of input files up to the baseDir
  for (const filePath of filePaths) {
    let currentPath = dirnamePath(filePath);
    while (baseDir !== currentPath && !isRoot(currentPath)) {
      allDirs.add(currentPath);
      currentPath = dirnamePath(currentPath);
    }
  }

  for (const store of pendingStores) {
    if (store.processDirectory) {
      for (const dir of allDirs) {
        store.processDirectory(dir, configuration);
      }
    }
    //files need to be processed after as ignored files logic depends on ignored paths being ingested
    for (const filePath of filePaths) {
      await store.processFile(filePath, configuration);
    }
  }
}
