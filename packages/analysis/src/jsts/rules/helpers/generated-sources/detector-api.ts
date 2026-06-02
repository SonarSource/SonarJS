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
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../../../../shared/src/helpers/files.js';
import type { GeneratedSourceFileMatcher } from './contracts.js';
import {
  extractFlagValuesFromTokens,
  isDirectory,
  isFile,
  isSourceFile,
  listSourceFilesInDirectory,
  resolveLiteralPath,
  safeStat,
} from './shared.js';
import type { DependenciesList } from '../dependency-manifests/resolvers/types.js';
import type { TaskInvocation } from './task-invocations.js';
export type ResolvedGeneratedOutputs = {
  filePaths: Set<NormalizedAbsolutePath>;
  outputDirectories: Set<NormalizedAbsolutePath>;
  watchedOutputPaths: Set<NormalizedAbsolutePath>;
};

type TaskInvocationMatcher = (taskInvocation: TaskInvocation) => boolean;
type ExistingPathKind = 'file' | 'directory';

type ToolEvidenceOptions = {
  getDependencies: () => DependenciesList;
  taskInvocations: readonly TaskInvocation[];
  dependencyName?: string;
  matchesTaskInvocation: TaskInvocationMatcher;
};

type ResolvePathsFromTaskInvocationsOptions = {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  taskInvocations: readonly TaskInvocation[];
  matchesTaskInvocation: TaskInvocationMatcher;
  flags: string[];
};

type ResolveConfigPathsOptions = {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  taskInvocations: readonly TaskInvocation[];
  matchesTaskInvocation: TaskInvocationMatcher;
  flags: string[];
  fallbackBasenames: readonly string[];
};

export function hasToolEvidence({
  getDependencies,
  taskInvocations,
  dependencyName,
  matchesTaskInvocation,
}: ToolEvidenceOptions) {
  if (taskInvocations.some(matchesTaskInvocation)) {
    return true;
  }

  return dependencyName ? getDependencies().has(dependencyName) : false;
}

export async function resolveConfigPaths({
  baseDir,
  packageDir,
  taskInvocations,
  matchesTaskInvocation,
  flags,
  fallbackBasenames,
}: ResolveConfigPathsOptions) {
  const declaredConfigPaths = resolveDeclaredPathsFromTaskInvocations({
    baseDir,
    packageDir,
    taskInvocations,
    matchesTaskInvocation,
    flags,
  });

  if (declaredConfigPaths.size > 0) {
    return declaredConfigPaths;
  }

  return resolveExistingSiblingPaths(packageDir, fallbackBasenames, 'file');
}

export async function resolveGeneratedOutputsFromLiteralPaths(
  baseDir: NormalizedAbsolutePath,
  declaredFromDirs: NormalizedAbsolutePath | readonly NormalizedAbsolutePath[],
  outputPaths: Iterable<string>,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
): Promise<ResolvedGeneratedOutputs> {
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set<NormalizedAbsolutePath>(),
    outputDirectories: new Set<NormalizedAbsolutePath>(),
    watchedOutputPaths: new Set<NormalizedAbsolutePath>(),
  };
  const candidateDirs = Array.isArray(declaredFromDirs) ? declaredFromDirs : [declaredFromDirs];

  for (const outputPath of outputPaths) {
    const seenResolvedPaths = new Set<NormalizedAbsolutePath>();
    for (const declaredFromDir of candidateDirs) {
      const resolvedPath = resolveLiteralPath(outputPath, declaredFromDir, baseDir);
      if (!resolvedPath || seenResolvedPaths.has(resolvedPath)) {
        continue;
      }
      seenResolvedPaths.add(resolvedPath);
      if (
        await addResolvedGeneratedOutput(
          resolvedOutputs,
          resolvedPath,
          recursive,
          sourceFileMatcher,
        )
      ) {
        break;
      }
    }
  }

  return resolvedOutputs;
}

async function addResolvedGeneratedOutput(
  resolvedOutputs: ResolvedGeneratedOutputs,
  resolvedPath: NormalizedAbsolutePath,
  recursive: boolean,
  sourceFileMatcher?: GeneratedSourceFileMatcher,
) {
  resolvedOutputs.watchedOutputPaths.add(resolvedPath);
  const stats = await safeStat(resolvedPath);
  if (!stats) {
    return false;
  }

  if (stats.isFile()) {
    if (isSourceFile(resolvedPath, sourceFileMatcher)) {
      resolvedOutputs.filePaths.add(resolvedPath);
      return true;
    }
    return false;
  }

  if (!stats.isDirectory()) {
    return false;
  }

  resolvedOutputs.outputDirectories.add(resolvedPath);
  const childFiles = await listSourceFilesInDirectory(resolvedPath, recursive, sourceFileMatcher);
  for (const childFile of childFiles) {
    resolvedOutputs.filePaths.add(childFile);
  }
  return childFiles.length > 0;
}

function resolveDeclaredPathsFromTaskInvocations({
  baseDir,
  packageDir,
  taskInvocations,
  matchesTaskInvocation,
  flags,
}: Omit<ResolvePathsFromTaskInvocationsOptions, 'kind'>) {
  const resolvedPaths = new Set<NormalizedAbsolutePath>();

  for (const taskInvocation of taskInvocations) {
    if (!matchesTaskInvocation(taskInvocation)) {
      continue;
    }

    for (const token of extractFlagValuesFromTokens(taskInvocation.args, flags)) {
      const resolvedPath = resolveLiteralPath(token, packageDir, baseDir);
      if (resolvedPath) {
        resolvedPaths.add(resolvedPath);
      }
    }
  }

  return resolvedPaths;
}

async function resolveExistingSiblingPaths(
  packageDir: NormalizedAbsolutePath,
  basenames: readonly string[],
  kind: ExistingPathKind,
) {
  const resolvedPaths = new Set<NormalizedAbsolutePath>();

  for (const basename of basenames) {
    const resolvedPath = normalizeToAbsolutePath(basename, packageDir);
    if (kind === 'file' ? await isFile(resolvedPath) : await isDirectory(resolvedPath)) {
      resolvedPaths.add(resolvedPath);
    }
  }

  return resolvedPaths;
}
