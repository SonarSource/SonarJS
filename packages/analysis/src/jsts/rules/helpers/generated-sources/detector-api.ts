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
import type { PackageJson } from 'type-fest';
import { relativeToAncestorPath } from '../files.js';
import type { DerivedGeneratedSources, GeneratedSourceFamily } from './contracts.js';
import {
  addFamilyFiles,
  createDerivedGeneratedSources,
  extractFlagValues,
  hasPackageDependency,
  isDirectory,
  isFile,
  isSourceFile,
  listSourceFilesInDirectory,
  resolveLiteralPath,
  safeStat,
} from './shared.js';

export type ResolvedGeneratedOutputs = {
  filePaths: Set<NormalizedAbsolutePath>;
  outputDirectories: Set<NormalizedAbsolutePath>;
};

type ScriptMatcher = (script: string) => boolean;
type ExistingPathKind = 'file' | 'directory';

type ToolEvidenceOptions = {
  packageJson: PackageJson;
  scripts: readonly string[];
  dependencyName?: string;
  matchesScript: ScriptMatcher;
};

type ResolvePathsFromScriptsOptions = {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  scripts: readonly string[];
  matchesScript: ScriptMatcher;
  flags: string[];
  kind: ExistingPathKind;
};

type ResolveConfigPathsOptions = {
  baseDir: NormalizedAbsolutePath;
  packageDir: NormalizedAbsolutePath;
  scripts: readonly string[];
  matchesScript: ScriptMatcher;
  flags: string[];
  fallbackBasenames: readonly string[];
};

export function hasToolEvidence({
  packageJson,
  scripts,
  dependencyName,
  matchesScript,
}: ToolEvidenceOptions) {
  return (
    (dependencyName ? hasPackageDependency(packageJson, dependencyName) : false) ||
    scripts.some(matchesScript)
  );
}

export async function resolveConfigPaths({
  baseDir,
  packageDir,
  scripts,
  matchesScript,
  flags,
  fallbackBasenames,
}: ResolveConfigPathsOptions) {
  const explicitConfigPaths = await resolveExistingPathsFromScripts({
    baseDir,
    packageDir,
    scripts,
    matchesScript,
    flags,
    kind: 'file',
  });

  if (explicitConfigPaths.size > 0) {
    return explicitConfigPaths;
  }

  return resolveExistingSiblingPaths(packageDir, fallbackBasenames, 'file');
}

export async function resolveOutputDirectoriesFromScripts({
  baseDir,
  packageDir,
  scripts,
  matchesScript,
  flags,
}: Omit<ResolvePathsFromScriptsOptions, 'kind'>) {
  return resolveExistingPathsFromScripts({
    baseDir,
    packageDir,
    scripts,
    matchesScript,
    flags,
    kind: 'directory',
  });
}

export async function deriveSourcesFromOutputDirectories(
  family: GeneratedSourceFamily,
  outputDirectories: Iterable<NormalizedAbsolutePath>,
  recursive: boolean,
  analyzableFiles?: ReadonlySet<NormalizedAbsolutePath>,
): Promise<DerivedGeneratedSources> {
  const derived = createDerivedGeneratedSources();

  for (const outputDirectory of [...outputDirectories].sort((left, right) =>
    left.localeCompare(right),
  )) {
    derived.outputDirectories.add(outputDirectory);
    addFamilyFiles(
      family,
      await listAcceptedGeneratedFilesInDirectory(outputDirectory, recursive, analyzableFiles),
      derived,
    );
  }

  return derived;
}

export async function resolveGeneratedOutputsFromLiteralPaths(
  baseDir: NormalizedAbsolutePath,
  declaredFromDir: NormalizedAbsolutePath,
  outputPaths: Iterable<string>,
  recursive: boolean,
  analyzableFiles?: ReadonlySet<NormalizedAbsolutePath>,
): Promise<ResolvedGeneratedOutputs> {
  const resolvedOutputs: ResolvedGeneratedOutputs = {
    filePaths: new Set<NormalizedAbsolutePath>(),
    outputDirectories: new Set<NormalizedAbsolutePath>(),
  };

  for (const outputPath of outputPaths) {
    const resolvedPath = resolveLiteralPath(outputPath, declaredFromDir, baseDir);
    if (resolvedPath) {
      await addResolvedGeneratedOutput(resolvedOutputs, resolvedPath, recursive, analyzableFiles);
    }
  }

  return resolvedOutputs;
}

async function addResolvedGeneratedOutput(
  resolvedOutputs: ResolvedGeneratedOutputs,
  resolvedPath: NormalizedAbsolutePath,
  recursive: boolean,
  analyzableFiles?: ReadonlySet<NormalizedAbsolutePath>,
) {
  const stats = await safeStat(resolvedPath);
  if (!stats) {
    return;
  }

  if (stats.isFile()) {
    if (isAcceptedGeneratedFile(resolvedPath, analyzableFiles)) {
      resolvedOutputs.filePaths.add(resolvedPath);
    }
    return;
  }

  if (!stats.isDirectory()) {
    return;
  }

  resolvedOutputs.outputDirectories.add(resolvedPath);
  for (const childFile of await listAcceptedGeneratedFilesInDirectory(
    resolvedPath,
    recursive,
    analyzableFiles,
  )) {
    resolvedOutputs.filePaths.add(childFile);
  }
}

function isAcceptedGeneratedFile(
  filePath: NormalizedAbsolutePath,
  analyzableFiles?: ReadonlySet<NormalizedAbsolutePath>,
) {
  return analyzableFiles ? analyzableFiles.has(filePath) : isSourceFile(filePath);
}

function collectAnalyzableFilesFromOutputDirectory(
  outputDirectory: NormalizedAbsolutePath,
  recursive: boolean,
  analyzableFiles: ReadonlySet<NormalizedAbsolutePath>,
) {
  const files: NormalizedAbsolutePath[] = [];

  for (const filePath of analyzableFiles) {
    const relativePath = relativeToAncestorPath(filePath, outputDirectory);
    if (relativePath === undefined || relativePath.length === 0) {
      continue;
    }

    if (!recursive && relativePath.includes('/')) {
      continue;
    }

    files.push(filePath);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function listAcceptedGeneratedFilesInDirectory(
  outputDirectory: NormalizedAbsolutePath,
  recursive: boolean,
  analyzableFiles?: ReadonlySet<NormalizedAbsolutePath>,
) {
  return analyzableFiles
    ? collectAnalyzableFilesFromOutputDirectory(outputDirectory, recursive, analyzableFiles)
    : listSourceFilesInDirectory(outputDirectory, recursive);
}

async function resolveExistingPathsFromScripts({
  baseDir,
  packageDir,
  scripts,
  matchesScript,
  flags,
  kind,
}: ResolvePathsFromScriptsOptions) {
  const resolvedPaths = new Set<NormalizedAbsolutePath>();

  for (const script of scripts) {
    if (!matchesScript(script)) {
      continue;
    }

    for (const token of extractFlagValues(script, flags)) {
      const resolvedPath = resolveLiteralPath(token, packageDir, baseDir);
      if (resolvedPath && (await matchesExistingPathKind(resolvedPath, kind))) {
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
    if (await matchesExistingPathKind(resolvedPath, kind)) {
      resolvedPaths.add(resolvedPath);
    }
  }

  return resolvedPaths;
}

async function matchesExistingPathKind(path: NormalizedAbsolutePath, kind: ExistingPathKind) {
  return kind === 'file' ? isFile(path) : isDirectory(path);
}
