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
  type File,
  type NormalizedAbsolutePath,
} from '../../../../../../shared/src/helpers/files.js';
import type { PackageJson } from 'type-fest';
import { getDependencies } from '../dependency-manifests/dependencies.js';
import { getPackageJsonManifests } from '../dependency-manifests/all-in-parent-dirs.js';
import { parsePackageJson } from '../dependency-manifests/parsed-dependency-files.js';
import type { DependenciesList } from '../dependency-manifests/resolvers/types.js';
import type { DerivedGeneratedSources, GeneratedSourceFileMatcher } from './contracts.js';
import { GENERATED_SOURCE_DETECTORS } from './detectors/index.js';
import { collectGeneratedSourceTaskInvocations } from './task-invocations.js';
import { createDerivedGeneratedSources, mergeDerivedGeneratedSources } from './shared.js';

export async function deriveGeneratedSources(
  baseDir: NormalizedAbsolutePath,
  packageJsons: ReadonlyMap<NormalizedAbsolutePath, File>,
  options?: {
    sourceFileMatcher?: GeneratedSourceFileMatcher;
  },
): Promise<DerivedGeneratedSources> {
  const derived = createDerivedGeneratedSources();
  if (GENERATED_SOURCE_DETECTORS.length === 0) {
    return derived;
  }

  const { sourceFileMatcher } = options ?? {};

  for (const [packageDir, file] of packageJsons) {
    const packageJson = parsePackageJson(file);
    if (!packageJson) {
      continue;
    }

    const taskInvocations = await collectGeneratedSourceTaskInvocations({
      baseDir,
      packageDir,
      packageJson,
    });
    let dependencyNames: Set<string> | undefined;
    let dependencies: DependenciesList | undefined;
    const hasGeneratedSourceDependency = (dependencyName: string) => {
      dependencyNames ??= collectGeneratedSourceDependencyNames(packageDir, baseDir, packageJson);
      return dependencyNames.has(dependencyName);
    };
    const getGeneratedSourceDependencies = () => {
      dependencies ??= resolveGeneratedSourceDependencies(packageDir, baseDir, packageJson);
      return dependencies;
    };
    for (const detector of GENERATED_SOURCE_DETECTORS) {
      mergeDerivedGeneratedSources(
        derived,
        await detector.detect({
          baseDir,
          packageDir,
          hasDependency: hasGeneratedSourceDependency,
          getDependencies: getGeneratedSourceDependencies,
          taskInvocations,
          sourceFileMatcher,
        }),
      );
    }
  }

  return derived;
}

function collectGeneratedSourceDependencyNames(
  packageDir: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath,
  packageJson: PackageJson,
) {
  const dependencyNames = new Set<string>();
  const packageJsons = getPackageJsonManifests(packageDir, baseDir);

  for (const packageJsonManifest of packageJsons.length > 0 ? packageJsons : [packageJson]) {
    addPackageJsonDependencyNames(dependencyNames, packageJsonManifest);
  }

  return dependencyNames;
}

function resolveGeneratedSourceDependencies(
  packageDir: NormalizedAbsolutePath,
  baseDir: NormalizedAbsolutePath,
  packageJson: PackageJson,
): DependenciesList {
  const dependencies = getDependencies(packageDir, baseDir);

  // Support in-memory package.json fixtures that do not populate the manifest caches.
  // When raw dependency sections are still present, derive the dependency list from them.
  return dependencies.size > 0 || !hasRawDependencySections(packageJson)
    ? dependencies
    : createFallbackDependencies(packageJson);
}

function hasRawDependencySections(packageJson: PackageJson) {
  return [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ].some(section => section !== undefined && Object.keys(section).length > 0);
}

function createFallbackDependencies(packageJson: PackageJson): DependenciesList {
  const dependencies: DependenciesList = new Map();

  for (const section of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ]) {
    if (!section) {
      continue;
    }

    for (const [name, version] of Object.entries(section)) {
      dependencies.set(name, typeof version === 'string' ? version : undefined);
    }
  }

  return dependencies;
}

function addPackageJsonDependencyNames(dependencyNames: Set<string>, packageJson: PackageJson) {
  for (const section of [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ]) {
    if (!section) {
      continue;
    }

    for (const dependencyName of Object.keys(section)) {
      dependencyNames.add(dependencyName);
    }
  }
}

export { extractFlagValues } from './shared.js';
