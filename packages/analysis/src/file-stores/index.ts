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
import { FileSystemSet, pathsEqual } from '../common/filesystem.js';
import { SourceFilesContext } from '../common/source-files-context.js';
import { fileContentStore } from '../common/file-content-store.js';
import { SourceFileStore } from './source-files.js';
import { DependencyManifestStore } from './dependency-manifests.js';
import { GeneratedSourceStore } from './generated-sources/index.js';
import { TsConfigStore } from './tsconfigs.js';
import { findFiles } from '../common/find-files.js';
import type { FileStore, FileStoreContext } from './store-type.js';
import type { Configuration } from '../common/configuration.js';
import {
  isRoot,
  readFile,
  type File,
  type NormalizedAbsolutePath,
  dirnamePath,
} from '../../../shared/src/helpers/files.js';
import type { AnalyzableFiles } from '../projectAnalysis.js';
import { clearSourceFileContentCache } from '../jsts/program/cache/sourceFileCache.js';

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

function resetFileStores() {
  sourceFileStore.clearCache();
  dependencyManifestStore.clearCache();
  generatedSourceStore.clearCache();
  tsConfigStore.clearCache();
}

/**
 * Initializes the shared caches for a project analysis.
 * Scanner analyses are independent, while SonarQube for IDE analyses reuse
 * caches across requests for incremental performance.
 */
export async function initFileStoresForAnalysis(
  configuration: Configuration,
  inputFiles?: AnalyzableFiles,
) {
  if (!configuration.sonarlint) {
    resetFileStores();
    clearSourceFileContentCache();
  }
  await initFileStores(configuration, inputFiles);
}

export async function initFileStores(configuration: Configuration, inputFiles?: AnalyzableFiles) {
  const { baseDir, canAccessFileSystem, jsTsExclusions } = configuration;
  const pendingStores: FileStore[] = [];
  for (const path of configuration.fsEvents) {
    fileContentStore.delete(path);
  }

  for (const store of fileStores) {
    if (!(await store.isInitialized(configuration, inputFiles))) {
      pendingStores.push(store);
    }
  }

  if (!pendingStores.length) {
    return;
  }

  const context = createFileStoreContext(inputFiles);

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
        await processPendingFileStores(pendingStores, filePath, configuration, context);
      }
    });
  } else if (inputFiles) {
    await simulateFromInputFiles(inputFiles, configuration, pendingStores, context);
  }
  for (const store of pendingStores) {
    await store.postProcess(configuration, context);
  }
}

export async function simulateFromInputFiles(
  inputFiles: AnalyzableFiles,
  configuration: Configuration,
  pendingStores: FileStore[],
  context = createFileStoreContext(inputFiles),
) {
  const { baseDir } = configuration;
  // simulate file system traversal from baseDir to each given input file
  // Keys in AnalyzableFiles are already normalized absolute paths
  const filePaths = Object.keys(inputFiles) as NormalizedAbsolutePath[];

  const allDirs = new FileSystemSet<NormalizedAbsolutePath>();
  // add all parent directories of input files up to the baseDir
  for (const filePath of filePaths) {
    let currentPath = dirnamePath(filePath);
    while (!pathsEqual(baseDir, currentPath) && !isRoot(currentPath)) {
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
      context,
      inputFiles[filePath].fileContent,
    );
  }
}

async function processPendingFileStores(
  pendingStores: FileStore[],
  filePath: NormalizedAbsolutePath,
  configuration: Configuration,
  context: FileStoreContext,
  fileContent?: string,
) {
  const storeRequests = pendingStores.map(store => ({
    store,
    request: store.wantsFile(filePath, configuration),
  }));

  let sharedFile: File | undefined;
  for (const { store, request: storeWantsFile } of storeRequests) {
    if (storeWantsFile === 'content') {
      sharedFile ??= await context.getFile(filePath, fileContent);
      await store.processFile(filePath, configuration, sharedFile);
    } else if (storeWantsFile === 'path') {
      await store.processFile(filePath, configuration);
    }
  }
}

function createFileStoreContext(inputFiles?: AnalyzableFiles): FileStoreContext {
  let provided: SourceFilesContext<AnalyzableFiles[NormalizedAbsolutePath]> | undefined;
  if (inputFiles) {
    provided = sourceFileStore.context;
    if (inputFiles !== provided.files) {
      provided = new SourceFilesContext();
      provided.setFiles(inputFiles);
    }
  }
  // Reuse contents read by this discovery walk, while reloading files after store invalidation.
  const scope = {};
  return {
    async getFile(filePath, fileContent) {
      const inputFile = provided?.getFile(filePath);
      if (inputFile) {
        fileContentStore.register(filePath, inputFile);
        return inputFile;
      }
      const cachedFile = fileContentStore.getFile(filePath, scope);
      if (cachedFile?.fileContent !== undefined && fileContent === undefined) {
        return Object.assign(cachedFile, { filePath }) as File;
      }
      const file = {
        filePath,
        fileContent: fileContent ?? (await readFile(filePath)),
      };
      fileContentStore.register(filePath, file, scope);
      return file;
    },
  };
}
