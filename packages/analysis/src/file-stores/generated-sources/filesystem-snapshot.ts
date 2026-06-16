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
import { opendir } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { basename } from 'node:path/posix';
import type { Minimatch } from 'minimatch';
import {
  joinPaths,
  normalizeToAbsolutePath,
  readFile,
  type File,
  type NormalizedAbsolutePath,
} from '../../../../shared/src/helpers/files.js';
import { isJsTsExcluded } from '../../common/filter/filter-path.js';
import { PACKAGE_JSON } from '../../jsts/rules/helpers/dependency-manifests/index.js';
import type { GeneratedSourceFileMatcher, GeneratedSourceProjectSnapshot } from './contracts.js';
import { shouldPreloadGeneratedSourcePath } from './detectors/index.js';
import { collectGeneratedSourceDeclaredPreloadPaths } from './preload-paths.js';
import { isSourceFile } from './shared.js';

const HARD_PRUNED_EXCLUDED_DIRECTORIES = new Set([
  '.cache',
  '.git',
  '.next',
  '.scannerwork',
  'bower_components',
  'contrib',
  'coverage',
  'external',
  'node_modules',
  'vendor',
]);

export type GeneratedSourceFileSystemSnapshot = {
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, File>;
  projectSnapshot: GeneratedSourceProjectSnapshot;
};

export async function collectGeneratedSourceProjectSnapshotFromFileSystem(context: {
  baseDir: NormalizedAbsolutePath;
  jsTsExclusions: Minimatch[];
  sourceFileMatcher?: GeneratedSourceFileMatcher;
  packageJsons?: ReadonlyMap<NormalizedAbsolutePath, File>;
}): Promise<GeneratedSourceFileSystemSnapshot> {
  const { baseDir, jsTsExclusions, sourceFileMatcher, packageJsons: seededPackageJsons } = context;
  const packageJsons = new Map<NormalizedAbsolutePath, File>(seededPackageJsons);
  const preloadedFiles = new Map<NormalizedAbsolutePath, File>();
  const sourceFiles = new Set<NormalizedAbsolutePath>();
  const directories = new Set<NormalizedAbsolutePath>([baseDir]);
  const pendingDirectories: NormalizedAbsolutePath[] = [baseDir];

  for (const packageJsonFile of packageJsons.values()) {
    preloadedFiles.set(packageJsonFile.path, packageJsonFile);
  }

  while (pendingDirectories.length > 0) {
    const directory = pendingDirectories.pop()!;
    const entries: Dirent[] = [];
    for await (const entry of await opendir(directory)) {
      entries.push(entry);
    }

    entries.sort(compareGeneratedSourceDirectoryEntries);

    for (const entry of entries) {
      const filePath = joinPaths(normalizeToAbsolutePath(entry.parentPath), entry.name);

      if (entry.isDirectory()) {
        const isExcluded = isJsTsExcluded(filePath, jsTsExclusions);
        directories.add(filePath);
        if (!isExcluded || shouldTraverseExcludedDirectory(filePath)) {
          pendingDirectories.push(filePath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (isSourceFile(filePath, sourceFileMatcher)) {
        sourceFiles.add(filePath);
      }

      if (!shouldPreloadGeneratedSourcePath(filePath)) {
        continue;
      }

      const preloadedFile = await preloadGeneratedSourceFile(filePath, packageJsons);
      if (!preloadedFile) {
        continue;
      }

      preloadedFiles.set(filePath, preloadedFile);
    }
  }

  const declaredPreloadPaths = await collectGeneratedSourceDeclaredPreloadPaths(
    baseDir,
    packageJsons,
  );
  for (const preloadPath of declaredPreloadPaths) {
    if (preloadedFiles.has(preloadPath)) {
      continue;
    }

    const preloadedFile = await preloadGeneratedSourceFile(preloadPath, packageJsons);
    if (preloadedFile) {
      preloadedFiles.set(preloadPath, preloadedFile);
    }
  }

  return {
    packageJsons,
    projectSnapshot: {
      directories,
      preloadedFiles,
      sourceFiles,
    },
  };
}

async function preloadGeneratedSourceFile(
  filePath: NormalizedAbsolutePath,
  _packageJsons: ReadonlyMap<NormalizedAbsolutePath, File>,
) {
  try {
    return {
      content: await readFile(filePath),
      path: filePath,
    } satisfies File;
  } catch {
    return undefined;
  }
}

function compareGeneratedSourceDirectoryEntries(left: Dirent, right: Dirent) {
  if (left.isDirectory() !== right.isDirectory()) {
    return left.isDirectory() ? 1 : -1;
  }

  if (left.isDirectory()) {
    return left.name.localeCompare(right.name);
  }

  return compareGeneratedSourceFiles(left.name, right.name);
}

function compareGeneratedSourceFiles(leftName: string, rightName: string) {
  const leftPriority = getGeneratedSourceDiscoveryPriority(leftName);
  const rightPriority = getGeneratedSourceDiscoveryPriority(rightName);
  return leftPriority - rightPriority || leftName.localeCompare(rightName);
}

function getGeneratedSourceDiscoveryPriority(name: string) {
  const normalizedName = name.toLowerCase();
  if (normalizedName === PACKAGE_JSON) {
    return 0;
  }

  if (normalizedName === 'tsconfig.json') {
    return 1;
  }

  return 2;
}

function shouldTraverseExcludedDirectory(path: NormalizedAbsolutePath) {
  return !HARD_PRUNED_EXCLUDED_DIRECTORIES.has(basename(path).toLowerCase());
}
