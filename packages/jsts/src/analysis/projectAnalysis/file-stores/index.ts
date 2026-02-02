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
import type { JsTsFiles, RawJsTsFiles } from '../projectAnalysis.js';
import { findFiles } from '../../../../../shared/src/helpers/find-files.js';
import type { FileStore } from './store-type.js';
import { canAccessFileSystem } from '../../../../../shared/src/helpers/configuration.js';
import {
  normalizeToAbsolutePath,
  isRoot,
  type NormalizedAbsolutePath,
  dirnamePath,
} from '../../../rules/helpers/index.js';

export const sourceFileStore = new SourceFileStore();
export const packageJsonStore = new PackageJsonStore();
export const tsConfigStore = new TsConfigStore();

export async function initFileStores(baseDir: NormalizedAbsolutePath, inputFiles?: JsTsFiles) {
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

  if (canAccessFileSystem()) {
    await findFiles(baseDir, async (file, filePath) => {
      // filePath is already normalized and absolute (derived from baseDir)
      const normalizedFilePath = filePath as NormalizedAbsolutePath;
      for (const store of pendingStores) {
        if (file.isFile()) {
          await store.processFile(normalizedFilePath);
        }
        if (file.isDirectory()) {
          store.processDirectory?.(normalizedFilePath);
        }
      }
    });
  } else if (inputFiles) {
    await simulateFromInputFiles(inputFiles, baseDir, pendingStores);
  }

  for (const store of pendingStores) {
    await store.postProcess(baseDir);
  }
}

/**
 * Sanitizes raw input files by normalizing their file paths.
 */
function sanitizeJsTsFiles(
  inputFiles: RawJsTsFiles | undefined,
  baseDir: NormalizedAbsolutePath,
): JsTsFiles | undefined {
  if (!inputFiles) {
    return undefined;
  }
  const sanitized: JsTsFiles = {};
  for (const [_key, value] of Object.entries(inputFiles)) {
    const normalizedPath = normalizeToAbsolutePath(value.filePath, baseDir);
    sanitized[normalizedPath] = {
      ...value,
      filePath: normalizedPath,
    };
  }
  return sanitized;
}

export async function getFilesToAnalyze(
  baseDir: NormalizedAbsolutePath,
  inputFiles?: RawJsTsFiles,
) {
  const sanitizedInputFiles = sanitizeJsTsFiles(inputFiles, baseDir);
  await initFileStores(baseDir, sanitizedInputFiles);

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

export async function simulateFromInputFiles(
  inputFiles: JsTsFiles,
  baseDir: string,
  pendingStores: FileStore[],
) {
  // simulate file system traversal from baseDir to each given input file
  const inputFilesPaths = new Set<NormalizedAbsolutePath>();
  const files = new Set<NormalizedAbsolutePath>();
  for (const file of Object.values(inputFiles ?? {})) {
    const filename = normalizeToAbsolutePath(file.filePath);
    files.add(filename);
    inputFilesPaths.add(dirnamePath(filename));
  }

  const allPaths = new Set<NormalizedAbsolutePath>();
  // add all parent directories of input files up to the baseDir
  for (const path of inputFilesPaths) {
    let currentPath: NormalizedAbsolutePath = path;
    while (baseDir !== currentPath && !isRoot(currentPath)) {
      allPaths.add(currentPath);
      currentPath = dirnamePath(currentPath);
    }
  }

  for (const store of pendingStores) {
    if (store.processDirectory) {
      for (const filePath of allPaths) {
        store.processDirectory(filePath);
      }
    }
    //files need to be processed after as ignored files logic depends on ignored paths being ingested
    for (const filename of files) {
      await store.processFile(filename);
    }
  }
}
