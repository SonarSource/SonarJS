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
import { dirname } from 'node:path/posix';
import { SourceFileStore } from './source-files.js';
import { PackageJsonStore } from './package-jsons.js';
import { TsConfigStore } from './tsconfigs.js';
import type { JsTsFiles } from '../projectAnalysis.js';
import { findFiles } from '../../../../../shared/src/helpers/find-files.js';
import type { FileStore } from './store-type.js';
import { canAccessFileSystem } from '../../../../../shared/src/helpers/configuration.js';
import { toUnixPath, isRoot } from '../../../rules/helpers/index.js';

export const sourceFileStore = new SourceFileStore();
export const packageJsonStore = new PackageJsonStore();
export const tsConfigStore = new TsConfigStore();

export async function initFileStores(baseDir: string, inputFiles?: JsTsFiles) {
  console.log('[DEBUG] initFileStores: Starting');
  const pendingStores: FileStore[] = [];

  for (const store of [sourceFileStore, packageJsonStore, tsConfigStore]) {
    if (!(await store.isInitialized(baseDir, inputFiles))) {
      pendingStores.push(store);
    }
  }
  console.log('[DEBUG] initFileStores: Pending stores count:', pendingStores.length);

  if (!pendingStores.length) {
    console.log('[DEBUG] initFileStores: No pending stores, returning');
    return;
  }

  for (const store of pendingStores) {
    console.log('[DEBUG] initFileStores: Setting up store:', store.constructor.name);
    store.setup(baseDir);
  }

  if (canAccessFileSystem()) {
    console.log('[DEBUG] initFileStores: Can access file system, calling findFiles');
    await findFiles(baseDir, async (file, filePath) => {
      for (const store of pendingStores) {
        if (file.isFile()) {
          await store.processFile(filePath);
        }
        if (file.isDirectory()) {
          store.processDirectory?.(filePath);
        }
      }
    });
  } else if (inputFiles) {
    console.log(
      '[DEBUG] initFileStores: Cannot access file system, calling simulateFromInputFiles with',
      Object.keys(inputFiles).length,
      'files',
    );
    await simulateFromInputFiles(inputFiles, baseDir, pendingStores);
    console.log('[DEBUG] initFileStores: simulateFromInputFiles completed');
  }

  console.log('[DEBUG] initFileStores: Running postProcess for', pendingStores.length, 'stores');
  for (const store of pendingStores) {
    console.log('[DEBUG] initFileStores: postProcess for', store.constructor.name);
    await store.postProcess(baseDir);
    console.log('[DEBUG] initFileStores: postProcess completed for', store.constructor.name);
  }
  console.log('[DEBUG] initFileStores: Completed');
}

export async function getFilesToAnalyze(baseDir: string, inputFiles?: JsTsFiles) {
  console.log(
    '[DEBUG] getFilesToAnalyze: Starting, baseDir:',
    baseDir,
    'inputFiles:',
    inputFiles ? Object.keys(inputFiles).length : 0,
  );
  await initFileStores(baseDir, inputFiles);
  console.log('[DEBUG] getFilesToAnalyze: initFileStores completed');

  if (sourceFileStore.getRequestFilesCount() > 0) {
    // if the request had input files, we use them
    console.log(
      '[DEBUG] getFilesToAnalyze: Using request files, count:',
      sourceFileStore.getRequestFilesCount(),
    );
    return {
      filesToAnalyze: sourceFileStore.getRequestFiles(),
      pendingFiles: new Set(sourceFileStore.getRequestFilenames()),
    };
  } else {
    // otherwise, we analyze all found files in baseDir
    console.log('[DEBUG] getFilesToAnalyze: Using found files');
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
  console.log(
    '[DEBUG] simulateFromInputFiles: Starting with',
    Object.keys(inputFiles).length,
    'input files',
  );
  // simulate file system traversal from baseDir to each given input file
  const inputFilesPaths = new Set<string>();
  const files = new Set<string>();
  for (const file of Object.values(inputFiles ?? {})) {
    const filename = toUnixPath(file.filePath);
    console.log('[DEBUG] simulateFromInputFiles: Processing input file:', filename);
    files.add(filename);
    inputFilesPaths.add(dirname(filename));
  }
  console.log(
    '[DEBUG] simulateFromInputFiles: Collected',
    files.size,
    'files and',
    inputFilesPaths.size,
    'paths',
  );

  const allPaths = new Set<string>();
  // add all parent directories of input files up to the baseDir
  for (const path of inputFilesPaths) {
    let currentPath = path;
    console.log('[DEBUG] simulateFromInputFiles: Building path hierarchy for:', path);
    let iterations = 0;
    const maxIterations = 100; // Safety limit to prevent infinite loops
    while (baseDir !== currentPath && !isRoot(currentPath)) {
      iterations++;
      if (iterations > maxIterations) {
        console.log('[DEBUG] simulateFromInputFiles: Breaking infinite loop at path:', currentPath);
        break;
      }
      allPaths.add(currentPath);
      const nextPath = dirname(currentPath);
      console.log(
        '[DEBUG] simulateFromInputFiles: currentPath:',
        currentPath,
        '-> nextPath:',
        nextPath,
      );
      // If dirname doesn't change the path, we've hit a relative path root (like '.')
      if (nextPath === currentPath) {
        console.log('[DEBUG] simulateFromInputFiles: Reached relative path root, breaking');
        break;
      }
      currentPath = nextPath;
    }
  }
  console.log('[DEBUG] simulateFromInputFiles: Built', allPaths.size, 'paths total');

  for (const store of pendingStores) {
    console.log('[DEBUG] simulateFromInputFiles: Processing store:', store.constructor.name);
    if (store.processDirectory) {
      console.log(
        '[DEBUG] simulateFromInputFiles: Processing',
        allPaths.size,
        'directories for',
        store.constructor.name,
      );
      for (const filePath of allPaths) {
        store.processDirectory(filePath);
      }
    }
    //files need to be processed after as ignored files logic depends on ignored paths being ingested
    console.log(
      '[DEBUG] simulateFromInputFiles: Processing',
      files.size,
      'files for',
      store.constructor.name,
    );
    for (const filename of files) {
      console.log(
        '[DEBUG] simulateFromInputFiles: processFile for',
        store.constructor.name,
        ':',
        filename,
      );
      await store.processFile(filename);
      console.log('[DEBUG] simulateFromInputFiles: processFile completed for', filename);
    }
    console.log(
      '[DEBUG] simulateFromInputFiles: Completed processing store:',
      store.constructor.name,
    );
  }
  console.log('[DEBUG] simulateFromInputFiles: Completed');
}
