/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { DependencyManifestStore } from './dependency-manifests.js';
import { GeneratedSourceStore } from './generated-sources/index.js';
import { TsConfigStore } from './tsconfigs.js';
import { findFiles } from '../common/find-files.js';
import type { FileStore } from './store-type.js';
import type { Configuration } from '../common/configuration.js';
import {
  isRoot,
  readFile,
  type File,
  type NormalizedAbsolutePath,
  dirnamePath,
} from '../../../shared/src/helpers/files.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';
import { warn } from '../../../shared/src/helpers/logging.js';

export const sourceFileStore = new SourceFileStore();
export const dependencyManifestStore = new DependencyManifestStore();
export const generatedSourceStore = new GeneratedSourceStore(dependencyManifestStore);
export const tsConfigStore = new TsConfigStore();

const fileStores: FileStore[] = [
  sourceFileStore,
  dependencyManifestStore,
  generatedSourceStore,
  tsConfigStore,
];

export function resetFileStores() {
  sourceFileStore.clearCache();
  dependencyManifestStore.clearCache();
  generatedSourceStore.clearCache();
  tsConfigStore.clearCache();
}

export async function initFileStores(configuration: Configuration, inputFiles?: AnalyzableFiles) {
  const { baseDir, canAccessFileSystem, jsTsExclusions } = configuration;
  const pendingStores: FileStore[] = [];

  for (const store of fileStores) {
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
    await findFiles(baseDir, jsTsExclusions, async (entry, filePath) => {
      for (const store of pendingStores) {
        if (entry.isDirectory()) {
          store.processDirectory?.(filePath, configuration);
        }
      }

      if (entry.isFile()) {
        await processPendingFileStores(pendingStores, filePath, configuration);
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
  inputFiles: AnalyzableFiles,
  configuration: Configuration,
  pendingStores: FileStore[],
) {
  const { baseDir } = configuration;
  // simulate file system traversal from baseDir to each given input file
  // Keys in AnalyzableFiles are already normalized absolute paths
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
  }

  // files need to be processed after as ignored files logic depends on ignored paths being ingested
  for (const filePath of filePaths) {
    await processPendingFileStores(
      pendingStores,
      filePath,
      configuration,
      inputFiles[filePath].fileContent,
    );
  }
}

async function processPendingFileStores(
  pendingStores: FileStore[],
  filePath: NormalizedAbsolutePath,
  configuration: Configuration,
  fileContent?: string,
) {
  let file: File | undefined = undefined;
  let fileResolved = false;
  for (const store of pendingStores) {
    const storeWantsFile = store.wantsFile(filePath, configuration);
    if (storeWantsFile === 'content') {
      if (!fileResolved) {
        file = await createSharedFile(filePath, fileContent);
        fileResolved = true;
      }

      if (file !== undefined) {
        await store.processFile(filePath, configuration, file);
      }
    } else if (storeWantsFile === 'path') {
      await store.processFile(filePath, configuration);
    }
  }
}

async function createSharedFile(
  filePath: NormalizedAbsolutePath,
  fileContent?: string,
): Promise<File | undefined> {
  if (fileContent !== undefined) {
    return { filePath, fileContent };
  }

  try {
    return { filePath, fileContent: await readFile(filePath) };
  } catch (error) {
    warn(`Error reading file ${filePath}: ${error}`);
    return undefined;
  }
}
